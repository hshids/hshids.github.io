// Knock, knock, knock: entering the crystal world the way a certain physicist
// knocks on a door, three knocks and a name, three times, every visit. The knocks
// are synthesized with Web Audio (no files) and the name is spoken by the
// browser's own voice when it has one; both start from the visitor's click so
// browsers allow sound. Any click or key skips it.

const SEEN = 'hj-crystal-knocked-v1';

function knockSound(ctx, out, t, strength = 1) {
  // the thump of a knuckle on a wooden door
  const body = ctx.createOscillator(), bodyGain = ctx.createGain();
  body.type = 'sine'; body.frequency.setValueAtTime(150, t); body.frequency.exponentialRampToValueAtTime(68, t + 0.09);
  bodyGain.gain.setValueAtTime(0.0001, t); bodyGain.gain.exponentialRampToValueAtTime(0.85 * strength, t + 0.004); bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  body.connect(bodyGain).connect(out); body.start(t); body.stop(t + 0.18);
  // the panel ringing briefly
  const panel = ctx.createOscillator(), panelGain = ctx.createGain();
  panel.type = 'triangle'; panel.frequency.setValueAtTime(410, t); panel.frequency.exponentialRampToValueAtTime(330, t + 0.08);
  panelGain.gain.setValueAtTime(0.0001, t); panelGain.gain.exponentialRampToValueAtTime(0.18 * strength, t + 0.003); panelGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  panel.connect(panelGain).connect(out); panel.start(t); panel.stop(t + 0.12);
  // the dry click of the wood grain
  const length = Math.floor(ctx.sampleRate * 0.045), buffer = ctx.createBuffer(1, length, ctx.sampleRate), data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 5);
  const click = ctx.createBufferSource(), band = ctx.createBiquadFilter(), clickGain = ctx.createGain();
  click.buffer = buffer; band.type = 'bandpass'; band.frequency.value = 1100; band.Q.value = 1.4; clickGain.gain.value = 0.55 * strength;
  click.connect(band).connect(clickGain).connect(out); click.start(t);
}

function chime(ctx, out, t, pitch = 1) {
  for (const [f, v] of [[784 * pitch, 0.12], [1176 * pitch, 0.06], [1568 * pitch, 0.03]]) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.connect(g).connect(out); o.start(t); o.stop(t + 1.2);
  }
}

/** Plays the knock and shows it; resolves when it ends or is skipped. */
export function knockToEnter({doc = document, reduced = false, name = 'Hanjing', mount} = {}) {
  try { localStorage.setItem(SEEN, '1'); } catch {}
  const rounds = 3, gap = 1.75;
  const host = mount || doc.querySelector('#world') || doc.body;
  const el = doc.createElement('div');
  el.className = 'magic-knock'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
  el.innerHTML = '<div class="magic-knock-rings" aria-hidden="true"></div><p class="magic-knock-words"><span class="magic-knock-knocks" aria-hidden="true"></span><span class="magic-knock-name"></span></p><p class="magic-knock-skip">Click anywhere to step in</p>';
  host.append(el);
  const rings = el.querySelector('.magic-knock-rings'), knocks = el.querySelector('.magic-knock-knocks'), nameEl = el.querySelector('.magic-knock-name');
  let ctx = null, master = null;
  try {
    const AC = doc.defaultView.AudioContext || doc.defaultView.webkitAudioContext;
    if (AC) { ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.32; master.connect(ctx.destination); ctx.resume?.(); }
  } catch { ctx = null; }
  // the spoken name: unlocked now, inside the click (Safari only lets speech start from a gesture)
  let synth = null, voice = null;
  try {
    synth = doc.defaultView.speechSynthesis || null;
    if (synth) {
      synth.cancel();
      const warm = new doc.defaultView.SpeechSynthesisUtterance(' '); warm.volume = 0; synth.speak(warm);
      const voices = synth.getVoices();
      voice = voices.find(v => /^en[-_](US|GB)/i.test(v.lang) && /female|samantha|karen|serena|zira|aria|jenny/i.test(v.name)) || voices.find(v => /^en/i.test(v.lang)) || null;
    }
  } catch { synth = null; }
  const say = () => {
    if (!synth) return;
    try { const u = new doc.defaultView.SpeechSynthesisUtterance(name); u.lang = 'en-US'; if (voice) u.voice = voice; u.rate = 0.92; u.pitch = 1.05; u.volume = 0.9; synth.speak(u); } catch {}
  };
  const timers = [];
  const later = (ms, fn) => timers.push(doc.defaultView.setTimeout(fn, ms));
  const t0 = ctx ? ctx.currentTime + 0.12 : 0;
  for (let r = 0; r < rounds; r++) {
    for (let k = 0; k < 3; k++) {
      const at = r * gap + k * 0.21;
      if (ctx) knockSound(ctx, master, t0 + at, k === 2 ? 1.05 : 0.95);
      later((at + 0.12) * 1000, () => {
        knocks.textContent = ['Knock,', 'Knock, knock,', 'Knock, knock, knock.'][k];
        knocks.classList.remove('is-pop'); void knocks.offsetWidth; knocks.classList.add('is-pop');
        if (!reduced) { const ring = doc.createElement('i'); rings.append(ring); later(1400, () => ring.remove()); }
      });
    }
    const call = r * gap + 0.72;
    if (ctx && !synth) chime(ctx, master, t0 + call, 1 + r * 0.06);   // a bell for the name where the browser cannot speak
    later((call + 0.12) * 1000, () => { nameEl.textContent = name + (r < rounds - 1 ? ',' : '.'); nameEl.classList.remove('is-pop'); void nameEl.offsetWidth; nameEl.classList.add('is-pop'); say(); });
    later((r * gap + gap - 0.05) * 1000, () => { if (r < rounds - 1) { knocks.textContent = ''; nameEl.textContent = ''; } });
  }
  const end = rounds * gap + 0.35;
  if (ctx) chime(ctx, master, t0 + end - 0.2, 1.33);
  later((end - 0.2) * 1000, () => { knocks.textContent = ''; nameEl.textContent = 'Come in.'; nameEl.classList.remove('is-pop'); void nameEl.offsetWidth; nameEl.classList.add('is-pop', 'is-answer'); });
  return new Promise(resolve => {
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      timers.forEach(id => doc.defaultView.clearTimeout(id));
      try { synth?.cancel(); } catch {}
      doc.removeEventListener('keydown', finish, true);
      el.classList.add('is-leaving');
      doc.defaultView.setTimeout(() => { el.remove(); try { ctx?.close(); } catch {} }, 650);
      resolve();
    };
    el.addEventListener('pointerdown', finish);
    doc.addEventListener('keydown', finish, true);
    later((end + 0.9) * 1000, finish);
  });
}
