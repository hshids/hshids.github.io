import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createRoomKit} from './fidelity-room-kit.js';

// Optional, object-owned magic. The existing buildings, content and dialogue
// remain authoritative; this module never plays an actor pose or locks a link.
// The hands-on fixtures use final metres under legacy chapter scales. Larger
// building-attached landmarks follow the building's own authoring scale.
const CONCEPTS={
  home:{title:'Letter Courtyard',subtitle:'A letter, before the little world.',discoveryId:'courtyard-letter',focus:{section:'about'},anchor:[-2.78,1.72],size:[1.38,.82]},
  research:{title:'Question Library',subtitle:'Follow a question. Keep your own choice.',discoveryId:'question-light-path',anchor:[2.03,1.90],size:[2.20,1.50]},
  talks:{title:'Lantern Theatre',subtitle:'Ideas become conversations here.',discoveryId:'theatre-lantern',focus:{posters:true},anchor:[-2.96,2.80],size:[1.08,.66]},
  education:{title:'Memory Observatory',subtitle:'Places that helped shape me.',discoveryId:'memory-constellation',focus:{education:'bs'},anchor:[3.41,2.12],size:[1.29,.90]},
  writing:{title:'Ink Studio',subtitle:'Notes, tutorials, and a little ink.',discoveryId:'ink-paper-crane',focus:{section:'writing-tutorials'},anchor:[-2.87,1.87],size:[1.15,.86]},
  life:{title:'Cat Home',subtitle:'Technically, I live in their house.',discoveryId:'cat-home-bell',focus:{life:'cats'},anchor:[-3.50,1.73],size:[.92,.75]},
  contact:{title:'Letter Tree',subtitle:'A conversation can start with a letter.',discoveryId:'letter-tree-seal',anchor:[-1.09,1.83],size:[1.10,.81]}
};

