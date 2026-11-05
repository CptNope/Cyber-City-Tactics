/* The car chase (Kagemori Pursuit): one car for the crew, runner 1 driving, runner 2 shooting from the window
 * (the roof gun solo), pursuit cars ramming from behind, and the car taking the hits for everyone. */
'use strict';
require('./harness');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.tips = false;
A.prefs.seen.trainoffer = true;
const tap = (code, n) => {
  key(code, true);
  step(n || 2);
  key(code, false);
  step(1);
};
const quiet = () => {
  // nothing on the road but what a check puts there
  G.ents = G.ents.filter(e => e.kind === 'player');
  const D = G.drive;
  D.spawnX = D.carX = D.oilX = D.pcarX = 1e9;
};
const biker = (dx, dy) => {
  const p = __PL()[0],
    e = A.spawnEnemy('biker', 1);
  e.elite = null;
  e.ride = true;
  e.x = p.x + dx;
  e.y = p.y + (dy || 0);
  e.bk = { v: p.bk.v, crash: 0 };
  e.cool = 1e9;
  e.hp = e.maxHp = 999;
  A.setS(e, 'ride');
  return e;
};

click('jobs');
ok(/Kagemori Pursuit/.test(els.ov._h) && /drive:chase:1/.test(els.ov._h), 'the Jobs board has the car chase');

/* ---------- solo: the roof gun ---------- */
click('drive:chase:1');
let p = __PL()[0];
ok(
  G.drive && p.bk.car && !p.bk.pass && p.maxHp >= 140,
  'solo: one runner drives the car, which takes more punishment than a bike'
);
quiet();
const b1 = biker(120);
for (let i = 0; i < 45; i++) step(1);
ok(b1.hp < 999, 'the roof gun fires on its own at whatever is close');
quiet();
const b2 = biker(14, 8);
const h2 = b2.hp;
tap('KeyK');
step(10);
ok(b2.hp < h2, 'kick slams the car into a rider alongside');
// a car is wider than a bike: traffic a bike would slip past still catches it
quiet();
G.ents.push({
  kind: 'car',
  veh: 'car',
  team: 2,
  d: { name: 'Car', passive: true },
  pal: A.PALS[0],
  x: p.x + 4,
  y: p.y + 15,
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
  bk: { v: 0 }
});
p.inv = 0;
p.z = 0;
const cr0 = G.drive.crashes;
step(2);
ok(G.drive.crashes === cr0 + 1, 'a car takes up more of the road than a bike: mind the traffic');

/* ---------- pursuit cars ---------- */
quiet();
p.bk.crash = 0;
A.setS(p, 'ride');
G.drive.pcarX = G.camX - 1;
step(2);
const pc = G.ents.find(e => e.pcar);
ok(
  pc && pc.veh === 'van' && pc.x < p.x && pc.maxHp < A.DEF.interceptor.hp,
  'Kagemori pursuit cars come up from behind, lighter than the Interceptor'
);

/* ---------- co-op: driver and window gunner ---------- */
A.setMode('title');
click('jobs');
click('drive:chase:2');
p = __PL()[0];
const q = __PL()[1];
ok(p.bk.car && q.bk.pass, 'co-op: runner 1 drives, runner 2 rides in the back');
quiet();
step(3);
ok(Math.abs(q.x - (p.x - 22)) < 1 && Math.abs(q.y - p.y) < 2, 'the passenger rides along in the back seat');
const b3 = biker(130);
const am = q.ammo,
  h3 = b3.hp;
tap('Semicolon');
step(4);
ok(b3.hp < h3 && q.ammo === am, 'runner 2 shoots from the window, without using ammo');
quiet();
const b4 = biker(150);
for (let i = 0; i < 60; i++) step(1);
ok(b4.hp === 999, 'with a gunner aboard, the roof gun stays quiet');
const hp0 = p.hp,
  qh = q.hp;
p.inv = 0;
A.driveHurt(q, 10);
ok(p.hp === hp0 - 10 && q.hp === qh, 'a hit on the window is a hit on the car');
ok(A.driveTarget(biker(30)) === p, 'bikers go for the car, not the back seat');

/* ---------- the finish ---------- */
quiet();
G.camX = A.DRIVE_JOBS.chase.len;
p.x = G.camX + 200;
for (let i = 0; i < 200 && G.mode === 'play'; i++) step(1);
ok(
  G.mode === 'driveover' && G.dresult.win && /Kagemori Pursuit/.test(els.ov._h),
  'across the line: paid, like any driving job'
);
ok((A.store.load('cs_drive') || {}).chase, 'and the best time is kept');
