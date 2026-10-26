/* Cyber City Tactics · src/js/ui/attract.js
 * The title-screen attract mode.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ================= title attract ================= */
function attract() {
  G.challenge = null;
  G.rngW = G.rngP = null;
  PL = [newRunner(0)];
  G.coop = false;
  G.den = false;
  G.arena = false;
  G.training = false;
  G.world = false;
  G.dun = null;
  G.wd = null;
  G.ng = 0;
  resetWorld();
  G.stage = 0;
  G.bg = genBg(STAGES[0], 1000);
  const P = PL[0];
  P.x = 150;
  P.y = 225;
  P.face = 1;
  setS(P, 'idle');
  G.ents.push(P);
  const e = spawnEnemy('ganger', 1);
  e.x = 300;
  e.y = 222;
  e.face = -1;
  const o = spawnEnemy('orc', 1);
  o.x = 345;
  o.y = 236;
  o.face = -1;
  G.props = [{ kind: 'drum', x: 230, y: 250, z: 0 }];
  makeRain(true);
}
function attractStep() {
  G.t++;
  for (const r of G.rain) {
    r.y += r.s;
    r.x -= 1.2;
    if (r.y > H) {
      r.y = -10;
      r.x = rand(0, W + 40);
    }
  }
  const P = PL[0];
  for (const e of G.ents) {
    e.t++;
    if (e.team === 1) {
      e.walk += 0.4;
      if (e.state !== 'walk') e.state = 'walk';
    }
  }
  if (G.t % 120 === 0) setS(P, ['punch', 'kick', 'cast', 'shoot', 'roll'][(G.t / 120) % 5]);
  if (P.t > 24 && P.state !== 'idle') setS(P, 'idle');
  G.camX = Math.sin(G.t * 0.004) * 20 + 20;
}
