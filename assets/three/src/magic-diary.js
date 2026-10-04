import * as THREE from 'three';

const GREETING='Hello, friend. Welcome.';
const MAX_TURNS=12,MAX_INPUT=220;
const DIARY_ENTRY=Object.freeze({id:'ink-diary-conversation',discoveryId:'ink-diary-conversation',station:'writing',title:'A page that writes back',note:'The paper wrote back. A thought, a question, and a little room for another.'});
let nextId=1;

// Authored invitations to a conversation, kept separate from Mini Hanjing's
// existing scripts. These do not invent personal trips or research findings.
const TOPICS=[
  ['grandfather',/\b(grandfather|grandpa|maternal|family history|ancestor)\b/i,[
    'I never met my maternal grandfather. He came to San Francisco nearly a century ago. Sharing a city across that much time gives me something to think about.',
    'I do not know every part of his story. I like leaving room for what I cannot know, too. Is there a place that connects you to someone you never met?']],
  ['un-path',/\b(un|united nations|academia|academic career|career choice)\b/i,[
    'Before my PhD, I had a chance to continue at the UN. I chose academia, hoping for wider knowledge and a wider world. Curiosity can make a tidy plan untidy.',
    'Choosing a different path did not make the earlier one meaningless. I wanted room to learn beyond what I already knew. What question could change your direction?']],
  ['wider',/\b(wider|deeper|interdisciplinary|lehigh|phd|interview)\b/i,[
    'At my Lehigh interview, I was asked: wider or deeper? I chose wider. My interdisciplinary path has kept wandering since. A small answer can travel quite far.',
    'I still like the space between fields, where a familiar question suddenly looks different. Is there something outside your usual world you want to understand?']],
  ['school-days',/\b(high school|boarding|upstate|albany|new york)\b/i,[
    'High school in upstate New York, near Albany, was my first boarding experience. I was happy there and made good friends. A new place can become home surprisingly quickly.',
    'When I think of that chapter, I think of friends as much as a place. Who made an unfamiliar corner of your world feel less unfamiliar?']],
  ['davis',/\b(davis|undergrad|undergraduate)\b/i,[
    'Before arriving at Davis, I thought it was by the sea. It was not. But its quiet university life and my friends became a good kind of surprise.',
    'Davis gave me friends, a quieter pace, and the beginning of life with DaHuang and XiaoHei. Sometimes the things you did not plan become the important parts.']],
  ['georgetown',/\b(georgetown|dmv|washington|\bdc\b)\b/i,[
    'Georgetown brought me city life in DC. My friends and I explored the DMV, tried different cuisines, and went to shows. Ordinary evenings made very good memories.',
    'Sharing everyday life and little travel discoveries from DC found a warm audience. I like that a small recommendation can become someone else\'s afternoon.']],
  ['dalian',/\b(dalian|seafood|sea|ocean|san francisco|\bsf\b|hometown)\b/i,[
    'Dalian is my seaside hometown. I love seafood, and San Francisco gives me a little of that familiar coastal feeling. Is there a taste that takes you home?',
    'An ocean can feel familiar even from another coast. I like the small things that connect places: a meal, a breeze, a view. What reminds you of home?']],
  ['cats',/\b(cat|cats|kitten|kitty|jinbingbing|bingbing|xiaohei|dahuang|guozi|tuanzi)\b/i,[
    'Six cats. Technically, I live in their house. JinBingBing is the youngest, so of course she runs the place. Do you have a tiny household supervisor?',
    'DaHuang and XiaoHei joined me during undergrad in 2017. Twins, our oldest brothers, and still acting like babies. Which cat caught your eye here?',
    'The cats were with me on both crossings of the US. A moving home, with rather opinionated passengers. Their company is part of those journeys, too.']],
  ['afterlife',/\b(afterlife|afterlives|grief|griefbot|resurrect|resurrection|deceased|memorial)\b/i,[
    'A familiar voice can mean a great deal. My research asks who can authorize, question, change, or end a digital afterlife. What part feels most important to you?',
    'I keep returning to permission over time: people, records, and systems can change. Who should get a say when a remembered voice keeps speaking?']],
  ['education-ai',/\b(education|teaching|learning|classroom|tutor|tutoring|edtech)\b/i,[
    'AI in education keeps bringing me back to the person doing the learning. A smooth answer is not the whole experience. What would make a tool help you think?',
    'I am curious about what an educational system makes easier to understand, and what it quietly takes over. Where would you want to stay in charge?']],
  ['persona',/\b(persona|personas|identity|ai|agent|agents|research)\b/i,[
    'I study how people stay meaningfully in charge when AI becomes a teammate, agent, or persona. When an AI sounds familiar, what would help you judge its advice?',
    'A recognizable identity can lend an answer weight. I want the judgment and permission behind that answer to stay visible. What would you want to check first?']],
  ['innovation',/\b(innovation|innovate|prototype|design|build|idea|ideas|invent)\b/i,[
    'I like building things as a way of asking questions. A small prototype can make a fuzzy idea easier to discuss. What would you like to try making?',
    'My favorite starting point is a small question, with room to change my mind. What is one tiny version of your idea that we could play with?']],
  ['sharing',/\b(social media|socialmedia|rednote|red note|xiaohongshu|sharing|share|posting)\b/i,[
    'I shared travel and everyday DC life, and people enjoyed those discoveries. I like that a small recommendation can become someone else\'s new experience or connection. What would you share?']],
  ['curiosity',/\b(curiosity|curious|about yourself|about you|what do you love|what do you like|your interests|your hobbies)\b/i,[
    'LEGO, a little magic, cats, food, travel—and questions that wander between fields. I love finding a new connection in an ordinary detail. What has caught your curiosity lately?']],
  ['lego',/\b(lego|brick|bricks|block|blocks|miniature)\b/i,[
    'A few little bricks, and suddenly there is a place to wander. I like that a world can be built, taken apart, and imagined again. What would you add to this one?',
    'The cats would probably vote for more windows and softer cushions. What kind of room would you build for yourself?']],
  ['magic',/\b(magic|magical|spell|wand|wizard|orb|crystal|diary|ink|hello|hi|hey|welcome)\b/i,[
    'You found the paper that writes back. Very useful magic; terrible at doing the dishes. Which corner of this little world are you curious about?',
    'I think little surprises work best when they give you a reason to look closer. Shall we talk about cats, food, travel, or a curious idea?']],
  ['korea',/\b(korea|korean|seoul)\b/i,[
    'I have visited Korea, and Seoul appears in my AIED 2026 photos. A conference and a city can lead to different discoveries. What tends to stay with you after a trip?',
    'I like leaving space around the planned parts of a trip, for a meal or a little wandering. What did you most enjoy in Korea, or what are you curious about?']],
  ['nordic',/\b(sweden|swedish|denmark|danish|stockholm|copenhagen|nordic)\b/i,[
    'I have visited Sweden and Denmark, too. I like the fresh questions a journey gives me. What stays with you longest: a place, a conversation, or something you ate?',
    'Korea, Sweden, Denmark: different places, and more room to look beyond my usual world. Is there a journey that changed what you noticed when you came home?']],
  ['china-us',/\b(china|chinese|united states|america|american|california|davis|dc|san francisco|culture)\b/i,[
    'Chinese traditions are close to my heart, and I have lived in the US since high school. That mix finds its way into this world. What places feel like home to you?',
    'I thought Davis was close to the ocean before I arrived. Geography had other plans. Have you ever arrived somewhere that surprised you?']],
  ['travel',/\b(travel|trip|trips|road|drive|driving|chicago|texas|state|states)\b/i,[
    'I drove across the US twice: SF to DC through Chicago in 2021, then back through Texas in 2025. Two routes, one loop. Are you a planner or a detour person?',
    'I have visited 46 of the 50 states. Still a few pages left in that notebook! What is a place you would love to see next?']],
  ['food',/\b(food|eat|meal|cook|cooking|restaurant|dish|ramen|dumpling|taco|hot pot|bbq)\b/i,[
    'I love trying dishes from different countries, and making a meal from scratch. Food is one of my favorite ways to learn about a culture. What would you order tonight?',
    'A good meal is a very convincing reason for a detour. Tell me one dish you think everyone should try.']],
];

