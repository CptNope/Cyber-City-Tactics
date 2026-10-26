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
    for (const t of G.ents) {
      if (t.team !== 1 || t.state === 'dead') continue;
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
  if (e && e.state === 'grabbed') {
    setS(e, 'idle');
    e.inv = 20;
    e.x += e.face * -8;
  }
  if (p.state === 'grab') setS(p, 'idle');
}
function tryGrab(p, dx) {
  if (dx === 0) return false;
  for (const e of G.ents) {
    if (
      e.team !== 1 ||
      e.d.boss ||
      e.d.fly ||
      e.d.passive ||
      e.state === 'dead' ||
      e.state === 'down' ||
      e.state === 'grabbed'
    )
      continue;
    if (e.state !== 'hurt') continue;
    const rx = (e.x - p.x) * dx;
    if (rx < 2 || rx > 16 || Math.abs(e.y - p.y) > 6) continue;
    p.grab = e;
    p.knees = 0;
    p.face = dx;
    setS(p, 'grab');
    setS(e, 'grabbed');
    sfx.grab();
    return true;
  }
  return false;
}
