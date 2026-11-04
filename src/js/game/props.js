/* Cyber City Tactics · src/js/game/props.js
 * Throwable props (cans, crates, drums) and grabbing enemies.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ================= props, grabs ================= */
function dropProp(p) {
  const pr = p.holding;
  if (!pr) return;
  p.holding = null;
  pr.x = p.x + p.face * 8;
  pr.y = p.y;
  pr.z = 0;
  G.props.push(pr);
}
function throwProp(p) {
  const pr = p.holding;
  p.holding = null;
  const m = p.D.melee;
  G.projs.push({
    k: 'prop',
    kind: pr.kind,
    team: 0,
    src: p,
    x: p.x + p.face * 10,
    y: p.y,
    z: p.z + 40,
    vx: p.face * 5.6,
    vz: 0.8,
    dmg: pr.kind === 'drum' ? 24 + m : 16 + m * 1.1,
    life: 120
  });
  sfx.whiff();
}
function shatter(pr) {
  if (G.training) G.tf.prop = true;
  const col = { can: '#8a93a6', crate: '#a07a4a', drum: '#ff4a4a' }[pr.kind];
  burst(pr.x, pr.y, pr.z, col, 12);
  if (pr.src || pr.kind !== 'drum') shardDrop(pr.x, pr.y + 6, pr.kind === 'crate' ? 0.12 : 0.05);
  if (pr.kind === 'drum') {
    const rr = modOn('keg') ? 66 : 44;
    sfx.boom();
    G.shake = 8;
    G.fx.push({ k: 'ring', x: pr.x, y: pr.y, z: pr.z, c: '#ff6a3d', life: 20, max: 20, r: rr });
    burst(pr.x, pr.y, pr.z, '#ffc63d', 16);
    const foes = pr.team === 1 ? 0 : 1; // a drum a ganger threw burns runners instead
    for (const t of G.ents) {
      if (t.team !== foes || t.state === 'dead') continue;
      if (Math.abs(t.x - pr.x) < rr && Math.abs(t.y - pr.y) < (18 * rr) / 44)
        hurt(t, pr.dmg, t.x >= pr.x ? 1 : -1, {
          kd: true,
          big: true,
          air: true,
          col: '#ff6a3d',
          src: pr.src,
          ax: pr.x
        });
    }
  } else sfx.heavy();
}
function releaseGrab(p, quiet) {
  const e = p.grab;
  p.grab = null;
  p.knees = 0;
  if (e) e.flip = false;
  if (e && e.state === 'grabbed') {
    setS(e, 'idle');
    e.inv = 20;
    e.x += e.face * -8;
  }
  if (p.state === 'grab') setS(p, 'idle');
}
// who can be grabbed at all: no bosses, nothing heavy (mechs), nothing flying, nothing that isn't a fighter
const grabbable = e =>
  e.team === 1 &&
  !e.d.boss &&
  !e.d.heavy &&
  !e.d.fly &&
  !e.d.passive &&
  e.state !== 'dead' &&
  e.state !== 'down' &&
  e.state !== 'grabbed';
// and when: flinching from a hit, dazed after two in a row, or reeling on their last legs (under 30% health)
const reeling = e => e.hp > 0 && e.maxHp > 0 && e.hp < e.maxHp * 0.3;
const dazed = e => grabbable(e) && (e.state === 'hurt' || G.t < (e.dazeUntil || 0) || reeling(e));
// River City style: a foe flat on the street in front of you can be hauled up into a grab
function haulTarget(p) {
  return G.ents.find(
    e =>
      e.team === 1 &&
      e.state === 'down' &&
      !e.hauled && // once per knockdown: no endless haul, hook, haul loops
      e.z <= 1 &&
      e.hp > 0 &&
      !e.d.boss &&
      !e.d.heavy &&
      !e.d.fly &&
      !e.d.passive &&
      (e.x - p.x) * p.face > -4 &&
      (e.x - p.x) * p.face < 26 &&
      Math.abs(e.y - p.y) < 10
  );
}
function haulUp(p, e) {
  const I = INP[p.idx] || INP[0];
  setS(e, 'grabbed');
  e.hauled = true;
  e.vx = e.vz = 0;
  e.inv = 0; // the moment of grace for getting up doesn't protect someone hauled up
  e.dazeUntil = 0;
  p.grab = e;
  p.knees = 0;
  p.gp = 0;
  p.grabArmed = false;
  p.grabLockX = (I.held.right ? 1 : 0) - (I.held.left ? 1 : 0);
  p.grabLockY = (I.held.down ? 1 : 0) - (I.held.up ? 1 : 0);
  setS(p, 'grab');
  sfx.grab();
  say(p, 'UP YOU GET', '#ffc63d', 40, 30, true);
}
function tryGrab(p, dx) {
  if (dx === 0) return false;
  for (const e of G.ents) {
    if (!dazed(e)) continue;
    const rx = (e.x - p.x) * dx;
    if (rx < 0 || rx > 26 || Math.abs(e.y - p.y) > 10) continue;
    e.dazeUntil = 0;
    e.inv = 0;
    const I = INP[p.idx] || INP[0];
    p.grab = e;
    p.knees = 0;
    p.gp = 0;
    p.grabArmed = false;
    p.grabLockX = dx; // what was held walking in, so it doesn't throw by itself
    p.grabLockY = (I.held.down ? 1 : 0) - (I.held.up ? 1 : 0);
    p.face = dx;
    setS(p, 'grab');
    setS(e, 'grabbed');
    sfx.grab();
    return true;
  }
  return false;
}
