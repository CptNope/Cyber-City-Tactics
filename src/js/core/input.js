/* Cyber City Tactics · src/js/core/input.js
 * Keyboard maps for both runners, the touch stick and buttons (with contextual labels), and gamepads. Inputs
 * land in INP[0] and INP[1] as held/pressed flags.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ================= input ================= */
const INP = [
  { held: {}, pressed: {} },
  { held: {}, pressed: {} }
];
const KA = {
  KeyF: 'special',
  KeyA: 'left',
  KeyD: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyJ: 'punch',
  KeyZ: 'punch',
  KeyE: 'punch',
  KeyK: 'kick',
  KeyX: 'kick',
  Space: 'jump',
  KeyL: 'jump',
  KeyU: 'gun',
  KeyV: 'gun',
  KeyI: 'spell',
  KeyB: 'spell',
  KeyO: 'dodge',
  ShiftLeft: 'dodge',
  KeyQ: 'swap',
  KeyH: 'item'
};
const KB = {
  Backslash: 'special',
  Numpad8: 'special',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  Comma: 'punch',
  Period: 'kick',
  Slash: 'jump',
  Semicolon: 'gun',
  Quote: 'spell',
  ShiftRight: 'dodge',
  BracketRight: 'swap',
  BracketLeft: 'item',
  Numpad1: 'punch',
  Numpad2: 'kick',
  Numpad3: 'jump',
  Numpad4: 'gun',
  Numpad5: 'spell',
  Numpad6: 'dodge',
  Numpad7: 'swap',
  Numpad0: 'item'
};
const ACTIVE = () => G.mode === 'play' || G.mode === 'den';
function kp(i, a, down) {
  const s = INP[i];
  if (!s) return;
  if (down) {
    if (!s.held[a]) s.pressed[a] = true;
    s.held[a] = true;
  } else s.held[a] = false;
}
function globalAct(a, who) {
  A.unlock();
  if (a === 'pause') togglePause();
  else if (a === 'sheet') toggleSheet(who || 0);
}
addEventListener('keydown', e => {
  const c = e.code;
  if (G.mode === 'hack' && (c === 'KeyJ' || c === 'Space' || c === 'Comma' || c === 'KeyE')) {
    e.preventDefault();
    if (!e.repeat) hackPress();
    return;
  }
  if (c === 'Escape' || c === 'KeyP') {
    e.preventDefault();
    if (!e.repeat) {
      if (G.mode === 'hack') {
        G.hack = null;
        setMode('play');
      } else globalAct('pause');
    }
    return;
  }
  if (c === 'KeyC' || c === 'Tab') {
    if (ACTIVE() || G.mode === 'sheet') {
      e.preventDefault();
      if (!e.repeat) globalAct('sheet', 0);
    }
    return;
  }
  if (!ACTIVE()) return;
  let who = -1,
    a = null;
  if (KA[c]) {
    who = 0;
    a = KA[c];
  } else if (KB[c]) {
    who = G.coop ? 1 : 0;
    a = KB[c];
  }
  if (!a) return;
  e.preventDefault();
  A.unlock();
  if (e.repeat) return;
  kp(who, a, true);
});
addEventListener('keyup', e => {
  const c = e.code;
  if (KA[c]) kp(0, KA[c], false);
  else if (KB[c]) kp(G.coop ? 1 : 0, KB[c], false);
});
addEventListener('blur', () => {
  for (const s of INP) for (const k in s.held) s.held[k] = false;
});
if (matchMedia('(pointer:coarse)').matches) document.body.classList.add('touch');
addEventListener(
  'touchstart',
  () => {
    document.body.classList.add('touch');
    fit();
  },
  { once: true, passive: true }
);

const stick = document.getElementById('stick'),
  ring = document.getElementById('ring'),
  knob = document.getElementById('knob');
let stickId = null,
  sc = { x: 0, y: 0 };
