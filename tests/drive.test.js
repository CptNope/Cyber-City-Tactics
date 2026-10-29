/* Driving missions (modes/drive.js): the jobs board, riding, lanes, nitro, hopping oil, strikes on riders
 * alongside, crashes into traffic, the Interceptor on the last stretch, the finish, the clock, pay and records,
 * and a second runner (couch co-op, or the friend online) riding along. */
'use strict';
require('./harness');
const A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.seen.trainoffer = true;
A.prefs.tips = false;
const G = __G;
const hold = (code, n) => {
  key(code, true);
  step(n);
  key(code, false);
};

// the jobs board
click('jobs');
ok(
  G.mode === 'jobs' && /Causeway Run/.test(els.ov._h) && /drive:causeway:1/.test(els.ov._h),
  'title → Jobs lists the driving jobs'
);
click('drive:causeway:1');
ok(G.mode === 'play' && !!G.drive && __PL().length === 1, 'Ride solo starts a driving run');
const p = __PL()[0];
ok(p.ride && p.bk && p.state === 'ride', 'the runner is on a bike');
ok(A.curS().name === 'The Causeway Run' && G.bg && G.bg.far.length > 40, 'the run has its own long skyline');
// nothing spawns on its own while the controls are checked one by one
G.drive.spawnX = G.drive.carX = G.drive.oilX = 1e9;
step(30);

// throttle, brake, lanes
const v0 = p.bk.v;
key('KeyD', true);
step(60);
ok(p.bk.v > v0 + 1.2, `holding right throttles up (${v0.toFixed(1)} → ${p.bk.v.toFixed(1)})`);
key('KeyD', false);
hold('KeyA', 30);
ok(p.bk.v < 3, `holding left brakes (${p.bk.v.toFixed(1)})`);
const y0 = p.y;
hold('KeyW', 20);
ok(p.y < y0 - 10, 'up changes lane');
hold('KeyS', 40);
ok(p.y > y0, 'down changes lane back');
// nitro
const n0 = p.bk.nitro;
tap('KeyO');
step(10);
ok(p.bk.boostT > 0 && p.bk.nitro < n0 && p.bk.v > 6.5, `dodge fires nitro (speed ${p.bk.v.toFixed(1)})`);
step(60);
// hop
tap('Space');
step(4);
ok(p.z > 3, 'jump hops the bike');
step(40);

// a biker alongside takes a punch and a kick, and goes down
const e = A.spawnEnemy('biker', 1);
e.elite = null;
e.ride = true;
e.face = 1;
e.x = p.x + 6;
e.y = p.y + 10;
e.bk = { v: p.bk.v, crash: 0 };
e.cool = 999;
A.setS(e, 'ride');
const hp0 = e.hp;
tap('KeyJ');
step(8);
const hit1 = e.hp;
step(8);
ok(hit1 < hp0, `a punch lands on a rider alongside (${hp0} → ${hit1})`);
e.x = p.x + 6;
e.y = p.y + 10;
e.hp = 5;
const td = G.drive.takedowns,
  cr0 = A.PARTY.creds;
tap('KeyK');
step(12);
ok(e.state === 'dead' && G.drive.takedowns === td + 1, 'a kick takes them down');
const loot = G.picks.find(k => k.k === 'cred');
ok(loot && loot.x > p.x && Math.abs(loot.y - e.y) < 16, 'the wreck spills creds onto the road ahead');
// steer over it to grab it
for (let i = 0; i < 120 && G.picks.includes(loot); i++) {
  p.y += Math.sign(loot.y - p.y) * Math.min(1.5, Math.abs(loot.y - p.y));
  step(1);
}
ok(
  !G.picks.includes(loot) && A.PARTY.creds > cr0,
  `riding over the loot collects it (¥${cr0} → ¥${A.PARTY.creds})`
);
// shots and spells go behind you too
for (const x of G.ents) if (x.team === 1) x.x = -9999;
G.ents = G.ents.filter(x => x.x > -9000);
const back = A.spawnEnemy('biker', -1);
back.elite = null;
back.ride = true;
back.x = p.x - 90;
back.y = p.y;
back.bk = { v: p.bk.v, crash: 0 };
back.cool = 999;
A.setS(back, 'ride');
p.ammo = 10;
const bhp = back.hp;
tap('KeyU');
step(3);
ok(
  back.hp < bhp && p.face === -1,
  `the gun fires backward at a rider behind (${bhp} → ${back.hp}), rider looks back`
);
step(14);
ok(p.face === 1 && p.state === 'ride', 'then eyes front again');
p.mp = p.maxMp;
p.spell = Math.max(0, p.spells.indexOf('fire'));
back.x = p.x - 80;
back.y = p.y;
back.hp = 99;
const bhp2 = back.hp,
  mp0 = p.mp;
key('KeyA', true);
tap('KeyI');
step(3);
key('KeyA', false);
ok(back.hp < bhp2 && p.mp < mp0, `holding left aims the Fireball behind you (${bhp2} → ${back.hp})`);
step(14);
ok(A.LEG.kills.biker >= 1, 'the Codex counts road gangers');

