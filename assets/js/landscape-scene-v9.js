/* Vary the few foreground specimens without moving their contact roots. */
(function () {
  "use strict";
  var A = window.HJArt;
  if (!A) return;
  var oldGround = A.ground;
  A.ground = function (width, stations) {
    var root = new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">' + oldGround(width, stations) + '</svg>', "image/svg+xml").documentElement;
    var scales = [.98, 1.36, 1.05, 1.19];
    Array.prototype.forEach.call(root.querySelectorAll(".ground-pine"), function (tree, i) {
      // Only replace the original uniform scale. The original translate is
      // the sampled paving height, and the soil/root/shadow remain one group.
      tree.setAttribute("transform", tree.getAttribute("transform").replace(/scale\([^)]*\)/, 'scale(' + scales[i % scales.length] + ')'));
      tree.classList.add(i % 4 === 0 || i % 4 === 2 ? "ground-tree-young" : "ground-tree-mature");
    });
    Array.prototype.forEach.call(root.querySelectorAll(".ground-willow"), function (tree) {
      tree.setAttribute("transform", tree.getAttribute("transform").replace(/scale\([^)]*\)/, 'scale(.88)'));
    });
    return root.innerHTML;
  };
})();
