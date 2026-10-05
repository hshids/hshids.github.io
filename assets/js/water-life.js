/* Material joins, rooted wetland plants and local motion in the painted pond. */
(function () {
  "use strict";
  var A = window.HJArt;
  if (!A) return;
  var oldDefs = A.defs, oldFront = A.foreground;
  function parsed(markup) {
    return new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">' + markup + '</svg>', "image/svg+xml").documentElement;
  }
  function number(v) { return v.toFixed(2); }
  function seeded(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  function all(root, selector) { return Array.prototype.slice.call(root.querySelectorAll(selector)); }
  function motionGroup(root, node, cls, style) {
    var group = root.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", cls);
    group.setAttribute("style", style);
    node.parentNode.insertBefore(group, node); group.appendChild(node);
    return group;
  }
  A.defs = function () {
    var root = parsed(oldDefs()), bank = root.querySelector("#paintBank");
    // The bank atlas contains painted water below source y=846. Sample only
    // dry rock here, so that a second false waterline cannot appear mid-bank.
    if (bank) Array.prototype.forEach.call(bank.querySelectorAll(".painted-sprite"), function (sprite) { sprite.setAttribute("viewBox", "38 726 1460 120"); });
    var r = seeded(416), ripples = "";
    for (var i = 0; i < 23; i++) {
      var x = r() * 820, y = r() * 164, w = 22 + r() * 81;
      ripples += '<path class="fine-ripple' + (i % 3 ? '' : ' is-soft') + '" style="--ripple-time:' + number(8 + r() * 9) + 's;--ripple-delay:-' + number(r() * 17) + 's" d="M' + number(x) + ' ' + number(y) + 'q' + number(w * .49) + ' ' + number((r() - .5) * 2.8) + ' ' + number(w) + ' 0"/>';
    }
    // Footing fragments sample the middle of the original masonry painting.
    // Reusing paintStone at y=627 wraps onto its pale top cap and would draw
    // a repeated white dashed ledge instead of darker stones against earth.
    var footStone = '<svg class="painted-sprite" width="452" height="48" viewBox="38 145 1463 155" preserveAspectRatio="none" style="width:452px;height:48px;overflow:hidden"><image href="assets/art/' + (window.HJArtDir || "") + 'materials-painted.webp" width="1536" height="1024"/></svg>';
    root.insertAdjacentHTML("beforeend", '<defs><pattern id="paintFootstone" patternUnits="userSpaceOnUse" width="904" height="48" y="616">' + footStone + '<g transform="translate(904 0) scale(-1 1)">' + footStone + '</g></pattern><linearGradient id="wall-bank-contact" gradientUnits="userSpaceOnUse" x1="0" y1="621" x2="0" y2="640"><stop stop-color="#333d30" stop-opacity="0"/><stop offset=".33" stop-color="#333d30" stop-opacity=".32"/><stop offset=".58" stop-color="#333d30" stop-opacity=".2"/><stop offset="1" stop-color="#333d30" stop-opacity="0"/></linearGradient><pattern id="fine-pond-current" patternUnits="userSpaceOnUse" width="920" height="168" y="683">' + ripples + '</pattern></defs>');
    return root.innerHTML;
  };
  A.foreground = function (width) {
    var root = parsed(oldFront(width)), r = seeded(503), stones = "", moss = "";
    for (var x = -12; x < width; x += 34 + r() * 105) {
      var w = 18 + r() * 56, top = 623 + r() * 5, bottom = 630 + r() * 6, cut = 2 + r() * 4;
      var edgeRise = (r() - .5) * 2.5, edgeFall = .4 + r() * 1.5;
      stones += '<path class="bank-foot-stone" style="opacity:' + number(.64 + r() * .28) + '" d="M' + number(x + cut) + ' ' + number(top) + 'l' + number(w * .34) + ' ' + number(edgeRise) + ' ' + number(w * .56) + ' ' + number(edgeFall) + ' ' + number(cut) + ' 3.1L' + number(x + w - 1) + ' ' + number(bottom) + 'H' + number(x + 2) + 'Z"/><path class="bank-foot-cut" d="M' + number(x + 2) + ' ' + number(bottom) + 'h' + number(w - 3) + 'm-1 -.5l2 -2"/>';
      if (r() > .61) stones += '<path class="bank-foot-light" d="M' + number(x + cut + 2) + ' ' + number(top + .5) + 'l' + number(w * .16) + ' ' + number(edgeRise * .4) + '"/>';
      if (r() > .38) moss += 'M' + number(x + w * .35) + ' ' + number(bottom - .7) + 'l' + number(w * .16) + ' -.4m2 .6l' + number(w * .22) + ' -.2';
    }
    var contact = '<g class="wall-bank-footing"><path class="bank-foot-shadow" d="M0 621H' + width + 'V640H0Z"/><g class="bank-foot-stones">' + stones + '<path class="bank-moss-patina" d="' + moss + '"/></g></g>';
    var bank = root.querySelector(".bank-grain");
    if (bank) bank.insertAdjacentHTML("afterend", contact);
    var water = root.querySelector(".pond-shallows"), shape = root.querySelector(".pond");
    if (water && shape) water.insertAdjacentHTML("afterend", '<path class="water-current" d="' + shape.getAttribute("d") + '"/>');

    // The old atlas used compact cereal-like ears. Common reed has jointed
    // stems, narrow leaves and loose branching panicles. Its source root at
    // y=1470 is fixed in pond coordinates while the upper stems sway locally.
    all(root, ".painted-reeds").forEach(function (node, i) {
      var rand = seeded(601 + i * 43), h = 99 + rand() * 18, w = h * 1024 / 1536;
      var x = +node.getAttribute("x") + +node.getAttribute("width") * .5;
      var y = 795.5 + rand() * 1.8;
      var style = '--plant-time:' + number(5.8 + rand() * 3.1) + 's;--plant-delay:-' + number(rand() * 9) + 's;--reed-angle:' + number(1.10 + rand() * .62) + 'deg';
      node.outerHTML = '<g class="pond-reed-root" transform="translate(' + number(x) + ' ' + number(y) + ')"><title>Common reed — Phragmites australis</title><ellipse class="reed-water-contact" cx="0" cy="1.5" rx="' + number(w * .17) + '" ry="1.7"/><g class="reed-sway" style="' + style + '"><image class="painted-reed-plant" href="assets/art/' + (window.HJArtDir || "") + 'pond-phragmites-painted.webp" x="' + number(-w * .5) + '" y="' + number(-1470 * h / 1536) + '" width="' + number(w) + '" height="' + number(h) + '"/></g></g>';
    });

    // Movement is readable at ordinary scene scale. Rooted flowers and their
    // exact stalk now live in one animated/observed group: their timing cannot
    // diverge when one flower crosses the visibility boundary before its stem.
    all(root, ".lotus-leaf").forEach(function (node, i) {
      var rand = seeded(913 + i * 17);
      motionGroup(root, node, "lily-pad-drift", '--plant-time:' + number(7.2 + rand() * 4.4) + 's;--plant-delay:-' + number(rand() * 12) + 's;--float-dx:' + number(1.15 + rand() * .65) + 'px');
    });
    var stems = all(root, ".lotus-stem");
    all(root, ".lotus-flower").forEach(function (node, i) {
      var position = /translate\(([\d.-]+)\s+([\d.-]+)\)/.exec(node.getAttribute('transform'));
      var stem = position && stems.filter(function (candidate) {
        var points = candidate.getAttribute('d').match(/-?\d+(?:\.\d+)?/g);
        return points && Math.abs(+points[points.length - 2] - +position[1]) < .11 && Math.abs(+points[points.length - 1] - (+position[2] + 1)) < .11;
      })[0];
      var start = stem && /^M([\d.-]+)\s+([\d.-]+)/.exec(stem.getAttribute("d"));
      var rand = seeded(727 + i * 71), time = number(6.6 + rand() * 3.9), delay = number(rand() * 11);
      var light = stem && stem.nextElementSibling, group;
      if (node.classList.contains("stem-lotus") && start) {
        var style = '--plant-time:' + time + 's;--plant-delay:-' + delay + 's;transform-origin:' + start[1] + 'px ' + start[2] + 'px';
        group = motionGroup(root, node, "lotus-stalk-sway", style);
        group.setAttribute('data-plant-root', start[1] + ' ' + start[2]);
      } else {
        group = motionGroup(root, node, "lily-flower-drift", '--plant-time:' + time + 's;--plant-delay:-' + delay + 's');
      }
      if (stem) {
        group.insertBefore(stem, node);
        if (light && light.classList.contains("stem-light")) group.insertBefore(light, node);
      }
    });

    // Broken light travels across the water, not the bank or its texture.
    // Keeping these paths inside the existing pond also keeps its click/koi
    // interaction and the camera's brick/bank/water registration unchanged.
    var glints = '', gr = seeded(872);
    for (var gx = 36; gx < width; gx += 86 + gr() * 98) {
      var gy = 714 + gr() * 80, gw = 28 + gr() * 43;
      glints += '<path class="pond-moving-glint" style="--water-time:' + number(5.2 + gr() * 4.3) + 's;--water-delay:-' + number(gr() * 10) + 's" d="M' + number(gx) + ' ' + number(gy) + 'q' + number(gw * .48) + ' -.8 ' + number(gw) + ' 0m-' + number(gw * .58) + ' 2.8q' + number(gw * .25) + ' -.5 ' + number(gw * .5) + ' 0"/>';
    }
    if (water) water.insertAdjacentHTML("afterend", '<g class="pond-surface-glints" aria-hidden="true">' + glints + '</g>');
    return root.innerHTML;
  };
  A.waterMotionMarkup = function () { return '<rect class="water-current"/>'; };
  // Only animate the small part of the long river that is actually visible.
  // This keeps local life from adding work to walking through distant scenes.
  function observeVisibleWater() {
    var world = document.querySelector('#world');
    if (!world || !window.IntersectionObserver) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('water-motion-outside', !entry.isIntersecting);
      });
    }, { root: world, rootMargin: '48px' });
    all(world, '.pond-moving-glint,.reed-sway,.lily-pad-drift,.lily-flower-drift,.lotus-stalk-sway').forEach(function (node) {
      node.classList.add('water-motion-outside'); observer.observe(node);
    });
  }
  function ready() { requestAnimationFrame(observeVisibleWater); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