export function createDiaryDialogue({reduced=false}={}){
  let page=0,turns=0,messages=[],typing=false,lastInput='',progress=0,elapsed=0,revision=0;
  const visits=new Map();
  function startPage(){page++;turns=0;lastInput='';visits.clear();messages=[{role:'diary',text:GREETING}];progress=reduced?Array.from(GREETING).length:0;typing=!reduced;elapsed=0;revision++;return snapshot();}
  function snapshot(){return{page,turns,typing,atLimit:turns>=MAX_TURNS,maxInput:MAX_INPUT,revision,messages:messages.map((m,i)=>{const partial=typing&&i===messages.length-1,chars=Array.from(m.text),done=partial?Math.floor(progress):chars.length,fraction=partial?progress-done:0;return{...m,completed:chars.slice(0,done).join(''),next:fraction>0?chars[done]||'':'',fraction,visible:chars.slice(0,done+(fraction>0?1:0)).join('')};})};}
  function submit(value){
    const text=String(value??'').slice(0,MAX_INPUT).replace(/\s+/g,' ').trim(),key=text.toLocaleLowerCase();
    if(typing)return{ok:false,reason:'typing'};if(turns>=MAX_TURNS)return{ok:false,reason:'limit'};if(!text)return{ok:false,reason:'empty'};if(key===lastInput)return{ok:false,reason:'repeat'};
    const topic=TOPICS.find(([,test])=>test.test(text));let reply;
    if(topic){const count=visits.get(topic[0])||0;reply=topic[2][count%topic[2].length];visits.set(topic[0],count+1);}
    else reply='That is a new thread for this little page. What interests you most about it? We could connect it to a place, a meal, a cat, or an idea you would like to explore.';
    messages.push({role:'you',text},{role:'diary',text:reply});turns++;lastInput=key;progress=reduced?Array.from(reply).length:0;typing=!reduced;elapsed=0;revision++;return{ok:true};
  }
  function update(dt){if(!typing)return false;elapsed+=Math.max(0,Math.min(1,Number(dt)||0));if(elapsed<1/24)return false;progress=Math.min(Array.from(messages.at(-1).text).length,progress+elapsed*(turns?38:27));elapsed=0;typing=progress<Array.from(messages.at(-1).text).length;revision++;return true;}
  function clear(){messages=[];turns=0;typing=false;lastInput='';progress=0;elapsed=0;visits.clear();revision++;}
  return{startPage,submit,update,snapshot,clear};
}

