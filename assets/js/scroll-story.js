/*
 * The handscroll layer for the 2D world. The walk is read as one long scroll: a title at its head,
 * a prologue by the water for Dalian, the gate, a paper crane for the 2013 crossing, the schools,
 * the questions, the talks, the writing, life with six cats, the letters, and a tail that says the
 * scroll is still being painted.
 *
 * Everything drawn here reuses the painted sprites of the world (rocks, grasses, the paper crane),
 * so the new chapters share the stations' realistic painting. Chapter titles are written onto the
 * painting in the site's serif, in English. World units: the scene is 800 tall and the walking line
 * is at y = 560.
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
  var CHAPTERS = [
    { id: "head", at: 560, label: "A handscroll", lines: ["Hanjing's World"], sub: ["a life still being painted", "walk right to unroll it →"], title: true },
    { id: "prologue", at: 1060, label: "Prologue · Dalian", lines: ["My seaside hometown.", "The scroll begins by the water,", "where seafood tastes like home."] },
    { id: "home", label: "The gate", lines: ["Come in, and walk right", "to unroll the scroll."] },
    { id: "crossing", at: 2900, label: "2013 · The crossing", lines: ["A paper crane and I crossed", "the Pacific for high school.", "Tap the crane for that story."] },
    { id: "education", at: 3400, label: "Chapter I · Schools", lines: ["Davis, DC and Bethlehem.", "Each time, I chose wider."] },
    { id: "research", label: "Chapter II · Questions", lines: ["Who stays in charge of AI,", "and what a persona promises."] },
    { id: "talks", label: "Chapter III · Talks", lines: ["Where I have spoken,", "and the ideas behind the slides."] },
    { id: "writing", label: "Chapter IV · Writing", lines: ["A little brush,", "and a lot of code."] },
    { id: "life", label: "Chapter V · Life", lines: ["San Francisco, with six cats", "who run the house."] },
    { id: "contact", label: "Colophon · Letters", lines: ["Every scroll ends with words", "from friends. Write me a line."] },
    { id: "tail", at: 10000, label: "To be continued", lines: ["The scroll is still", "being painted."] }
  ];
  // The crane tells the high-school years when tapped: the story lives in the conversation, not in
  // a building on the path.
  var HOTSPOTS = [
    { id: "crane", x: 3025, y: 365, w: 170, h: 130, label: "Tap the paper crane: the 2013 crossing",
      say: "In 2013 I crossed the Pacific for high school. I landed at a boarding school in upstate New York and lived two of my three years there in an old stone hall. It was a happy time, with lots of friends. I thought New York City would be close. It was three and a half hours away." }
  ];

  function defs() {
    return '<linearGradient id="scrollRod" x1="0" x2="1"><stop offset="0" stop-color="#3b2216"/><stop offset=".35" stop-color="#7a4a30"/><stop offset=".55" stop-color="#a7714c"/><stop offset="1" stop-color="#3b2216"/></linearGradient>' +
      '<radialGradient id="scrollKnob" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#f4f1e2"/><stop offset=".55" stop-color="#cfd8c4"/><stop offset="1" stop-color="#8fa18c"/></radialGradient>' +
      '<pattern id="scrollBrocade" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#c9b48a"/><path d="M9 2c3 0 4 3 2 5c3 -1 5 1 4 3c-1 3 -5 2 -6 0c-1 2 -5 3 -6 0c-1 -2 1 -4 4 -3c-2 -2 -1 -5 2 -5z" fill="#b39a6c" opacity=".7"/><circle cx="0" cy="0" r="1.6" fill="#9e855a"/><circle cx="18" cy="18" r="1.6" fill="#9e855a"/></pattern>' +
      '<radialGradient id="scrollContact"><stop offset="0" stop-color="#2a2016" stop-opacity=".3"/><stop offset=".6" stop-color="#2a2016" stop-opacity=".12"/><stop offset="1" stop-color="#2a2016" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="scrollMist" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#fbf7ee" stop-opacity=".7"/><stop offset=".6" stop-color="#f4eee2" stop-opacity=".28"/><stop offset="1" stop-color="#f4eee2" stop-opacity="0"/></radialGradient>';
  }

  // A chapter written onto the painting: a small spaced label with a fine rule, then the lines.
  function inscription(ch) {
    var x = ch.x, top = ch.title ? 96 : 92, out = '<g class="scroll-inscription' + (ch.title ? ' is-title' : '') + '" data-chapter="' + ch.id + '">';
    out += '<text class="ins-label" x="' + f1(x) + '" y="' + top + '">' + esc(ch.label.toUpperCase()) + '</text>';
    out += '<path class="ins-rule" d="M' + f1(x) + ' ' + (top + 9) + 'h' + (ch.title ? 150 : 56) + '"/><circle class="ins-dot" cx="' + f1(x + (ch.title ? 156 : 62)) + '" cy="' + (top + 9) + '" r="2.2"/>';
    var y = top + (ch.title ? 58 : 34);
    ch.lines.forEach(function (line, i) {
      out += '<text class="' + (ch.title ? 'ins-title' : 'ins-line') + '" x="' + f1(x) + '" y="' + f1(y + i * (ch.title ? 44 : 21)) + '">' + esc(line) + '</text>';
    });
    if (ch.sub) ch.sub.forEach(function (line, i) { out += '<text class="ins-line' + (i ? ' ins-hint' : '') + '" x="' + f1(x) + '" y="' + f1(y + 34 + i * 22) + '">' + esc(line) + '</text>'; });
    return out + "</g>";
  }

  // The rollers at both ends, and the table the scroll rests on beyond them.
  function roller(x, side) {
    var table = '<rect class="scroll-table" x="' + (side < 0 ? x - 900 : x) + '" y="-40" width="900" height="' + (VH + 80) + '"/>';
    var band = '<rect x="' + (side < 0 ? x + 10 : x - 34) + '" y="0" width="24" height="' + VH + '" fill="url(#scrollBrocade)" class="scroll-band"/>' +
      '<rect class="scroll-band-edge" x="' + (side < 0 ? x + 33 : x - 35) + '" y="0" width="1.6" height="' + VH + '"/>';
    return '<g class="scroll-roller">' + table + band +
      '<rect x="' + (x - 11) + '" y="6" width="22" height="' + (VH - 12) + '" rx="6" fill="url(#scrollRod)"/>' +
      '<rect class="scroll-rod-shine" x="' + (x - 4) + '" y="10" width="3" height="' + (VH - 20) + '" rx="1.5"/>' +
      '<ellipse cx="' + x + '" cy="4" rx="17" ry="11" fill="url(#scrollKnob)"/><ellipse cx="' + x + '" cy="' + (VH - 4) + '" rx="17" ry="11" fill="url(#scrollKnob)"/></g>';
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
    out += prologue(1060) + crossing(2900);
    CHAPTERS.forEach(function (ch) {
      var st = stationOf(ch.id, stations);
      ch.x = ch.at != null ? ch.at : st.x - st.half - 40;
      out += inscription(ch);
    });
    return out + "</g>";
  }

  // The rollers and low mist lying over the stone path, in the front layer.
  function ends(width) {
    var seed = 91, r = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }, mist = "";
    for (var x = 160; x < width - 160; x += 380 + r() * 360) mist += '<ellipse class="scroll-ground-mist" cx="' + f1(x) + '" cy="' + f1(GY - 4 + r() * 10) + '" rx="' + f1(160 + r() * 160) + '" ry="' + f1(16 + r() * 12) + '" fill="url(#scrollMist)"/>';
    return '<g class="scroll-ends">' + mist + roller(30, -1) + roller(width - 30, 1) + "</g>";
  }

  // The air of the scroll, above the painting and below the interface: paper fibres, the mounting
  // edges, a still wash of light from the sun, and lantern motes rising at night. Nothing here is
  // blurred or repainted per frame, so the walk keeps its frame rate.
  function atmosphere(world) {
    if (!world || world.querySelector(".scroll-atmos")) return;
    var el = document.createElement("div"); el.className = "scroll-atmos"; el.setAttribute("aria-hidden", "true");
    var motes = ""; for (var i = 0; i < 14; i++) motes += '<i style="left:' + (4 + i * 6.9).toFixed(1) + '%;animation-delay:-' + (i * 2.3).toFixed(1) + 's;animation-duration:' + (17 + (i % 5) * 3) + 's"></i>';
    el.innerHTML = '<div class="scroll-paper"></div><div class="scroll-light"></div><div class="scroll-motes">' + motes + '</div><div class="scroll-edge scroll-edge-top"></div><div class="scroll-edge scroll-edge-bottom"></div>';
    world.appendChild(el);
    try {
      var c = document.createElement("canvas"); c.width = c.height = 384; var x = c.getContext("2d"), seed = 5, rr = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      for (var k = 0; k < 520; k++) {
        var px = rr() * 384, py = rr() * 384, len = 6 + rr() * 34, a = rr() * Math.PI;
        x.strokeStyle = "rgba(90, 70, 44, " + (.05 + rr() * .07).toFixed(3) + ")"; x.lineWidth = .4 + rr() * .7;
        x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * len * .5 + (rr() - .5) * 6, py + Math.sin(a) * len * .5 + (rr() - .5) * 6, px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke();
      }
      for (var d = 0; d < 900; d++) { x.fillStyle = "rgba(110, 86, 52, " + (rr() * .06).toFixed(3) + ")"; x.fillRect(rr() * 384, rr() * 384, 1, 1); }
      var paper = "url(" + c.toDataURL("image/png") + ")";
      el.querySelector(".scroll-paper").style.backgroundImage = paper;
      document.documentElement.style.setProperty("--scroll-paper", paper);
    } catch (e) {}
  }

  // Buttons over the painted hotspots, placed in the walking layer.
  function hotspotMarkup() {
    return HOTSPOTS.map(function (h) {
      return '<button type="button" class="paper-control scroll-hotspot" data-scroll-hotspot="' + h.id + '" aria-label="' + esc(h.label) + '" style="left:calc(var(--s) * ' + (h.x - h.w / 2) + 'px);bottom:calc(var(--s) * ' + (VH - h.y - h.h / 2) + 'px);width:calc(var(--s) * ' + h.w + 'px);height:calc(var(--s) * ' + h.h + 'px)"></button>';
    }).join("");
  }
  function hotspot(id) { for (var i = 0; i < HOTSPOTS.length; i++) if (HOTSPOTS[i].id === id) return HOTSPOTS[i]; return null; }

  // A small scroll map at the bottom of the screen: the rollers, a mark per chapter, the part in view.
  function mapMarkup(stations) {
    var n = 0, ticks = CHAPTERS.map(function (ch) {
      var st = stationOf(ch.id, stations), x = ch.at != null ? ch.at : st.x, pct = (x / SCROLL_W * 100).toFixed(2);
      if (st) n++;
      return '<button type="button" class="scroll-tick' + (st ? ' is-station' : '') + '" style="left:' + pct + '%" ' + (st ? 'data-go="' + st.id + '"' : 'data-at="' + x + '"') + ' aria-label="' + esc(ch.label) + '" title="' + esc(ch.label) + '"><span>' + (st ? n : "") + '</span></button>';
    }).join("");
    return '<div class="scroll-map-rod" aria-hidden="true"></div><div class="scroll-map-strip">' + ticks + '<span class="scroll-map-view" aria-hidden="true"></span></div><div class="scroll-map-rod" aria-hidden="true"></div>';
  }

  ART.scroll = { width: SCROLL_W, layout: LAYOUT, chapters: CHAPTERS, zones: [{ x: 330, half: 330 }, { x: 10060, half: 280 }], defs: defs, pieces: pieces, ends: ends,
    atmosphere: atmosphere, mapMarkup: mapMarkup, hotspotMarkup: hotspotMarkup, hotspot: hotspot };
})();
