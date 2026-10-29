/* Flight jobs (modes/flight.js): the VTOL, flying inside the scrolling frame, the nose cannon, rockets,
 * flares against missiles, the door gun for runner 2 (and on its own when solo), drones, gunships, towers and
 * their searchlights, salvage in the air, the Raijin, the drop, getting shot down, pay and banking. */
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

click('jobs');
ok(
  /Over the Skyline/.test(els.ov._h) && /flight:skyline:1/.test(els.ov._h),
  'the Jobs board lists flight jobs'
);
click('flight:skyline:1');
const F = G.flight,
  v = A.vtolOf();
ok(G.mode === 'play' && F && v && G.fhull === 120, 'Fly solo: a VTOL with a full hull');
ok(F.towers.length > 8 && F.towers.some(t => t.light), 'towers stand in the way, some with searchlights');
ok(!G.ents.some(e => e.kind === 'player'), 'the runners ride inside, off screen');
// nothing spawns on its own while the controls are checked
F.spawnX = F.gunX = 1e9;
F.towers = [];
const cam0 = G.camX;
step(60);
ok(G.camX > cam0 + 100, 'the city scrolls by on its own');
const vx0 = v.x - G.camX,
  vz0 = v.z;
hold('KeyD', 30);
ok(v.x - G.camX > vx0 + 20, 'right flies ahead within the frame');
hold('KeyW', 30);
ok(v.z > vz0 + 20, 'up climbs');
hold('KeyW', 200);
ok(v.z <= A.FL.zMax, 'and the climb stops below the HUD');

// the cannon kills a drone, which drops salvage in the air
const d = A.flightFoeEnt('kdrone', {
  x: v.x + 90,
  z: v.z,
  z0: v.z,
  amp: 0,
  ph: 0,
  sp: 0,
  cool: 9999,
  hp: 14,
  maxHp: 14
});
G.ents.push(d);
const cr0 = A.PARTY.creds;
key('KeyJ', true);
let sal = null;
for (let i = 0; i < 60 && d.hp > 0; i++) step(1);
key('KeyJ', false);
sal = G.picks.find(k => k.air && k.k === 'cred');
ok(d.hp <= 0 && F.kills === 1, 'holding punch fires the nose cannon; a drone goes down');
ok(!!sal, 'it leaves salvage floating in the air');
if (sal) {
  v.x = sal.x;
  v.z = sal.z;
}
step(2);
ok(A.PARTY.creds > cr0 && !G.picks.includes(sal), 'flying through the salvage collects it');

// the door gun fires on its own when solo
const d2 = A.flightFoeEnt('kdrone', {
  x: v.x + 120,
  z: v.z - 40,
  z0: v.z - 40,
  amp: 0,
  ph: 0,
  sp: 0,
  cool: 9999,
  hp: 5,
  maxHp: 5
});
G.ents.push(d2);
step(80);
ok(d2.hp <= 0, 'solo, the door gun picks off a drone below by itself');

// rockets cost mana and splash
const p = __PL()[0];
p.mp = p.maxMp;
const g = A.flightFoeEnt('gunship', { gun: true, x: v.x + 120, z: v.z, ph: 0, hp: 120, maxHp: 120 });
G.ents.push(g);
tap('KeyI');
step(40);
ok(p.mp < p.maxMp && g.hp < 120, `a rocket costs mana and hits the gunship (${g.hp}/120)`);
// enemy fire hurts the hull; a flare kills missiles
G.ents = G.ents.filter(e => e !== g);
v.inv = 0;
const h0 = G.fhull;
A.flightShot(v.x + 20, v.z, -3, 0, 6, 'eshot', true);
step(10);
ok(G.fhull < h0, 'enemy fire chips the hull');
A.flightShot(v.x + 200, v.z, -2, 0, 22, 'missile', true);
step(2);
tap('KeyO');
step(2);
ok(!G.projs.some(q => q.k === 'missile') && v.flares === 2, 'a flare shakes the missile (2 flares left)');
// a tower in the way hurts
v.inv = 0;
F.towers = [{ x: v.x - 20, w: 60, top: A.FL.base - v.z - 5, light: false, ph: 0 }];
const h1 = G.fhull;
step(2);
ok(G.fhull < h1, 'flying into a tower roof hurts');
F.towers = [];
// a searchlight that holds you calls down flak
v.inv = 0;
v.z = 150;
const T = { x: v.x - 30, w: 60, top: 230, light: true, ph: 0 };
F.towers = [T];
let flak = false;
for (let i = 0; i < 300 && !flak; i++) {
  v.x = T.x + 30 + (Math.cos(A.searchAngle(T)) * (230 - (A.FL.base - v.z))) / -Math.sin(A.searchAngle(T));
  step(1);
  if (T.flak) flak = true;
}
ok(flak, 'held in a searchlight, flak comes for you');
F.towers = [];

