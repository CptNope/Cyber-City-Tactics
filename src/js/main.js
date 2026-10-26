/* Cyber City Tactics · src/js/main.js
 * The fixed-timestep game loop and boot.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ================= loop ================= */
let last = performance.now(),
  acc = 0,
  tick = 0;
function frame(now) {
  acc += Math.min(100, now - last);
  last = now;
  pollPads();
  while (acc >= 1000 / 60) {
    tick++;
    let ran = true;
    if (G.mode === 'play' || G.mode === 'den') {
      if (G.stop > 0) {
        G.stop--;
        ran = false;
      } else if (G.slow > 0) {
        G.slow--;
        if (tick % 3 === 0) update();
        else ran = false;
      } else update();
    } else if (G.mode === 'title') attractStep();
    else if (G.mode === 'hack') hackStep();
    // keep presses made during hit-stop or slow-mo frames until a frame actually processes them
    if (ran) for (const s of INP) for (const k in s.pressed) s.pressed[k] = false;
    acc -= 1000 / 60;
  }
  render();
  if (tick % 6 === 0) updateTouchUI();
  requestAnimationFrame(frame);
}
applyPrefs();
fit();
attract();
setMode('title');
musicPlay('title');
requestAnimationFrame(frame);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
setTimeout(fit, 300);
pwaRegister();
pwaShortcut();
