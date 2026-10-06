/**
 * An accessible invitation, separate from the simulation and its content scripts.
 * Import magic-world.css in the page. Nothing here starts, moves or loads the world.
 *
 * createInvitation({ onEnter, onExplore, onRead, onOpen, onClose, mount, links })
 *   -> { element, open({ replay, trigger }), read(), close(reason), setReady(bool),
 *        destroy(), get isOpen(), get isReady() }
 *
 * By default it opens immediately, with the enter action disabled until setReady(true).
 * onRead reports that the complete letter is visible; it is not a navigation action.
 * The simulation should pause its input while isOpen is true, using onOpen/onClose.
 */
export function createInvitation({
  onEnter,
  onExplore,
  onRead,
  onOpen,
  onClose,
  mount = document.body,
  links = {},
  autoOpen = true,
  ready = false,
} = {}) {
  const doc = mount.ownerDocument;
  const win = doc.defaultView;
  const uid = `magic-letter-${createInvitation.nextId++}`;
  const element = doc.createElement('section');
  element.className = 'magic-invitation';
  element.hidden = true;
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-modal', 'true');
  element.setAttribute('aria-labelledby', `${uid}-title`);
  element.setAttribute('tabindex', '-1');
  element.innerHTML = `
    <header class="magic-invitation-header">
      <div class="magic-invitation-heading">
        <span class="magic-small-seal" aria-hidden="true">HS</span>
        <h1 id="${uid}-title">An invitation from Hanjing</h1>
      </div>
      <nav class="magic-invitation-links" aria-label="Other versions and close">
        <a class="magic-invitation-link" data-magic-link="2d">Interactive 2D</a>
        <a class="magic-invitation-link" data-magic-link="basic">Basic</a>
        <button class="magic-invitation-close" type="button" aria-label="Close the invitation and return to the world">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </button>
      </nav>
    </header>
    <div class="magic-invitation-stage">
      <div class="magic-envelope-scene">
        <p class="magic-envelope-eyebrow">For the curious at heart</p>
        <h2 class="magic-envelope-title">A little world is waiting.</h2>
        <button class="magic-envelope" type="button" aria-label="Open and read Hanjing’s invitation" aria-expanded="false" aria-controls="${uid}-paper">
          <span class="magic-envelope-letter" aria-hidden="true">Dear friend,</span>
          <span class="magic-envelope-back" aria-hidden="true"></span>
          <span class="magic-envelope-fold magic-envelope-fold-left" aria-hidden="true"></span>
          <span class="magic-envelope-fold magic-envelope-fold-right" aria-hidden="true"></span>
          <span class="magic-envelope-fold magic-envelope-fold-bottom" aria-hidden="true"></span>
          <span class="magic-envelope-flap" aria-hidden="true"></span>
          <svg class="magic-envelope-thread" viewBox="0 0 560 340" fill="none" aria-hidden="true">
            <path d="M38 264c60-42 74 24 117-12s53-68 107-31 103 16 136-31 80-32 115-9"/>
            <path d="m112 239 3-7 3 7 7 3-7 3-3 7-3-7-7-3zM441 197l3-7 3 7 7 3-7 3-3 7-3-7-7-3z"/>
            <circle cx="356" cy="231" r="3"/>
          </svg>
          <svg class="magic-envelope-rule" viewBox="0 0 560 340" fill="none" aria-hidden="true"><path d="M14 10 280 190 546 10" /><path d="M24 10 280 180 536 10" /></svg>
          <svg class="magic-envelope-feather" viewBox="0 0 30 96" aria-hidden="true"><path class="shade" transform="translate(1.5 2)" d="M15 2C6 14 3 30 4 46c1 8 3 14 6 20l-2 4 4-2 3 24 3-24 4 2-2-4c3-6 5-12 6-20 1-16-2-32-11-44z" /><path d="M15 2C6 14 3 30 4 46c1 8 3 14 6 20l-2 4 4-2 3 24 3-24 4 2-2-4c3-6 5-12 6-20 1-16-2-32-11-44z" /><path class="spine" d="M15 6v86" /><path class="barbs" d="M15 18l-6 5M15 26l-8 6M15 36l-9 6M15 46l-8 6M15 56l-6 5M15 22l6 5M15 31l8 6M15 41l9 6M15 51l8 6M15 60l5 4" /><circle cx="9" cy="34" r="1.1"/><circle cx="21" cy="46" r="1"/><circle cx="10" cy="54" r=".9"/><circle cx="20" cy="27" r=".9"/></svg>
          <span class="magic-wax-seal" aria-hidden="true"><span>HS</span></span>
          <span class="magic-envelope-stamp" aria-hidden="true"><svg viewBox="0 0 60 40"><path class="sea" d="M0 30c6-3 10 3 16 0s10-3 16 0 10 3 16 0 9-3 12 0v10H0z"/><path class="whale" d="M8 21c4-7 15-10 27-8 7 1 12 4 15 8l5-4c1 3 0 6-2 8l3 3c-3 1-6 0-8-2-5 3-13 5-22 4-11-1-16-4-18-9z"/><path class="spout" d="M18 12c-1-3 0-5 2-6M18 12c1-3 3-4 5-4"/><circle cx="15" cy="20" r="1"/></svg></span>
          <svg class="magic-envelope-postmark" viewBox="0 0 120 70" aria-hidden="true"><defs><path id="${uid}-ring" d="M35 35m-24 0a24 24 0 1 1 48 0a24 24 0 1 1-48 0"/></defs><circle cx="35" cy="35" r="27"/><circle cx="35" cy="35" r="20"/><text><textPath href="#${uid}-ring">DALIAN · SAN FRANCISCO ·</textPath></text><text class="date" x="35" y="38" text-anchor="middle">2013</text><path d="M66 24c8-5 14 5 22 0s14 5 22 0M66 35c8-5 14 5 22 0s14 5 22 0M66 46c8-5 14 5 22 0s14 5 22 0"/></svg>
          <svg class="magic-envelope-paw" viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="16" rx="5" ry="4"/><circle cx="6" cy="10" r="2"/><circle cx="10" cy="6.5" r="2"/><circle cx="14.5" cy="6.5" r="2"/><circle cx="18.5" cy="10" r="2"/></svg>
          <span class="magic-envelope-sparkles" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
        </button>
        <button class="magic-read-letter" type="button">Read the letter <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 15 15 5M5 5h10v10"/></svg></button>
      </div>
      <article id="${uid}-paper" class="magic-letter-paper" hidden aria-labelledby="${uid}-greeting">
        <svg class="magic-letter-watermark" viewBox="0 0 100 200" aria-hidden="true"><path d="M50 4v14M44 22h12l-2 6H46zM38 30h24l6 8H32zM40 38h20v16H40zM32 54h36l7 9H25zM36 63h28v18H36zM28 81h44l8 10H20zM33 91h34v20H33zM24 111h52l9 11H15zM30 122h40v22H30zM20 144h60l10 12H10zM26 156h48v26H26zM14 182h72v8H14z"/></svg>
        <svg class="magic-letter-flourish" viewBox="0 0 520 65" fill="none" aria-hidden="true">
          <path d="M8 46c43 0 32-29 60-29s16 27 44 27h96m104 0h96c28 0 16-27 44-27s17 29 60 29"/>
          <path d="m247 35 13-22 13 22-13 18zM251 35h18M260 20v25"/>
          <circle cx="229" cy="44" r="2"/><circle cx="291" cy="44" r="2"/>
        </svg>
        <h2 id="${uid}-greeting" class="magic-letter-greeting" tabindex="-1">Dear friend,</h2>
        <div class="magic-letter-ink">
          <p>I’m Hanjing. I study how people stay meaningfully in charge when AI becomes a teammate, an agent, or a persona.</p>
          <p>Building things is my way of asking questions. Here you’ll find a little ink, a little starlight, and pieces of the places I’ve called home. And yes, my household belongs to six cats.</p>
          <p>I have a big LEGO collection, and I’ve loved building with blocks since I was little. Building is still how I explore. Piece by piece, I step into the little world taking shape in my hands, especially with the Harry Potter sets. That is why this world is made of bricks, candlelight, and a little magic.</p>
          <p>Chinese traditions are close to my heart, and I’ve lived in the US since high school. That mix finds its way here, in ink courtyards, porcelain rooftops, the sea of my seaside hometown, and little echoes of my travels.</p>
          <p>Look closer at whatever catches your eye. Open a book or linger by the water. JinBingBing and XiaoHei are here, too. Explore in any order. You can always read my work without solving anything first.</p>
          <p>I’m glad you’re here.</p>
        </div>
        <p class="magic-letter-signature">Hanjing<span class="magic-signature-stroke" aria-hidden="true"></span></p>
        <p class="magic-letter-ps">P.S. Something happened to a teacup in the cats’ house last night. If you love a good mystery as much as I do, the casebook is waiting.</p>
        <span class="magic-letter-stamp" aria-hidden="true">HS</span>
        <svg class="magic-letter-paw" viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="16" rx="5" ry="4"/><circle cx="6" cy="10" r="2"/><circle cx="10" cy="6.5" r="2"/><circle cx="14.5" cy="6.5" r="2"/><circle cx="18.5" cy="10" r="2"/></svg>
      </article>
    </div>
    <footer class="magic-invitation-footer">
      <button class="magic-enter-world" type="button"><span class="magic-enter-label">Opening the gates…</span><span class="magic-enter-arrow" aria-hidden="true">→</span></button>
      <p class="magic-invitation-note">Explore at your own pace.</p>
      <p class="magic-invitation-status magic-sr-only" role="status" aria-live="polite"></p>
    </footer>`;

  const envelopeScene = element.querySelector('.magic-envelope-scene');
  const envelope = element.querySelector('.magic-envelope');
  const paper = element.querySelector('.magic-letter-paper');
  const greeting = element.querySelector('.magic-letter-greeting');
  const stage = element.querySelector('.magic-invitation-stage');
  const enterButton = element.querySelector('.magic-enter-world');
  const enterLabel = element.querySelector('.magic-enter-label');
  const status = element.querySelector('.magic-invitation-status');
  const focusSelector = 'a[href],button:not([disabled]),[tabindex="0"]';
  const backgroundState = new Map();
  let previousFocus = null;
  let previousOverflow = '';
  let openState = false;
  let readyState = Boolean(ready);
  let destroyed = false;
  let hasRead = false;
  let observer = null;

  // These are navigable alternatives even while WebGL assets are still loading.
  for (const [key, fallback] of [['2d', 'index.html?world'], ['basic', 'basic.html']]) {
    const anchor = element.querySelector(`[data-magic-link="${key}"]`);
    let target;
    try { target = new URL(links[key] || fallback, doc.baseURI); } catch { target = new URL(fallback, doc.baseURI); }
    if (!['https:', 'http:'].includes(target.protocol)) target = new URL(fallback, doc.baseURI);
    anchor.href = target.href;
  }

  const focus = target => target?.focus({ preventScroll: true });
  const visibleControls = () => [...element.querySelectorAll(focusSelector)]
    .filter(node => !node.closest('[hidden]') && !node.disabled);

  function isolateBackground() {
    let current = element;
    while (current.parentElement && current.parentElement !== doc.documentElement) {
      for (const sibling of current.parentElement.children) {
        if (sibling === current || backgroundState.has(sibling)) continue;
        backgroundState.set(sibling, { inert: sibling.inert, ariaHidden: sibling.getAttribute('aria-hidden') });
        sibling.inert = true;
        sibling.setAttribute('aria-hidden', 'true');
      }
      current = current.parentElement;
    }
  }

  // How far the world has been built (0..1), shown as the enter button filling like a lantern being lit,
  // with the step and percentage in its label until it is ready.
  function setProgress(fraction, step) {
    if (destroyed || readyState) return;
    const pct = Math.max(0, Math.min(100, Math.round(fraction * 100)));
    enterButton.style.setProperty('--progress', pct + '%');
    enterButton.setAttribute('aria-valuenow', String(pct));
    enterLabel.textContent = (step || 'Opening the gates') + '… ' + pct + '%';
  }

  function setReady(value) {
    if (destroyed) return;
    const changed = readyState !== Boolean(value);
    readyState = Boolean(value);
    enterButton.disabled = !readyState;
    enterButton.setAttribute('aria-busy', String(!readyState));
    enterButton.classList.toggle('is-loading', !readyState);
    if (readyState) enterButton.style.setProperty('--progress', '100%');
    enterLabel.textContent = readyState ? 'Open my world' : 'Opening the gates…';
    if (changed && openState) status.textContent = readyState ? 'The world is ready. You can enter whenever you like.' : 'The world is opening. You can read the letter while you wait.';
  }

  function read() {
    if (destroyed || !openState) return;
    envelopeScene.hidden = true;
    paper.hidden = false;
    envelope.setAttribute('aria-expanded', 'true');
    element.classList.add('magic-invitation-has-read');
    stage.scrollTop = 0;
    focus(greeting);
    if (!hasRead) { hasRead = true; onRead?.({ source: 'invitation' }); }
  }

  function open({ replay = false, trigger } = {}) {
    if (destroyed) return;
    if (openState) { if (replay) read(); return; }
    previousFocus = trigger || doc.activeElement;
    previousOverflow = doc.body.style.overflow;
    doc.body.style.overflow = 'hidden';
    openState = true;
    element.hidden = false;
    isolateBackground();
    if (win.MutationObserver) {
      observer = new win.MutationObserver(isolateBackground);
      observer.observe(doc.body, { childList: true });
    }
    win.addEventListener('keydown', handleKey, true);
    win.addEventListener('keyup', handleKey, true);
    doc.addEventListener('focusin', containFocus, true);
    onOpen?.({ source: 'invitation', replay });
    if (replay || hasRead) read();
    else { stage.scrollTop = 0; focus(envelope); }
  }

  function close(reason = 'close') {
    if (!openState) return;
    openState = false;
    element.hidden = true;
    observer?.disconnect();
    observer = null;
    win.removeEventListener('keydown', handleKey, true);
    win.removeEventListener('keyup', handleKey, true);
    doc.removeEventListener('focusin', containFocus, true);
    for (const [node, prior] of backgroundState) {
      node.inert = Boolean(prior.inert);
      if (prior.ariaHidden === null) node.removeAttribute('aria-hidden');
      else node.setAttribute('aria-hidden', prior.ariaHidden);
    }
    backgroundState.clear();
    doc.body.style.overflow = previousOverflow;
    const restoreTarget = previousFocus?.isConnected && previousFocus !== doc.body
      && !previousFocus.closest('[inert]') ? previousFocus : doc.getElementById('world-canvas');
    focus(restoreTarget);
    onClose?.({ source: 'invitation', reason });
  }

  function containFocus(event) {
    if (openState && !element.contains(event.target)) focus(paper.hidden ? envelope : greeting);
  }

  function handleKey(event) {
    if (!openState) return;
    // Keep arrows, WASD, Enter and Space away from document-level world controls.
    // Their native actions (scroll, select, copy, activate the focused button) remain.
    event.stopImmediatePropagation();
    if (event.type !== 'keydown') return;
    if (event.key === 'Escape') { event.preventDefault(); close('escape'); return; }
    if (event.key !== 'Tab') return;
    const controls = visibleControls();
    const first = controls[0], last = controls.at(-1);
    if (!first) { event.preventDefault(); focus(element); return; }
    const active = doc.activeElement;
    if (!controls.includes(active)) {
      // The letter heading is programmatically focused, but is not a Tab stop.
      // Continue in document order from that heading rather than jumping to the header.
      const ordered = event.shiftKey ? [...controls].reverse() : controls;
      const direction = event.shiftKey ? win.Node.DOCUMENT_POSITION_PRECEDING : win.Node.DOCUMENT_POSITION_FOLLOWING;
      const next = ordered.find(node => active?.compareDocumentPosition(node) & direction);
      event.preventDefault(); focus(next || (event.shiftKey ? last : first));
    } else if (event.shiftKey && active === first) {
      event.preventDefault(); focus(last);
    } else if (!event.shiftKey && active === last) {
      event.preventDefault(); focus(first);
    }
  }

  envelope.addEventListener('click', read);
  element.querySelector('.magic-read-letter').addEventListener('click', read);
  element.querySelector('.magic-invitation-close').addEventListener('click', () => close('close-button'));
  enterButton.addEventListener('click', () => {
    if (!openState || !readyState) return;
    close('enter');
    (onEnter || onExplore)?.({ source: 'invitation' });
  });

  function destroy() {
    if (destroyed) return;
    close('destroy');
    destroyed = true;
    element.remove();
  }

  mount.append(element);
  setReady(readyState);
  const api = { element, open, read, close, setReady, setProgress, destroy,
    get isOpen() { return openState; }, get isReady() { return readyState; } };
  if (autoOpen) open();
  return api;
}
createInvitation.nextId = 1;
