/* Cyber City Tactics · src/js/modes/dungeons.js
 * Building interiors: rooms, guards, bosses, loot caches, bounty payouts and getting flatlined.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ----- building interiors ----- */
function enterBuilding(b) {
  G.wd.lastX = b.x;
  G.dun = { b, room: 0, rooms: roomsOf(b), fac: FAC[facOf(b)], rng: srng(b.seed) };
  newRunStats();
  enterRoom(0);
  setMode('play');
}
function enterRoom(i) {
  const D0 = G.dun,
    b = D0.b;
  resetWorld();
  D0.room = i;
  const base = D0.fac.theme < 0 ? DEN : STAGES[D0.fac.theme];
  G.dunStage = Object.assign({}, base, { len: W, name: b.name });
  G.bg = genBg(G.dunStage, (b.seed + i * 31) % 100000);
  G.stage = Math.min(4, b.tier - 1 + Math.floor((G.wd.level - 1) / 2));
  G.ng = Math.max(0, (G.wd.level - 4) * 0.2);
  placeRunners(50);
  for (const p of PL) if (!p.out) G.ents.push(p);
  if (PARTY.ally) spawnAlly(PARTY.ally.type);
  const r = D0.rng,
    last = i === D0.rooms - 1,
    pool = D0.fac.pool.concat(b.tier >= 3 ? D0.fac.t3 : []);
  const n = pool.length
    ? Math.min(b.type === 'club' ? 10 : 7, (b.tier + i + (G.coop ? 1 : 0)) * (b.type === 'club' ? 2 : 1))
    : 0;
  for (let k = 0; k < n; k++) spawnEnemy(pool[Math.floor(r() * pool.length)], k % 2 ? -1 : 1);
  if (!isGood(b) && G.wd.heat >= 2 && i >= 1)
    for (let k = 0; k < 1 + Math.floor(G.wd.heat / 4); k++) spawnEnemy(copKind(G.wd.heat, k), k % 2 ? -1 : 1);
  // hostage rooms: free them by clearing the room without hurting them
  const hostage = !last && isGood(b) && b.type !== 'secret' && r() < 0.35;
  // hazard rooms: an electrified floor lane, or a ceiling coming down in chunks
  if (!last && !hostage && b.type !== 'home' && r() < 0.3) {
    G.hazard = { k: r() < 0.5 ? 'shock' : 'ceiling', t: 0, lane: 0, drops: [] };
    G.texts.push({
      x: W / 2,
      y: FY0 - 4,
      z: 0,
      s: G.hazard.k === 'shock' ? 'LIVE WIRING · WATCH THE FLOOR' : 'UNSTABLE CEILING · WATCH FOR SHADOWS',
      c: '#ffc63d',
      life: 140,
      sm: true
    });
  }
  if (hostage) {
    spawnHostage(W * 0.55, FY0 + 34);
    G.texts.push({
      x: W * 0.55,
      y: FY0 + 34,
      z: 60,
      s: "HOSTAGE · DON'T HIT THEM",
      c: '#7dffb0',
      life: 120,
      sm: true
    });
    tip(
      'hostage',
      'A hostage! Clear the room without hitting them. Stray punches, bullets and blasts all hurt.'
    );
  }
  if (r() < 0.6)
    G.props.push({
      kind: ['can', 'crate', 'drum'][Math.floor(r() * 3)],
      x: 150 + r() * 200,
      y: FY0 + 20 + r() * 70,
      z: 0
    });
  G.banner = 90;
  if (last) {
    const bk = D0.fac.boss[b.tier];
    if (b.final) {
      const e = spawnEnemy('avatar', 1);
      e.x = W - 70;
      e.y = (FY0 + FY1) / 2;
      e.inv = 60;
      G.banner = -160;
      musicPlay('boss');
    } else if (bk) {
      const e = spawnEnemy(bk, 1);
      e.x = W - 70;
      e.y = (FY0 + FY1) / 2;
      e.inv = 40;
      e.name = D0.fac.bossName[b.tier];
      if (b.bounty && !G.wd.bountyDone) {
        e.bounty = true;
        e.name = '☠ ' + b.bounty.name;
      }
      if (b.type === 'secret' && !b.final) {
        e.pal = Object.assign({}, e.pal, { acc: '#b98cff', coat: '#2a1a3a' });
      }
      if (!DEF[bk].boss) {
        e.elite = e.bounty ? 'berserk' : null;
        e.hp = e.maxHp = Math.round(e.maxHp * (1.6 + b.tier * 0.3));
        e.dmg = Math.round(e.dmg * 1.15);
      } else {
        e.hp = e.maxHp = Math.round(e.maxHp * (b.tier >= 3 ? 0.8 : 0.6));
      }
      G.banner = -120;
      musicPlay('boss');
    }
    const cache = spawnPassive('chest', W - 44, FY0 + 22);
    // tier-3 fair-game buildings lock the cache in a vault: a second, harder hack for a much better haul
    if (b.tier >= 3 && isGood(b) && b.type !== 'secret' && !b.final) {
      cache.vault = true;
      cache.name = 'Vault';
    }
  }
  if (G.banner > 0) musicPlay(D0.fac.theme < 0 ? 'den' : 'd' + D0.fac.theme);
  G.waveLive = true;
  G.exitOpen = false;
  G.fade = 0.7;
  G.rain = [];
}
function dunTick() {
  const D0 = G.dun,
    last = D0.room === D0.rooms - 1;
  const foes = G.ents.filter(e => e.team === 1 && e.state !== 'dead' && !e.d.passive).length;
  const chest = G.ents.find(e => e.kind === 'chest' && e.state !== 'dead');
  hazardTick();
  const hz = G.ents.find(e => e.kind === 'hostage' && e.state !== 'dead' && !e.freed);
  if (hz && foes === 0) freeHostage(hz);
  for (const e of G.ents) if (e.freed && --e.freeT <= 0) e.gone = true;
  if (!G.exitOpen && foes === 0 && !(last && chest)) {
    G.exitOpen = true;
    G.goT = 150;
    if (last)
      G.texts.push({
        x: W / 2,
        y: 150,
        z: 0,
        s: 'EXIT ▶ BACK TO THE STREET',
        c: '#7dffb0',
        life: 120,
        sm: true
      });
  }
  if (last && chest && foes === 0 && G.t % 180 === 0)
    G.texts.push({ x: chest.x, y: chest.y, z: 40, s: 'BREAK THE CACHE', c: '#ffc63d', life: 60, sm: true });
  if (G.exitOpen && alive().some(p => p.x > W - 24)) {
    if (last) exitBuilding();
    else enterRoom(D0.room + 1);
  }
}
// Hazards hit everyone on the ground: runners, enemies, anyone. Lanes are a third of the floor each.
const LANES = 3,
  laneY = i => FY0 + 6 + ((FY1 - FY0 - 6) * i) / LANES;
