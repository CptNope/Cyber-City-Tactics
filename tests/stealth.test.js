/* Drone stealth jobs (modes/stealth.js): flying, walls and their vents, cameras and guards seeing you, the
 * detection meter and alarms, the cloak, shock darts from behind (and from the front), lasers, the terminal
 * hack, the exit, pay and banking, lockdown, and a second drone in co-op. */
'use strict';
require('./harness');
const A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.seen.trainoffer = true;
A.prefs.tips = false;
const G = __G;
// teleport the drone and bring the camera along (the camera keeps drones on screen)
const put = (q, x) => {
  q.x = x;
  G.camX = Math.max(0, x - 190);
};
const hold = (code, n) => {
  key(code, true);
  step(n);
  key(code, false);
};

click('jobs');
ok(
  /Ghost in the Arcology/.test(els.ov._h) && /stealth:arcology:1/.test(els.ov._h),
  'the Jobs board lists drone jobs'
);
click('stealth:arcology:1');
const S = G.stealth,
  p = __PL()[0];
ok(G.mode === 'play' && S && p.drone && p.maxHp === 60, 'Fly solo: the runner flies a drone');
ok(
  S.cams.length && S.walls.length && S.lasers.length && S.term && S.exit > 3000,
  'the floor has cameras, walls, lasers, a terminal and an exit'
);
ok(
  G.ents.filter(e => e.guard).length >= 5 && G.ents.some(e => e.target && e.name === 'Aide Morrow'),
  'guards on patrol, and the target'
);
// keep the checks below about one thing at a time: clear the floor
const keep = { cams: S.cams, walls: S.walls, lasers: S.lasers };
S.cams = [];
S.walls = [];
S.lasers = [];
const guards = G.ents.filter(e => e.guard);
G.ents = G.ents.filter(e => !e.guard);

// flying
const x0 = p.x,
  z0 = p.z;
hold('KeyD', 40);
ok(p.x > x0 + 40, 'right flies forward');
hold('KeyW', 30);
ok(p.z > z0 + 15, 'up climbs');
hold('KeyS', 50);
ok(p.z < z0, 'down drops');

// a wall: blocked outside its vent, through it inside
S.walls = [{ x: p.x + 40, w: 14, gap: [10, 50] }];
p.z = 100;
hold('KeyD', 60);
ok(p.x < S.walls[0].x - 5, 'a wall stops the drone above its vent');
p.z = 30;
hold('KeyD', 60);
ok(p.x > S.walls[0].x + 10, 'flying low, the drone slips through the vent');
S.walls = [];

// a camera: in its cone the meter fills; out of it it drains; cloaked it never sees you
p.drone.vx = 0;
const cam = { x: p.x, amp: 0, spd: 0, ph: 0 }; // pointing straight down at the drone
S.cams = [cam];
p.z = 40;
step(20);
ok(p.drone.seen > 20 && p.drone.seenNow, `the camera sees the drone (meter ${Math.round(p.drone.seen)})`);
S.cams = [];
const m1 = p.drone.seen;
step(30);
ok(p.drone.seen < m1, 'out of sight, the meter drains');
S.cams = [cam];
p.drone.batt = 100;
p.drone.seen = 0;
tap('KeyO');
step(30);
ok(p.drone.cloak > 0 && p.drone.seen === 0, 'cloaked, the camera sees nothing');
p.drone.cloak = 0;
// stay in the cone and the alarm goes up
step(60);
ok(
  G.salarm === 1 && G.ents.some(e => e.guard),
  `seen too long: ALARM 1, and a guard walks in (meter back to ${Math.round(p.drone.seen)})`
);
S.cams = [];
G.ents = G.ents.filter(e => !e.guard);
G.salarm = 0;
p.drone.seen = 0;

// guards: sight ahead of them, and the shock dart
const g = guards[0];
G.ents.push(g);
g.x = p.x + 60;
g.face = -1; // looking at the drone
g.patrol = [g.x - 1, g.x + 1];
g.pauseT = 9999;
A.setS(g, 'idle');
p.z = 40;
step(10);
ok(p.drone.seenNow, 'a guard facing you sees the drone');
p.drone.seen = 0;
p.x = g.x - 20; // in front of them (they face left, toward the drone), close
p.drone.dartT = 0;
tap('KeyK');
step(2);
ok(g.state !== 'down' && p.drone.seen >= 40, 'a dart from the front just gives you away');
g.face = -1;
p.x = g.x + 25; // now behind them: they still face left, the drone is on their right
p.drone.dartT = 0;
p.drone.seen = 0;
tap('KeyK');
step(2);
ok(g.state === 'down', 'a dart from behind drops the guard');
step(20);
ok(!p.drone.seenNow, 'a downed guard sees nothing');
G.ents = G.ents.filter(e => e !== g);

// a laser gate trips the instant you touch it while it's on
S.lasers = [{ x: p.x + 20, per: 100, on: 100, ph: 0 }];
p.drone.seen = 0;
G.salarm = 0;
hold('KeyD', 30);
ok(G.salarm === 1, 'flying through a live laser trips the alarm');
S.lasers = [];
G.ents = G.ents.filter(e => !e.guard);
G.salarm = 0;