// Floating stick: the ring jumps to wherever the thumb lands inside the left zone.
function stickSet(dx, dy) {
  const R = (ring.offsetWidth || 120) * 0.32,
    m = Math.hypot(dx, dy);
  if (m > R) {
    dx = (dx / m) * R;
    dy = (dy / m) * R;
  }
  knob.style.transform = `translate(${dx}px,${dy}px)`;
  const dz = R * 0.3,
    h = INP[0].held;
  h.left = dx < -dz;
  h.right = dx > dz;
  h.up = dy < -dz;
  h.down = dy > dz;
}
stick.addEventListener('pointerdown', e => {
  e.preventDefault();
  A.unlock();
  stickId = e.pointerId;
  stick.setPointerCapture(e.pointerId);
  const zr = stick.getBoundingClientRect(),
    rw = (ring.offsetWidth || 120) / 2;
  const cx = clamp(e.clientX, zr.left + Math.min(rw, zr.width / 2), zr.right - Math.min(rw, zr.width / 2)),
    cy = clamp(e.clientY, zr.top + Math.min(rw, zr.height / 2), zr.bottom - Math.min(rw, zr.height / 2));
  ring.style.left = cx - zr.left + 'px';
  ring.style.top = cy - zr.top + 'px';
  sc = { x: cx, y: cy };
  stickSet(e.clientX - sc.x, e.clientY - sc.y);
});
stick.addEventListener('pointermove', e => {
  if (e.pointerId !== stickId) return;
  stickSet(e.clientX - sc.x, e.clientY - sc.y);
});
const stickEnd = e => {
  if (e.pointerId !== stickId) return;
  stickId = null;
  stickSet(0, 0);
  ring.style.left = '';
  ring.style.top = '';
};
stick.addEventListener('pointerup', stickEnd);
stick.addEventListener('pointercancel', stickEnd);
const tapAct = a => {
  kp(0, a, true);
  setTimeout(() => kp(0, a, false), 60);
};
document.querySelectorAll('.tb').forEach(b => {
  const a = b.dataset.act;
  let lp = null,
    lpFired = false;
  b.addEventListener('pointerdown', e => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    b.classList.add('on');
    A.unlock();
    if (a === 'sheet') globalAct('sheet', 0);
    else if (a === 'spell') {
      lpFired = false;
      clearTimeout(lp);
      lp = setTimeout(() => {
        lpFired = true;
        lp = null;
        tapAct('swap');
        buzz(15);
      }, 380);
    } // hold SPELL to swap spells
    else kp(0, a, true);
  });
  const up = () => {
    b.classList.remove('on');
    if (a === 'spell') {
      if (lp) {
        clearTimeout(lp);
        lp = null;
        if (!lpFired) tapAct('spell');
      }
      return;
    }
    kp(0, a, false);
  };
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  b.addEventListener('lostpointercapture', up);
  b.addEventListener('contextmenu', e => e.preventDefault());
});
document.getElementById('pauseBtn').addEventListener('click', () => globalAct('pause'));
const rotHint = document.getElementById('rotHint');
rotHint.addEventListener('click', () => {
  prefs.rotDismissed = true;
  savePrefs();
  rotHint.hidden = true;
  fit();
  goFull();
});
// Contextual touch labels: the big buttons say what they will do right now.
const TB = {};
document.querySelectorAll('.tb').forEach(b => {
  TB[b.dataset.act] = b;
});
const lastLbl = {};
function setLbl(a, html, dim) {
  const b = TB[a];
  if (!b) return;
  const k = html + '|' + !!dim;
  if (lastLbl[a] === k) return;
  lastLbl[a] = k;
  b.innerHTML = html;
  b.classList.toggle('dim', !!dim);
}
const SPSHORT = { fire: 'FIRE', bolt: 'BOLT', heal: 'HEAL', barrier: 'WARD', chain: 'CHAIN' };
function updateTouchUI() {
  if (!isTouch()) return;
  const portrait = (window.innerHeight || 0) > (window.innerWidth || 0);
  const wantHint = portrait && !prefs.rotDismissed && (G.mode === 'play' || G.mode === 'den');
  if (rotHint.hidden === wantHint) {
    rotHint.hidden = !wantHint;
    fit();
  }
  const p = PL[0];
  if (!p) return;
  let punch = 'PUNCH',
    kick = 'KICK';
  if (G.mode === 'den' && nearNPC(p)) punch = 'TALK';
  else if (G.world && !G.dun && nearDoor(p)) punch = 'ENTER';
  else if (p.state === 'grab') {
    punch = 'KNEE';
    kick = 'THROW';
  } else if (p.holding) {
    punch = 'THROW';
    kick = 'DROP';
  } else if (G.mode === 'play' && G.props.some(o => Math.abs(o.x - p.x) < 16 && Math.abs(o.y - p.y) < 9))
    punch = 'LIFT';
  setLbl('punch', punch);
  setLbl('kick', kick);
  const sid = p.spells[p.spell],
    sp = SPELLS[sid];
  setLbl('spell', `${SPSHORT[sid]}<small>${spellCost(p, sp)}</small>`, p.mp < spellCost(p, sp) || G.den);
  setLbl('gun', p.eq.gun ? `GUN<small>${p.ammo}</small>` : 'GUN', !p.eq.gun || p.ammo <= 0 || G.den);
  setLbl('item', `MED ${PARTY.med}`, PARTY.med <= 0);
  const spPct = Math.floor(p.sp || 0),
    bS = TB.special;
  setLbl('special', spPct >= 100 ? '★ READY' : `★ ${spPct}%`, spPct < 100 || G.den);
  if (bS) {
    bS.classList.toggle('ready', spPct >= 100 && !G.den);
    if (spPct < 100)
      bS.style.background = `linear-gradient(90deg,rgba(255,198,61,.32) ${spPct}%,rgba(167,157,194,.08) ${spPct}%)`;
    else bS.style.background = '';
  }
  setLbl(
    'sheet',
    p.pts || p.spts ? `CHAR <b style="color:var(--gold)">+${(p.pts || 0) + (p.spts || 0)}</b>` : 'CHAR'
  );
}
if (typeof ResizeObserver !== 'undefined') {
  try {
    new ResizeObserver(() => fit()).observe(document.getElementById('stage'));
  } catch (e) {}
}

