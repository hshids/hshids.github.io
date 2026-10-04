import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// A small detective case played across the world, for a host who loves
// Sherlock Holmes and murder mystery games. Three numbered evidence markers
// hide in three places; the casebook keeps the suspects (the six cats, from
// the site data), the clues found so far, and the accusation.
// The case is a playful invention; every clue rests on a fact in data.js
// (coat, hair length, "she runs the place").

const STORAGE = 'hj-crystal-case-v1';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

export const CASE = Object.freeze({
  id: 'toppled-teacup',
  number: 'No. 6',
  title: 'The Case of the Toppled Teacup',
  intro: 'Midnight in the cats’ house. A blue-and-white teacup lies in pieces beneath the top shelf. Six suspects, three clues, one culprit. Find the yellow evidence markers around the world, then name the cat.',
  clues: [
    {id: 'saucer', n: 1, station: 'life', title: 'A hair on the saucer', text: 'One soft hair caught on the broken saucer, pale at the root and tipped with color at the end. That is a shaded coat.', hint: 'In the cats’ house, beside XiaoHei’s cushion.', say: 'Evidence 1. A hair on the saucer, pale at the root and tipped with color. A shaded coat. It is in the casebook now.'},
    {id: 'inkstone', n: 2, station: 'writing', title: 'A long hair in the ink', text: 'Floating on the inkstone, a long, long hair. Far too long for a shorthair.', hint: 'In the ink studio, on the inkstone by the brushes.', say: 'Evidence 2. A long hair floating in the ink. Far too long for a shorthair. Noted.'},
    {id: 'note', n: 3, station: 'contact', title: 'A note in the mailbox', text: '“Whoever runs the place gets the top shelf.” Unsigned. But everyone in this house knows who runs the place.', hint: 'Under the owl, tucked into the mailbox.', say: 'Evidence 3. A note in the mailbox, “Whoever runs the place gets the top shelf.” Interesting.'}
  ],
  culprit: 'jinbingbing',
  alibis: {
    dahuang: 'DaHuang was asleep in a sunbeam, still acting like a baby. And an orange tabby coat is not a shaded one.',
    xiaohei: 'XiaoHei was halfway through a grooming session. A sleepy gentleman never leaves one of those early.',
    xiaoheihei: 'XiaoHeiHei is black right down to the root. The hair on the saucer is not hers.',
    tuanzi: 'TuanZi has the long fur, but a Ragdoll coat is pointed, not shaded. Close, detective.',
    guozi: 'GuoZi is silver shaded, a good thought. But she is a British Shorthair, and the hair in the ink was long.'
  },
  solved: 'Case closed. JinBingBing, the youngest, golden shaded and long haired, took the top shelf, because she runs the place. The teacup was simply in the way of the view.',
  coda: 'I love mysteries like this. Sherlock Holmes, murder mystery games where everyone plays a part, and research too, when small details suddenly line up into an answer. This little world keeps a few more secrets. A whale swims in the deep, the pagoda rings when you visit, and an owl carries letters day and night.'
});

// Measured world positions (the cats' house cushion, the ink studio's inkstone, the Contact mailbox).
const SPOTS = {
  saucer: {item: [22.98, 0.305, -1.62], marker: [23.22, 0.30, -1.28], yaw: -0.4},
  inkstone: {item: [14.61, 0.643, -10.65], marker: [14.93, 0.64, -10.5], yaw: 0.3},
  note: {item: [32.78, 1.14, -10.935], marker: [32.95, 0.03, -10.55], yaw: -0.2}
};

function numberTexture(n) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d'); c.fillStyle = '#f2c230'; c.fillRect(0, 0, 64, 64);
  c.fillStyle = '#1d1d1b'; c.font = 'bold 46px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), 32, 35);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** The three evidence markers and their little pieces of evidence. */
