/*
 * The interactive world: parallax scenery, the walking avatar and her cat,
 * station panels, the Mini-Hanjing dialogue box, day/night, and the
 * welcome screen. Content comes from data.js; answers from guide.js.
 */
(function () {
  "use strict";

  var D = window.HJ_DATA, G = window.HJGuide, ART = window.HJArt;
  var GY = ART.GY, VH = ART.VH;
  var SITE_LANG = "en";             // Page content stays English independently of the conversation.
  var W = 7500;                     // world width in units
  var CHAR_W = 105, CHAR_H = 175;   // adult proportions, with the same feet on the walking line
  var CAT_W = 66, CAT_H = 53;   // the chibi golden kitty (90x72 art)

  // "stand" is each place's red circle: stop on it and she does something there (see ACTIONS).
  var STATIONS = [
    { id: "home", x: 700, stand: 610, half: 320, label: "Welcome", zh: "入口" },
    { id: "research", x: 1750, stand: 1630, half: 290, label: "Research", zh: "研究" },
    { id: "talks", x: 2850, stand: 2880, half: 350, label: "Talks", zh: "报告" },
    { id: "education", x: 4000, stand: 3880, half: 340, label: "Education", zh: "求学" },
    { id: "writing", x: 5050, stand: 4990, half: 330, label: "Writing", zh: "写作" },
    { id: "life", x: 6000, stand: 5943, half: 330, label: "Life", zh: "生活" },
    { id: "contact", x: 6900, stand: 6788, half: 260, label: "Contact", zh: "联系" }
  ];
  var byId = {};
  STATIONS.forEach(function (s) { byId[s.id] = s; });
  byId.tutorials = byId.writing;     // Keep old links and guide routes working.

  var LAYERS = [
    { id: "sky", f: 0.06, build: ART.sky },
    { id: "far", f: 0.2, build: ART.far },
    { id: "mid", f: 0.42, build: ART.mid },
    { id: "near", f: 0.7, build: ART.near },
    { id: "ground", f: 1 },
    { id: "front", f: 1.18, build: ART.foreground }
  ];

  var esc = G.esc, pick = G.pick;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  var reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var state = {
    s: 1, cw: 0, ch: 0, viewW: 1000, sceneBottom: 0, mobile: false,
    x: 610, target: 610, vel: 0, vmax: 500, dir: 1,
    cam: 0, camRate: 6, focusX: null, drift: 0,
    catX: 520, catDir: 1, catTrail: 1, catVel: 0, catStride: 0,
    keys: { left: false, right: false },
    trip: null, near: null, panel: null,
    lang: "en",   // the site is in English; the guide switches to Chinese only when asked in Chinese
    raf: 0, last: 0, title: false, dragged: false,
    guideMin: false   // the visitor folded the chat away themselves
  };

  // ---------- DOM ----------
  var worldEl = $("#world"), layersEl = $("#layers"), hud = $("#hud");
  var panel = $("#panel"), panelBody = $("#panel-body");
  var guide = $("#guide"), fab = $("#guide-fab"), log = $("#guide-log"), chips = $("#guide-chips"), form = $("#guide-form"), input = $("#guide-input");
  var charEl, catEl, butterflyEl, groundEl, waterLightEl, catLegs = [], layerEls = [];

  function svgWrap(width, inner, cls) {
    return '<svg class="' + cls + '" viewBox="0 0 ' + width + " " + VH + '" preserveAspectRatio="xMinYMax meet" aria-hidden="true" focusable="false">' + inner + "</svg>";
  }

  function stationArt(st) {
    var fn = ART.stations[st.id];
    var inner = st.id === "research" ? fn(D.publications, D.themes)
      : st.id === "talks" ? fn(D.videos, D.posters)
      : st.id === "writing" ? fn(D.tutorials)
      : st.id === "life" ? fn(D.cats.filter(function (c) { return c.photos && c.photos.length; }).map(function (c) { return thumbOf(c.photos[0]); }))
      : fn();
    if (st.id !== "writing" && st.id !== "life") {
      var spot = '<ellipse class="spot" cx="' + (st.stand - st.x) + '" cy="' + (GY + 3) + '" rx="27" ry="6.5"/>';
      inner = inner.replace(/(<g class="st [^>]*>(?:<rect class="hit"[^>]*>)?)/, "$1" + spot);
    }
    return '<g transform="translate(' + st.x + ' 0)">' + inner + "</g>";
  }

  function build() {
    document.body.insertAdjacentHTML("afterbegin",
      '<svg class="defs" width="0" height="0" aria-hidden="true" focusable="false">' + ART.defs() + "</svg>");
    LAYERS.forEach(function (L) {
      var el = document.createElement("div");
      el.className = "layer layer-" + L.id;
      L.width = L.id === "ground" ? W : Math.ceil(W * L.f + 2600);
      if (L.id === "ground") {
        el.innerHTML = svgWrap(W, ART.ground(W, STATIONS) + STATIONS.map(stationArt).join(""), "scene") +
          '<div class="actor cat" id="cat">' + ART.cat() + '<div class="bubble" id="cat-bubble"></div></div>' +
          '<button type="button" class="cat-butterfly" hidden aria-label="Let JinBingBing chase this visiting butterfly"><svg viewBox="0 0 24 24" aria-hidden="true"><g class="bf-flight"><path class="bf-wing" d="M12 12C5 0 -2 4 3 12Q1 20 11 15ZM12 12C19 0 26 4 21 12Q23 20 13 15Z"/><path class="bf-body" d="M12 8V18M12 8l-2 -3M12 8l2 -3"/></g></svg></button>' +
          '<div class="actor char" id="char">' + ART.character("w") + '<div class="bubble" id="char-bubble"></div></div>';
        el.insertAdjacentHTML("beforeend", '<button type="button" id="xiaohei-control" class="sleeper-control" aria-label="Wake XiaoHei, our oldest brother, for a little grooming" style="left:calc(var(--s) * ' + (byId.life.x - 33) + 'px)"></button>');
        ART.screenPlants.forEach(function (plant, i) {
          el.insertAdjacentHTML("beforeend", '<button type="button" class="paper-control" data-screen-plant="' + plant + '" aria-label="Look closely at the ' + plant + ' painting on silk" style="left:calc(var(--s) * ' + (byId.writing.x - 140 + i * 74) + 'px);bottom:calc(var(--s) * 321px);width:calc(var(--s) * 58px);height:calc(var(--s) * 70px)"></button>');
        });
        ART.paperSpots.forEach(function (p, i) {
          el.insertAdjacentHTML("beforeend", '<button type="button" class="paper-control" data-ornament="' + i + '" aria-label="Gently stir paper ' + (i % 2 ? "star " : "crane ") + (i + 1) + '" style="left:calc(var(--s) * ' + (byId.writing.x + p[0] - 26) + 'px);bottom:calc(var(--s) * ' + (VH - p[1] - 22) + 'px);width:calc(var(--s) * 54px);height:calc(var(--s) * 50px)"></button>');
        });
        D.tutorials.forEach(function (t, i) {
          el.insertAdjacentHTML("beforeend", '<button type="button" class="paper-control" data-tutorial="' + t.id + '" aria-label="Read ' + esc(t.title) + '" style="left:calc(var(--s) * ' + (byId.writing.x + 176) + 'px);bottom:calc(var(--s) * ' + (VH - (446 + i * 26) - 14) + 'px);width:calc(var(--s) * 128px);height:calc(var(--s) * 28px)"></button>');
        });
        groundEl = el;
      } else {
        el.innerHTML = svgWrap(L.width, L.build(L.width), "scene");
      }
      layersEl.appendChild(el);
      L.el = el;
      layerEls.push(L);
    });
    charEl = $("#char");
    catEl = $("#cat");
    butterflyEl = $(".cat-butterfly");
    catLegs = $$(".cat-gait-leg", catEl).map(function (leg) {
      var phases = { 'hind-near': 0, 'fore-near': .25, 'hind-far': .5, 'fore-far': .75 };
      return { length: +leg.dataset.legLength, phase: phases[leg.dataset.catLeg], hind: leg.dataset.catLeg.indexOf('hind') === 0,
        fur: $(".cat-leg-fur", leg), fibres: $(".cat-leg-fibres", leg), paw: $(".cat-gait-paw", leg) };
    });
    waterLightEl = $("#water-light");
    $("#guide-portrait").innerHTML = ART.portrait("p");
    $("#guide-fab-face").innerHTML = ART.portrait("f");
  }

  // ---------- layout ----------
  function guideReserve() {
    // On phones the scene sits above the open chat sheet; folded, it uses the full height.
    return state.mobile && !guide.classList.contains("collapsed") ? Math.min(170, state.ch * 0.3) : 0;
  }

  function layout() {
    var r = worldEl.getBoundingClientRect();
    state.cw = r.width; state.ch = r.height;
    state.mobile = r.width < 700;
    var writingFrame = state.panel === "writing" || state.focusX === byId.writing.x;
    var minUnits = state.mobile ? (writingFrame ? 620 : 480) : 720;
    var s = Math.min(r.height / VH, r.width / minUnits);
    state.s = s;
    state.viewW = r.width / s;
    var sunBounds = $("#sun").getBoundingClientRect();
    state.waterLightX = (sunBounds.left + sunBounds.width / 2 - r.left) / s;
    var extra = r.height - VH * s;
    // Raise the walkable stage on tall phones rather than leaving all the spare height in the sky.
    state.sceneBottom = state.mobile ? Math.max(extra * 0.62, Math.min(guideReserve(), extra)) : 0;
    worldEl.style.setProperty("--s", s);
    worldEl.style.setProperty("--scene-bottom", state.sceneBottom + "px");
    layerEls.forEach(function (L) {
      L.el.style.width = L.width * s + "px";
      L.el.style.height = VH * s + "px";
    });
    render(true);
  }

  // The part of the screen not covered by the dialogue box (left) or the panel (right), in px.
  function freeRange() {
    var l = 0, r = state.cw;
    if (!state.mobile) {
      if (!guide.classList.contains("collapsed")) l = Math.min(guide.offsetLeft + guide.offsetWidth, state.cw * 0.5);
      if (state.panel) r = Math.max(l + 280, state.cw - panel.offsetWidth - 24);
    }
    return [l, r];
  }

  // ---------- rendering ----------
  function render(force) {
    var s = state.s;
    layerEls.forEach(function (L) {
      L.el.style.transform = "translate3d(" + (-state.cam * L.f * s).toFixed(1) + "px,0,0)";
    });
    charEl.style.transform = "translate3d(" + ((state.x - CHAR_W / 2) * s).toFixed(1) + "px,0,0)";
    catEl.style.transform = "translate3d(" + ((state.catX - CAT_W / 2) * s).toFixed(1) + "px,0,0)";
    charEl.classList.toggle("face-left", state.dir < 0);
    catEl.classList.toggle("face-left", state.catDir < 0);
    catEl.style.setProperty("--cat-facing", state.catDir);
    // Sun and moon stay in the sky while their broken reflection stays beneath them.
    waterLightEl.setAttribute("transform", "translate(" + (state.cam * 1.18 + state.waterLightX).toFixed(1) + " 0)");
  }

  function camGoal() {
    var fr = freeRange();
    // With the dialogue box open beside a panel, keep the avatar (who is talking) in view.
    var fx = state.focusX != null && !(fr[0] > 0 && state.panel) ? state.focusX : state.x;
    if (state.mobile && state.focusX === byId.writing.x) fx += 35;  // Fit the desk and the scroll rack together.
    return clamp(fx - (fr[0] + (fr[1] - fr[0]) / 2) / state.s, 0, Math.max(0, W - state.viewW));
  }

  // ---------- loop ----------
  function poseCatLegs(moving) {
    catLegs.forEach(function (leg) {
      var phase = (state.catStride + leg.phase) % 1, stance = .62;
      var swing = Math.max(0, (phase - stance) / (1 - stance));
      var x = moving ? (phase < stance ? 7 * (1 - 2 * phase / stance) : -7 * Math.cos(swing * Math.PI)) : 0;
      var y = leg.length - (moving ? Math.sin(swing * Math.PI) * 4.5 : 0);
      var kneeX = x * .35 + (leg.hind ? -1.3 : .7), kneeY = leg.length * .52;
      function n(v) { return v.toFixed(2); }
      leg.fur.setAttribute("d", "M-3 0Q" + n(kneeX - 3) + " " + n(kneeY) + " " + n(x - 2.4) + " " + n(y - 1) + "L" + n(x + 2.4) + " " + n(y - 1) + "Q" + n(kneeX + 3) + " " + n(kneeY) + " 3 0Z");
      leg.fibres.setAttribute("d", "M-1 3Q" + n(kneeX - .5) + " " + n(kneeY) + " " + n(x - .8) + " " + n(y - 4) + "M1 4l.3 2");
      leg.paw.setAttribute("transform", "translate(" + n(x) + " " + n(y) + ")");
    });
    catEl.style.setProperty("--cat-body-lift", moving ? (Math.sin(state.catStride * Math.PI * 4) * .35).toFixed(2) + "px" : "0px");
  }

  function start() { if (!state.raf) { state.last = 0; state.raf = requestAnimationFrame(tick); } }

  function tick(t) {
    var dt = state.last ? Math.min(0.05, (t - state.last) / 1000) : 0.016;
    state.last = t;
    var busy = false;

    if (state.keys.left || state.keys.right) {
      state.target = clamp(state.x + (state.keys.right ? 1 : -1) * 300, 90, W - 90);
      state.vmax = 520; state.focusX = null; state.trip = null;
    }

    // walking (velocity with accel/decel)
    var dx = state.target - state.x;
    if (Math.abs(dx) > 0.5 || Math.abs(state.vel) > 1) {
      busy = true;
      var desired = Math.sign(dx) * Math.min(state.vmax, Math.sqrt(2 * 2600 * Math.abs(dx)));
      state.vel += clamp(desired - state.vel, -3200 * dt, 3200 * dt);
      state.x += state.vel * dt;
      if ((dx > 0 && state.x >= state.target) || (dx < 0 && state.x <= state.target)) { state.x = state.target; state.vel = 0; }
      if (Math.abs(state.vel) > 5) { state.dir = state.vel > 0 ? 1 : -1; state.catTrail = state.dir; }
    } else if (state.trip) {
      var trip = state.trip; state.trip = null;
      arrive(trip);
    }
    charEl.classList.toggle("is-walking", Math.abs(state.vel) > 20);
    charEl.classList.toggle("is-running", Math.abs(state.vel) > 700);

    // Ease into following, keep facing the actual motion, and finish the last step before sitting.
    var catGoal = state.x - state.catTrail * 82;
    var cdx = catGoal - state.catX, cstep = 0;
    if (!reduced && (Math.abs(cdx) > .4 || Math.abs(state.catVel) > 3)) {
      busy = true;
      var catMax = Math.max(320, Math.abs(state.vel) * 1.12);
      var catDesired = Math.sign(cdx) * Math.min(catMax, Math.sqrt(2 * 2600 * Math.abs(cdx)));
      state.catVel += clamp(catDesired - state.catVel, -3200 * dt, 3200 * dt);
      cstep = state.catVel * dt;
      if (Math.sign(cstep) === Math.sign(cdx) && Math.abs(cstep) >= Math.abs(cdx)) { cstep = cdx; state.catVel = 0; }
      state.catX += cstep;
      if (Math.abs(cstep) > .01) state.catDir = cstep > 0 ? 1 : -1;
    } else {
      state.catX = catGoal; state.catVel = 0;
    }
    var catMoving = Math.abs(cstep) > .01;
    var wasCatMoving = catEl.classList.contains("is-walking");
    catEl.classList.toggle("is-walking", catMoving);
    if (catMoving) {
      // Keep the tiny steps readable even during a fast trip across the whole world.
      state.catStride = (state.catStride + Math.min(Math.abs(cstep) / 54, dt / .42)) % 1;
      poseCatLegs(true);
      catEl.classList.remove("is-pouncing", "is-tail-playing", "is-happy");
      if (!butterflyEl.hidden) dismissButterfly(true);
    } else if (wasCatMoving) {
      poseCatLegs(false);
    }

    // camera
    if (state.title && !reduced) {
      state.drift += dt * 55;
      var span = Math.max(1, W - state.viewW);
      var p = (state.drift % (2 * span)); state.cam = p < span ? p : 2 * span - p;
      busy = true;
    } else {
      var goal = camGoal();
      var dc = goal - state.cam;
      if (Math.abs(dc) > 0.3) {
        busy = true;
        state.cam += dc * (1 - Math.exp(-dt * state.camRate));
      } else { state.cam = goal; state.camRate = 6; }
    }

    render();
    updateNear();
    checkSpot();
    if (busy || state.keys.left || state.keys.right) state.raf = requestAnimationFrame(tick);
    else { state.raf = 0; state.last = 0; }
  }

  // ---------- movement API ----------
  function walkTo(x, opts) {
    opts = opts || {};
    state.target = clamp(x, 90, W - 90);
    var dist = Math.abs(state.target - state.x);
    state.vmax = clamp(dist / 2.1, 420, 2800);
    state.focusX = opts.focus != null ? opts.focus : null;
    state.trip = opts.trip || null;
    if (reduced) {
      if (dist > .5) state.dir = state.target > state.x ? 1 : -1;
      state.x = state.target; state.catX = state.x - 82 * state.dir;
      state.catDir = state.catTrail = state.dir; state.catVel = 0;
      state.vel = 0; state.cam = camGoal();
      render();
      if (state.trip) { var t = state.trip; state.trip = null; arrive(t); }
      return;
    }
    start();
  }

  function goTo(id, opts) {
    var st = byId[id];
    if (!st) return;
    opts = opts || {};
    if (id === "tutorials") { id = "writing"; if (!opts.focus) opts.focus = { section: "writing-tutorials" }; }
    var already = Math.abs(state.x - st.stand) < 2;
    if (opts.panel !== false) openPanel(id, opts.focus, opts.fromChat);
    walkTo(st.stand, { trip: { id: id, quiet: opts.quiet, focus: opts.focus }, focus: null });
    if (already) { state.focusX = st.x; if (state.mobile) layout(); start(); }
  }

  function arrive(trip) {
    var st = byId[trip.id];
    state.dir = st.x >= state.x ? 1 : -1;
    state.focusX = st.x;
    if (state.mobile) layout();
    render(); start();
    if (!trip.quiet) stationGreeting(trip.id);
  }

  function updateNear() {
    var near = null;
    for (var i = 0; i < STATIONS.length; i++) {
      if (Math.abs(STATIONS[i].x - state.x) < STATIONS[i].half + 40) { near = STATIONS[i]; break; }
    }
    if ((near && near.id) === (state.near && state.near.id)) return;
    state.near = near;
    $$(".nav-btn").forEach(function (b) { b.classList.toggle("is-here", !!near && b.dataset.go === near.id); });
    $$(".st").forEach(function (g) { g.classList.toggle("is-near", !!near && g.dataset.station === near.id); });
    showHud();
  }

  function showHud() {
    var near = state.near;
    if (!near || state.panel === near.id || state.title) { hud.classList.remove("show"); return; }
    hud.innerHTML = "<b>" + esc(near.label) + "</b> · " +
      (state.mobile ? "tap to explore" : "press Enter to explore");
    hud.classList.add("show");
  }

  // ---------- character reactions ----------
  function flash(el, cls, ms) {
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, ms);
  }
  function bubble(el, text, ms) {
    var b = el.querySelector(".bubble");
    b.textContent = text; b.classList.add("show");
    clearTimeout(b._t); b._t = setTimeout(function () { b.classList.remove("show"); }, ms || 1800);
  }
  function doAction(a) {
    if (a === "meow") { kittyPoke(); }
    else if (a === "jump") flash(charEl, "is-jumping", 800);
    else if (a === "wave") flash(charEl, "is-waving", 1500);
    else if (a === "night") setTheme("dark");
    else if (a === "day") setTheme("light");
    else if (a === "ink") flash($(".inkstone"), "is-grinding", 4200);
    else if (a === "projector") flash($(".cinema"), "is-projecting", 9000);
    else if (a === "simmer") flash($(".stove"), "is-simmering", 6000);
    else if (a === "groom") groomXiaoHei();
    else if (a === "pond") stirPond(state.cw * .62, worldEl.getBoundingClientRect().bottom - state.sceneBottom - state.s * 39);
  }

  // ---------- theme ----------
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    store("hj-theme", t);
    var btn = $("#theme-btn");
    btn.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
    btn.setAttribute("aria-label", t === "dark" ? "Switch to day" : "Switch to night");
    dismissButterfly(false);
    if (t !== "dark") scheduleButterfly();
  }
  function toggleTheme() {
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  }

  // ---------- guide (dialogue box) ----------
  var ARRIVE = {
    home: { en: "Welcome to my little world! Come on in! The notice board has what I've been up to lately.", zh: "欢迎来到我的小世界！进来吧～公告栏上是我最近在忙的事。" },
    research: { en: "My library! Every book on these shelves is one of my papers. Let me grab one for you!", zh: "我的藏书阁！书架上每一本都是我的论文，我给你拿一本！" },
    talks: { en: "Welcome to my lecture hall! Grab a seat, pick a talk, and I'll present it for you.", zh: "欢迎来到我的报告厅！找个位置坐下，选一场报告，我讲给你听。" },
    education: { en: "UC Davis → Georgetown → Lehigh. Caps in the air! 🎓", zh: "UC Davis → Georgetown → Lehigh。把帽子扔上天！🎓" },
    writing: { en: "Let me sit down and write for a bit… My posts are on the desk, and my tutorials are tucked into the scroll rack.", zh: "让我坐下来写一会儿……书桌上是我的博客，旁边的卷轴里收着我写的教程。" },
    life: { en: "Off the clock! Hold on, XiaoHei is napping and I have to pet him first. 🐾 Then come road trips, food and my cat gallery.", zh: "下班时间！等一下，小黑在睡觉，我先摸摸他 🐾 然后看看我的自驾、美食和猫咪画廊。" },
    contact: { en: "Let me mail you a letter! ✉️ Want to talk research or collaborate? Here's where to find me.", zh: "给你寄封信！✉️ 想聊研究或合作？在这里可以找到我。" }
  };
  var STATION_CHIPS = {
    home: { en: ["What's new?", "Who are you?", "What do you research?"], zh: ["最近有什么新动态？", "你是谁？", "你研究什么？"] },
    research: { en: D.themes.slice(0, 3).map(function (t) { return t.title; }).concat(["Only peer-reviewed ones"]), zh: D.themes.slice(0, 3).map(function (t) { return t.zhTitle; }).concat(["只看正式发表的"]) },
    education: { en: ["Past experience?", "Who is your advisor?"], zh: ["过往经历？", "你的导师是谁？"] },
    talks: { en: ["Do you have video talks?", "Show me your posters", "What's new?"], zh: ["有报告视频吗？", "看看你的海报", "最近有什么新动态？"] },
    writing: { en: ["Bayesian statistics", "Time series", "Python tutorials", "I want to learn R"], zh: ["贝叶斯统计", "时间序列", "Python 教程", "有 R 语言教程吗"] },
    life: { en: ["Tell me about your cats", "How many states have you visited?", "What do you like to eat?", "Where have you lived?"], zh: ["说说你的猫", "你去过几个州？", "你喜欢吃什么？", "你在哪些地方生活过？"] },
    contact: { en: ["Can I see your CV?", "Do you have video talks?"], zh: ["可以看简历吗？", "有论文讲解视频吗？"] }
  };
  var POKES = {
    en: ["Hi! I'm Hanjing, the pocket-sized edition.", "Pick a place and I'll walk you there!", "Psst, every book in my library is one of my papers.", "JinBingBing follows me everywhere.", "Stand on a red circle and see what I do there!", "Fun fact, I remember her papers better than she does. 😏"],
    zh: ["嗨！我是迷你版的 Hanjing。", "点一个地方，我带你走过去！", "悄悄告诉你，藏书阁里每本书都是我的论文。", "金饼饼走到哪跟到哪。", "站到红圈上，看看我会做什么！", "冷知识，她的论文我比她本人记得还清楚 😏"]
  };
  if (window.HJRituals) {
    POKES.en = POKES.en.concat(window.HJRituals.pokes.en);
    POKES.zh = POKES.zh.concat(window.HJRituals.pokes.zh);
  }

  function addMsg(who, text) {
    var m = document.createElement("div");
    m.className = "msg msg-" + who;
    var t = document.createElement("p");
    t.className = "msg-text";
    t.textContent = text || "";
    m.appendChild(t);
    if (who === "guide") { var x = document.createElement("div"); x.className = "msg-extra"; m.appendChild(x); }
    log.appendChild(m);
    $$(".msg-guide", log).forEach(function (el) { el.classList.remove("latest"); });
    if (who === "guide") m.classList.add("latest");
    while (log.children.length > 40) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
    return m;
  }

  // Remember automatic introductions for this visit, independently of the last message.
  // Explicit questions still get an answer, even if the visitor asks again.
  var heardReplies = new Set(), typing = null;
  function finishTyping() { if (typing) { var t = typing; typing = null; t.done(); } }

  function reply(a, opts) {
    opts = opts || {};
    if (opts.once && heardReplies.has(a.text)) { setChips(a.chips); return; }
    heardReplies.add(a.text);
    finishTyping();
    var m = addMsg("guide", "");
    var textEl = m.querySelector(".msg-text"), extra = m.querySelector(".msg-extra");
    var full = a.text, i = 0;
    var cps = /[㐀-鿿]/.test(full) ? 55 : 110;
    var step = Math.max(1, Math.ceil(full.length / (2.2 * 60)));   // never type for more than ~2.2 s
    charEl.classList.add("is-talking");
    if (guide.classList.contains("collapsed") && !opts.silent) sayShort(full);
    function done() {
      clearInterval(timer);
      textEl.textContent = full;
      if (a.html) extra.innerHTML = a.lang === "en" ? a.html.replace(/RedNote \(小红书\)/g, "RedNote") : a.html;
      setChips(a.chips && a.chips.length ? a.chips : null);
      charEl.classList.remove("is-talking");
      log.scrollTop = log.scrollHeight;
    }
    var timer = 0;
    if (reduced) { done(); }
    else {
      typing = { done: done };
      timer = setInterval(function () {
        i = Math.min(full.length, i + Math.max(step, Math.round(cps / 60)));
        textEl.textContent = full.slice(0, i);
        log.scrollTop = log.scrollHeight;
        if (i >= full.length) { typing = null; done(); }
      }, 1000 / 60);
    }
    // On phones the answer stays in the chat sheet; she still walks to the place.
    if (a.go && !opts.noMove) goTo(a.go, { quiet: true, focus: a.focus, fromChat: true, panel: !state.mobile });
    else if (a.focus && state.panel) focusPanel(a.focus);
    if (a.action) doAction(a.action);
  }

  // A short version of a reply, spoken by the avatar while the chat is folded away.
  function sayShort(text) {
    var t = String(text).replace(/\s+/g, " ").trim();
    // Cut after the first full sentence (not after "Ph.D." or "Dr.").
    var re = /[.!?。！？](?=\s|$)/g, m;
    while ((m = re.exec(t))) {
      if (m.index < 24 || /(Ph\.D|Prof|Dr|e\.g|i\.e|vs|U\.S)$/.test(t.slice(0, m.index))) continue;
      t = t.slice(0, m.index + 1);
      break;
    }
    if (t.length > 120) t = t.slice(0, 117).replace(/\s+\S*$/, "") + "…";
    bubble(charEl, t, Math.min(7000, 1800 + t.length * 45));
    fab.classList.add("has-news");
  }

  var lastAsk = { text: "", lang: "", at: 0 };
  function ask(text, label, soft) {
    if (!text) return;
    if (/[㐀-鿿]/.test(label || text)) setLang("zh", true);
    else if (!/^(paper|theme|project):/.test(text)) setLang("en", true);
    var answer = G.answer(text, state.lang);
    if (soft && heardReplies.has(answer.text)) { setChips(answer.chips); return; }
    var now = performance.now();
    if (lastAsk.text === text && lastAsk.lang === state.lang && now - lastAsk.at < 650) return;
    lastAsk = { text: text, lang: state.lang, at: now };
    addMsg("user", label || text);
    // A click in the world ("soft") doesn't reopen a chat the visitor folded away.
    if (!(soft && state.guideMin)) expandGuide(true);
    reply(answer);
  }

  function stationGreeting(id) {
    var text = pick(state.lang, ARRIVE[id]), chipList = STATION_CHIPS[id][state.lang];
    reply({ text: text, html: "", chips: chipList }, { noMove: true, once: true });
  }

  function setChips(list) {
    list = list || G.startChips(state.lang);
    chips.innerHTML = list.map(function (c) { return '<button type="button" class="chip" data-ask="' + esc(c) + '">' + esc(c) + "</button>"; }).join("");
  }

  function setLang(l, quiet) {
    state.lang = l;
    $$(".lang-btn").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.lang === l ? "true" : "false"); });
    input.placeholder = "Ask me about research, papers, education…";
    if (!quiet) setChips(null);
  }

  // open: show the whole conversation; closed: fold it into the small "Ask me" button.
  function expandGuide(open, byUser) {
    var was = !guide.classList.contains("collapsed");
    if (byUser) { state.guideMin = !open; store("hj-guide", open ? "open" : "min"); }
    guide.classList.toggle("collapsed", !open);
    guide.hidden = !open;
    fab.hidden = open;
    fab.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) { fab.classList.remove("has-news"); log.scrollTop = log.scrollHeight; }
    if (state.mobile && was !== open) layout();
    start();   // the free area changed, so the camera re-centres
  }

  // Link the advisor's name to his website wherever the education notes mention him.
  function advisorNote(note) {
    var adv = D.person.advisor || {}, t = esc(note);
    return adv.url && adv.name ? t.replace(esc(adv.name), '<a href="' + esc(adv.url) + '" target="_blank" rel="noopener">' + esc(adv.name) + "</a>") : t;
  }

  // Projects that aren't published yet, shown at the top of the Research panel.
  function nowWorking() {
    var list = D.projects || [];
    if (!list.length) return "";
    var zh = SITE_LANG === "zh";
    return '<section class="p-now" id="now"><h3>' + (zh ? "正在进行" : "Now working on") + '</h3><ul class="p-cards">' + list.map(function (p) {
      var st = p.status === "review" ? (zh ? "审稿中" : "under review") : (zh ? "进行中" : "in progress");
      return '<li class="p-card" id="project-' + esc(p.id) + '"><span class="p-card-tag">' + st + "</span><h3>" + esc(p.title) + "</h3><p>" + esc(pick(SITE_LANG, p)) + "</p>" +
        '<button type="button" class="link-btn" data-askproject="' + esc(p.id) + '">' + (zh ? "问问迷你 Hanjing" : "Ask Mini-Hanjing") + "</button></li>";
    }).join("") + "</ul></section>";
  }

  // ---------- station panels ----------
  function authors(list) {
    return list.map(function (a) { return a === D.person.name ? "<b>" + esc(a) + "</b>" : esc(a); }).join(", ");
  }
  function extLink(href, label) { return '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(label) + "</a>"; }

  function paperItem(p) {
    var l = p.links, links = [];
    if (l.paper) links.push(extLink(l.paper, "Paper"));
    if (l.doi) links.push(extLink(l.doi, "DOI"));
    if (l.arxiv) links.push(extLink(l.arxiv, "arXiv"));
    if (l.pdf) links.push(extLink(l.pdf, "PDF"));
    if (l.poster) links.push(extLink(l.poster, "Poster"));
    if (l.slides) links.push(extLink(l.slides, "Slides"));
    if (G.videoFor(p.id)) links.push('<button type="button" class="link-btn" data-video="' + p.id + '">▶ Video</button>');
    links.push('<button type="button" class="link-btn" data-askpaper="' + p.id + '">' + (SITE_LANG === "zh" ? "问问迷你 Hanjing" : "Ask Mini-Hanjing") + "</button>");
    return '<li class="p-paper" id="paper-' + p.id + '" data-type="' + p.type + '">' +
      '<a class="p-paper-title" href="' + esc(l.paper || l.doi || l.arxiv || l.pdf) + '" target="_blank" rel="noopener">' + esc(p.title) + "</a>" +
      '<div class="p-authors">' + authors(p.authors) + "</div>" +
      '<div class="p-venue"><span class="badge badge-' + p.type + '">' + esc(G.typeLabel[p.type].en) + "</span> " + esc(p.venueShort) + "</div>" +
      "<details><summary>" + (SITE_LANG === "zh" ? "摘要与观点" : "Summary & key point") + "</summary>" +
      "<p>" + esc(pick(SITE_LANG, p.summary)) + "</p><p><b>" + (SITE_LANG === "zh" ? "核心观点" : "Key point") + "</b><br>" + esc(pick(SITE_LANG, p.takeaway)) + "</p>" +
      '<p class="p-venue-full">' + esc(p.venue) + "</p></details>" +
      '<div class="p-links">' + links.join("") + "</div></li>";
  }

  var RENDER = {
    home: function () {
      var P = D.person, L = P.links;
      var links = G.contactItems("en").map(function (c) { return extLink(c.href, c.label.replace("RedNote (小红书)", "RedNote")); }).join("");
      return '<div class="p-hero"><button type="button" class="booth" data-booth="0" aria-label="Photo booth. Show another portrait of Hanjing">' +
        '<img src="' + esc((P.portraits || [P.photo])[0]) + '" alt="Hanjing Shi" width="120" height="150"><span class="booth-hint">click me</span></button>' +
        '<div><h2 id="panel-title" tabindex="-1">' + esc(P.name) + '</h2><p class="p-role">' + esc(P.role) + "</p></div></div>" +
        '<p class="p-lede">' + esc(pick(SITE_LANG, P.tagline)) + "</p>" +
        P.bio[SITE_LANG === "zh" ? "zh" : "en"].map(function (b) { return "<p>" + esc(b) + "</p>"; }).join("") +
        '<div class="p-links p-links-row">' + links + "</div>" +
        '<h3 id="news">' + (SITE_LANG === "zh" ? "最近动态" : "News") + '</h3><ul class="p-news">' +
        D.news.map(function (n) {
          return '<li><span class="p-date">' + esc(n.date) + "</span><span>" + esc(pick(SITE_LANG, n)) +
            (n.paper ? ' <button type="button" class="link-btn" data-openpaper="' + n.paper + '">' + (SITE_LANG === "zh" ? "查看" : "view") + "</button>" : "") + "</span></li>";
        }).join("") + "</ul>";
    },

    research: function () {
      var c = { all: G.pubs.length, proceedings: 0, workshop: 0, poster: 0, preprint: 0 };
      G.pubs.forEach(function (p) { c[p.type]++; });
      var filters = [["all", "All"], ["proceedings", "Proceedings"], ["workshop", "Workshops"], ["poster", "Posters"], ["preprint", "Preprints"]]
        .map(function (f) { return '<button type="button" class="filter" data-filter="' + f[0] + '" aria-pressed="' + (f[0] === "all") + '">' + f[1] + " <span>" + c[f[0]] + "</span></button>"; }).join("");
      var talks = D.videos.length ? '<section class="p-talks"><h3>Talks & videos</h3><ul>' + D.videos.map(function (v) {
        var p = G.pubById[v.paper];
        return '<li><button type="button" class="link-btn" data-video="' + esc(v.paper) + '">▶ ' + esc(v.title || (p && p.title) || "Video") + "</button></li>";
      }).join("") + "</ul></section>" : "";
      return '<h2 id="panel-title" tabindex="-1">' + (SITE_LANG === "zh" ? "研究" : "Research") + "</h2>" +
        '<p class="p-lede">' + (SITE_LANG === "zh"
          ? "五条研究线索。每本书都是一篇论文，点开看摘要，或者让迷你 Hanjing 讲给你听。"
          : "Five threads of work. Every book in the library is a paper. Open one for a summary, or ask Mini-Hanjing about it.") + "</p>" +
        '<div class="p-filters" role="group" aria-label="Filter by type">' + filters + "</div>" + talks + nowWorking() +
        D.themes.map(function (t) {
          var list = G.pubs.filter(function (p) { return p.theme === t.id; });
          return '<section class="p-theme" id="theme-' + t.id + '" style="--tc:' + t.color + '"><h3><span class="dot"></span>' + esc(SITE_LANG === "zh" ? t.zhTitle : t.title) + "</h3>" +
            '<p class="p-muted">' + esc(pick(SITE_LANG, t.blurb)) + '</p><ul class="p-papers">' + list.map(paperItem).join("") + "</ul></section>";
        }).join("") +
        '<p class="p-muted p-foot">Full list also on ' + extLink(D.person.links.scholar, "Google Scholar") + ".</p>";
    },

    education: function () {
      return '<h2 id="panel-title" tabindex="-1">' + (SITE_LANG === "zh" ? "求学之路" : "Education") + "</h2>" +
        '<ol class="p-timeline">' + D.education.map(function (e) {
          return '<li id="education-' + e.id + '"><h3>' + esc(e.degree) + "</h3><p>" + esc(e.school) + (e.years ? " · " + esc(e.years) : "") + "</p>" +
            (e.note ? '<p class="p-muted">' + advisorNote(e.note) + "</p>" : "") +
            (e.honors || []).map(function (h) { return '<p class="p-honor">🏅 ' + esc(pick(SITE_LANG, h)) + "</p>"; }).join("") +
            (e.alongside && e.alongside.length ? '<p class="p-along">' + (SITE_LANG === "zh" ? "期间经历" : "Along the way") + '</p><ul class="p-exp">' + e.alongside.map(function (x) {
              return "<li><b>" + esc(x.role) + "</b> · " + esc(x.org) + ' <span class="p-when">' + esc(x.when) + "</span><br>" + esc(pick(SITE_LANG, x)) + "</li>";
            }).join("") + "</ul>" : "") + "</li>";
        }).join("") + "</ol>" +
        '<h3>' + (SITE_LANG === "zh" ? "研究兴趣" : "Research interests") + '</h3><ul class="p-tags">' +
        D.person.interests.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul>";
    },

    writing: function () {
      var rn = D.person.links.rednote;
      return '<h2 id="panel-title" tabindex="-1">Writing</h2>' +
        '<nav class="writing-index" aria-label="Writing sections"><button type="button" class="link-btn" data-writing-section="writing-tutorials">Tutorials</button><span aria-hidden="true"> / </span><button type="button" class="link-btn" data-writing-section="writing-blogs">Blogs</button></nav>' +
        '<section id="writing-tutorials"><h3>Tutorials</h3><p class="p-muted">Beginner tutorials and cheat sheets I wrote. The tutorials themselves are written in Chinese.</p>' +
        '<ul class="p-cards">' + D.tutorials.map(function (t) {
          return '<li class="p-card" id="tut-' + t.id + '"><span class="p-card-tag">' + esc(t.label) + "</span><h3>" + extLink(t.href, t.title) + "</h3><p>" + esc(t.desc.en) + "</p>" +
            (t.pdf ? '<p class="p-links">' + extLink(t.pdf, "PDF version") + "</p>" : "") + "</li>";
        }).join("") + "</ul></section>" +
        '<section id="writing-blogs"><h3>Blogs</h3>' +
        (rn ? '<p class="p-muted">On ' + extLink(rn, "RedNote") + ', I share everyday experiences and reflections.</p>' : "") +
        '<ul class="p-cards">' + D.writing.map(function (w) {
          return '<li class="p-card" id="post-' + w.id + '"><span class="p-card-tag">in Chinese</span><h3>' + extLink(w.href, w.title) + "</h3><p>" + esc(w.desc.en) + "</p></li>";
        }).join("") + "</ul></section>";
    },

    life: function () {
      var L = lifeById();
      var tilts = [-3, 2, -1.5, 3, -2.5, 1.5];
      var cards = D.cats.map(function (c, i) {
        var src = c.photos && c.photos[0];
        var art = src ? '<img src="' + esc(thumbOf(src)) + '" alt="' + esc(c.name) + '" loading="lazy">' : ART.mysteryCat();
        return '<li class="cat-card" style="--r:' + tilts[i % tilts.length] + 'deg"><button type="button" class="cat-open" data-cat="' + i + '">' +
          '<span class="cat-photo' + (src ? "" : " is-art") + '">' + art + (c.id === "jinbingbing" ? '<span class="cat-badge" aria-hidden="true">' + ART.cat("b" + i) + "</span>" : "") + "</span>" +
          '<span class="cat-name">' + esc(c.name) + '</span><span class="cat-about">' + esc(c.arrival || "") + "</span></button></li>";
      }).join("");
      var t = L.travel, catStory = pick(SITE_LANG, L.cats).split("\n\n");
      var journey = '<ol class="life-journey" id="life-journey">' + t.journey.map(function (stop, i) {
        return '<li' + (i === t.journey.length - 1 ? ' class="journey-now"' : '') + '><p class="journey-chapter">' + esc(stop.chapter) + '</p><h4>' + esc(stop.place) + '</h4><p>' + esc(pick(SITE_LANG, stop)) + '</p></li>';
      }).join("") + '</ol>';
      return '<h2 id="panel-title" tabindex="-1">Life</h2>' +
        '<p class="p-lede">Off the clock! Click around.</p>' +
        '<section class="life-sec" id="life-cats"><h3>My six cats</h3><p>' + esc(catStory[0]) + "</p>" +
          '<ol class="cat-line" aria-label="Cats in the order they joined the family">' + cards + '</ol>' +
          catStory.slice(1).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join("") + '</section>' +
        '<section class="life-sec" id="life-travel"><h3>A few places I’ve called home</h3>' + journey + '<h3>Two cross-country drives</h3><p>' + esc(pick(SITE_LANG, t)) + "</p>" +
          '<div class="roadtrip"><p class="rt-heading">A coast-to-coast journal</p>' + ART.usMap() +
          '<ol class="rt-legend"><li><span class="rt-year rt-north">2021</span><span><b>San Francisco → Washington, DC</b><small>Northern route · via Chicago</small></span></li><li><span class="rt-year rt-south">2025</span><span><b>Washington, DC → San Francisco</b><small>Southern route · through Texas</small></span></li></ol>' +
          '<p class="rt-note">Two crossings, four years apart. Routes shown schematically.</p>' +
          '<div class="rt-stats"><div><b>' + t.stats.states + '</b><span>states visited overall</span></div><div><b>' + t.stats.trips + '</b><span>cross-country drives</span></div><div><b>2</b><span>coasts called home</span></div></div>' +
          '<div class="rt-controls"><button type="button" class="link-btn" id="rt-play">▶ Play the road trips</button><span class="rt-status" id="rt-status" role="status"></span></div></div></section>' +
        '<section class="life-sec" id="life-food"><h3>Food</h3><p>' + esc(pick(SITE_LANG, L.food)) + "</p>" +
          '<div class="food">' + ART.foodWheel(D.dishes) +
          '<div class="food-side"><button type="button" class="btn btn-primary btn-spin" id="spin">What should we try? Spin!</button>' +
          '<p class="food-result" id="food-result" aria-live="polite"></p>' +
          (D.foodSocial ? '<p class="p-links">' + extLink(D.foodSocial, "My restaurant finds →") + "</p>" : "") + "</div></div></section>" +
        '<section class="life-sec" id="life-blogging"><h3>Writing</h3><p>' + esc(pick(SITE_LANG, L.blogging)) +
          ' <button type="button" class="link-btn" data-goto="writing">Visit my writing desk →</button></p></section>';
    },

    talks: function () {
      var tilts = [-2.5, 2, -1.5, 3, -2, 1.5, -3, 2.5, -1];
      return '<h2 id="panel-title" tabindex="-1">Talks &amp; Posters</h2>' +
        '<p class="p-lede">Take a seat and pick a talk. The lights will dim.</p>' +
        '<h3>On stage</h3><ul class="talk-list">' + D.videos.map(function (v, i) {
          return '<li><button type="button" class="talk-card" data-talkopen="' + i + '"><span class="talk-thumb"><img src="' + esc(v.thumb) + '" alt="" loading="lazy"><span class="talk-play" aria-hidden="true">▶</span></span>' +
            '<span class="talk-venue">' + esc(v.venue) + '</span><span class="talk-title">' + esc(v.title) + "</span></button></li>";
        }).join("") + "</ul>" +
        '<h3 id="posters">Posters &amp; slides</h3><ul class="poster-grid">' + D.posters.map(function (p, i) {
          return '<li><button type="button" class="poster-card" data-posterimg="' + i + '"><img src="' + esc(p.thumb) + '" alt="" loading="lazy">' +
            '<span class="poster-venue">' + esc(p.venue) + '</span><span class="poster-title">' + esc(G.pubById[p.paper].title) + "</span></button></li>";
        }).join("") + "</ul>" +
        '<h3 id="photos">From the conference floor</h3><p class="p-muted">CSSSA 2025 · ICWSM 2026 · AIED 2026</p><ul class="photo-wall">' + D.conferencePhotos.map(function (ph, i) {
          return '<li style="--r:' + tilts[i % tilts.length] + 'deg"><button type="button" class="photo-card" data-photo="' + i + '"><img src="' + esc(thumbOf(ph.src)) + '" alt="' + esc(ph.caption) + '" loading="lazy"></button></li>';
        }).join("") + "</ul>";
    },

    contact: function () {
      var L = D.person.links;
      return '<h2 id="panel-title" tabindex="-1">' + (SITE_LANG === "zh" ? "联系" : "Contact") + "</h2>" +
        '<p class="p-lede">' + (SITE_LANG === "zh" ? "欢迎来聊研究或合作。" : "Happy to talk research and collaboration.") + "</p>" +
        '<ul class="p-contact">' + G.contactItems(SITE_LANG).map(function (c) { return "<li>" + extLink(c.href, c.label.replace("RedNote (小红书)", "RedNote")) + "</li>"; }).join("") + "</ul>" +
        (L.email ? "" : '<p class="p-muted">' + (SITE_LANG === "zh" ? "邮箱即将补充。" : "Email coming soon.") + "</p>") +
        '<p class="p-muted">' + (SITE_LANG === "zh" ? "想看不带动画的版本？" : "Prefer a plain page?") + ' <a href="basic.html" data-view="basic">' + (SITE_LANG === "zh" ? "基本版" : "Basic version") + "</a></p>";
    }
  };

  var lastFocus = null;
  function openPanel(id, focus, fromChat) {
    if (!butterflyEl.hidden) dismissButterfly(true);
    var fresh = state.panel !== id;
    if (fresh) {
      stopRoadTrip();
      panelBody.innerHTML = RENDER[id]();
      panel.setAttribute("aria-label", byId[id].label);
      panelBody.scrollTop = 0;
    }
    if (!state.panel) lastFocus = document.activeElement;
    state.panel = id;
    panel.hidden = false;
    requestAnimationFrame(function () { requestAnimationFrame(function () { panel.classList.add("open"); }); });
    document.body.classList.add("panel-open");
    // Opening a place from the world tucks the chat away so the scene stays visible;
    // opening it from a chat answer keeps the conversation open.
    if (state.mobile || !fromChat) expandGuide(false);
    if (state.mobile) layout();
    showHud();
    if (focus) setTimeout(function () { focusPanel(focus); }, fresh ? 60 : 0);
    else if (fresh) { var h = $("#panel-title"); if (h) h.focus({ preventScroll: true }); }
    start();
  }

  function closePanel() {
    if (!state.panel) return;
    stopRoadTrip();
    state.panel = null;
    panel.classList.remove("open");
    document.body.classList.remove("panel-open");
    setTimeout(function () { if (!state.panel) panel.hidden = true; }, 260);
    // Keep the place she's standing at in frame (phones can't show a whole place around her).
    state.focusX = state.near && !state.trip ? state.near.x : null;
    if (state.mobile) layout();
    if (!state.mobile && !state.guideMin) expandGuide(true);
    showHud(); start();
    if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  function focusPanel(f) {
    var target = null;
    if (f.paper) {
      applyFilter("all");
      target = document.getElementById("paper-" + f.paper);
      if (target) { var d = target.querySelector("details"); if (d) d.open = true; }
    } else if (f.theme) target = document.getElementById("theme-" + f.theme);
    else if (f.filter) { applyFilter(f.filter); target = $(".p-filters"); }
    else if (f.tutorial) target = document.getElementById("tut-" + f.tutorial);
    else if (f.post) target = document.getElementById("post-" + f.post);
    else if (f.education) target = document.getElementById("education-" + f.education);
    else if (f.section) target = document.getElementById(f.section);
    else if (f.life) target = document.getElementById("life-" + f.life);
    else if (f.news) target = document.getElementById("news");
    else if (f.posters) target = document.getElementById("posters");
    else if (f.photos) target = document.getElementById("photos");
    else if (f.project) target = document.getElementById("project-" + f.project);
    else if (f.projects) target = document.getElementById("now");
    if (target) {
      target.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
      flash(target, "flash", 1600);
    }
    if (f.life === "travel") playRoadTrip();
  }

  // ---------- Life widgets ----------
  function lifeById() {
    var m = {};
    D.life.forEach(function (l) { m[l.id] = l; });
    return m;
  }

  var roadRaf = 0;
  function stopRoadTrip() {
    cancelAnimationFrame(roadRaf); roadRaf = 0;
    var svg = $(".roadmap", panelBody);
    if (!svg) return;
    $$(".us-route", svg).forEach(function (path) { path.style.strokeDashoffset = 0; });
    $(".us-car", svg).setAttribute("visibility", "hidden");
    $("#rt-play").disabled = false;
    $("#rt-status").textContent = "";
  }
  function playRoadTrip() {
    var svg = $(".roadmap", panelBody);
    if (!svg || state.panel !== "life" || roadRaf) return;
    var routes = $$(".us-route", svg), car = $(".us-car", svg), status = $("#rt-status"), play = $("#rt-play");
    var dur = reduced ? 0 : 8000, t0 = null, current = -1;
    play.disabled = true;
    car.setAttribute("visibility", reduced ? "hidden" : "visible");
    function frame(now) {
      if (state.panel !== "life" || !svg.isConnected) { roadRaf = 0; return; }
      if (t0 === null) t0 = now;
      var p = dur ? Math.min(1, (now - t0) / dur) : 1;
      var li = p >= 1 ? 1 : Math.floor(p * 2), lp = p >= 1 ? 1 : p * 2 - li;
      routes[0].style.strokeDashoffset = 1000 * (1 - (li > 0 ? 1 : lp));
      routes[1].style.strokeDashoffset = 1000 * (1 - (li > 0 ? lp : 0));
      if (li !== current) { status.textContent = li ? "2025 · DC → SF, through Texas" : "2021 · SF → DC, via Chicago"; current = li; }
      var path = routes[li], len = path.getTotalLength();
      var a = path.getPointAtLength(len * lp), b = path.getPointAtLength(Math.min(len, len * lp + 2));
      car.setAttribute("transform", "translate(" + a.x.toFixed(1) + " " + a.y.toFixed(1) + ")" + (b.x < a.x ? " scale(-1 1)" : ""));
      if (p < 1) roadRaf = requestAnimationFrame(frame);
      else { roadRaf = 0; play.disabled = false; car.setAttribute("visibility", "hidden"); status.textContent = "2021 → 2025 · Two crossings, one loop."; }
    }
    roadRaf = requestAnimationFrame(frame);
  }

  var wheelRot = 0;
  function spinWheel() {
    var g = $(".wheel-spin", panelBody), out = $("#food-result");
    if (!g) return;
    var n = D.dishes.length, idx = Math.floor(Math.random() * n), step = 360 / n;
    var delta = ((-idx * step - wheelRot) % 360 + 720) % 360;
    wheelRot += 360 * (4 + Math.floor(Math.random() * 3)) + delta;
    g.style.transform = "rotate(" + wheelRot + "deg)";
    out.textContent = "";
    setTimeout(function () {
      var dish = D.dishes[idx];
      out.textContent = "Tonight it's " + dish + "! I never say no to good food, so let's try it.";
      bubble(charEl, "Let's go get " + dish.toLowerCase() + "!", 2400);
    }, reduced ? 0 : 3300);
  }

  function hearts(host, from, to) {
    from = from == null ? 30 : from; to = to == null ? 70 : to;
    for (var i = 0; i < 5; i++) {
      var h = document.createElement("span");
      h.className = "heart";
      h.textContent = "♥";
      h.style.left = (from + Math.random() * (to - from)) + "%";
      h.style.animationDelay = (i * 0.08) + "s";
      host.appendChild(h);
      setTimeout(function (el) { el.remove(); }.bind(null, h), 1400);
    }
  }

  function sparkles(host) {
    for (var i = 0; i < 8; i++) {
      var sp = document.createElement("span");
      sp.className = "sparkle";
      sp.textContent = i % 3 ? "✦" : "✧";
      sp.style.left = (10 + Math.random() * 80) + "%";
      sp.style.bottom = (105 + Math.random() * 70) + "%";
      sp.style.animationDelay = (i * 0.05) + "s";
      host.appendChild(sp);
      setTimeout(function (el) { el.remove(); }.bind(null, sp), 1400);
    }
  }

  // ---------- red circles: stand on one and she does something there ----------
  var acting = null, actTimers = [];
  function later(fn, ms) { actTimers.push(setTimeout(fn, reduced ? Math.min(ms, 40) : ms)); }
  function stEl(id) { return $(".st-" + id, groundEl); }
  function sayIfQuiet(line, ms) {
    if (!$("#char-bubble").classList.contains("show")) bubble(charEl, pick(state.lang, line), ms || 2000);
  }
  // The book on the shelves nearest her raised hand (top shelf first).
  function nearestBook() {
    var best = null, bd = 1e9, cr = charEl.getBoundingClientRect(), hx = cr.left + cr.width * (state.dir > 0 ? 0.72 : 0.28);
    $$(".st-research .book", groundEl).forEach(function (b) {
      var r = b.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - hx) + Math.max(0, r.top - cr.top) * 0.6;
      if (d < bd) { bd = d; best = b; }
    });
    return best;
  }
  var ACTIONS = {
    home: { face: 1, repeat: true, run: function () {
      flash(charEl, "is-waving", 1400);
      later(function () { flash(charEl, "is-bowing", 900); }, 1400);
      later(function () { sayIfQuiet({ en: "Welcome in!", zh: "欢迎光临！" }); }, 300);
    } },
    research: { face: 1, hands: true, busy: { en: "Shh, I'm reading 📖", zh: "嘘，我在看书 📖" }, run: function () {
      var book = nearestBook();
      charEl.classList.add("act-reach");
      later(function () { if (book) book.classList.add("is-taken"); charEl.classList.add("has-book"); }, 550);
      later(function () { charEl.classList.remove("act-reach"); charEl.classList.add("act-read"); sayIfQuiet({ en: "Ooh, this one…", zh: "嗯，就这本……" }); }, 1150);
    } },
    talks: { face: -1, repeat: true, run: function () {
      charEl.classList.add("act-point");
      later(function () { sayIfQuiet({ en: "Next slide, please!", zh: "下一页！" }); }, 500);
      later(function () { charEl.classList.remove("act-point"); }, 2700);
    } },
    education: { face: 1, hands: true, repeat: true, run: function () {
      charEl.classList.add("has-cap");
      later(function () { charEl.classList.add("act-toss"); }, 250);
      later(function () { flash(charEl, "is-jumping", 800); }, 420);
      later(function () { sparkles(charEl); sayIfQuiet({ en: "Caps off! 🎓", zh: "毕业快乐！🎓" }); }, 1250);
      later(function () { charEl.classList.remove("act-toss", "has-cap"); }, 3300);
    } },
    writing: { busy: { en: "Shh, writing…", zh: "嘘，在写字……" }, run: function () {
      charEl.classList.add("act-write");
    } },
    life: { face: 1, hands: true, busy: { en: "XiaoHei loves this part.", zh: "小黑最喜欢被摸了。" }, run: function () {
      charEl.classList.add("act-pet");
      later(function () { sayIfQuiet({ en: "Who's a sleepy boy? 🐾", zh: "谁是小懒猫呀？🐾" }); }, 900);
      if (!reduced) (function loop() { later(function () { hearts(charEl, 74, 100); loop(); }, 1700); })();
    } },
    contact: { face: 1, hands: true, repeat: true, run: function () {
      var mb = $(".mailbox", stEl("contact"));
      mb.classList.remove("is-mailed");
      charEl.classList.add("has-letter", "act-mail");
      later(function () { charEl.classList.remove("has-letter"); mb.classList.add("is-mailed"); }, 1300);
      later(function () { sayIfQuiet({ en: "Posted! ✉️ Write back anytime.", zh: "寄出去啦！✉️ 随时回信～" }); }, 1500);
      later(function () { charEl.classList.remove("act-mail"); }, 2700);
    } }
  };
  var ACT_CLASSES = ["is-acting", "hands-free", "act-reach", "act-read", "has-book", "act-point", "has-cap", "act-toss",
    "act-type", "act-write", "act-pet", "has-letter", "act-mail", "is-bowing"];

  function startAction(id) {
    var a = ACTIONS[id];
    if (!a) return;
    acting = id;
    if (a.face) { state.dir = a.face; render(); }
    charEl.classList.add("is-acting");
    if (a.hands) charEl.classList.add("hands-free");
    stEl(id).classList.add("is-acting");
    a.run();
  }
  function stopAction() {
    if (!acting) return;
    actTimers.forEach(clearTimeout); actTimers = [];
    ACT_CLASSES.forEach(function (c) { charEl.classList.remove(c); });
    stEl(acting).classList.remove("is-acting");
    $$(".is-taken, .is-mailed", groundEl).forEach(function (el) { el.classList.remove("is-taken", "is-mailed"); });
    acting = null;
  }
  // Clicking her while she's at a circle replays the action (or says what she's busy with).
  function pokeAction() {
    if (!acting) return false;
    var a = ACTIONS[acting];
    if (a.repeat) { var id = acting; stopAction(); startAction(id); }
    else if (a.busy) bubble(charEl, pick(state.lang, a.busy), 1800);
    return true;
  }
  // Called every frame: once she has come to rest on a red circle, start that place's action.
  function checkSpot() {
    var id = null;
    if (!state.title && !state.keys.left && !state.keys.right && Math.abs(state.vel) < 1 && Math.abs(state.target - state.x) < 0.5) {
      for (var i = 0; i < STATIONS.length; i++) if (Math.abs(state.x - STATIONS[i].stand) <= 26) { id = STATIONS[i].id; break; }
    }
    if (id === acting) return;
    stopAction();
    if (id) startAction(id);
  }

  var pokes = 0;
  var kittyPlayTimer = 0;
  var butterflyVisitTimer = 0, butterflyChaseTimer = 0, butterflyLeaveTimer = 0;

  function butterflyReady() {
    if (reduced || document.hidden || state.title || state.panel || state.trip ||
        document.documentElement.getAttribute("data-theme") === "dark" ||
        document.body.classList.contains("theater-open") || !$("#video-modal").hidden ||
        Math.abs(state.vel) > 1 || Math.abs(state.target - state.x) > .5 || Math.abs(state.catVel) > 1 ||
        catEl.classList.contains("is-walking") || catEl.classList.contains("is-tail-playing") || catEl.classList.contains("is-pouncing")) return false;
    var box = catEl.getBoundingClientRect(), scene = worldEl.getBoundingClientRect();
    return box.left > scene.left + 24 && box.right < scene.right - 24 && box.top > scene.top + 44;
  }

  function scheduleButterfly(delay) {
    clearTimeout(butterflyVisitTimer);
    if (reduced || document.hidden || state.title || document.documentElement.getAttribute("data-theme") === "dark") return;
    butterflyVisitTimer = setTimeout(function () {
      if (!butterflyReady()) { scheduleButterfly(8000 + Math.random() * 6000); return; }
      var screenX = (state.catX - state.cam) * state.s;
      if (screenX < 110) state.catDir = 1;
      else if (screenX > state.cw - 110) state.catDir = -1;
      render();
      butterflyEl.style.left = "calc(var(--s) * " + (state.catX + state.catDir * 47).toFixed(1) + "px - 22px)";
      butterflyEl.style.setProperty("--butterfly-facing", state.catDir);
      butterflyEl.classList.remove("is-escaping");
      butterflyEl.hidden = false;
      butterflyChaseTimer = setTimeout(chaseButterfly, 2100);
      butterflyLeaveTimer = setTimeout(function () { dismissButterfly(true); }, 7600);
    }, delay == null ? 18000 + Math.random() * 12000 : delay);
  }

  function dismissButterfly(again) {
    clearTimeout(butterflyVisitTimer); clearTimeout(butterflyChaseTimer); clearTimeout(butterflyLeaveTimer);
    if (butterflyEl) {
      if (document.activeElement === butterflyEl) (!state.mobile && state.near ? $('.nav-btn[data-go="' + state.near.id + '"]') : fab).focus({ preventScroll: true });
      butterflyEl.hidden = true;
      butterflyEl.classList.remove("is-escaping");
    }
    if (catEl && catEl.classList.contains("is-pouncing")) {
      clearTimeout(kittyPlayTimer); catEl.classList.remove("is-pouncing");
    }
    if (again) scheduleButterfly(45000 + Math.random() * 30000);
  }

  function chaseButterfly() {
    if (butterflyEl.hidden || catEl.classList.contains("is-pouncing")) return;
    if (!butterflyReady()) { dismissButterfly(true); return; }
    clearTimeout(butterflyChaseTimer); clearTimeout(butterflyLeaveTimer);
    poseCatLegs(false);
    kittyPlay("butterfly");
    butterflyEl.classList.add("is-escaping");
    butterflyLeaveTimer = setTimeout(function () { dismissButterfly(true); }, 2800);
  }

  function groomXiaoHei() {
    var sleeper = $(".sleep-cat", groundEl);
    flash(sleeper.closest(".nap"), "is-touched", 1700);
    clearTimeout(sleeper._groomTimer);
    sleeper.classList.remove("is-grooming"); void sleeper.getBoundingClientRect();
    sleeper.classList.add("is-grooming");
    sleeper._groomTimer = setTimeout(function () { sleeper.classList.remove("is-grooming"); }, reduced ? 1400 : 3700);
    bubble(charEl, state.lang === "zh" ? "小黑是家里的大哥哥，也是大黄的双胞胎兄弟。" : "XiaoHei, our oldest brother — DaHuang's twin!", 3600);
  }
  function kittyPlay(kind) {
    if (kind === "tail" && !butterflyEl.hidden) dismissButterfly(true);
    clearTimeout(kittyPlayTimer);
    catEl.classList.remove("is-pouncing", "is-tail-playing");
    if (reduced || catEl.classList.contains("is-walking")) { kittyPoke(); return; }
    void catEl.offsetWidth;
    var cls = kind === "butterfly" ? "is-pouncing" : "is-tail-playing";
    catEl.classList.add(cls);
    kittyPlayTimer = setTimeout(function () { catEl.classList.remove(cls); }, kind === "butterfly" ? 1700 : 2200);
    bubble(catEl, kind === "butterfly" ? "Mrrp… almost! 🦋" : "Caught my own tail!", 2000);
  }
  function kittyPoke() {
    var lines = ["Mrrp! ♥", "I'm JinBingBing, the youngest of six!", "Purrrr…", "Follow us!"];
    bubble(catEl, lines[pokes++ % lines.length], 1800);
    flash(catEl, "is-happy", 1200);
    hearts(catEl);
    if (pokes % 3 === 0 && !reduced && !catEl.classList.contains("is-walking")) kittyPlay("tail");
  }

  function thumbOf(src) { return String(src).replace(/\/([^\/]+)$/, "/thumbs/$1"); }

  // A small lightbox for cat photos, conference photos and posters.
  var gal = { kind: "", items: [], i: 0 };
  function catItems() {
    var out = [];
    D.cats.forEach(function (c, ci) {
      (c.photos || []).forEach(function (src) {
        out.push({ cat: ci, src: src, alt: c.name, title: c.name, caption: esc(c.note || "") + '<span class="gal-meta">' + esc(c.about || "") + '</span>' });
      });
    });
    return out;
  }
  function openGallery(kind, items, i) { gal.kind = kind; gal.items = items; showGal(i); }
  function showGal(i) {
    var n = gal.items.length;
    if (!n) return;
    gal.i = (i + n) % n;
    var it = gal.items[gal.i];
    openModal(it.title,
      '<div class="gal-box"><img src="' + esc(it.src) + '" alt="' + esc(it.alt || it.title) + '">' +
      '<p class="gal-cap">' + it.caption + "</p>" + (it.extra || "") +
      '<div class="gal-actions"><button type="button" class="link-btn" data-galnav="-1" aria-label="Previous">←</button>' +
      (gal.kind === "cats" ? '<button type="button" class="btn btn-primary pet-btn" data-pet="1">Pet ♥</button>' : "") +
      '<button type="button" class="link-btn" data-galnav="1" aria-label="Next">→</button></div>' +
      '<p class="gal-count">' + (gal.i + 1) + " / " + n + "</p></div>");
  }
  function openCat(ci) {
    var items = catItems(), start = 0;
    for (var k = 0; k < items.length; k++) if (items[k].cat === ci) { start = k; break; }
    openGallery("cats", items, start);
  }
  function openPhotos(i) {
    openGallery("photos", D.conferencePhotos.map(function (p) {
      return { src: p.src, title: "From the conference floor", caption: esc(p.caption), alt: p.caption };
    }), i);
  }
  function openPoster(i) {
    openGallery("posters", D.posters.map(function (p) {
      var pub = G.pubById[p.paper];
      return { src: p.image, title: p.venue, alt: pub.title, caption: "<b>" + esc(pub.title) + "</b>",
        extra: '<p class="p-links" style="justify-content:center">' + (p.file ? extLink(p.file, "Open the PDF") : "") +
          '<button type="button" class="link-btn" data-askpaper="' + esc(p.paper) + '">Ask Mini-Hanjing about it</button></p>' };
    }), i);
  }

  // ---------- the lecture hall (talk videos) ----------
  var theater = null, talkIdx = 0;
  function driveSrc(id) { return "https://drive.google.com/file/d/" + encodeURIComponent(id) + "/preview"; }
  function buildTheater() {
    var heads = "", r = ART.rng(77);
    for (var x = 10; x < 1000; x += 58 + r() * 26) {
      var s = 0.8 + r() * 0.45, hy = 70 + r() * 14;
      heads += '<g transform="translate(' + x.toFixed(0) + " " + hy.toFixed(0) + ") scale(" + s.toFixed(2) + ')">' + ART.audienceFigure(Math.round(x), true) + '</g>';
    }
    theater = document.createElement("div");
    theater.className = "theater";
    theater.id = "theater";
    theater.hidden = true;
    theater.setAttribute("role", "dialog");
    theater.setAttribute("aria-modal", "true");
    theater.setAttribute("aria-labelledby", "th-title");
    theater.innerHTML =
      '<div class="th-hall">' +
        '<div class="th-top"><p class="th-marquee"><span class="th-dot" aria-hidden="true"></span>Now presenting · Hanjing Shi</p>' +
          '<button type="button" class="icon-btn th-close" aria-label="Leave the lecture hall"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
        '<h2 id="th-title"></h2><p class="th-venue" id="th-venue"></p>' +
        '<div class="th-stage"><div class="th-screen" id="th-screen"></div>' +
          '<div class="th-speaker face-left" aria-hidden="true"><div class="th-avatar hj-char">' + ART.character("th") + '</div>' +
          '<svg class="th-podium" viewBox="0 0 80 96"><path d="M8 96L12 22H68L72 96Z"/><path d="M2 22L8 10H72L78 22Z"/><rect x="30" y="46" width="20" height="14" rx="2"/><path d="M34 10Q30 -6 18 -10" fill="none" stroke-width="3"/></svg></div></div>' +
        '<svg class="th-audience" viewBox="0 0 1000 140" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' + heads + "</svg>" +
        '<nav class="th-program" aria-label="Program"><p class="th-program-h">Program</p>' +
          D.videos.map(function (v, i) {
            return '<button type="button" class="th-item" data-talk="' + i + '"><span class="th-item-venue">' + esc(v.venue) + "</span>" + esc(v.title) + "</button>";
          }).join("") + "</nav>" +
      "</div>";
    document.body.appendChild(theater);
    theater.addEventListener("click", function (e) {
      if (e.target.closest(".th-close")) { closeTheater(); return; }
      var b = e.target.closest("[data-talk]");
      if (b) { showTalk(+b.dataset.talk); return; }
      if (e.target.closest(".th-start")) startTalk();
    });
  }
  function openTheater(i) {
    if (!D.videos.length) return;
    if (!theater) buildTheater();
    if (theater.hidden) lastFocus = document.activeElement;
    theater.hidden = false;
    document.body.classList.add("theater-open");
    showTalk(i || 0);
    $(".th-close", theater).focus();
  }
  function showTalk(i) {
    var n = D.videos.length;
    talkIdx = (i + n) % n;
    var v = D.videos[talkIdx];
    theater.classList.remove("is-playing");
    $(".th-avatar", theater).classList.remove("is-talking");
    $("#th-title").textContent = v.title;
    $("#th-venue").textContent = v.venue;
    $("#th-screen").innerHTML = '<img src="' + esc(v.thumb) + '" alt="">' +
      '<button type="button" class="th-start"><span aria-hidden="true">▶</span> Start the talk</button>';
    $$(".th-item", theater).forEach(function (b) { b.setAttribute("aria-current", +b.dataset.talk === talkIdx ? "true" : "false"); });
  }
  function startTalk() {
    var v = D.videos[talkIdx];
    theater.classList.add("is-playing");                 // house lights down
    $(".th-avatar", theater).classList.add("is-talking");
    var html = v.drive ? '<iframe src="' + driveSrc(v.drive) + '" title="' + esc(v.title) + '" allow="autoplay; fullscreen" allowfullscreen></iframe>'
      : v.file ? '<video controls autoplay playsinline src="' + esc(v.file) + '"></video>'
      : v.youtube ? '<iframe src="https://www.youtube-nocookie.com/embed/' + esc(ytId(v.youtube)) + '?autoplay=1" title="' + esc(v.title) + '" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>' : "";
    $("#th-screen").innerHTML = html;
  }
  function closeTheater() {
    if (!theater || theater.hidden) return;
    $("#th-screen").innerHTML = "";
    theater.hidden = true;
    document.body.classList.remove("theater-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function applyFilter(type) {
    $$(".filter", panelBody).forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.filter === type ? "true" : "false"); });
    $$(".p-paper", panelBody).forEach(function (li) { li.hidden = type !== "all" && li.dataset.type !== type; });
    $$(".p-theme", panelBody).forEach(function (sec) { sec.hidden = !$(".p-paper:not([hidden])", sec); });
  }

  // ---------- video modal ----------
  function ytId(u) { var m = /(?:youtu\.be\/|v=|embed\/)([\w-]{11})/.exec(u || ""); return m ? m[1] : u; }
  function openVideo(pid) {
    for (var k = 0; k < D.videos.length; k++) if (D.videos[k].paper === pid) { openTheater(k); return; }
    var v = G.videoFor(pid);
    if (!v) return;
    var p = G.pubById[pid], box = $("#video-body"), html = "";
    if (v.file) html = '<video controls playsinline preload="metadata"' + (v.poster ? ' poster="' + esc(v.poster) + '"' : "") + ' src="' + esc(v.file) + '"></video>';
    else if (v.youtube) html = '<iframe src="https://www.youtube-nocookie.com/embed/' + esc(ytId(v.youtube)) + '" title="' + esc(v.title || p.title) + '" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    else if (v.embed) html = '<iframe class="li-embed" src="' + esc(v.embed) + '" title="' + esc(v.title || p.title) + '" allowfullscreen></iframe>';
    if (v.linkedin) html += '<p class="p-links">' + extLink(v.linkedin, "Watch on LinkedIn") + "</p>";
    openModal(v.title || p.title, html);
  }
  function openModal(title, html) {
    $("#video-title").textContent = title;
    $("#video-body").innerHTML = html;
    var m = $("#video-modal");
    if (m.hidden) lastFocus = document.activeElement;
    m.hidden = false;
    $("#video-close").focus();
  }
  function closeVideo() {
    var m = $("#video-modal");
    if (m.hidden) return;
    $("#video-body").innerHTML = "";
    m.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // ---------- title screen ----------
  function showTitle() {
    state.title = true;
    document.body.classList.add("title-open");
    $("#title").hidden = false;
    setTimeout(function () { $("#enter-btn").focus(); }, 50);
    start();
  }
  function enterWorld() {
    if (!state.title) return;
    state.title = false;
    scheduleButterfly();
    store("hj-entered", "1");
    store("hj-view", "world");
    document.body.classList.remove("title-open");
    var t = $("#title");
    t.classList.add("leaving");
    setTimeout(function () { t.hidden = true; }, reduced ? 0 : 700);
    state.camRate = 1.9;
    state.focusX = byId.home.x;
    start();
    setTimeout(function () {
      flash(charEl, "is-waving", 1500);
      reply(G.greet(state.lang), { noMove: true });
      if (!state.mobile && !state.guideMin) input.focus({ preventScroll: true });
    }, reduced ? 0 : 900);
  }

  // ---------- events ----------
  function worldX(clientX) {
    var r = worldEl.getBoundingClientRect();
    return state.cam + (clientX - r.left) / state.s;
  }

  function overSun(e) {
    var r = $("#sun").getBoundingClientRect(), rad = r.width * 0.46;
    var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    return dx * dx + dy * dy < rad * rad;
  }

  function stirPond(clientX, clientY) {
    var el = $(".lotus-pond"), pondSvg = el.ownerSVGElement, point = pondSvg.createSVGPoint();
    point.x = clientX; point.y = clientY;
    point = point.matrixTransform(pondSvg.getScreenCTM().inverse());
    var ring = $(".pond-ring", el), koi = $(".pond-koi", el);
    var waterY = clamp(point.y, 714, 790);
    ring.setAttribute("cx", point.x); ring.setAttribute("cy", waterY);
    koi.setAttribute("transform", "translate(" + (point.x - 18) + " " + (waterY + 3) + ")");
    clearTimeout(el._stirTimer);
    el.classList.remove("is-stirred"); void el.getBoundingClientRect();
    el.classList.add("is-stirred");
    el._stirTimer = setTimeout(function () { el.classList.remove("is-stirred"); }, 2600);
  }

  function onWorldClick(e) {
    if (state.dragged) { state.dragged = false; return; }
    if (state.title) return;
    var t = e.target;
    var el;
    if (t.closest("#sun")) return;   // handled by the sun's own listener
    // A station's invisible hit area can reach up over the sun; let the sun win there.
    if (t.classList && t.classList.contains("hit") && overSun(e)) { toggleTheme(); return; }
    if (t.closest("#char")) { if (pokeAction()) return; flash(charEl, "is-waving", 1500); bubble(charEl, POKES[state.lang][Math.floor(Math.random() * POKES[state.lang].length)], 2400); return; }
    if (t.closest(".cat-butterfly")) { chaseButterfly(); return; }
    if (t.closest("#cat")) { doAction("meow"); return; }
    if ((el = t.closest(".lotus-pond"))) {
      stirPond(e.clientX, e.clientY); return;
    }
    if (t.closest(".inkstone")) {
      goTo("writing", { quiet: true }); doAction("ink");
      bubble(charEl, window.HJRituals.answer(state.lang === "zh" ? "磨墨" : "Grind some ink", state.lang).text, 3400); return;
    }
    if ((el = t.closest("[data-screen-plant]"))) {
      var plant = el.dataset.screenPlant, painting = $('.screen-painting[data-screen-plant="' + plant + '"]');
      flash(painting, "is-stirred", 1500);
      bubble(charEl, pick(state.lang, window.HJRituals.screenNotes[plant]), 3000); return;
    }
    if (t.closest(".sleep-cat, #xiaohei-control")) { groomXiaoHei(); return; }
    if ((el = t.closest("[data-school]"))) { goTo("education", { focus: { education: el.dataset.school } }); return; }
    if ((el = t.closest(".book"))) { var id = el.dataset.paper; goTo("research", { focus: { paper: id }, quiet: true }); ask("paper:" + id, state.lang === "zh" ? "讲讲这本《" + G.pubById[id].title + "》" : "Tell me about " + G.pubById[id].title, true); return; }
    if ((el = t.closest("[data-tutorial]"))) {
      var scroll = $('.tutorial-scroll[data-tutorial="' + el.dataset.tutorial + '"]');
      flash(scroll, "is-unrolling", 1500);
      goTo("writing", { focus: { tutorial: el.dataset.tutorial } }); return;
    }
    if ((el = t.closest("[data-ornament]"))) {
      var ornament = $('.paper-ornament[data-ornament="' + el.dataset.ornament + '"]');
      clearTimeout(ornament._flutterTimer); ornament.classList.remove("is-fluttering"); void ornament.getBoundingClientRect();
      ornament.classList.add("is-fluttering");
      ornament._flutterTimer = setTimeout(function () { ornament.classList.remove("is-fluttering"); }, reduced ? 150 : 2400);
      var isStar = ornament.classList.contains("paper-star");
      bubble(charEl, state.lang === "zh" ? (isStar ? "星星也来陪我写字啦～" : "纸鹤也伸个懒腰～想法慢慢写，别着急。") : (isStar ? "Tiny paper stars, keeping the ideas company." : "A little stretch for the paper crane. One thought at a time."), 3200); return;
    }
    if ((el = t.closest(".life-item"))) {
      var lid = el.dataset.life;
      goTo("life", { focus: { life: lid }, quiet: true });
      var item = D.life.filter(function (l) { return l.id === lid; })[0];
      reply({ text: pick(state.lang, item), html: "", chips: STATION_CHIPS.life[state.lang] }, { noMove: true, once: true });
      if (el.classList.contains("stove")) doAction("simmer");
      if (el.classList.contains("cinema")) doAction("projector");
      if (lid === "cats") doAction("meow");
      return;
    }
    if ((el = t.closest(".board"))) { goTo("home", { focus: { news: true } }); return; }
    if ((el = t.closest(".screen-talk"))) { goTo("talks"); openTheater(0); return; }
    if ((el = t.closest(".easel"))) {
      goTo("talks", { focus: { posters: true } });
      for (var pi = 0; pi < D.posters.length; pi++) if (D.posters[pi].paper === el.dataset.poster) { openPoster(pi); break; }
      return;
    }
    if ((el = t.closest(".st"))) { goTo(el.dataset.station); return; }
    walkTo(worldX(e.clientX));
  }

  function bindWorld() {
    worldEl.addEventListener("click", onWorldClick);

    var down = null;
    worldEl.addEventListener("pointerdown", function (e) {
      if (state.title || e.button > 0) return;
      down = { x: e.clientX, char: state.x, id: e.pointerId };
      state.dragged = false;
    });
    worldEl.addEventListener("pointermove", function (e) {
      if (!down || e.pointerId !== down.id) return;
      var dx = e.clientX - down.x;
      if (!state.dragged && Math.abs(dx) > 8) state.dragged = true;
      if (state.dragged) {
        state.target = clamp(down.char - dx / state.s * 1.6, 90, W - 90);
        state.vmax = 1400; state.focusX = null; state.trip = null;
        start();
      }
    });
    function up() { down = null; }
    worldEl.addEventListener("pointerup", up);
    worldEl.addEventListener("pointercancel", up);

    worldEl.addEventListener("wheel", function (e) {
      if (state.title) return;
      var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!d) return;
      e.preventDefault();
      state.target = clamp(state.target + d * 1.3 / state.s, 90, W - 90);
      state.vmax = 900; state.focusX = null; state.trip = null;
      start();
    }, { passive: false });

    $("#sun").addEventListener("click", toggleTheme);
  }

  function isTypingTarget(el) {
    return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
  }

  function bindKeys() {
    document.addEventListener("keydown", function (e) {
      if (theater && !theater.hidden) {
        if (e.key === "Escape") closeTheater();
        else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !theater.classList.contains("is-playing")) showTalk(talkIdx + (e.key === "ArrowLeft" ? -1 : 1));
        return;
      }
      if (!$("#video-modal").hidden) {
        if (e.key === "Escape") closeVideo();
        else if ($(".gal-box") && (e.key === "ArrowLeft" || e.key === "ArrowRight")) showGal(gal.i + (e.key === "ArrowLeft" ? -1 : 1));
        return;
      }
      if (state.title) { if (e.key === "Enter" && document.activeElement === document.body) enterWorld(); return; }
      // Arrow keys still walk while the (empty) chat box has focus.
      var walkKey = e.key === "ArrowLeft" || e.key === "ArrowRight";
      if (isTypingTarget(e.target) && !(walkKey && e.target === input && !input.value)) {
        if (e.key === "Escape") {
          // Esc in an empty chat box folds the chat away; otherwise it just leaves the field.
          if (e.target === input && !input.value && !state.panel) { expandGuide(false, true); fab.focus(); }
          else e.target.blur();
        }
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") { state.keys.left = true; start(); e.preventDefault(); }
      else if (k === "ArrowRight" || k === "d" || k === "D") { state.keys.right = true; start(); e.preventDefault(); }
      else if ((k === "Enter" || k === "e" || k === "E") && (e.target === document.body || e.target === worldEl) && state.near) { goTo(state.near.id); e.preventDefault(); }
      else if (k === "/") { e.preventDefault(); expandGuide(true, true); input.focus(); }
      else if (k === "Escape") { if (state.panel) closePanel(); else if (!guide.hidden) { expandGuide(false, true); fab.focus(); } }
    });
    document.addEventListener("keyup", function (e) {
      var k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") { state.keys.left = false; state.target = state.x + state.vel * 0.12; }
      if (k === "ArrowRight" || k === "d" || k === "D") { state.keys.right = false; state.target = state.x + state.vel * 0.12; }
      start();
    });
    window.addEventListener("blur", function () { state.keys.left = state.keys.right = false; });
  }

  function bindUI() {
    var places = $("#places"), placesBtn = $("#places-btn");
    function setPlaces(open) { places.classList.toggle("open", open); placesBtn.setAttribute("aria-expanded", open ? "true" : "false"); }
    placesBtn.addEventListener("click", function () { setPlaces(!places.classList.contains("open")); });
    document.addEventListener("click", function (e) { if (!e.target.closest("#places")) setPlaces(false); });
    $$(".nav-btn, .brand").forEach(function (b) {
      b.addEventListener("click", function () {
        setPlaces(false);
        if (state.title) enterWorld();
        goTo(b.dataset.go);
      });
    });
    $("#theme-btn").addEventListener("click", toggleTheme);
    $("#panel-close").addEventListener("click", closePanel);
    // A photo added without a thumbnail falls back to the full-size image.
    panelBody.addEventListener("error", function (e) {
      var img = e.target;
      if (img.tagName === "IMG" && /\/thumbs\//.test(img.src) && !img.dataset.full) { img.dataset.full = "1"; img.src = img.src.replace("/thumbs/", "/"); }
    }, true);
    $("#guide-toggle").addEventListener("click", function () { expandGuide(false, true); fab.focus(); });
    fab.addEventListener("click", function () {
      expandGuide(true, true);
      if (!state.mobile) input.focus({ preventScroll: true }); else $("#guide-toggle").focus();
    });
    $$(".lang-btn").forEach(function (b) { b.addEventListener("click", function () { setLang(b.dataset.lang); }); });
    $("#enter-btn").addEventListener("click", enterWorld);
    $("#video-close").addEventListener("click", closeVideo);
    $("#video-modal").addEventListener("click", function (e) { if (e.target.id === "video-modal") closeVideo(); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (!q) return;
      input.value = "";
      ask(q);
    });
    input.addEventListener("focus", function () { if (state.mobile && state.panel) closePanel(); expandGuide(true); });
    log.addEventListener("click", function (e) { if (e.target.closest(".msg-guide")) finishTyping(); });

    // Delegated buttons inside the guide and the panel.
    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-ask],[data-paper],[data-video],[data-askpaper],[data-askproject],[data-openpaper],[data-filter],[data-view],[data-cat],[data-galnav],[data-pet],[data-goto],[data-talkopen],[data-posterimg],[data-photo],[data-booth],[data-writing-section],#rt-play,#spin");
      if (!b || b.closest("#world")) return;
      if (b.dataset.writingSection) { focusPanel({ section: b.dataset.writingSection }); return; }
      if (b.id === "rt-play") { playRoadTrip(); return; }
      if (b.id === "spin") { spinWheel(); return; }
      if (b.dataset.cat) { openCat(+b.dataset.cat); return; }
      if (b.dataset.galnav) { showGal(gal.i + (+b.dataset.galnav)); return; }
      if (b.dataset.pet) { hearts($(".gal-box")); b.textContent = "Purrr… ♥"; return; }
      if (b.dataset.talkopen) { openTheater(+b.dataset.talkopen); return; }
      if (b.dataset.posterimg) { openPoster(+b.dataset.posterimg); return; }
      if (b.dataset.photo) { openPhotos(+b.dataset.photo); return; }
      if (b.dataset.booth != null) {
        var ps = D.person.portraits || [D.person.photo], k = (+b.dataset.booth + 1) % ps.length;
        b.dataset.booth = k;
        flash(b, "snap", 500);
        b.querySelector("img").src = ps[k];
        return;
      }
      if (b.dataset.goto) { goTo(b.dataset.goto); return; }
      if (b.dataset.view) { store("hj-view", b.dataset.view); return; }
      if (b.dataset.filter) { applyFilter(b.dataset.filter); return; }
      if (b.dataset.video) { openVideo(b.dataset.video); return; }
      if (b.dataset.openpaper) { goTo("research", { focus: { paper: b.dataset.openpaper } }); return; }
      var pid = b.dataset.paper || b.dataset.askpaper;
      if (pid) { ask("paper:" + pid, state.lang === "zh" ? "讲讲这篇《" + G.pubById[pid].title + "》" : "Tell me more about " + G.pubById[pid].title); return; }
      if (b.dataset.askproject) {
        var pr = (D.projects || []).filter(function (x) { return x.id === b.dataset.askproject; })[0];
        if (pr) ask("project:" + pr.id, state.lang === "zh" ? "讲讲《" + pr.title + "》" : "Tell me about " + pr.title);
        return;
      }
      if (b.dataset.ask) ask(b.dataset.ask);
    });

    var ro = window.ResizeObserver ? new ResizeObserver(function () { layout(); }) : null;
    if (ro) ro.observe(worldEl); else window.addEventListener("resize", layout);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        if (state.raf) { cancelAnimationFrame(state.raf); state.raf = 0; }
        dismissButterfly(false);
      } else { scheduleButterfly(); start(); }
    });
  }

  // ---------- boot ----------
  function boot() {
    build();
    setTheme(document.documentElement.getAttribute("data-theme") || "light");
    setLang(state.lang, true);
    setChips(null);
    bindWorld(); bindKeys(); bindUI();
    layout();
    state.cam = camGoal();
    render();
    var hash = (location.hash || "").slice(1);
    if (store("hj-entered") !== "1" && !byId[hash]) showTitle();
    else {
      setTimeout(function () { reply(G.greet(state.lang), { noMove: true }); }, 400);
      if (byId[hash]) setTimeout(function () { goTo(hash); }, 600);
    }
    state.guideMin = store("hj-guide") !== "open";
    expandGuide(!state.mobile && !state.guideMin);
    document.body.classList.add("ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