export function createMagicChapters({stations=[],data={},quality='high',reduced=false,onDiscover}={}){
  const root=new THREE.Group();root.name='Magic chapter registry — attachments live with their buildings';
  const interactables=[],colliders=[],attachments=[],resources=new Set(),states=new Map(),kits=[];
  const low=quality==='low',segments=low?8:12;
  let dark=true,disposed=false,callback=typeof onDiscover==='function'?onDiscover:null;
  const material=(name,color,roughness=.78,metalness=0)=>{
    const m=new THREE.MeshStandardMaterial({name:'magic-'+name,color,roughness,metalness});resources.add(m);return m;
  };
  const mats={jade:material('soft-jade','#7eaaa0',.64),brass:material('brushed-brass','#c7a362',.48,.34),
    ink:material('ink','#343e42',.86),paper:material('rice-paper','#f1e5cb',.91),
    red:material('seal-red','#aa554b',.80),blue:material('theatre-blue','#708b99',.78)};
  const cats=data.cats||data.life?.find(v=>v.id==='cats')?.cats||[];
  const schools=['bs','ms','phd'].map(id=>data.education?.find(s=>s.id===id)).filter(Boolean);
  const notes={
    home:`Welcome to ${data.person?.name||'Hanjing Shi'}'s little world. Research, stories${cats.length?', and '+cats.length+' cats':''} live here.`,
    research:data.person?.tagline?.en||'A little path through the questions behind this library: suggestion, evidence, and choice.',
    talks:'Talks, posters, and moments from the conference floor. Pick a talk and take a seat.',
    education:schools.length?schools.map(s=>s.school).join(' → ')+'. A few places that made me, me.':'A few places that made me, me.',
    writing:'My tutorials are tucked into the archive, and my everyday reflections are on the desk.',
    life:cats.length?`${cats.length} cats, in the order they joined the family. JinBingBing is the youngest; XiaoHei is our oldest brother.`:'A quiet home for the cats, with room for stories and a nap.',
    contact:'Want to talk research or collaborate? A letter is a lovely place to begin.'
  };
  const metadata={version:1,representation:'Authored miniature magic; research mechanism is a visual metaphor, not a scientific measurement.',
    chapters:[],lighting:{additionalShadowMaps:0,additionalPointLights:1,practicals:'The Lantern Theatre owns one 0.24m, non-shadowed practical. Jade inlays elsewhere are visible sources; they do not claim to illuminate their surroundings.'},
    limits:['Building and existing content ownership stay with the chapter factories.','Actual composition and ray selection require the integrated browser review.']};

  function own(g){resources.add(g);return g;}
  function mesh(label,g,mat,pos=[0,0,0],parent){
    const o=new THREE.Mesh(own(g),mat);o.name=label;o.position.fromArray(pos);o.castShadow=o.receiveShadow=true;o.userData.roomSolid=true;parent.add(o);return o;
  }
  function rounded(label,size,pos,mat,parent,r=.028){
    return mesh(label,new RoundedBoxGeometry(...size,low?1:2,Math.min(r,...size.map(v=>v*.22))),mat,pos,parent);
  }
  function strut(label,a,b,r,mat,parent){
    const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),o=mesh(label,new THREE.CylinderGeometry(r,r,v.length(),segments),mat,new THREE.Vector3(...a).addScaledVector(v,.5).toArray(),parent);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;
  }
  function prism(label,points,thickness,mat,pos,parent){
    const shape=new THREE.Shape(points.map(p=>new THREE.Vector2(...p)));
    return mesh(label,new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,curveSegments:1}),mat,pos,parent);
  }
  function ring(label,r,t,pos,mat,parent,rotation=[0,0,0]){
    const o=mesh(label,new THREE.TorusGeometry(r,t,low?4:6,segments*2),mat,pos,parent);o.rotation.fromArray(rotation);return o;
  }
  function group(name,pos,parent){const g=new THREE.Group();g.name=name;g.position.fromArray(pos);parent.add(g);return g;}
  function star(label,r,pos,parent){
    const pts=[];for(let i=0;i<8;i++){const a=Math.PI/2+i*Math.PI/4,k=i%2?r*.32:r;pts.push([Math.cos(a)*k,Math.sin(a)*k]);}
    return prism(label,pts,.020,mats.brass,pos,parent);
  }
  function envelope(label,size,pos,parent){
    const g=group(label,pos,parent),[w,h,d]=size;
    rounded(label+'-closed-paper-body',[w,h,d],[0,0,0],mats.paper,g,.013);
    const fold=prism(label+'-folded-flap',[[-w*.46,h*.40],[w*.46,h*.40],[0,-h*.12]],.006,mats.paper,[-0,h*.02,d/2+.001],g);
    for(const side of[-1,1])strut(label+'-ink-fold-'+side,[side*w*.45,h*.40,d/2+.010],[0,-h*.10,d/2+.010],.0035,mats.ink,g);
    rounded(label+'-wax-seal',[w*.13,w*.13,.025],[0,-h*.09,d/2+.012],mats.red,g,.012);fold.userData.roomSolid=true;return g;
  }
  function pulseMaterial(label,colour='#e5b979'){
    const m=material(label,colour,.56,.12);m.emissive.set('#efbf79');return m;
  }
  function finish(id,{notify=true}={}){
    const s=states.get(id)||[...states.values()].find(s=>s.discoveryId===id);if(!s||disposed)return null;
    const fresh=!s.discoveredEver;s.discoveredEver=true;s.found=true;s.feedback=1.9;s.activated?.();
    const event={id:s.discoveryId,discoveryId:s.discoveryId,station:s.id,title:s.title,note:s.note,focus:s.focus,complete:true,fresh};
    if(fresh&&notify)(callback||root.userData.onDiscover)?.(event);return event;
  }
  function item(s,id,title,objects,handler){
    const objectsList=Array.isArray(objects)?objects:[objects];objectsList.forEach(o=>o.traverse(m=>{if(m.isMesh)m.userData.interaction=id;}));
    const entry={id,type:'magic',station:s.id,chapter:s.id,title,discoveryId:s.discoveryId,object:objectsList[0],objects:objectsList,
      point:[0,0,0],focus:s.focus,onInteract:handler||(()=>finish(s.id))};
    interactables.push(entry);s.items.push(entry);return entry;
  }
  function support(s,w,d,h=.54){
    const k=s.kit;
    k.brickWall(s.id+'-magic-stone-plinth',[w*.82,.16,d*.82],[0,.08,0],'stone');
    for(const x of[-w*.32,w*.32])for(const z of[-d*.29,d*.29])k.box(s.id+'-magic-joined-table-leg',[.095,h-.15,.095],[x,(h+.15)/2,z],'wood');
    for(const z of[-d*.29,d*.29])k.box(s.id+'-magic-table-stretcher',[w*.74,.06,.07],[0,.27,z],'darkWood');
    k.box(s.id+'-magic-bearing-tabletop',[w,.075,d],[0,h,0],'wood');
    for(let i=0;i<4;i++)k.round(s.id+'-magic-brass-block-pin-'+i,.026,.019,[(i-1.5)*w*.19,h+.047,d*.39],mats.brass,k.root,8);
    return h+.038;
  }
  function practical(s,pos){
    const light=s.kit.lamp(pos,.12,.24);light.name=s.id+'-magic-fixture-local-night-light';light.castShadow=false;
    s.light=light;return light;
  }
  function emitters(s,objects){
    s.emitterMaterials=objects.map(o=>o.material);s.emitterMaterials.forEach(m=>m.emissive.set('#edbd78'));
  }
  function plinth(s,w,d,h=.16){
    s.kit.brickWall(s.id+'-magic-individual-stone-foundation',[w,h,d],[0,h/2,0],'stone');
    s.kit.box(s.id+'-magic-brass-plinth-rim',[w+.012,.027,d+.012],[0,h+.0135,0],'brass');
    return h+.027;
  }

  for(const st of stations){
    const c=CONCEPTS[st.id];if(!c||!st.root?.isObject3D)continue;
    const scale=Number.isFinite(st.scale)&&st.scale>0?st.scale:1;
    const attachment=group('magic-'+st.id+'-world-scale-miniature',[c.anchor[0]/scale,0,c.anchor[1]/scale],st.root);attachment.scale.setScalar(1/scale);
    const floor=st.source?.floorAt?.(c.anchor[0]/scale,c.anchor[1]/scale)??0;attachment.position.y=floor;
    const contentRoot=group('magic-'+st.id+'-authored-object',[0,0,0],attachment),kit=createRoomKit({root:contentRoot,name:'magic-'+st.id,quality});kits.push(kit);
    const s={id:st.id,station:st,attachment,root:contentRoot,kit,items:[],emitterMaterials:[],feedback:0,found:false,...c,note:notes[st.id]};states.set(st.id,s);attachments.push(attachment);
    const [w,d]=c.size;
    colliders.push({id:'magic-'+st.id+'-supported-fixture',station:st.id,min:[(c.anchor[0]-w/2)/scale,floor,(c.anchor[1]-d/2)/scale],max:[(c.anchor[0]+w/2)/scale,floor+2.40/scale,(c.anchor[1]+d/2)/scale]});
    if(st.id==='home')buildLetter(s);
    if(st.id==='research')buildQuestions(s);
    if(st.id==='talks')buildTheatre(s);
    if(st.id==='education')buildObservatory(s);
    if(st.id==='writing')buildInk(s);
    if(st.id==='life')buildCatBell(s);
    if(st.id==='contact')buildLetterTree(s);
    buildLandmark(s);
    kit.flush();batchCustom(s);
    attachment.updateWorldMatrix(true,true);
    for(const i of s.items){
      const b=new THREE.Box3().setFromObject(i.object),world=b.getCenter(new THREE.Vector3());i.point=world.toArray();
      i.localPoint=st.root.worldToLocal(world.clone()).toArray();
      i.getWorldPoint=()=>i.object.getWorldPosition(new THREE.Vector3()).toArray();
    }
    const extraBounds=new THREE.Box3().setFromObject(attachment);
    metadata.chapters.push({id:s.id,station:s.id,title:s.title,subtitle:s.subtitle,note:s.note,discoveryId:s.discoveryId,focus:s.focus,
      localAnchor:attachment.position.toArray(),worldSize:c.size.slice(),
      extraWorldBounds:{min:extraBounds.min.toArray(),max:extraBounds.max.toArray()},
      representation:st.id==='research'?'Illustration; Suggestion/Evidence/Choice are authored symbolic nodes.':'Personal-world illustration.'});
  }

  function buildLetter(s){
    const y=support(s,1.30,.77,.67),stand=group('courtyard-letter-reading-easel',[0,y,0],s.root);stand.rotation.x=-.32;
    s.kit.box('courtyard-easel-supported-back',[1.10,.68,.05],[0,.30,-.03],'darkWood',stand);
    s.kit.box('courtyard-easel-letter-ledge',[1.17,.055,.17],[0,.012,.025],'brass',stand);
    const letter=envelope('courtyard-the-opening-letter',[.98,.53,.04],[0,.302,.015],stand);
    const seal=letter.children.find(o=>o.name.endsWith('wax-seal'));
    seal.userData.keepMesh=true;
    item(s,'magic-home-letter','Read the opening letter',letter);
    s.animate=(t,dt)=>{seal.scale.setScalar(1+(reduced?0:s.feedback*.018*Math.sin(t*3)));};
    s.kit.sign('courtyard-letter-table-inset','A LETTER',[.69,.13,.04],[0,y-.08,.41],'darkWood');
  }

  function buildQuestions(s){
    const y=support(s,1.88,.94,.65),spine=group('question-book-solid-spine',[0,y+.085,-.08],s.root);
    // A full solid Western book turret at the back of the Chinese writing
    // console: four walls, a closed pointed roof, inset window, bearing foot.
    const tx=-.72,tz=-.67;
    s.kit.brickWall('question-turret-ground-bearing-stone-foot',[.49,.22,.48],[tx,.11,tz],'stone');
    s.kit.brickWall('question-turret-full-four-sided-book-stack',[.38,1.34,.35],[tx,.89,tz],'plaster');
    s.kit.box('question-turret-jade-cornice',[.49,.065,.47],[tx,1.58,tz],'green');
    const roof=mesh('question-turret-closed-four-sided-pointed-roof',new THREE.ConeGeometry(.37,.67,4),mats.blue,[tx,1.937,tz],s.root);roof.rotation.y=Math.PI/4;
    const window=prism('question-turret-supported-pointed-arch-inset',[[-.085,0],[.085,0],[.085,.21],[0,.29],[-.085,.21]],.015,mats.ink,[tx,.98,tz+.178],s.root);
    const pane=prism('question-turret-inset-jade-window',[[-.063,0],[.063,0],[.063,.18],[0,.24],[-.063,.18]],.014,mats.jade,[tx,1.002,tz+.195],s.root);
    strut('question-turret-connected-window-mullion',[tx,1.002,tz+.213],[tx,1.237,tz+.213],.006,mats.brass,s.root);
    s.kit.sign('question-turret-attached-question-mark','?',[.20,.18,.025],[tx,.62,tz+.189],'darkWood');
    window.userData.roomSolid=pane.userData.roomSolid=true;
    rounded('question-book-connected-jade-spine',[.11,.18,.76],[0,0,0],mats.jade,spine);
    for(const side of[-1,1]){
      const wing=group('question-book-'+side+'-bound-page-block',[side*.035,.005,0],spine);wing.rotation.z=side*.18;
      rounded('question-book-'+side+'-hardbound-cover',[.87,.05,.78],[side*.435,0,0],mats.jade,wing);
      rounded('question-book-'+side+'-closed-paper-block',[.81,.085,.70],[side*.425,.061,0],mats.paper,wing,.01);
      for(let l=0;l<3;l++)s.kit.box('question-book-'+side+'-page-edge-'+l,[.80,.005,.011],[side*.425,.041+l*.023,.354],'ivory',wing);
      for(let l=0;l<3;l++)rounded('question-book-'+side+'-ink-line-'+l,[.41-l*.07,.004,.011],[side*.43,.107,-.17+l*.12],mats.ink,wing,.001);
    }
    const leaf=group('question-book-real-bound-turning-leaf',[.047,.127,0],spine);leaf.rotation.z=.18;
    rounded('question-book-one-turning-paper-leaf',[.79,.013,.68],[.406,0,0],mats.paper,leaf,.002);
    for(let l=0;l<3;l++)rounded('question-turning-leaf-ink-'+l,[.35-l*.05,.005,.013],[.39,.009,-.15+l*.12],mats.ink,leaf,.001);
    const labels=['Suggestion','Evidence','Choice'],buttons=[],lights=[];s.progress=0;
    for(let i=0;i<3;i++){
      const b=group('question-'+labels[i]+'-mechanical-key',[(i-1)*.54,y+.09,.38],s.root);
      s.kit.box('question-'+labels[i]+'-load-bearing-key-setting',[.45,.07,.26],[(i-1)*.54,y+.035,.38],'darkWood');
      rounded('question-'+labels[i]+'-closed-button',[.39,.11,.20],[0,0,0],mats.brass,b);
      const m=pulseMaterial('question-'+labels[i]+'-inlaid-jade','#87afa3');lights.push(m);
      rounded('question-'+labels[i]+'-inlaid-jade-key',[.29,.02,.14],[0,.064,0],m,b,.006);buttons.push(b);
      const title=s.kit.sign('question-'+labels[i]+'-attached-label',labels[i],[.46,.105,.045],[(i-1)*.54,y-.04,.491],'darkWood');title.rotation.x=-.10;
      item(s,'magic-research-'+labels[i].toLowerCase(),'Connect '+labels[i],b,()=>{
        s.feedback=1.9;
        if(s.found)return finish(s.id);
        if(i===s.progress){s.progress++;if(s.progress===3)return finish(s.id);
          return{id:s.discoveryId,station:s.id,complete:false,progress:s.progress,note:labels[i]+' is connected. Follow '+labels[s.progress]+' next.'};}
        s.progress=0;return{id:s.discoveryId,station:s.id,complete:false,progress:0,note:'A loose thread! Start with Suggestion, follow Evidence, then make a Choice. You can reset at any time.'};
      });
    }
    const reset=rounded('question-book-supported-reset-stud',[.17,.09,.14],[-.84,y+.09,.38],mats.red,s.root);
    s.kit.round('question-book-reset-real-shaft',.045,.053,[-.84,y+.0265,.38],'brass');
    s.kit.sign('question-reset-attached-label','Reset',[.23,.095,.045],[-.84,y-.15,.491],'darkWood');
    for(const x of[-.91,-.77])strut('question-reset-label-real-support-'+x,[x,y-.043,.455],[x,y-.128,.473],.009,mats.brass,s.root);
    item(s,'magic-research-reset','Reset the question path',reset,()=>{
      s.progress=0;s.found=false;s.feedback=.8;return{id:s.discoveryId,station:s.id,complete:false,reset:true,note:'The path is clear again. Start with Suggestion.'};
    });
    // Inlaid circuit has a real brass trough and small supported luminous tiles.
    const path=[];for(let i=0;i<8;i++){
      const p=[-.68+i*.19,y+.0115,.27],m=pulseMaterial('question-path-tile-'+i);
      rounded('question-path-brass-setting-'+i,[.14,.025,.047],p,mats.brass,s.root,.004);
      const tile=rounded('question-path-supported-light-tile-'+i,[.095,.008,.021],[p[0],p[1]+.0155,p[2]],m,s.root,.001);path.push(tile);
    }
    s.activated=()=>{s.progress=3;};
    s.animate=(t,dt)=>{
      const p=reduced?0:Math.max(0,Math.min(1,1-s.feedback/1.9)),angle=.18+(s.found&&s.feedback>0&&!reduced?Math.sin(p*Math.PI)*2.45:0);
      leaf.rotation.z=reduced?.18:THREE.MathUtils.damp(leaf.rotation.z,angle,11,dt);
      lights.forEach((m,i)=>{m.emissiveIntensity=i<s.progress?(dark?.62:.18):.015;});
      path.forEach((o,i)=>{o.material.emissiveIntensity=s.found?(dark?.78:.27)*(reduced?1:.84+.16*Math.sin(t*2.3-i*.25)):.012;});
      buttons.forEach((b,i)=>{const h=y+.09-(s.progress>i?.019:0);b.position.y=reduced?h:THREE.MathUtils.damp(b.position.y,h,14,dt);});
    };
  }

  function buildTheatre(s){
    const y=plinth(s,1.04,.62,.16),arch=group('lantern-theatre-bolted-shadow-frame',[0,y,0],s.root);
    const outline=[[-.43,0],[.43,0],[.43,.72],[.28,1.12],[0,1.43],[-.28,1.12],[-.43,.72]],
      aperture=[[-.31,.055],[.31,.055],[.31,.69],[.20,1.035],[0,1.27],[-.20,1.035],[-.31,.69]];
    const shape=new THREE.Shape(outline.map(p=>new THREE.Vector2(...p)));shape.holes=[new THREE.Path(aperture.map(p=>new THREE.Vector2(...p)))];
    mesh('theatre-complete-pointed-arch-shadow-vault',new THREE.ExtrudeGeometry(shape,{depth:.11,bevelEnabled:false}),s.kit.materials.darkWood,[0,0,-.055],arch);
    for(const side of[-1,1]){
      strut('theatre-brass-arch-inlay-lower-'+side,[side*.37,.71,.067],[side*.24,1.07,.067],.016,mats.brass,arch);
      strut('theatre-brass-arch-inlay-upper-'+side,[side*.24,1.07,.067],[0,1.35,.067],.016,mats.brass,arch);
    }
    strut('theatre-lantern-real-hemp-cord',[0,1.30,0],[0,1.09,0],.012,mats.ink,arch);
    const lamp=group('theatre-hinged-lantern',[0,.83,0],arch),paper=pulseMaterial('theatre-warm-paper','#e7c38b');
    rounded('theatre-lantern-paper-core',[.32,.44,.27],[0,0,0],paper,lamp);
    for(const x of[-.175,.175])for(const z of[-.15,.15])s.kit.box('theatre-lantern-corner-cage',[.022,.48,.022],[x,0,z],'brass',lamp);
    for(const yy of[-.24,.24])s.kit.box('theatre-lantern-connected-cap',[.39,.045,.34],[0,yy,0],'darkWood',lamp);
    const shutter=group('theatre-real-shutter-hinge',[-.19,0,.185],lamp);
    s.kit.box('theatre-closed-shadow-shutter',[.36,.40,.035],[.18,0,0],'blue',shutter);
    star('theatre-shadow-star-cut-inlay',.075,[.18,0,.021],shutter);
    const lever=rounded('theatre-brass-shutter-key',[.11,.18,.09],[.34,y+.30,.19],mats.brass,s.root);
    strut('theatre-shutter-key-connected-shaft',[.34,y+.30,.043],[.34,y+.30,.15],.017,mats.brass,s.root);
    item(s,'magic-talks-lantern','Open the lantern shutter',[lever,lamp]);
    practical(s,[0,y+.83,0]);emitters(s,[lamp.children.find(o=>o.material===paper)]);
    s.animate=(t,dt)=>{shutter.rotation.y=THREE.MathUtils.damp(shutter.rotation.y,s.found?-1.15:0,8,dt);lamp.rotation.z=reduced?0:Math.sin(t*.7)*.025;};
  }

  function buildObservatory(s){
    const y=plinth(s,1.23,.83,.22),axis=group('memory-observatory-real-yoke',[0,y+.55,0],s.root);
    for(const x of[-.45,.45]){
      s.kit.box('observatory-bearing-post-'+x,[.085,.56,.085],[x,y+.27,0],'wood');
      strut('observatory-bearing-crosspin-'+x,[x,y+.55,0],[x*.80,y+.55,0],.026,mats.brass,s.root);
    }
    const wheel=group('observatory-turning-star-disc',[0,0,0],axis);wheel.rotation.x=-.31;
    ring('observatory-closed-copper-armillary',.43,.028,[0,0,0],mats.brass,wheel);
    rounded('observatory-closed-jade-star-disc',[.65,.65,.048],[0,0,0],mats.jade,wheel,.08);
    for(let i=0;i<3;i++){
      const a=i*Math.PI*2/3+Math.PI/2,p=[Math.cos(a)*.29,Math.sin(a)*.29,.039];star('observatory-fixed-school-star-'+i,.081,p,wheel);
      strut('observatory-connected-constellation-line-'+i,[0,0,.042],p,.009,mats.brass,wheel);
    }
    ring('observatory-free-cross-axis-band',.46,.022,[0,0,0],mats.brass,axis,[0,Math.PI/2,0]);
    s.kit.box('observatory-yoke-centre-shaft',[1.10,.05,.05],[.02,y+.55,-.05],'brass');
    const crank=group('observatory-real-hand-crank',[.54,y+.55,-.05],s.root);
    strut('observatory-crank-attached-arm',[0,0,0],[0,-.18,.04],.027,mats.brass,crank);
    rounded('observatory-crank-wood-handle',[.08,.17,.08],[0,-.18,.06],mats.red,crank);
    s.memoryIndex=-1;s.memoryAngle=0;
    const label=s.kit.sign('observatory-fixed-schools-inset','UC DAVIS  ·  GEORGETOWN  ·  LEHIGH',[1.18,.12,.075],[0,y-.08,.45],'darkWood');
    item(s,'magic-education-star-dial','Turn the memory constellation',[axis,crank,label],()=>{
      s.memoryIndex=(s.memoryIndex+1)%Math.max(1,schools.length);s.memoryAngle+=Math.PI*2/3;const event=finish(s.id);
      if(schools[s.memoryIndex])event.focus={education:schools[s.memoryIndex].id};return event;
    });
    s.animate=(t,dt)=>{wheel.rotation.z=THREE.MathUtils.damp(wheel.rotation.z,s.memoryAngle,7,dt);crank.rotation.x=wheel.rotation.z;};
  }

  function buildInk(s){
    const y=support(s,1.09,.78,.55);
    const tray=rounded('ink-studio-solid-jade-inkstone',[.59,.07,.38],[0,y+.035,0],mats.jade,s.root,.025);
    rounded('ink-studio-recessed-ink-basin',[.42,.014,.26],[0,y+.073,0],mats.ink,s.root,.015);
    const stamp=group('ink-studio-grounded-seal-press',[-.31,y+.28,.24],s.root);
    for(const x of[-.445,-.175])s.kit.box('ink-studio-press-fixed-guide-post-'+x,[.032,.45,.035],[x,y+.225,.24],'brass');
    s.kit.box('ink-studio-press-connected-guide-crossbar',[.30,.035,.043],[-.31,y+.42,.24],'brass');
    strut('ink-studio-press-real-guided-shaft',[0,-.16,0],[0,.20,0],.025,mats.brass,stamp);
    rounded('ink-studio-brass-seal-bottom',[.15,.06,.15],[0,-.16,0],mats.brass,stamp);
    rounded('ink-studio-red-seal-handle',[.13,.11,.13],[0,.19,0],mats.red,stamp);
    s.kit.box('ink-studio-supported-rice-paper',[.37,.019,.25],[-.31,y+.0095,.25],'ivory');
    const imprint=rounded('ink-studio-paper-red-ink-imprint',[.10,.003,.10],[-.31,y+.0205,.25],mats.red,s.root,.002);imprint.visible=false;
    const arm=group('ink-studio-paper-crane-attached-frame',[.32,y,0],s.root);
    s.kit.box('ink-studio-crane-frame-upright',[.055,.83,.055],[.13,.395,0],'wood',arm);
    s.kit.box('ink-studio-crane-frame-connected-beam',[.42,.05,.065],[-.025,.79,0],'wood',arm);
    strut('ink-studio-paper-crane-thin-hemp',[-.11,.78,0],[-.11,.56,0],.008,mats.ink,arm);
    const crane=group('ink-studio-solid-folded-paper-crane',[-.11,.49,0],arm);
    prism('ink-studio-crane-folded-body',[[-.10,-.035],[.10,-.035],[.035,.075],[-.04,.055]],.035,mats.paper,[-0,0,-.018],crane);
    for(const side of[-1,1]){
      const wing=prism('ink-studio-crane-'+side+'-folded-wing',[[0,0],[side*.22,.16],[side*.11,-.02]],.017,mats.paper,[0,0,0],crane);wing.rotation.y=side*.27;
      strut('ink-studio-crane-'+side+'-fold-crease',[0,.006,.023],[side*.16,.116,.023],.003,mats.brass,crane);
    }
    prism('ink-studio-crane-folded-neck',[[.035,.04],[.085,.15],[.12,.15],[.085,.06]],.021,mats.paper,[0,0,.012],crane);
    prism('ink-studio-crane-beak',[[.085,.15],[.19,.12],[.12,.14]],.022,mats.brass,[0,0,.012],crane);
    item(s,'magic-writing-ink-seal','Press the ink seal',[stamp,tray,crane]);
    s.activated=()=>{imprint.visible=true;};
    s.animate=(t,dt)=>{
      const p=Math.max(0,Math.min(1,1-s.feedback/1.9));stamp.position.y=y+.28-(s.feedback>0&&!reduced?Math.sin(p*Math.PI)*.072:0);
      crane.rotation.y=reduced?0:Math.sin(t*.65)*.13;crane.rotation.z=reduced?0:Math.sin(t*.65)*.05;
    };
  }

  function buildCatBell(s){
    const y=plinth(s,.86,.68,.14),frame=group('cat-home-bell-supported-doorframe',[0,y,0],s.root);
    for(const x of[-.29,.29])s.kit.box('cat-bell-connected-upright-'+x,[.085,.77,.08],[x,.35,0],'wood',frame);
    s.kit.box('cat-bell-connected-crossbar',[.68,.09,.12],[0,.73,0],'darkWood',frame);
    for(const side of[-1,1])prism('cat-bell-tiled-cat-ear-'+side,[[side*.08,.765],[side*.27,.90],[side*.33,.765]],.11,mats.jade,[0,0,-.055],frame);
    strut('cat-bell-real-cord',[0,.71,0],[0,.51,0],.010,mats.ink,frame);
    const bell=group('cat-home-real-hanging-brass-bell',[0,.51,0],frame);
    mesh('cat-home-closed-bell-shell',new THREE.CylinderGeometry(.10,.16,.22,segments),mats.brass,[0,-.10,0],bell);
    ring('cat-home-bell-brass-rim',.157,.016,[0,-.207,0],mats.brass,bell,[Math.PI/2,0,0]);
    mesh('cat-home-bell-supported-dark-mouth',new THREE.CylinderGeometry(.142,.142,.008,segments),mats.ink,[0,-.219,0],bell);
    strut('cat-home-bell-real-clapper',[0,-.12,0],[0,-.255,0],.021,mats.brass,bell);
    s.kit.box('cat-home-paw-supporting-crossbar',[.63,.12,.09],[0,.14,0],'wood',frame);
    rounded('cat-home-paw-closed-copper-mount',[.34,.24,.025],[0,.15,.046],mats.brass,frame,.014);
    const paw=group('cat-home-jade-paw-button',[0,.14,.075],frame);
    rounded('cat-paw-central-pad',[.14,.13,.06],[0,-.035,0],mats.jade,paw,.025);
    for(const [i,x]of[-.10,-.035,.035,.10].entries())rounded('cat-paw-toe-'+i,[.055,.063,.047],[x,.06+Math.abs(x)*.10,0],mats.jade,paw,.018);
    s.kit.sign('cat-bell-attached-inset','CATS LIVE HERE',[.67,.115,.07],[0,y-.05,.37],'darkWood');
    item(s,'magic-life-cat-bell','Ring the cat-home bell',[paw,bell]);
    s.animate=(t,dt)=>{bell.rotation.z=s.feedback>0&&!reduced?Math.sin((1.9-s.feedback)*9)*s.feedback*.095:0;};
  }

  function buildLetterTree(s){
    const y=plinth(s,1.04,.73,.18),frame=group('letter-tree-carved-mail-branch',[0,y,0],s.root);
    for(const [i,a,b,r]of [[0,[-.30,0,0],[-.25,.93,0],.055],[1,[-.25,.91,0],[.33,1.08,0],.034],[2,[-.05,.96,0],[.07,1.22,-.015],.024]])strut('letter-tree-carved-attached-branch-'+i,a,b,r,mats.brass,frame);
    const leaf=prism('letter-tree-small-jade-leaf',[[0,0],[.14,.045],[.23,.01],[.12,-.035]],.02,mats.jade,[.09,1.18,-.01],frame);leaf.rotation.z=.20;
    strut('letter-tree-real-envelope-hemp',[.20,1.025,.0],[.20,.86,0],.009,mats.ink,frame);
    const letter=envelope('letter-tree-supported-hanging-envelope',[.39,.26,.039],[.20,.73,0],frame);
    const seal=rounded('letter-tree-grounded-copper-letter-key',[.23,.08,.18],[.24,y+.04,.23],mats.brass,s.root);
    s.kit.sign('letter-tree-table-attached-inset','LET’S TALK',[.66,.13,.04],[0,y-.06,.397],'darkWood');
    item(s,'magic-contact-letter-seal','Find a way to say hello',[seal,letter]);
    s.animate=(t,dt)=>{letter.rotation.z=reduced?0:Math.sin(t*.64)*.035;};
  }

  function landmark(s,name,point){
    const scale=s.station.scale||1,g=group(name,[point[0]*scale-s.anchor[0],point[1]*scale,point[2]*scale-s.anchor[1]],s.root);g.scale.setScalar(scale);
    g.userData.magicLandmark=true;return g;
  }
  function obstacle(s,name,min,max){
    colliders.push({id:name,station:s.id,min:min.slice(),max:max.slice()});
  }
  function pointedWindow(s,name,w,h,p,parent){
    const rim=prism(name+'-solid-pointed-stone-frame',[[-w/2,0],[w/2,0],[w/2,h*.67],[0,h],[-w/2,h*.67]],.043,mats.brass,p,parent);
    const inner=prism(name+'-closed-recessed-jade-pane',[[-w*.35,0],[w*.35,0],[w*.35,h*.59],[0,h*.84],[-w*.35,h*.59]],.016,mats.jade,[p[0],p[1]+h*.075,p[2]+.034],parent);
    strut(name+'-connected-mullion',[p[0],p[1]+h*.08,p[2]+.055],[p[0],p[1]+h*.88,p[2]+.055],.015,mats.brass,parent);
    rim.userData.roomSolid=inner.userData.roomSolid=true;
  }
  function buildLandmark(s){
    // Overview silhouettes belong to the building, rather than multiplying
    // identical little tables. Only appended structures are authored here.
    if(s.id==='research'){
      const g=landmark(s,'question-library-connected-Western-book-tower',[4.29,0,-2.10]);
      s.kit.brickWall('book-tower-continuous-ground-bearing-foot',[1.07,.27,1.11],[0,.135,0],'stone',g);
      s.kit.brickWall('book-tower-four-sided-closed-timber-and-paper-body',[.94,3.88,.94],[0,2.18,0],'plaster',g);
      for(const y of[1.13,2.25,3.38,4.14])s.kit.box('book-tower-real-bound-book-course-'+y,[1.02,.085,1.02],[0,y,0],'wood',g);
      for(const x of[-.45,.45])for(const z of[-.45,.45])s.kit.box('book-tower-timber-corner-binding',[.07,3.89,.07],[x,2.18,z],'darkWood',g);
      const roof=mesh('book-tower-closed-copper-pointed-spire',new THREE.ConeGeometry(.84,1.60,4),mats.blue,[0,4.98,0],g);roof.rotation.y=Math.PI/4;
      strut('book-tower-connected-spire-weather-needle',[0,5.78,0],[0,6.08,0],.020,mats.brass,g);
      star('book-tower-attached-question-star',.13,[0,6.08,-.01],g);
      for(const y of[.65,1.82,2.96]){
        pointedWindow(s,'book-tower-front-arch-'+y,.38,.62,[0,y,.473],g);
        const rear=group('book-tower-real-rear-window-'+y,[0,y,-.473],g);rear.rotation.y=Math.PI;pointedWindow(s,'book-tower-rear-arch-'+y,.38,.62,[0,0,0],rear);
      }
      const connector=landmark(s,'book-tower-load-bearing-library-connector',[3.52,0,-2.10]);
      s.kit.brickWall('book-tower-connector-grounded-stone-bearing',[.88,.24,.74],[0,.12,0],'stone',connector);
      s.kit.box('book-tower-connector-closed-covered-link',[.89,1.83,.72],[0,1.15,0],'plaster',connector);
      s.kit.box('book-tower-connector-under-eave-timber-cap',[1.00,.14,.88],[0,2.135,0],'darkWood',connector);
      // This is an attached display turret, not a newly promised walkable room.
      obstacle(s,'magic-book-tower-ground-solid',[3.04,0,-2.66],[4.84,4.13,-1.54]);
    }
    if(s.id==='talks'){
      const g=landmark(s,'lantern-theatre-full-pointed-entry-gallery',[-.95,0,2.72]);
      for(const side of[-1,1]){
        s.kit.brickWall('theatre-entry-buttress-grounded-'+side,[.36,.25,.53],[side*1.25,.125,0],'stone',g);
        s.kit.box('theatre-entry-buttress-connected-shaft-'+side,[.21,2.45,.20],[side*1.25,1.475,0],'darkWood',g);
        // The pointed portal stands in front of the original hipped eave;
        // real side beams join it to the wall without piercing that roof.
        s.kit.box('theatre-entry-gallery-real-wall-tie-'+side,[.12,.12,.92],[side*1.25,2.57,-.36],'darkWood',g);
        obstacle(s,'magic-theatre-door-side-buttress-'+side,[-.95+side*1.25-.20,0,2.44],[-.95+side*1.25+.20,2.8,3.00]);
      }
      const outer=[[-1.355,2.66],[-1.355,2.30],[-1.12,2.74],[0,3.68],[1.12,2.74],[1.355,2.30],[1.355,2.66],[0,3.93]],
        shape=new THREE.Shape(outer.map(p=>new THREE.Vector2(...p)));
      mesh('theatre-entry-complete-closed-pointed-arch',new THREE.ExtrudeGeometry(shape,{depth:.20,bevelEnabled:false}),s.kit.materials.wood,[0,0,-.10],g);
      for(const side of[-1,1])strut('theatre-entry-copper-vault-inlay-'+side,[side*1.17,2.74,.105],[0,3.74,.105],.026,mats.brass,g);
      // Three lanterns hang from that arch; their glow remains in the source,
      // while the one small practical below belongs to the detailed fixture.
      for(const [i,x]of[-.82,0,.82].entries()){
        const top=3.74-Math.abs(x)*.855,bottom=top-.25,paper=pulseMaterial('theatre-gallery-lantern-'+i,'#e2bc83');paper.emissiveIntensity=.50;s.emitterMaterials.push(paper);
        strut('theatre-entry-lantern-real-hemp-'+i,[x,top,.105],[x,bottom,.105],.012,mats.ink,g);
        rounded('theatre-entry-lantern-paper-'+i,[.20,.30,.20],[x,bottom-.15,.105],paper,g,.035);
        for(const yy of[bottom+.014,bottom-.312])s.kit.box('theatre-entry-lantern-attached-cap-'+i,[.26,.028,.24],[x,yy,.105],'brass',g);
      }
    }
    if(s.id==='education'){
      const g=landmark(s,'memory-observatory-school-constellation-orrery',[1.82,0,-3.20]);
      s.kit.brickWall('observatory-orrery-continuous-stone-foot',[2.32,.23,.75],[0,.115,0],'stone',g);
      for(const side of[-1,1])s.kit.box('observatory-orrery-joined-bearing-pier-'+side,[.20,2.21,.25],[side*.96,1.30,0],'wood',g);
      const body=group('observatory-orrery-true-three-dimensional-ring-assembly',[0,2.40,0],g);
      for(const [i,rot]of[[0,[.20,0,0]],[1,[0,.78,.15]],[2,[.50,-.70,-.10]]])ring('observatory-orrery-connected-copper-orbit-'+i,1.05,.045,[0,0,0],mats.brass,body,rot);
      strut('observatory-orrery-connected-horizontal-bearing',[-1.08,0,0],[1.08,0,0],.035,mats.brass,body);
      star('observatory-three-schools-central-star',.36,[0,0,-.02],body);
      for(let i=0;i<3;i++){const a=i*Math.PI*2/3,p=[Math.cos(a)*.72,Math.sin(a)*.72,.03];star('observatory-school-fixed-star-'+i,.11,p,body);strut('observatory-school-memory-link-'+i,[0,0,.03],p,.015,mats.jade,body);}
      obstacle(s,'magic-memory-orrery-ground-bearing',[.58,0,-3.68],[3.06,2.45,-2.72]);
    }
    if(s.id==='writing'){
      const g=landmark(s,'ink-studio-ridge-supported-paper-crane',[.85,3.875,-1.825]);
      s.kit.box('ink-studio-crane-ridge-bearing-block',[.45,.13,.41],[0,.028,0],'darkWood',g);
      strut('ink-studio-crane-real-copper-display-rod',[0,.07,0],[0,.36,0],.032,mats.brass,g);
      const bird=group('ink-studio-large-solid-folded-crane',[0,.32,0],g);
      prism('ink-roof-crane-closed-body',[[-.25,-.10],[.24,-.10],[.10,.20],[-.13,.14]],.15,mats.paper,[0,0,-.075],bird);
      for(const side of[-1,1]){
        const wing=prism('ink-roof-crane-closed-folded-wing-'+side,[[0,0],[side*.91,.60],[side*.40,-.05]],.065,mats.paper,[0,.035,-.03],bird);wing.rotation.y=side*.18;
        strut('ink-roof-crane-real-fold-line-'+side,[0,.04,.045],[side*.70,.505,.045],.015,mats.brass,bird);
      }
      prism('ink-roof-crane-connected-folded-neck',[[.09,.15],[.26,.57],[.39,.57],[.24,.18]],.10,mats.paper,[0,0,-.045],bird);
      prism('ink-roof-crane-closed-folded-beak',[[.26,.57],[.74,.44],[.39,.52]],.10,mats.brass,[0,0,-.045],bird);
    }
    if(s.id==='life'){
      const g=landmark(s,'cat-home-roof-ridge-cat-ear-identity',[0,3.85,-2.05]);
      for(const side of[-1,1]){
        const outer=prism('cat-home-roof-closed-cat-ear-'+side,[[side*.31,-.045],[side*.83,.81],[side*1.13,-.045]],.27,mats.jade,[0,0,-.135],g);
        prism('cat-home-roof-paper-inner-ear-'+side,[[side*.48,.06],[side*.82,.60],[side*1.01,.06]],.025,mats.paper,[0,0,.134],g);
        s.kit.box('cat-home-roof-ear-connected-ridge-foot-'+side,[.55,.15,.36],[side*.78,-.025,0],'brass',g);outer.userData.roomSolid=true;
      }
    }
    if(s.id==='home'){
      const g=landmark(s,'letter-courtyard-roof-supported-invitation',[ -.91,3.80,-1.75]);
      for(const x of[-.43,.43])strut('letter-courtyard-letter-ridge-bearing-'+x,[x,0,0],[x,.48,0],.036,mats.brass,g);
      envelope('letter-courtyard-big-supported-envelope',[1.33,.75,.12],[0,.54,0],g);
    }
  }

  function batchCustom(s){
    // Batch inside each articulated group without flattening its hinge. Direct
    // mesh pick targets and separately animated parts keep their own identity.
    const selected=new Set(s.items.flatMap(i=>i.objects));
    // Entire overview landmarks are static, so flatten their internal windows,
    // rods and brick courses into one lit batch per material before hinges.
    s.attachment.updateWorldMatrix(true,true);
    const landmarkBatches=new Map(),inverse=s.root.matrixWorld.clone().invert();
    for(const g of s.root.children.filter(o=>o.userData.magicLandmark)){
      g.traverse(o=>{
        if(!o.isMesh||o.material.transparent)return;
        const geom=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(inverse.clone().multiply(o.matrixWorld));
        if(!landmarkBatches.has(o.material))landmarkBatches.set(o.material,[]);landmarkBatches.get(o.material).push({m:o,g:geom});
      });
      g.removeFromParent();
    }
    for(const[mat,list]of landmarkBatches){
      const geometry=mergeGeometries(list.map(v=>v.g),false);if(!geometry)throw new Error('Landmark geometry attributes disagree');
      for(const v of list){v.m.removeFromParent();v.g.dispose();v.m.geometry.dispose();resources.delete(v.m.geometry);s.kit.resources.delete(v.m.geometry);}
      mesh(s.id+'-overview-landmark-solid-batch-'+mat.name,geometry,mat,[0,0,0],s.root);
    }
    function combine(parent){
      parent.children.filter(o=>o.isGroup).forEach(combine);
      const batches=new Map();
      for(const m of parent.children.slice()){
        if(!m.isMesh||m.isInstancedMesh||selected.has(m)||m.userData.keepMesh||m.material.transparent||m.visible===false)continue;
        if(!resources.has(m.geometry)&&!s.kit.resources.has(m.geometry))continue;
        m.updateMatrix();const g=(m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone()).applyMatrix4(m.matrix);
        if(!batches.has(m.material))batches.set(m.material,[]);batches.get(m.material).push({m,g});
      }
      for(const[mat,list]of batches){
        if(list.length<2){list.forEach(v=>v.g.dispose());continue;}
        const g=mergeGeometries(list.map(v=>v.g),false);if(!g)throw new Error('Magic geometry attributes disagree');
        const combined=mesh(parent.name+'-closed-batch-'+mat.name,g,mat,[0,0,0],parent),ids=new Set(list.map(v=>v.m.userData.interaction).filter(Boolean));
        if(ids.size===1)combined.userData.interaction=ids.values().next().value;
        for(const v of list){v.m.removeFromParent();v.g.dispose();v.m.geometry.dispose();resources.delete(v.m.geometry);s.kit.resources.delete(v.m.geometry);}
      }
    }
    combine(s.root);
  }
  function setTheme(value){
    dark=!!value;for(const s of states.values()){s.kit.setTheme(dark);s.emitterMaterials.forEach(m=>m.emissiveIntensity=dark?.65:.035);}
  }
  function update(time,dt=1/60){
    if(disposed)return;const step=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
    const t=Number.isFinite(time)?time:0;
    for(const s of states.values()){
      if(!s.station.root.visible)continue;
      s.feedback=Math.max(0,s.feedback-step);s.animate?.(t,step);
    }
  }
  function dispose(){
    if(disposed)return;disposed=true;attachments.forEach(g=>g.removeFromParent());kits.forEach(k=>k.dispose());
    resources.forEach(r=>r.dispose?.());resources.clear();interactables.length=0;colliders.length=0;states.clear();root.clear();callback=null;
  }
  setTheme(true);update(0,0);
  return{root,interactables,colliders,attachments,setTheme,update,
    discover:(id,options)=>finish(id,options),dispose,metadata,
    setOnDiscover(fn){callback=typeof fn==='function'?fn:null;}};
}
