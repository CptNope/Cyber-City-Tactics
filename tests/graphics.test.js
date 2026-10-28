/* Drawing rules that are easy to break and hard to spot: which way joints bend, health-bar chip damage,
 * glow sprite caching and pose easing. */
require('./harness');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
const vm = require('vm');
const ev = s => vm.runInThisContext(s);

// knees: a leg from hip [2,-20] to foot [3,0], drawn with a forward bend, must put the knee in front (+x)
const knee = ev('joint([2, -20], [3, 0], -6)');
ok(
  knee[0] > 3,
  'a bent standing leg puts the knee in front of the hip and foot (x ' + knee[0].toFixed(1) + ')'
);
const chamber = ev('joint([2, -20], [8, -10], -6)');
ok(chamber[0] > 8 && chamber[1] < -15, 'a chambered kick raises the knee forward and up');
// elbows: an arm reaching forward from the shoulder bends with the elbow below the line
const elbow = ev('joint([2, -34], [19, -33], 3)');
ok(elbow[1] > -33, 'a punching arm keeps its elbow down');

// chip damage
const e = { hp: 100, maxHp: 100 };
G.t = 1000;
ok(A.hpGhost(e) === 100, 'full health: no ghost');
e.hp = 60;
G.t++;
ok(A.hpGhost(e) === 100, 'right after a hit the lost chunk still shows');
for (let i = 0; i < 20; i++) {
  G.t++;
  A.hpGhost(e);
}
ok(e._gh === 100, 'it holds for a moment');
for (let i = 0; i < 80; i++) {
  G.t++;
  A.hpGhost(e);
}
ok(e._gh === 60, 'then drains down to the real value (' + Math.round(e._gh) + ')');
e.hp = 80;
ok(A.hpGhost(e) === 80, 'healing never shows a ghost');

// glow sprites are made once per colour
const a = ev("glowSpr('#ff3d8b')"),
  b = ev("glowSpr('#ff3d8b')");
ok(a === b, 'glow sprites are cached per colour');
ok(
  ev("hexA('#ff3d8b', 0.5)") === 'rgba(255,61,139,0.5)',
  'hex colours convert to rgba for the sprite falloff'
);

// pose easing: the same motion at any number of renders per logic step
const f1 = {},
  f2 = {},
  tgt = n => Array.from({ length: 15 }, () => n);
G.t = 5000;
A.easePose(f1, tgt(0), 0.5);
A.easePose(f2, tgt(0), 0.5);
for (let s = 1; s <= 4; s++) {
  G.t++;
  A.easePose(f1, tgt(10), 0.5);
  for (let r = 0; r < 3; r++) A.easePose(f2, tgt(10), 0.5); // a 240 Hz screen renders 4 times a step
}
ok(
  Math.abs(f1._pose[0] - f2._pose[0]) < 1e-9,
  'pose easing is per logic step, so refresh rate changes nothing'
);
ok(
  f1._pose[0] > 9 && f1._pose[0] < 10,
  'and it eases in rather than snapping (' + f1._pose[0].toFixed(2) + ')'
);
