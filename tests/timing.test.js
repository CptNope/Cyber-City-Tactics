/* The frame loop: same game speed at any refresh rate, no catch-up burst after a stall, interpolated drawing
 * that never changes game state, recovery from a frame error, and adaptive graphics quality. */
require('./harness');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
// run the real loop for `secs` seconds of wall time at `hz` frames per second
const runAt = (hz, secs) => {
  const t0 = G.t;
  for (let i = 0; i < Math.round(hz * secs); i++) {
    G.stop = 0;
    T += 1000 / hz;
    raf(T);
  }
  return G.t - t0;
};
click('pick');
click('diff:1');
G.pendMuts = [];
click('new');
click('go');
for (let i = 0; i < 70; i++) {
  T += 1000 / 60;
  raf(T);
}
G.wave = 99;
G.waveLive = false;
G.ents = G.ents.filter(e => e.team !== 1);
ok(G.mode === 'play', 'in play');

for (const hz of [30, 60, 75, 90, 120, 144, 240]) {
  const n = runAt(hz, 2);
  ok(Math.abs(n - 120) <= 2, `${hz} Hz: 2 s of play = ${n} logic steps (120 expected)`);
}
// a 45 fps phone with jittery frame times
let t0 = G.t;
for (let i = 0; i < 90; i++) {
  T += 1000 / 45 + (i % 2 ? 6 : -6);
  raf(T);
}
ok(Math.abs(G.t - t0 - 120) <= 2, 'jittery 45 fps: still 60 steps a second (' + (G.t - t0) + ' in 2 s)');

// a long stall (tab in the background, a GC pause): a few steps at most, then normal speed
t0 = G.t;
T += 5000;
raf(T);
ok(G.t - t0 <= 8, '5 s stall catches up at most 8 steps (' + (G.t - t0) + ')');
ok(Math.abs(runAt(60, 1) - 60) <= 1, 'normal speed right after the stall');

// interpolation draws in-between positions without changing the real ones
const P = __PL()[0];
P.px = P.x - 6;
P.py = P.y;
P.pz = P.z;
const x = P.x;
const vmEval = require('vm');
vmEval.runInThisContext(
  'var __origRender = render; render = function () { __seen = PL[0].x; __origRender(); };'
);
global.__seen = null;
A.lerpRender(0.5);
ok(Math.abs(__seen - (x - 3)) < 0.01, 'interpolated frame draws the runner half-way (' + __seen + ')');
ok(P.x === x, 'the real position is untouched after drawing');
P.px = P.x - 300;
A.lerpRender(0.5);
ok(__seen === x, 'a big jump (respawn, door) snaps instead of sliding');
vmEval.runInThisContext('render = __origRender;');

// one bad frame doesn't stop the game
vmEval.runInThisContext(
  'var __r2 = render; var __boom = 1; render = function () { if (__boom) { __boom = 0; throw new Error("test"); } __r2(); };'
);
const ce = console.error;
console.error = () => {};
t0 = G.t;
runAt(60, 1);
console.error = ce;
vmEval.runInThisContext('render = __r2;');
ok(G.t - t0 >= 58, 'loop keeps running after a frame error (' + (G.t - t0) + ' steps)');

// adaptive quality
A.prefs.gfx = 'auto';
Object.assign(A.PERF, { tier: 0, slowT: 0, ema: 16.7 });
ok(!A.lowFx(), 'starts in full quality');
for (let i = 0; i < 60; i++) A.perfSample(40);
ok(A.PERF.tier === 1 && !A.lowFx(), 'a slow device first gives up pixel density, keeping every effect');
for (let i = 0; i < 100; i++) A.perfSample(40);
ok(A.PERF.tier === 2 && A.PERF.low && A.lowFx(), 'still slow (25 fps): steps down to light mode');
for (let i = 0; i < 100; i++) A.perfSample(40);
ok(A.PERF.tier === 3, 'still slow in light mode: lean (3/4 resolution) as a last resort');
for (let i = 0; i < 400; i++) A.perfSample(40);
ok(A.PERF.tier === 3, 'and never lower than lean');
A.prefs.gfx = 'high';
ok(!A.lowFx(), 'Graphics: High overrides it');
A.prefs.gfx = 'low';
ok(A.lowFx(), 'Graphics: Low forces it');
A.prefs.gfx = 'auto';
for (let i = 0; i < 400; i++)
  G.parts.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 99, c: '#fff', sz: 1 });
runAt(60, 0.1);
ok(G.parts.length <= 90, 'light mode caps particles (' + G.parts.length + ')');
click('settings');
ok(/Graphics/.test(els.ov._h) && /data-a="pref:gfx:low"/.test(els.ov._h), 'Graphics setting listed');

// pixel budget: big screens never get a canvas bigger than the tier allows
{
  const stage = document.getElementById('stage'),
    cv = document.getElementById('game'),
    r0 = stage.getBoundingClientRect;
  stage.getBoundingClientRect = () => ({ width: 3840, height: 2160, left: 0, top: 0 });
  vmEval.runInThisContext('devicePixelRatio = 2');
  A.prefs.gfx = 'high';
  A.fit();
  ok(
    cv.width * cv.height <= 2560 * 1440 * 1.01,
    `a 4K screen at 2x density draws ${cv.width}×${cv.height}, not 7680×4320`
  );
  A.prefs.gfx = 'low';
  A.fit();
  ok(cv.width * cv.height <= 1600 * 900 * 1.01, `Graphics: Low on that screen: ${cv.width}×${cv.height}`);
  stage.getBoundingClientRect = r0;
  vmEval.runInThisContext('devicePixelRatio = 1');
  A.prefs.gfx = 'auto';
  A.fit();
}
ok(
  typeof A.drawFpsMeter === 'function' && A.prefs.fps === false,
  'frame rate counter available, off by default'
);
