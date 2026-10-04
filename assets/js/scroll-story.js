/*
 * The handscroll layer for the 2D world. The walk is read as one long scroll (长卷): a title head
 * with its roller, a prologue by the sea in Dalian, the gate, a crossing of the Pacific in 2013, the
 * road of schools (upstate New York first), the questions, the talks, the writing, life with six
 * cats, a colophon for visitors' letters, and an unfinished tail with collectors' seals.
 *
 * Chapter text is written straight onto the painting as calligraphy with a red seal, the way
 * inscriptions sit on a real scroll. The new scenes use fine ink lines over soft washes (gongbi with
 * watercolour) and reuse the painted sprites, so they share one medium with the stations.
 * World units: the scene is 800 tall and the walking line is at y = 560.
 */
(function () {
  "use strict";
  var ART = window.HJArt; if (!ART) return;
  var GY = ART.GY, VH = ART.VH;

  function f1(n) { return Math.round(n * 10) / 10; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function sprite(name, x, y, w, h, cls) { return ART.paintSprite ? ART.paintSprite(name, x, y, w, h, cls) : ""; }

  // The scroll, chapter by chapter. Station chapters attach to the station with the same id.
  var SCROLL_W = 10360;
  var LAYOUT = { home: 1900, education: 4150, research: 5250, talks: 6350, writing: 7450, life: 8450, contact: 9400 };
  var CHAPTERS = [
    { id: "head", at: 360, mark: "", zh: "长卷", seal: "长卷", en: ["Hanjing's World", "a handscroll of a life", "still being painted"], title: true },
    { id: "prologue", at: 1060, mark: "序", zh: "来处", seal: "海", en: ["Dalian, my seaside hometown.", "The scroll begins by the sea,", "where seafood tastes like home."] },
    { id: "home", mark: "启", zh: "入口", seal: "门", en: ["The gate. Come in,", "and walk right to unroll the scroll."] },
    { id: "crossing", at: 2790, mark: "渡", zh: "二〇一三", seal: "鹤", en: ["In 2013 I crossed the Pacific", "for high school. Nearly a century", "earlier, my grandfather crossed it too."] },
    { id: "education", at: 3330, mark: "壹", zh: "求学", seal: "行", en: ["The road of schools: upstate", "New York, Davis, DC, Bethlehem.", "I kept choosing wider."] },
    { id: "research", mark: "贰", zh: "求索", seal: "问", en: ["The questions I follow:", "who stays in charge of AI,", "and what a persona promises."] },
    { id: "talks", mark: "叁", zh: "言说", seal: "言", en: ["Where I have spoken,", "and the ideas behind the slides."] },
    { id: "writing", mark: "肆", zh: "书写", seal: "书", en: ["Writing and tutorials,", "a little brush and a lot of code."] },
    { id: "life", mark: "伍", zh: "生活", seal: "猫", en: ["Life in San Francisco,", "with six cats who run the house."] },
    { id: "contact", mark: "跋", zh: "来信", seal: "信", en: ["The colophon. Every scroll ends", "with words from friends,", "so write me a line."] },
    { id: "tail", at: 10010, mark: "续", zh: "未完", seal: "续", en: ["To be continued.", "The scroll is still being painted."] }
  ];
  // Places that the ground decorations keep clear of, besides the stations.
  var ZONES = [{ x: 330, half: 330 }, { x: 1060, half: 300 }, { x: 2790, half: 380 }, { x: 3445, half: 180 }, { x: 10060, half: 300 }];

  function defs() {
    return '<linearGradient id="scrollRod" x1="0" x2="1"><stop offset="0" stop-color="#3b2216"/><stop offset=".35" stop-color="#7a4a30"/><stop offset=".55" stop-color="#a7714c"/><stop offset="1" stop-color="#3b2216"/></linearGradient>' +
      '<radialGradient id="scrollKnob" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#f4f1e2"/><stop offset=".55" stop-color="#cfd8c4"/><stop offset="1" stop-color="#8fa18c"/></radialGradient>' +
      '<pattern id="scrollBrocade" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#c9b48a"/><path d="M9 2c3 0 4 3 2 5c3 -1 5 1 4 3c-1 3 -5 2 -6 0c-1 2 -5 3 -6 0c-1 -2 1 -4 4 -3c-2 -2 -1 -5 2 -5z" fill="#b39a6c" opacity=".7"/><circle cx="0" cy="0" r="1.6" fill="#9e855a"/><circle cx="18" cy="18" r="1.6" fill="#9e855a"/></pattern>' +
      '<linearGradient id="scrollSea" x2="0" y2="1"><stop offset="0" stop-color="#bcd3d0" stop-opacity="0"/><stop offset=".12" stop-color="#b6cfcc"/><stop offset=".6" stop-color="#93b6b4"/><stop offset="1" stop-color="#7fa4a3"/></linearGradient>' +
      '<linearGradient id="scrollSeaNight" x2="0" y2="1"><stop offset="0" stop-color="#2a3b46" stop-opacity="0"/><stop offset=".12" stop-color="#26394a"/><stop offset=".6" stop-color="#1e3040"/><stop offset="1" stop-color="#182a38"/></linearGradient>' +
      '<linearGradient id="scrollSeaFade" x1="0" x2="1"><stop offset="0" stop-color="white" stop-opacity="0"/><stop offset=".18" stop-color="white"/><stop offset=".82" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient>' +
      '<mask id="scrollSeaMask" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#scrollSeaFade)"/></mask>' +
      '<linearGradient id="gbStone" x2="0" y2="1"><stop offset="0" stop-color="#c9bfae"/><stop offset="1" stop-color="#a99d88"/></linearGradient>' +
      '<linearGradient id="gbSlate" x2="0" y2="1"><stop offset="0" stop-color="#6b7584"/><stop offset="1" stop-color="#4a5260"/></linearGradient>' +
      '<radialGradient id="gbMaple"><stop offset="0" stop-color="#e2793a"/><stop offset=".7" stop-color="#c9482c" stop-opacity=".9"/><stop offset="1" stop-color="#b8352c" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="gbGold"><stop offset="0" stop-color="#f0c45a"/><stop offset=".7" stop-color="#e09a3a" stop-opacity=".88"/><stop offset="1" stop-color="#d88a2c" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="gbCloud" cx=".5" cy=".6" r=".6"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#f3e7d2" stop-opacity=".65"/></radialGradient>' +
      '<linearGradient id="gbTower" x1="0" x2="1"><stop offset="0" stop-color="#fbf8f0"/><stop offset=".55" stop-color="#ece6d8"/><stop offset="1" stop-color="#c9c2b2"/></linearGradient>' +
      '<radialGradient id="tailSilk" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#f7efdc" stop-opacity=".7"/><stop offset=".75" stop-color="#f3e8cf" stop-opacity=".35"/><stop offset="1" stop-color="#f3e8cf" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="scrollLamp"><stop offset="0" stop-color="#fff1c4"/><stop offset=".4" stop-color="#ffd27a" stop-opacity=".55"/><stop offset="1" stop-color="#ffb648" stop-opacity="0"/></radialGradient>' +
      // watercolour on paper: edges wander a little and the paper grain shows through the washes
      '<filter id="gbPaint" x="-2%" y="-4%" width="104%" height="108%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="3" seed="3" result="warp"/><feDisplacementMap in="SourceGraphic" in2="warp" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="d"/><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="11" result="grain"/><feColorMatrix in="grain" type="matrix" values="0 0 0 0 .42  0 0 0 0 .36  0 0 0 0 .3  0 0 0 -.9 .34" result="g2"/><feComposite in="g2" in2="d" operator="in" result="gi"/><feBlend in="gi" in2="d" mode="multiply"/></filter>' +
      // ink that bleeds a little into the paper
      '<filter id="inkBleed" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.4"/></filter>';
  }

  // A red seal: square with the given characters in reversed (white) script.
  function seal(x, y, size, text, round) {
    var chars = String(text).split(""), n = chars.length, cols = n > 2 ? 2 : 1, rows = Math.ceil(n / cols), fs = size / (Math.max(cols, rows) + .35);
    var body = round ? '<ellipse class="seal-ink" cx="' + f1(size / 2) + '" cy="' + f1(size * .62) + '" rx="' + f1(size * .42) + '" ry="' + f1(size * .62) + '"/>' : '<rect class="seal-ink" width="' + size + '" height="' + size + '" rx="' + f1(size * .06) + '"/>';
    var t = "";
    chars.forEach(function (c, i) {
      var col = cols - 1 - Math.floor(i / rows), row = i % rows;
      t += '<text class="seal-char" x="' + f1((col + .5) * size / cols) + '" y="' + f1((row + .78) * (round ? size * 1.24 : size) / rows) + '" font-size="' + f1(fs) + '">' + esc(c) + '</text>';
    });
    return '<g class="scroll-seal" transform="translate(' + f1(x) + ' ' + f1(y) + ') rotate(' + (round ? 0 : -2) + ')">' + body + t + '<rect class="seal-wear" width="' + size + '" height="' + f1(round ? size * 1.24 : size) + '" fill="url(#gMineral)"/></g>';
  }

  // Calligraphy written on the painting: a vertical chapter column with its numeral, English lines
  // beside it, and a seal.
  function inscription(ch, x) {
    var top = ch.title ? 64 : 74, size = ch.title ? 86 : 40, zh = ch.zh.split(""), out = '<g class="scroll-inscription' + (ch.title ? ' is-title' : '') + '" data-chapter="' + ch.id + '">';
    if (ch.mark) out += '<text class="ins-mark" x="' + f1(x) + '" y="' + (top + 6) + '" font-size="26">' + esc(ch.mark) + '</text>';
    zh.forEach(function (c, i) { out += '<text class="ins-zh" x="' + f1(x) + '" y="' + f1(top + (ch.title ? 96 : 44) + i * size * 1.02) + '" font-size="' + size + '">' + esc(c) + '</text>'; });
    var colBottom = top + (ch.title ? 96 : 44) + (zh.length - 1) * size * 1.02 + 12;
    out += seal(x - (ch.title ? 22 : 13), colBottom, ch.title ? 44 : 26, ch.seal, !ch.title && ch.seal.length === 1 && /[海鹤猫]/.test(ch.seal));
    var ex = x - (ch.title ? 72 : 40), ey = top + (ch.title ? 40 : 30);
    ch.en.forEach(function (line, i) {
      out += '<text class="ins-en' + (i === 0 && ch.title ? ' ins-en-title' : '') + '" x="' + f1(ex) + '" y="' + f1(ey + i * (ch.title ? (i === 0 ? 0 : 26) : 19) + (ch.title && i > 0 ? 30 : 0)) + '" text-anchor="end">' + esc(line) + '</text>';
    });
    if (ch.title) out += seal(ex - 210, ey + 96, 30, "HS", false) + '<text class="ins-en ins-hint" x="' + f1(ex) + '" y="' + f1(ey + 128) + '" text-anchor="end">walk right to unroll it →</text>';
    return out + "</g>";
  }

  // The rollers at both ends, and the table the scroll rests on beyond them.
  function roller(x, side) {
    var table = side < 0 ? '<rect class="scroll-table" x="' + (x - 900) + '" y="-40" width="900" height="' + (VH + 80) + '"/>' : '<rect class="scroll-table" x="' + x + '" y="-40" width="900" height="' + (VH + 80) + '"/>';
    var band = '<rect x="' + (side < 0 ? x + 10 : x - 34) + '" y="0" width="24" height="' + VH + '" fill="url(#scrollBrocade)" class="scroll-band"/>' +
      '<rect class="scroll-band-edge" x="' + (side < 0 ? x + 33 : x - 35) + '" y="0" width="1.6" height="' + VH + '"/>';
    return '<g class="scroll-roller">' + table + band +
      '<rect x="' + (x - 11) + '" y="6" width="22" height="' + (VH - 12) + '" rx="6" fill="url(#scrollRod)"/>' +
      '<rect class="scroll-rod-shine" x="' + (x - 4) + '" y="10" width="3" height="' + (VH - 20) + '" rx="1.5"/>' +
      '<ellipse cx="' + x + '" cy="4" rx="17" ry="11" fill="url(#scrollKnob)"/><ellipse cx="' + x + '" cy="' + (VH - 4) + '" rx="17" ry="11" fill="url(#scrollKnob)"/></g>';
  }

  // A band of sea behind the walk, faded at both ends so it melts into the misty land.
  function seaBand(x0, x1, horizon) {
    var r = rng(x0 | 0), lines = "";
    for (var i = 0; i < 26; i++) { var lx = x0 + r() * (x1 - x0), ly = horizon + 10 + r() * (GY - horizon - 18), ll = 14 + r() * 40; lines += "M" + f1(lx) + " " + f1(ly) + "q" + f1(ll / 2) + " -2 " + f1(ll) + " 0"; }
    return '<g class="scroll-sea" mask="url(#scrollSeaMask)"><rect x="' + x0 + '" y="' + horizon + '" width="' + (x1 - x0) + '" height="' + (GY - horizon + 4) + '" class="sea-fill"/>' +
      '<path class="sea-lines" d="' + lines + '"/><path class="sea-horizon" d="M' + x0 + " " + horizon + "H" + x1 + '"/></g>';
  }
  function gull(x, y, s, delay) {
    return '<g class="scroll-gull" style="animation-delay:' + delay + 's" transform="translate(' + f1(x) + ' ' + f1(y) + ') scale(' + s + ')"><path class="gull-ink" d="M-12 0q6 -6 12 0q6 -6 12 0"/></g>';
  }
  function sail(x, y, s) {
    return '<g class="scroll-sail" transform="translate(' + f1(x) + ' ' + f1(y) + ') scale(' + s + ')"><path class="sail-hull" d="M-14 0h28l-4 5h-20z"/><path class="sail-cloth" d="M0 -1V-26L13 -2z"/><path class="sail-cloth sail-jib" d="M-2 -2V-20L-11 -2z"/><path class="gb-line" d="M0 0V-27"/></g>';
  }

  // 序 · Dalian: a rocky cape with a white lighthouse, sails on the bay and gulls.
  function prologue(cx) {
    var out = '<g class="scroll-piece piece-dalian">' + seaBand(cx - 330, cx + 330, 452);
    out += sail(cx - 170, 520, 1.1) + sail(cx + 210, 506, .8) + sail(cx + 60, 497, .55);
    // the far shore of the bay, a soft ink ridge
    out += '<path class="far-shore" d="M' + (cx - 300) + ' 470q60 -18 120 -6q50 -14 110 -2q70 -20 140 -4q60 -8 120 4L' + (cx + 300) + ' 476H' + (cx - 300) + 'z"/>';
    // the cape: painted rocks stacked into a headland, and the lighthouse on top
    out += sprite("rock", cx + 60, GY - 70, 170, 76, "garden-stone scroll-cape-rock") + sprite("rock", cx + 30, GY - 40, 96, 44, "garden-stone") + sprite("rock", cx + 196, GY - 44, 84, 46, "garden-stone");
    var lx = cx + 140, base = GY - 62, H = 118;
    out += '<rect class="lh-plinth" x="' + (lx - 22) + '" y="' + (base - 6) + '" width="44" height="10" rx="2"/><path class="gb-line" d="M' + (lx - 22) + ' ' + (base + 4) + 'h44M' + (lx - 22) + ' ' + (base - 6) + 'h44"/>';
    out += '<path class="lighthouse" fill="url(#gbTower)" d="M' + (lx - 16) + ' ' + (base - 6) + 'L' + (lx - 10) + ' ' + (base - H) + 'H' + (lx + 10) + 'L' + (lx + 16) + ' ' + (base - 6) + 'z"/>' +
      '<path class="lighthouse-band" d="M' + (lx - 14.6) + ' ' + (base - 34) + 'H' + (lx + 14.6) + 'L' + (lx + 13.4) + ' ' + (base - 52) + 'H' + (lx - 13.4) + 'z"/>' +
      '<path class="lighthouse-band" d="M' + (lx - 12) + ' ' + (base - 84) + 'H' + (lx + 12) + 'L' + (lx + 11.2) + ' ' + (base - 100) + 'H' + (lx - 11.2) + 'z"/>' +
      '<path class="gb-door-lh" d="M' + (lx - 4) + ' ' + (base - 6) + 'V' + (base - 18) + 'q4 -5 8 0V' + (base - 6) + 'z"/>' +
      '<rect class="lh-window" x="' + (lx - 2) + '" y="' + (base - 66) + '" width="4" height="7" rx="2"/><rect class="lh-window" x="' + (lx - 1.8) + '" y="' + (base - 112) + '" width="3.6" height="6" rx="1.8"/>' +
      '<rect class="lighthouse-gallery" x="' + (lx - 16) + '" y="' + (base - H - 4) + '" width="32" height="4"/>' +
      '<path class="lh-rail" d="M' + (lx - 15) + ' ' + (base - H - 4) + 'v-7h30v7M' + (lx - 10) + ' ' + (base - H - 4) + 'v-7M' + (lx - 5) + ' ' + (base - H - 4) + 'v-7M' + lx + ' ' + (base - H - 4) + 'v-7M' + (lx + 5) + ' ' + (base - H - 4) + 'v-7M' + (lx + 10) + ' ' + (base - H - 4) + 'v-7"/>' +
      '<rect class="lighthouse-room" x="' + (lx - 8) + '" y="' + (base - H - 24) + '" width="16" height="17"/><path class="lh-mullion" d="M' + (lx - 3) + ' ' + (base - H - 24) + 'v17M' + (lx + 3) + ' ' + (base - H - 24) + 'v17"/>' +
      '<path class="lighthouse-cap" d="M' + (lx - 11) + ' ' + (base - H - 24) + 'Q' + lx + ' ' + (base - H - 43) + ' ' + (lx + 11) + ' ' + (base - H - 24) + 'z"/><path class="gb-line" d="M' + lx + ' ' + (base - H - 40) + 'v-6"/>' +
      '<path class="gb-line" d="M' + (lx - 16) + ' ' + (base - 6) + 'L' + (lx - 10) + ' ' + (base - H) + 'M' + (lx + 16) + ' ' + (base - 6) + 'L' + (lx + 10) + ' ' + (base - H) + '"/>';
    base = base - H + 118 - 0; // keep the glow anchored to the lantern room below
    out += sprite("grass", cx + 96, GY - 22, 22, 20) + sprite("grass", cx + 220, GY - 18, 18, 16);
    out += gull(cx - 120, 330, 1, 0) + gull(cx - 60, 360, .7, -1.2) + gull(cx + 30, 300, .85, -2.1) + gull(cx + 240, 342, .6, -.6);
    out += '</g><g class="scroll-glow-group"><circle class="scroll-glow" cx="' + lx + '" cy="' + (base - 133) + '" r="46" fill="url(#scrollLamp)"/><path class="scroll-beam" d="M' + lx + ' ' + (base - 133) + 'L' + (lx - 260) + ' ' + (base - 160) + 'L' + (lx - 260) + ' ' + (base - 108) + 'z"/></g>';
    return out;
  }

  // An auspicious cloud in fine outline with a pale wash.
  function cloud(x, y, s) {
    var d = "M-40 10c-14 0 -16 -18 -2 -20c0 -14 20 -18 28 -8c6 -14 30 -12 32 4c14 -4 24 8 16 18c8 6 2 16 -8 14c-6 8 -22 6 -26 0c-8 8 -26 6 -28 -2c-8 4 -16 0 -12 -6z";
    return '<g class="scroll-cloud" transform="translate(' + f1(x) + ' ' + f1(y) + ') scale(' + s + ')"><path d="' + d + '" fill="url(#gbCloud)"/><path class="gb-line" d="' + d + '"/><path class="gb-line cloud-curl" d="M-22 -6q6 -8 14 -2M10 -8q8 -6 14 2M-6 6q8 6 16 0"/></g>';
  }

  // 渡 · 2013: a paper crane over the Pacific, and far away a steamship from an older crossing.
  function crossing(cx) {
    var out = '<g class="scroll-piece piece-crossing">' + seaBand(cx - 400, cx + 400, 440);
    out += '<g class="scroll-steamer" transform="translate(' + (cx - 240) + ' 452) scale(.9)"><path class="steamer-hull" d="M-40 0h80l-8 9h-64z"/><rect class="steamer-house" x="-22" y="-10" width="40" height="10"/><rect class="steamer-stack" x="-6" y="-24" width="8" height="14"/><path class="steamer-smoke" d="M-2 -26q-10 -10 -2 -18q-10 -8 0 -16"/></g>';
    out += cloud(cx - 190, 236, 1.1) + cloud(cx + 300, 190, .9) + cloud(cx + 90, 350, .7);
    // the crane flies east, toward the other shore
    out += '<g transform="translate(' + (cx + 190) + ' 300) scale(-1 1)"><g class="scroll-crane-flight">' + sprite("crane", -75, -59, 150, 118, "scroll-crane") + '</g></g>';
    out += '<path class="crane-wake" d="M' + (cx - 40) + ' 352q90 -30 170 -26"/>';
    return out + "</g>";
  }

  // Tibbits Hall at Hoosac School: ashlar stone, steep slate roofs, two towers, a pointed window,
  // a porch, autumn maples and a red and purple pennant.
  function hoosac(cx) {
    var g = GY, x0 = cx - 110, out = '<g class="scroll-piece piece-hoosac">';
    function wall(x, y, w, h) {
      var lines = "";
      for (var yy = y + 8; yy < y + h; yy += 8) lines += "M" + x + " " + yy + "h" + w;
      for (var row = 0, yy2 = y; yy2 < y + h; yy2 += 8, row++) for (var xx = x + (row % 2 ? 6 : 12); xx < x + w; xx += 16) lines += "M" + xx + " " + yy2 + "v8";
      return '<rect class="gb-stone" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/><path class="gb-ashlar" d="' + lines + '"/><rect class="gb-line" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/>';
    }
    function roof(x, y, w, h) {
      var scales = "";
      for (var yy = y + 6; yy < y + h; yy += 6) { var t = (yy - y) / h, half = w / 2 * t; for (var xx = -half + 3; xx < half - 2; xx += 6) scales += "M" + f1(x + xx - 2.6) + " " + yy + "a3 3 0 0 0 5.2 0"; }
      return '<path class="gb-slate" d="M' + (x - w / 2) + ' ' + (y + h) + 'L' + x + ' ' + y + 'L' + (x + w / 2) + ' ' + (y + h) + 'z"/><path class="gb-scales" d="' + scales + '"/><path class="gb-line" d="M' + (x - w / 2 - 3) + ' ' + (y + h) + 'L' + x + ' ' + y + 'L' + (x + w / 2 + 3) + ' ' + (y + h) + '"/>';
    }
    function win(x, y, w, h, pointed) {
      return pointed ? '<path class="gb-window" d="M' + x + ' ' + (y + h) + 'V' + (y + h * .35) + 'Q' + x + ' ' + y + ' ' + (x + w / 2) + ' ' + (y - h * .12) + 'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + h * .35) + 'V' + (y + h) + 'z"/>'
        : '<rect class="gb-window" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/><path class="gb-lintel" d="M' + (x - 2) + ' ' + (y - 2) + 'h' + (w + 4) + '"/>';
    }
    // autumn maples behind, painted leaf by leaf in reds, oranges and golds with a few ink touches
    var lr = rng(29), leafCols = ["#b8352c", "#c9482c", "#e07a3a", "#e8a23c", "#d4562e", "#f0c45a"];
    [[x0 - 30, g - 78, 40], [x0 + 238, g - 70, 34], [x0 + 206, g - 104, 30], [x0 + 64, g - 150, 26]].forEach(function (m, ti) {
      out += '<path class="gb-trunk" d="M' + m[0] + ' ' + g + 'q' + (ti % 2 ? 3 : -3) + ' -' + f1((g - m[1]) * .5) + ' 0 -' + f1(g - m[1] - 6) + 'M' + m[0] + ' ' + f1(m[1] + 18) + 'l-' + f1(m[2] * .45) + ' -' + f1(m[2] * .35) + 'M' + m[0] + ' ' + f1(m[1] + 12) + 'l' + f1(m[2] * .4) + ' -' + f1(m[2] * .4) + '"/>';
      var leaves = "", ink = "";
      for (var k = 0; k < 34; k++) {
        var a = lr() * Math.PI * 2, rr = Math.sqrt(lr()) * m[2], px = m[0] + Math.cos(a) * rr * 1.1, py = m[1] + Math.sin(a) * rr * .8, sz = 4 + lr() * 5;
        leaves += '<circle cx="' + f1(px) + '" cy="' + f1(py) + '" r="' + f1(sz) + '" fill="' + leafCols[Math.floor(lr() * leafCols.length)] + '" opacity="' + f1(.55 + lr() * .4) + '"/>';
        if (k % 4 === 0) ink += 'M' + f1(px - sz * .7) + ' ' + f1(py) + 'a' + f1(sz * .7) + ' ' + f1(sz * .7) + ' 0 0 1 ' + f1(sz * 1.4) + ' 0';
      }
      out += '<g class="gb-maple">' + leaves + '<path class="gb-line leaf-ink" d="' + ink + '"/></g>';
    });
    out += wall(x0, g - 74, 190, 74) + roof(x0 + 95, g - 136, 210, 62);
    out += wall(x0 + 120, g - 82, 54, 82) + roof(x0 + 147, g - 132, 66, 50);
    out += win(x0 + 136, g - 128 + 50, 22, 28, true) + win(x0 + 138, g - 40, 18, 22);
    out += wall(x0 - 30, g - 128, 38, 128) + roof(x0 - 11, g - 176, 50, 48);
    out += wall(x0 + 186, g - 104, 30, 104) + '<path class="gb-slate" d="M' + (x0 + 182) + ' ' + (g - 104) + 'Q' + (x0 + 201) + ' ' + (g - 160) + ' ' + (x0 + 220) + ' ' + (g - 104) + 'z"/><path class="gb-line" d="M' + (x0 + 182) + ' ' + (g - 104) + 'Q' + (x0 + 201) + ' ' + (g - 160) + ' ' + (x0 + 220) + ' ' + (g - 104) + '"/>';
    [[x0 - 22, g - 112], [x0 - 22, g - 64], [x0 + 16, g - 52], [x0 + 50, g - 52], [x0 + 84, g - 52], [x0 + 192, g - 70]].forEach(function (w, i) { out += win(w[0], w[1], i === 5 ? 18 : 22, i < 2 ? 26 : 22, i === 0); });
    // quoins on the corners, shadow under the eaves, dormers in the roof, ivy on the tower
    [[x0, g - 74, 74], [x0 + 190, g - 74, 74], [x0 - 30, g - 128, 128], [x0 + 8, g - 128, 128], [x0 + 120, g - 82, 82], [x0 + 174, g - 82, 82]].forEach(function (q) {
      for (var yy = q[1]; yy < q[1] + q[2] - 4; yy += 10) out += '<rect class="gb-quoin" x="' + (q[0] - 3) + '" y="' + yy + '" width="' + (((yy - q[1]) / 10) % 2 ? 6 : 9) + '" height="5"/>';
    });
    out += '<rect class="gb-eave-shadow" x="' + x0 + '" y="' + (g - 74) + '" width="190" height="7"/><rect class="gb-eave-shadow" x="' + (x0 + 120) + '" y="' + (g - 82) + '" width="54" height="6"/><rect class="gb-eave-shadow" x="' + (x0 - 30) + '" y="' + (g - 128) + '" width="38" height="6"/>';
    [[x0 + 30, g - 108], [x0 + 74, g - 108]].forEach(function (d) {
      out += '<rect class="gb-stone" x="' + d[0] + '" y="' + d[1] + '" width="16" height="14"/><path class="gb-slate" d="M' + (d[0] - 3) + ' ' + d[1] + 'L' + (d[0] + 8) + ' ' + (d[1] - 12) + 'L' + (d[0] + 19) + ' ' + d[1] + 'z"/>' + win(d[0] + 4, d[1] + 3, 8, 9) + '<path class="gb-line" d="M' + (d[0] - 3) + ' ' + d[1] + 'L' + (d[0] + 8) + ' ' + (d[1] - 12) + 'L' + (d[0] + 19) + ' ' + d[1] + '"/>';
    });
    var ivy = "", ir = rng(41);
    for (var k = 0; k < 40; k++) ivy += '<circle cx="' + f1(x0 - 28 + ir() * 20) + '" cy="' + f1(g - 4 - ir() * 70 * Math.sqrt(ir())) + '" r="' + f1(2 + ir() * 2.6) + '"/>';
    out += '<g class="gb-ivy">' + ivy + '</g>';
    out += '<path class="gb-step" d="M' + (x0 + 86) + ' ' + g + 'h40v4h-40z"/><path class="gb-step" d="M' + (x0 + 82) + ' ' + (g + 4) + 'h48v4h-48z"/>';
    // the arched porch and steps
    out += '<path class="gb-stone" d="M' + (x0 + 92) + ' ' + g + 'V' + (g - 34) + 'Q' + (x0 + 106) + ' ' + (g - 54) + ' ' + (x0 + 120) + ' ' + (g - 34) + 'V' + g + 'z"/><path class="gb-door" d="M' + (x0 + 98) + ' ' + g + 'V' + (g - 30) + 'Q' + (x0 + 106) + ' ' + (g - 44) + ' ' + (x0 + 114) + ' ' + (g - 30) + 'V' + g + 'z"/><path class="gb-line" d="M' + (x0 + 92) + ' ' + g + 'V' + (g - 34) + 'Q' + (x0 + 106) + ' ' + (g - 54) + ' ' + (x0 + 120) + ' ' + (g - 34) + 'V' + g + '"/>';
    // chimneys and the pennant
    out += '<rect class="gb-stone" x="' + (x0 + 40) + '" y="' + (g - 152) + '" width="9" height="34"/><rect class="gb-stone" x="' + (x0 + 160) + '" y="' + (g - 146) + '" width="8" height="28"/>';
    out += '<path class="gb-line" d="M' + (x0 - 11) + ' ' + (g - 176) + 'V' + (g - 204) + '"/><g class="scroll-pennant" transform="translate(' + (x0 - 11) + ' ' + (g - 203) + ')"><path class="pennant-red" d="M0 0L34 4L0 8z"/><path class="pennant-purple" d="M0 4L34 4L0 8z"/></g>';
    // a little plaque under it
    out += '<g class="scroll-plaque" transform="translate(' + (cx - 46) + ' ' + (g + 14) + ')"><rect width="92" height="16" rx="2"/><text x="46" y="11.5" text-anchor="middle">HOOSAC · NEW YORK</text></g>';
    return out + "</g>";
  }

  // The tail: a pale stretch of silk where collectors have stamped their seals over the years.
  function tail(cx) {
    var out = '<g class="scroll-piece piece-tail"><rect class="tail-silk" x="' + (cx - 230) + '" y="30" width="480" height="' + (GY - 40) + '" fill="url(#tailSilk)"/>';
    out += seal(cx - 150, 196, 26, "珍藏", false) + seal(cx - 112, 236, 18, "鉴", true) + seal(cx - 196, 250, 22, "猫", false) + seal(cx + 40, 250, 18, "海", true) + seal(cx - 70, 182, 20, "书", false);
    return out + "</g>";
  }

  function stationX(id, stations) { for (var i = 0; i < stations.length; i++) if (stations[i].id === id) return stations[i]; return null; }

  // Everything the scroll adds to the walking layer, in world coordinates.
  function pieces(width, stations) {
    var out = '<g class="scroll-layer">';
    out += prologue(1060) + crossing(2790) + hoosac(3445) + tail(10060);
    CHAPTERS.forEach(function (ch) {
      var st = stationX(ch.id, stations), x = ch.at != null ? ch.at : st.x - st.half - 70;
      if (ch.id === "head") x = 560;
      out += inscription(ch, x);
    });
    return out + "</g>";
  }

  // A small scroll map at the bottom of the screen: the rollers, a tick per chapter, and the part in view.
  function mapMarkup(stations) {
    var ticks = CHAPTERS.map(function (ch) {
      var st = stationX(ch.id, stations), x = ch.at != null ? ch.at : st.x, pct = (x / SCROLL_W * 100).toFixed(2);
      return '<button type="button" class="scroll-tick' + (st ? ' is-station' : '') + '" style="left:' + pct + '%" ' + (st ? 'data-go="' + st.id + '"' : 'data-at="' + x + '"') + ' aria-label="' + esc((ch.mark ? ch.mark + ' ' : '') + ch.zh + ', ' + ch.en[0]) + '"><span>' + esc(ch.mark) + '</span></button>';
    }).join("");
    return '<div class="scroll-map-rod" aria-hidden="true"></div><div class="scroll-map-strip">' + ticks + '<span class="scroll-map-view" aria-hidden="true"></span></div><div class="scroll-map-rod" aria-hidden="true"></div>';
  }

  // the rollers sit above the water and reeds, so they belong to the front layer
  function ends(width) { return '<g class="scroll-ends">' + roller(30, -1) + roller(width - 30, 1) + "</g>"; }

  ART.scroll = { width: SCROLL_W, layout: LAYOUT, chapters: CHAPTERS, zones: ZONES, defs: defs, pieces: pieces, ends: ends, mapMarkup: mapMarkup };
})();
