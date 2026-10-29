/* Double Dragon grabs: punch only punches (jab, jab, hook), kick only knees (knee, knee, knee lift), a pushed
 * direction plus either throws that way (forward, over the shoulder, into another lane), and jump takes them
 * up: a direction in the air throws, and landing without one body slams or, for street samurai, adepts and
 * anyone with the Pile driver rig, pile drives. */
'use strict';
require('./harness');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.seen.trainoffer = true;
A.prefs.tips = false;
G.pendArch = ['runner', 'samurai'];
A.newRun(true);
A.startStage(0);
G.wave = 99;
step(30);
const P = __PL()[0],
  Q = __PL()[1];
const calm = () => {
  G.ents = G.ents.filter(e => e.team !== 1);
  for (const q of [P, Q]) {
    for (let i = 0; i < 80 && q.state !== 'idle'; i++) step(1);
    q.hp = q.maxHp;
    q.inv = 999;
    q.z = 0;
    q.vz = 0;
    q.face = 1;
  }
  P.x = G.camX + 120;
  P.y = 220;
  Q.x = G.camX + 300;
  Q.y = 245;
};
const foe = (who, dx, dy) => {
  const e = A.spawnEnemy('ganger', 1);
  e.x = who.x + dx;
  e.y = who.y + (dy || 0);
  e.elite = null;
  e.hp = e.maxHp = 999;
  e.cool = e.coolMul = 1e9;
  e.dmg = 0;
  A.setS(e, 'idle');
  return e;
};
const grab = (who, keyR) => {
  const e = foe(who, 18);
  e.dazeUntil = G.t + 300;
  key(keyR, true);
  for (let i = 0; i < 30 && who.state !== 'grab'; i++) step(1);
  key(keyR, false);
  return e;
};
// punches only punch: jab, jab, hook
calm();
let e = grab(P, 'KeyD');
ok(P.state === 'grab' && P.grab === e, 'grabbed (walk into a dazed foe)');
let h = e.hp;
tap('KeyJ');
step(2);
ok(e.hp < h && P.state === 'grab' && P.grabHit === 'punch' && P.gp === 1, 'punch: a jab');
tap('KeyJ');
step(2);
ok(P.state === 'grab' && P.gp === 2, 'again: another');
tap('KeyJ');
step(1);
ok(P.state !== 'grab' && e.state === 'down' && !e.thrown, 'third: a hook that knocks them down');
// kicks only use the legs: knee, knee, knee lift
calm();
e = grab(P, 'KeyD');
h = e.hp;
tap('KeyK');
step(2);
ok(e.hp < h && P.state === 'grab' && P.grabHit === 'knee' && !e.thrown, 'kick: a knee, not a throw');
tap('KeyK');
step(2);
tap('KeyK');
step(1);
ok(P.state !== 'grab' && e.state === 'down' && e.vz > 3, 'third: a knee lift that launches them');
// the direction you walked in with doesn't throw by itself
calm();
e = foe(P, 18);
e.dazeUntil = G.t + 300;
key('KeyD', true);
for (let i = 0; i < 30 && P.state !== 'grab'; i++) step(1);
tap('KeyJ'); // still holding the walk-in direction
step(2);
key('KeyD', false);
step(1);
ok(
  P.state === 'grab' && !e.thrown && P.gp === 1,
  'still holding the way you walked in: a punch, not a throw'
);
// a direction plus punch or kick throws that way
const hb = e.hp;
key('KeyD', true);
tap('KeyJ');
step(1);
key('KeyD', false);
ok(e.thrown === P && e.vx > 0, 'push forward and punch: thrown forward');
for (let i = 0; i < 60 && e.thrown; i++) step(1);
const fwd = hb - e.hp;
calm();
e = grab(P, 'KeyD');
step(1);
key('KeyA', true);
tap('KeyK');
step(1);
key('KeyA', false);
ok(
  e.thrown === P && e.vx < 0 && e.x < P.x + 2 && P.face === -1,
  'push back and kick: over the shoulder, behind you'
);
for (let i = 0; i < 60 && e.thrown; i++) step(1);
const back = 999 - e.hp;
ok(back > fwd, `and it lands harder (${back} vs ${fwd})`);
calm();
e = grab(P, 'KeyD');
step(1);
const y0 = e.y;
key('KeyW', true);
tap('KeyJ');
step(1);
key('KeyW', false);
for (let i = 0; i < 60 && e.thrown; i++) step(1);
ok(e.y < y0 - 10, `push up and punch: thrown into the far lane (y ${Math.round(y0)} → ${Math.round(e.y)})`);
// jump: up with them; a direction in the air throws that way
calm();
e = grab(P, 'KeyD');
step(1);
tap('Space');
step(2);
ok(P.state === 'jthrow' && P.z > 0 && P.grab === e, 'jump with no direction: up with them');
key('KeyA', true);
step(2);
key('KeyA', false);
ok(e.thrown === P && e.vx < 0, 'push back in the air: thrown behind from the top');
for (let i = 0; i < 60 && e.thrown; i++) step(1);
// no direction in the air, no pile driver: a body slam on landing
calm();
e = grab(P, 'KeyD');
step(1);
tap('Space');
let slam = false;
for (let i = 0; i < 60 && !slam; i++) {
  step(1);
  if (P.state !== 'jthrow') slam = true;
}
const bs = 999 - e.hp;
ok(slam && e.state === 'down' && bs > fwd, `land with no direction: a body slam (${bs})`);
// the pile driver: street samurai know it
calm();
e = grab(Q, 'ArrowRight');
ok(Q.state === 'grab', 'runner 2 (street samurai) grabs one');
step(1);
const near = foe(Q, -30);
tap('Slash');
step(2);
ok(Q.state === 'pdrive' && e.flip && e.z > Q.z, 'jump: up with them, upside down overhead');
let landed = false;
for (let i = 0; i < 60 && !landed; i++) {
  step(1);
  if (Q.state !== 'pdrive') landed = true;
}
const pd = 999 - e.hp;
ok(
  landed && e.state === 'down' && !e.flip && pd > bs,
  `land with no direction: a pile driver (${pd} damage)`
);
ok(near.state === 'down' || near.hp < 999, 'with a shockwave for anyone close');
// a samurai can still throw from the air instead
calm();
e = grab(Q, 'ArrowRight');
step(1);
tap('Slash');
step(3);
key('ArrowRight', true);
step(2);
key('ArrowRight', false);
ok(e.thrown === Q && e.vx > 0 && !e.flip, 'push forward in the air: a throw instead of the pile driver');
// and the rig teaches everyone else
ok(!A.canPile(P), "a plain runner can't pile drive");
P.tech = Object.assign({}, P.tech, { pile: 1 });
ok(A.canPile(P), 'with the Pile driver rig they can');
G.sheetIdx = 1;
ok(/Pile driver rig[\s\S]*?Known/.test(A.techHtml()), 'Doc shows it as Known for the samurai');
G.sheetIdx = 0;
