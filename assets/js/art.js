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
  // Avatar, drawn from Hanjing's photos. By day: long, wavy black hair with
  // a side part, a camel trench coat over a white shirt, and a red notebook.
  // By night: a black qipao with gold bamboo embroidery, an updo with a
  // white flower pin, and a small lantern. The theme picks the outfit.
  // ------------------------------------------------------------------
  var LINE = "#33241f", SKIN = "#f7dccb";
  var HAIR_LINE = "#0e0b0c", HAIR_HI = "#51464c";
  var COAT_SH = "#a9855d", COAT_HI = "#dcc09a", COAT_LINE = "#5b4129";
  var SHIRT = "#f8f4ec", QIPAO = "#17161b", QIPAO_LINE = "#3d3c46", GOLD = "#d2ad62", GOLD_2 = "#ecd29a";

  function bamboo(x, y, s, rot) {
    return '<g transform="translate(' + x + " " + y + ") rotate(" + rot + ") scale(" + s + ')">' +
      '<path d="M0 0C2 -6 3 -12 3 -18" stroke="' + GOLD + '" stroke-width="1" fill="none"/>' +
      '<path d="M1 -5c-5 -1 -9 1 -11 4c4 0 8 -1 11 -4z" fill="' + GOLD + '"/>' +
      '<path d="M2 -10c5 -2 9 -1 11 1c-4 1 -8 1 -11 -1z" fill="' + GOLD_2 + '"/>' +
      '<path d="M3 -15c-4 -3 -8 -3 -10 -2c3 2 7 3 10 2z" fill="' + GOLD + '"/>' +
      '<path d="M3 -18c3 -3 7 -4 9 -3c-2 2 -6 3 -9 3z" fill="' + GOLD_2 + '"/>' +
      "</g>";
  }

  function character(uid) {
    var h = "hjHair" + uid, c = "hjCoat" + uid, g = "hjGlow" + uid;
    var stroke = function (col, w) { return ' stroke="' + col + '" stroke-width="' + w + '" stroke-linejoin="round"'; };
    return '' +
    '<svg class="hj-char-svg" viewBox="0 0 120 200" aria-hidden="true" focusable="false">' +
    '<defs>' +
      '<linearGradient id="' + h + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c2528"/><stop offset="1" stop-color="#131012"/></linearGradient>' +
      '<linearGradient id="' + c + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b8946a"/><stop offset=".5" stop-color="#cfad83"/><stop offset="1" stop-color="#b28e64"/></linearGradient>' +
      '<radialGradient id="' + g + '" cx=".5" cy=".55" r=".5"><stop offset="0" style="stop-color:var(--c-glow)"/><stop offset="1" style="stop-color:var(--c-glow);stop-opacity:0"/></radialGradient>' +
    "</defs>" +
    '<ellipse class="c-glow" cx="60" cy="120" rx="84" ry="100" fill="url(#' + g + ')"/>' +
    '<g class="c-flip">' +
    '<ellipse class="c-shadow" cx="61" cy="196" rx="27" ry="4.2"/>' +
    '<g class="c-root">' +
      // long hair behind the body (day)
      '<g class="c-hairback h-down">' +
        '<path d="M33 40C29 46 27 54 28 62C29 71 21 78 20 88C20 97 27 101 24 110C21 118 17 125 21 130C24 135 31 135 32 129C36 134 44 134 46 128C52 133 70 133 76 128C78 134 86 134 90 129C91 135 98 135 101 130C105 125 101 118 98 110C95 101 102 97 102 88C101 78 93 71 94 62C95 54 93 46 89 40Z" fill="url(#' + h + ')"' + stroke(HAIR_LINE, 1.6) + "/>" +
        '<path d="M29 58C24 68 31 76 26 87C22 97 29 104 25 114M93 58C98 68 91 76 96 87C100 97 93 104 97 114" fill="none" stroke="' + HAIR_HI + '" stroke-width="1.4" stroke-linecap="round" opacity=".65"/>' +
        '<path d="M22 123C19 127 21 132 25.5 132C29 131.5 29.5 127 26.5 126.5M100 123C103 127 101 132 96.5 132C93 131.5 92.5 127 95.5 126.5" fill="none" stroke="' + HAIR_HI + '" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>' +
      "</g>" +
      // legs
      '<g class="c-leg c-leg-b">' +
        '<g class="o-day"><path d="M52.5 140L59.5 140L59 188L53 188Z" fill="#2e2b30"' + stroke("#18161a", 1.3) + "/>" +
          '<path d="M51.5 186.5L59.5 186.5C64 186.5 67 188.5 67 191.5C67 193.6 65.8 194.8 63.8 194.8L52.5 194.8C50.8 194.8 50.3 193.8 50.3 192.4Z" fill="#3b2a21"' + stroke(LINE, 1.3) + "/></g>" +
        '<g class="o-night"><path d="M51 188L59 188C63.5 188 66.5 190 66.5 192.5C66.5 194.2 65.4 195.2 63.6 195.2L52 195.2C50.3 195.2 50 194.2 50 193Z" fill="#0f0e12"' + stroke("#000", 1.1) + "/></g>" +
      "</g>" +
      '<g class="c-leg c-leg-f">' +
        '<g class="o-day"><path d="M61.5 140L68.5 140L68 188L62 188Z" fill="#35323a"' + stroke("#18161a", 1.3) + "/>" +
          '<path d="M60.5 186.5L68.5 186.5C73 186.5 76 188.5 76 191.5C76 193.6 74.8 194.8 72.8 194.8L61.5 194.8C59.8 194.8 59.3 193.8 59.3 192.4Z" fill="#46332a"' + stroke(LINE, 1.3) + "/></g>" +
        '<g class="o-night"><path d="M60 188L68 188C72.5 188 75.5 190 75.5 192.5C75.5 194.2 74.4 195.2 72.6 195.2L61 195.2C59.3 195.2 59 194.2 59 193Z" fill="#141318"' + stroke("#000", 1.1) + "/></g>" +
      "</g>" +
      // back arm
      '<g class="c-arm c-arm-b">' +
        '<g class="o-day"><path d="M44 92C37 97 34 110 34 126C34 131 38 134 42 133C44 122 45 110 49 99Z" fill="' + COAT_SH + '"' + stroke(COAT_LINE, 1.4) + "/>" +
          '<path d="M34.5 124L42.5 126" stroke="' + COAT_LINE + '" stroke-width="1"/><circle cx="39" cy="136" r="4.3" fill="' + SKIN + '"' + stroke(LINE, 1.3) + "/></g>" +
        '<g class="o-night"><path d="M45 90C39 93 36.5 104 36.5 117C36.5 125 37 130 38 134C40 136.5 42.5 135 42.5 132C42.5 124 43 112 47 100Z" fill="' + SKIN + '"' + stroke(LINE, 1.3) + "/>" +
          '<circle cx="39.5" cy="135.5" r="4" fill="' + SKIN + '"' + stroke(LINE, 1.3) + "/></g>" +
      "</g>" +
      // torso
      '<g class="c-torso">' +
        '<g class="o-day">' +
          '<path d="M56.5 76L65.5 76L66 89L56 89Z" fill="' + SKIN + '"/>' +
          '<path d="M43 88C39 90 37 97 37 105L33 170C45 176 77 176 89 170L85 105C85 97 83 90 79 88C72 86 50 86 43 88Z" fill="url(#' + c + ')"' + stroke(COAT_LINE, 1.6) + "/>" +
          '<path d="M53 87L61 106L69 87Z" fill="' + SHIRT + '"' + stroke("#cfc6b8", 0.9) + "/>" +
          '<path d="M53 87L55.5 95L59 90ZM69 87L66.5 95L63 90Z" fill="' + SHIRT + '"' + stroke("#bfb4a4", 1) + "/>" +
          '<path d="M53 87L60.5 106L52 108L47 100L44 97L46 90Z" fill="' + COAT_HI + '"' + stroke(COAT_LINE, 1.2) + "/>" +
          '<path d="M69 87L61.5 106L70 108L75 100L78 97L76 90Z" fill="' + COAT_HI + '"' + stroke(COAT_LINE, 1.2) + "/>" +
          '<path d="M61.5 106L62 172" stroke="' + COAT_LINE + '" stroke-width="1" opacity=".6"/>' +
          '<g fill="#e9d6b1"' + stroke(COAT_LINE, 0.8) + '><circle cx="54" cy="114" r="1.8"/><circle cx="68.5" cy="114" r="1.8"/><circle cx="54" cy="136" r="1.8"/><circle cx="68.5" cy="136" r="1.8"/></g>' +
          '<path d="M36.6 120L85.4 120L85.7 125.5L36.3 125.5Z" fill="' + COAT_SH + '"' + stroke(COAT_LINE, 1) + "/>" +
          '<path d="M60.5 124L57 143L60.5 143.5L63 125ZM65 124L69.5 141L72.5 140L67 124Z" fill="' + COAT_SH + '"' + stroke(COAT_LINE, 1) + "/>" +
          '<rect x="59.5" y="119" width="7" height="7.5" rx="2" fill="' + COAT_SH + '"' + stroke(COAT_LINE, 1) + "/>" +
          '<path d="M41 142L50 141M73 141L82 142M35 165C47 170 75 170 87 165" fill="none" stroke="' + COAT_LINE + '" stroke-width="1" opacity=".55"/>' +
        "</g>" +
        '<g class="o-night">' +
          '<path d="M46 86C42 89 41 97 42 106C43 116 40 128 40 140C40 158 42 176 44 190L78 190C80 176 82 158 82 140C82 128 79 116 80 106C81 97 80 89 76 86C70 84 52 84 46 86Z" fill="' + QIPAO + '"' + stroke("#050507", 1.6) + "/>" +
          '<path d="M52.5 79C52.5 76.5 69.5 76.5 69.5 79L70 88C64 90.5 58 90.5 52 88Z" fill="' + QIPAO + '"' + stroke(QIPAO_LINE, 1.2) + "/>" +
          '<path d="M53 86.4C58 88.4 64 88.4 69 86.4M61 89C64 92 68 94 74 96M79 172L78 189" fill="none" stroke="' + QIPAO_LINE + '" stroke-width=".9"/>' +
          bamboo(49, 116, 0.8, -15) + bamboo(72, 184, 1.05, 10) + bamboo(66, 173, 0.7, 28) +
        "</g>" +
      "</g>" +
      // long hair falling over the shoulders (day)
      '<g class="h-down">' +
        '<path d="M39 50C31 58 37 67 32 77C27 87 35 95 30 105C26 114 29 122 35 124C39 125 42 121 39 117C37 113 43 106 42 97C42 89 38 83 42 75C45 67 42 59 45 52Z' +
          'M83 50C91 58 85 67 90 77C95 87 87 95 92 105C96 114 93 122 87 124C83 125 80 121 83 117C85 113 79 106 80 97C80 89 84 83 80 75C77 67 80 59 77 52Z" fill="url(#' + h + ')"' + stroke(HAIR_LINE, 1.4) + "/>" +
        '<path d="M38 58C34 66 39 72 35.5 80C32 88 37.5 94 34 102C32 108 33 114 35.5 118M84 58C88 66 83 72 86.5 80C90 88 84.5 94 88 102C90 108 89 114 86.5 118" fill="none" stroke="' + HAIR_HI + '" stroke-width="1.2" stroke-linecap="round" opacity=".75"/>' +
      "</g>" +
      // front arm: red notebook by day, a lantern by night
      '<g class="c-arm c-arm-f">' +
        '<g class="o-day"><path d="M78 92C85 97 88 110 88 126C88 131 84 134 80 133C78 122 77 110 73 99Z" fill="url(#' + c + ')"' + stroke(COAT_LINE, 1.4) + "/>" +
          '<path d="M80 126L87.5 124" stroke="' + COAT_LINE + '" stroke-width="1"/>' +
          '<g transform="rotate(9 86 134)"><rect x="79" y="124" width="15" height="20" rx="2" fill="#b8322a"' + stroke(LINE, 1.3) + '/><path d="M82 128.5H91M82 132H88.5" stroke="#f1d9cf" stroke-width="1.1" stroke-linecap="round"/></g>' +
          '<circle cx="84" cy="134.5" r="4.3" fill="' + SKIN + '"' + stroke(LINE, 1.3) + "/></g>" +
        '<g class="o-night"><path d="M77 90C83 93 85.5 104 85.5 117C85.5 125 85 130 84 134C82 136.5 79.5 135 79.5 132C79.5 124 79 112 75 100Z" fill="' + SKIN + '"' + stroke(LINE, 1.3) + "/>" +
          '<circle class="c-lantern-glow" cx="83" cy="153" r="20" fill="url(#' + g + ')"/>' +
          '<path d="M82.5 138L83 145" stroke="#2a2020" stroke-width="1"/>' +
          '<ellipse cx="83" cy="153" rx="6.5" ry="8" fill="#d4574a"' + stroke(LINE, 1.2) + "/>" +
          '<path d="M83 145V161M79.6 146.5C78 150 78 156 79.6 159.5M86.4 146.5C88 150 88 156 86.4 159.5" fill="none" stroke="#8e2d24" stroke-width=".8"/>' +
          '<rect x="80" y="143.6" width="6" height="2.4" rx=".8" fill="#2a2020"/><rect x="80" y="160.2" width="6" height="2.4" rx=".8" fill="#2a2020"/>' +
          '<path d="M83 162.6V170" stroke="#d4574a" stroke-width="1.3" stroke-linecap="round"/>' +
          '<circle cx="82.5" cy="135.5" r="4" fill="' + SKIN + '"' + stroke(LINE, 1.3) + "/></g>" +
      "</g>" +
      // head
      '<g class="c-head">' +
        // updo: low bun and white flower pin (night)
        '<g class="h-up"><circle cx="35" cy="50" r="10.5" fill="url(#' + h + ')"' + stroke(HAIR_LINE, 1.5) + "/>" +
          '<path d="M28 47C31 42 38 41 42 45M29 54C33 58 39 57 41 53" fill="none" stroke="' + HAIR_HI + '" stroke-width="1.1" stroke-linecap="round"/>' +
          '<path d="M38 41L45 45" stroke="' + GOLD + '" stroke-width="1.1"/>' +
          '<g fill="#f7f3ea" stroke="#cfc4b0" stroke-width=".6"><circle cx="33" cy="37.5" r="2.3"/><circle cx="37.2" cy="35.5" r="2.3"/><circle cx="36.5" cy="40.2" r="2.1"/><circle cx="31.2" cy="41.2" r="2"/><circle cx="39.8" cy="39" r="1.8"/></g>' +
          '<g fill="' + GOLD + '"><circle cx="33" cy="37.5" r=".7"/><circle cx="37.2" cy="35.5" r=".7"/><circle cx="36.5" cy="40.2" r=".6"/></g>' +
          '<ellipse cx="38.6" cy="56" rx="4" ry="5.6" fill="' + SKIN + '"' + stroke(LINE, 1.3) + "/>" +
          '<circle cx="38.3" cy="62.6" r="1.4" fill="#f4f1ea" stroke="#b9b2a6" stroke-width=".6"/>' +
        "</g>" +
        '<path d="M38 47C38 64 45 75 54 79.5C58 81.5 64 81.5 68 79.5C77 75 84 64 84 47C84 33 74 25 61 25C48 25 38 33 38 47Z" fill="' + SKIN + '"' + stroke(LINE, 1.6) + "/>" +
        '<g opacity=".38" fill="#f3a59a"><ellipse cx="48.5" cy="63" rx="4.3" ry="2.4"/><ellipse cx="73.5" cy="63" rx="4.3" ry="2.4"/></g>' +
        '<g class="c-eyes">' +
          '<ellipse cx="52.5" cy="54.6" rx="3.3" ry="3.7" fill="#231a1a"/><circle cx="53.7" cy="53.2" r="1.1" fill="#fff"/>' +
          '<ellipse cx="69.5" cy="54.6" rx="3.3" ry="3.7" fill="#231a1a"/><circle cx="70.7" cy="53.2" r="1.1" fill="#fff"/>' +
          '<path d="M48.3 52.2Q52.5 49.4 56.8 52M65.2 52Q69.5 49.4 73.7 52.2" fill="none" stroke="#1a1212" stroke-width="1.4" stroke-linecap="round"/>' +
        "</g>" +
        '<path d="M48 46.3Q52.5 44.6 57 45.8M65 45.8Q69.5 44.6 74 46.3" stroke="#2a1f1f" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
        '<path d="M61.5 59.6Q62.9 62.4 60.8 63.4" stroke="#d19f8b" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
        '<path class="c-mouth" d="M57.2 68.2Q61 71.3 64.8 68.2Q61 69.8 57.2 68.2Z" fill="#d98886"' + stroke("#b8605c", 1) + "/>" +
        '<ellipse class="c-mouth-open" cx="61" cy="69" rx="3" ry="2.4" fill="#8e3a35"/>' +
        // side-parted wavy hair (day)
        '<g class="h-down">' +
          '<path d="M37 51C35 30 46 17 62 16C79 16 90 30 87 52C84 43 80 37 74 34C68 31 60 30 54 31C47 35 41 42 38.5 51Z" fill="url(#' + h + ')"' + stroke(HAIR_LINE, 1.5) + "/>" +
          '<path d="M52 23C61 26 73 30 80 38C85 44 87 50 87.5 57C83.5 49 77.5 43 69.5 39C62 35.5 56 34 49.5 34Z" fill="url(#' + h + ')"' + stroke(HAIR_LINE, 1.3) + "/>" +
          '<path d="M52 23C46 27 40.5 35 38.5 47C41.5 39.5 46.5 34.5 52 32Z" fill="url(#' + h + ')"' + stroke(HAIR_LINE, 1.2) + "/>" +
          '<path d="M56 24C64 26 74 30 80 37M44 26C49 21 56 19 63 19" fill="none" stroke="' + HAIR_HI + '" stroke-width="1.3" stroke-linecap="round" opacity=".85"/>' +
          '<path d="M39.5 45C35 52 40.5 58 37 64C35 69 38 72.5 40.5 74M85.5 47C90 54 84.5 60 87.5 66C89.5 71 86.5 74 84 76" fill="none" stroke="#1a1416" stroke-width="2.4" stroke-linecap="round"/>' +
        "</g>" +
        // hair pulled back smoothly (night)
        '<g class="h-up">' +
          '<path d="M37 50C35 31 46 18 62 17C79 17 89 30 87 50C84 40 78 34 70 31.5C63 29.5 55 30 49 32.5C43 36 39.5 42 37.5 50Z" fill="url(#' + h + ')"' + stroke(HAIR_LINE, 1.5) + "/>" +
          '<path d="M45 24C52 20 62 19 70 20M40 36C44 28 52 24 60 23" fill="none" stroke="' + HAIR_HI + '" stroke-width="1.2" stroke-linecap="round" opacity=".85"/>' +
          '<path d="M40.5 46C38.5 52 38.8 58 40.3 63" fill="none" stroke="#1a1416" stroke-width="1.5" stroke-linecap="round"/>' +
        "</g>" +
      "</g>" +
    "</g></g></svg>";
  }

  // Just the face, for the guide's portrait.
  function portrait(uid) {
    return character(uid).replace('viewBox="0 0 120 200"', 'viewBox="22 6 78 78"');
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

  // A curled-up sleeping cat (one of the six, at the Life station).
  var CAT = "#8e8a90", CAT_W = "#f1ece3", CAT_L = "#3d3a40";
  function sleepingCat(x, y) {
    return '<g class="sleep-cat" transform="translate(' + x + ' ' + y + ')">' +
      '<path d="M-26 0C-30 -18 -10 -30 8 -26C24 -22 30 -8 26 0Z" fill="' + CAT + '" stroke="' + CAT_L + '" stroke-width="1.3"/>' +
      '<path d="M-22 0C-26 6 12 8 24 1" stroke="' + CAT + '" stroke-width="6" fill="none" stroke-linecap="round"/>' +
      '<path d="M-24 -6C-30 -14 -22 -24 -12 -20C-6 -18 -8 -8 -14 -4Z" fill="' + CAT + '" stroke="' + CAT_L + '" stroke-width="1.2"/>' +
      '<path d="M-26 -16L-27 -26L-20 -21ZM-14 -21L-10 -29L-6 -19Z" fill="' + CAT + '" stroke="' + CAT_L + '" stroke-width="1.1" stroke-linejoin="round"/>' +
      '<path d="M-22 -13q2 1.5 4 0M-15 -12q2 1.5 4 0" stroke="' + CAT_W + '" stroke-width="1" fill="none" stroke-linecap="round"/>' +
      '<path d="M-19 -8C-17 -6 -13 -6 -12 -8" fill="' + CAT_W + '"/>' +
      '<g class="zzz" font-family="var(--font-display)" font-size="11" style="fill:var(--w-line)"><text x="-4" y="-32">z</text><text x="4" y="-42" font-size="9">z</text><text x="10" y="-50" font-size="7">z</text></g>' +
    '</g>';
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
    var colors = ["#a8432f", "#3f6b5f", "#9a6f22", "#3d5a80", "#6b4a73", "#7a6a58"];
    // A stack of books lying flat: some show their coloured spine, some their page edges.
    // The bottom book carries the school's name; a pennant on top carries the degree.
    function stack(x, n, deg, school, flag, seed, poleDx) {
      var r = rng(seed), top = y, books = "";
      for (var i = 0; i < n; i++) {
        var h = i === 0 ? 24 : 18 + Math.floor(r() * 5), w = i === 0 ? 104 : 84 + Math.floor(r() * 16);
        var dx = i === 0 ? 0 : Math.round((r() - 0.5) * 12);
        top -= h;
        var pages = i > 0 && r() < 0.35;
        books += '<g transform="translate(' + (x + dx) + " " + top + ')">' + (pages
          ? '<rect class="bk-pages" x="' + (-w / 2) + '" y="0" width="' + w + '" height="' + h + '" rx="2"/>' +
            '<path class="bk-lines" d="M' + (-w / 2 + 4) + " " + (h / 3) + "H" + (w / 2 - 4) + "M" + (-w / 2 + 4) + " " + (2 * h / 3) + "H" + (w / 2 - 4) + '"/>'
          : '<rect class="bk-spine" x="' + (-w / 2) + '" y="0" width="' + w + '" height="' + h + '" rx="2" style="fill:' + colors[Math.floor(r() * colors.length)] + '"/>' +
            '<path class="bk-band" d="M' + (-w / 2 + 7) + " 3V" + (h - 3) + "M" + (w / 2 - 7) + " 3V" + (h - 3) + '"/>') +
          (i === 0 ? '<text class="stack-label" x="0" y="16" text-anchor="middle">' + school + "</text>" : "") + "</g>";
      }
      var px = x + (poleDx == null ? 26 : poleDx), py = top;
      var pennant = '<g class="pennant"><path class="flag-pole" d="M' + px + " " + py + "V" + (py - 62) + '"/>' +
        '<path class="flag-cloth" style="fill:' + flag + '" d="M' + px + " " + (py - 62) + 'h56l-11 12l11 12h-56z"/>' +
        '<text class="flag-text" x="' + (px + 24) + '" y="' + (py - 45) + '" text-anchor="middle">' + deg + "</text></g>";
      return { svg: '<ellipse class="stack-shadow" cx="' + x + '" cy="' + (y + 3) + '" rx="62" ry="6"/>' + books + pennant, top: top };
    }
    var bs = stack(0, 3, "B.S.", "UC DAVIS", "#3d5a80", 11);
    var ms = stack(108, 5, "M.S.", "GEORGETOWN", "#55606f", 23);
    var phd = stack(216, 7, "Ph.D.", "LEHIGH", "#6b4a2e", 37, -26);
    var t = phd.top;
    // Still climbing: a ladder against the Ph.D. stack and a cap waiting on top.
    var ladder = '<g class="ladder"><path d="M278 ' + y + 'L256 ' + (t + 8) + 'M298 ' + y + 'L276 ' + (t + 8) + '"/>' +
      [0.18, 0.38, 0.58, 0.78].map(function (f) {
        var yy = y - (y - t - 8) * f, x0 = 278 - 22 * f;
        return "<path d=\"M" + x0 + " " + yy + "h20\"/>";
      }).join("") + "</g>";
    var cap = '<g transform="translate(238 ' + t + ') rotate(8)"><g class="mortarboard">' +
      '<path class="cap-base" d="M-15 -2V-12H15V-2Q0 3 -15 -2Z"/>' +
      '<path class="cap-top" d="M-30 -14L0 -26L30 -14L0 -2Z"/>' +
      '<g class="cap-tassel"><path d="M0 -14L20 -9V6"/><circle cx="20" cy="8" r="3"/></g></g></g>';
    var bike = '<g class="emblem" transform="translate(-58 ' + y + ')"><circle cx="-14" cy="-14" r="12"/><circle cx="18" cy="-14" r="12"/><path d="M-14 -14L-2 -34H14L18 -14M-2 -34L4 -14H-14M14 -34L10 -42H4M-4 -38H4"/></g>';
    return '<g class="st st-education" data-station="education">' +
      '<rect class="hit" x="-330" y="340" width="660" height="222"/>' +
      bike + bs.svg + ms.svg + phd.svg + ladder + cap +
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
      '<circle class="halo" cx="0" cy="400" r="150"/>' +
      '<path class="slab" d="M-170 ' + y + 'V530Q-170 522 -160 522H160Q170 522 170 530V' + y + 'Z"/>' +
      '<g class="sheet"><path d="M-62 440V344Q-62 340 -58 340H58Q62 340 62 344V440Z"/><text x="0" y="372" text-anchor="middle">Tutorials</text><path class="sheet-lines" d="M-44 390H40M-44 402H30M-44 414H36"/></g>' +
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
      '<path class="branch" d="M-230 250C-120 238 40 246 200 232M120 240C140 226 160 222 180 222"/>' +
      '<path class="leafs" d="M180 222c6 -8 16 -8 20 -4c-8 4 -14 6 -20 4zM150 236c4 -8 14 -10 18 -6c-6 4 -12 6 -18 6z"/>' +
      cranes +
      sign(-170, 262, "WRITING", 130) +
      '<path class="desk" d="M-160 470H160V484H-160ZM-146 484V' + y + 'H-132V496H132V' + y + 'H146V484Z"/>' +
      '<g class="scroll"><rect x="-120" y="458" width="150" height="12"/><rect x="-126" y="455" width="10" height="18" rx="3"/><rect x="26" y="455" width="10" height="18" rx="3"/><path class="scroll-ink" d="M-104 463h24M-74 463h18M-50 463h30M-14 463h26"/></g>' +
      '<rect class="inkstone" x="46" y="458" width="34" height="12" rx="4"/>' +
      '<g class="brushes"><path d="M92 470V446M102 470V440M112 470V448"/><path class="brush-tip" d="M92 446l-2 -9h4zM102 440l-2 -9h4zM112 448l-2 -9h4z"/></g>' +
      '<g class="lamp" transform="translate(138 470)"><circle class="lamp-glow" cx="0" cy="-26" r="36"/><path d="M-10 0h20l-4 -8h-12z"/><path class="flame" d="M0 -26C-5 -18 -4 -12 0 -10C4 -12 5 -18 0 -26Z"/><path d="M-5 -8V-12H5V-8Z"/></g>' +
      '<ellipse class="cushion" cx="-40" cy="' + (y - 4) + '" rx="46" ry="9"/>' +
    '</g>';
  };

  // 7. Life: suitcase (travel), stove and pot (cooking), a sleeping cat, and a film screen (movies).
  S.life = function () {
    var y = GY;
    return '<g class="st st-life" data-station="life">' +
      '<rect class="hit" x="-320" y="300" width="640" height="262"/>' +
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
        '<g class="screen-cat" transform="translate(88 ' + (y - 140) + ') scale(.6)"><path d="M31 68C20 68 19 51 28 43C34 38 51 38 57 44C65 52 63 68 53 68Z"/><path d="M30 66C14 67 9 57 15 50" stroke-width="8" fill="none" stroke-linecap="round"/><ellipse cx="47" cy="26" rx="20" ry="17"/><path d="M30 17L29 4L40 12ZM55 12L66 5L65 18Z"/></g>' +
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
      '<g class="mailbox" transform="translate(-60 0)"><path class="post" d="M0 ' + y + 'V482"/>' +
        '<path class="box" d="M-34 482V446Q-34 420 0 420Q34 420 34 446V482Z"/><path class="slot" d="M-16 440H16"/>' +
        '<path class="flag" d="M34 452H48V430H62V444H48"/>' +
        '<g class="letters"><rect x="-26" y="392" width="30" height="20" rx="2" transform="rotate(-10 -11 402)"/><path d="M-26 394l15 9l15 -12" transform="rotate(-10 -11 402)"/></g></g>' +
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
