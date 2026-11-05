/* Cyber City Tactics · src/js/game/finishers.js
 * Environmental finishers: throw a foe into the street itself. A burning barrel by the back wall, a drum lying
 * on the floor, or the live lane of a wired floor finishes them on the spot (bosses take a quarter of their
 * health instead), and they drop their creds early, with a shot at gear. Everything checks while a thrown foe
 * is in the air (upEnemy calls envTick), so it works with every throw: forward, back and into another lane.
 *
 * The street's barrels and lamps come from fixtureAt(), which the renderer uses too, so the barrel you see is
 * the barrel that burns.
 * Loaded as a classic script after props.js: every file shares one global scope, in the order in index.html. */
'use strict';
const FIX_STEP = 260;
// cheap integer hash -> 0..1 (the same as atmos.js uses), for things that must look random but stay put
const fixHash = n => {
  n = Math.imul(n ^ (n >>> 15), 0x2c1b3c6d);
  n = Math.imul(n ^ (n >>> 12), 0x297a2d39);
  return ((n ^ (n >>> 15)) >>> 0) / 4294967296;
};
/** The k-th street fixture by the back wall: { x, barrel } in world coordinates, or null for a gap. */
function fixtureAt(k, S) {
  const h = fixHash(k * 6151 + 29);
  if (h < 0.3) return null;
  const x = k * FIX_STEP + 40 + fixHash(k * 37) * 150,
    tr = G.world && G.wd ? traderOf(G.wd) : null;
  if (tr && Math.abs(x - tr.x) < 50) return null; // Sable's corner has her own sign
  // the Barrens and the Sprawl burn barrels; the corp districts and tunnels get proper lamps
  return { x, barrel: !!((S.market || (!S.tunnel && !S.grid)) && h < 0.62) };
}
const envOutdoors = S => !!S && !G.dun && !S.matrix && !G.drive && !G.stealth && !G.flight;
/** A burning barrel within reach of x, if the street has one there. */
function barrelAt(x) {
  const S = curS();
  if (!envOutdoors(S)) return null;
  const k0 = Math.floor((x - 200) / FIX_STEP);
  for (let k = k0; k <= k0 + 2; k++) {
    const f = fixtureAt(k, S);
    if (f && f.barrel && Math.abs(f.x - x) < 14) return f;
  }
  return null;
}
const ENV = {
  fire: { s: 'INTO THE FIRE', c: '#ff6a3d' },
  drum: { s: 'KABOOM', c: '#ffc63d' },
  wire: { s: 'SHORTED OUT', c: '#45d2ff' }
};
/** Each step a thrown foe is in the air: did they land in something? */
function envTick(e) {
  if (e.envDone || e.state === 'dead' || !e.thrown) return;
  // a barrel by the back wall: thrown into the back lane
  if (e.y < FY0 + 16 && barrelAt(e.x)) return envFinish(e, 'fire');
  // a drum on the floor
  const dr = G.props.find(
    pr => pr.kind === 'drum' && !pr.held && Math.abs(pr.x - e.x) < 14 && Math.abs(pr.y - e.y) < 10 && e.z < 24
  );
  if (dr) {
    G.props = G.props.filter(pr => pr !== dr);
    dr.src = e.thrown.kind === 'player' ? e.thrown : null;
    dr.team = 0;
    dr.dmg = 28 + ((e.thrown.D && e.thrown.D.melee) || 0);
    dr.z = e.z;
    envFinish(e, 'drum');
    shatter(dr); // and the blast takes whoever's standing near
    return;
  }
  // the live lane of a wired floor, while it's live
  const h = G.hazard;
  if (h && h.k === 'shock' && e.z < 8) {
    const c = h.t % 240;
    if (c >= 70 && c < 170 && e.y >= laneY(h.lane) && e.y < laneY(h.lane + 1)) return envFinish(e, 'wire');
  }
}
function envFinish(e, k) {
  const src = e.thrown && e.thrown.kind === 'player' ? e.thrown : null,
    E = ENV[k],
    dir = Math.sign(e.vx) || 1;
  e.envDone = true;
  const boss = e.d && e.d.boss;
  const dmg = boss ? Math.round(e.maxHp * 0.25) : e.hp + 1;
  // the loot comes out first: creds, and sometimes gear
  if (!boss && !e.revived) {
    drop('cred', e.x, e.y + 4, { v: 20 + depth() * 12 });
    if (Math.random() < 0.25) drop('gear', e.x + 10, e.y + 6, { item: randItem(G.stage, false) });
  }
  if (k === 'fire') e.burnT = Math.max(e.burnT || 0, 180);
  burst(e.x, e.y, e.z + 10, E.c, 18);
  G.fx.push({ k: 'ring', x: e.x, y: e.y, z: e.z, c: E.c, life: 18, max: 18, r: 30 });
  G.texts.push({ x: e.x, y: e.y, z: e.z + 60, s: E.s, c: E.c, life: 70 });
  G.shake = Math.max(G.shake, 7);
  if (k === 'wire') sfx.zap();
  else sfx.boom();
  e.hp -= dmg;
  e.flash = 10;
  if (e.hp <= 0) {
    e.thrown = null;
    kill(e, dir, { src });
  }
  if (src) bump('envkills');
}
