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
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cvs.width = Math.round(w * dpr);
  cvs.height = Math.round(h * dpr);
  SCALE = cvs.width / W;
}
addEventListener('resize', fit);
