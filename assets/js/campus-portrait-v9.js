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

  // Coordinates below are measured inside each existing atlas crop. The
  // original glazing texture supplies the mask, retaining its real tracery
  // instead of drawing the same artificial grid in every different window.
  function windowPanes(x, y, w, h, gradient, intensity, nativeMask) {
    var group = node('g', { 'class': 'campus-window-panes', opacity: Math.min(.98, .83 + ((+intensity || .65) - .48) * .44).toFixed(2) });
    var middle = x + w / 2, shoulder = y + Math.min(w * .44, 6), sill = y + h;
    var arch = 'M' + (x + .9) + ' ' + shoulder + 'Q' + (x + 1) + ' ' + (y + 1.4) + ' ' + middle + ' ' + y + 'Q' + (x + w - 1) + ' ' + (y + 1.4) + ' ' + (x + w - .9) + ' ' + shoulder + 'V' + sill + 'H' + (x + .9) + 'Z';
    var serial = ++windowPanes.serial, clipId = gradient + '-pane-' + serial;
    var defs = node('defs'), clip = node('clipPath', { id: clipId });
    clip.appendChild(node('path', { d: arch })); defs.appendChild(clip); group.appendChild(defs);
    // A restrained trace of reflected light sits on the immediate reveal;
    // the rest of the stone façade keeps its cool night colour and grain.
    group.appendChild(node('path', { d: arch, 'class': 'campus-window-wall-spill', fill: 'none', stroke: '#ffc47d', 'stroke-width': '5.5', opacity: '.11' }));
    group.appendChild(node('path', { d: 'M' + (x + .5) + ' ' + (sill + .5) + 'h' + (w - 1), fill: 'none', stroke: '#ffdb9b', 'stroke-width': '1.35', opacity: '.33' }));
    var panes = node('g', { 'clip-path': 'url(#' + clipId + ')', mask: 'url(#' + nativeMask + ')' });
    panes.appendChild(node('rect', { x: x, y: y, width: w, height: h, fill: 'url(#' + gradient + ')' }));
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
    [['0', '#e3ac62'], ['.52', '#ffd991'], ['1', '#fff0c3']].forEach(function (stop) { gradient.appendChild(node('stop', { offset: stop[0], 'stop-color': stop[1] })); });
    defs.appendChild(gradient); light.appendChild(defs);
    // Native ink mullions, lead lines and recesses stay darker than the glass.
    // Sample the same painting without replacing or editing the source art.
    var maskId = gradientId + '-native-glazing', filterId = maskId + '-ink';
    var filter = node('filter', { id: filterId, x: '0%', y: '0%', width: '100%', height: '100%', 'color-interpolation-filters': 'sRGB' });
    filter.appendChild(node('feColorMatrix', { type: 'matrix', values: '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  .2126 .7152 .0722 0 0' }));
    // The painted glass includes fine pigment grain. A hard cut would turn
    // that grain into white fragments, so keep a continuous emission curve
    // and smooth less than one native pixel, while the larger lead lines stay.
    filter.appendChild(node('feGaussianBlur', { stdDeviation: '.65' }));
    var transfer = node('feComponentTransfer'); transfer.appendChild(node('feFuncA', { type: 'gamma', amplitude: '2.25', exponent: '1.15', offset: '-.12' })); filter.appendChild(transfer);
    filter.appendChild(node('feComposite', { in2: 'SourceAlpha', operator: 'in' })); defs.appendChild(filter);
    var mask = node('mask', { id: maskId, 'mask-type': 'alpha', maskUnits: 'userSpaceOnUse', maskContentUnits: 'userSpaceOnUse', x: '0', y: '0', width: box.width, height: box.height });
    var source = sprite.querySelector('image');
    mask.appendChild(node('image', { href: source.getAttribute('href'), x: -box.x, y: -box.y, width: source.getAttribute('width'), height: source.getAttribute('height'), filter: 'url(#' + filterId + ')' })); defs.appendChild(mask);
    windowLocations[school].forEach(function (pane) { light.appendChild(windowPanes(pane[0], pane[1], pane[2], pane[3], gradientId, pane[4], maskId)); });
    // Short spills stay on the doorway stone and stair treads, rather than
    // adding a halo around the entire building silhouette.
    var spillId = gradientId + '-spill', spill = node('radialGradient', { id: spillId });
    [['0', '#ffe2a1', '.43'], ['.65', '#e7ad67', '.16'], ['1', '#d9a45b', '0']].forEach(function (stop) { spill.appendChild(node('stop', { offset: stop[0], 'stop-color': stop[1], 'stop-opacity': stop[2] })); });
    defs.appendChild(spill);
    var entry = school === 'ms' ? [316, 429, 48, 15] : [323, 381, 66, 19];
    light.appendChild(node('ellipse', { cx: entry[0], cy: entry[1], rx: entry[2], ry: entry[3], fill: 'url(#' + spillId + ')' }));
    return light;
  }
  function bicycleLamp(sprite) {
    var box = sprite.viewBox.baseVal, width = +sprite.getAttribute('width'), height = +sprite.getAttribute('height');
    var group = node('g', { 'class': 'davis-bicycle-lamp', 'aria-hidden': 'true', transform: 'translate(' + sprite.getAttribute('x') + ' ' + sprite.getAttribute('y') + ') scale(' + width / box.width + ' ' + height / box.height + ')' });
    var defs = node('defs'), metal = node('linearGradient', { id: 'davis-bike-metal', x1: '0', y1: '0', x2: '.4', y2: '1' });
    [['0', '#d5d2be'], ['.34', '#b2b5a9'], ['.62', '#606f6c'], ['1', '#92978a']].forEach(function (stop) { metal.appendChild(node('stop', { offset: stop[0], 'stop-color': stop[1] })); }); defs.appendChild(metal);
    var beam = node('linearGradient', { id: 'davis-bike-beam', gradientUnits: 'userSpaceOnUse', x1: '68', y1: '524', x2: '-22', y2: '646' });
    [['0', '#fff1cc', '.24'], ['.46', '#ffe3a6', '.12'], ['1', '#e9c38a', '0']].forEach(function (stop) { beam.appendChild(node('stop', { offset: stop[0], 'stop-color': stop[1], 'stop-opacity': stop[2] })); }); defs.appendChild(beam);
    var floor = node('radialGradient', { id: 'davis-bike-ground' });
    [['0', '#ffe7b0', '.34'], ['.65', '#e8c38b', '.11'], ['1', '#e8c38b', '0']].forEach(function (stop) { floor.appendChild(node('stop', { offset: stop[0], 'stop-color': stop[1], 'stop-opacity': stop[2] })); }); defs.appendChild(floor); group.appendChild(defs);
    var hardware = node('g', { 'class': 'campus-bike-hardware' });
    hardware.appendChild(node('path', { d: 'M108 533L93 529L90 525', fill: 'none', stroke: '#526460', 'stroke-width': '3.1', 'stroke-linecap': 'round' }));
    hardware.appendChild(node('path', { d: 'M107 532L93 527', fill: 'none', stroke: '#bbbda8', 'stroke-width': '.9' }));
    hardware.appendChild(node('path', { d: 'M72 514.5Q85 511.5 92 518L93 529Q87 535.5 73 533L66 528V519Z', fill: 'url(#davis-bike-metal)', stroke: '#4c5954', 'stroke-width': '1.3' }));
    hardware.appendChild(node('ellipse', { cx: '67.8', cy: '523.8', rx: '5.5', ry: '8', fill: '#8b9991', stroke: '#c3c8b4', 'stroke-width': '1.3' }));
    hardware.appendChild(node('path', { d: 'M71 518Q68 519 67 523M75 517L84 516', fill: 'none', stroke: '#e5e1c9', 'stroke-width': '.65', opacity: '.8' })); group.appendChild(hardware);
    var light = node('g', { 'class': 'campus-bike-night-light' });
    light.appendChild(node('path', { d: 'M68 520Q14 537 -24 586L-42 648H35Q37 576 69 527Z', fill: 'url(#davis-bike-beam)' }));
    light.appendChild(node('ellipse', { cx: '14', cy: '650', rx: '65', ry: '6.5', fill: 'url(#davis-bike-ground)' }));
    light.appendChild(node('path', { d: 'M55 538A55 55 0 0 0 28 578', fill: 'none', stroke: '#ffe2a1', 'stroke-width': '1.55', opacity: '.32' }));
    light.appendChild(node('ellipse', { cx: '67.6', cy: '523.8', rx: '4.5', ry: '6.8', fill: '#ffeac0', opacity: '.97' }));
    light.appendChild(node('ellipse', { cx: '66.7', cy: '522.8', rx: '2.1', ry: '3.8', fill: '#fff8df' }));
    light.appendChild(node('path', { d: 'M71 516Q67 515 64 520M74 515.5Q80 514 85 515.5', fill: 'none', stroke: '#ffe5b3', 'stroke-width': '1.05', opacity: '.58' })); group.appendChild(light);
    return group;
  }
  var education = A.stations.education;
  A.stations.education = function () {
    var root = parse(education.apply(A, arguments));
    ['ms', 'phd'].forEach(function (school) {
      var campus = root.querySelector('.campus-keepsake[data-school="' + school + '"]'), sprite = campus && campus.querySelector('.painted-sprite');
      if (sprite) campus.insertBefore(campusLight(school, sprite), sprite.nextSibling);
    });
    var davis = root.querySelector('.campus-keepsake[data-school="bs"]'), bicycle = davis && davis.querySelector('.painted-sprite');
    if (bicycle) davis.insertBefore(bicycleLamp(bicycle), bicycle.nextSibling);
    return serialize(root);
  };
})();
