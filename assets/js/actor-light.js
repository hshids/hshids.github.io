/* Optional painted surface light and small shoe contact shadows. */
(function () {
  "use strict";
  var A = window.HJArt;
  if (!A) return;
  var settings = { enabled: new URLSearchParams(location.search).get("actorlight") !== "off", strength: .78 };
  var ns = "http://www.w3.org/2000/svg", mounted = [];
  // Sole points measured from alpha in the existing stationary paintings.
  // They are ground contacts rather than the rig's higher ankle pivots.
  var stationarySoles = {
    "read-day": [[50.8115,190.3222],[76.4859,191.8136]], "read-night": [[53.5606,190.1320],[68.6182,191.8132]],
    "profile-day": [[51.2952,190.6869],[65.1154,191.3434]], "profile-night": [[57.1165,190.5161],[69.8137,191.3405]],
    "shelf-day": [[52.1652,191.6324],[69.5540,191.4486]], "shelf-night": [[57.6750,191.2625],[69.7988,190.5251]],
    "front-day": [[35.63408,192.0000],[77.79735,191.87601]], "front-night": [[55.15722,191.87790],[67.54583,191.87790]]
  };
  function node(tag, attrs) { var el = document.createElementNS(ns, tag); Object.keys(attrs || {}).forEach(function (key) { el.setAttribute(key, attrs[key]); }); return el; }
  function fixed(v) { return v.toFixed(3); }
  function installDefs() {
    if (document.getElementById("actor-light-defs")) return;
    var svg = node("svg", { id: "actor-light-defs", "class": "defs", width: "0", height: "0", "aria-hidden": "true" });
    svg.innerHTML = '<defs><filter id="actor-tonal-day" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".995 0 0 0 0  0 1.005 0 0 0  0 0 .990 0 0  0 0 0 1 0"/></filter><filter id="actor-tonal-night" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".800 0 0 0 0  0 .860 0 0 0  0 0 .945 0 0  0 0 0 1 0"/></filter><linearGradient id="actor-ground-shade" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#29302a" stop-opacity="0"/><stop offset=".4" stop-color="#29302a" stop-opacity=".08"/><stop offset="1" stop-color="#29302a" stop-opacity=".22"/></linearGradient><linearGradient id="actor-ground-shade-right" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#29302a" stop-opacity=".22"/><stop offset=".6" stop-color="#29302a" stop-opacity=".08"/><stop offset="1" stop-color="#29302a" stop-opacity="0"/></linearGradient></defs>';
    document.body.appendChild(svg);
  }
  function mount(root) {
    if (root._actorContacts) return root._actorContacts;
    var svg = root.querySelector(".painted-character"), flip = svg && svg.querySelector(".c-flip");
    if (!flip) return null;
    installDefs();
    var group = node("g", { "class": "actor-ground-contact" }), feet = [];
    for (var i = 0; i < 2; i++) {
      var cast = node("path", { "class": "actor-shoe-cast" }), contact = node("path", { "class": "actor-shoe-contact" });
      group.appendChild(cast); group.appendChild(contact); feet.push({ cast: cast, contact: contact });
    }
    flip.insertBefore(group, flip.firstChild);
    root._actorContacts = { group: group, feet: feet }; mounted.push(root);
    root.classList.toggle("actor-lighting", settings.enabled);
    new MutationObserver(function () { if (!root._actorContactPending) { root._actorContactPending = true; requestAnimationFrame(function () { root._actorContactPending = false; updateContact(root, root._actorActiveConfig || root._rigNativeConfig); }); } }).observe(root, { attributes: true, attributeFilter: ["class"] });
    return root._actorContacts;
  }
  function updateContact(root, config) {
    var view = root._actorContacts || mount(root);
    if (!view) return;
    var hidden = !settings.enabled || root.classList.contains("act-write") || root.classList.contains("act-pet");
    view.group.toggleAttribute("hidden", hidden);
    if (hidden) return;
    var dark = document.documentElement.dataset.theme === "dark", read = root.classList.contains("act-read");
    // Native action feet already include their current jump lift. Copy the
    // frame data so neither these shadows nor a fallback can alter the atlas.
    var nativeFeet = !read && root._rigNativeFeet;
    var sourceFeet = nativeFeet || (!read && config && config.footContacts);
    var feet = sourceFeet ? sourceFeet.map(function (foot) { return Object.assign({}, foot); }) : null;
    if (feet && !nativeFeet) {
      var nativePoseY = root._paintRig && root._paintRig.poseY;
      if (nativePoseY) feet.forEach(function (foot) {
        var actualY = foot.y * nativePoseY[0] + nativePoseY[1], jumpLift = Math.max(0, foot.y - actualY);
        foot.lift = Math.max(foot.lift || 0, jumpLift); foot.actualY = actualY;
        if (jumpLift >= 1.5) foot.stance = false;
      });
    }
    if (!feet && !read && config && config.nativeView) {
      var native = stationarySoles[config.nativeView + (dark ? "-night" : "-day")];
      if (native) feet = native.map(function (point) { return { x: point[0], y: point[1], stance: true, lift: 0 }; });
    }
    if (!feet && !read && root._rigFootPose) feet = root._rigFootPose.map(function (foot, i) {
      var lift = Math.max(0, foot.rest[1] - foot.ankle[1]);
      // The front ankle has already been transformed by the actual jump.
      var soleY = stationarySoles[dark ? "front-night" : "front-day"][i][1];
      var toeOffset = dark ? (i ? (561.802 - 558) * 184 / 1507 : (460.337 - 464) * 184 / 1507) : (i ? (614.457 - 579) * 84 / 669 : (278.657 - 343) * 84 / 669);
      // A stopped front pose has both shoes planted, even if the retained
      // walking phase places one of its old feet in the swing interval.
      var stationary = !root.classList.contains("is-walking") && !root.classList.contains("native-step-settling");
      return { x: foot.ankle[0] + toeOffset, y: soleY, lift: lift, stance: (stationary || foot.stance) && lift < 1.5 };
    });
    if (!feet) feet = stationarySoles[(read ? "read" : "front") + (dark ? "-night" : "-day")].map(function (point) { return { x: point[0], y: point[1], stance: true, lift: 0 }; });
    var groundY = Math.max.apply(Math, feet.map(function (foot) { return foot.y; })) + .12;
    var facing = root.classList.contains("face-left") ? -1 : 1, castDirection = -facing;
    var heldLamp = dark && !read && !root.classList.contains("hands-free") && root._actorSurfaceLighting ? root._actorSurfaceLighting.lamp : null;
    root._actorContactFeet = [];
    feet.forEach(function (foot, i) {
      if (!view.feet[i]) return;
      var x = foot.x === undefined ? foot[0] : foot.x;
      var lift = foot.lift || 0, planted = foot.stance === true || (foot.stance !== false && lift < 1.5);
      var planeY = planted ? foot.y + .12 : groundY;
      var weight = planted ? .30 : lift > 3 ? .045 : .11, spread = planted ? 7.5 : 6;
      var core = view.feet[i].contact, cast = view.feet[i].cast;
      core.setAttribute("d", "M" + fixed(x - spread) + " " + fixed(planeY) + "Q" + fixed(x) + " " + fixed(planeY - .55) + " " + fixed(x + spread) + " " + fixed(planeY) + "Q" + fixed(x + spread - 1.5) + " " + fixed(planeY + .45) + " " + fixed(x - spread + 1) + " " + fixed(planeY + .3) + "Z");
      core.setAttribute("opacity", fixed(weight));
      // The nearby held light takes precedence over the moon for this short
      // shoe shadow. Local coordinates mirror with the same painted body.
      var direction = heldLamp ? Math.max(-1, Math.min(1, (x - heldLamp[0]) / 24)) : castDirection;
      var end = x + direction * (dark ? 7 : 13);
      cast.style.fill = "url(#" + (direction > 0 ? "actor-ground-shade-right" : "actor-ground-shade") + ")";
      cast.setAttribute("d", "M" + fixed(x - spread) + " " + fixed(planeY - .08) + "L" + fixed(end - spread * .8) + " " + fixed(planeY + 2.4) + "Q" + fixed(end) + " " + fixed(planeY + 3.1) + " " + fixed(end + spread * .8) + " " + fixed(planeY + 2.5) + "L" + fixed(x + spread) + " " + fixed(planeY - .08) + "Z");
      cast.setAttribute("opacity", planted ? ".72" : ".30");
      root._actorContactFeet.push({ x: x, y: planeY, lift: lift, stance: planted, shadowDx: end - x });
    });
  }
  A.actorSurfaceLight = function (root, config, bones, type) {
    if (type !== "human") return null;
    root._actorActiveConfig = config;
    var dark = document.documentElement.dataset.theme === "dark", facing = root.classList.contains("face-left") ? -1 : 1;
    var lamp = config.lamp ? config.lamp.slice() : null;
    if (!lamp && config.night && config.pivots && config.pivots.handL) {
      var p = config.pivots.handL, m = bones[2] || bones[0];
      lamp = [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5] + 16];
    }
    var poseY = root._paintRig && root._paintRig.poseY;
    if (lamp && poseY) lamp[1] = lamp[1] * poseY[0] + poseY[1];
    var hasLamp = dark && lamp && !root.classList.contains("hands-free") && !root.classList.contains("act-read") && !root.classList.contains("act-write") && !root.classList.contains("act-pet") && !root.classList.contains("mail-pose-active");
    root._actorSurfaceLighting = { enabled: settings.enabled, strength: settings.strength, lamp: hasLamp ? lamp : null };
    mount(root); updateContact(root, config);
    return { light: [settings.enabled ? settings.strength : 0, dark ? 1 : 0, facing, 1], lamp: hasLamp ? [lamp[0], lamp[1], 1] : [0, 0, 0] };
  };
  A.setActorLighting = function (enabled, strength) {
    settings.enabled = enabled !== false;
    if (typeof strength === "number") settings.strength = Math.max(0, Math.min(1, strength));
    mounted.forEach(function (root) { root.classList.toggle("actor-lighting", settings.enabled); updateContact(root, root._actorActiveConfig || root._rigNativeConfig); });
  };
  function boot() { installDefs(); document.querySelectorAll("#char,.avatar-demo").forEach(function (root) { mount(root); updateContact(root, root._rigNativeConfig); }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
