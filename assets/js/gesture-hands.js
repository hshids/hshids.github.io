/* Native gesture palms from the approved complete painted pose references.
 * gestureHands(root, config, boneMatrices, 'wave'|'toss'|'point'|'reach'|null)
 * returns {left,right}: true only after that SVG donor image is ready.
 * A cutPlanes(config, visibility) property supplies source-UV wrist planes.
 * Restrict those planes to the original hand source domains in the shader;
 * a global distal plane would also erase the lower body. Keep the native cuff.
 */
(function () {
  'use strict';
  var A=window.HJArt||(window.HJArt={}), NS='http://www.w3.org/2000/svg';
  var base=new URL('../art/'+(window.HJArtDir||''),document.currentScript.src), serial=0, states=new WeakMap();
  // Each record: source wrist, distal forearm unit vector, closed native outline.
  var donors={"day_wave":[[303,280],[0.203756,-0.979022],[[320,151],[323,152],[326,156],[325,210],[328,209],[328,206],[330,204],[332,192],[334,190],[334,186],[336,183],[336,179],[337,179],[337,175],[338,175],[338,171],[339,171],[340,166],[342,165],[342,163],[347,162],[349,164],[349,168],[350,168],[347,190],[346,190],[346,194],[345,194],[343,207],[342,207],[342,212],[341,212],[340,234],[342,235],[342,233],[349,226],[351,220],[360,212],[360,208],[359,208],[359,212],[357,211],[358,203],[359,203],[360,199],[362,198],[362,196],[365,194],[365,192],[367,190],[369,190],[371,187],[372,187],[372,198],[370,198],[365,203],[364,209],[361,211],[369,209],[368,208],[369,201],[372,199],[372,204],[371,204],[372,231],[366,233],[365,229],[367,230],[367,228],[368,228],[367,223],[366,223],[364,225],[363,231],[362,231],[363,236],[361,236],[361,232],[360,232],[359,235],[357,236],[354,244],[353,244],[353,246],[354,246],[357,243],[358,251],[352,253],[348,258],[346,258],[345,261],[343,261],[341,263],[340,267],[332,275],[328,276],[325,279],[323,286],[283,286],[284,278],[286,275],[286,270],[285,270],[285,265],[284,265],[283,255],[282,255],[281,223],[280,223],[279,214],[278,214],[277,207],[276,207],[275,199],[273,196],[272,182],[273,182],[273,180],[277,179],[281,183],[288,208],[289,208],[291,214],[295,215],[295,211],[296,211],[296,197],[295,197],[296,167],[297,167],[297,162],[300,159],[304,159],[306,161],[306,164],[307,164],[308,204],[309,204],[309,208],[310,208],[313,177],[314,177],[315,158],[316,158],[317,153],[320,151]]],"day_toss_left":[[839,69],[-0.70711,-0.70711],[[775,17],[784,18],[786,19],[786,21],[788,21],[791,25],[793,25],[799,31],[806,33],[806,34],[813,34],[813,35],[814,35],[813,33],[815,32],[810,27],[809,21],[811,18],[817,19],[826,29],[837,34],[840,37],[840,39],[842,40],[844,44],[844,48],[850,60],[854,64],[854,66],[837,83],[835,83],[834,79],[832,78],[829,70],[824,65],[824,63],[808,58],[808,57],[805,57],[805,56],[798,55],[786,49],[783,49],[777,46],[774,42],[772,42],[769,39],[769,32],[766,28],[766,20],[768,18],[775,18],[775,17]]],"day_toss_right":[[1355,63],[0.70711,-0.70711],[[1419,9],[1425,9],[1428,13],[1428,17],[1424,21],[1424,27],[1405,45],[1400,46],[1394,50],[1387,51],[1381,55],[1378,55],[1372,58],[1367,63],[1367,65],[1364,67],[1359,79],[1342,63],[1355,37],[1362,31],[1372,28],[1380,17],[1382,17],[1383,15],[1387,13],[1391,15],[1391,22],[1386,27],[1389,31],[1389,30],[1393,30],[1397,28],[1409,13],[1415,10],[1419,10],[1419,9]]],"night_wave":[[326,286],[0.259973,-0.965616],[[321,156],[326,157],[326,159],[329,163],[329,167],[330,167],[331,185],[332,185],[335,215],[337,215],[337,213],[338,213],[338,205],[339,205],[340,163],[341,163],[342,159],[345,159],[348,162],[349,169],[350,169],[350,180],[351,180],[352,220],[353,220],[353,226],[354,226],[355,236],[356,236],[357,240],[361,237],[369,219],[374,214],[376,214],[377,212],[380,212],[380,211],[386,212],[386,215],[385,215],[382,223],[379,226],[378,233],[373,241],[370,256],[366,260],[366,262],[363,265],[363,267],[361,268],[361,270],[359,271],[358,275],[348,284],[345,294],[304,294],[305,289],[308,285],[308,278],[307,278],[306,273],[305,273],[302,259],[301,259],[301,255],[300,255],[299,244],[298,244],[298,239],[297,239],[297,232],[296,232],[295,226],[291,220],[289,211],[287,209],[287,206],[286,206],[285,197],[284,197],[284,190],[286,189],[293,196],[295,204],[299,210],[300,215],[304,219],[305,223],[308,224],[308,219],[307,219],[305,208],[304,208],[304,204],[303,204],[302,187],[301,187],[301,170],[302,170],[302,168],[305,168],[309,174],[309,177],[310,177],[311,188],[312,188],[313,195],[314,195],[316,207],[317,207],[318,213],[321,217],[320,176],[319,176],[319,162],[320,162],[321,156]]],"night_toss_left":[[800,70],[-0.70711,-0.70711],[[727,8],[733,9],[739,15],[746,18],[750,26],[756,30],[772,32],[772,30],[769,31],[770,29],[766,27],[761,20],[761,16],[763,14],[766,14],[772,17],[773,19],[775,19],[778,23],[785,25],[789,27],[790,29],[792,29],[793,31],[795,31],[800,36],[803,46],[808,51],[810,57],[812,58],[812,60],[814,61],[818,69],[801,86],[799,86],[790,68],[784,62],[776,58],[763,55],[763,54],[754,53],[752,50],[742,46],[735,39],[735,37],[727,29],[724,23],[725,16],[724,16],[723,10],[727,8]]],"night_toss_right":[[1267,63],[0.70711,-0.70711],[[1305,15],[1309,15],[1311,17],[1311,21],[1308,26],[1298,31],[1300,33],[1304,33],[1305,31],[1306,32],[1318,31],[1321,29],[1323,24],[1325,24],[1326,22],[1329,22],[1332,19],[1337,18],[1338,16],[1342,16],[1342,15],[1349,16],[1348,29],[1345,31],[1343,36],[1334,46],[1329,47],[1328,49],[1325,49],[1325,50],[1320,50],[1314,54],[1300,55],[1300,56],[1284,59],[1280,62],[1276,70],[1271,75],[1254,57],[1256,56],[1260,48],[1264,45],[1268,36],[1274,30],[1276,30],[1279,27],[1291,24],[1296,19],[1302,16],[1305,16],[1305,15]]],"day_point":[[129,184],[-0.97239,-0.23337],[[34,166],[68,167],[68,168],[96,167],[96,168],[125,170],[125,171],[135,171],[138,169],[138,171],[137,171],[137,176],[136,176],[136,180],[135,180],[135,184],[134,184],[134,188],[133,188],[130,201],[124,204],[117,205],[117,206],[102,207],[100,208],[100,214],[94,219],[94,221],[86,221],[85,219],[82,220],[83,218],[82,219],[75,218],[73,216],[73,210],[66,204],[64,200],[64,196],[67,190],[69,189],[70,185],[72,184],[72,181],[39,176],[34,172],[33,170],[34,166]]],"day_reach":[[1420,134],[0.87622,-0.48192],[[1485,73],[1502,73],[1507,78],[1507,82],[1505,83],[1504,87],[1505,89],[1508,90],[1508,93],[1504,96],[1493,97],[1494,99],[1498,100],[1497,102],[1500,101],[1500,103],[1502,103],[1503,105],[1502,109],[1501,110],[1487,109],[1490,112],[1489,120],[1483,121],[1478,124],[1466,126],[1460,129],[1453,137],[1443,140],[1441,142],[1433,143],[1427,146],[1423,151],[1413,131],[1411,130],[1410,126],[1420,121],[1425,115],[1427,115],[1441,101],[1441,99],[1446,95],[1446,93],[1450,89],[1456,88],[1457,86],[1459,86],[1460,84],[1467,81],[1469,78],[1473,76],[1477,76],[1477,75],[1481,75],[1485,73]]],"night_point":[[212,203],[-0.92848,-0.37139],[[128,168],[141,169],[141,170],[155,170],[155,171],[160,171],[160,172],[174,172],[178,175],[190,178],[192,180],[195,180],[195,181],[198,181],[198,182],[201,182],[201,183],[204,183],[210,186],[214,186],[224,191],[224,193],[223,193],[223,196],[221,198],[221,201],[219,203],[219,206],[217,208],[215,215],[213,215],[212,213],[206,210],[189,212],[189,211],[184,211],[184,210],[179,209],[174,220],[165,220],[164,218],[160,217],[156,211],[154,211],[154,209],[151,206],[150,201],[147,199],[148,194],[152,191],[154,186],[157,185],[158,183],[134,178],[128,174],[127,172],[128,168]]],"night_reach":[[1317,133],[0.74329,-0.66896],[[1372,56],[1387,57],[1387,62],[1384,65],[1376,67],[1378,71],[1381,71],[1384,73],[1384,77],[1380,80],[1363,80],[1355,87],[1356,90],[1354,90],[1353,95],[1354,97],[1359,98],[1360,96],[1366,94],[1367,92],[1375,88],[1383,88],[1386,91],[1386,95],[1380,98],[1378,101],[1376,101],[1371,106],[1367,107],[1364,111],[1362,111],[1362,113],[1356,118],[1356,120],[1352,124],[1350,124],[1348,127],[1344,129],[1334,132],[1320,145],[1316,141],[1316,139],[1307,131],[1307,129],[1304,126],[1309,121],[1311,121],[1314,118],[1314,116],[1320,111],[1321,107],[1323,106],[1330,92],[1333,82],[1343,74],[1343,72],[1348,67],[1348,65],[1352,62],[1357,62],[1364,58],[1372,57],[1372,56]]]};
  // Touch devices use lossless copies: decoded RGBA and dimensions match
  // the originals exactly. Desktop keeps the original PNG donor paintings.
  var compactWave=window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  var waveFormat=compactWave||window.HJArtDir?'.webp':'.png';
  var files={day:'hanjing-hands-day.webp',night:'hanjing-hands-night.webp',
    dayOne:'hanjing-hands-day-one-arm.webp',nightOne:'hanjing-hands-night-one-arm.webp',
    dayWave:'hanjing-wave-day-native'+waveFormat,nightWave:'hanjing-wave-night-native'+waveFormat};
  var loaded={},sections={};
  var mobileDonors=window.matchMedia('(pointer: coarse)').matches||window.matchMedia('(max-width: 699px)').matches;
  function donorImage(key){
    if(!loaded[key]){var im=new Image();loaded[key]=im;im.src=new URL(files[key],base).href;}
    return loaded[key];
  }
  var initialTheme=document.documentElement.dataset.theme==='dark'?'night':'day';
  Object.keys(files).forEach(function(key){if(!mobileDonors||key.indexOf(initialTheme)===0)donorImage(key);});
  function node(tag,attributes){
    var el=document.createElementNS(NS,tag);
    Object.keys(attributes||{}).forEach(function(key){el.setAttribute(key,attributes[key]);});
    return el;
  }
  function distal(c,side){
    var p=c.pivots,key=side==='left'?'L':'R',rest=p['wrist'+key];
    var w=p['gesture'+key]||rest,e=p[side==='left'?'el':'er'];
    if(!w||!rest||!e)return null;
    // A skin cut center can move without changing the already verified FK axis.
    var x=rest[0]-e[0],y=rest[1]-e[1],length=Math.hypot(x,y);
    return length?{wrist:w,unit:[x/length,y/length]}:null;
  }
  function matrix(id,wrist,elbow,mirror,scale,axis){
    var d=donors[id];if(!d)return null;
    var u=d[1],mx=mirror?-1:1;
    var angle=(axis?Math.atan2(axis[1],axis[0]):Math.atan2(wrist[1]-elbow[1],wrist[0]-elbow[0]))-Math.atan2(u[1],u[0]*mx);
    var co=Math.cos(angle)*scale,si=Math.sin(angle)*scale;
    var m=[co*mx,si*mx,-si,co,0,0],w=d[0];
    m[4]=wrist[0]-m[0]*w[0]-m[2]*w[1];
    m[5]=wrist[1]-m[1]*w[0]-m[3]*w[1];
    return m;
  }
  function section(id){
    if(sections[id])return sections[id];
    var d=donors[id],w=d[0],u=d[1],points=d[2],hits=[];
    function distance(p){return (p[0]-w[0])*u[0]+(p[1]-w[1])*u[1];}
    function lateral(p){return -(p[0]-w[0])*u[1]+(p[1]-w[1])*u[0];}
    for(var i=1;i<points.length;i++){
      var a=points[i-1],b=points[i],da=distance(a),db=distance(b);
      if(Math.abs(da)<1e-8)hits.push(lateral(a));
      if(da*db<0){var t=da/(da-db);hits.push(lateral([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]));}
    }
    var low=hits.length?Math.min.apply(Math,hits):0,high=hits.length?Math.max.apply(Math,hits):0;
    return sections[id]={center:(low+high)/2,width:high-low};
  }
  // Day retains one unit under its native cuff. Bare night wrists meet the
  // forearm at the same cut plane, without a protruding proximal overlap.
  function outline(d,scale,overlap,wristFit){
    var input=d[2].slice(0,-1),out=[],w=d[0],u=d[1],limit=overlap/scale;
    function distance(p){return (p[0]-w[0])*u[0]+(p[1]-w[1])*u[1]+limit;}
    input.forEach(function(b,i){
      var a=input[(i+input.length-1)%input.length],da=distance(a),db=distance(b);
      if((da>=0)!==(db>=0)){
        var t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
      }
      if(db>=0)out.push(b);
    });
    if(wristFit){
      // The night wave is large enough to retain the finger gaps at scene
      // scale. Its first two units taper to the original bare wrist width.
      // Clip only this proximal transition; all five fingers stay native.
      function clip(points,plane){
        var next=[];
        points.forEach(function(b,i){
          var a=points[(i+points.length-1)%points.length],da=plane(a),db=plane(b);
          if((da>=0)!==(db>=0)){
            var t=da/(da-db);next.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
          }
          if(db>=0)next.push(b);
        });
        return next;
      }
      var half=wristFit.width/(2*scale),center=wristFit.center;
      function lateral(p){return -(p[0]-w[0])*u[1]+(p[1]-w[1])*u[0]-center;}
      function flare(p){return half+.8*((p[0]-w[0])*u[0]+(p[1]-w[1])*u[1]);}
      out=clip(out,function(p){return flare(p)+lateral(p);});
      out=clip(out,function(p){return flare(p)-lateral(p);});
    }
    return out.map(function(p){return p.map(function(n){return +n.toFixed(4);}).join(',');}).join(' ');
  }
  function entry(root,state,c,id,side,scale){
    var key=id+'_'+side,old=state.entries[key];if(old)return old;
    var outfit=root.querySelector('.c-root > .o-'+(c.night?'night':'day'));if(!outfit)return null;
    var file=(c.night?'night':'day')+(/_wave$/.test(id)?'Wave':/point|reach/.test(id)?'One':'');
    donorImage(file);
    var outer=node('g',{class:'rig-gesture-hand','data-hand':side,'data-donor':id,'aria-hidden':'true'});
    outer.style.pointerEvents='none';outer.style.display='none';
    var defs=node('defs'),clip=node('clipPath',{id:'nativeGestureHand'+(++serial),clipPathUnits:'userSpaceOnUse'});
    var polygon=node('polygon');clip.appendChild(polygon);defs.appendChild(clip);outer.appendChild(defs);
    var format=/Wave$/.test(file)?[1024,1536]:[1536,1024];
    var inner=node('g'),paint=node('image',{width:format[0],height:format[1],preserveAspectRatio:'none',
      'clip-path':'url(#'+clip.id+')'});
    paint.style.pointerEvents='none';
    // Match the native body canvas once; no blur, skin patch or double filter.
    paint.style.filter=c.night?'brightness(.77) saturate(.8)':'none';
    inner.appendChild(paint);outer.appendChild(inner);outfit.appendChild(outer);
    var value={outer:outer,inner:inner,polygon:polygon,ready:false,file:file,scale:null,overlap:null};
    paint.addEventListener('load',function(){value.ready=true;});
    paint.addEventListener('error',function(){value.ready=false;});
    paint.setAttribute('href',new URL(files[file],base).href);
    state.entries[key]=value;return value;
  }
  function gestureHands(root,c,bones,action){
    var visible={left:false,right:false},state=states.get(root);
    if(!state){state={entries:{}};states.set(root,state);}
    Object.keys(state.entries).forEach(function(key){state.entries[key].outer.style.display='none';});
    if(!c||!c.pivots||!bones)return visible;
    var mode=c.night?'night':'day',scale=c.gestureHandScale||(c.night?.20:.18),requests=[];
    var overlap=typeof c.gestureHandOverlap==='number'?Math.max(0,Math.min(1,c.gestureHandOverlap)):(c.night?0:1);
    if(action==='toss')requests=[['left',mode+'_toss_left',false],['right',mode+'_toss_right',false]];
    else if(action==='wave'||action==='point')requests=[['right',mode+'_'+action,true]];
    else if(action==='reach')requests=[['right',mode+'_reach',false]];
    requests.forEach(function(request){
      var side=request[0],id=request[1],target=distal(c,side),bone=bones[side==='left'?2:4];
      // Register the new open palm by its measured wrist section, preserving
      // each finger's native proportions instead of using the old .20 scale.
      var handScale=/_wave$/.test(id)?(c.night?5.2:4.5)/section(id).width:scale;
      var wristFit=/_wave$/.test(id)&&c.night?{width:3.9,center:section(id).center}:null;
      if(!target||!bone||!(handScale>0))return;
      var value=entry(root,state,c,id,side,handScale);if(!value)return;
      if(value.scale!==handScale||value.overlap!==overlap){value.polygon.setAttribute('points',outline(donors[id],handScale,overlap,wristFit));value.scale=handScale;value.overlap=overlap;}
      var wrist=target.wrist;
      if(c.night){
        // Align the center of the source wrist outline, including mirrored
        // palms, to the actual narrow native cut; keep all finger proportions.
        var center=section(id).center*handScale*(request[2]?-1:1);
        wrist=[wrist[0]+target.unit[1]*center,wrist[1]-target.unit[0]*center];
      }
      value.inner.setAttribute('transform','matrix('+matrix(id,wrist,c.pivots[side==='left'?'el':'er'],request[2],handScale,target.unit).join(' ')+')');
      value.outer.setAttribute('transform','matrix('+bone.join(' ')+')');
      var donor=donorImage(value.file);
      if(value.ready&&donor.complete&&donor.naturalWidth){
        value.outer.style.display='inline';visible[side]=true;
      }
    });
    return visible;
  }
  gestureHands.matrix=matrix;
  gestureHands.section=section;
  gestureHands.cutPlanes=function(c,visible){
    var result={},box=c.box,crop=c.crop||[0,0,c.sheet[0],c.sheet[1]];
    ['left','right'].forEach(function(side){
      var d=distal(c,side);
      if(!d||!visible[side]){result[side]=[0,0,0,0];return;}
      var u=d.unit,w=d.wrist;
      result[side]=[u[0]*box[2]*c.sheet[0]/crop[2],u[1]*box[3]*c.sheet[1]/crop[3],
        u[0]*(box[0]-w[0]-box[2]*crop[0]/crop[2])+u[1]*(box[1]-w[1]-box[3]*crop[1]/crop[3]),1];
    });
    return result;
  };
  A.gestureHands=gestureHands;
})();
