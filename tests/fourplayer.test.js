/* Couch co-op for up to four: crews of two to four, joining and leaving mid-run, enemies that scale with the
 * crew, team-ups across three and four runners, controllers that keep their runner, and the four-panel HUD. */
'use strict';
require('./harness');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.tips = false;
A.prefs.story = false;
const PL = () => __PL();
// the game loop catches its own errors (and logs them): count them, so a crash in a frame fails here
const errs = [];
const cerr = console.error;
console.error = (...a) => {
  errs.push(a.map(x => (x && x.stack) || String(x)).join(' '));
  cerr(...a);
};

// a crew of four from the run setup
A.prefs.crew = 4;
G.pendN = 0;
G.pendArch = ['runner', 'samurai', 'mage', 'runner'];
A.newRun(true);
A.startStage(0);
step(20);
ok(PL().length === 4 && G.coop, 'a co-op start with a crew of four makes four runners');
ok(
  PL()
    .map(p => p.name)
    .join() === 'VEX,JINX,RAZE,NOVA',
  'Vex, Jinx, Raze and Nova'
);
ok(new Set(PL().map(p => p.pal.acc)).size === 4, 'each in their own color');
ok(PL()[2].arch === 'mage', 'each with the archetype picked for their seat');
ok(
  PL().every(p => G.ents.includes(p)),
  'all four on the street'
);

// tougher foes for a bigger crew
const hp4 = A.spawnEnemy('ganger', 1).maxHp;
A.prefs.crew = 2;
A.newRun(false);
A.startStage(0);
step(5);
const hp1 = A.spawnEnemy('ganger', 1).maxHp;
ok(Math.abs(hp4 / hp1 - 1.55) < 0.12, `a crew of four faces foes with +55% health (${hp1} → ${hp4})`);
ok(
  A.crewWave([
    ['ganger', null],
    ['bossX!', null]
  ]).length === 2,
  'a crew of one or two meets the wave as written'
);

// a crew of four meets two more foes per wave, copied from its rank and file, never the boss
{
  const keep = __PL().slice();
  A.prefs.crew = 4;
  G.pendN = 0;
  A.makeCrew(true);
  const w = A.crewWave([
    ['ganger', null],
    ['orc', null],
    ['troll', null]
  ]);
  ok(
    w.length === 5 && !w.slice(3).some(([k]) => k === 'troll'),
    'a crew of four: two more foes a wave, no extra boss'
  );
  A.prefs.crew = 2;
  A.newRun(false);
  A.startStage(0);
  step(2);
  void keep;
}

// joining mid-run, up to four, and leaving again
const j2 = A.joinRunner(),
  j3 = A.joinRunner(),
  j4 = A.joinRunner();
ok(j2 && j3 && j4 && PL().length === 4, 'runners 2, 3 and 4 can join mid-run');
ok(A.joinRunner() === null && PL().length === 4, 'but no fifth');
ok(new Set(PL().map(p => p.arch)).size === 4, 'joiners take an archetype nobody else is playing');
ok(j4.lvl === PL()[0].lvl && G.ents.includes(j4), 'at the lead runner’s level, on the street');
ok(A.crewN(true) === 4, 'and a restart keeps the crew of four');
A.dropRunner();
ok(PL().length === 3 && !G.ents.includes(j4) && A.crewN(true) === 3, 'the newest runner can leave');
A.dropRunner2();
ok(PL().length === 1 && !G.coop, 'and everyone but runner 1');

// three runners on one foe: a CREW UP
A.prefs.crew = 3;
G.pendN = 0;
A.newRun(true);
A.startStage(0);
step(5);
G.ents = G.ents.filter(e => e.team !== 1);
const f = A.spawnEnemy('ganger', 1);
f.hp = f.maxHp = 5000;
f.cool = 1e9;
G.texts = [];
for (const p of PL()) {
  f.inv = 0;
  A.hurt(f, 2, 1, { src: p, melee: true });
}
step(15);
ok(
  G.texts.some(t => t.s === 'CREW UP!'),
  'three runners hitting the same foe together: CREW UP!'
);

