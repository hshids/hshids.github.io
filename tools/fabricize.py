#!/usr/bin/env python3
"""Turn the 2D world's painted images into appliqué and embroidery.

Each painting keeps its composition, its objects and their positions, but is rebuilt as cloth and
thread: large areas of colour are appliquéd cloth, the detail is embroidered on top.

  * scenery (`appliqué`): cut into a few large pieces along the painted outlines; each piece is
    plain dyed cloth, padded, creased, shading the piece below and edged with a fine blanket
    stitch; roof tiles and leaves are satin floss with a chain stitch round them; all the detail
    is fine silk thread in the painting's own colours, slightly raised;
  * far hills and trees (`appliqué`, LANDSCAPE): a few large pieces of plain cloth, no thread
    painting; small far-off buildings are embroidered all over at the size they are shown;
  * Hanjing (`figure`): the painting kept, each garment in its own cloth, hair in fine silk, a back
    stitch round her outline, her face painted when she moves and embroidered when she stands still;
  * cats (`fur`): fine stitches following the fur, eyes and nose clear.

The fine silk is line integral convolution: thread-sized noise smeared along the direction of the
picture's own structure, with a sheen that changes with the thread direction. The character's
textures keep their exact outline and stitches are seeded by position, so animation frames match.

Sizes are chosen in screen pixels and converted with each image's display scale (how many screen
pixels one source pixel covers in the world at 1280 x 800), so stitches and weave look about the
same size on screen whether a picture is shown large (the gate) or small (the cats).

Usage:  python3 tools/fabricize.py [names...]      (default: every image in assets/art)
        python3 tools/fabricize.py --tiles        (the silk, weave, burlap and felt swatches for the page)
Output: assets/art/fabric/<name>.webp
Needs:  numpy, opencv-python-headless
"""
import os, sys, math, time
import numpy as np
import cv2

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, 'assets', 'art')
OUT = os.path.join(ART, 'fabric')

# screen pixels per source pixel (median over the sprites cut from each sheet)
SCALE = {
    'belongings-painted': 1.15, 'branch-signs-painted': 2.0, 'buildings-painted': 1.9, 'cats-painted': .2,
    'cats-upright-painted': .2, 'details-painted': 1.4, 'education-willow-leaves-painted': .5, 'finishes-painted': .66,
    'gallery-screen-painted': .4, 'garden-painted': .45, 'hand-lantern-painted': .25, 'keepsakes-painted': .9,
    'mailing-painted': .5, 'pine': .93, 'willow': .93, 'pond-phragmites-painted': .93, 'research-painted': .37,
    'talks-painted': .35, 'tutorial-archive-painted': .4, 'writing-screen-complete-painted': .8, 'writing-low-painted': .8,
    'writing-upright-painted': .5, 'scholar-painted': 1.6, 'reading-painted': .3, 'writing-grip-painted': .3,
    'research-red-book-native': .3, 'mountain-wash': 1.0, 'materials-painted': 1.0, 'water-continuous-painted': 1.0,
    'hanjing-day': .45, 'hanjing-night': .45, 'hanjing-day-expression': .3, 'hanjing-night-expression': .3,
    'hanjing-night-torso': .3,
}
for i in range(6): SCALE['material-%d' % i] = .3
TEXTURES = {'water-continuous-painted'} | {'material-%d' % i for i in range(6)}
HUMAN = ('hanjing-', 'human-bind-')
FUR = ('cats-', 'jinbingbing-')

# the look, in screen pixels
CUT = .36            # working pixels per screen pixel when cutting pieces (fine painted texture is ignored)
PIECE_MIN = 24       # pieces smaller than this (side of a square) are merged into a neighbour
MERGE_DE = 10        # neighbouring pieces closer than this in colour (light-weighted Lab) become one,
SOFT_EDGE, SOFT_DE = 4.5, 24   # where the painting has no drawn line at all, colours this far apart still merge
EDGE_MAX = 12        # unless the painting draws an edge between them (mean local contrast in L)
WEAVE = 3.6          # thread period of the cloth (screen px)
DASH, GAP, THREAD = 7.0, 5.0, 2.0
INSET = 3.0          # stitches run this far inside the cut edge
NEEDLE_HOLES = True  # a faint dimple where the needle went through
PILLOW = 11          # how far in from its edge a piece of cloth rises (screen px)
WRINKLE = .045       # how much the large cloth pieces crease
EMB_W, EMB_L, EMB_COVER = 3.2, 17, .6       # satin floss on roofs and leaves: width, stitch length, coverage
EMB_DETAIL = 4.6     # pieces with this much painted texture (mean fine detail in L) can be satin floss
CHAIN_W, CHAIN_L = 1.1, 4.0                 # chain stitch round the satin floss
BLANKET_MIN, BLANKET_STEP, BLANKET_W = 34, 4.6, .6   # blanket stitch: smallest piece, spacing, thread width (x THREAD)
DETAIL_T = 4.0       # painted detail stronger than this (local contrast in L) is embroidered in fine silk
# silk thread painting: (thread width, stitch length) in screen px, contrast between threads, sheen,
# how raised it is, how broad the stitch direction is
SILK_DETAIL = (.5, 3.5, .26, .06, .3)
SILK_BG = (.7, 9.0, .2, .06)
SILK_FUR = (.45, 4.5, .24, .05)
SILK_HAIR = (.4, 6.0, .26, .06)
SILK_GOLD = (.3, 2.2, .35, .12, .25)
SILK_FACE = (.45, 5.0, .045, .03, 0.0, 4.0)
SILK_FEATURES = (.25, 1.8, .2, .05, .12)
# Hanjing's outline (back stitch) and garment seams, screen px
OUTLINE_DASH, OUTLINE_GAP, OUTLINE_W, OUTLINE_INSET = 2.4, .7, .55, 1.2
SEAM_FIG, SEAM_DASH, SEAM_GAP = 26, 2.6, 1.6
# which sheets are what
SILK_SHEETS = {'education-willow-leaves-painted'}
LANDSCAPE = {'mountain-wash', 'pine', 'willow'}   # far hills and trees: a few large pieces of plain cloth
LAND_K, LAND_CUT, LAND_PIECE = 5, .12, 50          # how many cloths, working px per screen px, smallest piece
CHARACTER_SHEETS = {'writing-grip-painted', 'reading-painted', 'mailing-painted'}
OUTLINED = ('hanjing-', 'human-bind-', 'writing-grip', 'reading-painted', 'mailing-painted')
FACE_SILK = {'hanjing-day', 'hanjing-night', 'hanjing-day-expression', 'hanjing-night-expression',
             'reading-painted', 'mailing-painted', 'hanjing-hold-native', 'hanjing-night-closed-native'}
FUR_RIG = ('jinbingbing-',)
FULL_EMB = {'belongings-painted': [(442, 94, 700, 389)]}   # the cooking pot is embroidered all over
# small buildings in the distance, embroidered all over at the size they are shown: (rect, screen scale)
EMB_REGIONS = {'garden-painted': [((1356, 478, 1545, 828), .4, 'building'), ((1546, 587, 1762, 829), .45, 'building'),
                                   ((17, 98, 451, 443), .15, (.5, .64)), ((580, 110, 753, 437), .15, (.5, 1.0)), ((871, 101, 1336, 441), .1, (.47, .52))]}
# (a lotus is given as the point its petals or leaf veins spread from, as fractions of the crop)


def kind_of(name):
    if name in TEXTURES: return 'texture'
    if name in SILK_SHEETS: return 'silk'
    if name.startswith(FUR): return 'fur'
    if name.startswith(HUMAN) or name in CHARACTER_SHEETS: return 'figure'
    return 'scene'


def oversample(name):
    """Scenery shown larger than its pixels is sewn at a higher resolution, so each stitch keeps a
    crisp shape and gap. The page draws it at the original size."""
    if kind_of(name) not in ('scene', 'silk'): return 1
    f = scale_of(name)
    return 2 if f >= 1.8 else (1.5 if f >= .8 else 1)


def scale_of(name):
    if name in SCALE: return SCALE[name]
    if name.startswith(HUMAN) or name.startswith(FUR): return .16
    return .6


# ---------------------------------------------------------------- noise and cloth
def _noise(h, w, cell, rng, periodic=False):
    gh, gw = max(2, int(round(h / max(1.0, cell)))), max(2, int(round(w / max(1.0, cell))))
    g = rng.random((gh, gw)).astype(np.float32)
    if not periodic:
        return cv2.resize(g, (w, h), interpolation=cv2.INTER_CUBIC)
    big = cv2.resize(np.tile(g, (3, 3)), (w * 3, h * 3), interpolation=cv2.INTER_CUBIC)
    return big[h:2 * h, w:2 * w].copy()


def _coords(h, w, angle):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    if not angle: return x, y
    a = math.radians(angle); c, s = math.cos(a), math.sin(a)
    return x * c + y * s, -x * s + y * c


def weave(h, w, p, rng, angle=0, coarse=False, slub=False, periodic=False, soft=False):
    """Plain weave: threads going over and under each other, each shaded like a little cylinder, with
    some thread-to-thread irregularity. Returns a multiplier around 1."""
    if periodic:
        px, py = w / max(1, round(w / p)), h / max(1, round(h / p)); angle = 0
    else:
        px = py = p
    x, y = _coords(h, w, angle)
    fx, fy = x / px, y / py
    ix, iy = np.floor(fx), np.floor(fy)
    nx, ny = int(math.ceil(w / px)) + 4, int(math.ceil(h / py)) + 4
    if angle: nx = ny = int(math.ceil(max(h, w) * 1.5 / p)) + 8
    ox, oy = nx // 2 if angle else 0, ny // 2 if angle else 0
    tx = rng.random(nx).astype(np.float32); ty = rng.random(ny).astype(np.float32)
    jx = np.take(tx, (ix.astype(np.int64) + ox) % nx); jy = np.take(ty, (iy.astype(np.int64) + oy) % ny)
    over = ((ix + iy) % 2).astype(np.float32)
    ux, uy = fx - ix, fy - iy
    if soft:   # smooth version for textures shown very small (no hard thread edges to alias)
        m = .5 + .5 * np.cos((fx + fy) * math.pi) * np.cos((fx - fy) * math.pi)
        out = .9 + .2 * m + (np.where(over > .5, jx, jy) - .5) * .05
        return out.astype(np.float32)
    vert = np.clip(np.cos((ux - .5) * math.pi), 0, 1) ** .7
    hori = np.clip(np.cos((uy - .5) * math.pi), 0, 1) ** .7
    m = over * vert + (1 - over) * hori
    tone = np.where(over > .5, jx, jy)
    amp = .24 if coarse else .15
    out = 1 - amp + amp * 1.2 * m + (tone - .5) * (.14 if coarse else .07)
    if slub: out = out * (1 + (_noise(h, w, p * 6, rng, periodic) - .5) * .14)
    if coarse:   # the gaps between coarse threads show the darker cloth behind
        out = out * np.where(np.minimum(ux, 1 - ux) < .13, .8, 1) * np.where(np.minimum(uy, 1 - uy) < .13, .84, 1)
    return out.astype(np.float32)


def twill(h, w, p, rng, angle=0):
    x, y = _coords(h, w, angle)
    d = (x + y) / p
    rib = np.cos((d - np.floor(d) - .5) * math.pi) ** 2
    cross = np.cos((y / p - np.floor(y / p) - .5) * math.pi) ** 2
    return (.88 + .16 * rib + .05 * cross + (_noise(h, w, p * 5, rng) - .5) * .06).astype(np.float32)








# ---------------------------------------------------------------- cutting the picture into pieces
def mode_filter(q, k):
    best = np.full(q.shape, -1, np.float32); out = q.copy()
    for i in np.unique(q):
        s = cv2.blur((q == i).astype(np.float32), (k, k))
        better = s > best
        out[better] = i; best[better] = s[better]
    return out


def compact(pid):
    _, inv = np.unique(np.concatenate([[0], pid.ravel()]), return_inverse=True)
    return inv[1:].reshape(pid.shape).astype(np.int32)


def components(q, valid):
    """Connected pieces of each colour label. Background is piece 0."""
    pid = np.zeros(q.shape, np.int32); n = 1
    for i in np.unique(q[valid]):
        m = ((q == i) & valid).astype(np.uint8)
        c, cc = cv2.connectedComponents(m, connectivity=4)
        if c > 1:
            sel = cc > 0; pid[sel] = cc[sel] + n - 1; n += c - 1
    return pid


