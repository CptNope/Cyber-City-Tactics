/* The living Sprawl: day and night, a block that remembers what you did to it, buildings that remember how
 * far you got, and hacking drones and sentry turrets in the middle of a fight. */
'use strict';
require('./harness');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.tips = false;
A.prefs.seen.trainoffer = true;
G.pendArch = ['decker', 'samurai'];
A.startWorld(false);
step(30);
const w = G.wd,
  P = __PL()[0];
const realRandom = Math.random;
const calm = () => {
  G.ents = G.ents.filter(e => e.team !== 1 && !(e.d && e.d.turret));
  G.projs = [];
  if (P.state !== 'idle') A.setS(P, 'idle');
  P.inv = 999;
  P.face = 1;
  w.copT = w.patT = w.squadT = 1e9;
};

/* ---------- day and night ---------- */
ok(!A.isNight(w) && w.clock > 0, 'a block starts in daylight, and its clock runs');
w.clock = A.DAY_STEPS - 2;
G.toasts = [];
step(4);
ok(A.isNight(w) && G.toasts.some(t => t.s === 'Nightfall'), 'three minutes on, night falls, with a toast');
const shop = { type: 'clinic' };
ok(A.shopShut(shop), 'the clinic and talisman shops shut at night');
A.waitPhase(w);
ok(!A.isNight(w) && !A.shopShut(shop), 'the safehouse lets you wait for morning');
w.clock = A.DAY_STEPS + 10;
calm();
w.patT = 0;
step(1);
const nightGang = G.ents.filter(e => e.team === 1).length;
calm();
w.clock = 10;
w.patT = 0;
step(1);
const dayGang = G.ents.filter(e => e.team === 1).length;
ok(nightGang > dayGang, `night patrols are bigger (${nightGang} vs ${dayGang})`);
G.mode = 'safe';
G.safeTab = 'lay';
A.renderOv();
ok(
  /Wait for nightfall/.test(els.ov._h) && /The block remembers/.test(els.ov._h),
  'the safehouse shows the time of day and the block’s memory'
);
A.setMode('play');
// day: break-ins draw witnesses
const bad = w.street.buildings.find(b => b.id && !A.isGood(b) && !A.isShop(b) && b.type !== 'secret');
w.heat = 0;
w.clock = 10;
A.startHack(bad);
G.hack.pos = G.hack.zone;
for (let i = 0; i < 10 && G.mode === 'hack'; i++) {
  G.hack.pos = G.hack.zone;
  A.hackPress();
}
const dayHeat = w.heat;
G.dun = null;
A.enterStreet(bad.x);
w.heat = 0;
w.clock = A.DAY_STEPS + 10;
A.startHack(bad);
for (let i = 0; i < 10 && G.mode === 'hack'; i++) {
  G.hack.pos = G.hack.zone;
  A.hackPress();
}
ok(dayHeat === w.heat + 1, `by day a break-in draws one more heat star (${dayHeat} vs ${w.heat})`);
G.dun = null;
A.enterStreet(bad.x);
w.clock = 10;

/* ---------- the block remembers ---------- */
w.looted = [];
ok(A.blockMul(w) === 1, 'a fresh block: normal prices');
const hide = w.street.buildings.filter(b => b.type === 'hideout' || b.type === 'club');
const folk = w.street.buildings.filter(b => b.id && !A.isGood(b) && !A.isShop(b) && b.type !== 'secret');
if (hide[0]) w.looted.push(hide[0].id);
ok(!hide[0] || Math.abs(A.blockMul(w) - 0.9) < 1e-9, 'clearing a crew hideout makes shops 10% cheaper');
if (folk[0]) w.looted.push(folk[0].id);
ok(!folk[0] || Math.abs(A.blockMul(w) - 0.99) < 1e-9, 'robbing a home or business makes them 10% dearer');
w.looted = folk.slice(0, 5).map(b => b.id);
ok(A.blockMul(w) <= 1.3 + 1e-9, 'and it tops out at 30%');
w.looted = [];

/* ---------- buildings remember how far you got ---------- */
const bs = w.street.buildings.find(b => b.id && A.roomsOf(b) >= 3 && b.type !== 'secret');
A.enterBuilding(bs);
ok(G.dun.room === 0, 'a building starts at its first room');
A.enterRoom(1);
G.dun = null;
A.enterStreet(bs.x);
A.saveWorld();
A.loadWorld(A.store.load('cs_world'));
A.enterStreet(bs.x);
A.enterBuilding(G.wd.street.buildings.find(b => b.id === bs.id));
ok(G.dun.room === 1, 'leave halfway (even through a save) and you come back to the room you left');
ok(Number.isFinite(G.wd.clock), 'the clock is saved with the block');
G.dun = null;
A.enterStreet(bs.x);
A.loadWorld({ wd: { level: 1, seed: 5, clock: 'x', prog: [] }, runners: [{ arch: 'runner' }], party: {} });
ok(G.wd.clock === 0 && A.isObj(G.wd.prog), 'a junk clock or progress map in a save is reset');
A.startWorld(false);
step(10);
const w2 = G.wd,
  P2 = __PL()[0];

