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

// individual looks: same enemy type, different people; stats and gang colour untouched
const looks = [];
for (let i = 0; i < 12; i++) {
  const e = { kind: 'ganger', d: A.DEF.ganger };
  A.makeLook(e);
  looks.push(e);
}
const coats = new Set(looks.map(e => e.pal.coat)),
  skins = new Set(looks.map(e => e.pal.skin));
ok(
  coats.size >= 6 && skins.size >= 6,
  `a dozen gangers wear ${coats.size} coats and have ${skins.size} skin tones`
);
ok(looks.some(e => e.extra) && looks.some(e => !e.extra), "some carry an accessory, some don't");
ok(
  looks.every(e => e.pal.acc === A.DEF.ganger.pal.acc),
  'the gang colour never changes, so you can still tell crews apart'
);
ok(
  looks.every(e => e.build[0] >= 0.92 && e.build[0] <= 1.08),
  'builds vary only a little (drawn only, hitboxes unchanged)'
);
ok(A.DEF.ganger.pal.coat === '#3d2f52', 'the shared enemy definition is never modified');
const rs = Math.random;
let calls = 0;
Math.random = () => (calls++, rs());
A.makeLook({ kind: 'orc', d: A.DEF.orc });
Math.random = rs;
ok(calls === 0, 'looks never use Math.random, so seeded runs replay identically');
const boss = { kind: 'troll', d: Object.assign({}, A.DEF.troll, { boss: true }) };
A.makeLook(boss);
ok(!boss.extra && !boss.build, 'bosses keep their signature look');

// elites: each modifier has its own look, and the hits that matter leave a visual stamp
{
  click('pick');
  click('diff:1');
  click('new');
  click('go');
  const mk = k => {
    const e = A.spawnEnemy('ganger', 1);
    e.elite = k;
    e.inv = 0;
    return e;
  };
  const ar = mk('armored'),
    wd = mk('warded');
  A.hurt(ar, 10, 1, { bullet: true });
  ok(ar.pingT === G.t, 'bullets spark off an armored elite');
  A.hurt(wd, 10, 1, { magic: true });
  ok(wd.wardT === G.t, 'a warded elite ripples when it shrugs off a spell');
  let threw = null;
  try {
    for (const k of ['armored', 'berserk', 'warded', 'vampiric']) {
      const e = mk(k);
      e.drainT = G.t;
      e.drainX = e.x;
      e.drainY = e.y;
      A.drawAura(e);
      A.drawFig(e);
      A.drawEliteFront(e);
    }
  } catch (err) {
    threw = err;
  }
  ok(!threw, 'every elite look draws cleanly' + (threw ? ': ' + threw.message : ''));
}

// hit reactions and deaths: the hit decides how it looks
{
  const mk = () => {
    const e = A.spawnEnemy('ganger', 1);
    e.elite = null;
    e.inv = 0;
    e.hp = 999;
    return e;
  };
  const g = mk();
  A.hurt(g, 5, 1, { bullet: true });
  ok(g.react === 'gun', 'a bullet hit jolts');
  const h = mk();
  A.hurt(h, 5, 1, { big: true, kd: true, kb: 10 });
  ok(h.react === 'spin', 'a heavy blow spins them');
  const f = mk();
  A.hurt(f, 5, 1, { col: '#ff6a3d', big: true });
  ok(f.elem === 'fire', 'fire hits are remembered for a burning death');
  const j = mk();
  j.hp = 3;
  A.hurt(j, 10, 1, { melee: true });
  ok(j.state === 'dead' && j.vz <= 1.4 && j.react === 'light', 'a finishing jab drops them where they stand');
  const k = mk();
  k.hp = 3;
  A.hurt(k, 10, 1, { big: true, kd: true, kb: 10 });
  ok(k.state === 'dead' && k.vz > 3, 'a finishing heavy blow sends them flying');
  let threw = null;
  try {
    for (const el of [null, 'fire', 'shock', 'magic'])
      for (const rk of ['light', 'gun', 'spin', 'launch']) {
        const e = mk();
        e.react = rk;
        e.elem = el;
        for (const st of ['hurt', 'down', 'dead']) {
          A.setS(e, st);
          for (const z of [0, 12]) {
            e.z = z;
            for (const tt of [2, 30, 50]) {
              e.t = tt;
              A.drawFig(e);
            }
          }
        }
      }
  } catch (err) {
    threw = err;
  }
  ok(!threw, 'every reaction and death draws cleanly' + (threw ? ': ' + threw.message : ''));
}
