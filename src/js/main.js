/* Cyber City Tactics · src/js/main.js
 * The fixed-timestep game loop and boot.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ================= loop =================
 * Fixed timestep with interpolated rendering:
 *  - the game logic always steps at exactly 60 Hz (STEP), however fast or slow the screen refreshes, so
 *    speed, physics and timings are identical on a 30 Hz phone and a 144 Hz monitor;
 *  - frames between two logic steps draw positions blended between the last two steps (lerpRender), so
 *    motion stays smooth on 90/120/144 Hz screens instead of repeating frames;
 *  - after a stall (a background tab, a GC pause, a slow phone) at most MAX_STEPS steps catch up, and the
 *    rest of the backlog is dropped, so the game never fast-forwards or spirals;
 *  - an error in one frame is reported once and the loop keeps running.
 */
const STEP = 1000 / 60,
  MAX_STEPS = 8; // up to 133 ms of catch-up per frame: full speed down to about 8 fps
let last = performance.now(),
  acc = 0,
  tick = 0,
  loopErr = false;
function stepOnce() {
  tick++;
  snapPrev();
  let ran = true;
  if (G.mode === 'play' || G.mode === 'den') {
    if (G.stop > 0) {
      G.stop--;
      ran = false;
    } else if (G.slow > 0) {
      G.slow--;
      if (tick % 3 === 0) update();
      else ran = false;
    } else {
      update();
      if (tick % 4 === 0 && modOn('turbo') && G.mode === 'play') update();
    }
  } else if (G.mode === 'title') attractStep();
  else if (G.mode === 'hack') hackStep();
  // keep presses made during hit-stop or slow-mo frames until a frame actually processes them
  if (ran) for (const s of INP) for (const k in s.pressed) s.pressed[k] = false;
}
function frame(now) {
  requestAnimationFrame(frame); // first, so one bad frame can never stop the game
  try {
    const dt = Math.max(0, now - last);
    last = now;
    perfSample(dt);
    acc += Math.min(dt, 250);
    pollPads();
    let n = 0;
    while (acc >= STEP && n < MAX_STEPS) {
      stepOnce();
      acc -= STEP;
      n++;
    }
    if (acc >= STEP) acc = acc % STEP; // drop the backlog instead of fast-forwarding
    lerpRender(acc / STEP);
    if (tick % 6 === 0) updateTouchUI();
  } catch (err) {
    if (!loopErr) {
      loopErr = true;
      console.error('Cyber City Tactics frame error', err);
    }
  }
}
// Coming back to the tab: start timing fresh so there's no catch-up burst.
document.addEventListener('visibilitychange', () => {
  last = performance.now();
  acc = 0;
});
applyPrefs();
fit();
attract();
setMode('title');
musicPlay('title');
last = performance.now();
requestAnimationFrame(frame);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
setTimeout(fit, 300);
pwaRegister();
pwaShortcut();
