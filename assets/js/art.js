/*
 * Hand-built SVG art for the interactive world: the avatar, the cats,
 * the seven stations, and the layered ink-wash scenery.
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
  var TIGHTS = "#2d2a30", SHOE = "#3a2920", HEEL = "#101014";

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
    return '<path d="' + d + '" fill="' + (fill || "none") + '"' + (stroke ? sk(stroke, w) : "") + (extra || "") + "/>";
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
    var down = look === "down";
    var face = "M45.6 37.5C45.6 26.8 52 21 60 21C68 21 74.4 26.8 74.4 37.5C74.4 47.8 68.6 56.4 60 58.4C51.4 56.4 45.6 47.8 45.6 37.5Z";
    var eye = function (cx, flip) {
      var d = flip ? -1 : 1;
      return '<ellipse cx="' + cx + '" cy="40.4" rx="3.5" ry="3.9" fill="#fdfaf6"/>' +
        '<circle cx="' + (cx + 0.3 * d) + '" cy="40.8" r="2.75" fill="#3d271b"/><circle cx="' + (cx + 0.3 * d) + '" cy="40.9" r="1.3" fill="#140c08"/>' +
        '<circle cx="' + (cx + 1.3 * d) + '" cy="39.4" r=".95" fill="#fff"/><circle cx="' + (cx - 0.6 * d) + '" cy="42" r=".45" fill="#fff"/>';
    };
    return '' +
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
      P(face, "url(#" + s + ")", INK, 1.2) +
      P("M70.6 29C74.6 36 73.6 47 65.4 55.4C70.6 53 74 46.6 74.4 37.5C74.4 34.2 73.6 31.4 72.4 29Z", SKIN_SH, "", 0, ' opacity=".35"') +
      '<g opacity=".45" fill="' + BLUSH + '"><ellipse cx="51" cy="46.6" rx="3.4" ry="1.9"/><ellipse cx="69" cy="46.6" rx="3.4" ry="1.9"/></g>' +
      (down
        ? P("M50.4 41.6Q53.6 38.4 56.8 41.6M63.2 41.6Q66.4 38.4 69.6 41.6", "", "#1b1210", 1.3)
        : '<g class="c-eyes">' + eye(53.6, false) + eye(66.4, true) +
            P("M49.8 39.6Q53.4 35.2 57.4 38.8M62.6 38.8Q66.6 35.2 70.2 39.6M49.8 39.6L48.8 38.8M70.2 39.6L71.2 38.8", "", "#1b1210", 1.4) +
            P("M50.8 43Q53.6 44.9 56.6 43.2M63.4 43.2Q66.4 44.9 69.2 43", "", "#c4998a", 0.5) +
          "</g>" +
          '<g class="c-eyes-shut">' + P("M50.2 40.8Q53.6 43.4 57 40.8M63 40.8Q66.4 43.4 69.8 40.8", "", "#1b1210", 1.3) + "</g>") +
      P("M50 34Q53.4 32.2 57 33.4M63 33.4Q66.6 32.2 70 34", "", "#3a2a24", 1.1) +
      P("M60.4 43.6Q59.8 45.8 60.6 46.4", "", "#c79583", 0.8) +
      '<path class="c-mouth" d="M56.2 49.4Q60 53.4 63.8 49.4Q60 51 56.2 49.4Z" fill="#d27b76"' + sk("#b0605c", 0.6) + "/>" +
      '<ellipse class="c-mouth-open" cx="60" cy="50.8" rx="2" ry="1.5" fill="#8a3431"/>' +
      // day: side-parted wavy hair framing the face (it stays behind the shoulders)
      '<g class="h-down">' +
        P("M44.8 41C43 26 50.6 16.4 60.8 16.4C71.2 16.4 77.4 25.4 75.4 41C73.8 34.4 70.6 29.4 66 27.2C62.4 30.6 56 33.4 50.4 34.6C48.2 36.4 46.2 38.6 44.8 41Z", "url(#" + h + ")", HAIR_LINE, 1.2) +
        P("M55.4 17.2C50.2 21.4 47.2 28 46.6 36.8C49.8 31.4 54 28 59.6 25.6Z", "url(#" + h + ")", HAIR_LINE, 1) +
        P("M45.8 30C41.6 40 46.8 47 43 55.6C41 61 44.4 65.2 47.6 63.4C49.6 57.4 46.6 51.2 49.2 44.6C50.6 40 48.4 34.6 45.8 30Z", "url(#" + h + ")", HAIR_LINE, 1) +
        P(mirrorPath("M45.8 30C41.6 40 46.8 47 43 55.6C41 61 44.4 65.2 47.6 63.4C49.6 57.4 46.6 51.2 49.2 44.6C50.6 40 48.4 34.6 45.8 30Z"), "url(#" + h + ")", HAIR_LINE, 1) +
        P("M53.4 19.6C60 19 68 22 72 29M50 24C52.4 21 55.8 19 59.4 18.6", "", HAIR_HI, 0.9, ' opacity=".85"') +
      "</g>" +
      // night: hair pulled back smoothly
      '<g class="h-up">' +
        P("M45 40C44 27.4 50.6 17 60.4 16.8C70.4 17 76.6 27.2 75.2 40C73 32.4 68 27.6 60.4 27.4C53 27.6 47.2 32.4 45 40Z", "url(#" + h + ")", HAIR_LINE, 1.2) +
        P("M50.6 23.4C55 20 63 19.4 69 22.2M47.6 30.6C51 25.4 56.4 23 62.4 22.8", "", HAIR_HI, 0.85, ' opacity=".85"') +
      "</g>";
  }

  function character(uid) {
    var h = "hjHair" + uid, c = "hjCoat" + uid, g = "hjGlow" + uid, s = "hjSkin" + uid, q = "hjQipao" + uid;

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
        P(mirrorPath(UPPER_B), fill, line, 1.3) + forearmF(fill, line) + '<ellipse cx="' + handFx + '" cy="' + handFy + '" rx="3.3" ry="2.8" fill="' + SKIN + '"' + sk(INK, 1.1) + "/>";
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
        '<g class="type-hand type-hand-f">' + P("M76.6 95.6C80.8 96.6 87.4 100.8 92.2 104C94.2 105.6 93.4 108.8 90.8 109C85.6 107.8 79.4 105.2 76 102C74.2 100.4 74.6 96.4 76.6 95.6Z", fill, line, 1.3) + hand(93.8, 107.2) + "</g>";
    }

    return '' +
    '<svg class="hj-char-svg" viewBox="0 0 120 200" aria-hidden="true" focusable="false">' +
    "<defs>" +
      '<linearGradient id="' + h + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d2528"/><stop offset=".55" stop-color="#1a1517"/><stop offset="1" stop-color="#100c0e"/></linearGradient>' +
      '<linearGradient id="' + c + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ab8659"/><stop offset=".42" stop-color="#c9a67b"/><stop offset=".7" stop-color="#bf9b6f"/><stop offset="1" stop-color="#9f7a50"/></linearGradient>' +
      '<radialGradient id="' + s + '" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#f8e2d4"/><stop offset=".75" stop-color="' + SKIN + '"/><stop offset="1" stop-color="#e8c6b3"/></radialGradient>' +
      '<linearGradient id="' + q + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#101014"/><stop offset=".3" stop-color="#2a2830"/><stop offset=".55" stop-color="#18171c"/><stop offset="1" stop-color="#0e0e12"/></linearGradient>' +
      '<radialGradient id="' + g + '" cx=".5" cy=".55" r=".5"><stop offset="0" style="stop-color:var(--c-glow)"/><stop offset="1" style="stop-color:var(--c-glow);stop-opacity:0"/></radialGradient>' +
    "</defs>" +
    '<ellipse class="c-glow" cx="60" cy="118" rx="82" ry="98" fill="url(#' + g + ')"/>' +
    '<g class="c-flip">' +
    '<ellipse class="c-shadow" cx="61" cy="192.4" rx="21" ry="3.4"/>' +

    // ===== standing figure =====
    '<g class="c-root">' +
      '<g class="c-leg c-leg-b">' +
        '<g class="o-day">' + P("M53 146H57.6L57.2 186.6H53.4Z", TIGHTS, "#17151a", 1.1) +
          P("M52 185.2H57.8C61 185.2 62.8 186.8 62.8 189.1C62.8 190.7 61.8 191.7 60.3 191.7H53C51.8 191.7 51.3 190.9 51.3 189.7Z", SHOE, INK, 1.1) + "</g>" +
        '<g class="o-night">' + P("M53.4 168H57.4L57 186H53.8Z", SKIN, INK, 1) +
          P("M53 185.4H57.2C59.8 185.8 61.6 187.4 61.8 190L58.2 190.2L57.6 188.6L57 191.6H54.2C53.4 191.6 52.9 190.9 53 189.6Z", HEEL, "#000", 1) + "</g>" +
      "</g>" +
      '<g class="c-leg c-leg-f">' +
        '<g class="o-day">' + P("M62.4 146H67L66.6 186.6H62.8Z", "#35323a", "#17151a", 1.1) +
          P("M62 185.2H67.8C71 185.2 72.8 186.8 72.8 189.1C72.8 190.7 71.8 191.7 70.3 191.7H63C61.8 191.7 61.3 190.9 61.3 189.7Z", "#46332a", INK, 1.1) + "</g>" +
        '<g class="o-night">' + P("M62.6 168H66.6L66.2 186H63Z", SKIN, INK, 1) +
          P("M62.6 185.4H66.8C69.4 185.8 71.2 187.4 71.4 190L67.8 190.2L67.2 188.6L66.6 191.6H63.8C63 191.6 62.5 190.9 62.6 189.6Z", HEEL, "#000", 1) + "</g>" +
      "</g>" +
      '<g class="c-upper">' +
        // long wavy hair, behind the body (day)
        '<g class="c-hairback h-down">' +
          P("M47 28C40 40 44 52 37.6 64C32 76 41 86 35 98C30 108 37 118 43.6 121C49 123.6 55 119.6 60 121.6C65 119.6 71 123.6 76.4 121C83 118 90 108 85 98C79 86 88 76 82.4 64C76 52 80 40 73 28C68 16 52 16 47 28Z", "url(#" + h + ")", HAIR_LINE, 1.3) +
          P("M42.6 66C37.4 76 45.6 85 39.6 96.6C35.6 105 40.6 113 44.6 116.6M77.4 66C82.6 76 74.4 85 80.4 96.6C84.4 105 79.4 113 75.4 116.6", "", HAIR_HI, 1.1, ' opacity=".6"') +
          P("M38.4 108.6C36.6 112.6 39 117.2 43 116.8M81.6 108.6C83.4 112.6 81 117.2 77 116.8", "", HAIR_HI, 1.1, ' opacity=".75"') +
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
          "</g>" +
          '<g class="o-night">' + neck +
            P(qipaoBody, "url(#" + q + ")", "#050507", 1.4) +
            P("M55.4 58.8H64.6V65C62 66.2 58 66.2 55.4 65Z", QIPAO, QIPAO_LINE, 1) +
            P("M55.4 64.6C58 65.8 62 65.8 64.6 64.6M65 68.4H67.2M69.6 70H71.6", "", GOLD, 0.8) +
            P("M60.2 66C63.8 67.8 67.6 69.4 71.8 70.2M72.8 176L72.2 154", "", QIPAO_LINE, 0.9) +
            P("M50 74C49.2 92 51 110 50.2 128C49.6 146 50.6 162 51.4 174", "", "#3a3844", 1.4, ' opacity=".5"') +
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
          P("M63.4 91.4C66.8 91 68.6 93.4 68 95.6C67.4 97.6 64.8 98.2 62.8 97Z", SKIN, INK, 1.1) +
        "</g>" +
        '<g class="c-arm c-arm-b">' +
          '<g class="o-day arm-free">' + P(mirrorPath(SLEEVE_F), "url(#" + c + ")", COAT_LINE, 1.3) + P("M38.7 109.6L46.7 110.2", "", COAT_LINE, 0.9) + handB + "</g>" +
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
          '<g class="o-day">' + P(SLEEVE_F, "url(#" + c + ")", COAT_LINE, 1.3) + P("M81.3 109.6L73.3 110.2", "", COAT_LINE, 0.9) + handF + "</g>" +
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
      P("M50.6 18.4V23.6Q60 27.4 69.4 23.6V18.4Z", "#26232c", INK, 1.1) +
      P("M42.6 17.4L60 11L77.4 17.4L60 24Z", "#302d37", INK, 1.2) +
      P("M60 17.4L72.2 20.8V27.6", "", GOLD, 1.2) +
      '<circle cx="60" cy="17.4" r="1.3" fill="' + GOLD + '"/>' + P("M71.1 27.4H73.3L74 31.2H70.4Z", GOLD) +
    "</g></g>" +

    // ===== seen from behind, kneeling on the cushion at the writing desk =====
    '<g class="c-back">' +
      '<g class="o-day">' +
        P("M44 112C40.4 128 36.6 162 32 191Q60 196 88 191C83.4 162 79.6 128 76 112C70.8 108.4 49.2 108.4 44 112Z", "url(#" + c + ")", COAT_LINE, 1.4) +
        P("M60 150V192", "", COAT_LINE, 0.9, ' opacity=".55"') +
        P("M40 140H80L80.6 145.6H39.4Z", COAT_SH, COAT_LINE, 1) +
        '<rect x="55.6" y="138.6" width="8.8" height="8.2" rx="1.5" fill="' + COAT_SH + '"' + sk(COAT_LINE, 1) + "/>" +
        P("M46 190.5Q51 186.6 56 190.5Q51 194.6 46 190.5ZM64 190.5Q69 186.6 74 190.5Q69 194.6 64 190.5Z", SHOE, INK, 1) +
        P("M44 114C38.4 118 36.6 127 39 134.4C41.6 137.2 45.4 134.4 46.6 128.8Z", COAT_SH, COAT_LINE, 1.3) +
        '<g class="cb-arm">' + P("M76 114C81.6 118 83.4 127 81 134.4C78.4 137.2 74.6 134.4 73.4 128.8Z", "url(#" + c + ")", COAT_LINE, 1.3) + "</g>" +
        P("M43 88C39 100 44 110 39.4 122C35.4 132 41.4 142 38 152C36.6 158 42 161 46 158C49.6 161 56 158 60 160C64 158 70.4 161 74 158C78 161 83.4 158 82 152C78.6 142 84.6 132 80.6 122C76 110 81 100 77 88C77 72 70 62 60 62C50 62 43 72 43 88Z", "url(#" + h + ")", HAIR_LINE, 1.4) +
        P("M48.4 78C45.4 90 50 102 46.4 114C43.4 126 48 138 45 148M60 66C58.4 86 61.6 106 59.2 124C57.6 138 60.8 148 59.4 156M71.6 78C74.6 90 70 102 73.6 114C76.6 126 72 138 75 148", "", HAIR_HI, 1.1, ' opacity=".55"') +
      "</g>" +
      '<g class="o-night">' +
        P("M45.6 112C42.6 128 38.6 162 34 191Q60 196 86 191C81.4 162 77.4 128 74.4 112C69.6 108.8 50.4 108.8 45.6 112Z", "url(#" + q + ")", "#050507", 1.4) +
        bamboo(51, 182, 0.9, -12) + bamboo(70, 152, 0.7, 20) +
        P("M47 190.5Q51.6 186.8 56.2 190.5Q51.6 194.2 47 190.5ZM63.8 190.5Q68.4 186.8 73 190.5Q68.4 194.2 63.8 190.5Z", HEEL, "#000", 1) +
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
        P("M40 186.6H47.4C49.8 186.6 50.8 188.4 50.4 190.2C50.2 191.2 49.4 191.8 48.2 191.8H40.6C39.4 191.8 38.8 190.8 39 189.6Z", SHOE, INK, 1) +
        P("M78.6 185H85C88.2 185 90 186.6 90 189C90 190.6 89 191.6 87.5 191.6H79.4C78.2 191.6 77.8 190.8 77.8 189.6Z", "#46332a", INK, 1.1) +
        P("M60.4 101L60.1 112.4H67.3L67 101Z", SKIN, INK, 1) +
        P("M53 110.6C49.4 112.4 48.2 116 48.2 120.6L46.4 154C44.6 166 41 178 37.4 190C51.6 193.8 78.4 193.8 92 190C88.6 180.4 84 171.2 78.8 163L77.6 120.6C77.6 116 76.2 112.4 72.6 110.6C68 109.2 57.6 109.2 53 110.6Z", "url(#" + c + ")", COAT_LINE, 1.4) +
        P("M58 109.6L63 121L68 109.6Z", SHIRT, "#cfc6b8", 0.8) +
        P("M58 109.4L62.8 121.4L57.4 126L53.8 119.2L52.6 113.4L55.4 110.6Z", COAT_HI, COAT_LINE, 1) +
        P("M68 109.4L63.2 121.4L68.6 126L72.2 119.2L73.4 113.4L70.6 110.6Z", COAT_HI, COAT_LINE, 1) +
        P("M47.8 138.6H78L78.4 143.8H47.4Z", COAT_SH, COAT_LINE, 1) +
        '<rect x="59.8" y="137.6" width="6.4" height="7" rx="1.2" fill="none"' + sk(COAT_LINE, 1) + "/>" +
        P("M52.2 113.4C47.2 117.6 47 128.4 51.8 139.2C56 148.2 63.6 155.4 71.4 158.6C74.6 159.6 76.4 156.8 75 154.4C68.2 149.2 61.4 141.2 58.6 131.6C57 124.8 57.2 117.6 56.2 114.4Z", "url(#" + c + ")", COAT_LINE, 1.3) +
        '<ellipse cx="74.4" cy="157.4" rx="3.3" ry="2.7" fill="' + SKIN + '"' + sk(INK, 1.1) + "/>" +
        '<g class="cr-arm">' + P("M71.6 112C77.6 114.8 85 124.8 92.6 136.2C96.2 141.4 100.4 144.8 102.8 147.2C104.6 149.6 102.4 152.4 99.8 151.1C94.8 148 89.4 143 85.2 137.6C79.8 130.4 73.8 122.4 69.4 117.4Z", "url(#" + c + ")", COAT_LINE, 1.3) +
          P("M99.8 144.8C103.6 145 106.4 147.4 106 150C105.6 152.2 102.6 152.9 100 151.8Z", SKIN, INK, 1.1) + "</g>" +
      "</g>" +
      '<g class="o-night">' +
        P("M40.4 187.4H47.2C49.4 187.8 50.6 189 50.6 190.6L47 190.8L46.4 191.8H41C39.6 191.8 39.2 190.6 39.6 189.6Z", HEEL, "#000", 1) +
        P("M78.2 185.8H84.8C87.4 186.2 89.2 187.8 89.4 190.4L85.8 190.6L85.2 189L84.6 191.8H79.2C78.4 191.8 77.9 191.1 78 189.8Z", HEEL, "#000", 1) +
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
  // Cats. The companion is Hanjing's youngest: a chibi golden shaded kitty
  // (金渐层) — golden back, cream bib and cheeks, round face, green eyes.
  // ------------------------------------------------------------------
  var G_LINE = "#7a6048", G_TIP = "#b39a78", G_CREAM = "#fbf3e6", G_PINK = "#f0b4a8";

  function kittyHead(cx, cy, uid) {
    function p(x, y) { return (cx + x) + " " + (cy + y); }
    return '<g class="cat-head">' +
      '<path d="M' + p(-17, -9) + "C" + p(-18.5, -18) + " " + p(-15, -23.5) + " " + p(-10, -20.5) + "C" + p(-8, -18.5) + " " + p(-7, -15.5) + " " + p(-7, -13) + 'Z" fill="url(#kG' + uid + ')" stroke="' + G_LINE + '" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<path d="M' + p(8, -15) + "C" + p(10, -20.5) + " " + p(15, -22.5) + " " + p(18.5, -18.5) + "C" + p(19.5, -14) + " " + p(18.5, -10) + " " + p(16.5, -8) + 'Z" fill="url(#kG' + uid + ')" stroke="' + G_LINE + '" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<path d="M' + p(-15, -11.5) + "C" + p(-15.5, -16.5) + " " + p(-13.5, -19) + " " + p(-11, -17.5) + "C" + p(-10, -16) + " " + p(-9.5, -14.5) + " " + p(-9.5, -13) + "ZM" + p(10, -13.5) + "C" + p(11.5, -17) + " " + p(14.5, -18.5) + " " + p(16.5, -16) + "C" + p(17, -13.5) + " " + p(16.5, -11) + " " + p(15, -9.8) + 'Z" fill="' + G_PINK + '"/>' +
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="20" ry="17" fill="url(#kG' + uid + ')" stroke="' + G_LINE + '" stroke-width="1.3"/>' +
      '<path d="M' + p(-8, -15.5) + "C" + p(-5, -12) + " " + p(-2, -12) + " " + p(0, -15.8) + "M" + p(2, -15.8) + "C" + p(4, -12) + " " + p(7, -12) + " " + p(10, -15.5) + '" stroke="' + G_TIP + '" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".6"/>' +
      '<ellipse cx="' + (cx + 3.5) + '" cy="' + (cy + 6.5) + '" rx="12" ry="8" fill="' + G_CREAM + '"/>' +
      '<g opacity=".45" fill="#f4a096"><ellipse cx="' + (cx - 10) + '" cy="' + (cy + 6) + '" rx="3.6" ry="2.1"/><ellipse cx="' + (cx + 17) + '" cy="' + (cy + 6) + '" rx="3.2" ry="2"/></g>' +
      '<g class="cat-eyes">' +
        '<circle cx="' + (cx - 4) + '" cy="' + (cy - 1) + '" r="5.2" fill="#9bb56e" stroke="#3a2a1a" stroke-width="1.3"/><ellipse cx="' + (cx - 3.4) + '" cy="' + (cy - 0.5) + '" rx="2.2" ry="3.4" fill="#1a1411"/>' +
        '<circle cx="' + (cx + 10.5) + '" cy="' + (cy - 1) + '" r="5" fill="#9bb56e" stroke="#3a2a1a" stroke-width="1.3"/><ellipse cx="' + (cx + 11.1) + '" cy="' + (cy - 0.5) + '" rx="2.1" ry="3.3" fill="#1a1411"/>' +
        '<circle cx="' + (cx - 2.2) + '" cy="' + (cy - 3) + '" r="1.5" fill="#fff"/><circle cx="' + (cx + 12.3) + '" cy="' + (cy - 3) + '" r="1.4" fill="#fff"/>' +
      "</g>" +
      '<path d="M' + p(1.5, 3.6) + "L" + p(5.5, 3.6) + "L" + p(3.5, 6) + 'Z" fill="#e0897a" stroke="#7a4a3a" stroke-width=".8" stroke-linejoin="round"/>' +
      '<path d="M' + p(3.5, 6) + "C" + p(3.5, 8.2) + " " + p(1.1, 8.7) + " " + p(0.1, 7.3) + "M" + p(3.5, 6) + "C" + p(3.5, 8.2) + " " + p(5.9, 8.7) + " " + p(6.9, 7.3) + '" stroke="#7a4a3a" stroke-width="1" fill="none" stroke-linecap="round"/>' +
      '<path d="M' + p(-6, 7) + "l-10 -2M" + p(-6, 9) + "l-9.5 1.5M" + p(13, 7) + "l10 -2M" + p(13, 9) + 'l9.5 1.5" stroke="#b58b5c" stroke-width=".7" opacity=".7"/>' +
      "</g>";
  }

  function cat(uid) {
    uid = uid || "c";
    return '<svg class="hj-cat-svg" viewBox="0 0 90 72" aria-hidden="true" focusable="false">' +
      "<defs>" +
        '<linearGradient id="kG' + uid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4b891"/><stop offset=".6" stop-color="#e9d6b8"/><stop offset="1" stop-color="#f5ebdb"/></linearGradient>' +
        '<linearGradient id="kB' + uid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9ab82"/><stop offset="1" stop-color="#eee0c9"/></linearGradient>' +
      "</defs>" +
      '<ellipse class="cat-shadow" cx="45" cy="69.5" rx="25" ry="2.8"/>' +
      '<g class="cat-flip">' +
      // sitting pose
      '<g class="cat-sit">' +
        '<path class="cat-tail-sit" d="M30 66C14 67 9 57 15 50" stroke="#d8c1a0" stroke-width="11" fill="none" stroke-linecap="round"/>' +
        '<path d="M15 50C13 53 13.5 55 15 57" stroke="' + G_TIP + '" stroke-width="7" fill="none" stroke-linecap="round" opacity=".7"/>' +
        '<path d="M31 68C20 68 19 51 28 43C34 38 51 38 57 44C65 52 63 68 53 68Z" fill="url(#kB' + uid + ')" stroke="' + G_LINE + '" stroke-width="1.3" stroke-linejoin="round"/>' +
        '<path d="M42 47C50 49 54 59 50 67L35 67C33 59 35 51 42 47Z" fill="' + G_CREAM + '"/>' +
        '<g fill="' + G_CREAM + '" stroke="' + G_LINE + '" stroke-width="1"><ellipse cx="39" cy="67" rx="5.4" ry="3.2"/><ellipse cx="50" cy="67" rx="5.4" ry="3.2"/></g>' +
        kittyHead(47, 26, uid) +
        '<path class="cat-ruff" d="M31 36L34 44L37 39L40 47L44 41L47 49L50 41L54 47L57 39L60 44L63 36C58 41 36 41 31 36Z" fill="' + G_CREAM + '" stroke="' + G_LINE + '" stroke-width=".9" stroke-linejoin="round"/>' +
      "</g>" +
      // walking (trotting) pose
      '<g class="cat-walk">' +
        '<path class="cat-tail-walk" d="M23 47C11 43 9 31 15 25" stroke="#d8c1a0" stroke-width="10.5" fill="none" stroke-linecap="round"/>' +
        '<g class="cat-legs-b"><path d="M29 58V67M37 59V67" stroke="#d4bc98" stroke-width="6.5" stroke-linecap="round"/></g>' +
        '<g class="cat-legs-f"><path d="M51 59V67M58 58V67" stroke="#dcc6a4" stroke-width="6.5" stroke-linecap="round"/></g>' +
        '<g fill="' + G_CREAM + '"><circle cx="29" cy="67.5" r="3.3"/><circle cx="37" cy="67.5" r="3.3"/><circle cx="51" cy="67.5" r="3.3"/><circle cx="58" cy="67.5" r="3.3"/></g>' +
        '<path d="M21 52C19 42 30 38 44 38C56 38 64 42 64 52C64 60 54 62 42 62C30 62 23 60 21 52Z" fill="url(#kB' + uid + ')" stroke="' + G_LINE + '" stroke-width="1.3" stroke-linejoin="round"/>' +
        '<path d="M30 58C38 61.5 50 61.5 58 57.5C55 60.5 37 61.8 30 58Z" fill="' + G_CREAM + '"/>' +
        kittyHead(65, 31, uid) +
        '<path class="cat-ruff" d="M50 40L53 47L56 43L59 50L62 44L65 51L68 44L71 50L74 43L77 47L80 40C74 45 56 45 50 40Z" fill="' + G_CREAM + '" stroke="' + G_LINE + '" stroke-width=".9" stroke-linejoin="round"/>' +
      "</g>" +
      "</g></svg>";
  }

  // XiaoHei, a chibi gray tabby napping on a cushion in the Life corner (head to the left,
  // so Hanjing can crouch and pet him).
  function sleepingCat(x, y) {
    var G1 = "#a4a7b0", G2 = "#7d8089", GL = "#474952", CR = "#ecebe7", PK = "#eeb4ba";
    var line = function (w) { return ' stroke="' + GL + '" stroke-width="' + w + '" stroke-linejoin="round" stroke-linecap="round"'; };
    var tail = "M30 -3C45 -1 43 11 25 11C9 11 -7 9 -15 7";
    return '<g class="sleep-cat" transform="translate(' + x + " " + y + ')">' +
      '<g class="sc-tail"><path d="' + tail + '" fill="none"' + line(9.4) + "/>" +
        '<path d="' + tail + '" fill="none" stroke="' + G1 + '" stroke-width="6.6" stroke-linecap="round"/>' +
        '<path d="M36.5 1.5Q34 3.5 36.5 6M29 8.5Q27 10.5 29.5 12M18 9Q16.5 11 18.5 12.6" fill="none" stroke="' + G2 + '" stroke-width="2" stroke-linecap="round"/></g>' +
      '<path class="sc-body" d="M-16 2C-20 -16 -6 -30 12 -30C30 -30 40 -18 37 -2C36 4 30 6 22 6H-8C-13 6 -15.4 5 -16 2Z" fill="' + G1 + '"' + line(1.5) + "/>" +
      '<path d="M8 -29.4Q11.2 -23 8.2 -17M17 -29Q20.6 -22.4 17.6 -16M26 -26.4Q29.2 -21 27 -15.6M33.6 -19.5Q35.6 -15.5 34 -12" fill="none" stroke="' + G2 + '" stroke-width="2.4" stroke-linecap="round"/>' +
      '<ellipse cx="-5" cy="4.2" rx="6.2" ry="3.4" fill="' + CR + '"' + line(1.2) + '/><ellipse cx="5.6" cy="4.8" rx="5.8" ry="3.2" fill="' + CR + '"' + line(1.2) + "/>" +
      '<g class="sc-head">' +
        '<g class="sc-ear-l"><path d="M-37 -21.5L-35.6 -36L-25 -29Z" fill="' + G1 + '"' + line(1.3) + '/><path d="M-34.4 -24.4L-33.8 -32.2L-28.4 -28.4Z" fill="' + PK + '"/></g>' +
        '<g class="sc-ear-r"><path d="M-18.5 -30L-9 -37.5L-7.6 -23.5Z" fill="' + G1 + '"' + line(1.3) + '/><path d="M-15.6 -28.8L-10.6 -33L-10 -26Z" fill="' + PK + '"/></g>' +
        '<path d="M-40.5 -14C-40.5 -26 -31.5 -32 -22.5 -32C-12.5 -32 -5 -25 -5 -14C-5 -4 -13 1 -22.5 1C-32 1 -40.5 -4 -40.5 -14Z" fill="' + G1 + '"' + line(1.5) + "/>" +
        '<path d="M-26.2 -30.4V-25.6M-22.5 -31.4V-25M-18.8 -30.4V-25.6" fill="none" stroke="' + G2 + '" stroke-width="2" stroke-linecap="round"/>' +
        '<path d="M-31.4 -8.6C-31.4 -12.2 -27.6 -13.2 -22.5 -11.2C-17.4 -13.2 -13.6 -12.2 -13.6 -8.6C-13.6 -5 -17.8 -3.4 -22.5 -5C-27.2 -3.4 -31.4 -5 -31.4 -8.6Z" fill="' + CR + '"/>' +
        '<path class="sc-eyes-sleep" d="M-33 -15Q-30 -12.4 -27 -15M-18 -15Q-15 -12.4 -12 -15" fill="none"' + line(1.5) + "/>" +
        '<path class="sc-eyes-happy" d="M-33 -13.6Q-30 -17.2 -27 -13.6M-18 -13.6Q-15 -17.2 -12 -13.6" fill="none"' + line(1.5) + "/>" +
        '<path d="M-24 -10.6H-21L-22.5 -8.8Z" fill="' + PK + '"' + line(0.7) + "/>" +
        '<path d="M-22.5 -8.8Q-24 -6.5 -25.8 -7.6M-22.5 -8.8Q-21 -6.5 -19.2 -7.6" fill="none"' + line(1) + "/>" +
        '<ellipse cx="-34.6" cy="-8" rx="3" ry="1.8" fill="' + PK + '" opacity=".55"/><ellipse cx="-10.4" cy="-8" rx="3" ry="1.8" fill="' + PK + '" opacity=".55"/>' +
        '<path d="M-36.5 -10.2H-43.5M-36.5 -7.6L-42.6 -5.4M-8.5 -10.2H-1.5M-8.5 -7.6L-2.4 -5.4" fill="none"' + line(0.8) + ' opacity=".7"/>' +
      "</g>" +
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
    return '<g class="' + (cls || "pine") + '" transform="translate(' + f1(x) + " " + f1(y) + ") scale(" + s + ')">' +
      '<path d="M0 0C-1 -14 1 -30 -2 -46" stroke-width="3" fill="none" stroke-linecap="round" class="trunk"/>' +
      '<path d="M-2 -44c-14 -2 -24 3 -30 8c10 1 22 0 30 -3c8 3 18 3 26 1c-6 -5 -16 -8 -26 -6z' +
      'M-1 -30c-12 -1 -20 3 -26 7c9 1 18 0 26 -3c7 2 16 3 23 1c-6 -4 -14 -6 -23 -5z' +
      'M-2 -56c-8 -1 -14 2 -18 6c7 1 13 0 18 -2c5 2 11 2 16 0c-4 -3 -10 -5 -16 -4z" class="needles"/>' +
      '</g>';
  }

  function rock(x, y, w, h) {
    return '<path class="rock" d="M' + f1(x - w / 2) + " " + y + "C" + f1(x - w / 2) + " " + f1(y - h * 0.7) + " " + f1(x - w * 0.2) + " " + f1(y - h) + " " + f1(x + w * 0.05) + " " + f1(y - h) +
      "C" + f1(x + w * 0.35) + " " + f1(y - h) + " " + f1(x + w / 2) + " " + f1(y - h * 0.5) + " " + f1(x + w / 2) + " " + y + 'Z"/>';
  }

  function grass(x, y, s) {
    return '<path class="grass" d="M' + x + " " + y + "q-2 -" + (10 * s) + " -7 -" + (14 * s) + "M" + x + " " + y + "q1 -" + (12 * s) + " 3 -" + (18 * s) + "M" + x + " " + y + "q3 -" + (8 * s) + " 9 -" + (11 * s) + '"/>';
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
    var top = o.top || 0.46, rw = hw * top, ridge = eave - h, tiles = "", ends = "", n = Math.round(hw / 11);
    for (var i = -n; i <= n; i++) {
      var xe = cx + (i / n) * hw * 0.95, xr = cx + (i / n) * rw, ye = eaveY(cx, eave, hw, h, xe);
      tiles += "M" + f1(xr) + " " + f1(ridge + 4) + "Q" + f1((xr + xe) / 2 + (xe - xr) * 0.12) + " " + f1((ridge + ye) / 2 + 4) + " " + f1(xe) + " " + f1(ye - 3);
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
      '<path class="roof-tiles" d="' + tiles + '"/>' +
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
        '<path class="col-base" d="M' + f1(x - 10) + " " + f1(bottom) + "H" + f1(x + 10) + "Q" + f1(x + 10) + " " + f1(bottom - 6) + " " + f1(x + 6) + " " + f1(bottom - 6) + "H" + f1(x - 6) + "Q" + f1(x - 10) + " " + f1(bottom - 6) + " " + f1(x - 10) + " " + f1(bottom) + 'Z"/>';
    }).join("");
  }
  function lattice(x, y, w, h) {
    var bars = "";
    for (var bx = x + 5; bx < x + w - 2; bx += 6) bars += "M" + f1(bx) + " " + f1(y + 3) + "V" + f1(y + h - 3);
    return '<rect class="win-frame" x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(w) + '" height="' + f1(h) + '"/><path class="win-bars" d="' + bars + '"/>';
  }
  function tWall(x, y, w, h) {
    return '<rect class="t-wall" x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(w) + '" height="' + f1(h) + '"/>';
  }
  function terrace(x1, x2, top, bottom, stepW) {
    var s = '<path class="terrace" d="M' + f1(x1) + " " + f1(bottom) + "V" + f1(top) + "H" + f1(x2) + "V" + f1(bottom) + 'Z"/>' +
      '<path class="terrace-edge" d="M' + f1(x1) + " " + f1(top + 4) + "H" + f1(x2) + '"/>';
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
  function bgWrap(cls, sil, det, lights) {
    return '<g class="bg-arch ' + cls + '"><path class="sil" d="' + sil + '"/>' + (det ? '<path class="det" d="' + det + '"/>' : "") +
      (lights ? '<path class="win-light" d="' + lights + '"/>' : "") + "</g>";
  }
  // A square, many-storeyed brick pagoda in the manner of the Great Wild Goose Pagoda.
  function bgPagoda(x, base, s, cls) {
    var sil = box(x - 40 * s, base - 12 * s, 80 * s, 12 * s), det = "", lights = "", w = 58 * s, h = 26 * s, y = base - 12 * s;
    for (var i = 0; i < 7; i++) {
      sil += box(x - w / 2, y - h, w, h) + box(x - w / 2 - 5 * s, y - h - 3.4 * s, w + 10 * s, 3.4 * s);
      det += "M" + f1(x - 2.6 * s) + " " + f1(y - 4 * s) + "V" + f1(y - h * 0.62) + "Q" + f1(x) + " " + f1(y - h * 0.8) + " " + f1(x + 2.6 * s) + " " + f1(y - h * 0.62) + "V" + f1(y - 4 * s);
      lights += box(x - 1.6 * s, y - h * 0.58, 3.2 * s, h * 0.32);
      y -= h + 3.4 * s; w *= 0.88; h *= 0.9;
    }
    sil += box(x - 2 * s, y - 20 * s, 4 * s, 20 * s) + box(x - 6 * s, y - 8 * s, 12 * s, 2.4 * s) + box(x - 4.4 * s, y - 14 * s, 8.8 * s, 2 * s);
    return bgWrap(cls, sil, det, lights);
  }
  // A palace hall on a high terrace, flanked by que towers (阙).
  function bgPalace(x, base, s, cls) {
    var t = base - 46 * s, sil = "", det = "", lights = "";
    sil += "M" + f1(x - 230 * s) + " " + f1(base) + "L" + f1(x - 212 * s) + " " + f1(t) + "H" + f1(x + 212 * s) + "L" + f1(x + 230 * s) + " " + f1(base) + "Z";
    det += "M" + f1(x - 26 * s) + " " + f1(base) + "L" + f1(x - 14 * s) + " " + f1(t) + "M" + f1(x + 26 * s) + " " + f1(base) + "L" + f1(x + 14 * s) + " " + f1(t) + "M" + f1(x - 212 * s) + " " + f1(t + 6 * s) + "H" + f1(x + 212 * s);
    sil += box(x - 132 * s, t - 44 * s, 264 * s, 44 * s) + roofPath(x, t - 42 * s, 176 * s, 50 * s) + chiweiPath(x - 81 * s, t - 92 * s, 16 * s, 1) + chiweiPath(x + 81 * s, t - 92 * s, 16 * s, -1);
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
      lights += box(qx - 4 * s, t - 90 * s, 8 * s, 10 * s);
    });
    return bgWrap(cls, sil, det, lights);
  }
  // A stretch of city wall with a gate tower over an arched gate.
  function bgGate(x, base, s, cls) {
    var t = base - 52 * s, sil = box(x - 280 * s, t, 560 * s, 52 * s), det = "", lights = "";
    for (var m = x - 276 * s; m < x + 276 * s; m += 16 * s) sil += box(m, t - 7 * s, 9 * s, 7 * s);
    det += "M" + f1(x - 22 * s) + " " + f1(base) + "V" + f1(base - 28 * s) + "Q" + f1(x) + " " + f1(base - 46 * s) + " " + f1(x + 22 * s) + " " + f1(base - 28 * s) + "V" + f1(base);
    sil += box(x - 84 * s, t - 40 * s, 168 * s, 40 * s) + roofPath(x, t - 38 * s, 116 * s, 40 * s) + chiweiPath(x - 53 * s, t - 78 * s, 12 * s, 1) + chiweiPath(x + 53 * s, t - 78 * s, 12 * s, -1);
    for (var c = -3; c <= 3; c++) { det += "M" + f1(x + c * 26 * s) + " " + f1(t - 36 * s) + "V" + f1(t); if (c < 3) lights += box(x + c * 26 * s + 7 * s, t - 28 * s, 12 * s, 16 * s); }
    return bgWrap(cls, sil, det, lights);
  }
  // A three-storey tower (阁) with balconies and stacked roofs.
  function bgTower(x, base, s, cls) {
    var sil = box(x - 70 * s, base - 16 * s, 140 * s, 16 * s), det = "", lights = "", y = base - 16 * s, w = 90 * s, h = 34 * s;
    for (var i = 0; i < 3; i++) {
      sil += box(x - w / 2, y - h, w, h) + roofPath(x, y - h + 4 * s, w * 0.78, 20 * s, 0.35);
      det += "M" + f1(x - w / 2) + " " + f1(y - 8 * s) + "H" + f1(x + w / 2);
      for (var c = -1; c <= 1; c++) lights += box(x + c * w * 0.28 - 4 * s, y - h + 10 * s, 8 * s, 12 * s);
      y -= h + 16 * s; w *= 0.8; h *= 0.9;
    }
    sil += roofPath(x, y + 16 * s + 4 * s, w * 0.9, 24 * s, 0.3) + box(x - 1.6 * s, y - 16 * s, 3.2 * s, 16 * s);
    return bgWrap(cls, sil, det, lights);
  }
  function bgPavilion(x, base, s, cls) {
    var sil = "M" + f1(x - 60 * s) + " " + f1(base) + "C" + f1(x - 44 * s) + " " + f1(base - 22 * s) + " " + f1(x + 40 * s) + " " + f1(base - 26 * s) + " " + f1(x + 62 * s) + " " + f1(base) + "Z";
    var top = base - 20 * s, det = "";
    sil += box(x - 30 * s, top - 4 * s, 60 * s, 4 * s) + roofPath(x, top - 34 * s, 46 * s, 30 * s, 0.14) + box(x - 1.4 * s, top - 76 * s, 2.8 * s, 12 * s);
    [-24, -8, 8, 24].forEach(function (c) { sil += box(x + c * s - 1.6 * s, top - 34 * s, 3.2 * s, 30 * s); });
    det += "M" + f1(x - 26 * s) + " " + f1(top - 12 * s) + "H" + f1(x + 26 * s);
    return bgWrap(cls, sil, det, "");
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
    var d = "M" + f1(x) + " " + f1(base) + "C" + f1(x - 2 * s) + " " + f1(base - 40 * s) + " " + f1(x + 4 * s) + " " + f1(base - 70 * s) + " " + f1(x) + " " + f1(base - 96 * s);
    var fronds = "";
    for (var i = 0; i < 9; i++) {
      var a = -1 + i / 4, sx = x + a * 34 * s, sy = base - (90 - Math.abs(a) * 20) * s;
      fronds += "M" + f1(x + a * 6 * s) + " " + f1(base - 94 * s) + "Q" + f1(sx) + " " + f1(sy - 10 * s) + " " + f1(sx + a * 6 * s) + " " + f1(sy + (46 + (i % 3) * 8) * s);
    }
    return '<g class="willow ' + (cls || "") + '"><path class="trunk" d="' + d + '"/><path class="fronds" d="' + fronds + '"/></g>';
  }

  // Wooden hanging sign used as each station's label.
  function gshadow(x, rx) { return '<ellipse class="gshadow" cx="' + x + '" cy="' + (GY + 2) + '" rx="' + rx + '" ry="' + Math.max(3, rx * 0.12).toFixed(1) + '"/>'; }

  function sign(x, y, text, w) {
    w = w || 150;
    return '<g class="sign" transform="translate(' + x + " " + y + ')">' +
      '<path class="sign-rope" d="M' + (-w / 2 + 14) + ' -30L' + (-w / 2 + 24) + ' 0M' + (w / 2 - 14) + ' -30L' + (w / 2 - 24) + ' 0"/>' +
      '<rect class="sign-board" x="' + (-w / 2) + '" y="0" width="' + w + '" height="34" rx="4"/>' +
      '<text class="sign-text" x="0" y="23" text-anchor="middle">' + esc(text) + '</text>' +
      '</g>';
  }

  // ------------------------------------------------------------------
  // Background layers
  // ------------------------------------------------------------------
  function gradients() {
    return '<defs>' +
      '<linearGradient id="gFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--w-far);stop-opacity:.75"/><stop offset=".55" style="stop-color:var(--w-far);stop-opacity:.35"/><stop offset="1" style="stop-color:var(--w-far);stop-opacity:0"/></linearGradient>' +
      '<linearGradient id="gMid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--w-mid);stop-opacity:.9"/><stop offset=".6" style="stop-color:var(--w-mid);stop-opacity:.4"/><stop offset="1" style="stop-color:var(--w-mid);stop-opacity:0"/></linearGradient>' +
      '<linearGradient id="gNear" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--w-near);stop-opacity:.95"/><stop offset=".7" style="stop-color:var(--w-near);stop-opacity:.45"/><stop offset="1" style="stop-color:var(--w-near);stop-opacity:.05"/></linearGradient>' +
      '<linearGradient id="gMist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--w-mist);stop-opacity:0"/><stop offset=".5" style="stop-color:var(--w-mist);stop-opacity:.85"/><stop offset="1" style="stop-color:var(--w-mist);stop-opacity:0"/></linearGradient>' +
      '<linearGradient id="gGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--w-ground-1)"/><stop offset="1" style="stop-color:var(--w-ground-2)"/></linearGradient>' +
      '<radialGradient id="gGlow"><stop offset="0" style="stop-color:var(--w-glow)"/><stop offset="1" style="stop-color:var(--w-glow);stop-opacity:0"/></radialGradient>' +
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
  function farLayer(width) {
    var clouds = "";
    [[160, 244, 1.3], [980, 212, 1.05], [1760, 258, 1.5], [2600, 226, 1.15], [3500, 250, 1.35]].forEach(function (c) { clouds += xiangyun(c[0], c[1], c[2]); });
    var behind = bgPalace(1320, 452, 0.7, "far far-soft") + bgGate(2440, 460, 0.62, "far far-soft");
    var onRidge = bgPagoda(470, 446, 0.72, "far") + bgPagoda(3080, 444, 0.82, "far");
    return clouds + behind +
      mountains(width, { seed: 11, base: 470, gap: 230, w: [300, 520], h: [170, 300], grad: "gFar" }) +
      onRidge + mist(width, 380, 150);
  }

  function midLayer(width) {
    var r = rng(29), trees = "";
    for (var x = 120; x < width; x += 260 + r() * 380) trees += pine(x, 440 + r() * 30, 0.55 + r() * 0.3, "pine mid-pine");
    var arch = bgTower(900, 488, 1.12, "mid") + bgPavilion(2060, 478, 1.05, "mid") + bgTower(3300, 490, 1.02, "mid") + bgPavilion(4420, 476, 1, "mid");
    var willows = "";
    for (var wx = 1250; wx < width; wx += 900 + r() * 600) willows += willow(wx, 500, 0.7 + r() * 0.3, "mid-willow");   // none behind the Welcome gate
    return mountains(width, { seed: 23, base: 525, gap: 270, w: [340, 580], h: [130, 230], grad: "gMid", cun: 2 }) +
      arch + trees + willows + mist(width, 450, 130);
  }

  function nearLayer(width) {
    var r = rng(41), trees = "", willows = "";
    for (var x = 200; x < width; x += 340 + r() * 520) trees += pine(x, 505 + r() * 20, 0.8 + r() * 0.4, "pine near-pine");
    for (var wx = 1650; wx < width; wx += 900 + r() * 700) willows += willow(wx, 560, 1 + r() * 0.3, "near-willow");   // none behind the Welcome gate
    return mountains(width, { seed: 37, base: 580, gap: 360, w: [420, 720], h: [70, 150], grad: "gNear", cun: 3 }) +
      trees + willows + mist(width, 520, 90);
  }

  // Sky: circuit lines + concentric rings, echoing the old site's ink/circuit artwork.
  function skyLayer(width) {
    var r = rng(7), d = "", dots = "";
    for (var x = 40; x < width; x += 38 + r() * 110) {
      var len = 60 + r() * 260;
      d += "M" + f1(x) + " 0V" + f1(len);
      if (r() < 0.35) { var dx = (r() < 0.5 ? -1 : 1) * (20 + r() * 50); d += "h" + f1(dx) + "v" + f1(20 + r() * 50); len += 0; x += Math.max(0, dx); }
      dots += '<circle cx="' + f1(x) + '" cy="' + f1(len) + '" r="' + f1(1.8 + r() * 2.2) + '"/>';
    }
    return '<path class="circuit" d="' + d + '"/><g class="circuit-dot">' + dots + "</g>";
  }

  // ------------------------------------------------------------------
  // Ground layer: path, circuitry, decorations and the seven stations.
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

    // stone paving (青石板) along the path
    var paving = "", rows = [[GY + 7, 16, 46], [GY + 23, 20, 58], [GY + 43, 24, 74]];
    rows.forEach(function (row, ri) {
      paving += "M0 " + f1(row[0]) + "H" + width;
      for (var jx = (ri % 2) * row[2] * 0.5 + r() * 20; jx < width; jx += row[2] * (0.8 + r() * 0.45)) paving += "M" + f1(jx) + " " + f1(row[0]) + "v" + f1(row[1]);
    });

    // PCB-style traces under the path
    var traces = "", nodes = "";
    for (var tx = 30; tx < width; tx += 180 + r() * 260) {
      var ty = 620 + r() * 110, tl = 90 + r() * 260, up = 18 + r() * 40;
      traces += "M" + f1(tx) + " " + f1(ty) + "h" + f1(tl * 0.5) + "l" + f1(up) + " " + f1(-up) + "h" + f1(tl * 0.5);
      nodes += '<circle cx="' + f1(tx) + '" cy="' + f1(ty) + '" r="3"/><circle cx="' + f1(tx + tl + up) + '" cy="' + f1(ty - up) + '" r="2.4"/>';
    }

    // Decorations in the gaps between stations
    var deco = "", zones = stations.map(function (s) { return [s.x - s.half, s.x + s.half]; });
    function free(x, pad) { for (var z = 0; z < zones.length; z++) if (x > zones[z][0] - pad && x < zones[z][1] + pad) return false; return true; }
    for (var gx = 80; gx < width - 40; gx += 70 + r() * 160) {
      if (!free(gx, 30)) continue;
      var roll = r();
      if (roll < 0.28) deco += pine(gx, GY + 2, 1.1 + r() * 0.5, "pine ground-pine");
      else if (roll < 0.5) deco += rock(gx, GY + 3, 30 + r() * 40, 14 + r() * 16);
      else if (roll < 0.62 && free(gx, 120)) deco += stoneLantern(gx);
      else deco += grass(gx, GY + 1, 0.8 + r() * 0.6) + grass(gx + 14, GY + 1, 0.6 + r() * 0.5);
    }
    var tufts = "";
    for (var tx2 = 20; tx2 < width; tx2 += 50 + r() * 120) tufts += grass(tx2, GY + 2, 0.5 + r() * 0.5);

    return '<path class="ground-band" d="' + band + '" fill="url(#gGround)"/>' +
      '<path class="ground-edge" d="' + top + '"/>' +
      '<path class="paving" d="' + paving + '"/>' +
      '<path class="ground-strokes" d="' + strokes + '"/>' +
      '<path class="circuit ground-circuit" d="' + traces + '"/><g class="circuit-dot">' + nodes + "</g>" +
      '<g class="tufts">' + tufts + "</g>" +
      '<g class="deco">' + deco + "</g>";
  }

  function foreground(width) {
    var r = rng(71), reeds = "", ink = "", ponds = "";
    for (var x = 60; x < width; x += 140 + r() * 420) {
      var n = 3 + Math.floor(r() * 4), base = 790 + r() * 10;
      for (var i = 0; i < n; i++) {
        var h = 70 + r() * 110, lean = (r() - 0.4) * 50, bx = x + i * (6 + r() * 8);
        reeds += "M" + f1(bx) + " " + f1(base) + "q" + f1(lean * 0.3) + " " + f1(-h * 0.6) + " " + f1(lean) + " " + f1(-h);
      }
      if (r() < 0.4) ink += '<circle cx="' + f1(x + 40 + r() * 80) + '" cy="' + f1(730 + r() * 60) + '" r="' + f1(2 + r() * 5) + '"/>';
    }
    // lotus ponds: still water, round leaves, a few flowers on tall stems
    for (var px = 420; px < width; px += 1100 + r() * 800) {
      var py = 770 + r() * 14, prx = 150 + r() * 70, leaves = "", flowers = "";
      for (var k = 0; k < 6; k++) {
        var lx = px + (r() - 0.5) * prx * 1.5, ly = py + (r() - 0.5) * 14, lr = 12 + r() * 9;
        leaves += '<ellipse cx="' + f1(lx) + '" cy="' + f1(ly) + '" rx="' + f1(lr) + '" ry="' + f1(lr * 0.36) + '"/>' +
          '<path class="leaf-vein" d="M' + f1(lx) + " " + f1(ly) + "L" + f1(lx + lr * 0.8) + " " + f1(ly - lr * 0.1) + '"/>';
      }
      for (var f = 0; f < 2; f++) {
        var fx = px + (f ? 1 : -1) * (30 + r() * 50), fy = py - 46 - r() * 30;
        flowers += '<path class="lotus-stem" d="M' + f1(fx) + " " + f1(py) + "Q" + f1(fx + 6) + " " + f1((py + fy) / 2) + " " + f1(fx) + " " + f1(fy) + '"/>' +
          '<path class="lotus-petal" d="M' + f1(fx) + " " + f1(fy + 2) + "C" + f1(fx - 12) + " " + f1(fy - 4) + " " + f1(fx - 8) + " " + f1(fy - 16) + " " + f1(fx) + " " + f1(fy - 20) +
            "C" + f1(fx + 8) + " " + f1(fy - 16) + " " + f1(fx + 12) + " " + f1(fy - 4) + " " + f1(fx) + " " + f1(fy + 2) + "Z" +
            "M" + f1(fx - 2) + " " + f1(fy + 1) + "C" + f1(fx - 16) + " " + f1(fy - 1) + " " + f1(fx - 18) + " " + f1(fy - 10) + " " + f1(fx - 14) + " " + f1(fy - 14) + "C" + f1(fx - 8) + " " + f1(fy - 8) + " " + f1(fx - 4) + " " + f1(fy - 4) + " " + f1(fx - 2) + " " + f1(fy + 1) + "Z" +
            "M" + f1(fx + 2) + " " + f1(fy + 1) + "C" + f1(fx + 16) + " " + f1(fy - 1) + " " + f1(fx + 18) + " " + f1(fy - 10) + " " + f1(fx + 14) + " " + f1(fy - 14) + "C" + f1(fx + 8) + " " + f1(fy - 8) + " " + f1(fx + 4) + " " + f1(fy - 4) + " " + f1(fx + 2) + " " + f1(fy + 1) + 'Z"/>';
      }
      ponds += '<g class="lotus-pond"><ellipse class="pond" cx="' + f1(px) + '" cy="' + f1(py + 4) + '" rx="' + f1(prx) + '" ry="' + f1(prx * 0.13) + '"/>' +
        '<path class="ripple" d="M' + f1(px - prx * 0.6) + " " + f1(py + 6) + "h" + f1(prx * 0.3) + "M" + f1(px + prx * 0.2) + " " + f1(py + 10) + "h" + f1(prx * 0.36) + '"/>' +
        flowers + '<g class="lotus-leaf">' + leaves + "</g></g>";
    }
    return ponds + '<path class="reeds" d="' + reeds + '"/><g class="ink-dots">' + ink + "</g>";
  }


  // ------------------------------------------------------------------
  // Stations (each drawn around its own x; ground at y = GY)
  // ------------------------------------------------------------------
  var S = {};

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
      '<g class="door-stud">' + studs + "</g>" +
      '<path class="sill" d="M-131 538H-49V544H-131Z"/>' +
      columns([-270, -150, -30, 90], 412, 544) +
      architrave(-282, 102, 404) +
      dougong(-270, 90, 386, 60) +
      tangRoof(cx, 387, 252, 76) +
      '<g class="plaque" transform="translate(' + cx + ' 386)"><rect x="-60" y="0" width="120" height="25" rx="2"/><text x="0" y="18" text-anchor="middle">WELCOME</text></g>' +
      '<g class="hanging-lantern" transform="translate(120 398)"><path class="rope" d="M0 -2V10"/><circle class="lantern-glow" cx="0" cy="28" r="30"/><ellipse class="lantern-body" cx="0" cy="28" rx="11" ry="15"/><path class="lantern-rim" d="M-6 13h12M-6 43h12"/></g>' +
      // notice board with a small Tang roof
      '<g class="board" data-open="news" transform="translate(205 0)">' +
        '<path class="post" d="M-54 ' + y + 'V442M54 ' + y + 'V442"/>' +
        tangRoof(0, 444, 76, 22, { chiwei: 8, top: 0.5 }) +
        '<rect class="board-face" x="-62" y="448" width="124" height="72" rx="3"/>' +
        '<text class="board-title" x="0" y="465" text-anchor="middle">NEWS</text>' +
        '<g class="notes"><rect x="-52" y="473" width="30" height="36" transform="rotate(-4 -37 491)"/><rect x="-14" y="471" width="30" height="40" transform="rotate(3 1 491)"/><rect x="24" y="474" width="28" height="34" transform="rotate(-2 38 491)"/></g>' +
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
          '<path d="M3 ' + (-h + 6) + "h" + (w - 6) + "M3 " + (-8) + "h" + (w - 6) + '"/>' +
          "</g></g>";
        x += w + 2; prev = p.theme;
      });
      // shelf-end ornaments
      if (i === 1) books += '<g class="vase" transform="translate(150 ' + shelfY[i] + ')"><path d="M-8 0C-14 -10 -10 -20 -4 -24V-30H4V-24C10 -20 14 -10 8 0Z"/><path class="twig" d="M0 -30C-2 -40 -8 -46 -14 -48M0 -32C3 -42 9 -46 15 -46"/></g>';
      if (i === 2) books += '<g class="scrolls" transform="translate(-60 ' + shelfY[i] + ')"><rect x="0" y="-12" width="70" height="12" rx="6"/><rect x="10" y="-24" width="62" height="12" rx="6"/><circle cx="4" cy="-6" r="3"/><circle cx="14" cy="-18" r="3"/></g>' +
        '<g class="plant" transform="translate(130 ' + shelfY[i] + ')"><path d="M-10 0h20l-3 -14h-14z"/><path class="leaf" d="M0 -14C-4 -26 -14 -30 -20 -30C-14 -24 -8 -18 0 -14ZM0 -14C4 -28 12 -34 20 -34C14 -26 8 -18 0 -14ZM0 -14C0 -26 -2 -36 -6 -42C2 -36 4 -26 0 -14Z"/></g>';
    });
    var shelves = shelfY.map(function (sy) { return '<rect class="shelf" x="-186" y="' + sy + '" width="372" height="6" rx="1"/>'; }).join("");
    return '<g class="st st-research" data-station="research">' +
      '<rect class="hit" x="-300" y="110" width="600" height="452"/>' +
      terrace(-264, 264, 536, y, 120) +
      '<rect class="interior" x="-200" y="388" width="400" height="148"/>' +
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
        seats += '<rect class="seat" x="' + sx + '" y="' + sy + '" width="30" height="26" rx="6"/>';
        if (r() < 0.62) seats += '<g class="audience"><circle cx="' + (sx + 15) + '" cy="' + (sy - 9) + '" r="9"/><path d="M' + (sx + 3) + " " + (sy + 6) + "Q" + (sx + 15) + " " + (sy - 6) + " " + (sx + 27) + " " + (sy + 6) + 'Z"/></g>';
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
      '<path class="stage" d="M-364 540H174V' + y + 'H-364Z"/><path class="stage-edge" d="M-364 540H174"/>' +
      '<g class="screen-talk"><rect class="screen-frame" x="-252" y="328" width="294" height="171" rx="3"/>' + slides +
        '<path class="screen-glare" d="M-246 334L-190 334L-246 380Z"/></g>' +
      '<path class="beam" d="M-105 505L-80 540H-130Z"/>' +
      '<g class="podium" transform="translate(100 0)"><path class="podium-body" d="M-24 ' + y + 'L-20 474H20L24 ' + y + 'Z"/><path class="podium-top" d="M-28 474L-24 464H24L28 474Z"/>' +
        '<path class="mic" d="M-6 464Q-8 450 -18 446"/><circle class="mic-head" cx="-19" cy="445" r="3"/><rect class="podium-badge" x="-10" y="492" width="20" height="14" rx="2"/></g>' +
      '<path class="curtain" d="M-338 290H-296C-300 360 -292 460 -300 548H-338Z"/><path class="curtain" d="M106 290H148V548H112C104 460 112 360 106 290Z"/>' +
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
    for (var row = 0; row < 3; row++) for (var k = 0; k < 9 - row; k++) keys += '<circle cx="' + (-80 + row * 10 + k * 20) + '" cy="' + (486 + row * 16) + '" r="6"/>';
    var slips = "", pos = [[-150, 300, -12], [-60, 262, -4], [50, 268, 6], [150, 306, 13]];
    tutorials.forEach(function (t, i) {
      var p = pos[i % pos.length];
      slips += '<g class="slip" data-tutorial="' + t.id + '" transform="translate(' + p[0] + " " + p[1] + ") rotate(" + p[2] + ')"><g class="slip-float" style="animation-delay:' + (i * -0.9) + 's">' +
        '<rect x="-38" y="-18" width="76" height="36" rx="2"/><text x="0" y="6" text-anchor="middle">' + esc(t.label) + '</text></g><title>' + esc(t.title) + '</title></g>';
    });
    var splat = '<g class="splat"><circle cx="-176" cy="548" r="9"/><circle cx="-160" cy="538" r="4"/><circle cx="-190" cy="532" r="3"/><circle cx="172" cy="546" r="7"/><circle cx="188" cy="536" r="3"/><circle cx="158" cy="530" r="2.5"/></g>';
    return '<g class="st st-tutorials" data-station="tutorials">' +
      '<rect class="hit" x="-230" y="230" width="460" height="332"/>' +
      gshadow(0, 182) +
      '<circle class="halo" cx="0" cy="400" r="150"/>' +
      '<path class="slab" d="M-170 ' + y + 'V530Q-170 522 -160 522H160Q170 522 170 530V' + y + 'Z"/>' +
      '<g class="sheet"><path d="M-62 440V344Q-62 340 -58 340H58Q62 340 62 344V440Z"/><text x="0" y="372" text-anchor="middle">Tutorials</text><path class="sheet-lines" pathLength="1" d="M-44 390H40M-44 402H30M-44 414H36"/></g>' +
      '<path class="tw-body" d="M-128 522V470Q-128 452 -110 448L-80 440H80L110 448Q128 452 128 470V522Z"/>' +
      '<path class="tw-arc" d="M-60 458Q0 420 60 458"/>' +
      '<g class="tw-keys">' + keys + "</g>" +
      '<path class="tw-carriage" d="M-120 430H120V444H-120Z"/>' +
      '<circle class="tw-knob" cx="-128" cy="437" r="10"/><circle class="tw-knob" cx="128" cy="437" r="10"/>' +
      '<path class="tw-lever" d="M-138 432L-170 410"/>' +
      splat + slips +
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
      '<path class="branch" d="M-230 250C-120 238 40 246 200 232M120 240C140 226 160 222 180 222"/>' +
      '<path class="leafs" d="M180 222c6 -8 16 -8 20 -4c-8 4 -14 6 -20 4zM150 236c4 -8 14 -10 18 -6c-6 4 -12 6 -18 6z"/>' +
      cranes +
      sign(-170, 262, "WRITING", 130) +
      // a four-panel folding screen (屏风) painted with ink mountains, behind the desk
      '<g class="pingfeng">' + [-148, -74, 0, 74].map(function (x, i) {
        return '<rect class="pf-panel" x="' + x + '" y="404" width="74" height="96"/>' +
          '<path class="pf-ink" d="M' + (x + 6) + ' 486Q' + (x + 18) + ' ' + (452 - i * 4) + ' ' + (x + 30) + ' 474Q' + (x + 42) + ' ' + (440 + i * 5) + ' ' + (x + 58) + ' 470Q' + (x + 64) + ' 462 ' + (x + 70) + ' 478"/>' +
          (i === 1 ? '<circle class="pf-sun" cx="' + (x + 54) + '" cy="426" r="7"/>' : "") +
          (i === 2 ? '<path class="pf-ink" d="M' + (x + 10) + ' 430q8 -5 16 0M' + (x + 20) + ' 436q6 -4 12 0"/>' : "");
      }).join("") + "</g>" +
      '<path class="desk" d="M-160 500H160V512H-160ZM-146 512V' + y + 'H-132V522H132V' + y + 'H146V512Z"/>' +
      '<g class="scroll"><rect x="-120" y="484" width="150" height="16"/><rect x="-126" y="481" width="10" height="22" rx="3"/><rect x="26" y="481" width="10" height="22" rx="3"/><path class="scroll-ink" d="M-104 492h24M-74 492h18"/></g>' +
      // what she writes when she sits down (revealed stroke by stroke)
      '<g class="write-hello"><text class="hello-text" x="-31" y="496.6">Hello World!</text><rect class="hello-cover" x="-33" y="485.2" width="58" height="13.6"/></g>' +
      '<rect class="inkstone" x="46" y="488" width="34" height="12" rx="4"/>' +
      '<g class="brushes"><path d="M92 500V476M102 500V470M112 500V478"/><path class="brush-tip" d="M92 476l-2 -9h4zM102 470l-2 -9h4zM112 478l-2 -9h4z"/></g>' +
      '<g class="lamp" transform="translate(138 500)"><circle class="lamp-glow" cx="0" cy="-26" r="36"/><path d="M-10 0h20l-4 -8h-12z"/><path class="flame" d="M0 -26C-5 -18 -4 -12 0 -10C4 -12 5 -18 0 -26Z"/><path d="M-5 -8V-12H5V-8Z"/></g>' +
      '<ellipse class="cushion" cx="-60" cy="' + (y - 4) + '" rx="46" ry="9"/>' +
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
      sign(-120, 330, "LIFE", 100) +
      '<path class="branch" d="M-300 300C-200 290 -60 296 40 288"/>' +
      // suitcase
      '<g class="life-item suitcase" data-life="travel" transform="translate(-250 ' + y + ')"><title>Travel</title>' +
        '<rect class="case" x="-32" y="-64" width="64" height="62" rx="7"/><path class="case-handle" d="M-12 -64V-74H12V-64"/><path class="case-strap" d="M-32 -40H32"/>' +
        '<circle class="sticker s1" cx="-14" cy="-22" r="7"/><rect class="sticker s2" x="6" y="-30" width="16" height="11" rx="2" transform="rotate(10 14 -24)"/><path class="sticker s3" d="M-2 -54l5 9h-10z"/></g>' +
      // stove + pot with steam
      '<g class="life-item stove" data-life="food" transform="translate(-130 ' + y + ')"><title>Cooking</title>' +
        '<g class="steam"><path d="M-8 -80c-8 -10 8 -16 0 -28"/><path d="M6 -84c-8 -10 8 -16 0 -28"/><path d="M18 -78c-6 -8 6 -14 0 -22"/></g>' +
        '<path class="stove-body" d="M-28 0V-34H28V0Z"/><rect class="stove-fire" x="-14" y="-28" width="28" height="12" rx="3"/>' +
        '<path class="pot" d="M-30 -36H30V-44Q30 -66 0 -66Q-30 -66 -30 -44Z"/><path class="pot-lid" d="M-24 -62Q0 -74 24 -62M-4 -72h8"/></g>' +
      // cushion + sleeping cat
      '<g class="life-item nap" data-life="cats" transform="translate(10 0)"><title>Cats</title>' +
        '<ellipse class="cushion" cx="0" cy="' + (y - 6) + '" rx="62" ry="16"/>' + sleepingCat(0, y - 16) + '</g>' +
      // projector + screen
      '<g class="life-item cinema" data-life="cats" transform="translate(170 0)"><title>Cat gallery</title>' +
        '<path class="beam-light" d="M-40 ' + (y - 58) + 'L70 ' + (y - 150) + 'V' + (y - 60) + 'Z"/>' +
        '<path class="pole" d="M68 ' + y + 'V' + (y - 164) + 'M162 ' + y + 'V' + (y - 164) + '"/>' +
        '<rect class="screen" x="70" y="' + (y - 156) + '" width="90" height="100"/>' +
        (slides || '<g class="screen-cat" transform="translate(88 ' + (y - 140) + ') scale(.6)"><path d="M31 68C20 68 19 51 28 43C34 38 51 38 57 44C65 52 63 68 53 68Z"/><ellipse cx="47" cy="26" rx="20" ry="17"/><path d="M30 17L29 4L40 12ZM55 12L66 5L65 18Z"/></g>') +
        '<rect class="screen-edge" x="74" y="' + (y - 152) + '" width="82" height="76"/>' +
        '<text class="screen-label" x="115" y="' + (y - 64) + '" text-anchor="middle">6 CATS</text>' +
        '<path class="tripod" d="M-40 ' + (y - 50) + 'L-58 ' + y + 'M-40 ' + (y - 50) + 'L-22 ' + y + 'M-40 ' + (y - 50) + 'V' + y + '"/>' +
        '<rect class="projector" x="-62" y="' + (y - 74) + '" width="38" height="24" rx="4"/><circle class="reel" cx="-52" cy="' + (y - 84) + '" r="10"/><circle class="reel" cx="-30" cy="' + (y - 84) + '" r="8"/></g>' +
    '</g>';
  };

  // 8. Contact: a post box and a signpost; the path fades into mist.
  S.contact = function () {
    var y = GY;
    return '<g class="st st-contact" data-station="contact">' +
      '<rect class="hit" x="-200" y="330" width="460" height="232"/>' +
      gshadow(-60, 22) + gshadow(110, 20) +
      '<g class="mailbox" transform="translate(-60 0)"><path class="post" d="M0 ' + y + 'V482"/>' +
        '<path class="box" d="M-34 482V446Q-34 420 0 420Q34 420 34 446V482Z"/><path class="slot" d="M-16 440H16"/>' +
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
    character: character, portrait: portrait, cat: cat,
    sky: skyLayer, far: farLayer, mid: midLayer, near: nearLayer,
    ground: ground, foreground: foreground, stations: S,
    usMap: usMap, foodWheel: foodWheel, mysteryCat: mysteryCat
  };
})();
