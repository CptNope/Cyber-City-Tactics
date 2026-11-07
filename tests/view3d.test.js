/* The 3D view's plumbing, without a browser: without three.js (as in Node, or a browser with no WebGL 2) the
 * game stays 2D; the street maps to 3D the way the camera assumes; and the 2D figure hands its pose to the 3D
 * puppet. tests/view3d.browser.js checks the real WebGL view in Chromium. */
'use strict';
require('./harness');
const fs = require('fs');
const path = require('path');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.tips = false;
G.pendArch = ['samurai', 'runner'];
A.newRun(false);
A.startStage(0);
step(20);

/* ---------- falling back ---------- */
ok(typeof THREE === 'undefined' && A.r3On() === false, 'no three.js: the street is drawn in 2D');
step(2);
ok(A.R3.on === false && G.mode === 'play', 'and the game runs as before');
ok(A.prefs.view === '3d', '3D is the default view where the device can draw it');

/* ---------- the mapping ---------- */
ok(
  A.zOf(A.FY0) === 0 && A.zOf(A.FY1) > 0,
  'the far edge of the street is depth 0, the near edge toward the camera'
);
ok(
  Math.abs(Math.tan(A.TILT) * A.DZ - 1) < 1e-9,
  'the camera looks down so a step in depth and a step in height move the same distance on screen'
);

/* ---------- the pose hand-off ---------- */
const P = __PL()[0];
A.setS(P, 'walk');
for (let i = 0; i < 6; i++) {
  P.walk = (P.walk || 0) + 3;
  A.drawFig(P);
}
ok(
  Array.isArray(P._pose) && P._pose.length === 15 && P._pose.every(Number.isFinite),
  'drawing a fighter leaves its eased pose for the puppet: hips, shoulders, feet, hands, knees, lean'
);
ok(P._rig && P._rig.style === 'runner' && 'gun' in P._rig && 'glow' in P._rig, 'and how to dress it');
A.setS(P, 'down');
A.drawFig(P);
ok(P._rig.sq === null, 'no squash and stretch while lying down');

/* ---------- the vendored library ---------- */
const ROOT = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const vend = fs.readFileSync(path.join(ROOT, 'vendor/three.min.js'), 'utf8');
ok(
  index.indexOf('vendor/three.min.js') > 0 && index.indexOf('vendor/three.min.js') < index.indexOf('r3d.js'),
  'three.js loads from the site itself, before the 3D view'
);
ok(/three\.js r\d+/.test(vend.slice(0, 300)) && /MIT License/.test(vend.slice(0, 3000)), 'with its licence');
const used = new Set();
for (const f of ['r3d.js', 'r3figs.js', 'r3world.js'])
  for (const m of fs
    .readFileSync(path.join(ROOT, 'src/js/render', f), 'utf8')
    .matchAll(/\b(?:THREE|T)\.([A-Z][A-Za-z0-9_]*)/g))
    used.add(m[1]);
const listed = new Set(
  vend
    .slice(0, 3000)
    .match(/bundled for[^\n]*\n \* ([^\n]+)/)[1]
    .split(', ')
);
const missing = [...used].filter(n => !listed.has(n));
ok(
  !missing.length,
  'every part of three.js the renderer uses is in the bundle' +
    (missing.length ? ' (run tools/vendor-three.mjs): ' + missing : '')
);
ok(
  !/\beval\(|new Function\(/.test(vend),
  'and it needs no eval, so the Content Security Policy stays strict'
);
