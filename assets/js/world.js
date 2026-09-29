/*
 * The interactive world: parallax scenery, the walking avatar and her cat,
 * station panels, the Mini-Hanjing dialogue box, day/night, and the
 * welcome screen. Content comes from data.js; answers from guide.js.
 */
(function () {
  "use strict";

  var D = window.HJ_DATA, G = window.HJGuide, ART = window.HJArt;
  var GY = ART.GY, VH = ART.VH;
  var W = 8400;                     // world width in units
  var CHAR_W = 102, CHAR_H = 170;   // avatar box in world units (120x200 art at 0.85)
  var CAT_W = 66, CAT_H = 53;   // the chibi golden kitty (90x72 art)

  var STATIONS = [
    { id: "home", x: 700, stand: 610, half: 320, label: "Welcome", zh: "入口" },
    { id: "research", x: 1750, stand: 1530, half: 290, label: "Research", zh: "研究" },
    { id: "talks", x: 2850, stand: 2880, half: 350, label: "Talks", zh: "报告" },
    { id: "education", x: 4000, stand: 3880, half: 340, label: "Education", zh: "求学" },
    { id: "tutorials", x: 5050, stand: 4835, half: 240, label: "Tutorials", zh: "教程" },
    { id: "writing", x: 5950, stand: 5745, half: 240, label: "Writing", zh: "写作" },
    { id: "life", x: 6900, stand: 6710, half: 330, label: "Life", zh: "生活" },
    { id: "contact", x: 7800, stand: 7665, half: 260, label: "Contact", zh: "联系" }
  ];
  var byId = {};
  STATIONS.forEach(function (s) { byId[s.id] = s; });

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
    catX: 520, catDir: 1,
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
  var charEl, catEl, groundEl, layerEls = [];

  function svgWrap(width, inner, cls) {
    return '<svg class="' + cls + '" viewBox="0 0 ' + width + " " + VH + '" preserveAspectRatio="xMinYMax meet" aria-hidden="true" focusable="false">' + inner + "</svg>";
  }

  function stationArt(st) {
    var fn = ART.stations[st.id];
    var inner = st.id === "research" ? fn(D.publications, D.themes)
      : st.id === "talks" ? fn(D.videos, D.posters)
      : st.id === "tutorials" ? fn(D.tutorials)
      : st.id === "writing" ? fn(D.gpts) : fn();
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
          '<div class="actor char" id="char">' + ART.character("w") + '<div class="bubble" id="char-bubble"></div></div>';
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
    var minUnits = state.mobile ? 560 : 720;
    var s = Math.min(r.height / VH, r.width / minUnits);
    state.s = s;
    state.viewW = r.width / s;
    var extra = r.height - VH * s;
    state.sceneBottom = state.mobile ? Math.max(0, Math.min(guideReserve(), extra)) : 0;
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
  }

  function camGoal() {
    var fr = freeRange();
    // With the dialogue box open beside a panel, keep the avatar (who is talking) in view.
    var fx = state.focusX != null && !(fr[0] > 0 && state.panel) ? state.focusX : state.x;
    return clamp(fx - (fr[0] + (fr[1] - fr[0]) / 2) / state.s, 0, Math.max(0, W - state.viewW));
  }

  // ---------- loop ----------
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
      if (Math.abs(state.vel) > 5) state.dir = state.vel > 0 ? 1 : -1;
    } else if (state.trip) {
      var trip = state.trip; state.trip = null;
      arrive(trip);
    }
    charEl.classList.toggle("is-walking", Math.abs(state.vel) > 20);
    charEl.classList.toggle("is-running", Math.abs(state.vel) > 700);

    // the cat trots after her
    var catGoal = state.x - state.dir * 82;
    var cdx = catGoal - state.catX;
    if (Math.abs(cdx) > 1) {
      busy = true;
      var cstep = cdx * (1 - Math.exp(-dt * 3.4));
      state.catX += cstep;
      if (Math.abs(cstep) > 0.4) state.catDir = cstep > 0 ? 1 : -1;
      else state.catDir = state.dir;
    }
    catEl.classList.toggle("is-walking", Math.abs(cdx) > 14);

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
      state.x = state.target; state.catX = state.x - 82 * (state.target >= state.x ? 1 : -1);
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
    var already = Math.abs(state.x - st.stand) < 2;
    if (opts.panel !== false) openPanel(id, opts.focus, opts.fromChat);
    walkTo(st.stand, { trip: { id: id, quiet: opts.quiet, focus: opts.focus }, focus: null });
    if (already) { state.focusX = st.x; start(); }
  }

  function arrive(trip) {
    var st = byId[trip.id];
    state.dir = st.x >= state.x ? 1 : -1;
    state.focusX = st.x;
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
    hud.innerHTML = "<b>" + esc(state.lang === "zh" ? near.zh : near.label) + "</b> · " +
      (state.mobile ? (state.lang === "zh" ? "点击进入" : "tap to explore") : (state.lang === "zh" ? "按 Enter 进入" : "press Enter to explore"));
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
  }

  // ---------- theme ----------
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    store("hj-theme", t);
    var btn = $("#theme-btn");
    btn.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
    btn.setAttribute("aria-label", t === "dark" ? "Switch to day" : "Switch to night");
  }
  function toggleTheme() {
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  }

  // ---------- guide (dialogue box) ----------
  var ARRIVE = {
    home: { en: "Welcome to my little world! The notice board has what's new lately.", zh: "欢迎来到我的小世界！公告栏上是最近的动态。" },
    research: { en: "This is my library — every book on the shelves is a paper. Pick one, or ask me about a topic.", zh: "这是我的藏书阁——书架上的每一本书都是一篇论文。挑一本，或者问我某个主题。" },
    talks: { en: "Welcome to my lecture hall! Take a seat — pick a talk and I'll present it for you.", zh: "欢迎来到我的报告厅！找个位置坐下——选一场报告，我讲给你听。" },
    education: { en: "My path so far: UC Davis → Georgetown → Lehigh.", zh: "我的求学之路：UC Davis → Georgetown → Lehigh。" },
    tutorials: { en: "My old typewriter! These are the tutorials I wrote — R, Python, statistics and web basics.", zh: "我的老打字机！这些是我写的教程：R、Python、统计和前端基础。" },
    writing: { en: "My writing desk: blog posts, and the paper cranes are GPTs I built.", zh: "我的书桌：博客文章，还有纸鹤——那是我做的 GPTs。" },
    life: { en: "Off the clock: my six cats, road trips around the U.S., and food. Click around!", zh: "下班后的我：六只猫、环美自驾和美食。随便点点看！" },
    contact: { en: "Want to talk research or collaborate? Here's where to find me.", zh: "想聊研究或合作？在这里可以找到我。" }
  };
  var STATION_CHIPS = {
    home: { en: ["What's new?", "Who are you?", "What do you research?"], zh: ["最近有什么新动态？", "你是谁？", "你研究什么？"] },
    research: { en: D.themes.slice(0, 3).map(function (t) { return t.title; }).concat(["Only peer-reviewed ones"]), zh: D.themes.slice(0, 3).map(function (t) { return t.zhTitle; }).concat(["只看正式发表的"]) },
    education: { en: ["Who is your advisor?", "What do you research?"], zh: ["你的导师是谁？", "你研究什么？"] },
    talks: { en: ["Do you have video talks?", "Show me your posters", "What's new?"], zh: ["有报告视频吗？", "看看你的海报", "最近有什么新动态？"] },
    tutorials: { en: ["I want to learn R", "Python tutorials", "Statistics"], zh: ["有 R 语言教程吗", "Python 教程", "统计学"] },
    writing: { en: ["Bayesian statistics", "Time series", "Your custom GPTs"], zh: ["贝叶斯统计", "时间序列", "你做的 GPTs"] },
    life: { en: ["Tell me about your cats", "How many states have you visited?", "What do you like to eat?"], zh: ["说说你的猫", "你去过几个州？", "你喜欢吃什么？"] },
    contact: { en: ["Can I see your CV?", "Do you have video talks?"], zh: ["可以看简历吗？", "有论文讲解视频吗？"] }
  };
  var POKES = {
    en: ["Hi! Ask me anything below 👇", "Click a place and I'll walk you there.", "Psst — every book in my library is a paper.", "My cat follows me everywhere."],
    zh: ["嗨！在下面问我任何问题 👇", "点一个地方，我带你走过去。", "悄悄说：用英文问我也可以。", "我的猫走到哪跟到哪。"]
  };

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

  var typing = null;
  function finishTyping() { if (typing) { var t = typing; typing = null; t.done(); } }

  function reply(a, opts) {
    opts = opts || {};
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
      if (a.html) extra.innerHTML = a.html;
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
    // Cut after the first full sentence (not after "Ph.D." or "Prof.").
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

  function ask(text, label, soft) {
    if (!text) return;
    addMsg("user", label || text);
    if (/[㐀-鿿]/.test(label || text)) setLang("zh", true);
    else if (!/^(paper|theme):/.test(text)) setLang("en", true);
    // A click in the world ("soft") doesn't reopen a chat the visitor folded away.
    if (!(soft && state.guideMin)) expandGuide(true);
    reply(G.answer(text, state.lang));
  }

  function stationGreeting(id) {
    reply({ text: pick(state.lang, ARRIVE[id]), html: "", chips: STATION_CHIPS[id][state.lang] }, { noMove: true });
  }

  function setChips(list) {
    list = list || G.startChips(state.lang);
    chips.innerHTML = list.map(function (c) { return '<button type="button" class="chip" data-ask="' + esc(c) + '">' + esc(c) + "</button>"; }).join("");
  }

  function setLang(l, quiet) {
    state.lang = l;
    $$(".lang-btn").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.lang === l ? "true" : "false"); });
    input.placeholder = l === "zh" ? "问我任何问题：研究、论文、教育背景……" : "Ask me anything — research, papers, education…";
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
    links.push('<button type="button" class="link-btn" data-askpaper="' + p.id + '">' + (state.lang === "zh" ? "问问迷你 Hanjing" : "Ask Mini-Hanjing") + "</button>");
    return '<li class="p-paper" id="paper-' + p.id + '" data-type="' + p.type + '">' +
      '<a class="p-paper-title" href="' + esc(l.paper || l.doi || l.arxiv || l.pdf) + '" target="_blank" rel="noopener">' + esc(p.title) + "</a>" +
      '<div class="p-authors">' + authors(p.authors) + "</div>" +
      '<div class="p-venue"><span class="badge badge-' + p.type + '">' + esc(G.typeLabel[p.type].en) + "</span> " + esc(p.venueShort) + "</div>" +
      "<details><summary>" + (state.lang === "zh" ? "摘要与观点" : "Summary & key point") + "</summary>" +
      "<p>" + esc(pick(state.lang, p.summary)) + "</p><p><b>" + (state.lang === "zh" ? "核心观点：" : "Key point: ") + "</b>" + esc(pick(state.lang, p.takeaway)) + "</p>" +
      '<p class="p-venue-full">' + esc(p.venue) + "</p></details>" +
      '<div class="p-links">' + links.join("") + "</div></li>";
  }

  var RENDER = {
    home: function () {
      var P = D.person, L = P.links;
      var links = G.contactItems("en").map(function (c) { return extLink(c.href, c.label); }).join("");
      return '<div class="p-hero"><button type="button" class="booth" data-booth="0" aria-label="Photo booth: show another portrait of Hanjing">' +
        '<img src="' + esc((P.portraits || [P.photo])[0]) + '" alt="Hanjing Shi" width="120" height="150"><span class="booth-hint">click me</span></button>' +
        '<div><h2 id="panel-title" tabindex="-1">' + esc(P.name) + '</h2><p class="p-role">' + esc(P.role) + "<br>" + esc(P.affiliation) + "</p></div></div>" +
        '<p class="p-lede">' + esc(pick(state.lang, P.tagline)) + "</p>" +
        P.bio[state.lang === "zh" ? "zh" : "en"].map(function (b) { return "<p>" + esc(b) + "</p>"; }).join("") +
        '<div class="p-links p-links-row">' + links + "</div>" +
        '<h3 id="news">' + (state.lang === "zh" ? "最近动态" : "News") + '</h3><ul class="p-news">' +
        D.news.map(function (n) {
          return '<li><span class="p-date">' + esc(n.date) + "</span><span>" + esc(pick(state.lang, n)) +
            (n.paper ? ' <button type="button" class="link-btn" data-openpaper="' + n.paper + '">' + (state.lang === "zh" ? "查看" : "view") + "</button>" : "") + "</span></li>";
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
      return '<h2 id="panel-title" tabindex="-1">' + (state.lang === "zh" ? "研究" : "Research") + "</h2>" +
        '<p class="p-lede">' + (state.lang === "zh"
          ? "五条研究线索。每本书都是一篇论文——点开看摘要，或者让迷你 Hanjing 讲给你听。"
          : "Five threads of work. Every book in the library is a paper — open one for a summary, or ask Mini-Hanjing about it.") + "</p>" +
        '<div class="p-filters" role="group" aria-label="Filter by type">' + filters + "</div>" + talks +
        D.themes.map(function (t) {
          var list = G.pubs.filter(function (p) { return p.theme === t.id; });
          return '<section class="p-theme" id="theme-' + t.id + '" style="--tc:' + t.color + '"><h3><span class="dot"></span>' + esc(state.lang === "zh" ? t.zhTitle : t.title) + "</h3>" +
            '<p class="p-muted">' + esc(pick(state.lang, t.blurb)) + '</p><ul class="p-papers">' + list.map(paperItem).join("") + "</ul></section>";
        }).join("") +
        '<p class="p-muted p-foot">Full list also on ' + extLink(D.person.links.scholar, "Google Scholar") + ".</p>";
    },

    education: function () {
      return '<h2 id="panel-title" tabindex="-1">' + (state.lang === "zh" ? "求学之路" : "Education") + "</h2>" +
        '<ol class="p-timeline">' + D.education.map(function (e) {
          return "<li><h3>" + esc(e.degree) + "</h3><p>" + esc(e.school) + (e.years ? " · " + esc(e.years) : "") + "</p>" +
            (e.note ? '<p class="p-muted">' + esc(e.note) + "</p>" : "") + "</li>";
        }).join("") + "</ol>" +
        '<h3>' + (state.lang === "zh" ? "研究兴趣" : "Research interests") + '</h3><ul class="p-tags">' +
        D.person.interests.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul>";
    },

    tutorials: function () {
      return '<h2 id="panel-title" tabindex="-1">' + (state.lang === "zh" ? "教程" : "Tutorials") + "</h2>" +
        '<p class="p-lede">' + (state.lang === "zh" ? "我写的入门教程与速查表（中文）。" : "Beginner tutorials and cheat sheets I wrote. The tutorials themselves are written in Chinese.") + "</p>" +
        '<ul class="p-cards">' + D.tutorials.map(function (t) {
          return '<li class="p-card" id="tut-' + t.id + '"><span class="p-card-tag">' + esc(t.label) + "</span><h3>" + extLink(t.href, t.title) + "</h3><p>" + esc(pick(state.lang, t.desc)) + "</p>" +
            (t.pdf ? '<p class="p-links">' + extLink(t.pdf, "PDF version") + "</p>" : "") + "</li>";
        }).join("") + "</ul>";
    },

    writing: function () {
      return '<h2 id="panel-title" tabindex="-1">' + (state.lang === "zh" ? "写作" : "Writing") + "</h2>" +
        '<h3>' + (state.lang === "zh" ? "博客" : "Blog") + '</h3><ul class="p-cards">' + D.writing.map(function (w) {
          return '<li class="p-card" id="post-' + w.id + '"><span class="p-card-tag">in Chinese</span><h3>' + extLink(w.href, w.title) + "</h3><p>" + esc(pick(state.lang, w.desc)) + "</p></li>";
        }).join("") + "</ul>" +
        '<h3 id="gpts">' + (state.lang === "zh" ? "我做的 GPTs（纸鹤）" : "Custom GPTs (the paper cranes)") + '</h3><ul class="p-list">' + D.gpts.map(function (g, i) {
          return '<li id="gpt-' + i + '">' + extLink(g.href, g.name) + "<br>" + esc(g.desc) + "</li>";
        }).join("") + "</ul>";
    },

    life: function () {
      var L = lifeById();
      var tilts = [-3, 2, -1.5, 3, -2.5, 1.5];
      var cards = D.cats.map(function (c, i) {
        var src = c.photos && c.photos[0];
        var art = src ? '<img src="' + esc(thumbOf(src)) + '" alt="' + esc(c.name) + '" loading="lazy">' : ART.mysteryCat();
        return '<li class="cat-card" style="--r:' + tilts[i % tilts.length] + 'deg"><button type="button" class="cat-open" data-cat="' + i + '">' +
          '<span class="cat-photo' + (src ? "" : " is-art") + '">' + art + (i === 0 ? '<span class="cat-badge" aria-hidden="true">' + ART.cat("b" + i) + "</span>" : "") + "</span>" +
          '<span class="cat-name">' + esc(c.name) + '</span><span class="cat-about">' + esc(c.about || "") + "</span></button></li>";
      }).join("");
      var t = L.travel;
      return '<h2 id="panel-title" tabindex="-1">Life</h2>' +
        '<p class="p-lede">Off the clock — click around.</p>' +
        '<section class="life-sec" id="life-cats"><h3>My six cats</h3><p>' + esc(pick(state.lang, L.cats)) + "</p>" +
          '<ul class="cat-line">' + cards + "</ul></section>" +
        '<section class="life-sec" id="life-travel"><h3>Road trips</h3><p>' + esc(pick(state.lang, t)) + "</p>" +
          '<div class="roadtrip">' + ART.usMap() +
          '<div class="rt-stats"><div><b id="rt-states">0</b><span>states visited</span></div><div><b id="rt-trips">0</b><span>drives around the U.S.</span></div><div><b>2</b><span>coasts called home</span></div></div>' +
          '<button type="button" class="link-btn" id="rt-play">▶ Play the road trips</button></div></section>' +
        '<section class="life-sec" id="life-food"><h3>Food</h3><p>' + esc(pick(state.lang, L.food)) + "</p>" +
          '<div class="food">' + ART.foodWheel(D.dishes) +
          '<div class="food-side"><button type="button" class="btn btn-primary btn-spin" id="spin">Spin: what should we try?</button>' +
          '<p class="food-result" id="food-result" aria-live="polite"></p>' +
          (D.foodSocial ? '<p class="p-links">' + extLink(D.foodSocial, "My restaurant finds →") + "</p>" : "") + "</div></div></section>" +
        '<section class="life-sec" id="life-blogging"><h3>Writing</h3><p>' + esc(pick(state.lang, L.blogging)) +
          ' <button type="button" class="link-btn" data-goto="writing">Visit my writing desk →</button></p></section>';
    },

    talks: function () {
      var tilts = [-2.5, 2, -1.5, 3, -2, 1.5, -3, 2.5, -1];
      return '<h2 id="panel-title" tabindex="-1">Talks &amp; Posters</h2>' +
        '<p class="p-lede">Take a seat — pick a talk and the lights will dim.</p>' +
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
      return '<h2 id="panel-title" tabindex="-1">' + (state.lang === "zh" ? "联系" : "Contact") + "</h2>" +
        '<p class="p-lede">' + (state.lang === "zh" ? "欢迎来聊研究或合作。" : "Happy to talk research and collaboration.") + "</p>" +
        '<ul class="p-contact">' + G.contactItems(state.lang).map(function (c) { return "<li>" + extLink(c.href, c.label) + "</li>"; }).join("") + "</ul>" +
        (L.email ? "" : '<p class="p-muted">' + (state.lang === "zh" ? "邮箱即将补充。" : "Email coming soon.") + "</p>") +
        '<p class="p-muted">' + (state.lang === "zh" ? "想看不带动画的版本？" : "Prefer a plain page?") + ' <a href="basic.html" data-view="basic">' + (state.lang === "zh" ? "基本版" : "Basic version") + "</a></p>";
    }
  };

  var lastFocus = null;
  function openPanel(id, focus, fromChat) {
    var fresh = state.panel !== id;
    if (fresh) {
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
    showHud();
    if (focus) setTimeout(function () { focusPanel(focus); }, fresh ? 60 : 0);
    else if (fresh) { var h = $("#panel-title"); if (h) h.focus({ preventScroll: true }); }
    start();
  }

  function closePanel() {
    if (!state.panel) return;
    state.panel = null;
    panel.classList.remove("open");
    document.body.classList.remove("panel-open");
    setTimeout(function () { if (!state.panel) panel.hidden = true; }, 260);
    // Keep the place she's standing at in frame (phones can't show a whole place around her).
    state.focusX = state.near && !state.trip ? state.near.x : null;
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
    else if (f.gpt != null) target = document.getElementById("gpt-" + f.gpt);
    else if (f.life) target = document.getElementById("life-" + f.life);
    else if (f.news) target = document.getElementById("news");
    else if (f.posters) target = document.getElementById("posters");
    else if (f.photos) target = document.getElementById("photos");
    if (target) {
      target.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
      flash(target, "flash", 1600);
    }
    if (f.life === "travel") setTimeout(playRoadTrip, reduced ? 0 : 500);
  }

  // ---------- Life widgets ----------
  function lifeById() {
    var m = {};
    D.life.forEach(function (l) { m[l.id] = l; });
    return m;
  }

  var roadRaf = 0;
  function playRoadTrip() {
    var svg = $(".roadmap", panelBody);
    if (!svg) return;
    var loops = $$(".us-loop", svg), car = $(".us-car", svg);
    var statesEl = $("#rt-states"), tripsEl = $("#rt-trips");
    var total = lifeById().travel.stats.states, dur = reduced ? 0 : 5600, t0 = 0;
    cancelAnimationFrame(roadRaf);
    function frame(now) {
      if (!t0) t0 = now;
      var p = dur ? Math.min(1, (now - t0) / dur) : 1;
      var li = p >= 1 ? 1 : Math.floor(p * 2), lp = p >= 1 ? 1 : p * 2 - li;
      loops[0].style.strokeDashoffset = 1000 * (1 - (li > 0 ? 1 : lp));
      loops[1].style.strokeDashoffset = 1000 * (1 - (li > 0 ? lp : 0));
      var path = loops[li], len = path.getTotalLength();
      var a = path.getPointAtLength(len * lp), b = path.getPointAtLength(Math.min(len, len * lp + 2));
      car.setAttribute("transform", "translate(" + a.x.toFixed(1) + " " + a.y.toFixed(1) + ")" + (b.x < a.x ? " scale(-1 1)" : ""));
      statesEl.textContent = Math.round(total * p);
      tripsEl.textContent = p >= 1 ? 2 : li;
      if (p < 1) roadRaf = requestAnimationFrame(frame);
      else bubble(charEl, "Two laps, 46 states!", 2200);
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
      out.textContent = "Tonight: " + dish + "! I'll eat just about anything — let's try it.";
      bubble(charEl, "Let's go get " + dish.toLowerCase() + "!", 2400);
    }, reduced ? 0 : 3300);
  }

  function hearts(host) {
    for (var i = 0; i < 5; i++) {
      var h = document.createElement("span");
      h.className = "heart";
      h.textContent = "♥";
      h.style.left = (30 + Math.random() * 40) + "%";
      h.style.animationDelay = (i * 0.08) + "s";
      host.appendChild(h);
      setTimeout(function (el) { el.remove(); }.bind(null, h), 1400);
    }
  }

  var pokes = 0;
  function kittyPoke() {
    var lines = ["Mrrp! ♥", "I'm JinBingBing — the youngest of six!", "Purrrr…", "Follow us!"];
    bubble(catEl, lines[pokes++ % lines.length], 1800);
    flash(catEl, "is-happy", 1200);
    hearts(catEl);
  }

  function thumbOf(src) { return String(src).replace(/\/([^\/]+)$/, "/thumbs/$1"); }

  // A small lightbox for cat photos, conference photos and posters.
  var gal = { kind: "", items: [], i: 0 };
  function catItems() {
    var out = [];
    D.cats.forEach(function (c, ci) {
      (c.photos || []).forEach(function (src) {
        out.push({ cat: ci, src: src, alt: c.name, title: c.name, caption: "<b>" + esc(c.about || "") + "</b>" + (c.note ? " · " + esc(c.note) : "") });
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
      heads += '<g transform="translate(' + x.toFixed(0) + " " + hy.toFixed(0) + ") scale(" + s.toFixed(2) + ')"><circle cx="0" cy="0" r="21"/><path d="M-40 70Q-38 26 0 24Q38 26 40 70Z"/></g>';
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
      if (!state.mobile) input.focus({ preventScroll: true });   // no surprise keyboard on phones
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

  function onWorldClick(e) {
    if (state.dragged) { state.dragged = false; return; }
    if (state.title) return;
    var t = e.target;
    var el;
    if (t.closest("#sun")) return;   // handled by the sun's own listener
    // A station's invisible hit area can reach up over the sun; let the sun win there.
    if (t.classList && t.classList.contains("hit") && overSun(e)) { toggleTheme(); return; }
    if (t.closest("#char")) { flash(charEl, "is-waving", 1500); bubble(charEl, POKES[state.lang][Math.floor(Math.random() * POKES[state.lang].length)], 2400); return; }
    if (t.closest("#cat")) { doAction("meow"); return; }
    if ((el = t.closest(".book"))) { var id = el.dataset.paper; goTo("research", { focus: { paper: id }, quiet: true }); ask("paper:" + id, (state.lang === "zh" ? "讲讲这本：" : "Tell me about ") + G.pubById[id].title, true); return; }
    if ((el = t.closest(".slip"))) { goTo("tutorials", { focus: { tutorial: el.dataset.tutorial } }); return; }
    if ((el = t.closest(".crane"))) { goTo("writing", { focus: { gpt: +el.dataset.gpt } }); return; }
    if ((el = t.closest(".life-item"))) {
      var lid = el.dataset.life;
      goTo("life", { focus: { life: lid }, quiet: true });
      var item = D.life.filter(function (l) { return l.id === lid; })[0];
      reply({ text: pick(state.lang, item), html: "", chips: STATION_CHIPS.life[state.lang] }, { noMove: true });
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
      var b = e.target.closest("[data-ask],[data-paper],[data-video],[data-askpaper],[data-openpaper],[data-filter],[data-view],[data-cat],[data-galnav],[data-pet],[data-goto],[data-talkopen],[data-posterimg],[data-photo],[data-booth],#rt-play,#spin");
      if (!b || b.closest("#world")) return;
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
      if (pid) { ask("paper:" + pid, (state.lang === "zh" ? "讲讲这篇：" : "Tell me more about ") + G.pubById[pid].title); return; }
      if (b.dataset.ask) ask(b.dataset.ask);
    });

    var ro = window.ResizeObserver ? new ResizeObserver(function () { layout(); }) : null;
    if (ro) ro.observe(worldEl); else window.addEventListener("resize", layout);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && state.raf) { cancelAnimationFrame(state.raf); state.raf = 0; }
      else if (!document.hidden) start();
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
    state.guideMin = store("hj-guide") === "min";
    expandGuide(!state.mobile && !state.guideMin);
    document.body.classList.add("ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
