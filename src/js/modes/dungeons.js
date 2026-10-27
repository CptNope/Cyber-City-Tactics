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
    spawnPassive('chest', W - 44, FY0 + 22);
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
