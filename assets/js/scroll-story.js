/*
 * The handscroll layer for the 2D world: the walk is read as one long story, from a title at its
 * head, Dalian, the gate and the 2013 crossing, through the stations, to "to be continued".
 *
 * Everything drawn here reuses the world's realistic paintings: the chapter signs are built exactly
 * like the EDUCATION sign (painted branch, hemp ropes, carved plaque), the shore uses the painted
 * rocks and grasses, and the crossing uses the painted paper crane. Each chapter gets one short
 * line from Hanjing; the full story is told in Ask Me. World units: the scene is 800 tall and the
 * walking line is at y = 560.
 */
(function () {
  "use strict";
  var ART = window.HJArt; if (!ART) return;
  var GY = ART.GY, VH = ART.VH;

  function f1(n) { return Math.round(n * 10) / 10; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function sprite(name, x, y, w, h, cls) { return ART.paintSprite ? ART.paintSprite(name, x, y, w, h, cls) : ""; }

  // The scroll, chapter by chapter. Station chapters attach to the station with the same id.
  var SCROLL_W = 10360;
  var LAYOUT = { home: 1900, education: 4150, research: 5250, talks: 6350, writing: 7450, life: 8450, contact: 9400 };
  // Chapter markers. Station chapters are the stations themselves; the others get a painted sign by
  // the path, and Hanjing says the chapter's line when she reaches it.
  var CHAPTERS = [
    { id: "head", at: 560, sign: "HANJING'S WORLD", width: 176, label: "Hanjing's World",
      say: "Welcome to my world! Walk right, or tap Ask Me to chat.",
      chips: { en: ["Who are you?", "What do you research?"], zh: ["你是谁？", "你研究什么？"] } },
    { id: "prologue", at: 1080, sign: "DALIAN", width: 120, label: "Dalian, my hometown",
      say: "Dalian, my seaside hometown. Ask me about it!",
      chips: { en: ["Tell me about Dalian", "What do you like to eat?"], zh: ["说说大连", "你喜欢吃什么？"] } },
    { id: "home", label: "Welcome" },
    { id: "crossing", at: 2760, sign: "2013", width: 96, label: "2013, the crossing",
      say: "2013: I crossed the Pacific. Ask me how it went!",
      chips: { en: ["Tell me about your high school years", "Where have you lived?"], zh: ["说说你的高中", "你在哪些地方生活过？"] } },
    { id: "education", label: "Education" },
    { id: "research", label: "Research" },
    { id: "talks", label: "Talks" },
    { id: "writing", label: "Writing" },
    { id: "life", label: "Life" },
    { id: "contact", label: "Contact" },
    { id: "tail", at: 10000, sign: "TO BE CONTINUED", width: 176, label: "To be continued",
      say: "To be continued. Ask me anything!",
      chips: { en: ["What's new?", "How can I contact you?"], zh: ["最近有什么新动态？", "怎么联系你？"] } }
  ];
  // Tapping a sign, or the paper crane, walks Hanjing over; she says one line and the rest of the
  // story waits in Ask Me.
  var HOTSPOTS = [];
  CHAPTERS.forEach(function (ch) { if (ch.sign) HOTSPOTS.push({ id: ch.id, x: ch.at + 62, y: 422, w: Math.max(130, ch.width), h: 276, label: ch.label + ": tap to hear the story", say: ch.say, chips: ch.chips }); });
  HOTSPOTS.push({ id: "crane", x: 3025, y: window.HJArtDir ? 322 : 365, w: window.HJArtDir ? 220 : 170, h: window.HJArtDir ? 170 : 130, label: "The paper crane: tap to see it fly east and hear the 2013 crossing", say: CHAPTERS[3].say, chips: CHAPTERS[3].chips });

  function defs() {
    return '<radialGradient id="scrollContact"><stop offset="0" stop-color="#2a2016" stop-opacity=".3"/><stop offset=".6" stop-color="#2a2016" stop-opacity=".12"/><stop offset="1" stop-color="#2a2016" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="scrollMist" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#fbf7ee" stop-opacity=".7"/><stop offset=".6" stop-color="#f4eee2" stop-opacity=".28"/><stop offset="1" stop-color="#f4eee2" stop-opacity="0"/></radialGradient>';
  }

  // A chapter sign made exactly like the EDUCATION sign: the painted branch post, two hemp ropes
  // and the painted plaque with carved letters.
  function chapterSign(ch) {
    var x = ch.at, w = ch.width, px = x + 62, ropeL = px - w / 2 + 22, ropeR = px + w / 2 - 22;
    var arm = ART.paintRope ? ART.paintRope(x + 41, 321.7, ropeL, 345, true) + ART.paintRope(Math.min(x + 90, ropeR - 10), 318.7, ropeR, 345, true) : "";
    return '<g class="scroll-sign" data-chapter="' + ch.id + '">' + sprite("branchEducation", x, 284.7, 112, 276) + arm +
      (window.HJArtDir ? paperStrip(px, 362, w + 34, 26, ch.at) : "") +
      (ART.paintLabel ? ART.paintLabel(px, 358, esc(ch.sign), w) : "") + "</g>";
  }
  // In the cloth world, a strip of torn paper is layered under each plaque, a little askew.
  function paperStrip(cx, cy, w, h, seed) {
    var r = function () { seed = (seed * 16807 + 11) % 2147483647; return (seed - 1) / 2147483646; };
    var top = "", bottom = "", x;
    for (x = -w / 2; x <= w / 2; x += 3 + r() * 4) top += "L" + f1(x) + " " + f1(-h / 2 + (r() - .5) * 3.2);
    for (x = w / 2; x >= -w / 2; x -= 3 + r() * 4) bottom += "L" + f1(x) + " " + f1(h / 2 + (r() - .5) * 3.2);
    var d = "M" + f1(-w / 2) + " " + f1(-h / 2) + top + "L" + f1(w / 2 + (r() - .5) * 4) + " 0" + bottom + "L" + f1(-w / 2 + (r() - .5) * 4) + " 0Z";
    return '<g transform="translate(' + f1(cx) + ' ' + f1(cy) + ') rotate(' + f1((r() - .5) * 7) + ')"><path class="scroll-paper-shadow" d="' + d + '" transform="translate(1.5 2)"/><path class="scroll-paper" d="' + d + '"/></g>';
  }

  // Prologue: painted shore rocks and grasses by the water's edge.
  function prologue(cx) {
    return '<g class="scroll-piece piece-dalian">' +
      sprite("rock", cx + 40, GY - 46, 120, 52, "garden-stone") + sprite("rock", cx + 140, GY - 30, 78, 36, "garden-stone") + sprite("rock", cx - 60, GY - 26, 64, 30, "garden-stone") +
      sprite("grass", cx + 20, GY - 22, 22, 20) + sprite("grass", cx + 168, GY - 26, 24, 22) + sprite("grass", cx - 70, GY - 20, 18, 16) + '</g>';
  }
  // The crossing: the paper crane in flight, east toward the other shore. In the cloth world it is
  // pieced like a quilt from patterned silks (two Song brocades, a cloud silk, a key-fret silk, a
  // linked-coin silk and coarse cotton-linen), one cloth to each folded face, each piece edged with a
  // running stitch; gold thread is couched along the folds, a red satin crown, a pearl eye and a row of
  // seed pearls on the wing. Tapping it sends it gliding east.
  var CRANE = 1.3;   // the cloth crane is drawn larger than the painted one, so its cloths read
  function crossing(cx) {
    var cloth = !!window.HJArtDir;
    return '<g class="scroll-live" transform="translate(' + (cx + 125) + ' ' + (cloth ? 322 : 365) + ')"><g class="scroll-crane-glide"><g transform="scale(-1 1)"><g class="scroll-crane-flight">' +
      (cloth ? clothCrane() : sprite("crane", -85, -66, 170, 132, "scroll-crane")) + '</g></g></g></g>';
  }
  // Faces of the folded crane, in the painting's coordinates (434 x 340), back to front:
  // [points, cloth, shade (-1 dark .. 1 light)]
  var CRANE_FACES = [
    [[2, 12, 172, 110, 200, 188, 160, 250, 128, 322, 108, 300, 62, 140], "gSongTeal", -.08],    // far wing
    [[92, 104, 108, 99, 150, 328, 136, 322], "gLinenCoarse", -.3],                              // neck, shaded side
    [[108, 99, 118, 97, 170, 250, 165, 332, 150, 328], "gFretSilk", 0],                         // neck
    [[368, 2, 258, 178, 282, 206], "gCloudSilk", .06],                                          // near wing, lit face
    [[368, 2, 282, 206, 302, 216], "gLinenCoarse", -.22],                                       // near wing, edge
    [[222, 148, 162, 200, 178, 268], "gSongOchre", -.24],                                       // body, shaded side
    [[222, 148, 178, 268, 215, 246], "gCoinRose", 0],                                           // body, front
    [[222, 148, 215, 246, 278, 210], "gSongOchre", .1],                                         // body, lit side
    [[172, 272, 282, 212, 432, 295], "gSongTeal", .08],                                         // tail, top
    [[172, 272, 432, 295, 300, 288, 248, 284], "gCoinRose", -.1],                               // tail, under
    [[150, 330, 172, 272, 248, 284, 240, 318, 196, 338], "gLinenCoarse", -.12],                 // keel, plain linen for the plum sprig
    [[15, 192, 86, 102, 112, 96, 118, 108, 100, 120], "gSatin-ivory", .04]                      // head and beak, in satin floss
  ];
  var CRANE_FOLDS = [[2, 12, 186, 150], [108, 99, 150, 328], [368, 2, 282, 206], [222, 148, 215, 246], [222, 148, 178, 268], [172, 272, 432, 295], [86, 102, 100, 120]];
  // A sprig of plum in embroidery on the linen keel: a stem-stitched branch, five-petal blossoms in
  // satin with gold knots at their hearts, and a bud.
  function plumSprig(c) {
    var x = +c[0], y = +c[1], out = '<g class="cc-plum"><path class="cc-branch" d="M' + f1(x - 13) + ' ' + f1(y + 6) + 'Q' + f1(x - 4) + ' ' + f1(y + 1.5) + ' ' + f1(x + 3) + ' ' + f1(y - 3) + 'T' + f1(x + 13) + ' ' + f1(y - 8) + 'M' + f1(x - 2) + ' ' + f1(y) + 'q2 3 6.5 3.6"/>';
    [[-5, 1.6, 1], [4.2, -4.4, .9], [10.5, -7.2, .75]].forEach(function (b) {
      var bx = x + b[0], by = y + b[1], r = b[2], i, a;
      for (i = 0; i < 5; i++) { a = i * 1.2566 - 1.5708; out += '<circle class="cc-petal" cx="' + f1(bx + Math.cos(a) * 1.25 * r) + '" cy="' + f1(by + Math.sin(a) * 1.25 * r) + '" r="' + f1(1.15 * r) + '"/>'; }
      out += '<circle class="cc-knot" cx="' + f1(bx) + '" cy="' + f1(by) + '" r="' + f1(.55 * r) + '"/>';
    });
    return out + '<ellipse class="cc-petal" cx="' + f1(x + 4.6) + '" cy="' + f1(y + 3.7) + '" rx=".9" ry="1.2"/></g>';
  }
  function clothCrane() {
    var k = 170 * CRANE / 434, P = function (x, y) { return [f1((x - 217) * k), f1((y - 170) * k)]; };
    function path(pts, inset) {
      var q = [], cx = 0, cy = 0, n = pts.length / 2, i;
      for (i = 0; i < n; i++) { cx += pts[2 * i] / n; cy += pts[2 * i + 1] / n; }
      for (i = 0; i < n; i++) {
        var x = pts[2 * i], y = pts[2 * i + 1], dx = cx - x, dy = cy - y, d = Math.sqrt(dx * dx + dy * dy) || 1, t = inset ? Math.min(inset / k, d * .45) / d : 0;
        q.push(P(x + dx * t, y + dy * t).join(" "));
      }
      return "M" + q.join("L") + "Z";
    }
    var under = "", faces = "", stitches = "", clips = "";
    CRANE_FACES.forEach(function (f, i) {
      var d = path(f[0]);
      under += '<path d="' + d + '"/>';
      clips += '<clipPath id="ccPiece' + i + '"><path d="' + d + '"/></clipPath>';
      // the cloth, its weave, the light on the fold, and the padding falling away at its cut edge
      faces += '<path d="' + d + '" fill="url(#' + f[1] + ')"/><path class="cc-weave" d="' + d + '"/>' +
        (f[2] ? '<path d="' + d + '" fill="' + (f[2] > 0 ? "#fff8e8" : "#1d1208") + '" opacity="' + Math.abs(f[2]).toFixed(2) + '"/>' : "") +
        '<path class="cc-pad" d="' + d + '" clip-path="url(#ccPiece' + i + ')"/><path class="cc-cut" d="' + d + '"/>';
      stitches += '<path class="cc-run" d="' + path(f[0], 1.5) + '"/>';
    });
    var folds = CRANE_FOLDS.map(function (l) { var a = P(l[0], l[1]), b = P(l[2], l[3]); return "M" + a.join(" ") + "L" + b.join(" "); }).join("");
    var pearls = "";
    for (var t = .14; t < .95; t += .13) { var pp = P(2 + 170 * t, 12 + 98 * t + 5); pearls += '<circle cx="' + pp[0] + '" cy="' + pp[1] + '" r=".95"/>'; }
    var eye = P(95, 108), crown = P(106, 99);
    return '<g class="cloth-crane"><defs>' + clips + '</defs>' +
      '<g class="cc-lift" transform="translate(-1.4 2.2)">' + under + '</g>' + faces +
      '<path class="cc-fold" d="' + folds + '"/><path class="cc-couch" d="' + folds + '"/>' + stitches + plumSprig(P(198, 306)) +
      '<g class="cc-pearls" fill="url(#gPearlBead)">' + pearls + '</g>' +
      '<ellipse cx="' + crown[0] + '" cy="' + crown[1] + '" rx="3.2" ry="2" fill="url(#gSatin-vermilion)" stroke="#6e2115" stroke-width=".3" transform="rotate(-24 ' + crown[0] + ' ' + crown[1] + ')"/>' +
      '<circle cx="' + eye[0] + '" cy="' + eye[1] + '" r="1.15" fill="url(#gPearlBead)" stroke="#3a2a1a" stroke-width=".25"/>' +
      '<g class="night-shade">' + under + '</g></g>';
  }

  function stationOf(id, stations) { for (var i = 0; i < stations.length; i++) if (stations[i].id === id) return stations[i]; return null; }

  // Everything the scroll adds to the walking layer, in world coordinates.
  function pieces(width, stations) {
    var out = '<g class="scroll-layer">';
    // soft contact shadows, so each painted station sits on the stone instead of floating above it
    stations.forEach(function (st) { out += '<ellipse class="scroll-contact" cx="' + st.x + '" cy="' + (GY + 3) + '" rx="' + f1(st.half * .92) + '" ry="16" fill="url(#scrollContact)"/>'; });
    out += prologue(1080) + crossing(2900);
    CHAPTERS.forEach(function (ch) { if (ch.sign) out += chapterSign(ch); });
    return out + "</g>";
  }

  // Low mist lying over the stone path, in the front layer.
  function ends(width) {
    var seed = 91, r = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }, mist = "";
    for (var x = 160; x < width - 160; x += 380 + r() * 360) mist += '<ellipse class="scroll-ground-mist" cx="' + f1(x) + '" cy="' + f1(GY - 4 + r() * 10) + '" rx="' + f1(160 + r() * 160) + '" ry="' + f1(16 + r() * 12) + '" fill="url(#scrollMist)"/>';
    return '<g class="scroll-ends">' + mist + "</g>";
  }

  // The chapter a walking visitor has just reached, so Hanjing can say its line once per visit.
  var told = {};
  function reached(x) {
    for (var i = 0; i < CHAPTERS.length; i++) { var ch = CHAPTERS[i]; if (ch.sign && !told[ch.id] && Math.abs(x - (ch.at + 62)) < 70) { told[ch.id] = true; return ch; } }
    return null;
  }

  // Buttons over the painted hotspots, placed in the walking layer.
  function hotspotMarkup() {
    return HOTSPOTS.map(function (h) {
      return '<button type="button" class="paper-control scroll-hotspot" data-scroll-hotspot="' + h.id + '" aria-label="' + esc(h.label) + '" style="left:calc(var(--s) * ' + (h.x - h.w / 2) + 'px);bottom:calc(var(--s) * ' + (VH - h.y - h.h / 2) + 'px);width:calc(var(--s) * ' + h.w + 'px);height:calc(var(--s) * ' + h.h + 'px)"></button>';
    }).join("");
  }
  function hotspot(id) { for (var i = 0; i < HOTSPOTS.length; i++) if (HOTSPOTS[i].id === id) { if (id !== "crane") told[id] = true; else told.crossing = true; return HOTSPOTS[i]; } return null; }

  // A small map of the scroll at the bottom of the screen: a mark per chapter and the part in view.
  function mapMarkup(stations) {
    var n = 0, ticks = CHAPTERS.map(function (ch) {
      var st = stationOf(ch.id, stations), x = ch.at != null ? ch.at + 62 : st.x, pct = (x / SCROLL_W * 100).toFixed(2);
      if (st) n++;
      return '<button type="button" class="scroll-tick' + (st ? ' is-station' : '') + '" style="left:' + pct + '%" ' + (st ? 'data-go="' + st.id + '"' : 'data-at="' + x + '"') + ' aria-label="' + esc(ch.label) + '" title="' + esc(ch.label) + '"><span>' + (st ? n : "") + '</span></button>';
    }).join("");
    return '<div class="scroll-map-strip">' + ticks + '<span class="scroll-map-view" aria-hidden="true"></span></div>';
  }

  ART.scroll = { width: SCROLL_W, layout: LAYOUT, chapters: CHAPTERS, zones: CHAPTERS.filter(function (c) { return c.sign; }).map(function (c) { return { x: c.at + 62, half: 110 }; }),
    defs: defs, pieces: pieces, ends: ends, reached: reached, mapMarkup: mapMarkup, hotspotMarkup: hotspotMarkup, hotspot: hotspot };
})();
