/* Double Dragon grabs: punch strings a gut punch, a knee and a knee lift; kick throws in the held direction
 * (forward, over the shoulder, into another lane); jump throws on the way up, and street samurai, adepts
 * and anyone with the Pile driver rig pile drive instead. */
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
// the punch string
calm();
let e = grab(P, 'KeyD');
ok(P.state === 'grab' && P.grab === e, 'grabbed (walk into a dazed foe)');
let h = e.hp;
tap('KeyJ');
step(2);
ok(e.hp < h && P.state === 'grab' && P.knees === 1, 'punch: a gut punch');
h = e.hp;
tap('KeyJ');
step(2);
ok(e.hp < h && P.state === 'grab' && P.knees === 2, 'again: a knee');
tap('KeyJ');
step(1);
ok(P.state !== 'grab' && e.state === 'down' && e.vz > 3, 'third: a knee lift that launches them');
// the throws
calm();
e = grab(P, 'KeyD');
tap('KeyK');
step(1);
ok(e.thrown === P && e.vx > 0, 'kick on its own: thrown forward');
for (let i = 0; i < 60 && e.thrown; i++) step(1);
const fwd = 999 - e.hp;
calm();
e = grab(P, 'KeyD');
key('KeyA', true);
tap('KeyK');
step(1);
key('KeyA', false);
ok(
  e.thrown === P && e.vx < 0 && e.x < P.x + 2 && P.face === -1,
  'hold back and kick: over the shoulder, behind you'
);
for (let i = 0; i < 60 && e.thrown; i++) step(1);
const back = 999 - e.hp;
ok(back > fwd, `and it lands harder (${back} vs ${fwd})`);
calm();
e = grab(P, 'KeyD');
const y0 = e.y;
key('KeyW', true);
tap('KeyK');
step(1);
key('KeyW', false);
for (let i = 0; i < 60 && e.thrown; i++) step(1);
ok(e.y < y0 - 10, `hold up and kick: thrown into the far lane (y ${Math.round(y0)} → ${Math.round(e.y)})`);
// the jump throw (runners, not samurai)
calm();
e = grab(P, 'KeyD');
tap('Space');
step(1);
ok(P.state === 'jthrow' && P.z > 0, 'jump: up with them');
for (let i = 0; i < 40 && !e.thrown; i++) step(1);
ok(e.thrown === P && e.vx > 0, 'and hurled down ahead at the top');
for (let i = 0; i < 60 && e.thrown; i++) step(1);
const jt = 999 - e.hp;
ok(jt > fwd, `a jump throw lands harder than a plain one (${jt})`);
// the pile driver: street samurai know it
calm();
e = grab(Q, 'ArrowRight');
ok(Q.state === 'grab', 'runner 2 (street samurai) grabs one');
const near = foe(Q, -30);
tap('Slash');
step(2);
ok(Q.state === 'pdrive' && e.flip && e.z > Q.z, 'jump: a pile driver, the foe upside down overhead');
let landed = false;
for (let i = 0; i < 60 && !landed; i++) {
  step(1);
  if (Q.state !== 'pdrive') landed = true;
}
const pd = 999 - e.hp;
ok(landed && e.state === 'down' && !e.flip && pd > jt, `head-first into the street (${pd} damage)`);
ok(near.state === 'down' || near.hp < 999, 'with a shockwave for anyone close');
// and the rig teaches everyone else
ok(!A.canPile(P), "a plain runner can't pile drive");
P.tech = Object.assign({}, P.tech, { pile: 1 });
ok(A.canPile(P), 'with the Pile driver rig they can');
G.sheetIdx = 1;
ok(/Pile driver rig[\s\S]*?Known/.test(A.techHtml()), 'Doc shows it as Known for the samurai');
G.sheetIdx = 0;
