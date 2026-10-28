/* Cyber City Tactics · src/js/core/utils.js
 * Small helpers (random, clamp, seeded RNG, HTML escaping), localStorage access, player preferences,
 * vibration, screen wake lock and full screen.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ================= utils ================= */
const rand = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const pick = a => a[Math.floor(Math.random() * a.length)];
/* Challenge seeds. A Sprawl block is S<block>-<seed>, an Arena run A-<seed>, the seed in base 36.
   Share one and a friend plays the same street (same buildings, event and bounty) or the same arena
   waves and perk offers. */
const seedCode = (mode, n, level) =>
  (mode === 'sprawl' ? 'S' + level : 'A') + '-' + (n >>> 0).toString(36).toUpperCase();
function parseSeed(raw) {
  const s = String(raw || '')
    .toUpperCase()
    .replace(/^CCT-/, '')
    .replace(/\s+/g, '');
  let m = s.match(/^S([1-9]\d?)-([0-9A-Z]{1,7})$/);
  if (m) return { mode: 'sprawl', level: Math.min(20, +m[1]), seed: parseInt(m[2], 36), code: s };
  m = s.match(/^A-([0-9A-Z]{1,7})$/);
  if (m) return { mode: 'arena', seed: parseInt(m[1], 36), code: s };
  return null;
}
const newSeed = () => Math.floor(Math.random() * 2e9);
function srng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const store = {
  get(k) {
    try {
      return JSON.parse(localStorage.getItem(k));
    } catch (e) {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  },
  del(k) {
    try {
      localStorage.removeItem(k);
    } catch (e) {}
  }
};
function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
// Saves can come from older versions or a hand-edited backup. Anything that doesn't have the expected shape
// is ignored rather than allowed to crash a menu.
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const SAVE_SHAPES = {
  cs_save3: s =>
    isObj(s) &&
    Array.isArray(s.runners) &&
    s.runners.length > 0 &&
    Number.isInteger(s.stage) &&
    s.stage >= 0 &&
    s.stage < STAGES.length,
  cs_world: s =>
    isObj(s) &&
    isObj(s.wd) &&
    Number.isInteger(s.wd.level) &&
    s.wd.level > 0 &&
    Array.isArray(s.runners) &&
    s.runners.length > 0,
  cs_arena: s => Array.isArray(s) && s.every(isObj),
  cs_week: isObj,
  cs_day: isObj
};
/** Read a save slot, or null if it's missing or malformed. */
store.load = k => {
  const v = store.get(k);
  // v3 campaign saves predate the Undercity Market (district 4): shift the Arcology and the Host up one
  if (k === 'cs_save3' && isObj(v) && v.v === 3 && Number.isInteger(v.stage) && v.stage >= 3) {
    v.stage++;
    v.v = 4;
  }
  return v !== null && (!SAVE_SHAPES[k] || SAVE_SHAPES[k](v)) ? v : null;
};
const prefs = Object.assign(
  {
    sound: true,
    music: true,
    shake: true,
    haptics: true,
    tips: true,
    seen: {},
    size: 'm',
    lefty: false,
    gfx: 'auto',
    fps: false,
    rotDismissed: false
  },
  isObj(store.get('cs_prefs')) ? store.get('cs_prefs') : {}
);
function applyPrefs() {
  const c = document.body.classList;
  if (!c.toggle) return;
  c.toggle('size-s', prefs.size === 's');
  c.toggle('size-l', prefs.size === 'l');
  c.toggle('lefty', !!prefs.lefty);
  setTimeout(fit, 30);
}
let userActed = false;
addEventListener(
  'pointerdown',
  () => {
    userActed = true;
  },
  { capture: true, passive: true }
);
addEventListener(
  'keydown',
  () => {
    userActed = true;
  },
  { capture: true }
);
function buzz(p) {
  if (!prefs.haptics) return;
  if (typeof PAD !== 'undefined' && PAD.active) rumble(p);
  if (!navigator.vibrate || !userActed) return;
  try {
    navigator.vibrate(p);
  } catch (e) {}
}
/** Controller rumble for the same moments that vibrate a phone. p is ms or a vibrate() pattern. */
function rumble(p) {
  const ms = Array.isArray(p) ? p.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0) : +p || 0;
  if (!ms || !navigator.getGamepads) return;
  try {
    for (const gp of navigator.getGamepads()) {
      const act = gp && gp.vibrationActuator;
      if (act && act.playEffect)
        act
          .playEffect('dual-rumble', {
            duration: Math.min(400, ms),
            strongMagnitude: ms >= 50 ? 0.7 : 0.3,
            weakMagnitude: ms >= 50 ? 0.9 : 0.5
          })
          .catch(() => {});
    }
  } catch (e) {}
}
let wakeLock = null;
async function wake(on) {
  try {
    if (on && !wakeLock && navigator.wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
      });
    } else if (!on && wakeLock) {
      const w = wakeLock;
      wakeLock = null;
      await w.release();
    }
  } catch (e) {}
}
const canFull = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
function goFull() {
  const el = document.documentElement,
    r = el && (el.requestFullscreen || el.webkitRequestFullscreen);
  if (!r) return;
  try {
    Promise.resolve(r.call(el))
      .then(() => {
        try {
          if (screen.orientation && screen.orientation.lock)
            screen.orientation.lock('landscape').catch(() => {});
        } catch (e) {}
        setTimeout(fit, 200);
      })
      .catch(() => {});
  } catch (e) {}
}
function savePrefs() {
  store.set('cs_prefs', prefs);
}