export function createCaseClues({low = false, reduced = false, onFound} = {}) {
  const root = new THREE.Group(); root.name = 'case-of-the-toppled-teacup';
  const disposables = [], interactables = [], markers = [];
  const own = r => { disposables.push(r); return r; };
  const yellow = own(new THREE.MeshStandardMaterial({name: 'case-evidence-marker-yellow', color: '#f2c230', emissive: '#a87a10', emissiveIntensity: 0.35, roughness: 0.55}));
  const porcelain = own(new THREE.MeshStandardMaterial({name: 'case-teacup-porcelain', color: '#ffffff', vertexColors: true, roughness: 0.3, side: THREE.DoubleSide}));
  const goldHair = own(new THREE.MeshStandardMaterial({name: 'case-golden-hair', color: '#f0c873', emissive: '#7a5414', emissiveIntensity: 0.4, roughness: 0.4}));
  const paper = own(new THREE.MeshStandardMaterial({name: 'case-note-paper', color: '#f4ead2', roughness: 0.9}));
  const pickMat = own(new THREE.MeshBasicMaterial({visible: false}));
  const tint = (g, color) => { const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g.index ? g.toNonIndexed() : g; };

  // a folded evidence tent with its number on both faces
  function marker(n, at, yaw) {
    const g = new THREE.Group(); g.position.set(...at); g.rotation.y = yaw; g.name = 'case-evidence-marker-' + n;
    const label = own(new THREE.MeshStandardMaterial({name: 'case-evidence-number-' + n, map: own(numberTexture(n)), emissive: '#a87a10', emissiveIntensity: 0.35, roughness: 0.55}));
    for (const side of [-1, 1]) {
      const face = new THREE.Mesh(own(new THREE.BoxGeometry(0.11, 0.085, 0.004)), [yellow, yellow, yellow, yellow, side > 0 ? label : yellow, side < 0 ? label : yellow]);
      face.position.set(0, 0.038, side * 0.02); face.rotation.x = side * -0.42; face.castShadow = true; g.add(face);
    }
    root.add(g); markers.push({g, label}); return g;
  }

  // 1. the broken teacup and saucer, with a shaded hair on the saucer
  const saucerGroup = new THREE.Group(); saucerGroup.position.set(...SPOTS.saucer.item);
  const saucer = tint(new THREE.CylinderGeometry(0.085, 0.06, 0.012, 24), '#f6f7fb');
  const band = tint(new THREE.TorusGeometry(0.075, 0.004, 4, 32), '#2a56b4'); band.rotateX(Math.PI / 2); band.translate(0, 0.007, 0);
  const cup = tint(new THREE.LatheGeometry([[0.0, 0], [0.032, 0], [0.04, 0.012], [0.05, 0.045], [0.055, 0.07]].map(([r, h]) => new THREE.Vector2(r, h)), 18, 0, Math.PI * 1.35), '#f6f7fb');
  cup.rotateZ(Math.PI / 2 - 0.15); cup.translate(0.1, 0.045, 0.02);
  const rim = tint(new THREE.TorusGeometry(0.055, 0.004, 4, 24, Math.PI * 1.35), '#2a56b4'); rim.rotateY(Math.PI / 2); rim.rotateZ(Math.PI / 2 - 0.15); rim.translate(0.03, 0.055, 0.02);
  const shards = [[-0.11, 0.07, 0.5], [0.02, 0.12, 1.7], [-0.06, -0.1, 2.6]].map(([x, z, a]) => { const s = new THREE.CylinderGeometry(0.03, 0.03, 0.004, 3); s.scale(1, 1, 0.6); s.rotateY(a); s.translate(x, 0.002, z); return tint(s, '#f3f4f8'); });
  const shardInk = tint(new THREE.BoxGeometry(0.03, 0.005, 0.006), '#2a56b4'); shardInk.translate(-0.11, 0.004, 0.07);
  const teacup = new THREE.Mesh(own(mergeGeometries([tint(saucer, '#f6f7fb'), band, cup, rim, ...shards, shardInk].map(g => g.index ? g.toNonIndexed() : g), false)), porcelain);
  teacup.name = 'case-broken-blue-and-white-teacup'; teacup.castShadow = true; saucerGroup.add(teacup);
  const hairCurve = new THREE.CatmullRomCurve3([[-0.04, 0.009, -0.02], [-0.01, 0.011, 0.0], [0.02, 0.01, -0.005], [0.045, 0.012, 0.015]].map(p => new THREE.Vector3(...p)));
  const hair = new THREE.Mesh(own(new THREE.TubeGeometry(hairCurve, 16, 0.0015, 4)), goldHair); hair.name = 'case-shaded-hair'; saucerGroup.add(hair);
  root.add(saucerGroup);

  // 2. a long golden hair floating on the inkstone
  const inkCurve = new THREE.CatmullRomCurve3([[-0.12, 0, -0.05], [-0.06, 0.002, 0.03], [0.0, 0.001, -0.02], [0.06, 0.002, 0.04], [0.12, 0, -0.01]].map(p => new THREE.Vector3(...p)));
  const inkHair = new THREE.Mesh(own(new THREE.TubeGeometry(inkCurve, 32, 0.0018, 4)), goldHair); inkHair.name = 'case-long-golden-hair'; inkHair.position.set(...SPOTS.inkstone.item); root.add(inkHair);

  // 3. a folded note tucked into the mailbox front
  const note = new THREE.Mesh(own(new THREE.BoxGeometry(0.1, 0.065, 0.003)), paper); note.name = 'case-folded-note';
  note.position.set(...SPOTS.note.item); note.rotation.z = 0.12; root.add(note);
  const ink = new THREE.Mesh(own(new THREE.BoxGeometry(0.06, 0.004, 0.001)), own(new THREE.MeshBasicMaterial({color: '#3a3330'})));
  ink.position.set(0, 0.008, 0.002); note.add(ink); const ink2 = ink.clone(); ink2.position.y = -0.008; ink2.scale.x = 0.7; note.add(ink2);

  const items = {saucer: [saucerGroup], inkstone: [inkHair], note: [note]};
  for (const clue of CASE.clues) {
    const spot = SPOTS[clue.id], m = marker(clue.n, spot.marker, spot.yaw);
    // generous invisible pick volumes, so tiny evidence is easy to click
    const proxies = [spot.item, spot.marker].map(p => { const o = new THREE.Mesh(own(new THREE.SphereGeometry(0.17, 8, 6)), pickMat); o.position.set(...p); o.name = 'case-pick-' + clue.id; root.add(o); return o; });
    interactables.push({id: 'case-clue-' + clue.id, type: 'enchant', title: 'Evidence ' + clue.n, objects: [m, ...items[clue.id], ...proxies], point: spot.marker, onInteract: () => onFound?.(clue, spot.marker)});
  }

  return {
    root, interactables,
    update(t) { if (reduced) return; for (const [i, k] of markers.entries()) { const pulse = 0.3 + 0.25 * (0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.7)); k.label.emissiveIntensity = pulse; yellow.emissiveIntensity = pulse; } },
    dispose() { root.removeFromParent(); disposables.forEach(r => r.dispose?.()); }
  };
}

