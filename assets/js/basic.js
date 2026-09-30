/*
 * Basic version: renders the one-page homepage from data.js.
 */
(function () {
  "use strict";

  var D = window.HJ_DATA;
  var P = D.person, L = P.links;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function a(href, label) { return '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(label) + "</a>"; }
  function byDateDesc(x, y) { return x.date < y.date ? 1 : x.date > y.date ? -1 : 0; }
  function authors(list) {
    return list.map(function (n) { return n === P.name ? "<b>" + esc(n) + "</b>" : esc(n); }).join(", ");
  }
  function videoFor(pid) {
    for (var i = 0; i < D.videos.length; i++) if (D.videos[i].paper === pid) return D.videos[i];
    return null;
  }

  // Link the advisor's name to his website wherever the education notes mention him.
  function advisorNote(note) {
    var adv = D.person.advisor || {}, t = esc(note);
    return adv.url && adv.name ? t.replace(esc(adv.name), '<a href="' + esc(adv.url) + '" target="_blank" rel="noopener">' + esc(adv.name) + "</a>") : t;
  }

  var themeById = {};
  D.themes.forEach(function (t) { themeById[t.id] = t; });
  var pubs = D.publications.slice().sort(byDateDesc);

  function contactLinks() {
    var out = [];
    if (L.email) out.push('<a href="mailto:' + esc(L.email) + '">' + esc(L.email) + "</a>");
    out.push(a(L.scholar, "Google Scholar"));
    if (L.linkedin) out.push(a(L.linkedin, "LinkedIn"));
    if (L.rednote) out.push(a(L.rednote, "RedNote (小红书)"));
    if (L.github) out.push(a(L.github, "GitHub"));
    if (L.cv) out.push(a(L.cv, "CV"));
    return out;
  }

  function pubItem(p) {
    var l = p.links, links = [];
    if (l.paper) links.push(a(l.paper, "paper"));
    if (l.doi) links.push(a(l.doi, "DOI"));
    if (l.arxiv) links.push(a(l.arxiv, "arXiv"));
    if (l.pdf) links.push(a(l.pdf, "PDF"));
    if (l.poster) links.push(a(l.poster, "poster"));
    if (l.slides) links.push(a(l.slides, "slides"));
    if (videoFor(p.id)) links.push('<button type="button" data-video="' + esc(p.id) + '">▶ video</button>');
    var main = l.paper || l.doi || l.arxiv || l.pdf;
    return '<li class="pub" id="pub-' + esc(p.id) + '">' +
      '<div class="pub-title">' + a(main, p.title) + "</div>" +
      '<div class="pub-authors">' + authors(p.authors) + "</div>" +
      '<div class="pub-venue">' + esc(p.venue) + (p.venue.indexOf(String(p.year)) === -1 ? ", " + p.year : "") + "</div>" +
      '<div class="pub-links">' + links.join("") + "</div>" +
      '<div class="video-slot" id="video-' + esc(p.id) + '"></div></li>';
  }

  function section(id, title, body) {
    return '<section id="' + id + '"><h2>' + esc(title) + "</h2>" + body + "</section>";
  }

  function render() {
    var groups = [
      ["proceedings", "Conference & Proceedings Papers"],
      ["workshop", "Workshop Papers & Presentations"],
      ["poster", "Posters"],
      ["preprint", "Preprints"]
    ];

    var html = "";
    html += '<section id="about"><div class="intro">' +
      '<img src="' + esc(P.photo) + '" alt="Hanjing Shi" class="profile-pic" width="150" height="150">' +
      "<div><h1>" + esc(P.name) + "</h1>" +
      '<p class="role">' + esc(P.role) + "</p>" +
      '<p class="links">' + contactLinks().join("") + "</p></div></div>" +
      '<p class="tagline">' + esc(P.tagline.en) + "</p>" +
      P.bio.en.map(function (b) { return "<p>" + esc(b) + "</p>"; }).join("") +
      "<p><b>Research interests</b><br>" + P.interests.map(esc).join(" · ") + "</p></section>";

    html += section("news", "News", '<ul class="news">' + D.news.map(function (n) {
      return '<li><span class="date">' + esc(n.date) + "</span><span>" + esc(n.en) +
        (n.paper ? ' <a href="#pub-' + esc(n.paper) + '">→</a>' : "") + "</span></li>";
    }).join("") + "</ul>");

    html += section("research", "Research", "<p>My work falls into five connected threads.</p>" +
      '<ul class="themes">' + D.themes.map(function (t) {
        var n = pubs.filter(function (p) { return p.theme === t.id; }).length;
        return "<li><b>" + esc(t.title) + "</b> (" + n + ")<br>" + esc(t.blurb.en) + "</li>";
      }).join("") + "</ul>");

    var pubHtml = "";
    groups.forEach(function (g) {
      var list = pubs.filter(function (p) { return p.type === g[0]; });
      if (list.length) pubHtml += "<h3>" + esc(g[1]) + '</h3><ul class="pubs">' + list.map(pubItem).join("") + "</ul>";
    });
    pubHtml += '<p class="pub-note">Also on ' + a(L.scholar, "Google Scholar") + ".</p>";
    html += section("publications", "Publications", pubHtml);

    html += section("talks", "Talks & Posters",
      "<h3>Recorded talks</h3><ul class=\"pubs\">" + D.videos.map(function (v) {
        return '<li class="pub"><div class="pub-title">' + esc(v.title) + '</div><div class="pub-venue">' + esc(v.venue) + "</div>" +
          '<div class="pub-links"><button type="button" data-video="talk:' + esc(v.paper) + '">▶ watch the talk</button></div>' +
          '<div class="video-slot" id="talk-' + esc(v.paper) + '"></div></li>';
      }).join("") + "</ul>" +
      "<h3>Posters &amp; slides</h3><ul class=\"plain\">" + D.posters.map(function (p) {
        var pub = pubs.filter(function (x) { return x.id === p.paper; })[0];
        return "<li>" + esc(p.venue) + " · " + a(p.file || p.image, pub ? pub.title : "Poster") + "</li>";
      }).join("") + "</ul>");

    html += section("education", "Education", '<ul class="timeline">' + D.education.map(function (e) {
      return '<li><div class="deg">' + esc(e.degree) + "</div><div>" + esc(e.school) + (e.years ? " · " + esc(e.years) : "") + "</div>" +
        (e.note ? '<div class="pub-note">' + advisorNote(e.note) + "</div>" : "") + "</li>";
    }).join("") + "</ul>");

    html += section("tutorials", "Tutorials", "<p>Beginner tutorials and cheat sheets I wrote. The tutorials themselves are written in Chinese.</p>" +
      '<ul class="cards">' + D.tutorials.map(function (t) {
        return '<li><div class="t">' + a(t.href, t.title) + "</div><div>" + esc(t.desc.en) + "</div>" +
          (t.pdf ? '<div class="pub-links">' + a(t.pdf, "PDF version") + "</div>" : "") + "</li>";
      }).join("") + "</ul>");

    html += section("writing", "Blog", (L.rednote ? "<p>My main blog lives on " + a(L.rednote, "RedNote (小红书)") + ". Below are two posts on statistics, written in Chinese.</p>" : "<p>Posts on statistics, written in Chinese.</p>") + '<ul class="cards">' + D.writing.map(function (w) {
      return '<li><div class="t">' + a(w.href, w.title) + "</div><div>" + esc(w.desc.en) + "</div></li>";
    }).join("") + "</ul>" +
      "<h3>My custom GPTs</h3><ul class=\"plain\">" + D.gpts.map(function (g) {
        return "<li>" + a(g.href, g.name) + " · " + esc(g.desc) + "</li>";
      }).join("") + "</ul>");

    html += section("contact", "Contact", "<p>Happy to talk research and collaboration.</p><p class=\"links\">" + contactLinks().join("") + "</p>" +
      (L.email ? "" : '<p class="pub-note">Email coming soon.</p>') +
      '<p>Prefer something more playful? <a href="index.html?world" data-view="world">Walk through my world ✦</a></p>');

    document.getElementById("content").innerHTML = html;
    document.getElementById("footer").innerHTML = "&copy; " + new Date().getFullYear() + " Hanjing Shi · Last updated " + esc(D.updated) +
      ' · <a href="index.html?world" data-view="world">Interactive version</a>';
  }

  function ytId(u) { var m = /(?:youtu\.be\/|v=|embed\/)([\w-]{11})/.exec(u || ""); return m ? m[1] : u; }

  function playVideo(key) {
    var talk = key.indexOf("talk:") === 0, pid = talk ? key.slice(5) : key;
    var v = videoFor(pid), slot = document.getElementById((talk ? "talk-" : "video-") + pid);
    if (!v || !slot) return;
    if (slot.innerHTML) { slot.innerHTML = ""; return; }
    var t = esc(v.title || "Video");
    if (v.drive) slot.innerHTML = '<iframe src="https://drive.google.com/file/d/' + encodeURIComponent(v.drive) + '/preview" title="' + t + '" allow="autoplay; fullscreen" allowfullscreen></iframe>';
    else if (v.file) slot.innerHTML = '<video controls playsinline preload="metadata"' + (v.poster ? ' poster="' + esc(v.poster) + '"' : "") + ' src="' + esc(v.file) + '"></video>';
    else if (v.youtube) slot.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + esc(ytId(v.youtube)) + '" title="' + t + '" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    else if (v.embed) slot.innerHTML = '<iframe class="li-embed" src="' + esc(v.embed) + '" title="' + t + '" allowfullscreen></iframe>';
    else if (v.linkedin) window.open(v.linkedin, "_blank", "noopener");
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-video],[data-view]");
    if (!b) return;
    if (b.dataset.view) { try { localStorage.setItem("hj-view", b.dataset.view); } catch (err) { } return; }
    playVideo(b.dataset.video);
  });

  render();
  // Re-apply the hash now that the sections exist.
  if (location.hash) {
    var target = document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView();
  }
})();
