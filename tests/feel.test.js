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
  P.D.crit = -1; // no random crits: a crit counts as a heavy blow, which would blur jab against heavy
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

/* ---------- round 2: how foes react ---------- */
// a jab: a flinch on the spot; a heavy blow: a longer stagger and a step back
fresh();
foe(9999);
const j1 = foe(9999);
A.hurt(j1, 2, 1, { src: P, melee: true });
ok(j1.state === 'hurt' && !j1.stagger && !j1.slide, 'a jab: a flinch on the spot');
fresh();
foe(9999);
const h1 = foe(9999),
  hx = h1.x;
A.hurt(h1, 2, 1, { src: P, melee: true, kb: 8 });
ok(h1.stagger && h1.slide > 0, 'a heavy blow: a stagger, sliding back the way it was hit');
step(18);
ok(h1.state === 'hurt' && h1.x > hx, 'still reeling after a jab would be over, a step further back');
step(10);
ok(h1.state !== 'hurt', 'then back on their feet');

// an uppercut launches: high, straight up, juggleable at once
fresh();
foe(9999);
const u1 = foe(9999);
P.state = 'upper';
A.hurt(u1, 4, 1, { src: P, melee: true, kd: true });
P.state = 'idle';
ok(
  u1.state === 'down' && u1.vz >= 5 && Math.abs(u1.vx) < 1.5 && u1.bounced,
  'an uppercut launches them high'
);
ok(
  G.texts.some(t => t.s === 'LAUNCH!'),
  'with a LAUNCH! call'
);
step(10);
ok(A.canJuggle(u1, P), 'and they can be juggled in the air without a wall');

// slammed down hard, they bounce once off the street
fresh();
foe(9999);
const g1 = foe(9999);
A.setS(g1, 'down');
g1.z = 12;
g1.vz = -6;
g1.gbT = undefined;
step(2);
ok(g1.gbT !== undefined && g1.vz > 0, 'a foe slammed down hard bounces off the street');
const vz1 = g1.vz;
step(1); // off the street again
for (let i = 0; i < 40 && g1.z > 0; i++) step(1);
ok(vz1 > 0 && g1.z === 0 && g1.vz === 0, 'once, then they stay down');

// a boss knockout is a moment: bars, a push-in, a held beat
fresh();
const boss = A.spawnEnemy('troll', 1);
boss.x = P.x + 30;
boss.y = P.y;
boss.hp = 5;
boss.inv = 0;
A.hurt(boss, 999, 1, { src: P, melee: true });
ok(G.ko && G.ko.x === boss.x, 'a boss knockout starts the moment, on the boss');
const ko0 = A.koAmt();
for (let i = 0; i < 20; i++) A.feelTick();
ok(ko0 < 0.2 && A.koAmt() === 1, 'the bars ease in and hold');
for (let i = 0; i < 100; i++) A.feelTick();
ok(!G.ko && A.koAmt() === 0, 'then the moment ends');