function hazardTick() {
  const h = G.hazard;
  if (!h) return;
  h.t++;
  const onGround = e =>
    e.state !== 'dead' &&
    !e.out &&
    !(e.d && (e.d.fly || e.d.passive)) &&
    e.z < 3 &&
    (e.team === 0 || e.team === 1);
  if (h.k === 'shock') {
    const c = h.t % 240;
    if (c === 0) h.lane = Math.floor(Math.random() * LANES);
    if (c >= 70 && c < 170 && c % 15 === 0) {
      const y0 = laneY(h.lane),
        y1 = laneY(h.lane + 1);
      for (const e of G.ents)
        if (onGround(e) && e.y >= y0 && e.y < y1)
          hurt(e, 4, e.face ? -e.face : 1, { col: '#45d2ff', kb: 1, ax: e.x });
      if (c === 70) sfx.zap();
    }
  } else if (h.k === 'ceiling') {
    if (h.t % 70 === 0) {
      const a = alive(),
        tg = a.length ? pick(a) : null;
      h.drops.push({
        x: clamp((tg ? tg.x : W / 2) + rand(-60, 60), G.camX + 20, G.camX + W - 20),
        y: tg ? clamp(tg.y + rand(-12, 12), FY0 + 8, FY1) : (FY0 + FY1) / 2,
        t: 0
      });
    }
    for (const d of h.drops) {
      d.t++;
      if (d.t === 50) {
        for (const e of G.ents)
          if (onGround(e) && Math.abs(e.x - d.x) < 18 && Math.abs(e.y - d.y) < 10)
            hurt(e, 12, e.x >= d.x ? 1 : -1, { kd: true, big: true, col: '#a79dc2', ax: d.x });
        burst(d.x, d.y, 4, '#6b6280', 14);
        G.shake = Math.max(G.shake, 4);
        sfx.boom();
      }
    }
    h.drops = h.drops.filter(d => d.t < 70);
  }
}
function freeHostage(h) {
  const tier = G.dun.b.tier;
  h.freed = true;
  h.freeT = 90;
  h.inv = 999;
  gainKarma(30 * tier);
  G.wd.rep = Math.min(100, G.wd.rep + 5);
  drop('med', h.x + 12, h.y + 6);
  bump('hostages');
  sfx.level();
  G.texts.push({ x: h.x, y: h.y, z: 70, s: 'HOSTAGE FREED · CRED +5', c: '#7dffb0', life: 90 });
}
function hostageLost(h) {
  if (G.wd) G.wd.rep = Math.max(-100, G.wd.rep - 8);
  sfx.hurt();
  G.texts.push({ x: h.x, y: h.y, z: 70, s: 'HOSTAGE LOST · CRED −8', c: '#ff3d8b', life: 100 });
}
function payBounty(t) {
  const w = G.wd;
  if (!w || w.bountyDone) return;
  w.bountyDone = true;
  const b = G.dun && G.dun.b,
    rw = b && b.bounty ? b.bounty.reward : 150;
  drop('cred', t.x, t.y + 12, { v: rw });
  gainKarma(60);
  feat('bounty');
  legendDrop(t.x - 20, t.y + 10, 0.25);
  G.texts.push({ x: t.x, y: t.y, z: 90, s: 'BOUNTY COLLECTED +¥' + rw, c: '#ffc63d', life: 100, big: true });
}
function featCourier(t) {
  feat('courier');
  bump('couriers');
  drop('gear', t.x, t.y + 10, { item: randItem(G.stage + G.ng + 1, true) });
  drop('icebrk', t.x + 14, t.y + 12);
  drop('cred', t.x - 14, t.y + 12, { v: 60 + G.wd.level * 30 });
}
function lootChest(t) {
  const b = G.dun.b,
    tier = b.tier,
    fam = b.type === 'home' && !b.dirty;
  const c = Math.round(
    ri(25, 50) * tier * (b.type === 'business' ? 2 : fam ? 0.6 : 1) * (1 + G.wd.level * 0.15)
  );
  drop('cred', t.x - 10, t.y + 10, { v: c });
  if (b.type === 'secret') {
    if (b.final && !LEG.legs.includes('lantern'))
      drop('gear', t.x + 40, t.y + 6, { item: mkLegend('lantern') });
    legendDrop(t.x + 30, t.y + 10, b.vault ? 0.6 : 0.3) ||
      drop('gear', t.x + 30, t.y + 10, { item: randItem(G.stage + G.ng + 1, true) });
    shardDrop(t.x - 30, t.y + 12, 1);
  } else {
    if (tier >= 3) legendDrop(t.x + 30, t.y + 16, evOn('lockdown') && b.type === 'blacksite' ? 0.18 : 0.08);
    shardDrop(t.x - 30, t.y + 12, 0.3);
  }
  for (let k = 0; k < (fam ? 0 : tier); k++) {
    const it = randItem(G.stage + G.ng, tier >= 2);
    if (it.rar < tier - 1) Object.assign(it, mkItem(it.slot, it.base, tier - 1, it.mod || tier >= 3));
    drop('gear', t.x - 24 + k * 16, t.y + 14 + (k % 2) * 6, { item: it });
  }
  if (Math.random() < 0.35 + tier * 0.1 + (anyHas('icecraft') ? 0.25 : 0)) drop('icebrk', t.x + 14, t.y + 8);
  if (fam || Math.random() < 0.4) drop('med', t.x + 20, t.y + 14);
  if (!G.wd.looted.includes(b.id)) G.wd.looted.push(b.id);
  if (
    G.wd.street.buildings.filter(x => isGood(x) && x.type !== 'secret').every(x => G.wd.looted.includes(x.id))
  )
    feat('captain');
  if (b.type === 'club') feat('club');
  if (t.bonus) {
    // a cracked vault: double creds, an extra Prototype item and a real shot at a legendary
    drop('cred', t.x - 30, t.y + 18, { v: c });
    const it = randItem(G.stage + G.ng + 1, true);
    Object.assign(it, mkItem(it.slot, it.base, 2, true));
    drop('gear', t.x + 36, t.y + 18, { item: it });
    legendDrop(t.x + 10, t.y + 22, 0.35);
    feat('vault');
    G.texts.push({ x: t.x, y: t.y, z: 96, s: 'VAULT HAUL', c: '#ffc63d', life: 100, big: true });
  }
  if (b.type === 'precinct' && isGood(b)) {
    G.wd.heat = 0;
    G.wd.heatT = 0;
    drop('icebrk', t.x + 26, t.y + 4);
    drop('cred', t.x - 26, t.y + 4, { v: 150 + G.wd.level * 60 });
    feat('precinct');
    G.texts.push({ x: t.x, y: t.y, z: 96, s: 'FILE SHREDDED · HEAT 0', c: '#45d2ff', life: 110 });
  }
  if (isGood(b)) {
    const cr = 8 * tier * (evOn('gangwar') && b.type === 'hideout' ? 2 : 1);
    G.wd.rep = Math.min(100, G.wd.rep + cr);
    gainKarma(25 * tier);
    G.texts.push({ x: t.x - 40, y: t.y, z: 70, s: 'STREET CRED +' + cr, c: '#7dffb0', life: 90, big: true });
  } else
    G.texts.push({
      x: t.x - 40,
      y: t.y,
      z: 70,
      s: fam ? 'THEY HAD NEXT TO NOTHING' : 'CASH GRAB',
      c: '#ff3d8b',
      life: 90
    });
  sfx.loot();
}
function exitBuilding() {
  const b = G.dun.b;
  G.dun = null;
  enterStreet(b.x);
}
function worldWipe() {
  logRun('Sprawl', 'Flatlined', 'block ' + G.wd.level + ' · cred ' + Math.round(G.wd.rep));
  const lost = Math.round(PARTY.creds * 0.3);
  PARTY.creds -= lost;
  G.wd.heat = 0;
  G.wd.heatT = 0;
  G.dun = null;
  G.wipeLost = lost;
  musicPlay(null);
  M.cur = null;
  setMode('wiped');
}
