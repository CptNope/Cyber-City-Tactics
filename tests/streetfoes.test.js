/* Foes who fight like the runners: grabs you mash out of (or a partner hits you out of), being kneed and
 * thrown when you don't, flurries with a tell you can roll through, and gangers throwing cans and drums. */
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
  P2 = __PL()[1];
const calm = () => {
  G.ents = G.ents.filter(e => e.team !== 1);
  G.props = [];
  for (const q of __PL()) {
    if (q.state !== 'idle') A.setS(q, 'idle');
    q.hp = q.maxHp;
    q.inv = 0;
    q.z = 0;
    q.vz = 0;
  }
  P.x = G.camX + 150;
  P.face = 1;
  P2.x = G.camX + 60;
  P2.y = P.y + 30;
};
const foe = (k, dx) => {
  const e = A.spawnEnemy(k, 1);
  e.x = P.x + dx;
  e.y = P.y;
  e.elite = null;
  e.tgt = P;
  e.face = dx > 0 ? -1 : 1;
  e.cool = 1e9;
  return e;
};
// an orc grabs
calm();
let e = foe('orc', 18);
A.setS(e, 'grabtry');
step(15);
ok(P.state === 'held' && e.state === 'hold' && P.heldBy === e, 'the orc reaches out and grabs the runner');
// mash out
for (let i = 0; i < 7 && P.state === 'held'; i++) {
  tap(i % 2 ? 'KeyJ' : 'KeyK');
  step(2);
}
ok(P.state !== 'held' && e.state === 'hurt' && A.dazed(e), 'mashing breaks free, and the orc reels, dazed');
step(5);
// held too long: kneed, then thrown
calm();
e = foe('orc', 18);
A.setS(e, 'grabtry');
step(15);
const h0 = P.hp;
let knees = 0,
  last = P.hp;
for (let i = 0; i < 120 && P.state === 'held'; i++) {
  step(1);
  if (P.hp < last) knees++;
  last = P.hp;
}
ok(knees >= 2 && P.hp < h0, `don't mash and the knees land (${knees})`);
step(2);
ok(P.state === 'down' || (P.state === 'hurt' && P.z > 0) || P.z > 0, 'then the runner is thrown down');
for (let i = 0; i < 90 && P.state !== 'idle'; i++) step(1);
// a partner's hit frees you
calm();
e = foe('ganger', 16);
A.setS(e, 'grabtry');
step(15);
ok(P.state === 'held', 'a ganger grabs runner 1');
A.hurt(e, 3, 1, { src: P2, melee: true, att: P2 });
step(1);
ok(P.state !== 'held' && !e.holdP, "runner 2's hit makes the ganger let go");
// a roll gets out of the way
calm();
e = foe('orc', 18);
A.setS(e, 'grabtry');
step(8);
A.setS(P, 'roll');
P.rdx = -1;
P.rdy = 0;
step(8);
ok(P.state !== 'held' && e.state === 'grabtry', 'rolling away from the reach: the grab misses');
step(20);
// Razor Mei's flurry
calm();
const mei = foe('blade', 22);
mei.dmg = 4;
A.setS(mei, 'ftell');
step(1);
ok(G.texts.some(t => t.s === '!!') || mei.state === 'ftell', 'a flurry starts with a tell');
step(15);
ok(mei.state === 'mach', 'then Razor Mei unloads a flurry');
const fh = P.hp;
let hits = 0,
  lh = P.hp;
for (let i = 0; i < 40; i++) {
  P.inv = 0;
  step(1);
  if (P.hp < lh) hits++;
  lh = P.hp;
}
ok(hits >= 4 && P.hp < fh, `many hits (${hits})`);
step(10);
ok(P.state === 'down' || P.z > 0 || mei.state !== 'mach', 'and a finisher that knocks you down');
// a Kagemori shadow's kick flurry, cloak off while it does it
calm();
const nj = foe('ninja', 22);
A.setS(nj, 'ftell');
step(16);
ok(nj.state === 'dragon' && !nj.cloaked, 'a shadow drops its cloak for a kick flurry');
// gangers throw props
calm();
const thrower = foe('ganger', 140);
thrower.cool = 0;
G.props.push({ kind: 'crate', x: thrower.x, y: thrower.y, z: 0 });
let lifted = false,
  thrown = false;
for (let i = 0; i < 900 && !thrown; i++) {
  P.inv = 999;
  P.x = thrower.x - 140;
  P.y = thrower.y;
  if (thrower.state === 'windup' || thrower.state === 'grabtry') A.setS(thrower, 'idle');
  step(1);
  if (thrower.holding) lifted = true;
  if (G.projs.some(pr => pr.k === 'prop' && pr.team === 1)) thrown = true;
}
ok(lifted, 'a ganger picks up the crate');
ok(thrown, 'and throws it at you');
// a drum a ganger throws burns runners, not gangers
calm();
const pal = foe('ganger', 30);
pal.cool = 1e9;
P.inv = 0;
const ph = P.hp,
  gh = pal.hp;
A.shatter({ k: 'prop', kind: 'drum', team: 1, x: P.x + 10, y: P.y, z: 2, dmg: 20, life: 1 });
ok(P.hp < ph && pal.hp === gh, "a foe's drum hurts runners and spares its own");
