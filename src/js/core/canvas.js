/* Cyber City Tactics · src/js/core/canvas.js
 * Canvas, logical resolution and responsive fitting. W×H is the logical street size; in portrait the canvas
 * grows taller (VH) and the extra sky band (BAND) holds the HUD.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
const W = 480,
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
function fit() {
  const r = document.getElementById('stage').getBoundingClientRect();
  const portrait = isTouch() && r.height > r.width * 0.8;
  const hint = document.getElementById('rotHint');
  const hintH = portrait && hint && !hint.hidden ? 56 : portrait ? 10 : 0;
  VH = portrait ? clamp(Math.round((W * (r.height - hintH)) / r.width), H, 400) : H;
  BAND = VH - H;
  let w = r.width,
    h = (w * VH) / W;
  if (h > r.height) {
    h = r.height;
    w = (h * W) / VH;
  }
  w = Math.max(120, Math.floor(w));
  h = Math.max(68, Math.floor(h));
  cvs.style.width = w + 'px';
  cvs.style.height = h + 'px';
  const dpr = lowFx() ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  cvs.width = Math.round(w * dpr);
  cvs.height = Math.round(h * dpr);
  SCALE = cvs.width / W;
}
addEventListener('resize', fit);
addEventListener('orientationchange', () => setTimeout(fit, 120));
if (window.visualViewport && visualViewport.addEventListener) visualViewport.addEventListener('resize', fit);
