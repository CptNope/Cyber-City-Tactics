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
// Adaptive quality. Slow pixels, not slow code, are what hold weak devices back (drawing a frame is ~1 ms
// of script), so each step down trades away pixels first and looks last. If the device can't hold ~45 fps
// for a couple of seconds it steps down one tier, waits for the change to settle, and checks again:
//   0 full: sharp (up to 2x density), every effect
//   1 sharp off: 1x density, every effect
//   2 light: 1x density, lighter effects, half the particles and rain   (lowFx)
//   3 lean: 3/4 density, light effects                                  (only when even light can't keep up)
// Settings › Graphics: High pins tier 0; Low starts at tier 2 and may still drop to lean. No stepping back up
// within a session, so quality never see-saws.
const PERF = {
  ema: 16.7,
  slowT: 0,
  tier: 0,
  get low() {
    return this.tier >= 2;
  }
};
const gfxTier = () =>
  typeof prefs === 'undefined' || prefs.gfx === 'high' ? 0 : Math.max(PERF.tier, prefs.gfx === 'low' ? 2 : 0);
const lowFx = () => gfxTier() >= 2;
function perfSample(dt) {
  if (dt <= 0 || dt > 250 || document.hidden) return;
  PERF.ema += (dt - PERF.ema) * 0.05;
  // once a second, for the frame-rate counter: frames drawn and logic steps run in that second
  PERF.fr = (PERF.fr || 0) + 1;
  PERF.acc = (PERF.acc || 0) + dt;
  if (PERF.acc >= 1000) {
    const tk = typeof tick === 'number' ? tick : 0;
    PERF.fps = Math.round((PERF.fr * 1000) / PERF.acc);
    PERF.lps = Math.round(((tk - (PERF.tk0 || tk)) * 1000) / PERF.acc);
    PERF.tk0 = tk;
    PERF.fr = PERF.acc = 0;
  }
  const t = gfxTier();
  if (prefs.gfx === 'high' || t >= 3) return;
  // time-based, so a very slow device (few frames) steps down as quickly as a borderline one
  PERF.slowT = PERF.ema > 22 ? PERF.slowT + dt : Math.max(Math.min(0, PERF.slowT), PERF.slowT - dt * 2);
  if (PERF.slowT > (t === 0 ? 1500 : 2500)) {
    PERF.tier = t + 1;
    PERF.slowT = -1000; // give the new tier a second to show in the average before judging it
    fit();
    if (PERF.tier >= 2 && typeof G !== 'undefined' && G.rain && G.rain.length > 35) G.rain.length = 35;
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
  // Pixel budget: a 4K monitor at 2x density would otherwise ask for a 7680x4320 canvas (33 million pixels a
  // frame). Each tier caps the canvas's pixel count as well as its density, so big screens stay smooth.
  const tier = gfxTier(),
    want = tier >= 3 ? 0.75 : tier >= 1 ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    budget = [2560 * 1440, 1920 * 1080, 1600 * 900, 1024 * 576][tier],
    dpr = Math.min(want, Math.sqrt(budget / (cw * ch)));
  cvs.width = Math.round(cw * dpr);
  cvs.height = Math.round(ch * dpr);
  SCALE = cvs.width / W;
}
addEventListener('resize', fit);
addEventListener('orientationchange', () => setTimeout(fit, 120));
if (window.visualViewport && visualViewport.addEventListener) visualViewport.addEventListener('resize', fit);
