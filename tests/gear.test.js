/* Borderlands-style gear: makers with specialities, rarity from the number of parts (five colours), parts that
 * change how a weapon plays, old saves brought up to date; and the late-game grapple fixes: hauling a downed
 * foe up into a grab, foes on their last legs reeling, and weapons that daze in one hit. */
'use strict';
require('./harness');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.seen.trainoffer = true;
A.prefs.tips = false;
// tiers and makers
const tiers = [0, 1, 2, 3, 4].map(n => A.mkItem('weapon', 'katana', n));
ok(
  tiers.every((it, n) => it.rar === n && it.parts.length === n),
  'rarity is the number of parts (0–4)'
);
ok(
  A.RAR.length === 5 && A.RCOL.length === 5 && A.RAR[4].n === 'Legendary',
  'five tiers, white to orange Legendary'
);
ok(
  tiers.every(it => A.MFR[it.mfr] && it.name.startsWith(A.MFR[it.mfr].name)),
  'every item has a maker, named first: ' + tiers[2].name
);
ok(
  Object.keys(A.MFR).every(k => A.makersFor('weapon').includes(k) === A.MFR[k].slots.includes('weapon')),
  'makers only make what they make'
);
// parts do what they say
const plain = A.mkItem('weapon', 'katana', 0, false, 'kagemori'),
  heavy = A.mkItem('weapon', 'katana', 0, false, 'kagemori');
heavy.parts = ['heavy'];
A.applyParts(heavy);
ok(
  heavy.dmg > plain.dmg && heavy.rar === 1,
  `Heavy: more damage (${plain.dmg} → ${heavy.dmg}), and one tier up`
);
const volt = A.mkItem('weapon', 'baton', 0, false, 'voltaic');
ok(volt.daze && !A.mkItem('weapon', 'baton', 0, false, 'rustline').daze, 'Voltaic melee weapons always daze');
const sc = A.mkItem('gun', 'rifle', 0, false, 'kagemori');
sc.parts = ['sight'];
A.applyParts(sc);
ok(sc.crit > 0 && sc.critMul > 1, 'Scoped: crit chance and harder crits');
const sw = A.mkItem('weapon', 'pipe', 0, false, 'ironside');
sw.parts = ['swift'];
A.applyParts(sw);
const P0 = A.newRunner(0);
P0.eq.weapon = sw;
P0.state = 'punch';
ok(A.busyFor(P0, { punch: 13 }) < 13, 'Swift: punches recover faster');
const hx = A.mkItem('armor', 'robe', 0, false, 'hexwright');
hx.parts = ['attr'];
A.applyParts(hx);
ok(hx.bonus.mag >= 2 + 2, "Augmented: +2 to the maker's attribute (Hexwright: Magic)");
ok(
  /Kagemori/.test(A.itemLine(sc)) && /Scoped/.test(A.itemLine(sc)),
  'the item card names the maker and lists its parts'
);
// old saves
const old = {
  uid: 'abc1234',
  slot: 'gun',
  base: 'shot',
  rar: 2,
  name: 'Prototype Sawed-off shotgun',
  dmg: 34,
  mod: 'burn',
  bonus: {}
};
A.fixItem(old);
ok(
  old.mfr && old.parts.length === 2 && old.rar === 2 && old.parts.includes('burn'),
  `an old Prototype gun gets a maker and two parts, keeping its affix (${old.name})`
);
const leg = A.mkLegend('boomstick');
ok(leg.rar === 4 && leg.name === "King's Boomstick", 'named legendaries are the orange tier');
// random drops climb with depth
const avg = st => {
  let t = 0;
  for (let i = 0; i < 400; i++) t += A.randItem(st, false).rar;
  return t / 400;
};
ok(
  avg(5) > avg(0) + 0.4,
  `deeper districts roll more parts (${avg(0).toFixed(2)} → ${avg(5).toFixed(2)} on average)`
);
// the shotgun's blast
G.pendArch = ['runner', 'samurai'];
A.newRun(false);
A.startStage(0);
G.wave = 99;
step(20);
const P = __PL()[0];
P.eq.gun = A.mkItem('gun', 'shot', 0);
P.ammo = 10;
A.refresh(P);
G.projs = [];
A.setS(P, 'idle');
tap('KeyU');
step(5);
ok(G.projs.filter(q => q.pellet).length === 5, 'a shotgun fires a fan of five pellets');
// grapples late in the game
const calm = () => {
  if (P.grab) A.releaseGrab(P);
  G.ents = G.ents.filter(e => e.team !== 1);
  for (let i = 0; i < 60 && P.state !== 'idle'; i++) step(1);
  P.face = 1;
  P.inv = 999;
};
const foe = dx => {
  const e = A.spawnEnemy('ganger', 1);
  e.x = P.x + dx;
  e.y = P.y;
  e.elite = null;
  e.cool = e.coolMul = 1e9;
  e.dmg = 0;
  return e;
};
calm();
let e = foe(14);
A.setS(e, 'down');
e.z = 0;
e.inv = 24; // just getting up
key('KeyJ', false);
step(1);
key('KeyJ', true);
for (let i = 0; i < 6 && P.state !== 'grab'; i++) step(1);
key('KeyJ', false);
ok(
  P.state === 'grab' && P.grab === e && e.state === 'grabbed' && !e.inv,
  'punch beside a downed foe: hauled up into a grab'
);
tap('KeyJ');
step(2);
tap('KeyJ');
step(2);
tap('KeyJ');
step(2);
ok(P.state !== 'grab' && e.state === 'down', 'and the string still lands (jab, jab, hook)');
step(30);
ok(
  !G.ents.some(x => x.state === 'grabbed' && !__PL().some(p => p.grab === x)),
  'nobody is ever left held by no one'
);
calm();
e = foe(18);
e.hp = Math.floor(e.maxHp * 0.2);
A.setS(e, 'idle');
ok(A.dazed(e) && A.reeling(e), 'a foe under 30% health is reeling, and grabbable');
key('KeyD', true);
for (let i = 0; i < 20 && P.state !== 'grab'; i++) step(1);
key('KeyD', false);
ok(P.state === 'grab', 'walk into it: grabbed, however hard you hit');
calm();
e = foe(22);
e.hp = e.maxHp = 9999;
A.setS(e, 'idle');
P.eq.weapon = A.mkItem('weapon', 'baton', 0, false, 'voltaic');
A.refresh(P);
P.combo = 0;
key('KeyJ', false);
step(1);
key('KeyJ', true); // a fresh press, held a few steps so it can't fall between two logic steps
for (let i = 0; i < 14 && !(e.hits > 0); i++) step(1);
key('KeyJ', false);
ok(e.hits === 1 && e.dazeUntil > G.t, 'a Voltaic baton dazes in one hit');
