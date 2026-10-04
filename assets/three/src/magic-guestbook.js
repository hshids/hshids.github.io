import * as THREE from 'three';

const MAX_INPUT=1500;
let nextId=1;
const literalInk=(value,limit)=>String(value??'').slice(0,limit).replace(/[\uD800-\uDBFF](?:[\uDC00-\uDFFF])?|[\uDC00-\uDFFF]/g,pair=>pair.length===2?pair:'\uFFFD');

/** Only real titles already present in the site's content become topic choices. */
export function getTalkNoteTopics(data={}){
  const topics=[
    {id:'talk',kind:'Talk',title:'A talk',general:true},
    {id:'poster',kind:'Poster',title:'A poster',general:true},
    {id:'question',kind:'Question',title:'A question',general:true}
  ];
  const publication=id=>data.publications?.find(p=>p.id===id);
  for(const [kind,entries]of [['Talk',data.videos||[]],['Poster',data.posters||[]]]){
    entries.forEach((entry,i)=>{
      const title=entry.title||publication(entry.paper)?.title;
      if(title)topics.push({id:kind.toLowerCase()+':'+(entry.paper||i),kind,title:String(title),paper:entry.paper,venue:entry.venue||''});
    });
  }
  return topics;
}

/** A client-side draft link. It never sends email or claims that mail was sent. */
export function createReflectionMailto({email,topic,text}={}){
  const address=literalInk(email,254).trim(),message=literalInk(text,MAX_INPUT).trim();
  if(!/^[^\s@<>?&#:]+@[^\s@<>?&#:]+\.[^\s@<>?&#:]+$/.test(address)||!message)return null;
  const title=literalInk(topic?.title||'A question',350).replace(/[\r\n]+/g,' ');
  const subject='Reflection on '+title;
  const body='Hello Hanjing,\n\n'+message+'\n\nAbout: '+(topic?.kind||'Question')+' — '+title+'\n\nFrom your Lantern Theatre.';
  const recipient=address.split('@').map(encodeURIComponent).join('@');
  return'mailto:'+recipient+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
}

/** A real sheet resting on the original sloped lectern, and a readable paper
 * composer beside the world. User drafts live only in this object's memory. */
export function createTalkNotes({station,quality='high',reduced=false,onOverlay,mount=document.body,data=globalThis.window?.HJ_DATA||{}}={}){
  if(!station?.root?.isObject3D)throw new Error('Talk notes need the existing Talks station.');
  const doc=mount.ownerDocument,win=doc.defaultView,uid='talk-note-'+nextId++,topics=getTalkNoteTopics(data);
  const email=data.person?.links?.email;
  const stage=station.source?.diagnostics?.stage;
  const podiumZ=-2.15,podiumX=.25;
  const stageY=stage?THREE.MathUtils.lerp(stage.frontY,stage.backY,THREE.MathUtils.clamp((stage.frontZ-podiumZ)/(stage.frontZ-stage.backZ),0,1)):station.source?.floorAt?.(podiumX,podiumZ);
  if(!Number.isFinite(stageY))throw new Error('Talk notes require the original stage surface.');

  const root=new THREE.Group();root.name='Lantern Theatre / reflection sheet on lectern';
  root.position.set(podiumX,stageY+.955,podiumZ);root.rotation.x=.12;station.root.add(root);
  const canvas=doc.createElement('canvas');canvas.width=quality==='low'?512:768;canvas.height=quality==='low'?384:576;
  const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=quality==='low'?2:4;
  const paperMaterial=new THREE.MeshStandardMaterial({name:'Theatre / written reflection paper',color:0xffffff,map:texture,roughness:.9,metalness:0});
  const edgeMaterial=new THREE.MeshStandardMaterial({name:'Theatre / cut paper edges',color:0xeedebd,roughness:.94});
  // BoxGeometry's +Y face is the only written face. There is no second coplanar
  // overlay: this is a closed 2 mm sheet with its own literal top-face texture.
  const paperGeometry=new THREE.BoxGeometry(.48,.002,.35),indices=Array.from(paperGeometry.index.array);
  paperGeometry.setIndex([...indices.slice(12,18),...indices.slice(0,12),...indices.slice(18)]);paperGeometry.clearGroups();paperGeometry.addGroup(0,6,0);paperGeometry.addGroup(6,30,1);
  const paper=new THREE.Mesh(paperGeometry,[paperMaterial,edgeMaterial]);
  paper.name='talks-reflection-paper';paper.position.y=.0325+.001;paper.receiveShadow=true;paper.userData.roomSolid=true;root.add(paper);
  const markerMaterial=new THREE.MeshStandardMaterial({name:'Theatre / gold paper corner',color:0xcda45c,emissive:0x9e6722,emissiveIntensity:.18,roughness:.48,metalness:.35});
  const marker=new THREE.Mesh(new THREE.BoxGeometry(.026,.0012,.018),markerMaterial);
  marker.name='talks-reflection-attached-gold-corner';marker.position.set(.218,.0351,.151);root.add(marker);

  const element=doc.createElement('section');element.className='talk-note';element.hidden=true;element.setAttribute('role','dialog');element.setAttribute('aria-modal','true');element.setAttribute('aria-labelledby',uid+'-title');
  element.innerHTML=`<article class="talk-note-sheet"><header class="talk-note-header"><div><p class="talk-note-eyebrow">LANTERN THEATRE · A PAPER THOUGHT</p><h2 id="${uid}-title" tabindex="-1">Leave a thought</h2></div><button type="button" class="talk-note-close" aria-label="Close the note and return to the theatre">×</button></header><p class="talk-note-intro">Something stayed with you? A question, a connection, or a little disagreement is welcome.</p><form class="talk-note-form"><label for="${uid}-topic">About</label><select id="${uid}-topic"></select><label for="${uid}-message">Your note to Hanjing</label><textarea id="${uid}-message" maxlength="${MAX_INPUT}" rows="5" autocomplete="off" spellcheck="true" placeholder="I was thinking about…"></textarea><div class="talk-note-meta"><span class="talk-note-count">0 / ${MAX_INPUT}</span><span>Draft kept only on this page</span></div><p class="talk-note-feedback" role="status" aria-live="polite" hidden></p><footer class="talk-note-footer"><a class="talk-note-email" aria-disabled="true">Email Hanjing</a><p>Opens your email app; you decide when to send.</p></footer></form></article>`;
  mount.append(element);
  const heading=element.querySelector('h2'),input=element.querySelector('textarea'),select=element.querySelector('select'),emailLink=element.querySelector('.talk-note-email'),feedback=element.querySelector('.talk-note-feedback'),background=new Map();
  let draft='',topic=topics[0],opened=false,disposed=false,composing=false,lastFocus=null,clock=0,launchCooldown=0,paperState={text:'',lines:[]};
  const focus=node=>node?.focus?.({preventScroll:true});
  for(const [label,entries]of [['A general thought',topics.filter(t=>t.general)],['Talks',topics.filter(t=>!t.general&&t.kind==='Talk')],['Posters',topics.filter(t=>!t.general&&t.kind==='Poster')]]){
    if(!entries.length)continue;const group=doc.createElement('optgroup');group.label=label;
    entries.forEach(t=>{const option=doc.createElement('option');option.value=t.id;option.textContent=t.title;group.append(option);});select.append(group);
  }
  function say(text){feedback.textContent=text;feedback.hidden=!text;}
  function sync(){
    input.value=draft;select.value=topic.id;element.querySelector('.talk-note-count').textContent=draft.length+' / '+MAX_INPUT;
    const href=createReflectionMailto({email,topic,text:draft});emailLink.setAttribute('aria-disabled',String(!href));if(href)emailLink.href=href;else emailLink.removeAttribute('href');
    paintPaper();
  }
  function wrapped(text,width,limit){
    const lines=[];let remaining=String(text).replace(/\s+/g,' ').trim();
    while(remaining&&lines.length<limit){let end=1;while(end<=remaining.length&&ctx.measureText(remaining.slice(0,end)).width<=width)end++;end=Math.max(1,end-1);if(end<remaining.length){const space=remaining.lastIndexOf(' ',end);if(space>0)end=space;}
      const line=remaining.slice(0,end);remaining=remaining.slice(end).trimStart();lines.push(line);}
    if(remaining&&lines.length){let line=lines.at(-1);while(line.length&&ctx.measureText(line+'…').width>width)line=line.slice(0,-1);lines[lines.length-1]=line+'…';}
    return lines;
  }
  function paintPaper(){
    const w=canvas.width,h=canvas.height,pad=w*.09;ctx.fillStyle='#f4e8cd';ctx.fillRect(0,0,w,h);ctx.fillStyle='#8a704b';ctx.font=`500 ${h*.039}px sans-serif`;ctx.textBaseline='alphabetic';ctx.fillText('LANTERN THEATRE',pad,h*.13);
    ctx.fillStyle='#493b2d';ctx.font=`600 ${h*.085}px "Magic Hand", cursive`;ctx.fillText('Leave a thought',pad,h*.25);
    ctx.font=`500 ${h*.032}px sans-serif`;const topicLines=wrapped(topic.title,w-pad*2,2);topicLines.forEach((line,i)=>ctx.fillText(line,pad,h*(.34+i*.045)));
    ctx.font=`600 ${h*.069}px "Magic Hand", cursive`;const text=draft||'A talk, a poster, a question. A little ink is enough.',lines=wrapped(text,w-pad*2,4);lines.forEach((line,i)=>ctx.fillText(line,pad,h*(.51+i*.10)));
    texture.needsUpdate=true;paperState={text:draft,preview:lines.join('\n'),lines,topic:topic.title,width:w,height:h};
  }
  function isolate(){let current=element;while(current.parentElement&&current.parentElement!==doc.documentElement){for(const sibling of current.parentElement.children){if(sibling===current||background.has(sibling))continue;background.set(sibling,{inert:sibling.inert,aria:sibling.getAttribute('aria-hidden')});sibling.inert=true;sibling.setAttribute('aria-hidden','true');}current=current.parentElement;}}
  function viewport(){
    if(!opened)return;const vv=win.visualViewport,height=vv?.height||win.innerHeight,lift=Math.max(0,win.innerHeight-height-(vv?.offsetTop||0));
    element.classList.toggle('has-keyboard',lift>80||height<480);element.style.setProperty('--talk-note-lift',lift+'px');element.style.setProperty('--talk-note-height',height+'px');
  }
  function open({trigger,topic:requested}={}){
    if(disposed)return false;if(opened)return true;lastFocus=trigger?.focus?trigger:doc.activeElement;opened=true;onOverlay?.('talkNote');
    const selected=requested==null?null:topics.find(t=>t.id===requested||t.paper===requested||t.title===requested||t.id===requested?.id||(requested?.paper&&t.paper===requested.paper));
    if(selected)topic=selected;composing=false;say('');element.hidden=false;isolate();doc.documentElement.classList.add('talk-note-open');
    doc.addEventListener('keydown',key,true);doc.addEventListener('focusin',contain,true);win.visualViewport?.addEventListener('resize',viewport);win.visualViewport?.addEventListener('scroll',viewport);win.addEventListener('resize',viewport);sync();viewport();focus(heading);return true;
  }
  function close(reason='close'){
    if(!opened)return;opened=false;composing=false;launchCooldown=0;element.hidden=true;doc.documentElement.classList.remove('talk-note-open');
    doc.removeEventListener('keydown',key,true);doc.removeEventListener('focusin',contain,true);win.visualViewport?.removeEventListener('resize',viewport);win.visualViewport?.removeEventListener('scroll',viewport);win.removeEventListener('resize',viewport);
    for(const[node,prior]of background){node.inert=!!prior.inert;if(prior.aria===null)node.removeAttribute('aria-hidden');else node.setAttribute('aria-hidden',prior.aria);}background.clear();onOverlay?.(null);
    focus(lastFocus?.isConnected&&!lastFocus.closest('[inert],[hidden]')?lastFocus:doc.getElementById('world-canvas'));return reason;
  }
  function controls(){return[...element.querySelectorAll('button,select,textarea,a[href]')].filter(n=>!n.closest('[hidden]')&&!n.disabled);}
  function key(event){
    if(!opened)return;if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close('escape');}
    else if(event.key==='Tab'){const nodes=controls(),first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&(doc.activeElement===first||!nodes.includes(doc.activeElement))){event.preventDefault();focus(last);}else if(!event.shiftKey&&(doc.activeElement===last||!nodes.includes(doc.activeElement))){event.preventDefault();focus(first);}}
  }
  function contain(event){if(opened&&!element.contains(event.target))focus(heading);else if(opened)viewport();}
  function requestEmail(event){
    if(composing){event.preventDefault();say('Finish this line of ink first.');return false;}
    if(launchCooldown>0){event.preventDefault();return false;}
    const href=createReflectionMailto({email,topic,text:draft});
    if(!href){event.preventDefault();say(email?'Write a little thought before opening an email draft.':'The email address is unavailable. Your note is still here.');focus(input);return false;}
    emailLink.href=href;launchCooldown=1.5;say('Your email app can open a draft. You decide when to send.');return true;
  }
  input.addEventListener('input',()=>{draft=literalInk(input.value,MAX_INPUT);say('');sync();});input.addEventListener('compositionstart',()=>composing=true);input.addEventListener('compositionend',()=>composing=false);
  emailLink.addEventListener('pointerdown',event=>{if(event.isPrimary!==false&&doc.activeElement===input)event.preventDefault();});
  select.addEventListener('change',()=>{topic=topics.find(t=>t.id===select.value)||topics[0];say('');sync();});emailLink.addEventListener('click',requestEmail);
  element.querySelector('form').addEventListener('submit',event=>event.preventDefault());element.querySelector('.talk-note-close').addEventListener('click',()=>close());
  doc.fonts?.load('600 32px "Magic Hand"').then(()=>{if(!disposed)paintPaper();}).catch(()=>{});
  sync();root.updateMatrixWorld(true);const localPoint=paper.position.clone().applyEuler(root.rotation).add(root.position).toArray();
  const point=station.worldPoint?station.worldPoint(localPoint):station.root.localToWorld(new THREE.Vector3(...localPoint)).toArray();
  const interactables=[{id:'talks-reflection-paper',type:'talkNote',station:'talks',chapter:'talks',title:'Leave a thought',point,object:paper,onInteract:()=>open()}];
  return{
    root,element,paper,interactables,open,close,get isOpen(){return opened;},
    update(dt){if(disposed)return;const step=Math.max(0,Math.min(1,Number(dt)||0));clock+=step;launchCooldown=Math.max(0,launchCooldown-step);markerMaterial.emissiveIntensity=reduced?.18:.16+.07*Math.sin(clock*1.9);},
    getState:()=>({open:opened,text:draft,topic:{...topic},topics:topics.map(t=>({...t})),maxInput:MAX_INPUT,mailto:createReflectionMailto({email,topic,text:draft}),saved:false}),
    getPaperState:()=>({...paperState,lines:paperState.lines.slice()}),
    metadata:{surface:'Existing closed lectern, top .12 rad slope, 2 mm paper fully supported; no route or collision changes.',paperDimensions:[.48,.002,.35],draftStorage:'Session memory only; email delivery is decided in the visitor’s email app.'},
    dispose(){if(disposed)return;close('dispose');disposed=true;draft='';input.value='';paperState={text:'',lines:[]};root.removeFromParent();paper.geometry.dispose();marker.geometry.dispose();texture.dispose();paperMaterial.dispose();edgeMaterial.dispose();markerMaterial.dispose();element.remove();}
  };
}