def merge_small(pid, min_px, lab=None, passes=10):
    """Pieces under min_px are merged into a neighbour: the one they share the longest edge with,
    favouring neighbours of a similar colour (so a face never joins the hair)."""
    for _ in range(passes):
        n = int(pid.max()) + 1
        area = np.bincount(pid.ravel(), minlength=n)
        small = area < min_px; small[0] = False
        if not small.any(): break
        a = np.concatenate([pid[:, :-1].ravel(), pid[:-1, :].ravel()]); b = np.concatenate([pid[:, 1:].ravel(), pid[1:, :].ravel()])
        m = (a != b) & (a > 0) & (b > 0); a, b = a[m], b[m]
        src = np.concatenate([a, b]); dst = np.concatenate([b, a])
        sel = small[src]; src, dst = src[sel], dst[sel]
        if not len(src): break
        key = src.astype(np.int64) * n + dst
        uk, cnt = np.unique(key, return_counts=True)
        s_, d_ = uk // n, uk % n
        score = cnt.astype(np.float64)
        if lab is not None:
            mean = np.stack([np.bincount(pid.ravel(), weights=lab[..., c].ravel(), minlength=n) for c in range(3)], 1) / np.maximum(area, 1)[:, None]
            de = np.sqrt((((mean[s_] - mean[d_]) * [.5, 1, 1]) ** 2).sum(1))
            score = score / (1 + de / 8)
        order = np.lexsort((area[d_], score, s_))
        s_o, d_o = s_[order], d_[order]
        last = np.r_[s_o[1:] != s_o[:-1], True]
        t = np.arange(n); t[s_o[last]] = d_o[last]
        idx = np.arange(n)
        cyc = (t[t] == idx) & (t != idx)
        keep = cyc & ((area > area[t]) | ((area == area[t]) & (idx > t)))
        t[keep] = idx[keep]
        for _ in range(48):
            t2 = t[t]
            if (t2 == t).all(): break
            t = t2
        pid = compact(t[pid])
    return pid


def merge_similar(pid, lab, max_de, max_edge, weights=(.45, 1.0, 1.0)):
    """Merge neighbouring pieces whose colours are close (light and shade of the same material) and
    whose shared border is soft in the painting (no drawn outline between them), most similar first,
    keeping a running area-weighted mean colour for every merged piece."""
    n = int(pid.max()) + 1
    w = np.float32(weights)
    cnt = np.bincount(pid.ravel(), minlength=n).astype(np.float64)
    sums = np.stack([np.bincount(pid.ravel(), weights=lab[..., c].ravel(), minlength=n) for c in range(3)], 1)
    a = np.concatenate([pid[:, :-1].ravel(), pid[:-1, :].ravel()]); b = np.concatenate([pid[:, 1:].ravel(), pid[1:, :].ravel()])
    # how strong the painting's edge is where two pieces meet: the darkest outline across the border
    L = cv2.GaussianBlur(lab[..., 0], (0, 0), .7)
    lo = cv2.erode(L, np.ones((3, 3), np.uint8))
    contrast = np.maximum(L - lo, 0)
    g = np.concatenate([np.maximum(contrast[:, :-1], contrast[:, 1:]).ravel(), np.maximum(contrast[:-1, :], contrast[1:, :]).ravel()])
    m = (a != b) & (a > 0) & (b > 0); a, b, g = np.minimum(a[m], b[m]), np.maximum(a[m], b[m]), g[m]
    keys = a.astype(np.int64) * n + b
    key, inv, border = np.unique(keys, return_inverse=True, return_counts=True)
    strength = np.bincount(inv, weights=g) / border
    ea, eb = key // n, key % n
    mean = sums / np.maximum(cnt, 1)[:, None]
    de = np.sqrt((((mean[ea] - mean[eb]) * w) ** 2).sum(1))
    # a soft, undrawn transition (watercolour wash, shading) merges even across a bigger colour step
    de = np.where(strength > max_edge, np.inf, np.where(strength < SOFT_EDGE, de * MERGE_DE / SOFT_DE, de))
    order = np.argsort(de)
    parent = np.arange(n)

    def find(x):
        r = x
        while parent[r] != r: r = parent[r]
        while parent[x] != r: parent[x], x = r, parent[x]
        return r
    for e in order:
        if de[e] > max_de: break
        ra, rb = find(ea[e]), find(eb[e])
        if ra == rb: continue
        ma, mb = sums[ra] / cnt[ra], sums[rb] / cnt[rb]
        lim = max_de * (SOFT_DE / MERGE_DE if strength[e] < SOFT_EDGE else 1)
        if math.sqrt((((ma - mb) * w) ** 2).sum()) > lim: continue
        if cnt[ra] < cnt[rb]: ra, rb = rb, ra
        parent[rb] = ra; sums[ra] += sums[rb]; cnt[ra] += cnt[rb]
    root = np.array([find(i) for i in range(n)])
    return compact(root[pid])


def nearest_fill(pid, cover):
    """Pixels the picture covers but no piece claims (thin twigs, fine edges lost at the coarse
    cutting scale) join the nearest piece."""
    src = pid > 0
    if not src.any(): return pid
    _, lab = cv2.distanceTransformWithLabels((~src).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    near = pid[src][lab - 1]
    return np.where(cover & ~src, near, pid).astype(np.int32)


def cut_pieces(bgr_f, alpha, u, face, rig, rng, cut=None, piece_min=None):
    """Cut the picture into a few large pieces of cloth. The cut is made at a coarse scale (a working
    pixel is about three screen pixels), so fine painted texture such as roof tiles, bark or leaves
    does not split a piece: a whole roof stays one piece, with its tiles printed on it."""
    H, W = bgr_f.shape[:2]
    ws = float(np.clip((cut or CUT) / u, .03, 1.0))       # working pixels per source pixel
    sc = ws * u                                            # working pixels per screen pixel
    sw, sh = max(8, int(round(W * ws))), max(8, int(round(H * ws)))
    small = cv2.resize(bgr_f, (sw, sh), interpolation=cv2.INTER_AREA)
    a_s = cv2.resize(alpha, (sw, sh), interpolation=cv2.INTER_AREA)
    sm8 = np.clip(small, 0, 255).astype(np.uint8)
    ms = cv2.pyrMeanShiftFiltering(sm8, max(2, int(round(5 * sc))), 15 if face else 20, maxLevel=1)
    lab_ms = cv2.cvtColor(ms.astype(np.float32) / 255, cv2.COLOR_BGR2Lab)
    feat = lab_ms * np.float32([.4, 1.7, 1.7])
    valid = a_s > .5
    K = 16 if face else (12 if rig else 12)
    samp = feat[valid].reshape(-1, 3)
    if len(samp) < K * 8: samp = feat.reshape(-1, 3)
    if len(samp) > 50000: samp = samp[rng.choice(len(samp), 50000, replace=False)]
    cv2.setRNGSeed(int(rng.integers(1 << 30)))
    _, _, centers = cv2.kmeans(samp.astype(np.float32), K, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, .2), 2, cv2.KMEANS_PP_CENTERS)
    q = ((feat.reshape(-1, 1, 3) - centers[None]) ** 2).sum(2).argmin(1).reshape(sh, sw)
    q = mode_filter(q, 3)
    lab_small = cv2.cvtColor(sm8.astype(np.float32) / 255, cv2.COLOR_BGR2Lab)
    piece_min = (piece_min or PIECE_MIN) * (.45 if rig or face else 1)
    min_px = (piece_min * sc) ** 2
    pid = merge_small(components(q, valid), min_px, lab_small)
    pid = merge_similar(pid, lab_small, MERGE_DE * (.6 if face else 1), EDGE_MAX)
    pid = merge_small(pid, min_px * 2, lab_small)
    pid = nearest_fill(pid, a_s > .02)
    return pid, ws


def land_pieces(bgr_f, alpha, u):
    """Far hills and trees cut into a few large pieces by tone alone (pale far peaks, rocky ridges,
    green slopes, dark forest), the painted texture ignored, each shape smoothed like a scissor cut."""
    H, W = alpha.shape
    ws = float(np.clip(LAND_CUT / u, .02, 1.0))
    sw, sh = max(8, int(round(W * ws))), max(8, int(round(H * ws)))
    small = cv2.resize(bgr_f, (sw, sh), interpolation=cv2.INTER_AREA)
    a_s = cv2.resize(alpha, (sw, sh), interpolation=cv2.INTER_AREA)
    lab = cv2.cvtColor(np.clip(small, 0, 255).astype(np.float32) / 255, cv2.COLOR_BGR2Lab)
    feat = cv2.GaussianBlur(lab, (0, 0), 2.2) * np.float32([1, 2.4, 2.4])
    valid = a_s > .5
    samp = feat[valid].reshape(-1, 3).astype(np.float32)
    if len(samp) < LAND_K * 8: samp = feat.reshape(-1, 3).astype(np.float32)
    cv2.setRNGSeed(7)
    _, _, centers = cv2.kmeans(samp, LAND_K, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, .2), 3, cv2.KMEANS_PP_CENTERS)
    q = ((feat.reshape(-1, 1, 3) - centers[None]) ** 2).sum(2).argmin(1).reshape(sh, sw)
    q = mode_filter(mode_filter(q, 7), 7)
    pid = merge_small(components(q, valid), (LAND_PIECE * ws * u) ** 2, lab)
    return nearest_fill(pid, a_s > .02), ws