// a civilian car: ride into it and you crash; you get back on
for (const x of G.ents) if (x.veh === 'car' || (x.team === 1 && x.state !== 'dead')) x.x = -9999;
G.ents = G.ents.filter(x => x.x > -9000);
const car = {
  kind: 'car',
  veh: 'car',
  team: 2,
  d: { name: 'Car', passive: true },
  pal: A.PALS[0],
  x: p.x + 10,
  y: p.y,
  z: 0,
  vz: 0,
  face: 1,
  state: 'idle',
  t: 0,
  walk: 0,
  inv: 0,
  flash: 0,
  hp: 1,
  maxHp: 1,
  col: '#4a6b8a',
  bk: { v: 1 }
};
G.ents.push(car);
p.inv = 0;
p.z = 0;
const hpC = p.hp,
  crashes = G.drive.crashes;
step(2);
ok(
  p.bk.crash > 0 && p.state === 'down' && p.hp < hpC && G.drive.crashes === crashes + 1,
  'riding into a car crashes you'
);
step(90);
ok(p.state === 'ride' && p.inv > 0, 'back on the bike a moment later, briefly safe');
G.ents = G.ents.filter(x => x !== car);

// the oil: hop it and you're fine
step(80);
const oil = { ...car, kind: 'oil', veh: 'oil', x: p.x + 40, y: p.y, bk: undefined };
G.ents.push(oil);
p.inv = 0;
key('KeyD', true);
let hopped = false;
for (let i = 0; i < 40; i++) {
  if (!hopped && oil.x - p.x < 30) {
    tap('Space');
    hopped = true;
  }
  step(1);
}
key('KeyD', false);
ok(hopped && p.bk.crash === 0, 'jumping clears an oil slick');
G.ents = G.ents.filter(x => x !== oil);

// ride the rest of the way, traffic and all: the Interceptor shows up near the end, the finish pays out
p.hp = p.maxHp;
G.drive.spawnX = G.drive.carX = G.camX + 200;
G.drive.oilX = G.camX + 900;
key('KeyD', true);
let sawVan = false,
  ended = false;
for (let i = 0; i < 60 * 150 && !ended; i++) {
  p.hp = p.maxHp; // this test is about the course, not about surviving it
  step(1);
  if (G.ents.some(x => x.veh === 'van')) sawVan = true;
  if (G.mode === 'driveover') ended = true;
}
key('KeyD', false);
ok(sawVan, 'the Kagemori Interceptor comes for you on the last stretch');
ok(
  ended && G.dresult && G.dresult.win,
  `crossing the finish line delivers the package (${A.fmtTime(G.dresult.time)})`
);
ok(G.dresult.pay >= 260 && /Delivered/.test(els.ov._h), `paid ¥${G.dresult.pay}, results card shown`);
// banking the take into a save: with no save there's nothing to bank to
ok(
  /Start a campaign or a Sprawl run/.test(els.ov._h) || !G.dresult.take.creds,
  'no save yet: the card says where pay could go'
);
A.store.set('cs_world', {
  v: 1,
  party: { creds: 100, stash: [] },
  runners: [{ arch: 'runner' }],
  wd: { level: 1, seed: 7 }
});
A.renderOv();
ok(/jobbank:world/.test(els.ov._h), 'with a Sprawl save, the card offers to bank the take there');
const take = G.dresult.take;
take.items.push(A.randItem(1));
click('jobbank:world');
const sw = A.store.load('cs_world');
ok(
  sw.party.creds === 100 + take.creds && sw.party.stash.length === take.items.length,
  `banked ¥${take.creds} and ${take.items.length} gear to the Sprawl stash`
);
ok(/Banked/.test(els.ov._h) && !/jobbank:/.test(els.ov._h), 'banked once, and the buttons go away');
const rec = A.store.load('cs_drive');
ok(rec && rec.causeway && rec.causeway.best === G.dresult.time, 'best time saved on the device');

// the clock running out closes the bridge
click('driveagain');
ok(
  G.mode === 'play' && G.drive && G.drive.id === 'causeway' && !G.drive.done,
  'Ride it again restarts the run'
);
G.dtime = A.DRIVE_JOBS.causeway.time - 2;
step(130);
ok(
  G.mode === 'driveover' && G.dresult && !G.dresult.win && /Bridge closed/.test(els.ov._h),
  'out of time: bridge closed, no delivery pay'
);

// co-op: two riders, runner 2 on their own bike with their own keys
click('jobs');
click('drive:market:2');
ok(
  G.drive.id === 'market' && __PL().length === 2 && __PL().every(r => r.ride && r.bk),
  'Ride co-op: two runners, two bikes'
);
const p2 = __PL()[1],
  y2 = p2.y;
hold('ArrowUp', 20);
ok(p2.y < y2 - 10, "runner 2's keys steer runner 2's bike");
// a second runner joining mid-run (pause menu, a second pad, or the friend online) gets a bike too
click('jobs');
click('drive:causeway:1');
A.joinRunner2();
step(2);
ok(__PL().length === 2 && __PL()[1].ride && __PL()[1].bk, 'a runner who joins mid-run is put on a bike');
// leaving resets everything for the other modes
click('arenapick');
click('arena1');
ok(!G.drive && G.arena && G.mode === 'play', 'starting the Arena afterwards leaves driving behind');
step(60);
ok(!__PL()[0].bk || !__PL()[0].ride, 'arena runners are back on foot');
