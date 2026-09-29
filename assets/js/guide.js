/*
 * Mini-Hanjing — the guide's question answering.
 *
 * Everything runs in the visitor's browser: questions are matched against
 * the content in data.js (intent rules + BM25 retrieval), and every research
 * answer cites the paper it comes from. Nothing is generated, and nothing the
 * visitor types is sent anywhere.
 *
 * Exposes window.HJGuide.answer(question, lang) -> {
 *   lang, text, html, chips, go, action, focus
 * }
 */
(function () {
  "use strict";

  var D = window.HJ_DATA;
  var CJK = /[㐀-鿿豈-﫿]/;

  // ---------- helpers ----------
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function pick(lang, obj) { return obj && (obj[lang] || obj.en || ""); }
  function isZh(s) { return CJK.test(s); }
  function byDateDesc(a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }

  var pubs = D.publications.slice().sort(byDateDesc);
  var pubById = {};
  pubs.forEach(function (p) { pubById[p.id] = p; });
  var themeById = {};
  D.themes.forEach(function (t) { themeById[t.id] = t; });

  var TYPE_LABEL = {
    proceedings: { en: "Proceedings", zh: "正式发表" },
    workshop: { en: "Workshop / presentation", zh: "Workshop / 报告" },
    poster: { en: "Poster", zh: "海报" },
    preprint: { en: "Preprint", zh: "预印本" }
  };

  function videoFor(pid) {
    for (var i = 0; i < D.videos.length; i++) if (D.videos[i].paper === pid) return D.videos[i];
    return null;
  }

  // ---------- tokenizer ----------
  var STOP = {};
  ("a an the and or but if of to in on at by for with about from into over under as is are was were be been being " +
   "do does did doing have has had having i me my mine you your yours we our us she her hers he him his it its they " +
   "them their this that these those what which who whom whose when where why how can could would should will shall " +
   "may might must just so than too very also any some more most much many few there here tell show give let know " +
   "please pls hi hello hey hanjing hanjing's shi mini one ones thing things like want wanna get got really").split(" ")
    .forEach(function (w) { STOP[w] = 1; });
  // Words that say *what kind* of answer is wanted, not *which topic*; they are
  // handled by the intent rules and would only add noise to retrieval.
  ("research paper papers publication publications work works study studies topic topics interest interests " +
   "area areas field focus project projects article articles question questions anything something")
    .split(" ").forEach(function (w) { STOP[w] = 1; });
  var ZH_STOP = {};
  ("的了吗呢吧啊呀是我你她他它们这那有在和与就都也还很么什怎么样哪个些一下吧给说讲聊看想要请能会可以").split("")
    .forEach(function (c) { ZH_STOP[c] = 1; });
  var ZH_STOP_GRAMS = {};
  ("研究 论文 文章 工作 方向 课题 领域 关于 没有 有没 相关 方面 一些 哪些 什么 介绍 一下 你的 我的").split(" ")
    .forEach(function (g) { ZH_STOP_GRAMS[g] = 1; });

  // Chinese phrases -> English retrieval terms (query expansion).
  var ZH_MAP = [
    ["智能体", "agent agentic"], ["代理", "agent"], ["自主", "autonomous agent"], ["监督", "oversight supervision"],
    ["监管", "oversight governance"], ["问责", "accountability"], ["责任", "accountability responsibility"],
    ["验证", "verification"], ["核实", "verification"], ["对齐", "alignment"], ["编排", "orchestration"],
    ["人机协作", "human-ai teaming collaboration team"], ["人机", "human-ai"], ["团队", "team teaming"],
    ["协作", "collaboration team"], ["合作者", "coauthor"], ["信任", "trust"], ["拟人", "anthropomorphism"],
    ["披露", "disclosure"], ["署名", "authorship credit"], ["功劳", "credit"], ["翻译", "translation"],
    ["逝者", "deceased afterlife"], ["去世", "deceased posthumous"], ["死后", "posthumous afterlife"],
    ["复活", "resurrection afterlife"], ["数字永生", "afterlife resurrection digital immortality"],
    ["来生", "afterlife"], ["分身", "persona"], ["人格", "persona"], ["宠物", "pets companion animal"],
    ["专家", "expert"], ["小红书", "rednote xiaohongshu"], ["社交媒体", "social media platform"],
    ["社交平台", "social media platform"], ["平台", "platform"], ["社区", "community"], ["论坛", "reddit community"],
    ["安全", "safety"], ["匿名", "anonymous anonymity"], ["化名", "pseudonymity pseudonym"], ["实名", "real name"],
    ["隐私", "privacy confidentiality"], ["新冠", "covid"], ["疫情", "covid pandemic"], ["框架", "framing"],
    ["新闻", "news"], ["政府", "government"], ["话语", "discourse"], ["谣言", "misinformation verification"],
    ["热度", "popularity visibility"], ["治理", "governance"], ["多语言", "multilingual"], ["大模型", "llm language models"],
    ["语言模型", "language models llm"], ["文化", "culture cultural"], ["教育", "education"], ["学生", "students"],
    ["老师", "instructors teaching"], ["教学", "teaching"], ["作业", "homework"], ["编程", "programming"],
    ["儿童", "children"], ["孩子", "children"], ["辅导", "tutoring"], ["霸凌", "bullying"], ["实验", "experiment"],
    ["审计", "audit"], ["综述", "review literature"], ["文献", "literature review"], ["方法", "methods"],
    ["统计", "statistics"], ["教程", "tutorial"], ["博客", "blog"], ["猫", "cat cats"], ["做饭", "cooking"],
    ["烹饪", "cooking"], ["美食", "food cuisine"], ["旅行", "travel"], ["旅游", "travel"], ["电影", "movies"],
    ["系统", "system"], ["原型", "prototype system"]
  ];

  function stem(w) {
    if (w.length > 5 && /ies$/.test(w)) return w.slice(0, -3) + "y";
    if (w.length > 5 && /ing$/.test(w)) return w.slice(0, -3);
    if (w.length > 4 && /ed$/.test(w)) return w.slice(0, -2);
    if (w.length > 4 && /(ses|xes|ches|shes)$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
    return w;
  }

  function tokenize(text, expand) {
    var t = String(text || "").toLowerCase()
      .replace(/\br\//g, "subreddit ")          // "r/OpenClaw" is not the R language
      .replace(/r\s*语言/g, " r ");
    var out = [];
    if (expand) {
      ZH_MAP.forEach(function (pair) { if (t.indexOf(pair[0]) !== -1) t += " " + pair[1]; });
    }
    t.replace(/[a-z0-9][a-z0-9\-']*/g, function (w) {
      w = w.replace(/'s$/, "").replace(/'/g, "");
      w.split("-").concat(w.indexOf("-") > 0 ? [w.replace(/-/g, "")] : []).forEach(function (p) {
        if (p && !STOP[p] && (p.length > 1 || p === "r")) out.push(stem(p));
      });
      return w;
    });
    var runs = t.match(/[㐀-鿿]+/g) || [];
    runs.forEach(function (r) {
      for (var i = 0; i < r.length - 1; i++) {
        var g = r.slice(i, i + 2);
        if (!(ZH_STOP[g[0]] && ZH_STOP[g[1]]) && !ZH_STOP_GRAMS[g]) out.push(g);
      }
      if (r.length === 1 && !ZH_STOP[r]) out.push(r);
    });
    return out;
  }

  // ---------- documents ----------
  function rep(s, n) { var o = []; for (var i = 0; i < n; i++) o.push(s); return o.join(" "); }

  var docs = [];
  pubs.forEach(function (p) {
    var th = themeById[p.theme];
    docs.push({
      kind: "paper", id: p.id, ref: p,
      text: [rep(p.title, 3), rep(p.keywords, 2), th.title, th.zhTitle, p.summary.en, p.summary.zh,
        p.takeaway.en, p.takeaway.zh, p.abstract, p.venue, p.venueShort, p.authors.join(" "),
        (p.methods || []).join(" ")].join(" ")
    });
  });
  D.themes.forEach(function (t) {
    docs.push({ kind: "theme", id: t.id, ref: t,
      text: [rep(t.title, 3), rep(t.zhTitle, 2), rep(t.keywords, 3), t.blurb.en, t.blurb.zh].join(" ") });
  });
  D.education.forEach(function (e) {
    docs.push({ kind: "education", id: e.id, ref: e,
      text: [rep(e.degree, 2), rep(e.school, 2), e.years, e.note || "", e.zh,
        "education degree school university study studied graduate"].join(" ") });
  });
  D.tutorials.forEach(function (t) {
    docs.push({ kind: "tutorial", id: t.id, ref: t,
      text: [rep(t.title, 3), rep(t.keywords, 2), t.desc.en, t.desc.zh, "tutorial cheatsheet learn guide"].join(" ") });
  });
  D.writing.forEach(function (w) {
    docs.push({ kind: "writing", id: w.id, ref: w,
      text: [rep(w.title, 3), rep(w.keywords, 2), w.desc.en, w.desc.zh, "blog post writing article"].join(" ") });
  });
  D.gpts.forEach(function (g, i) {
    docs.push({ kind: "gpt", id: "gpt" + i, ref: g,
      text: [rep(g.name, 2), g.zh, g.desc, "gpt gpts custom chatgpt bot assistant"].join(" ") });
  });
  D.life.forEach(function (l) {
    docs.push({ kind: "life", id: l.id, ref: l,
      text: [rep(l.title, 2), rep(l.keywords, 3), l.en, l.zh, "hobby hobbies fun free time life personal"].join(" ") });
  });

  // ---------- BM25 ----------
  var K1 = 1.2, B = 0.75;
  var df = {}, avgLen = 0;
  docs.forEach(function (d) {
    d.tokens = tokenize(d.text, false);
    d.tf = {};
    d.tokens.forEach(function (tok) { d.tf[tok] = (d.tf[tok] || 0) + 1; });
    Object.keys(d.tf).forEach(function (tok) { df[tok] = (df[tok] || 0) + 1; });
    avgLen += d.tokens.length;
  });
  avgLen /= docs.length;
  var N = docs.length;

  function search(q, kinds) {
    var qt = tokenize(q, true);
    var seen = {}, terms = [];
    qt.forEach(function (t) { if (!seen[t]) { seen[t] = 1; terms.push(t); } });
    var res = [];
    docs.forEach(function (d) {
      if (kinds && kinds.indexOf(d.kind) === -1) return;
      var s = 0;
      terms.forEach(function (t) {
        var f = d.tf[t];
        if (!f) return;
        var idf = Math.log(1 + (N - df[t] + 0.5) / (df[t] + 0.5));
        s += idf * (f * (K1 + 1)) / (f + K1 * (1 - B + B * d.tokens.length / avgLen));
      });
      if (s > 0) res.push({ doc: d, score: s });
    });
    res.sort(function (a, b) { return b.score - a.score; });
    return { hits: res, terms: terms.length };
  }

  // ---------- intents ----------
  function has(q, re) { return re.test(q); }
  var INTENTS = [
    { id: "greet", w: 1, re: /^(hi|hello|hey|yo|hiya|good (morning|afternoon|evening)|你好|您好|嗨|哈喽|哈啰|hello there)[\s!！.。~～]*$/i },
    { id: "identity", w: 2, re: /(^\s*what are you\s*[?？!.]*$|are you (the |a )?(real|actual|human|person|bot|robot|ai|chatgpt|llm|hanjing)|real hanjing|real person|是真人|你是ai|你是 ai|机器人|你是真的|是ai吗|是不是ai|是不是真人|how do you work|how does (this|the) (work|guide)|\bllm\b|chatgpt)/i },
    { id: "about", w: 1.5, re: /(who are you|who is (hanjing|she)|about (yourself|hanjing|her)\b|introduce (yourself|hanjing|her)|tell me about (you|yourself|hanjing)\s*[?？!.]*$|你是谁|介绍一下(你|自己)?|自我介绍|她是谁)/i },
    { id: "private", w: 3, re: /(how old|your age|birthday|where are you from|hometown|married|boyfriend|girlfriend|husband|wife|partner|salary|home address|phone number|多大了|几岁|年龄|生日|哪里人|老家|结婚|男朋友|女朋友|对象|工资|住址|电话号码)/i },
    { id: "favorite", w: 1.6, re: /(favou?rite|best paper|most proud|代表作|最喜欢|最满意|最好的)/i },
    { id: "contact", w: 1.4, re: /(contact|e-?mail|reach (you|her)|get in touch|linkedin|github|collaborat|hire|hiring|recruit|internship|intern\b|job market|job\b|position|联系|邮箱|邮件|合作|实习|招聘|领英|求职|找工作)/i },
    { id: "cv", w: 1.6, re: /(\bcv\b|resume|résumé|curriculum vitae|简历)/i },
    { id: "advisor", w: 1.6, re: /(advisor|adviser|supervisor|mentor|\bpi\b|professor|lab\b|导师|老板|实验室|课题组)/i },
    { id: "coauthors", w: 1.5, re: /(co-?authors?|collaborators?|work with|worked with|合作者|合作的人|和谁)/i },
    { id: "eduStrong", w: 1.5, re: /(background|degree|undergrad|bachelor|master'?s?\b|\bms\b|\bbs\b|ph\.?d|doctora|alma mater|graduat|where did (you|she)|which (school|university)|学历|本科|硕士|博士|教育背景|毕业|哪个学校|哪所|读书|读研|读博|求学)/i },
    { id: "education", w: 1, re: /(education|school|universit|college|davis|georgetown|lehigh|学校|大学|教育)/i },
    { id: "tutorials", w: 1.4, re: /(tutorial|cheat ?sheet|learn (r|python|stat)|teach me|教程|学习资料|入门)/i },
    { id: "writing", w: 1.3, re: /(blog|writing|posts?\b|article|gpts?\b|博客|文章|写作|随笔)/i },
    { id: "life", w: 1.2, re: /(hobby|hobbies|free time|spare time|for fun|outside (of )?(work|research)|personal|life\b|cats?\b|kitt(y|ies|en)|cook|travel|road ?trips?|states?\b|driv(e|ing)|drove|coast|movie|film|weekend|eat\b|eating|food|foodie|restaurants?|cuisine|爱好|兴趣|业余|生活|猫|金渐层|做饭|烹饪|旅行|旅游|自驾|州|海岸|吃|美食|探店|电影|周末|平时)/i },
    { id: "methods", w: 1.2, re: /(method|methodology|how do you (do|study|conduct)|approach|experiment design|qualitative|quantitative|研究方法|方法论|怎么做研究)/i },
    { id: "news", w: 1.3, re: /(latest|newest|recent|what'?s new|news|lately|update|最新|最近|新动态|近况|新闻)/i },
    { id: "count", w: 1.3, re: /(how many (papers|publications)|number of (papers|publications)|几篇|多少篇|多少论文)/i },
    { id: "papers", w: 1.1, re: /(papers?|publications?|publish|preprints?|proceedings|list|论文|发表|文章列表|著作|成果|预印本)/i },
    { id: "research", w: 1.2, re: /(research|study|studies|work on|working on|interest|focus|topics?|field|area|about you|yourself|introduce|介绍|研究|方向|课题|领域|做什么|你是做)/i },
    { id: "opinion", w: 1.3, re: /(what do you think|your (view|opinion|take|stance|position)|do you (believe|think)|should (we|ai|people|platforms)|why does it matter|怎么看|看法|观点|认为|你觉得|立场|应不应该|应该)/i },
    { id: "video", w: 1.5, re: /(videos?|\btalks\b|your talk|presentations?|recordings?|\bwatch\b|youtube|lecture|conference photos?|视频|演讲|报告录像|讲解|参会|会议照片)/i },
    { id: "upcoming", w: 1.6, re: /(what'?s next|next (talk|presentation|conference|poster)|present(ing)? next|upcoming|coming up|接下来|下一场|下一个报告|即将)/i },
    { id: "photos", w: 1.6, re: /(photos?|pictures?|pics?\b|照片|图片|合影)/i },
    { id: "thanks", w: 1, re: /^(thanks?|thank you|thx|ty|谢谢|多谢|感谢)[\s!！.。~～]*$/i },
    { id: "bye", w: 1, re: /^(bye|goodbye|see you|再见|拜拜)[\s!！.。~～]*$/i },
    { id: "meow", w: 2, re: /(meow|purr|喵)/i },
    { id: "jump", w: 2, re: /^(jump|dance|spin|跳|跳舞|转圈)[\s!！.。~～]*$/i },
    { id: "night", w: 2, re: /^(night|dark|good night|晚安|夜晚|天黑|关灯)[\s!！.。~～]*$/i },
    { id: "day", w: 2, re: /^(day|light|good morning|morning|白天|天亮|开灯|早安)[\s!！.。~～]*$/i }
  ];

  function detect(q) {
    var scores = {};
    INTENTS.forEach(function (it) { if (has(q, it.re)) scores[it.id] = it.w; });
    return scores;
  }

  // ---------- render pieces ----------
  function authorsHtml(list) {
    return list.map(function (a) {
      return a === D.person.name ? "<b>" + esc(a) + "</b>" : esc(a);
    }).join(", ");
  }

  function paperLink(p) {
    var l = p.links;
    return l.paper || l.doi || l.arxiv || l.pdf || "#";
  }

  function paperCard(p, lang, opts) {
    opts = opts || {};
    var th = themeById[p.theme];
    var v = videoFor(p.id);
    var h = '<article class="g-card" style="--tc:' + th.color + '">' +
      '<div class="g-kicker"><span class="g-dot"></span>' + esc(p.venueShort) + " · " + esc(pick(lang, TYPE_LABEL[p.type])) + "</div>" +
      '<a class="g-title" href="' + esc(paperLink(p)) + '" target="_blank" rel="noopener">' + esc(p.title) + "</a>";
    if (opts.authors) h += '<div class="g-authors">' + authorsHtml(p.authors) + "</div>";
    h += '<p class="g-text">' + esc(pick(lang, opts.takeaway ? p.takeaway : p.summary)) + "</p>";
    h += '<div class="g-actions">';
    if (!opts.noMore) h += '<button type="button" class="g-btn" data-paper="' + esc(p.id) + '">' + (lang === "zh" ? "展开讲讲" : "Tell me more") + "</button>";
    if (p.links.pdf) h += '<a class="g-link" href="' + esc(p.links.pdf) + '" target="_blank" rel="noopener">PDF</a>';
    if (v) h += '<button type="button" class="g-btn g-video" data-video="' + esc(p.id) + '">▶ ' + (lang === "zh" ? "视频" : "Video") + "</button>";
    h += "</div></article>";
    return h;
  }

  function linkList(items) {
    return '<ul class="g-list">' + items.map(function (it) {
      return "<li>" + (it.href ? '<a href="' + esc(it.href) + '" target="_blank" rel="noopener">' + esc(it.label) + "</a>" : esc(it.label)) +
        (it.note ? ' <span class="g-muted">' + esc(it.note) + "</span>" : "") + "</li>";
    }).join("") + "</ul>";
  }

  function contactItems(lang) {
    var L = D.person.links, items = [];
    if (L.email) items.push({ label: L.email, href: "mailto:" + L.email });
    items.push({ label: "Google Scholar", href: L.scholar });
    if (L.linkedin) items.push({ label: "LinkedIn", href: L.linkedin });
    if (L.github) items.push({ label: "GitHub", href: L.github });
    if (L.cv) items.push({ label: lang === "zh" ? "简历 (CV)" : "CV", href: L.cv });
    return items;
  }

  function counts() {
    var c = { proceedings: 0, workshop: 0, poster: 0, preprint: 0 };
    pubs.forEach(function (p) { c[p.type]++; });
    return c;
  }

  var DISCLAIMER = {
    en: "I only speak from Hanjing's published work — for anything beyond it, ask her directly.",
    zh: "我只根据 Hanjing 已公开的论文回答；超出这些的问题，建议直接问她本人。"
  };

  function themeChips(lang) {
    return D.themes.map(function (t) { return lang === "zh" ? t.zhTitle : t.title; });
  }

  var START_CHIPS = {
    en: ["What do you research?", "Show me your papers", "What's new?", "Education", "What do you do for fun?", "Are you the real Hanjing?"],
    zh: ["你研究什么？", "看看你的论文", "最近有什么新动态？", "教育背景", "工作之外喜欢做什么？", "你是真人吗？"]
  };

  // ---------- answer builders ----------
  function A(lang, text, html, chips, go, extra) {
    var o = { lang: lang, text: text, html: html || "", chips: chips || [], go: go || null };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }

  function greet(lang) {
    return A(lang, lang === "zh"
      ? "嗨！我是迷你版的 Hanjing 👋 Lehigh University 计算机系的博士生，做人机交互（HCI）研究。想了解我的研究、论文，还是随便逛逛？"
      : "Hi! I'm Mini-Hanjing 👋 — a pocket-sized guide to Hanjing Shi, a Ph.D. student in Computer Science & Engineering at Lehigh University working on human–AI interaction. Ask me anything, or pick a place to visit.",
      "", START_CHIPS[lang]);
  }

  function identity(lang) {
    return A(lang, lang === "zh"
      ? "我不是 Hanjing 本人，而是她的“迷你分身”——一个脚本化的向导。我没有接入任何大模型：所有回答都来自她公开的论文和资料，并附上出处；你输入的内容也不会被发送到任何地方。这其实和她自己的研究有关：她研究 AI 分身替真人说话时的权威与问责，所以我被设计成“只说有出处的话”。"
      : "I'm not Hanjing herself — I'm her scripted mini-avatar. There's no large language model behind me: every answer is assembled from her public papers and profile, with a link to the source, and nothing you type leaves your browser. That's deliberate — Hanjing studies what happens when AI personas speak for real people, so I only say things I can cite.",
      '<p class="g-note">' + esc(pick(lang, DISCLAIMER)) + "</p>" +
      paperCard(pubById["his-name"], lang, { noMore: false }),
      lang === "zh" ? ["你研究什么？", "看看你的论文", "怎么联系你？"] : ["What do you research?", "Show me your papers", "How can I contact you?"]);
  }

  function researchOverview(lang) {
    var html = '<div class="g-themes">' + D.themes.map(function (t) {
      var n = pubs.filter(function (p) { return p.theme === t.id; }).length;
      return '<button type="button" class="g-theme" style="--tc:' + t.color + '" data-ask="' + esc(lang === "zh" ? t.zhTitle : t.title) + '">' +
        '<span class="g-theme-title">' + esc(lang === "zh" ? t.zhTitle : t.title) + "</span>" +
        '<span class="g-theme-n">' + n + (lang === "zh" ? " 篇" : n === 1 ? " paper" : " papers") + "</span></button>";
    }).join("") + "</div>";
    return A(lang, lang === "zh"
      ? "我研究当 AI 不再只是工具，而是以队友、智能体、辅导老师，甚至真实的人的“分身”出现时，人如何保持实质的掌控——AI 的帮助如何被披露、说法如何被验证、系统替我们行动时谁来负责。我的工作可以分成五条线："
      : "I study what changes when AI stops being just a tool and starts acting as a teammate, an agent, a tutor — or a persona of a real person — and what keeps people meaningfully in charge: how AI help is disclosed, how claims get verified, and who stays accountable. My work falls into five threads:",
      html, themeChips(lang).slice(0, 3).concat(lang === "zh" ? ["研究方法"] : ["Your methods?"]), "research");
  }

  function themeAnswer(t, lang) {
    var list = pubs.filter(function (p) { return p.theme === t.id; });
    var html = list.slice(0, 4).map(function (p) { return paperCard(p, lang); }).join("");
    if (list.length > 4) html += '<p class="g-muted">' + (lang === "zh" ? "还有 " + (list.length - 4) + " 篇在藏书阁里。" : "+" + (list.length - 4) + " more on the shelf.") + "</p>";
    return A(lang, pick(lang, t.blurb), html,
      themeChips(lang).filter(function (c) { return c !== (lang === "zh" ? t.zhTitle : t.title); }).slice(0, 3),
      "research", { focus: { theme: t.id } });
  }

  function paperDetail(p, lang) {
    var th = themeById[p.theme];
    var html = paperCard(p, lang, { authors: true, noMore: true }) +
      '<div class="g-block"><div class="g-label">' + (lang === "zh" ? "核心观点" : "Key point") + "</div><p>" + esc(pick(lang, p.takeaway)) + "</p></div>" +
      '<div class="g-block"><div class="g-label">' + (lang === "zh" ? "方法" : "Methods") + "</div><p>" + esc((p.methods || []).join(" · ")) + "</p></div>" +
      '<div class="g-block"><div class="g-label">' + (lang === "zh" ? "发表于" : "Venue") + "</div><p>" + esc(p.venue) + "</p></div>";
    var chips = [lang === "zh" ? th.zhTitle : th.title, lang === "zh" ? "最近有什么新动态？" : "What's new?"];
    return A(lang, lang === "zh" ? "这篇是《" + p.title + "》。" + pick(lang, p.summary) : "“" + p.title + "” — " + pick(lang, p.summary),
      html, chips, "research", { focus: { paper: p.id } });
  }

  function papersList(lang, matches) {
    var c = counts();
    var text = lang === "zh"
      ? "目前一共 " + pubs.length + " 项：" + c.proceedings + " 篇正式发表（ICWSM、ACM WebSci、AIED、CHI EA、PMLR），" + c.workshop + " 篇 workshop / 会议报告，" + c.poster + " 张会议海报，" + c.preprint + " 篇预印本。最新的几项："
      : "There are " + pubs.length + " so far: " + c.proceedings + " in proceedings (ICWSM, ACM WebSci, AIED, CHI EA, PMLR), " + c.workshop + " workshop papers / presentations, " + c.poster + " conference posters, and " + c.preprint + " preprints. The latest few:";
    if (matches && matches.length) text = lang === "zh" ? "和你的问题最相关的论文：" : "These papers are the closest match:";
    var list = matches && matches.length ? matches : pubs.slice(0, 3);
    return A(lang, text, list.map(function (p) { return paperCard(p, lang); }).join(""),
      lang === "zh" ? ["只看正式发表的", "人格化 AI 与数字来生", "你研究什么？"] : ["Only peer-reviewed ones", "Persona AI & Digital Afterlives", "What do you research?"],
      "research", matches && matches.length ? { focus: { paper: list[0].id } } : null);
  }

  var VENUES = [["cscw", "CSCW"], ["aies", "AIES"], ["chi", "CHI"], ["icwsm", "ICWSM"], ["websci", "WebSci"], ["web science", "WebSci"], ["aied", "AIED"],
    ["ic2s2", "IC2S2"], ["computational social science", "IC2S2"], ["hcii", "HCII"], ["pmlr", "PMLR"]];

  function venueOf(q) {
    for (var i = 0; i < VENUES.length; i++) {
      if (new RegExp("\\b" + VENUES[i][0] + "\\b", "i").test(q)) return VENUES[i][1];
    }
    return null;
  }

  function papersAtVenue(lang, label) {
    var list = pubs.filter(function (p) { return (p.venueShort + " " + p.venue).toLowerCase().indexOf(label.toLowerCase()) !== -1; });
    if (!list.length) return null;
    return A(lang, lang === "zh" ? "在 " + label + " 的论文（共 " + list.length + " 篇）：" : "My work at " + label + " (" + list.length + "):",
      list.map(function (p) { return paperCard(p, lang); }).join(""),
      lang === "zh" ? ["只看正式发表的", "看看你的论文"] : ["Only peer-reviewed ones", "Show me your papers"], "research",
      { focus: { paper: list[0].id } });
  }

  function about(lang) {
    return A(lang, pick(lang, { en: D.person.bio.en[0], zh: D.person.bio.zh[0] }),
      '<p class="g-note">' + (lang === "zh"
        ? "（我是她的迷你分身，一个只根据公开资料回答的脚本向导。）"
        : "(I'm her mini-avatar — a scripted guide that only answers from her public work.)") + "</p>",
      lang === "zh" ? ["你研究什么？", "教育背景", "工作之外喜欢做什么？"] : ["What do you research?", "Education", "What do you do for fun?"], "home");
  }

  function privateQ(lang) {
    return A(lang, lang === "zh"
      ? "这个属于个人隐私，我这里不提供～我只介绍 Hanjing 公开的学术和兴趣信息。"
      : "That's personal, so I'll keep it private — I only share Hanjing's public academic profile and the hobbies she's written about.",
      "", START_CHIPS[lang].slice(0, 4));
  }

  function favorite(lang) {
    var full = pubs.filter(function (p) { return p.id === "covid-framing" || p.id === "designing-safety"; });
    return A(lang, lang === "zh"
      ? "我不替她挑“最喜欢”的——这得问她本人。不过这两篇是她目前发表的完整长文（ICWSM 2026 和 ACM WebSci 2026）："
      : "I won't pick favorites on her behalf — that's one to ask her. But these two are her full-length conference papers so far (ICWSM 2026 and ACM WebSci 2026):",
      full.map(function (p) { return paperCard(p, lang); }).join(""),
      lang === "zh" ? ["最近有什么新动态？", "你研究什么？"] : ["What's new?", "What do you research?"], "research");
  }

  function peerReviewed(lang) {
    var list = pubs.filter(function (p) { return p.type === "proceedings"; });
    return A(lang, lang === "zh" ? "正式发表（收录于会议论文集）的有这些：" : "Here are the ones published in proceedings:",
      list.map(function (p) { return paperCard(p, lang); }).join(""),
      lang === "zh" ? ["预印本有哪些？", "你研究什么？"] : ["What about preprints?", "What do you research?"], "research", { focus: { filter: "proceedings" } });
  }

  function postersList(lang) {
    var list = pubs.filter(function (p) { return p.type === "poster"; });
    return A(lang, lang === "zh" ? "会议海报（在报告厅的画架上）：" : "My conference posters — they're on the easels in the lecture hall:",
      list.map(function (p) { return paperCard(p, lang); }).join(""),
      lang === "zh" ? ["有报告视频吗？", "你研究什么？"] : ["Do you have video talks?", "What do you research?"], "talks", { focus: { posters: true } });
  }

  function preprints(lang) {
    var list = pubs.filter(function (p) { return p.type === "preprint"; });
    return A(lang, lang === "zh" ? "预印本（还在审稿或准备投稿中）：" : "Preprints (under review or in preparation):",
      list.slice(0, 5).map(function (p) { return paperCard(p, lang); }).join(""),
      lang === "zh" ? ["只看正式发表的", "你研究什么？"] : ["Only peer-reviewed ones", "What do you research?"], "research", { focus: { filter: "preprint" } });
  }

  function news(lang) {
    var html = '<ul class="g-news">' + D.news.slice(0, 5).map(function (n) {
      return '<li><span class="g-date">' + esc(n.date) + "</span> " + esc(pick(lang, n)) +
        (n.paper ? ' <button type="button" class="g-inline" data-paper="' + esc(n.paper) + '">' + (lang === "zh" ? "看看" : "view") + "</button>" : "") + "</li>";
    }).join("") + "</ul>";
    return A(lang, lang === "zh" ? "最近的动态：" : "Here's what's new:", html,
      lang === "zh" ? ["看看你的论文", "你研究什么？"] : ["Show me your papers", "What do you research?"], "home");
  }

  function education(lang) {
    var html = '<ol class="g-timeline">' + D.education.map(function (e) {
      return "<li><b>" + esc(e.degree) + "</b><br>" + esc(e.school) + (e.years ? " · " + esc(e.years) : "") +
        (e.note ? '<br><span class="g-muted">' + esc(e.note) + "</span>" : "") + "</li>";
    }).join("") + "</ol>";
    return A(lang, lang === "zh"
      ? "我的求学路线：UC Davis 计算机科学与统计学本科 → Georgetown 数据科学与分析硕士 → 2023 年起在 Lehigh 读计算机科学与工程博士，导师是 Dominic DiFranzo 教授。"
      : "My path so far: a B.S. in Computer Science and Statistics at UC Davis → an M.S. in Data Science and Analytics at Georgetown → since 2023, a Ph.D. in Computer Science and Engineering at Lehigh, advised by Prof. Dominic DiFranzo.",
      html, lang === "zh" ? ["你研究什么？", "你的导师是谁？"] : ["What do you research?", "Who is your advisor?"], "education");
  }

  function advisor(lang) {
    return A(lang, lang === "zh"
      ? "我的导师是 Lehigh University 的 Dominic DiFranzo 教授。我的大部分论文都是和他合作完成的。"
      : "My advisor is Prof. Dominic DiFranzo at Lehigh University — he's a co-author on most of my papers.",
      "", lang === "zh" ? ["你和谁合作？", "教育背景"] : ["Who do you work with?", "Education"], "education");
  }

  function coauthors(lang) {
    var countBy = {};
    pubs.forEach(function (p) { p.authors.forEach(function (a) { if (a !== D.person.name) countBy[a] = (countBy[a] || 0) + 1; }); });
    var names = Object.keys(countBy).sort(function (a, b) { return countBy[b] - countBy[a] || (a < b ? -1 : 1); });
    var html = linkList(names.map(function (n) {
      return { label: n, note: countBy[n] + (lang === "zh" ? " 篇" : countBy[n] === 1 ? " paper" : " papers") };
    }));
    return A(lang, lang === "zh" ? "和我合作过的人（按合作论文数）：" : "People I've written papers with (by number of papers together):",
      html, lang === "zh" ? ["你的导师是谁？", "看看你的论文"] : ["Who is your advisor?", "Show me your papers"], "research");
  }

  function methods(lang) {
    var picks = ["designing-safety", "readability-evaluability", "visibility-verification", "reduced-supervision", "classpulse"];
    return A(lang, lang === "zh"
      ? "我会混合使用多种方法：在线随机实验（比如 N = 309、306、270 的实验）；在 Reddit、小红书等平台上做计算社会科学分析（主题模型、生存分析、句法框架模型）；对 AI 系统和研究文献做结构化审计（63 份材料、93 个系统、86 篇全文）；定性主题分析；以及自己动手做研究系统，比如 ClassPulse 和 Outer Limits。"
      : "I mix methods: randomized online experiments (e.g., N = 309, 306, 270); computational social science on Reddit and RedNote (topic modeling, survival analysis, syntactic framing models); structured audits of AI systems and research literature (63 artifacts, 93 systems, 86 full texts); qualitative thematic analysis; and building research systems such as ClassPulse and Outer Limits.",
      picks.slice(0, 3).map(function (id) { return paperCard(pubById[id], lang); }).join(""),
      lang === "zh" ? ["你研究什么？", "看看你的论文"] : ["What do you research?", "Show me your papers"], "research");
  }

  function tutorials(lang, focusId) {
    var list = focusId ? D.tutorials.filter(function (t) { return t.id === focusId; }) : D.tutorials;
    var html = linkList(list.map(function (t) { return { label: t.title, href: t.href, note: pick(lang, t.desc) }; }));
    return A(lang, lang === "zh"
      ? "这些是我写的教程（内容是中文的），都在打字机那里："
      : "These are tutorials I wrote (the content is in Chinese) — you'll find them at the typewriter:",
      html, lang === "zh" ? ["博客", "工作之外喜欢做什么？"] : ["Your blog?", "What do you do for fun?"], "tutorials");
  }

  function writing(lang, focusId) {
    var posts = D.writing.slice();
    if (focusId) posts.sort(function (a, b) { return (b.id === focusId) - (a.id === focusId); });
    var html = linkList(posts.map(function (w) { return { label: w.title, href: w.href, note: pick(lang, w.desc) }; })) +
      '<div class="g-label">' + (lang === "zh" ? "我做的 GPTs" : "Custom GPTs I built") + "</div>" +
      linkList(D.gpts.map(function (g) { return { label: lang === "zh" ? g.name + " · " + g.zh : g.name, href: g.href, note: g.desc }; }));
    var text = lang === "zh" ? "我的书桌：两篇统计学博客，以及我做的一些 GPTs。" : "My writing desk: two statistics blog posts, plus the custom GPTs I've built.";
    if (focusId) {
      var f = posts[0];
      text = (lang === "zh" ? "我写过一篇《" + f.title + "》：" : "I wrote a post on this — “" + f.title + "”: ") + pick(lang, f.desc);
    }
    return A(lang, text, html, lang === "zh" ? ["教程", "工作之外喜欢做什么？"] : ["Tutorials", "What do you do for fun?"], "writing");
  }

  function life(lang, focusId) {
    var list = focusId ? D.life.filter(function (l) { return l.id === focusId; }) : D.life;
    var html = '<ul class="g-list">' + list.map(function (l) { return "<li><b>" + esc(l.title) + "</b> — " + esc(pick(lang, l)) + "</li>"; }).join("") + "</ul>";
    var text = focusId ? pick(lang, list[0]) : (lang === "zh" ? "下班之后的我：六只猫、环美自驾、美食，还有写博客。" : "Off the clock: my six cats, road trips around the U.S., food, and blogging.");
    return A(lang, text, focusId ? "" : html,
      lang === "zh" ? ["你研究什么？", "怎么联系你？"] : ["What do you research?", "How can I contact you?"], "life",
      focusId ? { focus: { life: focusId }, action: focusId === "cats" ? "meow" : undefined } : null);
  }

  function contact(lang) {
    var L = D.person.links;
    var text = lang === "zh"
      ? "想聊研究或合作，欢迎联系我！" + (L.email ? "" : "（邮箱我很快会补上，现在可以先通过 LinkedIn 或 Google Scholar 找到我。）")
      : "Happy to talk research or collaboration!" + (L.email ? "" : " (Email is coming soon — for now, LinkedIn or Google Scholar are the best way to reach me.)");
    return A(lang, text, linkList(contactItems(lang)),
      lang === "zh" ? ["你研究什么？", "看看你的论文"] : ["What do you research?", "Show me your papers"], "contact");
  }

  function cv(lang) {
    var L = D.person.links;
    if (L.cv) return A(lang, lang === "zh" ? "这是我的简历：" : "Here's my CV:", linkList([{ label: "CV (PDF)", href: L.cv }]), [], "contact");
    return A(lang, lang === "zh"
      ? "简历还没挂上来。完整的论文列表可以看 Google Scholar，或者去藏书阁逛逛。"
      : "My CV isn't posted here yet. For a full publication list, see Google Scholar — or browse the library.",
      linkList([{ label: "Google Scholar", href: L.scholar }]),
      lang === "zh" ? ["看看你的论文", "怎么联系你？"] : ["Show me your papers", "How can I contact you?"], "contact");
  }

  function videos(lang) {
    if (!D.videos.length) {
      return A(lang, lang === "zh"
        ? "我会在 LinkedIn 上发论文的讲解视频，很快也会放到这里。现在可以先去 LinkedIn 看看。"
        : "I post short video walkthroughs of my papers on LinkedIn — they'll be collected here soon. For now, you can find them on my LinkedIn.",
        linkList([{ label: "LinkedIn", href: D.person.links.linkedin }]),
        lang === "zh" ? ["看看你的论文", "你研究什么？"] : ["Show me your papers", "What do you research?"], "research");
    }
    var html = D.videos.map(function (v) {
      var p = pubById[v.paper];
      return p ? paperCard(p, lang) : "";
    }).join("");
    return A(lang, lang === "zh" ? "这几场报告有录像——去报告厅坐下来看吧：" : "I've recorded these talks — come take a seat in my lecture hall:", html,
      lang === "zh" ? ["看看你的海报", "你研究什么？"] : ["Show me your posters", "What do you research?"], "talks");
  }

  function photos(lang) {
    return A(lang, lang === "zh"
      ? "会议现场的照片（CSSSA 2025、ICWSM 2026、AIED 2026）挂在报告厅的照片墙上，点开可以看大图："
      : "Photos from CSSSA 2025, ICWSM 2026 and AIED 2026 hang on the photo wall in my lecture hall — click any one to see it large:",
      "", lang === "zh" ? ["有报告视频吗？", "看看你的海报"] : ["Do you have video talks?", "Show me your posters"], "talks", { focus: { photos: true } });
  }

  function upcoming(lang) {
    var list = pubs.filter(function (p) { return p.upcoming; });
    if (!list.length) return news(lang);
    return A(lang, lang === "zh" ? "下一场：我马上要去展示这张海报——" : "Next up — I'm about to present this one:",
      list.map(function (p) { return paperCard(p, lang); }).join(""),
      lang === "zh" ? ["看看你的海报", "最近有什么新动态？"] : ["Show me your posters", "What's new?"], "talks", { focus: { posters: true } });
  }

  function opinion(q, lang) {
    var r = search(q, ["paper"]);
    var top = r.hits.filter(function (h) { return h.score > 1.2; }).slice(0, 2);
    if (!top.length) {
      return A(lang, lang === "zh"
        ? "这个问题我在她的论文里找不到直接的依据，所以不替她下结论。可以换个和她研究相关的问法，或者直接问她本人。"
        : "I can't find anything in her papers that speaks to that, so I won't put words in her mouth. Try asking about one of her research topics — or ask her directly.",
        '<p class="g-note">' + esc(pick(lang, DISCLAIMER)) + "</p>", themeChips(lang).slice(0, 3), null);
    }
    return A(lang, lang === "zh" ? "这是我在论文里提出过的观点：" : "Here's what I've argued in my papers:",
      top.map(function (h) { return paperCard(h.doc.ref, lang, { takeaway: true }); }).join("") +
      '<p class="g-note">' + esc(pick(lang, DISCLAIMER)) + "</p>",
      lang === "zh" ? ["你研究什么？", "看看你的论文"] : ["What do you research?", "Show me your papers"], "research",
      { focus: { paper: top[0].doc.ref.id } });
  }

  function fallback(lang) {
    return A(lang, lang === "zh"
      ? "这个我不太确定——我只知道 Hanjing 公开的论文、教程和个人资料里的内容。可以试试下面这些问题："
      : "Hmm, I'm not sure about that one — I only know what's in Hanjing's public papers, tutorials and profile. Try one of these:",
      "", START_CHIPS[lang].slice(0, 5));
  }

  // Answer from retrieval hits (no strong intent).
  function fromHits(q, lang, hits) {
    var top = hits[0];
    var d = top.doc;
    if (d.kind === "theme") {
      // A specific topic word ("covid", "新冠") should land on its paper; a broad one ("agents") on the theme.
      var ph = hits.filter(function (h) { return h.doc.kind === "paper"; });
      if (ph[0] && ph[0].score >= top.score * 0.9 && (!ph[1] || ph[0].score >= ph[1].score * 1.3)) return paperDetail(ph[0].doc.ref, lang);
      return themeAnswer(d.ref, lang);
    }
    if (d.kind === "paper") {
      var papers = hits.filter(function (h) { return h.doc.kind === "paper" && h.score > top.score * 0.6; }).slice(0, 3);
      if (papers.length === 1 || papers[0].score > (papers[1] ? papers[1].score * 1.6 : 0)) return paperDetail(d.ref, lang);
      return A(lang, lang === "zh" ? "这几篇论文和你的问题最相关：" : "These papers are the closest match:",
        papers.map(function (h) { return paperCard(h.doc.ref, lang); }).join(""),
        themeChips(lang).slice(0, 3), "research", { focus: { paper: papers[0].doc.ref.id } });
    }
    if (d.kind === "tutorial") return tutorials(lang, d.id);
    if (d.kind === "writing") return writing(lang, d.id);
    if (d.kind === "gpt") return writing(lang);
    if (d.kind === "life") return life(lang, lifeFocus(hits));
    if (d.kind === "education") return education(lang);
    return fallback(lang);
  }

  // ---------- main ----------
  function answer(raw, preferLang) {
    var q = String(raw || "").trim();
    var lang = q ? (isZh(q) ? "zh" : "en") : (preferLang || "en");
    if (!q) return greet(lang);
    var ql = q.toLowerCase();

    // Direct routes from buttons: "paper:<id>", "theme:<id>".
    var m = /^paper:([\w-]+)$/.exec(q);
    if (m && pubById[m[1]]) return paperDetail(pubById[m[1]], preferLang || "en");
    m = /^theme:([\w-]+)$/.exec(q);
    if (m && themeById[m[1]]) return themeAnswer(themeById[m[1]], preferLang || "en");

    // Exact theme title (e.g. from a chip).
    for (var i = 0; i < D.themes.length; i++) {
      var t = D.themes[i];
      if (ql === t.title.toLowerCase() || q === t.zhTitle) return themeAnswer(t, lang);
    }

    var it = detect(q);
    if (it.meow) return A(lang, lang === "zh" ? "喵～（猫猫表示同意）" : "Meow! (The cat approves.)", "", [], null, { action: "meow" });
    if (it.jump) return A(lang, lang === "zh" ? "好嘞！" : "Wheee!", "", [], null, { action: "jump" });
    if (it.night) return A(lang, lang === "zh" ? "天黑啦，点亮灯笼。" : "Lanterns on — it's night in my world.", "", [], null, { action: "night" });
    if (it.day) return A(lang, lang === "zh" ? "天亮啦！" : "Good morning!", "", [], null, { action: "day" });
    if (it.greet) return greet(lang);
    if (it.thanks) return A(lang, lang === "zh" ? "不客气！还想了解什么？" : "Anytime! Anything else you'd like to know?", "", START_CHIPS[lang].slice(0, 4));
    if (it.bye) return A(lang, lang === "zh" ? "再见！欢迎常回来逛逛 👋" : "Bye! Come back and wander anytime 👋", "", [], null, { action: "wave" });
    if (it.private) return privateQ(lang);
    if (it.identity) return identity(lang);
    if (it.about) return about(lang);

    var hits = search(q).hits;
    var top = hits[0];
    // Is the question about a specific research topic ("papers about trust", "work on education")?
    var topical = !!top && (top.doc.kind === "paper" || top.doc.kind === "theme") && top.score > 3;
    var aboutTopic = /((work|research|papers?|publications?|projects?|stud(y|ies)|anything|something)\s+(on|about|in|related to|regarding)\b|关于|有关|相关)/i.test(q);
    var saysAI = /(\bai\b|artificial intelligence|人工智能|[㐀-鿿]\s*ai|ai\s*[㐀-鿿])/i.test(q);

    var venue = venueOf(q);
    if (it.photos && (it.video || venue || /(conference|会议|参会|现场|talk|present)/i.test(q))) return photos(lang);
    if (venue && !it.opinion) { var va = papersAtVenue(lang, venue); if (va) return va; }
    if (it.upcoming) return upcoming(lang);
    if (it.video) return videos(lang);
    if (it.cv) return cv(lang);
    if (it.contact) return contact(lang);
    if (it.count) return papersList(lang);
    if (it.favorite && !it.life) return favorite(lang);
    if (it.opinion) return opinion(q, lang);
    if (it.advisor && !it.papers) return advisor(lang);
    if (it.coauthors) return coauthors(lang);
    if (/(peer[- ]?review|published|proceedings|正式发表|已发表|同行评审)/i.test(q)) return peerReviewed(lang);
    if (/(preprint|arxiv|under review|预印本|在投)/i.test(q)) return preprints(lang);
    if (/(posters?|海报)/i.test(q) && !aboutTopic) return postersList(lang);
    if (it.news && !(topical && aboutTopic)) return news(lang);
    if (it.methods) return methods(lang);

    // "What's your PhD research about?" is about research, not about the degree.
    var researchWord = /(research|研究)/i.test(q) && !/(where|which|degree|school|universit|哪里|哪儿|哪个|哪所|学历|学位)/i.test(q);
    if (it.eduStrong && !researchWord) return education(lang);
    if (it.education && !aboutTopic && !saysAI && !researchWord) return education(lang);

    if ((it.papers || aboutTopic) && topical) {
      if (top.doc.kind === "theme") return fromHits(q, lang, hits);
      var ps = hits.filter(function (h) { return h.doc.kind === "paper" && h.score > top.score * 0.5; })
        .slice(0, 3).map(function (h) { return h.doc.ref; });
      return papersList(lang, ps);
    }
    if (it.papers) return papersList(lang);
    if (it.tutorials) return tutorials(lang, top && top.doc.kind === "tutorial" && top.score > 2 ? top.doc.id : null);
    if (it.writing) return writing(lang, top && top.doc.kind === "writing" && top.score > 3 ? top.doc.id : null);
    if (it.life) return life(lang, lifeFocus(hits));
    if (it.research && topical) return fromHits(q, lang, hits);
    if (it.research) return researchOverview(lang);
    if (it.news) return news(lang);
    if (top && top.score > 1.6) return fromHits(q, lang, hits);
    if (it.research || it.eduStrong) return it.research ? researchOverview(lang) : education(lang);
    return fallback(lang);
  }

  // Focus on one hobby only when the question clearly names it.
  function lifeFocus(hits) {
    var ls = hits.filter(function (h) { return h.doc.kind === "life"; });
    if (!ls.length || ls[0].score < 3) return null;
    if (ls[1] && ls[0].score < ls[1].score * 1.5) return null;
    return ls[0].doc.id;
  }

  window.HJGuide = {
    answer: answer,
    greet: greet,
    startChips: function (lang) { return START_CHIPS[lang] || START_CHIPS.en; },
    paperCard: paperCard,
    esc: esc,
    pick: pick,
    isZh: isZh,
    search: search,
    pubs: pubs,
    pubById: pubById,
    themeById: themeById,
    typeLabel: TYPE_LABEL,
    videoFor: videoFor,
    contactItems: contactItems
  };
})();