def upsample_pieces(pid_s, W, H, ws):
    """Bring the coarse cut up to full size with smooth, scissor-cut edges: every piece's mask is
    enlarged and softened, and each pixel goes to the piece whose mask is strongest there."""
    n = int(pid_s.max()) + 1
    sw, sh = pid_s.shape[1], pid_s.shape[0]
    flat = pid_s.ravel(); order = np.argsort(flat, kind='stable'); bounds = np.searchsorted(flat[order], np.arange(n + 1))
    best = np.full((H, W), -1, np.float32); pid = np.zeros((H, W), np.int32)
    sig = max(.8, .45 / ws)
    pad = int(math.ceil(3 / ws + 3 * sig)) + 2
    for k in range(1, n):
        ix = order[bounds[k]:bounds[k + 1]]
        if not len(ix): continue
        ys, xs = ix // sw, ix % sw
        y0, y1, x0, x1 = max(0, ys.min() - 3), min(sh, ys.max() + 4), max(0, xs.min() - 3), min(sw, xs.max() + 4)
        X0, X1 = max(0, int(x0 / ws) - pad), min(W, int(x1 / ws) + pad)
        Y0, Y1 = max(0, int(y0 / ws) - pad), min(H, int(y1 / ws) + pad)
        m = (pid_s == k).astype(np.float32)
        # map the crop exactly: resize the coarse crop to the size it covers at full resolution
        cx0, cx1 = X0 * ws, X1 * ws; cy0, cy1 = Y0 * ws, Y1 * ws
        M = np.float32([[1 / ws, 0, -cx0 / ws], [0, 1 / ws, -cy0 / ws]])
        big = cv2.warpAffine(m, M, (X1 - X0, Y1 - Y0), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
        big = cv2.GaussianBlur(big, (0, 0), sig)
        sub = best[Y0:Y1, X0:X1]; better = big > sub
        sub[better] = big[better]; pid[Y0:Y1, X0:X1][better] = k
    return pid


def snap_pieces(pid, img8, u):
    """Move each cut onto the painting's own outlines: keep the middle of every piece, and let a
    watershed over the picture settle the edge on the strongest line nearby (eaves, pillar edges,
    door frames), so pieces follow the drawn shapes instead of colour blotches."""
    r = max(1, int(round(3 * u)))
    ker = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
    f = pid.astype(np.float32)
    interior = cv2.dilate(f, ker) == cv2.erode(f, ker)
    markers = np.where(interior, pid + 1, 0).astype(np.int32)
    ws = cv2.watershed(img8, markers)
    lines = ws == -1
    ws = np.where(lines, 0, ws).astype(np.float32)
    ws = np.where(lines, cv2.dilate(ws, np.ones((3, 3), np.uint8)), ws)
    return np.maximum(ws.astype(np.int32) - 1, 0)


# ---------------------------------------------------------------- choosing cloth and thread






# ---------------------------------------------------------------- stitches
class Needle:
    """Hand stitches drawn as little lengths of thread: each one is a rounded capsule with a soft
    shadow, a highlight along its twist, and a needle hole at each end where it enters the cloth."""

    def __init__(self, H, W, u, fine=False):
        self.H, self.W, self.u, self.fine = H, W, u, fine
        self.thread = np.zeros((H, W, 4), np.float32)
        self.hl = np.zeros((H, W, 4), np.float32)
        self.shadow = np.zeros((H, W), np.float32)
        self.holes = np.zeros((H, W), np.float32)
        self.w = max(1.25, THREAD * u * (.7 if fine else 1))

    @staticmethod
    def _capsule(a, b, r):
        d = b - a; L = float(np.hypot(*d))
        t = d / L if L > 1e-6 else np.float32([1, 0]); nrm = np.float32([-t[1], t[0]])
        pts = [a + (t * math.cos(g) + nrm * math.sin(g)) * r for g in np.linspace(math.pi / 2, 3 * math.pi / 2, 7)]
        pts += [b + (t * math.cos(g) + nrm * math.sin(g)) * r for g in np.linspace(-math.pi / 2, math.pi / 2, 7)]
        return (np.array(pts) * 16).round().astype(np.int32)

    def stitch(self, a, b, color, w=None):
        w = w or self.w; r = w / 2
        a = np.float32(a); b = np.float32(b)
        d = b - a; L = float(np.hypot(*d))
        if L < .5: return
        t = d / L; nrm = np.float32([-t[1], t[0]])
        if nrm[1] > 0: nrm = -nrm                      # the side facing the light (up)
        off = np.float32([.35, .55]) * w
        cv2.fillConvexPoly(self.shadow, self._capsule(a + off, b + off, r * 1.05), 1.0, cv2.LINE_AA, 4)
        cv2.fillConvexPoly(self.thread, self._capsule(a, b, r), (*color, 1.0), cv2.LINE_AA, 4)
        light = tuple(float(min(255, c * 1.12 + 16)) for c in color)
        s0, s1 = a + t * r * .5 + nrm * r * .32, b - t * r * .5 + nrm * r * .32
        cv2.fillConvexPoly(self.hl, self._capsule(s0, s1, r * .34), (*light, .35 if self.fine else .5), cv2.LINE_AA, 4)
        if self.fine or not NEEDLE_HOLES: return
        for e in (a - t * r * 1.15, b + t * r * 1.15):
            cv2.circle(self.holes, tuple(int(v) for v in (e * 16).round()), max(1, int(r * .5 * 16)), 1.0, cv2.LINE_AA, 4)

    def cross(self, m, r, color, angle=0.0):
        m = np.float32(m)
        for g in (math.pi / 4, -math.pi / 4):
            v = np.float32([math.cos(g + angle), math.sin(g + angle)]) * r
            self.stitch(m - v, m + v, color)

    def run(self, pts, color, rng, style='running', closed=False):
        """Stitches along a polyline (source pixels): 'running' dashes or 'cross' X stitches."""
        pts = np.asarray(pts, np.float32).reshape(-1, 2)
        if closed: pts = np.vstack([pts, pts[:1]])
        if len(pts) < 2: return
        seg = np.sqrt(((pts[1:] - pts[:-1]) ** 2).sum(1)); L = np.concatenate([[0], np.cumsum(seg)])
        dash, gap = DASH * self.u, GAP * self.u
        if self.fine: dash, gap = dash * .72, gap * .8
        if style == 'cross': dash, gap = DASH * self.u * .8, GAP * self.u * .55
        period = dash + gap
        if L[-1] < period * 3: return
        n = int((L[-1] + gap) // period)
        t = (L[-1] - (n * period - gap)) / 2           # centre the stitches on the run

        def at(d):
            i = int(np.clip(np.searchsorted(L, d) - 1, 0, len(pts) - 2))
            v = (d - L[i]) / max(seg[i], 1e-6)
            return pts[i] * (1 - v) + pts[i + 1] * v, pts[i + 1] - pts[i]
        for _ in range(n):
            a, da = at(t); b, _ = at(t + dash)
            if style == 'cross':
                m = (a + b) / 2; ang = math.atan2(da[1], da[0])
                self.cross(m, dash * .5, color, ang)
            else:
                self.stitch(a, b, color)
            t += period

    def composite(self, col):
        sh = cv2.GaussianBlur(self.shadow, (0, 0), max(.6, self.w * .35))
        col = col * (1 - (.22 if self.fine else .42) * sh[..., None])
        holes = cv2.GaussianBlur(self.holes, (0, 0), max(.4, self.w * .15))
        col = col * (1 - .3 * holes[..., None])
        a = self.thread[..., 3:4]
        col = col * (1 - a) + self.thread[..., :3] * a
        a = self.hl[..., 3:4]
        col = col * (1 - a) + self.hl[..., :3] * np.where(a > 0, 1, 0)
        return col

    def coverage(self):
        return np.clip(self.thread[..., 3], 0, 1)


def blanket(needle, pts, color, pid, k, inset, u):
    """Blanket stitch, the appliqué stitch: bars across the cut edge, joined by a thread that runs
    along the very edge of the piece."""
    H, W = pid.shape
    seg = np.sqrt(((pts[1:] - pts[:-1]) ** 2).sum(1)); Lc = np.concatenate([[0], np.cumsum(seg)])
    step = BLANKET_STEP * u
    if Lc[-1] < step * 2: return
    prev = None
    for d in np.arange(step * .5, Lc[-1], step):
        i = int(np.clip(np.searchsorted(Lc, d) - 1, 0, len(seg) - 1)); v = (d - Lc[i]) / max(seg[i], 1e-6)
        p = pts[i] * (1 - v) + pts[i + 1] * v
        t = pts[i + 1] - pts[i]; t = t / (np.hypot(*t) + 1e-6); nrm = np.float32([-t[1], t[0]])
        q = p + nrm * (inset + u)
        X, Y = int(q[0]), int(q[1])
        if 0 <= X < W and 0 <= Y < H and pid[Y, X] == k: nrm = -nrm          # point it outwards
        edge = p + nrm * inset * .9
        w = needle.w * BLANKET_W
        needle.stitch(p - nrm * inset * .2, edge, color, w)
        if prev is not None and np.hypot(*(edge - prev)) < step * 2.2: needle.stitch(prev, edge, color, w)
        prev = edge


def runs_along(pts, inside, outside_ok, step):
    """Split a closed outline into the runs where the cloth on the outside is one this piece is
    sewn onto (or empty space); returns a list of open polylines."""
    pts = pts.reshape(-1, 2).astype(np.float32)
    if len(pts) < 3: return []
    # resample evenly
    closed = np.vstack([pts, pts[:1]])
    seg = np.sqrt(((closed[1:] - closed[:-1]) ** 2).sum(1)); L = np.concatenate([[0], np.cumsum(seg)])
    if L[-1] < step * 4: return []
    ds = np.arange(0, L[-1], step)
    idx = np.clip(np.searchsorted(L, ds) - 1, 0, len(seg) - 1)
    v = ((ds - L[idx]) / np.maximum(seg[idx], 1e-6))[:, None]
    rs = closed[idx] * (1 - v) + closed[idx + 1] * v
    tan = np.roll(rs, -2, 0) - np.roll(rs, 2, 0)
    nrm = np.stack([tan[:, 1], -tan[:, 0]], 1); nrm /= (np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-6)
    flags = np.array([outside_ok(p, nv) for p, nv in zip(rs, nrm)])
    if flags.all(): return [np.vstack([rs, rs[:1]])]
    if not flags.any(): return []
    start = int(np.argmin(flags))                       # begin at a gap so runs do not wrap
    rs = np.roll(rs, -start, 0); flags = np.roll(flags, -start)
    out, cur = [], []
    for p, f in zip(rs, flags):
        if f: cur.append(p)
        elif cur: out.append(np.array(cur)); cur = []
    if cur: out.append(np.array(cur))
    return out


def smooth_closed(pts, k):
    pts = pts.reshape(-1, 2).astype(np.float32)
    if len(pts) < k * 2 + 3 or k < 1: return pts
    pad = np.vstack([pts[-k:], pts, pts[:k]])
    ker = np.ones(2 * k + 1, np.float32) / (2 * k + 1)
    return np.stack([np.convolve(pad[:, 0], ker, 'valid'), np.convolve(pad[:, 1], ker, 'valid')], 1)


# ---------------------------------------------------------------- embroidery: thick thread fills
def stitch_field(L, u):
    """Which way the stitches run at every pixel: along the painting's structure (hair flow, tile
    rows, leaves), from the smoothed structure tensor; where the picture has no clear direction,
    from a wider neighbourhood. Returns unit vectors (dx, dy)."""
    g = cv2.GaussianBlur(L, (0, 0), max(.8, .9 * u))
    gx = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)
    out = []
    for s in (max(2, 3.5 * u), max(4, 12 * u)):
        jxx = cv2.GaussianBlur(gx * gx, (0, 0), s); jxy = cv2.GaussianBlur(gx * gy, (0, 0), s); jyy = cv2.GaussianBlur(gy * gy, (0, 0), s)
        th = .5 * np.arctan2(2 * jxy, jxx - jyy) + np.pi / 2
        coh = np.sqrt((jxx - jyy) ** 2 + 4 * jxy ** 2) / (jxx + jyy + 1e-3)
        out.append((th, coh))
    (t1, c1), (t2, _) = out
    w = np.clip((c1 - .15) / .3, 0, 1)
    dx = w * np.cos(2 * t1) + (1 - w) * np.cos(2 * t2); dy = w * np.sin(2 * t1) + (1 - w) * np.sin(2 * t2)
    th = .5 * np.arctan2(dy, dx)                                  # blend as doubled angles (no 180 degree flips)
    return np.cos(th).astype(np.float32), np.sin(th).astype(np.float32)


def thread_strokes(region, fdx, fdy, src_lab, u, rng, width, length, cover, key, tol=30):
    """Seed stitches over a region and trace each along the stitch field, both ways, stopping at
    the region's edge or where the colour changes. Returns a list of polylines (source px) and
    the Lab colour sampled at each stitch's middle. Seeds come from a jittered grid hashed by
    position, so the same spot gets the same stitch in every frame of an animation."""
    H, W = region.shape
    w, Ls = width * u, length * u
    g = max(2.0, w * 1.55)
    ys, xs = np.mgrid[g / 2:H:g, g / 2:W:g]
    ys = ys.ravel(); xs = xs.ravel()
    iy, ix = (ys / g).astype(np.int64), (xs / g).astype(np.int64)
    h = (iy * 73856093 ^ ix * 19349663 ^ key) & 0xffffffff
    h1 = ((h * 2654435761) & 0xffffffff) / 4294967296.0; h2 = ((h * 40503 + 12345) & 0xffffffff) / 4294967296.0
    h3 = ((h * 69069 + 1) & 0xffffffff) / 4294967296.0
    xs = xs + (h1 - .5) * g; ys = ys + (h2 - .5) * g
    keep = h3 < cover * g * g / (w * Ls)
    xs, ys = xs[keep], ys[keep]
    ok = (xs >= 0) & (xs < W - 1) & (ys >= 0) & (ys < H - 1)
    xs, ys = xs[ok], ys[ok]
    ok = region[ys.astype(int), xs.astype(int)]
    xs, ys = xs[ok], ys[ok]
    if not len(xs): return [], np.zeros((0, 3), np.float32)
    lens = Ls * (.75 + .5 * ((((ys * 31 + xs * 17).astype(np.int64)) % 97) / 97.0))
    steps = 6
    st = lens / (2 * steps)
    c0 = src_lab[ys.astype(int), xs.astype(int)]
    paths = np.zeros((len(xs), 2 * steps + 1, 2), np.float32)
    paths[:, steps] = np.stack([xs, ys], 1)
    for sgn, rng_ in ((1, range(steps + 1, 2 * steps + 1)), (-1, range(steps - 1, -1, -1))):
        px, py = xs.copy(), ys.copy(); pdx = None; alive = np.ones(len(xs), bool)
        for j in rng_:
            iy_, ix_ = np.clip(py.astype(int), 0, H - 1), np.clip(px.astype(int), 0, W - 1)
            dx, dy = fdx[iy_, ix_] * sgn, fdy[iy_, ix_] * sgn
            if pdx is not None:
                flip = dx * pdx[0] + dy * pdx[1] < 0
                dx = np.where(flip, -dx, dx); dy = np.where(flip, -dy, dy)
            nx, ny = px + dx * st, py + dy * st
            iy2, ix2 = np.clip(ny.astype(int), 0, H - 1), np.clip(nx.astype(int), 0, W - 1)
            inside = region[iy2, ix2] & (np.abs(src_lab[iy2, ix2] - c0).sum(1) < tol)
            alive &= inside
            px = np.where(alive, nx, px); py = np.where(alive, ny, py)
            pdx = (dx, dy)
            paths[:, j] = np.stack([px, py], 1)
    mid = paths[:, steps]
    col = src_lab[np.clip(mid[:, 1].astype(int), 0, H - 1), np.clip(mid[:, 0].astype(int), 0, W - 1)]
    span = np.linalg.norm(paths[:, -1] - paths[:, 0], axis=1)
    good = span > w * 1.2
    order = np.argsort(rng.random(int(good.sum())))
    pg = paths[good]
    return [pg[i] for i in order], col[good][order]


def draw_thread(col, pts, color, w, under, soft=False, fine=False):
    """One length of floss: a soft shadow, a darker rounded body, a lighter core, a highlight on the
    lit side and the diagonal twist of its plies."""
    p = (pts * 4).round().astype(np.int32).reshape(-1, 1, 2)
    t = pts[-1] - pts[0]; n = float(np.hypot(*t)) or 1.0; t = t / n; nrm = np.float32([-t[1], t[0]])
    if nrm[1] > 0: nrm = -nrm
    c = np.asarray(color, np.float32)
    if fine:   # fine thread painting: a slim strand with a faint shade and sheen
        off = np.float32([.2, .3]) * w
        cv2.polylines(col, [((pts + off) * 4).round().astype(np.int32).reshape(-1, 1, 2)], False, tuple(map(float, under * .84)), max(1, int(round(w * 1.05))), cv2.LINE_AA, 2)
        cv2.polylines(col, [p], False, tuple(map(float, c * .9)), max(1, int(round(w))), cv2.LINE_AA, 2)
        if w >= 2.2: cv2.polylines(col, [p], False, tuple(map(float, c * 1.02)), max(1, int(round(w * .55))), cv2.LINE_AA, 2)
        hl = ((pts + nrm * w * .2) * 4).round().astype(np.int32).reshape(-1, 1, 2)
        cv2.polylines(col, [hl], False, tuple(map(float, np.minimum(255, c * 1.09 + 6))), max(1, int(round(w * .22))), cv2.LINE_AA, 2)
        return
    off = np.float32([.35, .55]) * w
    cv2.polylines(col, [((pts + off) * 4).round().astype(np.int32).reshape(-1, 1, 2)], False, tuple(map(float, under * .55)), max(1, int(round(w * 1.1))), cv2.LINE_AA, 2)
    cv2.polylines(col, [p], False, tuple(map(float, c * (.86 if soft else .72))), max(1, int(round(w))), cv2.LINE_AA, 2)
    cv2.polylines(col, [p], False, tuple(map(float, c)), max(1, int(round(w * .62))), cv2.LINE_AA, 2)
    hl = ((pts + nrm * w * .17) * 4).round().astype(np.int32).reshape(-1, 1, 2)
    cv2.polylines(col, [hl], False, tuple(map(float, np.minimum(255, c * (1.1 if soft else 1.2) + (8 if soft else 22)))), max(1, int(round(w * .24))), cv2.LINE_AA, 2)
    if soft: return
    seg = np.sqrt(((pts[1:] - pts[:-1]) ** 2).sum(1)); Lc = np.concatenate([[0], np.cumsum(seg)])
    if Lc[-1] < w * 1.5: return
    tw = tuple(map(float, c * .8)); a = math.radians(50)
    for d in np.arange(w * 1.2, Lc[-1] - w * .6, w * 2.4):
        i = int(np.clip(np.searchsorted(Lc, d) - 1, 0, len(seg) - 1)); v = (d - Lc[i]) / max(seg[i], 1e-6)
        q = pts[i] * (1 - v) + pts[i + 1] * v
        dd = pts[i + 1] - pts[i]; dd = dd / (np.hypot(*dd) + 1e-6)
        r = np.float32([dd[0] * math.cos(a) - dd[1] * math.sin(a), dd[0] * math.sin(a) + dd[1] * math.cos(a)]) * w * .42
        cv2.line(col, tuple(int(x) for x in ((q - r) * 4).round()), tuple(int(x) for x in ((q + r) * 4).round()), tw, max(1, int(round(w * .16))), cv2.LINE_AA, 2)


def chain_stitch(col, pts, color, w, step):
    """Chain stitch: a row of little thread loops, each caught inside the one before."""
    seg = np.sqrt(((pts[1:] - pts[:-1]) ** 2).sum(1)); Lc = np.concatenate([[0], np.cumsum(seg)])
    if Lc[-1] < step * 2: return
    c = np.asarray(color, np.float32)

    def at(d):
        i = int(np.clip(np.searchsorted(Lc, d) - 1, 0, len(seg) - 1)); v = (d - Lc[i]) / max(seg[i], 1e-6)
        return pts[i] * (1 - v) + pts[i + 1] * v
    for d in np.arange(0, Lc[-1] - step * .9, step):
        a, b = at(d), at(min(Lc[-1], d + step * 1.15))
        t = b - a; n_ = float(np.hypot(*t)) or 1.0; t /= n_; nm = np.float32([-t[1], t[0]])
        ang = np.linspace(0, 2 * math.pi, 13)
        cen = (a + b) / 2; ra, rb = n_ * .55, max(w * .9, n_ * .3)
        loop = np.stack([cen + t * ra * math.cos(g) + nm * rb * math.sin(g) for g in ang]).astype(np.float32)
        draw_thread(col, loop, c, w, c * .55, soft=True)




def embroider(col, region, src_bgr, L, u, rng, key, width=None, length=None, cover=None, soft=False, strict=True, fine=False, field=None):
    """Fill a region with thick, visibly spaced stitches that follow its structure, over a darker
    underlay of the same cloth that shows through the gaps."""
    if not region.any(): return col, np.zeros(region.shape, np.float32)
    width = width or EMB_W; length = length or EMB_L; cover = cover or EMB_COVER
    fdx, fdy = field if field is not None else stitch_field(L, u)
    src_lab = cv2.cvtColor(np.clip(src_bgr, 0, 255).astype(np.float32) / 255, cv2.COLOR_BGR2Lab)
    if fine:   # thread painting: dense slim stitches over the painting itself, no gaps showing
        under = src_bgr
        col = np.where(region[..., None], src_bgr, col)
    else:
        under = cv2.GaussianBlur(src_bgr, (0, 0), 2 * u) * .74
        col = np.where(region[..., None], under * (col / np.maximum(src_bgr, 1)).clip(.85, 1.15), col)
    paths, cols = thread_strokes(region, fdx, fdy, src_lab, u, rng, width, length, cover, key, tol=24 if fine else (48 if soft else 30))
    cover_map = np.zeros(region.shape, np.float32)
    w = width * u
    ref = np.median(cols, 0) if len(cols) else None
    for pts, c in zip(paths, cols):
        if soft and strict and abs(float(c[0] - ref[0])) + abs(float(c[1] - ref[1])) + abs(float(c[2] - ref[2])) > 40: continue
        cl = c.copy(); cl[0] = np.clip((cl[0] + (rng.random() - .5) * 3) if fine else (round(cl[0] / 5) * 5 + (rng.random() - .5) * 4), 4, 96)
        bgr = (cv2.cvtColor(cl.reshape(1, 1, 3).astype(np.float32), cv2.COLOR_Lab2BGR) * 255).reshape(3)
        m = pts[len(pts) // 2]
        un = under[int(np.clip(m[1], 0, region.shape[0] - 1)), int(np.clip(m[0], 0, region.shape[1] - 1))]
        draw_thread(col, pts, bgr, w, un, soft, fine)
        cv2.polylines(cover_map, [(pts * 4).round().astype(np.int32).reshape(-1, 1, 2)], False, 1.0, max(1, int(round(w))), cv2.LINE_AA, 2)
    return col, cover_map


# ---------------------------------------------------------------- Hanjing: face, clothes
def garments(col, lab, solid, u, night, rng):
    """Hanjing's clothes, each in its own cloth, recognised by colour: the camel trench coat in
    gabardine twill, the white shirt in silk with a soft sheen, the trousers in herringbone suiting,
    the shoes in grained leather; at night the black silk qipao with its gloss. (Gold embroidery
    on the qipao is sewn later, in thread.)"""
    H, W = solid.shape
    Lb = cv2.GaussianBlur(lab, (0, 0), max(.8, .5 * u))
    L, A, B = Lb[..., 0], Lb[..., 1], Lb[..., 2]
    C = np.hypot(A, B); h = np.degrees(np.arctan2(B, A)) % 360
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    tex = np.ones((H, W), np.float32); add = np.zeros((H, W), np.float32)
    # gabardine: a steep, fine twill
    a = math.radians(63); d = (x * math.cos(a) + y * math.sin(a)) / (1.5 * u)
    gab = 1 + .07 * np.cos(2 * math.pi * d) + (_noise(H, W, max(1, .8 * u), rng) - .5) * .04
    coat = solid & (L > 45) & (L < 86) & (h > 58) & (h < 90) & (C > 16) & (C < 46)
    tex = np.where(coat, gab, tex)
    # silk: smooth, with long soft highlights
    sheen = _noise(H, W, 9 * u, rng)
    sheen = cv2.GaussianBlur(sheen, (0, 0), 2 * u, sigmaY=6 * u)
    shirt = solid & (L > 78) & (C < 9)
    tex = np.where(shirt, 1 + (sheen - .5) * .1, tex)
    # suiting: herringbone, the twill turning every few threads
    bw = 2.6 * u; s_ = np.where((np.floor(x / bw) % 2) > 0, 1.0, -1.0)
    hb = 1 + .06 * np.cos(2 * math.pi * (y + s_ * (x % bw)) / (1.3 * u))
    trousers = solid & (L > 18) & (L < 55) & (C < 14)
    tex = np.where(trousers, hb, tex)
    # leather: fine pebble grain and a little shine
    leather = solid & (L > 14) & (L < 50) & (h > 25) & (h < 70) & (C > 14) & (C < 40)
    tex = np.where(leather, 1 + (_noise(H, W, max(1, .5 * u), rng) - .5) * .1, tex)
    add = np.where(leather, np.clip(sheen - .55, 0, 1) * 30, add)
    if night:   # black silk: deep, with glossy bands where it folds
        silk = solid & (L < 24)
        gloss = np.clip((sheen - .45) * 2.2, 0, 1) ** 1.5
        add = np.where(silk, gloss * 34, add)
    return np.clip(col * tex[..., None] + add[..., None], 0, 255)


def gold_threads(lab, solid, night):
    """The gold leaves embroidered on the night qipao."""
    if not night: return None
    Lb = lab
    C = np.hypot(Lb[..., 1], Lb[..., 2]); h = np.degrees(np.arctan2(Lb[..., 2], Lb[..., 1])) % 360
    g = solid & (h > 60) & (h < 100) & (C > 24) & (Lb[..., 0] > 40) & (Lb[..., 0] < 92)
    g = cv2.morphologyEx(g.astype(np.uint8), cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)) > 0
    return g if g.any() else None


def big_face(zone, u):
    """Whether a face is drawn large enough in the picture (wider than ~150 source px) for its
    features to be embroidered stitch by stitch; smaller faces keep the painted features."""
    nz, zc, st, _ = cv2.connectedComponentsWithStats(zone.astype(np.uint8), 8)
    return nz > 1 and int(st[1:, cv2.CC_STAT_WIDTH].max()) >= 150


def main_features(feats, zone, lab, u):
    """Pick out only the eyes, brows, nostrils and mouth among the marks inside a face: the mouth is
    the reddest mark, each eye the darkest mark on its side at eye height, its brow the largest mark
    just above it, the nostrils small dark marks between. Returns a mask of those (jaw lines and
    shading are left alone, so the face does not look older)."""
    nz, zc = cv2.connectedComponents(zone.astype(np.uint8), connectivity=8)
    nf, fc, fst, fcen = cv2.connectedComponentsWithStats(feats.astype(np.uint8), 8)
    keep = np.zeros(nf, bool)
    if nf < 2: return keep[fc]
    A = lab[..., 1]; L = lab[..., 0]
    red = np.zeros(nf); dark = np.zeros(nf); owner = np.zeros(nf, int)
    for j in range(1, nf):
        m = fc == j
        red[j] = float(np.median(A[m])); dark[j] = float(np.percentile(L[m], 10)); owner[j] = int(np.bincount(zc[m]).argmax())
    for z in range(1, nz):
        mine = [j for j in range(1, nf) if owner[j] == z]
        if len(mine) < 3: continue
        lips = max(mine, key=lambda j: red[j])
        if red[lips] < 14: continue
        lx, ly = fcen[lips]
        xs = np.nonzero(zone[int(ly)] & (zc[int(ly)] == z))[0]
        fw = float(xs.max() - xs.min()) if len(xs) else fst[lips, cv2.CC_STAT_WIDTH] * 2.5
        keep[lips] = True
        for side in (-1, 1):
            cand = [j for j in mine if j != lips and (fcen[j][0] - lx) * side > fw * .08 and ly - fw * .75 < fcen[j][1] < ly - fw * .22]
            if not cand: continue
            eye = min(cand, key=lambda j: dark[j]); keep[eye] = True
            ex, ey = fcen[eye]
            brows = [j for j in mine if j not in (lips, eye) and (fcen[j][0] - lx) * side > 0 and abs(fcen[j][0] - ex) < fw * .22
                     and ey - fw * .38 < fcen[j][1] < ey - fw * .05]
            if brows: keep[max(brows, key=lambda j: fst[j, cv2.CC_STAT_AREA])] = True
        for j in mine:
            if not keep[j] and abs(fcen[j][0] - lx) < fw * .16 and ly - fw * .32 < fcen[j][1] < ly - fw * .06 and fst[j, cv2.CC_STAT_AREA] < (3 * u) ** 2:
                keep[j] = True
    return keep[fc]


def face_zone(lab, solid, u, night=False):
    """Hanjing's face, neck and hands, and the facial features inside the face. Lit skin is found
    by its warm hue (the camel coat and the white shirt are yellower, so they stay out); the zone is
    that skin with its enclosed holes and shadows filled. Features are small marks inside it that
    are clearly darker or redder than the skin around them (eyes, brows, nostrils, lips)."""
    Lb = cv2.GaussianBlur(lab, (0, 0), max(.8, .5 * u))
    Lh, A, B = Lb[..., 0], Lb[..., 1], Lb[..., 2]
    C = np.hypot(A, B); hh = np.degrees(np.arctan2(B, A)) % 360
    core = solid & (Lh > 62) & (Lh < 96) & (C > 11) & (C < 36) & (hh > 28) & (hh < (68 if night else 62))
    k = max(3, int(round(1.2 * u)) | 1)
    ker = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    core = cv2.morphologyEx(core.astype(np.uint8), cv2.MORPH_OPEN, ker)
    nlab, cc, stats, _ = cv2.connectedComponentsWithStats(core, 8)
    big = np.zeros(nlab, bool); big[1:] = stats[1:, cv2.CC_STAT_AREA] >= (6 * u) ** 2
    core = big[cc].astype(np.uint8)
    if not core.any(): return None, None
    k2 = max(5, int(round(4 * u)) | 1)
    zone = cv2.morphologyEx(core, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k2, k2)))
    holes = zone.copy(); hh_ = np.zeros((zone.shape[0] + 2, zone.shape[1] + 2), np.uint8)
    cv2.floodFill(holes, hh_, (0, 0), 1)
    zone = (zone | (1 - holes)) > 0
    zone &= solid
    sf = core.astype(np.float32)
    local = cv2.GaussianBlur(Lh * sf, (0, 0), 3 * u) / (cv2.GaussianBlur(sf, (0, 0), 3 * u) + 1e-4)
    inner = cv2.erode(zone.astype(np.uint8), ker) > 0
    cand = inner & ((Lh < local - 13) | ((core == 0) & (A > np.median(A[core > 0]) + 8)))
    nlab, cc, stats, _ = cv2.connectedComponentsWithStats(cand.astype(np.uint8), 8)
    small = np.zeros(nlab, bool); small[1:] = (stats[1:, cv2.CC_STAT_AREA] <= (9 * u) ** 2) & (stats[1:, cv2.CC_STAT_AREA] >= max(2, (.6 * u) ** 2))
    return zone, small[cc]