/* ---------- gamepads ----------
 * Standard mapping, Xbox names: A 0 · B 1 · X 2 · Y 3 · LB 4 · RB 5 · LT 6 · RT 7 · View 8 · Menu 9 · L3 10 · R3 11 ·
 * D-pad 12–15. PlayStation and Switch pads report the same positions (Cross = A, Circle = B, and so on).
 * In play: solo, pad 1 is runner 1. Co-op: two pads map 1:1; one pad goes to runner 2 so runner 1 can stay on keyboard.
 * In menus: any pad moves focus with the D-pad or left stick, A selects, B goes back, LB/RB switch tabs. */
const padPrev = {};
const PAD = { active: false, name: '', nav: {}, lastA: null };
const PAD_BTN = {
  punch: 'X',
  kick: 'B',
  jump: 'A',
  spell: 'Y',
  dodge: 'LB',
  gun: 'RB',
  item: 'LT',
  swap: 'RT',
  sheet: 'View',
  start: 'Menu',
  special: 'L3/R3'
};
function padSeen(gp) {
  document.body.classList.add('pad-nav');
  PAD.name = gp.id || 'Controller';
  if (PAD.active) return;
  PAD.active = true;
  document.body.classList.add('gamepad');
  fit();
  if (!ACTIVE()) renderOv();
}
// Touching or clicking hands focus rings back to the pointer.
addEventListener('pointerdown', () => document.body.classList.remove('pad-nav'));
addEventListener('gamepadconnected', e => {
  (G.toasts = G.toasts || []).push({
    s: 'Controller connected',
    d: padName(e.gamepad.id),
    life: 180,
    lore: true
  });
});
addEventListener('gamepaddisconnected', () => {
  let left = [];
  try {
    left = [...navigator.getGamepads()].filter(Boolean);
  } catch (e) {}
  if (!left.length) {
    PAD.active = false;
    document.body.classList.remove('gamepad', 'pad-nav');
    fit();
  }
  // Losing a controller mid-fight should never cost a life.
  if (ACTIVE()) togglePause();
});
function padName(id) {
  const s = String(id || '');
  if (/xbox|xinput|045e/i.test(s)) return 'Xbox controller';
  if (/dualsense|dualshock|playstation|054c/i.test(s)) return 'PlayStation controller';
  if (/switch|joy-con|057e/i.test(s)) return 'Switch controller';
  return (
    s
      .replace(/\(.*?\)/g, '')
      .trim()
      .slice(0, 40) || 'Controller'
  );
}
/** Turns touch wording ("Tap PUNCH") into controller wording ("Press X"). */
function padText(t) {
  return String(t)
    .replace(/Drag anywhere on the left( side)?/g, 'Use the left stick')
    .replace(/Hold SPELL to swap spells/g, 'Press RT to swap spells')
    .replace(/\b[Tt]ap ★/g, m => (m[0] === 'T' ? 'Press' : 'press') + ' L3 or R3')
    .replace(/\bTap\b/g, 'Press')
    .replace(/\btap\b/g, 'press')
    .replace(/\b(PUNCH|LIFT|THROW|KNEE|TALK|ENTER)\b/g, 'X')
    .replace(/\bKICK\b/g, 'B')
    .replace(/\b(JUMP|HACK)\b/g, 'A')
    .replace(/\bDODGE\b/g, 'LB')
    .replace(/\bGUN\b/g, 'RB')
    .replace(/\bSPELL\b/g, 'Y')
    .replace(/\bMED\b/g, 'LT')
    .replace(/\bCHAR\b/g, 'View');
}
/** Picks the right wording for whatever the player is holding: a controller, a touch screen or a keyboard. */
const ctl = (touchTxt, keyTxt) =>
  PAD.active ? padText(touchTxt) : isTouch() ? touchTxt : keyTxt || touchTxt;