// the Raijin at the end, then the drop
G.fhull = 120;
F.spawnX = F.gunX = 1e9;
G.camX = A.flightJob().len * 0.87;
step(2);
const R = G.ents.find(e => e.big);
ok(R && F.boss, 'the Raijin shows up at the end');
R.hp = 5;
key('KeyJ', true);
v.z = R.z;
for (let i = 0; i < 200 && !F.bossDown; i++) {
  v.z = R.z;
  step(1);
}
key('KeyJ', false);
ok(F.bossDown && F.done && F.win, 'Raijin down: DROP ZONE');
for (let i = 0; i < 600 && !F.roof; i++) step(1); // a moment of slow motion, then the drop
const p1 = __PL()[0];
ok(
  F.roof && G.mode === 'play' && G.ents.includes(p1) && !A.vtolOf(),
  'the drop: the team lands on the roof, on foot'
);
for (let i = 0; i < 200 && !F.roof.live; i++) step(1);
ok(
  F.roof.live && G.ents.some(e => e.team === 1 && e.kind === 'sec'),
  'Kagemori security comes up the stairs'
);
// clear the waves (this test is about the flow, not the fight)
for (let w = 0; w < 3; w++) {
  for (let i = 0; i < 300 && !F.roof.live && !F.roof.over; i++) step(1);
  for (const e of G.ents) if (e.team === 1) ((e.hp = 0), A.setS(e, 'dead'));
  for (let i = 0; i < 5; i++) step(1);
  p1.hp = p1.maxHp;
}
ok(F.roof.over && F.roof.win, `three waves down: ROOF CLEAR (wave ${F.roof.wave})`);
step(200);
ok(
  G.mode === 'flightover' && G.fresult.win && G.fresult.roof && G.fresult.roof.win && G.fresult.pay >= 520,
  `results: roof taken, paid ¥${G.fresult.pay}`
);
ok(/Roof taken/.test(els.ov._h) && /The roof/.test(els.ov._h), 'the results card has the roof');
ok(/flightagain/.test(els.ov._h), 'Fly it again on the results card');

// shot down
click('flightagain');
ok(G.flight && !G.flight.done, 'Fly it again starts a new flight');
G.fhull = 0;
step(140);
ok(G.mode === 'flightover' && !G.fresult.win, 'hull at zero: shot down');
// overrun on the roof: the flight pays, the job is blown
click('flightagain');
G.flight.done = true;
G.flight.win = true;
G.flight.endT = 1;
step(2);
ok(G.flight.roof, 'straight to the roof');
for (const q of __PL()) q.lives = 0;
for (let i = 0; i < 400 && !G.flight.roof.over; i++) {
  for (const q of __PL()) if (!q.out && q.state !== 'dead') q.hp = 0;
  step(1);
}
ok(G.flight.roof.over && !G.flight.roof.win, 'everyone down on the roof: OVERRUN');
step(200);
ok(
  G.mode === 'flightover' && !G.fresult.win && G.fresult.flew && /Overrun/.test(els.ov._h),
  'results: overrun'
);

// pilot and gunner
click('jobs');
click('flight:storm:2');
ok(G.flight.id === 'storm' && __PL().length === 2, 'Pilot and gunner: two runners');
const v2 = A.vtolOf(),
  a0 = v2.aim;
hold('ArrowUp', 15);
ok(v2.aim < a0 - 0.3, "runner 2's up swings the door gun up");
const shots = G.projs.length;
key('Comma', true);
step(12);
key('Comma', false);
ok(G.projs.length > shots, "runner 2's punch fires the door gun");
click('arenapick');
click('arena1');
ok(!G.flight && G.arena, 'the Arena afterwards is back on the ground');
