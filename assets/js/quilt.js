/*
 * The cloth base of the 2D world (only when the world uses the fabric paintings, see
 * window.HJArtDir): the sky is one piece of silk, bound with a running stitch, its edges torn and
 * frayed with loose threads, on a backing of washed burlap (dark felt at night).
 * The scenery and the sun sit in front of it, so they can reach past its torn edge.
 */
(function () {
  "use strict";
  if (!window.HJArtDir) return;
  document.documentElement.classList.add("fabric");

  // Hanjing as one cut piece of cloth laid on the scene: round her whole outline (hair, face and hands
  // included) a stem stitch in dark thread, a narrow selvage of the linen she was cut from, and the
  // shadow of the padded piece below and to the right. Worked out from her silhouette as she moves,
  // so the face, arms and clothes inside it get no extra lines.
  (function () {
    var NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
    svg.setAttribute("aria-hidden", "true"); svg.setAttribute("focusable", "false");
    svg.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden");
    function patch(id, selvage, thread, shadow, k) {
      return '<filter id="' + id + '" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">' +
        '<feMorphology in="SourceAlpha" operator="dilate" radius="' + (2.1 * k) + '" result="cut"/>' +
        '<feMorphology in="SourceAlpha" operator="dilate" radius="' + (.85 * k) + '" result="near"/>' +
        '<feComposite in="near" in2="SourceAlpha" operator="out" result="edge"/>' +
        '<feTurbulence type="fractalNoise" baseFrequency="1.6 .9" numOctaves="1" seed="7" result="twist"/>' +
        '<feColorMatrix in="twist" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 .55" result="twistA"/>' +
        '<feComposite in="edge" in2="twistA" operator="in" result="edgeT"/>' +
        '<feFlood flood-color="' + thread + '"/><feComposite in2="edgeT" operator="in" result="stitch"/>' +
        '<feFlood flood-color="' + selvage + '"/><feComposite in2="cut" operator="in" result="selvage"/>' +
        '<feGaussianBlur in="cut" stdDeviation="' + (1.3 * k) + '"/><feOffset dx="' + (.9 * k) + '" dy="' + (1.8 * k) + '" result="drop"/>' +
        '<feFlood flood-color="' + shadow + '"/><feComposite in2="drop" operator="in" result="shadow"/>' +
        '<feMerge><feMergeNode in="shadow"/><feMergeNode in="selvage"/><feMergeNode in="stitch"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
    }
    var k = window.HJLite ? .7 : 1;
    svg.innerHTML = '<defs>' + patch("patchEdge", "#ece2cb", "#5b3f29", "rgba(40,26,12,.38)", k) + patch("patchEdgeNight", "#8f8676", "#2a1f17", "rgba(0,0,0,.5)", k) + '</defs>';
    (document.body || document.documentElement).appendChild(svg);
  })();
  var sky = document.querySelector(".world .sky");
  if (!sky) return;
  var NS = "http://www.w3.org/2000/svg", host = document.createElementNS(NS, "svg");
  host.setAttribute("class", "quilt"); host.setAttribute("aria-hidden", "true");
  sky.insertBefore(host, sky.firstChild);

  function f1(n) { return Math.round(n * 10) / 10; }
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  // A torn edge from (x0, y0) to (x1, y1): small jagged steps with a slow wander.
  function torn(r, x0, y0, x1, y1, amp) {
    var dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len, pts = [], t = 0, wander = 0;
    while (t < len) {
      wander += (r() - .5) * amp * .5; wander *= .86;
      var off = wander + (r() - .5) * amp;
      pts.push([x0 + dx * t / len + nx * off, y0 + dy * t / len + ny * off]);
      t += 3 + r() * 5;
    }
    pts.push([x1, y1]);
    return pts;
  }
  function line(pts) { return pts.map(function (p, i) { return (i ? "L" : "M") + f1(p[0]) + " " + f1(p[1]); }).join(""); }
  // Fibres standing out of a torn edge, and a few long loose threads.
  function fringe(r, pts, nx, ny, every) {
    var d = "";
    for (var i = 0; i < pts.length; i += every) {
      var p = pts[i], l = 1.5 + r() * 4, a = (r() - .5) * .9;
      d += "M" + f1(p[0]) + " " + f1(p[1]) + "l" + f1((nx + a * ny) * l) + " " + f1((ny - a * nx) * l);
    }
    return d;
  }
  function looseThreads(r, pts, nx, ny, n) {
    var d = "";
    for (var k = 0; k < n; k++) {
      var p = pts[Math.floor(r() * pts.length)], len = 18 + r() * 46, bend = (r() - .5) * 2.4, x = p[0], y = p[1];
      d += "M" + f1(x) + " " + f1(y);
      var ex = x + nx * len + ny * bend * 10, ey = y + ny * len - nx * bend * 10;
      d += "C" + f1(x + nx * len * .4 + ny * bend * 14) + " " + f1(y + ny * len * .4 - nx * bend * 14) + " " + f1(ex - ny * bend * 12) + " " + f1(ey + nx * bend * 12) + " " + f1(ex) + " " + f1(ey);
    }
    return d;
  }
  function build() {
    var w = sky.clientWidth, h = sky.clientHeight;
    if (!w || !h) return;
    var r = rng(4021), top = Math.max(10, Math.min(22, h * .03)), side = Math.max(6, Math.min(14, w * .01));
    var tTop = torn(r, -4, top, w + 4, top + (r() - .5) * 6, 4.5);
    var tRight = torn(r, w - side, top, w - side + (r() - .5) * 4, h + 20, 3.5);
    var tLeft = torn(r, side + (r() - .5) * 4, h + 20, side, top, 3.5);
    var outline = line(tTop.concat(tRight, tLeft)) + "Z";
    var binding = line(torn(r, side + 8, top + 8, w - side - 8, top + 8, .6));
    host.setAttribute("viewBox", "0 0 " + w + " " + h);
    host.innerHTML =
      '<defs><linearGradient id="qSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--w-sky-1)"/><stop offset=".78" style="stop-color:var(--w-sky-2)"/></linearGradient>' +
      '<pattern id="qWeave" width="192" height="192" patternUnits="userSpaceOnUse"><image href="assets/art/fabric/silk.webp" width="192" height="192"/></pattern>' +
      '<clipPath id="qClip"><path d="' + outline + '"/></clipPath></defs>' +
      '<path class="quilt-shadow" d="' + outline + '"/>' +
      '<path class="quilt-sky" d="' + outline + '" fill="url(#qSky)"/>' +
      '<g clip-path="url(#qClip)"><path class="quilt-stitch" d="' + binding + '"/>' +
      '<path class="quilt-weave" d="' + outline + '" fill="url(#qWeave)"/></g>' +
      '<path class="quilt-fringe" d="' + fringe(r, tTop, 0, -1, 1) + fringe(r, tRight, 1, 0, 1) + fringe(r, tLeft, -1, 0, 1) + '"/>' +
      '<path class="quilt-loose" d="' + looseThreads(r, tTop, 0, -1, Math.round(w / 260)) + looseThreads(r, tRight, 1, 0, 2) + looseThreads(r, tLeft, -1, 0, 2) + '"/>';
  }
  var timer = 0;
  window.addEventListener("resize", function () { clearTimeout(timer); timer = setTimeout(build, 150); });
  build();
})();