/* Menu navigation with a pad */
function padFocusables() {
  return [...ov.querySelectorAll('button:not([disabled]), [data-a]:not(button), input, select')].filter(
    el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }
  );
}
function padFocus(el) {
  if (!el) return;
  el.focus({ preventScroll: true });
  try {
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  } catch (e) {}
}
function padMove(dir) {
  const items = padFocusables();
  const cur =
    ov.contains(document.activeElement) && items.includes(document.activeElement)
      ? document.activeElement
      : null;
  if (!cur) return padFocus(ov.querySelector('.btn:not([disabled])') || items[0]);
  const r = cur.getBoundingClientRect(),
    cx = r.left + r.width / 2,
    cy = r.top + r.height / 2;
  let best = null,
    bestScore = Infinity;
  for (const el of items) {
    if (el === cur) continue;
    const q = el.getBoundingClientRect(),
      dx = q.left + q.width / 2 - cx,
      dy = q.top + q.height / 2 - cy;
    const along = dir === 'down' ? dy : dir === 'up' ? -dy : dir === 'right' ? dx : -dx;
    const across = dir === 'down' || dir === 'up' ? Math.abs(dx) : Math.abs(dy);
    if (along <= 4) continue; // only things that are actually that way
    const score = along + across * 2.2;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  if (best) {
    padFocus(best);
    sfx.click();
  }
}
function padActivate() {
  const el = ov.contains(document.activeElement)
    ? document.activeElement
    : ov.querySelector('.btn:not([disabled])');
  if (!el || el.disabled) return;
  PAD.lastA = el.dataset && el.dataset.a;
  A.unlock();
  el.click();
}
/** Put focus back where it was after a menu redraws (the old buttons are replaced). */
function padRestoreFocus() {
  if (!document.body.classList.contains('pad-nav')) return;
  const items = padFocusables();
  const same = PAD.lastA && items.find(el => el.dataset && el.dataset.a === PAD.lastA);
  padFocus(same || ov.querySelector('.btn:not([disabled])') || items[0]);
}
const PAD_BACK = ['hackquit', 'importno', 'setdone', 'close', 'leave', 'resume', 'back2title'];
function padBack() {
  if (G.mode === 'hack') {
    G.hack = null;
    setMode('play');
    return;
  }
  for (const a of PAD_BACK) {
    const b = ov.querySelector(`[data-a="${a}"]:not([disabled])`);
    if (b) {
      PAD.lastA = null;
      b.click();
      return;
    }
  }
  if (['npc', 'bcard', 'safe', 'sheet', 'pause'].includes(G.mode)) togglePause();
}
function padTabs(step) {
  const groups = [...ov.querySelectorAll('.tabs')];
  if (!groups.length) return;
  const g = groups.find(x => x.contains(document.activeElement)) || groups[groups.length - 1];
  const tabs = [...g.querySelectorAll('.tab')];
  const i = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
  const next = tabs[(i + step + tabs.length) % tabs.length];
  if (next) {
    PAD.lastA = next.dataset.a;
    next.click();
  }
}

function pollPads() {
  if (!navigator.getGamepads) return;
  let list;
  try {
    list = [...navigator.getGamepads()].filter(Boolean);
  } catch (e) {
    return;
  }
  const now = performance.now();
  list.forEach((gp, n) => {
    if (n > 1) return;
    let who = G.coop ? (list.length >= 2 ? n : 1) : n === 0 ? 0 : -1;
    const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed),
      ax = gp.axes[0] || 0,
      ay = gp.axes[1] || 0;
    const st = {
      left: b(14) || ax < -0.45,
      right: b(15) || ax > 0.45,
      up: b(12) || ay < -0.45,
      down: b(13) || ay > 0.45,
      jump: b(0),
      kick: b(1),
      punch: b(2),
      spell: b(3),
      dodge: b(4),
      gun: b(5),
      item: b(6),
      swap: b(7),
      sheet: b(8),
      start: b(9),
      special: b(10) || b(11)
    };
    const prev = padPrev[gp.index] || {};
    const pressed = k => st[k] && !prev[k];
    if (Object.keys(st).some(pressed)) {
      userActed = true;
      padSeen(gp);
    }
    // Menus: navigate with the D-pad or stick (held directions repeat), A to pick, B to go back.
    if (!ACTIVE() && G.mode !== 'hack') {
      const dir = ['up', 'down', 'left', 'right'].find(d => st[d]);
      const nav = PAD.nav[gp.index] || (PAD.nav[gp.index] = { dir: null, next: 0 });
      if (!dir) nav.dir = null;
      else if (dir !== nav.dir) {
        nav.dir = dir;
        nav.next = now + 340;
        padMove(dir);
      } else if (now >= nav.next) {
        nav.next = now + 110;
        padMove(dir);
      }
      if (pressed('jump') || pressed('start')) padActivate();
      else if (pressed('kick')) padBack();
      else if (pressed('dodge')) padTabs(-1);
      else if (pressed('gun')) padTabs(1);
      else if (pressed('sheet') && G.mode === 'sheet') globalAct('sheet', who >= 0 ? who : 0);
      padPrev[gp.index] = st;
      return;
    }
    if (G.mode === 'hack') {
      if (pressed('punch') || pressed('jump')) hackPress();
      else if (pressed('spell')) useIce();
      else if (pressed('kick')) padBack();
      padPrev[gp.index] = st;
      return;
    }
    for (const k in st) {
      const on = st[k],
        was = !!prev[k];
      if (k === 'start') {
        if (on && !was) {
          A.unlock();
          if (!G.coop && n === 1) joinRunner2();
          else togglePause();
        }
        continue;
      }
      if (k === 'sheet') {
        if (on && !was && who >= 0) globalAct('sheet', who);
        continue;
      }
      if (who < 0) continue;
      if (on && !was) kp(who, k, true);
      else if (!on && was) kp(who, k, false);
    }
    padPrev[gp.index] = st;
  });
}