/** One readable sheet beside the still-visible desk, with the exact same ink
 * state on its physical 3D paper. The world supplies update(dt); no chat timers.
 */
export function createInkDiary({station,quality='high',reduced=false,onOverlay,onDiscover,onClose,mount=document.body}={}){
  const paper=station?.root?.userData?.inkDiaryPaper,info=station?.root?.userData?.paper;
  if(!paper?.isMesh||!info?.centre)throw new Error('Ink diary needs the existing Writing paper mesh.');
  const doc=mount.ownerDocument,win=doc.defaultView,uid='ink-diary-'+nextId++,dialogue=createDiaryDialogue({reduced}),element=doc.createElement('section');
  element.className='ink-diary';element.hidden=true;element.setAttribute('role','dialog');element.setAttribute('aria-modal','true');element.setAttribute('aria-labelledby',uid+'-title');
  element.innerHTML=`<article class="ink-diary-page"><header class="ink-diary-header"><div><p class="ink-diary-eyebrow">INK STUDIO · <span data-page>PAGE 1</span></p><h2 id="${uid}-title" tabindex="-1">A page that writes back</h2></div><button class="ink-diary-close" type="button" aria-label="Close the diary and return to the desk">×</button></header><div class="ink-diary-lines" role="log" aria-label="Your conversation on this page" aria-live="off"></div><p class="ink-diary-feedback" hidden></p><form class="ink-diary-compose"><label for="${uid}-reply">Leave a little reply</label><textarea id="${uid}-reply" rows="2" maxlength="${MAX_INPUT}" enterkeyhint="send" autocomplete="off" spellcheck="true" placeholder="A thought, a question, or a hello…"></textarea><div class="ink-diary-compose-row"><span class="ink-diary-count" aria-hidden="true">0 / ${MAX_INPUT}</span><button class="ink-diary-send" type="submit">Write back</button></div></form><footer class="ink-diary-footer"><button class="ink-diary-new-page" type="button">Begin a new page</button><p>A little scripted magic. No messages are saved.</p></footer><p class="ink-diary-status" role="status" aria-live="polite"></p></article>`;
  mount.append(element);
  const heading=element.querySelector('h2'),log=element.querySelector('.ink-diary-lines'),input=element.querySelector('textarea'),send=element.querySelector('.ink-diary-send'),status=element.querySelector('.ink-diary-status'),pageLabel=element.querySelector('[data-page]');
  const articleNodes=[],background=new Map(),canvas=doc.createElement('canvas');canvas.width=quality==='low'?768:1024;canvas.height=quality==='low'?120:160;
  const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=quality==='low'?2:4;
  const diaryMaterial=paper.material.clone();diaryMaterial.name='Ink Studio / current diary handwriting';diaryMaterial.map=texture;diaryMaterial.needsUpdate=true;
  let opened=false,disposed=false,lastFocus=null,originalMaterial=null,composing=false,discovered=false,lastState=null,errorReason=null,paperState={text:'',typing:false,lines:[]};
  const focus=node=>node?.focus?.({preventScroll:true});
  function render(){
    const s=dialogue.snapshot();lastState=s;pageLabel.textContent='PAGE '+s.page;if(!s.typing&&errorReason==='typing')feedback('');
    while(articleNodes.length>s.messages.length)articleNodes.pop().article.remove();
    s.messages.forEach((m,i)=>{
      let nodes=articleNodes[i];if(!nodes){const article=doc.createElement('article'),label=doc.createElement('p'),text=doc.createElement('p'),written=doc.createTextNode(''),wet=doc.createElement('span');article.className='ink-diary-entry';text.className='ink-diary-handwriting';label.className='ink-diary-speaker';text.append(written,wet);article.append(label,text);log.append(article);nodes={article,label,written,wet};articleNodes[i]=nodes;}
      nodes.article.classList.toggle('is-your-ink',m.role==='you');nodes.label.textContent=m.role==='you'?'You':'The diary';nodes.written.textContent=m.completed;nodes.wet.textContent=m.next;nodes.wet.style.opacity=String(m.fraction);
    });
    send.disabled=s.typing||s.atLimit;input.disabled=s.atLimit;input.placeholder=s.atLimit?'This page is full. Begin a new one whenever you like.':'A thought, a question, or a hello…';element.setAttribute('aria-busy',String(s.typing));
    const last=s.messages.at(-1);paintPaper(last);if(!s.typing&&last){status.textContent=last.text+(s.atLimit?' This page is full. You can begin a new page.':'');if(s.turns>0&&!discovered){discovered=true;onDiscover?.({...DIARY_ENTRY,complete:true});}}
    log.scrollTop=log.scrollHeight;
  }
  function wrap(text,width){const chars=Array.from(text),lines=[];let start=0;while(start<chars.length){let end=start+1;while(end<=chars.length&&ctx.measureText(chars.slice(start,end).join('')).width<=width)end++;end=Math.max(start+1,end-1);if(end<chars.length){let space=end;while(space>start&&chars[space]!==' ')space--;if(space>start)end=space;}lines.push({start,text:chars.slice(start,end).join('')});start=end;while(chars[start]===' ')start++;}return lines;}
  function paintPaper(message){
    if(!message)return;const w=canvas.width,h=canvas.height,pad=w*.065;ctx.fillStyle='#f3e8cd';ctx.fillRect(0,0,w,h);ctx.fillStyle='#392f28';ctx.textBaseline='alphabetic';
    let font=message.text===GREETING?h*.29:h*.19,lines=[];
    do{ctx.font=`600 ${font}px "Magic Hand", cursive`;lines=wrap(message.text,w-pad*2);if(lines.length<=3)break;font-=1;}while(font>h*.115);
    const full=Array.from(message.completed).length,lineHeight=font*1.11,top=(h-lines.length*lineHeight)/2+font*.84;
    lines.forEach((line,i)=>{const chars=Array.from(line.text),amount=Math.max(0,Math.min(chars.length,full-line.start)),written=chars.slice(0,amount).join(''),x=pad,y=top+i*lineHeight;ctx.globalAlpha=1;ctx.fillText(written,x,y);if(message.fraction>0&&full>=line.start&&full<line.start+chars.length){ctx.globalAlpha=message.fraction;ctx.fillText(chars[amount],x+ctx.measureText(written).width,y);}});ctx.globalAlpha=1;texture.needsUpdate=true;paperState={text:message.visible,target:message.text,typing:lastState.typing,lines:lines.map(l=>l.text),fontSize:font,width:w,height:h};
  }
  function isolate(){let current=element;while(current.parentElement&&current.parentElement!==doc.documentElement){for(const sibling of current.parentElement.children){if(sibling===current||background.has(sibling))continue;background.set(sibling,{inert:sibling.inert,aria:sibling.getAttribute('aria-hidden')});sibling.inert=true;sibling.setAttribute('aria-hidden','true');}current=current.parentElement;}}
  function viewport(){if(!opened)return;const vv=win.visualViewport,height=vv?.height||win.innerHeight,lift=Math.max(0,win.innerHeight-height-(vv?.offsetTop||0)),keyboard=lift>80||height<480;element.classList.toggle('has-keyboard',keyboard);element.style.setProperty('--diary-keyboard-lift',lift+'px');element.style.setProperty('--diary-view-height',height+'px');element.style.setProperty('--diary-sheet-height',Math.max(230,height*(keyboard?.76:.43))+'px');}
  function open({trigger}={}){if(disposed)return false;if(opened)return true;lastFocus=trigger?.focus?trigger:doc.activeElement;opened=true;onOverlay?.('diary');element.hidden=false;originalMaterial=paper.material;paper.material=diaryMaterial;isolate();doc.documentElement.classList.add('ink-diary-open');doc.addEventListener('keydown',key,true);doc.addEventListener('focusin',contain,true);win.visualViewport?.addEventListener('resize',viewport);win.visualViewport?.addEventListener('scroll',viewport);win.addEventListener('resize',viewport);if(!dialogue.snapshot().messages.length)dialogue.startPage();render();viewport();focus(heading);return true;}
  function close(reason='close'){if(!opened)return;opened=false;composing=false;feedback('');element.hidden=true;if(paper.material===diaryMaterial)paper.material=originalMaterial;doc.documentElement.classList.remove('ink-diary-open');doc.removeEventListener('keydown',key,true);doc.removeEventListener('focusin',contain,true);win.visualViewport?.removeEventListener('resize',viewport);win.visualViewport?.removeEventListener('scroll',viewport);win.removeEventListener('resize',viewport);for(const[node,prior]of background){node.inert=!!prior.inert;if(prior.aria===null)node.removeAttribute('aria-hidden');else node.setAttribute('aria-hidden',prior.aria);}background.clear();onOverlay?.(null);focus(lastFocus?.isConnected&&!lastFocus.closest('[inert],[hidden]')?lastFocus:doc.getElementById('world-canvas'));onClose?.({reason,page:lastState?.page});}
  function feedback(text,reason=null){errorReason=reason;const node=element.querySelector('.ink-diary-feedback');node.textContent=text;node.hidden=!text;if(text)status.textContent=text;}
  function submit(value=input.value){if(!opened||disposed)return false;const result=dialogue.submit(value);if(!result.ok){feedback({typing:'Let the ink finish this thought first.',repeat:'That thought is already on this page. Add a little something new?',empty:'A little thought is enough.',limit:'This page is full. Begin a new page when you like.'}[result.reason],result.reason);return false;}feedback('');input.value='';element.querySelector('.ink-diary-count').textContent='0 / '+MAX_INPUT;render();return true;}
  function newPage(){if(!opened||disposed)return false;dialogue.startPage();input.value='';composing=false;feedback('');element.querySelector('.ink-diary-count').textContent='0 / '+MAX_INPUT;status.textContent='A fresh page.';render();focus(heading);return true;}
  function controls(){return[...element.querySelectorAll('button:not([disabled]),textarea:not([disabled])')].filter(n=>!n.closest('[hidden]'));}
  function key(event){if(!opened)return;if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close('escape');}else if(event.key==='Tab'){const nodes=controls(),first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&(doc.activeElement===first||!nodes.includes(doc.activeElement))){event.preventDefault();focus(last);}else if(!event.shiftKey&&(doc.activeElement===last||!nodes.includes(doc.activeElement))){event.preventDefault();focus(first);}}}
  function contain(event){if(opened&&!element.contains(event.target))focus(heading);else if(opened)viewport();}
  send.addEventListener('pointerdown',event=>{if(event.isPrimary!==false&&doc.activeElement===input)event.preventDefault();});
  element.querySelector('form').addEventListener('submit',event=>{event.preventDefault();if(!composing)submit();});input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&!composing&&event.keyCode!==229){event.preventDefault();submit();}});input.addEventListener('compositionstart',()=>composing=true);input.addEventListener('compositionend',()=>composing=false);input.addEventListener('input',()=>{feedback('');element.querySelector('.ink-diary-count').textContent=input.value.length+' / '+MAX_INPUT;});element.querySelector('.ink-diary-close').addEventListener('click',()=>close());element.querySelector('.ink-diary-new-page').addEventListener('click',newPage);
  doc.fonts?.load('600 32px "Magic Hand"').then(()=>{if(!disposed&&opened)render();}).catch(()=>{});
  const point=station.worldPoint?station.worldPoint(info.centre):info.centre.slice(),interactables=[{id:'writing-magic-diary',type:'diary',station:'writing',chapter:'writing',title:'A page that writes back',point,object:paper,onInteract:()=>open()}];
  return{interactables,element,metadata:{entry:{...DIARY_ENTRY}},open,close,newPage,submit,get isOpen(){return opened;},update(dt){if(opened&&!disposed&&dialogue.update(dt))render();},getState:()=>dialogue.snapshot(),getPaperState:()=>({...paperState,lines:paperState.lines.slice()}),dispose(){if(disposed)return;close('dispose');disposed=true;dialogue.clear();texture.dispose();diaryMaterial.dispose();element.remove();articleNodes.length=0;lastState=null;paperState={text:'',typing:false,lines:[]};}};
}