/* ---------- sentry turrets ---------- */
const site = w2.street.buildings.find(b => b.type === 'blacksite') || {
  type: 'blacksite',
  id: 50,
  tier: 2,
  seed: 9,
  name: 'x',
  x: 300,
  w: 140
};
if (!w2.street.buildings.includes(site)) w2.street.buildings.push(site);
A.enterBuilding(site);
let turretSeen = false;
for (let i = 0; i < 12 && !turretSeen; i++) {
  A.enterRoom(1); // each visit rolls the room again from the building's own seed
  turretSeen = G.ents.some(e => e.d && e.d.turret);
}
ok(turretSeen, 'black sites bolt sentry turrets to their inner rooms');
G.dun = null;
A.enterStreet(300);
G.ents = G.ents.filter(e => e.team !== 1);
w2.copT = w2.patT = w2.squadT = 1e9;
const tu = A.spawnEnemy('turret', 1);
tu.x = P2.x + 90;
tu.y = P2.y;
tu.elite = null;
tu.cool = 0;
tu.hp = tu.maxHp = 60;
P2.inv = 0;
const hp0 = P2.hp,
  tx = tu.x;
for (let i = 0; i < 100; i++) step(1);
ok(P2.hp < hp0 && tu.x === tx, 'a turret holds still and shoots down its lane');
A.hurt(tu, 30, 1, { src: P2, kd: true, melee: true });
ok(tu.state !== 'down' && tu.state !== 'hurt', 'it never flinches or falls');

/* ---------- hacking in a fight ---------- */
tu.hp = tu.maxHp;
tu.stunT = 0;
P2.x = tu.x - 20;
P2.y = tu.y;
P2.face = 1;
ok(!A.hackTarget(P2), 'a healthy, live turret can’t be hacked');
tu.stunT = 200;
ok(A.hackTarget(P2) === tu, 'shorted out, it can');
A.setS(P2, 'idle');
P2.inv = 999;
Math.random = () => 0.01;
tap('KeyJ');
step(3);
Math.random = realRandom;
ok(tu.team === 0 && tu.name === 'Hacked turret', 'PUNCH beside it: hacked, and on your side');
const g = A.spawnEnemy('ganger', 1);
g.x = tu.x + 70;
g.y = tu.y;
g.club = null;
g.cool = 1e9;
g.hp = g.maxHp = 999;
g.inv = 0;
tu.stunT = 0;
tu.cool = 0;
for (let i = 0; i < 120; i++) step(1);
ok(g.hp < 999, 'a hacked turret shoots foes');
tu.hackedT = 1;
step(2);
ok(!G.ents.includes(tu), 'and shuts down when the hijack runs out');
G.ents = G.ents.filter(e => e.team !== 1);
const dr = A.spawnEnemy('drone', 1);
dr.x = P2.x + 20;
dr.y = P2.y;
dr.hp = Math.round(dr.maxHp * 0.3);
A.setS(P2, 'idle');
Math.random = () => 0.01;
ok(
  A.hackFoe(P2, dr) && dr.gone && G.ents.some(e => e.summon && e.ally === 'drone'),
  'a badly damaged drone, hacked, comes back as your own'
);
const dr2 = A.spawnEnemy('drone', 1);
dr2.hp = Math.round(dr2.maxHp * 0.3);
Math.random = () => 0.99;
ok(
  !A.hackFoe(P2, dr2) && dr2.team === 1 && !A.hackOpen(dr2),
  'a failed hack zaps you and the window shuts for a moment'
);
Math.random = realRandom;
ok(
  A.hackChance({ D: { a: { hak: 10 } }, arch: 'decker' }) >
    A.hackChance({ D: { a: { hak: 1 } }, arch: 'runner' }),
  'Hacking and deckers hack better'
);
const cour = A.spawnEnemy('drone', 1);
cour.courier = true;
cour.hp = 1;
ok(!A.hackOpen(cour), 'couriers can’t be hacked: shoot them down');

/* ---------- refinements ---------- */
// a hacked turret can take hits from foes, and its wreck is cleared away
G.ents = G.ents.filter(e => e.team !== 1 && !(e.d && e.d.turret));
const ht = A.spawnEnemy('turret', 1);
ht.x = P2.x + 40;
ht.y = P2.y;
ht.stunT = 100;
Math.random = () => 0.01;
A.hackFoe(P2, ht);
Math.random = realRandom;
let threw2 = null;
try {
  A.hurt(ht, 5, 1, { att: { team: 1, x: ht.x + 10 } });
  G.projs.push({ k: 'bullet', team: 1, x: ht.x + 8, y: ht.y, z: 30, vx: -4, dmg: 5, life: 20, hit: [] });
  step(10);
} catch (err) {
  threw2 = err;
}
ok(!threw2 && ht.hp < ht.maxHp, 'foes can hit a hacked turret without breaking the frame');
A.hurt(ht, 999, 1, { att: { team: 1, x: ht.x } });
for (let i = 0; i < 60 && G.ents.includes(ht); i++) step(1);
ok(!G.ents.includes(ht), 'a wrecked hacked turret is cleared away');
// Short Circuit shorts out turrets, and never freezes a boss
G.ents = G.ents.filter(e => e.team !== 1);
const t3 = A.spawnEnemy('turret', 1),
  bb = A.spawnEnemy('blackice', 1);
t3.x = P2.x + 60;
bb.x = P2.x + 100;
P2.spSel = 'decker';
P2.sk = Object.assign(P2.sk || {}, { probe: 1, spare: 1, jam: 1 });
P2.sp = 100;
A.doSpecial(P2);
ok(t3.stunT > 0 && A.hackOpen(t3), 'Short Circuit shorts out a turret, opening it to a hack');
ok(!(bb.stunT > 0), 'but never freezes a boss');
// a junk room number in a save is dropped
A.loadWorld({
  wd: { level: 1, seed: 5, prog: { 3: 1.5, 4: 'x', 5: 2 } },
  runners: [{ arch: 'runner' }],
  party: {}
});
ok(
  G.wd.prog[3] === undefined && G.wd.prog[4] === undefined && G.wd.prog[5] === 2,
  'only whole room numbers survive a load'
);