/** The casebook: suspects, clues, and the accusation. */
export function createCasebook({data, onOverlay, onGo, mount} = {}) {
  const cats = (data?.cats || []).filter(c => c.id);
  let state = {found: [], solved: false, cleared: []};
  try { const saved = JSON.parse(localStorage.getItem(STORAGE) || 'null'); if (saved && Array.isArray(saved.found)) state = {found: saved.found.filter(id => CASE.clues.some(c => c.id === id)), solved: !!saved.solved, cleared: Array.isArray(saved.cleared) ? saved.cleared : []}; } catch {}
  const save = () => { try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch {} };
  const host = mount || document.querySelector('#world') || document.body;
  const tools = host.querySelector('.magic-toolbox');
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'magic-casebook-button'; button.id = 'casebook-btn'; button.setAttribute('aria-controls', 'magic-casebook'); button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m14.5 14.5 6 6"/></svg><span>Casebook</span><small class="magic-casebook-count"></small>';
  (tools || host).prepend(button);
  const book = document.createElement('section');
  book.id = 'magic-casebook'; book.className = 'magic-casebook'; book.hidden = true; book.setAttribute('role', 'dialog'); book.setAttribute('aria-labelledby', 'magic-casebook-title');
  host.append(book);
  let opened = false, lastFocus = null, verdict = null;

  function draw() {
    const all = state.found.length === CASE.clues.length;
    button.querySelector('.magic-casebook-count').textContent = state.solved ? '✓' : `${state.found.length}/3`;
    button.classList.toggle('has-new', !state.solved && state.found.length > 0);
    const suspects = cats.map(c => {
      const cleared = state.cleared.includes(c.id), guilty = state.solved && c.id === CASE.culprit;
      const thumb = c.photos?.[0] ? c.photos[0].replace('images/cats/', 'images/cats/thumbs/') : '';
      return `<li class="case-suspect${cleared ? ' is-cleared' : ''}${guilty ? ' is-guilty' : ''}"><figure>${thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy" onerror="this.src='${esc(c.photos[0])}'">` : ''}<figcaption><b>${esc(c.name)}</b> <span lang="zh">${esc(c.zh || '')}</span><small>${esc(c.about || '')}</small></figcaption></figure>${cleared ? '<span class="case-stamp case-stamp-alibi" aria-label="Has an alibi">ALIBI</span>' : ''}${guilty ? '<span class="case-stamp case-stamp-guilty">CULPRIT</span>' : ''}${all && !state.solved && !cleared ? `<button type="button" class="case-accuse" data-accuse="${esc(c.id)}">Accuse ${esc(c.name)}</button>` : ''}</li>`;
    }).join('');
    const clues = CASE.clues.map(c => {
      const got = state.found.includes(c.id);
      return `<li class="case-clue${got ? ' is-found' : ''}"><span class="case-clue-number" aria-hidden="true">${c.n}</span><div><h4>${got ? esc(c.title) : 'Not found yet'}</h4><p>${got ? esc(c.text) : esc(c.hint)}</p>${got ? '' : `<button type="button" class="case-go" data-go="${esc(c.station)}">Go and look →</button>`}</div></li>`;
    }).join('');
    const status = state.solved ? `<div class="case-verdict is-solved"><span class="case-stamp case-stamp-closed">CASE CLOSED</span><p>${esc(CASE.solved)}</p><p class="case-coda">${esc(CASE.coda)}</p><p class="case-sign">Hanjing</p></div>`
      : verdict ? `<div class="case-verdict" role="status"><p>${esc(verdict)}</p></div>`
      : all ? '<p class="case-ready">All three clues are in. Who toppled the teacup? Accuse one suspect.</p>'
      : `<p class="case-progress">${state.found.length} of 3 clues found. You can accuse once all three are in.</p>`;
    book.innerHTML = `<header class="magic-casebook-header"><div><p class="case-file">CASE FILE ${esc(CASE.number)} · <span>${state.solved ? 'SOLVED' : 'OPEN'}</span></p><h2 id="magic-casebook-title">${esc(CASE.title)}</h2></div><button type="button" class="magic-casebook-close" aria-label="Close the casebook">×</button></header>
      <div class="magic-casebook-body"><p class="case-intro">${esc(CASE.intro)}</p>${status}<h3>The clues</h3><ol class="case-clues">${clues}</ol><h3>The suspects</h3><ul class="case-suspects">${suspects}</ul>
      <footer class="case-footer"><button type="button" class="case-reset">Start the case again</button><p>A playful case. The cats are real, the crime is not.</p></footer></div>`;
  }
  function open() { if (opened) return; opened = true; lastFocus = document.activeElement; verdict = null; draw(); book.hidden = false; button.setAttribute('aria-expanded', 'true'); onOverlay?.('casebook'); book.querySelector('.magic-casebook-close').focus(); document.addEventListener('keydown', key, true); }
  function close() { if (!opened) return; opened = false; book.hidden = true; button.setAttribute('aria-expanded', 'false'); onOverlay?.(null); document.removeEventListener('keydown', key, true); lastFocus?.focus?.(); }
  function key(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); } }
  function find(clue) {
    const fresh = !state.found.includes(clue.id);
    if (fresh) { state.found.push(clue.id); save(); }
    draw();
    return {fresh, count: state.found.length, line: fresh ? clue.say + (state.found.length === 3 ? ' That is all three. Open the casebook and name the culprit.' : '') : 'Evidence ' + clue.n + ' is already in the casebook.'};
  }
  book.addEventListener('click', e => {
    if (e.target.closest('.magic-casebook-close')) return close();
    const go = e.target.closest('[data-go]'); if (go) { close(); onGo?.(go.dataset.go); return; }
    const accuse = e.target.closest('[data-accuse]');
    if (accuse) {
      const id = accuse.dataset.accuse;
      if (id === CASE.culprit) { state.solved = true; verdict = null; }
      else { if (!state.cleared.includes(id)) state.cleared.push(id); verdict = CASE.alibis[id] || 'That one has an alibi.'; }
      save(); draw(); book.querySelector('.case-verdict, .case-ready')?.scrollIntoView?.({block: 'nearest'}); book.querySelector('.magic-casebook-close').focus(); return;
    }
    if (e.target.closest('.case-reset')) { state = {found: [], solved: false, cleared: []}; verdict = null; save(); draw(); book.querySelector('.magic-casebook-close').focus(); }
  });
  button.addEventListener('click', () => opened ? close() : open());
  draw();
  return {open, close, find, get isOpen() { return opened; }, get state() { return {...state}; }, dispose() { close(); button.remove(); book.remove(); }};
}