ok(A.stealthGoal().s === 'TERMINAL', 'the objective marker points to the terminal first');
// the exit won't take you without the files
put(p, S.exit - 20);
p.drone.seen = 0;
hold('KeyD', 20);
ok(!S.done, 'the exit vent needs the files first');
// the terminal: punch starts the hack; win it and the files are yours
put(p, S.term.x);
p.z = 40;
tap('KeyJ');
step(1);
ok(G.mode === 'hack' && G.hack && G.hack.vault === S.term, 'punch at the terminal starts the hack');
A.hackWin();
step(2);
ok(G.mode === 'play' && S.data && S.term.done, 'hack won: FILES PULLED');
ok(A.stealthGoal().s === 'EXIT', 'then it points to the exit vent');
// the target, darted from behind, for the bonus
const aide = guards.find(e => e.target);
G.ents.push(aide);
aide.x = p.x + 40;
aide.face = 1;
aide.pauseT = 9999;
put(p, aide.x - 25);
p.drone.dartT = 0;
tap('KeyK');
step(2);
ok(aide.state === 'down' && S.aide, 'the target darted from behind: TARGET DOWN');
// out through the vent
put(p, S.exit - 30);
p.z = 60;
hold('KeyD', 40);
ok(S.done && S.win, 'out through the vent with the files');
step(120);
ok(G.mode === 'stealthover' && G.sresult.win && G.sresult.aide, 'results: got out, target darted');
ok(G.sresult.pay >= 320 + 200, `paid ¥${G.sresult.pay}`);
ok(/stealthagain/.test(els.ov._h), 'Fly it again on the results card');
// banking works here too
A.store.set('cs_save3', { v: 4, stage: 0, runners: [{ arch: 'runner' }], party: { creds: 10, stash: [] } });
A.renderOv();
click('jobbank:camp');
ok(
  A.store.load('cs_save3').party.creds === 10 + G.sresult.take.creds,
  'banked the take to the campaign (the Den locker)'
);

// lockdown: three alarms and it's over
click('stealthagain');
ok(G.stealth && !G.stealth.done && G.mode === 'play', 'Fly it again starts a fresh floor');
G.salarm = 3;
step(110);
ok(G.mode === 'stealthover' && !G.sresult.win, 'three alarms: LOCKDOWN, busted');

// co-op: two drones, two sets of keys
click('jobs');
click('stealth:clinic:2');
ok(G.stealth.id === 'clinic' && __PL().length === 2 && __PL().every(r => r.drone), 'Fly co-op: two drones');
const p2 = __PL()[1],
  z2 = p2.z;
hold('ArrowUp', 20);
ok(p2.z > z2 + 8, "runner 2's keys fly runner 2's drone");
// overwatch co-op: runner 2 on the network with a reticle, runner 1 flies
click('jobs');
ok(/stealth:arcology:ow/.test(els.ov._h), 'the Jobs board offers Overwatch co-op');
click('stealth:arcology:ow');
const S2 = G.stealth,
  d1 = __PL()[0],
  ow = __PL()[1];
ok(
  S2.ow && d1.drone && !ow.drone && !G.ents.includes(ow),
  'overwatch: one drone on the floor, runner 2 off it'
);
S2.cams = [];
S2.lasers = [];
S2.walls = [];
G.ents = G.ents.filter(e => !e.guard);
const ox = G.owX;
hold('ArrowRight', 10);
ok(G.owX > ox + 20, "runner 2's arrows move the reticle");
hold('ArrowLeft', 10);
// loop a camera that's watching the drone
const cam2 = { x: Math.round(G.camX + G.owX), amp: 0, spd: 0, ph: 0 };
S2.cams = [cam2];
put(d1, cam2.x);
d1.z = 40;
d1.drone.vx = 0;
step(10);
ok(d1.drone.seenNow, 'the camera sees the drone');
G.owX = cam2.x - G.camX; // the reticle over it
tap('Comma');
step(2);
ok(cam2.offT > 0 && G.owLoops === 2, 'comma loops the camera under the reticle (a loop spent)');
d1.drone.seen = 0;
step(20);
ok(!d1.drone.seenNow && d1.drone.seen === 0, 'a looped camera sees nothing');
// and a laser (with the floor calm again)
S2.cams = [];
G.salarm = 0;
G.ents = G.ents.filter(e => !e.guard);
d1.drone.seen = 0;
const las = { x: Math.round(d1.x + 60), per: 100, on: 100, ph: 0 }; // ahead of the drone
S2.lasers = [las];
G.owX = las.x - G.camX;
tap('Comma');
step(2);
ok(las.offT > 0 && !A.laserOn(las), 'a looped laser is off');
step(430);
ok(A.laserOn(las), 'the loop runs out and the laser comes back');
S2.lasers = [];
// ping: pull a guard to the reticle (the drone cloaked, so this is only about the guard)
d1.drone.cloak = 9999;
const g2 = A.stealthGuard({ x1: G.camX + G.owX + 60, x2: G.camX + G.owX + 140 });
g2.x = G.camX + G.owX + 110;
g2.face = 1;
const px = G.camX + G.owX;
G.owX = px - G.camX;
tap('Period');
step(2);
ok(g2.lure && G.owPings === 2, 'period pings: the guard is pulled off the patrol');
step(150);
ok(Math.abs(g2.x - px) < 10 && g2.face === -1, 'the guard walks over to the noise');
// a guard darted frees up a loop
put(d1, g2.x + 25);
d1.drone.dartT = 0;
d1.z = 40;
const l0 = G.owLoops;
tap('KeyK');
step(2);
ok(g2.state === 'down' && G.owLoops === l0 + 1, 'a guard down gives overwatch a loop back');
// overwatch can't keep the job alive alone
d1.drone.cloak = 0;
d1.out = true;
step(5);
ok(S2.done && !S2.win, 'the only drone down: SIGNAL LOST');
// leaving resets everything for other modes
click('arenapick');
click('arena1');
ok(!G.stealth && G.arena, 'the Arena afterwards is back on foot');
void keep;
