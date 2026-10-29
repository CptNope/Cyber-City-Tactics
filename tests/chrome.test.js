/* Grabs and chrome techniques: two hits daze a foe (stars), walking into a dazed foe grabs it, knees and
 * throws, who can't be grabbed, and Doc's techniques (faster punches and kicks, longer dazes and holds,
 * harder throws, higher jumps, faster get-ups), bought, paid for in essence and saved. */
'use strict';
require('./harness');
const G = __G,
  A = __api,
  PARTY = __PARTY;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.seen.trainoffer = true;
A.prefs.tips = false;
G.pendArch = ['runner', 'samurai'];
click('arenapick');
click('arena1');
const p = __PL()[0];
// a quiet arena: no waves, one sparring partner at a time
const calm = () => {
  G.ents = G.ents.filter(e => e.team !== 1);
  G.waveLive = false;
  G.nextWaveT = 1e9;
};
const foe = (k, dx) => {
  const e = A.spawnEnemy(k || 'ganger', 1);
  e.x = p.x + (dx || 24);
  e.y = p.y;
  e.hp = e.maxHp = 9999;
  e.dmg = 0;
  e.cool = 1e9;
  e.coolMul = 1e9;
  return e;
};
const idle = () => {
  for (let i = 0; i < 60 && p.state !== 'idle'; i++) step(1);
};
step(30);
calm();
p.face = 1;
A.setS(p, 'idle');
// an undazed foe: walking into it does nothing
let e = foe('ganger', 14);
A.setS(e, 'idle');
key('KeyD', true);
step(4);
key('KeyD', false);
ok(p.state !== 'grab', 'walking into a foe that is not dazed does not grab it');
// two punches: dazed, with time to spare after your punch recovers
calm();
p.x = 200;
e = foe('ganger', 22);
tap('KeyJ');
step(16);
tap('KeyJ');
step(5);
ok(e.dazeUntil > G.t + 30, `two hits in a row daze the foe (${e.dazeUntil - G.t} steps of stars)`);
idle();
step(10);
ok(A.dazed(e), 'still dazed after the punch has recovered');
key('KeyD', true);
for (let i = 0; i < 30 && p.state !== 'grab'; i++) step(1);
key('KeyD', false);
ok(p.state === 'grab' && p.grab === e && e.state === 'grabbed', 'walking into a dazed foe grabs it');
// knees, then a throw
const hp0 = e.hp;
tap('KeyJ');
step(2);
ok(e.hp < hp0 && p.state === 'grab', 'punch knees a held foe');
const other = foe('ganger', -40);
A.setS(other, 'idle');
key('KeyA', true);
tap('KeyK');
step(1);
key('KeyA', false);
ok(e.thrown === p && e.vx < 0, 'kick throws, aimed by the held direction (backward here)');
for (let i = 0; i < 60 && e.z > 0; i++) step(1);
ok(other.state === 'down' || other.hp < other.maxHp, 'the thrown foe bowls over the one behind');
// who can't be grabbed
calm();
const mech = foe('mech', 20);
mech.dazeUntil = G.t + 100;
ok(!A.dazed(mech) && !A.grabbable(mech), "mechs can't be grabbed, dazed or not");

// Doc's chrome techniques, in the Den
click('quit');
click('pick');
click('new');
G.stage = 0;
A.enterDen();
const q = __PL()[0];
PARTY.creds = 5000;
A.openNPC('doc');
ok(
  /Chrome techniques/.test(els.ov._h) && /data-a="tech:servo"/.test(els.ov._h),
  "Doc's counter lists chrome techniques"
);
const mp0 = q.maxMp,
  c0 = PARTY.creds;
click('tech:servo');
ok(A.hasTech(q, 'servo') && PARTY.creds < c0, 'buying Servo knuckles installs it and costs creds');
ok(q.maxMp === mp0 - A.TECH_MANA, `and ${A.TECH_MANA} max mana`);
click('tech:servo');
ok(PARTY.creds === c0 - Math.round(A.TECH.servo.cost * A.buyMul()), 'it can only be installed once');
for (const k of ['piston', 'grip', 'gyro', 'spring', 'recoil']) click('tech:' + k);
ok(A.techN(q) === 6 && /Installed/.test(els.ov._h), 'all six installed');
A.saveGame('den');
A.loadGame(A.store.load('cs_save3'));
const r = __PL()[0];
ok(A.hasTech(r, 'gyro') && A.techN(r) === 6 && r.maxMp === q.maxMp, 'techniques are saved with the run');
// what each one does, against a runner without them
const bare = A.newRunner(1);
A.refresh(bare);
const busyLen = (who, st) => {
  const busy = { punch: 13, upper: 20, kick: 20 };
  who.state = st;
  return A.busyFor(who, busy);
};
ok(
  busyLen(r, 'punch') < busyLen(bare, 'punch') && busyLen(r, 'upper') < busyLen(bare, 'upper'),
  'servo: punches and uppercuts recover faster'
);
ok(busyLen(r, 'kick') < busyLen(bare, 'kick'), 'piston: kicks recover faster');
// in play: jump height, get-up time, daze length, throw distance
click('leave');
A.startStage(0); // the campaign's own runners, chrome and all
G.wave = 99; // no waves: this is about the moves
step(30);
const s = __PL()[0];
calm();
s.face = 1;
A.setS(s, 'idle');
s.z = 0;
s.vz = 0;
tap('Space');
step(1);
ok(s.vz > 5, `spring: a higher jump (vz ${s.vz.toFixed(1)})`);
for (let i = 0; i < 80 && (s.z > 0 || s.vz > 0); i++) step(1);
A.setS(s, 'down');
let up = 0;
for (; up < 80 && s.state === 'down'; up++) step(1);
ok(up <= 30, `recoil: back up in ${up} steps (50 without)`);
step(70);
calm();
s.x = 220;
const g = A.spawnEnemy('ganger', 1);
g.x = s.x + 22;
g.y = s.y;
g.hp = g.maxHp = 9999;
g.cool = g.coolMul = 1e9;
A.setS(g, 'idle');
tap('KeyJ');
step(12);
tap('KeyJ');
step(5);
ok(g.dazeUntil - G.t > 90, `grip: a longer daze (${g.dazeUntil - G.t} steps)`);
idle();
key('KeyD', true);
for (let i = 0; i < 30 && s.state !== 'grab'; i++) step(1);
key('KeyD', false);
tap('KeyK');
step(1);
ok(Math.abs(g.vx) > 6, `gyro: throws fly further (vx ${g.vx.toFixed(1)})`);