// two of three: a TEAM UP once the beat passes with nobody else in
G.texts = [];
f.teamCD = 0;
f.hitBy = {};
A.setS(f, 'idle'); // up off the floor after the CREW UP knocked it down
f.z = f.vz = 0;
for (const p of PL().slice(0, 2)) {
  f.inv = 0;
  A.hurt(f, 2, 1, { src: p, melee: true });
}
ok(!G.texts.some(t => t.s === 'TEAM UP!'), 'two runners in: the crew gets a beat to pile in');
step(15);
ok(
  G.texts.some(t => t.s === 'TEAM UP!'),
  'then a TEAM UP'
);

// controllers keep their runner; with every seat taken, Start adds one
A.prefs.crew = 3;
G.pendN = 0;
A.newRun(true);
A.startStage(0);
step(2);
A.PAD.kb[0] = true; // runner 1 is on the keyboard
const s1 = A.padClaim(0),
  s2 = A.padClaim(1),
  s3 = A.padClaim(2);
ok(
  s1 === 1 && s2 === 2 && s3 === -1,
  `pads take runners 2 and 3, never the keyboard's (${s1}, ${s2}, ${s3})`
);
ok(A.padOwner(0) === 1 && A.padOwner(1) === 2, 'and keep them');
const s4 = A.padJoin(2);
ok(s4 === 3 && PL().length === 4 && A.padOwner(2) === 3, 'a third pad’s Start adds runner 4');
ok(A.padJoin(3) === -1 && PL().length === 4, 'a fifth controller has no seat');

// the HUD and the pause menu for four
let err = null;
try {
  A.render();
} catch (e) {
  err = e;
}
ok(!err, 'the four-panel HUD draws' + (err ? ': ' + err.message : ''));
A.setMode('pause');
ok(
  /Drop NOVA/.test(els.ov._h || '') && !/Add Runner 5/.test(els.ov._h || ''),
  'pause offers dropping Nova, no fifth seat'
);

// four runners survive a save and a reload
A.saveGame('play');
const sv = A.store.load('cs_save3');
A.loadGame(sv);
ok(PL().length === 4 && PL()[3].name === 'NOVA', 'a save keeps all four runners');

// a crew of four plays a stretch of a district without errors
A.setMode('play');
step(600);
ok(
  PL().length === 4 && !errs.length,
  'ten seconds of a four-runner fight run clean' +
    (errs.length ? ': ' + errs.splice(0).join(' | ').slice(0, 300) : '')
);

// every mode takes a crew of four: the arena, the Sprawl, a drive, a car chase, a flight, the roof, a heist
const modes = {
  arena: () => A.startArena(true),
  sprawl: () => A.startWorld(true),
  drive: () => {
    A.startDrive('causeway', true);
    A.setMode('play');
  },
  car: () => {
    A.startDrive(Object.keys(A.DRIVE_JOBS).find(k => A.DRIVE_JOBS[k].car) || 'causeway', true);
    A.setMode('play');
  },
  flight: () => {
    A.startFlight('skyline', true);
    A.setMode('play');
  },
  stealth: () => A.startStealth('arcology', true)
};
const INP = A.INP;
A.prefs.crew = 4;
for (const [name, go] of Object.entries(modes)) {
  G.pendN = 0;
  let e = null;
  try {
    go();
    for (let i = 0; i < 4; i++) INP[i].held.right = true;
    INP[2].held.punch = INP[3].held.punch = true;
    step(400);
  } catch (x) {
    e = x;
  }
  if (!e && errs.length) e = { message: errs.splice(0).join(' | ').slice(0, 400) };
  for (let i = 0; i < 4; i++) INP[i].held = {};
  ok(!e && PL().length === 4, `${name}: four runners play without errors` + (e ? ': ' + e.message : ''));
}
// in a flight, runners 3 and 4 man their own door guns
{
  A.startFlight('skyline', true);
  A.setMode('play');
  step(5);
  const before = G.projs.filter(q => !q.foe).length;
  INP[3].held.punch = true;
  step(2);
  INP[3].held = {};
  ok(G.projs.filter(q => !q.foe).length > before, 'in a flight, runner 4 fires their own door gun');
}
