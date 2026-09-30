/* Optional little rituals. Existing introductions and guide replies stay in guide.js. */
(function () {
  "use strict";
  var hints = {
    en: ["Grind some ink", "Roll the cat film", "Let the pot simmer", "Watch the koi"],
    zh: ["磨墨", "放一卷猫片", "开饭啦", "看看锦鲤"]
  };
  var rituals = [
    { match: /^(磨墨|研墨|先磨一会儿墨|grind some ink)$/i, go: "writing", action: "ink",
      en: "Let's grind the ink slowly. The ideas can take their time, too. Give a paper crane a gentle tap while we wait.",
      zh: "先把墨磨匀，想法也慢慢来。旁边的纸鹤也想伸个懒腰，轻轻点一只看看～" },
    { match: /^(放一卷猫片|开映啦|roll the cat film)$/i, go: "life", focus: { life: "cats" }, action: "projector",
      en: "Rolling! Six cats, and every one gets a turn in the spotlight. Let's meet the cast.",
      zh: "开映啦～六只猫，每一只都要有镜头。来认认我们家的主演们。" },
    { match: /^(开饭啦|锅里咕嘟咕嘟|let the pot simmer)$/i, go: "life", focus: { life: "food" }, action: "simmer",
      en: "Let it simmer a little longer. While we wait, shall we spin the wheel and pick something new to try?",
      zh: "锅里再咕嘟一会儿。等着的时候，转转美食轮盘，看看今天试点什么新口味？" },
    { match: /^(小黑洗脸|给大哥哥洗脸|let xiaohei groom)$/i, go: "life", focus: { life: "cats" }, action: "groom",
      en: "Our oldest brother has his own pace. A little paw wash, and then back to his nap. DaHuang is his twin!",
      zh: "大哥哥有自己的节奏：舔舔爪子，洗个脸，再接着睡。大黄是他的双胞胎兄弟～" },
    { match: /^(看看锦鲤|watch the koi)$/i, action: "pond",
      en: "A little ripple, and there she is. Tap another part of the pond and see where she swims up.",
      zh: "水面一动，她就探头啦。再点点池塘别的地方，看她从哪里游出来。" },
    { match: /^(看一会儿月亮|watch the moon)$/i, action: "night",
      en: "Let's stay a moment. The distant windows are lit, and the moon breaks into little silver lines on the water.",
      zh: "在这儿多待一会儿吧。远处的窗亮着，月亮落进水里，碎成一点点银光。" }
  ];
  window.HJRituals = {
    answer: function (q, lang) {
      if (/^(带我找彩蛋|找彩蛋|还有什么小彩蛋|show me the little rituals)$/i.test(q)) {
        return { lang: lang, text: lang === "zh" ? "咱们慢慢逛～可以磨墨、放猫片，或者等锅里咕嘟起来。猫猫、水面和毕业帽也都有小动作。" : "Let's wander. We can grind ink, roll a cat film, or put the pot on to simmer. The cats, pond and graduation cap have little surprises, too.", html: "", chips: hints[lang].slice() };
      }
      for (var i = 0; i < rituals.length; i++) {
        var r = rituals[i];
        if (r.match.test(q)) return { lang: lang, text: r[lang], html: "", chips: hints[lang].slice(), go: r.go, focus: r.focus, action: r.action };
      }
      return null;
    },
    screenNotes: {
      plum: { en: "A few plum blossoms. Even a quiet winter has something to say.", zh: "几朵梅花。安安静静的冬天，也有想说的话～" },
      orchid: { en: "The orchids can keep us company while we think.", zh: "想事情的时候，让兰花陪我们一会儿。" },
      bamboo: { en: "A little breathing room between the leaves, and between ideas.", zh: "竹叶之间留一点空，想法之间也留一点空。" },
      chrysanthemum: { en: "No rush. The chrysanthemums and this page can wait.", zh: "不着急，菊花和这一页都可以慢慢看。" }
    },
    pokes: {
      en: ["A paper first, or a cat first? I'll come along either way.", "Some questions need time. We can sit with the cats for a moment.", "Try tapping the pond. The koi has a different entrance every time.", "Every cat gets a turn on that little film screen.", "The inkstone is waiting. Let's write a little, even if it's just Hello World."],
      zh: ["今天先读论文，还是先摸猫？我都陪你。", "有些问题慢慢想，先陪猫猫坐一会儿。", "点点水面，锦鲤每次都有新的出场位置。", "放映机里每只猫都有自己的镜头，谁都不能少。", "砚台里的墨还在，先写一点，哪怕只是 Hello World。"]
    }
  };
})();
