/* River City street fights: street weapons (pick up, swing, wear out, throw, drop), foes who carry and fetch
 * them, wall bounces and juggles, beaten foes who beg or run, and boss taunts. */
'use strict';
require('./harness');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.tips = false;
G.pendArch = ['runner', 'samurai'];
A.newRun(false);
A.startStage(0);
step(30);
const P = __PL()[0];
const realRandom = Math.random;
const calm = () => {
  G.ents = G.ents.filter(e => e.team !== 1);
  G.props = [];
  G.projs = [];
  P.club = null;
  if (P.state !== 'idle') A.setS(P, 'idle');
  P.z = P.vz = 0;
  P.inv = 999;
  P.face = 1;
  G.lock = G.camX;
};
const foe = (k, dx, o) => {
  const e = A.spawnEnemy(k, 1);
  e.x = P.x + dx;
  e.y = P.y;
  e.elite = null;
  e.club = null;
  e.cool = 1e9;
  e.inv = 0;
  e.dmg = 0;
  Object.assign(e, o || {});
  return e;
};
const press = (k, n) => {
  key(k, false);
  step(1);
  key(k, true);
  step(n || 3);
  key(k, false);
};

ok(
  ['pipe', 'chain', 'bat'].every(k => A.CLUBS[k] && A.CLUBS[k].uses > 0),
  'three street weapons, each with a use count'
);
A.startStage(0);
step(5);
ok(G.props.filter(A.isClub).length >= 2, 'every district has street weapons lying about');

/* ---------- a runner with a street weapon ---------- */
calm();
G.props = [A.clubProp('bat', P.x + 6, P.y)];
press('KeyJ');
step(12);
ok(P.club && P.club.kind === 'bat' && G.props.length === 0, 'PUNCH beside a bat picks it up');
let e = foe('ganger', 22, { hp: 999, maxHp: 999 });
const bare = A.CLUBS.bat.dmg;
press('KeyJ');
step(20);
ok(999 - e.hp > bare && P.club.uses === A.CLUBS.bat.uses - 1, 'a swing hits harder and wears the bat by one');
P.club.uses = 1;
e.hp = 999;
A.setS(e, 'idle');
press('KeyJ');
step(20);
ok(!P.club, 'the last swing breaks it');

calm();
P.club = { kind: 'pipe', uses: 5 };
e = foe('ganger', 22, { hp: 999, maxHp: 999 });
P.inv = 0;
A.hurt(P, 5, -1, { kd: true, att: e });
ok(
  !P.club && G.props.some(o => o.kind === 'pipe' && o.uses === 5),
  'knocked down, you drop it where you fall'
);

calm();
P.club = { kind: 'chain', uses: 6 };
e = foe('ganger', 120, { hp: 999, maxHp: 999 });
P.inv = 0;
press('Space');
step(4);
press('KeyJ');
ok(!P.club && G.projs.some(pr => pr.k === 'prop' && pr.kind === 'chain'), 'PUNCH in the air throws it');
for (let i = 0; i < 90 && G.projs.some(pr => pr.kind === 'chain'); i++) step(1);
ok(e.hp < 999 || G.props.some(o => o.kind === 'chain'), 'the thrown chain hits the ganger or clatters down');
ok(
  G.props.some(o => o.kind === 'chain' && o.uses === 5),
  'and lies on the street, one use worse for wear'
);

/* ---------- foes with street weapons ---------- */
calm();
let carried = 0;
for (let i = 0; i < 200; i++) {
  const g = A.spawnEnemy('ganger', 1);
  if (g.club) carried++;
}
G.ents = G.ents.filter(x => x.team !== 1);
ok(carried > 20 && carried < 90, `some gangers walk in carrying one (${carried} of 200)`);
calm();
const g = foe('ganger', 140, { cool: 0 });
G.props = [A.clubProp('pipe', g.x - 30, g.y)];
for (let i = 0; i < 120 && !g.club; i++) {
  P.x = g.x - 140;
  step(1);
}
ok(g.club && g.club.kind === 'pipe', 'a ganger walks over and picks up a pipe');
const hp0 = P.hp;
P.inv = 0;
g.cool = 0;
g.x = P.x + 20;
g.y = P.y;
A.setS(g, 'windup');
for (let i = 0; i < 20; i++) step(1);
ok(P.hp < hp0 && g.club.uses === A.CLUBS.pipe.uses - 1, 'and swings it at you');
A.hurt(g, 1, 1, { kd: true, src: P });
ok(!g.club && G.props.some(o => o.kind === 'pipe'), 'knock them down and they drop it');

