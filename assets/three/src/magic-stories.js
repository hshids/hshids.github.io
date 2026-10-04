import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createCraftMaterials} from './fidelity-surface-materials.js';
import './magic-stories.css';
import {buildTwoShores,buildRoadTrips} from './magic-keepsakes.js';

// These are optional, replayable illustrations. They never gate a publication,
// original chapter, link, or dialogue. The travel pages intentionally contain
// no invented dates, routes, restaurants, or research results.
const STORIES = Object.freeze([
  {id:'travel-constellation',station:'life',title:'A small travel constellation',
    clue:'Open the chest. Collect Korea, Sweden, and Denmark in any order.',
    note:'Korea, Sweden, and Denmark: three places in my travel constellation. Food, innovation, and new experiences keep me curious.',
    anchor:[3.48,.24,-1.35],room:'life-three-bay-home',indoor:true,focus:{life:'travel'},
    support:'Life home bearing floor; beside, not on top of, the original suitcase.',
    controls:[['korea','Korea'],['sweden','Sweden'],['denmark','Denmark']]},
  {id:'memory-choice-box',station:'research',title:'What makes a persona?',
    clue:'Explore Voice and Memory. Then make room for Choice.',
    note:'Voice, memory, choice. A little reflection on Persona AI and AI Afterlife, with agency and care still in the conversation.',
    anchor:[2.48,.116238,-3.10],room:'research-library',indoor:true,
    support:'Research library bearing floor; a small reading stand in front of the right bookcase.',
    controls:[['voice','Voice'],['memory','Memory'],['choice','Choice']]},
  {id:'brick-star-key',station:'writing',title:'A star, brick by brick',
    clue:'Match the numbered diagram: 1 Blue, 2 Green, 3 Rose.',
    note:'I like LEGO and a little magic. Three small bricks become a star key — a playful reminder that ideas can be built piece by piece.',
    anchor:[2.68,.12,-1.24],room:'writing-study',indoor:true,focus:{section:'writing-tutorials'},
    support:'Writing study bearing floor; a separate little workbench beside the desk, clear of the tutorial archive.',
    controls:[['blue','1 · Blue'],['green','2 · Green'],['rose','3 · Rose']]},
  {id:'curiosity-letter',station:'contact',title:'Ingredients for a conversation',
    clue:'Choose any two ingredients. Then seal the invitation.',
    note:'A little invitation made from food, inventive ideas, and something new. There is always room for a curious conversation.',
    anchor:[1.70,.006,.12],indoor:false,
    support:'Contact physical stone forecourt; between the mailbox and the link post.',
    controls:[['food','Food'],['ideas','Ideas'],['surprise','Something new'],['seal','Seal the letter']]},
  {id:'un-academic-fork',station:'life',title:'A fork before the PhD',mode:'souvenir',
    clue:'A tiny UN keepsake on the kitchen worktop. Turn the note over for the choice behind it.',
    note:'Before my PhD, I had an opportunity to keep working at the UN. After some real hesitation, I chose academia for a wider field of knowledge and a chance to contribute beyond the data work I knew.',
    anchor:[-2.03,1.11,-3.38],room:'life-three-bay-home',indoor:true,
    support:'The original Life kitchen worktop, whose real bearing top is y=1.11.',
    controls:[['opportunity','The opportunity'],['choice','The choice']],
    pages:{opportunity:'Before my PhD, I had an opportunity to continue working at the UN. It was a real choice to think through, not an easy next step.',
      choice:'I chose academia because I wanted a broader view of knowledge and a chance to contribute to a wider world. I wanted to grow beyond being a data worker.'}},
  {id:'two-familiar-seas',station:'home',title:'Two shores, one journey',mode:'souvenir',
    clue:'An open keepsake box on the bench. Two shores, a flight route across the sea, and a little ship below it.',
    note:'Dalian is my seaside hometown, and San Francisco, where I live now, feels a little like it. In 2013 I flew across the Pacific for high school, and my grandfather made the same crossing nearly a century before me.',
    anchor:[-2.66,.71,-2.78],room:'welcome-gatehall',indoor:true,
    support:'The original Welcome interior bench seat: floor .30 plus seat centre .36 and half-thickness .05.',
    controls:[['shores','The two shores'],['flight','2013 · A first flight'],['boarding','A first boarding school'],['thread','An older thread']],
    pages:{shores:'Dalian is my seaside hometown, and I love its seafood. San Francisco, where I live now, has hills that run down to the sea, and it feels a little like home.',
      flight:'In 2013 I took the flight that brought me to the US for high school. Since then I have flown back and forth between China and the US many times. This little plane stands for the bond I carry between my two homes.',
      boarding:'That flight led to my first time living at school, at a boarding school in upstate New York near Albany. I was far from home, surrounded by new friends, and it was a really happy time.',
      thread:'I never met my maternal grandfather. Nearly a century ago he came to San Francisco, long before I did. Watch the little ship cross the box. It is a small connection I still find moving.'}},
  {id:'wider-compass',station:'education',title:'The compass that says wider',mode:'souvenir',
    clue:'Turn a small compass through four personal chapters. It is a collection of feelings, not a second résumé.',
    note:'At my Lehigh interview, I was asked whether I wanted to go wider or deeper. I chose wider, and interdisciplinary work has kept taking me further.',
    anchor:[-3.98,.006,.18],indoor:false,
    support:'The original Education physical stone forecourt, clear of the Davis miniature and its bicycle.',
    controls:[['newyork','Upstate New York'],['davis','Davis'],['dc','DC'],['wider','Wider']],
    pages:{newyork:'My first boarding-school chapter was in upstate New York, near Albany, and it was a happy one. I thought New York City would be close; it was actually about three and a half hours away.',
      davis:'I arrived expecting Davis to be by the sea. It was not — but the quiet campus life and friendships became their own kind of home.',
      dc:'Georgetown brought a city chapter, with travel and stories I enjoyed sharing. People liked those little glimpses of life.',
      wider:'At my Lehigh interview, I was asked whether I wanted to go wider or deeper. I chose wider, and interdisciplinary work has kept taking me further.'}},
  {id:'cats-across-america',station:'life',title:'Two crossings, with cats',mode:'souvenir',
    clue:'A little map on the kitchen worktop. Pick a year and watch the car drive across America, cats and all.',
    note:'The cats came along for two crossings, from San Francisco to DC in 2021 on the northern route through Chicago, and back in 2025 on the southern route through Texas.',
    anchor:[-2.92,1.11,-3.37],room:'life-three-bay-home',indoor:true,focus:{life:'travel'},
    support:'The original Life kitchen worktop, with clear space between this little route board and the UN keepsake.',
    controls:[['north','2021 · SF → DC'],['south','2025 · DC → SF']],
    pages:{north:'In 2021 we crossed from San Francisco to DC for my grad school, taking the northern route through Chicago. Four cats rode along, DaHuang, XiaoHei, XiaoHeiHei and TuanZi.',
      south:'In 2025 we drove back from DC to San Francisco on the southern route through Texas. By then the car was full, with all six cats as very patient travel companions.'}},
]);

