/* Complete painted sprites, articulated without replacing the world's controls. */
(function () {
  "use strict";
  var A = window.HJArt, serial = 0;
  var mobilePaintResources=matchMedia('(pointer: coarse), (max-width: 699px)').matches;
  function paintingSource(name) {
    var theme=/^hanjing-(day|night)(?:-|$)/.exec(name),src='assets/art/'+name+'.webp';
    if(mobilePaintResources&&theme&&(theme[1]==='night')!==(document.documentElement.dataset.theme==='dark'))
      return 'data-paint-theme="'+(theme[1]==='night'?'dark':'light')+'" data-paint-src="'+src+'"';
    return 'href="'+src+'"';
  }
  A.activatePaintTheme=function(theme) {
    document.querySelectorAll('image[data-paint-theme="'+theme+'"]').forEach(function(image){
      image.setAttribute('href',image.getAttribute('data-paint-src'));
      image.removeAttribute('data-paint-src');image.removeAttribute('data-paint-theme');
    });
  };
  var sheets = {
    day: ["hanjing-day",1774,887], night: ["hanjing-night",1774,887],
    cats: ["cats-painted",1536,1024], buildings: ["buildings-painted",1536,1024],
    props: ["belongings-painted",1448,1086], garden: ["garden-painted",1774,887],
    keepsakes: ["keepsakes-painted",1536,1024], details: ["details-painted",1774,887],
    reading: ["reading-painted",1536,1024], finishes: ["finishes-painted",2172,724],
    gallery: ["gallery-screen-painted",1024,1536], research: ["research-painted",1568,1003],
    materials: ["materials-painted",1536,1024], writers: ["writing-grip-painted",1774,887], lowWriting: ["writing-screen-complete-painted",1536,1024],
    scholar: ["scholar-painted",1536,1024], talks: ["talks-painted",1586,992],
    branches: ["branch-signs-painted",1774,887], water: ["water-continuous-painted",1536,1024],
    dayExpressions: ["hanjing-day-expression",2172,724], nightExpressions: ["hanjing-night-expression",2172,724],
    archive: ["tutorial-archive-painted",1086,1448], leaves: ["education-willow-leaves-painted",1536,1024], mailing: ["mailing-painted",1536,1024],
    handLantern: ["hand-lantern-painted",857,1836], nightBody: ["hanjing-night-torso",1024,1536]
  };
  var crops = {
    dayStand: ["day",86,13,492,874], dayPet: ["day",551,244,1219,853], dayWrite: ["day",1231,229,1731,860],
    nightStand: ["night",120,5,413,884], nightPet: ["night",585,241,1214,869], nightWrite: ["night",1289,241,1745,874],
    bingSit: ["cats",37,25,659,595], bingWalk: ["cats",764,33,1506,586],
    heiSleep: ["cats",31,634,777,980], heiGroom: ["cats",870,578,1519,979],
    gate: ["buildings",38,71,763,478], library: ["buildings",804,79,1500,457],
    hall: ["buildings",29,534,786,927], house: ["buildings",792,583,1521,925],
    case: ["props",31,89,373,368], stove: ["props",442,94,700,389], projector: ["props",780,12,1031,438],
    pouf: ["props",1083,185,1427,379], postbox: ["props",68,402,290,738],
    book: ["props",356,507,709,714], cap: ["props",735,478,1078,751], letter: ["props",1116,512,1424,679],
    plant: ["props",24,734,349,1063], spines: ["props",444,751,652,1058],
    scroll: ["props",712,832,1091,1051], brushes: ["props",1121,737,1425,1039],
    flower: ["garden",17,98,451,443], bud: ["garden",580,110,753,437], pads: ["garden",871,101,1336,441],
    reeds: ["garden",1371,24,1758,465], rock: ["garden",14,559,477,842], grass: ["garden",499,494,858,842],
    koi: ["garden",875,575,1337,810], pagoda: ["garden",1356,478,1545,828], pavilion: ["garden",1546,587,1762,829],
    writing: ["keepsakes",81,57,860,511], davis: ["keepsakes",911,34,1413,529],
    georgetown: ["keepsakes",39,513,750,991], lehigh: ["keepsakes",773,562,1506,991],
    sun: ["details",78,35,453,410], moon: ["details",540,40,909,408],
    crane: ["details",963,54,1397,394], star: ["details",1398,54,1734,394],
    tree: ["details",16,421,642,857], board: ["details",646,449,1008,852],
    signpost: ["details",1089,440,1388,853], lantern: ["details",1494,466,1701,856],
    dayRead: ["reading",281,10,690,997], nightRead: ["reading",930,15,1194,1000],
    davisMetal: ["finishes",25,24,688,701], plaque: ["finishes",1465,138,2141,550],
    plaquePanel: ["finishes",1465,348,2141,550], galleryScreen: ["gallery",18,49,1006,1480],
    researchHouse: ["research",17,32,1551,965], dayPortrait: ["day",211,40,369,198], nightPortrait: ["night",166,25,362,221],
    stoneMaterial: ["materials",38,98,1501,315], waterMaterial: ["materials",38,392,1501,653], bankMaterial: ["materials",38,726,1498,927],
    ancientBlue: ["scholar",121,40,433,539], ancientJade: ["scholar",611,40,919,542], ancientOchre: ["scholar",1104,39,1428,543],
    ancientOpen: ["scholar",26,629,612,924], bamboo: ["scholar",615,610,1178,950], scrollBundle: ["scholar",1199,571,1518,954],
    talkHall: ["talks",16,84,1574,920], posterFrame: ["finishes",737,88,1428,675]
  };
  crops.writingLow=['lowWriting',81,57,860,533]; crops.writingCushion=['keepsakes',298,443,523,511];
  crops.dayWrite=['writers',88,18,925,882]; crops.nightWrite=['writers',978,29,1707,876];
  crops.theaterCurtain=['talks',371,420,433,743];
  crops.theaterPodium=['talks',1007,627,1135,758];
  crops.theaterAudience=['talks',231,726,1373,920];
  crops.ancientBlue=['scholar',373,63,432,535];
  crops.ancientJade=['scholar',866,62,918,541];
  crops.ancientOchre=['scholar',1358,68,1424,542];
  crops.branchWriting=['branches',57,34,967,854];
  crops.branchEducation=['branches',986,87,1272,846];
  crops.carvedSignpost=['branches',1289,88,1762,853];
  crops.archiveCabinet=['archive',145,17,988,1409];
  crops.educationLeaves=['leaves',70,64,1472,969];
  crops.dayMail=['mailing',76,9,848,1004];
  crops.nightMail=['mailing',897,16,1524,1004];
  crops.waterMaterial=['water',0,0,1536,1024];
  crops.handLantern=['handLantern',85,48,770,1788];
  crops.nightBody=['nightBody',334,10,679,1504];
  // Shoulder skin follows the upper arm; the same source contours keep the
  // sleeveless armholes intact when the torso texture is drawn by the rig.
  A.humanShoulders={cut:[[[336,349],[339,332],[348,317],[361,307],[370,312],[377,322],[381,335],[382,350],[381,365],[378,378],[374,390],[369,400],[359,394],[350,386],[344,376],[339,363]],[[626,398],[617,394],[611,381],[608,368],[608,351],[610,333],[615,316],[622,305],[635,307],[645,315],[652,327],[656,341],[655,355],[652,369],[647,380],[639,390]]],skin:[[[339,358],[339,341],[340,337],[343,328],[345,324],[347,321],[355,313],[359,311],[365,310],[367,311],[368,312],[373,322],[375,328],[377,335],[378,341],[379,349],[379,370],[378,376],[377,381],[373,391],[371,395],[368,395],[360,392],[357,390],[348,381],[346,378],[343,372],[340,363]],[[612,370],[612,344],[613,338],[615,328],[618,319],[621,313],[623,310],[624,309],[630,309],[634,311],[637,313],[642,318],[645,322],[647,326],[649,331],[651,339],[651,359],[649,367],[648,370],[645,376],[643,379],[637,385],[629,392],[627,393],[621,395],[620,395],[618,391],[616,386],[614,379],[613,375]]]};
  crops.dayHalfBlink=['dayExpressions',245,318,505,385];
  crops.dayBlink=['dayExpressions',966,318,1226,385];
  crops.daySpeech=['dayExpressions',1750,462,1890,544];
  crops.nightHalfBlink=['nightExpressions',292,350,563,401];
  crops.nightBlink=['nightExpressions',962,359,1228,406];
  crops.nightSpeech=['nightExpressions',1698,484,1818,540];

  // Browser viewports isolate sprites; source paintings remain untouched on disk.
  function sprite(name, x, y, w, h, cls, sourceClip) {
    var b = crops[name], s = sheets[b[0]], id = "paint" + (++serial);
    // This atlas crop shares its top-right rows with Bing's walking toes.
    // Exclude that isolated neighbouring fragment, preserving Hei's ear tips.
    if (name === 'heiGroom' && !sourceClip) sourceClip = 'M870 578H1360V598H1519V979H870Z';
    return '<svg class="painted-sprite ' + (cls || '') + '" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" style="width:'+w+'px;height:'+h+'px;overflow:hidden" viewBox="'+b[1]+' '+b[2]+' '+(b[3]-b[1])+' '+(b[4]-b[2])+'" preserveAspectRatio="none" overflow="hidden">' +
      (sourceClip ? '<defs><clipPath id="'+id+'"><path d="'+sourceClip+'"/></clipPath></defs>' : '') +
      '<image '+paintingSource(s[0])+' width="'+s[1]+'" height="'+s[2]+'"'+(sourceClip ? ' clip-path="url(#'+id+')"' : '')+'/></svg>';
  }
  function parsed(markup) {
    return new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">'+markup+'</svg>', 'image/svg+xml').documentElement;
  }
  function html(node) { return node ? new XMLSerializer().serializeToString(node) : ''; }
  function all(root, selector) { return Array.prototype.slice.call(root.querySelectorAll(selector)); }
  function replace(root, selector, markup) {
    all(root, selector).forEach(function(n) { var wrap = parsed(markup); n.replaceWith.apply(n, Array.prototype.slice.call(wrap.childNodes)); });
  }
  function group(cls, inner, attr) { return '<g class="'+cls+'"'+(attr || '')+'>'+inner+'</g>'; }

  // Native eyelids and lips replace only the facial feature that is moving.
  // During a blink the original iris stays in place until the painted lid covers it.
  function faceFeatures(uid) {
    function patch(sheet, source, target, kind) {
      var id='face'+(++serial), s=sheets[sheet], x=target[0], y=target[1], w=target[2], h=target[3];
      return '<g class="painted-face-feature '+kind+'"><defs>'+
        '<filter id="'+id+'Soft" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation=".09"/></filter>'+
        '<mask id="'+id+'Blend" maskUnits="userSpaceOnUse" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'"><rect x="'+(x+.09)+'" y="'+(y+.09)+'" width="'+(w-.18)+'" height="'+(h-.18)+'" rx=".28" fill="white" filter="url(#'+id+'Soft)"/></mask>'+
        '<clipPath id="'+id+'Reveal" clipPathUnits="userSpaceOnUse"><rect class="'+(kind==='face-eyelid'?'face-eye-shutter':'face-mouth-shutter')+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" style="transform-origin:'+x+'px '+y+'px"/></clipPath></defs>'+
        '<g mask="url(#'+id+'Blend)"><g clip-path="url(#'+id+'Reveal)"><svg class="painted-sprite face-feature-paint" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" style="width:'+w+'px;height:'+h+'px;overflow:hidden" viewBox="'+source.join(' ')+'" preserveAspectRatio="none" overflow="hidden"><image '+paintingSource(s[0])+' width="'+s[1]+'" height="'+s[2]+'"/></svg></g></g></g>';
    }
    function features(night,rig) {
      var sheet=night?'nightExpressions':'dayExpressions';
      var crop=rig?(night?[334,10,345,1494]:[186,27,669,1484]):(night?[120,5,293,879]:[86,13,406,861]);
      var box=rig?(night?[29,8,62,184]:[24,8,84,184]):(night?[29,8,62,184]:[17,8,86,184]);
      function mapped(x,y,w,h){return [box[0]+(x-crop[0])*box[2]/crop[2],box[1]+(y-crop[1])*box[3]/crop[3],w*box[2]/crop[2],h*box[3]/crop[3]];}
      var eyes=night?[
        {rect:[960,340,106,68],origin:[1010,367],target:rig?[463.5,152,31/86]:[248.5,95,17/86]},
        {rect:[1125,340,106,68],origin:[1180,371],target:rig?[533,155.5,32/92]:[292,96,18/92]}
      ]:[
        {rect:[961,318,106,67],origin:[1014.5,343],target:rig?[476.5,156,29/83]:[294,94.5,16/83]},
        {rect:[1117,318,106,67],origin:[1170.5,341.5],target:rig?[537.5,155.5,27/83]:[333.5,93.5,15/83]}
      ];
      var markup=eyes.map(function(e){var r=e.rect,p=e.target,k=p[2];return patch(sheet,r,mapped(p[0]+(r[0]-e.origin[0])*k,p[1]+(r[1]-e.origin[1])*k,r[2]*k,r[3]*k),'face-eyelid');}).join('');
      var mouth=night?[1695,475,123,76]:[1750,462,140,82];
      var mx=night?1756.5:1816.5,my=night?485:471;
      var lip=rig?(night?[496.5,204,43/105]:[507.5,206,47/123]):(night?[269,126,30/105]:[312.5,126,31/123]);
      markup+=patch(sheet,mouth,mapped(lip[0]+(mouth[0]-mx)*lip[2],lip[1]+(mouth[1]-my)*lip[2],mouth[2]*lip[2],mouth[3]*lip[2]),'face-speaking');
      return group(night?'o-night':'o-day',markup);
    }
    if(!faceFeatures.running){
      faceFeatures.running=true;
      var motion=matchMedia('(prefers-reduced-motion: reduce)');
      requestAnimationFrame(function followHead(t){
        all(document,'.painted-face-rig').forEach(function(el){
          var root=el.closest('.has-motion-rig');if(!root)return;
          if(root._rigHeadMatrix){el.setAttribute('transform','matrix('+root._rigHeadMatrix.join(' ')+')');return;}
          var angle=motion.matches?0:Math.sin(t/1900)*.3,dy=motion.matches?0:(root._rigBodyDy||0);
          el.setAttribute('transform','translate(0 '+dy.toFixed(3)+') rotate('+angle.toFixed(4)+' 60 43)');
        });
        requestAnimationFrame(followHead);
      });
    }
    return '<g class="painted-face-flat c-root"><g class="c-head" style="transform-origin:60px 43px">'+features(false,false)+features(true,false)+'</g></g><g class="painted-face-rig-wrap"><g class="painted-face-rig">'+features(false,true)+features(true,true)+'</g></g>';
  }

  // The handle follows the left forearm; the hand is painted above its bronze loop.
  function handLantern(x,y) {
    var id='handLanternLight'+(++serial), width=14, height=width*1740/685;
    return '<g class="p-lantern"><defs><radialGradient id="'+id+'"><stop stop-color="#ffd999" stop-opacity=".52"/><stop offset=".35" stop-color="#efb76f" stop-opacity=".2"/><stop offset="1" stop-color="#ce8649" stop-opacity="0"/></radialGradient></defs>'+
      '<ellipse class="hand-lantern-halo" cx="'+x+'" cy="'+(y+16)+'" rx="26" ry="29" fill="url(#'+id+')"/>'+
      sprite('handLantern',x-width/2,y-.2,width,height,'hand-lantern-paint')+
      '<ellipse class="hand-lantern-core" cx="'+x+'" cy="'+(y+15.7)+'" rx="3.8" ry="6.5" fill="#ffe9b6"/></g>';
  }
  function character(uid) {
    function outfit(night) {
      var name = night ? 'nightStand' : 'dayStand', box = night ? [29,8,62,184] : [17,8,86,184];
      var b = crops[name], sx = box[2]/(b[3]-b[1]), sy = box[3]/(b[4]-b[2]);
      function mapped(path) {
        var i = 0;
        return path.replace(/-?\d+(?:\.\d+)?/g, function(n) { var v = +n; return ((i++ % 2) ? box[1]+(v-b[2])*sy : box[0]+(v-b[1])*sx).toFixed(2); });
      }
      var paths = night ? {
        head: 'M150 0L384 0L384 177L150 177Z',
        left: 'M179 194L187 205L189 225L193 255L197 291L195 320L190 348L175 418L158 480L156 502L164 518L160 542L144 552L130 543L121 530L120 509L134 460L148 396L158 338L162 284L162 236L168 208Z',
        right: 'M352 193L359 202L367 221L373 255L376 294L382 351L396 429L405 486L412 509L414 531L408 544L393 553L377 544L366 530L364 510L376 476L361 434L346 392L340 346L337 303L341 267L345 222L348 202Z',
        legLeft: 'M230 809L270 809L271 843L260 884L212 884L212 859Z',
        legRight: 'M274 809L316 809L333 863L335 884L280 884L270 846Z'
      } : {
        head: 'M152 0L450 0L450 200L152 200Z',
        left: 'M163 236Q171 218 188 223Q201 228 206 247L206 310L198 365L191 416L204 456L204 484L202 505L191 538L181 551L166 540L155 512L157 475L152 451L156 415L151 361L152 303Z',
        right: 'M398 236Q406 219 424 240L443 320L459 411L470 453L465 477L463 507L454 542L445 549L429 537L419 509L416 479L416 448L407 397L402 348L388 319Z',
        legLeft: 'M163 710L294 710L282 807L246 861L163 879L95 879L104 844L139 827Z',
        legRight: 'M294 710L403 710L415 805L407 848L373 877L291 877L285 841Z'
      };
      var d = {}; Object.keys(paths).forEach(function(k) { d[k] = mapped(paths[k]); });
      var mask = 'actorMask'+uid+(night ? 'N' : 'D');
      function piece(key, cls, extra) {
        var clip = 'actorPart'+(++serial);
        return '<g class="'+cls+'"'+(extra || '')+'><defs><clipPath id="'+clip+'"><path d="'+d[key]+'"/></clipPath></defs><g clip-path="url(#'+clip+')">'+sprite(name,box[0],box[1],box[2],box[3])+'</g></g>';
      }
      var leftPivot = night ? '40px 51px' : '43px 57px', rightPivot = night ? '78px 51px' : '85px 57px';
      function arm(key,cls,pivot,left) {
        var upper='armUpper'+(++serial), lower='armLower'+(++serial), elbow=night ? 83 : 84;
        var elbowX=left ? (night ? 40 : 36) : (night ? 80 : 90),radius=night ? 3.8 : 5.8;
        var cap='<circle cx="'+elbowX+'" cy="'+elbow+'" r="'+radius+'"/>';
        var shoulder=night ? '<g class="paint-shoulder" style="display:none">'+sprite('nightBody',left ? 35.5 : 24.6,9,62,184,'','M'+A.humanShoulders.skin[left ? 0 : 1].map(function(p){return p.join(' ');}).join('L')+'Z')+'</g>' : '';
        return '<g class="c-arm '+cls+'" style="transform-origin:'+pivot+'"><defs><clipPath id="'+upper+'"><rect x="0" y="0" width="120" height="'+elbow+'"/>'+cap+'</clipPath><clipPath id="'+lower+'"><rect x="0" y="'+elbow+'" width="120" height="65"/>'+cap+'</clipPath></defs>'+shoulder+'<g clip-path="url(#'+upper+')">'+piece(key,'paint-upper-arm')+'</g><g class="paint-forearm" style="transform-origin:'+elbowX+'px '+elbow+'px">'+(night && left ? handLantern(33.9,117.9) : '')+'<g clip-path="url(#'+lower+')">'+piece(key,'paint-lower-arm')+'</g>'+(left ? '' : '<g class="p-letter">'+sprite('letter',night ? 87 : 93,112,21,12)+'</g><g class="p-book">'+sprite('book',night ? 65 : 71.5,107,43,25)+'</g>')+'</g></g>';
      }
      function leg(key,front) {
        var hip=night ? [front ? 65 : 52,177] : [front ? 75 : 46,158];
        var knee=night ? 184 : 174, ankle=night ? 189 : 187;
        var up='thigh'+(++serial),calf='calf'+(++serial),shoe='shoe'+(++serial);
        return '<g class="c-leg '+(front ? 'c-leg-f' : 'c-leg-b')+'" data-human-leg data-phase="'+(front ? 0 : .5)+'" data-upper="'+(knee-hip[1])+'" data-lower="'+(ankle-knee)+'" style="transform-origin:'+hip[0]+'px '+hip[1]+'px">'+
          '<defs><clipPath id="'+up+'"><rect width="120" height="'+(knee+.8)+'"/></clipPath><clipPath id="'+calf+'"><rect y="'+(knee-.8)+'" width="120" height="'+(ankle-knee+1.6)+'"/></clipPath><clipPath id="'+shoe+'"><rect y="'+(ankle-.8)+'" width="120" height="20"/></clipPath></defs>'+
          '<g clip-path="url(#'+up+')">'+piece(key,'paint-thigh')+'</g><g class="paint-knee" style="transform-origin:'+hip[0]+'px '+knee+'px"><g clip-path="url(#'+calf+')">'+piece(key,'paint-calf')+'</g><g class="paint-ankle" style="transform-origin:'+hip[0]+'px '+ankle+'px"><g clip-path="url(#'+shoe+')">'+piece(key,'paint-shoe')+'</g></g></g></g>';
      }
      var armL = arm('left','c-arm-b',leftPivot,true);
      var armR = arm('right','c-arm-f',rightPivot,false);
      var readArms = piece('left','paint-read-left',' style="transform-origin:'+leftPivot+'"') + piece('right','paint-read-right',' style="transform-origin:'+rightPivot+'"');
      return '<g class="'+(night ? 'o-night' : 'o-day')+'"><defs><mask id="'+mask+'" maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="200"><rect width="120" height="200" fill="white"/>'+Object.keys(d).map(function(k) { return '<path d="'+d[k]+'" fill="black" stroke="white" stroke-width=".55"/>'; }).join('')+'</mask></defs>' +
        leg('legLeft',false) + leg('legRight',true) +
        '<g class="c-upper"><g mask="url(#'+mask+')">'+sprite(name,box[0],box[1],box[2],box[3])+'</g>'+group('paint-arm-mount',armL)+group('paint-arm-mount',armR)+
        '<g class="c-arms-read">'+readArms+'</g>'+piece('head','c-head',' style="transform-origin:60px 43px"')+
        '</g></g>';
    }
    function otherPose(night, writing) {
      var name = (night ? 'night' : 'day')+(writing ? 'Write' : 'Pet');
      var xy = writing ? [25,62,119,130] : [21,77,126,115];
      // Writing keeps the complete native shoulder, upper arm and body. Its
      // continuous forearm mesh moves below the real elbow without cutting a
      // hole in this painting or exposing the covered kneeling legs.
      if(writing)return '<g class="'+(night?'o-night':'o-day')+'"><g class="writing-native-base">'+sprite(name,xy[0],xy[1],xy[2],xy[3])+'</g></g>';
      var moving = writing ? 'cb-arm' : 'cr-arm', pivot = writing ? [99,114] : [112,136];
      var clip = 'poseArm'+(++serial), mask = 'poseBody'+(++serial);
      var arm = writing ? 'M99 111L149 103L149 156L114 154Z' : 'M108 129Q112 132 117 133L149 145L151 157L138 159Q123 151 112 147Q109 140 105 138Z';
      var cap=writing ? '' : '<circle cx="112" cy="136" r="3"/>';
      var contacts=writing ? '' : night ? '<ellipse class="pet-foot-contact" cx="60.36" cy="192.05" rx="7.5" ry=".55"/><ellipse class="pet-foot-contact" cx="76.79" cy="189.48" rx="7" ry=".45"/>' : '<ellipse class="pet-foot-contact" cx="69" cy="192.23" rx="7.5" ry=".55"/><ellipse class="pet-foot-contact" cx="82.68" cy="186.75" rx="7" ry=".45"/>';
      return '<g class="'+(night ? 'o-night' : 'o-day')+'">'+contacts+'<defs><clipPath id="'+clip+'"><path d="'+arm+'"/>'+cap+'</clipPath><mask id="'+mask+'" maskUnits="userSpaceOnUse" x="0" y="0" width="160" height="200"><rect width="160" height="200" fill="white"/><path d="'+arm+'" fill="black"/>'+(writing ? '' : '<circle cx="112" cy="136" r="3" fill="white"/>')+'</mask></defs><g mask="url(#'+mask+')">'+sprite(name,xy[0],xy[1],xy[2],xy[3])+'</g><g'+(writing ? ' transform="rotate(-28 99 114)"' : '')+'><g class="'+moving+'" style="transform-origin:'+pivot[0]+'px '+pivot[1]+'px"><g clip-path="url(#'+clip+')">'+sprite(name,xy[0],xy[1],xy[2],xy[3])+'</g></g></g></g>';
    }
    function reading(night) {
      // The page pivots at the spine, above the hands that support the book.
      var page=night ? 'M62 65Q68 61 76 60L75 62Q67 63 62 66Z' : 'M64 63Q71 59 79 59L78 61Q69 61 64 65Z';
      return '<g class="'+(night ? 'o-night' : 'o-day')+'">'+sprite(night ? 'nightRead' : 'dayRead',night ? 35 : 21,8,night ? 50 : 78,184)+'<path d="M'+(night ? '62' : '64')+' 66h1.2m-1.2 1.5h1.2m-1.2 1.5h1.2" fill="none" stroke="#e9d7b6" stroke-width=".35"/><path class="paint-read-page" d="'+page+'" fill="url(#gPaper)" stroke="#ab9777" stroke-width=".25" style="transform-origin:'+(night ? '62px 65px' : '64px 63px')+'"/></g>';
    }
    function graduationCap() {
      if (!A.capHeadTracking) {
        A.capHeadTracking = true;
        requestAnimationFrame(function followCap(t) {
          all(document,'.p-cap-mount').forEach(function(mount) {
            var root=mount.closest('#char,.avatar-demo,.th-avatar');
            if (!root || !root.classList.contains('has-cap')) {
              mount._capRelease=null; mount._capTossStart=null; return;
            }
            var night=document.documentElement.dataset.theme==='dark';
            // The native frontal painting supplies the hair crown. This
            // optional anchor also lets a replacement full-body view report
            // its own crown without moving the cap separately from the head.
            var anchor=root._rigCapAnchor || {x:night?58.2:64.4,y:8};
            var head=root._rigHeadMatrix || [1,0,0,1,0,0];
            var dx=anchor.x-60,dy=anchor.y-8;
            var matrix=[head[0],head[1],head[2],head[3],head[4]+head[0]*dx+head[2]*dy,head[5]+head[1]*dx+head[3]*dy];
            var scale=anchor.headWidth?anchor.headWidth*1.5/43:1;
            var tossing=root.classList.contains('act-toss');
            if (tossing) {
              if (mount._capTossStart===null || mount._capTossStart===undefined) mount._capTossStart=t;
              var elapsed=(t-mount._capTossStart)/1000;
              // Hold the launch coordinate while airborne; head breathing
              // and the celebration jump must not drag a loose cap around.
              if (elapsed>=.288 && elapsed<2.112) {
                if (!mount._capRelease) mount._capRelease={matrix:matrix.slice(),scale:scale};
                matrix=mount._capRelease.matrix; scale=mount._capRelease.scale;
              } else mount._capRelease=null;
            } else { mount._capTossStart=null; mount._capRelease=null; }
            mount.setAttribute('transform','matrix('+matrix.map(function(n){return n.toFixed(5);}).join(' ')+')');
            mount.querySelector('.p-cap-fit').setAttribute('transform','translate(60 20.6) scale('+scale.toFixed(5)+') translate(-60 -20.6)');
          });
          requestAnimationFrame(followCap);
        });
      }
      // Keep the original hat's aspect ratio. Its crown rim overlaps the
      // upper hairline; the board and tassel remain one physical painted cap.
      return '<g class="p-cap"><g class="p-cap-mount"><g class="p-cap-in"><g class="p-cap-fit">'+sprite('cap',40.44,-6,43,43*273/343,'painted-cap')+'</g></g></g></g>';
    }
    return '<svg class="hj-char-svg painted-character" viewBox="0 0 120 200" aria-hidden="true" focusable="false"><g class="c-flip"><ellipse class="c-shadow" cx="60" cy="193" rx="29" ry="3"/><g class="c-root">'+outfit(false)+outfit(true)+'</g><g class="c-reading">'+reading(false)+reading(true)+'</g><g class="c-back">'+otherPose(false,true)+otherPose(true,true)+'</g><g class="c-crouch">'+otherPose(false,false)+otherPose(true,false)+'</g><g class="c-mail">'+mailPose(false)+mailPose(true)+'</g>'+faceFeatures(uid)+graduationCap()+'</g></svg>';
  }
  // A three-quarter pose keeps the shoulder, sleeve and hand in the same painted plane.
  // Only the short forearm gesture moves; the body and upper arm stay continuous.
  function mailPose(night) {
    var name=night?'nightMail':'dayMail', crop=crops[name], k=184/(crop[4]-crop[2]);
    var x=night?14.74:-3.61,w=(crop[3]-crop[1])*k;
    var sourceElbow=night?[1253,273]:[602,272], sourceEnd=night?[1520,257]:[844,245];
    function pt(p){return [x+(p[0]-crop[1])*k,8+(p[1]-crop[2])*k];}
    var e=pt(sourceElbow),h=pt(sourceEnd),r=night?3.1:5.4,id='mail'+(++serial);
    var cutX=e[0],cutY=night?40:44,cutH=night?29:25;
    var letterPath=night?'M1435 240L1518 232L1523 274L1438 282Z':'M757 231L841 219L847 262L760 270Z';
    var letterMapped=letterPath.replace(/-?\d+(?:\.\d+)?/g,(function(){var n=0;return function(v){return (n++%2?8+(+v-crop[2])*k:x+(+v-crop[1])*k).toFixed(3);};})());
    return '<g class="'+(night?'o-night':'o-day')+' mail-profile" data-elbow="'+e.join(',')+'" data-letter-end="'+h.join(',')+'"><defs><mask id="'+id+'Body" maskUnits="userSpaceOnUse" x="-20" y="0" width="200" height="200"><rect x="-20" width="200" height="200" fill="white"/><rect x="'+cutX+'" y="'+cutY+'" width="90" height="'+cutH+'" fill="black"/><circle cx="'+e[0]+'" cy="'+e[1]+'" r="'+r+'" fill="white"/></mask><clipPath id="'+id+'Fore"><rect x="'+cutX+'" y="'+cutY+'" width="90" height="'+cutH+'"/><circle cx="'+e[0]+'" cy="'+e[1]+'" r="'+r+'"/></clipPath><mask id="'+id+'Hand" maskUnits="userSpaceOnUse" x="-20" y="0" width="200" height="200"><rect x="-20" width="200" height="200" fill="white"/><path d="'+letterMapped+'" fill="black"/></mask><clipPath id="'+id+'Letter"><path d="'+letterMapped+'"/></clipPath></defs><g mask="url(#'+id+'Body)">'+sprite(name,x,8,w,184)+'</g><g class="mail-forearm" style="transform-origin:'+e[0]+'px '+e[1]+'px"><g clip-path="url(#'+id+'Fore)"><g class="mail-held-letter" clip-path="url(#'+id+'Letter)">'+sprite(name,x,8,w,184)+'</g><g mask="url(#'+id+'Hand)">'+sprite(name,x,8,w,184)+'</g></g></g></g>';
  }
  requestAnimationFrame(function mailGesture(t){
    var reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    all(document,'.painted-character').forEach(function(svg){
      var root=svg.closest('#char,.avatar-demo,.th-avatar')||svg.parentElement;
      var mail=root.classList.contains('act-mail'),start=root._paintRig&&root._paintRig.times['act-mail'];
      var elapsed=start===undefined?0:(t-start)/1000;
      root.classList.toggle('mail-pose-active',mail&&(reduced||elapsed<2.6));
      if(!mail)return;
      var target=root._rigHandTarget||[131,61],progress=reduced?1:Math.min(1,elapsed/.65);
      var ease=progress*progress*(3-2*progress),retract=reduced?0:Math.max(0,Math.min(1,(elapsed-1.4)/1.2));
      all(svg,'.mail-profile').forEach(function(g){
        var e=g.dataset.elbow.split(',').map(Number),h=g.dataset.letterEnd.split(',').map(Number),vx=h[0]-e[0],vy=h[1]-e[1],len=Math.hypot(vx,vy);
        var a=Math.asin(Math.max(-.8,Math.min(.8,(target[1]-e[1])/len)))-Math.atan2(vy,vx);
        var shift=target[0]-e[0]-(Math.cos(a)*vx-Math.sin(a)*vy);
        g.setAttribute('transform','translate('+shift.toFixed(3)+' 0)');
        g.querySelector('.mail-forearm').style.transform='rotate('+(a*180/Math.PI+18*(1-ease)+22*retract).toFixed(3)+'deg)';
      });
    });
    requestAnimationFrame(mailGesture);
  });
  A.character = character;
  // Petting has its own two-joint chain. Its entire texture stays in one mesh,
  // so moving the elbow cannot uncover the knee or replace a sleeve with a cap.
  var petRigs=[],petArtBase=new URL('../art/',document.currentScript.src);
  // Touch/mobile browsers need no petting context or meshes before the action.
  var lazyPetResources=matchMedia('(pointer: coarse), (max-width: 699px)').matches;
  function petRig(root){
    var canvas=document.createElement('canvas');canvas.className='motion-rig painted-pet-rig';canvas.width=600;canvas.height=660;canvas.setAttribute('aria-hidden','true');
    var gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:true});if(!gl)return;
    function compile(type,source){var s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);return s;}
    var program,buffer,texture,position,uv;
    function initializeGL(){
      program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,'attribute vec2 position;attribute vec2 uv;varying vec2 tex;void main(){gl_Position=vec4((position.x+40.0)/200.0*2.0-1.0,1.0-(position.y+10.0)/220.0*2.0,0.0,1.0);tex=uv;}'));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,'precision mediump float;varying vec2 tex;uniform sampler2D painting;void main(){gl_FragColor=texture2D(painting,tex);}'));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return false;
      gl.useProgram(program);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.viewport(0,0,canvas.width,canvas.height);
      buffer=gl.createBuffer();texture=gl.createTexture();position=gl.getAttribLocation(program,'position');uv=gl.getAttribLocation(program,'uv');gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,16,0);gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,16,8);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);return true;
    }
    if(!initializeGL())return;
    function inside(p,x,y){var hit=false;for(var i=0,j=p.length-1;i<p.length;j=i++)if((p[i][1]>y)!==(p[j][1]>y)&&x<(p[j][0]-p[i][0])*(y-p[i][1])/(p[j][1]-p[i][1])+p[i][0])hit=!hit;return hit;}
    // The influence boundary lies outside the free sleeve/skin silhouette.
    // Only the shoulder connection fades into the unchanged torso.
    var arm=[[82,106],[104,103],[129,130],[149,139],[158,140],[159,167],[134,170],[110,154],[99,141],[81,125]];
    // The sleeveless night portrait has a different shoulder and elbow from
    // the trench coat. This boundary follows its native skin silhouette,
    // outside the free edges and clear of the other hand resting on the knee.
    var nightArm=[[84,109.2],[92,109.5],[96.4,114.8],[100.1,120.3],[108,126.4],[116,130.6],[125,134.8],[137,139.4],[145.6,140.5],[150,148.6],[149,155.4],[140,154.1],[130,148.9],[120,145.1],[111,142.5],[101,138.2],[92.2,132],[84.5,124],[84,116]];
    function petSmooth(a,b,v){var k=Math.max(0,Math.min(1,(v-a)/(b-a)));return k*k*(3-2*k);}
    function petEdge(x,y){var distance=Infinity;for(var i=0,j=arm.length-1;i<arm.length;j=i++){var a=arm[j],z=arm[i],dx=z[0]-a[0],dy=z[1]-a[1],p=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));distance=Math.min(distance,Math.hypot(x-a[0]-dx*p,y-a[1]-dy*p));}var f=Math.max(0,Math.min(1,distance/3));return f*f*(3-2*f);}
    function config(night){var crop=crops[night?'nightPet':'dayPet'],sheet=sheets[crop[0]],image=new Image();image.src=new URL(sheet[0]+'.webp',petArtBase).href;var c={image:image,vertices:[],data:null,shoulder:night?[90,116.7]:[96,113],elbow:night?[106.5,133.4]:[112,136],tip:night?[144.829889,152.262739]:[145.773952,153.477833]};
      function v(cx,cy){
        var x=21+cx,y=77+cy,a,b;
        if(night){
          var ux=c.elbow[0]-c.shoulder[0],uy=c.elbow[1]-c.shoulder[1],fx=c.tip[0]-c.elbow[0],fy=c.tip[1]-c.elbow[1];
          var along=((x-c.shoulder[0])*ux+(y-c.shoulder[1])*uy)/Math.hypot(ux,uy);
          // Skin at the shoulder stays attached to the qipao. Beyond that
          // attachment the whole silhouette moves, including its outer edge.
          a=inside(nightArm,x,y)?petSmooth(-1,8,along):0;
          var fore=((x-c.elbow[0])*fx+(y-c.elbow[1])*fy)/Math.hypot(fx,fy);
          b=petSmooth(-4.5,4.5,fore);
        }else{
          a=inside(arm,x,y)?Math.max(0,Math.min(1,(y-110)/12))*petEdge(x,y):0;
          var dx=x-112,dy=y-136,projection=(dx*33.5+dy*17)/37.56;b=Math.max(0,Math.min(1,(projection+6)/12));
          if(y>141)a*=1-Math.max(0,Math.min(1,(y-141)/6))*(1-Math.max(0,Math.min(1,(x-109)/5)));
        }
        return{x:x,y:y,u:(crop[1]+cx/126*(crop[3]-crop[1]))/sheet[1],v:(crop[2]+cy/115*(crop[4]-crop[2]))/sheet[2],w:[1-a,a*(1-b),a*b]};
      }
      var freeArm=[];
      for(var y=0;y<115;y++)for(var x=0;x<126;x++){
        var a=v(x,y),b=v(x+1,y),d=v(x,y+1),e=v(x+1,y+1);
        [[a,b,d],[b,e,d]].forEach(function(triangle){
          // A relaxed bare hand passes in front of the knee, never behind
          // later body triangles in the original source-image row order.
          var list=night&&triangle.some(function(p){return p.w[0]<1;})?freeArm:c.vertices;
          Array.prototype.push.apply(list,triangle);
        });
      }
      Array.prototype.push.apply(c.vertices,freeArm);
      c.data=new Float32Array(c.vertices.length*4);c.movingVertices=[];c.vertices.forEach(function(v,i){var n=i*4;c.data[n]=v.x;c.data[n+1]=v.y;c.data[n+2]=v.u;c.data[n+3]=v.v;if(v.w[0]<1)c.movingVertices.push(i);});return c;
    }
    var r={root:root,canvas:canvas,configs:lazyPetResources?[null,null]:[config(false),config(true)],upper:0,lower:0,last:0,groomMix:0,current:null};
    r.getConfig=function(night){var i=night?1:0;return r.configs[i]||(r.configs[i]=config(night));};
    canvas.addEventListener('webglcontextlost',function(event){event.preventDefault();r.contextLost=true;r.current=null;r.last=0;canvas.style.display='none';root.classList.remove('has-pet-paint');});
    canvas.addEventListener('webglcontextrestored',function(){if(root._petPaintRig!==r||!initializeGL())return;r.contextLost=false;r.current=null;r.last=0;canvas.style.removeProperty('display');});
    r.draw=function(c,bones){if(r.contextLost||gl.isContextLost()||!c.image.complete||!c.image.naturalWidth)return false;if(r.current!==c.image){gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c.image);r.current=c.image;}
      var dual=bones.map(function(m){var a=Math.atan2(m[1],m[0])/2,co=Math.cos(a),si=Math.sin(a);return[co,si,(m[4]*co+m[5]*si)/2,(m[5]*co-m[4]*si)/2];});
      // The fixed body and all texture coordinates are cached. Only native arm
      // vertices need joint math; this preserves exactly the same geometry.
      for(var o=0;o<c.movingVertices.length;o++){var i=c.movingVertices[o],v=c.vertices[i],qc=0,qs=0,qx=0,qy=0;for(var j=0;j<3;j++){var q=dual[j],w=v.w[j];qc+=q[0]*w;qs+=q[1]*w;qx+=q[2]*w;qy+=q[3]*w;}var k=1/Math.hypot(qc,qs);qc*=k;qs*=k;qx*=k;qy*=k;var cs=qc*qc-qs*qs,sn=2*qc*qs,n=i*4;c.data[n]=cs*v.x-sn*v.y+2*(qx*qc-qy*qs);c.data[n+1]=sn*v.x+cs*v.y+2*(qx*qs+qy*qc);}gl.clear(gl.COLOR_BUFFER_BIT);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,c.data,gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,c.vertices.length);return true;};
    root.appendChild(canvas);root._petPaintRig=r;petRigs.push(r);
  }
  function petRotate(a,p){var cs=Math.cos(a),sn=Math.sin(a);return[cs,sn,-sn,cs,p[0]-cs*p[0]+sn*p[1],p[1]-sn*p[0]-cs*p[1]];}
  function petProduct(a,b){return[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
  function petAim(c,target){var p=c.shoulder,e=c.elbow,h=c.tip,ux=e[0]-p[0],uy=e[1]-p[1],fx=h[0]-e[0],fy=h[1]-e[1],l1=Math.hypot(ux,uy),l2=Math.hypot(fx,fy),dx=target[0]-p[0],dy=target[1]-p[1],d=Math.max(Math.abs(l1-l2)+.1,Math.min(l1+l2-.1,Math.hypot(dx,dy))),direction=Math.atan2(dy,dx),bend=Math.acos(Math.max(-1,Math.min(1,(l1*l1+d*d-l2*l2)/(2*l1*d)))),a=direction+bend,theta=-Math.acos(Math.max(-1,Math.min(1,(d*d-l1*l1-l2*l2)/(2*l1*l2))));return[a-Math.atan2(uy,ux),theta-Math.atan2(fy,fx)+Math.atan2(uy,ux)];}
  requestAnimationFrame(function petFrame(t){
    all(document,'#char,.avatar-demo').forEach(function(root){if(root.querySelector('.c-crouch')&&!root._petPaintRig&&(!lazyPetResources||root.classList.contains('act-pet')))petRig(root);});
    petRigs.forEach(function(r){var root=r.root;if(r.contextLost||!root.isConnected||!root.classList.contains('act-pet')){r.last=0;root.classList.remove('has-pet-paint');return;}var c=r.getConfig(document.documentElement.dataset.theme==='dark'),svg=root.querySelector('.painted-character'),sleep=document.querySelector('.st-life .sc-painted-rest .sc-head'),groom=document.querySelector('.st-life .sleep-cat.is-grooming'),target;
      if(!groom&&sleep&&sleep.getScreenCTM()&&svg.getScreenCTM()){var crown=new DOMPoint(-39+(255.5-31)/746*78,-31+(688.5-634)/346*36).matrixTransform(sleep.getScreenCTM()).matrixTransform(svg.getScreenCTM().inverse());target=[crown.x,crown.y];r.sleepTarget=target;}else target=r.sleepTarget||[133,143];
      var reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,dt=r.last?Math.min(.1,(t-r.last)/1000):0;r.last=t;
      var sweep=reduced?0:Math.sin(t/1100*Math.PI*2);target=[target[0]+sweep*.42,target[1]+sweep*.1];
      var pet=petAim(c,target),mixGoal=groom?1:0;r.groomMix+=Math.max(-dt/0.4,Math.min(dt/0.4,mixGoal-r.groomMix));var mix=r.groomMix*r.groomMix*(3-2*r.groomMix);
      // When XiaoHei raises his head to groom, relax the whole chain beside
      // the knee instead of lowering only the fingers through his face.
      r.upper=pet[0]*(1-mix)+.5*mix;r.lower=pet[1]*(1-mix)+.5*mix;
      var hi=petRotate(r.upper,c.shoulder),lo=petProduct(hi,petRotate(r.lower,c.elbow));if(r.draw(c,[[1,0,0,1,0,0],hi,lo]))root.classList.add('has-pet-paint');r.target=target;r.finger=new DOMPoint(c.tip[0],c.tip[1]).matrixTransform(new DOMMatrix([lo[0],lo[1],lo[2],lo[3],lo[4],lo[5]]));r.grooming=!!groom;
    });requestAnimationFrame(petFrame);
  });
  // A planted foot and a lifted return stroke drive two linked joints.
  function limbAngles(phase, upper, lower, stride, lift) {
    var stance=.62, swing=Math.max(0,(phase-stance)/(1-stance));
    var x=phase<stance ? stride*(1-2*phase/stance) : -stride*Math.cos(swing*Math.PI);
    var y=upper+lower-Math.sin(swing*Math.PI)*lift;
    var reach=Math.min(upper+lower-.02,Math.hypot(x,y));
    function safe(v){return Math.max(-1,Math.min(1,v));}
    var a=Math.acos(safe((upper*upper+reach*reach-lower*lower)/(2*upper*reach)));
    var bend=Math.PI-Math.acos(safe((upper*upper+lower*lower-reach*reach)/(2*upper*lower)));
    return [(Math.atan2(-x,y)-a)*180/Math.PI,bend*180/Math.PI];
  }
  A.poseCharacter=function(root,stride,moving) {
    all(root,'[data-human-leg]').forEach(function(leg) {
      var upper=+leg.dataset.upper,lower=+leg.dataset.lower;
      var angles=moving ? limbAngles((stride+(+leg.dataset.phase))%1,upper,lower,Math.min(5.5,(upper+lower)*.18),Math.min(3.5,(upper+lower)*.16)) : [0,0];
      leg.style.transform='rotate('+angles[0].toFixed(2)+'deg)';
      leg.querySelector('.paint-knee').style.transform='rotate('+angles[1].toFixed(2)+'deg)';
      leg.querySelector('.paint-ankle').style.transform='rotate('+(-angles[0]-angles[1]).toFixed(2)+'deg)';
    });
    root.style.setProperty('--human-bob',moving ? (Math.sin(stride*Math.PI*4)*.45).toFixed(2)+'px' : '0px');
  };
  A.poseCat=function(root,stride,moving) {
    var phases={'hind-near':0,'fore-near':.25,'hind-far':.5,'fore-far':.75};
    all(root,'[data-painted="true"]').forEach(function(leg) {
      var length=+leg.dataset.legLength;
      var angles=moving ? limbAngles((stride+phases[leg.dataset.catLeg])%1,length*.54,length*.46,5,4) : [0,0];
      leg.style.transform='rotate('+angles[0].toFixed(2)+'deg)';
      leg.querySelector('.paint-cat-lower').style.transform='rotate('+angles[1].toFixed(2)+'deg)';
    });
    root.style.setProperty('--cat-body-lift',moving ? (Math.sin(stride*Math.PI*4)*.25).toFixed(2)+'px' : '0px');
  };
  A.portrait = function () {
    return '<svg viewBox="0 0 60 60" aria-hidden="true"><g class="o-day">'+sprite('dayPortrait',0,0,60,60)+'</g><g class="o-night">'+sprite('nightPortrait',0,0,60,60)+'</g></svg>';
  };

  function catPart(name, box, path, cls, attrs) {
    var clip = 'catPart'+(++serial);
    return '<g class="'+cls+'"'+(attrs || '')+'><defs><clipPath id="'+clip+'"><path d="'+path+'"/></clipPath></defs><g clip-path="url(#'+clip+')">'+sprite(name,box[0],box[1],box[2],box[3])+'</g></g>';
  }
  A.cat = function () {
    var sit=[9,7,68,62], walk=[2,6,86,64];
    var tail='M0 0H29V35L22 47L0 42Z';
    var legs=[
      {name:'hind-far',region:'M29 48L42 47L48 70L29 70Z',pivot:[35,48],length:19},
      {name:'fore-far',region:'M54 46L69 47L70 70L55 70Z',pivot:[60,47],length:21},
      {name:'hind-near',region:'M18 48L32 46L29 71L14 71Z',pivot:[23,48],length:21},
      {name:'fore-near',region:'M69 46L85 48L90 71L72 71Z',pivot:[77,48],length:21}
    ];
    function legArt(l) {
      var upper='catUpper'+(++serial),lower='catLower'+(++serial),ky=l.pivot[1]+l.length*.54;
      return '<g class="cat-gait-leg painted-cat-leg '+(l.name.indexOf('fore')===0 ? 'cat-fore-leg ' : '')+'" data-cat-leg="'+l.name+'" data-leg-length="'+l.length+'" data-painted="true" style="transform-origin:'+l.pivot[0]+'px '+l.pivot[1]+'px">'+
        '<defs><clipPath id="'+upper+'"><rect width="90" height="'+(ky+.8)+'"/></clipPath><clipPath id="'+lower+'"><rect y="'+(ky-.8)+'" width="90" height="72"/></clipPath></defs>'+
        '<g class="cat-limb-pose" style="transform-origin:'+l.pivot[0]+'px '+l.pivot[1]+'px"><g clip-path="url(#'+upper+')">'+catPart('bingWalk',walk,l.region,'paint-cat-source')+'</g>'+
        '<g class="paint-cat-lower" style="transform-origin:'+l.pivot[0]+'px '+ky+'px"><g clip-path="url(#'+lower+')">'+catPart('bingWalk',walk,l.region,'paint-cat-source')+'</g></g></g></g>';
    }
    var sitTail='M4 35L36 35L43 58L34 72L4 72Z',sitHead='M43 6H78V33Q67 38 48 36L42 29Z',sm='sitBody'+(++serial),mask='catBody'+(++serial);
    return '<svg class="hj-cat-svg painted-cat" viewBox="0 0 90 72" aria-hidden="true"><ellipse class="cat-shadow" cx="45" cy="70" rx="33" ry="2"/><rect class="cat-hit" x="2" y="6" width="86" height="64" fill="transparent" pointer-events="all"/><g class="cat-flip">'+
      '<g class="cat-sit"><g class="cat-rest-contact"><ellipse class="cat-rest-shade" cx="34" cy="67.8" rx="23" ry="1.2"/><ellipse class="cat-tail-contact" cx="25" cy="68.95" rx="12" ry=".55"/><ellipse class="cat-paw-contact" cx="52.1" cy="66.9" rx="4" ry=".45"/><ellipse class="cat-paw-contact" cx="61.7" cy="66.65" rx="4" ry=".45"/></g><defs><mask id="'+sm+'" maskUnits="userSpaceOnUse" x="0" y="0" width="90" height="72"><rect width="90" height="72" fill="white"/><path d="'+sitTail+'" fill="black" stroke="white" stroke-width=".5"/><path d="'+sitHead+'" fill="black" stroke="white" stroke-width=".6"/></mask></defs>'+
      '<g mask="url(#'+sm+')">'+sprite('bingSit',sit[0],sit[1],sit[2],sit[3])+'</g>'+catPart('bingSit',sit,sitTail,'cat-tail-sit')+
      catPart('bingSit',sit,sitHead,'cat-head',' style="transform-origin:56px 34px"')+
      '<g class="painted-cat-lids"><ellipse cx="58" cy="24" rx="2.2" ry="1.8" fill="#dfcbb0"/><ellipse cx="66" cy="26" rx="2" ry="1.7" fill="#dfcbb0"/><path d="M56 24q2 1.2 4 0M64 26q2 1.2 4 0" fill="none" stroke="#80654b" stroke-width=".5"/></g></g>'+
      '<g class="cat-walk"><defs><mask id="'+mask+'" maskUnits="userSpaceOnUse" x="0" y="0" width="90" height="72"><rect width="90" height="72" fill="white"/><path d="'+tail+'" fill="black"/>'+legs.map(function(l){return '<path d="'+l.region+'" fill="black" stroke="white" stroke-width=".5"/>';}).join('')+'</mask></defs>'+
      catPart('bingWalk',walk,tail,'cat-tail-walk')+legs.map(legArt).join('')+'<g class="cat-torso" mask="url(#'+mask+')">'+sprite('bingWalk',walk[0],walk[1],walk[2],walk[3])+'</g></g></g></svg>';
  };
  function sleeper() {
    function pose(name,box,grooming) {
      var head=grooming ? 'M-38 -46H-3V-12H-38Z' : 'M-41 -35H-6V-8H-41Z';
      var paw='M-38 -18L-27 -19L-23 3L-38 3Z',id='sleeper'+(++serial);
      return '<defs><mask id="'+id+'" maskUnits="userSpaceOnUse" x="-45" y="-55" width="90" height="70"><rect x="-45" y="-55" width="90" height="70" fill="white"/><path d="'+head+'" fill="black" stroke="white" stroke-width=".6"/>'+(grooming ? '<path d="'+paw+'" fill="black" stroke="white" stroke-width=".6"/>' : '')+'</mask></defs>'+
        '<g class="sc-body" mask="url(#'+id+')">'+sprite(name,box[0],box[1],box[2],box[3])+'</g>'+catPart(name,box,head,'sc-head',' style="transform-origin:-9px -10px"')+(grooming ? catPart(name,box,paw,'sc-groom-paw',' style="transform-origin:-25px 1px"') : '');
    }
    return '<g class="sleep-cat painted-sleeper" transform="translate(23 548)"><g class="sc-painted-rest">'+pose('heiSleep',[-39,-31,78,36],false)+'</g><g class="sc-painted-groom">'+pose('heiGroom',[-39,-43,78,48],true)+'</g><g class="sc-purr"><path d="M-20 -34C-25 -39 -29 -32 -20 -28C-11 -32 -15 -39 -20 -34Z" fill="#b89b83" stroke="none" opacity=".5"/></g><g class="zzz"><text x="24" y="-33">z</text></g></g>';
  }
  A.sleepingCat = sleeper;
  A.screenSpots = [[-187,358,93,119],[-85,358,101,119],[23,358,99,119],[130,358,102,119]];

  // Small foil, stitches and worn metal highlights follow the real painted
  // surfaces. They do not contribute hit areas or alter any prop animation.
  function materialHint(path,kind,delay) {
    return '<g class="material-hint-detail '+(kind||'hint-wood')+'" aria-hidden="true" style="--hint-delay:-'+(delay||0)+'s"><path class="material-hint-recess" d="'+path+'" transform="translate(0 .38)"/><path class="material-hint" d="'+path+'"/></g>';
  }
  function sourceHint(name,box,commands,kind,delay) {
    var crop=crops[name],sx=box[2]/(crop[3]-crop[1]),sy=box[3]/(crop[4]-crop[2]);
    var path=commands.map(function(command){
      return command[0]+command.slice(1).map(function(v,i){return ((i%2?box[1]:box[0])+(v-crop[i%2?2:1])*(i%2?sy:sx)).toFixed(2);}).join(' ');
    }).join('');
    return materialHint(path,kind,delay);
  }
  function label(x,y,text,width) {
    return '<g class="paint-label" transform="translate('+x+' '+y+')">'+sprite('plaquePanel',-width/2,-13,width,26)+materialHint('M'+(-width*.18)+' 9.2q'+(width*.18)+' -.35 '+(width*.36)+' 0','hint-wood',width/25)+'<text text-anchor="middle" y="4">'+text+'</text></g>';
  }
  // A shared painted wood sample gives the narrow support beams the same material as the carved signs.
  function timberSupport(shape,grain) {
    var id='paintWood'+(++serial);
    return '<g class="paint-timber"><defs><pattern id="'+id+'" width="48" height="12" patternUnits="userSpaceOnUse"><svg width="48" height="12" viewBox="1604 424 376 82" preserveAspectRatio="none" style="width:48px;height:12px;overflow:hidden"><image href="assets/art/finishes-painted.webp" width="2172" height="724"/></svg></pattern></defs>'+      '<path class="paint-sign-support" d="'+shape+'" fill="url(#'+id+')"/>'+      '<path d="'+grain+'" fill="none" stroke="#d2ac78" stroke-width=".55" opacity=".46" pointer-events="none"/>'+      '<path d="'+grain+'" fill="none" stroke="#3f291b" stroke-width=".35" transform="translate(1.6 1.6)" opacity=".54" pointer-events="none"/></g>';
  }
  // Hemp stays fine at scene scale; its tiny diagonal strands catch the same warm light as the timber.
  function hempRope(x1,y1,x2,y2,knots) {
    var dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy),nx=len?-dy/len:1,ny=len?dx/len:0,strands='';
    for(var d=2;d<len-1;d+=3.2) {
      var t=d/len,xx=x1+dx*t,yy=y1+dy*t,tx=dx/len*.28,ty=dy/len*.28;
      strands+='M'+(xx-nx*.29-tx).toFixed(2)+' '+(yy-ny*.29-ty).toFixed(2)+'L'+(xx+nx*.29+tx).toFixed(2)+' '+(yy+ny*.29+ty).toFixed(2);
    }
    var line='M'+x1+' '+y1+'L'+x2+' '+y2;
    return '<g class="paint-hemp-rope"><path class="hemp-core" d="'+line+'" fill="none" stroke="#b69b73" stroke-width=".7" opacity=".86"/>'+      '<path d="'+line+'" fill="none" stroke="#efe0ba" stroke-width=".17" transform="translate('+(-nx*.16).toFixed(2)+' '+(-ny*.16).toFixed(2)+')" opacity=".75" pointer-events="none"/>'+      '<path d="'+strands+'" fill="none" stroke="#71583d" stroke-width=".18" opacity=".66" pointer-events="none"/>'+      (knots?'<ellipse cx="'+x1+'" cy="'+y1+'" rx=".9" ry="1.25" fill="none" stroke="#9e8259" stroke-width=".4"/><path d="M'+(x2-.85)+' '+(y2-.5)+'q.85 -1.6 1.7 0q-.8 1.6 -1.7 0m.9 .5l.55 1.25m-.55 -1.25l-.45 1.15" fill="none" stroke="#a48b64" stroke-width=".36"/>':'')+'</g>';
  }
  function jointedProp(name,box,parts) {
    var mask='propBody'+(++serial);
    var defs='<defs><mask id="'+mask+'" maskUnits="userSpaceOnUse" x="'+box[0]+'" y="'+box[1]+'" width="'+box[2]+'" height="'+box[3]+'"><rect x="'+box[0]+'" y="'+box[1]+'" width="'+box[2]+'" height="'+box[3]+'" fill="white"/>'+parts.map(function(p){return '<path d="'+p.path+'" fill="black"/>';}).join('')+'</mask></defs>';
    return defs+'<g mask="url(#'+mask+')">'+sprite(name,box[0],box[1],box[2],box[3])+'</g>'+parts.map(function(p){return catPart(name,box,p.path,p.cls,' style="transform-origin:'+p.pivot+';transform-box:view-box"');}).join('');
  }
  function glow(x,y,r) { return '<circle class="paint-night-glow" cx="'+x+'" cy="'+y+'" r="'+r+'" fill="url(#gHomeLight)"/>'; }
  // A shallow receding paving plane supports the source painting's front and rear feet.
  function forecourt(left,right,back,front,inset) {
    return '<g class="paint-forecourt"><path class="forecourt-top" d="M'+(left+inset)+' '+back+'H'+(right-inset)+'L'+right+' '+front+'H'+left+'Z" fill="url(#paintPaving)" stroke="#8b8678" stroke-width=".35"/>'+
      '<path d="M'+(left+inset+1)+' '+(back+.4)+'H'+(right-inset-1)+'M'+(left+1)+' '+(front-.45)+'H'+(right-1)+'" fill="none" stroke="#d2c7af" stroke-width=".4" opacity=".65"/></g>';
  }
  function station(id, inner, hit) {
    var feet={home:[-75,235],research:[0,284],talks:[-80,275],writing:[55,271],life:[0,351]},f=feet[id];
    var shadow=f?'<ellipse class="paint-contact-shadow" cx="'+(f[0]-5)+'" cy="559.2" rx="'+f[1]+'" ry="3.3" fill="url(#paintContactShadow)"/>':'';
    return '<g class="st st-'+id+' painted-station" data-station="'+id+'"><rect class="hit" x="'+hit[0]+'" y="'+hit[1]+'" width="'+hit[2]+'" height="'+hit[3]+'"/>'+shadow+inner+'</g>';
  }
  var old = {}; Object.keys(A.stations).forEach(function(k) { old[k] = A.stations[k]; });
  A.stations.home = function () {
    return station('home',forecourt(-313,155,542,560,8)+sprite('gate',-333,288.668,510,272)+label(-78,405,'WELCOME',122)+
      '<g class="board" data-open="news">'+sprite('board',153,420.347,112,140)+sourceHint('board',[153,420.347,112,140],[['M',744,701],['Q',772,699,801,701]],'hint-wood',1.7)+'<rect class="hit" x="153" y="420.347" width="112" height="140"/><g class="paint-board-heading" transform="translate(209.2 460.7) skewX(-1.1)"><text class="paint-board-title" text-anchor="middle">NEWS</text></g></g>'+glow(51,454.668,50),[-350,280,640,283]);
  };
  A.stations.research = function (pubs,themes) {
    var root = parsed(old.research(pubs,themes)), body = forecourt(-280,282,549,560,7)+sprite('researchHouse',-300,177.235,600,384), rowX=[-120,-120,-120];
    all(root,'.book').forEach(function(b,i) {
      var n=['ancientBlue','ancientJade','ancientOchre'][i%3];
      var dims = b.querySelector('rect'), w = +dims.getAttribute('width'), h = +dims.getAttribute('height');
      var bw=w*.73, bh=Math.min(28,h*.7);
      b.querySelector('.book-in').innerHTML = sprite(n,0,-bh,bw,bh)+materialHint('M'+(bw*.17)+' '+(-bh*.81)+'L'+(bw*.82)+' '+(-bh*.81)+'M'+(bw*.22)+' '+(-bh*.22)+'L'+(bw*.78)+' '+(-bh*.22),'hint-book',i*.41)+'<rect class="hit book-hit" x="0" y="'+(-bh)+'" width="'+bw+'" height="'+bh+'"/>';
      // Shelves in the painting are shallow and spaced evenly through the interior.
      var tr = b.getAttribute('transform'), row = tr.match(/translate\((-?[\d.]+) ([\d.]+)/);
      if (row) { var ri={436:0,482:1,528:2}[row[2]], y=[436.435,467.435,500.935][ri]; b.setAttribute('transform','translate('+rowX[ri]+' '+y+')'); rowX[ri]+=bw+2; }
      body += html(b);
    });
    body += sprite('plant',84,472.235,28,28)+sprite('bamboo',-37,481.235,69,20)+sprite('scrollBundle',46,474.235,25,27)+'<text class="paint-inset-title" x="0" y="288.235" text-anchor="middle">RESEARCH</text>';
    return station('research',body+glow(-182,473.235,45)+glow(182,473.235,45)+glow(-93,291.235,32)+glow(93,291.235,32),[-300,170,600,393]);
  };
  A.stations.talks = function (videos,posters) {
    var body = forecourt(-358,200,540,560,7)+sprite('talkHall',-365,231.376,570,331);
    // Live slides still advance on the painted projection wall.
    var projection='<g class="screen-talk"><rect class="screen-frame painted-projection-wall" x="-189" y="383.376" width="214" height="98" rx="1"/>';
    videos.forEach(function(v,i){projection+='<image class="slide slide-'+i+'" href="'+v.thumb+'" x="-189" y="383.376" width="214" height="98" preserveAspectRatio="xMidYMid meet" style="animation-delay:'+(i*4)+'s"/>';});
    body+=projection+materialHint('M-105 481.5q24 -.2 48 0','hint-wood',1.9)+'</g>';
    posters.slice(0,2).forEach(function(p,i){var w=i?105:137,h=i?135:130,x=i?325:205,y=560-h+(i ? .690 : .664);
      body+='<g class="easel" data-poster="'+p.paper+'" transform="translate('+x+' 0)"><title>Poster · '+p.venue+'</title>'+sprite('posterFrame',-w/2,y,w,h)+'<image href="'+p.thumb+'" x="'+(-w*.34)+'" y="'+(y+h*.105)+'" width="'+(w*.68)+'" height="'+(h*.605)+'" preserveAspectRatio="xMidYMid meet"/>'+sourceHint('posterFrame',[-w/2,y,w,h],[['M',930,535],['Q',982,533,1043,535]],'hint-wood',2.6+i)+'</g>';
    });
    body += label(-81,349.376,'TALKS',100)+glow(-240,419.376,36)+glow(107,419.376,36);
    return station('talks',body,[-370,210,740,352]);
  };
  A.stations.education = function () {
    var leaves='M72 66C254 164 380 240 518 402C627 527 706 660 783 817C693 720 547 639 398 488C262 345 159 210 72 66ZM1470 98C1290 195 1124 388 982 598C917 695 872 763 827 853C944 790 1120 620 1261 504C1374 336 1437 207 1470 98ZM763 791L795 836L814 827L844 962L826 967L797 863Z';
    var body = forecourt(-366,411,549,560,8)+sprite('branchEducation',-362,284.727,112,276)+sprite('educationLeaves',-265.3,293.227,25,17.6,'education-leaves',leaves)+hempRope(-321,321.727,-349,345,true)+hempRope(-272,318.727,-251,345,true)+label(-300,358,'EDUCATION',151);
    [['davisMetal',-277,170,174,'bs','B.S. · UC Davis'],['georgetown',-46,222,160,'ms','M.S. · Georgetown'],['lehigh',193,217,156,'phd','Ph.D. · Lehigh']].forEach(function(s) {
      body += '<g class="campus-keepsake" data-school="'+s[4]+'">'+sprite(s[0],s[1],560-s[3],s[2],s[3])+'<rect class="hit" x="'+s[1]+'" y="'+(560-s[3])+'" width="'+s[2]+'" height="'+(s[3]+36)+'"/>'+label(s[1]+s[2]/2,579,s[5],s[2]-8)+'</g>';
    });
    return station('education',body,[-380,284,795,309]);
  };
  A.stations.writing = function(tutorials) {
    var lift=12, archiveBox=[245,325,135,223], sx=135/843, sy=223/1392;
    // The silk paintings and low desk share a single stone footing.
    A.screenSpots=[[-187,346,93,119],[-85,346,101,119],[23,346,99,119],[130,346,104,119]];
    A.paperSpots=[[-90,296],[-34,278],[24,303],[82,282],[142,305],[200,272]];
    A.paperAnchors=[231.6883,235.5858,245.2151,243.381,243.1517,246.1273];
    A.tutorialSpots=[446,710,972,1225].map(function(y) {
      var cx=archiveBox[0]+(543-145)*sx, cy=archiveBox[1]+(y-17)*sy;
      return [cx-52,cy-15,104,30];
    });
    var body=forecourt(-289,-206,548,560,4)+sprite('branchWriting',-280,184.459,495,376);
    body += '<g class="writing-plinth"><path class="writing-plinth-front" d="M-222 552H394V560H-222Z"/><path class="writing-plinth-top" d="M-213 528H386L394 552H-222Z"/><path class="writing-plinth-grain" d="M-222 553H394M-89 553l.7 7M66 553l-.6 7M206 553l.8 7"/><path class="writing-plinth-light" d="M-211 528.6H385M-220 553.1H392"/></g>';
    // Keep the four silk paintings, desk and cushion; the separate archive replaces the old open rack.
    // The restored source has a complete chrysanthemum panel and no old
    // empty rack. No rectangular cut is allowed through its silk or frame.
    body += sprite('writingLow',-204,337-lift,518,223*476/454,'writing-interior','M81 57H860V533H81ZM294 460V537H525V460Z')+sprite('writingCushion',-204+(298-81)*518/779,337-lift+(443-57)*223/454,225*518/779,68*223/454,'writing-cushion-paint');
    // Follow the embroidered rim in the painting itself, rather than placing
    // another marker down on the paving beneath the low writing cushion.
    var seatRim='M-56 530C-58 520.8 -27 515.8 14.2 515.8C55.4 515.8 87.4 520.8 85.4 530C83.3 538 -21.8 542.3 -56 530Z';
    var seatThread='M-52 529.6C-53.6 522.9 -24.2 518.5 14.2 518.5C52.6 518.5 83.1 522.9 81.4 529.6M-51.7 531.1C-39.5 537.8 67.8 537.8 81.2 531.1M-45 531.9q-3 -3 -5 0q2 3 5 0q3 -3 5 0q-2 3 -5 0m0 -3.1q-3 2 0 3.1q3 -2 0 -3.1m0 3.1q-3 2 0 3.1q3 -2 0 -3.1M72 531.9q-3 -3 -5 0q2 3 5 0q3 -3 5 0q-2 3 -5 0m0 -3.1q-3 2 0 3.1q3 -2 0 -3.1m0 3.1q-3 2 0 3.1q3 -2 0 -3.1';
    body += '<g class="writing-seat"><title>Sit on the embroidered cushion and write</title><ellipse class="hit writing-seat-hit" cx="14.2" cy="529.6" rx="73" ry="19"/><path class="writing-seat-warmth" d="'+seatRim+'"/><path class="writing-seat-shadow" d="'+seatThread+'"/><path class="writing-seat-stitch" d="'+seatThread+'"/></g>';
    body += hempRope(-116,235.129,-116,242,true)+hempRope(-15,237.419,-15,242,true)+label(-65,255,'WRITING',150);
    A.paperSpots.forEach(function(p,i) {
      var star=i%2, anchor=A.paperAnchors[i]-p[1], width=star?30:38, height=30, end=star?-14:0;
      body += '<g class="paper-ornament '+(star ? 'paper-star' : 'crane')+'" data-ornament="'+i+'" transform="translate('+p[0]+' '+p[1]+')"><g class="'+(star ? 'star-bob' : 'crane-bob')+'" style="transform-box:view-box;transform-origin:0px '+anchor+'px;animation-delay:'+(i*-.7)+'s">'+hempRope(0,anchor,0,end,true)+sprite(star ? 'star' : 'crane',-width/2,-15,width,height)+sourceHint(star?'star':'crane',[-width/2,-15,width,height],star?[['M',1566,236],['L',1559,197]]:[['M',1134,328],['L',1178,304],['L',1210,313]],'hint-paper',i*.67)+'</g></g>';
    });
    A.screenPlants.forEach(function(p,i) { var sp=A.screenSpots[i],center=[174,328,494,657][i]; body += '<g class="screen-painting" data-screen-plant="'+p+'"><rect class="hit" x="'+sp[0]+'" y="'+sp[1]+'" width="'+sp[2]+'" height="'+sp[3]+'"/>'+sourceHint('writingLow',[-204,325,518,223*476/454],[['M',center-13,338],['Q',center,336.7,center+13,338]],'hint-wood',i*.93)+'</g>'; });
    body += '<g class="archive-cabinet">'+sprite('archiveCabinet',archiveBox[0],archiveBox[1],archiveBox[2],archiveBox[3]);
    tutorials.forEach(function(t,i) {
      var sp=A.tutorialSpots[i], cx=sp[0]+sp[2]/2,cy=sp[1]+sp[3]/2;
      body += '<g class="tutorial-scroll archive-scroll" data-tutorial="'+t.id+'" transform="translate('+cx+' '+cy+')"><title>'+t.title+'</title><rect class="hit" x="-52" y="-15" width="104" height="30"/><text class="tutorial-scroll-label archive-label" x="0" y="3" text-anchor="middle">'+t.label+'</text><path class="archive-scroll-glint" d="M-44 -8q44 -2 88 0"/></g>';
    });
    body += '</g>';
    // This clip is the actual unrolled paper in the source painting, lifted with the table.
    var paper='writingPaper'+(++serial);
    body += '<defs><clipPath id="'+paper+'"><path d="M-93.62 500.55H91.91L103.88 515.29H-97.61Z"/></clipPath></defs><g class="write-hello handwritten-hello" clip-path="url(#'+paper+')"><title>Hello World! — handwritten one letter at a time</title><g class="hello-ink">'+helloStrokes()+'</g></g><g class="inkstone" data-easter="ink"><rect class="hit" x="121" y="500.18" width="36" height="20"/><path class="ink-glint" d="M126 508.18q9 3 19 0"/></g>'+glow(141,476.18,35);
    return station('writing',body,[-290,174,700,388]);
  };

  // Simple handwritten letters appear in their normal reading order. The
  // seated arm keeps a small natural writing gesture rather than chasing
  // long calligraphic loops across the entire desk.
  function helloStrokes() {
    var letters=[
      ['H','M1 10L1 1M1 5.4L6.6 5.1M7 1L6.7 10'],
      ['e','M10 6.6Q14.8 6.9 14 4.9Q12.1 3.5 10.1 5.7Q8.6 9.9 14.4 9.3'],
      ['l','M17.5 1L16.8 9.6Q17.3 10 18.4 9.5'],
      ['l','M21.1 1L20.4 9.6Q20.9 10 22 9.5'],
      ['o','M26.4 4.7C22.7 4.2 22.9 10.4 26.7 9.8C29.8 9.3 29.4 4.1 26.4 4.7'],
      ['W','M35.4 1.1L36.7 10L40.7 3.1L41.8 10L46.2 1.2'],
      ['o','M51.1 4.7C47.4 4.2 47.6 10.4 51.4 9.8C54.5 9.3 54.1 4.1 51.1 4.7'],
      ['r','M56.7 9.8L57.1 4.8M57 6.7Q60 3.7 61 5.6'],
      ['l','M63.9 1L63.2 9.6Q63.7 10 64.8 9.5'],
      ['d','M69.2 4.9C65.6 4.2 65.3 10.4 69 9.8Q71.2 9.5 71.5 6.6M72.2 1L71.1 9.7'],
      ['!','M76 1.1L75.2 7.3M75 9.7L75.02 9.9']
    ];
    function row(from,to,x,y) {
      return '<g class="hello-row" data-writing-row="'+(from===0?0:1)+'" transform="matrix(.50 .008 .06 .46 '+x+' '+y+')">'+letters.slice(from,to).map(function(s,j){var i=from+j;return '<path class="hello-stroke" data-letter="'+s[0]+'" data-stroke="'+i+'" data-row="'+(from===0?0:1)+'"'+(from?' transform="translate(-34.4 0)"':'')+' pathLength="1" d="'+s[1]+'"/>';}).join('')+'</g>';
    }
    // Two small handwritten lines give each native glyph room to breathe on
    // the real sheet, without reaching past either outfit's preserved wrist.
    return '<g class="hello-word">'+row(0,5,49,501.5)+row(5,11,47,506.4)+'</g>';
  }

  function writingInside(poly,x,y){var hit=false;for(var i=0,j=poly.length-1;i<poly.length;j=i++)if((poly[i][1]>y)!==(poly[j][1]>y)&&x<(poly[j][0]-poly[i][0])*(y-poly[i][1])/(poly[j][1]-poly[i][1])+poly[i][0])hit=!hit;return hit;}
  function writingSegmentDistance(x,y,a,b){var dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);}
  function writingArmConfig(night,image){
    var crop=crops[night?'nightWrite':'dayWrite'],sheet=sheets[crop[0]];
    function native(p){return[25+(p[0]-crop[1])*119/(crop[3]-crop[1]),62+(p[1]-crop[2])*130/(crop[4]-crop[2])];}
    var c={image:image,elbow:night?[110,137]:[113.8,136.5],grip:native(night?[1630,468]:[854,468]),tip:native(night?[1664,555]:[887,556]),vertices:[],movingVertices:[],data:null};
    var hand=(night?[[1583,452],[1605,431],[1635,433],[1649,450],[1649,472],[1636,487],[1584,501]]:[[793,456],[817,431],[844,431],[867,447],[871,471],[851,488],[797,505]]).map(native);
    function smooth(a,b,x){var u=Math.max(0,Math.min(1,(x-a)/(b-a)));return u*u*(3-2*u);}
    function vertex(cx,cy){
      var x=25+cx,y=62+cy;
      // The entire forearm, cuff and outline share one smooth field. Its
      // narrow movement fades continuously into the original upper sleeve.
      var fore=smooth(c.elbow[0]-6,c.elbow[0]+10,x)*smooth(113,122,y)*(1-smooth(145,154,y));
      // The wrist transitions into the real painted thumb and fingers;
      // their grasp follows the brush while the cuff remains on the forearm.
      // The old brush has been removed from this source, so no narrow rod
      // is bent or enlarged by the clothing mesh.
      var wrist=writingInside(hand,x,y)?smooth(c.grip[0]-10,c.grip[0]-2,x)*.8:0;
      return{x:x,y:y,u:(crop[1]+cx/119*(crop[3]-crop[1]))/sheet[1],v:(crop[2]+cy/130*(crop[4]-crop[2]))/sheet[2],w:[1-fore,fore*(1-wrist),fore*wrist]};
    }
    var columns=72,rows=79,grid=[],indices=[];
    for(var y=0;y<=rows;y++)for(var x=0;x<=columns;x++)grid.push(vertex(x*119/columns,y*130/rows));
    for(var y=0;y<rows;y++)for(var x=0;x<columns;x++){var a=y*(columns+1)+x,b=a+1,d=a+columns+1,e=d+1;indices.push(a,b,d,b,e,d);}
    c.vertices=grid;c.indices=new Uint16Array(indices);
    c.data=new Float32Array(c.vertices.length*4);c.vertices.forEach(function(v,i){var n=i*4;c.data[n]=v.x;c.data[n+1]=v.y;c.data[n+2]=v.u;c.data[n+3]=v.v;if(v.w[0]<1)c.movingVertices.push(i);});
    return c;
  }
  function writingAim(c,target){
    var e=c.elbow,g=c.grip,h=c.tip,ux=g[0]-e[0],uy=g[1]-e[1],px=h[0]-g[0],py=h[1]-g[1],l1=Math.hypot(ux,uy),l2=Math.hypot(px,py),dx=target[0]-e[0],dy=target[1]-e[1],actual=Math.hypot(dx,dy);
    var reach=Math.max(Math.abs(l1-l2)+.0001,Math.min(l1+l2-.0001,actual)),direction=Math.atan2(dy,dx);
    var first=direction-Math.acos(Math.max(-1,Math.min(1,(l1*l1+reach*reach-l2*l2)/(2*l1*reach))));
    var pen=direction+Math.acos(Math.max(-1,Math.min(1,(l2*l2+reach*reach-l1*l1)/(2*l2*reach))));
    var fore=first-Math.atan2(uy,ux),wrist=pen-Math.atan2(py,px)-fore;
    return{fore:fore,wrist:wrist,reachError:Math.max(0,actual-reach)};
  }
  function writingBrushPlane(root){
    var ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),id='writingBrush'+(++serial);
    svg.setAttribute('class','writing-brush-plane');svg.setAttribute('viewBox','-40 -10 280 220');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
    // One straight bamboo shaft sits behind the real painted fingers. Its
    // tiny nodes, grain and ferrule share the same amber/dark ink palette as
    // the desk; the tapered hairs finish at the single actual paper contact.
    svg.innerHTML='<defs><linearGradient id="'+id+'Wood" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#352619"/><stop offset=".32" stop-color="#ac8150"/><stop offset=".58" stop-color="#86613b"/><stop offset="1" stop-color="#3d291a"/></linearGradient><linearGradient id="'+id+'Binding" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#5f4a29"/><stop offset=".36" stop-color="#b69b65"/><stop offset=".55" stop-color="#d8c38d"/><stop offset="1" stop-color="#594124"/></linearGradient><linearGradient id="'+id+'Hair" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#615647"/><stop offset=".3" stop-color="#352e26"/><stop offset="1" stop-color="#141719"/></linearGradient></defs>'+
      '<g class="writing-brush-world"><ellipse class="writing-tip-contact" rx=".65" ry=".16"/><g class="writing-brush-tool">'+
      '<path class="writing-bamboo-shaft" d="M-.43 -20Q0 -20.35 .43 -20L.38 9.25Q0 9.45 -.38 9.25Z" fill="url(#'+id+'Wood)" stroke="#35281c" stroke-width=".12"/>'+
      '<path d="M-.19 -18.9L-.11 -13.9M.17 -11.9L.11 -5.9M-.16 -4.1L-.12 2.8M.12 4.1L.08 7.1" fill="none" stroke="#d2af72" stroke-width=".075" opacity=".76"/>'+
      '<path d="M-.41 -13.55q.41 .17 .82 0m-.8 .42q.38 .12 .78 0M-.4 -5.05q.4 .18 .8 0m-.8 .4q.4 .12 .8 0M-.38 3.6q.38 .15 .76 0" fill="none" stroke="#63472b" stroke-width=".16"/>'+
      '<path d="M-.32 -19.8Q0 -19.95 .32 -19.8" fill="none" stroke="#d3b47e" stroke-width=".12"/><path d="M-.44 8.1L.44 8.1L.53 9.35Q0 9.56 -.53 9.35Z" fill="url(#'+id+'Binding)" stroke="#463625" stroke-width=".1"/>'+
      '<path class="writing-brush-hairs" d="M-.52 9.3C-.68 10.66 -.46 12.47 0 14C.45 12.44 .68 10.65 .52 9.3Q0 9.52 -.52 9.3Z" fill="url(#'+id+'Hair)" stroke="#242420" stroke-width=".1"/>'+
      '<path d="M-.31 9.8Q-.4 11.45 0 13.7M-.12 9.72Q-.25 11.77 0 13.83M.15 9.65Q.27 11.76 0 13.8M.36 9.76Q.37 11.33 .05 13.5" fill="none" stroke="#817362" stroke-width=".075" opacity=".65"/>'+
      '</g></g>';
    root.appendChild(svg);return {svg:svg,world:svg.querySelector('.writing-brush-world'),tool:svg.querySelector('.writing-brush-tool'),contact:svg.querySelector('.writing-tip-contact')};
  }
  function mountWritingArm(root){
    var canvas=document.createElement('canvas');canvas.className='painted-writing-rig';canvas.width=840;canvas.height=660;canvas.setAttribute('aria-hidden','true');
    var gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:true});if(!gl)return null;
    function shader(type,source){var s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);return s;}
    var program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 position;attribute vec2 uv;uniform mat3 sourcePose;varying vec2 tex;void main(){vec3 p=sourcePose*vec3(position,1.0);gl_Position=vec4((p.x+40.0)/280.0*2.0-1.0,1.0-(p.y+10.0)/220.0*2.0,0.0,1.0);tex=uv;}'));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec2 tex;uniform sampler2D painting;void main(){gl_FragColor=texture2D(painting,tex);}'));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return null;
    gl.useProgram(program);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.viewport(0,0,canvas.width,canvas.height);
    var buffer=gl.createBuffer(),indexBuffer=gl.createBuffer(),texture=gl.createTexture(),position=gl.getAttribLocation(program,'position'),uv=gl.getAttribLocation(program,'uv'),pose=gl.getUniformLocation(program,'sourcePose');
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,16,0);gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,16,8);
    gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    var image=new Image();image.src=new URL('writing-grip-painted.webp',petArtBase).href;
    var r={root:root,canvas:canvas,brush:writingBrushPlane(root),configs:[writingArmConfig(false,image),writingArmConfig(true,image)],current:null,measure:null};
    r.draw=function(c,bones,offset){
      if(!c.image.complete||!c.image.naturalWidth)return false;
      if(r.current!==c.image){gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c.image);r.current=c.image;}
      var dual=bones.map(function(m){var a=Math.atan2(m[1],m[0])/2,co=Math.cos(a),si=Math.sin(a);return[co,si,(m[4]*co+m[5]*si)/2,(m[5]*co-m[4]*si)/2];});
      for(var o=0;o<c.movingVertices.length;o++){var i=c.movingVertices[o],v=c.vertices[i],qc=0,qs=0,qx=0,qy=0;for(var j=0;j<3;j++){var q=dual[j],w=v.w[j];qc+=q[0]*w;qs+=q[1]*w;qx+=q[2]*w;qy+=q[3]*w;}var k=1/Math.hypot(qc,qs);qc*=k;qs*=k;qx*=k;qy*=k;var cs=qc*qc-qs*qs,sn=2*qc*qs,n=i*4;c.data[n]=cs*v.x-sn*v.y+2*(qx*qc-qy*qs);c.data[n+1]=sn*v.x+cs*v.y+2*(qx*qs+qy*qc);}
      gl.uniformMatrix3fv(pose,false,new Float32Array([offset.a,offset.b,0,offset.c,offset.d,0,offset.e,offset.f,1]));gl.clear(gl.COLOR_BUFFER_BIT);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,c.data,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,c.indices,gl.STATIC_DRAW);gl.drawElements(gl.TRIANGLES,c.indices.length,gl.UNSIGNED_SHORT,0);return true;
    };
    root.appendChild(canvas);root._writingArm=r;return r;
  }
  // One clock drives the deposited ink and the same native brush tip. The
  // shoulder and elbow retain their complete original painted anatomy; the
  // wrist makes a small continuous gesture while the letters appear in order.
  var writingClock={station:null,ink:null,paths:[],route:[],start:null,frame:0,preview:null};
  var writingReduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  function mountWritingClock() {
    var st=document.querySelector('.st-writing'),ink=st&&st.querySelector('.hello-ink');
    if(!ink)return false;
    writingClock.station=st;writingClock.ink=ink;
    writingClock.paths=all(ink,'.hello-stroke');
    var lengths=writingClock.paths.map(function(p){return p.getTotalLength();});
    var total=lengths.reduce(function(a,b){return a+b;},0),at=.3;
    writingClock.route=lengths.map(function(length,i){var duration=.43+1.85*length/total,start=at;at+=duration+(i===4?.42:.105);return {start:start,end:start+duration,length:length};});
    writingClock.end=at-.105;writingClock.cycle=writingClock.end+2.7;
    new MutationObserver(function(){
      if(!st.classList.contains('is-acting')){writingClock.start=null;writingClock.preview=null;renderWriting(0,false);}
    }).observe(st,{attributes:true,attributeFilter:['class']});
    renderWriting(0,false);
    return true;
  }
  function renderWriting(seconds,active) {
    var c=writingClock,cycle=c.cycle||1,t=seconds%cycle,done=writingReduced.matches;
    var fading=t>c.end+2.1,alpha=active?(done?1:fading?Math.max(0,1-(t-c.end-2.1)/.6):1):0;
    c.ink.style.opacity=alpha;
    var live=-1,point=null;
    c.paths.forEach(function(p,i){
      var route=c.route[i],fraction=active?(done?1:Math.max(0,Math.min(1,(t-route.start)/(route.end-route.start)))):0;
      // pathLength=1 makes each independently measured route use the same dash.
      p.style.strokeDashoffset=(1-fraction).toFixed(5);
      p.style.opacity=fraction>0?1:0;
      if(fraction>0&&fraction<1){live=i;point=p.getPointAtLength(route.length*fraction);}
    });
    c.station.dataset.writingStroke=live<0?(active&&t>=c.end?'complete':'rest'):String(live);
    c.station.classList.toggle('is-inking',active&&!done&&live>=0);
    var actor=document.querySelector('#char');
    if(actor&&!active){actor.classList.remove('has-writing-paint');if(actor._writingArm)actor._writingArm.measure=null;}
    if(actor&&active){
      var rig=actor._writingArm||mountWritingArm(actor),svg=actor.querySelector('.painted-character'),back=svg&&svg.querySelector('.c-back');
      if(rig&&back&&back.getScreenCTM()&&svg.getScreenCTM()){
        function onPaper(index,at){return c.paths[index].getPointAtLength(c.route[index].length*at).matrixTransform(c.paths[index].getScreenCTM());}
        var targetScreen;
        if(point)targetScreen=point.matrixTransform(c.paths[live].getScreenCTM());
        else{
          var prev=-1;c.route.forEach(function(r,i){if(t>=r.end)prev=i;});
          var first=onPaper(0,0),last=onPaper(c.paths.length-1,1),scale=Math.hypot(back.getScreenCTM().a,back.getScreenCTM().b)/.875;
          if(done||t>=c.end){var u=done?1:Math.min(1,(t-c.end)/.5),pose=rig.configs[document.documentElement.dataset.theme==='dark'?1:0],rest=new DOMPoint(pose.tip[0],pose.tip[1]).matrixTransform(back.getScreenCTM());targetScreen=new DOMPoint(last.x*(1-u)+rest.x*u,last.y*(1-u)+(rest.y-scale)*u-Math.sin(u*Math.PI)*scale);}
          else if(prev<0)targetScreen=new DOMPoint(first.x,first.y-1.4*scale);
          else{var next=Math.min(prev+1,c.paths.length-1),a=onPaper(prev,1),b=onPaper(next,0),v=Math.min(1,(t-c.route[prev].end)/(c.route[next].start-c.route[prev].end));targetScreen=new DOMPoint(a.x*(1-v)+b.x*v,a.y*(1-v)+b.y*v-Math.sin(v*Math.PI)*1.4*scale);}
        }
        var nativeTarget=targetScreen.matrixTransform(back.getScreenCTM().inverse()),config=rig.configs[document.documentElement.dataset.theme==='dark'?1:0],aim=writingAim(config,[nativeTarget.x,nativeTarget.y]);
        var fore=petRotate(aim.fore,config.elbow),pen=petProduct(fore,petRotate(aim.wrist,config.grip)),offset=svg.getScreenCTM().inverse().multiply(back.getScreenCTM());
        var drawn=rig.draw(config,[[1,0,0,1,0,0],fore,pen],offset);if(drawn)actor.classList.add('has-writing-paint');
        var nativeTip=new DOMPoint(config.tip[0],config.tip[1]).matrixTransform(new DOMMatrix(pen)),actualScreen=nativeTip.matrixTransform(back.getScreenCTM());
        var dx=config.tip[0]-config.grip[0],dy=config.tip[1]-config.grip[1],length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length;
        var basis=new DOMMatrix([uy,-ux,ux*length/14,uy*length/14,config.grip[0],config.grip[1]]),tool=new DOMMatrix(pen).multiply(basis);
        function matrix(m){return 'matrix('+[m.a,m.b,m.c,m.d,m.e,m.f].map(function(n){return n.toFixed(6);}).join(' ')+')';}
        rig.brush.world.setAttribute('transform',matrix(offset));rig.brush.tool.setAttribute('transform',matrix(tool));
        rig.brush.contact.setAttribute('cx',nativeTip.x);rig.brush.contact.setAttribute('cy',nativeTip.y+.06);rig.brush.contact.style.opacity=point?'.14':'0';
        var visibleTip=new DOMPoint(0,14).matrixTransform(rig.brush.tool.getScreenCTM()),visibleGrip=new DOMPoint(0,0).matrixTransform(rig.brush.tool.getScreenCTM()),handGrip=new DOMPoint(config.grip[0],config.grip[1]).matrixTransform(new DOMMatrix(fore)).matrixTransform(back.getScreenCTM());
        rig.measure={theme:document.documentElement.dataset.theme,stroke:live,rendered:drawn,inkContact:!!point,letter:live<0?null:c.paths[live].dataset.letter,row:live<0?null:Number(c.paths[live].dataset.row),target:{x:targetScreen.x,y:targetScreen.y},brush:{x:visibleTip.x,y:visibleTip.y},error:Math.hypot(visibleTip.x-targetScreen.x,visibleTip.y-targetScreen.y),computedTip:{x:actualScreen.x,y:actualScreen.y},brushGrip:{x:visibleGrip.x,y:visibleGrip.y},handGrip:{x:handGrip.x,y:handGrip.y},gripError:Math.hypot(visibleGrip.x-handGrip.x,visibleGrip.y-handGrip.y),reachError:aim.reachError,elbow:config.elbow,grip:config.grip,nativeGrip:config.grip,nativeTip:config.tip,forearmAngle:aim.fore,wristAngle:aim.wrist,shaftLength:20*length/14};
      }
    }
    return {seconds:seconds,cycle:cycle,writeEnd:c.end,stroke:live,complete:active&&(done||t>=c.end),tip:point?{x:point.x,y:point.y}:null};
  }
  // A deterministic seek is useful for checking partial letters and the final
  // ink in the running scene. Passing null returns the clock to live writing.
  A.seekWriting=function(seconds){
    if(!writingClock.station&&!mountWritingClock())return null;
    writingClock.preview=seconds===null?null:Math.max(0,Number(seconds)||0);
    if(seconds===null){writingClock.start=performance.now();return null;}
    return renderWriting(writingClock.preview,writingClock.station.classList.contains('is-acting'));
  };
  A.writingContact=function(){var actor=document.querySelector('#char');return actor&&actor._writingArm?actor._writingArm.measure:null;};
  requestAnimationFrame(function writeFrame(t){
    var c=writingClock;
    if(!c.station){mountWritingClock();}
    if(c.station){
      var active=c.station.classList.contains('is-acting');
      if(active){if(c.start===null)c.start=t;renderWriting(c.preview===null?(t-c.start)/1000:c.preview,true);}
      else if(c.start!==null){c.start=null;renderWriting(0,false);}
    }
    c.frame=requestAnimationFrame(writeFrame);
  });
  A.stations.life = function(catThumbs) {
    var body = forecourt(-358,364,552,560,7)+sprite('house',-371,243,742,317)+label(0,357,'LIFE',95);
    body += '<g class="life-item suitcase" data-life="travel">'+sprite('case',151,493,77,67)+sourceHint('case',[151,493,77,67],[['M',87,191],['L',103,192],['L',103,202]],'hint-metal',2.4)+'<rect class="hit" x="151" y="493" width="77" height="67"/></g>';
    body += '<g class="life-item stove" data-life="food" transform="translate(-238 560)">'+jointedProp('stove',[-40,-92,80,92],[{path:'M-32 -95H33V-74Q0 -68 -32 -74Z',cls:'pot-lid-group',pivot:'0px -76px'}])+sourceHint('stove',[-40,-92,80,92],[['M',490,163],['Q',536,171,588,166]],'hint-metal',.8)+'<rect class="hit" x="-40" y="-92" width="80" height="92"/><g class="steam"><path d="M-8 -92c-8 -10 8 -16 0 -28"/><path d="M6 -92c-8 -10 8 -16 0 -28"/></g></g>';
    body += '<g class="life-item nap" data-life="cats" transform="translate(0 -6)">'+sprite('pouf',-24,542,94,21)+sleeper()+'<path class="pouf-piping" d="M-20 553Q23 565 66 553"/></g>';
    var slides=catThumbs.map(function(src,i,arr){return '<image class="cat-slide" href="'+src+'" x="235" y="409" width="81" height="107" preserveAspectRatio="xMidYMid slice" style="animation-duration:'+(arr.length*2.5)+'s;animation-delay:'+(i*2.5)+'s"/>';}).join('');
    body += '<g class="life-item cinema" data-life="cats"><path class="beam-light" d="M154 502L235 409V516Z"/>'+sprite('galleryScreen',215,384,121,176)+slides+sourceHint('galleryScreen',[215,384,121,176],[['M',430,1178],['Q',489,1175,554,1178]],'hint-wood',3.2)+'<rect class="hit" x="215" y="384" width="121" height="176"/>'+'<text class="paint-screen-label" x="277" y="536" text-anchor="middle">6 CATS</text><g class="film-projector" transform="translate(256 0) scale(-1 1)">'+jointedProp('projector',[98,455,60,105],[{path:'M128 469A10.5 11 0 1 0 107 469A10.5 11 0 1 0 128 469Z',cls:'reel-spokes',pivot:'117.5px 469px'},{path:'M156 486A10.5 10.5 0 1 0 135 486A10.5 10.5 0 1 0 156 486Z',cls:'reel-spokes',pivot:'145.5px 486px'}])+sourceHint('projector',[98,455,60,105],[['M',795,151],['Q',788,161,796,174]],'hint-metal',3.9)+'<rect class="hit" x="98" y="455" width="60" height="105"/></g></g>'+glow(0,445,80)+glow(-278,448,48)+glow(243,443,48);
    return station('life',body,[-373,238,746,324]);
  };
  A.stations.contact = function() {
    var body=forecourt(-352,340,543,560,6)+sprite('tree',-340,225,410,335), letter;
    var flag='<g class="flag painted-mail-flag"><path class="flag-arm" d="M30 452V426"/><path class="flag-arm-light" d="M29.55 450V427"/><path class="flag-plate" d="M30 425H44.8L46 426.2V435L44.8 436H30Z"/><path class="flag-bevel" d="M31 425.7H44.3L45.3 426.6V434.6M31 435.2H44.4"/><path class="flag-wear" d="M32 428l3 -.2m6 4l2 -.3m-10 2l1.8 -.25"/><circle class="flag-pin" cx="30" cy="452" r="2"/><circle cx="29.5" cy="451.5" r=".65" fill="#d8ba7b"/></g>';
    letter='<g class="post-letter">'+sprite('letter',-18,437,22,13)+'</g>';
    body += '<ellipse cx="50" cy="561" rx="47" ry="4" fill="#332e25" opacity=".18"/><g class="mailbox-footing"><path d="M2 556H98L97 560H3Z" fill="url(#paintStone)" stroke="#71695b" stroke-width=".45"/><path d="M9 546.5H90L98 556H2Z" fill="url(#paintPaving)" stroke="#8b8271" stroke-width=".35"/><path d="M10 547H89M3 556H97" fill="none" stroke="#dfd3b7" stroke-width=".45"/><path d="M2 556H98" fill="none" stroke="#695f51" stroke-width=".45"/></g><g class="mailbox" transform="translate(50 -4)">'+sprite('postbox',-37,411,74,149)+sourceHint('postbox',[-37,411,74,149],[['M',121,484],['Q',155,486,192,487]],'hint-metal',1.6)+flag+letter+'</g>';
    body += '<g class="paint-carved-links"><title>Scholar · LinkedIn · GitHub</title>'+sprite('carvedSignpost',178,344.565,148,216)+sourceHint('carvedSignpost',[178,344.565,148,216],[['M',1440,314],['Q',1466,313,1490,315],['M',1480,458],['Q',1507,456,1530,459],['M',1440,600],['Q',1468,598,1495,601]],'hint-wood',4.2)+'</g>'+hempRope(-178,308,-178,331,true)+hempRope(-82,320,-82,331,true)+label(-130,344,'CONTACT',130);
    return station('contact',body,[-340,223,675,339]);
  };

  var oldFront=A.foreground;
  var oldGround=A.ground, oldDefs=A.defs;
  A.defs=function() {
    function pattern(id,crop,w,h,y) { return '<pattern id="'+id+'" width="'+(w*2)+'" height="'+h+'" y="'+y+'" patternUnits="userSpaceOnUse">'+sprite(crop,0,0,w,h)+'<g transform="translate('+(w*2)+' 0) scale(-1 1)">'+sprite(crop,0,0,w,h)+'</g></pattern>'; }
    return oldDefs()+'<defs>'+pattern('paintStone','stoneMaterial',452,67,560)+pattern('paintPaving','stoneMaterial',452,21,560)+pattern('paintWater','waterMaterial',760,500,650)+pattern('paintBank','bankMaterial',480,66,627)+
      '<linearGradient id="paintLetterInk" x2="0" y2="1"><stop stop-color="#c7a36e"/><stop offset=".5" stop-color="#ecd3a7"/><stop offset="1" stop-color="#b28d58"/></linearGradient>'+
      '<filter id="paintEngraving" x="-10%" y="-30%" width="120%" height="160%"><feOffset in="SourceAlpha" dy=".4" result="lowerEdge"/><feFlood flood-color="#edc58b" flood-opacity=".55"/><feComposite in2="lowerEdge" operator="in" result="edgeLight"/><feOffset in="SourceAlpha" dy="-.35" result="upperEdge"/><feFlood flood-color="#28180f" flood-opacity=".9"/><feComposite in2="upperEdge" operator="in" result="edgeCut"/><feMerge><feMergeNode in="edgeLight"/><feMergeNode in="edgeCut"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
      '<linearGradient id="paintFlagMetal" x2=".8" y2="1"><stop stop-color="#e2c58d"/><stop offset=".38" stop-color="#bc9557"/><stop offset=".62" stop-color="#d1b175"/><stop offset="1" stop-color="#8e693e"/></linearGradient>'+
      '<radialGradient id="paintContactShadow"><stop stop-color="#292b23" stop-opacity=".25"/><stop offset=".62" stop-color="#36382c" stop-opacity=".14"/><stop offset="1" stop-color="#36382c" stop-opacity="0"/></radialGradient></defs>';
  };
  A.ground=function(width,stations) {
    var root=parsed(oldGround(width,stations));
    all(root,'.paving-slab,.paving-grain,.paving-bevel,.paving-wear,.paving,.ground-strokes,.path-grain').forEach(function(n){n.remove();});
    var edge=root.querySelector('.ground-edge');
    edge.insertAdjacentHTML('afterend','<path class="painted-path" d="'+edge.getAttribute('d')+'L'+width+' 627H0Z" fill="url(#paintStone)"/>');
    return root.innerHTML;
  };
  A.foreground=function(width) {
    var root=parsed(oldFront(width));
    var water=root.querySelector('.pond');
    water.insertAdjacentHTML('afterend','<path class="painted-water" d="'+water.getAttribute('d')+'" fill="url(#paintWater)"/>');
    root.querySelector('.pond-bank').setAttribute('fill','url(#paintBank)');
    root.querySelector('.pond-bank').insertAdjacentHTML('beforebegin','<path class="painted-bank" d="M0 627H'+width+'V800H0Z'+water.getAttribute('d')+'" fill-rule="evenodd" fill="url(#paintBank)"/>');
    all(root,'.lotus-leaf').forEach(function(n) {
      var pad=n.querySelector('.leaf-shadow');
      var x=+pad.getAttribute('cx')-2,y=+pad.getAttribute('cy')-3, r=+pad.getAttribute('rx');
      n.innerHTML=sprite('pads',x-r,y-r*.48,r*2,r*.96);
    });
    all(root,'.lotus-flower').forEach(function(n) {
      n.innerHTML='<g class="o-day">'+sprite('flower',-26,-35,52,39)+'</g><g class="o-night">'+sprite('bud',-11,-32,22,37)+'</g>';
    });
    var k=root.querySelector('.koi-facing');
    if(k) {
      var km='koiBody'+(++serial), kt='M-45 -21L-13 -21L-8 -3L-13 21L-45 21Z';
      k.innerHTML='<defs><mask id="'+km+'" maskUnits="userSpaceOnUse" x="-45" y="-21" width="90" height="42"><rect x="-45" y="-21" width="90" height="42" fill="white"/><path d="'+kt+'" fill="black"/></mask></defs><g mask="url(#'+km+')">'+sprite('koi',-42,-19,83,38)+'</g>'+catPart('koi',[-42,-19,83,38],kt,'koi-tail');
    }
    replace(root,'.reed-blades,.reeds,.reed-head','');
    for(var x=120;x<width;x+=570) root.insertAdjacentHTML('beforeend',sprite('reeds',x,689,61,107,'painted-reeds'));
    return root.innerHTML;
  };
  A.paintSprite=sprite;
  // Sun and moon retain their existing pointer and keyboard controls.
  var celestial=document.querySelector('#sun svg');
  if(celestial) {
    celestial.insertAdjacentHTML('beforeend','<g class="painted-celestial"><circle class="paint-sun-halo" r="88"/><g class="o-day">'+sprite('sun',-55,-55,110,110)+'</g><g class="o-night">'+sprite('moon',-55,-55,110,110)+'</g></g>');
    celestial.classList.add('has-painted-celestial');
  }
})();
