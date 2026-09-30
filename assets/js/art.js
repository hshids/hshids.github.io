/*
 * Hand-built SVG art for the interactive world: the avatar, the cats,
 * the eight stations, and the layered ink-wash scenery.
 *
 * World units: the scene is 800 units tall and the path (ground line) is at
 * y = 560. Colors come from CSS variables (see world.css) so the same art
 * works for the day and night themes.
 */
(function () {
  "use strict";

  var GY = 560;   // ground line
  var VH = 800;   // scene height

  // Small seeded PRNG so the scenery is the same on every visit.
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function f1(n) { return Math.round(n * 10) / 10; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  // ------------------------------------------------------------------
  // Avatar, drawn from Hanjing's photos in a storybook, semi-realistic style
  // (about five and a half heads tall, softly shaded). By day: long, wavy
  // black hair with a side part, a camel trench coat over a white shirt, and
  // a red book. By night: a black qipao with gold bamboo embroidery, an updo
  // with a white flower pin, and a small lantern. The theme picks the outfit.
  //
  // Besides the standing figure, the red-circle actions use: two arm poses
  // (reading, typing), a crouch (petting XiaoHei) and a seated view from
  // behind (writing at the desk). All share the 120 x 200 box; feet at y 192.
  // ------------------------------------------------------------------
  var INK = "#2a1f1b", SKIN = "#f2d7c6", SKIN_SH = "#dfb8a4", BLUSH = "#eea69c";
  var HAIR_LINE = "#0e0a0b", HAIR_HI = "#574c52";
  var COAT_SH = "#a07b52", COAT_HI = "#d9bd95", COAT_LINE = "#4e3825", BUTTON = "#e4d0a8";
  var SHIRT = "#f6f1e7", QIPAO = "#17161b", QIPAO_LINE = "#3a3942", GOLD = "#cda75e", GOLD_2 = "#e8cf98";

  function bamboo(x, y, s, rot) {
    return '<g transform="translate(' + x + " " + y + ") rotate(" + rot + ") scale(" + s + ')">' +
      '<path d="M0 0C2 -6 3 -12 3 -18" stroke="' + GOLD + '" stroke-width="1" fill="none"/>' +
      '<path d="M1 -5c-5 -1 -9 1 -11 4c4 0 8 -1 11 -4z" fill="' + GOLD + '"/>' +
      '<path d="M2 -10c5 -2 9 -1 11 1c-4 1 -8 1 -11 -1z" fill="' + GOLD_2 + '"/>' +
      '<path d="M3 -15c-4 -3 -8 -3 -10 -2c3 2 7 3 10 2z" fill="' + GOLD + '"/>' +
      '<path d="M3 -18c3 -3 7 -4 9 -3c-2 2 -6 3 -9 3z" fill="' + GOLD_2 + '"/>' +
      "</g>";
  }

  function sk(col, w) { return ' stroke="' + col + '" stroke-width="' + w + '"'; }
  function P(d, fill, stroke, w, extra) {
    var path = '<path d="' + d + '" fill="' + (fill || "none") + '"' + (stroke ? sk(stroke, w) : "") + (extra || "") + "/>";
    // The same weave follows sleeves, standing, seated and crouching outfits.
    if (fill && fill.indexOf("url(#hjCoat") === 0) path += surface(d, "gabardine");
    if (fill && fill.indexOf("url(#hjQipao") === 0) path += surface(d, "silk");
    return path;
  }

  // Material overlays follow each object's own silhouette; they never take input.
  function surface(d, material) {
    return '<path class="material material-' + material + '" d="' + d + '"/>';
  }
  // Mirror a path's x coordinates around the figure's centre line (x = 60).
  function mirrorPath(d) {
    var out = "", cmd = "", k = 0;
    d.replace(/([MLCQHVZ])|(-?\d*\.?\d+)/g, function (m, c, num) {
      if (c) { cmd = c; k = 0; out += c; return m; }
      var v = parseFloat(num);
      var isX = cmd === "H" || (cmd !== "V" && k % 2 === 0);
      out += (out && /[\d.]$/.test(out) ? " " : "") + (isX ? f1(120 - v) : v);
      k++;
      return m;
    });
    return out;
  }

  // The head: a round, friendly face and both hairstyles. `look` = "front" | "down" (smiling eyes, for petting).
  function head(h, s, look) {
    var down = look === "down", fringe = "";
    for (var strand = 0; strand < 12; strand++) {
      fringe += "M" + f1(55.2 + strand * .65) + " " + f1(18.5 + strand * .12) + "Q" + f1(48.5 + strand * .7) + " " + f1(23.2 + strand * .2) + " " + f1(46.3 + strand * .57) + " " + f1(33.5 - strand * .43);
    }
    var face = "M46.4 37.5C46 27 52.4 21 60 21C68 21 74 27 73.6 37.5C73.4 46.6 68.4 54.8 63 57.4Q60 59.4 57 57.4C51.6 54.8 46.6 46.6 46.4 37.5Z";
    var eye = function (cx, flip) {
      var d = flip ? -1 : 1;
      return '<path d="M' + (cx - 3.2) + ' 40.3q3.1 -3.5 6.4 0q-3.1 2.8 -6.4 0Z" fill="#efe6da"/>' +
        '<circle cx="' + (cx + 0.3 * d) + '" cy="40.3" r="1.75" fill="#493729"/><circle cx="' + (cx + 0.3 * d) + '" cy="40.4" r=".9" fill="#211914"/>' +
        '<circle cx="' + (cx + 0.8 * d) + '" cy="39.8" r=".55" fill="#fff7e8"/>';
    };
    return '<g class="head-detail" transform="translate(9.6 9.28) scale(.84)">' +
      // night: low bun with a white flower pin, ears with pearl studs
      '<g class="h-up">' +
        '<circle cx="43.6" cy="44" r="8" fill="url(#' + h + ')"' + sk(HAIR_LINE, 1.2) + "/>" +
        P("M37.4 41.6Q43.6 37.6 49.4 41.2M37.8 46.6Q43.6 50.4 49.2 46.4", "", HAIR_HI, 0.8) +
        P("M44.4 37.4L52.6 41.6", "", GOLD, 1.1) +
        '<g fill="#f7f3ea"' + sk("#cfc4b0", 0.5) + '><circle cx="40.8" cy="36.6" r="2.2"/><circle cx="44.2" cy="34.8" r="2.2"/><circle cx="43.8" cy="38.8" r="2"/><circle cx="39.4" cy="39.6" r="1.9"/></g>' +
        '<g fill="' + GOLD + '"><circle cx="40.8" cy="36.6" r=".6"/><circle cx="44.2" cy="34.8" r=".6"/></g>' +
        P("M45.8 38.6Q42.6 38 43.2 42.6Q44 46.6 47 46Z", SKIN, INK, 1) + P(mirrorPath("M45.8 38.6Q42.6 38 43.2 42.6Q44 46.6 47 46Z"), SKIN, INK, 1) +
        '<circle cx="45" cy="47.6" r="1" fill="#f5f2ea"' + sk("#b9b2a6", 0.4) + '/><circle cx="75" cy="47.6" r="1" fill="#f5f2ea"' + sk("#b9b2a6", 0.4) + "/>" +
      "</g>" +
      P(face, "url(#" + s + ")", INK, .85) +
      P("M67 31Q73 37 70.6 45Q68.7 51 63.1 54.8L66.5 55Q73 49 73.6 39Q73 32 67 31Z", "#d9b49e", "", 0, ' opacity=".34"') +
      P("M61.5 38.8Q64.2 42.6 62.4 46.9L60.6 47.1Q62.3 43 61.5 38.8Z", "#cd9e88", "", 0, ' opacity=".32"') +
      P("M52.3 45.8Q55.2 46.6 57.5 45.5M63 45.5Q65.5 46.7 68 45.8", "", "#f6e3d0", .65, ' opacity=".7"') +
      P("M70.6 29C74.6 36 73.6 47 65.4 55.4C70.6 53 74 46.6 74.4 37.5C74.4 34.2 73.6 31.4 72.4 29Z", SKIN_SH, "", 0, ' opacity=".35"') +
      '<g opacity=".2" fill="' + BLUSH + '"><ellipse cx="51" cy="46.6" rx="3.4" ry="1.9"/><ellipse cx="69" cy="46.6" rx="3.4" ry="1.9"/></g>' +
      (down
        ? P("M50.4 41.6Q53.6 38.4 56.8 41.6M63.2 41.6Q66.4 38.4 69.6 41.6", "", "#1b1210", 1.3)
        : '<g class="c-eyes">' + eye(53.6, false) + eye(66.4, true) +
            P("M50.2 40.3Q53.4 36.8 57 40.3M63.2 40.3Q66.4 36.8 69.6 40.3M50.2 40.3L49.5 39.6M69.6 40.3L70.3 39.6", "", "#34251f", .85) +
          "</g>" +
          '<g class="c-eyes-shut">' + P("M50.2 40.8Q53.6 43.4 57 40.8M63 40.8Q66.4 43.4 69.8 40.8", "", "#1b1210", 1.3) + "</g>") +
      P("M50 34Q53.4 32.2 57 33.4M63 33.4Q66.6 32.2 70 34", "", "#3a2a24", 1.1) +
      P("M60.3 41.5Q59.3 44.4 59.5 46.4M58.1 46.7Q60.2 47.5 62 46.6", "", "#c79583", 0.65) +
      P("M60.9 42L61.5 45.9", "", "#f9e4d3", .7) +
      '<path class="c-mouth" d="M55.8 49.4Q58 48.8 60 49.2Q62 48.8 64 49.4Q62 51.6 60 51.6Q57.8 51.4 55.8 49.4Z" fill="#bb7e73"' + sk("#945e53", 0.5) + "/>" +
      '<ellipse class="c-mouth-open" cx="60" cy="50.8" rx="2" ry="1.5" fill="#8a3431"/>' +
      // day: side-parted wavy hair framing the face (it stays behind the shoulders)
      '<g class="h-down">' +
        P("M44.8 41C43 26 50.6 16.4 60.8 16.4C71.2 16.4 77.4 25.4 75.4 41C73.8 34.4 70.6 29.4 66 27.2C62.4 30.6 56 33.4 50.4 34.6C48.2 36.4 46.2 38.6 44.8 41Z", "url(#" + h + ")", HAIR_LINE, 1.2) +
        P("M55.4 17.2C50.2 21.4 47.2 28 46.6 36.8C49.8 31.4 54 28 59.6 25.6Z", "url(#" + h + ")", HAIR_LINE, 1) +
        P("M45.8 30C41.6 40 46.8 47 43 55.6C41 61 44.4 65.2 47.6 63.4C49.6 57.4 46.6 51.2 49.2 44.6C50.6 40 48.4 34.6 45.8 30Z", "url(#" + h + ")", HAIR_LINE, 1) +
        P(mirrorPath("M45.8 30C41.6 40 46.8 47 43 55.6C41 61 44.4 65.2 47.6 63.4C49.6 57.4 46.6 51.2 49.2 44.6C50.6 40 48.4 34.6 45.8 30Z"), "url(#" + h + ")", HAIR_LINE, 1) +
        P("M53.4 19.6C60 19 68 22 72 29M50 24C52.4 21 55.8 19 59.4 18.6", "", HAIR_HI, .65, ' opacity=".65"') +
        P(fringe, "", "#988071", .23, ' opacity=".42"') +
        P("M57.2 19.4Q65 21 69.4 27.4M53.8 23.6Q51 26.8 50.2 31.4M46 40Q45 47 46.8 51.6M72.4 38Q74.4 45 71.6 51.4", "", "#857164", .45, ' opacity=".65"') +
      "</g>" +
      // night: hair pulled back smoothly
      '<g class="h-up">' +
        P("M45 40C44 27.4 50.6 17 60.4 16.8C70.4 17 76.6 27.2 75.2 40C73 32.4 68 27.6 60.4 27.4C53 27.6 47.2 32.4 45 40Z", "url(#" + h + ")", HAIR_LINE, 1.2) +
        P("M50.6 23.4C55 20 63 19.4 69 22.2M47.6 30.6C51 25.4 56.4 23 62.4 22.8", "", HAIR_HI, 0.85, ' opacity=".85"') +
      "</g></g>";
  }

  function character(uid) {
    var h = "hjHair" + uid, c = "hjCoat" + uid, g = "hjGlow" + uid, s = "hjSkin" + uid, q = "hjQipao" + uid;
    var leather = "hjShoe" + uid, patent = "hjHeel" + uid, knit = "hjTights" + uid;
    // Curved highlights sit on the vamp; the darker welt gives each shoe a thin sole.
    function footwear(d, x, y, w, height, night) {
      return '<g class="c-footwear">' + P(d, "url(#" + (night ? patent : leather) + ")", night ? "#111015" : "#30271f", .7) +
        P("M" + f1(x + w * .16) + " " + f1(y + height * .38) + "q" + f1(w * .3) + " " + f1(-height * .2) + " " + f1(w * .58) + " " + f1(height * .08), "", night ? "#a59ca6" : "#ac8c68", .38, ' opacity=".65"') +
        P("M" + f1(x + w * .09) + " " + f1(y + height * .78) + "q" + f1(w * .4) + " " + f1(height * .17) + " " + f1(w * .77) + " 0", "", night ? "#2f2a31" : "#201d1a", .7) +
        (!night ? P("M" + f1(x + w * .38) + " " + f1(y + height * .17) + "q" + f1(w * .08) + " " + f1(height * .26) + " " + f1(w * .02) + " " + f1(height * .4), "", "#2a211d", .35) : "") + '</g>';
    }
    function calf(x, night) {
      var d = "M" + x + " " + (night ? 168 : 146) + "h4.6Q" + f1(x + 5.4) + " 173 " + f1(x + 3.9) + " 181L" + f1(x + 4.1) + " 186.6H" + f1(x + .7) + "L" + f1(x + .9) + " 181Q" + f1(x - .4) + " 173 " + x + " " + (night ? 168 : 146) + "Z";
      return P(d, "url(#" + (night ? s : knit) + ")", night ? "#b68e7b" : "#201e25", .55) +
        P("M" + f1(x + 1.5) + " 176Q" + f1(x + 2.1) + " 180 " + f1(x + 1.5) + " 184", "", night ? "#fae6d3" : "#847c87", .4, ' opacity=".55"');
    }
    var hairFibres = "";
    for (var strand = 0; strand < 15; strand++) {
      var hx = 46 - strand * .37, bend = 37.2 + strand * .53;
      var hd = "M" + f1(hx) + " " + f1(39 + strand * .8) + "C" + f1(hx - 5) + " 56 " + f1(bend + 8) + " 67 " + f1(bend + 3) + " 80C" + f1(bend - 3) + " 92 " + f1(bend + 3) + " 101 " + f1(bend) + " " + f1(112 + strand % 5);
      hairFibres += hd + mirrorPath(hd);
    }

    // --- shapes shared by several poses ---
    var SLEEVE_F = "M73.4 66.4C77.8 68.6 80 73.6 80.3 81.6L81.3 112.4C81.5 115.8 79.2 118 76.6 117.9C74.4 117.8 73.4 115.9 73.4 113.3L72.4 85C72 78.6 71 72.6 70.2 68.6Z";
    var ARM_F = "M73.8 66.8C77.6 68.8 79.4 73.6 79.6 81L80.4 112.4C80.6 116 78.8 118.3 76.6 118.1C74.8 118 73.9 116.3 73.9 113.6L73.4 84.6C73 78.4 72 72.6 71.2 68.6Z";
    var HAND_F = "M80.6 116.8C81.2 120.6 79.6 123.4 77.2 123.2C75 123 73.9 120.6 74 117.2Z";
    var UPPER_B = "M46.6 66.4C42.2 68.6 40 73.6 39.7 81.6L39.4 96C39.4 99.6 42 101.8 44.8 101.4C47.2 101 48.4 99 48.4 96.4L48.6 85C49 78.6 49.8 72.6 50.6 68.6Z";
    var handF = P(HAND_F, SKIN, INK, 1.1), handB = P(mirrorPath(HAND_F), SKIN, INK, 1.1);
    var coatBody = "M47.6 65.4C43.8 66.8 42.6 71 42.6 76.4L40.4 152C49.4 155.4 70.6 155.4 79.6 152L77.4 76.4C77.4 71 76.2 66.8 72.4 65.4C67.2 63.6 52.8 63.6 47.6 65.4Z";
    var qipaoBody = "M48.8 64.8C45.6 66 44.6 70 44.8 74.4C45.2 81.4 46.6 88.6 47.6 98C46 105 45 112 45 118C45 138 46.2 158 47.2 176H72.8C73.8 158 75 138 75 118C75 112 74 105 72.4 98C73.4 88.6 74.8 81.4 75.2 74.4C75.4 70 74.4 66 71.2 64.8C67 63.4 53 63.4 48.8 64.8Z";
    var neck = P("M56 55L55.7 67H64.3L64 55Z", SKIN, INK, 1) + P("M55.9 57.4Q60 61.6 64.1 57.4V61Q60 64.6 55.9 61Z", SKIN_SH, "", 0, ' opacity=".7"');
    // a hardcover book held in the right hand: cover, cream page block, spine, title
    function book(col, title) {
      return P("M74.2 109.6H86.2C86.9 109.6 87.4 110.1 87.4 110.8V127C87.4 127.7 86.9 128.2 86.2 128.2H74.2Z", col, INK, 1.1) +
        P("M86.4 110.5H88.6V127.3H86.4", "#f4ecdb", INK, 0.8) + P("M87.2 112.6V125.2M88 112.6V125.2", "", "#cdbfa6", 0.45) +
        P("M76.6 110V127.8", "", "rgba(0,0,0,.28)", 1.1) + P("M78.8 114.2H84.6M78.8 116.8H83.2", "", title, 0.9);
    }
    function sideArms(day, forearmB, forearmF, handBx, handBy, handFx, handFy) {
      var fill = day ? "url(#" + c + ")" : SKIN, line = day ? COAT_LINE : INK;
      return P(UPPER_B, fill, line, 1.3) + forearmB(fill, line) + '<ellipse cx="' + handBx + '" cy="' + handBy + '" rx="3.3" ry="2.8" fill="' + SKIN + '"' + sk(INK, 1.1) + "/>" +
        P(mirrorPath(UPPER_B), fill, line, 1.3) + forearmF(fill, line) + '<ellipse cx="' + handFx + '" cy="' + handFy + '" rx="3.3" ry="2.8" fill="' + SKIN + '"' + sk(INK, 1.1) + "/>" +
        (day ? P("M43 80l3 5 -2 6M77 80l-3 5 2 6M41.7 96l3 2 -1 3M78.3 96l-3 2 1 3M49.8 99.4l-1.8 3M70.2 99.4l1.8 3", "", COAT_LINE, .55, ' opacity=".7"') : "");
    }
    var READ_FORE = "M41.8 95.4C45.2 93.6 51.4 98 55.8 101.6C57.6 103.4 56.6 106.4 54 106.6C49.6 104.8 44 102.4 41.6 100.4C39.6 98.6 40 95.8 41.8 95.4Z";
    function readArms(day) {
      return sideArms(day, function (f, l) { return P(READ_FORE, f, l, 1.3); }, function (f, l) { return P(mirrorPath(READ_FORE), f, l, 1.3); }, 53.4, 105.2, 66.6, 105.2);
    }
    function typeArms(day) {
      var fill = day ? "url(#" + c + ")" : SKIN, line = day ? COAT_LINE : INK;
      var hand = function (x, y) { return '<ellipse cx="' + x + '" cy="' + y + '" rx="3.3" ry="2.8" fill="' + SKIN + '"' + sk(INK, 1.1) + "/>"; };
      return P(UPPER_B, fill, line, 1.3) + P(mirrorPath(UPPER_B), fill, line, 1.3) +
        '<g class="type-hand type-hand-b">' + P("M41.8 95.4C47 96 63 101 74 105C76.6 106.2 76 109.6 73.4 109.8C61 108.2 47 103.6 42.2 101C40 99.4 40 96.4 41.8 95.4Z", fill, line, 1.3) + hand(76.2, 107.8) + "</g>" +
        '<g class="type-hand type-hand-f">' + P("M76.6 95.6C80.8 96.6 87.4 100.8 92.2 104C94.2 105.6 93.4 108.8 90.8 109C85.6 107.8 79.4 105.2 76 102C74.2 100.4 74.6 96.4 76.6 95.6Z", fill, line, 1.3) + hand(93.8, 107.2) +
        (day ? P("M77 98l3 1 -1 3M86.2 102l-1.2 3.8M90.2 104l-1.2 3", "", COAT_LINE, .55) : "") + "</g>";
    }

    return '' +
    '<svg class="hj-char-svg" viewBox="0 0 120 200" aria-hidden="true" focusable="false">' +
    "<defs>" +
      '<radialGradient id="' + h + '" cx=".3" cy=".22" r=".9"><stop stop-color="#4c4039"/><stop offset=".27" stop-color="#2b2421"/><stop offset=".65" stop-color="#181615"/><stop offset="1" stop-color="#0d0d0d"/></radialGradient>' +
      '<linearGradient id="' + c + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b39b79"/><stop offset=".6" stop-color="#c1ad8c"/><stop offset="1" stop-color="#a48d6d"/></linearGradient>' +
      '<radialGradient id="' + s + '" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#f0d7c3"/><stop offset=".75" stop-color="#ecd1ba"/><stop offset="1" stop-color="#dfbda5"/></radialGradient>' +
      '<linearGradient id="' + leather + '" x1="0" y1="0" x2=".3" y2="1"><stop stop-color="#76583f"/><stop offset=".4" stop-color="#4f392d"/><stop offset="1" stop-color="#2e251f"/></linearGradient>' +
      '<linearGradient id="' + patent + '" x1="0" y1="0" x2=".2" y2="1"><stop stop-color="#69606b"/><stop offset=".32" stop-color="#2b2730"/><stop offset="1" stop-color="#0c0c10"/></linearGradient>' +
      '<linearGradient id="' + knit + '" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#242229"/><stop offset=".4" stop-color="#49434e"/><stop offset="1" stop-color="#222027"/></linearGradient>' +
      '<linearGradient id="' + q + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#101014"/><stop offset=".3" stop-color="#2a2830"/><stop offset=".55" stop-color="#18171c"/><stop offset="1" stop-color="#0e0e12"/></linearGradient>' +
      '<radialGradient id="' + g + '" cx=".5" cy=".55" r=".5"><stop offset="0" style="stop-color:var(--c-glow)"/><stop offset="1" style="stop-color:var(--c-glow);stop-opacity:0"/></radialGradient>' +
    "</defs>" +
    '<ellipse class="c-glow" cx="60" cy="118" rx="82" ry="98" fill="url(#' + g + ')"/>' +
    '<g class="c-flip">' +
    '<ellipse class="c-shadow" cx="61" cy="192.4" rx="21" ry="3.4"/>' +

    // ===== standing figure =====
    '<g class="c-root">' +
      '<g class="c-leg c-leg-b">' +
        '<g class="o-day">' + calf(53, false) +
          footwear("M52 185.2H57.8C61 185.2 62.8 186.8 62.8 189.1C62.8 190.7 61.8 191.7 60.3 191.7H53C51.8 191.7 51.3 190.9 51.3 189.7Z", 51.3, 185.2, 11.5, 6.5, false) + "</g>" +
        '<g class="o-night">' + calf(53, true) +
          footwear("M53 185.4Q55 187.4 57.2 185.4Q59.8 185.8 61.8 190Q60 190.8 57.2 190.6L57 191.6H54.2C53.4 191.6 52.9 190.9 53 189.6Z", 53, 185.4, 8.8, 6.2, true) + "</g>" +
      "</g>" +
      '<g class="c-leg c-leg-f">' +
        '<g class="o-day">' + calf(62.4, false) +
          footwear("M62 185.2H67.8C71 185.2 72.8 186.8 72.8 189.1C72.8 190.7 71.8 191.7 70.3 191.7H63C61.8 191.7 61.3 190.9 61.3 189.7Z", 61.3, 185.2, 11.5, 6.5, false) + "</g>" +
        '<g class="o-night">' + calf(62.4, true) +
          footwear("M62.6 185.4Q64.6 187.4 66.8 185.4Q69.4 185.8 71.4 190Q69.6 190.8 66.8 190.6L66.6 191.6H63.8C63 191.6 62.5 190.9 62.6 189.6Z", 62.6, 185.4, 8.8, 6.2, true) + "</g>" +
      "</g>" +
      '<g class="c-upper">' +
        // long wavy hair, behind the body (day)
        '<g class="c-hairback h-down">' +
          P("M49 30C43 41 46 52 39.6 64C34 76 41 86 36.5 98C32 108 37 118 43.6 121C49 123.6 55 119.6 60 121.6C65 119.6 71 123.6 76.4 121C83 118 88 108 83.5 98C79 86 86 76 80.4 64C74 52 78 41 71 30C67 22 53 22 49 30Z", "url(#" + h + ")", HAIR_LINE, 1.25) +
          P("M42.6 66C37.4 76 45.6 85 39.6 96.6C35.6 105 40.6 113 44.6 116.6M77.4 66C82.6 76 74.4 85 80.4 96.6C84.4 105 79.4 113 75.4 116.6", "", HAIR_HI, 1.1, ' opacity=".6"') +
          P("M38.4 108.6C36.6 112.6 39 117.2 43 116.8M81.6 108.6C83.4 112.6 81 117.2 77 116.8", "", HAIR_HI, 1.1, ' opacity=".75"') +
          P("M48 37Q43 49 44 56Q41 66 40.5 70M46 55Q42 69 44 78Q47 89 42 99Q39 108 43 113M74 38Q78 51 76 58Q81 70 78 79Q75 89 80 100Q83 107 78 115M41 79q-1 7 2 13M78 61q5 8 2 16", "", "#78675e", .45, ' opacity=".55"') +
          P(hairFibres, "", "#9b8470", .23, ' opacity=".36"') +
        "</g>" +
        '<g class="c-torso">' +
          '<g class="o-day">' + neck +
            P("M55.2 64.6L60 78L64.8 64.6Z", SHIRT, "#cfc6b8", 0.8) +
            P(coatBody, "url(#" + c + ")", COAT_LINE, 1.4) +
            P("M71.6 70C75 74 76.6 79 76.9 86L79 152C76.6 152.9 74.4 153.4 72.2 153.6L71 100Z", COAT_SH, "", 0, ' opacity=".35"') +
            P("M55.2 64.4L59.8 78.4L54 83.4L50 75.4L48.6 69.2L52 65.4Z", COAT_HI, COAT_LINE, 1.1) +
            P(mirrorPath("M55.2 64.4L59.8 78.4L54 83.4L50 75.4L48.6 69.2L52 65.4Z"), COAT_HI, COAT_LINE, 1.1) +
            P("M46.8 67.4L52.4 68.8M73.2 67.4L67.6 68.8M50 75.4L52.8 74.2M70 75.4L67.2 74.2", "", COAT_LINE, 0.8) +
            P("M60.2 78.4L61.6 153.4", "", COAT_LINE, 0.9, ' opacity=".6"') +
            '<g fill="' + BUTTON + '"' + sk(COAT_LINE, 0.7) + '><circle cx="55" cy="88" r="1.4"/><circle cx="65" cy="88" r="1.4"/><circle cx="55" cy="112" r="1.4"/><circle cx="65" cy="112" r="1.4"/><circle cx="55" cy="126" r="1.4"/><circle cx="65" cy="126" r="1.4"/></g>' +
            P("M41.8 98.6H78.2L78.4 104.2H41.6Z", COAT_SH, COAT_LINE, 1) +
            '<rect x="56.8" y="97.6" width="6.8" height="7.4" rx="1.3" fill="none"' + sk(COAT_LINE, 1.1) + "/>" +
            P("M61.2 104.2L58.8 117.2L61.4 117.8L63.4 104.6Z", COAT_SH, COAT_LINE, 0.9) +
            P("M45.4 121.6L52 119.8M68 119.8L74.6 121.6M43.2 148C51.6 150.4 68.4 150.4 76.8 148", "", COAT_LINE, 0.9, ' opacity=".7"') +
            // Folds follow the belt's tension, the pockets and the weight of the hem.
            P("M44.8 105L49.8 109L46.8 121L45.2 139L43.2 148L46.6 149.1L49.2 128L52 111Z M64 105L67.4 112L69.2 136L74.2 150L76.8 148L72.6 130L71 111Z", COAT_SH, "", 0, ' opacity=".28"') +
            P("M46 80L48.2 90L46.4 96M73.2 82L71.8 92L75 97M44.6 107L48.8 110L47.2 116M72.6 106L68.4 110L70.2 115M50.4 126L48 142M68.2 128L71.6 144M56.6 119L57.4 143", "", COAT_LINE, .65, ' opacity=".68"') +
            P("M47.4 108L50.2 111M70.4 116L72 130M45.6 146L53.2 147.6M64.8 148L73.6 146.8", "", COAT_HI, .7, ' opacity=".75"') +
            P("M48.4 70L51.4 72M50.8 77L54 80M67.8 70L70.6 72M65.8 80L68.6 77", "", COAT_LINE, .4, ' opacity=".65"') +
          "</g>" +
          '<g class="o-night">' + neck +
            P(qipaoBody, "url(#" + q + ")", "#050507", .9) +
            P("M50 75Q55 83 51.6 94Q49 104 52.5 119L53.6 148Q53 129 55 116Q53 102 54.6 92Q56 81 50 75Z M68 114Q64 137 67 166L69 173Q65 147 70 124Z", "#9c909b", "", 0, ' opacity=".18"') +
            P("M51.8 79Q54.1 86 52.6 92M51.1 102Q50.5 109 52.1 115M67.5 130Q66 143 67.1 151", "", "#c4b4bd", .65, ' opacity=".38"') +
            P("M55.4 58.8H64.6V65C62 66.2 58 66.2 55.4 65Z", QIPAO, QIPAO_LINE, 1) +
            P("M55.4 64.6C58 65.8 62 65.8 64.6 64.6M65 68.4H67.2M69.6 70H71.6", "", GOLD, 0.8) +
            P("M60.2 66C63.8 67.8 67.6 69.4 71.8 70.2M72.8 176L72.2 154", "", QIPAO_LINE, 0.9) +
            P("M50 74C49.2 92 51 110 50.2 128C49.6 146 50.6 162 51.4 174", "", "#3a3844", 1.4, ' opacity=".5"') +
            P("M48.6 93L52.4 99L49.8 109M70.2 92L67.6 100L71.6 110M51.6 118L54.2 144M69.6 122L66.2 154M55 173L67 174", "", "#68616b", .7, ' opacity=".55"') +
            bamboo(51, 96, 0.56, -14) + bamboo(68, 170, 0.76, 10) + bamboo(64, 161, 0.5, 30) +
          "</g>" +
        "</g>" +
        // left arm. By day it hugs a book to her chest; by night it carries the lantern.
        '<g class="c-hug o-day">' + P(UPPER_B, "url(#" + c + ")", COAT_LINE, 1.3) +
          '<g transform="rotate(-8 57 89)">' +
            P("M49.4 78.2H63.6C64.3 78.2 64.8 78.7 64.8 79.4V99.6C64.8 100.3 64.3 100.8 63.6 100.8H49.4Z", "#a8352c", INK, 1.1) +
            P("M63.6 79.2H66.2V99.8H63.6", "#f4ecdb", INK, 0.8) + P("M64.5 81.4V97.6M65.4 81.4V97.6", "", "#cdbfa6", 0.45) +
            P("M51.8 78.6V100.4", "", "rgba(0,0,0,.28)", 1.1) + P("M54.2 84H61.6M54.2 86.8H60", "", GOLD, 0.9) +
            P("M57.8 90.6L60 93L57.8 95.4L55.6 93Z", "", GOLD, 0.8) +
            P("M60.6 100.8V105.6L59.6 104.5L58.6 105.6V100.8", GOLD) +
          "</g>" +
          P("M41.8 95C45.4 92.4 53.4 92.6 61.6 91.6C64.6 91.4 65.6 94.8 63.2 96.4C55.4 98.8 47.2 101.6 43.6 101.6C40.6 101.4 39.8 96.6 41.8 95Z", "url(#" + c + ")", COAT_LINE, 1.3) +
          P("M60.2 91.9L61.2 96.8", "", COAT_LINE, 0.9) +
          P("M42.6 96L46.6 97L45.4 99.8M48.8 95L49.8 98.8M53.8 94L55.1 97.1", "", COAT_LINE, .7, ' opacity=".75"') +
          P("M63.4 91.4C66.8 91 68.6 93.4 68 95.6C67.4 97.6 64.8 98.2 62.8 97Z", SKIN, INK, 1.1) +
        "</g>" +
        '<g class="c-arm c-arm-b">' +
          '<g class="o-day arm-free">' + P(mirrorPath(SLEEVE_F), "url(#" + c + ")", COAT_LINE, 1.3) + P("M38.7 109.6L46.7 110.2M40.4 84L43 89L41 94M40 98L44.8 101M40.2 104L44.4 102M39.8 113L45.5 114", "", COAT_LINE, 0.7) + handB + "</g>" +
          '<g class="o-night">' + P(mirrorPath(ARM_F), SKIN, INK, 1.1) +
            '<g class="c-lantern">' +
              P("M42.6 122.4V131", "", "#2a2020", 0.9) +
              '<circle class="c-lantern-glow" cx="42.4" cy="141" r="18" fill="url(#' + g + ')"/>' +
              '<ellipse cx="42.4" cy="141" rx="6.2" ry="7.8" fill="#cf5646"' + sk(INK, 1.1) + "/>" +
              P("M42.4 133.6V148.4M39.2 135C37.7 138.4 37.7 143.6 39.2 147M45.6 135C47.1 138.4 47.1 143.6 45.6 147", "", "#8e2d24", 0.7) +
              '<rect x="39.6" y="131.8" width="5.6" height="2.2" rx=".8" fill="#2a2020"/><rect x="39.6" y="148.2" width="5.6" height="2.2" rx=".8" fill="#2a2020"/>' +
              P("M42.4 150.4V157.4", "", "#cf5646", 1.2) +
            "</g>" + handB + "</g>" +
        "</g>" +
        // right arm: always free for waving, pointing, posting a letter, reaching
        '<g class="c-arm c-arm-f">' +
          '<g class="o-day">' + P(SLEEVE_F, "url(#" + c + ")", COAT_LINE, 1.1) + P("M81.3 109.6L73.3 110.2M78.4 84L75.8 89L77.8 94M79 98L74.8 101M79.8 104L75.6 102M80 113L74.5 114", "", COAT_LINE, 0.7) + handF + "</g>" +
          '<g class="o-night">' + P(ARM_F, SKIN, INK, 1.1) + handF + "</g>" +
          '<g class="p-book">' + book("#3f6b5f", "#dbe6de") + handF + "</g>" +
          '<g class="p-letter">' + P("M70.8 112.4H87.4V124H70.8Z", "#fbf7ee", INK, 1) + P("M71.4 113L79.1 119L86.8 113", "", INK, 0.9) +
            '<circle cx="79.1" cy="119.2" r="1.8" fill="#b8322a"/>' + handF + "</g>" +
        "</g>" +
        // arms bent to hold an open book (Research)
        '<g class="c-arms-read">' +
          '<g class="o-day">' + readArms(true) + "</g>" + '<g class="o-night">' + readArms(false) + "</g>" +
          P("M48.6 94.8Q54.2 91.6 60 95.2V106Q54.2 103 48.6 105.4Z", "#fbf7ee", INK, 1) + P(mirrorPath("M48.6 94.8Q54.2 91.6 60 95.2V106Q54.2 103 48.6 105.4Z"), "#fbf7ee", INK, 1) +
          P("M47.8 95.4V106.2Q54 103.4 60 107Q66 103.4 72.2 106.2V95.4", "", "#3f6b5f", 1.6) +
          P("M51 97.8Q54.4 96.4 57.8 98M51 100.4Q54.4 99 57.8 100.6M62.2 98Q65.6 96.4 69 97.8M62.2 100.6Q65.6 99 69 100.4", "", "#a39a8b", 0.7) +
          '<path class="page-flip" d="M60 95.2Q64.2 92.6 69 94.6V104.8Q64.2 102.6 60 105.6Z" fill="#fffdf7"' + sk(INK, 0.8) + "/>" +
          '<ellipse cx="52.8" cy="105.6" rx="3.2" ry="2.7" fill="' + SKIN + '"' + sk(INK, 1.1) + '/><ellipse cx="67.2" cy="105.6" rx="3.2" ry="2.7" fill="' + SKIN + '"' + sk(INK, 1.1) + "/>" +
        "</g>" +
        // arms reaching forward to the keys (Tutorials)
        '<g class="c-arms-type"><g class="o-day">' + typeArms(true) + '</g><g class="o-night">' + typeArms(false) + "</g></g>" +
        '<g class="c-head">' + head(h, s, "front") + "</g>" +
      "</g>" +
    "</g>" +

    // ===== graduation cap, tossed at the Education milestones =====
    '<g class="p-cap"><g class="p-cap-in">' +
      P("M50.6 18.4V23.6Q60 27.4 69.4 23.6V18.4Z", "#26232c", INK, .8) +
      P("M51.5 22Q59 25.5 68.5 22.5", "", "#625961", .5) +
      P("M42.6 17.4L60 11L77.4 17.4L60 24Z", "#302d37", INK, .8) +
      surface("M42.6 17.4L60 11L77.4 17.4L60 24Z", "silk") +
      P("M43 17.5L60 24V25.5L43 18.9Z", "#131217") +
      P("M44.6 17L60 11.8L74.8 17", "", "#84777c", .55, ' opacity=".7"') +
      '<g class="cap-tassel">' + P("M60 17.4L72.2 20.8V27.6", "", GOLD, .85) +
      '<circle cx="60" cy="17.4" r="1.3" fill="' + GOLD + '"/>' + P("M71.1 27.4H73.3L74 31.2H70.4Z", GOLD) +
      P("M71 28v4M72 28v4M73 28v4", "", GOLD_2, .35) + '</g>' +
    "</g></g>" +

    // ===== seen from behind, kneeling on the cushion at the writing desk =====
    '<g class="c-back">' +
      '<g class="o-day">' +
        P("M44 112C40.4 128 36.6 162 32 191Q60 196 88 191C83.4 162 79.6 128 76 112C70.8 108.4 49.2 108.4 44 112Z", "url(#" + c + ")", COAT_LINE, 1.4) +
        P("M60 150V192", "", COAT_LINE, 0.9, ' opacity=".55"') +
        P("M43 146L48 160L40 187M77 146L72 162L81 187M48 168L55 185M71 171L65 189", "", COAT_LINE, .75, ' opacity=".65"') +
        P("M43 151L46 164L42 188L38 189Z M73 158L80 186L77 188L70 168Z", COAT_SH, "", 0, ' opacity=".25"') +
        P("M40 140H80L80.6 145.6H39.4Z", COAT_SH, COAT_LINE, 1) +
        '<rect x="55.6" y="138.6" width="8.8" height="8.2" rx="1.5" fill="' + COAT_SH + '"' + sk(COAT_LINE, 1) + "/>" +
        footwear("M46 190.5Q51 186.6 56 190.5Q51 194.6 46 190.5Z", 46, 188.5, 10, 4, false) + footwear("M64 190.5Q69 186.6 74 190.5Q69 194.6 64 190.5Z", 64, 188.5, 10, 4, false) +
        P("M44 114C38.4 118 36.6 127 39 134.4C41.6 137.2 45.4 134.4 46.6 128.8Z", COAT_SH, COAT_LINE, 1.3) +
        '<g class="cb-arm">' + P("M76 114C81.6 118 83.4 127 81 134.4C78.4 137.2 74.6 134.4 73.4 128.8Z", "url(#" + c + ")", COAT_LINE, 1.3) + "</g>" +
        P("M43 88C39 100 44 110 39.4 122C35.4 132 41.4 142 38 152C36.6 158 42 161 46 158C49.6 161 56 158 60 160C64 158 70.4 161 74 158C78 161 83.4 158 82 152C78.6 142 84.6 132 80.6 122C76 110 81 100 77 88C77 72 70 62 60 62C50 62 43 72 43 88Z", "url(#" + h + ")", HAIR_LINE, 1.4) +
        P("M48.4 78C45.4 90 50 102 46.4 114C43.4 126 48 138 45 148M60 66C58.4 86 61.6 106 59.2 124C57.6 138 60.8 148 59.4 156M71.6 78C74.6 90 70 102 73.6 114C76.6 126 72 138 75 148", "", HAIR_HI, 1.1, ' opacity=".55"') +
      "</g>" +
      '<g class="o-night">' +
        P("M45.6 112C42.6 128 38.6 162 34 191Q60 196 86 191C81.4 162 77.4 128 74.4 112C69.6 108.8 50.4 108.8 45.6 112Z", "url(#" + q + ")", "#050507", 1.4) +
        bamboo(51, 182, 0.9, -12) + bamboo(70, 152, 0.7, 20) +
        footwear("M47 190.5Q51.6 186.8 56.2 190.5Q51.6 194.2 47 190.5Z", 47, 188.7, 9.2, 3.8, true) + footwear("M63.8 190.5Q68.4 186.8 73 190.5Q68.4 194.2 63.8 190.5Z", 63.8, 188.7, 9.2, 3.8, true) +
        P("M45.6 114C40.4 118 38.4 126.4 40.6 133.4C43.2 136.2 46.6 133.4 47.8 128.2Z", SKIN, INK, 1.1) +
        '<g class="cb-arm">' + P("M74.4 114C79.6 118 81.6 126.4 79.4 133.4C76.8 136.2 73.4 133.4 72.2 128.2Z", SKIN, INK, 1.1) + "</g>" +
        P("M54.6 92H65.4V110H54.6Z", SKIN, INK, 1) +
        P("M52.4 106.6C56.8 105 63.2 105 67.6 106.6V111.6C63.2 113 56.8 113 52.4 111.6Z", QIPAO, QIPAO_LINE, 1) +
        P("M44.2 80.6Q40.6 81.6 42 86.8Q43.6 89.4 45.4 87.2Z", SKIN, INK, 1) + P(mirrorPath("M44.2 80.6Q40.6 81.6 42 86.8Q43.6 89.4 45.4 87.2Z"), SKIN, INK, 1) +
        P("M43.4 82C43.4 68 50.6 60 60 60C69.4 60 76.6 68 76.6 82C76.6 94 69.6 101 60 101C50.4 101 43.4 94 43.4 82Z", "url(#" + h + ")", HAIR_LINE, 1.3) +
        P("M50 66Q60 71 70 66M46.4 74Q60 83 73.6 74", "", HAIR_HI, 0.9, ' opacity=".8"') +
        '<circle cx="60" cy="96" r="8.4" fill="url(#' + h + ')"' + sk(HAIR_LINE, 1.2) + "/>" +
        P("M54.4 93Q60 89 65.6 93M54.4 99Q60 103 65.6 99", "", HAIR_HI, 0.8) +
        '<g fill="#f7f3ea"' + sk("#cfc4b0", 0.5) + '><circle cx="67.6" cy="89" r="2.2"/><circle cx="71" cy="91.2" r="2.1"/><circle cx="67.2" cy="93" r="2"/><circle cx="70.6" cy="87.2" r="1.8"/></g>' +
        '<g fill="' + GOLD + '"><circle cx="67.6" cy="89" r=".6"/><circle cx="71" cy="91.2" r=".6"/></g>' +
      "</g>" +
    "</g>" +

    // ===== crouching to pet XiaoHei (faces right) =====
    '<g class="c-crouch">' +
      '<g class="o-day">' +
        P("M52 72C46 84 49 98 44.6 110C41 120 45.4 128 52 129C57 130 61 126 64 128C67 124 69.4 116 67.4 106C65.4 94 69.4 84 67.4 76C63.4 66 55 64 52 72Z", "url(#" + h + ")", HAIR_LINE, 1.3) +
        footwear("M40 186.6H47.4C49.8 186.6 50.8 188.4 50.4 190.2C50.2 191.2 49.4 191.8 48.2 191.8H40.6C39.4 191.8 38.8 190.8 39 189.6Z", 39, 186.6, 11.4, 5.2, false) +
        footwear("M78.6 185H85C88.2 185 90 186.6 90 189C90 190.6 89 191.6 87.5 191.6H79.4C78.2 191.6 77.8 190.8 77.8 189.6Z", 77.8, 185, 12.2, 6.6, false) +
        P("M60.4 101L60.1 112.4H67.3L67 101Z", SKIN, INK, 1) +
        P("M53 110.6C49.4 112.4 48.2 116 48.2 120.6L46.4 154C44.6 166 41 178 37.4 190C51.6 193.8 78.4 193.8 92 190C88.6 180.4 84 171.2 78.8 163L77.6 120.6C77.6 116 76.2 112.4 72.6 110.6C68 109.2 57.6 109.2 53 110.6Z", "url(#" + c + ")", COAT_LINE, 1.4) +
        P("M58 109.6L63 121L68 109.6Z", SHIRT, "#cfc6b8", 0.8) +
        P("M58 109.4L62.8 121.4L57.4 126L53.8 119.2L52.6 113.4L55.4 110.6Z", COAT_HI, COAT_LINE, 1) +
        P("M68 109.4L63.2 121.4L68.6 126L72.2 119.2L73.4 113.4L70.6 110.6Z", COAT_HI, COAT_LINE, 1) +
        P("M47.8 138.6H78L78.4 143.8H47.4Z", COAT_SH, COAT_LINE, 1) +
        '<rect x="59.8" y="137.6" width="6.4" height="7" rx="1.2" fill="none"' + sk(COAT_LINE, 1) + "/>" +
        P("M49 146L58 158L46 184M77 147L73 160L86 185M58 156L63 163L55 181M66 170L70 188", "", COAT_LINE, .75, ' opacity=".65"') +
        P("M48 146L52 160L41 188L46 190L57 160Z M75 159L87 187L83 188L72 166Z", COAT_SH, "", 0, ' opacity=".28"') +
        P("M52.2 113.4C47.2 117.6 47 128.4 51.8 139.2C56 148.2 63.6 155.4 71.4 158.6C74.6 159.6 76.4 156.8 75 154.4C68.2 149.2 61.4 141.2 58.6 131.6C57 124.8 57.2 117.6 56.2 114.4Z", "url(#" + c + ")", COAT_LINE, 1.3) +
        '<ellipse cx="74.4" cy="157.4" rx="3.3" ry="2.7" fill="' + SKIN + '"' + sk(INK, 1.1) + "/>" +
        '<g class="cr-arm">' + P("M71.6 112C77.6 114.8 85 124.8 92.6 136.2C96.2 141.4 100.4 144.8 102.8 147.2C104.6 149.6 102.4 152.4 99.8 151.1C94.8 148 89.4 143 85.2 137.6C79.8 130.4 73.8 122.4 69.4 117.4Z", "url(#" + c + ")", COAT_LINE, 1.3) +
          P("M99.8 144.8C103.6 145 106.4 147.4 106 150C105.6 152.2 102.6 152.9 100 151.8Z", SKIN, INK, 1.1) + "</g>" +
      "</g>" +
      '<g class="o-night">' +
        footwear("M40.4 187.4H47.2C49.4 187.8 50.6 189 50.6 190.6L47 190.8L46.4 191.8H41C39.6 191.8 39.2 190.6 39.6 189.6Z", 39.6, 187.4, 11, 4.4, true) +
        footwear("M78.2 185.8H84.8C87.4 186.2 89.2 187.8 89.4 190.4L85.8 190.6L85.2 189L84.6 191.8H79.2C78.4 191.8 77.9 191.1 78 189.8Z", 78, 185.8, 11.4, 6, true) +
        P("M60.4 101L60.1 112.4H67.3L67 101Z", SKIN, INK, 1) +
        P("M54.6 110.6C51.4 112 50.6 115.6 51 120C51.6 126.6 53 132 54 138C50.6 150 43.4 174 38.6 190C53 193.6 79 193.6 92 190C88 180.4 83.4 171.2 78.4 163L74 138C75 132 76.4 126.6 77 120C77.4 115.6 76.6 112 73.4 110.6C69 109.2 59 109.2 54.6 110.6Z", "url(#" + q + ")", "#050507", 1.4) +
        bamboo(55, 134, 0.56, -12) + bamboo(76, 186, 0.76, 8) +
        P("M58.8 104.6H68.2V111C65.2 112.2 61.8 112.2 58.8 111Z", QIPAO, QIPAO_LINE, 1) +
        P("M53.6 113.4C49 117.8 49.2 128.4 54 138.8C58 147.8 65 155 72.4 158.4C75.6 159.4 77.4 156.6 76 154.2C69.4 149 63 141 60.4 131.6C58.8 124.8 59 117.8 58 114.6Z", SKIN, INK, 1.1) +
        '<ellipse cx="74.8" cy="157.4" rx="3.2" ry="2.6" fill="' + SKIN + '"' + sk(INK, 1.1) + "/>" +
        '<g class="cr-arm">' + P("M72.2 112.6C78 115.4 85 125.2 92.4 136.4C96 141.6 100.2 145 102.6 147.4C104.4 149.8 102.2 152.6 99.6 151.3C94.6 148.2 89.4 143.2 85.2 137.8C80 130.8 74.2 123 70 118Z", SKIN, INK, 1.1) +
          P("M99.8 144.8C103.6 145 106.4 147.4 106 150C105.6 152.2 102.6 152.9 100 151.8Z", SKIN, INK, 1.1) + "</g>" +
        // the lantern, set down beside her
        '<circle cx="28" cy="180" r="15" fill="url(#' + g + ')"/>' + '<ellipse cx="28" cy="182" rx="5.6" ry="7" fill="#cf5646"' + sk(INK, 1) + "/>" +
        '<rect x="25.4" y="174" width="5.2" height="2" rx=".7" fill="#2a2020"/><rect x="25.4" y="188.4" width="5.2" height="2" rx=".7" fill="#2a2020"/>' +
      "</g>" +
      // her head, lowered toward the cat, eyes smiling
      '<g transform="translate(4 46) rotate(8 60 58)">' + head(h, s, "down") + "</g>" +
    "</g>" +

    "</g></svg>";
  }

  // Just the face, for the guide's portrait.
  function portrait(uid) {
    return character(uid).replace('viewBox="0 0 120 200"', 'viewBox="34 12 52 52"');
  }

  // ------------------------------------------------------------------
  // JinBingBing: a golden shaded British Longhair, drawn from img-6573 / img-7121.
  // Soft gray-tipped gold, broad furry cheeks, a cream ruff and gray-green eyes.
  // ------------------------------------------------------------------
  var G_LINE = "#675b4b", G_TIP = "#938675", G_CREAM = "#eee4d0", G_PINK = "#c49f96";

  // A resting paw has soft knuckles and tucked toes, rather than a perfect ellipse.
  function catPaw(x, y, width, height, fill, line, shade, cls) {
    return '<g class="cat-paw ' + (cls || '') + '" transform="translate(' + x + ' ' + y + ') scale(' + f1(width / 10) + ' ' + f1(height / 6) + ')">' +
      P("M-5 .1Q-5.2 -2.4 -2.8 -2.6Q-1.4 -3.4 0 -2.8Q2 -3.2 3 -1.9Q5 -1.8 5.1 .5Q5.2 2.9 1.9 3H-2Q-4.8 2.8 -5 .1Z", fill, line, .7) +
      P("M-4.8 1.3Q0 2.8 4.9 1.1Q4.6 3.1 1.9 3H-2Q-4.4 2.9 -4.8 1.3Z", shade, "", 0, ' opacity=".25"') +
      P("M-2 -.2q-.6 .9 -.4 1.8M.7 -.3q.7 .9 .5 1.8", "", shade, .38, ' opacity=".8"') +
      P("M-3.2 -1.6l-.2 .7M-1.7 -2l.1 .6M.1 -2.1l.1 .7M1.8 -1.8l.2 .6M3.2 -1l.1 .7", "", shade, .25, ' opacity=".45"') + '</g>';
  }

  // Fine undercoat strokes follow a patch's growth direction, with varied lengths and spacing.
  function furPatch(cx, cy, rx, ry, seed, lean, color, count) {
    var r = rng(seed), d = "", light = "";
    for (var i = 0; i < (count || 40); i++) {
      var a = r() * Math.PI * 2, radius = Math.sqrt(r()) * .82;
      var x = cx + Math.cos(a) * rx * radius, y = cy + Math.sin(a) * ry * radius;
      var len = 1.3 + r() * 3.4, bend = lean + Math.cos(a) * .7;
      d += "M" + f1(x) + " " + f1(y) + "q" + f1(bend * .4) + " " + f1(len * .5) + " " + f1(bend) + " " + f1(len);
      if (i % 2 === 0) light += "M" + f1(x - .35) + " " + f1(y - .4) + "q" + f1(bend * .45) + " " + f1(len * .45) + " " + f1(bend) + " " + f1(len * .9);
    }
    return '<g class="fur-fibres">' + P(d, "", color || G_TIP, .3, ' opacity=".55"') + P(light, "", "#f6ebd0", .23, ' opacity=".65"') + '</g>';
  }

  function kittyHead(cx, cy, uid) {
    function p(x, y) { return (cx + x) + " " + (cy + y); }
    return '<g class="cat-head">' +
      '<path d="M' + p(-17, -9) + "Q" + p(-19, -17) + " " + p(-16.5, -25) + "Q" + p(-15.9, -25.8) + " " + p(-15.2, -24.9) + "L" + p(-7, -15) + "L" + p(-7, -13) + 'Z" fill="url(#kG' + uid + ')" stroke="' + G_LINE + '" stroke-width="1" stroke-linejoin="round"/>' +
      '<path d="M' + p(8, -15) + "L" + p(16.2, -25) + "Q" + p(17, -25.8) + " " + p(17.6, -24.8) + "Q" + p(20, -16) + " " + p(16.5, -8) + 'Z" fill="url(#kG' + uid + ')" stroke="' + G_LINE + '" stroke-width="1" stroke-linejoin="round"/>' +
      '<path d="M' + p(-15, -12) + "L" + p(-15.5, -21.8) + "L" + p(-9, -14) + "ZM" + p(11, -14) + "L" + p(16.5, -21.8) + "L" + p(16, -11) + 'Z" fill="' + G_PINK + '"/>' +
      P("M" + p(-15.2, -17) + "l3 4M" + p(-14.8, -19) + "l2 4M" + p(16, -18) + "l-2 4M" + p(16.2, -20) + "l-1.8 4", "", "#f4e6cf", .45) +
      '<path d="M' + p(-19, -7) + "Q" + p(-17, -17) + " " + p(-7, -17) + "L" + p(-4, -19) + "L" + p(-3, -17) + "Q" + p(7, -19) + " " + p(17, -11) + "Q" + p(20, -6) + " " + p(21, -1) + "L" + p(24, 3) + "L" + p(21, 4) + "L" + p(24, 9) + "L" + p(20, 8) + "Q" + p(18, 16) + " " + p(10, 18) + "L" + p(7, 21) + "L" + p(5, 18) + "Q" + p(-5, 20) + " " + p(-12, 15) + "L" + p(-17, 16) + "L" + p(-16, 12) + "L" + p(-23, 10) + "L" + p(-20, 7) + "L" + p(-24, 4) + "L" + p(-21, 1) + "Q" + p(-21, -4) + " " + p(-19, -7) + 'Z" fill="url(#kG' + uid + ')" stroke="' + G_LINE + '" stroke-width="1.2"/>' +
      '<path d="M' + p(-8, -15) + "Q" + p(-5, -9) + " " + p(-4, -6) + "M" + p(-1, -16) + "Q" + p(0, -9) + " " + p(2, -6) + "M" + p(4, -16) + "Q" + p(5, -11) + " " + p(8, -9) + '" stroke="' + G_TIP + '" stroke-width="1" fill="none" opacity=".7"/>' +
      '<path d="M' + p(-9, 5) + "Q" + p(-6, 1) + " " + p(3.5, 4) + "Q" + p(12, 1) + " " + p(16, 7) + "Q" + p(14, 15) + " " + p(4, 16) + "L" + p(1, 19) + "L" + p(0, 16) + "Q" + p(-8, 14) + " " + p(-9, 5) + 'Z" fill="' + G_CREAM + '"/>' +
      '<path d="M' + p(-16, -4) + "q-2 5 -5 8M" + p(-14, 2) + "q-3 5 -5 7M" + p(-11, 6) + "q-2 5 -5 7M" + p(17, -3) + "q2 4 4 6M" + p(17, 4) + "q1 4 4 6M" + p(13, 9) + 'q-1 4 -4 6" fill="none" stroke="' + G_TIP + '" stroke-width=".65" opacity=".7"/>' +
      furPatch(cx - 13, cy + 5, 7, 9, 83, -2, G_TIP, 32) + furPatch(cx + 17, cy + 6, 5, 8, 91, 2, G_TIP, 26) +
      furPatch(cx + 1, cy - 13, 11, 3, 72, .3, "#786f62", 35) +
      furPatch(cx + 4, cy + 13, 9, 3, 21, .2, "#c7bba4", 20) +
      '<g class="cat-eyes">' +
        '<ellipse cx="' + (cx - 4.5) + '" cy="' + (cy - 1) + '" rx="4.5" ry="3.9" fill="#91a58d" stroke="#393c33" stroke-width=".9"/><ellipse cx="' + (cx - 4.1) + '" cy="' + (cy - .7) + '" rx="1.4" ry="3.2" fill="#1c2925"/>' +
        '<ellipse cx="' + (cx + 10) + '" cy="' + (cy - 1.5) + '" rx="4.4" ry="3.8" fill="#91a58d" stroke="#393c33" stroke-width=".9"/><ellipse cx="' + (cx + 10.4) + '" cy="' + (cy - 1.2) + '" rx="1.3" ry="3.1" fill="#1c2925"/>' +
        '<path d="M' + p(-9, -2.5) + "q4 -6 9 -1M" + p(5.5, -3) + 'q4 -6 9 -.8" fill="none" stroke="#39362d" stroke-width="1.4"/>' +
        '<circle cx="' + (cx - 5.5) + '" cy="' + (cy - 2.7) + '" r=".9" fill="#fff9e8"/><circle cx="' + (cx + 9) + '" cy="' + (cy - 3.2) + '" r=".9" fill="#fff9e8"/>' +
      "</g>" +
      '<path d="M' + p(.7, 4) + "Q" + p(3.5, 3.3) + " " + p(6.3, 4) + "L" + p(3.5, 7) + 'Z" fill="#a9746c" stroke="#684c42" stroke-width=".7"/>' +
      '<path d="M' + p(3.5, 6) + "C" + p(3.5, 8.2) + " " + p(1.1, 8.7) + " " + p(0.1, 7.3) + "M" + p(3.5, 6) + "C" + p(3.5, 8.2) + " " + p(5.9, 8.7) + " " + p(6.9, 7.3) + '" stroke="#7a4a3a" stroke-width="1" fill="none" stroke-linecap="round"/>' +
      '<path d="M' + p(-4, 8) + "q-9 -2 -19 -1M" + p(-4, 10) + "q-10 0 -21 5M" + p(-3, 12) + "q-8 3 -15 9M" + p(11, 7) + "q9 -3 19 -2M" + p(12, 10) + "q10 0 19 4M" + p(11, 12) + 'q8 3 14 7" fill="none" stroke="#f4ead6" stroke-width=".65"/>' +
      "</g>";
  }

  // A separate three-quarter profile makes turning and walking read as a living cat.
  function kittyProfile(uid) {
    return '<g class="cat-head">' +
      P("M53 21L52 7Q52 5.5 53.4 6.5L62 17L70 17Q76 17 80 23L84 31L89 34Q91 37 87 40L81 41Q78 49 69 50L62 53L59 48L52 46L54 42Q48 35 53 21Z", "url(#kG" + uid + ")", G_LINE, 1.1) +
      P("M54 10L59 18L54 18Z", G_PINK) + P("M54 13l2 4M55 11l2 5", "", G_CREAM, .4) +
      P("M74 32Q81 30 85 35L89 36L86 41L79 43L73 42Z", G_CREAM) +
      '<g class="cat-eyes"><path d="M67 29Q72 24 77 29Q73 34 68 33Z" fill="#8a9e8b" stroke="#474539" stroke-width=".9"/><ellipse cx="73" cy="29" rx="1.5" ry="3.1" fill="#24302a"/><circle cx="71.8" cy="27.8" r=".7" fill="#fff8e8"/></g>' +
      P("M87 34l3 1 -2 3 -2 -1Z", "#ad8274", G_LINE, .6) +
      P("M86 39q-3 2 -6 1M82 39q7 -3 14 -2M82 41q8 0 13 3M79 43q6 3 11 7", "", "#f1e7d4", .45) +
      furPatch(58, 35, 7, 11, 82, -1.3, G_TIP, 36) + furPatch(65, 22, 9, 3, 37, .4, "#7e7566", 22) +
      P("M52 21l-2 -2M51 26l-2 -1M51 41l-3 1M57 47l-3 2", "", G_TIP, .35) +
      '</g>';
  }

  function cat(uid) {
    uid = uid || "c";
    return '<svg class="hj-cat-svg" viewBox="0 0 90 72" aria-hidden="true" focusable="false">' +
      "<defs>" +
        '<linearGradient id="kG' + uid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b1a28b"/><stop offset=".6" stop-color="#d5c4a6"/><stop offset="1" stop-color="#e9ddc6"/></linearGradient>' +
        '<radialGradient id="kB' + uid + '" cx=".32" cy=".3" r=".9"><stop stop-color="#e7d6b3"/><stop offset=".5" stop-color="#cdb68e"/><stop offset="1" stop-color="#8f8675"/></radialGradient>' +
      "</defs>" +
      '<ellipse class="cat-shadow" cx="45" cy="69.5" rx="25" ry="2.8"/>' +
      '<g class="cat-flip">' +
      // sitting pose
      '<g class="cat-sit">' +
        '<g class="cat-tail-sit"><path d="M32 68C17 71 5 65 7 55Q9 46 15 44L19 43L17 47Q22 49 19 54Q13 60 22 62L30 62Z" fill="url(#kB' + uid + ')" stroke="' + G_LINE + '" stroke-width="1.1"/>' +
          '<path d="M11 52q-3 8 6 12M14 50q-2 6 1 8M19 64l6 1M10 59l3 2" fill="none" stroke="' + G_TIP + '" stroke-width=".75"/></g>' +
        '<path d="M29 68Q18 65 22 49L20 46L24 43Q25 31 34 28L37 24L42 27Q51 24 58 31L63 33L61 37Q65 45 64 51L67 55L64 56Q66 63 59 68L53 70L48 68L42 70L38 68L33 70Z" fill="url(#kB' + uid + ')" stroke="' + G_LINE + '" stroke-width=".9"/>' +
        '<path d="M42 34C53 36 57 55 50 67L35 67C30 52 32 38 42 34Z" fill="' + G_CREAM + '"/>' +
        '<path d="M28 49q-2 5 0 9M31 48q-1 6 1 10M57 49q3 4 2 10M53 53q2 5 1 9M35 58q-1 4 1 6M47 56q2 5 0 8" fill="none" stroke="' + G_TIP + '" stroke-width=".65" opacity=".7"/>' +
        furPatch(30, 55, 7, 10, 89, -1.1, G_TIP, 38) + furPatch(55, 56, 7, 10, 104, 1.4, G_TIP, 38) +
        catPaw(39, 67, 10.8, 6.4, G_CREAM, G_LINE, G_TIP) + catPaw(50, 67, 10.8, 6.4, G_CREAM, G_LINE, G_TIP) +
        '<path class="cat-ruff" d="M34 25Q46 24 58 27L61 33L58 32L61 39L57 37Q57 43 52 43L49 48L46 45L42 48L40 43Q33 44 32 37L29 39L31 33L28 34Z" fill="' + G_CREAM + '"/>' +
        furPatch(46, 42, 13, 10, 72, .4, "#bbac94", 60) +
        '<g transform="translate(14.1 5.4) scale(.7)">' + kittyHead(47, 18, uid) + '</g>' +
      "</g>" +
      // walking (trotting) pose
      '<g class="cat-walk">' +
        '<g class="cat-tail-walk"><path d="M27 49Q8 47 7 31L5 28L8 27Q7 18 14 16L17 15L17 18Q22 20 19 27Q13 35 27 39Z" fill="url(#kB' + uid + ')" stroke="' + G_LINE + '" stroke-width="1.1"/>' +
          '<path d="M12 23q-4 9 3 17M15 21q-3 6 -2 10M12 36l5 5M18 43l5 1" fill="none" stroke="' + G_TIP + '" stroke-width=".7"/></g>' +
        '<g class="cat-legs-b"><path d="M29 58V66M37 59V66" stroke="#d4bc98" stroke-width="5.4" stroke-linecap="round"/>' + catPaw(29, 67, 6.6, 4.5, G_CREAM, G_LINE, G_TIP) + catPaw(37, 67, 6.6, 4.5, G_CREAM, G_LINE, G_TIP) + '</g>' +
        '<g class="cat-legs-f"><path d="M51 59V66M58 58V66" stroke="#dcc6a4" stroke-width="5.4" stroke-linecap="round"/>' + catPaw(51, 67, 6.6, 4.5, G_CREAM, G_LINE, G_TIP) + catPaw(58, 67, 6.6, 4.5, G_CREAM, G_LINE, G_TIP) + '</g>' +
        '<path d="M21 52Q17 44 31 39L35 37L37 39Q48 36 58 41Q66 44 64 53L67 55L63 57Q59 63 52 62L48 65L46 62L38 64L36 62Q23 62 21 52Z" fill="url(#kB' + uid + ')" stroke="' + G_LINE + '" stroke-width="1.2"/>' +
        '<path d="M25 44q-1 6 3 11M30 43q0 7 4 12M38 41q0 6 4 10M46 41q1 5 5 8M29 56l5 4M39 57l5 4" fill="none" stroke="' + G_TIP + '" stroke-width=".7" opacity=".65"/>' +
        '<path d="M30 58C38 61.5 50 61.5 58 57.5C55 60.5 37 61.8 30 58Z" fill="' + G_CREAM + '"/>' +
        furPatch(40, 50, 17, 8, 116, 1.7, G_TIP, 60) +
        '<g transform="translate(16.25 9.5) scale(.75)">' + kittyProfile(uid) + '</g>' +
        '<path class="cat-ruff" d="M47 40Q50 45 54 44L52 50L57 48Q56 53 61 54L65 58L69 53Q75 55 77 49L82 50L79 44L84 42Q77 48 69 49Q56 50 47 40Z" fill="' + G_CREAM + '" stroke="' + G_LINE + '" stroke-width=".65"/>' +
        '<path d="M55 44l5 7M63 49l2 6M73 47l-4 5" fill="none" stroke="' + G_TIP + '" stroke-width=".5" opacity=".65"/>' +
      "</g>" +
      "</g></svg>";
  }

  // XiaoHei, from img-0668: charcoal tuxedo, white bib and socks, olive eyes.
  // His head stays to the left so the original petting pose still meets his forehead.
  function sleepingCat(x, y) {
    var G1 = "#414643", G2 = "#656961", GL = "#292e2a", CR = "#e7e4d7", PK = "#aa8982";
    var line = function (w) { return ' stroke="' + GL + '" stroke-width="' + w + '" stroke-linejoin="round" stroke-linecap="round"'; };
    var tail = "M30 -3C45 -1 43 11 25 11C9 11 -7 9 -15 7";
    return '<g class="sleep-cat" transform="translate(' + x + " " + y + ')">' +
      '<g class="sc-tail"><path d="' + tail + '" fill="none"' + line(9.4) + "/>" +
        '<path d="' + tail + '" fill="none" stroke="' + G1 + '" stroke-width="6.6" stroke-linecap="round"/>' +
        '<path d="M36.5 1.5Q34 3.5 36.5 6M29 8.5Q27 10.5 29.5 12M18 9Q16.5 11 18.5 12.6" fill="none" stroke="' + G2 + '" stroke-width=".5" stroke-linecap="round"/></g>' +
      '<path class="sc-body" d="M-16 2C-20 -16 -6 -30 12 -30C30 -30 40 -18 37 -2C36 4 30 6 22 6H-8C-13 6 -15.4 5 -16 2Z" fill="' + G1 + '"' + line(1.5) + "/>" +
      furPatch(12, -16, 22, 13, 49, 1.2, G2, 70) +
      '<path d="M-12 -19Q-5 -21 2 -13Q5 -3 -1 4L-8 6L-11 3Q-16 -3 -12 -19Z" fill="' + CR + '"/>' +
      catPaw(-5, 4.2, 12.4, 6.8, CR, GL, "#aaa99e", "sc-rest-paw") + catPaw(5.6, 4.8, 11.6, 6.4, CR, GL, "#aaa99e") +
      '<g class="sc-head">' +
        '<g class="sc-ear-l"><path d="M-37 -21.5L-35.6 -36L-25 -29Z" fill="' + G1 + '"' + line(1.3) + '/><path d="M-34.4 -24.4L-33.8 -32.2L-28.4 -28.4Z" fill="' + PK + '"/></g>' +
        '<g class="sc-ear-r"><path d="M-18.5 -30L-9 -37.5L-7.6 -23.5Z" fill="' + G1 + '"' + line(1.3) + '/><path d="M-15.6 -28.8L-10.6 -33L-10 -26Z" fill="' + PK + '"/></g>' +
        '<path d="M-39 -15C-39 -26 -31.5 -32 -22.5 -32C-13 -32 -6 -25 -6 -15Q-7 -7 -16 -2L-22.5 1L-29 -2Q-38 -7 -39 -15Z" fill="' + G1 + '"' + line(1.1) + "/>" +
        furPatch(-23, -24, 10, 5, 94, .3, G2, 27) + furPatch(-33, -12, 4, 6, 76, -1.2, G2, 20) +
        '<path d="M-31 -3Q-23 2 -14 -3L-17 4L-22 7L-27 4Z" fill="' + CR + '"/>' +
        '<path class="sc-eyes-sleep" d="M-33 -15Q-30 -12.4 -27 -15M-18 -15Q-15 -12.4 -12 -15" fill="none"' + line(1.5) + "/>" +
        '<path class="sc-eyes-happy" d="M-33 -13.6Q-30 -17.2 -27 -13.6M-18 -13.6Q-15 -17.2 -12 -13.6" fill="none"' + line(1.5) + "/>" +
        '<g class="sc-eyes-open"><path d="M-34 -15q4 -5 8 0q-4 5 -8 0ZM-19 -15q4 -5 8 0q-4 5 -8 0Z" fill="#a4ac6c" stroke="' + GL + '" stroke-width=".7"/><path d="M-30 -17v4M-15 -17v4" stroke="#171c18" stroke-width="1.3"/></g>' +
        '<path d="M-24.5 -10.6H-20.5L-22.5 -8.2Z" fill="#222722"' + line(0.7) + "/>" +
        '<path d="M-22.5 -8.8Q-24 -6.5 -25.8 -7.6M-22.5 -8.8Q-21 -6.5 -19.2 -7.6" fill="none"' + line(1) + "/>" +
        '<path d="M-32 -9q-9 -2 -17 -1M-32 -7q-9 1 -17 5M-13 -9q8 -2 15 -1M-13 -7q8 1 15 5" fill="none" stroke="' + CR + '" stroke-width=".4" opacity=".8"/>' +
        '<path class="sc-tongue" d="M-23 -7q-.5 3.6 1 3.6q1.5 -.8 1 -3.6Z" fill="' + PK + '"/>' +
      "</g>" +
      '<g class="sc-groom-paw"><path d="M-9 5Q-10 -1 -19 -5L-24 -3Q-19 2 -14 7Z" fill="' + G1 + '"' + line(.8) + '/>' + catPaw(-23, -3, 8.6, 6, CR, GL, "#aaa99e") + '</g>' +
      '<g class="zzz" font-family="var(--font-display)" font-size="11" style="fill:var(--w-line)"><text x="-10" y="-40">z</text><text x="-2" y="-50" font-size="9">z</text><text x="4" y="-58" font-size="7">z</text></g>' +
      '<text class="sc-purr" x="-40" y="-44" font-size="10" style="fill:var(--w-line)">purr~</text>' +
    "</g>";
  }

  // ------------------------------------------------------------------
  // Scenery helpers
  // ------------------------------------------------------------------
  function peak(cx, base, w, h, r) {
    var lean = (r() - 0.5) * w * 0.25, top = cx + lean;
    var lx = cx - w / 2, rx = cx + w / 2;
    var sLx = cx - w * 0.28 + lean * 0.4, sLy = base - h * (0.55 + r() * 0.15);
    var sRx = cx + w * 0.24 + lean * 0.4, sRy = base - h * (0.5 + r() * 0.2);
    return "M" + f1(lx) + " " + base +
      "C" + f1(lx + w * 0.12) + " " + f1(base - h * 0.15) + " " + f1(sLx - w * 0.1) + " " + f1(sLy + h * 0.15) + " " + f1(sLx) + " " + f1(sLy) +
      "C" + f1(sLx + w * 0.05) + " " + f1(sLy - h * 0.18) + " " + f1(top - w * 0.1) + " " + f1(base - h) + " " + f1(top) + " " + f1(base - h) +
      "C" + f1(top + w * 0.1) + " " + f1(base - h) + " " + f1(sRx - w * 0.05) + " " + f1(sRy - h * 0.2) + " " + f1(sRx) + " " + f1(sRy) +
      "C" + f1(sRx + w * 0.1) + " " + f1(sRy + h * 0.12) + " " + f1(rx - w * 0.12) + " " + f1(base - h * 0.12) + " " + f1(rx) + " " + base + "Z";
  }

  // Texture strokes (皴) on a peak.
  function cun(cx, base, w, h, r, n) {
    var d = "";
    for (var i = 0; i < n; i++) {
      var x = cx + (r() - 0.5) * w * 0.5, y = base - h * (0.35 + r() * 0.45), len = h * (0.15 + r() * 0.25);
      d += "M" + f1(x) + " " + f1(y) + "q" + f1((r() - 0.5) * 10) + " " + f1(len * 0.5) + " " + f1((r() - 0.5) * 16) + " " + f1(len);
    }
    return d;
  }

  function pine(x, y, s, cls) {
    s = s || 1;
    return '<g class="pine ' + (cls || "") + '" transform="translate(' + f1(x) + ' ' + f1(y) + ') scale(' + s + ')"><ellipse class="tree-root-shadow" cx="0" cy="0" rx="18" ry="2.2"/><image class="vegetation-image" href="assets/art/pine.webp" x="-60" y="-110" width="120" height="110"/></g>';
  }

  function rock(x, y, w, h) {
    var d = "M" + f1(x - w / 2) + " " + y + "L" + f1(x - w * .42) + " " + f1(y - h * .46) + "Q" + f1(x - w * .33) + " " + f1(y - h * .91) + " " + f1(x - w * .12) + " " + f1(y - h * .96) + "L" + f1(x + w * .09) + " " + f1(y - h) + "Q" + f1(x + w * .32) + " " + f1(y - h * .85) + " " + f1(x + w * .4) + " " + f1(y - h * .41) + "L" + f1(x + w / 2) + " " + y + "Z";
    return '<g><path class="rock" d="' + d + '"/>' + surface(d, "stone") + '<path class="rock-shadow" d="M' + f1(x + w * .09) + ' ' + f1(y - h) + 'l' + f1(w * .08) + ' ' + f1(h * .55) + 'l' + f1(w * .33) + ' ' + f1(h * .45) + 'H' + f1(x + w * .05) + 'Z"/><path class="rock-fissure" d="M' + f1(x - w * .1) + ' ' + f1(y - h * .91) + 'l-2 ' + f1(h * .35) + ' 5 3 -4 ' + f1(h * .26) + '"/></g>';
  }

  function grass(x, y, s) {
    var r = rng(Math.round(x * 31 + y * 11)), blades = "", ribs = "";
    for (var i = 0; i < 8; i++) {
      var bx = (r() - .5) * 15, h = 9 + r() * 19, lean = (r() - .5) * 25, w = .6 + r() * 1.1;
      var d = "M" + f1(bx) + " 0Q" + f1(bx + lean * .1 - w) + " " + f1(-h * .54) + " " + f1(bx + lean) + " " + f1(-h) + "Q" + f1(bx + lean * .22 + w) + " " + f1(-h * .4) + " " + f1(bx + w) + " 0Z";
      blades += '<path class="grass-blade" style="opacity:' + (.5 + r() * .45).toFixed(2) + '" d="' + d + '"/>';
      ribs += "M" + f1(bx + .3) + " 0Q" + f1(bx + lean * .2) + " " + f1(-h * .5) + " " + f1(bx + lean) + " " + f1(-h * .92);
    }
    return '<g class="grass" transform="translate(' + f1(x) + ' ' + f1(y) + ') scale(' + s + ')"><ellipse class="grass-root" cx="0" cy="0" rx="9" ry="1.5"/>' + blades + '<path class="grass-rib" d="' + ribs + '"/></g>';
  }

  // A Tang stone lamp: lotus base, slim pillar, lotus seat, lamp chamber, flat octagonal cap and pearl.
  function stoneLantern(x) {
    var y = GY;
    return '<g class="stone-lantern" transform="translate(' + x + " " + y + ')">' +
      '<circle class="lantern-glow" cx="0" cy="-54" r="34"/>' +
      '<path class="ink-fill" d="M-12 0H12L9 -6H-9Z"/>' +
      '<path class="paper-fill" d="M-9 -6Q-9 -11 -4.5 -11Q-2 -14 0 -11Q2 -14 4.5 -11Q9 -11 9 -6Z"/>' +
      '<path class="ink-fill" d="M-3.4 -11H3.4L3 -36H-3Z"/>' +
      '<path class="paper-fill" d="M-11 -36Q-10 -42 -5 -41Q-3 -45 0 -42Q3 -45 5 -41Q10 -42 11 -36Z"/>' +
      '<rect class="ink-fill" x="-8" y="-60" width="16" height="19" rx="1.5"/>' +
      '<rect class="lantern-light" x="-4" y="-56.5" width="8" height="12" rx="1"/>' +
      '<path class="ink-fill" d="M-14 -60Q0 -65 14 -60L10 -65Q0 -71 -10 -65Z"/>' +
      '<circle class="ink-fill" cx="0" cy="-72" r="3.2"/>' +
      '</g>';
  }


  // ------------------------------------------------------------------
  // Tang architecture kit. Broad, gently curved hip-and-gable roofs with
  // chiwei (鸱尾) fins at the ridge ends, dougong (斗拱) brackets under deep
  // eaves, vermilion columns on stone bases, a red architrave with the Tang
  // "seven red, eight white" pattern (七朱八白), white walls, vertical-bar
  // windows (直棂窗) and a stone platform (台基). Coordinates are relative to
  // the station; colours come from CSS so night mode works.
  // ------------------------------------------------------------------
  function eaveY(cx, eave, hw, h, x) {
    var t = (x - (cx - hw)) / (2 * hw), lift = h * 0.14, a = eave - lift, c = eave + h * 0.1;
    return (1 - t) * (1 - t) * a + 2 * t * (1 - t) * c + t * t * a;
  }
  function roofPath(cx, eave, hw, h, top) {
    var rw = hw * (top || 0.46), lift = h * 0.14, ridge = eave - h, L = cx - hw, R = cx + hw;
    return "M" + f1(L) + " " + f1(eave - lift) +
      "Q" + f1(cx) + " " + f1(eave + h * 0.1) + " " + f1(R) + " " + f1(eave - lift) +
      "C" + f1(R - hw * 0.14) + " " + f1(eave - lift - h * 0.1) + " " + f1(cx + rw + hw * 0.1) + " " + f1(ridge + h * 0.42) + " " + f1(cx + rw) + " " + f1(ridge) +
      "H" + f1(cx - rw) +
      "C" + f1(cx - rw - hw * 0.1) + " " + f1(ridge + h * 0.42) + " " + f1(L + hw * 0.14) + " " + f1(eave - lift - h * 0.1) + " " + f1(L) + " " + f1(eave - lift) + "Z";
  }
  // A chiwei: a tall fin rising from the ridge end, its tip curling in toward the centre.
  function chiweiPath(x, yb, s, dir) {
    var X = function (v) { return f1(x + dir * v * s); }, Y = function (v) { return f1(yb - v * s); };
    // broad base, a swelling outer edge with fin notches, and a rounded top that turns in toward the ridge
    return "M" + X(-0.46) + " " + Y(0) + "C" + X(-0.66) + " " + Y(0.36) + " " + X(-0.6) + " " + Y(0.62) + " " + X(-0.52) + " " + Y(0.7) +
      "L" + X(-0.6) + " " + Y(0.8) + "C" + X(-0.56) + " " + Y(1.02) + " " + X(-0.42) + " " + Y(1.16) + " " + X(-0.2) + " " + Y(1.28) +
      "Q" + X(0.08) + " " + Y(1.4) + " " + X(0.26) + " " + Y(1.2) + "Q" + X(0.32) + " " + Y(1.08) + " " + X(0.18) + " " + Y(1.02) +
      "C" + X(0.02) + " " + Y(0.92) + " " + X(0.06) + " " + Y(0.5) + " " + X(0.58) + " " + Y(0) + "Z";
  }

  function tangRoof(cx, eave, hw, h, o) {
    o = o || {};
    var top = o.top || 0.46, rw = hw * top, ridge = eave - h, tiles = "", joints = "", ends = "", n = Math.max(4, Math.round(hw / 18));
    for (var i = -n; i <= n; i++) {
      var xe = cx + (i / n) * hw * 0.95, xr = cx + (i / n) * rw, ye = eaveY(cx, eave, hw, h, xe);
      tiles += "M" + f1(xr) + " " + f1(ridge + 4) + "Q" + f1((xr + xe) / 2 + (xe - xr) * 0.12) + " " + f1((ridge + ye) / 2 + 4) + " " + f1(xe) + " " + f1(ye - 3);
      // Broken cross-joints describe real courses of clay tiles without dense, uniform hatching.
      for (var row = 1; row < 4; row++) {
        var t = row / 4, jx = xr + (xe - xr) * t, jy = ridge + 4 + (ye - ridge - 7) * t;
        if ((i + row) % 3 !== 0) joints += "M" + f1(jx - (4 + 5 * t)) + " " + f1(jy) + "q" + f1(4 + 5 * t) + " 1.5 " + f1(8 + 10 * t) + " .2";
      }
    }
    for (var xt = cx - hw + 5; xt < cx + hw - 3; xt += 9) ends += '<circle cx="' + f1(xt) + '" cy="' + f1(eaveY(cx, eave, hw, h, xt) + 1.5) + '" r="2.3"/>';
    var lift = h * 0.14;
    var board = "M" + f1(cx - hw) + " " + f1(eave - lift) + "Q" + f1(cx) + " " + f1(eave + h * 0.1) + " " + f1(cx + hw) + " " + f1(eave - lift) +
      "L" + f1(cx + hw - 3) + " " + f1(eave - lift + 5) + "Q" + f1(cx) + " " + f1(eave + h * 0.1 + 5) + " " + f1(cx - hw + 3) + " " + f1(eave - lift + 5) + "Z";
    var hips = "M" + f1(cx - rw) + " " + f1(ridge + 2) + "C" + f1(cx - rw - hw * 0.09) + " " + f1(ridge + h * 0.42) + " " + f1(cx - hw + hw * 0.16) + " " + f1(eave - lift - h * 0.08) + " " + f1(cx - hw + 6) + " " + f1(eave - lift - 1) +
      "M" + f1(cx + rw) + " " + f1(ridge + 2) + "C" + f1(cx + rw + hw * 0.09) + " " + f1(ridge + h * 0.42) + " " + f1(cx + hw - hw * 0.16) + " " + f1(eave - lift - h * 0.08) + " " + f1(cx + hw - 6) + " " + f1(eave - lift - 1);
    var cw = o.chiwei == null ? h * 0.26 : o.chiwei;
    var fin = function (x, dir) {
      var d = "";
      for (var k = 0; k < 4; k++) d += "M" + f1(x - dir * cw * (0.5 - k * 0.06)) + " " + f1(ridge - 5 - cw * (0.3 + k * 0.24)) + "l" + f1(dir * cw * 0.2) + " " + f1(-cw * 0.06);
      return d;
    };
    return '<g class="t-roof">' +
      '<path class="roof" d="' + roofPath(cx, eave, hw, h, top) + '"/>' +
      '<path class="roof-patina" d="' + roofPath(cx, eave, hw, h, top) + '"/>' +
      '<path class="roof-shade" d="M' + f1(cx + rw) + " " + f1(ridge + 1) + "Q" + f1(cx + hw * .82) + " " + f1(eave - h * .26) + " " + f1(cx + hw) + " " + f1(eave - lift) + "Q" + f1(cx + hw * .62) + " " + f1(eave + 1) + " " + f1(cx) + " " + f1(eave + h * .04) + 'Z"/>' +
      '<path class="roof-tiles" d="' + tiles + '"/>' +
      '<path class="roof-joints" d="' + joints + '"/>' +
      '<path class="roof-hip" d="' + hips + '"/>' +
      '<path class="eave-board" d="' + board + '"/>' +
      '<g class="tile-end">' + ends + "</g>" +
      (o.skirt ? "" :
        '<path class="roof-ridge" d="M' + f1(cx - rw - 2) + " " + f1(ridge + 1) + "Q" + f1(cx) + " " + f1(ridge - 2) + " " + f1(cx + rw + 2) + " " + f1(ridge + 1) + "V" + f1(ridge - 6) + "Q" + f1(cx) + " " + f1(ridge - 9) + " " + f1(cx - rw - 2) + " " + f1(ridge - 6) + 'Z"/>' +
        (cw ? '<path class="chiwei" d="' + chiweiPath(cx - rw, ridge - 5, cw, 1) + chiweiPath(cx + rw, ridge - 5, cw, -1) + '"/>' +
          '<path class="chiwei-fin" d="' + fin(cx - rw, 1) + fin(cx + rw, -1) + '"/>' : "")) +
    "</g>";
  }
  // A row of bracket sets whose tops meet the eave at y.
  function dougong(x1, x2, y, step) {
    var out = "", n = Math.max(1, Math.round((x2 - x1) / step));
    for (var i = 0; i <= n; i++) {
      var x = x1 + (x2 - x1) * i / n;
      out += "M" + f1(x - 16) + " " + f1(y) + "H" + f1(x + 16) + "V" + f1(y + 4) + "H" + f1(x - 16) + "Z" +
        "M" + f1(x - 13.5) + " " + f1(y + 4) + "h5v4h-5zM" + f1(x - 2.5) + " " + f1(y + 4) + "h5v4h-5zM" + f1(x + 8.5) + " " + f1(y + 4) + "h5v4h-5z" +
        "M" + f1(x - 12) + " " + f1(y + 8) + "Q" + f1(x - 12) + " " + f1(y + 12.5) + " " + f1(x - 7.5) + " " + f1(y + 12.5) + "H" + f1(x + 7.5) + "Q" + f1(x + 12) + " " + f1(y + 12.5) + " " + f1(x + 12) + " " + f1(y + 8) + "Z" +
        "M" + f1(x - 6.5) + " " + f1(y + 12.5) + "H" + f1(x + 6.5) + "L" + f1(x + 4.5) + " " + f1(y + 18) + "H" + f1(x - 4.5) + "Z";
    }
    return '<path class="dougong" d="' + out + '"/>';
  }
  // The architrave: red, with the Tang white blocks.
  function architrave(x1, x2, y) {
    var w = "";
    for (var x = x1 + 12; x < x2 - 14; x += 24) w += "M" + f1(x) + " " + f1(y + 2.6) + "h12v3h-12z";
    return '<path class="lane" d="M' + f1(x1) + " " + f1(y) + "H" + f1(x2) + "V" + f1(y + 8) + "H" + f1(x1) + 'Z"/><path class="lane-white" d="' + w + '"/>';
  }
  function columns(xs, top, bottom) {
    return xs.map(function (x) {
      return '<path class="col" d="M' + f1(x - 5.5) + " " + f1(top) + "H" + f1(x + 5.5) + "L" + f1(x + 6) + " " + f1(bottom - 6) + "H" + f1(x - 6) + 'Z"/>' +
        surface(box(x - 4.5, top + 1, 9, bottom - top - 7), "paint") +
        '<path class="timber-shade" d="M' + f1(x + 2) + " " + f1(top) + "h3.5l.5 " + f1(bottom - top - 6) + 'h-4Z"/>' +
        '<path class="timber-grain" d="M' + f1(x - 2.4) + " " + f1(top + 9) + "q1 16 .1 28m.4 8q-1 12 .3 25M" + f1(x + 1) + " " + f1(bottom - 22) + 'q-1 -10 .4 -18"/>' +
        '<path class="paint-wear" d="M' + f1(x - 3.4) + " " + f1(bottom - 16) + "l1.8 -4 .4 8 -1.4 3ZM" + f1(x - 4) + " " + f1(top + 5) + 'l2 1.5 -1 4Z"/>' +
        '<path class="col-base" d="M' + f1(x - 10) + " " + f1(bottom) + "H" + f1(x + 10) + "Q" + f1(x + 10) + " " + f1(bottom - 6) + " " + f1(x + 6) + " " + f1(bottom - 6) + "H" + f1(x - 6) + "Q" + f1(x - 10) + " " + f1(bottom - 6) + " " + f1(x - 10) + " " + f1(bottom) + 'Z"/>';
    }).join("");
  }
  function lattice(x, y, w, h) {
    var bars = "";
    for (var bx = x + 5; bx < x + w - 2; bx += 6) bars += "M" + f1(bx) + " " + f1(y + 3) + "V" + f1(y + h - 3);
    return '<rect class="win-frame" x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(w) + '" height="' + f1(h) + '"/>' +
      '<path class="window-recess" d="M' + f1(x + w) + " " + y + "H" + x + "V" + f1(y + h) + '"/>' +
      '<path class="win-bars" d="' + bars + '"/>' +
      '<path class="window-sill" d="M' + f1(x - 3) + " " + f1(y + h + 2) + "h" + f1(w + 6) + '"/>';
  }
  function tWall(x, y, w, h) {
    return '<rect class="t-wall" x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(w) + '" height="' + f1(h) + '"/>' +
      '<rect class="plaster-grain" x="' + f1(x + 1) + '" y="' + f1(y + 1) + '" width="' + f1(w - 2) + '" height="' + f1(h - 2) + '"/>' +
      '<path class="eave-shadow" d="M' + x + " " + y + "h" + w + "v" + Math.min(12, h * .16) + "l" + f1(-w * .14) + " -3h" + f1(-w * .86) + 'Z"/>' +
      '<path class="plaster-crack" d="M' + f1(x + 6) + " " + f1(y + h) + "l4 -11 -2 -5 3 -7M" + f1(x + w - 14) + " " + f1(y + h - 2) + 'l-8 -2 -6 1"/>';
  }
  function terrace(x1, x2, top, bottom, stepW) {
    var s = '<path class="terrace" d="M' + f1(x1) + " " + f1(bottom) + "V" + f1(top) + "H" + f1(x2) + "V" + f1(bottom) + 'Z"/>' +
      '<path class="stone-grain" d="M' + f1(x1 + 1) + " " + f1(bottom - 1) + "V" + f1(top + 1) + "H" + f1(x2 - 1) + "V" + f1(bottom - 1) + 'Z"/>' +
      '<path class="terrace-edge" d="M' + f1(x1) + " " + f1(top + 4) + "H" + f1(x2) + '"/>';
    for (var joint = x1 + 38; joint < x2 - 12; joint += 67) {
      s += '<path class="stone-joint" d="M' + f1(joint) + " " + f1(top + 5) + "l-1 " + f1(bottom - top - 5) + "M" + f1(joint - 14) + " " + f1(bottom - 3) + 'l7 -1"/>';
    }
    if (stepW) {
      var cx = (x1 + x2) / 2, hgt = bottom - top;
      for (var k = 0; k < 3; k++) {
        var yy = top + hgt * k / 3;
        s += '<path class="t-step" d="M' + f1(cx - stepW / 2 - k * 4) + " " + f1(yy) + "H" + f1(cx + stepW / 2 + k * 4) + "V" + f1(yy + hgt / 3) + "H" + f1(cx - stepW / 2 - k * 4) + 'Z"/>';
      }
    }
    return s;
  }

  // --- distant Tang architecture: single-colour silhouettes with a few light details ---
  function box(x, y, w, h) { return "M" + f1(x) + " " + f1(y) + "h" + f1(w) + "v" + f1(h) + "h" + f1(-w) + "Z"; }
  function bgWrap(cls, sil, det, lights, x, base, scale, span, roofs, eaves) {
    var uid = "feet" + f1(x) + "b" + f1(base), r = rng(Math.round(x)), foliage = "", lines = "";
    var land = "M" + f1(x - span * 1.35) + " " + f1(base + 43) + "Q" + f1(x - span * .9) + " " + f1(base - 6) + " " + f1(x - span * .55) + " " + f1(base + 2) + "Q" + f1(x) + " " + f1(base - 11) + " " + f1(x + span * .6) + " " + f1(base + 8) + "Q" + f1(x + span) + " " + f1(base + 8) + " " + f1(x + span * 1.3) + " " + f1(base + 52) + "Z";
    for (var i = 0; i < 6; i++) {
      var tx = x + (i / 5 - .5) * span * 2.2, ty = base + 10 + r() * 13;
      foliage += pine(tx, ty, scale * (.18 + r() * .23), "bg-ground-tree");
      lines += "M" + f1(tx - 8) + " " + f1(ty + 4) + "q9 -5 19 -2";
    }
    return '<g class="bg-site ' + cls + '"><path class="foothill" d="' + land + '"/><path class="foothill-grain" d="' + land + '"/>' +
      '<defs><linearGradient id="' + uid + '" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="' + (base - 17) + '" y2="' + (base + 26) + '"><stop stop-color="white"/><stop offset="1" stop-color="black"/></linearGradient><mask id="m' + uid + '" maskUnits="userSpaceOnUse" x="0" y="0" width="20000" height="800"><rect width="20000" height="800" fill="url(#' + uid + ')"/></mask></defs>' +
      '<g class="bg-arch ' + cls + '" mask="url(#m' + uid + ')"><path class="sil" d="' + sil + '"/><path class="bg-material" d="' + sil + '"/>' + (det ? '<path class="det" d="' + det + '"/>' : "") +
      (lights ? '<path class="window-halo" d="' + lights + '"/><path class="win-light" d="' + lights + '"/><path class="window-shadow" d="' + lights + '"/>' : "") + '</g>' + foliage + '<path class="foothill-mark" d="' + lines + '"/></g>';
  }
  function bgRoofDetail(cx, eave, hw, h, top) {
    var d = "", rw = hw * (top || .46);
    for (var i = -3; i <= 3; i++) {
      d += "M" + f1(cx + i / 3 * rw) + " " + f1(eave - h + 2) + "Q" + f1(cx + i / 3 * hw * .7) + " " + f1(eave - h * .38) + " " + f1(cx + i / 3 * hw * .92) + " " + f1(eaveY(cx, eave, hw, h, cx + i / 3 * hw * .92) - 2);
    }
    return d;
  }
  // A square, many-storeyed brick pagoda in the manner of the Great Wild Goose Pagoda.
  function bgPagoda(x, base, s, cls) {
    var roofs = "", eaves = "", sil = box(x - 40 * s, base - 12 * s, 80 * s, 12 * s), det = "", lights = "", w = 58 * s, h = 26 * s, y = base - 12 * s;
    for (var i = 0; i < 7; i++) {
      sil += box(x - w / 2, y - h, w, h) + box(x - w / 2 - 5 * s, y - h - 3.4 * s, w + 10 * s, 3.4 * s);
      roofs += box(x - w / 2 - 5 * s, y - h - 3.4 * s, w + 10 * s, 3.4 * s);
      eaves += box(x - w / 2, y - h, w, 1.6 * s);
      det += "M" + f1(x - 2.6 * s) + " " + f1(y - 4 * s) + "V" + f1(y - h * 0.62) + "Q" + f1(x) + " " + f1(y - h * 0.8) + " " + f1(x + 2.6 * s) + " " + f1(y - h * 0.62) + "V" + f1(y - 4 * s);
      lights += box(x - 1.6 * s, y - h * 0.58, 3.2 * s, h * 0.32);
      y -= h + 3.4 * s; w *= 0.88; h *= 0.9;
    }
    sil += box(x - 2 * s, y - 20 * s, 4 * s, 20 * s) + box(x - 6 * s, y - 8 * s, 12 * s, 2.4 * s) + box(x - 4.4 * s, y - 14 * s, 8.8 * s, 2 * s);
    return bgWrap(cls, sil, det, lights, x, base, s, 66 * s, roofs, eaves);
  }
  // A palace hall on a high terrace, flanked by que towers (阙).
  function bgPalace(x, base, s, cls) {
    var t = base - 46 * s, sil = "", det = "", lights = "", roofs = roofPath(x, base - 88 * s, 176 * s, 50 * s), eaves = box(x - 132 * s, base - 86 * s, 264 * s, 4 * s);
    sil += "M" + f1(x - 230 * s) + " " + f1(base) + "L" + f1(x - 212 * s) + " " + f1(t) + "H" + f1(x + 212 * s) + "L" + f1(x + 230 * s) + " " + f1(base) + "Z";
    det += "M" + f1(x - 26 * s) + " " + f1(base) + "L" + f1(x - 14 * s) + " " + f1(t) + "M" + f1(x + 26 * s) + " " + f1(base) + "L" + f1(x + 14 * s) + " " + f1(t) + "M" + f1(x - 212 * s) + " " + f1(t + 6 * s) + "H" + f1(x + 212 * s);
    sil += box(x - 132 * s, t - 44 * s, 264 * s, 44 * s) + roofPath(x, t - 42 * s, 176 * s, 50 * s) + chiweiPath(x - 81 * s, t - 92 * s, 16 * s, 1) + chiweiPath(x + 81 * s, t - 92 * s, 16 * s, -1);
    det += bgRoofDetail(x, t - 42 * s, 176 * s, 50 * s);
    for (var c = -5; c <= 5; c++) {
      var cxx = x + c * 24 * s;
      det += "M" + f1(cxx) + " " + f1(t - 40 * s) + "V" + f1(t);
      if (c < 5) lights += box(cxx + 7 * s, t - 30 * s, 10 * s, 16 * s);
    }
    [-1, 1].forEach(function (d) {
      var qx = x + d * 196 * s;
      sil += box(qx - 24 * s, t - 64 * s, 48 * s, 64 * s) + roofPath(qx, t - 62 * s, 34 * s, 16 * s, 0.4) +
        box(qx - 15 * s, t - 96 * s, 30 * s, 22 * s) + roofPath(qx, t - 94 * s, 24 * s, 14 * s, 0.4) +
        roofPath(x + d * 158 * s, t - 18 * s, 30 * s, 12 * s, 0.5);
      roofs += roofPath(qx, t - 62 * s, 34 * s, 16 * s, .4) + roofPath(qx, t - 94 * s, 24 * s, 14 * s, .4) + roofPath(x + d * 158 * s, t - 18 * s, 30 * s, 12 * s, .5);
      eaves += box(qx - 24 * s, t - 61 * s, 48 * s, 3 * s) + box(qx - 15 * s, t - 93 * s, 30 * s, 2 * s);
      lights += box(qx - 4 * s, t - 90 * s, 8 * s, 10 * s);
    });
    return bgWrap(cls, sil, det, lights, x, base, s, 260 * s, roofs, eaves);
  }
  // A stretch of city wall with a gate tower over an arched gate.
  function bgGate(x, base, s, cls) {
    var roofs = roofPath(x, base - 90 * s, 116 * s, 40 * s), eaves = box(x - 84 * s, base - 88 * s, 168 * s, 4 * s);
    var t = base - 52 * s, sil = box(x - 280 * s, t, 560 * s, 52 * s), det = "", lights = "";
    for (var m = x - 276 * s; m < x + 276 * s; m += 16 * s) sil += box(m, t - 7 * s, 9 * s, 7 * s);
    det += "M" + f1(x - 22 * s) + " " + f1(base) + "V" + f1(base - 28 * s) + "Q" + f1(x) + " " + f1(base - 46 * s) + " " + f1(x + 22 * s) + " " + f1(base - 28 * s) + "V" + f1(base);
    sil += box(x - 84 * s, t - 40 * s, 168 * s, 40 * s) + roofPath(x, t - 38 * s, 116 * s, 40 * s) + chiweiPath(x - 53 * s, t - 78 * s, 12 * s, 1) + chiweiPath(x + 53 * s, t - 78 * s, 12 * s, -1);
    for (var c = -3; c <= 3; c++) { det += "M" + f1(x + c * 26 * s) + " " + f1(t - 36 * s) + "V" + f1(t); if (c < 3) lights += box(x + c * 26 * s + 7 * s, t - 28 * s, 12 * s, 16 * s); }
    for (var row = 0; row < 3; row++) {
      var yy = t + (14 + row * 12) * s;
      det += "M" + f1(x - 262 * s) + " " + f1(yy) + "h" + f1(202 * s) + "M" + f1(x + 68 * s) + " " + f1(yy) + "h" + f1(176 * s);
    }
    det += bgRoofDetail(x, t - 38 * s, 116 * s, 40 * s);
    return bgWrap(cls, sil, det, lights, x, base, s, 320 * s, roofs, eaves);
  }
  // A three-storey tower (阁) with balconies and stacked roofs.
  function bgTower(x, base, s, cls) {
    var roofs = "", eaves = "", sil = box(x - 70 * s, base - 16 * s, 140 * s, 16 * s), det = "", lights = "", y = base - 16 * s, w = 90 * s, h = 34 * s;
    for (var i = 0; i < 3; i++) {
      sil += box(x - w / 2, y - h, w, h) + roofPath(x, y - h + 4 * s, w * 0.78, 20 * s, 0.35);
      roofs += roofPath(x, y - h + 4 * s, w * .78, 20 * s, .35);
      eaves += box(x - w / 2, y - h + 5 * s, w, 3 * s);
      for (var rail = -2; rail <= 2; rail++) det += "M" + f1(x + rail * w / 5) + " " + f1(y - 8 * s) + "v" + f1(6 * s);
      det += bgRoofDetail(x, y - h + 4 * s, w * .78, 20 * s, .35);
      det += "M" + f1(x - w / 2) + " " + f1(y - 8 * s) + "H" + f1(x + w / 2);
      for (var c = -1; c <= 1; c++) lights += box(x + c * w * 0.28 - 4 * s, y - h + 10 * s, 8 * s, 12 * s);
      y -= h + 16 * s; w *= 0.8; h *= 0.9;
    }
    sil += roofPath(x, y + 16 * s + 4 * s, w * 0.9, 24 * s, 0.3) + box(x - 1.6 * s, y - 16 * s, 3.2 * s, 16 * s);
    roofs += roofPath(x, y + 20 * s, w * .9, 24 * s, .3);
    return bgWrap(cls, sil, det, lights, x, base, s, 108 * s, roofs, eaves);
  }
  function bgPavilion(x, base, s, cls) {
    var sil = "M" + f1(x - 60 * s) + " " + f1(base) + "C" + f1(x - 44 * s) + " " + f1(base - 22 * s) + " " + f1(x + 40 * s) + " " + f1(base - 26 * s) + " " + f1(x + 62 * s) + " " + f1(base) + "Z";
    var top = base - 20 * s, det = "";
    sil += box(x - 30 * s, top - 4 * s, 60 * s, 4 * s) + roofPath(x, top - 34 * s, 46 * s, 30 * s, 0.14) + box(x - 1.4 * s, top - 76 * s, 2.8 * s, 12 * s);
    det += bgRoofDetail(x, top - 34 * s, 46 * s, 30 * s, .14);
    [-24, -8, 8, 24].forEach(function (c) { sil += box(x + c * s - 1.6 * s, top - 34 * s, 3.2 * s, 30 * s); });
    det += "M" + f1(x - 26 * s) + " " + f1(top - 12 * s) + "H" + f1(x + 26 * s) +
      "M" + f1(x - 26 * s) + " " + f1(top - 8 * s) + "H" + f1(x + 26 * s);
    [-16, 0, 16].forEach(function (c) { det += "M" + f1(x + c * s) + " " + f1(top - 12 * s) + "v" + f1(12 * s); });
    var roofs = roofPath(x, top - 34 * s, 46 * s, 30 * s, .14), eaves = box(x - 27 * s, top - 32 * s, 54 * s, 3 * s);
    return bgWrap(cls, sil, det, box(x - 2.2 * s, top - 25 * s, 4.4 * s, 6 * s), x, base, s, 90 * s, roofs, eaves);
  }
  // Auspicious clouds (祥云): soft lobes that end in spirals.
  function xiangyun(x, y, s) {
    var S = function (v) { return f1(v * s); };
    return '<g class="xiangyun" transform="translate(' + f1(x) + " " + f1(y) + ')">' +
      '<path class="yun-fill" d="M0 0c' + S(4) + " " + S(-16) + " " + S(26) + " " + S(-20) + " " + S(34) + " " + S(-6) + "c" + S(6) + " " + S(-14) + " " + S(30) + " " + S(-14) + " " + S(34) + " " + S(4) + "c" + S(14) + " " + S(-2) + " " + S(22) + " " + S(14) + " " + S(10) + " " + S(20) + "H" + S(-6) + "c" + S(-12) + " " + S(-2) + " " + S(-12) + " " + S(-16) + " " + S(6) + " " + S(-18) + 'z"/>' +
      '<path d="M' + S(12) + " " + S(-6) + "c" + S(0) + " " + S(-8) + " " + S(12) + " " + S(-8) + " " + S(12) + " " + S(0) + "c" + S(0) + " " + S(4) + " " + S(-6) + " " + S(4) + " " + S(-6) + " " + S(0) +
        "M" + S(46) + " " + S(-4) + "c" + S(0) + " " + S(-8) + " " + S(12) + " " + S(-8) + " " + S(12) + " " + S(0) + "c" + S(0) + " " + S(4) + " " + S(-6) + " " + S(4) + " " + S(-6) + " " + S(0) + '"/>' +
    "</g>";
  }
  function willow(x, base, s, cls) {
    return '<g class="willow ' + (cls || "") + '" transform="translate(' + f1(x) + ' ' + f1(base) + ') scale(' + s + ')"><ellipse class="tree-root-shadow" cx="0" cy="0" rx="19" ry="2.5"/><image class="vegetation-image" href="assets/art/willow.webp" x="-69" y="-148" width="138" height="148"/></g>';
  }

  // Wooden hanging sign used as each station's label.
  function gshadow(x, rx) { return '<ellipse class="gshadow" cx="' + x + '" cy="' + (GY + 2) + '" rx="' + rx + '" ry="' + Math.max(3, rx * 0.12).toFixed(1) + '"/>'; }

  function sign(x, y, text, w, ropeTop) {
    w = w || 150;
    ropeTop = ropeTop || [-30, -30];
    return '<g class="sign" transform="translate(' + x + " " + y + ')">' +
      '<path class="sign-rope" d="M' + (-w / 2 + 14) + ' ' + ropeTop[0] + 'L' + (-w / 2 + 24) + ' 0M' + (w / 2 - 14) + ' ' + ropeTop[1] + 'L' + (w / 2 - 24) + ' 0"/>' +
      '<rect class="sign-board" x="' + (-w / 2) + '" y="0" width="' + w + '" height="34" rx="4"/>' +
      surface(box(-w / 2 + 1, 1, w - 2, 32), "wood") +
      '<path class="object-edge" d="M' + (-w / 2 + 4) + ' 3h' + (w - 8) + '"/>' +
      '<text class="sign-text" x="0" y="23" text-anchor="middle">' + esc(text) + '</text>' +
      '</g>';
  }

  // ------------------------------------------------------------------
  // Background layers
  // ------------------------------------------------------------------
  function gradients() {
    var marks = "", r = rng(143);
    for (var i = 0; i < 95; i++) {
      var mx = f1(r() * 160), my = f1(r() * 128);
      marks += '<path d="M' + mx + " " + my + "l" + f1(1 + r() * 3) + " " + f1((r() - .5) * 2) + '"/>';
    }
    var materials = ["Plaster", "Limestone", "Timber", "Vermilion", "Slate", "Linen"].map(function (name, i) {
      var w = i === 5 ? 24 : 180, h = w * 2 / 3;
      return '<pattern id="g' + name + '" width="' + w + '" height="' + h + '" patternUnits="userSpaceOnUse"><image class="material-image" href="assets/art/material-' + i + '.webp" width="' + w + '" height="' + h + '" preserveAspectRatio="none"/></pattern>';
    }).join("");
    return '<defs>' + materials + '<filter id="gOcclusion" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2"/></filter>' +
      '<pattern id="gMineral" width="160" height="128" patternUnits="userSpaceOnUse"><g class="mineral-flecks">' + marks + '</g><path class="mineral-wash" d="M12 28l18 -7 14 9 -7 11 -20 -3ZM84 84l26 -8 16 9 -8 12 -27 -2Z"/></pattern>' +
      '<pattern id="gClay" width="90" height="68" patternUnits="userSpaceOnUse"><path class="clay-grain" d="M8 12l14 -3M31 16l17 2M52 8l23 3M18 48l12 -4M45 56l23 -2M73 40l8 1M9 29l6 1M61 27l9 -2"/></pattern>' +
      '<pattern id="gLandscape" width="3600" height="800" patternUnits="userSpaceOnUse"><image href="assets/art/mountain-wash.webp" y="12" width="1800" height="600"/><image href="assets/art/mountain-wash.webp" y="12" width="1800" height="600" transform="translate(3600 0) scale(-1 1)"/></pattern>' +
      '<linearGradient id="gFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--w-far);stop-opacity:.75"/><stop offset=".55" style="stop-color:var(--w-far);stop-opacity:.35"/><stop offset="1" style="stop-color:var(--w-far);stop-opacity:0"/></linearGradient>' +
      '<linearGradient id="gMid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--w-mid);stop-opacity:.9"/><stop offset=".6" style="stop-color:var(--w-mid);stop-opacity:.4"/><stop offset="1" style="stop-color:var(--w-mid);stop-opacity:0"/></linearGradient>' +
      '<linearGradient id="gNear" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--w-near);stop-opacity:.95"/><stop offset=".7" style="stop-color:var(--w-near);stop-opacity:.45"/><stop offset="1" style="stop-color:var(--w-near);stop-opacity:.05"/></linearGradient>' +
      '<linearGradient id="gMist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--w-mist);stop-opacity:0"/><stop offset=".5" style="stop-color:var(--w-mist);stop-opacity:.85"/><stop offset="1" style="stop-color:var(--w-mist);stop-opacity:0"/></linearGradient>' +
      '<linearGradient id="gGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--w-ground-1)"/><stop offset="1" style="stop-color:var(--w-ground-2)"/></linearGradient>' +
      '<radialGradient id="gGlow"><stop offset="0" style="stop-color:var(--w-glow)"/><stop offset="1" style="stop-color:var(--w-glow);stop-opacity:0"/></radialGradient>' +
      '<linearGradient id="gPond" gradientUnits="userSpaceOnUse" x1="0" y1="680" x2="0" y2="800"><stop offset="0" stop-color="var(--w-water-bank)"/><stop offset=".18" stop-color="var(--w-water-sky)"/><stop offset=".55" stop-color="var(--w-water)"/><stop offset="1" stop-color="var(--w-water-deep)"/></linearGradient>' +
      '<linearGradient id="gShallows" gradientUnits="userSpaceOnUse" x1="0" y1="683" x2="0" y2="735"><stop stop-color="var(--w-water-bank)" stop-opacity=".6"/><stop offset="1" stop-color="var(--w-water-bank)" stop-opacity="0"/></linearGradient>' +
      '<radialGradient id="gWaterLight"><stop stop-color="var(--w-disc)" stop-opacity=".2"/><stop offset="1" stop-color="var(--w-disc)" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="gLeaf" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="var(--w-leaf-light)"/><stop offset=".48" stop-color="var(--w-jade)"/><stop offset="1" stop-color="var(--w-leaf-dark)"/></linearGradient>' +
      '<linearGradient id="gPetal" x1="0" y1="0" x2=".25" y2="1"><stop stop-color="var(--w-petal-light)"/><stop offset=".45" stop-color="var(--w-petal)"/><stop offset="1" stop-color="var(--w-petal-dark)"/></linearGradient>' +
      '<linearGradient id="gMetal" x1="0" y1="0" x2="1" y2=".25"><stop stop-color="var(--w-metal-dark)"/><stop offset=".17" stop-color="var(--w-metal-light)"/><stop offset=".3" stop-color="var(--w-metal)"/><stop offset=".64" stop-color="var(--w-metal-dark)"/><stop offset=".9" stop-color="var(--w-metal)"/><stop offset="1" stop-color="var(--w-metal-dark)"/></linearGradient>' +
      '<linearGradient id="gLeather" x1="0" y1="0" x2="1" y2="1"><stop stop-color="var(--w-leather-light)"/><stop offset=".5" stop-color="var(--w-leather)"/><stop offset="1" stop-color="var(--w-leather-dark)"/></linearGradient>' +
      '<linearGradient id="gCeramic" x1="0" y1="0" x2="1" y2=".15"><stop stop-color="var(--w-accent-deep)"/><stop offset=".3" stop-color="var(--w-accent-soft)"/><stop offset=".55" stop-color="var(--w-accent)"/><stop offset="1" stop-color="var(--w-accent-deep)"/></linearGradient>' +
      '<linearGradient id="gTerracotta" x1="0" y1="0" x2="1" y2=".5"><stop stop-color="var(--w-pot)"/><stop offset=".3" stop-color="var(--w-leather-light)"/><stop offset="1" stop-color="var(--w-leather-dark)"/></linearGradient>' +
      '<linearGradient id="gPaper" x1="0" y1="0" x2=".1" y2="1"><stop stop-color="var(--w-note)"/><stop offset=".6" stop-color="var(--w-fill)"/><stop offset="1" stop-color="var(--w-stone)"/></linearGradient>' +
      '<linearGradient id="gAudienceCloth" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="var(--w-line-soft)"/><stop offset=".5" stop-color="var(--w-ink-fill)"/><stop offset="1" stop-color="var(--w-ink)"/></linearGradient>' +
      '<linearGradient id="gTheaterCloth" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#312b27"/><stop offset=".5" stop-color="#141212"/><stop offset="1" stop-color="#070504"/></linearGradient>' +
      '<pattern id="gGabardine" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M-1 1L1 -1M0 3L3 0M2 4L4 2" stroke="#6d5438" stroke-width=".2" opacity=".6"/><path d="M0 1L1 0M1 3L3 1" stroke="#f5e2bc" stroke-width=".2" opacity=".6"/></pattern>' +
      '<pattern id="gSilkWeave" width="2" height="2" patternUnits="userSpaceOnUse"><path d="M0 .5H2M.5 0V2" stroke="#9c939c" stroke-width=".1" opacity=".28"/></pattern>' +
      '<pattern id="gLeatherGrain" width="12" height="10" patternUnits="userSpaceOnUse"><path d="M1 2l1 1M5 1l2 1M10 3l1 1M2 7l2 1M8 6l1 1M6 9l1 1" stroke="#27201a" stroke-width=".6" opacity=".3"/></pattern>' +
      // materials: soft light from the upper left, so surfaces read as solid rather than flat
      '<linearGradient id="gWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--w-fill)"/><stop offset="1" style="stop-color:var(--w-interior)"/></linearGradient>' +
      '<linearGradient id="gStone" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--w-stone)"/><stop offset="1" style="stop-color:var(--w-rock)"/></linearGradient>' +
      '<linearGradient id="gWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--w-wood-2)"/><stop offset="1" style="stop-color:var(--w-wood)"/></linearGradient>' +
      '<linearGradient id="gRed" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--w-accent)"/><stop offset="1" style="stop-color:var(--w-accent-deep)"/></linearGradient>' +
      '<linearGradient id="gMachine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--w-machine-2)"/><stop offset="1" style="stop-color:var(--w-machine)"/></linearGradient>' +
      '</defs>';
  }

  function mountains(width, opt) {
    var r = rng(opt.seed), out = "", tex = "", x = -opt.gap;
    while (x < width + opt.gap) {
      var w = opt.w[0] + r() * (opt.w[1] - opt.w[0]);
      var h = opt.h[0] + r() * (opt.h[1] - opt.h[0]);
      out += '<path d="' + peak(x, opt.base, w, h, r) + '"/>';
      if (opt.cun) tex += cun(x, opt.base, w, h, r, opt.cun);
      x += opt.gap * (0.6 + r() * 0.8);
    }
    return '<g fill="url(#' + opt.grad + ')">' + out + "</g>" +
      (tex ? '<path class="cun" d="' + tex + '"/>' : "");
  }

  function mist(width, y, h) {
    return '<rect x="0" y="' + y + '" width="' + width + '" height="' + h + '" fill="url(#gMist)"/>';
  }


  // Depth: the far buildings are few, small, pale and soft, some half hidden behind the
  // ridges; the middle ones are larger and crisper, their feet lost in the mist.
  // Trees and foundations behind a ridge are actually occluded, rather than painted over it.
  function ridgeMask(width, uid, base, seed) {
    var r = rng(seed), ridge = "M0 " + base;
    for (var x = 0; x < width; x += 240) {
      var end = Math.min(x + 240, width), y = base + (r() - .5) * 21;
      ridge += "C" + f1(x + 80) + " " + f1(base - 8 + r() * 14) + " " + f1(end - 80) + " " + f1(y) + " " + end + " " + f1(y);
    }
    ridge += "L" + width + " 800H0Z";
    return '<defs><mask id="' + uid + '" maskUnits="userSpaceOnUse" x="0" y="0" width="' + width + '" height="800"><rect width="' + width + '" height="800" fill="white"/><path d="' + ridge + '" fill="black" filter="url(#gOcclusion)"/></mask></defs>';
  }

  function farLayer(width) {
    var clouds = [[160, 244, 1.3], [980, 212, 1.05], [1760, 258, 1.5], [2600, 226, 1.15], [3500, 250, 1.35]].map(function (c) { return xiangyun(c[0], c[1], c[2]); }).join("");
    // A painted transparent plane still moves at the original parallax speed.
    // Mirrored repeat edges meet exactly, so the entire walkable world has continuous scenery.
    return clouds + '<rect class="landscape-wash" width="' + width + '" height="800" fill="url(#gLandscape)"/>' + ridgeMask(width, "mFarRidge", 438, 81) + '<g mask="url(#mFarRidge)">' +
      bgPalace(1320, 452, .7, "far far-soft") + bgGate(2440, 460, .62, "far far-soft") +
      bgPagoda(470, 446, .72, "far") + bgPagoda(3080, 444, .82, "far") + '</g>' + mist(width, 474, 106);
  }

  function midLayer(width) {
    var r = rng(29), trees = "";
    for (var x = 120; x < width; x += 540 + r() * 500) trees += pine(x, 440 + r() * 30, 0.55 + r() * 0.3, "pine mid-pine");
    var arch = bgTower(900, 488, 1.12, "mid") + bgPavilion(2060, 478, 1.05, "mid") + bgTower(3300, 490, 1.02, "mid") + bgPavilion(4420, 476, 1, "mid");
    var willows = "";
    for (var wx = 1250; wx < width; wx += 1500 + r() * 800) willows += willow(wx, 500, 0.7 + r() * 0.3, "mid-willow");   // none behind the Welcome gate
    return ridgeMask(width, "mMidFoundation", 479, 83) + '<g mask="url(#mMidFoundation)">' + arch + '</g>' + ridgeMask(width, "mMidGrove", 432, 85) + '<g mask="url(#mMidGrove)">' + trees + willows + '</g>' + mist(width, 492, 86);
  }

  function nearLayer(width) {
    var r = rng(41), trees = "", willows = "";
    for (var x = 200; x < width; x += 710 + r() * 620) trees += pine(x, 505 + r() * 20, 0.8 + r() * 0.4, "pine near-pine");
    for (var wx = 1650; wx < width; wx += 1900 + r() * 800) willows += willow(wx, 560, 1 + r() * 0.3, "near-willow");   // none behind the Welcome gate
    return ridgeMask(width, "mNearFoundation", 534, 87) + '<g mask="url(#mNearFoundation)">' + bgPavilion(1570, 532, 1.2, "near") + bgTower(2850, 540, .82, "near") +
      bgPavilion(4170, 530, 1.3, "near") + '</g>' + ridgeMask(width, "mNearGrove", 491, 89) + '<g mask="url(#mNearGrove)">' + trees + willows + '</g>' + mist(width, 538, 65);
  }

  // The DOM sky retains its interactive sun/moon and moving birds.
  function skyLayer(width) {
    return "";
  }

  // ------------------------------------------------------------------
  // Ground layer: stone path, decorations and the eight stations.
  // ------------------------------------------------------------------
  function ground(width, stations) {
    var r = rng(53);
    var top = "M0 " + GY;
    for (var x = 0; x <= width; x += 60) top += "L" + x + " " + f1(GY + (r() - 0.5) * 4);
    var band = top + "L" + width + " " + VH + "L0 " + VH + "Z";

    var strokes = "";
    for (var i = 0; i < width / 90; i++) {
      var sx = r() * width, sy = GY + 8 + r() * 36, sl = 40 + r() * 160;
      strokes += "M" + f1(sx) + " " + f1(sy) + "q" + f1(sl / 2) + " " + f1((r() - 0.5) * 4) + " " + f1(sl) + " 0";
    }

    // Staggered limestone slabs: chipped bevels and grain, with larger stones nearer the viewer.
    var paving = "", slabs = "", bevels = "", stoneWear = "", rows = [[GY + 7, 16, 46], [GY + 23, 20, 58], [GY + 43, 24, 74]];
    rows.forEach(function (row, ri) {
      for (var jx = -(ri % 2) * row[2] * .5; jx < width;) {
        var sw = row[2] * (.83 + r() * .33), sy = row[0] + .5, cut = .7 + r() * 1.3;
        var d = "M" + f1(jx + cut) + " " + f1(sy) + "H" + f1(jx + sw - cut) + "L" + f1(jx + sw - .6) + " " + f1(sy + cut) + "V" + f1(sy + row[1] - cut) + "L" + f1(jx + sw - cut - .6) + " " + f1(sy + row[1] - .5) + "H" + f1(jx + cut) + "L" + f1(jx + .7) + " " + f1(sy + row[1] - cut) + "V" + f1(sy + cut) + "Z";
        slabs += '<path class="paving-slab" style="opacity:' + (.28 + r() * .25).toFixed(2) + '" d="' + d + '"/>' + '<path class="paving-grain" d="' + d + '"/>';
        paving += "M" + f1(jx + sw) + " " + sy + "v" + row[1];
        bevels += "M" + f1(jx + cut + 1) + " " + f1(sy + 1) + "h" + f1(sw - cut * 2 - 3);
        if (r() < .35) stoneWear += "M" + f1(jx + 3) + " " + f1(sy + row[1] - 1) + "l4 -2 3 1M" + f1(jx + sw * .6) + " " + f1(sy + 5) + "l6 -1";
        jx += sw;
      }
      paving += "M0 " + row[0] + "H" + width;
    });

    // Decorations in the gaps between stations
    var deco = "", zones = stations.map(function (s) { return [s.x - s.half, s.x + s.half]; });
    function free(x, pad) { for (var z = 0; z < zones.length; z++) if (x > zones[z][0] - pad && x < zones[z][1] + pad) return false; return true; }
    for (var gx = 80; gx < width - 40; gx += 70 + r() * 160) {
      if (!free(gx, 30) || Math.abs(gx - 6370) < 80) continue;
      var roll = r();
      if (roll < 0.42) deco += rock(gx, GY + 3, 30 + r() * 40, 14 + r() * 16);
      else if (roll < 0.56 && free(gx, 120)) deco += stoneLantern(gx);
      else deco += grass(gx, GY + 1, 0.8 + r() * 0.6) + grass(gx + 14, GY + 1, 0.6 + r() * 0.5);
    }
    // Only five clear specimens along the whole walk; all other groves are distant washes.
    [160, 2260, 4560, 6370, 8190].forEach(function (treeX, i) {
      if (free(treeX, 70)) {
        deco += i === 3 ? willow(treeX, GY + 2, .92, "ground-willow") : pine(treeX, GY + 2, 1.2 + i % 2 * .12, "ground-pine");
        if (i === 3) deco += rock(treeX + 33, GY + 3, 34, 12) + grass(treeX - 18, GY + 2, .45);
      }
    });
    var tufts = "";
    for (var tx2 = 20; tx2 < width; tx2 += 50 + r() * 120) tufts += grass(tx2, GY + 2, 0.5 + r() * 0.5);

    return '<path class="ground-band" d="' + band + '" fill="url(#gGround)"/>' +
      '<path class="ground-edge" d="' + top + '"/>' +
      slabs + '<path class="paving-bevel" d="' + bevels + '"/><path class="paving-wear" d="' + stoneWear + '"/>' +
      '<path class="paving" d="' + paving + '"/>' +
      '<path class="ground-strokes" d="' + strokes + '"/>' +
      '<path class="path-grain" d="' + band + '" fill="url(#gMineral)"/>' +
      '<g class="tufts">' + tufts + "</g>" +
      '<g class="deco">' + deco + "</g>";
  }

  function foreground(width) {
    var r = rng(71), reeds = "", blades = "", stems = "", flowers = "", leaves = "", reflections = "";
    var sr = rng(186), shorePoints = [[0, 685]], shore, bank, bankGrass = "", shoreMarks = "", waterLines = "", bed = "";
    // One continuous plane: a dry bank, a submerged shelf, then deeper water.
    for (var bx = 0; bx < width; bx += 220) {
      var end = Math.min(width, bx + 220), by = 682 + sr() * 17;
      shorePoints.push([end, by]);
      var gx = end - 36;
      bankGrass += grass(gx, by - 10, .32);
      bed += "M" + gx + " " + f1(by + 3) + "q-4 9 -3 19m4 -17q4 8 7 13";
      shoreMarks += "M" + f1(bx + 36) + " " + f1(by + 3) + "q19 -1 38 0M" + f1(bx + 145) + " " + f1(by + 1) + "l15 1";
    }
    function smoothBank(offset) {
      var d = "M0 " + (685 + offset);
      for (var j = 0; j < shorePoints.length - 1; j++) {
        var a = shorePoints[j], b = shorePoints[j + 1], prev = shorePoints[Math.max(0, j - 1)], next = shorePoints[Math.min(shorePoints.length - 1, j + 2)];
        d += "C" + f1(a[0] + (b[0] - prev[0]) / 6) + " " + f1(a[1] + (b[1] - prev[1]) / 6 + offset) + " " + f1(b[0] - (next[0] - a[0]) / 6) + " " + f1(b[1] - (next[1] - a[1]) / 6 + offset) + " " + b[0] + " " + f1(b[1] + offset);
      }
      return d;
    }
    shore = smoothBank(0); bank = smoothBank(-9);
    var waterShape = shore + "L" + width + " 800H0Z";
    for (var wx = 0; wx < width; wx += 52 + sr() * 72) {
      var wy = 708 + sr() * 86, wl = 13 + sr() * 43;
      waterLines += '<path class="water-line" style="opacity:' + f1(.15 + sr() * .25) + '" d="M' + f1(wx) + " " + f1(wy) + "q" + f1(wl * .48) + " " + f1((sr() - .5) * 1.4) + " " + f1(wl) + ' 0"/>';
    }
    var lightLines = "", lrng = rng(77);
    for (var li = 0; li < 27; li++) {
      var ly = 712 + li * 3.25, ll = 5 + li * 1.25 + lrng() * 17, lx = (lrng() - .5) * (10 + li * 2.6);
      lightLines += '<path d="M' + f1(lx - ll / 2) + " " + f1(ly) + "q" + f1(ll / 2) + " -1 " + f1(ll) + ' 0" style="opacity:' + f1(.2 + lrng() * .5) + '"/>';
    }
    // Lotus pads sit ON the plane; submerged stems and broken reflections sit below it.
    for (var px = 420; px < width; px += 830 + r() * 570) {
      var py = 752 + r() * 17, prx = 150 + r() * 65;
      for (var k = 0; k < 7; k++) {
        var lx = px + (r() - .5) * prx * 1.5, ly2 = py + (r() - .5) * 23, rad = 11 + r() * 13;
        var pad = "M" + f1(lx) + " " + f1(ly2) + "l" + f1(rad * .84) + " " + f1(-rad * .18) + "C" + f1(lx + rad * .75) + " " + f1(ly2 - rad * .56) + " " + f1(lx - rad) + " " + f1(ly2 - rad * .6) + " " + f1(lx - rad) + " " + f1(ly2) + "C" + f1(lx - rad) + " " + f1(ly2 + rad * .5) + " " + f1(lx + rad * 1.12) + " " + f1(ly2 + rad * .55) + " " + f1(lx + rad) + " " + f1(ly2 + rad * .06) + "Z";
        var veins = "";
        for (var v = 0; v < 7; v++) {
          var va = (v / 7) * Math.PI * 2;
          veins += "M" + f1(lx) + " " + f1(ly2) + "q" + f1(Math.cos(va) * rad * .4) + " " + f1(Math.sin(va) * rad * .12 - .8) + " " + f1(Math.cos(va) * rad * .8) + " " + f1(Math.sin(va) * rad * .34);
        }
        leaves += '<g class="lotus-leaf"><ellipse class="leaf-shadow" cx="' + f1(lx + 2) + '" cy="' + f1(ly2 + 3) + '" rx="' + f1(rad + 2) + '" ry="' + f1(rad * .42) + '"/><path class="leaf-pad" d="' + pad + '"/><path class="leaf-vein" d="' + veins + '"/>' +
          '<path class="leaf-rim" d="M' + f1(lx - rad * .86) + " " + f1(ly2 + rad * .12) + "q" + f1(rad * .9) + " " + f1(rad * .62) + " " + f1(rad * 1.75) + ' 0"/><ellipse class="leaf-dew" cx="' + f1(lx - rad * .35) + '" cy="' + f1(ly2 - 1.5) + '" rx="1.1" ry=".5"/></g>';
      }
      for (var f = 0; f < 2; f++) {
        var fx = px + (f ? 1 : -1) * (32 + r() * 49), fy = py - 46 - r() * 22;
        bed += "M" + f1(fx) + " " + f1(py + 2) + "q-3 10 2 21";
        stems += '<path class="lotus-stem" d="M' + f1(fx) + " " + f1(py) + "Q" + f1(fx + 6) + " " + f1((py + fy) / 2) + " " + f1(fx) + " " + f1(fy) + '"/><path class="stem-light" d="M' + f1(fx - .6) + " " + f1(py - 2) + "Q" + f1(fx + 4.5) + " " + f1((py + fy) / 2) + " " + f1(fx - .6) + " " + f1(fy + 2) + '"/>';
        flowers += '<g class="lotus-flower" transform="translate(' + f1(fx) + ' ' + f1(fy) + ')">';
        [-3, 3, -2, 2, -1, 1, 0].forEach(function (p) {
          flowers += '<g transform="rotate(' + p * 19 + ')"><path class="lotus-petal" d="M0 3C-8 -2 -8 -11 0 -20C8 -11 8 -2 0 3Z"/><path class="petal-vein" d="M0 1Q-2 -8 0 -17M-1 0Q-4 -5 -4 -9"/></g>';
        });
        flowers += '<path class="lotus-calyx" d="M-7 3Q0 8 7 3L4 7H-4Z"/><path class="lotus-stamen" d="M-3 2v-3M0 3v-5M3 2v-3"/></g>';
        reflections += '<path class="flower-reflection" d="M' + f1(fx) + " " + f1(py + 2) + "q-3 6 0 11m-6 3h12m-15 4h17m-13 4h9m-10 4h11" + '"/>';
      }
    }
    // Foreground rushes have tapered blades, a lighter rib, and brown seed heads.
    for (var x = 60; x < width; x += 220 + r() * 390) {
      var n = 3 + Math.floor(r() * 3), base = 794 + r() * 6;
      for (var i = 0; i < n; i++) {
        var h = 65 + r() * 83, lean = (r() - .45) * 54, rx = x + i * (6 + r() * 7);
        reeds += "M" + f1(rx) + " " + f1(base) + "q" + f1(lean * .3) + " " + f1(-h * .6) + " " + f1(lean) + " " + f1(-h);
        blades += "M" + f1(rx) + " " + f1(base) + "Q" + f1(rx - 8) + " " + f1(base - h * .38) + " " + f1(rx - 21 + lean * .4) + " " + f1(base - h * .72) + "Q" + f1(rx - 2) + " " + f1(base - h * .35) + " " + f1(rx + 2) + " " + f1(base) + "Z";
        if (i === 0) flowers += '<path class="reed-head" d="M' + f1(rx + lean) + ' ' + f1(base - h + 12) + 'l' + f1(-lean * .04) + ' -12"/>';
      }
    }
    return '<path class="pond-bank" d="' + bank + 'L' + width + ' 800H0Z"/><path class="bank-grain" d="' + bank + 'L' + width + ' 800H0Z"/><g class="bank-grasses">' + bankGrass + '</g>' +
      '<g class="lotus-pond"><path class="pond" d="' + waterShape + '"/><path class="pond-shallows" d="' + waterShape + '"/><path class="pond-edge" d="' + shore + '"/>' +
      '<path class="shore-waterline" d="' + shoreMarks + '"/><path class="submerged-stems" d="' + bed + '"/>' + waterLines +
      '<g id="water-light" class="water-light"><ellipse cx="0" cy="756" rx="115" ry="40" fill="url(#gWaterLight)"/><g class="water-sparkle">' + lightLines + '</g></g>' + reflections +
      '<g class="pond-koi" transform="translate(420 763)"><path d="M-14 0Q-7 -6 6 -3L14 -7L11 0L14 6L6 3Q-7 6 -14 0Z"/><path class="koi-mark" d="M-9 -2q5 -2 8 2q-4 3 -7 2Z"/></g>' +
      '<ellipse class="pond-ring" cx="420" cy="760" rx="35" ry="7"/>' + stems + leaves + flowers + '</g>' +
      '<path class="reed-blades" d="' + blades + '"/><path class="reeds" d="' + reeds + '"/>';
  }


  // ------------------------------------------------------------------
  // Stations (each drawn around its own x; ground at y = GY)
  // ------------------------------------------------------------------
  var S = {};

  // Back views stay quiet: different hair shapes, fabric folds and reflected screen light.
  function audienceFigure(seed, theater) {
    var r = rng(seed), longHair = r() > .6, lean = f1((r() - .5) * 4);
    var hair = longHair ? "M-20 4Q-25 -23 0 -23Q24 -22 21 6L25 32Q14 37 4 31Q-10 39 -25 32Z" : "M-20 3Q-23 -22 0 -23Q24 -21 20 4Q18 21 0 23Q-18 20 -20 3Z";
    return '<g class="listener" transform="rotate(' + lean + ' 0 55)">' +
      '<path class="listener-coat" d="M-40 70Q-40 40 -27 31L-10 24H10L27 31Q40 40 40 70Z" fill="url(#' + (theater ? 'gTheaterCloth' : 'gAudienceCloth') + ')"/>' +
      surface("M-39 70Q-39 40 -26 32L-10 25H10L26 32Q39 40 39 70Z", "audience") +
      '<path class="listener-folds" d="M-24 36q10 9 9 27M24 36q-10 9 -9 27M-7 29l7 8 7 -8M-31 52l-3 13M31 52l3 13"/>' +
      '<path class="listener-nape" d="M-8 16h16v11q-8 5 -16 0Z"/>' +
      '<path class="listener-hair" d="' + hair + '"/>' +
      '<path class="listener-rim" d="M-18 0Q-20 -17 -3 -20M-36 46q1 -10 9 -13"/>' +
      '<path class="listener-strands" d="M-10 -17Q-15 -4 -10 8M-3 -19Q-6 -6 -3 11M7 -16Q12 -2 9 9"/>' +
      (longHair ? '<path class="listener-strands" d="M-18 10q-2 10 1 19M14 12q4 10 2 18"/>' : '') + '</g>';
  }

  // 1. Welcome: a Tang gate hall — open red doors in the middle bay, white walls with
  // lattice windows either side, dougong under a broad roof with chiwei; a notice board.
  S.home = function () {
    var y = GY, cx = -90, studs = "";
    [-150, -49].forEach(function (x0) {
      for (var ry = 0; ry < 6; ry++) for (var rc = 0; rc < 2; rc++) studs += '<circle cx="' + f1(x0 + 5.5 + rc * 8) + '" cy="' + f1(428 + ry * 18) + '" r="1.7"/>';
    });
    return '<g class="st st-home" data-station="home">' +
      '<rect class="hit" x="-350" y="270" width="640" height="292"/>' +
      terrace(-318, 138, 544, y, 112) +
      tWall(-270, 412, 120, 132) + tWall(-30, 412, 120, 132) +
      lattice(-246, 438, 72, 58) + lattice(-6, 438, 72, 58) +
      '<path class="door-leaf" d="M-150 412H-131V544H-150ZM-49 412H-30V544H-49Z"/>' +
      surface("M-149 413H-132V543H-149ZM-48 413H-31V543H-48Z", "paint") +
      '<path class="object-shade" d="M-131 412l9 5V538h-9ZM-49 412l6 7V538h-6Z"/>' +
      '<g class="door-stud">' + studs + "</g>" +
      '<path class="sill" d="M-131 538H-49V544H-131Z"/>' +
      columns([-270, -150, -30, 90], 412, 544) +
      architrave(-282, 102, 404) +
      dougong(-270, 90, 386, 60) +
      tangRoof(cx, 387, 252, 76) +
      '<g class="plaque" transform="translate(' + cx + ' 386)"><rect x="-60" y="0" width="120" height="25" rx="2"/><text x="0" y="18" text-anchor="middle">WELCOME</text></g>' +
      '<g class="hanging-lantern" transform="translate(120 398)"><path class="rope" d="M0 -2V10"/><circle class="lantern-glow" cx="0" cy="28" r="30"/><ellipse class="lantern-body" cx="0" cy="28" rx="11" ry="15"/><path class="lantern-ribs" d="M0 14V42M-5 15Q-10 28 -5 41M5 15Q10 28 5 41"/><path class="lantern-rim" d="M-6 13h12M-6 43h12"/><path class="lantern-tassel" d="M0 44V54m-2 -1v4m4 -4v4"/></g>' +
      // notice board with a small Tang roof
      '<g class="board" data-open="news" transform="translate(205 0)">' +
        '<path class="post" d="M-54 ' + y + 'V442M54 ' + y + 'V442"/>' +
        tangRoof(0, 444, 76, 22, { chiwei: 8, top: 0.5 }) +
        '<rect class="board-face" x="-62" y="448" width="124" height="72" rx="3"/>' +
        surface(box(-61, 449, 122, 70), "wood") +
        '<path class="object-edge" d="M-58 451H58"/>' +
        '<text class="board-title" x="0" y="465" text-anchor="middle">NEWS</text>' +
        '<g class="notes"><rect x="-52" y="473" width="30" height="36" transform="rotate(-4 -37 491)"/><rect x="-14" y="471" width="30" height="40" transform="rotate(3 1 491)"/><rect x="24" y="474" width="28" height="34" transform="rotate(-2 38 491)"/></g>' +
        '<path class="paper-fold" d="M-29 503l7 -1 -7 7ZM9 505l7 -1 -7 7ZM46 502h6l-6 6Z"/>' +
        '<g class="pins"><circle cx="-37" cy="476" r="2.6"/><circle cx="1" cy="474" r="2.6"/><circle cx="38" cy="477" r="2.6"/></g>' +
        '<path class="note-lines" d="M-47 485h20M-47 491h16M-47 497h19M-9 483h20M-9 489h18M-9 495h14M-9 501h19M29 486h18M29 492h14M29 498h17"/>' +
      "</g>" +
    "</g>";
  };

  // 2. Research: a two-tier pavilion library; every book is a paper.
  S.research = function (pubs, themes) {
    var y = GY, books = "", order = themes.map(function (t) { return t.id; });
    var sorted = pubs.slice().sort(function (a, b) { return order.indexOf(a.theme) - order.indexOf(b.theme) || (a.date < b.date ? 1 : -1); });
    var colors = {}; themes.forEach(function (t) { colors[t.id] = t.color; });
    var rows = [[], [], []];
    // shelf rows: agents + teaming | persona + platforms | education
    sorted.forEach(function (p) {
      var row = (p.theme === "agents" || p.theme === "teaming") ? 0 : (p.theme === "persona" || p.theme === "platforms") ? 1 : 2;
      rows[row].push(p);
    });
    var r = rng(97);
    var shelfY = [436, 482, 528];
    rows.forEach(function (row, i) {
      var x = -176, prev = null;
      row.forEach(function (p) {
        if (prev && prev !== p.theme) x += 9;
        var w = 16 + Math.floor(r() * 6), h = 32 + Math.floor(r() * 9), tilt = (r() < 0.12) ? -5 : 0;
        books += '<g class="book" data-paper="' + p.id + '" style="--bc:' + colors[p.theme] + '" transform="translate(' + x + " " + shelfY[i] + (tilt ? ") rotate(" + tilt : "") + ')">' +
          '<title>' + esc(p.title) + '</title><g class="book-in">' +
          '<rect x="0" y="' + (-h) + '" width="' + w + '" height="' + h + '" rx="1.5"/>' +
          '<path class="book-cloth" d="M1 ' + (-h + 1) + 'h' + (w - 2) + 'v' + (h - 2) + 'H1Z"/>' +
          '<path class="book-shade" d="M' + (w - 4) + ' ' + (-h + 1) + 'h3v' + (h - 2) + 'h-3ZM1 -3h' + (w - 2) + 'v2H1Z"/>' +
          '<path class="book-ridge" d="M4 ' + (-h + 2) + 'q-1 ' + Math.floor(h / 2) + ' 0 ' + (h - 4) + '"/>' +
          '<path class="book-spine" d="M2 ' + (-h + 1) + 'V-1"/><path class="book-leaf" d="M' + (w - 2) + ' ' + (-h + 2) + 'h-6"/>' +
          '<path d="M3 ' + (-h + 6) + "h" + (w - 6) + "M3 " + (-8) + "h" + (w - 6) + '"/>' +
          '<path class="book-title" d="M7 ' + (-h + 13) + 'h' + Math.max(3, w - 12) + 'M7 ' + (-h + 16) + 'h' + Math.max(2, w - 14) + '"/>' +
          "</g></g>";
        x += w + 2; prev = p.theme;
      });
      // shelf-end ornaments
      if (i === 1) books += '<g class="vase" transform="translate(150 ' + shelfY[i] + ')"><ellipse class="small-contact" cx="0" cy="1" rx="11" ry="2"/><path class="vase-body" d="M-8 0C-14 -10 -10 -20 -4 -24V-30H4V-24C10 -20 14 -10 8 0Z"/><path class="ceramic-speckle" d="M-8 0C-14 -10 -10 -20 -4 -24V-30H4V-24C10 -20 14 -10 8 0Z"/><ellipse class="vase-mouth" cx="0" cy="-30" rx="4.5" ry="1.4"/><path class="ceramic-glint" d="M-5 -22Q-11 -14 -8 -7"/><path class="vase-band" d="M-10 -11q10 3 20 0M-9 -9q9 2 18 0"/><path class="twig" d="M0 -30C-2 -40 -8 -46 -14 -48M0 -32C3 -42 9 -46 15 -46M-5 -41l2 -8M7 -43l4 4"/><path class="vase-buds" d="M-14 -48q-4 -7 -7 -3q0 5 7 3ZM-3 -49q1 -6 4 -4q1 4 -4 4ZM15 -46q4 -6 7 -2q-1 4 -7 2Z"/></g>';
      if (i === 2) books += '<g class="scrolls" transform="translate(-60 ' + shelfY[i] + ')"><ellipse class="small-contact" cx="36" cy="1" rx="38" ry="2"/><rect x="0" y="-12" width="70" height="12" rx="6"/><rect x="10" y="-24" width="62" height="12" rx="6"/><circle cx="4" cy="-6" r="3"/><circle cx="14" cy="-18" r="3"/><path class="scroll-rings" d="M2 -6q2 -3 4 0q-2 2 -4 0ZM12 -18q2 -3 4 0q-2 2 -4 0Z"/><path class="scroll-thread" d="M44 -23v10m-3 -9q3 -2 6 0M35 -11v10m-3 -9q3 -2 6 0"/><path class="paper-crease" d="M22 -20h18M12 -9h17M51 -5h12"/></g>' +
        '<g class="plant" transform="translate(130 ' + shelfY[i] + ')"><ellipse class="small-contact" cx="0" cy="1" rx="12" ry="2"/><path class="planter-body" d="M-10 -14Q0 -11 10 -14L7 0H-7Z"/><path class="ceramic-speckle" d="M-10 -14Q0 -11 10 -14L7 0H-7Z"/><ellipse class="planter-rim" cx="0" cy="-14" rx="10" ry="2.4"/><ellipse class="pot-soil" cx="0" cy="-14" rx="8" ry="1.5"/><path class="leaf" d="M0 -14C-9 -19 -21 -20 -23 -30C-11 -31 -4 -23 0 -14ZM0 -14C3 -30 14 -39 24 -34C23 -25 9 -22 0 -14ZM0 -14C-5 -21 -11 -34 -5 -43C3 -36 5 -23 0 -14ZM0 -15C-9 -12 -18 -15 -17 -21C-9 -25 -4 -20 0 -15Z"/><path class="plant-veins" d="M-20 -28Q-8 -25 0 -14M21 -32Q10 -29 0 -14M-5 -39Q0 -26 0 -14M-14 -19L0 -15"/><path class="planter-wear" d="M-6 -9v5M-7 -2H5"/></g>';
    });
    var shelves = shelfY.map(function (sy) {
      return '<path class="shelf-shadow" d="M-186 ' + (sy + 5) + 'h372v7h-372Z"/>' +
        '<rect class="shelf" x="-186" y="' + sy + '" width="372" height="6" rx="1"/>' +
        surface(box(-185, sy + 1, 370, 4), "wood") +
        '<path class="object-edge" d="M-184 ' + (sy + 1) + 'h368"/>';
    }).join("");
    return '<g class="st st-research" data-station="research">' +
      '<rect class="hit" x="-300" y="110" width="600" height="452"/>' +
      terrace(-264, 264, 536, y, 120) +
      '<rect class="interior" x="-200" y="388" width="400" height="148"/>' +
      '<path class="alcove-shadow" d="M-200 388H200V402H-188V536H-200Z"/>' +
      '<path class="plaster-crack" d="M124 388l-2 8 3 6 -3 8"/>' +
      shelves + books +
      columns([-206, 206], 388, 536) +
      architrave(-222, 222, 380) +
      dougong(-206, 206, 362, 69) +
      tangRoof(0, 363, 292, 40, { top: 0.58, skirt: true }) +
      tWall(-160, 262, 320, 64) +
      lattice(-150, 272, 44, 44) + lattice(106, 272, 44, 44) +
      '<g class="plaque" transform="translate(0 280)"><rect x="-78" y="0" width="156" height="30" rx="3"/><text x="0" y="21" text-anchor="middle">RESEARCH</text></g>' +
      architrave(-172, 172, 254) +
      dougong(-160, 160, 237, 53) +
      tangRoof(0, 238, 222, 62) +
    "</g>";
  };

  // 3. Talks: a lecture stage — screen cycling through title slides, a podium,
  // audience seats in front, and posters on easels.
  S.talks = function (videos, posters) {
    var y = GY;
    var slides = videos.map(function (v, i) {
      return '<image class="slide slide-' + i + '" href="' + esc(v.thumb) + '" x="-246" y="334" width="282" height="159" preserveAspectRatio="xMidYMid slice" style="animation-delay:' + (i * 4) + 's"/>';
    }).join("");
    var seats = "", r = rng(131);
    for (var row = 0; row < 2; row++) {
      for (var sx = -300 + row * 18; sx < 150; sx += 38) {
        var sy = 600 + row * 34;
        seats += '<rect class="seat" x="' + sx + '" y="' + sy + '" width="30" height="26" rx="6"/><path class="seat-seam" d="M' + (sx + 3) + ' ' + (sy + 23) + 'v-16q0 -4 4 -4h16q4 0 4 4v16"/>';
        if (r() < 0.62) seats += '<g class="audience" transform="translate(' + (sx + 15) + ' ' + (sy - 9) + ') scale(.43)">' + audienceFigure(sx + row * 313, false) + '</g>';
      }
    }
    var easel = function (x, p, w, h) {
      return '<g class="easel" data-poster="' + esc(p.paper) + '" transform="translate(' + x + ' 0)"><title>Poster · ' + esc(p.venue) + "</title>" +
        '<path class="easel-legs" d="M0 ' + (y - h - 30) + "L-" + (w / 2 + 6) + " " + y + "M0 " + (y - h - 30) + "L" + (w / 2 + 6) + " " + y + "M0 " + (y - h - 30) + "L0 " + y + '"/>' +
        '<rect class="easel-board" x="' + (-w / 2 - 4) + '" y="' + (y - h - 44) + '" width="' + (w + 8) + '" height="' + (h + 8) + '" rx="2"/>' +
        '<image href="' + esc(p.thumb) + '" x="' + (-w / 2) + '" y="' + (y - h - 40) + '" width="' + w + '" height="' + h + '" preserveAspectRatio="xMidYMid slice"/>' +
        '<rect class="easel-ledge" x="' + (-w / 2 - 8) + '" y="' + (y - 36) + '" width="' + (w + 16) + '" height="5"/></g>';
    };
    return '<g class="st st-talks" data-station="talks">' +
      '<rect class="hit" x="-370" y="180" width="740" height="470"/>' +
      '<rect class="hall-wall" x="-330" y="296" width="470" height="244"/>' +
      surface(box(-329, 297, 468, 242), "plaster") +
      '<path class="alcove-shadow" d="M-330 296H140V314H-318V540H-330Z"/>' +
      '<path class="stage" d="M-364 540H174V' + y + 'H-364Z"/><path class="stage-edge" d="M-364 540H174"/>' +
      surface(box(-363, 541, 536, 18), "wood") +
      '<path class="timber-grain" d="M-340 553q84 -3 161 0m14 -1q46 2 90 -1m18 2h50"/>' +
      '<g class="screen-talk"><rect class="screen-frame" x="-252" y="328" width="294" height="171" rx="3"/>' + slides +
        '<path class="screen-glare" d="M-246 334L-190 334L-246 380Z"/></g>' +
      '<path class="beam" d="M-105 505L-80 540H-130Z"/>' +
      '<g class="podium" transform="translate(100 0)"><path class="podium-body" d="M-24 ' + y + 'L-20 474H20L24 ' + y + 'Z"/><path class="podium-top" d="M-28 474L-24 464H24L28 474Z"/>' +
        '<path class="mic" d="M-6 464Q-8 450 -18 446"/><circle class="mic-head" cx="-19" cy="445" r="3"/><rect class="podium-badge" x="-10" y="492" width="20" height="14" rx="2"/></g>' +
      surface("M77 559L81 475H119L123 559Z", "wood") +
      '<path class="object-shade" d="M116 474h4l4 86h-9Z"/>' +
      '<path class="curtain" d="M-338 290H-296C-300 360 -292 460 -300 548H-338Z"/><path class="curtain" d="M106 290H148V548H112C104 460 112 360 106 290Z"/>' +
      surface("M-338 290H-296C-300 360 -292 460 -300 548H-338ZM106 290H148V548H112C104 460 112 360 106 290Z", "cloth") +
      '<path class="cloth-shadow" d="M-329 291q-5 122 -1 257h9q-4 -125 0 -257ZM-309 291q-5 122 -1 257h7q-3 -125 1 -257ZM116 291q7 128 0 257h9q6 -134 -1 -257ZM137 291q-4 122 1 257h6q-5 -135 0 -257Z"/>' +
      '<path class="curtain-folds" d="M-326 300V540M-314 300V544M114 300V540M128 300V544"/>' +
      columns([-346, 156], 296, 540) +
      architrave(-356, 166, 288) +
      dougong(-346, 156, 270, 63) +
      tangRoof(-95, 271, 300, 62) +
      '<g class="plaque" transform="translate(-95 298)"><rect x="-86" y="0" width="172" height="26" rx="3"/><text x="0" y="18" text-anchor="middle">TALKS &amp; POSTERS</text></g>' +
      (posters[0] ? easel(228, posters[0], 96, 72) : "") +
      (posters[1] ? easel(328, posters[1], 70, 80) : "") +
      '<g class="seats">' + seats + "</g>" +
    "</g>";
  };

  // 4. Education: three stone steles along a rising path — Davis, Georgetown, Lehigh.
  S.education = function () {
    var y = GY;
    function stele(x, base, deg, school, emblem) {
      return '<g class="stele" transform="translate(' + x + " " + base + ')">' + emblem +
        '<path class="stone" d="M-40 0V-78Q-40 -100 0 -102Q40 -100 40 -78V0Z"/>' +
        surface("M-39 -1V-78Q-39 -99 0 -101Q39 -99 39 -78V-1Z", "stone") +
        '<path class="object-shade" d="M28 -94Q40 -90 40 -78V0H30V-76Q30 -88 28 -94Z"/>' +
        '<path class="stone-joint" d="M-30 -94l2 7 -3 5 3 6M34 -18l-5 3 -3 8M-34 -7l10 -1"/>' +
        '<path class="object-edge" d="M-37 -78Q-37 -96 -3 -99"/>' +
        '<text class="stele-deg" x="0" y="-62" text-anchor="middle">' + deg + '</text>' +
        '<text class="stele-school" x="0" y="-40" text-anchor="middle">' + school + '</text>' +
        '<path class="stele-base" d="M-48 0V-8H48V0Z"/></g>';
    }
    var bike = '<g class="emblem" transform="translate(-84 -4)"><circle cx="-14" cy="-14" r="12"/><circle cx="18" cy="-14" r="12"/><path d="M-14 -14L-2 -34H14L18 -14M-2 -34L4 -14H-14M14 -34L10 -42H4M-4 -38H4"/></g>';
    var tower = '<g class="emblem" transform="translate(-78 0)"><path d="M-12 0V-60H12V0ZM-16 -60H16L0 -96Z"/><circle cx="0" cy="-44" r="6"/><path d="M0 -44V-48M0 -44H3"/></g>';
    var mountain = '<g class="emblem" transform="translate(-84 0)"><path d="M-44 0L-8 -70L10 -44L22 -58L50 0Z"/><path d="M-8 -70V-96L10 -90L-8 -84"/></g>';
    var stones = "";
    [[-170, 3], [-120, 1], [-50, -4], [20, -9], [110, -16], [160, -20]].forEach(function (s) { stones += '<ellipse cx="' + s[0] + '" cy="' + (y + s[1] + 2) + '" rx="18" ry="5"/>'; });
    return '<g class="st st-education" data-station="education">' +
      '<rect class="hit" x="-330" y="380" width="660" height="182"/>' +
      gshadow(-200, 52) +
      '<path class="hill" d="M-330 ' + y + 'C-200 ' + y + ' -120 552 0 546C120 540 200 528 330 526V' + (y + 30) + 'H-330Z"/>' +
      '<g class="stepping">' + stones + "</g>" +
      stele(-200, y, "B.S.", "UC Davis", bike) +
      stele(40, 546, "M.S.", "Georgetown", tower) +
      stele(270, 527, "Ph.D.", "Lehigh", mountain) +
      '<path class="sign-post" d="M-360 392V' + y + 'M-360 392H-190"/>' +
      sign(-270, 420, "EDUCATION", 150) +
    '</g>';
  };

  // 5. Tutorials: the typewriter from the old tutorials page, with paper slips.
  S.tutorials = function (tutorials) {
    var y = GY, keys = "";
    var keyLabels = ["QWERTYUIO", "ASDFGHJK", "ZXCVBNM"];
    for (var row = 0; row < 3; row++) for (var k = 0; k < 9 - row; k++) {
      var kx = -80 + row * 10 + k * 20, ky = [486, 500, 513][row];
      keys += '<g class="tw-key"><circle class="key-rim" cx="' + kx + '" cy="' + (ky + 1.5) + '" r="6.7"/><circle class="key-face" cx="' + kx + '" cy="' + ky + '" r="5.7"/><path class="key-glint" d="M' + (kx - 3.5) + ' ' + (ky - 2) + 'q3 -3 6 0"/><text class="key-letter" x="' + kx + '" y="' + (ky + 1.8) + '" text-anchor="middle">' + keyLabels[row][k] + '</text></g>';
    }
    var slips = "", pos = [[-150, 300, -12], [-60, 262, -4], [50, 268, 6], [150, 306, 13]];
    tutorials.forEach(function (t, i) {
      var p = pos[i % pos.length];
      slips += '<g class="slip" data-tutorial="' + t.id + '" transform="translate(' + p[0] + " " + p[1] + ") rotate(" + p[2] + ')"><g class="slip-float" style="animation-delay:' + (i * -0.9) + 's">' +
        '<rect x="-38" y="-18" width="76" height="36" rx="2"/><text x="0" y="6" text-anchor="middle">' + esc(t.label) + '</text></g><title>' + esc(t.title) + '</title></g>';
    });
    var deskTools = '<g class="tutorial-tools"><path class="ink-bottle" d="M-160 520V511Q-160 508 -157 508H-151Q-148 508 -148 511V520Z"/><path class="ink-bottle-glint" d="M-158 513v5"/><path class="ink-cap" d="M-158 505h8v4h-8Z"/><path class="ribbon-tin" d="M143 513h19v6q-9 4 -19 0Z"/><ellipse class="ribbon-rim" cx="152.5" cy="513" rx="9.5" ry="3"/><path class="ribbon-label" d="M148 513h9"/></g>';

    return '<g class="st st-tutorials" data-station="tutorials">' +
      '<rect class="hit" x="-230" y="230" width="460" height="332"/>' +
      gshadow(0, 182) +
      // The same walnut joinery as the writing desk, with the landscape left open.
      '<g class="tutorial-bench"><path class="desk-top" d="M-180 522L-170 516H170L180 522Z"/>' + surface("M-179 521L-170 517H170L179 521Z", "wood") +
        '<path class="desk" d="M-180 522H180V534H-180ZM-164 534V560H-150V539H150V560H164V534Z"/>' + surface("M-179 523H179V533H-179ZM-163 535V559H-151V538H151V559H163V535Z", "wood") +
        '<path class="object-edge" d="M-177 523H177"/><path class="object-shade" d="M-151 534H151v5H-151Z"/><path class="desk-joints" d="M-163 535h12v4h-12M151 535h12v4h-12"/><path class="bench-drawer" d="M-58 524H58V532H-58Z"/><circle class="bench-handle" cx="0" cy="528" r="1.6"/></g>' +
      '<g class="sheet"><path d="M-62 440V344Q-62 340 -58 340H58Q62 340 62 344V440Z"/><text x="0" y="372" text-anchor="middle">Tutorials</text><path class="sheet-lines" pathLength="1" d="M-44 390H40M-44 402H30M-44 414H36"/></g>' +
      '<path class="paper-fold" d="M50 341h10v10Z"/>' +
      '<path class="tw-body" d="M-128 522V470Q-128 452 -110 448L-80 440H80L110 448Q128 452 128 470V522Z"/>' +
      '<path class="tw-enamel" d="M-124 481h248v37h-248Z"/><path class="tw-side-shade" d="M104 452q20 5 20 20v47h-14v-49q0 -10 -6 -18Z"/>' +
      '<path class="metal-highlight" d="M-120 468q1 -9 13 -12l25 -7M-117 513H110M92 452l17 5"/><path class="metal-wear" d="M-112 473l4 -2M105 495l7 -1M-96 518h6M114 464l-2 3"/>' +
      '<path class="tw-arc" d="M-60 458Q0 420 60 458"/>' +
      '<path class="tw-typebars" d="M-48 454l11 -6M-35 447l7 -5M-20 442l3 -5M0 440v-7M20 442l-3 -5M35 447l-7 -5M48 454l-11 -6"/>' +
      '<g class="tw-keys">' + keys + "</g>" +
      '<path class="tw-carriage" d="M-120 430H120V444H-120Z"/>' +
      '<path class="tw-roller" d="M-116 435H116V440H-116Z"/><path class="tw-rail" d="M-119 431H118M-108 443H108"/><path class="tw-paper-guide" d="M-50 430v-8h5v8M45 430v-8h5v8"/>' +
      '<circle class="tw-knob" cx="-128" cy="437" r="10"/><circle class="tw-knob" cx="128" cy="437" r="10"/>' +
      '<path class="tw-knob-rings" d="M-132 430q-7 7 0 14M-128 429q-7 8 0 16M124 430q-7 7 0 14M128 429q-7 8 0 16"/><path class="tw-space" d="M-51 520H51"/><g class="tw-screws"><circle cx="-116" cy="476" r="1.8"/><circle cx="116" cy="476" r="1.8"/><path d="M-117 476h2M115 476h2"/></g>' +
      '<path class="tw-lever" d="M-138 432L-170 410"/>' +
      deskTools + slips +
    '</g>';
  };

  // 6. Writing: a low desk with scroll, ink stone and brushes; paper cranes are the GPTs.
  S.writing = function (gpts) {
    var y = GY, cranes = "";
    gpts.forEach(function (g, i) {
      var x = -150 + i * 60, cy = 300 + (i % 2) * 26;
      cranes += '<g class="crane" data-gpt="' + i + '" transform="translate(' + x + " " + cy + ')"><path class="crane-thread" d="M0 ' + (-(cy - 250)) + 'V-8"/>' +
        '<g class="crane-bob" style="animation-delay:' + (i * -0.7) + 's"><path class="crane-body" d="M-16 4L0 -8L16 4L4 2L0 10L-4 2Z"/><path class="crane-wing" d="M-2 -4L-14 -16L2 -2ZM2 -4L12 -18L4 -1Z"/></g><title>' + esc(g.name) + "</title></g>";
    });
    return '<g class="st st-writing" data-station="writing">' +
      '<rect class="hit" x="-230" y="240" width="460" height="322"/>' +
      gshadow(0, 170) +
      '<path class="sign-support" d="M-239 560L-235 248L-228 242L-223 248L-227 560Z"/>' + surface("M-238 559L-234 249L-230 246L-231 559Z", "wood") +
      '<path class="bark-line" d="M-234 550L-231 277M-233 482l2 -12M-232 350l2 -13"/>' +
      '<path class="branch" d="M-230 250C-120 238 40 246 200 232M120 240C140 226 160 222 180 222"/>' +
      '<path class="bark-line" d="M-224 248Q-137 240 -46 244M28 242l43 -2M125 237l35 -3"/>' +
      '<path class="leafs" d="M180 222c6 -8 16 -8 20 -4c-8 4 -14 6 -20 4zM150 236c4 -8 14 -10 18 -6c-6 4 -12 6 -18 6z"/>' +
      cranes +
      sign(-170, 262, "WRITING", 130, [-13, -20]) +
      // Carved walnut rails and silk paintings: Tang-inspired lotus rosettes, not flat panels.
      '<g class="pingfeng">' + [-148, -74, 0, 74].map(function (x, i) {
        var carving = "";
        [396, 491].forEach(function (cy) {
          var petals = "";
          for (var petal = 0; petal < 6; petal++) petals += '<path transform="rotate(' + petal * 60 + ' 0 0)" d="M0 0Q-5 -2 0 -7Q5 -2 0 0Z"/>';
          carving += '<g class="pf-carving" transform="translate(' + (x + 37) + ' ' + cy + ')">' + petals + '<path d="M-7 0q-5 -7 -10 -3q-4 5 3 5q3 -2 0 -4M7 0q5 -7 10 -3q4 5 -3 5q-3 -2 0 -4M-18 0l-8 0M18 0h8"/></g>';
        });
        return '<g class="pf-fold"><rect class="pf-frame" x="' + x + '" y="382" width="74" height="120" rx="2"/>' +
          surface(box(x + 1, 383, 72, 117), "wood") +
          '<path class="pf-bevel" d="M' + (x + 2) + ' 500V384H' + (x + 72) + 'M' + (x + 7) + ' 479V408H' + (x + 67) + '"/>' +
          '<rect class="pf-panel" x="' + (x + 8) + '" y="409" width="58" height="70"/>' +
          surface(box(x + 9, 410, 56, 68), "cloth") + carving +
          '<path class="screen-hinge" d="M' + (x + 72) + ' 411v8m0 47v8"/>' +
          '<path class="pf-land" d="M' + (x + 9) + ' 476Q' + (x + 20) + ' ' + (444 - i * 4) + ' ' + (x + 32) + ' 466Q' + (x + 45) + ' ' + (442 + i * 5) + ' ' + (x + 65) + ' 473V478H' + (x + 9) + 'Z"/>' +
          '<path class="pf-ink" d="M' + (x + 12) + ' 476Q' + (x + 21) + ' ' + (450 - i * 4) + ' ' + (x + 32) + ' 468Q' + (x + 45) + ' ' + (446 + i * 5) + ' ' + (x + 63) + ' 473"/>' +
          (i === 1 ? '<circle class="pf-sun" cx="' + (x + 52) + '" cy="425" r="5"/>' : "") +
          (i === 2 ? '<path class="pf-ink" d="M' + (x + 12) + ' 425q6 -4 12 0M' + (x + 20) + ' 430q5 -3 9 0"/>' : "") +
          '<rect class="pf-seal" x="' + (x + 13) + '" y="416" width="3" height="5"/></g>';
      }).join("") + "</g>" +
      '<path class="desk-top" d="M-160 500L-151 494H151L160 500Z"/>' +
      surface("M-159 499L-151 495H151L159 499Z", "wood") +
      '<path class="desk" d="M-160 500H160V512H-160ZM-146 512V' + y + 'H-132V522H132V' + y + 'H146V512Z"/>' +
      surface("M-159 501H159V511H-159ZM-145 513V559H-133V521H133V559H145V513Z", "wood") +
      '<path class="object-edge" d="M-157 501H156"/><path class="object-shade" d="M-145 513H145v6H-145Z"/><path class="desk-carving" d="M-131 518q10 14 23 6h216q13 8 23 -6M-136 540v14h-5M136 540v14h5M-153 506H153"/><path class="desk-joints" d="M-145 514h12v5h-12M133 514h12v5h-12"/>' +
      '<g class="scroll"><rect x="-120" y="484" width="150" height="16"/><rect x="-126" y="481" width="10" height="22" rx="3"/><rect x="26" y="481" width="10" height="22" rx="3"/><path class="scroll-ink" d="M-104 492h24M-74 492h18"/></g>' +
      '<path class="paper-fold" d="M-115 497H24v3H-115Z"/><path class="paper-crease" d="M-114 487q24 2 45 0M-64 487q39 -2 80 0"/>' +
      // what she writes when she sits down (revealed stroke by stroke)
      '<g class="write-hello"><text class="hello-text" x="-31" y="496.6">Hello World!</text><rect class="hello-cover" x="-33" y="485.2" width="58" height="13.6"/></g>' +
      '<g class="inkstone" data-easter="ink"><rect x="46" y="488" width="34" height="12" rx="4"/><ellipse class="inkstone-rim" cx="63" cy="491" rx="14" ry="3.2"/><ellipse class="ink-pool" cx="63" cy="491" rx="11" ry="2.2"/><path class="ink-glint" d="M55 490q6 -2 12 0"/></g>' +
      '<path class="brush-cup" d="M88 486Q101 481 116 486V497Q101 503 88 497Z"/><ellipse class="brush-cup-rim" cx="102" cy="486" rx="14" ry="3"/>' +
      '<g class="brushes"><path d="M92 500V476M102 500V470M112 500V478"/><path class="brush-tip" d="M92 476l-2 -9h4zM102 470l-2 -9h4zM112 478l-2 -9h4z"/><path class="brush-grain" d="M91.6 481V493M101.6 474V493M111.6 483V493"/><path class="brush-fibres" d="M91 475l1 -7 1 7M101 469l1 -7 1 7M111 477l1 -7 1 7"/></g>' +
      '<g class="lamp" transform="translate(138 500)"><circle class="lamp-glow" cx="0" cy="-26" r="36"/><path d="M-10 0h20l-4 -8h-12z"/><path class="flame" d="M0 -26C-5 -18 -4 -12 0 -10C4 -12 5 -18 0 -26Z"/><path d="M-5 -8V-12H5V-8Z"/></g>' +
      '<ellipse class="cushion" cx="-60" cy="' + (y - 4) + '" rx="46" ry="9"/>' +
      '<ellipse class="material material-cloth" cx="-60" cy="' + (y - 4) + '" rx="45" ry="8"/>' +
      '<path class="fabric-seam" d="M-101 557q43 11 81 0"/>' +
    '</g>';
  };

  // 7. Life: suitcase (travel), stove and pot (cooking), a sleeping cat, and a film screen (movies).
  S.life = function (catThumbs) {
    var y = GY;
    var slides = (catThumbs || []).map(function (src, i, all) {
      return '<image class="cat-slide" href="' + esc(src) + '" x="74" y="' + (y - 152) + '" width="82" height="76" preserveAspectRatio="xMidYMid slice" style="animation-duration:' + (all.length * 2.5) + 's;animation-delay:' + (i * 2.5) + 's"/>';
    }).join("");
    return '<g class="st st-life" data-station="life">' +
      '<rect class="hit" x="-320" y="300" width="640" height="262"/>' +
      gshadow(-250, 36) + gshadow(-130, 32) + gshadow(130, 34) + gshadow(247, 22) +
      sign(-120, 330, "LIFE", 100, [-36, -37]) +
      '<path class="sign-support" d="M-309 560L-305 296L-299 289L-293 295L-298 560Z"/>' + surface("M-308 559L-304 297L-300 292L-302 559Z", "wood") +
      '<path class="bark-line" d="M-304 550L-301 314M-303 483l2 -12M-302 374l2 -18"/>' +
      '<path class="branch" d="M-300 300C-200 290 -60 296 40 288"/>' +
      '<path class="bark-line" d="M-297 297Q-224 291 -161 293M-120 292q48 0 77 -2"/>' +
      // suitcase
      '<g class="life-item suitcase" data-life="travel" transform="translate(-250 ' + y + ')"><title>Travel</title>' +
        '<path class="case-side" d="M28 -62l7 4v54l-7 3Z"/><rect class="case" x="-32" y="-64" width="64" height="62" rx="7"/><path class="material material-leather" d="M-30 -62H27Q30 -62 30 -59V-7Q30 -4 27 -4H-27Q-30 -4 -30 -7Z"/><path class="case-corners" d="M-31 -55q0 -8 8 -8M23 -63q8 0 8 8M-31 -12q0 9 8 9M23 -3q8 0 8 -9"/><path class="object-shade" d="M26 -60h4v52q0 4 -7 4H-25v-3h48q3 0 3 -4Z"/><path class="case-handle" d="M-12 -64V-74H12V-64"/><path class="case-strap" d="M-18 -63V-3M18 -63V-3"/><path class="case-stitch" d="M-20 -59V-6M20 -59V-6"/>' +
        '<path class="case-seam" d="M-23 -60h44q7 0 7 7v40q0 7 -7 7h-43M-29 -54v42"/><path class="leather-wear" d="M-26 -61l8 1M27 -13l-1 5 -7 2M-28 -7l7 2"/>' +
        '<path class="case-buckles" d="M-21 -45h8v10h-8ZM13 -45h8v10h-8Z"/>' +
        '<circle class="sticker s1" cx="-8" cy="-20" r="7"/><path class="sticker-ink" d="M-12 -17l4 -8 4 8M-11 -17h6"/><rect class="sticker s2" x="6" y="-30" width="16" height="11" rx="2" transform="rotate(10 14 -24)"/><path class="sticker s3" d="M-2 -54l5 9h-10z"/></g>' +
      // stove + pot with steam
      '<g class="life-item stove" data-life="food" transform="translate(-130 ' + y + ')"><title>Cooking</title>' +
        '<g class="steam"><path d="M-8 -80c-8 -10 8 -16 0 -28"/><path d="M6 -84c-8 -10 8 -16 0 -28"/><path d="M18 -78c-6 -8 6 -14 0 -22"/></g>' +
        '<path class="stove-body" d="M-28 0V-34H28V0Z"/><rect class="stove-fire" x="-14" y="-28" width="28" height="12" rx="3"/>' +
        '<path class="pot" d="M-29 -61Q0 -67 29 -61V-42Q27 -34 0 -34Q-27 -34 -29 -42Z"/><path class="pot-rim" d="M-29 -61Q0 -54 29 -61M-28 -40Q0 -33 28 -40"/><path class="pot-brushing" d="M-23 -54q22 4 43 0M-22 -51q20 4 43 0M-21 -46q20 4 43 0"/><path class="object-shade" d="M18 -62Q30 -60 30 -44V-36H21Q25 -45 18 -62Z"/><path class="metal-highlight" d="M-25 -43q0 -13 16 -17M-26 -37H23"/><path class="pot-handle" d="M-29 -50q-11 -4 -11 4q0 7 11 4M29 -50q11 -4 11 4q0 7 -11 4"/><g class="pot-lid-group"><path class="pot-lid" d="M-31 -63Q0 -83 31 -63Q0 -57 -31 -63Z"/><path class="pot-rim" d="M-27 -64Q0 -78 25 -64"/><path class="lid-knob" d="M-5 -74v-4q5 -4 10 0v4Z"/></g><path class="stove-details" d="M-25 -4h50M-22 -33h44M-23 -28h4M19 -28h4"/><circle class="stove-knob" cx="20" cy="-12" r="3"/></g>' +
      // cushion + sleeping cat
      '<g class="life-item nap" data-life="cats" transform="translate(10 0)"><title>Cats</title>' +
        '<ellipse class="cushion" cx="0" cy="' + (y - 6) + '" rx="62" ry="16"/><ellipse class="material material-cloth" cx="0" cy="' + (y - 6) + '" rx="60" ry="14"/><path class="cushion-piping" d="M-58 ' + (y - 6) + 'q58 22 116 0"/>' + sleepingCat(0, y - 16) + '</g>' +
      // projector + screen
      '<g class="life-item cinema" data-life="cats" transform="translate(170 0)"><title>Cat gallery</title>' +
        '<path class="beam-light" d="M-40 ' + (y - 58) + 'L70 ' + (y - 150) + 'V' + (y - 60) + 'Z"/>' +
        '<path class="pole" d="M68 ' + y + 'V' + (y - 164) + 'M162 ' + y + 'V' + (y - 164) + '"/>' +
        '<rect class="screen" x="70" y="' + (y - 156) + '" width="90" height="100"/>' +
        (slides || '<g class="screen-cat" transform="translate(88 ' + (y - 140) + ') scale(.6)"><path d="M31 68C20 68 19 51 28 43C34 38 51 38 57 44C65 52 63 68 53 68Z"/><ellipse cx="47" cy="26" rx="20" ry="17"/><path d="M30 17L29 4L40 12ZM55 12L66 5L65 18Z"/></g>') +
        '<rect class="screen-edge" x="74" y="' + (y - 152) + '" width="82" height="76"/>' +
        '<text class="screen-label" x="115" y="' + (y - 64) + '" text-anchor="middle">6 CATS</text>' +
        '<path class="tripod" d="M-40 ' + (y - 50) + 'L-58 ' + y + 'M-40 ' + (y - 50) + 'L-22 ' + y + 'M-40 ' + (y - 50) + 'V' + y + '"/>' +
        '<g class="film-projector" transform="translate(-42 ' + (y - 66) + ')"><path class="projector-side" d="M18 -14l6 4v24l-6 3Z"/><rect class="projector" x="-25" y="-14" width="45" height="30" rx="4"/>' +
        '<path class="projector-bevel" d="M-21 -11h36M-22 -9v20h36"/><path class="projector-grille" d="M-16 -6v12M-12 -6v12M-8 -6v12M-4 -6v12"/><rect class="lens-barrel" x="18" y="-6" width="9" height="13" rx="2"/><ellipse class="projector-lens" cx="27" cy=".5" rx="2.5" ry="5.5"/><path class="lens-glint" d="M27 -3q-2 3 0 5"/><circle class="projector-switch" cx="10" cy="8" r="2"/>' +
        [[-12, -26, 11], [11, -25, 9]].map(function (wheel) {
          var holes = "";
          for (var h = 0; h < 5; h++) {
            var a = h / 5 * Math.PI * 2;
            holes += '<circle cx="' + f1(Math.cos(a) * wheel[2] * .58) + '" cy="' + f1(Math.sin(a) * wheel[2] * .58) + '" r="' + f1(wheel[2] * .22) + '"/>';
          }
          return '<g class="reel-wheel" transform="translate(' + wheel[0] + ' ' + wheel[1] + ')"><circle class="reel" r="' + wheel[2] + '"/><g class="reel-spokes">' + holes + '</g><circle class="reel-hub" r="1.8"/></g>';
        }).join("") + '<path class="film-belt" d="M-15 -16l-3 4M8 -17l4 5"/></g></g>' +
    '</g>';
  };

  // 8. Contact: a post box and a signpost; the path fades into mist.
  S.contact = function () {
    var y = GY;
    return '<g class="st st-contact" data-station="contact">' +
      '<rect class="hit" x="-200" y="330" width="460" height="232"/>' +
      gshadow(-60, 22) + gshadow(110, 20) +
      '<g class="contact-tree"><path class="tree-body" d="M-288 560Q-278 488 -279 423Q-282 356 -260 304L-249 277L-241 278Q-254 309 -252 321Q-218 316 -168 317Q-93 313 15 317L34 320Q-98 323 -170 325Q-218 327 -255 335Q-263 377 -258 430Q-260 506 -268 560Z"/>' +
        surface("M-286 558Q-277 477 -277 421Q-280 354 -260 306L-252 283Q-260 318 -257 335Q-264 381 -260 434Q-262 508 -270 558Z", "wood") +
        '<path class="bark-line" d="M-279 550Q-269 476 -269 430Q-276 365 -259 317M-273 494l3 -17M-270 418l-2 -21M-250 324Q-172 317 -113 319M-92 318Q-37 318 9 320"/>' +
        '<path class="branch-twig" d="M-248 298q35 -19 68 -19M-180 318q16 -13 44 -13M-58 319q21 -17 42 -18"/>' +
        '<path class="leafs" d="M-195 280q11 -13 25 -6q-10 9 -25 6ZM-159 308q11 -13 24 -5q-11 9 -24 5ZM-29 304q12 -12 24 -5q-10 10 -24 5ZM-252 295q-12 -11 -23 -5q9 10 23 5Z"/></g>' +
      '<g class="mailbox" transform="translate(-60 0)"><path class="post" d="M0 ' + y + 'V482"/>' +
        '<path class="box" d="M-34 482V446Q-34 420 0 420Q34 420 34 446V482Z"/><path class="slot" d="M-16 440H16"/>' +
        surface("M-33 481V446Q-33 421 0 421Q33 421 33 446V481Z", "paint") +
        '<path class="object-shade" d="M15 423Q34 427 34 446V482H22V446Q22 429 15 423Z"/><path class="metal-highlight" d="M-29 444Q-29 426 -2 425M-28 476H15"/><path class="metal-wear" d="M-25 468l5 -2M-21 473l7 -1M21 456l-1 4"/><path class="slot-shadow" d="M-17 441h34v3h-34Z"/><g class="mail-rivets"><circle cx="-27" cy="451" r="1.2"/><circle cx="27" cy="451" r="1.2"/><circle cx="-27" cy="474" r="1.2"/><circle cx="27" cy="474" r="1.2"/></g>' +
        '<g class="post-letter"><rect x="-10" y="428" width="20" height="13" rx="1.6"/><path d="M-9.2 428.8L0 435.6L9.2 428.8"/></g>' +
        '<g class="flag"><path class="flag-arm" d="M30 452V426"/><path class="flag-plate" d="M30 425H46V436H30Z"/><circle class="flag-pin" cx="30" cy="452" r="2.6"/></g></g>' +
      '<g class="signpost" transform="translate(110 0)"><path class="post" d="M0 ' + y + 'V380"/>' +
        '<g class="arrow" transform="translate(0 392)"><path d="M-6 -12H64L76 0L64 12H-6Z"/><text x="30" y="5" text-anchor="middle">Scholar</text></g>' +
        '<g class="arrow" transform="translate(0 424)"><path d="M6 -12H-64L-76 0L-64 12H6Z"/><text x="-30" y="5" text-anchor="middle">LinkedIn</text></g>' +
        '<g class="arrow" transform="translate(0 456)"><path d="M-6 -12H64L76 0L64 12H-6Z"/><text x="30" y="5" text-anchor="middle">GitHub</text></g></g>' +
      sign(-60, 350, "CONTACT", 130) +
      '<text class="more" x="220" y="' + (y - 40) + '">more to come…</text>' +
    '</g>';
  };

  // ------------------------------------------------------------------
  // Life widgets (rendered inside the Life panel)
  // ------------------------------------------------------------------

  // Stylised outline of the contiguous U.S. (equirectangular, 600 x 340),
  // with two abstract loops for the two road trips around the country.
  var US_OUTLINE = "M3 28L17 20L303 20L305 14L312 20L330 42L360 33L414 52L420 62L434 97L428 106L447 106L470 99L497 83L513 72L545 72L569 41L583 45L591 73" +
    "L560 88L556 103L562 114L548 118L542 122L521 128L512 150L509 162L500 175L505 198L478 215L459 229L446 239L443 261L451 286L455 319L447 328L439 315" +
    "L430 292L417 265L403 269L384 260L377 261L362 278L355 270L341 272L317 269L307 274L281 293L283 318L259 297L224 278L188 242L171 242L141 248L105 233" +
    "L80 233L67 216L46 207L32 180L25 164L6 131L9 100L10 56Z";
  var US_LOOPS = [
    "M60 70C150 40 300 45 420 70C500 85 540 110 520 160C505 200 470 230 440 250C400 265 330 280 280 280C220 280 150 250 100 225C60 205 45 170 45 130C45 100 50 80 60 70Z",
    "M110 95C200 75 330 80 430 105C480 118 490 150 470 185C450 215 400 238 340 248C270 258 200 245 150 220C110 200 90 170 90 140C90 118 96 100 110 95Z"
  ];

  function usMap() {
    return '<svg class="roadmap" viewBox="-10 -10 620 360" role="img" aria-label="Map of the United States with two road-trip loops around the country, and pins on the East and West Coasts">' +
      '<path class="us-land" d="' + US_OUTLINE + '"/>' +
      US_LOOPS.map(function (d, i) { return '<path class="us-loop us-loop-' + i + '" d="' + d + '" pathLength="1000"/>'; }).join("") +
      '<g class="us-pin" transform="translate(34 155)"><circle r="6"/><text x="12" y="-8">West Coast</text></g>' +
      '<g class="us-pin" transform="translate(497 140)"><circle r="6"/><text x="-12" y="-10" text-anchor="end">East Coast</text></g>' +
      '<g class="us-car" transform="translate(60 70)"><rect x="-10" y="-6" width="20" height="10" rx="4"/><rect x="-5" y="-11" width="11" height="7" rx="2.5"/><circle cx="-5" cy="5" r="3"/><circle cx="6" cy="5" r="3"/></g>' +
      "</svg>";
  }

  // "Try something new" wheel — cuisines from around the world.
  function foodWheel(items) {
    var n = items.length, r = 118, out = "";
    for (var i = 0; i < n; i++) {
      var a0 = (i - 0.5) / n * 2 * Math.PI, a1 = (i + 0.5) / n * 2 * Math.PI;
      var x0 = f1(Math.sin(a0) * r), y0 = f1(-Math.cos(a0) * r), x1 = f1(Math.sin(a1) * r), y1 = f1(-Math.cos(a1) * r);
      out += '<path class="slice s' + (i % 3) + '" d="M0 0L' + x0 + " " + y0 + "A" + r + " " + r + " 0 0 1 " + x1 + " " + y1 + 'Z"/>' +
        '<text transform="rotate(' + f1(i * 360 / n) + ') translate(0 -80)" text-anchor="middle">' + esc(items[i]) + "</text>";
    }
    return '<svg class="wheel" viewBox="-130 -140 260 272" role="img" aria-label="A wheel of dishes to try">' +
      '<g class="wheel-spin">' + out + '<circle class="hub" r="16"/></g>' +
      '<path class="pointer" d="M-10 -136L10 -136L0 -114Z"/></svg>';
  }

  // Placeholder portrait for a cat whose photo isn't in yet.
  function mysteryCat() {
    return '<svg class="mystery-cat" viewBox="0 0 90 72" aria-hidden="true">' +
      '<path d="M31 68C20 68 19 51 28 43C34 38 51 38 57 44C65 52 63 68 53 68Z"/>' +
      '<path d="M30 66C14 67 9 57 15 50" stroke-width="8" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="47" cy="26" rx="20" ry="17"/><path d="M30 17L29 4L40 12ZM55 12L66 5L65 18Z"/>' +
      '<text x="47" y="33" text-anchor="middle">?</text></svg>';
  }

  window.HJArt = {
    GY: GY, VH: VH, rng: rng, defs: gradients,
    character: character, portrait: portrait, cat: cat, audienceFigure: audienceFigure,
    sky: skyLayer, far: farLayer, mid: midLayer, near: nearLayer,
    ground: ground, foreground: foreground, stations: S,
    usMap: usMap, foodWheel: foodWheel, mysteryCat: mysteryCat
  };
})();
