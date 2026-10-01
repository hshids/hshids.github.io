/* Quiet independent flight paths for the three distant sky silhouettes. */
(function () {
  "use strict";
  function init() {
    var sky = document.querySelector(".birds");
    if (!sky || !Element.prototype.animate) return;
    var reduced = matchMedia("(prefers-reduced-motion: reduce)");
    var birds = Array.prototype.slice.call(sky.querySelectorAll(".bird"));
    var flights = [], timers = [];
    function range(a, b) { return a + Math.random() * (b - a); }
    function fly(bird, i, first) {
      if (reduced.matches || document.hidden) return;
      if (flights[i]) flights[i].cancel();
      var box = sky.getBoundingClientRect(), rightward = Math.random() > .33;
      var start = rightward ? -32 : box.width + 32, end = rightward ? box.width + 32 : -32;
      var y0 = box.height * range(.11, .24), y1 = box.height * range(.07, .26);
      var c1 = y0 + range(-34, 28), c2 = y1 + range(-29, 34), pace = range(-.24, .24);
      var frames = [], count = 28;
      bird.style.width = range(9, 15).toFixed(1) + "px";
      bird.style.setProperty("--bird-facing", rightward ? 1 : -1);
      bird.style.setProperty("--wing-time", range(3.9, 7.1).toFixed(2) + "s");
      bird.style.setProperty("--wing-delay", -range(0, 7).toFixed(2) + "s");
      var alpha = range(.4, .68);
      for (var k = 0; k <= count; k++) {
        var t = k / count, u = 1 - t;
        // Unequal control heights and gently varying forward speed keep the
        // small flights from reading as a convoy on parallel straight lines.
        var p = t + pace * Math.sin(t * Math.PI * 2) / (Math.PI * 2);
        var x = start + (end - start) * p;
        var y = u * u * u * y0 + 3 * u * u * t * c1 + 3 * u * t * t * c2 + t * t * t * y1;
        var dy = 3 * u * u * (c1 - y0) + 6 * u * t * (c2 - c1) + 3 * t * t * (y1 - c2);
        var dx = (end - start) * (1 + pace * Math.cos(t * Math.PI * 2));
        var heading = Math.atan(dy / dx) * 180 / Math.PI;
        frames.push({ transform: "translate3d(" + x.toFixed(2) + "px," + y.toFixed(2) + "px,0) rotate(" + heading.toFixed(2) + "deg)", opacity: k === 0 || k === count ? 0 : alpha, offset: t });
      }
      var flight = bird.animate(frames, { duration: range(43000, 76000), easing: "linear", fill: "both" });
      flights[i] = flight;
      if (first) flight.currentTime = flight.effect.getTiming().duration * range(.16, .8);
      flight.finished.then(function () {
        timers[i] = setTimeout(function () { fly(bird, i, false); }, range(7500, 23000));
      }).catch(function () {});
    }
    function reset() {
      flights.forEach(function (flight) { if (flight) flight.cancel(); });
      timers.forEach(clearTimeout);
      birds.forEach(function (bird, i) { fly(bird, i, true); });
    }
    if (reduced.addEventListener) reduced.addEventListener("change", reset);
    else reduced.addListener(reset);
    document.addEventListener("visibilitychange", reset);
    if (window.ResizeObserver) new ResizeObserver(reset).observe(sky);
    else window.addEventListener("resize", reset);
    reset();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
