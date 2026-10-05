#!/usr/bin/env python3
"""Turn the 2D world's painted images into a hand-sewn fabric collage.

Each painting keeps its composition, its objects and their positions, and most of its light and
shade, but is rebuilt as flat pieces of cloth sewn together:

  * the picture is cut into simple pieces (similar colours, small bits merged into their neighbours),
    and every piece is dyed with the mean colour of the painting underneath it, so reds stay red
    and leaves stay green;
  * every piece is a scrap of a different cloth: plain cotton, slubbed linen, washed burlap, plaid
    Song brocade, a traditional cloud or wave print, or Suzhou-style satin embroidery for leaves;
  * every sizeable piece is outlined with hand running stitches, its cut edge casts a soft shadow
    on the piece below, and large pieces get sewn-on patches with cross-stitched corners;
  * the outer silhouette is frayed, with loose threads hanging off it; everything is matte.

Sizes are chosen in screen pixels and converted with each image's display scale (how many screen
pixels one source pixel covers in the world at 1280 x 800), so stitches and weave look about the
same size on screen whether a picture is shown large (the gate) or small (the cats).

Usage:  python3 tools/fabricize.py [names...]      (default: every image in assets/art)
        python3 tools/fabricize.py --tiles        (the weave, burlap and felt swatches for the page)
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
RIG_PREFIX = ('hanjing-', 'human-bind-', 'jinbingbing-')

# the look, in screen pixels
CUT = .34            # working pixels per screen pixel when cutting pieces (coarse: fine texture is ignored)
PIECE_MIN = 34       # pieces smaller than this (side of a square) are merged into a neighbour
MERGE_DE = 10        # neighbouring pieces closer than this in colour (light-weighted Lab) become one,
SOFT_EDGE, SOFT_DE = 4.5, 24   # where the painting has no drawn line at all, colours this far apart still merge
EDGE_MAX = 12        # unless the painting draws an edge between them (mean local contrast in L)
SEAM_MIN = 44        # pieces at least this big are sewn down with visible stitches
PATCH_MIN = 120      # pieces at least this big may get a sewn-on patch
WEAVE = 3.3          # thread period of the cloth
DASH, GAP, THREAD = 6.4, 4.4, 1.7
INSET = 3.0          # stitches run this far inside the cut edge


def kind_of(name):
    if name in TEXTURES: return 'texture'
    if name.startswith(RIG_PREFIX): return 'rig'
    return 'scene'


def scale_of(name):
    if name in SCALE: return SCALE[name]
    if name.startswith(RIG_PREFIX): return .16
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


def embroidery(h, w, p, rng, angle):
    """Satin stitch: long parallel floss stitches in one direction, laid in staggered rows."""
    x, y = _coords(h, w, angle)
    flow = (_noise(h, w, p * 10, rng) - .5) * p * 2.2
    v = (y + flow) / (p * .62)
    row = np.floor(v)
    along = (x + (row % 3) * p * 2.3) / (p * 3.4)
    floss = np.clip(np.cos((v - row - .5) * math.pi), 0, 1) ** 1.4
    breaks = np.clip(np.minimum(along - np.floor(along), 1 - (along - np.floor(along))) / .08, 0, 1)
    sheen = .5 + .5 * np.cos((x / (p * 9)) + flow / p)
    return (.84 + .2 * floss * (.75 + .25 * breaks) + .06 * sheen).astype(np.float32)


def motif_tile(kind, size, ink):
    """A small repeating motif drawn as thread: cloud scrolls, wave scales or a plaid medallion."""
    t = np.zeros((size, size, 4), np.float32)
    c = (float(ink[0]), float(ink[1]), float(ink[2]), 1.0)
    s = size; th = max(1, int(round(s / 24)))
    if kind == 'cloud':
        for (ox, oy) in ((s * .28, s * .3), (s * .78, s * .8)):
            r = s * .1
            cv2.ellipse(t, (int(ox), int(oy)), (int(r), int(r)), 0, 180, 450, c, th, cv2.LINE_AA)
            cv2.ellipse(t, (int(ox + r * 1.5), int(oy + r * .2)), (int(r * .75), int(r * .75)), 0, 180, 400, c, th, cv2.LINE_AA)
            cv2.line(t, (int(ox - r * 1.2), int(oy + r * 1.05)), (int(ox + r * 2.4), int(oy + r * 1.05)), c, th, cv2.LINE_AA)
    elif kind == 'wave':
        r = s // 4
        for row in range(3):
            for col in range(3):
                ox = col * r * 2 + (r if row % 2 else 0) - r; oy = row * r + r
                for k in (1.0, .62):
                    cv2.ellipse(t, (ox, oy), (int(r * k), int(r * k)), 0, 180, 360, c, th, cv2.LINE_AA)
    elif kind == 'plaid':
        cv2.circle(t, (s // 2, s // 2), int(s * .09), c, -1, cv2.LINE_AA)
        for k in range(4):
            a = k * math.pi / 2 + math.pi / 4
            cv2.line(t, (s // 2, s // 2), (int(s / 2 + math.cos(a) * s * .19), int(s / 2 + math.sin(a) * s * .19)), c, th, cv2.LINE_AA)
    return t


def tile(t, h, w, offset=(0, 0)):
    th, tw = t.shape[:2]
    big = np.tile(t, (h // th + 2, w // tw + 2, 1))
    oy, ox = offset[1] % th, offset[0] % tw
    return big[oy:oy + h, ox:ox + w]


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


def cut_pieces(bgr_f, alpha, u, face, rig, rng):
    """Cut the picture into a few large pieces of cloth. The cut is made at a coarse scale (a working
    pixel is about three screen pixels), so fine painted texture such as roof tiles, bark or leaves
    does not split a piece: a whole roof stays one piece, with its tiles printed on it."""
    H, W = bgr_f.shape[:2]
    ws = float(np.clip(CUT / u, .03, 1.0))                 # working pixels per source pixel
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
    piece_min = PIECE_MIN * (.45 if rig or face else 1)
    min_px = (piece_min * sc) ** 2
    pid = merge_small(components(q, valid), min_px, lab_small)
    pid = merge_similar(pid, lab_small, MERGE_DE * (.6 if face else 1), EDGE_MAX)
    pid = merge_small(pid, min_px * 2, lab_small)
    pid = nearest_fill(pid, a_s > .02)
    return pid, ws


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
def piece_cloth(lab_mean, area_s, rng, rig):
    """Pick a cloth for a piece from its dyed colour (Lab, L 0..100) and size (screen px^2)."""
    L, a, b = lab_mean; C = math.hypot(a, b); h = math.degrees(math.atan2(b, a)) % 360
    r = rng.random()
    if rig:
        if C < 9: return 'cotton' if L > 40 else 'linen'
        if 35 < h < 80 and C < 30 and L > 55: return 'cotton'                  # skin
        return ['cotton', 'linen', 'twill'][int(r * 3)]
    if 95 < h < 200 and C > 10: return 'embroidery'                            # leaves, moss, jade
    if (h < 50 or h > 340) and C > 22: return 'brocade' if area_s > 900 else 'cotton'   # vermilion, red lacquer
    if 200 <= h <= 300 and C > 8: return 'print'                               # indigo and blue
    if L < 42 and 45 <= h <= 95 and C > 8: return 'burlap'                     # dark timber, bark
    if C < 7 and L < 60: return 'twill' if r < .6 else 'linen'                 # grey tile, stone
    if L > 72 and C < 16: return 'linen' if r < .7 else 'cotton'               # plaster, paper
    return ['cotton', 'linen', 'burlap', 'twill'][int(r * 4)]


ACCENTS = [(48, 58, 178), (122, 74, 40), (64, 128, 196), (88, 110, 72)]   # vermilion, indigo, ochre, moss (BGR)


def thread_for(bgr, rng, accent=.14):
    """A thread that shows against the cloth: dark on light cloth, cream on dark, sometimes a colour."""
    bgr = np.asarray(bgr, np.float32)
    lum = float((bgr * [.114, .587, .299]).sum())
    if rng.random() < accent:
        c = np.float32(ACCENTS[int(rng.integers(len(ACCENTS)))])
        if abs(float((c * [.114, .587, .299]).sum()) - lum) > 55: return tuple(map(float, c))
    if lum > 120: return tuple(map(float, bgr * .28 + np.float32([30, 42, 58]) * .6))     # dark brown
    return tuple(map(float, np.float32([150, 190, 212]) * .84 + bgr * .16))                # unbleached cotton


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
        light = tuple(float(min(255, c * 1.22 + 34)) for c in color)
        s0, s1 = a + t * r * .5 + nrm * r * .32, b - t * r * .5 + nrm * r * .32
        cv2.fillConvexPoly(self.hl, self._capsule(s0, s1, r * .38), (*light, .4 if self.fine else .62), cv2.LINE_AA, 4)
        if self.fine: return
        for e in (a - t * r * 1.15, b + t * r * 1.15):
            cv2.circle(self.holes, tuple(int(v) for v in (e * 16).round()), max(1, int(r * .62 * 16)), 1.0, cv2.LINE_AA, 4)

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
        col = col * (1 - .5 * holes[..., None])
        a = self.thread[..., 3:4]
        col = col * (1 - a) + self.thread[..., :3] * a
        a = self.hl[..., 3:4]
        col = col * (1 - a) + self.hl[..., :3] * np.where(a > 0, 1, 0)
        return col

    def coverage(self):
        return np.clip(self.thread[..., 3], 0, 1)


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


# ---------------------------------------------------------------- the pipeline
def oversample(name):
    """Pictures shown larger than their pixels get sewn at a higher resolution, so each stitch has
    a crisp gap instead of blurring into a line. The output is larger by this factor; the page
    draws it at the original size."""
    if kind_of(name) != 'scene': return 1
    f = scale_of(name)
    return 1.5 if f >= 1.25 else 1


def fabricize(name, img, over=1):
    rng = np.random.default_rng(sum(map(ord, name)) * 7919 + 11)
    kind = kind_of(name); rig = kind == 'rig'; face = 'expression' in name
    u = float(np.clip(over / scale_of(name), .5, 8))         # source pixels per screen pixel
    if img.ndim == 2: img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGRA)
    if img.shape[2] == 3: img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    H, W = img.shape[:2]
    bgr = img[:, :, :3].astype(np.float32); alpha = img[:, :, 3].astype(np.float32) / 255
    solid = alpha > .5
    if kind == 'texture':
        return texture(name, bgr, alpha, u, rng)

    # transparent pixels take the nearby colour, so smoothing does not pull in dark fringes
    if not solid.all():
        wsum = cv2.GaussianBlur(alpha, (0, 0), 6) + 1e-4
        fill = cv2.GaussianBlur(bgr * alpha[..., None], (0, 0), 6) / wsum[..., None]
        bgr_f = np.where(alpha[..., None] > .02, bgr, fill)
    else:
        bgr_f = bgr

    # 1. cut into a few large pieces
    pid_s, ws = cut_pieces(bgr_f, alpha, u, face, rig, rng)
    pid = upsample_pieces(pid_s, W, H, ws)
    pid = snap_pieces(pid, np.clip(bgr_f, 0, 255).astype(np.uint8), u)
    n = int(pid.max()) + 1
    lab_o = cv2.cvtColor(np.clip(bgr_f, 0, 255) / 255, cv2.COLOR_BGR2Lab)
    w8 = solid.ravel().astype(np.float64)
    cnt = np.bincount(pid.ravel(), weights=w8, minlength=n)
    mean = np.stack([np.bincount(pid.ravel(), weights=lab_o[..., c].ravel() * w8, minlength=n) for c in range(3)], 1) / np.maximum(cnt, 1)[:, None]
    area_screen = cnt / (u * u)
    # dye: each scrap a slightly richer, slightly different lot of colour
    dye = mean.copy()
    dye[:, 1:] *= 1.08
    if not (rig or face):     # (character parts come from several sheets and must match exactly)
        dye[:, 0] = dye[:, 0] + (rng.random(n) - .5) * 3
        dye[:, 1:] += (rng.random((n, 2)) - .5) * 2

    # 2. print the painting on the dyed cloth: its light, shade and detail stay; colour evens out
    L_o = lab_o[..., 0]
    L_lo = cv2.GaussianBlur(L_o, (0, 0), 3 * u)
    L_fi = cv2.GaussianBlur(L_o, (0, 0), max(.5, .35 * u)) - L_lo
    kl, kf, kc = (.95, .9, .72) if (face or rig) else (.9, .84, .62)
    out = np.empty_like(lab_o)
    out[..., 0] = dye[pid, 0] + kl * (L_lo - mean[pid, 0]) + kf * L_fi
    out[..., 1:] = dye[pid, 1:] * (1 - kc) + cv2.GaussianBlur(lab_o[..., 1:], (0, 0), max(.6, .6 * u)) * kc
    out[..., 0] = np.clip(out[..., 0] * .94 + 4, 3, 97)        # matte: no deep black, no glare
    col = cv2.cvtColor(out, cv2.COLOR_Lab2BGR) * 255
    detail = cv2.GaussianBlur(np.abs(L_fi), (0, 0), 4 * u)
    del out, L_lo, L_fi

    # 3. cloth for every piece
    p = max(WEAVE * u, 2.6)
    looms = {}

    def loom(cloth, v):
        key = (cloth, v)
        if key not in looms:
            ang = [0, 24, -30][v]
            if rig and cloth != 'embroidery': looms[key] = weave(H, W, max(p, 3.6 * u), rng, soft=True)
            elif cloth == 'cotton': looms[key] = weave(H, W, p * .85, rng, angle=ang)
            elif cloth == 'linen': looms[key] = weave(H, W, p, rng, angle=ang, slub=True)
            elif cloth == 'burlap': looms[key] = weave(H, W, p * (1.5 if u > .8 else 1.25), rng, angle=ang, coarse=True)
            elif cloth in ('twill', 'brocade'): looms[key] = twill(H, W, p * .85, rng, angle=ang)
            elif cloth == 'print': looms[key] = weave(H, W, p * .85, rng, angle=ang)
            else: looms[key] = embroidery(H, W, max(p * .75, 2.4), rng, [35, 110, -20][v])
        return looms[key]

    cloth = ['none'] * n; variant = [0] * n
    for k in range(1, n):
        cloth[k] = piece_cloth(dye[k], area_screen[k], rng, rig)
        variant[k] = 0 if (rig or rng.random() < .55) else int(rng.integers(1, 3))
    flatpid = pid.ravel(); order = np.argsort(flatpid, kind='stable'); bounds = np.searchsorted(flatpid[order], np.arange(n + 1))
    mod = np.ones(H * W, np.float32); colf = col.reshape(-1, 3)
    yy = xx = None
    for k in range(1, n):
        ix = order[bounds[k]:bounds[k + 1]]
        if not len(ix): continue
        c = cloth[k]
        mod[ix] = loom(c, variant[k]).ravel()[ix]
        quiet = float(detail.ravel()[ix].mean()) < 3.2
        if c in ('brocade', 'print') and area_screen[k] > 60 ** 2 and quiet and not rig:
            if yy is None: yy, xx = np.divmod(np.arange(H * W, dtype=np.int64), W)
            base = colf[ix].mean(0); lum = float((base * [.114, .587, .299]).sum())
            ink = np.clip(base * (1.4 if lum < 110 else .66) + (22 if lum < 110 else -4), 0, 255)
            if c == 'brocade':        # plaid Song brocade: crossing bands and small woven medallions
                per = int(max(18, 30 * u)); bw = max(1, int(per * .1))
                band = (((xx[ix] + k * 7) % per) < bw) | (((yy[ix] + k * 5) % per) < bw)
                colf[ix[band]] = colf[ix[band]] * .9 + ink * .1
                m = tile(motif_tile('plaid', per, ink), H, W, (per // 2 + k * 7, per // 2 + k * 5)).reshape(-1, 4)
            else:                     # a printed cloud or wave pattern
                per = int(max(16, 34 * u))
                m = tile(motif_tile('cloud' if k % 2 else 'wave', per, ink), H, W, (k * 11, k * 13)).reshape(-1, 4)
            a = m[ix, 3:4] * .26
            colf[ix] = colf[ix] * (1 - a) + m[ix, :3] * a
    col = col * mod.reshape(H, W)[..., None]
    lum = (col * np.float32([.114, .587, .299])).sum(2)
    col = col - np.clip(lum - 222, 0, None)[..., None] * .4
    del mod, looms

    # 4. smaller pieces lie on top of larger ones: a soft shadow where an upper piece's edge meets
    rank = np.zeros(n, np.float32); rank[np.argsort(-cnt)] = np.arange(n); rank[0] = -1
    R = rank[pid]
    r = max(1, int(round(.9 * u)))
    above = cv2.dilate(R, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1)))
    shade = cv2.GaussianBlur((above > R).astype(np.float32), (0, 0), max(.7, .8 * u))
    col = col * (1 - .3 * shade[..., None])
    del R, above, shade

    # 5. frayed silhouette (scene sprites only; rig textures keep their exact outline)
    out_alpha = alpha.copy()
    if kind == 'scene' and not solid.all():
        dist = cv2.distanceTransform(solid.astype(np.uint8), cv2.DIST_L2, 3)
        fib = _noise(H, W, max(1.2, u * .7), rng); torn = _noise(H, W, max(6, u * 10), rng)
        band = max(1.3, u * 1.5)
        e = dist / band - (torn - .5) * 1.1
        keep_px = (e > .9) | ((e > .2) & (fib > .58 - e * .35))
        out_alpha = np.where(solid & ~keep_px, 0, alpha)
        fringe = solid & keep_px & (dist < band * 1.5)
        col[fringe] = col[fringe] * .9 + 22

    # 6. stitches: each large piece is sewn down along the edges where it lies on top
    needle = Needle(H, W, u, fine=rig or face)
    inset = INSET * u
    sil = out_alpha > .5
    stitched = np.zeros(n, bool)
    seam_min = (SEAM_MIN * (.55 if rig or face else 1)) ** 2
    for k in range(1, n):
        if area_screen[k] >= seam_min: stitched[k] = True
    probe = (inset + 2.2 * u)

    def thread_of(k):
        if rig or face:       # the character's clothes: tone-on-tone thread, a shade off the cloth
            t = dye[k].copy(); t[0] = t[0] - 22 if t[0] > 45 else t[0] + 26
            return tuple(map(float, (cv2.cvtColor(t.astype(np.float32).reshape(1, 1, 3), cv2.COLOR_Lab2BGR) * 255).reshape(3)))
        b = (cv2.cvtColor(dye[k:k + 1].astype(np.float32).reshape(1, 1, 3), cv2.COLOR_Lab2BGR) * 255).reshape(3)
        return thread_for(b, rng, .12)

    for k in range(1, n):
        if not stitched[k]: continue
        ix = order[bounds[k]:bounds[k + 1]]
        ys, xs = ix // W, ix % W
        y0, y1, x0, x1 = max(0, ys.min() - 4), min(H, ys.max() + 5), max(0, xs.min() - 4), min(W, xs.max() + 5)
        m = ((pid[y0:y1, x0:x1] == k) & sil[y0:y1, x0:x1]).astype(np.uint8)
        ri = max(1, int(round(inset)))
        m_in = cv2.erode(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * ri + 1, 2 * ri + 1)))
        cs, _ = cv2.findContours(m_in, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        thr = thread_of(k)
        style = 'cross' if (not rig and not face and rng.random() < .16) else 'running'

        def outside_ok(pt, nv, k=k):
            # look across the edge: empty space, or a larger piece this one is sewn onto
            for sgn in (1, -1):
                q = pt + nv * probe * sgn
                X, Y = int(q[0]) + x0, int(q[1]) + y0
                if not (0 <= X < W and 0 <= Y < H): return True
                if pid[Y, X] == k and sil[Y, X]: continue
                o = pid[Y, X]
                if not sil[Y, X]: return True
                if rig or face:   # only the outline and the edges between clearly different garments
                    return float(np.sqrt((((dye[k] - dye[o]) * [.6, 1, 1]) ** 2).sum())) > 20 and cnt[o] >= cnt[k]
                return (not stitched[o]) or cnt[o] >= cnt[k]
            return True
        for c in cs:
            if cv2.contourArea(c) < seam_min * u * u * .2: continue
            pts = smooth_closed(smooth_closed(c, max(2, int(round(2.6 * u)))), max(2, int(round(1.6 * u))))
            pts = cv2.approxPolyDP(pts.reshape(-1, 1, 2), max(1.0, 1.8 * u), True).reshape(-1, 2).astype(np.float32)
            for run in runs_along(pts, None, outside_ok, max(1.0, .8 * u)):
                run = run + np.float32([x0, y0])
                closed = len(run) > 2 and np.hypot(*(run[0] - run[-1])) < 1.5 * u
                needle.run(run, thr, rng, style=style if not closed or style == 'running' else 'running')

    # 7. a few sewn-on patches with cross-stitched corners, on quiet parts of large pieces
    if kind == 'scene':
        big = [k for k in range(1, n) if area_screen[k] > PATCH_MIN ** 2]
        rng.shuffle(big)
        for k in big[:max(1, min(6, len(big) // 3 + 1))]:
            if rng.random() < .35: continue
            ix = order[bounds[k]:bounds[k + 1]]
            ys, xs = ix // W, ix % W
            y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            m = ((pid[y0:y1, x0:x1] == k) & sil[y0:y1, x0:x1]).astype(np.uint8)
            dist = cv2.distanceTransform(m, cv2.DIST_L2, 3)
            pw, ph = (22 + rng.random() * 14) * u, (18 + rng.random() * 10) * u
            need = math.hypot(pw, ph) * .5 + inset * 3
            cand = np.argwhere(dist > need)
            if not len(cand): continue
            dsub = detail[y0:y1, x0:x1][cand[:, 0], cand[:, 1]]
            pick = cand[np.argsort(dsub)[:max(1, len(cand) // 12)]]
            cy, cx = pick[int(rng.integers(len(pick)))]
            box = cv2.boxPoints(((float(cx + x0), float(cy + y0)), (pw, ph), float((rng.random() - .5) * 16)))
            poly = (box + (rng.random(box.shape) - .5) * u * 2).astype(np.float32)
            pm = np.zeros((H, W), np.uint8); cv2.fillPoly(pm, [(poly * 16).round().astype(np.int32)], 1, cv2.LINE_8, 4)
            pb = pm > 0
            pl = dye[k].copy(); pl[0] = np.clip(pl[0] + (10 if pl[0] < 55 else -10), 8, 92)
            turn = math.radians((rng.random() - .5) * 50); ca, sa = math.cos(turn), math.sin(turn)
            pl[1], pl[2] = (pl[1] * ca - pl[2] * sa) * 1.1, (pl[1] * sa + pl[2] * ca) * 1.1
            pcol = (cv2.cvtColor(pl.astype(np.float32).reshape(1, 1, 3), cv2.COLOR_Lab2BGR) * 255).reshape(3)
            pmod = weave(H, W, p * (1.5 if rng.random() < .5 else .9), rng, angle=float(rng.random() * 30 - 15), coarse=rng.random() < .5)
            shadow = cv2.GaussianBlur(pm.astype(np.float32), (0, 0), .9 * u)
            shadow = np.roll(np.roll(shadow, int(round(.8 * u)), 0), int(round(.6 * u)), 1)
            col = col * (1 - (shadow * .3 * (1 - pb))[..., None])
            col[pb] = pcol * pmod[pb][:, None]
            pthr = thread_for(pcol, rng, .4)
            needle.run(np.vstack([poly, poly[:1]]), pthr, rng)
            for qd in poly: needle.cross(qd, 2.6 * u, pthr)

    # 8. a few loose threads hanging off the frayed outline
    threads = np.zeros((H, W), np.float32)
    if kind == 'scene' and not solid.all():
        cs, _ = cv2.findContours(sil.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        for c in cs:
            pts = c.reshape(-1, 2)
            if len(pts) < 220 * u: continue
            step = int(260 * u)
            for s0 in range(int(rng.random() * step), len(pts), step):
                a = pts[s0].astype(np.float32); b = pts[(s0 + max(3, int(3 * u))) % len(pts)].astype(np.float32)
                tdir = b - a; nrm = np.float32([tdir[1], -tdir[0]]); nrm /= (np.linalg.norm(nrm) + 1e-6)
                pr = (a + nrm * 3 * u).astype(int)
                if 0 <= pr[1] < H and 0 <= pr[0] < W and sil[pr[1], pr[0]]: nrm = -nrm
                length = (9 + rng.random() * 10) * u; bend = (rng.random() - .5) * 2.2
                yx = (min(H - 1, max(0, int(a[1]))), min(W - 1, max(0, int(a[0]))))
                tc = thread_for(col[yx], rng, .25)
                prev = a - nrm * 2.5 * u
                for kk in range(1, 9):
                    tt = kk / 8; ang = bend * tt * tt
                    v = np.float32([nrm[0] * math.cos(ang) - nrm[1] * math.sin(ang), nrm[0] * math.sin(ang) + nrm[1] * math.cos(ang)])
                    cur = a - nrm * 2.5 * u + v * length * tt
                    needle.stitch(prev, cur, tc, needle.w * .8)
                    cv2.line(threads, tuple(int(x) for x in (prev * 4)), tuple(int(x) for x in (cur * 4)), 1.0, max(1, int(needle.w * .8)), cv2.LINE_AA, 2)
                    prev = cur
    needle.holes *= sil

    # 9. composite the thread
    col = needle.composite(col)
    if kind == 'scene':
        out_alpha = np.maximum(out_alpha, np.maximum(threads, np.where(alpha > .5, needle.coverage(), 0)))
    else:
        out_alpha = alpha
    return np.dstack([np.clip(col, 0, 255), np.clip(out_alpha * 255, 0, 255)]).astype(np.uint8)


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
    S = 132                                                        # 40 threads of 3.3 px
    m = weave(S, S, WEAVE, rng, periodic=True)
    dark = np.clip((1.0 - m) * 2.0, 0, .3); light = np.clip((m - 1.0) * 1.5, 0, .16)
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
    print('wrote weave, burlap and felt tiles')


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
