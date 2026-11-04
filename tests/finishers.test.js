/* Environmental finishers: a thrown foe into a burning barrel, a drum on the floor or a live wired floor. */
'use strict';
require('./harness');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.tips = false;
G.pendArch = ['samurai', 'runner'];
A.newRun(false);
A.startStage(0);
step(5);
const P = __PL()[0];
const S = A.STAGES[0];
const calm = () => {
  G.ents = G.ents.filter(e => e.team !== 1);
  G.props = [];
  G.picks = [];
  G.texts = [];
};
const thrown = (x, y, o) => {
  const e = A.spawnEnemy('sec', 1);
  Object.assign(e, { x, y, z: 12, vz: 0.5, vx: 2, elite: null, club: null, mercy: 'rolled', inv: 0 });
  e.hp = e.maxHp = 200;
  e.thrown = P;
  e.thrownHit = [];
  A.setS(e, 'down');
  Object.assign(e, o || {});
  return e;
};

// a kill can freeze the game for a few frames (the finishing slow-mo), so step until the throw is over
const settle = e => {
  for (let i = 0; i < 40 && !e.envDone && e.z > 0 && e.state !== 'dead'; i++) step(1);
};

/* ---------- the street's fixtures ---------- */
let bar = null;
for (let k = 0; k < 40 && !bar; k++) {
  const f = A.fixtureAt(k, S);
  if (f && f.barrel) bar = f;
}
ok(bar, 'the Barrens have burning barrels by the back wall');
ok(
  A.fixtureAt(3, S) === A.fixtureAt(3, S) ||
    JSON.stringify(A.fixtureAt(3, S)) === JSON.stringify(A.fixtureAt(3, S)),
  'and they stay put'
);
ok(!A.barrelAt(bar.x + 60), 'away from one, nothing burns');

/* ---------- into the fire ---------- */
calm();
const k0 = G.run.kills,
  lp0 = A.LEG.stats.envkills || 0;
let e = thrown(bar.x, A.FY0 + 8);
settle(e);
ok(e.state === 'dead' && G.run.kills === k0 + 1, 'thrown into a burning barrel: finished');
ok(
  G.texts.some(t => t.s === 'INTO THE FIRE') && G.picks.some(k => k.k === 'cred'),
  'it says so, and the creds come out'
);
ok(A.LEG.stats.envkills === lp0 + 1, 'and counts toward Use the Scenery');
calm();
e = thrown(bar.x, A.FY0 + 40);
settle(e);
ok(e.state !== 'dead', 'thrown past it in a front lane: no burn');
calm();
e = thrown(bar.x, A.FY0 + 8, { thrown: null });
settle(e);
ok(e.state !== 'dead', 'and only a throw does it: a foe who just walks by is fine');

/* ---------- a drum ---------- */
calm();
const near = A.spawnEnemy('sec', 1); // security never picks up a drum
Object.assign(near, {
  x: P.x + 100,
  y: P.y + 4,
  elite: null,
  club: null,
  mercy: 'rolled',
  inv: 0,
  cool: 1e9
});
near.hp = near.maxHp = 9999;
G.props.push({ kind: 'drum', x: P.x + 80, y: P.y, z: 0, vx: 0, vz: 0 });
e = thrown(P.x + 80, P.y);
settle(e);
ok(
  e.state === 'dead' && !G.props.some(pr => pr.kind === 'drum'),
  'into a drum: it goes up, and so do they ' +
    [e.state, e.hp, JSON.stringify(G.props), Math.round(e.x), Math.round(P.x), e.envDone, G.mode]
);
ok(near.hp < 9999, 'and the blast catches whoever is standing by');

/* ---------- a boss takes a quarter ---------- */
calm();
const boss = A.spawnEnemy('troll', 1);
Object.assign(boss, { x: bar.x, y: A.FY0 + 8, z: 12, vz: 0.5, inv: 0, thrown: P, thrownHit: [] });
const bh = boss.hp;
settle(boss);
ok(
  boss.state !== 'dead' && bh - boss.hp >= Math.round(boss.maxHp * 0.25),
  'a boss thrown in takes a quarter of their health'
);

/* ---------- a live floor ---------- */
calm();
A.enterDen(); // anything that isn't a street with barrels
G.hazard = { k: 'shock', t: 100, lane: 1, drops: [] };
const y = (A.laneY(1) + A.laneY(2)) / 2;
e = thrown(P.x + 40, y, { z: 4 });
settle(e);
ok(
  e.state === 'dead' && G.texts.some(t => t.s === 'SHORTED OUT'),
  'onto the live lane while it’s live: shorted out'
);
calm();
G.hazard.t = 10;
e = thrown(P.x + 40, y, { z: 4 });
settle(e);
ok(e.state !== 'dead', 'while it’s dead, the floor is just a floor');
G.hazard = null;
ok(/Use the Scenery/.test(A.FEATS.find(f => f.id === 'scenery').name), 'the feat is in the Codex');
