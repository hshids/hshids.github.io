// Content is intentionally retained from the original interactive site.
// This module owns only presentation and routing; HJ_DATA/HJGuide remain the sources.
export function createContent(api) {
  const D=window.HJ_DATA, G=window.HJGuide, ART=window.HJArt, SITE_LANG='en';
  const esc=G.esc, pick=G.pick, $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const panel=$('#panel'), panelBody=$('#panel-body'), guide=$('#guide'), log=$('#guide-log'), chips=$('#guide-chips'), input=$('#guide-input');
  let lastFocus=null, currentPanel=null, lang='en', lastReply='', wheelRot=0, roadRaf=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function thumbOf(src){return String(src).replace(/\/([^\/]+)$/, '/thumbs/$1');}
  function lifeById(){return Object.fromEntries(D.life.map(l=>[l.id,l]));}
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
  // The Writing panel's note on this 3D world: where its buildings, stories and small nods come from.
  const INSPIRATION_3D = '<section id="writing-world" class="writing-inspiration"><h3>About this 3D world</h3>' +
    '<p>The 3D site is my diary in miniature: a small island built brick by brick, where each building holds a chapter and each object hides a story. This is where its pieces come from.</p>' +
    '<ul class="p-cards">' +
    '<li class="p-card"><span class="p-card-tag">Architecture</span><h3>East meets West</h3><p>The halls borrow from Tang-style timber buildings, with deep eaves, bracket sets and glazed roofs, and from Chinese gardens, with a pagoda, porcelain-blue tiles and lattice fretwork. They meet European classical stone, columns and arches, the way my own life moves between Dalian and the campuses where I studied in the United States. Each school is built in its own stone and colours.</p></li>' +
    '<li class="p-card"><span class="p-card-tag">Bricks</span><h3>Built like the toys I love</h3><p>I have a big LEGO collection and have built with blocks since I was little, so the whole island is made of bricks and studs: a world you could take apart and build again.</p></li>' +
    '<li class="p-card"><span class="p-card-tag">Magic</span><h3>Candlelight and letters</h3><p>The candlelight, the crystal ball, the snowy owl carrying letters and the diary that writes back are my homage to Harry Potter, whose sets are my favourite to build.</p></li>' +
    '<li class="p-card"><span class="p-card-tag">Stories</span><h3>Where the stories come from</h3><p>Everything on the island comes from my life: Dalian and San Francisco on two shores, the plane that carried me across the Pacific in 2013, schools across the United States, the open door to my work with the UN, my six cats and two cross-country drives, Dalian seafood under a pot lid, and travels to Korea, Sweden and Denmark.</p></li>' +
    '<li class="p-card"><span class="p-card-tag">Small nods</span><h3>Things I love</h3><p>The three knocks at the door and the rolling whiteboard are for <i>The Big Bang Theory</i>, my first glimpse of research life. The casebook is for Sherlock Holmes and murder mystery games. The whale in the deep is for my name, which sounds a little like the Chinese word for whale.</p></li>' +
    '<li class="p-card"><span class="p-card-tag">What I hope you see</span><h3>Research, with care</h3><p>Between the play, the island holds my questions about Persona AI, AI afterlife and AI in education: how people keep their agency, and how we keep caring for each other, when technology starts to sound familiar. In the Talks hall you can leave a note on a poster, because research should be a conversation.</p></li>' +
    '</ul></section>';

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
        '<nav class="writing-index" aria-label="Writing sections"><button type="button" class="link-btn" data-writing-section="writing-tutorials">Tutorials</button><span aria-hidden="true"> / </span><button type="button" class="link-btn" data-writing-section="writing-blogs">Blogs</button><span aria-hidden="true"> / </span><button type="button" class="link-btn" data-writing-section="writing-world">About this world</button></nav>' +
        '<section id="writing-tutorials"><h3>Tutorials</h3><p class="p-muted">Beginner tutorials and cheat sheets I wrote. The tutorials themselves are written in Chinese.</p>' +
        '<ul class="p-cards">' + D.tutorials.map(function (t) {
          return '<li class="p-card" id="tut-' + t.id + '"><span class="p-card-tag">' + esc(t.label) + "</span><h3>" + extLink(t.href, t.title) + "</h3><p>" + esc(t.desc.en) + "</p>" +
            (t.pdf ? '<p class="p-links">' + extLink(t.pdf, "PDF version") + "</p>" : "") + "</li>";
        }).join("") + "</ul></section>" +
        '<section id="writing-blogs"><h3>Blogs</h3>' +
        (rn ? '<p class="p-muted">On ' + extLink(rn, "RedNote") + ', I share everyday experiences and reflections.</p>' : "") +
        '<ul class="p-cards">' + D.writing.map(function (w) {
          return '<li class="p-card" id="post-' + w.id + '"><span class="p-card-tag">in Chinese</span><h3>' + extLink(w.href, w.title) + "</h3><p>" + esc(w.desc.en) + "</p></li>";
        }).join("") + "</ul></section>" + INSPIRATION_3D;
    },

    life: function () {
      var L = lifeById();
      var tilts = [-3, 2, -1.5, 3, -2.5, 1.5];
      var cards = D.cats.map(function (c, i) {
        var src = c.photos && c.photos[0];
        var art = src ? '<img src="' + esc(thumbOf(src)) + '" alt="' + esc(c.name) + '" loading="lazy">' : ART.mysteryCat();
        return '<li class="cat-card" style="--r:' + tilts[i % tilts.length] + 'deg"><button type="button" class="cat-open" data-cat="' + i + '">' +
          '<span class="cat-photo' + (src ? "" : " is-art") + '">' + art + "</span>" +
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

  function applyFilter(type) {
    $$(".filter", panelBody).forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.filter === type ? "true" : "false"); });
    $$(".p-paper", panelBody).forEach(function (li) { li.hidden = type !== "all" && li.dataset.type !== type; });
    $$(".p-theme", panelBody).forEach(function (sec) { sec.hidden = !$(".p-paper:not([hidden])", sec); });
  }

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
    if (!svg || currentPanel !== "life" || roadRaf) return;
    var routes = $$(".us-route", svg), car = $(".us-car", svg), status = $("#rt-status"), play = $("#rt-play");
    var dur = reduced ? 0 : 8000, t0 = null, current = -1;
    play.disabled = true;
    car.setAttribute("visibility", reduced ? "hidden" : "visible");
    function frame(now) {
      if (currentPanel !== "life" || !svg.isConnected) { roadRaf = 0; return; }
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

  const heard = new Set();
  let typing = 0, talkIdx = 0, modalReturn = null, closing = false;
  function setChips(list) {
    chips.innerHTML = (list || G.startChips(lang)).map(c=>'<button type="button" class="chip" data-ask="'+esc(c)+'">'+esc(c)+'</button>').join('');
  }
  function expandGuide(open) {
    guide.hidden = !open; guide.classList.toggle('collapsed', !open);
    $('#guide-fab').hidden = open; $('#guide-fab').setAttribute('aria-expanded', String(open));
    api.setOverlay(open ? 'guide' : (currentPanel ? 'panel' : null));
  }
  function addMsg(who, text, html='') {
    const el=document.createElement('div'); el.className='msg msg-'+who;
    const p=document.createElement('p'); p.className='msg-text'; p.textContent=text; el.append(p);
    if (html) { const ex=document.createElement('div'); ex.className='msg-extra'; ex.innerHTML=html; el.append(ex); }
    log.append(el); while(log.children.length>30) log.firstElementChild.remove();
    log.scrollTop=log.scrollHeight; return p;
  }
  function reply(a, {once=false, noMove=false, silent=false}={}) {
    if (!a?.text) return;
    if (once && heard.has(a.text)) {setChips(a.chips); return;}
    heard.add(a.text); lastReply=a.text;
    clearInterval(typing); log.querySelectorAll('[data-full]').forEach(p=>{p.textContent=p.dataset.full;delete p.dataset.full;});
    const p=addMsg('guide', reduced?a.text:'', (a.html||'').replace(/RedNote \(小红书\)/g, 'RedNote'));
    if(!reduced) {
      p.dataset.full=a.text; const began=performance.now(), rate=Math.max(80,a.text.length/2.1);
      typing=setInterval(()=>{p.textContent=a.text.slice(0,Math.floor((performance.now()-began)/1000*rate)); if(p.textContent.length===a.text.length){clearInterval(typing);delete p.dataset.full;} if(!guide.hidden) log.scrollTop=log.scrollHeight;},40);
    }
    setChips(a.chips); api.talk(2.2);
    if(guide.hidden && !silent) { api.say(a.text.replace(/\s+/g,' ').slice(0,120)); $('#guide-fab').classList.add('has-news'); }
    if(a.go && !noMove) api.go(a.go,{focus:a.focus,fromChat:true});
    else if(a.focus && currentPanel) focusPanel(a.focus);
    if(a.action) api.action(a.action);
  }
  function ask(q,label) {
    if(!q) return;
    if(/[㐀-鿿]/.test(label||q)) lang='zh'; else if(!/^(paper|theme|project):/.test(q)) lang='en';
    const a=G.answer(q,lang);
    if(a.text===lastReply) { expandGuide(true); setChips(a.chips); log.lastElementChild?.scrollIntoView({block:'nearest'}); return; }
    addMsg('user',label||q); expandGuide(true); reply(a);
  }
  function greet(id) {
    if(!ARRIVE[id]) return;
    reply({text:pick(lang,ARRIVE[id]),chips:STATION_CHIPS[id][lang]},{once:true,noMove:true});
  }
  function openPanel(id,focus,fromChat=false) {
    if(!RENDER[id]) return;
    if(currentPanel!==id) {stopRoadTrip(); panelBody.innerHTML=RENDER[id](); panelBody.scrollTop=0;}
    if(!currentPanel) lastFocus=document.activeElement;
    currentPanel=id; panel.hidden=false; panel.classList.add('open'); document.body.classList.add('panel-open');
    panel.setAttribute('aria-label',id+' — portfolio');
    if(!fromChat) expandGuide(false);
    api.setOverlay('panel');
    requestAnimationFrame(()=>{ if(focus)focusPanel(focus); else $('#panel-title',panel)?.focus({preventScroll:true});});
  }
  function closePanel() {
    stopRoadTrip(); panel.classList.remove('open'); panel.hidden=true; currentPanel=null;
    document.body.classList.remove('panel-open'); api.setOverlay(guide.hidden?null:'guide');
    if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
  }
  function focusPanel(f) {
    let t;
    if(f.paper){applyFilter('all');t=$('#paper-'+f.paper,panelBody);if(t)t.querySelector('details').open=true;}
    else if(f.theme)t=$('#theme-'+f.theme,panelBody);
    else if(f.filter){applyFilter(f.filter);t=$('.p-filters',panelBody);}
    else if(f.tutorial)t=$('#tut-'+f.tutorial,panelBody);
    else if(f.post)t=$('#post-'+f.post,panelBody);
    else if(f.education)t=$('#education-'+f.education,panelBody);
    else if(f.life)t=$('#life-'+f.life,panelBody);
    else if(f.section)t=document.getElementById(f.section);
    else if(f.news)t=$('#news',panelBody);
    else if(f.posters)t=$('#posters',panelBody);
    else if(f.photos)t=$('#photos',panelBody);
    else if(f.project)t=$('#project-'+f.project,panelBody);
    else if(f.projects)t=$('#now',panelBody);
    if(t){t.scrollIntoView({block:'start',behavior:reduced?'auto':'smooth'}); t.classList.add('flash');setTimeout(()=>t.classList.remove('flash'),1500);}
    if(f.life==='travel')playRoadTrip();
  }
  function ytId(u){return /(?:youtu\.be\/|v=|embed\/)([\w-]{11})/.exec(u||'')?.[1]||u;}
  function openModal(title,html) {
    $('#video-title').textContent=title; $('#video-body').innerHTML=html;
    const m=$('#video-modal'); if(m.hidden)modalReturn=document.activeElement;
    m.hidden=false;api.setOverlay('modal'); $('#video-close').focus();
  }
  function closeVideo(){
    $('#video-body').innerHTML='';$('#video-modal').hidden=true;document.body.classList.remove('theater-open');
    api.theater(false); api.setOverlay(currentPanel?'panel':guide.hidden?null:'guide'); modalReturn?.focus?.();
  }
  function openTheater(i=0){
    talkIdx=(i+D.videos.length)%D.videos.length;const v=D.videos[talkIdx];
    api.theater(true);document.body.classList.add('theater-open');
    openModal(v.title, '<div class="three-theater"><p class="theater-venue">'+esc(v.venue)+'</p><div class="three-screen" id="th-screen"><img src="'+esc(v.thumb)+'" alt="Talk preview"><button type="button" class="btn btn-primary" id="th-start">▶ Start the talk</button></div><nav class="three-program" aria-label="Talk program">'+D.videos.map((q,k)=>'<button type="button" data-talk="'+k+'" aria-current="'+(k===talkIdx)+'"><span>'+esc(q.venue)+'</span>'+esc(q.title)+'</button>').join('')+'</nav></div>');
  }
  function startTalk(){
    const v=D.videos[talkIdx];let html='';
    if(v.drive)html='<iframe src="https://drive.google.com/file/d/'+encodeURIComponent(v.drive)+'/preview" title="'+esc(v.title)+'" allow="autoplay; fullscreen" allowfullscreen></iframe>';
    else if(v.file)html='<video controls autoplay playsinline src="'+esc(v.file)+'"></video>';
    else if(v.youtube)html='<iframe src="https://www.youtube-nocookie.com/embed/'+esc(ytId(v.youtube))+'?autoplay=1" title="'+esc(v.title)+'" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>';
    if(html)$('#th-screen').innerHTML=html;
    api.talk(30);
  }
  function openVideo(pid){const i=D.videos.findIndex(v=>v.paper===pid);if(i>=0)return openTheater(i);const v=G.videoFor(pid);if(!v)return;const p=G.pubById[pid];let html='';if(v.file)html='<video controls playsinline preload="metadata" src="'+esc(v.file)+'"></video>';else if(v.youtube)html='<iframe src="https://www.youtube-nocookie.com/embed/'+esc(ytId(v.youtube))+'" title="'+esc(v.title||p.title)+'" allowfullscreen></iframe>';else if(v.embed)html='<iframe src="'+esc(v.embed)+'" title="'+esc(v.title||p.title)+'" allowfullscreen></iframe>';if(v.linkedin)html+='<p>'+extLink(v.linkedin,'Watch on LinkedIn')+'</p>';openModal(v.title||p.title,html);}
  function spinWheel(){
    const g=$('.wheel-spin',panelBody),out=$('#food-result');if(!g)return;
    const idx=Math.floor(Math.random()*D.dishes.length),step=360/D.dishes.length;
    wheelRot+=1440+((-idx*step-wheelRot)%360+720)%360;g.style.transform='rotate('+wheelRot+'deg)';out.textContent='';api.action('simmer');
    setTimeout(()=>{if(out.isConnected)out.textContent="Tonight it's "+D.dishes[idx]+"! I never say no to good food, so let's try it.";},reduced?0:3300);
  }
  $('#panel-close').addEventListener('click',closePanel);
  $('#guide-toggle').addEventListener('click',()=>{expandGuide(false);$('#guide-fab').focus();});
  $('#guide-fab').addEventListener('click',()=>{expandGuide(true);$('#guide-fab').classList.remove('has-news');input.focus({preventScroll:true});});
  $('#guide-form').addEventListener('submit',e=>{e.preventDefault();const q=input.value.trim();input.value='';ask(q);});
  $('#video-close').addEventListener('click',closeVideo);
  $('#video-modal').addEventListener('click',e=>{if(e.target.id==='video-modal')closeVideo();});
  panelBody.addEventListener('error',e=>{if(e.target.tagName==='IMG'&&e.target.src.includes('/thumbs/'))e.target.src=e.target.src.replace('/thumbs/','/');},true);
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-ask],[data-paper],[data-video],[data-askpaper],[data-askproject],[data-openpaper],[data-filter],[data-view],[data-cat],[data-galnav],[data-pet],[data-goto],[data-talkopen],[data-posterimg],[data-photo],[data-booth],[data-writing-section],[data-talk],#rt-play,#spin,#th-start');if(!b)return;
    if(b.dataset.writingSection)return focusPanel({section:b.dataset.writingSection});
    if(b.id==='rt-play')return playRoadTrip();if(b.id==='spin')return spinWheel();if(b.id==='th-start')return startTalk();
    if(b.dataset.cat!=null)return openCat(+b.dataset.cat);if(b.dataset.galnav)return showGal(gal.i+(+b.dataset.galnav));
    if(b.dataset.pet){b.textContent='Purrr… ♥';api.action('pet');return;}
    if(b.dataset.talkopen!=null)return openTheater(+b.dataset.talkopen);if(b.dataset.talk!=null)return openTheater(+b.dataset.talk);
    if(b.dataset.posterimg!=null)return openPoster(+b.dataset.posterimg);if(b.dataset.photo!=null)return openPhotos(+b.dataset.photo);
    if(b.dataset.booth!=null){const ps=D.person.portraits||[D.person.photo],k=(+b.dataset.booth+1)%ps.length;b.dataset.booth=k;b.querySelector('img').src=ps[k];return;}
    if(b.dataset.goto)return api.go(b.dataset.goto,{open:true});
    if(b.dataset.view){try{localStorage.setItem('hj-view',b.dataset.view);}catch{}return;}
    if(b.dataset.filter)return applyFilter(b.dataset.filter);if(b.dataset.video)return openVideo(b.dataset.video);
    if(b.dataset.openpaper)return api.go('research',{focus:{paper:b.dataset.openpaper},open:true});
    const pid=b.dataset.paper||b.dataset.askpaper;if(pid)return ask('paper:'+pid,'Tell me more about '+G.pubById[pid].title);
    if(b.dataset.askproject){const pr=D.projects?.find(x=>x.id===b.dataset.askproject);if(pr)return ask('project:'+pr.id,'Tell me about '+pr.title);}
    if(b.dataset.ask)return ask(b.dataset.ask);
  });
  // Dialog focus stays inside the active sheet; Escape returns to the world.
  document.addEventListener('keydown',e=>{
    const modal=!$('#video-modal').hidden?$('#video-modal'):!guide.hidden?guide:!panel.hidden?panel:null;
    if(e.key==='Escape'){if(!$('#video-modal').hidden)closeVideo();else if(!guide.hidden)expandGuide(false);else if(!panel.hidden)closePanel();return;}
    if(e.key!=='Tab'||!modal)return;
    const all=$$('button,a[href],input,summary,video',modal).filter(x=>!x.hidden&&x.offsetParent!==null);
    const first=all[0],last=all.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  });
  const portrait=D.person.portraits[0];
  $('#guide-portrait').innerHTML='<img src="'+esc(portrait)+'" alt="">';$('#guide-fab-face').innerHTML='<img src="'+esc(portrait)+'" alt="">';
  setChips();reply(G.greet('en'),{once:true,noMove:true,silent:true});expandGuide(false);
  return {openPanel,closePanel,focusPanel,ask,greet,reply,openTheater,openCat,expandGuide,
    get overlay(){return !$('#video-modal').hidden?'modal':!guide.hidden?'guide':currentPanel?'panel':null;},
    get panel(){return currentPanel;},get lang(){return lang;},dispose(){clearInterval(typing);stopRoadTrip();}};
}
