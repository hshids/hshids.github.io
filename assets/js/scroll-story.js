/*
 * The handscroll layer for the 2D world: the walk is read as one long story, from a title at its
 * head, Dalian, the gate and the 2013 crossing, through the stations, to "to be continued".
 *
 * Everything drawn here reuses the world's realistic paintings: the chapter signs are built exactly
 * like the EDUCATION sign (painted branch, hemp ropes, carved plaque), the shore uses the painted
 * rocks and grasses, and the crossing uses the painted paper crane. Chapter lines are spoken by
 * Hanjing rather than printed on the painting. World units: the scene is 800 tall and the walking
 * line is at y = 560.
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
      say: "Welcome to my world! Walk right and it unrolls, one chapter of my life at a time." },
    { id: "prologue", at: 1080, sign: "DALIAN", width: 120, label: "Dalian, my hometown",
      say: "This is where it starts: Dalian, my seaside hometown. I still miss the steamed seafood there." },
    { id: "home", label: "Welcome" },
    { id: "crossing", at: 2760, sign: "2013", width: 96, label: "2013, the crossing",
      say: "In 2013 I crossed the Pacific for high school. I landed at a boarding school in upstate New York and lived two of my three years there in an old stone hall. It was a happy time, with lots of friends. I thought New York City would be close. It was three and a half hours away." },
    { id: "education", label: "Education" },
    { id: "research", label: "Research" },
    { id: "talks", label: "Talks" },
    { id: "writing", label: "Writing" },
    { id: "life", label: "Life" },
    { id: "contact", label: "Contact" },
    { id: "tail", at: 10000, sign: "TO BE CONTINUED", width: 176, label: "To be continued",
      say: "To be continued. I'm still painting this part, so come back and see what's new." }
  ];
  // Tapping a sign, or the paper crane, walks Hanjing over to tell its story.
  var HOTSPOTS = [];
  CHAPTERS.forEach(function (ch) { if (ch.sign) HOTSPOTS.push({ id: ch.id, x: ch.at + 62, y: 422, w: Math.max(130, ch.width), h: 276, label: ch.label + ": tap to hear the story", say: ch.say }); });
  HOTSPOTS.push({ id: "crane", x: 3025, y: 365, w: 170, h: 130, label: "The paper crane: tap to hear the 2013 crossing", say: CHAPTERS[3].say });

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
      (ART.paintLabel ? ART.paintLabel(px, 358, esc(ch.sign), w) : "") + "</g>";
  }

  // Prologue: painted shore rocks and grasses by the water's edge.
  function prologue(cx) {
    return '<g class="scroll-piece piece-dalian">' +
      sprite("rock", cx + 40, GY - 46, 120, 52, "garden-stone") + sprite("rock", cx + 140, GY - 30, 78, 36, "garden-stone") + sprite("rock", cx - 60, GY - 26, 64, 30, "garden-stone") +
      sprite("grass", cx + 20, GY - 22, 22, 20) + sprite("grass", cx + 168, GY - 26, 24, 22) + sprite("grass", cx - 70, GY - 20, 18, 16) + '</g>';
  }
  // The crossing: the painted paper crane in flight, east toward the other shore.
  function crossing(cx) {
    return '<g class="scroll-live" transform="translate(' + (cx + 125) + ' 365) scale(-1 1)"><g class="scroll-crane-flight">' + sprite("crane", -85, -66, 170, 132, "scroll-crane") + '</g></g>';
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
