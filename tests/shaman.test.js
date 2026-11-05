/* The Shaman tree: spirit kin, hexes and withering, ward totems, the wild call and the spirit walk, and the
 * Totem active skill. */
'use strict';
require('./harness');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.tips = false;
G.pendArch = ['shaman', 'samurai'];
A.newRun(false);
A.startStage(0);
step(20);
const P = __PL()[0];
const realRandom = Math.random;
const calm = () => {
  G.ents = G.ents.filter(e => e.team !== 1 && e.kind !== 'ally');
  G.projs = [];
  G.totems = [];
  if (P.state !== 'idle') A.setS(P, 'idle');
  P.inv = 0;
  P.hp = P.maxHp;
};
const foe = (dx, o) => {
  const e = A.spawnEnemy('ganger', 1);
  e.x = P.x + dx;
  e.y = P.y;
  e.elite = null;
  e.club = null;
  e.cool = 1e9;
  e.inv = 0;
  e.hp = e.maxHp = 9999;
  e.mercy = 'rolled';
  Object.assign(e, o || {});
  return e;
};
// steady numbers: no crits
Math.random = () => 0.99;

ok(
  A.TREES.shaman && Object.keys(A.SKILLS).filter(k => A.SKILLS[k].t === 'shaman').length === 6,
  'a fifth tree, Shaman, with six skills'
);
ok(
  [0, 1, 2, 3].every(r =>
    Object.keys(A.SKILLS).some(k => A.SKILLS[k].t === 'shaman' && A.SKILLS[k].row === r)
  ),
  'one to two skills a row, and a capstone'
);
P.sk = {};
P.spts = 9;
P.lvl = 10;
ok(A.canLearn(P, 'kin') && !A.canLearn(P, 'hex'), 'rows unlock as you spend points, as in every tree');

/* ---------- hexes ---------- */
calm();
let f = foe(20);
A.hurt(f, 20, 1, { src: P, melee: true });
ok(!(f.curseT > G.t), 'without Hex, hits don’t curse');
P.sk = { kin: 1, hex: 1 };
A.hurt(f, 20, 1, { src: P, melee: true });
ok(f.curseT > G.t, 'with Hex, a melee hit curses the foe');
f.hp = 9999;
A.hurt(f, 20, 1, {});
const cursedHit = 9999 - f.hp;
f.curseT = 0;
f.hp = 9999;
A.hurt(f, 20, 1, {});
ok(cursedHit > 9999 - f.hp, `a cursed foe takes more from everyone (${cursedHit} vs ${9999 - f.hp})`);
// withering
const hitP = c => {
  P.hp = P.maxHp;
  P.inv = 0;
  A.setS(P, 'idle');
  const before = P.hp;
  A.hurt(P, 20, -1, { att: c });
  return before - P.hp;
};
f.curseT = G.t + 200;
f.curseW = false;
const plain = hitP(f);
f.curseW = true;
ok(hitP(f) < plain, 'Withering: a withered foe hits you softer');

/* ---------- kin ---------- */
calm();
const ally = A.spawnSummon('ember', P, 600, 1);
const aHp = () => ally.hp;
P.sk = {};
ally.hp = ally.maxHp;
ally.inv = 0; // a fresh summon's spawn grace
A.hurt(ally, 20, 1, { att: f });
const raw = ally.maxHp - aHp();
P.sk = { kin: 1 };
ally.hp = ally.maxHp;
ally.inv = 0;
A.hurt(ally, 20, 1, { att: f });
ok(ally.maxHp - aHp() < raw, 'Spirit Kin: companions and summons take less');
ok(A.kinMul() === 1.25, 'and hit harder');

/* ---------- totems ---------- */
calm();
P.sk = { kin: 1, hex: 1, ward: 1 };
__PARTY.med = 2;
P.hp = 20;
A.useItem(P);
ok(G.totems.length === 1 && !G.totems[0].big, 'Ward Totem: a medkit also plants a small totem');
const hpT = P.hp;
step(62);
ok(P.hp > hpT, 'and it heals you while you stand by it');
calm();
P.sk = { kin: 1, hex: 1, ward: 1 };
ok(
  A.activeOpen(P, 'shaman') && A.ACTIVES.shaman.name === 'Totem',
  'three points open the Totem active skill'
);
P.spSel = 'shaman';
P.sp = 100;
f = foe(30);
A.doSpecial(P);
ok(G.totems.length === 1 && G.totems[0].big, 'Totem: a spirit totem goes down');
step(62);
ok(f.curseT > G.t, 'and curses foes near it');
A.resetWorld();
ok(!G.totems.length, 'totems stay in the scene they were planted in');

/* ---------- the wild call and the spirit walk ---------- */
calm();
P.sk = { kin: 1, hex: 1, ward: 1, wild: 1 };
Math.random = () => 0.01;
f = foe(20, { hp: 1, maxHp: 30 });
A.hurt(f, 50, 1, { src: P, melee: true });
Math.random = () => 0.99;
ok(
  G.ents.some(e => e.wild && e.ally === 'ember'),
  'Wild Call: a kill can call a fire spirit'
);
Math.random = () => 0.01;
const g2 = foe(20, { hp: 1, maxHp: 30 });
A.hurt(g2, 50, 1, { src: P, melee: true });
Math.random = () => 0.99;
ok(G.ents.filter(e => e.wild && e.state !== 'dead').length === 1, 'one wild spirit at a time');
P.sk.swalk = 1;
f = foe(20);
const walk = hitP(f);
G.ents = G.ents.filter(e => e.kind !== 'ally');
ok(walk < hitP(f), 'Spirit Walk: with a spirit beside you, you take less');
ok(
  /five trees/.test(A.FEATS.find(x => x.id === 'jack').desc),
  'Jack of All Trades now asks for all five trees'
);
Math.random = realRandom;
G.sheetIdx = 0;
G.sheetTab = 'skills';
G.tree = 'shaman';
A.setMode('sheet');
ok(
  /Shaman/.test(els.ov._h) && /Spirit Walk/.test(els.ov._h) && /Totem/.test(els.ov._h),
  'the Skills tab shows the Shaman tree and its Totem'
);
