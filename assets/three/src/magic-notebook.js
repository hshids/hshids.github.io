const STORAGE='hj-crystal-notes-v1';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Notes are optional, local and keyed by authored identity. Repeated clicks
// replay the object's feedback without duplicating its written discovery.
export function createMagicNotebook({metadata,onRead,onGo,onOverlay}={}) {
  const chapters=metadata.chapters||metadata,entries=Array.isArray(chapters)?chapters:Object.values(chapters);
  const known=new Map(entries.map(v=>[v.discoveryId||v.id,v]));let found=new Set(),opened=false,lastFocus=null,timer=0;
  try{const saved=JSON.parse(localStorage.getItem(STORAGE)||'[]');if(Array.isArray(saved))found=new Set(saved.filter(id=>known.has(id)));}catch{}
  const tools=document.createElement('div');tools.className='magic-toolbox';tools.innerHTML='<button type="button" class="magic-letter-button" id="letter-btn">✉ <span>The invitation</span></button><button type="button" class="magic-notebook-button" id="notebook-btn" aria-controls="magic-notes" aria-expanded="false">✧ <span>Field notes</span><small id="notes-count"></small></button>';
  document.querySelector('#world').append(tools);
  const book=document.createElement('section');book.id='magic-notes';book.className='magic-notebook';book.hidden=true;book.setAttribute('role','dialog');book.setAttribute('aria-label','Your field notes');book.innerHTML='<header class="magic-notebook-header"><div><p>A FEW THINGS FOUND ALONG THE WAY</p><h2>Field notes</h2></div><button type="button" class="magic-notebook-close" aria-label="Close field notes">×</button></header><div class="magic-notebook-pages magic-notebook-body"></div><footer class="magic-notebook-footer"><button type="button" class="magic-notebook-reset">Clear these notes</button></footer>';document.querySelector('#world').append(book);
  const toast=document.createElement('div');toast.className='magic-toast';toast.hidden=true;toast.setAttribute('role','status');document.querySelector('#world').append(toast);
  function draw(){document.querySelector('#notes-count').textContent=found.size?String(found.size):'';
    book.querySelector('.magic-notebook-pages').innerHTML=found.size?[...found].map(id=>{const e=known.get(id);return `<article class="magic-notebook-entry"><h3>${esc(e.title)}</h3><p>${esc(e.note)}</p><button type="button" data-note-go="${esc(e.station)}">Return to this place →</button><button type="button" data-note-read="${esc(e.station)}">Read more</button></article>`;}).join(''):'<p class="magic-notebook-empty">A little room for things you notice. Open a book, turn a lens, or linger with a curious cat. There is no required order.</p>';}
  function close(){if(!opened)return;opened=false;book.hidden=true;document.querySelector('#notebook-btn').setAttribute('aria-expanded','false');onOverlay?.(null);lastFocus?.focus();}
  function open(){opened=true;lastFocus=document.activeElement;draw();book.hidden=false;document.querySelector('#notebook-btn').setAttribute('aria-expanded','true');onOverlay?.('notebook');book.querySelector('button').focus();}
  book.addEventListener('click',e=>{const go=e.target.closest('[data-note-go]'),read=e.target.closest('[data-note-read]');if(go){close();onGo?.(go.dataset.noteGo);}if(read){close();onRead?.(read.dataset.noteRead);}});
  const key=e=>{if(!opened)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}if(e.key==='Tab'){const items=[...book.querySelectorAll('button')],first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};document.addEventListener('keydown',key,true);
  book.querySelector('.magic-notebook-close').onclick=close;document.querySelector('#notebook-btn').onclick=()=>opened?close():open();
  book.querySelector('.magic-notebook-reset').onclick=()=>{found.clear();try{localStorage.removeItem(STORAGE);}catch{}draw();};draw();
  return {tools,book,open,close,get ids(){return [...found];},has:id=>found.has(id),
    discover(value){const id=value.id||value.discoveryId,e=known.get(id);if(!e)return false;const fresh=!found.has(id);found.add(id);try{localStorage.setItem(STORAGE,JSON.stringify([...found]));}catch{}draw();if(fresh){clearTimeout(timer);toast.textContent=value.note||e.note;toast.hidden=false;timer=setTimeout(()=>toast.hidden=true,7500);}return fresh;},
    destroy(){clearTimeout(timer);document.removeEventListener('keydown',key,true);tools.remove();book.remove();toast.remove();}
  };
}
