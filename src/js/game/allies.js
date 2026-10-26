/* Cyber City Tactics · src/js/game/allies.js
 * Hired companions (Kit) and temporary summons (Shaman spirits, Rigger drones).
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
function spawnAlly(type) {
  const A = ALLIES[type],
    lead = PL.find(p => !p.out) || PL[0],
    mx = Math.round(A.hp * (1 + (lead.lvl - 1) * 0.08));
  if (!PARTY.ally || PARTY.ally.type !== type) PARTY.ally = { type, hp: mx, maxHp: mx };
  PARTY.ally.maxHp = Math.max(PARTY.ally.maxHp, mx);
  const e = {
    kind: 'ally',
    ally: type,
    name: A.name,
    team: 0,
    d: Object.assign({}, A.d),
    pal: A.pal || {},
    x: lead.x - 24,
    y: clamp(lead.y + 12, FY0 + 6, FY1),
    z: A.d.fly ? 26 : 0,
    vx: 0,
    vz: 0,
    face: 1,
    state: 'idle',
    t: 0,
    walk: 0,
    inv: 60,
    flash: 0,
    hp: PARTY.ally.hp,
    maxHp: PARTY.ally.maxHp,
    D: { armor: A.armor, crit: 0.06, melee: 0 },
    hits: 0,
    lastHit: 0,
    cool: 30,
    combo: 0,
    hover: 0
  };
  G.ents = G.ents.filter(x => x.kind !== 'ally' || x.summon);
  G.ents.push(e);
  return e;
}
function spawnSummon(type, p, life, off) {
  const A = ALLIES[type],
    mx = Math.round(A.hp * 0.7 * (1 + (p.lvl - 1) * 0.08));
  const e = {
    kind: 'ally',
    ally: type,
    summon: true,
    life,
    owner: p,
    name: A.name,
    team: 0,
    d: Object.assign({}, A.d),
    pal: A.pal || {},
    x: p.x - p.face * 20 + off * 14,
    y: clamp(p.y + off * 14, FY0 + 6, FY1),
    z: A.d.fly ? 26 : 0,
    vx: 0,
    vz: 0,
    face: p.face,
    state: 'idle',
    t: 0,
    walk: 0,
    inv: 30,
    flash: 0,
    hp: mx,
    maxHp: mx,
    D: { armor: A.armor, crit: 0.06, melee: 0 },
    hits: 0,
    lastHit: 0,
    cool: 20,
    combo: 0,
    hover: Math.random() * 6
  };
  G.ents.push(e);
  burst(e.x, e.y, 20, type === 'ember' ? '#ff6a3d' : '#45d2ff', 12);
  G.fx.push({
    k: 'ring',
    x: e.x,
    y: e.y,
    z: 20,
    c: type === 'ember' ? '#ff6a3d' : '#45d2ff',
    life: 16,
    max: 16,
    r: 20
  });
  if (G.ents.filter(x => x.summon && x.state !== 'dead').length >= 3) feat('summon');
  return e;
}
function upAlly(e) {
  e.t++;
  if (e.flash > 0) e.flash--;
  if (e.inv > 0) e.inv--;
  physics(e);
  if (e.summon) {
    e.life--;
    if (e.life <= 0 || e.state === 'dead') {
      e.gone = true;
      burst(e.x, e.y, e.z + 10, e.ally === 'ember' ? '#ff6a3d' : '#45d2ff', 10);
      return;
    }
  }
  if (e.state === 'dead') {
    if (!e.reported) {
      e.reported = true;
      PARTY.ally = null;
      const p = alive()[0];
      if (p)
        say(
          p,
          e.ally === 'brick' ? 'BRICK IS DOWN' : e.ally === 'drone' ? 'DRONE SCRAPPED' : 'SPIRIT BANISHED',
          '#ff3d8b',
          80,
          80
        );
    }
    if (e.t > 60) e.gone = true;
    return;
  }
  if (PARTY.ally && !e.summon) PARTY.ally.hp = Math.max(0, Math.round(e.hp));
  if (e.state === 'down') {
    if (e.t > 50 && e.z === 0) {
      setS(e, 'idle');
      e.inv = 40;
    }
    return;
  }
  if (e.state === 'hurt') {
    if (e.t > 12) setS(e, 'idle');
    return;
  }
  const lead = alive()[0] || PL[0],
    lv = lead.lvl;
  if (e.d.fly) {
    e.hover += 0.08;
    e.z = (e.d.spirit ? 18 : 28) + Math.sin(e.hover) * 3;
  }
  let tg = null,
    bd = 1e9;
  for (const o of G.ents) {
    if (o.team !== 1 || o.state === 'dead' || (o.d.passive && e.ally !== 'brick')) continue;
    if (o.x < G.camX - 10 || o.x > G.camX + W + 10) continue;
    const dd = Math.abs(o.x - e.x) + Math.abs(o.y - e.y) * 2;
    if (dd < bd) {
      bd = dd;
      tg = o;
    }
  }
  e.cool--;
  if (e.state === 'windup') {
    if (e.t === 10) {
      e.combo++;
      if (!strike(e, 30, 12 + lv * 1.6, { kd: e.combo % 3 === 0, kb: 6, big: e.combo % 3 === 0 }))
        sfx.whiff();
    }
    if (e.t >= 22) {
      setS(e, 'idle');
      e.cool = 34;
    }
    return;
  }
  let tx, ty;
  if (!tg) {
    tx = lead.x - lead.face * 28;
    ty = lead.y + (e.d.fly ? -8 : 12);
  } else if (e.ally === 'drone') {
    tx = tg.x + (tg.x < e.x ? 80 : -80);
    ty = tg.y;
    e.face = tg.x >= e.x ? 1 : -1;
    if (Math.abs(e.y - tg.y) < 8 && Math.abs(e.x - tg.x) < 220 && e.cool <= 0) {
      G.projs.push({
        k: 'bullet',
        team: 0,
        src: lead,
        x: e.x + e.face * 10,
        y: e.y,
        z: e.z,
        vx: e.face * 6,
        dmg: 6 + lv * 1.3,
        life: 60
      });
      sfx.zap();
      e.cool = 42;
    }
  } else if (e.ally === 'ember') {
    tx = tg.x;
    ty = tg.y;
    e.face = tg.x >= e.x ? 1 : -1;
    if (Math.abs(tg.x - e.x) < 18 && Math.abs(tg.y - e.y) < 9 && e.cool <= 0) {
      hurt(tg, 8 + lv * 1.3, tg.x >= e.x ? 1 : -1, { src: lead, col: '#ff6a3d', ax: e.x, magic: true });
      e.cool = 38;
      burst(tg.x, tg.y, 20, '#ff6a3d', 8);
    }
  } else {
    tx = tg.x - (tg.x >= e.x ? 1 : -1) * 22;
    ty = tg.y;
    if (Math.abs(tg.x - e.x) < 32 && Math.abs(tg.y - e.y) < 8 && e.cool <= 0) {
      e.face = tg.x >= e.x ? 1 : -1;
      setS(e, 'windup');
      return;
    }
  }
  const sp = e.d.fly ? 1.6 : 1.15;
  let mx = clamp(tx - e.x, -sp, sp),
    my = clamp(ty - e.y, -sp * 0.7, sp * 0.7);
  if (Math.abs(tx - e.x) < 2) mx = 0;
  if (Math.abs(ty - e.y) < 1.5) my = 0;
  e.x += mx;
  e.y = clamp(e.y + my, FY0 + 6, FY1);
  if (!tg && mx) e.face = mx > 0 ? 1 : -1;
  if (G.den) e.x = clamp(e.x, 0, DEN.len);
  else e.x = clamp(e.x, G.camX - 20, G.camX + W + 20);
  if (!e.d.fly) {
    if (mx || my) {
      if (e.state !== 'walk') setS(e, 'walk');
      e.walk += 1;
    } else if (e.state !== 'idle') setS(e, 'idle');
  }
}
function drawAllyBar(e) {
  if (e.state === 'dead') return;
  if (e.summon && e.life < 120 && (G.t >> 2) % 2) return;
  const sx = e.x - G.camX,
    top = e.d.fly ? e.y - e.z - 18 : e.y - e.z - 60 * (e.d.scale || 1);
  fillPoly([sx - 3, top - 8, sx + 3, top - 8, sx, top - 4], '#7dffb0');
  if (e.hp < e.maxHp) bar(sx - 12, top - 2, 24, 2, e.hp, e.maxHp, '#7dffb0');
}