/* ---------- wall bounces and juggles ---------- */
calm();
e = foe('ganger', 0, { hp: 999, maxHp: 999 });
e.x = G.camX + A.W - 30;
P.x = e.x - 20;
A.hurt(e, 5, 1, { src: P, kd: true, kb: 10, big: true, melee: true });
let bounced = false;
for (let i = 0; i < 30 && !bounced; i++) {
  step(1);
  bounced = !!e.bounced;
}
ok(bounced && e.x <= G.camX + A.W - 10 && e.vx < 0, 'a foe knocked into the screen edge bounces back off it');
ok(e.hp < 994, 'and the wall hurts');
let juggles = 0;
for (let i = 0; i < 4; i++) {
  e.z = Math.max(e.z, 10);
  e.bounced = true;
  P.x = e.x - 14;
  P.y = e.y;
  P.face = 1;
  if (A.strike(P, 30, 3, {})) juggles++;
}
ok(juggles === 3, 'it can be juggled three times in the air, no more');
calm();
e = foe('ganger', 14, { hp: 999, maxHp: 999 });
A.setS(e, 'down');
e.z = 10;
ok(!A.strike(P, 30, 3, {}), 'a foe knocked down without a bounce is not juggled');

/* ---------- mercy ---------- */
calm();
Math.random = () => 0.01;
e = foe('ganger', 22, { hp: 999, maxHp: 999 });
e.hp = 120;
A.hurt(e, 5, 1, { src: P, melee: true });
Math.random = realRandom;
ok(e.state === 'beg', 'a beaten ganger may drop to its knees and beg');
const k0 = P.karma + P.lvl * 1000,
  c0 = __PARTY.creds + G.picks.filter(k => k.k === 'cred').reduce((a, k) => a + (k.v || 0), 0);
for (let i = 0; i < 160 && e.state === 'beg'; i++) step(1);
ok(e.mercy === 'spared' && e.state === 'flee', 'left alone, it is spared and runs');
ok(
  __PARTY.creds + G.picks.filter(k => k.k === 'cred').reduce((a, k) => a + (k.v || 0), 0) > c0,
  'and pays you off'
);
ok(P.karma + P.lvl * 1000 > k0, 'mercy pays karma');
for (let i = 0; i < 400 && G.ents.includes(e); i++) step(1);
ok(!G.ents.includes(e), 'then it runs off the screen and is gone');

calm();
Math.random = () => 0.01;
e = foe('ganger', 22, { hp: 999, maxHp: 999 });
e.hp = 120;
A.hurt(e, 5, 1, { src: P, melee: true });
Math.random = realRandom;
A.hurt(e, 1, 1, { src: P, melee: true });
ok(e.state === 'dead', 'hit a begging foe and it is over');

calm();
Math.random = () => 0.01;
e = foe('biker', 22, { hp: 999, maxHp: 999 });
e.hp = 120;
A.hurt(e, 5, 1, { src: P, melee: true });
Math.random = realRandom;
ok(e.state === 'flee', 'a beaten biker runs for it instead');

calm();
Math.random = () => 0.01;
e = foe('ganger', 22, { hp: 999, maxHp: 999 });
e.elite = 'armored';
e.hp = 120;
A.hurt(e, 5, 1, { src: P, melee: true });
const b = foe('troll', 40, { hp: 999, maxHp: 999 });
b.hp = 100;
A.hurt(b, 5, 1, { src: P, melee: true });
Math.random = realRandom;
ok(e.state !== 'beg' && e.state !== 'flee' && b.state !== 'beg', 'elites and bosses never quit');

/* ---------- boss taunts ---------- */
calm();
const boss = foe('troll', 60, { hp: 1000, maxHp: 1000, inv: 0 });
const t0 = G.texts.length;
A.hurt(boss, 520, 1, { src: P, melee: true });
ok(
  boss.enraged && G.texts.slice(t0).some(t => A.TAUNTS.troll.some(l => t.s.includes(l))),
  'a boss taunts when it enrages'
);

/* ---------- feats and training ---------- */
ok(
  ['mercy', 'walls'].every(id => A.FEATS.some(f => f.id === id)),
  'Street Mercy and Off the Wall feats'
);
ok(A.TRAIN.length === 14 && /pipe/.test(A.TRAIN[13].k), 'a fourteenth training drill teaches street weapons');
