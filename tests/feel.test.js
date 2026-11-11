/* How a hit feels: hitstop and the camera's jolt scale with the blow, a combo climbs and gets called out,
 * the last foe of a fight falls in slow motion, and none of it reaches the view under reduced motion. */
'use strict';
require('./harness');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.tips = false;
A.prefs.story = false;
G.pendArch = ['runner'];
A.newRun(false);
A.startStage(0);
step(30);
const P = __PL()[0];
const foe = hp => {
  const e = A.spawnEnemy('ganger', 1);
  e.x = P.x + 30;
  e.y = P.y;
  e.elite = null;
  e.cool = 1e9;
  e.inv = 0;
  e.hp = e.maxHp = hp;
  return e;
};
const fresh = () => {
  G.ents = G.ents.filter(e => e.team !== 1);
  G.stop = G.slow = G.kick = G.punch = 0;
  G.combo = 0;
  G.texts = [];
};

// a jab: a short freeze and a small jolt the way the blow travelled
fresh();
const spare = foe(9999);
const e1 = foe(9999);
A.hurt(e1, 3, 1, { src: P, melee: true });
const jab = { stop: G.stop, kick: G.kick, punch: G.punch };
ok(
  jab.stop === 3 && jab.kick > 0 && !jab.punch,
  `a jab holds 3 frames and jolts the way it went (${jab.kick})`
);
G.kick = 0;
A.hurt(e1, 3, -1, { src: P, melee: true });
ok(G.kick < 0, 'a blow the other way jolts the other way');

// a heavy blow: longer, and the camera leans in
fresh();
const e2 = foe(9999);
A.hurt(e2, 3, 1, { src: P, melee: true, big: true });
ok(
  G.stop === 5 && Math.abs(G.kick) > Math.abs(jab.kick) && G.punch > 0,
  'a heavy blow holds longer, jolts harder, leans in'
);

// the blow that drops them: the longest freeze and a low thump
fresh();
foe(9999);
const e3 = foe(5);
A.hurt(e3, 50, 1, { src: P, melee: true });
ok(G.stop === 8 && G.punch >= 0.9, `a knockout blow holds 8 frames (${G.stop})`);
ok(G.slow === 0, 'with others still standing, no slow motion');

// the last one standing falls in slow motion
fresh();
const last = foe(5);
A.hurt(last, 50, 1, { src: P, melee: true });
ok(G.slow >= 24 && G.punchX === last.x, 'the last foe of a fight falls in slow motion, the camera on them');

// the jolt holds through the freeze, then springs back
fresh();
const e4 = foe(9999);
foe(9999);
A.hurt(e4, 3, 1, { src: P, melee: true, big: true });
const k0 = G.kick;
A.feelTick();
ok(G.kick === k0, 'the jolt holds while the frame is frozen');
G.stop = 0;
for (let i = 0; i < 20; i++) A.feelTick();
ok(G.kick === 0 && G.punch < 0.1, 'then springs back');

// a combo gets called out at 10, 25, 50 and 100
fresh();
const bag = foe(1e6);
foe(1e6);
const hit = () => {
  bag.inv = 0;
  bag.state = 'idle';
  A.hurt(bag, 1, 1, { src: P, melee: true });
};
for (let i = 0; i < 10; i++) hit();
const call = G.texts.find(t => t.beat);
ok(call && call.s === 'SLICK!' && call.beat === 1, 'ten hits: SLICK!');
for (let i = 0; i < 15; i++) hit();
ok(
  G.texts.some(t => t.beat === 2 && t.s === 'SAVAGE!'),
  'twenty-five: SAVAGE!'
);
ok(
  A.textPx({ beat: 2, life: 60 }) > A.textPx({ beat: 2, life: 30 }),
  'a callout bursts in large and settles'
);

// foes hitting foes (a thrown body, crossfire) freeze the frame but don't swing the camera
fresh();
const a = foe(9999);
foe(9999);
A.hurt(a, 3, 1, {});
ok(G.kick === 0, 'a foe hit by no runner leaves the camera alone');
ok(spare.hp > 0, 'done');