const TRAVEL_PAGES = Object.freeze({
  korea:'Korea gets a page in my little travel constellation. I like making room for a new taste, an unexpected idea, or something I have not tried before.',
  sweden:'Sweden gets a page of its own. A different place can offer a fresh way to notice an ordinary thing.',
  denmark:'Denmark joins Korea and Sweden here. Travel, food, and a bit of curiosity: good ingredients for a fresh perspective.',
});
const REFLECTIONS = Object.freeze({
  voice:'A voice can sound familiar. Who decides what it should say?',
  memory:'A remembered detail is only a fragment. What is kept, and what is left out?',
  choice:'Persona AI and AI Afterlife raise questions about agency and care. A familiar voice is still something to think about, not a person to replace.',
});
const INGREDIENTS = Object.freeze({
  food:'A little curiosity about food goes into the invitation.',
  ideas:'Make room for an inventive idea.',
  surprise:'Leave a place for something new.',
});
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function createHiddenStories({stations=[],quality='high',reduced=false,onDiscover,onOverlay,onGo}={}) {
  quality=quality==='low'?'low':'high';
  const low=quality==='low',resources=new Set(),states=new Map(),attachments=[],interactables=[],colliders=[];
  const root=new THREE.Group();root.name='Hidden story registry; fixtures belong to their chapters';
  const mats=createCraftMaterials({name:'hidden-stories',quality,resources});
  const shade=(name,template,color,roughness=template.roughness)=>{
    const m=template.clone();m.name='hidden-story-'+name;m.color.set(color);m.roughness=roughness;resources.add(m);return m;
  };
  const colors={blue:shade('blue-LEGO-brick',mats.blue,'#719bab',.45),
    green:shade('green-LEGO-brick',mats.green,'#94b68b',.47),
    rose:shade('rose-LEGO-brick',mats.red,'#bd7c77',.49),
    ink:shade('quiet-ink',mats.darkWood,'#494944',.90),
    gold:shade('small-brass-inlay',mats.brass,'#d0b574',.43)};
  const metadata={version:1,entries:[],representation:'Optional personal-world illustrations, not research findings or reconstructions of a real person.',
    lighting:{additionalLights:0,additionalShadowMaps:0,wholeObjectEmission:false},
    resources:{labelAtlases:1,sharedCraftTextureTier:quality},
    controls:'Each fixture has real three-dimensional controls and an optional compact, keyboard-accessible folded note. Reset changes the puzzle, not the saved discovery.'};
  let disposed=false,sheet=null,opened=null,lastFocus=null;
  const backgroundInert=new Map();
  const focusFence=event=>{if(opened&&sheet&&!sheet.contains(event.target))sheet.querySelector('button')?.focus();};
  let callback=typeof onDiscover==='function'?onDiscover:null;
  const labels=[];
  const atlas=document.createElement('canvas');atlas.width=low?512:1024;atlas.height=low?256:512;
  const cellW=atlas.width/4,cellH=atlas.height/8,ctx=atlas.getContext('2d');
  ctx.fillStyle='#f3e8cd';ctx.fillRect(0,0,atlas.width,atlas.height);
  const atlasTexture=new THREE.CanvasTexture(atlas);atlasTexture.colorSpace=THREE.SRGBColorSpace;
  atlasTexture.anisotropy=low?2:4;resources.add(atlasTexture);
  const labelMat=new THREE.MeshStandardMaterial({name:'hidden-stories-shared-printed-paper-atlas',map:atlasTexture,roughness:.95});resources.add(labelMat);

  const own=g=>(resources.add(g),g);
  function group(name,pos,parent){const g=new THREE.Group();g.name=name;g.position.fromArray(pos);parent.add(g);return g;}
  function mesh(name,geometry,material,pos,parent){
    const m=new THREE.Mesh(own(geometry),material);m.name=name;m.position.fromArray(pos);
    m.castShadow=m.receiveShadow=true;m.userData.roomSolid=true;parent.add(m);return m;
  }
  function box(name,size,pos,material,parent,bevel=.008){
    const radius=Math.min(bevel,...size.map(v=>v*.21));
    return mesh(name,radius>0?new RoundedBoxGeometry(...size,low?1:2,radius):new THREE.BoxGeometry(...size),material,pos,parent);
  }
  function rod(name,a,b,r,material,parent){
    const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),v=q.clone().sub(p);
    const m=mesh(name,new THREE.CylinderGeometry(r,r,v.length(),low?6:8),material,p.add(q).multiplyScalar(.5).toArray(),parent);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return m;
  }
  function disc(name,r,height,pos,material,parent){return mesh(name,new THREE.CylinderGeometry(r,r,height,low?8:12),material,pos,parent);}
  function label(name,text,w,h,pos,parent){
    if(labels.length>=32)throw new Error('The shared story label atlas has 32 cells.');
    const n=labels.length,x=(n%4)*cellW,y=Math.floor(n/4)*cellH;
    let font=low?15:30;ctx.font=`600 ${font}px Georgia, serif`;
    while(ctx.measureText(text).width>cellW*.90&&font>8){font--;ctx.font=`600 ${font}px Georgia, serif`;}
    ctx.fillStyle='#514738';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x+cellW/2,y+cellH/2);
    const b=box(name+'-supported-paper-label',[w,h,.009],pos,mats.paper,parent,.002);
    const geometry=new THREE.PlaneGeometry(w*.96,h*.92),uv=geometry.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setXY(i,(x+uv.getX(i)*cellW)/atlas.width,1-(y+(1-uv.getY(i))*cellH)/atlas.height);
    const print=mesh(name+'-print-on-paper',geometry,labelMat,[pos[0],pos[1],pos[2]+.0052],parent);
    print.castShadow=false;labels.push({text,cell:n});return b;
  }
  function star(name,r,pos,parent,material=colors.gold){
    const shape=new THREE.Shape();for(let i=0;i<10;i++){
      const a=Math.PI/2+i*Math.PI/5,k=i%2?r*.43:r;
      if(i)shape.lineTo(Math.cos(a)*k,Math.sin(a)*k);else shape.moveTo(Math.cos(a)*k,Math.sin(a)*k);
    }shape.closePath();
    const g=new THREE.ExtrudeGeometry(shape,{depth:.015,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.0015,bevelThickness:.0015});
    return mesh(name,g,material,pos,parent);
  }
  function register(s,key,title,objects,handler){
    const list=Array.isArray(objects)?objects:[objects],id='story-'+s.id+'-'+key;
    list.forEach(o=>o.traverse(m=>{if(m.isMesh)m.userData.interaction=id;}));
    const item={id,type:'magic',station:s.station.id,chapter:s.station.id,title,discoveryId:s.id,
      object:list[0],objects:list,point:[0,0,0],story:s.id,focus:s.spec.focus,
      onInteract:()=>disposed?null:handler()};
    item.getWorldPoint=()=>new THREE.Box3().setFromObject(item.object).getCenter(new THREE.Vector3()).toArray();
    interactables.push(item);s.items.push(item);return item;
  }
  function feedback(s,note,extra={}){
    s.note=note;s.feedback=1.25;redrawSheet(s);
    return {id:s.id,discoveryId:s.id,station:s.station.id,title:s.spec.title,complete:false,note,...extra};
  }
  function finish(s,{notify=true}={}){
    if(disposed||!s)return null;
    const fresh=!s.discoveredEver;s.discoveredEver=true;s.solved=true;s.open=true;s.feedback=1.8;
    s.restore?.();s.note=s.spec.note;redrawSheet(s);
    const event={id:s.id,discoveryId:s.id,station:s.station.id,title:s.spec.title,note:s.spec.note,focus:s.spec.focus,complete:true,fresh};
    if(fresh&&notify)callback?.(event);return event;
  }
  function table(s,w,d,height){
    const parent=s.fixed;
    box(s.id+'-stone-bearing-foot',[w*.91,.035,d*.90],[0,.0175,0],mats.stone,parent);
    for(const x of[-w*.36,w*.36])for(const z of[-d*.31,d*.31])
      box(s.id+'-joined-table-leg-'+x+'-'+z,[.045,height-.077,.045],[x,.035+(height-.077)/2,z],mats.darkWood,parent);
    for(const z of[-d*.31,d*.31])box(s.id+'-table-bearing-apron-'+z,[w*.78,.055,.035],[0,height-.07,z],mats.wood,parent);
    box(s.id+'-real-bearing-tabletop',[w,.042,d],[0,height-.021,0],mats.wood,parent);
    return height;
  }
  function chest(s,{width=.62,depth=.40,height=.34,bottom=.035,parent=s.fixed}={}){
    const body=group(s.id+'-complete-chest-body',[0,bottom,0],parent),thick=.021;
    box(s.id+'-chest-complete-bottom',[width,.025,depth],[0,.0125,0],mats.wood,body);
    for(const side of[-1,1])box(s.id+'-chest-complete-side-'+side,[thick,height,depth],[side*(width-thick)/2,height/2,0],mats.wood,body);
    box(s.id+'-chest-complete-back',[width-thick*2,height,thick],[0,height/2,-(depth-thick)/2],mats.darkWood,body);
    box(s.id+'-chest-complete-front',[width-thick*2,height,thick],[0,height/2,(depth-thick)/2],mats.wood,body);
    const hinge=group(s.id+'-real-back-lid-hinge',[0,bottom+height,-depth/2],s.root);
    box(s.id+'-solid-opening-lid',[width+.012,.027,depth+.010],[0,.0135,depth/2],mats.darkWood,hinge);
    for(const x of[-width*.31,width*.31]){
      const pin=disc(s.id+'-lid-brass-hinge-pin-'+x,.013,.047,[x,bottom+height,-depth/2],mats.brass,s.fixed);pin.rotation.z=Math.PI/2;
      box(s.id+'-hinge-leaf-'+x,[.052,.032,.016],[x,height+bottom-.015,-depth/2+.010],mats.brass,s.fixed,.002);
    }
    s.lid=hinge;s.lidAngle=-1.28;
    return {body,hinge,insideY:bottom+.027,front:depth/2+.005,top:bottom+height};
  }
  function button(s,key,text,x,y,z,w=.17,parent=s.root){
    const g=group(s.id+'-'+key+'-supported-control',[x,y,z],parent);
    box(s.id+'-'+key+'-control-setting',[w+.018,.112,.040],[0,0,0],mats.darkWood,g,.006);
    box(s.id+'-'+key+'-brass-inset',[w,.094,.018],[0,0,.024],mats.brass,g,.004);
    label(s.id+'-'+key+'-label',text,w*.92,.073,[0,0,.038],g);
    const mark=box(s.id+'-'+key+'-selected-inlay',[w*.68,.006,.006],[0,-.032,.044],colors.gold,g,.001);
    s.marks.set(key,mark);return g;
  }
  function inkLines(s,parent,y,z,width=.29){
    for(let i=0;i<3;i++)box(s.id+'-paper-quiet-ink-line-'+i,[width-i*.035,.002,.003],[0,y,z+i*.034],colors.ink,parent,.0005);
  }
  function relativeBounds(object,ancestor){
    ancestor.updateWorldMatrix(true,true);const result=new THREE.Box3(),inverse=ancestor.matrixWorld.clone().invert();
    object.traverse(m=>{if(!m.isMesh)return;m.geometry.computeBoundingBox();
      result.union(m.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(m.matrixWorld)));});
    return result;
  }

  for(const spec of STORIES){
    const st=stations.find(v=>v.id===spec.station);if(!st?.root?.isObject3D)continue;
    const attachment=group('hidden-story-'+spec.id+'-chapter-owned',spec.anchor,st.root);
    const fixed=group(spec.id+'-static-supported-parts',[0,0,0],attachment);
    const s={id:spec.id,spec,station:st,root:attachment,fixed,items:[],marks:new Map(),progress:[],
      open:false,solved:false,discoveredEver:false,feedback:0,note:spec.clue};
    states.set(s.id,s);attachments.push(attachment);
    if(spec.id==='travel-constellation')buildTravel(s);
    if(spec.id==='memory-choice-box')buildMemory(s);
    if(spec.id==='brick-star-key')buildBricks(s);
    if(spec.id==='curiosity-letter')buildInvitation(s);
    if(spec.mode==='souvenir')buildSouvenir(s);
    batchFixed(s.fixed);attachment.updateWorldMatrix(true,true);
    for(const item of s.items){item.point=item.getWorldPoint();item.localPoint=st.root.worldToLocal(new THREE.Vector3(...item.point)).toArray();}
    const bounds=new THREE.Box3().setFromObject(attachment);
    metadata.entries.push({id:s.id,discoveryId:s.id,station:st.id,title:spec.title,note:spec.note,clue:spec.clue,
      indoor:spec.indoor,room:spec.room,focus:spec.focus,localAnchor:spec.anchor.slice(),
      worldAnchor:attachment.getWorldPosition(new THREE.Vector3()).toArray(),support:spec.support,
      controls:spec.controls.map(([id,label])=>({id,label})),reset:true,replay:true,
      extraWorldBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},
      open:()=>open(s.id),select:key=>select(s.id,key),getWorldAnchor:()=>attachment.getWorldPosition(new THREE.Vector3()).toArray()});
    const localBounds=relativeBounds(attachment,st.root);
    colliders.push({id:'hidden-story-'+s.id,station:st.id,room:spec.room,
      min:localBounds.min.toArray(),max:localBounds.max.toArray(),optionalFixture:true});
  }
  atlasTexture.needsUpdate=true;

  function buildTravel(s){
    const w=.62,d=.43;
    for(const x of[-.23,.23])for(const z of[-.14,.14])box(s.id+'-ground-bearing-foot-'+x+'-'+z,[.06,.035,.06],[x,.0175,z],mats.brass,s.fixed,.004);
    const c=chest(s,{width:w,depth:d,height:.34,bottom:.035});
    label(s.id+'-chest-title','TRAVEL',.40,.09,[0,.294,c.front+.014],s.fixed);
    const page=group(s.id+'-chest-seated-paper-pages',[0,0,0],s.fixed);
    box(s.id+'-true-inner-paper-block',[w-.076,.027,d-.074],[0,c.insideY+.0135,0],mats.paper,page,.003);
    inkLines(s,page,c.insideY+.028,-.095,.35);
    const sky=group(s.id+'-inlaid-three-place-constellation',[0,c.insideY+.027,0],s.root);
    const nodes=[[-.18,0,-.086],[.17,0,-.075],[0,0,.105]],keys=['korea','sweden','denmark'];
    s.pathNodes=nodes.map((p,i)=>{
      disc(s.id+'-'+keys[i]+'-star-bearing-setting',.027,.008,[p[0],.004,p[2]],mats.brass,sky);
      const n=star(s.id+'-'+keys[i]+'-collected-star',.023,[p[0],.009,p[2]],sky);n.rotation.x=-Math.PI/2;return n;
    });
    s.path=[];for(let i=0;i<3;i++){
      const a=nodes[i],b=nodes[(i+1)%3],m=rod(s.id+'-supported-star-route-'+i,[a[0],.0028,a[2]],[b[0],.0028,b[2]],.0028,colors.gold,sky);
      m.userData.a=keys[i];m.userData.b=keys[(i+1)%3];s.path.push(m);
    }
    keys.forEach((key,i)=>{
      const control=button(s,key,s.spec.controls[i][1],(i-1)*.205,.153,c.front+.023,.18);
      register(s,key,'Collect the '+s.spec.controls[i][1]+' travel stamp',control,()=>select(s.id,key));
    });
    register(s,'open','Open the travel chest',[c.body,c.hinge],()=>{open(s.id);return feedback(s,s.spec.clue);});
    s.restore=()=>{s.progress=keys.slice();};
    s.animate=()=>{
      keys.forEach((key,i)=>{s.pathNodes[i].visible=s.progress.includes(key);s.marks.get(key).visible=s.progress.includes(key);});
      s.path.forEach(m=>{m.visible=s.progress.includes(m.userData.a)&&s.progress.includes(m.userData.b);});
    };
    s.select=key=>{
      if(!keys.includes(key))return feedback(s,s.spec.clue);
      s.open=true;const already=s.progress.includes(key);if(!already)s.progress.push(key);
      s.page=key;s.note=TRAVEL_PAGES[key];
      if(s.progress.length===3&&!already){const event=finish(s);s.note=TRAVEL_PAGES[key]+' Your three-place constellation is complete.';redrawSheet(s);return event;}
      return feedback(s,TRAVEL_PAGES[key]+(already?' This stamp is already in your constellation.':` ${s.progress.length} of 3 stamps collected.`),{progress:s.progress.length});
    };
  }

  function buildMemory(s){
    const top=table(s,.62,.46,.36),bottom=top;
    const c=chest(s,{width:.52,depth:.34,height:.22,bottom});
    label(s.id+'-attached-title','PERSONA',.40,.08,[0,bottom+.165,c.front+.014],s.fixed);
    box(s.id+'-inside-blank-paper-stack',[.43,.027,.25],[0,c.insideY+.0135,0],mats.paper,s.fixed,.003);
    inkLines(s,s.fixed,c.insideY+.028,-.080,.28);
    const tokenHolder=group(s.id+'-tokens-supported-by-paper',[0,c.insideY+.033,0],s.root);
    s.tokens=['voice','memory','choice'].map((key,i)=>{
      const token=disc(s.id+'-'+key+'-collected-token',.047,.012,[(i-1)*.127,0,.022],i===2?mats.brass:mats.green,tokenHolder);
      return token;
    });
    for(const[key,text]of s.spec.controls){
      const i=s.spec.controls.findIndex(v=>v[0]===key),control=button(s,key,text,(i-1)*.165,top-.044,.242,.145);
      // The apron-mounted buttons have wood behind them; no free-standing cards.
      box(s.id+'-'+key+'-button-bearing-block',[.16,.14,.063],[(i-1)*.165,top-.044,.206],mats.wood,s.fixed,.003);
      register(s,key,'Reflect on '+text,control,()=>select(s.id,key));
    }
    register(s,'open','Open the persona reflection box',[c.body,c.hinge],()=>{open(s.id);return feedback(s,s.spec.clue);});
    s.restore=()=>{s.progress=['voice','memory','choice'];};
    s.animate=()=>{['voice','memory','choice'].forEach((key,i)=>{s.tokens[i].visible=s.progress.includes(key);s.marks.get(key).visible=s.progress.includes(key);});};
    s.select=key=>{
      if(!REFLECTIONS[key])return feedback(s,s.spec.clue);
      if(key==='choice'&&(!s.progress.includes('voice')||!s.progress.includes('memory')))
        return feedback(s,'Before opening the box, explore Voice and Memory. Choice belongs in the conversation too.');
      if(!s.progress.includes(key))s.progress.push(key);
      s.page=key;
      if(key==='choice'){const event=finish(s);s.note=REFLECTIONS.choice;redrawSheet(s);return event;}
      return feedback(s,REFLECTIONS[key]+' '+(s.progress.includes('voice')&&s.progress.includes('memory')?'Both fragments are here. What about Choice?':'Explore the other fragment next.'),{progress:s.progress.length});
    };
  }

  function buildBricks(s){
    const top=table(s,.72,.64,.56);s.tableTop=top;
    const board=group(s.id+'-diagram-bearing-backboard',[0,top+.092,-.20],s.fixed);
    box(s.id+'-real-diagram-board',[.70,.19,.037],[0,0,0],mats.darkWood,board);
    label(s.id+'-diagram-label','1 BLUE  2 GREEN  3 ROSE',.66,.076,[0,.012,.026],board);
    const order=['blue','green','rose'];s.bricks=[];s.docks=[];
    for(let i=0;i<3;i++){
      const x=(i-1)*.234;
      const dock=box(s.id+'-bearing-numbered-slot-'+i,[.19,.012,.145],[x,top+.006,-.012],mats.darkWood,s.fixed,.002);s.docks.push(dock);
      for(const dx of[-.048,0,.048])for(const dz of[-.025,.025])disc(s.id+'-physical-docking-stud-'+i+'-'+dx+'-'+dz,.016,.010,[x+dx,top+.016,dz-.012],mats.brass,s.fixed);
      const brick=group(s.id+'-'+order[i]+'-actual-six-stud-brick',[x,top+.027,.226],s.root);
      box(s.id+'-'+order[i]+'-closed-brick-body',[.168,.054,.125],[0,0,0],colors[order[i]],brick,.007);
      for(const dx of[-.049,0,.049])for(const dz of[-.027,.027])disc(s.id+'-'+order[i]+'-molded-real-stud-'+dx+'-'+dz,.018,.014,[dx,.034,dz],colors[order[i]],brick);
      label(s.id+'-'+order[i]+'-brick-number',String(i+1),.048,.032,[0,0,.067],brick);
      brick.userData.startZ=.226;brick.userData.dockZ=-.012;s.bricks.push(brick);
      register(s,order[i],'Place brick '+(i+1)+' · '+order[i],brick,()=>select(s.id,order[i]));
    }
    const keyBase=group(s.id+'-hidden-key-supported-holder',[0,top+.030,-.28],s.root);
    box(s.id+'-key-support-closed-base',[.12,.06,.078],[0,0,0],mats.darkWood,keyBase,.006);
    rod(s.id+'-key-grounded-brass-stem',[0,.028,0],[0,.170,0],.012,mats.brass,keyBase);
    star(s.id+'-revealed-three-dimensional-star-key',.058,[0,.187,-.008],keyBase);s.key=keyBase;
    // A hinged, solid little shutter covers the real holder rather than letting
    // the key rise unsupported through the workbench.
    for(const side of[-1,1])box(s.id+'-key-case-bearing-side-'+side,[.014,.05,.115],[side*.067,top+.025,-.2675],mats.darkWood,s.fixed,.002);
    box(s.id+'-key-case-bearing-back',[.148,.05,.012],[0,top+.025,-.319],mats.darkWood,s.fixed,.002);
    const hinge=group(s.id+'-key-cover-real-hinge',[0,top+.055,-.325],s.root);
    box(s.id+'-key-cover-closed-lid',[.148,.030,.115],[0,.010,.0575],mats.wood,hinge,.004);
    s.keyCover=hinge;
    register(s,'open','Read the numbered brick diagram',board,()=>{open(s.id);return feedback(s,s.spec.clue);});
    s.restore=()=>{s.progress=order.slice();};
    s.animate=(t,dt)=>{
      for(let i=0;i<3;i++){
        const b=s.bricks[i],docked=s.progress.includes(order[i]),targetZ=docked?b.userData.dockZ:b.userData.startZ,
          targetY=top+(docked?.043:.027);
        b.position.z=reduced?targetZ:THREE.MathUtils.damp(b.position.z,targetZ,12,dt);
        b.position.y=reduced?targetY:THREE.MathUtils.damp(b.position.y,targetY,12,dt);
      }
      s.keyCover.rotation.x=reduced?(s.solved?-1.45:0):THREE.MathUtils.damp(s.keyCover.rotation.x,s.solved?-1.45:0,10,dt);
      s.key.visible=s.solved&&(reduced||s.keyCover.rotation.x<-.60);
    };
    s.select=key=>{
      if(!order.includes(key))return feedback(s,s.spec.clue);
      if(s.progress.includes(key))return feedback(s,'That brick is already in place. '+(s.solved?'The star key is yours. Reset to build it again.':'Next: '+s.spec.controls[s.progress.length][1]+'.'));
      const expected=order[s.progress.length];
      if(key!==expected)return feedback(s,'That brick does not match the next numbered slot. Try '+s.spec.controls[s.progress.length][1]+' next; your earlier bricks stay in place.',{wrong:true,progress:s.progress.length});
      s.progress.push(key);
      if(s.progress.length===3)return finish(s);
      return feedback(s,'Brick '+s.progress.length+' clicks into place. Next: '+s.spec.controls[s.progress.length][1]+'.',{progress:s.progress.length});
    };
  }

  function buildInvitation(s){
    const top=table(s,.64,.48,.65);
    const letter=group(s.id+'-closed-paper-invitation',[0,top+.022,-.045],s.fixed);
    box(s.id+'-real-folded-paper-body',[.46,.036,.255],[0,0,0],mats.paper,letter,.003);
    inkLines(s,letter,.019,-.077,.29);
    const flap=group(s.id+'-letter-bound-fold-hinge',[0,top+.042,-.17],s.root);
    box(s.id+'-folded-real-paper-flap',[.46,.010,.235],[0,0,.1175],mats.paper,flap,.002);s.flap=flap;
    const seal=disc(s.id+'-invitation-seated-wax-seal',.037,.014,[0,top+.056,-.012],mats.red,s.root);s.seal=seal;
    const title=label(s.id+'-attached-invitation-title','A NEW CONVERSATION',.54,.072,[0,top-.12,.255],s.fixed);
    box(s.id+'-title-backing-bearing-apron',[.58,.18,.026],[0,top-.10,.239],mats.darkWood,s.fixed);
    for(let i=0;i<3;i++){
      const [key,text]=s.spec.controls[i],control=button(s,key,i===2?'New':text,(i-1)*.175,top+.08,.174,.15);
      box(s.id+'-'+key+'-button-joined-pedestal',[.155,.055,.09],[(i-1)*.175,top+.0275,.155],mats.wood,s.fixed,.003);
      register(s,key,'Add '+text.toLowerCase()+' to the invitation',control,()=>select(s.id,key));
    }
    register(s,'seal','Seal your curiosity letter',seal,()=>select(s.id,'seal'));
    register(s,'open','Read the invitation',[letter,title],()=>{open(s.id);return feedback(s,s.spec.clue);});
    s.restore=()=>{if(s.progress.length<2)s.progress=['food','ideas'];};
    s.animate=(t,dt)=>{
      for(const key of ['food','ideas','surprise'])s.marks.get(key).visible=s.progress.includes(key);
      const target=s.solved?-1.20:0;flap.rotation.x=reduced?target:THREE.MathUtils.damp(flap.rotation.x,target,10,dt);
      // The wax seal stays on its folded paper instead of floating as it opens.
      seal.visible=!s.solved||flap.rotation.x>-.14;
    };
    s.select=key=>{
      if(key==='seal'){
        if(s.progress.length<2)return feedback(s,'Choose any two ingredients before sealing the letter. Food, Ideas, or Something new — there is no wrong combination.');
        return finish(s);
      }
      if(!INGREDIENTS[key])return feedback(s,s.spec.clue);
      if(s.solved)return feedback(s,'The invitation is ready. Reset to try a different combination.');
      const already=s.progress.includes(key);if(!already)s.progress.push(key);
      return feedback(s,INGREDIENTS[key]+(already?' This ingredient is already included.':s.progress.length>=2?' Two ingredients are enough. Seal the letter when you are ready.':' Choose one more ingredient.'),{progress:s.progress.length});
    };
  }

  function buildSouvenir(s){
    const body=group(s.id+'-supported-souvenir',[0,0,0],s.root);
    s.page=s.spec.controls[0][0];
    if(s.id==='un-academic-fork'){
      box(s.id+'-closed-keepsake-base',[.27,.028,.21],[0,.014,0],mats.wood,body,.005);
      rod(s.id+'-globe-bearing-stem',[0,.026,-.026],[0,.175,-.026],.010,mats.brass,body);
      mesh(s.id+'-complete-miniature-globe',new THREE.SphereGeometry(.071,low?12:16,low?8:12),mats.blue,[0,.175,-.026],body);
      for(const y of[-.034,0,.034]){
        const ring=mesh(s.id+'-raised-globe-latitude-'+y,new THREE.TorusGeometry(Math.sqrt(.071**2-y*y)+.001,.0018,4,low?12:16),mats.brass,[0,.175+y,-.026],body);
        ring.rotation.x=Math.PI/2;
      }
      label(s.id+'-worktop-seated-UN-name','UN',.095,.065,[0,.0605,.106],body);
      for(const[step,key]of s.spec.controls.entries()){
        const coin=disc(s.id+'-'+key[0]+'-real-turning-token',.032,.012,[(step-.5)*.14,.034,.048],step?mats.green:mats.brass,body);
        register(s,key[0],key[1],coin,()=>select(s.id,key[0]));
      }
    }else if(s.id==='two-familiar-seas'){
      const k=buildTwoShores(body,{resources,reduced,low});s.keepsake=k;
      for(const[key,title]of s.spec.controls)register(s,key,title,k.objects[key],()=>select(s.id,key));
    }else if(s.id==='wider-compass'){
      box(s.id+'-forecourt-seated-compass-base',[.38,.025,.29],[0,.0125,0],mats.wood,body,.006);
      disc(s.id+'-complete-compass-bowl',.100,.020,[0,.035,0],mats.brass,body);
      disc(s.id+'-compass-seated-dial',.087,.006,[0,.048,0],mats.paper,body);
      const needle=group(s.id+'-real-compass-centre-pin',[0,.055,0],body);
      box(s.id+'-closed-brass-compass-hand',[.011,.007,.139],[0,0,0],colors.gold,needle,.002);
      disc(s.id+'-bearing-compass-centre-rivet',.012,.009,[0,.004,0],mats.brass,needle);
      label(s.id+'-compass-bearing-caption','WIDER',.21,.047,[0,.045,.148],body);s.compass=needle;
      for(let i=0;i<4;i++){
        const key=s.spec.controls[i][0],a=i*Math.PI/2,
          token=disc(s.id+'-'+key+'-compass-chapter-token',.021,.013,[Math.sin(a)*.139,.0315,Math.cos(a)*.096],i%2?mats.green:mats.blue,body);
        register(s,key,s.spec.controls[i][1],token,()=>select(s.id,key));
      }
    }else if(s.id==='cats-across-america'){
      const k=buildRoadTrips(body,{resources,reduced,low});s.keepsake=k;
      for(const[key,title]of s.spec.controls)register(s,key,title,k.objects[key],()=>select(s.id,key));
    }
    register(s,'open','Unfold '+s.spec.title.toLowerCase(),body,()=>{open(s.id);return feedback(s,s.spec.clue);});
    s.select=key=>{
      const note=s.spec.pages[key];if(!note)return feedback(s,s.spec.clue);
      s.progress=[key];s.page=key;s.open=true;s.routeElapsed=0;
      if(!s.discoveredEver){const event=finish(s);s.note=note;redrawSheet(s);return {...event,note};}
      return feedback(s,note,{replay:true});
    };
    s.animate=(t,dt)=>{
      s.keepsake?.animate(t,dt,s.progress.length?s.page:null);
      if(s.compass){const index=s.spec.controls.findIndex(v=>v[0]===s.page),target=Math.max(0,index)*Math.PI/2;
        s.compass.rotation.y=reduced?target:THREE.MathUtils.damp(s.compass.rotation.y,target,8,dt);}
      if(s.routes){
        s.routeElapsed=Math.min(3.8,s.routeElapsed+dt);
        for(const[key,r]of Object.entries(s.routes)){
          const active=s.page===key&&s.progress.length>0;r.paw.visible=active;
          if(active){r.curve.getPointAt(reduced?1:Math.min(1,s.routeElapsed/3.8),s.routePoint);r.paw.position.copy(s.routePoint);}
        }
      }
    };
  }

  function batchFixed(parent){
    const buckets=new Map();parent.updateMatrixWorld(true);
    // Only direct, noninteractive fixed meshes are merged. Dynamic lids, brick
    // groups, button references, and their printed labels remain independent.
    for(const m of parent.children.slice()){
      if(!m.isMesh||m.userData.interaction||m.material.transparent)continue;
      m.updateMatrix();const geometry=(m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone()).applyMatrix4(m.matrix);
      const key=m.material.uuid+':'+m.castShadow+':'+m.receiveShadow;
      if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push({mesh:m,geometry});
    }
    for(const list of buckets.values()){
      if(list.length<2){list.forEach(v=>v.geometry.dispose());continue;}
      const geometry=mergeGeometries(list.map(v=>v.geometry),false);if(!geometry)throw new Error('Story support geometry attributes disagree.');
      const source=list[0].mesh,batch=mesh(parent.name+'-same-material-supported-batch',geometry,source.material,[0,0,0],parent);
      batch.castShadow=source.castShadow;batch.receiveShadow=source.receiveShadow;
      batch.userData.parts=list.map(v=>v.mesh.name);
      for(const v of list){v.mesh.removeFromParent();v.geometry.dispose();resources.delete(v.mesh.geometry);v.mesh.geometry.dispose();}
    }
  }
  function resolve(id){return states.get(id)||[...states.values()].find(s=>s.station.id===id);}
  function select(id,key){
    const s=resolve(id);if(!s||disposed)return null;
    const result=key==='reset'?reset(s.id):s.select(key);s.animate?.(0,0);return result;
  }
  function reset(id){
    const s=resolve(id);if(!s||disposed)return null;
    s.progress=[];s.page=null;s.solved=false;s.open=false;s.animate?.(0,0);
    // discoveredEver deliberately survives reset; replays never duplicate notes.
    return feedback(s,'Ready to try again. '+s.spec.clue,{reset:true,progress:0});
  }
  function discover(id,options={}){return finish(resolve(id),options);}
  function getState(id){
    const s=resolve(id);return s?{id:s.id,station:s.station.id,progress:s.progress.slice(),solved:s.solved,
      discoveredEver:s.discoveredEver,open:s.open,page:s.page||null,note:s.note}:null;
  }

  function ensureSheet(){
    if(sheet||typeof document==='undefined'||!document.body?.append)return;
    sheet=document.createElement('section');sheet.className='hidden-story-sheet';sheet.hidden=true;
    sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label','A folded exploration note');
    document.body.append(sheet);document.addEventListener('focusin',focusFence,true);
    sheet.addEventListener('click',event=>{
      event.stopPropagation();const b=event.target.closest('button');if(!b||!opened)return;
      if(b.dataset.storyClose!==undefined){close();return;}
      if(b.dataset.storyView!==undefined){const s=opened;close();onGo?.(s.station.id,s.id,{viewOnly:true});return;}
      if(b.dataset.storyChoice){select(opened.id,b.dataset.storyChoice);}
    });
    sheet.addEventListener('keydown',event=>{
      event.stopPropagation();
      if(event.key==='Escape'){event.preventDefault();close();return;}
      if(event.key==='Tab'){
        const controls=[...sheet.querySelectorAll('button:not([disabled])')],first=controls[0],last=controls.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }
    });
    for(const type of ['pointerdown','pointerup','wheel'])sheet.addEventListener(type,event=>event.stopPropagation());
  }
  function redrawSheet(s){
    if(!sheet||opened!==s)return;
    const active=document.activeElement?.dataset?.storyChoice;
    sheet.innerHTML=`<div class="hidden-story-fold"><span>FIELD NOTE</span><button type="button" class="hidden-story-close" data-story-close aria-label="Close the folded note">×</button></div>
      <h2>${escapeHTML(s.spec.title)}</h2><p class="hidden-story-clue">${escapeHTML(s.spec.clue)}</p>
      <div class="hidden-story-choices">${s.spec.controls.map(([key,text])=>`<button type="button" data-story-choice="${key}" aria-pressed="${s.progress.includes(key)}">${escapeHTML(text)}${s.progress.includes(key)?'<span aria-hidden="true"> ✓</span>':''}</button>`).join('')}</div>
      <p class="hidden-story-response" role="status" aria-live="polite">${escapeHTML(s.note)}</p>
      <div class="hidden-story-actions"><button type="button" data-story-choice="reset">Reset &amp; replay</button>${onGo?'<button type="button" data-story-view>View the object</button>':''}</div>`;
    if(active)sheet.querySelector(`[data-story-choice="${active}"]`)?.focus();
  }
  function open(id){
    const s=resolve(id);if(!s||disposed)return false;
    ensureSheet();if(!opened)lastFocus=typeof document==='undefined'?null:document.activeElement;
    opened=s;
    // The reflection box opens only after Voice + Memory + Choice. Merely
    // reading its clue does not bypass that causal action.
    if(s.id!=='memory-choice-box')s.open=true;
    if(sheet){
      redrawSheet(s);sheet.hidden=false;onOverlay?.('story');
      if(!backgroundInert.size)for(const sibling of document.body.children){if(sibling===sheet)continue;backgroundInert.set(sibling,!!sibling.inert);sibling.inert=true;}
      sheet.querySelector('[data-story-choice]')?.focus();
    }
    return true;
  }
  function close(){
    if(!opened)return;opened=null;if(sheet)sheet.hidden=true;
    for(const[element,inert]of backgroundInert)element.inert=inert;backgroundInert.clear();onOverlay?.(null);
    const available=lastFocus?.isConnected&&!lastFocus.inert&&!lastFocus.closest?.('[inert],[hidden]')
      &&(typeof lastFocus.getClientRects!=='function'||lastFocus.getClientRects().length>0);
    if(available)lastFocus.focus?.();else(document.querySelector?.('#world-canvas')||document.querySelector?.('#world canvas'))?.focus();lastFocus=null;
  }
  function update(time,dt=1/60){
    if(disposed)return;const step=Number.isFinite(dt)?THREE.MathUtils.clamp(dt,0,.1):0,t=Number.isFinite(time)?time:0;
    for(const s of states.values()){
      if(!s.station.root.visible)continue;s.feedback=Math.max(0,s.feedback-step);
      if(s.lid){const target=s.open?s.lidAngle:0;s.lid.rotation.x=reduced?target:THREE.MathUtils.damp(s.lid.rotation.x,target,10,step);}
      s.animate?.(t,step);
    }
  }
  function dispose(){
    if(disposed)return;close();disposed=true;if(sheet)document.removeEventListener('focusin',focusFence,true);sheet?.remove();sheet=null;
    attachments.forEach(g=>g.removeFromParent());resources.forEach(r=>r.dispose?.());resources.clear();
    interactables.length=0;colliders.length=0;states.clear();root.clear();callback=null;
  }
  update(0,0);
  return {root,attachments,interactables,colliders,metadata,update,dispose,open,close,select,reset,discover,getState,
    get isOpen(){return !!opened;},setOnDiscover(fn){callback=typeof fn==='function'?fn:null;}};
}