# ---------------------------------------------------------------- silk: fine thread painting
SILK_LIGHT = math.radians(-35)      # the direction light falls on the silk, for its sheen


def lic(fdx, fdy, noise, length, step):
    """Line integral convolution: smear thread-sized noise along the stitch direction, so it reads
    as fine parallel threads that bend with the structure of the picture."""
    H, W = noise.shape
    gy, gx = np.mgrid[0:H, 0:W].astype(np.float32)
    acc = noise.copy(); wsum = np.ones((H, W), np.float32)
    n = max(1, int(round(length / 2 / step)))
    for sgn in (1.0, -1.0):
        px, py = gx.copy(), gy.copy()
        pdx, pdy = fdx * sgn, fdy * sgn
        for k in range(n):
            px += pdx * step; py += pdy * step
            dx = cv2.remap(fdx, px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            dy = cv2.remap(fdy, px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            flip = (dx * pdx + dy * pdy) < 0
            pdx = np.where(flip, -dx, dx); pdy = np.where(flip, -dy, dy)
            wk = 1.0 - (k + 1) / (n + 1)
            acc += cv2.remap(noise, px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT) * wk
            wsum += wk
    return acc / wsum


def silk(col, region, src, L, u, rng, width, length, contrast, sheen=.06, raised=0.0, field_sigma=1.0):
    """Suzhou-style thread painting over a region: the painting's own colours laid in fine parallel
    threads that follow its structure, each thread a little lighter or darker than the next, with
    the silk's sheen changing as the threads turn. With `raised`, the embroidery stands up from the
    cloth: a soft shadow below and to the right of it, and a lit upper edge."""
    H, W = region.shape
    ys, xs = np.nonzero(region)
    if not len(ys): return col
    pad = int(length * u) + 6
    y0, y1 = max(0, ys.min() - pad), min(H, ys.max() + pad + 1)
    x0, x1 = max(0, xs.min() - pad), min(W, xs.max() + pad + 1)
    m = region[y0:y1, x0:x1]
    h, w = m.shape
    fdx, fdy = stitch_field(L[y0:y1, x0:x1], u * field_sigma)
    wp = max(1.0, width * u)
    g = rng.random((int(h / wp) + 3, int(w / wp) + 3)).astype(np.float32)
    noise = cv2.resize(g, (int(round(g.shape[1] * wp)), int(round(g.shape[0] * wp))), interpolation=cv2.INTER_LINEAR)[:h, :w]
    t = lic(fdx, fdy, noise, length * u, max(.75, wp * .55))
    mu, sd = float(t[m].mean()), float(t[m].std()) + 1e-6
    t = np.tanh((t - mu) / sd * .9)
    sh = np.cos(2 * (np.arctan2(fdy, fdx) - SILK_LIGHT))
    out = src[y0:y1, x0:x1] * ((1 + contrast * t) * (1 + sheen * sh))[..., None]
    a = cv2.GaussianBlur(m.astype(np.float32), (0, 0), max(.5, .3 * u))[..., None]
    sub = col[y0:y1, x0:x1] * (1 - a) + out * a
    if raised:
        dx_, dy_ = max(1, int(round(.6 * u))), max(1, int(round(.9 * u)))
        mf = m.astype(np.float32)
        below = np.zeros_like(mf); below[dy_:, dx_:] = mf[:-dy_, :-dx_]      # the region, moved down-right
        shadow = cv2.GaussianBlur(below * (1 - mf), (0, 0), max(.6, .6 * u))
        rim = cv2.GaussianBlur(mf * (1 - below), (0, 0), max(.5, .4 * u))
        sub = sub * (1 - raised * shadow + raised * .5 * rim)[..., None]
    col[y0:y1, x0:x1] = sub
    return col


def tone(bgr, k=1.0, darker=False):
    """A thread colour that shows on a cloth without shouting: a shade darker on light cloth, a
    shade lighter on dark cloth (or always darker), a little less saturated."""
    lab = cv2.cvtColor(np.float32(bgr).reshape(1, 1, 3) / 255, cv2.COLOR_BGR2Lab).reshape(3)
    lab[0] = lab[0] - 22 * k if (lab[0] > 52 or darker) else lab[0] + 17 * k
    lab[1:] *= .88
    return tuple(map(float, (cv2.cvtColor(lab.reshape(1, 1, 3).astype(np.float32), cv2.COLOR_Lab2BGR) * 255).reshape(3)))


def back_stitch_line(needle, pts, bgr, u, avoid=None, width=None, dash=None, gap=None):
    """Back stitch along a closed outline, skipping the parts inside `avoid`; each stitch takes
    its colour from the cloth just inside it."""
    H, W = bgr.shape[:2]
    pts = np.asarray(pts, np.float32).reshape(-1, 2)
    seg = np.sqrt(((pts[1:] - pts[:-1]) ** 2).sum(1)); Lc = np.concatenate([[0], np.cumsum(seg)])
    dash = dash or OUTLINE_DASH * u; gap = gap or OUTLINE_GAP * u; width = width or max(1.0, OUTLINE_W * u)
    if Lc[-1] < (dash + gap) * 3: return

    def at(d):
        i = int(np.clip(np.searchsorted(Lc, d) - 1, 0, len(seg) - 1)); v = (d - Lc[i]) / max(seg[i], 1e-6)
        return pts[i] * (1 - v) + pts[i + 1] * v
    d = 0.0
    while d + dash < Lc[-1]:
        a, b = at(d), at(d + dash)
        mx, my = int(np.clip((a[0] + b[0]) / 2, 0, W - 1)), int(np.clip((a[1] + b[1]) / 2, 0, H - 1))
        if avoid is None or not avoid[my, mx]:
            needle.stitch(a, b, tone(bgr[my, mx]), width)
        d += dash + gap


def cloth_v4(lab_mean, rng):
    """The cloth for a plain appliqué piece, from its colour: felt for leaves and moss, navy denim
    for slate and indigo, burlap for dark timber, linen for light plaster, cotton or linen else."""
    L, a, b = lab_mean; C = math.hypot(a, b); h = math.degrees(math.atan2(b, a)) % 360
    if 95 < h < 200 and C > 9: return 'felt'
    if L < 58 and (C < 9 or 200 <= h <= 300): return 'denim'
    if L < 45 and 45 <= h <= 95: return 'burlap'
    if L > 70: return 'linen'
    return 'cotton' if rng.random() < .6 else 'linen'


def frayed(alpha, solid, col, u, rng):
    """Fray the outer edge of a cut-out: fibres stand out of the edge and some of it is torn."""
    H, W = solid.shape
    d2 = cv2.distanceTransform(solid.astype(np.uint8), cv2.DIST_L2, 3)
    fib = _noise(H, W, max(1.2, u * .7), rng); torn = _noise(H, W, max(6, u * 10), rng)
    band = max(1.3, u * 1.4)
    e = d2 / band - (torn - .5) * 1.0
    keep_px = (e > .9) | ((e > .2) & (fib > .58 - e * .35))
    out_alpha = np.where(solid & ~keep_px, 0, alpha)
    fringe = solid & keep_px & (d2 < band * 1.5)
    col[fringe] = col[fringe] * .9 + 20
    return out_alpha


def loose_threads(needle, sil, col, u, rng, every=520):
    H, W = sil.shape
    threads = np.zeros((H, W), np.float32)
    cs, _ = cv2.findContours(sil.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    for c in cs:
        pts = c.reshape(-1, 2)
        if len(pts) < 260 * u: continue
        step = int(every * u)
        for s0 in range(int(rng.random() * step), len(pts), step):
            a = pts[s0].astype(np.float32); b = pts[(s0 + max(3, int(3 * u))) % len(pts)].astype(np.float32)
            tdir = b - a; nrm = np.float32([tdir[1], -tdir[0]]); nrm /= (np.linalg.norm(nrm) + 1e-6)
            pr = (a + nrm * 3 * u).astype(int)
            if 0 <= pr[1] < H and 0 <= pr[0] < W and sil[pr[1], pr[0]]: nrm = -nrm
            length = (8 + rng.random() * 10) * u; bend = (rng.random() - .5) * 2.2
            tc = tone(col[min(H - 1, max(0, int(a[1]))), min(W - 1, max(0, int(a[0])))])
            prev = a - nrm * 2.5 * u
            for kk in range(1, 9):
                tt = kk / 8; ang = bend * tt * tt
                v = np.float32([nrm[0] * math.cos(ang) - nrm[1] * math.sin(ang), nrm[0] * math.sin(ang) + nrm[1] * math.cos(ang)])
                cur = a - nrm * 2.5 * u + v * length * tt
                needle.stitch(prev, cur, tc, needle.w * .6)
                cv2.line(threads, tuple(int(x) for x in (prev * 4)), tuple(int(x) for x in (cur * 4)), 1.0, max(1, int(needle.w * .6)), cv2.LINE_AA, 2)
                prev = cur
    return threads


def lift(col, a, u):
    """A cut-out lying on the backing: a soft shadow below and to the right of it."""
    sh = cv2.GaussianBlur(a, (0, 0), 1.6 * u)
    sh = np.roll(np.roll(sh, int(round(2.0 * u)), 0), int(round(1.2 * u)), 1) * .34
    fa = a + sh * (1 - a)
    rgb = (col * a[..., None] + np.float32([30, 40, 52]) * (sh * (1 - a))[..., None]) / np.maximum(fa, 1e-4)[..., None]
    return np.dstack([np.clip(rgb, 0, 255), np.clip(fa * 255, 0, 255)]).astype(np.uint8)


# ---------------------------------------------------------------- the pipeline
def prepare(img):
    if img.ndim == 2: img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGRA)
    if img.shape[2] == 3: img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    bgr = img[:, :, :3].astype(np.float32); alpha = img[:, :, 3].astype(np.float32) / 255
    solid = alpha > .5
    if not solid.all():   # transparent pixels take the nearby colour, so blurs pull in no dark fringe
        wsum = cv2.GaussianBlur(alpha, (0, 0), 6) + 1e-4
        fill = cv2.GaussianBlur(bgr * alpha[..., None], (0, 0), 6) / wsum[..., None]
        bgr = np.where(alpha[..., None] > .02, bgr, fill)
    return bgr, alpha, solid


def fabricize(name, img, over=1):
    rng = np.random.default_rng(sum(map(ord, name)) * 7919 + 11)
    kind = kind_of(name)
    u = float(np.clip(over / scale_of(name), .5, 8))          # source pixels per screen pixel
    bgr_f, alpha, solid = prepare(img)
    H, W = alpha.shape
    if kind == 'texture':
        return texture(name, img[:, :, :3].astype(np.float32), alpha, u, rng)
    lab_o = cv2.cvtColor(np.clip(bgr_f, 0, 255) / 255, cv2.COLOR_BGR2Lab)
    L_o = lab_o[..., 0]
    src = cv2.GaussianBlur(np.clip(bgr_f, 0, 255), (0, 0), max(.5, .35 * u))
    if kind == 'silk':
        # a landscape or a tree in the distance, worked entirely as Suzhou thread painting
        col = silk(bgr_f.copy(), solid, src, L_o, u, rng, *SILK_BG)
        return np.dstack([np.clip(col, 0, 255), np.clip(alpha * 255, 0, 255)]).astype(np.uint8)
    if kind == 'fur':
        return fur(name, bgr_f, alpha, solid, lab_o, src, u, rng)
    if kind == 'figure':
        return figure(name, bgr_f, alpha, solid, lab_o, src, u, rng)
    res = appliqué(name, bgr_f, alpha, solid, lab_o, src, u, rng, over)
    for rect, sc, motif in EMB_REGIONS.get(name, ()):
        x0, y0, x1, y1 = [int(round(v * over)) for v in rect]
        res[y0:y1, x0:x1] = distant_embroidery(img[y0:y1, x0:x1], over / sc, rng, x0 + y0, motif)
    return res


def distant_embroidery(img, u, rng, key, motif='building'):
    """A small motif worked all over in embroidery so it still reads as stitched when small. A
    building far off: satin floss on the tiled roofs, fine silk on walls, columns and railings in the
    painting's own colours. A lotus (flower, bud, leaves): satin floss over every petal and leaf,
    following its veins. Either way a back stitch runs round the whole motif."""
    bgr_f, alpha, solid = prepare(img)
    H, W = solid.shape
    lab_o = cv2.cvtColor(np.clip(bgr_f, 0, 255) / 255, cv2.COLOR_BGR2Lab); L_o = lab_o[..., 0]
    src = cv2.GaussianBlur(np.clip(bgr_f, 0, 255), (0, 0), max(.5, .35 * u))
    col = cv2.bilateralFilter(np.clip(bgr_f, 0, 255).astype(np.uint8), 0, 22, max(2.0, 1.5 * u)).astype(np.float32)
    Lb = cv2.GaussianBlur(lab_o, (0, 0), max(.8, .6 * u))
    C = np.hypot(Lb[..., 1], Lb[..., 2]); hh = np.degrees(np.arctan2(Lb[..., 2], Lb[..., 1])) % 360
    roof = solid & (((hh > 95) & (hh < 230) & (C > 3)) | ((C < 6) & (Lb[..., 0] < 50)))
    field = None
    if motif != 'building':   # a lotus: petals and leaf veins spread from one point, and so do the stitches
        roof = solid.copy()
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        dx, dy = xx - motif[0] * W, yy - motif[1] * H
        n = np.sqrt(dx * dx + dy * dy) + 1e-3
        field = (dx / n, dy / n)
    k = max(3, int(round(1.2 * u)) | 1)
    roof = cv2.morphologyEx(roof.astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))) > 0
    col, _ = embroider(col, roof, src, L_o, u, rng, key, width=1.1 if field is None else .9, length=5.0 if field is None else 5.5, cover=.85 if field is None else .95, field=field)
    if motif == 'building': col = silk(col, solid & ~roof, src, L_o, u, rng, .65, 3.0, .2, .07, .35, 3.0)
    needle = Needle(H, W, u, fine=True)
    r = max(1, int(round(.8 * u)))
    m_in = cv2.erode(solid.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1)))
    cs, _ = cv2.findContours(m_in, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    for c in cs:
        if cv2.contourArea(c) < (10 * u) ** 2: continue
        pts = smooth_closed(c, max(1, int(round(.8 * u))))
        back_stitch_line(needle, np.vstack([pts, pts[:1]]), col, u, dash=2.0 * u, gap=.6 * u)
    col = needle.composite(col)
    return np.dstack([np.clip(col, 0, 255), np.clip(alpha * 255, 0, 255)]).astype(np.uint8)


def fur(name, bgr_f, alpha, solid, lab_o, src, u, rng):
    """A cat: short fine stitches all over that follow its fur, with its eyes and nose left clear."""
    L_o = lab_o[..., 0]
    col = silk(bgr_f.copy(), solid, bgr_f, L_o, u, rng, *SILK_FUR)
    sf = solid.astype(np.float32)
    local = cv2.GaussianBlur(L_o * sf, (0, 0), 3 * u) / (cv2.GaussianBlur(sf, (0, 0), 3 * u) + 1e-4)
    fur_mean = cv2.GaussianBlur(lab_o * sf[..., None], (0, 0), 4 * u) / (cv2.GaussianBlur(sf, (0, 0), 4 * u)[..., None] + 1e-4)
    unlike = np.sqrt((((cv2.GaussianBlur(lab_o, (0, 0), max(.6, .4 * u)) - fur_mean) * [.6, 1, 1]) ** 2).sum(2)) > 20
    nlab, cc, stats, _ = cv2.connectedComponentsWithStats((solid & ((L_o < local - 18) | unlike)).astype(np.uint8), 8)
    small = np.zeros(nlab, bool); small[1:] = (stats[1:, cv2.CC_STAT_AREA] <= (10 * u) ** 2) & (stats[1:, cv2.CC_STAT_AREA] >= max(2, (.5 * u) ** 2))
    keep = cv2.GaussianBlur(small[cc].astype(np.float32), (0, 0), max(.5, .3 * u))[..., None]
    col = col * (1 - keep) + bgr_f * keep
    if name in FUR_RIG:
        return np.dstack([np.clip(col, 0, 255), np.clip(alpha * 255, 0, 255)]).astype(np.uint8)
    return lift(col, alpha, u)


def figure(name, bgr_f, alpha, solid, lab_o, src, u, rng):
    """Hanjing. The painting is kept (her shape must stay exact for the animation), with each
    garment in its own cloth, her hair in fine silk thread, a back stitch round her outline so
    she reads as one piece sewn on the scene, and her face clear: painted when she moves,
    embroidered in fine silk when she stands still facing us."""
    L_o = lab_o[..., 0]; H, W = solid.shape
    night = 'night' in name
    face_only = 'expression' in name
    p = max(WEAVE * u, 2.6)
    pid_s, ws = cut_pieces(bgr_f, alpha, u, face_only, True, rng)
    pid = upsample_pieces(pid_s, W, H, ws)
    pid = snap_pieces(pid, np.clip(bgr_f, 0, 255).astype(np.uint8), u)
    n = int(pid.max()) + 1
    w8 = solid.ravel().astype(np.float64)
    cnt = np.bincount(pid.ravel(), weights=w8, minlength=n)
    mean = np.stack([np.bincount(pid.ravel(), weights=lab_o[..., c].ravel() * w8, minlength=n) for c in range(3)], 1) / np.maximum(cnt, 1)[:, None]
    area_screen = cnt / (u * u)
    L_fi = cv2.GaussianBlur(L_o, (0, 0), max(.5, .5 * u)) - cv2.GaussianBlur(L_o, (0, 0), 2.5 * u)
    L_lo = cv2.GaussianBlur(L_o, (0, 0), 2.5 * u)
    kl, kf, kc = (.92, .85, .7) if face_only else (.7, .8, .55)
    out = np.empty_like(lab_o)
    out[..., 0] = mean[pid, 0] + kl * (L_lo - mean[pid, 0]) + kf * L_fi
    out[..., 1:] = mean[pid, 1:] * (1 - kc) + cv2.GaussianBlur(lab_o[..., 1:], (0, 0), max(.6, .6 * u)) * kc
    out[..., 0] = np.clip(out[..., 0], 4, 97)
    col = cv2.cvtColor(out, cv2.COLOR_Lab2BGR) * 255
    col = col * (1 + (weave(H, W, max(p, 3.6 * u), rng, soft=True) - 1) * .6)[..., None]
    col = garments(col, lab_o, solid, u, night, rng)
    # pieces are padded a little at their edges and lit from the upper left
    edge = np.zeros((H, W), np.uint8)
    edge[:, 1:] |= (pid[:, 1:] != pid[:, :-1]); edge[:, :-1] |= (pid[:, 1:] != pid[:, :-1])
    edge[1:, :] |= (pid[1:, :] != pid[:-1, :]); edge[:-1, :] |= (pid[1:, :] != pid[:-1, :])
    edge |= (~solid).astype(np.uint8)
    dist = cv2.distanceTransform(1 - edge, cv2.DIST_L2, 5)
    R = 3.0 * u
    hgt = cv2.GaussianBlur(1 - (1 - np.clip(dist / R, 0, 1)) ** 2, (0, 0), max(.6, .35 * u))
    gx = cv2.Sobel(hgt, cv2.CV_32F, 1, 0, ksize=3) / 8; gy = cv2.Sobel(hgt, cv2.CV_32F, 0, 1, ksize=3) / 8
    col = col * (1 + .2 * np.clip(-(gx * -.55 + gy * -.83) * R, -1.6, 1.6))[..., None] * (.86 + .14 * hgt)[..., None]
    del edge, dist, hgt, gx, gy
    # the face and hands: the painting itself, one even skin tone, crisp
    skin, feats = face_zone(lab_o, solid, u, night)
    if skin is not None:
        face = bgr_f
        if night:   # the night face is pale: a touch more definition so eyes, brows and lips read
            face = np.clip(bgr_f + .6 * (bgr_f - cv2.GaussianBlur(bgr_f, (0, 0), max(.8, .8 * u))), 0, 255)
            if feats is not None:
                fdk = cv2.GaussianBlur(feats.astype(np.float32), (0, 0), max(.5, .3 * u))[..., None]
                face = face * (1 - .1 * fdk)
        fz = cv2.GaussianBlur(skin.astype(np.float32), (0, 0), max(.6, .35 * u))[..., None]
        col = col * (1 - fz) + face * fz
    # hair in fine silk thread along its flow
    busy = np.bincount(pid.ravel(), weights=np.abs(L_fi).ravel() * w8, minlength=n) / np.maximum(cnt, 1)
    hair = (busy > 6) & (mean[:, 0] < 55) & (np.hypot(mean[:, 1], mean[:, 2]) > 15) & (area_screen >= 14 ** 2); hair[0] = False
    if hair.any():
        region = hair[pid] & solid
        if skin is not None: region &= ~(cv2.dilate(skin.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0)
        col = silk(col, region, bgr_f, L_o, u, rng, *SILK_HAIR)
    gold = gold_threads(cv2.GaussianBlur(lab_o, (0, 0), max(.6, .4 * u)), solid, night)
    if gold is not None:
        if skin is not None: gold &= ~skin
        col = silk(col, gold, src, L_o, u, rng, *SILK_GOLD)
        gl = cv2.GaussianBlur(gold.astype(np.float32), (0, 0), max(.5, .3 * u))[..., None]
        col = col * (1 + .1 * gl) + 8 * gl
    # a still face turned to us is embroidered: fine silk following the face, eyes, brows, nose
    # and lips in finer, slightly raised stitches; jaw lines and shading get no thread
    if name in FACE_SILK and skin is not None and feats is not None and big_face(skin, u):
        col = silk(col, skin & ~feats, col.copy(), L_o, u, rng, *SILK_FACE)
        fm = main_features(feats, skin, lab_o, u)
        if fm.any():
            fm = cv2.dilate(fm.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
            col = silk(col, fm & solid, col.copy(), L_o, u, rng, *SILK_FEATURES)
    needle = Needle(H, W, u, fine=True)
    if not face_only:
        # garment seams: a fine stitch where clearly different cloths meet
        inset = 1.6 * u; probe = inset + 2.2 * u
        near_face = None
        if skin is not None:
            kf_ = max(3, int(round(8 * u)) | 1)
            near_face = cv2.dilate(skin.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kf_, kf_))) > 0
        order = np.argsort(pid.ravel(), kind='stable'); bounds = np.searchsorted(pid.ravel()[order], np.arange(n + 1))
        for k in range(1, n):
            if area_screen[k] < SEAM_FIG ** 2 or hair[k]: continue
            ix = order[bounds[k]:bounds[k + 1]]
            ys, xs = ix // W, ix % W
            y0, y1, x0, x1 = max(0, ys.min() - 4), min(H, ys.max() + 5), max(0, xs.min() - 4), min(W, xs.max() + 5)
            m = ((pid[y0:y1, x0:x1] == k) & solid[y0:y1, x0:x1]).astype(np.uint8)
            ri = max(1, int(round(inset)))
            m_in = cv2.erode(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * ri + 1, 2 * ri + 1)))
            cs, _ = cv2.findContours(m_in, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)

            def outside_ok(pt, nv, k=k):
                X0, Y0 = int(pt[0]) + x0, int(pt[1]) + y0
                if near_face is not None and 0 <= X0 < W and 0 <= Y0 < H and near_face[Y0, X0]: return False
                for sgn in (1, -1):
                    q = pt + nv * probe * sgn
                    X, Y = int(q[0]) + x0, int(q[1]) + y0
                    if not (0 <= X < W and 0 <= Y < H): return False
                    if pid[Y, X] == k and solid[Y, X]: continue
                    o = pid[Y, X]
                    if not solid[Y, X]: return False          # the outline has its own stitch
                    return cnt[o] >= cnt[k] and float(np.sqrt((((mean[k] - mean[o]) * [.6, 1, 1]) ** 2).sum())) > 20
                return False
            for c in cs:
                if cv2.contourArea(c) < (SEAM_FIG * u) ** 2 * .2: continue
                pts = smooth_closed(smooth_closed(c, max(2, int(round(2 * u)))), max(2, int(round(1.4 * u))))
                pts = cv2.approxPolyDP(pts.reshape(-1, 1, 2), max(1.0, 1.2 * u), True).reshape(-1, 2).astype(np.float32)
                for run in runs_along(pts, None, outside_ok, max(1.0, .8 * u)):
                    back_stitch_line(needle, run + np.float32([x0, y0]), col, u, dash=SEAM_DASH * u, gap=SEAM_GAP * u)
        # the outline: a back stitch all round her, hair and shirt included, skipping face and hands
        if name.startswith(OUTLINED):
            r = max(1, int(round(OUTLINE_INSET * u)))
            m_in = cv2.erode(solid.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1)))
            avoid = None
            if skin is not None:
                kk = max(3, int(round(2.5 * u)) | 1)
                avoid = cv2.dilate(skin.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kk, kk))) > 0
            cs, _ = cv2.findContours(m_in, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
            for c in cs:
                if cv2.contourArea(c) < (14 * u) ** 2: continue
                pts = smooth_closed(c, max(1, int(round(.9 * u))))
                back_stitch_line(needle, np.vstack([pts, pts[:1]]), col, u, avoid)
    col = needle.composite(col)
    return np.dstack([np.clip(col, 0, 255), np.clip(alpha * 255, 0, 255)]).astype(np.uint8)


def appliqué(name, bgr_f, alpha, solid, lab_o, src, u, rng, over):
    """Scenery: the large areas of colour are cut from plain cloth and appliquéd, and the detail
    is embroidered on top. Each piece is one dyed cloth, padded, softly creased, casting a shadow
    on the piece below and edged with a fine blanket stitch; roof tiles and leaves are worked in
    satin floss with a chain stitch round them; everything detailed (windows, carving, brackets,
    figures, text) is worked in fine silk thread in the painting's own colours."""
    L_o = lab_o[..., 0]; H, W = solid.shape
    p = max(WEAVE * u, 2.6)
    land = name in LANDSCAPE
    pid_s, ws = land_pieces(bgr_f, alpha, u) if land else cut_pieces(bgr_f, alpha, u, False, False, rng)
    pid = upsample_pieces(pid_s, W, H, ws)
    pid = snap_pieces(pid, np.clip(bgr_f, 0, 255).astype(np.uint8), u)
    n = int(pid.max()) + 1
    w8 = solid.ravel().astype(np.float64)
    cnt = np.bincount(pid.ravel(), weights=w8, minlength=n)
    mean = np.stack([np.bincount(pid.ravel(), weights=lab_o[..., c].ravel() * w8, minlength=n) for c in range(3)], 1) / np.maximum(cnt, 1)[:, None]
    area_screen = cnt / (u * u)
    dye = mean.copy()
    dye[:, 0] = 60 + (dye[:, 0] - 60) * .92 + (rng.random(n) - .5) * 4
    dye[:, 1:] *= 1.35 if land else 1.05   # the far cloths a little more strongly dyed than the wash
    L_fi = cv2.GaussianBlur(L_o, (0, 0), max(.5, .5 * u)) - cv2.GaussianBlur(L_o, (0, 0), 2.5 * u)
    L_lo = cv2.GaussianBlur(L_o, (0, 0), 4 * u)
    out = np.empty_like(lab_o)
    out[..., 0] = dye[pid, 0] + .15 * (L_lo - mean[pid, 0])
    out[..., 1:] = dye[pid, 1:]
    out[..., 0] = np.clip(out[..., 0], 6, 96)
    col = cv2.cvtColor(out, cv2.COLOR_Lab2BGR) * 255
    del out, L_lo
    # which pieces are roof tiles or leaves (satin floss), which pixels are detail (fine silk)
    busy = np.bincount(pid.ravel(), weights=np.abs(L_fi).ravel() * w8, minlength=n) / np.maximum(cnt, 1)
    chroma = np.hypot(dye[:, 1], dye[:, 2]); hue = np.degrees(np.arctan2(dye[:, 2], dye[:, 1])) % 360
    satin = (busy > EMB_DETAIL) & (((chroma < 12) & (dye[:, 0] < 62)) | ((hue > 95) & (hue < 200) & (chroma > 9))) & (area_screen >= 14 ** 2)
    satin[0] = False
    if land: satin[:] = False      # far hills and trees are plain cloth only
    det = cv2.GaussianBlur(np.abs(L_fi), (0, 0), max(.8, 1.0 * u))
    D = (det > DETAIL_T) & solid & ~satin[pid]
    k1 = max(3, int(round(2 * u)) | 1); k2 = max(3, int(round(.8 * u)) | 1)
    D = cv2.morphologyEx(D.astype(np.uint8), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k1, k1)))
    D = cv2.morphologyEx(D, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k2, k2)))
    nl, cc, st, _ = cv2.connectedComponentsWithStats(D, 8)
    keep = np.zeros(nl, bool); keep[1:] = st[1:, cv2.CC_STAT_AREA] >= (4 * u) ** 2
    D = keep[cc] & (not land)
    for rect in FULL_EMB.get(name, ()):
        x0, y0, x1, y1 = [int(round(v * over)) for v in rect]
        D[y0:y1, x0:x1] |= solid[y0:y1, x0:x1]
        satin[np.unique(pid[y0:y1, x0:x1])] = False
    D &= ~satin[pid]
    share = np.bincount(pid.ravel(), weights=D.ravel().astype(np.float64), minlength=n) / np.maximum(np.bincount(pid.ravel(), minlength=n), 1)
    # cloth
    cloth = ['none'] + [cloth_v4(dye[k], rng) for k in range(1, n)]
    looms = {}

    def loom(c):
        if c not in looms:
            if c == 'linen': w = 1 + (weave(H, W, p * 1.1, rng, slub=True) - 1) * .32
            elif c == 'cotton': w = 1 + (weave(H, W, p * .85, rng) - 1) * .24
            elif c == 'denim': w = 1 + (twill(H, W, p * .8, rng) - 1) * .6
            elif c == 'burlap': w = 1 + (weave(H, W, p * 1.5, rng, coarse=True, slub=True) - 1) * .35
            else: w = 1 + (_noise(H, W, max(1, .7 * u), rng) - .5) * .12 + (_noise(H, W, 6 * u, rng) - .5) * .08
            looms[c] = w.astype(np.float32)
        return looms[c]
    flat = pid.ravel(); order = np.argsort(flat, kind='stable'); bounds = np.searchsorted(flat[order], np.arange(n + 1))
    mod = np.ones(H * W, np.float32)
    for k in range(1, n):
        ix = order[bounds[k]:bounds[k + 1]]
        if len(ix): mod[ix] = loom(cloth[k]).ravel()[ix]
    col = col * mod.reshape(H, W)[..., None]
    del mod, looms
    # soft creases in the large plain pieces
    yy_, xx_ = np.mgrid[0:H, 0:W].astype(np.float32)
    warp = (_noise(H, W, 30 * u, rng) - .5) * 5
    fold = np.sin(2 * math.pi * (xx_ * .94 - yy_ * .34) / (34 * u) + warp)
    env = np.clip((_noise(H, W, 40 * u, rng) - .35) * 2.2, 0, 1)
    bigcloth = (area_screen >= 60 ** 2) & ~satin; bigcloth[0] = False
    col = col * (1 + WRINKLE * np.where(bigcloth[pid] & solid, fold * env, 0))[..., None]
    del yy_, xx_, warp, fold, env
    # padding: each piece rises from its edges; smaller pieces lie on larger ones and shade them
    edge = np.zeros((H, W), np.uint8)
    edge[:, 1:] |= (pid[:, 1:] != pid[:, :-1]); edge[:, :-1] |= (pid[:, 1:] != pid[:, :-1])
    edge[1:, :] |= (pid[1:, :] != pid[:-1, :]); edge[:-1, :] |= (pid[1:, :] != pid[:-1, :])
    edge |= (~solid).astype(np.uint8)
    dist = cv2.distanceTransform(1 - edge, cv2.DIST_L2, 5)
    inner = np.zeros(n, np.float32); np.maximum.at(inner, pid.ravel(), dist.ravel())
    R = np.clip(inner[pid] * .85, 1.5 * u, PILLOW * u)
    hgt = cv2.GaussianBlur(1 - (1 - np.clip(dist / R, 0, 1)) ** 2, (0, 0), max(.6, .35 * u))
    gx = cv2.Sobel(hgt, cv2.CV_32F, 1, 0, ksize=3) / 8; gy = cv2.Sobel(hgt, cv2.CV_32F, 0, 1, ksize=3) / 8
    lit = np.clip(-(gx * -.55 + gy * -.83) * R, -1.6, 1.6)
    col = col * (1 + .2 * lit)[..., None] * (.82 + .18 * np.clip(dist / (2.2 * u), 0, 1) ** .7)[..., None]
    rank = np.zeros(n, np.float32); rank[np.argsort(-cnt)] = np.arange(n); rank[0] = -1
    Rk = rank[pid]
    dx, dy = int(round(1.1 * u)), int(round(1.7 * u))
    Rs = np.full_like(Rk, -1); Rs[dy:, dx:] = Rk[:H - dy, :W - dx]
    cast = cv2.GaussianBlur(((Rs > Rk) & solid).astype(np.float32), (0, 0), 1.3 * u)
    col = col * (1 - .28 * cast)[..., None]
    del Rk, Rs, cast, gx, gy, lit, dist, edge, hgt
    # embroidery: satin floss on roofs and leaves, fine silk on all the detail
    col, c_satin = embroider(col, satin[pid] & solid, src, L_o, u, rng, sum(map(ord, name)) * 131)
    col = silk(col, D & solid, src, L_o, u, rng, *SILK_DETAIL)
    # the outer edge is frayed
    out_alpha = alpha.copy()
    if not solid.all():
        out_alpha = frayed(alpha, solid, col, u, rng)
    sil = out_alpha > .5
    needle = Needle(H, W, u)
    # blanket stitch round the large plain pieces, where they lie on a larger piece or the edge
    inset = INSET * u; probe = inset + 2.2 * u
    sewn = (area_screen >= BLANKET_MIN ** 2) & ~satin & (share < .35); sewn[0] = False
    for k in range(1, n):
        if not sewn[k]: continue
        ix = order[bounds[k]:bounds[k + 1]]
        ys, xs = ix // W, ix % W
        y0, y1, x0, x1 = max(0, ys.min() - 4), min(H, ys.max() + 5), max(0, xs.min() - 4), min(W, xs.max() + 5)
        m = ((pid[y0:y1, x0:x1] == k) & sil[y0:y1, x0:x1]).astype(np.uint8)
        ri = max(1, int(round(inset)))
        m_in = cv2.erode(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * ri + 1, 2 * ri + 1)))
        cs, _ = cv2.findContours(m_in, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        base = (cv2.cvtColor(dye[k].astype(np.float32).reshape(1, 1, 3), cv2.COLOR_Lab2BGR) * 255).reshape(3)
        thr = tone(base, .75, darker=True) if land else tone(base)

        def outside_ok(pt, nv, k=k):
            X0, Y0 = int(pt[0]) + x0, int(pt[1]) + y0
            if 0 <= X0 < W and 0 <= Y0 < H and D[Y0, X0]: return False   # no stitches across the embroidery
            for sgn in (1, -1):
                q = pt + nv * probe * sgn
                X, Y = int(q[0]) + x0, int(q[1]) + y0
                if not (0 <= X < W and 0 <= Y < H): return True
                if pid[Y, X] == k and sil[Y, X]: continue
                o = pid[Y, X]
                if not sil[Y, X]: return True
                return cnt[o] >= cnt[k] and not satin[o]
            return True
        for c in cs:
            if cv2.contourArea(c) < (BLANKET_MIN * u) ** 2 * .2: continue
            pts = smooth_closed(smooth_closed(c, max(2, int(round(2.6 * u)))), max(2, int(round(1.6 * u))))
            pts = cv2.approxPolyDP(pts.reshape(-1, 1, 2), max(1.0, 1.4 * u), True).reshape(-1, 2).astype(np.float32)
            for run in runs_along(pts, None, outside_ok, max(1.0, .8 * u)):
                blanket(needle, run + np.float32([x0, y0]), thr, pid, k, inset, u)
    # chain stitch round the satin-stitched roofs and leaves
    for k in range(1, n):
        if not satin[k] or area_screen[k] < 30 ** 2: continue
        ix = order[bounds[k]:bounds[k + 1]]
        ys, xs = ix // W, ix % W
        y0, y1, x0, x1 = max(0, ys.min() - 4), min(H, ys.max() + 5), max(0, xs.min() - 4), min(W, xs.max() + 5)
        m = ((pid[y0:y1, x0:x1] == k) & sil[y0:y1, x0:x1]).astype(np.uint8)
        ri = max(1, int(round(1.2 * u)))
        m = cv2.erode(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * ri + 1, 2 * ri + 1)))
        cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        t = dye[k].copy(); t[0] = max(6, t[0] - 22)
        thr = tuple(map(float, (cv2.cvtColor(t.astype(np.float32).reshape(1, 1, 3), cv2.COLOR_Lab2BGR) * 255).reshape(3)))
        for c in cs:
            if cv2.contourArea(c) < (20 * u) ** 2: continue
            pts = smooth_closed(smooth_closed(c, max(2, int(round(2 * u)))), max(2, int(round(1.4 * u))))
            pts = cv2.approxPolyDP(pts.reshape(-1, 1, 2), max(1.0, 1.4 * u), True).reshape(-1, 2).astype(np.float32)
            chain_stitch(col, np.vstack([pts, pts[:1]]) + np.float32([x0, y0]), thr, max(1.0, CHAIN_W * u), CHAIN_L * u)
    threads = loose_threads(needle, sil, col, u, rng) if not solid.all() else np.zeros((H, W), np.float32)
    col = needle.composite(col)
    a = np.maximum(out_alpha, np.maximum(threads, np.where(alpha > .5, needle.coverage(), 0)))
    a = np.maximum(a, np.where(cv2.dilate(solid.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0, c_satin, 0))
    return lift(col, a, u)


def texture(name, bgr, alpha, u, rng):
    """Tiled material swatches and the continuous water strip: cloth weave that still tiles, and a
    gentle flattening (wrap-around filtering keeps the seams invisible)."""
    H, W = bgr.shape[:2]
    pad = 24
    big = np.pad(bgr, ((pad, pad), (pad, pad), (0, 0)), mode='wrap')
    flat = cv2.bilateralFilter(big.astype(np.float32), 9, 26, 6)[pad:-pad, pad:-pad]
    flat = bgr * .35 + flat * .65
    p = max(WEAVE * u, 3.0)
    mod = weave(H, W, p, rng, periodic=True, slub=True)
    col = flat * mod[..., None]
    lum = (col * np.float32([.114, .587, .299])).sum(2)
    col = col - np.clip(lum - 222, 0, None)[..., None] * .4
    return np.dstack([np.clip(col, 0, 255), np.clip(alpha * 255, 0, 255)]).astype(np.uint8)


def tiles():
    """Small tileable swatches for the page itself: a weave overlay that gives the drawn parts of
    the world (sky, ground, water) the same cloth as the sprites, the washed burlap that shows past
    the torn edges of the quilt by day, and dark felt by night."""
    rng = np.random.default_rng(5)
    S = 160                                                        # 40 threads of 4 px
    # soft linen: no grid, just slubbed fibres running both ways and a little mottling
    fx = cv2.resize(rng.random((S // 2, 6)).astype(np.float32), (S, S), interpolation=cv2.INTER_CUBIC)
    fy = cv2.resize(rng.random((6, S // 2)).astype(np.float32), (S, S), interpolation=cv2.INTER_CUBIC)
    fib = (np.roll(fx, S // 3, 1) + fx + fy + np.roll(fy, S // 3, 0)) / 4
    mott = _noise(S, S, 18, rng, True)
    m = 1 + (fib - .5) * .5 + (mott - .5) * .12
    dark = np.clip((1.0 - m) * .8, 0, .1); light = np.clip((m - 1.0) * .7, 0, .07)
    a = dark + light
    rgb = (np.float32([22, 30, 40]) * dark[..., None] + np.float32([214, 236, 246]) * light[..., None]) / np.maximum(a, 1e-4)[..., None]
    cv2.imwrite(os.path.join(OUT, 'weave.webp'), np.dstack([rgb, a * 255]).clip(0, 255).astype(np.uint8), [cv2.IMWRITE_WEBP_QUALITY, 101])
    B = 168
    bm = weave(B, B, 7.0, rng, coarse=True, slub=True, periodic=True)
    burlap = np.float32([112, 156, 190]) * bm[..., None] * (1 + (_noise(B, B, 20, rng, True)[..., None] - .5) * .1)
    cv2.imwrite(os.path.join(OUT, 'burlap.webp'), burlap.clip(0, 255).astype(np.uint8), [cv2.IMWRITE_WEBP_QUALITY, 92])
    fm = 1 + (_noise(B, B, 2, rng, True) - .5) * .16 + (_noise(B, B, 9, rng, True) - .5) * .1
    felt = np.float32([46, 34, 28]) * fm[..., None]
    cv2.imwrite(os.path.join(OUT, 'felt.webp'), felt.clip(0, 255).astype(np.uint8), [cv2.IMWRITE_WEBP_QUALITY, 92])
    silk_tile()
    print('wrote weave, silk, burlap and felt tiles')


def silk_tile():
    """The silk the sky is sewn on: fine, nearly level threads with a slow wave, as a tile that
    repeats without seams (an overlay of darker and lighter threads on transparent)."""
    rng = np.random.default_rng(11)
    S = 192
    y, x = np.mgrid[0:3 * S, 0:3 * S].astype(np.float32)
    a = .1 * np.sin(2 * math.pi * (x / S + 2 * y / S)) + .05 * np.sin(2 * math.pi * 3 * y / S)
    fdx, fdy = np.cos(a).astype(np.float32), np.sin(a).astype(np.float32)
    g = rng.random((S // 2, S // 2)).astype(np.float32)
    noise = np.tile(cv2.resize(np.tile(g, (3, 3)), (3 * S, 3 * S), interpolation=cv2.INTER_LINEAR), (1, 1))
    t = lic(fdx, fdy, noise, 46, 1.0)[S:2 * S, S:2 * S]
    t = (t - t.mean()) / (t.std() + 1e-6)
    dark = np.clip(-t * .05, 0, .09); light = np.clip(t * .045, 0, .08)
    a_ = dark + light
    rgb = (np.float32([30, 40, 52]) * dark[..., None] + np.float32([236, 246, 252]) * light[..., None]) / np.maximum(a_, 1e-4)[..., None]
    cv2.imwrite(os.path.join(OUT, 'silk.webp'), np.dstack([rgb, a_ * 255]).clip(0, 255).astype(np.uint8), [cv2.IMWRITE_WEBP_QUALITY, 101])


def world_images():
    return [f[:-5] for f in sorted(os.listdir(ART)) if f.endswith('.webp')]


def main(names):
    os.makedirs(OUT, exist_ok=True)
    for n in names or world_images():
        base = n[:-5] if n.endswith('.webp') else n
        src = os.path.join(ART, base + '.webp')
        if not os.path.exists(src): print('missing', n); continue
        t0 = time.time()
        img = cv2.imread(src, cv2.IMREAD_UNCHANGED)
        over = oversample(base)
        if over > 1: img = cv2.resize(img, None, fx=over, fy=over, interpolation=cv2.INTER_CUBIC)
        res = fabricize(base, img, over)
        if img.ndim == 3 and img.shape[2] == 3: res = res[..., :3]
        out = os.path.join(OUT, base + '.webp')
        cv2.imwrite(out, res, [cv2.IMWRITE_WEBP_QUALITY, 86])
        print('wrote %s %dx%d %d KB (%.1fs)' % (os.path.relpath(out, ROOT), res.shape[1], res.shape[0], os.path.getsize(out) // 1024, time.time() - t0), flush=True)


if __name__ == '__main__':
    if sys.argv[1:] == ['--tiles']: os.makedirs(OUT, exist_ok=True); tiles()
    else: main(sys.argv[1:])
