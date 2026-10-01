/* Portrait framing and light inside the painted campus windows. */
(function () {
  "use strict";
  var A = window.HJArt;
  if (!A) return;
  var ns = "http://www.w3.org/2000/svg";
  function parse(markup) {
    // The original art is HTML SVG markup: its data-human-leg markers may
    // be bare attributes. Parse in that same context, retaining SVG namespace
    // handling while accepting the original HTML attribute syntax.
    var template = document.createElement('template');
    template.innerHTML = '<svg xmlns="' + ns + '">' + markup + '</svg>';
    return template.content.firstElementChild;
  }
  function serialize(root) {
    return Array.prototype.map.call(root.childNodes, function (node) { return new XMLSerializer().serializeToString(node); }).join("");
  }
  function node(tag, attrs) {
    var el = document.createElementNS(ns, tag);
    Object.keys(attrs || {}).forEach(function (key) { el.setAttribute(key, attrs[key]); });
    return el;
  }

  // Centre the entire painted face, with enough hair and collar to read as a
  // portrait inside either circular guide frame. The night crop is retained.
  var portrait = A.portrait;
  A.portrait = function () {
    var root = parse(portrait.apply(A, arguments));
    var day = root.querySelector('.o-day > .painted-sprite');
    if (day) day.setAttribute('viewBox', '204 20 216 216');
    return serialize(root);
  };

  // The fitting group already follows the actual head matrix during a jump
  // and releases that matrix in flight. Keep that tracking, while narrowing
  // the same painted mortarboard around its unchanged lower crown rim.
  var character = A.character;
  A.character = function () {
    var root = parse(character.apply(A, arguments)), cap = root.querySelector('.p-cap-fit > .painted-cap');
    if (cap) {
      var fit = node('g', { 'class': 'cap-personal-fit', transform: 'translate(60 20.6) scale(.8) translate(-60 -20.6)' });
      cap.parentNode.insertBefore(fit, cap); fit.appendChild(cap);
    }
    return serialize(root);
  };

  // Coordinates below are measured inside each existing atlas crop. Pane
  // gaps preserve the native stone tracery and the dark vertical mullions.
  function windowPanes(x, y, w, h, gradient, intensity) {
    var group = node('g', { 'class': 'campus-window-panes', opacity: intensity || '.72' });
    var middle = x + w / 2, shoulder = y + Math.min(w * .44, 6), sill = y + h;
    var arch = 'M' + (x + .9) + ' ' + shoulder + 'Q' + (x + 1) + ' ' + (y + 1.4) + ' ' + middle + ' ' + y + 'Q' + (x + w - 1) + ' ' + (y + 1.4) + ' ' + (x + w - .9) + ' ' + shoulder + 'V' + sill + 'H' + (x + .9) + 'Z';
    var serial = ++windowPanes.serial, clipId = gradient + '-pane-' + serial;
    var defs = node('defs'), clip = node('clipPath', { id: clipId });
    clip.appendChild(node('path', { d: arch })); defs.appendChild(clip); group.appendChild(defs);
    var panes = node('g', { 'clip-path': 'url(#' + clipId + ')' });
    var cross = y + h * .39, cross2 = y + h * .74;
    [[x, middle - .65], [middle + .65, x + w]].forEach(function (column) {
      [[y, cross - .65], [cross + .65, cross2 - .65], [cross2 + .65, sill]].forEach(function (row) {
        panes.appendChild(node('rect', { x: column[0], y: row[0], width: column[1] - column[0], height: row[1] - row[0], fill: 'url(#' + gradient + ')' }));
      });
    });
    group.appendChild(panes); return group;
  }
  windowPanes.serial = 0;

  var windowLocations = {
    ms: [
      [92, 318, 12, 35, '.66'], [117, 318, 12, 35, '.78'],
      [91, 379, 12, 32, '.74'], [116, 379, 12, 32, '.64'],
      [174, 324, 11, 30, '.56'], [190, 379, 11, 32, '.72'],
      [309, 317, 12, 36, '.76'], [327, 317, 12, 36, '.62'], [346, 317, 12, 36, '.72'],
      [412, 197, 12, 29, '.52'], [431, 197, 12, 29, '.63'],
      [422, 247, 13, 29, '.59'], [420, 344, 17, 48, '.73'],
      [479, 379, 11, 32, '.66'], [495, 379, 11, 32, '.54'],
      [549, 379, 11, 32, '.76'], [565, 379, 11, 32, '.60']
    ],
    phd: [
      [94, 210, 14, 46, '.74'], [132, 210, 15, 46, '.58'], [171, 210, 15, 46, '.73'],
      [92, 293, 17, 54, '.72'], [132, 293, 17, 54, '.77'], [171, 293, 16, 54, '.63'],
      [249, 295, 15, 51, '.52'], [375, 295, 15, 51, '.68'],
      [436, 220, 13, 34, '.48'],
      [490, 207, 17, 97, '.58'], [536, 205, 18, 99, '.74'], [585, 202, 19, 102, '.66'],
      [622, 211, 17, 93, '.54'], [664, 220, 15, 84, '.55']
    ]
  };
  function campusLight(school, sprite) {
    var box = sprite.viewBox.baseVal, width = +sprite.getAttribute('width'), height = +sprite.getAttribute('height');
    var light = node('g', { 'class': 'campus-night-light', 'aria-hidden': 'true', transform: 'translate(' + sprite.getAttribute('x') + ' ' + sprite.getAttribute('y') + ') scale(' + width / box.width + ' ' + height / box.height + ')' });
    var gradientId = 'campus-window-' + school, defs = node('defs');
    var gradient = node('linearGradient', { id: gradientId, x1: '0', y1: '0', x2: '0', y2: '1' });
    [['0', '#a87b3b'], ['.52', '#e5ad55'], ['1', '#ffdfa0']].forEach(function (stop) { gradient.appendChild(node('stop', { offset: stop[0], 'stop-color': stop[1] })); });
    defs.appendChild(gradient); light.appendChild(defs);
    windowLocations[school].forEach(function (pane) { light.appendChild(windowPanes(pane[0], pane[1], pane[2], pane[3], gradientId, pane[4])); });
    // Short spills stay on the doorway stone and stair treads, rather than
    // adding a halo around the entire building silhouette.
    var spillId = gradientId + '-spill', spill = node('radialGradient', { id: spillId });
    [['0', '#ffda91', '.26'], ['.65', '#d9a45b', '.08'], ['1', '#d9a45b', '0']].forEach(function (stop) { spill.appendChild(node('stop', { offset: stop[0], 'stop-color': stop[1], 'stop-opacity': stop[2] })); });
    defs.appendChild(spill);
    var entry = school === 'ms' ? [316, 429, 48, 15] : [323, 381, 66, 19];
    light.appendChild(node('ellipse', { cx: entry[0], cy: entry[1], rx: entry[2], ry: entry[3], fill: 'url(#' + spillId + ')' }));
    return light;
  }
  var education = A.stations.education;
  A.stations.education = function () {
    var root = parse(education.apply(A, arguments));
    ['ms', 'phd'].forEach(function (school) {
      var campus = root.querySelector('.campus-keepsake[data-school="' + school + '"]'), sprite = campus && campus.querySelector('.painted-sprite');
      if (sprite) campus.insertBefore(campusLight(school, sprite), sprite.nextSibling);
    });
    return serialize(root);
  };
})();
