/*
 * Text version (basic.html, about.html, publications.html, presentations.html,
 * tutorials.html, blog.html). Remembers which version a visitor picked and
 * fills the Publications / Presentations lists from data.js.
 */
(function () {
  "use strict";

  document.addEventListener("click", function (e) {
    var v = e.target.closest("[data-view]");
    if (v) { try { localStorage.setItem("hj-view", v.dataset.view); } catch (err) { } return; }
    var b = e.target.closest("[data-video]");
    if (b) playVideo(b.dataset.video, b);
  });

  var D = window.HJ_DATA;
  if (!D) return;
  var ME = D.person.name;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function a(href, label) { return '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(label) + "</a>"; }
  function authors(list) { return list.map(function (n) { return n === ME ? "<b>" + esc(n) + "</b>" : esc(n); }).join(", "); }
  function byDateDesc(x, y) { return x.date < y.date ? 1 : x.date > y.date ? -1 : 0; }
  var pubById = {};
  D.publications.forEach(function (p) { pubById[p.id] = p; });
  function videoFor(pid) { return D.videos.filter(function (v) { return v.paper === pid; })[0]; }
  function posterFor(pid) { return D.posters.filter(function (p) { return p.paper === pid; })[0]; }
  function upcoming(p) { return p && p.upcoming ? ' <span class="tag-upcoming">upcoming</span>' : ""; }

  // ---------- Publications ----------
  var pubsEl = document.getElementById("pubs");
  if (pubsEl) {
    var groups = [
      ["proceedings", "Conference & Proceedings Papers"],
      ["workshop", "Workshop Papers"],
      ["poster", "Posters"],
      ["preprint", "Preprints"]
    ];
    var pubs = D.publications.slice().sort(byDateDesc);
    pubsEl.innerHTML = groups.map(function (g) {
      var list = pubs.filter(function (p) { return p.type === g[0]; });
      if (!list.length) return "";
      return "<h2>" + esc(g[1]) + '</h2><ol class="pubs">' + list.map(function (p) {
        var l = p.links, extra = [];
        if (l.arxiv && l.arxiv !== (l.paper || l.doi)) extra.push(a(l.arxiv, "arXiv"));
        if (l.pdf) extra.push(a(l.pdf, "PDF"));
        if (l.poster) extra.push(a(l.poster, "poster"));
        if (l.slides) extra.push(a(l.slides, "slides"));
        if (videoFor(p.id)) extra.push('<a href="presentations.html#talk-' + esc(p.id) + '">talk video</a>');
        var main = l.paper || l.doi || l.arxiv || l.pdf;
        var venue = p.venue + (p.venue.indexOf(String(p.year)) === -1 ? ", " + p.year : "");
        return '<li class="pub" id="pub-' + esc(p.id) + '">' +
          (main ? '<a class="pub-title" href="' + esc(main) + '" target="_blank" rel="noopener">' + esc(p.title) + "</a>" : '<span class="pub-title">' + esc(p.title) + "</span>") +
          upcoming(p) +
          '<div class="pub-meta">' + authors(p.authors) + "</div>" +
          '<div class="pub-meta"><em>' + esc(venue) + "</em>" + (extra.length ? " · " + extra.join(" · ") : "") + "</div></li>";
      }).join("") + "</ol>";
    }).join("");
  }

  // ---------- Presentations ----------
  var talksEl = document.getElementById("talks");
  if (talksEl) {
    talksEl.innerHTML = D.videos.map(function (v) {
      var p = pubById[v.paper];
      return '<li id="talk-' + esc(v.paper) + '"><b>' + esc(v.title) + "</b>" +
        '<div class="pub-meta"><em>' + esc(v.venue) + "</em>" + (p ? ' · <a href="publications.html#pub-' + esc(p.id) + '">paper</a>' : "") + "</div>" +
        '<button type="button" class="watch" data-video="' + esc(v.paper) + '" aria-expanded="false">▶ Watch the talk</button>' +
        '<div class="video-slot"></div></li>';
    }).join("");
  }
  var postersEl = document.getElementById("posters");
  if (postersEl) {
    postersEl.innerHTML = D.posters.map(function (ps) {
      var p = pubById[ps.paper], href = ps.file || ps.image;
      return '<li><a href="' + esc(href) + '" target="_blank" rel="noopener" class="poster-thumb"><img src="' + esc(ps.thumb || ps.image) + '" alt="" loading="lazy"></a>' +
        "<div><b>" + esc(p ? p.title : "Poster") + "</b>" + upcoming(p) +
        '<div class="pub-meta"><em>' + esc(ps.venue.replace(/\s*\(upcoming\)/i, "")) + "</em> · " + a(href, ps.file ? "PDF" : "image") + "</div></div></li>";
    }).join("");
  }

  function playVideo(pid, btn) {
    var v = videoFor(pid), slot = btn.parentNode.querySelector(".video-slot");
    if (!v || !slot) return;
    if (slot.innerHTML) { slot.innerHTML = ""; btn.setAttribute("aria-expanded", "false"); btn.textContent = "▶ Watch the talk"; return; }
    if (v.drive) slot.innerHTML = '<iframe src="https://drive.google.com/file/d/' + encodeURIComponent(v.drive) + '/preview" title="' + esc(v.title) + '" allow="autoplay; fullscreen" allowfullscreen></iframe>';
    else if (v.file) slot.innerHTML = '<video controls playsinline preload="metadata" src="' + esc(v.file) + '"></video>';
    btn.setAttribute("aria-expanded", "true");
    btn.textContent = "■ Close video";
  }

  // The lists are built after load, so jump to #pub-… / #talk-… ourselves.
  if (location.hash) {
    var t = document.getElementById(location.hash.slice(1));
    if (t) { t.scrollIntoView(); t.classList.add("is-target"); }
  }
})();
