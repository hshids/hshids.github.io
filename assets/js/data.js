/*
 * Hanjing Shi — site content (single source of truth).
 *
 * Both versions of the site read from this file:
 *   - index.html  (interactive world + Mini-Hanjing guide)
 *   - basic.html  (one-page basic version)
 * To update the site, edit this file only. See README.md for recipes
 * (adding a paper, a news item, or a LinkedIn video).
 *
 * Sources used for the first version (checked 2026-09-29):
 *   Google Scholar profile XezXPNQAAAAJ, arXiv author search,
 *   Crossref / Semantic Scholar (DOIs), PMLR v339, Lehigh CSE PhD student list,
 *   and the previous about.html / tutorials.html / blog.html pages.
 */
window.HJ_DATA = {
  updated: "2026-09-29",

  person: {
    name: "Hanjing Shi",
    role: "HCI & AI Researcher",   // the headline under her name; the bio says where she is now
    location: "Bethlehem, PA",
    advisor: { name: "Dominic DiFranzo", url: "https://difranzo.com/" },
    tagline: {
      en: "I study how people stay meaningfully in charge when AI becomes a teammate, an agent, or a persona.",
      zh: "我研究当 AI 成为队友、智能体或“分身”时，人如何保持实质的掌控。"
    },
    interests: [
      "Human-AI Interaction",
      "Human-AI Teaming",
      "Agentic AI & Accountability",
      "Online Communities",
      "Experimental Design"
    ],
    bio: {
      en: [
        "I'm a Ph.D. candidate in Computer Science and Engineering at Lehigh University, advised by Dr. Dominic DiFranzo. As an HCI researcher, building things is my window into how the world works, and this site is where I share my ideas and my stories.",
        "My research asks what changes when AI stops being just a tool and starts acting as a teammate, an agent, a tutor, or even a persona of a real person. I focus on the structures that keep people meaningfully in charge, such as how AI help is disclosed, how claims get verified, and who remains accountable when systems act on our behalf.",
        "To answer these questions, I run online experiments, study online communities such as Reddit and RedNote, audit AI systems and the research literature, and build research prototypes. Before Lehigh, I earned an M.S. in Data Science and Analytics at Georgetown University and a B.S. in Computer Science and Statistics at UC Davis."
      ],
      zh: [
        "我是 Lehigh University 计算机科学与工程系的博士候选人，导师是 Dominic DiFranzo 博士。作为一名 HCI 研究者，动手做东西是我认识这个世界的窗口，在这里，你可以看到我的想法和我的故事。",
        "我的研究关心的是，当 AI 不再只是工具，而是以队友、智能体、辅导老师，甚至某个真实的人的“分身”出现时，会发生什么变化？我尤其关注那些让人保有实质掌控的机制，比如 AI 的帮助如何被披露、说法如何被验证、系统替我们行动时谁来负责。",
        "为了回答这些问题，我做在线实验、研究 Reddit 和小红书等线上社区、对 AI 系统和研究文献做结构化审计，也设计和开发研究原型。来 Lehigh 之前，我在 Georgetown University 获得数据科学与分析硕士学位，在 UC Davis 获得计算机科学与统计学学士学位。"
      ]
    },
    photo: "images/profile-qipao.jpg",   // the basic version's profile picture
    // Portraits for the "meet the real me" photo booth in the interactive version.
    portraits: [
      "images/portraits/white-shirt.jpg",
      "images/portraits/trench-coat.jpg",
      "images/portraits/qipao.jpg",
      "images/portraits/hand-on-cheek.jpg",
      "images/portraits/white-studio.jpg",
      "images/portraits/black-dress.jpg"
    ],
    links: {
      scholar: "https://scholar.google.com/citations?user=XezXPNQAAAAJ&hl=en",
      linkedin: "https://www.linkedin.com/in/hanjing-shi-1803561ab/",
      github: "https://github.com/hshids",
      rednote: "https://www.xiaohongshu.com/user/profile/64953c480000000012035cf9", // RedNote (Xiaohongshu), her main blog
      email: "hasa23@lehigh.edu", // as printed on the CSCW / AIES 2026 posters; set to "" to hide
      cv: ""     // e.g. "files/Hanjing_Shi_CV.pdf" — shown once filled in
    }
  },

  education: [
    {
      id: "phd",
      degree: "Ph.D., Computer Science and Engineering",
      school: "Lehigh University",
      years: "Since 2023",
      note: "Advised by Dr. Dominic DiFranzo",
      emblem: "mountain",
      zh: "Lehigh University 计算机科学与工程 博士（2023 年至今），导师 Dominic DiFranzo 博士",
      honors: [
        { en: "AIES 2026 Student Program, travel award and complimentary registration", zh: "AIES 2026 Student Program 旅费资助和免注册费" },
        { en: "Lehigh University Fellowship, doctoral fellowship for my first semester (Fall 2023)", zh: "Lehigh University Fellowship，博士第一学期奖学金（2023 年秋季）" }
      ],
      // Things I did along the way. Not my main research line, but part of the story.
      alongside: [
        { role: "Ph.D. Mentor", org: "Rossin Research Scholars (RRS) Program", when: "2025 to 2026",
          en: "Selected as a Ph.D. mentor with research support, guiding an undergraduate researcher through spring, a full-time summer and fall.",
          zh: "入选 Rossin Research Scholars 博士导师并获得研究经费支持，带一名本科生完成春季、全职暑期和秋季三个阶段的研究。" },
        { role: "Data Science Researcher", org: "United Nations Peacekeeping (DPPA-DPO-IMU)", when: "2025",
          en: "As the sole developer, rebuilt the UN Peacebuilding Power BI dashboard, bringing together World Bank, Freedom House, INFORM, SDG Index and IDMC indicators with a new geospatial Country Overview.",
          zh: "作为唯一的开发者，重建了联合国建设和平（Peacebuilding）的 Power BI 仪表盘，整合世界银行、Freedom House、INFORM、SDG Index 和 IDMC 等多源指标，并新增带地理可视化的国家概览。" },
        { role: "Research Collaborator", org: "IEEE Standards Association (IEEE P7018)", when: "Since 2024",
          en: "On Task Force II for IEEE P7018, a standard on the security and trustworthiness of pretrained generative AI models, co-authoring the “Opportunities of PGAIM” section of its technical white paper.",
          zh: "参与 IEEE P7018 标准（预训练生成式 AI 模型的安全与可信）的 Task Force II，合写技术白皮书中的 “Opportunities of PGAIM” 章节。" },
        { role: "Data Science Consultant", org: "UNODC / UNOV Staff Council", when: "2024",
          en: "Used NLP and sentiment analysis on a staff survey, turning open-ended feedback into clear evidence for internal policy discussions.",
          zh: "用 NLP 和情感分析处理员工调研数据，把开放式反馈整理成可供内部政策讨论的证据。" }
      ]
    },
    {
      id: "ms",
      degree: "M.S., Data Science and Analytics",
      school: "Georgetown University",
      years: "",
      emblem: "tower",
      zh: "Georgetown University 数据科学与分析 硕士",
      alongside: [
        { role: "Research Scholar", org: "Massive Data Institute (MDI)", when: "2022 to 2023",
          en: "Analyzed large-scale Twitter discussions of gun control, vaccines, the economy and homeschooling with NLP, and built demographic inference models.",
          zh: "用 NLP 分析 Twitter 上关于枪支管控、疫苗、经济和在家教育的大规模讨论，并搭建人口属性推断模型。" },
        { role: "Research Assistant", org: "Edunomics Lab", when: "Jan to May 2022",
          en: "Cleaned ESSA and NCES data and built a database of year-over-year U.S. school spending in R for the National Education Resource Database.",
          zh: "整理 ESSA 和 NCES 数据，用 R 为 National Education Resource Database 搭建美国学校逐年支出数据库。" },
        { role: "Graduate Teaching Assistant", org: "McDonough School of Business and McCourt School of Public Policy", when: "Jul 2022 to May 2023",
          en: "Supported MBA and data science courses with grading, exams, office hours and tracking student progress.",
          zh: "为 MBA 和数据科学课程做助教，负责批改作业、考试、答疑和跟进学生进度。" },
        { role: "Lead Mentor, then DSAN Alumni Mentor", org: "Georgetown University", when: "Since Aug 2022",
          en: "Lead Mentor from August 2022 to 2023, and a DSAN Alumni Mentor since 2023.",
          zh: "2022 年 8 月到 2023 年担任 Lead Mentor，2023 年起担任 DSAN 校友导师。" },
        { role: "Data Scientist Intern", org: "United Nations Peacekeeping (DPPA-DPO-IMU)", when: "2023",
          en: "Automated data extraction for Secretary-General reports with Python, and ran ACLED-based conflict analysis for African regions.",
          zh: "用 Python 自动化秘书长报告的数据提取，并基于 ACLED 数据做非洲地区的冲突分析。" }
      ]
    },
    {
      id: "bs",
      degree: "B.S., Computer Science and Statistics",
      school: "University of California, Davis",
      years: "",
      emblem: "bike",
      zh: "UC Davis 计算机科学与统计学 本科",
      honors: [{ en: "Dean's List, 2018 and 2020", zh: "院长荣誉榜（Dean's List），2018 和 2020 年" }]
    }
  ],

  themes: [
    {
      id: "agents",
      title: "Agentic AI, Oversight & Accountability",
      zhTitle: "智能体 AI 的监督与问责",
      color: "#a8432f",
      blurb: {
        en: "As AI agents act with less step-by-step supervision, where does accountability go? I study how communities negotiate “human control”, how popularity can outrun verification in AI discourse, and which runtime mechanisms must stay visible so that delegated actions remain answerable.",
        zh: "当 AI 智能体在更少的逐步监督下自主行动时，问责落在哪里？我研究社区如何理解“人类控制”、AI 讨论中热度如何跑在验证前面，以及哪些运行时机制必须保持可见，才能让被委托的行动仍然可追责。"
      },
      keywords: "agent agents agentic autonomous oversight supervision control accountability verification orchestration alignment 智能体 代理 监督 问责 自主"
    },
    {
      id: "teaming",
      title: "Human-AI Teaming, Trust & Disclosure",
      zhTitle: "人机协作、信任与 AI 披露",
      color: "#3f6b5f",
      blurb: {
        en: "What counts as a “team” when AI joins it? I design and test how AI assistance is disclosed, how capability cues shape different kinds of trust, and how evidence about human-AI teams should (and should not) be pooled.",
        zh: "当 AI 加入团队，什么才算“团队”？我研究 AI 协助应如何被披露、能力线索如何塑造不同维度的信任，以及人机团队研究的证据该如何（以及不该如何）合并比较。"
      },
      keywords: "team teams teaming teammate collaboration trust disclosure anthropomorphism credit authorship translation hat 团队 协作 合作 信任 披露 拟人"
    },
    {
      id: "persona",
      title: "Persona AI & Digital Afterlives",
      zhTitle: "人格化 AI 与数字来生",
      color: "#6b4a73",
      blurb: {
        en: "AI can now speak in the voice of people who have died, including family members, pets and even well-known experts. I study who holds authority over these representations after they are created, and what operators owe to the people who rely on them.",
        zh: "AI 已经能以逝者的声音说话，家人、宠物，甚至知名专家都可以。我研究这些“数字复活”被创建之后由谁拥有权威，以及运营者对依赖它们的人负有什么责任。"
      },
      keywords: "persona afterlife afterlives resurrection deceased posthumous griefbot grief death consent digital immortality 分身 逝者 复活 数字永生 来生 人格"
    },
    {
      id: "platforms",
      title: "Online Platforms, Safety & Public Discourse",
      zhTitle: "社交平台、安全与公共话语",
      color: "#3d5a80",
      blurb: {
        en: "I study how platform design and framing shape what people see and feel safe saying. My work ranges from COVID-19 framing across Reddit, news and government, to pseudonymity and verification friction in sensitive communities, to tools for running controlled experiments inside real interfaces, and culturally grounded governance for multilingual language models.",
        zh: "我研究平台设计与话语框架如何影响人们看到什么、敢说什么，从 Reddit、新闻与政府之间的新冠框架差异，到敏感社区中的化名与验证门槛，再到在真实界面中开展受控实验的工具，以及面向多语言大模型的文化根植治理。"
      },
      keywords: "platform platforms social media reddit online community communities safety discourse framing covid news governance multilingual 社交媒体 平台 社区 安全 话语 框架 新冠 治理"
    },
    {
      id: "education",
      title: "AI in Education",
      zhTitle: "教育中的 AI",
      color: "#9a6f22",
      blurb: {
        en: "Students already use generative AI for homework. I build and theorize systems that keep AI help visible and bounded, giving instructors useful teaching signals without turning help-seeking into surveillance.",
        zh: "学生已经在用生成式 AI 写作业。我设计并论证让 AI 帮助“可见且有边界”的系统，既给老师有用的教学信号，又不把求助变成监控。"
      },
      keywords: "education learning students student teaching instructors homework tutor tutoring children classroom course 教育 学习 学生 教学 老师 作业 辅导 儿童 课堂"
    }
  ],

  /*
   * Publications. `type` is one of:
   *   "proceedings" — archival conference / proceedings papers
   *   "workshop"    — workshop papers and conference presentations
   *   "poster"      — conference posters
   *   "preprint"    — preprints (arXiv)
   * `links` may include paper, doi, arxiv, pdf, poster and slides.
   * Videos live in the `videos` list further down.
   */
  publications: [
    {
      id: "pathway-lab",
      title: "Pathway Lab: A Design Probe for Redirecting Adolescent Peer Conflict Before It Becomes Bullying",
      authors: ["Hanjing Shi", "Dominic DiFranzo"],
      date: "2026-09-29",
      year: 2026,
      type: "poster",
      venue: "Poster at CSCW 2026 (ACM Conference on Computer-Supported Cooperative Work and Social Computing)",
      venueShort: "CSCW 2026 Poster",
      theme: "platforms",
      links: { poster: "files/pathwaylab-cscw2026-poster.pdf" },
      methods: ["Design probe", "Literature-informed scenario design"],
      summary: {
        en: "A simulated group-chat platform with eight literature-grounded scenarios for exploring how teen peer conflict escalates, and ways to exit, repair, or seek help before it becomes bullying.",
        zh: "一个模拟群聊平台，包含八个基于文献的情境，用来探讨青少年之间的冲突如何升级，以及在演变成霸凌之前如何退出、修复或求助。"
      },
      intro: {
        en: "This one is about teen group chats. 💬 Pathway Lab is a pretend group chat with eight scenarios built from research, like status-seeking, retaliation or a group pile-on. Each one shows how a joke or a screenshot request can snowball into bullying, and offers a way out, whether that's a safer next message, a real repair, or asking for help. It's a scripted design probe and hasn't been tested with teens yet. Expert review and IRB-approved teen studies come next.",
        zh: "这篇讲的是青少年群聊。💬 Pathway Lab 是一个模拟群聊，里面有八个基于文献设计的情境，比如争地位、报复、群体围攻。每个情境都展示一个玩笑或一次“发截图看看”的请求怎样一步步变成霸凌，也给出出口，比如换一条更安全的消息、真诚地修复，或者去求助。它目前是脚本化的设计探针，还没有在青少年中检验效果，下一步是专家评审和经过 IRB 批准的青少年研究。"
      },
      takeaway: {
        en: "A reusable “pathway grammar” links a risky draft's possible pressure and its impact on the target and group to distinct next steps, such as a safer next message, accountable repair after harm, or escalation for severe cases. Participants interpret first, then accept, reject or rewrite the support. It is a scripted design probe whose effects are not yet tested; expert review and IRB-approved teen studies come next.",
        zh: "一套可复用的“路径语法”，把一条有风险的草稿可能承受的压力、对被针对者和群体的影响，连接到不同的下一步，比如更安全的下一条消息、伤害之后负责任的修复，或严重情况下的升级求助。参与者先自己判断，再接受、拒绝或改写建议。它是一个脚本化的设计探针，效果尚未检验；下一步是专家评审和经 IRB 批准的青少年研究。"
      },
      keywords: "bullying cyberbullying adolescents teens youth peer conflict group chat design probe upstander repair escalation digital citizenship cscw poster 霸凌 青少年 群聊",
      abstract: "In adolescent group chats, a joke, public comeback, or screenshot request can turn one peer into a target and invite others to join; status, belonging, or prior hurt may make stepping back difficult. Pathway Lab is a simulated chat platform for exploring teen peer conflict and ways to exit, repair, or seek help. It asks how a simulated environment can help participants reason about a fictional sender's situation, consider effects on the target and group, and identify an exit, repair, or escalation route. Developmental and public-health concepts were organized into eight frames (status-seeking, control-seeking, retaliation, bully-victim transfer, learned aggression, moral disengagement, group pile-on, and post-harm repair), each translated into a fictional chat with possible pressure, target/group impact, and redirection options. The contribution is an inspectable pathway grammar and a scripted environment for third-person critique; pressure labels describe possible situations, not diagnoses. Effects are untested; next steps are expert review and IRB-approved teen studies of interpretation, reasoning, and perceived agency."
    },
    {
      id: "borrowed-authority",
      title: "Tracing Borrowed Authority in Relational AI Systems",
      authors: ["Hanjing Shi"],
      date: "2026-09-28",
      year: 2026,
      type: "poster",
      venue: "Poster at the AIES 2026 Student Program (AAAI/ACM Conference on AI, Ethics, and Society), upcoming",
      venueShort: "AIES 2026 Student Program · upcoming",
      upcoming: true,
      theme: "persona",
      links: { poster: "files/tracing-borrowed-authority-aies2026-poster.pdf", arxiv: "https://arxiv.org/abs/2609.29544" },
      methods: ["Public-service audit (93 records)", "Analytic framework"],
      summary: {
        en: "Persona AI speaks through a recognizable identity, such as an expert, a family member or friend, or a companion animal. This poster traces who supplies, checks, authorizes and can challenge the output across those three identity contexts.",
        zh: "人格化 AI 借一个熟悉的身份说话，比如专家、家人朋友或陪伴动物。这张海报追问，在这三种身份情境里，谁提供、谁核查、谁授权、谁能质疑它的输出。"
      },
      intro: {
        en: "Coming up at the AIES 2026 Student Program! ✨ Persona AI speaks through a familiar identity, like an expert, a family member or friend, or even a beloved pet. So when that voice gives advice, who actually supplied it, checked it and authorized it, and who can push back? I audited 93 public records and found that creating a persona is easy to inspect, while authorization, objection and exit mostly are not. A familiar face can lend an answer weight without the judgment behind it.",
        zh: "这篇即将在 AIES 2026 Student Program 亮相！✨ Persona AI 会借一个熟悉的身份说话，比如专家、家人朋友，甚至是心爱的宠物。那么这个声音给出建议时，是谁提供的、谁检查过、谁授权的，又有谁能提出异议？我审查了 93 份公开资料，发现“创建”一个人格很容易看清，而授权、异议和退出机制大多看不到。熟悉的身份能给答案加分量，却不一定带着背后的判断和责任。"
      },
      takeaway: {
        en: "A familiar identity does not guarantee sound judgment or accountability. It can lend an answer weight without supplying the judgment, permission or support behind it. Systems should make authorization, sources, updating responsibilities, behavioral limits, objection and exit visible.",
        zh: "熟悉的身份并不保证可靠的判断或问责，它能让一个回答显得有分量，却不附带背后的判断、许可和支持。系统应当让授权、来源、更新责任、行为边界、异议与退出都清晰可见。"
      },
      keywords: "persona identity borrowed authority relational ai expert family friend pet companion animal afterlife accountability consent aies poster 分身 身份 权威 宠物",
      abstract: "Persona AI presents generated responses through a recognizable identity. That identity can lend an answer weight without supplying the judgment, permission or support behind it. Across experts, family/friends and pets, this work examines who supplies, checks, authorizes and can challenge the output. A public-service audit of 93 records (product pages, FAQs and policies read before sign-up or payment) found creation easier to inspect than authorization, objection or exit. Situated evidence comes from an analysis of unofficial posthumous personas of education advisor Zhang Xuefeng, public family and friend cases, and a pet-memorial prototype. The poster proposes tracing authority, work and responsibility: make authorization, sources, updating responsibilities, behavioral limits, objection and exit visible, and keep professional verification and relational care explicit."
    },
    {
      id: "his-name",
      title: "His Name, Their Judgment: Expert Authority in Posthumous Persona AI",
      authors: ["Hanjing Shi", "Dominic DiFranzo"],
      date: "2026-09-26",
      year: 2026,
      type: "preprint",
      venue: "arXiv preprint arXiv:2609.32989",
      venueShort: "arXiv 2026",
      theme: "persona",
      links: { arxiv: "https://arxiv.org/abs/2609.32989", pdf: "https://arxiv.org/pdf/2609.32989" },
      methods: ["Qualitative thematic analysis", "Social media (RedNote)"],
      summary: {
        en: "A thematic analysis of 115 RedNote (Xiaohongshu) posts, plus a nested comment sample, about unofficial posthumous AI personas of Chinese education advisor Zhang Xuefeng.",
        zh: "对小红书上 115 篇帖子及其评论样本的主题分析，这些内容都围绕教育咨询师张雪峰的非官方“逝后 AI 分身”。"
      },
      intro: {
        en: "This one comes from something real on RedNote (Xiaohongshu). People made unofficial AI personas of Zhang Xuefeng, a Chinese education advisor, after his death. We analyzed 115 posts plus a sample of their comments. The big lesson? Getting an expert's identity is not the same as getting professional help. And whoever keeps the persona updated is really deciding what he appears to recommend now, so operators need to deliver the support the persona promises and keep their use of his identity open to challenge.",
        zh: "这篇来自小红书上的真实现象。张雪峰老师去世后，有人做了他的非官方 AI 人格。我们分析了 115 篇帖子和一批评论。最大的发现是，拿到专家的“身份”并不等于得到专业帮助。而且谁在持续更新这个人格，谁就在决定逝者“现在推荐”什么，所以运营者得真正提供人格所承诺的支持，也要让对他身份的使用可以被质疑。"
      },
      takeaway: {
        en: "Access to an expert's identity is not access to professional help. Whoever keeps a posthumous persona current effectively controls what the deceased appears to recommend, so operators must actually deliver the support the persona promises, and keep their use of the person's identity open to challenge.",
        zh: "能访问专家的“身份”不等于获得专业帮助。谁在更新逝者的 AI 分身，谁就实际上决定了“他”会推荐什么，所以运营者需要真正承担分身所承诺的支持，并让自己对这个人身份的使用始终可以被质疑。"
      },
      keywords: "persona posthumous deceased expert authority rednote xiaohongshu zhang xuefeng education advisor afterlife 小红书 逝者 分身 专家 张雪峰",
      abstract: "Persona AI can make deceased experts available for decisions they never encountered. Users may seek these personas precisely because they lack the knowledge needed to judge their advice. We thematically analyze 115 focal RedNote/Xiaohongshu posts and a nested comment sample concerning unofficial personas of Chinese education advisor Zhang Xuefeng. An installation offer promised expert guidance, while a family's reported use required current records and contextual judgment. Other posts positioned the persona as a questioning aid rather than an expert replacement. Commenters connected continued expertise to updating, permission, and the ability to refuse further work. These findings distinguish access to an expert identity from access to professional help. Keeping the persona current puts living actors in control of what the deceased appears to recommend. Operators therefore need to undertake the support promised by the persona while making their continued use of the person's identity open to challenge."
    },
    {
      id: "capability-cues",
      title: "How Far Do Capability Cues Travel? Anthropomorphism and Differentiated Trust in a Platform-Embedded AI Assistant",
      authors: ["Chenchen Mao", "Hanjing Shi", "Haiyan Jia", "Dominic DiFranzo"],
      date: "2026-09-09",
      year: 2026,
      type: "preprint",
      venue: "arXiv preprint arXiv:2609.09713",
      venueShort: "arXiv 2026",
      theme: "teaming",
      links: { arxiv: "https://arxiv.org/abs/2609.09713", pdf: "https://arxiv.org/pdf/2609.09713" },
      methods: ["Randomized online experiment (N = 270)"],
      summary: {
        en: "A randomized 2×2 experiment with 270 U.S. Reddit users testing how an embedded AI assistant showing one vs. three functions, with or without a brief rationale, shapes perceptions and trust.",
        zh: "一项有 270 名美国 Reddit 用户参与的 2×2 随机实验，看内嵌的 AI 助手展示 1 个还是 3 个功能、是否附带简短解释，会如何影响用户的感知与信任。"
      },
      intro: {
        en: "A study led by Chenchen Mao! We ran a randomized experiment with 270 U.S. Reddit users. The AI assistant built into the platform showed either one or three functions, with or without a short rationale. Plot twist! Showing more functions made it seem more multifunctional, and not much else. Anthropomorphism went along with seeing the AI as well-meaning, but not reliably with integrity or ability. So trust isn't one number, and each dimension deserves its own check.",
        zh: "这篇由 Chenchen Mao 主导！我们对 270 位美国 Reddit 用户做了随机实验，平台内嵌的 AI 助手会展示一个或三个功能，并且有或没有一句简短的理由说明。反转来了！多展示功能只让人觉得它“功能更多”，别的几乎没变。拟人化和“觉得它心怀善意”有关，但和诚信、能力没有稳定的关联。所以信任不是一个数字，每个维度都要分开看。"
      },
      takeaway: {
        en: "Visible capabilities don't automatically become trust. Showing more functions raised perceived multifunctionality but little else, and anthropomorphism was associated with benevolence but not reliably with integrity or ability, so the dimensions of trust should be evaluated separately.",
        zh: "可见的能力并不会自动变成信任。展示更多功能只提升了“多功能”的感知；拟人化与“善意”相关，却与“正直”和“能力”没有稳定关联，所以信任的不同维度应当分开评估。"
      },
      keywords: "trust anthropomorphism capability cues assistant reddit experiment ai literacy benevolence integrity ability 信任 拟人化 能力 实验 助手",
      abstract: "Visible AI capabilities need not translate into broader judgments of trustworthiness. In a randomized 2 x 2 experiment with 270 U.S.-based Reddit users, an embedded assistant displayed one or three functions, with or without a brief rationale. Displaying three functions increased perceived multifunctionality; no other randomized main effect survived correction across the six outcomes. Rationale availability did not reliably increase perceived intelligence. Exploratory analysis indicated stronger uptake of the functional display at higher objective AI literacy. Among concurrently measured judgments, perceived multifunctionality was associated with perceived intelligence, which was associated with anthropomorphism and all three trust dimensions. After accounting for perceived intelligence, anthropomorphism was positively associated with benevolence, but not reliably with integrity or ability. These findings separate interface effects from relationships among users' perceptions and show why ability, integrity, and benevolence should be evaluated separately."
    },
    {
      id: "reduced-supervision",
      title: "When Agents Act Unwatched: The Reduced-Supervision Paradox in Agentic AI",
      authors: ["Hanjing Shi", "Dominic DiFranzo"],
      date: "2026-08-28",
      year: 2026,
      type: "preprint",
      venue: "arXiv preprint arXiv:2609.29547",
      venueShort: "arXiv 2026",
      theme: "agents",
      links: { arxiv: "https://arxiv.org/abs/2609.29547", pdf: "https://arxiv.org/pdf/2609.29547" },
      methods: ["Structured audit of 63 public artifacts"],
      summary: {
        en: "A structured audit of 63 public artifacts (46 research papers and 17 engineering, documentation, security and governance sources) asking how visible the accountability mechanisms of AI agents are.",
        zh: "对 63 份公开材料（46 篇论文，以及 17 份工程、文档、安全与治理资料）的结构化审计，考察 AI 智能体的问责机制到底有多“可见”。"
      },
      intro: {
        en: "Agentic AI is sold on one promise, that it keeps working when you stop watching. 👀 But then who checks its work? We audited 63 public artifacts, 46 research papers plus 17 engineering, documentation, security and governance sources. What an agent can do is easy to see. Checkpoints, independent validators, recovery and ways to contest its actions are barely visible, and contestability showed up clearly in just 1 of the 63. We call this the reduced-supervision paradox. Verification doesn't vanish, it moves into the runtime infrastructure.",
        zh: "Agentic AI 卖的是一个承诺，你不看着，它也能继续干活。👀 那谁来检查它干得对不对？我们审查了 63 份公开资料，包括 46 篇论文和 17 份工程、文档、安全与治理资料。智能体“能做什么”很容易看到，但检查点、独立验证、出错恢复和申诉机制几乎看不见，可申诉性只在 63 份里的 1 份中清楚出现。我们把它叫作“减少监督悖论”。验证并没有消失，而是转移到了运行时的基础设施里。"
      },
      takeaway: {
        en: "As step-by-step supervision recedes, verification doesn't disappear. It moves into runtime infrastructure. Agents' action surfaces are easy to see, but checkpoints, independent validators, recovery and contestability rarely are; observability can quietly become a substitute for accountability.",
        zh: "逐步监督减少之后，验证并没有消失，而是转移进了运行时基础设施。智能体“能做什么”很容易看到，但检查点、独立验证、恢复与申诉机制却很少公开，可观测性可能正在悄悄替代问责。"
      },
      keywords: "agents agentic supervision oversight accountability audit observability harness verification checkpoint recovery contestability 智能体 监督 问责 审计 可观测",
      abstract: "Agentic AI is sold on a simple promise: the system keeps acting when the user stops watching. That promise creates an accountability inversion. As stepwise supervision recedes, verification does not disappear; it moves into the runtime infrastructure that defines authority, records action, interrupts execution, checks outcomes, and supports repair. We call this the reduced-supervision paradox. Using a 63-artifact audit, we examine its public visibility across 46 research papers and 17 engineering, documentation, security, and governance sources. We find that agents' action surfaces are far easier to reconstruct than the mechanisms needed to answer for their actions. Tool mediation and monitoring traces were clearly visible in 40 and 37 artifacts, whereas checkpoint placement was clearly visible in 6, validator independence in 4, recovery in 2, and contestability in 1. Three action paths show why this imbalance matters. A repository path can preserve rich diffs after a consequential change. A browser path can cross organizational boundaries faster than permissions travel. A service path can follow policy while leaving affected people without recourse. We argue that observability can become a substitute for accountability when it shifts verification onto users after meaningful intervention is no longer possible. Our action-path diagnostic instead asks whether a delegated action remains connected to authority, evidence, interruption, independent judgment, recovery, and challenge. The claim is deliberately bounded to public visibility; it does not establish the prevalence or effectiveness of undisclosed controls. We contribute an action-level account that recasts the harness from a technical wrapper into accountability infrastructure."
    },
    {
      id: "beloved-afterlives",
      title: "Beloved Afterlives: Governing AI Resurrection Beyond Consent",
      authors: ["Hanjing Shi", "Dominic DiFranzo"],
      date: "2026-08-28",
      year: 2026,
      type: "preprint",
      venue: "arXiv preprint arXiv:2609.29544",
      venueShort: "arXiv 2026",
      theme: "persona",
      links: { arxiv: "https://arxiv.org/abs/2609.29544", pdf: "https://arxiv.org/pdf/2609.29544" },
      methods: ["Public-record audit of 93 systems", "Case analysis"],
      summary: {
        en: "A public-record audit of 93 “AI resurrection” systems (human afterlives, companion-animal afterlives and adjacent persona systems) plus four public cases.",
        zh: "对 93 个“AI 复活”系统（逝者、陪伴动物以及相关人格化系统）的公开资料审计，并分析了四个公开案例。"
      },
      intro: {
        en: "Should AI bring back the people and pets we've lost? 🕯️ Most debates stop at consent, asking whether the person agreed. We argue that's not enough, because a digital afterlife keeps moving. It can switch models, pass to relatives or depend on a company. We audited 93 AI resurrection systems and four public cases. Creating one was easy to inspect, but information about objection or redress was thin in 82 of them, and about deletion or export in 77.",
        zh: "AI 该不该“复活”我们失去的人和宠物？🕯️ 大多数讨论停在“同意”这一步，只问本人答应了没有。我们认为这不够，因为数字来世会一直变化，它可能换模型、转交给亲属，或者依赖某家公司。我们审查了 93 个 AI 复活系统和四个公开案例。“创建”很容易看清，但关于异议或补救的信息在 82 个系统里都很少，关于删除或导出的信息在 77 个系统里都很少。"
      },
      takeaway: {
        en: "Consent at the moment of creation isn't enough. Authority over a digital afterlife is relational, spread across people, records, providers and audiences, and must stay traceable as the representation moves. Most systems made creation easy to inspect but said little about objection, redress, deletion or export.",
        zh: "只有创建那一刻的同意是不够的。对数字来生的权威是“关系性”的，分布在亲友、数据记录、服务商和受众之间，并且必须在分身流转时保持可追溯。大多数系统让“创建”很容易查看，却很少说明异议、救济、删除或导出。"
      },
      keywords: "afterlife afterlives resurrection deceased griefbot consent pets companion animal digital immortality governance relational authority 数字永生 复活 逝者 宠物 同意 来生",
      abstract: "AI resurrection is often framed as a question of consent: did the represented person authorize being made to speak? That question matters, but it freezes authority at the moment of creation. A representation can later change models, pass to relatives, depend on a provider, incorporate records shared with others, or circulate far beyond its intended audience. We argue that the central governance problem is therefore not whether authorization exists once, but whether it remains legible as the representation moves. Across a public-record audit of 93 systems, creation was far easier to inspect than the conditions for speaking, contesting, preserving, or leaving: consent or authority information was thin in 82 systems, objection or redress in 82, and deletion or export in 77. The differences among systems reveal why these gaps cannot be reduced to one transparency score. Human afterlives show consent becoming incomplete over time. Companion-animal afterlives begin where subject consent is unavailable and shared care must allocate authority. Adjacent persona and mimetic systems show how voices, likenesses, and personalities can travel into later afterlife uses. Four public cases follow the same movement from premortem participation, through intimate postmortem creation, to third-party circulation and family contestation. From this evidence we develop relational authority: authorization is distributed across people, records, providers, and audiences, and must remain traceable as those relations change. This reframes AI resurrection from a product authorized once into an accountability chain linking creation authority, source boundaries, circulation, contestation, and exit. The study measures what users and affected parties can inspect publicly; private implementation and lived outcomes remain open empirical questions."
    },
    {
      id: "same-team-label",
      title: "Same Team Label, Different Evidence: A Full-Text Audit of Claim Denominators in Human-AI Teaming Research",
      authors: ["Hanjing Shi", "Kimberly Wang", "Sabrina Doherty", "Dominic DiFranzo"],
      date: "2026-08-25",
      year: 2026,
      type: "preprint",
      venue: "arXiv preprint arXiv:2609.27849",
      venueShort: "arXiv 2026",
      theme: "teaming",
      links: { arxiv: "https://arxiv.org/abs/2609.27849", pdf: "https://arxiv.org/pdf/2609.27849" },
      methods: ["Full-text literature audit (86 papers)", "LLM labeling comparison"],
      summary: {
        en: "A full-text audit of 86 human-AI teaming papers, drawn from a 419-record map, showing that the same “team” label can hide very different human arrangements.",
        zh: "对 86 篇人机协作（HAT）论文的全文审计（取自 419 篇的题录图谱），发现同样的“团队”标签背后，可能是完全不同的人员安排。"
      },
      intro: {
        en: "A little detective story about literature reviews! 🔍 In human-AI teaming research, the word “team” can mean one person taking AI advice, several people coordinating around an AI, or a whole workflow. With Kimberly Wang, Sabrina Doherty and Dr. DiFranzo, I audited 86 full texts selected from a 419-record map. Reading the full papers changed which studies belong behind a claim for 40 of them, and blinded language-model labels disagreed with our full-text labels about a third of the time. So we propose a claim-pooling checkpoint before anyone compares evidence.",
        zh: "这篇像一个文献侦探故事！🔍 在人机协作研究里，“团队”可能指一个人听 AI 的建议，也可能是几个人围绕 AI 协调，或者一整套工作流程。我和 Kimberly Wang、Sabrina Doherty、DiFranzo 博士一起，从 419 条记录的地图里挑出 86 篇全文逐篇审查。读完全文后，有 40 篇该不该算进某个结论发生了变化，盲评的语言模型标签也有大约三分之一和我们的全文标签不一致。所以我们提出，比较证据之前要先过一个“结论合并检查点”。"
      },
      takeaway: {
        en: "Reading full texts changed which studies belong behind a claim for 40 of 86 records, and blinded language-model labels differed from full-text labels about a third of the time. Reviews need a “claim-pooling checkpoint” before comparing evidence on trust, coordination, performance or accountability.",
        zh: "读全文之后，86 篇里有 40 篇的归类发生了变化；盲测的大模型标注与全文标注约有三分之一不一致。在比较信任、协调、绩效或问责的证据之前，综述需要一个“主张合并检查点”。"
      },
      keywords: "human-ai teaming hat review literature audit systematic review claim denominator llm labeling synthesis 综述 团队 人机协作 文献",
      abstract: "Human-AI Teaming (HAT) reviews often group studies by labels such as advisor, teammate, or coordinator. Yet the same label can describe one person taking AI advice, several people coordinating around AI, or a workflow that distributes authority and responsibility. Pooling these studies can therefore change the human unit behind a claim. We examine how full-text evidence changes the set of studies behind a claim. We audited 86 full texts purposively selected from a 419-record title/abstract map. We find that full-text reading changed core membership for 40 records: 36 of 74 apparent core candidates moved out, while 4 of 12 boundary candidates moved in. Team vocabulary did not reliably identify the social unit: 14 of 27 human-AI dyads and 20 of 23 multi-human peer teams used team or collaboration terms. Only 20 of 86 papers specified who could see AI output. Four blinded language-model runs unanimously labeled 53 screening cases and 59 arrangements, yet 32% and 34% of those consensus decisions differed from the full-text labels. These results identify claim-denominator drift as a synthesis problem in HAT research. We contribute a full-text audit centered on human arrangements and a claim-pooling checkpoint for deciding when evidence about trust, coordination, performance, efficiency, and accountability can be compared."
    },
    {
      id: "readability-evaluability",
      title: "When Readability and Source Retention Diverge: An Evaluability Gap in AI Translation",
      authors: ["Chenchen Mao", "Hanjing Shi", "Haiyan Jia", "Emily Wegrzyn", "Dominic DiFranzo"],
      date: "2026-08-19",
      year: 2026,
      type: "preprint",
      venue: "arXiv preprint arXiv:2608.19083",
      venueShort: "arXiv 2026",
      theme: "teaming",
      links: { arxiv: "https://arxiv.org/abs/2608.19083", pdf: "https://arxiv.org/pdf/2608.19083" },
      methods: ["Online experiment (N = 306)", "Structural equation modeling"],
      summary: {
        en: "A 2×2 experiment (N = 306) using the TransLingo interface that compares readability-oriented LLM translations with fidelity-oriented revisions, for simple and complex source texts.",
        zh: "一项 2×2 实验（N = 306），在 TransLingo 界面中比较“重可读性”的大模型译文与“重忠实度”的修订译文，分别用于简单与复杂的原文。"
      },
      intro: {
        en: "Another one led by Chenchen Mao, this time about AI translation. 🌐 In the TransLingo interface, 306 people rated smooth, readable LLM translations and fidelity-focused revisions of both simple and complex texts. For complex prose, one overall quality rating didn't show how much of the original a fluent translation actually kept. Showing the source isn't the same as making it checkable! And trust in the system's task performance was the closest match to whether people were willing to hand over their own text.",
        zh: "又一篇 Chenchen Mao 主导的研究，这次关于 AI 翻译。🌐 306 位参与者在 TransLingo 界面里，评价了追求流畅的 LLM 译文和追求忠实的修订译文，原文有简单的，也有复杂的。对复杂的文字来说，一个“整体质量”评分反映不出流畅的译文到底保留了多少原意。把原文摆出来，不等于让人能核对它！而人们愿不愿意交出自己的文字，和“相信它能把任务做好”关系最密切。"
      },
      takeaway: {
        en: "Showing the source is not the same as making it evaluable. For complex prose, one overall quality rating didn't reflect how much content a fluent translation kept, and task-performance trust was the closest correlate of people's willingness to hand over personal text.",
        zh: "展示原文不等于让人能评估译文。面对复杂文本，一个整体质量评分反映不出流畅译文保留了多少内容；而对任务表现的信任，是人们是否愿意交出个人文本的最直接相关因素。"
      },
      keywords: "translation readability fidelity source retention trust disclosure llm evaluability sem translingo 翻译 可读性 忠实 信任 译文",
      abstract: "Readable AI output can leave an evaluability gap: even when the source is shown, an overall-quality judgment may not reflect what an output preserves. We investigated how source-text condition and output rendering relate to perceived translation quality, and how output and system appraisals relate to trust and stated disclosure willingness in a plain-text interface. A focal 2 * 2 comparison (N=306) using TransLingo examined simple generated narratives and complex literary-philosophical prose alongside LLM-generated readability-oriented outputs and researcher-revised fidelity-oriented outputs. A descriptive stimulus audit indicated greater source retention in fidelity-oriented outputs in both source-text conditions. Factorial analyses showed a significant rendering-by-source-text-condition interaction in perceived quality. Participants rated fidelity-oriented outputs higher than readability-oriented outputs for the simple narratives, whereas no reliable rendering difference emerged for the complex prose. A corresponding source-condition-dependent pattern was observed for perceived intelligence, agency-oriented anthropomorphic attribution, and task-performance trust. A separate theory-ordered appraisal-structure SEM characterized concurrent associations among perceived quality, perceived intelligence, agency-oriented anthropomorphic attribution, task-performance trust, and stated disclosure willingness across six domains, with task-performance trust as the proximal correlate of stated willingness. The observed rating pattern distinguishes source access from source evaluability: for the complex stimuli, displaying the source did not ensure that one overall-quality rating reflected differences in retained content. It also separates support for evaluating translation output from data-handling support for decisions about what personal text to entrust to a system."
    },
    {
      id: "learning-signals",
      title: "When Learning Signals Become Safety Signals: A Bounded-Confidentiality Framework for Educational AI Agents",
      authors: ["Hanjing Shi", "Dominic DiFranzo"],
      date: "2026-08-10",
      year: 2026,
      type: "proceedings",
      venue: "Proceedings of the Impactful and Responsible AI Systems for Education Workshop, PMLR 339, pp. 123–128",
      venueShort: "PMLR 339 · Workshop",
      theme: "education",
      links: {
        paper: "https://proceedings.mlr.press/v339/shi26a.html",
        pdf: "https://raw.githubusercontent.com/mlresearch/v339/main/assets/shi26a/shi26a.pdf"
      },
      methods: ["Position paper", "Design framework"],
      summary: {
        en: "A position paper on what child-facing educational AI agents should keep private, share under the student's control, or route to accountable adults when tutoring turns into disclosure.",
        zh: "一篇立场论文，讨论当面向儿童的教育 AI 在辅导中听到倾诉（比如被霸凌、害怕大人的反应）时，哪些应当保密、哪些在学生同意下分享、哪些必须转给负责任的成年人。"
      },
      intro: {
        en: "Picture this. A kid asks an AI tutor for help with math, then mentions being bullied. 📚 What should the AI keep private, share with the student's OK, or pass to a trusted adult? Full parental visibility turns asking for help into surveillance, and full secrecy leaves real harm unsupported. So this position paper argues for bounded confidentiality. Ordinary tutoring stays private unless the student chooses to share or there's credible danger, with a response ladder that goes from minimal records up to accountable adults.",
        zh: "想象一下，一个孩子向 AI 家教请教数学题，接着说起自己被欺负了。📚 AI 该保密什么，在学生同意下分享什么，又该把什么交给可信赖的大人？让家长什么都能看，求助就变成了监控；什么都保密，严重的伤害就没人管。所以这篇立场论文提出“有边界的保密”。普通辅导内容保持私密，除非学生自己选择分享或出现可信的危险，并配有一套从最少记录一直到交给负责任的大人的逐级回应阶梯。"
      },
      takeaway: {
        en: "Neither full parental visibility (which turns help-seeking into surveillance) nor full secrecy (which leaves serious harm unsupported) works. We argue for bounded confidentiality. Ordinary tutoring stays private unless student choice or credible danger gives a reason to involve adults, with a response ladder from minimal records to escalation to accountable humans.",
        zh: "家长完全可见会把求助变成监控，完全保密又会让严重的伤害得不到支持。我们提出“有边界的保密”，日常辅导默认保密，只有学生主动选择或存在可信的危险时才让成年人介入，并给出从最少记录到升级给负责人员的回应阶梯。"
      },
      keywords: "education children child tutor tutoring privacy confidentiality safety disclosure bullying surveillance parents 教育 儿童 隐私 保密 安全 霸凌 家长 监控",
      abstract: "Educational AI agents are usually introduced as tutors, homework helpers, or study companions. As children use them regularly, learning help can become a disclosure site: a student may begin with a math problem and then describe bullying, fear of adult reaction, or school avoidance. This position paper asks how child-facing educational agents should preserve student trust while deciding what stays private, what can be shared under student control, and what must be routed to accountable adults. Full parental visibility would turn help-seeking into surveillance; full secrecy would leave serious harm unsupported. We argue for bounded confidentiality as a communication-governance framework: ordinary tutoring remains private unless student choice or credible danger creates a reason to involve adults. The paper specifies a response ladder for minimal records, student-reviewed communication, care-oriented adult prompts, and escalation to locally accountable humans."
    },
    {
      id: "outer-limits",
      title: "Outer Limits: An Experimental Approach to Controlled Content Manipulation within the Reddit Interface",
      authors: ["Chenchen Mao", "Hanjing Shi", "Haiyan Jia", "Daniel Unhuryan", "Eric Baumer", "Dominic DiFranzo"],
      date: "2026-08-10",
      year: 2026,
      type: "preprint",
      venue: "arXiv preprint arXiv:2608.10115",
      venueShort: "arXiv 2026",
      theme: "platforms",
      links: { arxiv: "https://arxiv.org/abs/2608.10115", pdf: "https://arxiv.org/pdf/2608.10115" },
      methods: ["Research system", "Perceptual-fidelity study (N = 219)"],
      summary: {
        en: "A browser-based system that lets independent researchers run controlled content experiments inside the real Old Reddit interface, without constructed content or experimental interactions ever reaching Reddit.",
        zh: "一个基于浏览器的系统，让独立研究者可以在真实的 Old Reddit 界面里开展受控内容实验，而实验内容和实验交互都不会传到 Reddit 上。"
      },
      intro: {
        en: "Researchers usually can't run real experiments on live social media. Outer Limits, led by Chenchen Mao, changes that. 🛡️ It's a browser-based system for controlled content experiments inside the real Old Reddit interface, and none of the study's constructed content, votes or comments ever reach Reddit. In a perceptual-fidelity study with 219 participants, ratings showed no significant effects of post type or of whether people were told in advance. A real interface with real experimental control!",
        zh: "独立研究者通常没办法在真实的社交平台上做干预实验。Outer Limits 由 Chenchen Mao 主导，正好解决这个问题。🛡️ 它是一个浏览器端系统，直接在真实的 Old Reddit 界面里做受控内容实验，研究中构造的内容、投票和评论都不会传到 Reddit 上。在一项 219 人的感知逼真度研究里，帖子类型和参与者是否事先知情都没有产生显著影响。真实的界面，加上真正的实验控制！"
      },
      takeaway: {
        en: "Precise experimental control, a real platform interface, and containment from the host community can be combined. In a 219-participant perceptual-fidelity study, ratings showed no significant effects of post type or participant awareness.",
        zh: "精确的实验控制、真实的平台界面、与宿主社区的隔离，三者可以同时做到。在 219 人的感知保真度研究中，帖子类型和参与者是否知情都没有产生显著影响。"
      },
      keywords: "reddit experiment system browser platform content manipulation field experiment interface independent researchers 实验 平台 系统 浏览器",
      abstract: "Independent researchers often lack access to intervention capabilities for controlled experiments on live social media platforms. We present Outer Limits, a browser-based system for controlled content experiments within the existing Old Reddit interface, rather than in a reconstructed simulation. The system renders content locally, records study events, and contains configured voting and commenting actions so that neither constructed content nor experimental write interactions reach Reddit. In a 219-participant perceptual-fidelity study, ART ANOVAs found no significant Post Type, Participant Awareness, or interaction effects. Exploratory TOSTs met the d = plus-minus 0.50 equivalence criterion for the marginal contrasts and for Post Type within the forewarned subgroup. We also illustrate the system with a factorial study varying post frame, comment frame, and comment stance. Outer Limits combines three properties that the approaches considered here provide separately: precise control over experimental content, an existing platform interface, and containment of experimental content and interactions from the host community."
    },
    {
      id: "classpulse",
      title: "ClassPulse: A Bidirectional AI-Supported Programming Homework Platform for Teaching Signals and Student Learning Support",
      authors: ["Hanjing Shi", "Dominic DiFranzo"],
      date: "2026-06-27",
      year: 2026,
      type: "proceedings",
      venue: "Artificial Intelligence in Education (AIED 2026), Communications in Computer and Information Science, Springer, pp. 282–288",
      venueShort: "AIED 2026",
      theme: "education",
      links: { doi: "https://doi.org/10.1007/978-3-032-29788-4_40", poster: "images/posters/classpulse-aied2026.jpg" },
      methods: ["System prototype"],
      summary: {
        en: "A prototype for introductory programming courses that keeps AI help inside the homework platform. Students move among Tier 0 to 3 support states, and instructors see anonymous class-level patterns before opening individual process traces.",
        zh: "一个面向编程入门课的原型系统，把 AI 帮助留在作业平台里，学生在 0 到 3 级支持之间切换；老师先看到匿名的班级整体模式，再查看个人的过程记录。"
      },
      intro: {
        en: "The teaching one! 💻 Students already use AI for programming homework, and course rules usually either ban it or barely regulate it. ClassPulse keeps AI help inside the homework platform. Students move through Tier 0 to 3 support and get targeted practice plus a personal learning profile. Instructors first see anonymous class-level patterns, then individual traces, so they know where students get stuck before office hours. And AI use never turns into an automatic grading rule.",
        zh: "教学方向的一篇！💻 学生写编程作业早就在用 AI 了，而课程政策往往要么禁止，要么基本不管。ClassPulse 把 AI 帮助留在作业平台里，学生在 Tier 0 到 3 的支持层级之间切换，还能得到针对性练习和个人学习档案。老师先看到匿名的全班规律，再查看个人过程记录，这样在答疑时间之前就知道学生卡在哪儿。而且用了 AI 也不会自动变成评分规则。"
      },
      takeaway: {
        en: "Rather than banning AI or leaving it loosely regulated, keep AI help on-platform and visible, so instructors get better context for office hours and class meetings, without turning AI use into an automatic grading rule.",
        zh: "与其禁止 AI 或放任不管，不如让 AI 帮助留在平台内、保持可见，让老师在答疑和上课时有更好的依据，而不是把 AI 使用变成自动扣分的规则。"
      },
      keywords: "education programming homework students instructors teaching cs1 platform aied tutor generative ai 编程 作业 教学 学生 老师 课程",
      abstract: "Generative AI is already part of how many students work through programming assignments, while course policy often treats AI use as either prohibited or only loosely regulated. We present ClassPulse, a bidirectional prototype for introductory programming courses that keeps AI help inside the homework environment instead of pushing students to external chatbots. ClassPulse gives students AI help within the course platform and records those interactions so instructors can see where students are getting stuck, without turning AI use into an automatic grading rule. Students move among Tier 0–3 support states and receive targeted practice and a personal learning profile. Instructors first see anonymous class-level patterns before opening individual process traces. The prototype is meant to keep students on-platform and give instructors better context for office hours and later class meetings."
    },
    {
      id: "designing-safety",
      title: "Designing for Safety in Sensitive Online Spaces: The Role of Pseudonymity and Verification Friction",
      authors: ["Adyn Gallagher", "Hanjing Shi", "Dominic DiFranzo"],
      date: "2026-05-26",
      year: 2026,
      type: "proceedings",
      venue: "Proceedings of the 18th ACM Web Science Conference (WebSci '26), pp. 381–391",
      venueShort: "WebSci 2026",
      theme: "platforms",
      links: { doi: "https://doi.org/10.1145/3795766.3799746" },
      methods: ["Between-subjects experiment (N = 309)"],
      summary: {
        en: "A 2×3 between-subjects experiment (N = 309, U.S.) on how identity visibility (anonymous, pseudonymous, real name) and verification friction shape psychological safety in a fictional abortion-discussion community.",
        zh: "一项 2×3 组间实验（N = 309，美国），看在一个虚构的堕胎话题讨论社区里，身份可见度（匿名、化名、实名）与入群验证门槛如何影响心理安全感。"
      },
      intro: {
        en: "Led by Adyn Gallagher! How do you help people feel safe in an online community about a sensitive topic like abortion? 🫂 309 U.S. participants evaluated a fictional community with anonymous, pseudonymous or real-name identities, with or without a high-friction phone-interview verification step. Anonymous and pseudonymous designs felt safer than real names, and pseudonyms did about as well as full anonymity while keeping a persistent identity. The phone interview lowered psychological safety. Pseudonyms and privacy-preserving verification look promising for communities facing stigma or legal risk.",
        zh: "这篇由 Adyn Gallagher 主导！在讨论堕胎这类敏感话题的网络社区里，怎样让人感到安全？🫂 309 位美国参与者评估了一个虚构社区，身份分为匿名、化名和实名，并且有或没有高门槛的电话面试验证。匿名和化名都比实名更让人有心理安全感，化名的效果和完全匿名差不多，还能保留一个持续的身份。电话面试式的验证则会降低心理安全感。对面临污名或法律风险的社区来说，化名和保护隐私的验证方式很值得考虑。"
      },
      takeaway: {
        en: "Anonymous and pseudonymous designs felt psychologically safer than real names, and pseudonymity did about as well as full anonymity while keeping a persistent identity. By contrast, a high-friction phone-interview verification step lowered psychological safety. Privacy-preserving verification and pseudonyms are promising for communities facing stigma or legal risk.",
        zh: "匿名和化名设计比实名带来更高的心理安全感，化名与完全匿名效果相当，同时还能保留稳定的身份；而高门槛的电话面试验证反而降低了心理安全感。保护隐私的验证方式和化名，是在污名或法律风险下支持参与的可行方向。"
      },
      keywords: "safety psychological safety pseudonymity pseudonym anonymity anonymous real name verification friction online community abortion sensitive stigma 匿名 化名 实名 心理安全 社区 验证",
      abstract: "Safety is a central design concern for online communities that support discussions of sensitive topics. Prior work has examined privacy, data security, and harassment, but the psychological dimension of safety remains less systematically theorized as an outcome of platform design. This paper investigates how two common design levers—identity presentation and membership gatekeeping—relate to users' perceived psychological safety and participation intentions. We conceptualize these levers along two dimensions: identity visibility (anonymous, pseudonymous, or real name) and verification friction (open access versus identity-revealing, high-friction vetting). We conducted a 2 × 3 between-subjects experiment with participants in the United States (N = 309) who evaluated a fictional abortion-discussion community. Psychological safety was measured using an adapted Edmondson scale, and we modeled downstream effects on action comfort and joining interest. Anonymous and pseudonymous designs were associated with higher psychological safety than real-name designs, with pseudonymity performing comparably to full anonymity while supporting persistent identity. In contrast, a high-friction phone-interview verification step was associated with lower psychological safety relative to open access, illustrating how some forms of gatekeeping can introduce identity exposure that offsets their intended protective function. Taken together, these findings foreground verification friction as a sociotechnical trade-off in sensitive online spaces and suggest that privacy-preserving verification and pseudonymous identity are promising directions for supporting participation under conditions of stigma or legal risk."
    },
    {
      id: "covid-framing",
      title: "Exploring COVID-19 Framing Across Diverse Platforms: Analyzing Semantic and Contextual Shifts in Public Discussion, News Media, and Government Communication",
      authors: ["Hanjing Shi", "Zhila Aghajari", "Dominic DiFranzo", "Haiyan Jia", "Eric P. S. Baumer"],
      date: "2026-05-25",
      year: 2026,
      type: "proceedings",
      venue: "Proceedings of the International AAAI Conference on Web and Social Media (ICWSM), 20(1), pp. 2149–2164",
      venueShort: "ICWSM 2026",
      theme: "platforms",
      links: {
        paper: "https://ojs.aaai.org/index.php/ICWSM/article/view/42742",
        pdf: "https://ojs.aaai.org/index.php/ICWSM/article/download/42742/50302",
        slides: "files/covid-framing-icwsm2026-slides.pdf"
      },
      methods: ["Computational text analysis (LLTR, Jensen-Shannon divergence)"],
      summary: {
        en: "Compares how Reddit posts, mainstream news and state public-health bulletins framed eight COVID-19 topics, using the Linked Latent Theta Role (LLTR) model and Jensen-Shannon divergence over grammatical relation-argument pairs.",
        zh: "比较 Reddit 帖子、主流新闻和州公共卫生通报如何框架化八个新冠话题，使用 LLTR 模型，并用句法上“关系与论元”配对的 JS 散度衡量差异。"
      },
      intro: {
        en: "Same words, different stories! 🦠 With Zhila Aghajari, Haiyan Jia, Eric Baumer and Dr. DiFranzo, I compared how Reddit posts, mainstream news and state public-health bulletins talked about eight COVID-19 topics. Using the Linked Latent Theta Role (LLTR) model, we looked past which words appear to how they're used grammatically, such as who gets agency, who is held responsible and how judgments are built. The sources often shared topic words but diverged a lot in grammar, and word counts alone would miss that.",
        zh: "同样的词，不同的故事！🦠 我和 Zhila Aghajari、Haiyan Jia、Eric Baumer、DiFranzo 博士一起，比较了 Reddit 帖子、主流新闻和州公共卫生公告如何讨论八个新冠话题。借助 LLTR（Linked Latent Theta Role）模型，我们不只看用了哪些词，还看这些词在语法上怎么被使用，比如谁有主动性、谁被追责、评价是怎么构建的。结果发现，各方常常用着相同的话题词，语法结构却差别很大，只数词频是看不出来的。"
      },
      takeaway: {
        en: "Sources often share the same topic words but diverge in grammar, in who gets agency, who is held responsible, and how evaluations are structured. Grammar-aware representations reveal framing differences that word counts alone miss.",
        zh: "不同来源常常用同样的话题词，但在句法上差异很大，比如谁被赋予能动性、谁被归责、评价如何组织。关注语法的表示能发现只看词频时看不到的框架差异。"
      },
      keywords: "covid covid-19 pandemic framing news media government public health reddit nlp computational social science syntax icwsm 新冠 疫情 框架 新闻 政府 话语 语法",
      abstract: "Understanding how shared issues are framed differently across public, news, and government discourse is central to the study of COVID-19 communication. This paper uses the previously validated Linked Latent Theta Role (LLTR) model as part of a novel analytic technique to examine framing differences across Reddit posts, mainstream news articles, and state public health bulletins. Rather than introducing a new model, we operationalize LLTR outputs to compare cross-source framing by examining how shared topic words are embedded in different syntactic constructions. Using a source-balanced corpus, we measure cross-source differences using Jensen–Shannon divergence over distributions of dependency-based relation–argument pairs, and contrast these results with a lexical baseline. Across eight COVID-19 topics, we find that sources often rely on overlapping topic vocabularies, yet diverge substantially in their syntactic realizations of those topics. Inspection of high-divergence grammatical evidence reveals systematic differences in how sources assign agency, attribute responsibility, and structure evaluative context around shared topical concepts. These findings suggest that grammar-aware representations provide an interpretable and scalable basis for identifying framing differences that are not visible at the lexical level alone."
    },
    {
      id: "who-gets-credit",
      title: "Who Gets Credit? Operationalizing AI Disclosure as Epistemic Coordination in Human-AI Teams",
      authors: ["Hanjing Shi", "Dominic DiFranzo"],
      date: "2026-04-13",
      year: 2026,
      type: "proceedings",
      venue: "Extended Abstracts of the 2026 CHI Conference on Human Factors in Computing Systems (CHI EA '26), pp. 1–5",
      venueShort: "CHI 2026 EA",
      theme: "teaming",
      links: { doi: "https://doi.org/10.1145/3772363.3799006" },
      methods: ["Design space", "Research instrument"],
      summary: {
        en: "Introduces an AI Disclosure Design Space (No AI, Hidden AI, Translucent AI and Visible AI) and a research instrument that operationalizes these configurations in collaborative chat.",
        zh: "提出“AI 披露设计空间”（无 AI、隐藏 AI、半透明 AI、可见 AI），并开发了在协作聊天中实现这些配置的研究工具。"
      },
      intro: {
        en: "When AI helps out in a group chat, who gets the credit? 🤔 Instead of treating AI as simply present or absent, we mapped four ways to disclose it, called No AI, Hidden AI, Translucent AI and Visible AI. Each one trades off accountability, autonomy and coordination cost differently. We also built a research instrument that brings these four setups to life in a collaborative chat.",
        zh: "群聊里 AI 帮了忙，功劳算谁的？🤔 我们没有把 AI 简单看成“有”或“没有”，而是提出了四种披露方式，分别是 No AI、Hidden AI、Translucent AI 和 Visible AI。每一种都在问责、自主和协调成本之间做不同的取舍。我们还做了一个研究工具，在协作聊天里把这四种配置真正实现出来。"
      },
      takeaway: {
        en: "What matters in practice isn't whether AI is present but how its assistance is disclosed. Disclosure is an epistemic-coordination mechanism that trades off accountability, autonomy and coordination cost in teams.",
        zh: "关键不在于 AI 是否在场，而在于它的帮助如何被披露。披露是一种“认知协调”机制，在团队的问责、自主与协调成本之间权衡。"
      },
      keywords: "disclosure authorship credit teams collaboration generative ai chat epistemic coordination hidden translucent visible chi 披露 署名 功劳 协作 团队",
      abstract: "As generative AI becomes an ambient presence in collaborative work, a new social ambiguity emerges around authorship and responsibility. This condition of authorship uncertainty reshapes how teams attribute ideas, negotiate accountability, and coordinate collective reasoning. Prior research often treats AI presence as binary, framing it either as a hidden tool or a visible teammate. We argue that what matters in practice is the design of disclosure: how systems reveal, signal, or conceal AI assistance within collaboration. We introduce an AI Disclosure Design Space that conceptualizes disclosure as an epistemic coordination mechanism, articulating four configurations—No AI, Hidden AI, Translucent AI, and Visible AI—each trading off among accountability, autonomy, and coordination cost. We further contribute a research instrument that operationalizes these configurations in a collaborative chat setting and articulate testable design conjectures. By framing disclosure as epistemic infrastructure, this work outlines a conceptual roadmap for future empirical and design research on Human–AI collaboration."
    },
    {
      id: "alignment-in-time",
      title: "Alignment in Time: Peak-Aware Orchestration for Long-Horizon Agentic Systems",
      authors: ["Hanjing Shi", "Dominic DiFranzo"],
      date: "2026-02-20",
      year: 2026,
      type: "workshop",
      venue: "CHI 2026 Workshop: AutomationXP26 — Agentic Automation Experiences",
      venueShort: "CHI 2026 Workshop",
      theme: "agents",
      links: { arxiv: "https://arxiv.org/abs/2602.17910", pdf: "https://arxiv.org/pdf/2602.17910" },
      methods: ["System (APEMO)", "Multi-agent simulation"],
      summary: {
        en: "Introduces APEMO (Affect-aware Peak-End Modulation for Orchestration), a runtime scheduling layer that targets repairs at the peak moments and ending of a long-horizon agent trajectory under a fixed compute budget.",
        zh: "提出 APEMO（情感感知的峰终调制编排），一个在固定算力预算下，针对长程智能体轨迹的“峰值时刻”和“结尾”做定向修复的运行时调度层。"
      },
      intro: {
        en: "Say hi to APEMO! ⏱️ It stands for Affect-aware Peak-End Modulation for Orchestration (yes, a mouthful). Long agent workflows need to stay reliable across the whole run, not just one answer at a time. With a fixed compute budget, APEMO spots unstable stretches and targets repairs at the moments that matter most, the peaks and the ending, all without touching model weights. In multi-agent simulations and planner-executor flows, it beat structural orchestrators on trajectory-level quality and reuse probability. My take? Alignment is also a question of timing.",
        zh: "来认识一下 APEMO！⏱️ 它的全称是 Affect-aware Peak-End Modulation for Orchestration（名字确实有点长）。长流程的智能体需要在整个过程中都可靠，而不只是单个回答靠谱。在固定的算力预算下，APEMO 会发现不稳定的片段，把修复集中在最关键的时刻，也就是高峰和结尾，而且完全不用改模型权重。在多智能体模拟和基于 LLM 的规划与执行流程里，它在轨迹整体质量和再次使用的可能性上都优于结构化的编排方法。我的看法？对齐也是一个关于时机的问题。"
      },
      takeaway: {
        en: "Alignment is also a temporal control problem. Without changing model weights, peak-aware orchestration improved trajectory-level quality and reuse probability over structural orchestrators in multi-agent simulations and planner-executor flows.",
        zh: "对齐也是一个“时间上的控制”问题。无需修改模型权重，峰值感知的编排就在多智能体模拟和规划与执行流程中提升了轨迹整体质量与复用概率。"
      },
      keywords: "alignment orchestration agents long-horizon peak-end scheduling multi-agent llm apemo planner executor workflow 对齐 编排 智能体 调度",
      abstract: "Traditional AI alignment primarily focuses on individual model outputs; however, autonomous agents in long-horizon workflows require sustained reliability across entire interaction trajectories. We introduce APEMO (Affect-aware Peak-End Modulation for Orchestration), a runtime scheduling layer that optimizes computational allocation under fixed budgets by operationalizing temporal-affective signals. Instead of modifying model weights, APEMO detects trajectory instability through behavioral proxies and targets repairs at critical segments, such as peak moments and endings. Evaluation across multi-agent simulations and LLM-based planner--executor flows demonstrates that APEMO consistently enhances trajectory-level quality and reuse probability over structural orchestrators. Our results reframe alignment as a temporal control problem, offering a resilient engineering pathway for the development of long-horizon agentic systems."
    },
    {
      id: "visibility-verification",
      title: "When Visibility Outpaces Verification: Delayed Verification and Narrative Lock-in in Agentic AI Discourse",
      authors: ["Hanjing Shi", "Dominic DiFranzo"],
      date: "2026-02-11",
      year: 2026,
      type: "workshop",
      venue: "12th International Conference on Computational Social Science (IC2S2 2026)",
      venueShort: "IC2S2 2026",
      theme: "agents",
      links: { arxiv: "https://arxiv.org/abs/2602.11412", pdf: "https://arxiv.org/pdf/2602.11412" },
      methods: ["Survival analysis", "Reddit data"],
      summary: {
        en: "A longitudinal, right-censored survival analysis of r/OpenClaw and r/Moltbook that models “time-to-first-verification” in online discussions of agentic AI.",
        zh: "对 r/OpenClaw 与 r/Moltbook 的纵向（右删失）生存分析，建模智能体 AI 讨论中的“首次验证时间”。"
      },
      intro: {
        en: "Do popular posts get checked sooner? Nope, the opposite! 📈 We followed discussions of agentic AI in two Reddit communities, r/OpenClaw and r/Moltbook, and used survival analysis to measure how long it takes for the first verification cue to appear. High-visibility threads got verified later or never. We call it the popularity paradox, and it leaves a window for a story to lock in before anyone checks it. Engagement-driven platforms may need a bit of epistemic friction.",
        zh: "越火的帖子越早被核实吗？恰恰相反！📈 我们追踪了两个 Reddit 社区 r/OpenClaw 和 r/Moltbook 里关于 agentic AI 的讨论，用生存分析测量第一次出现“核实”信号需要多久。结果发现，高曝光的帖子被核实得更晚，甚至从未被核实。我们把它叫作“流行度悖论”，它让某种说法在被检验之前就有时间固化下来。以互动量为驱动的平台，也许需要一点“认知摩擦”。"
      },
      takeaway: {
        en: "A “popularity paradox” where high-visibility threads get verification cues later or never, opening a window for narrative lock-in. Engagement-driven platforms may need “epistemic friction” to counter credibility-by-visibility.",
        zh: "“热度悖论”，越热门的讨论，验证线索出现得越晚甚至缺席，给“叙事锁定”留下了窗口。以互动为导向的平台可能需要“认知摩擦”来对冲“以热度代替可信”。"
      },
      keywords: "reddit verification misinformation popularity survival analysis discourse social proof upvotes narrative lock-in epistemic friction agentic ai 验证 热度 叙事 社交媒体 谣言",
      abstract: "Agentic AI systems-autonomous entities capable of independent planning and execution-reshape the landscape of human-AI trust. Long before direct system exposure, user expectations are mediated through high-stakes public discourse on social platforms. However, platform-mediated engagement signals (e.g., upvotes) may inadvertently function as a “credibility proxy,” potentially stifling critical evaluation. This paper investigates the interplay between social proof and verification timing in online discussions of agentic AI. Analyzing a longitudinal dataset from two distinct Reddit communities with contrasting interaction cultures-r/OpenClaw and r/Moltbook-we operationalize verification cues via reproducible lexical rules and model the “time-to-first-verification” using a right-censored survival analysis framework. Our findings reveal a systemic “Popularity Paradox”: high-visibility discussions in both subreddits experience significantly delayed or entirely absent verification cues compared to low-visibility threads. This temporal lag creates a critical window for “Narrative Lock-in,” where early, unverified claims crystallize into collective cognitive biases before evidence-seeking behaviors emerge. We discuss the implications of this “credibility-by-visibility” effect for AI safety and propose “epistemic friction” as a design intervention to rebalance engagement-driven platforms."
    },
    {
      id: "human-control-anchor",
      title: "Human Control Is the Anchor, Not the Answer: Early Divergence of Oversight in Agentic AI Communities",
      authors: ["Hanjing Shi", "Dominic DiFranzo"],
      date: "2026-02-10",
      year: 2026,
      type: "workshop",
      venue: "CHI 2026 Workshop on Human-Agent Collaboration",
      venueShort: "CHI 2026 Workshop",
      theme: "agents",
      links: { arxiv: "https://arxiv.org/abs/2602.09286", pdf: "https://arxiv.org/pdf/2602.09286" },
      methods: ["Topic modeling", "Divergence tests", "Reddit data"],
      summary: {
        en: "Compares two newly active Reddit communities (r/OpenClaw and r/Moltbook, January and February 2026) with topic modeling, engagement-weighted salience and divergence tests, to see how oversight expectations crystallize.",
        zh: "比较两个新兴 Reddit 社区（r/OpenClaw 与 r/Moltbook，2026 年 1 月到 2 月），用主题模型、按互动加权的显著性和差异检验，观察监督期望如何形成。"
      },
      intro: {
        en: "Everyone says they want human control over AI agents, but do they mean the same thing? 🧭 We compared two newly active Reddit communities from January and February 2026, r/OpenClaw (deploying and running agents) and r/Moltbook (agents socializing). Both use “human control” as an anchor term, yet the meaning splits. OpenClaw cares about execution guardrails and recovery, which is action risk. Moltbook cares about identity, legitimacy and accountability, which is meaning risk. So oversight should fit the agent's role instead of one policy for everything.",
        zh: "大家都说要对 AI 智能体保持“人类控制”，但说的是同一件事吗？🧭 我们比较了 2026 年 1 月到 2 月两个新活跃起来的 Reddit 社区，r/OpenClaw（部署和运维智能体）和 r/Moltbook（以智能体为中心的社交）。两边都把“人类控制”当作锚点词，含义却分道扬镳。OpenClaw 关心执行护栏和出错恢复，也就是行动风险；Moltbook 关心身份、正当性和问责，也就是意义风险。所以监督方式应该匹配智能体的角色，而不是一刀切。"
      },
      takeaway: {
        en: "“Human control” is a shared anchor term, but its meaning diverges by role. The deployment community stresses execution guardrails and recovery (action-risk), while the agent-social community stresses identity, legitimacy and accountability (meaning-risk). Oversight should match the agent's role, not follow one-size-fits-all policies.",
        zh: "“人类控制”是两个社区共同的锚点词，但含义因角色而异。部署运维社区强调执行护栏与恢复（行动风险），智能体社交社区强调身份、正当性与问责（意义风险）。监督机制应当与智能体的角色相匹配，而不是一刀切。"
      },
      keywords: "oversight human control agents agentic reddit topic modeling community openclaw moltbook guardrails 监督 人类控制 智能体 社区 主题模型",
      abstract: "Oversight for agentic AI is often discussed as a single goal (“human control”), yet early adoption may produce role-specific expectations. We present a comparative analysis of two newly active Reddit communities in Jan–Feb 2026 that reflect different socio-technical roles: r/OpenClaw (deployment and operations) and r/Moltbook (agent-centered social interaction). We conceptualize this period as an early-stage crystallization phase, where oversight expectations form before norms reach equilibrium. Using topic modeling in a shared comparison space, a coarse-grained oversight-theme abstraction, engagement-weighted salience, and divergence tests, we show the communities are strongly separable (JSD = 0.418, cosine = 0.372, permutation p = 0.0005). Across both communities, “human control” is an anchor term, but its operational meaning diverges: r/OpenClaw emphasizes execution guardrails and recovery (action-risk), while r/Moltbook emphasizes identity, legitimacy, and accountability in public interaction (meaning-risk). The resulting distinction offers a portable lens for designing and evaluating oversight mechanisms that match agent role, rather than applying one-size-fits-all control policies."
    },
    {
      id: "cultural-governance",
      title: "Culturally-Grounded Governance for Multilingual Language Models: Rights, Data Boundaries, and Accountable AI Design",
      authors: ["Hanjing Shi", "Dominic DiFranzo"],
      date: "2025-06-01",
      year: 2025,
      type: "workshop",
      venue: "HCII 2025 Workshop “Generative AI for Collaborative Experiences and Enhanced User Interactions in Mixed Reality”",
      venueShort: "HCII 2025 Workshop",
      theme: "platforms",
      links: { arxiv: "https://arxiv.org/abs/2602.00497", pdf: "https://arxiv.org/pdf/2602.00497" },
      methods: ["Conceptual / synthesis"],
      summary: {
        en: "A conceptual agenda that reframes the governance of multilingual large language models as a sociocultural, rights-based problem.",
        zh: "一个概念性议程，把多语言大模型的治理重新理解为社会文化与权利问题。"
      },
      intro: {
        en: "Language models speak many languages, but the rules for governing them mostly assume English. 🌏 This conceptual paper treats the governance of multilingual LLMs as a sociocultural, rights-based problem. English-centric data and abstract ideas of fairness put low-resource languages and marginalized communities at risk. We call for culturally grounded data stewardship, transparency and participatory accountability, so that scale doesn't reproduce global inequalities.",
        zh: "语言模型会说很多种语言，但治理它们的规则大多默认英语。🌏 这篇概念性论文把多语言大模型的治理看作一个社会文化和权利问题。以英语为中心的数据和抽象的公平观念，会让低资源语言和边缘化社区承担风险。我们呼吁基于文化的数据管理、透明度和参与式问责，别让规模化复制全球的不平等。"
      },
      takeaway: {
        en: "English-centric data and abstract notions of fairness put low-resource languages and marginalized communities at risk. Governance needs culturally grounded data stewardship, transparency and participatory accountability, so that scale doesn't reproduce global inequalities.",
        zh: "以英语为中心的数据和抽象的“公平”观念，会让低资源语言与边缘社群承担风险。治理需要文化根植的数据管理、透明度和参与式问责，避免“规模化”复制全球不平等。"
      },
      keywords: "multilingual language models llm governance culture cultural low-resource languages rights fairness data stewardship 多语言 大模型 治理 文化 公平",
      abstract: "Multilingual large language models (MLLMs) are increasingly deployed across cultural, linguistic, and political contexts, yet existing governance frameworks largely assume English-centric data, homogeneous user populations, and abstract notions of fairness. This creates systematic risks for low-resource languages and culturally marginalized communities, where data practices, model behavior, and accountability mechanisms often fail to align with local norms, rights, and expectations. Drawing on cross-cultural perspectives in human-centered computing and AI governance, this paper synthesizes existing evidence on multilingual model behavior, data asymmetries, and sociotechnical harm, and articulates a culturally grounded governance framework for MLLMs. We identify three interrelated governance challenges: cultural and linguistic inequities in training data and evaluation practices, misalignment between global deployment and locally situated norms, values, and power structures, and limited accountability mechanisms for addressing harms experienced by marginalized language communities. Rather than proposing new technical benchmarks, we contribute a conceptual agenda that reframes multilingual AI governance as a sociocultural and rights based problem. We outline design and policy implications for data stewardship, transparency, and participatory accountability, and argue that culturally grounded governance is essential for ensuring that multilingual language models do not reproduce existing global inequalities under the guise of scale and neutrality."
    },
    {
      id: "critique-hat",
      title: "A Critique of Human-Autonomous Team Dynamics: Contrasting Qualitative and Quantitative Perspectives",
      authors: ["Hanjing Shi"],
      date: "2023-12-11",
      year: 2023,
      type: "preprint",
      venue: "arXiv preprint arXiv:2312.06789",
      venueShort: "arXiv 2023",
      theme: "teaming",
      links: { arxiv: "https://arxiv.org/abs/2312.06789", pdf: "https://arxiv.org/pdf/2312.06789" },
      methods: ["Critical review"],
      summary: {
        en: "A critique contrasting a qualitative study (Musick et al.) and a quantitative study (Schelble et al.) of human-autonomy teams.",
        zh: "一篇评论，对比人与自主体团队（HAT）研究中的一项定性研究（Musick 等）与一项定量研究（Schelble 等）。"
      },
      intro: {
        en: "A throwback to 2023! 📜 This critique puts two studies of human-autonomy teams side by side, a qualitative one by Musick et al. and a quantitative one by Schelble et al. Both find that teams with more humans tend to outperform teams with more AI agents, which shows how much human perception matters. What I'd like to see next is research on teams where AI takes the leading role, and on how trust and skepticism form there.",
        zh: "来自 2023 年的一篇老朋友！📜 这篇评论把两项关于人与自主系统组队的研究放在一起比较，一项是 Musick 等人的定性研究，一项是 Schelble 等人的定量研究。两者都发现，人类成员更多的团队往往比 AI 智能体更多的团队表现更好，说明人的感知有多重要。我希望接下来有人研究 AI 担任主导角色的团队，看看信任和怀疑是怎样在那里形成的。"
      },
      takeaway: {
        en: "Both lines of work find that teams with more humans tend to outperform teams with more agents, highlighting the role of human perception. Future work should study teams where AI plays the dominant role, and how trust and skepticism form there.",
        zh: "两类研究都发现以人为主的团队往往优于以智能体为主的团队，凸显了人类感知的作用。未来应当研究 AI 占主导的团队，以及那里的信任与怀疑如何形成。"
      },
      keywords: "human-autonomy teaming hat critique qualitative quantitative teams team cognition perception 团队 人机协作 评论",
      abstract: "The critique paper provides an in-depth analysis of two influential studies in the field of Human-Autonomous Teams (HATs). Musick et al. explored qualitative dimensions of HAT dynamics, examining the influence of team composition on emotions, cognitive processes, and the development of team cognition. Their research revealed that teams with a majority of human members, known as Multi-Human HATs, generally surpass Multi-Agent HATs in performance, highlighting the critical influence of human perception on team dynamics. Employing qualitative interview analysis anchored in theoretical frameworks, Musick et al. captured the detailed subtleties of participants' experiences. In contrast, Schelble et al. utilized a quantitative methodology to provide data-driven insights into how the perception of AI teammates affects team performance. Despite the rich insights from Musick et al.'s qualitative research, their findings face limitations in terms of broader applicability. Both Musick et al. and Schelble et al. agree in their conclusions that Multi-Human HATs typically outperform their Multi-Agent counterparts, again emphasizing the crucial role of human perception in team dynamics. The critique paper suggests that future research should focus on understanding perceptions of teams heavily reliant on AI. Such investigations could illuminate how trust and skepticism are shaped in teams where AI plays a dominant role."
    }
  ],

  // Work in progress. Nothing public to link to yet, so these are described without links.
  projects: [
    {
      id: "afterglow-petopia",
      title: "Afterglow Petopia",
      status: "review",
      theme: "persona",
      en: "Designing AI-mediated memorial systems for pet bereavement, and studying how generative agents and multimodal memorial artifacts can help people remember their pets and make sense of a bond that continues.",
      zh: "为失去宠物的人设计 AI 纪念系统，研究生成式智能体和多模态纪念物怎样帮助人们记住自己的宠物，理解这段关系在离别之后如何延续。",
      intro: {
        en: "This one is under review right now, so fingers crossed! 🤞🐾 Afterglow Petopia is about losing a pet. I'm designing AI memorial systems and studying how generative agents and multimodal keepsakes can help people remember their pets and make sense of a bond that keeps going.",
        zh: "这个项目正在审稿中，一起祈祷吧！🤞🐾 Afterglow Petopia 关于失去宠物这件事。我在设计 AI 纪念系统，研究生成式智能体和多模态纪念物怎样帮人们记住自己的宠物，理解这份仍在延续的牵绊。"
      },
      keywords: "afterglow petopia pet pets memorial bereavement grief loss griefbot generative agents multimodal remember 宠物 纪念 离别 哀伤 悼念"
    },
    {
      id: "cyber-safety-chatbot",
      title: "Cyber Safety Chatbot Co-Design",
      status: "progress",
      theme: "platforms",
      en: "Interviews and surveys with teenagers about phishing, scams, privacy risks and cyberbullying, feeding into safety chatbot prototypes that guide through stories and can step in to protect in real time.",
      zh: "通过访谈和问卷了解青少年眼中的网络钓鱼、诈骗、隐私风险和网络霸凌，并据此开发安全聊天机器人原型，既能用故事引导，也能实时介入保护。",
      intro: {
        en: "This one is about keeping teens safe online. 🛡️ Through interviews and surveys, we asked teenagers about phishing, scams, privacy risks and cyberbullying. Now we're building safety chatbot prototypes that guide through stories and can step in to protect in real time.",
        zh: "这个项目关于青少年的网络安全。🛡️ 我们通过访谈和问卷，了解青少年对网络钓鱼、诈骗、隐私风险和网络霸凌的看法。现在正在开发安全聊天机器人原型，既能用故事来引导，也能在风险出现时实时介入保护。"
      },
      keywords: "cyber safety chatbot co-design teens teenagers youth phishing scams privacy cyberbullying interviews surveys 网络安全 聊天机器人 青少年 诈骗 钓鱼 隐私 网络霸凌"
    },
    {
      id: "misogyny-nudge",
      title: "Truman / UCL Online Misogyny Nudge Study",
      status: "progress",
      theme: "platforms",
      en: "Advising on NLP moderation and model validation for a simulated social media experiment that tests whether text nudges reduce online misogyny before people post.",
      zh: "为一项模拟社交媒体实验提供 NLP 内容审核与模型验证方面的设计建议，这项实验检验文字提示能否在发帖之前减少网络厌女言论。",
      intro: {
        en: "Can a gentle nudge stop a mean post before it goes out? 💬 This Truman / UCL study runs a simulated social media experiment to test whether text nudges reduce online misogyny before people post. My part is advising on the NLP moderation and model validation design.",
        zh: "一句温和的提醒，能不能在恶意帖子发出去之前拦住它？💬 这项 Truman / UCL 研究用模拟社交媒体做实验，检验文字提示能否在发帖之前减少网络厌女言论。我负责在 NLP 内容审核和模型验证的设计上提供建议。"
      },
      keywords: "truman ucl misogyny nudge nudges moderation nlp model validation simulated social media experiment harassment sexism 厌女 提示 内容审核 模拟社交媒体"
    }
  ],

  news: [
    { date: "Soon", paper: "borrowed-authority",
      en: "Coming up soon, I'll be presenting “Tracing Borrowed Authority in Relational AI Systems” at the AIES 2026 Student Program.",
      zh: "即将到来，我会在 AIES 2026 学生项目展示《Tracing Borrowed Authority in Relational AI Systems》。" },
    { date: "2026", paper: "pathway-lab",
      en: "Poster at CSCW 2026: “Pathway Lab”, a design probe for redirecting adolescent peer conflict before it becomes bullying.",
      zh: "CSCW 2026 海报《Pathway Lab》，一个在青少年冲突演变成霸凌之前，引导他们转向的设计探针。" },
    { date: "2026-09", paper: "his-name",
      en: "New preprint “His Name, Their Judgment” asks what happens when AI personas speak for a deceased expert.",
      zh: "新预印本《His Name, Their Judgment》，探讨当 AI 分身替逝去的专家“说话”时会发生什么。" },
    { date: "2026-08", paper: "beloved-afterlives",
      en: "Three new preprints on evidence pooling in human-AI teaming research, the reduced-supervision paradox of AI agents, and governing AI resurrection beyond consent.",
      zh: "三篇新预印本，关于人机协作研究中的证据合并问题、AI 智能体的“减少监督悖论”，以及超越“同意”的 AI 复活治理。" },
    { date: "2026-08", paper: "learning-signals",
      en: "Our bounded-confidentiality framework for educational AI agents is out in PMLR 339.",
      zh: "关于教育 AI 智能体“有边界的保密”的论文收录于 PMLR 339。" },
    { date: "2026-06", paper: "classpulse",
      en: "ClassPulse, an AI-supported programming homework platform, appears at AIED 2026.",
      zh: "AI 辅助编程作业平台 ClassPulse 发表于 AIED 2026。" },
    { date: "2026-05", paper: "covid-framing",
      en: "Two papers out, on COVID-19 framing across platforms (ICWSM 2026) and pseudonymity & verification friction (ACM WebSci 2026).",
      zh: "两篇论文发表，分别是跨平台的新冠话语框架（ICWSM 2026），以及化名与验证门槛（ACM WebSci 2026）。" },
    { date: "2026-04", paper: "who-gets-credit",
      en: "“Who Gets Credit?” appears in CHI 2026 Extended Abstracts, alongside two CHI 2026 workshop papers on agentic AI.",
      zh: "《Who Gets Credit?》收录于 CHI 2026 Extended Abstracts，另有两篇关于智能体 AI 的 CHI 2026 workshop 论文。" }
  ],

  /*
   * Talks & videos. Add one entry per LinkedIn (or YouTube) video, e.g.
   *   { paper: "who-gets-credit", title: "Who Gets Credit? · 3-minute walkthrough",
   *     linkedin: "https://www.linkedin.com/posts/...",               // link-out (always works)
   *     embed: "https://www.linkedin.com/embed/feed/update/urn:li:..." } // from “Embed this post”
   * YouTube: { paper: "...", title: "...", youtube: "https://youtu.be/VIDEO_ID" }
   */
  videos: [
    { paper: "who-gets-credit", drive: "1RcvT4t2lLVgGDG28kfh8wDOy0kr-qV2S", thumb: "images/talks/who-gets-credit.jpg",
      title: "Who Gets Credit? Operationalizing AI Disclosure as Epistemic Coordination", venue: "CHI 2026" },
    { paper: "designing-safety", drive: "1ebqSK1dKOPiPprcQFx82D4kv32BOh_sw", thumb: "images/talks/designing-safety.jpg",
      title: "Designing for Safety in Sensitive Online Spaces", venue: "ACM WebSci 2026" },
    { paper: "alignment-in-time", drive: "1tfT0H80TEhxTJmCsSepJhtPaIP_Jm4K4", thumb: "images/talks/alignment-in-time.jpg",
      title: "From Accuracy to Appropriate Reliance: A Peak-End Perspective on Long-Horizon Automation Experience", venue: "AutomationXP26 Workshop @ CHI 2026" }
  ],

  // Posters and slides shown at the Talks & Posters hall.
  posters: [
    { paper: "pathway-lab", venue: "CSCW 2026", image: "images/posters/pathwaylab-cscw2026.jpg", thumb: "images/posters/thumbs/pathwaylab-cscw2026.jpg", file: "files/pathwaylab-cscw2026-poster.pdf" },
    { paper: "borrowed-authority", venue: "AIES 2026 Student Program (upcoming)", image: "images/posters/tracing-borrowed-authority-aies2026.jpg", thumb: "images/posters/thumbs/tracing-borrowed-authority-aies2026.jpg", file: "files/tracing-borrowed-authority-aies2026-poster.pdf" },
    { paper: "classpulse", venue: "AIED 2026", image: "images/posters/classpulse-aied2026.jpg", thumb: "images/posters/thumbs/classpulse-aied2026.jpg" },
    { paper: "covid-framing", venue: "ICWSM 2026 · slides", image: "images/posters/icwsm2026-slides.jpg", thumb: "images/posters/thumbs/icwsm2026-slides.jpg", file: "files/covid-framing-icwsm2026-slides.pdf" }
  ],

  // Conference photos (interactive version only).
  conferencePhotos: [
    { src: "images/conference/la-talk.jpg", caption: "Giving a talk at ICWSM 2026, Los Angeles" },
    { src: "images/conference/poster-covid-framing.jpg", caption: "With my COVID-19 framing poster at ICWSM 2026" },
    { src: "images/conference/poster-session.jpg", caption: "Poster session at ICWSM 2026" },
    { src: "images/conference/aied2026-classpulse.jpg", caption: "Demoing ClassPulse at AIED 2026, Seoul" },
    { src: "images/conference/aied2026-cats-workshop.jpg", caption: "8th International Workshop on Culturally-Aware Tutoring Systems at AIED 2026, Seoul" },
    { src: "images/conference/aied2026-session.jpg", caption: "AIED 2026, Seoul" },
    { src: "images/conference/aied2026-table.jpg", caption: "Between sessions at AIED 2026" },
    { src: "images/conference/seoul-group.jpg", caption: "Seoul, during AIED 2026" },
    { src: "images/conference/css2025-talk.jpg", caption: "Presenting COVID-19 framing at CSSSA 2025" }
  ],

  tutorials: [
    {
      id: "r",
      title: "R Cheat Sheet",
      label: "R",
      href: "tutorials/Rcheatsheet.html",
      pdf: "tutorials/Rcheatsheet.pdf",
      lang: "中文",
      desc: {
        en: "From installing packages and R Markdown to cleaning data (missing values, outliers), reshaping wide/long tables, the apply family, and ggplot2 plotting.",
        zh: "从装包、R Markdown，到数据清洗（缺失值、异常值）、宽表长表转换、apply 系列函数和 ggplot2 绘图。"
      },
      keywords: "r rstudio rmarkdown ggplot data cleaning na outlier apply reshape tidyverse 数据清洗 绘图"
    },
    {
      id: "python",
      title: "Python Tutorials",
      label: "Python",
      href: "tutorials/Python-Tutorials.html",
      lang: "中文",
      desc: {
        en: "14 beginner lessons covering data types, operators, control flow, functions, modules, OOP, exceptions, files, networking, databases, regular expressions and multithreading.",
        zh: "14 节入门课，涵盖数据类型、运算符、控制流、函数、模块、面向对象、异常处理、文件、网络、数据库、正则表达式和多线程。"
      },
      keywords: "python programming beginner lessons oop functions regex database 编程 入门"
    },
    {
      id: "stats",
      title: "Statistics Cheat Sheet",
      label: "Stats",
      href: "tutorials/statscheatsheet.html",
      lang: "中文",
      desc: {
        en: "Core statistics with R code, covering distributions, significance and confidence intervals, t-tests, ANOVA with post-hoc tests, multi-factor ANOVA, regression, chi-square and SEM.",
        zh: "配有 R 代码的统计学基础，涵盖分布、显著性与置信区间、t 检验、方差分析与事后检验、多因素方差分析、回归、卡方检验和结构方程模型。"
      },
      keywords: "statistics stats t-test anova regression chi-square sem hypothesis testing confidence interval 统计 检验 方差分析 回归"
    },
    {
      id: "web",
      title: "Front-end Basics: HTML, CSS & JavaScript",
      label: "Web",
      href: "tutorials/js.html",
      lang: "中文",
      desc: {
        en: "HTML and CSS foundations, practical CSS recipes (paper-like overlays, circular profile photos, alignment), responsive design, then JavaScript, the DOM, events and animation.",
        zh: "HTML 和 CSS 基础、实用 CSS 技巧（仿纸张层、圆形头像、对齐）、响应式设计，再到 JavaScript、DOM、事件和动画。"
      },
      keywords: "html css javascript js web front-end frontend dom animation responsive 前端 网页"
    }
  ],

  writing: [
    {
      id: "bayesian",
      title: "Bayesian Statistics",
      zhTitle: "贝叶斯统计",
      href: "blog/bayesian.html",
      desc: {
        en: "Bayes' theorem, Bayesian networks, MCMC and hierarchical models, with a Hogwarts-themed example.",
        zh: "贝叶斯定理、贝叶斯网络、MCMC 和层次模型，还有一个霍格沃茨主题的例子。"
      },
      keywords: "bayesian bayes statistics mcmc hierarchical model prior posterior 贝叶斯 统计"
    },
    {
      id: "timeseries",
      title: "Time Series Analysis",
      zhTitle: "时间序列分析",
      href: "blog/timeseries.html",
      desc: {
        en: "Components of a time series and how to fit MA, AR, ARMA, ARIMA and SARIMA models in R.",
        zh: "时间序列的组成部分，以及如何在 R 中拟合 MA、AR、ARMA、ARIMA 和 SARIMA 模型。"
      },
      keywords: "time series arima sarima forecasting autoregressive moving average 时间序列 预测"
    }
  ],

  gpts: [
    { name: "Academic Mentor", zh: "研博申请", href: "https://chat.openai.com/g/g-nnEjq1bY7-academic-mentor",
      desc: "Grad-school application coach for Master's and Ph.D. hopefuls." },
    { name: "DataScience-GPT", zh: "数据科学", href: "https://chat.openai.com/g/g-Q3jdUYlBh-datascience-gpt",
      desc: "Your data analysis expert." },
    { name: "Academic Ace", zh: "STEM 学术写作", href: "https://chat.openai.com/g/g-PbOe4SHqm-academic-ace",
      desc: "Academic writing coach for STEM and CS grad students." },
    { name: "ML Mastermind", zh: "机器学习 / NLP", href: "https://chat.openai.com/g/g-O7uAQ9PJd-ml-mastermind",
      desc: "Tutor in ML, NLP and CV, blending theory with Python practice." },
    { name: "Genome Analyst", zh: "生物信息", href: "https://chat.openai.com/g/g-WAXy42h5O-genome-analyst",
      desc: "Bilingual (English/Chinese) bioinformatics helper focused on genetics." },
    { name: "Sorting Hat", zh: "霍格沃茨分院帽 · 个人任务管家", href: "https://chat.openai.com/g/g-RUFv6ZEyU-sorting-hat",
      desc: "A Hogwarts-style daily planner that maps magical class names to real coursework." }
  ],

  // Life outside research — shown only in the interactive version
  // (the basic version stays strictly academic).
  // Social link for restaurant posts: set `foodSocial` to show it.
  foodSocial: "",

  // Cat gallery (interactive version only). To add a photo, put it in
  // images/cats/ (plus a small copy in images/cats/thumbs/) and list it under
  // the cat; to add a cat, add an entry.
  cats: [
    { name: "JinBingBing", zh: "金饼饼", about: "Golden shaded · girl", note: "The youngest sister, and she walks with me around this world.",
      photos: ["images/cats/img-6573.jpg", "images/cats/img-7121.jpg"] },
    { name: "DaHuang", zh: "大黄", about: "Orange · boy", photos: ["images/cats/img-3783.jpg"] },
    { name: "XiaoHei", zh: "小黑", about: "Gray & black · boy", photos: ["images/cats/img-0668.jpg"] },
    { name: "XiaoHeiHei", zh: "小黑黑", about: "Black · girl", photos: ["images/cats/img-0499.jpg"] },
    { name: "TuanZi", zh: "团子", about: "Ragdoll · boy", photos: ["images/cats/img-1804.jpg"] },
    { name: "GuoZi", zh: "果子", about: "Silver shaded", photos: ["images/cats/img-1185.jpg", "images/cats/img-1187.jpg", "images/cats/dsc00311.jpg"] }
  ],

  // The "try something new" food wheel.
  dishes: ["Hot pot", "Ramen", "Tacos", "Dim sum", "Pho", "Korean BBQ", "Pizza", "Biryani", "Sushi", "Brisket", "Dumplings", "Paella"],
  life: [
    { id: "travel", icon: "suitcase", title: "Road trips",
      en: "I love to travel. I've driven all the way around the U.S. twice, visited 46 of the 50 states, and lived for years on both the East and West Coasts.",
      zh: "我很爱旅行，自驾环绕美国两圈，去过美国 50 个州里的 46 个，在东西海岸都生活过很多年。",
      stats: { trips: 2, states: 46 },
      keywords: "travel traveling trip trips road trip roadtrip drive driving drove states state usa america united east coast west coast lived live places explore 旅行 旅游 自驾 州 美国 东海岸 西海岸" },
    { id: "food", icon: "pot", title: "Food",
      en: "I never say no to good food. I love trying signature dishes from different countries, because food is one of my favorite ways to learn about a culture. In my spare time I post my restaurant finds on social media, and I love cooking too. There's something deeply satisfying about making a meal from scratch.",
      zh: "美食当前，我从不说不。我喜欢尝试各个国家的特色菜，食物是我了解一种文化最喜欢的方式。业余时间我会在社交媒体上发探店记录；我也喜欢做饭，从零开始做出一顿饭，有一种很深的满足感。",
      keywords: "food foodie eat eating restaurant restaurants cuisine dish dishes try new things social media reviews cooking cook meal 美食 吃货 探店 餐厅 做饭 烹饪" },
    { id: "cats", icon: "cat", title: "Cats",
      en: "Six. Yes, six. 🐾 JinBingBing, DaHuang, XiaoHei, XiaoHeiHei, TuanZi and GuoZi. Technically I live in their house. JinBingBing is the youngest, so of course she runs the place. That's why she follows me all around this world.",
      zh: "六只！没错，六只 🐾 金饼饼、大黄、小黑、小黑黑、团子和果子。严格来说，是我住在它们家。金饼饼是最小的妹妹，所以家里当然她说了算，这就是为什么她一路跟着我逛这个世界。",
      keywords: "cat cats kitten kitty kitties pet pets golden shaded youngest sister six gallery meow jinbingbing dahuang xiaohei xiaoheihei tuanzi guozi ragdoll orange silver 猫 猫咪 小猫 宠物 金渐层 妹妹 六只 金饼饼 大黄 小黑 小黑黑 团子 果子 布偶 银渐层" },
    { id: "blogging", icon: "brush", title: "Writing",
      en: "I'm an avid blogger on RedNote (Xiaohongshu), and I like sharing my experiences and thoughts with a wider audience.",
      zh: "我很爱在小红书上写博客，和更多人分享我的经历和想法。",
      keywords: "blog blogging write writing share 博客 写作 分享" }
  ]
};
