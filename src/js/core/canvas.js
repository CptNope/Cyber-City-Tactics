/* Cyber City Tactics · src/js/core/canvas.js
 * Canvas, logical resolution and responsive fitting. W×H is the logical street size; in portrait the canvas
 * grows taller (VH) and the extra sky band (BAND) holds the HUD.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
// W is the logical view width: 480 at 16:9 and narrower, wider on wider screens (up to WMAX), so the canvas
// always fills the screen. H is the street's height; taller screens add bands above (BAND) and below (BOT).
let W = 480;
const W0 = 480,
  WMAX = 1000,
  H = 270,
  FY0 = 170,
  FY1 = 262;
const cvs = document.getElementById('game'),
  ctx = cvs.getContext('2d');
const ov = document.getElementById('ov');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = () => !!(document.body.classList.contains && document.body.classList.contains('touch'));
/* ---------- interpolation and adaptive quality ---------- */
// Remember where everything was before each logic step...
function snapPrev() {
  if (typeof G === 'undefined') return;
  G.pcamX = G.camX;
  for (const e of G.ents) {
    e.px = e.x;
    e.py = e.y;
    e.pz = e.z;
  }
  for (const q of G.projs) {
    q.px = q.x;
    q.py = q.y;
    q.pz = q.z;
  }
}
// ...then draw blended between that and now. Big jumps (respawns, doors, scene changes) snap instead.
function lerpRender(a) {
  const live =
    (G.mode === 'play' || G.mode === 'den' || G.mode === 'title') && a > 0 && a < 1 && !prefs.noLerp;
  if (!live) return render();
  const saved = [],
    mix = o => {
      if (o.px === undefined || Math.abs(o.x - o.px) > 40 || Math.abs(o.y - o.py) > 40) return;
      saved.push(o, o.x, o.y, o.z);
      o.x = o.px + (o.x - o.px) * a;
      o.y = o.py + (o.y - o.py) * a;
      if (o.pz !== undefined && o.z !== undefined) o.z = o.pz + (o.z - o.pz) * a;
    };
  for (const e of G.ents) mix(e);
  for (const q of G.projs) mix(q);
  const cam = G.camX;
  if (G.pcamX !== undefined && Math.abs(cam - G.pcamX) < 40) G.camX = G.pcamX + (cam - G.pcamX) * a;
  try {
    render();
  } finally {
    G.camX = cam;
    for (let i = 0; i < saved.length; i += 4) {
      saved[i].x = saved[i + 1];
      saved[i].y = saved[i + 2];
      saved[i].z = saved[i + 3];
    }
  }
}
// Adaptive quality: if the device can't hold ~45 fps for a few seconds, drop to a lighter mode (canvas at
// 1x pixel density, half the particles and rain). Settings › Graphics can force High or Low instead.
const PERF = { ema: 16.7, slowT: 0, low: false };
const lowFx = () =>
  (typeof prefs !== 'undefined' && prefs.gfx === 'low') || (prefs.gfx !== 'high' && PERF.low);
function perfSample(dt) {
  if (dt <= 0 || dt > 250 || document.hidden) return;
  PERF.ema += (dt - PERF.ema) * 0.05;
  if (PERF.low || prefs.gfx !== 'auto') return;
  // time-based, so a very slow device (few frames) switches as quickly as a borderline one
  PERF.slowT = PERF.ema > 22 ? PERF.slowT + dt : Math.max(0, PERF.slowT - dt * 2);
  if (PERF.slowT > 2500) {
    PERF.low = true;
    fit();
    if (typeof G !== 'undefined' && G.rain && G.rain.length > 35) G.rain.length = 35;
  }
}
let SCALE = 1,
  VH = H,
  BAND = 0;
// In portrait on touch devices the canvas grows taller than 16:9: the extra rows above the street become
// a sky band that holds a larger, easier-to-read HUD instead of empty page.
// Fill the whole screen (inside the notch-safe area) on any device:
//  - 16:9 or wider: keep the street's height and widen the view, so wide phones and ultrawides see more
//    street instead of black bars (letterboxing only past 3.7:1);
//  - narrower than 16:9: keep 480 wide and add height. On touch screens the bottom band (BOT) sits under the
//    on-screen controls so they never cover the fight; the rest goes to the top band (BAND) for the HUD.
let BOT = 0;
function fit() {
  const stage = document.getElementById('stage');
  if (!stage) return;
  const r = stage.getBoundingClientRect(),
    pad = document.getElementById('pad'),
    padOn = isTouch() && !(document.body.classList.contains && document.body.classList.contains('gamepad')),
    padH = padOn && pad ? pad.getBoundingClientRect().height : 0;
  const app = document.getElementById('app');
  if (app && app.style && app.style.setProperty) app.style.setProperty('--padH', Math.round(padH) + 'px');
  let cw = Math.max(120, Math.floor(r.width)),
    ch = Math.max(68, Math.floor(r.height));
  const a = cw / ch;
  if (a >= W0 / H) {
    W = Math.min(WMAX, Math.round(H * a));
    VH = H;
    BAND = BOT = 0;
    if (W === WMAX) cw = Math.floor((ch * WMAX) / H);
  } else {
    W = W0;
    VH = Math.round(W0 / a);
    const extra = VH - H;
    BOT = padH ? Math.min(extra, Math.ceil(((padH + 6) * W0) / cw)) : 0;
    BAND = extra - BOT;
  }
  cvs.style.width = cw + 'px';
  cvs.style.height = ch + 'px';
  const dpr = lowFx() ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  cvs.width = Math.round(cw * dpr);
  cvs.height = Math.round(ch * dpr);
  SCALE = cvs.width / W;
}
addEventListener('resize', fit);
addEventListener('orientationchange', () => setTimeout(fit, 120));
if (window.visualViewport && visualViewport.addEventListener) visualViewport.addEventListener('resize', fit);
