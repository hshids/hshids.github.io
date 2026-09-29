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

  // The head: face, features and both hairstyles. `look` = "front" | "down" (eyes lowered, for petting).
  function head(h, s, look) {
    var down = look === "down";
    var face = "M50.2 27.5C50 19.5 54.4 15 60 15C65.6 15 70 19.5 69.8 27.5C69.6 34.5 66.2 40.6 60 43C53.8 40.6 50.4 34.5 50.2 27.5Z";
    return '' +
      // night: low bun and flower pin behind the head, ears with pearl studs
      '<g class="h-up">' +
        '<circle cx="47.4" cy="31.4" r="6.4" fill="url(#' + h + ')"' + sk(HAIR_LINE, 1.2) + "/>" +
        P("M42.6 29.6Q47.4 26.4 52 29.2M42.8 33.6Q47.4 36.6 51.8 33.4", "", HAIR_HI, 0.8) +
        P("M48.6 25.2L55.2 28.8", "", GOLD, 1) +
        '<g fill="#f7f3ea"' + sk("#cfc4b0", 0.5) + '><circle cx="44.6" cy="25.4" r="1.9"/><circle cx="47.6" cy="23.8" r="1.9"/><circle cx="47.2" cy="27.4" r="1.8"/><circle cx="43.4" cy="28.2" r="1.7"/></g>' +
        '<g fill="' + GOLD + '"><circle cx="44.6" cy="25.4" r=".55"/><circle cx="47.6" cy="23.8" r=".55"/></g>' +
        P("M50.4 27.9Q47.8 27.4 48.2 30.9Q48.8 34 51.1 33.6Z", SKIN, INK, 1) +
        P("M69.6 27.9Q72.2 27.4 71.8 30.9Q71.2 34 68.9 33.6Z", SKIN, INK, 1) +
        '<circle cx="49.4" cy="35" r=".9" fill="#f5f2ea"' + sk("#b9b2a6", 0.4) + "/>" +
        '<circle cx="70.6" cy="35" r=".9" fill="#f5f2ea"' + sk("#b9b2a6", 0.4) + "/>" +
      "</g>" +
      P(face, "url(#" + s + ")", INK, 1.2) +
      P("M66.4 21.6C69.4 27.6 68.6 35.6 62.8 41.6C66.8 39.8 69.5 34.9 69.8 27.5C69.8 25.3 69.3 23.3 68.4 21.6Z", SKIN_SH, "", 0, ' opacity=".4"') +
      '<g opacity=".3" fill="' + BLUSH + '"><ellipse cx="53.6" cy="33.2" rx="2.5" ry="1.3"/><ellipse cx="66.4" cy="33.2" rx="2.5" ry="1.3"/></g>' +
      (down
        ? P("M53 28.8Q55.4 30.4 57.8 28.8M62.2 28.8Q64.6 30.4 67 28.8", "", INK, 1.1)
        : '<g class="c-eyes">' +
            P("M52.8 28.4Q55.4 26.4 58 28.3Q55.4 29.9 52.8 28.4Z", "#fbf7f2") +
            P("M62 28.3Q64.6 26.4 67.2 28.4Q64.6 29.9 62 28.3Z", "#fbf7f2") +
            '<circle cx="55.5" cy="28.2" r="1.35" fill="#2c1d17"/><circle cx="64.5" cy="28.2" r="1.35" fill="#2c1d17"/>' +
            '<circle cx="55.9" cy="27.7" r=".42" fill="#fff"/><circle cx="64.9" cy="27.7" r=".42" fill="#fff"/>' +
            P("M52.5 28.5Q55.4 25.9 58.2 28.1M61.8 28.1Q64.6 25.9 67.5 28.5M52.5 28.5L51.7 28M67.5 28.5L68.3 28", "", "#1b1210", 1.1) +
            P("M53.5 29.2Q55.4 30.1 57.5 29M62.5 29Q64.6 30.1 66.5 29.2", "", "#b98f7e", 0.5) +
          "</g>" +
          '<g class="c-eyes-shut">' + P("M53 28.8Q55.4 30.4 57.8 28.8M62.2 28.8Q64.6 30.4 67 28.8", "", INK, 1.1) + "</g>") +
      P("M52.6 24.5Q55.2 23 58 24.1M62 24.1Q64.8 23 67.4 24.5", "", "#2a1f1c", 1.05) +
      P("M60.3 29.6Q59.3 32.6 59.9 33.4Q60.7 33.9 61.5 33.3", "", "#c38f7b", 0.8) +
      '<path class="c-mouth" d="M57.4 37.1Q58.8 36.2 60 36.6Q61.2 36.2 62.6 37.1Q61.2 38.9 60 38.9Q58.8 38.9 57.4 37.1Z" fill="#c9726f"' + sk("#a6504e", 0.5) + "/>" +
      '<ellipse class="c-mouth-open" cx="60" cy="37.7" rx="1.6" ry="1.2" fill="#7b2f2c"/>' +
      // day: side-parted wavy hair framing the face
      '<g class="h-down">' +
        P("M49.2 29C48 19 53 11.6 60.5 11.6C68 11.6 72.7 18.4 71 29C69.6 24 67 20.4 63 18.8C60 21.8 55 24 51 25.4C50.3 26.6 49.6 27.8 49.2 29Z", "url(#" + h + ")", HAIR_LINE, 1.2) +
        P("M56 12.6C52 15.8 50.2 20.8 50 27.4C52.4 23.3 55.4 20.7 59.5 19.1Z", "url(#" + h + ")", HAIR_LINE, 1) +
        P("M50.4 22C46.6 30 51.6 36 47.4 43C45.6 48 49 51.8 51.8 50C53.4 45 50.4 40 52.9 34C54.1 30 52 26 50.4 22Z", "url(#" + h + ")", HAIR_LINE, 1) +
        P("M69.6 22C73.4 30 68.4 36 72.6 43C74.4 48 71 51.8 68.2 50C66.6 45 69.6 40 67.1 34C65.9 30 68 26 69.6 22Z", "url(#" + h + ")", HAIR_LINE, 1) +
        P("M56.6 14.4C62 14.6 67.6 17.4 69.8 23M53.6 17.2C55.6 15 58.4 13.8 61.4 13.6", "", HAIR_HI, 0.9, ' opacity=".85"') +
      "</g>" +
      // night: hair pulled back smoothly
      '<g class="h-up">' +
        P("M49.4 28C48.4 18.4 53.2 12 60.2 11.8C67.4 11.8 72 18 70.8 28C69 22.4 65.4 19.2 60.2 19C55 19.2 51.2 22.4 49.4 28Z", "url(#" + h + ")", HAIR_LINE, 1.2) +
        P("M53.2 16.6C56.6 14.2 62.6 13.6 67 15.6M51 22C53.6 18.2 57.6 16.4 62 16.2", "", HAIR_HI, 0.85, ' opacity=".85"') +
      "</g>";
  }

  function character(uid) {
    var h = "hjHair" + uid, c = "hjCoat" + uid, g = "hjGlow" + uid, s = "hjSkin" + uid, q = "hjQipao" + uid;

    // --- shapes shared by several poses ---
    var SLEEVE_F = "M75.4 53.2C80.4 55.8 82.9 61.8 83.3 71.8L84.5 107.6C84.7 111.6 81.9 114.2 78.9 114C76.3 113.8 75.1 111.6 75.1 108.6L73.9 75.6C73.5 67.6 72.3 60.6 71.3 55.6Z";
    var ARM_F = "M75.8 53.6C80.2 56 82.4 61.6 82.6 70.6L83.4 107.6C83.6 112 81.6 114.6 79 114.4C76.8 114.2 75.8 112.2 75.8 109L75.2 74.6C74.8 66.6 73.6 59.6 72.6 55.6Z";
    var HAND_F = "M83.6 112.8C84.2 117.2 82.4 120.4 79.6 120.2C77 120 75.7 117.2 75.9 113.2Z";
    var handF = P(HAND_F, SKIN, INK, 1.1);
    var handB = P(mirrorPath(HAND_F), SKIN, INK, 1.1);
    var coatBody = "M45.5 51.5C41.5 53 40.3 57.5 40.3 63.5L37.6 150C48 153.8 72 153.8 82.4 150L79.7 63.5C79.7 57.5 78.5 53 74.5 51.5C68.5 49.4 51.5 49.4 45.5 51.5Z";
    var qipaoBody = "M47.2 51C43.8 52.4 42.8 56.8 43 61.8C43.4 69.8 45 77.8 46.2 86C44.4 94 43.2 102 43.2 110C43.2 132 44.6 156 45.8 176H74.2C75.4 156 76.8 132 76.8 110C76.8 102 75.6 94 73.8 86C75 77.8 76.6 69.8 77 61.8C77.2 56.8 76.2 52.4 72.8 51C68 49.4 52 49.4 47.2 51Z";
    var neck = P("M56.4 40L56.1 52H63.9L63.6 40Z", SKIN, INK, 1) + P("M56.3 42.4Q60 46.4 63.7 42.4V46Q60 49.4 56.3 46Z", SKIN_SH, "", 0, ' opacity=".7"');
    // a red hardcover: coloured cover, cream page block, spine, gold title and a ribbon
    function book(col, title, ribbon) {
      return P("M76.6 106.4H89.2C89.9 106.4 90.4 106.9 90.4 107.6V124.6C90.4 125.3 89.9 125.8 89.2 125.8H76.6Z", col, INK, 1.1) +
        P("M89.4 107.3H91.7V124.9H89.4", "#f4ecdb", INK, 0.8) + P("M90.2 109.6V122.6M91 109.6V122.6", "", "#cdbfa6", 0.45) +
        P("M79 106.8V125.4", "", "rgba(0,0,0,.28)", 1.1) + P("M81.4 111.2H87.4M81.4 113.8H86", "", title, 0.9) +
        (ribbon ? P("M85.6 125.8V130.6L84.6 129.5L83.6 130.6V125.8", GOLD) : "");
    }
    function readArms(day) {
      var fill = day ? "url(#" + c + ")" : SKIN, line = day ? COAT_LINE : INK;
      var upper = day ? "M44.6 53.2C39.6 55.8 37.4 61.8 37.2 70L37 86C37 90 40 92.4 43 91.8C45.6 91.2 46.8 89 46.8 86L47.4 72C47.6 65 48.2 59.6 48.7 55.6Z"
        : "M44.2 53.6C39.8 56 37.8 61.6 37.6 69.6L37.4 86C37.4 90 40.2 92.2 43 91.6C45.4 91 46.4 89 46.4 86L46.8 72C47 65 47.6 59.6 47.8 55.6Z";
      var fore = day ? "M39.6 85.4C43 83.6 49.6 88.6 54.4 92.6C56.2 94.4 55.2 97.6 52.6 97.8C48 96 42 93.4 39.4 91.4C37.4 89.4 37.8 86.4 39.6 85.4Z"
        : "M40 85.8C43.2 84.2 49.6 88.8 54 92.6C55.8 94.4 54.8 97.4 52.4 97.6C48 95.8 42.4 93.4 39.8 91.4C37.8 89.4 38.2 86.6 40 85.8Z";
      return P(upper, fill, line, 1.3) + P(fore, fill, line, 1.3) + P(mirrorPath(upper), fill, line, 1.3) + P(mirrorPath(fore), fill, line, 1.3);
    }
    function typeArms(day) {
      var fill = day ? "url(#" + c + ")" : SKIN, line = day ? COAT_LINE : INK;
      var upperB = day ? "M44.6 53.2C39.6 55.8 37.4 61.8 37.2 70L37 86C37 90 40 92.4 43 91.8C45.6 91.2 46.8 89 46.8 86L47.4 72C47.6 65 48.2 59.6 48.7 55.6Z"
        : "M44.2 53.6C39.8 56 37.8 61.6 37.6 69.6L37.4 86C37.4 90 40.2 92.2 43 91.6C45.4 91 46.4 89 46.4 86L46.8 72C47 65 47.6 59.6 47.8 55.6Z";
      return P(upperB, fill, line, 1.3) +
        '<g class="type-hand type-hand-b">' + P("M40 85.4C46 86 64 92 76 96.4C78.6 97.6 78 101 75.4 101.2C62 99.6 46 94.6 40.4 91.6C38.2 90 38.2 86.4 40 85.4Z", fill, line, 1.3) +
          '<ellipse cx="78.4" cy="99.2" rx="3.4" ry="2.8" fill="' + SKIN + '"' + sk(INK, 1.1) + "/></g>" +
        P(mirrorPath(upperB), fill, line, 1.3) +
        '<g class="type-hand type-hand-f">' + P("M78 85.8C82.6 86.8 90 91.6 95.4 95.2C97.4 96.8 96.6 100 94 100.2C88.4 99 81.4 96.2 77.6 92.8C75.8 91 76.2 86.6 78 85.8Z", fill, line, 1.3) +
          '<ellipse cx="97" cy="98.4" rx="3.4" ry="2.8" fill="' + SKIN + '"' + sk(INK, 1.1) + "/></g>";
    }

    return '' +
    '<svg class="hj-char-svg" viewBox="0 0 120 200" aria-hidden="true" focusable="false">' +
    "<defs>" +
      '<linearGradient id="' + h + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d2528"/><stop offset=".55" stop-color="#1a1517"/><stop offset="1" stop-color="#100c0e"/></linearGradient>' +
      '<linearGradient id="' + c + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ab8659"/><stop offset=".42" stop-color="#c9a67b"/><stop offset=".7" stop-color="#bf9b6f"/><stop offset="1" stop-color="#9f7a50"/></linearGradient>' +
      '<radialGradient id="' + s + '" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#f7e0d1"/><stop offset=".75" stop-color="' + SKIN + '"/><stop offset="1" stop-color="#e6c3b0"/></radialGradient>' +
      '<linearGradient id="' + q + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#101014"/><stop offset=".3" stop-color="#2a2830"/><stop offset=".55" stop-color="#18171c"/><stop offset="1" stop-color="#0e0e12"/></linearGradient>' +
      '<radialGradient id="' + g + '" cx=".5" cy=".55" r=".5"><stop offset="0" style="stop-color:var(--c-glow)"/><stop offset="1" style="stop-color:var(--c-glow);stop-opacity:0"/></radialGradient>' +
    "</defs>" +
    '<ellipse class="c-glow" cx="60" cy="112" rx="82" ry="104" fill="url(#' + g + ')"/>' +
    '<g class="c-flip">' +
    '<ellipse class="c-shadow" cx="61" cy="192.4" rx="21" ry="3.4"/>' +

    // ===== standing figure =====
    '<g class="c-root">' +
      '<g class="c-leg c-leg-b">' +
        '<g class="o-day">' + P("M52.4 140H57.4L57 186.5H53Z", TIGHTS, "#17151a", 1.1) +
          P("M51.6 185H57.6C60.8 185 62.6 186.6 62.6 189C62.6 190.6 61.6 191.6 60.1 191.6H52.6C51.4 191.6 50.9 190.8 50.9 189.6Z", SHOE, INK, 1.1) + "</g>" +
        '<g class="o-night">' + P("M53 166H57L56.6 186H53.4Z", SKIN, INK, 1) +
          P("M52.6 185.4H57C59.6 185.8 61.4 187.4 61.6 190L58 190.2L57.4 188.6L56.8 191.6H53.8C53 191.6 52.5 190.9 52.6 189.6Z", HEEL, "#000", 1) + "</g>" +
      "</g>" +
      '<g class="c-leg c-leg-f">' +
        '<g class="o-day">' + P("M62.6 140H67.6L67 186.5H63Z", "#35323a", "#17151a", 1.1) +
          P("M62 185H68C71.2 185 73 186.6 73 189C73 190.6 72 191.6 70.5 191.6H63C61.8 191.6 61.3 190.8 61.3 189.6Z", "#46332a", INK, 1.1) + "</g>" +
        '<g class="o-night">' + P("M63 166H67L66.6 186H63.4Z", SKIN, INK, 1) +
          P("M62.6 185.4H67C69.6 185.8 71.4 187.4 71.6 190L68 190.2L67.4 188.6L66.8 191.6H63.8C63 191.6 62.5 190.9 62.6 189.6Z", HEEL, "#000", 1) + "</g>" +
      "</g>" +
      '<g class="c-upper">' +
        // long hair behind the body (day)
        '<g class="c-hairback h-down">' +
          P("M49 20C43 30 45.4 42 39.4 54C33.6 66 42.4 76 35.8 88C30.6 99 38 108.4 44 111C49 113.6 55 109.6 60 111.6C65 109.6 71 113.6 76 111C82 108.4 89.4 99 84.2 88C77.6 76 86.4 66 80.6 54C74.6 42 77 30 71 20C67 11 53 11 49 20Z", "url(#" + h + ")", HAIR_LINE, 1.3) +
          P("M44 57C38.6 67 46.4 76 40.6 87.6C36.4 97 41.6 104 45.2 107.6M76 57C81.4 67 73.6 76 79.4 87.6C83.6 97 78.4 104 74.8 107.6", "", HAIR_HI, 1.1, ' opacity=".6"') +
          P("M36.4 102.6C33.8 107 37.2 112.2 42 111M83.6 102.6C86.2 107 82.8 112.2 78 111", "", HAIR_HI, 1.1, ' opacity=".75"') +
        "</g>" +
        '<g class="c-torso">' +
          '<g class="o-day">' + neck +
            P("M54.6 50.5L60 66L65.4 50.5Z", SHIRT, "#cfc6b8", 0.8) +
            P(coatBody, "url(#" + c + ")", COAT_LINE, 1.4) +
            P("M72 56C76 60 78 66 78.4 74L80.8 150C78 151 75.6 151.6 73 152L71.6 90Z", COAT_SH, "", 0, ' opacity=".35"') +
            P("M54.6 50.2L59.8 66.5L53 72.5L48.4 63L46.6 55.4L50.4 51.2Z", COAT_HI, COAT_LINE, 1.1) +
            P("M65.4 50.2L60.2 66.5L67 72.5L71.6 63L73.4 55.4L69.6 51.2Z", COAT_HI, COAT_LINE, 1.1) +
            P("M48.4 63L51.5 61.6M71.6 63L68.5 61.6M44.6 53.6L51 55.2M75.4 53.6L69 55.2", "", COAT_LINE, 0.8) +
            P("M60.2 66.5L62 151.6", "", COAT_LINE, 0.9, ' opacity=".6"') +
            '<g fill="' + BUTTON + '"' + sk(COAT_LINE, 0.7) + '><circle cx="54.5" cy="77" r="1.5"/><circle cx="66.5" cy="77" r="1.5"/><circle cx="54.5" cy="101" r="1.5"/><circle cx="66.5" cy="101" r="1.5"/><circle cx="54.5" cy="117" r="1.5"/><circle cx="66.5" cy="117" r="1.5"/></g>' +
            P("M39.1 86.6H80.9L81.1 92.6H38.9Z", COAT_SH, COAT_LINE, 1) +
            '<rect x="57.2" y="85.6" width="7.6" height="8" rx="1.4" fill="none"' + sk(COAT_LINE, 1.1) + "/>" +
            P("M61.5 92.6L58.8 107.5L61.8 108.1L64 93.1Z", COAT_SH, COAT_LINE, 0.9) +
            P("M43.4 113.5L51 111.4M69 111.4L76.6 113.5M40.6 146C50 148.6 70 148.6 79.4 146", "", COAT_LINE, 0.9, ' opacity=".7"') +
          "</g>" +
          '<g class="o-night">' + neck +
            P(qipaoBody, "url(#" + q + ")", "#050507", 1.4) +
            P("M55.2 44.6H64.8V51.2C62 52.4 58 52.4 55.2 51.2Z", QIPAO, QIPAO_LINE, 1) +
            P("M55.2 50.8C58 52 62 52 64.8 50.8M65 54.6H67.4M70.2 56.2H72.4", "", GOLD, 0.8) +
            P("M60.2 52.2C64 54.2 68 56 72.6 57M74.2 176L73.4 152", "", QIPAO_LINE, 0.9) +
            P("M49 60C48 80 50 100 49 120C48.4 140 49.6 160 50.6 174", "", "#3a3844", 1.4, ' opacity=".5"') +
            bamboo(50, 84, 0.62, -14) + bamboo(69, 170, 0.82, 10) + bamboo(64.5, 160, 0.55, 30) +
          "</g>" +
        "</g>" +
        // wavy locks falling over the shoulders (day)
        '<g class="c-hairfront h-down">' +
          P("M47.4 43.5C41.8 51.5 48.8 59.5 42.6 67.5C37.6 75.5 46.6 83.5 41.6 91.5C39.6 95.8 43.8 99.4 47.8 96.6C50.2 90.4 45.6 84.6 49.8 77.4C53.4 69.6 47.8 62.4 51.8 55C52.8 50.8 50.8 46.6 47.4 43.5Z", "url(#" + h + ")", HAIR_LINE, 1.1) +
          P(mirrorPath("M47.4 43.5C41.8 51.5 48.8 59.5 42.6 67.5C37.6 75.5 46.6 83.5 41.6 91.5C39.6 95.8 43.8 99.4 47.8 96.6C50.2 90.4 45.6 84.6 49.8 77.4C53.4 69.6 47.8 62.4 51.8 55C52.8 50.8 50.8 46.6 47.4 43.5Z"), "url(#" + h + ")", HAIR_LINE, 1.1) +
          P("M46.6 51.6C43.8 59.6 48.2 65.6 44.8 73.6C42 80.6 46.4 86.6 44.2 92.6M73.4 51.6C76.2 59.6 71.8 65.6 75.2 73.6C78 80.6 73.6 86.6 75.8 92.6", "", HAIR_HI, 0.9, ' opacity=".75"') +
          P("M41.8 92.2C40.4 95.8 43 99 46.4 97.6M78.2 92.2C79.6 95.8 77 99 73.6 97.6", "", HAIR_HI, 0.9, ' opacity=".8"') +
        "</g>" +
        // arms (straight, rotated at the shoulder for waving, pointing, posting a letter, cheering)
        '<g class="c-arm c-arm-b">' +
          '<g class="o-day">' + P(mirrorPath(SLEEVE_F), "url(#" + c + ")", COAT_LINE, 1.3) + P("M35.5 104.4L45 105.2", "", COAT_LINE, 0.9) + handB + "</g>" +
          '<g class="o-night">' + P(mirrorPath(ARM_F), SKIN, INK, 1.1) + handB + "</g>" +
        "</g>" +
        '<g class="c-arm c-arm-f">' +
          '<g class="o-day">' + P(SLEEVE_F, "url(#" + c + ")", COAT_LINE, 1.3) + P("M84.5 104.4L75 105.2", "", COAT_LINE, 0.9) +
            '<g class="c-notebook" transform="rotate(6 82 116)">' + book("#a8352c", GOLD, true) + "</g>" + handF + "</g>" +
          '<g class="o-night">' + P(ARM_F, SKIN, INK, 1.1) +
            '<g class="c-lantern">' +
              P("M79.6 119.6V127.8", "", "#2a2020", 0.9) +
              '<circle class="c-lantern-glow" cx="80" cy="138" r="18" fill="url(#' + g + ')"/>' +
              '<ellipse cx="80" cy="138" rx="6.2" ry="7.8" fill="#cf5646"' + sk(INK, 1.1) + "/>" +
              P("M80 130.6V145.4M76.8 132C75.3 135.4 75.3 140.6 76.8 144M83.2 132C84.7 135.4 84.7 140.6 83.2 144", "", "#8e2d24", 0.7) +
              '<rect x="77.2" y="128.8" width="5.6" height="2.2" rx=".8" fill="#2a2020"/><rect x="77.2" y="145.2" width="5.6" height="2.2" rx=".8" fill="#2a2020"/>' +
              P("M80 147.4V154.4", "", "#cf5646", 1.2) +
            "</g>" + handF + "</g>" +
          // props for the red-circle actions (hidden until an action shows them)
          '<g class="p-book">' + book("#3f6b5f", "#dbe6de", false) + handF + "</g>" +
          '<g class="p-letter">' + P("M73.8 109.6H90.4V121.2H73.8Z", "#fbf7ee", INK, 1) + P("M74.4 110.2L82.1 116.2L89.8 110.2", "", INK, 0.9) +
            '<circle cx="82.1" cy="116.4" r="1.8" fill="#b8322a"/>' + handF + "</g>" +
        "</g>" +
        // arms bent to hold an open book (Research)
        '<g class="c-arms-read">' +
          '<g class="o-day">' + readArms(true) + "</g>" + '<g class="o-night">' + readArms(false) + "</g>" +
          P("M47 86.4Q53 83 60 86.8V99Q53 95.6 47 98.4Z", "#fbf7ee", INK, 1) + P("M73 86.4Q67 83 60 86.8V99Q67 95.6 73 98.4Z", "#fbf7ee", INK, 1) +
          P("M46.2 87V99.2Q53 96.2 60 100.2Q67 96.2 73.8 99.2V87", "", "#3f6b5f", 1.6) +
          P("M49.6 89.6Q53.4 88 57.4 89.8M49.6 92.4Q53.4 90.8 57.4 92.6M49.6 95.2Q53.4 93.6 57.4 95.4M62.6 89.8Q66.6 88 70.4 89.6M62.6 92.6Q66.6 90.8 70.4 92.4", "", "#a39a8b", 0.7) +
          '<path class="page-flip" d="M60 86.8Q64.6 84 70 86V97.6Q64.6 95.2 60 98.4Z" fill="#fffdf7"' + sk(INK, 0.8) + "/>" +
          '<ellipse cx="51.4" cy="97.6" rx="3.2" ry="2.7" fill="' + SKIN + '"' + sk(INK, 1.1) + '/><ellipse cx="68.6" cy="97.6" rx="3.2" ry="2.7" fill="' + SKIN + '"' + sk(INK, 1.1) + "/>" +
        "</g>" +
        // arms reaching forward to the keys (Tutorials)
        '<g class="c-arms-type"><g class="o-day">' + typeArms(true) + '</g><g class="o-night">' + typeArms(false) + "</g></g>" +
        '<g class="c-head">' + head(h, s, "front") + "</g>" +
      "</g>" +
    "</g>" +

    // ===== graduation cap, tossed at the Education milestones =====
    '<g class="p-cap"><g class="p-cap-in">' +
      P("M50.5 12.4V18Q60 22 69.5 18V12.4Z", "#26232c", INK, 1.1) +
      P("M41.5 11.4L60 4.8L78.5 11.4L60 18Z", "#302d37", INK, 1.2) +
      P("M60 11.4L73 15V22", "", GOLD, 1.2) +
      '<circle cx="60" cy="11.4" r="1.3" fill="' + GOLD + '"/>' + P("M71.9 21.8H74.1L74.8 25.6H71.2Z", GOLD) +
    "</g></g>" +

    // ===== seen from behind, kneeling on the cushion at the writing desk =====
    '<g class="c-back">' +
      '<g class="o-day">' +
        P("M43.5 101C39.5 120 35.5 160 30.5 191Q60 196 89.5 191C84.5 160 80.5 120 76.5 101C71 97 49 97 43.5 101Z", "url(#" + c + ")", COAT_LINE, 1.4) +
        P("M60 142V192", "", COAT_LINE, 0.9, ' opacity=".55"') +
        P("M38.2 131H81.8L82.4 137H37.6Z", COAT_SH, COAT_LINE, 1) +
        '<rect x="55.4" y="129.6" width="9.2" height="8.6" rx="1.5" fill="' + COAT_SH + '"' + sk(COAT_LINE, 1) + "/>" +
        P("M46 190.5Q51 186.6 56 190.5Q51 194.6 46 190.5ZM64 190.5Q69 186.6 74 190.5Q69 194.6 64 190.5Z", SHOE, INK, 1) +
        P("M43.6 103C37.6 107 35.6 117 38.2 125C41 128 45 125 46.4 119Z", COAT_SH, COAT_LINE, 1.3) +
        '<g class="cb-arm">' + P("M76.4 103C82.4 107 85.4 117 82.8 125C80 128 76 125 74.6 119Z", "url(#" + c + ")", COAT_LINE, 1.3) + "</g>" +
        P("M46 86C42 98 46.5 108 42 120C38 131 44 141 40.5 150C39 156 44.5 159 48.5 156C52 159 56.5 156 60 158C63.5 156 68 159 71.5 156C75.5 159 81 156 79.5 150C76 141 82 131 78 120C73.5 108 78 98 74 86C74 72 68 64 60 64C52 64 46 72 46 86Z", "url(#" + h + ")", HAIR_LINE, 1.4) +
        P("M50.5 76C48 88 52 100 48.5 112C45.5 124 50 136 47 146M60 68C58.4 86 61.6 104 59.2 122C57.6 136 60.8 146 59.4 154M69.5 76C72 88 68 100 71.5 112C74.5 124 70 136 73 146", "", HAIR_HI, 1.1, ' opacity=".55"') +
      "</g>" +
      '<g class="o-night">' +
        P("M45 101C42 120 38 160 33 191Q60 196 87 191C82 160 78 120 75 101C70 97.6 50 97.6 45 101Z", "url(#" + q + ")", "#050507", 1.4) +
        bamboo(51, 182, 0.9, -12) + bamboo(70, 150, 0.7, 20) +
        P("M47 190.5Q51.6 186.8 56.2 190.5Q51.6 194.2 47 190.5ZM63.8 190.5Q68.4 186.8 73 190.5Q68.4 194.2 63.8 190.5Z", HEEL, "#000", 1) +
        P("M45 103C39.6 107 37.6 116 39.8 123.6C42.4 126.6 46 123.6 47.2 118Z", SKIN, INK, 1.1) +
        '<g class="cb-arm">' + P("M75 103C80.4 107 82.4 116 80.2 123.6C77.6 126.6 74 123.6 72.8 118Z", SKIN, INK, 1.1) + "</g>" +
        P("M55.6 86H64.4V100H55.6Z", SKIN, INK, 1) +
        P("M53 96.6C57 95 63 95 67 96.6V101.4C63 102.8 57 102.8 53 101.4Z", QIPAO, QIPAO_LINE, 1) +
        P("M47.2 75.4Q44.4 76.4 45.6 81Q47 83.4 48.4 81.4ZM72.8 75.4Q75.6 76.4 74.4 81Q73 83.4 71.6 81.4Z", SKIN, INK, 1) +
        P("M46.6 78C46.6 66.4 52.6 60 60 60C67.4 60 73.4 66.4 73.4 78C73.4 88 67.6 93.6 60 93.6C52.4 93.6 46.6 88 46.6 78Z", "url(#" + h + ")", HAIR_LINE, 1.3) +
        P("M52 65Q60 69 68 65M49.4 72Q60 79 70.6 72", "", HAIR_HI, 0.9, ' opacity=".8"') +
        '<circle cx="60" cy="88.6" r="7.2" fill="url(#' + h + ')"' + sk(HAIR_LINE, 1.2) + "/>" +
        P("M55 86Q60 82.6 65 86M55 91Q60 94.4 65 91", "", HAIR_HI, 0.8) +
        '<g fill="#f7f3ea"' + sk("#cfc4b0", 0.5) + '><circle cx="66.6" cy="82.6" r="2"/><circle cx="69.8" cy="84.6" r="1.9"/><circle cx="66.2" cy="86.4" r="1.8"/><circle cx="69.4" cy="81" r="1.6"/></g>' +
        '<g fill="' + GOLD + '"><circle cx="66.6" cy="82.6" r=".6"/><circle cx="69.8" cy="84.6" r=".6"/></g>' +
      "</g>" +
    "</g>" +

    // ===== crouching to pet XiaoHei (faces right) =====
    '<g class="c-crouch">' +
      '<g class="o-day">' +
        P("M55.5 66C50.5 76 52.5 88 48.5 100C45.5 110 49.5 118 55.5 119C60.5 120 64.5 116 67.5 118C70.5 114 72.5 106 70.5 96C68.5 84 72.5 74 70.5 66C66.5 58 58.5 58 55.5 66Z", "url(#" + h + ")", HAIR_LINE, 1.3) +
        P("M40 186.6H47.4C49.8 186.6 50.8 188.4 50.4 190.2C50.2 191.2 49.4 191.8 48.2 191.8H40.6C39.4 191.8 38.8 190.8 39 189.6Z", SHOE, INK, 1) +
        P("M80.6 185H87C90.2 185 92 186.6 92 189C92 190.6 91 191.6 89.5 191.6H81.4C80.2 191.6 79.8 190.8 79.8 189.6Z", "#46332a", INK, 1.1) +
        P("M54.6 98.6C50.6 100.6 49.2 104.6 49.2 109.6L47 150C45 164 41 178 37 190C52 194 80 194 96 190C92.4 180 87.4 170 82 161L78.2 109.6C78.2 104.6 76.8 100.6 72.8 98.6C67.8 97 59.6 97 54.6 98.6Z", "url(#" + c + ")", COAT_LINE, 1.4) +
        P("M57.6 97.4L63.2 110L68.8 97.4Z", SHIRT, "#cfc6b8", 0.8) +
        P("M57.6 97.2L63 110.4L57 115.4L53 108L51.6 101.6L54.6 98.4Z", COAT_HI, COAT_LINE, 1) +
        P("M68.8 97.2L63.4 110.4L69.4 115.4L73.4 108L74.8 101.6L71.8 98.4Z", COAT_HI, COAT_LINE, 1) +
        P("M48.4 128.6H78.8L79.2 134.4H48Z", COAT_SH, COAT_LINE, 1) +
        '<rect x="59.6" y="127.6" width="7.2" height="7.8" rx="1.3" fill="none"' + sk(COAT_LINE, 1) + "/>" +
        P("M53.4 101.4C47.8 106 47.6 118 53 130C57.6 140 66 148 74.4 151.4C78 152.4 80 149.4 78.4 146.8C71 141.2 63.6 132.4 60.6 122C58.8 114.6 59 106.6 57.8 103Z", "url(#" + c + ")", COAT_LINE, 1.3) +
        '<ellipse cx="77.6" cy="150.2" rx="3.4" ry="2.8" fill="' + SKIN + '"' + sk(INK, 1.1) + "/>" +
        P("M61.6 84L61.2 98.4H69.2L68.8 84Z", SKIN, INK, 1) +
        '<g class="cr-arm">' + P("M72.4 100C79 103 87 114 95.4 126.4C99.4 132.2 104 136 106.6 138.6C108.6 141.2 106.2 144.2 103.4 142.8C98 139.4 92 134 87.4 128C81.4 120.2 74.8 111.4 70 106Z", "url(#" + c + ")", COAT_LINE, 1.3) +
          P("M103.4 136.2C107.6 136.4 110.6 139 110.2 141.8C109.8 144.2 106.4 145 103.6 143.8Z", SKIN, INK, 1.1) + "</g>" +
      "</g>" +
      '<g class="o-night">' +
        P("M40.4 187.4H47.2C49.4 187.8 50.6 189 50.6 190.6L47 190.8L46.4 191.8H41C39.6 191.8 39.2 190.6 39.6 189.6Z", HEEL, "#000", 1) +
        P("M80.2 185.8H86.8C89.4 186.2 91.2 187.8 91.4 190.4L87.8 190.6L87.2 189L86.6 191.8H81.2C80.4 191.8 79.9 191.1 80 189.8Z", HEEL, "#000", 1) +
        P("M56.2 98.6C52.8 100 52 104 52.4 109C53 116 54.6 122 55.6 128C52 140 44 170 38.4 190C54 193.6 80 193.6 94 190C90 180 85 170 80 161L75.4 128C76.4 122 77.8 116 78.2 109C78.6 104 77.6 100 74.2 98.6C69.6 97.2 60.8 97.2 56.2 98.6Z", "url(#" + q + ")", "#050507", 1.4) +
        bamboo(56, 124, 0.62, -12) + bamboo(78, 186, 0.8, 8) +
        P("M61.6 84L61.2 98.4H69.2L68.8 84Z", SKIN, INK, 1) +
        P("M59 93.2H68.6V99.6C65.4 100.8 62.2 100.8 59 99.6Z", QIPAO, QIPAO_LINE, 1) +
        P("M55 101C50.2 106 50.6 118 55.6 130C59.6 139.6 67 147.6 74.8 151C78.4 152 80.2 149 78.6 146.6C71.6 141 65 132.4 62.4 122.4C60.8 115 61 107 60 103.4Z", SKIN, INK, 1.1) +
        '<ellipse cx="77.8" cy="150.2" rx="3.3" ry="2.7" fill="' + SKIN + '"' + sk(INK, 1.1) + "/>" +
        '<g class="cr-arm">' + P("M73 100.6C79.4 103.6 87 114.4 95.2 126.6C99.2 132.4 103.8 136.2 106.4 138.8C108.4 141.4 106 144.4 103.2 143C97.8 139.6 92 134.2 87.4 128.2C81.6 120.4 75.2 111.8 70.6 106.4Z", SKIN, INK, 1.1) +
          P("M103.4 136.2C107.6 136.4 110.6 139 110.2 141.8C109.8 144.2 106.4 145 103.6 143.8Z", SKIN, INK, 1.1) + "</g>" +
        // the lantern, set down beside her
        '<circle cx="30" cy="180" r="14" fill="url(#' + g + ')"/>' + '<ellipse cx="30" cy="182" rx="5.6" ry="7" fill="#cf5646"' + sk(INK, 1) + "/>" +
        '<rect x="27.4" y="174" width="5.2" height="2" rx=".7" fill="#2a2020"/><rect x="27.4" y="188.4" width="5.2" height="2" rx=".7" fill="#2a2020"/>' +
      "</g>" +
      // her head, lowered and turned toward the cat
      '<g transform="translate(5 46) rotate(9 60 44)">' + head(h, s, "down") + "</g>" +
    "</g>" +

    "</g></svg>";
  }

  // Just the face, for the guide's portrait.
  function portrait(uid) {
    return character(uid).replace('viewBox="0 0 120 200"', 'viewBox="37 5 46 46"');
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

  function stoneLantern(x) {
    var y = GY;
    return '<g class="stone-lantern" transform="translate(' + x + " " + y + ')">' +
      '<circle class="lantern-glow" cx="0" cy="-52" r="34"/>' +
      '<path class="ink-fill" d="M-9 0h18l-3 -26h-12z"/>' +
      '<path class="ink-fill" d="M-16 -26h32l-4 -6h-24z"/>' +
      '<rect class="paper-fill" x="-10" y="-58" width="20" height="26" rx="2"/>' +
      '<rect class="lantern-light" x="-5" y="-53" width="10" height="14" rx="1.5"/>' +
      '<path class="ink-fill" d="M-20 -58h40l-8 -12h-24z"/>' +
      '<path class="ink-fill" d="M-3 -70h6v-6h-6z"/>' +
      '</g>';
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

  function pagoda(x, base, s, cls) {
    return '<g class="' + (cls || "pagoda") + '" transform="translate(' + x + " " + base + ") scale(" + s + ')">' +
      '<path d="M-14 0V-40H14V0Z"/>' +
      '<path d="M-34 -40Q-18 -44 0 -58Q18 -44 34 -40Q16 -38 0 -40Q-16 -38 -34 -40Z"/>' +
      '<path d="M-10 -58V-86H10V-58Z"/>' +
      '<path d="M-26 -86Q-14 -90 0 -102Q14 -90 26 -86Q12 -84 0 -86Q-12 -84 -26 -86Z"/>' +
      '<path d="M-7 -102V-124H7V-102Z"/>' +
      '<path d="M-19 -124Q-10 -128 0 -140Q10 -128 19 -124Q9 -122 0 -124Q-9 -122 -19 -124Z"/>' +
      '<path d="M-1 -140V-156H1V-140Z"/>' +
      '</g>';
  }

  function farLayer(width) {
    return mountains(width, { seed: 11, base: 470, gap: 230, w: [300, 520], h: [170, 300], grad: "gFar" }) +
      pagoda(width * 0.18, 400, 0.9, "pagoda far-pagoda") + pagoda(width * 0.61, 395, 0.75, "pagoda far-pagoda") +
      mist(width, 380, 150);
  }

  function midLayer(width) {
    var r = rng(29), trees = "";
    for (var x = 120; x < width; x += 260 + r() * 380) trees += pine(x, 440 + r() * 30, 0.55 + r() * 0.3, "pine mid-pine");
    return mountains(width, { seed: 23, base: 525, gap: 270, w: [340, 580], h: [130, 230], grad: "gMid", cun: 2 }) +
      trees + mist(width, 450, 130);
  }

  function nearLayer(width) {
    var r = rng(41), trees = "";
    for (var x = 200; x < width; x += 340 + r() * 520) trees += pine(x, 505 + r() * 20, 0.8 + r() * 0.4, "pine near-pine");
    return mountains(width, { seed: 37, base: 580, gap: 360, w: [420, 720], h: [70, 150], grad: "gNear", cun: 3 }) +
      trees + mist(width, 520, 90);
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
      '<path class="ground-strokes" d="' + strokes + '"/>' +
      '<path class="circuit ground-circuit" d="' + traces + '"/><g class="circuit-dot">' + nodes + "</g>" +
      '<g class="tufts">' + tufts + "</g>" +
      '<g class="deco">' + deco + "</g>";
  }

  function foreground(width) {
    var r = rng(71), reeds = "", ink = "";
    for (var x = 60; x < width; x += 140 + r() * 420) {
      var n = 3 + Math.floor(r() * 4), base = 790 + r() * 10;
      for (var i = 0; i < n; i++) {
        var h = 70 + r() * 110, lean = (r() - 0.4) * 50, bx = x + i * (6 + r() * 8);
        reeds += "M" + f1(bx) + " " + f1(base) + "q" + f1(lean * 0.3) + " " + f1(-h * 0.6) + " " + f1(lean) + " " + f1(-h);
      }
      if (r() < 0.4) ink += '<circle cx="' + f1(x + 40 + r() * 80) + '" cy="' + f1(730 + r() * 60) + '" r="' + f1(2 + r() * 5) + '"/>';
    }
    return '<path class="reeds" d="' + reeds + '"/><g class="ink-dots">' + ink + "</g>";
  }

  // ------------------------------------------------------------------
  // Stations (each drawn around its own x; ground at y = GY)
  // ------------------------------------------------------------------
  var S = {};

  // 1. Welcome: a moon gate in a garden wall, with a notice board for news.
  S.home = function () {
    var y = GY;
    // Moon gate: a circle (r = 118, centre y = 468) cut by the ground line.
    var cx = -90, cy = 468, rr = 118, half = Math.sqrt(rr * rr - (y - cy) * (y - cy));
    var wall = "M-300 " + y + "V318H100V" + y + "Z";
    var hole = "M" + f1(cx - half) + " " + y + "A" + rr + " " + rr + " 0 1 1 " + f1(cx + half) + " " + y + "Z";
    var tiles = "";
    for (var tx = -306; tx < 104; tx += 16) tiles += '<path d="M' + tx + ' 306q8 -9 16 0"/>';
    return '<g class="st st-home" data-station="home">' +
      '<rect class="hit" x="-310" y="280" width="560" height="282"/>' +
      '<path class="wall" fill-rule="evenodd" d="' + wall + hole + '"/>' +
      '<path class="wall-shade" d="M-300 ' + y + 'V548H' + f1(cx - half) + 'V' + y + 'ZM' + f1(cx + half) + ' ' + y + 'V548H100V' + y + 'Z"/>' +
      '<path class="gate-ring" d="' + hole.replace("Z", "") + '"/>' +
      '<path class="roof" d="M-318 318Q-310 298 -296 296H96Q110 298 118 318Q100 310 -300 310Q-312 312 -318 318Z"/>' +
      '<g class="roof-tiles">' + tiles + "</g>" +
      '<g class="plaque" transform="translate(' + cx + ' 322)"><rect x="-74" y="0" width="148" height="28" rx="3"/><text x="0" y="19" text-anchor="middle">WELCOME</text></g>' +
      '<g class="hanging-lantern" transform="translate(56 336)"><path class="rope" d="M0 -8V6"/><circle class="lantern-glow" cx="0" cy="24" r="30"/><ellipse class="lantern-body" cx="0" cy="24" rx="11" ry="15"/><path class="lantern-rim" d="M-6 9h12M-6 39h12"/></g>' +
      // notice board
      '<g class="board" data-open="news" transform="translate(205 0)">' +
        '<path class="post" d="M-54 ' + y + 'V436M54 ' + y + 'V436"/>' +
        '<path class="roof" d="M-72 438Q-60 424 -48 424H48Q60 424 72 438Q40 432 0 432Q-40 432 -72 438Z"/>' +
        '<rect class="board-face" x="-62" y="442" width="124" height="74" rx="3"/>' +
        '<text class="board-title" x="0" y="460" text-anchor="middle">NEWS</text>' +
        '<g class="notes"><rect x="-52" y="468" width="30" height="36" transform="rotate(-4 -37 486)"/><rect x="-14" y="466" width="30" height="40" transform="rotate(3 1 486)"/><rect x="24" y="469" width="28" height="34" transform="rotate(-2 38 486)"/></g>' +
        '<g class="pins"><circle cx="-37" cy="471" r="2.6"/><circle cx="1" cy="469" r="2.6"/><circle cx="38" cy="472" r="2.6"/></g>' +
        '<path class="note-lines" d="M-47 480h20M-47 486h16M-47 492h19M-9 478h20M-9 484h18M-9 490h14M-9 496h19M29 481h18M29 487h14M29 493h17"/>' +
      '</g>' +
    '</g>';
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
    var antenna = '<path class="circuit" d="M-60 214V170h-30v-24M0 196V130M60 214V178h26v-30"/><g class="circuit-dot"><circle cx="-90" cy="146" r="3.5"/><circle cx="0" cy="130" r="4"/><circle cx="86" cy="148" r="3.5"/></g>';
    return '<g class="st st-research" data-station="research">' +
      '<rect class="hit" x="-280" y="140" width="560" height="422"/>' +
      antenna +
      '<path class="step" d="M-250 ' + y + 'V536H250V' + y + 'Z"/>' +
      '<path class="step-line" d="M-250 548H250"/>' +
      '<rect class="interior" x="-200" y="388" width="400" height="148"/>' +
      shelves + books +
      '<g class="columns"><rect x="-212" y="376" width="14" height="160"/><rect x="198" y="376" width="14" height="160"/></g>' +
      '<path class="beam" d="M-226 376H226V388H-226Z"/>' +
      '<path class="roof" d="M-282 380Q-262 356 -232 350Q-120 332 0 330Q120 332 232 350Q262 356 282 380Q256 366 230 364Q116 354 0 354Q-116 354 -230 364Q-256 366 -282 380Z"/>' +
      '<path class="roof-lines" d="M-200 356L-190 344M-150 351L-142 339M-100 348L-94 336M-50 346L-46 334M0 345V333M50 346L46 334M100 348L94 336M150 351L142 339M200 356L190 344"/>' +
      '<rect class="wall-upper" x="-150" y="262" width="300" height="72"/>' +
      '<g class="plaque" transform="translate(0 280)"><rect x="-78" y="0" width="156" height="34" rx="3"/><text x="0" y="23" text-anchor="middle">RESEARCH</text></g>' +
      '<path class="roof" d="M-206 268Q-186 246 -160 240Q-80 226 0 224Q80 226 160 240Q186 246 206 268Q184 256 160 254Q80 246 0 246Q-80 246 -160 254Q-184 256 -206 268Z"/>' +
      '<path class="ridge" d="M-110 228Q0 212 110 228M-120 232Q-128 220 -138 218M120 232Q128 220 138 218"/>' +
    '</g>';
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
      '<rect class="hit" x="-340" y="280" width="690" height="370"/>' +
      '<rect class="hall-wall" x="-330" y="296" width="470" height="244"/>' +
      '<path class="stage" d="M-334 540H144V' + y + 'H-334Z"/><path class="stage-edge" d="M-334 540H144"/>' +
      '<g class="screen-talk"><rect class="screen-frame" x="-252" y="328" width="294" height="171" rx="3"/>' + slides +
        '<path class="screen-glare" d="M-246 334L-190 334L-246 380Z"/></g>' +
      '<path class="beam" d="M-105 505L-80 540H-130Z"/>' +
      '<g class="podium" transform="translate(100 0)"><path class="podium-body" d="M-24 ' + y + 'L-20 474H20L24 ' + y + 'Z"/><path class="podium-top" d="M-28 474L-24 464H24L28 474Z"/>' +
        '<path class="mic" d="M-6 464Q-8 450 -18 446"/><circle class="mic-head" cx="-19" cy="445" r="3"/><rect class="podium-badge" x="-10" y="492" width="20" height="14" rx="2"/></g>' +
      '<path class="curtain" d="M-338 290H-296C-300 360 -292 460 -300 548H-338Z"/><path class="curtain" d="M106 290H148V548H112C104 460 112 360 106 290Z"/>' +
      '<path class="curtain-folds" d="M-326 300V540M-314 300V544M114 300V540M128 300V544"/>' +
      '<path class="valance" d="M-340 286H150V306Q138 318 126 306Q114 318 102 306Q90 318 78 306Q66 318 54 306Q42 318 30 306Q18 318 6 306Q-6 318 -18 306Q-30 318 -42 306Q-54 318 -66 306Q-78 318 -90 306Q-102 318 -114 306Q-126 318 -138 306Q-150 318 -162 306Q-174 318 -186 306Q-198 318 -210 306Q-222 318 -234 306Q-246 318 -258 306Q-270 318 -282 306Q-294 318 -306 306Q-318 318 -330 306Q-340 316 -340 306Z"/>' +
      '<g class="plaque" transform="translate(-95 262)"><rect x="-86" y="0" width="172" height="28" rx="3"/><text x="0" y="19" text-anchor="middle">TALKS &amp; POSTERS</text></g>' +
      (posters[0] ? easel(210, posters[0], 96, 72) : "") +
      (posters[1] ? easel(310, posters[1], 70, 80) : "") +
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
