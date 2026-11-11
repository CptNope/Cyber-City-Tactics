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
  loopErr = 0;
function stepOnce() {
  tick++;
  snapPrev();
  let ran = true;
  // online co-op, friend's side: the host runs the game; this browser glides, draws and sends buttons
  if (netGuest()) {
    netGuestStep();
    for (const s of INP) for (const k in s.pressed) s.pressed[k] = false;
    return;
  }
  if (netHost()) netHostInput();
  NET.inUpd = true;
  if (G.mode === 'play' || G.mode === 'den') {
    feelTick();
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
  NET.inUpd = false;
  if (NET.live) netHostTick();
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
    loopErr = 0; // a clean frame
  } catch (err) {
    // log the first error of a run of them; if every frame fails, stop piling up time and say so on screen
    if (!loopErr) console.error('Cyber City Tactics frame error', err);
    loopErr++;
    acc = 0;
    if (loopErr === 120) showFatal(err);
  }
}
// an error on every frame for two seconds: pause on a card that offers a reload instead of a frozen street
function showFatal(err) {
  try {
    const ov = document.getElementById('ov');
    if (!ov) return;
    ov.hidden = false;
    ov.innerHTML = `<div class="card"><p class="eyebrow">Something broke</p><h2>The game hit an error</h2><p>Your saves are safe. Reloading usually fixes it; if it keeps happening, please report it.</p><p style="color:var(--muted);font-size:12px">${esc(String((err && err.message) || err)).slice(0, 200)}</p><div class="row"><button class="btn" id="errReload">Reload</button></div></div>`;
    const rb = document.getElementById('errReload');
    if (rb && rb.addEventListener) rb.addEventListener('click', () => location.reload());
  } catch (e) {}
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
netFromHash();
last = performance.now();
requestAnimationFrame(frame);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
setTimeout(fit, 300);
pwaRegister();
pwaShortcut();
syncBoot();
