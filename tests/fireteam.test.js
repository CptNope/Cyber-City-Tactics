/* Kagemori fireteams: a spotter who marks you, a shield who covers the gunner, and a medic who gets the fallen
 * back up once. */
'use strict';
require('./harness');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.tips = false;
G.pendArch = ['samurai', 'runner'];
A.newRun(false);
A.startStage(4);
step(5);
const P = __PL()[0];
const realRandom = Math.random;
const calm = () => {
  // nothing else in the street: no props to knock anyone into, no waves arriving
  G.ents = G.ents.filter(e => e.team !== 1);
  G.props = [];
  G.wave = A.STAGES[4].waves.length;
  G.waveLive = true;
  G.projs = [];
  P.markT = 0;
  P.markBy = null;
  P.hp = P.maxHp;
  P.inv = 0;
};
const team = () => {
  calm();
  const t = A.spawnTeam(1);
  for (const e of t) {
    e.elite = null;
    e.club = null;
    e.mercy = 'rolled';
    e.inv = 0;
  }
  return t;
};

/* ---------- the unit ---------- */
let [sp, sh, gu, md] = team();
ok(
  sp.kind === 'spotter' &&
    sh.kind === 'riot' &&
    gu.kind === 'sec' &&
    md.kind === 'medic' &&
    [sh, gu, md].every(e => e.unit === sp.unit),
  'a fireteam: spotter, shield, gunner and medic, as one unit'
);
const list = A.teamSpawnList(['team', 'drone']);
ok(
  list.length === 5 && list.filter(x => x[1]).length === 4 && list[4][1] === 0,
  'a wave’s "team" becomes four foes with a unit id'
);
ok(A.STAGES[4].waves[0].spawn.includes('team'), 'the Arcology opens with one');
ok(A.BEST.spotter && A.BEST.medic, 'both new foes have bestiary notes');

/* ---------- the spotter's mark ---------- */
sp.x = P.x + 150;
sp.y = P.y;
sp.cool = 0;
for (let i = 0; i < 60 && !A.marked(P); i++) step(1);
ok(A.marked(P) && P.markBy === sp, 'the spotter puts a laser on you');
Math.random = () => 0.99;
const hit = () => {
  P.hp = P.maxHp;
  P.inv = 0;
  A.setS(P, 'idle');
  A.hurt(P, 20, -1, { att: gu });
  return P.maxHp - P.hp;
};
const onMark = hit();
const keepT = P.markT;
P.markT = 0;
const offMark = hit();
P.markT = keepT;
ok(onMark > offMark, `marked, everything hits a quarter harder (${onMark} vs ${offMark})`);
sp.inv = 0;
A.hurt(sp, 9999, 1, { src: P, melee: true });
ok(!A.marked(P), 'drop the spotter and the mark goes with them');
Math.random = realRandom;

/* ---------- the shield ---------- */
[sp, sh, gu, md] = team();
gu.x = P.x + 160;
gu.y = P.y;
gu.cool = 1e9;
sh.x = P.x + 220;
sh.y = P.y;
sh.cool = 1e9;
sp.gone = md.gone = true;
for (let i = 0; i < 300; i++) {
  P.inv = 99;
  step(1);
}
ok(
  sh.x < gu.x && sh.x > P.x,
  `the riot trooper plants itself between you and the gunner (you ${Math.round(P.x)}, shield ${Math.round(sh.x)}, gunner ${Math.round(gu.x)})`
);
ok(sh.face === -1, 'shield toward you');

/* ---------- the medic ---------- */
[sp, sh, gu, md] = team();
for (const e of [sp, sh]) e.gone = true;
gu.x = P.x + 120;
md.x = P.x + 200;
gu.y = md.y = P.y;
gu.cool = md.cool = 1e9;
const kills0 = G.run.kills;
gu.inv = 0;
A.hurt(gu, 9999, 1, { src: P, melee: true });
ok(gu.state === 'dead' && G.run.kills === kills0 + 1, 'the gunner goes down');
let worked = false;
for (let i = 0; i < 400 && gu.state === 'dead'; i++) {
  P.x = Math.min(P.x, gu.x - 100);
  P.inv = 99;
  step(1);
  if (md.healT > 0) worked = true;
}
ok(
  worked && gu.state !== 'dead' && gu.revived && Math.abs(gu.hp - Math.round(gu.maxHp * 0.5)) <= 1,
  'the medic walks over and gets them back up at half health'
);
// once only, and no second payout
const picks0 = G.picks.length;
gu.inv = 0;
A.hurt(gu, 9999, 1, { src: P, melee: true });
ok(
  G.run.kills === kills0 + 1 && G.picks.length === picks0,
  'a revived foe pays out once: no second drops or kill ' +
    [G.run.kills - kills0, G.picks.length - picks0, gu.state, gu.revived]
);
for (let i = 0; i < 120; i++) step(1);
ok(gu.revived === 'twice' && (gu.gone || !G.ents.includes(gu)), 'and stays down the second time');
// a hit on the medic mid-revive starts it over
[sp, sh, gu, md] = team();
for (const e of [sp, sh]) e.gone = true;
gu.x = md.x = P.x + 200;
gu.y = md.y = P.y;
gu.cool = md.cool = 1e9;
gu.inv = 0;
A.hurt(gu, 9999, 1, { src: P, melee: true });
for (let i = 0; i < 40; i++) {
  P.inv = 99;
  step(1);
}
const mid = md.healT;
md.inv = 0;
A.hurt(md, 3, 1, { src: P, melee: true });
step(2);
ok(
  mid > 10 && md.healT < mid,
  'hit the medic while they work and they start over ' + [mid, md.healT, md.state, gu.state]
);
// with no medic, the fallen don't linger
[sp, sh, gu, md] = team();
md.gone = true;
G.ents = G.ents.filter(e => e !== md);
gu.inv = 0;
A.hurt(gu, 9999, 1, { src: P, melee: true });
for (let i = 0; i < 90; i++) step(1);
ok(gu.gone || !G.ents.includes(gu), 'no medic left: the fallen are gone as usual');
calm();
