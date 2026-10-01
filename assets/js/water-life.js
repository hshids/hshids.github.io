/* Material joins and small surface glints, preserving the original pond art. */
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
  A.defs = function () {
    var root = parsed(oldDefs()), bank = root.querySelector("#paintBank");
    // The bank atlas contains painted water below source y=846. Sample only
    // dry rock here, so that a second false waterline cannot appear mid-bank.
    if (bank) Array.prototype.forEach.call(bank.querySelectorAll(".painted-sprite"), function (sprite) { sprite.setAttribute("viewBox", "38 726 1460 120"); });
    var r = seeded(416), ripples = "";
    for (var i = 0; i < 23; i++) {
      var x = r() * 820, y = r() * 164, w = 22 + r() * 81;
      ripples += '<path class="fine-ripple' + (i % 3 ? '' : ' is-soft') + '" style="--ripple-time:' + number(12 + r() * 16) + 's;--ripple-delay:-' + number(r() * 26) + 's" d="M' + number(x) + ' ' + number(y) + 'q' + number(w * .49) + ' ' + number((r() - .5) * 2.8) + ' ' + number(w) + ' 0"/>';
    }
    // Footing fragments sample the middle of the original masonry painting.
    // Reusing paintStone at y=627 wraps onto its pale top cap and would draw
    // a repeated white dashed ledge instead of darker stones against earth.
    var footStone = '<svg class="painted-sprite" width="452" height="48" viewBox="38 145 1463 155" preserveAspectRatio="none" style="width:452px;height:48px;overflow:hidden"><image href="assets/art/materials-painted.webp" width="1536" height="1024"/></svg>';
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
    return root.innerHTML;
  };
  A.waterMotionMarkup = function () { return '<rect class="water-current"/>'; };
})();
