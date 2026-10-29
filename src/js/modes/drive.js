/* Cyber City Tactics · src/js/modes/drive.js
 * Driving missions: Road Rash on the causeway. Each runner rides a bike through the street's depth lanes:
 * hold right to throttle and left to brake, up and down to change lanes, dodge for a nitro burst, jump to hop
 * an oil slick. Punch and kick riders alongside, shoot what's ahead, and stay off the civilian traffic. Gang
 * bikers swing chains, and near the end a Kagemori Interceptor van hunts you down. Crash and you're back on
 * the bike a moment later, lighter in HP and in time.
 *
 * Everything on the road is an ordinary entity in G.ents (riders carry a `bk` bike, vehicles a `veh` kind), so
 * couch co-op and online co-op work exactly as they do on foot: the friend's runner is just another rider.
 * update() hands the whole step to driveUpdate() while G.drive is set.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
const DRIVE_JOBS = {
  causeway: {
    name: 'The Causeway Run',
    sub: "Get Juno's package across the bridge before Kagemori shuts it",
    stage: 0,
    len: 12500,
    time: 110 * 60,
    bikers: 1,
    traffic: 1,
    pay: 260,
    karma: 120
  },
  market: {
    name: 'Neon Market Getaway',
    sub: 'Out through the market with half the Rustline crews behind you',
    stage: 1,
    len: 11000,
    time: 95 * 60,
    bikers: 1.45,
    traffic: 1.35,
    pay: 340,
    karma: 160
  }
};
const DRIVE = {
  cruise: 3.4,
  max: 5.4,
  boost: 7.6,
  acc: 0.08,
  brake: 0.16,
  lane: 1.6,
  top: FY0 + 12,
  bot: FY1 - 4,
  nitroCost: 35
};
// cars and the van are drawn (and collide) at this size against the bikes
const VEH_SCALE = 1.45;
const driveJob = () => (G.drive && DRIVE_JOBS[G.drive.id]) || DRIVE_JOBS.causeway;

function startDrive(id, coop) {
  const J = DRIVE_JOBS[id] || DRIVE_JOBS.causeway;
  if (NET.role === 'host' && NET.live) coop = true; // the friend online is always runner 2
  jobCrew(coop);
  G.arena = false;
  G.den = false;
  G.training = false;
  G.world = false;
  G.dun = null;
  G.stage = J.stage;
  G.score = 0;
  resetWorld();
  // the district's look, stretched to the length of the run, with nothing of its own placed on it
  const S = Object.assign({}, STAGES[J.stage], {
    name: J.name,
    sub: J.sub,
    len: J.len + WMAX + 600,
    waves: [],
    props: [],
    passives: []
  });
  G.drive = {
    id: STAGES[J.stage] && DRIVE_JOBS[id] ? id : 'causeway',
    S,
    done: false,
    win: false,
    endT: 0,
    takedowns: 0,
    crashes: 0,
    boss: false,
    bossDown: false,
    spawnX: 520,
    carX: 380,
    oilX: 1500
  };
  G.ddist = 0;
  G.dtime = 0;
  G.bg = genBg(S, 2200 + J.stage * 31);
  placeRunners(90);
  for (const p of PL) {
    driveMount(p);
    G.ents.push(p);
  }
  makeRain(S.rain || S.weather === 'sleet');
  G.fade = 1;
  G.banner = 150;
  musicPlay('d' + Math.min(J.stage, 5));
  setMode('play');
  tip(
    'drive',
    'Hold → to throttle and ← to brake, ↑ ↓ to change lanes. PUNCH and KICK riders alongside, DODGE for nitro, JUMP over oil.',
    'Hold D to throttle and A to brake, W and S to change lanes. J and K hit riders alongside, U shoots, O is nitro, Space hops oil.'
  );
}
// put a runner on a bike (at the start, or a second runner joining mid-run)
function driveMount(p) {
  p.ride = true;
  p.bk = { v: DRIVE.cruise, nitro: 60, boostT: 0, crash: 0, wreck: false };
  p.face = 1;
  p.z = 0;
  p.vz = 0;
  p.holding = null;
  setS(p, 'ride');
}
function driveZ(e) {
  if (e.z > 0 || e.vz) {
    e.z += e.vz;
    e.vz -= 0.22;
    if (e.z <= 0) {
      e.z = 0;
      e.vz = 0;
      e.landAt = G.t;
    }
  }
}
function driveUpdate() {
  const D = G.drive,
    J = driveJob();
  for (const p of PL)
    if (!p.ride) {
      driveMount(p);
      p.x = G.camX + 60;
      p.y = clamp(p.y, DRIVE.top, DRIVE.bot);
      if (!G.ents.includes(p)) G.ents.push(p);
    }
  if (!D.done) G.dtime++;
  for (const p of PL) driveRider(p);
  for (const e of G.ents) {
    if (e.kind === 'player') continue;
    if (e.veh === 'van') driveVan(e);
    else if (e.ride) driveFoe(e);
    else if (e.veh === 'car') {
      e.x += e.bk.v;
      e.walk += e.bk.v;
    }
    if (e.flash > 0) e.flash--;
  }
  driveTraffic();
  drivePickups();
  driveSpawns(D, J);
  // the camera rides with the pack; nobody falls off the back or runs off the front
  const a = PL.filter(p => !p.out);
  if (a.length) {
    const mean = a.reduce((t, p) => t + p.x, 0) / a.length;
    G.camX = Math.max(0, G.camX + (mean - W * 0.38 - G.camX) * 0.12);
    for (const p of a) p.x = clamp(p.x, G.camX + 16, G.camX + W - 40);
    G.ddist = Math.min(1, Math.max(...a.map(p => p.x)) / J.len);
  }
  G.ents = G.ents.filter(e => e.kind === 'player' || e.x > G.camX - 260);
  // the finish line, or the clock running out
  if (!D.done && G.ddist >= 1) driveEnd(true);
  else if (!D.done && G.dtime >= J.time) driveEnd(false);
  if (D.done && --D.endT <= 0 && G.mode === 'play') driveFinish();
  tickFx();
  if (G.shake > 0) G.shake *= 0.85;
  if (G.shake < 0.3) G.shake = 0;
}
function driveRider(p) {
  const I = INP[p.idx] || { held: {}, pressed: {} },
    b = p.bk;
  if (!b) return;
  p.t++;
  if (p.inv > 0) p.inv--;
  if (p.flash > 0) p.flash--;
  driveZ(p);
  // crashed: the bike skids, the rider picks themselves up
  if (b.crash > 0) {
    b.crash--;
    b.v *= 0.95;
    p.x += b.v;
    if (b.crash === 0) {
      if (b.wreck) p.hp = Math.max(p.hp, Math.round(p.maxHp * 0.5));
      b.wreck = false;
      b.v = DRIVE.cruise * 0.7;
      p.inv = 70;
      setS(p, 'ride');
    }
    return;
  }
  if (G.drive.done) {
    b.v += (DRIVE.cruise - b.v) * 0.05;
    p.x += b.v;
    p.walk += b.v;
    return;
  }
  const top = b.boostT > 0 ? DRIVE.boost : DRIVE.max;
  if (I.held.right) b.v = Math.min(top, b.v + DRIVE.acc);
  else if (I.held.left) b.v = Math.max(1.2, b.v - DRIVE.brake);
  else b.v += (DRIVE.cruise - b.v) * 0.02;
  if (I.pressed.dodge && b.nitro >= DRIVE.nitroCost && !b.boostT) {
    b.nitro -= DRIVE.nitroCost;
    b.boostT = 55;
    G.shake = Math.max(G.shake, 3);
    sfx.roll();
  }
  if (b.boostT > 0) {
    b.boostT--;
    b.v = Math.max(b.v, DRIVE.boost - 0.6);
    if (G.t % 2 === 0)
      G.parts.push({
        x: p.x - 18,
        y: p.y,
        z: p.z + 6,
        vx: -1.5 - Math.random(),
        vy: 0,
        vz: Math.random() * 0.6,
        life: 12,
        c: Math.random() < 0.5 ? '#45d2ff' : '#ff6a3d',
        sz: 2
      });
  }
  b.nitro = Math.min(100, b.nitro + 0.07);
  if (I.held.up) p.y -= DRIVE.lane;
  if (I.held.down) p.y += DRIVE.lane;
  p.y = clamp(p.y, DRIVE.top, DRIVE.bot);
  if (I.pressed.jump && p.z === 0) {
    p.vz = 3.4;
    sfx.jump();
  }
  p.x += b.v;
  p.walk += b.v;
  if (I.pressed.item && PARTY.med > 0 && p.hp < p.maxHp) {
    PARTY.med--;
    p.hp = Math.min(p.maxHp, p.hp + 30);
    say(p, '+30 HP', '#7dffb0');
    sfx.heal();
  }
  const st = p.state,
    t = p.t;
  if (st === 'ride') {
    if (I.pressed.punch) setS(p, 'rpunch');
    else if (I.pressed.kick) setS(p, 'rkick');
    else if (I.pressed.gun && p.eq.gun) {
      if (p.ammo > 0) {
        setS(p, 'rshoot');
        driveShoot(p, I);
      } else sfx.click();
    } else if (I.pressed.spell) driveCast(p, I);
  } else {
    if (st === 'rpunch' && t === 4) driveStrike(p, false);
    if (st === 'rkick' && t === 7) driveStrike(p, true);
    if ((st === 'rpunch' && t >= 12) || (st === 'rkick' && t >= 17) || (st === 'rshoot' && t >= 12)) {
      setS(p, 'ride');
      p.face = 1; // done shooting over the shoulder: eyes front
    }
  }
}
const attrOf = (p, k) => (p.D && p.D.a && p.D.a[k]) || (p.attr && p.attr[k]) || 1;
function driveStrike(p, kick) {
  let any = false;
  for (const e of G.ents) {
    if (e.team !== 1 || e.state === 'dead') continue;
    const van = e.veh === 'van';
    if (
      Math.abs(e.x - p.x) > (van ? 48 * VEH_SCALE : kick ? 34 : 30) ||
      Math.abs(e.y - p.y) > (van ? 26 : 16)
    )
      continue;
    if (Math.abs(e.z - p.z) > 16) continue;
    let dmg = kick ? 13 + attrOf(p, 'str') * 2.2 : 8 + attrOf(p, 'str') * 1.6;
    if (van && !kick) dmg *= 0.35; // fists just bruise the plating
    driveHit(p, e, dmg, kick);
    // a boot shoves a rider a lane over and costs them speed
    if (kick && e.ride && e.state !== 'dead') {
      e.y = clamp(e.y + Math.sign(e.y - p.y || 1) * 10, DRIVE.top, DRIVE.bot);
      e.bk.v -= 1.2;
    }
    any = true;
  }
  if (!any) sfx.whiff();
}
// Who a shot or a spell goes for: hold left (braking) to aim behind you; otherwise the first thing ahead in
// your lane, or, with nothing ahead, whoever is closest behind
function driveAim(p, I, range, slack) {
  const back = I && I.held.left;
  let ahead = null,
    behind = null;
  for (const e of G.ents) {
    if (e.team !== 1 || e.state === 'dead') continue;
    const dx = e.x - p.x;
    if (Math.abs(dx) > range || Math.abs(e.y - p.y) > (e.veh === 'van' ? slack + 10 : slack)) continue;
    if (dx >= 0 && (!ahead || dx < ahead.x - p.x)) ahead = e;
    if (dx < 0 && (!behind || dx > behind.x - p.x)) behind = e;
  }
  if (back) return { t: behind, dir: -1 };
  return ahead ? { t: ahead, dir: 1 } : behind ? { t: behind, dir: -1 } : { t: null, dir: 1 };
}
function driveTracer(p, dir, ex, col, z) {
  const sx = p.x + dir * 18;
  for (let i = 0; i < 6; i++)
    G.parts.push({
      x: sx + ((ex - sx) * i) / 6,
      y: p.y,
      z: p.z + (z || 28),
      vx: dir * 4,
      vy: 0,
      vz: 0,
      life: 5 + i,
      c: col,
      sz: 1.6
    });
}
function driveShoot(p, I) {
  p.ammo--;
  sfx.shot();
  const { t, dir } = driveAim(p, I, 280, 13);
  p.face = dir; // a look over the shoulder for a shot behind
  driveTracer(p, dir, t ? t.x : p.x + dir * 280, '#ffe28a');
  if (t) driveHit(p, t, 10 + attrOf(p, 'agi') * 1.5, true);
}
// spells from the saddle: Fireball blasts a group, Manabolt and Chain Lightning hit hard, Heal and Barrier
// look after the riders around you
function driveCast(p, I) {
  const id = p.spells && p.spells[p.spell],
    sp = SPELLS[id];
  if (!sp) return;
  const cost = spellCost(p, sp);
  if (p.mp < cost) {
    sfx.click();
    say(p, 'NO MANA', '#45d2ff', 60, 30, true);
    return;
  }
  p.mp -= cost;
  const pw = (p.D && p.D.spell) || 10;
  setS(p, 'rshoot');
  sfx.spell();
  if (id === 'heal') {
    for (const q of PL)
      if (q.bk && Math.abs(q.x - p.x) < 70 && Math.abs(q.y - p.y) < 40) {
        q.hp = Math.min(q.maxHp, q.hp + Math.round(12 + pw * 1.2));
        say(q, '+HP', '#7dffb0', 60, 30, true);
      }
    G.fx.push({ k: 'ring', x: p.x, y: p.y, z: 20, c: '#7dffb0', life: 18, max: 18, r: 50 });
    return;
  }
  if (id === 'barrier') {
    p.inv = Math.max(p.inv, 150);
    say(p, 'BARRIER', '#45d2ff', 60, 40, true);
    G.fx.push({ k: 'ring', x: p.x, y: p.y, z: 20, c: '#45d2ff', life: 18, max: 18, r: 30 });
    return;
  }
  const { t, dir } = driveAim(p, I, 300, 16);
  p.face = dir;
  const col = id === 'fire' ? '#ff6a3d' : id === 'chain' ? '#9fe9ff' : '#b98cff';
  driveTracer(p, dir, t ? t.x : p.x + dir * 300, col, 30);
  if (!t) return;
  if (id === 'fire') {
    // the blast catches everyone close to the target
    for (const e of G.ents)
      if (e.team === 1 && e.state !== 'dead' && Math.abs(e.x - t.x) < 44 && Math.abs(e.y - t.y) < 22)
        driveHit(p, e, (14 + pw) * (e === t ? 1 : 0.6), true);
    G.fx.push({ k: 'ring', x: t.x, y: t.y, z: 24, c: '#ff6a3d', life: 20, max: 20, r: 46 });
    G.shake = Math.max(G.shake, 4);
  } else if (id === 'chain') {
    let last = t;
    const hit = new Set();
    for (let n = 0; n < 3 && last; n++) {
      hit.add(last);
      driveHit(p, last, (10 + pw) * (n ? 0.7 : 1), false);
      const from = last;
      last = G.ents.find(
        e => e.team === 1 && e.state !== 'dead' && !hit.has(e) && Math.abs(e.x - from.x) < 90 && e.hp > 0
      );
    }
  } else driveHit(p, t, 10 + pw * 1.25, false);
}
function driveHit(a, e, dmg, heavy) {
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg;
  e.flash = 6;
  G.combo++;
  G.comboT = 0;
  G.bestCombo = Math.max(G.bestCombo || 0, G.combo);
  G.texts.push({ x: e.x, y: e.y, z: e.z + 46, s: '' + dmg, c: '#efe9ff', life: 28, sm: true });
  (heavy ? sfx.heavy : sfx.hit)();
  for (let i = 0; i < 6; i++)
    G.parts.push({
      x: e.x,
      y: e.y,
      z: e.z + 26,
      vx: Math.random() * 3 - 1,
      vy: 0,
      vz: Math.random() * 2,
      life: 14,
      c: '#ffc63d',
      sz: 2
    });
  if (e.hp <= 0) driveWreck(e, a);
}
function driveWreck(e, by) {
  const D = G.drive,
    d = e.d || {};
  e.hp = 0;
  setS(e, 'dead');
  e.vz = 2.6;
  e.z = Math.max(e.z, 1);
  if (e.bk) e.bk.v *= 0.4;
  D.takedowns++;
  if (G.run) G.run.kills++;
  // the Codex counts road kills like any other (a stand-in so a boss van doesn't drop loot on the road)
  onKill({ team: 1, kind: e.kind, elite: e.elite, d: { passive: false } }, by);
  // loot spills onto the road a little ahead, in the wreck's lane: steer into it to grab it
  const cr = Math.round(rand(...(d.creds || [6, 12])));
  jobKarma(Math.round((d.karma || 10) * 0.6));
  const at = (dx, dy) => [e.x + dx + (e.bk ? e.bk.v * 10 : 40), clamp(e.y + dy, DRIVE.top, DRIVE.bot)];
  driveDrop('cred', ...at(40, 0), { v: d.boss ? cr * 3 : cr });
  const roll = Math.random();
  if (d.boss) {
    driveDrop('gear', ...at(70, -10), { item: randItem(G.stage + 1, true) });
    driveDrop('med', ...at(100, 10));
  } else if (roll < 0.14) driveDrop('ammo', ...at(70, 0));
  else if (roll < 0.24) driveDrop('med', ...at(70, 0));
  else if (roll < 0.32) driveDrop('mana', ...at(70, 0));
  else if (roll < 0.38) driveDrop('gear', ...at(70, 0), { item: randItem(G.stage, false) });
  if (d.boss) {
    D.bossDown = true;
    G.slow = 50;
    G.flash = 0.5;
    G.shake = 10;
    sfx.boom();
    G.texts.push({ x: e.x, y: e.y, z: 70, s: 'WRECKED', c: '#efe9ff', life: 80, big: true });
    G.fx.push({ k: 'ring', x: e.x, y: e.y, z: 20, c: '#ff6a3d', life: 26, max: 26, r: 90 });
  } else G.texts.push({ x: e.x, y: e.y, z: 56, s: 'TAKEDOWN', c: '#ff3d8b', life: 40, sm: true });
}
function driveDrop(k, x, y, extra) {
  G.picks.push(Object.assign({ k, x, y, t: 0, z: 0 }, extra || {}));
}
// riders grab what's on the road as they pass over it
function drivePickups() {
  for (const k of G.picks) {
    k.t++;
    if (k.got) continue;
    for (const p of PL)
      if (
        p.bk &&
        !p.out &&
        p.bk.crash === 0 &&
        p.z < 16 &&
        Math.abs(k.x - p.x) < 20 &&
        Math.abs(k.y - p.y) < 13
      ) {
        collect(k, p);
        k.got = true;
        break;
      }
  }
  G.picks = G.picks.filter(k => !k.got && k.x > G.camX - 120);
}
// a runner goes down: the bike skids out, they lose a moment and some HP
function driveCrash(p, frames, dmg) {
  const b = p.bk;
  if (!b || b.crash > 0 || p.inv > 0) return;
  p.hp -= dmg;
  p.flash = 8;
  G.drive.crashes++;
  if (p.hp <= 0) {
    // wrecked: a longer wait, then back on at half health
    p.hp = 0;
    b.wreck = true;
    frames = 150;
    say(p, 'WRECKED', '#ff3d4a', 70, 60);
  }
  b.crash = frames;
  b.boostT = 0;
  setS(p, 'down');
  p.vz = 2.4;
  p.z = Math.max(p.z, 1);
  G.shake = Math.max(G.shake, 6);
  sfx.hurt();
  sfx.heavy();
}
function driveHurt(p, dmg) {
  if (!p.bk || p.bk.crash > 0 || p.inv > 0) return;
  p.hp -= dmg;
  p.flash = 8;
  sfx.hurt();
  G.texts.push({ x: p.x, y: p.y, z: p.z + 46, s: '' + dmg, c: '#ff3d4a', life: 28, sm: true });
  if (p.hp <= 0) {
    p.hp = 1;
    driveCrash(p, 150, 1);
  } else if (Math.random() < 0.18) driveCrash(p, 50, 0); // knocked off balance
}
const driveTarget = e => {
  let best = null;
  for (const p of PL) {
    if (p.out || !p.bk) continue;
    const d = Math.abs(p.x - e.x) + Math.abs(p.y - e.y) * 2 + (p.bk.crash > 0 ? 400 : 0);
    if (!best || d < best.d) best = { p, d };
  }
  return best && best.p;
};
// a gang biker: pull alongside the nearest runner, a lane above or below, and swing the chain
function driveFoe(e) {
  const b = e.bk;
  e.t++;
  driveZ(e);
  if (e.state === 'dead') {
    b.v *= 0.97;
    e.x += b.v;
    return;
  }
  const tg = driveTarget(e);
  if (!tg) {
    e.x += b.v;
    return;
  }
  if (!e.side) e.side = Math.random() < 0.5 ? -1 : 1;
  let ty = tg.y + e.side * 13;
  if (ty < DRIVE.top || ty > DRIVE.bot) {
    e.side = -e.side;
    ty = tg.y + e.side * 13;
  }
  e.y = clamp(e.y + clamp(ty - e.y, -1.1, 1.1), DRIVE.top, DRIVE.bot);
  const dx = tg.x - 4 - e.x;
  b.v += clamp(tg.bk.v + dx * 0.025 - b.v, -0.09, 0.09);
  b.v = clamp(b.v, 1, DRIVE.max + 0.6);
  e.x += b.v;
  e.walk += b.v;
  if (e.cool > 0) e.cool--;
  if (e.state === 'ride' && e.cool <= 0 && Math.abs(dx) < 26 && Math.abs(e.y - tg.y) < 16) {
    setS(e, 'rpunch');
    e.cool = (e.d.cool || 64) * (e.coolMul || 1);
  }
  if (e.state === 'rpunch') {
    if (e.t === 4 && Math.abs(tg.x - e.x) < 30 && Math.abs(tg.y - e.y) < 17 && Math.abs(tg.z - e.z) < 14)
      driveHurt(tg, e.dmg);
    if (e.t >= 12) setS(e, 'ride');
  }
}
// the Interceptor: sits just ahead in the next lane, then swerves into you
function driveVan(e) {
  const b = e.bk;
  e.t++;
  if (e.state === 'dead') {
    b.v *= 0.98;
    e.x += b.v;
    if (G.t % 3 === 0)
      G.parts.push({
        x: e.x + rand(-20, 20),
        y: e.y,
        z: 26,
        vx: -1,
        vy: 0,
        vz: 0.8,
        life: 30,
        c: '#3a3344',
        sz: 4
      });
    return;
  }
  const tg = driveTarget(e);
  if (!tg) {
    e.x += b.v;
    return;
  }
  const dx = tg.x + 34 - e.x;
  b.v += clamp(tg.bk.v + dx * 0.02 - b.v, -0.07, 0.07);
  b.v = clamp(b.v, 1.5, DRIVE.max + 0.8);
  e.x += b.v;
  e.walk += b.v;
  if (e.ramT > 0) {
    e.ramT--;
    e.y = clamp(e.y + clamp(e.ramY - e.y, -2.4, 2.4), DRIVE.top + 6, DRIVE.bot);
    for (const p of PL)
      if (!p.out && p.bk && Math.abs(p.x - e.x) < 46 * VEH_SCALE && Math.abs(p.y - e.y) < 16 && p.z < 10) {
        driveCrash(p, 80, e.dmg);
        e.ramT = 0;
      }
  } else {
    const lane = tg.y + (e.y < tg.y ? -28 : 28);
    e.y = clamp(e.y + clamp(lane - e.y, -0.8, 0.8), DRIVE.top + 6, DRIVE.bot);
    if (e.cool > 0) e.cool--;
    else if (Math.abs(tg.x - e.x) < 70) {
      e.ramT = 46;
      e.ramY = tg.y;
      e.cool = 150 * (e.coolMul || 1);
      G.texts.push({ x: e.x, y: e.y, z: 60, s: '!', c: '#ff3d4a', life: 30 });
      sfx.clank();
    }
  }
}
// civilian cars, oil and riders running into each other
function driveTraffic() {
  const riders = G.ents.filter(e => e.bk && e.ride && e.state !== 'dead');
  for (const o of G.ents) {
    if (o.veh !== 'car' && o.veh !== 'oil') continue;
    for (const r of riders) {
      if (r.z > (o.veh === 'oil' ? 2 : 8)) continue;
      if (
        Math.abs(r.x - o.x) > (o.veh === 'oil' ? 18 : 30 * VEH_SCALE) ||
        Math.abs(r.y - o.y) > (o.veh === 'oil' ? 6 : 9 * VEH_SCALE)
      )
        continue;
      if (r.kind === 'player') {
        if (o.veh === 'oil') driveCrash(r, 44, 4);
        else {
          driveCrash(r, 70, 9);
          r.x = o.x - 34 * VEH_SCALE;
        }
      } else if (r.team === 1) {
        // shove a biker into traffic and the traffic does the rest
        driveWreck(r, null);
      }
    }
  }
}
function driveSpawns(D, J) {
  if (D.done) return;
  const cx = G.camX,
    bossAt = J.len * 0.72;
  // gang bikers, from behind (catching up) or ahead (waiting)
  if (cx > D.spawnX && cx < bossAt) {
    const live = G.ents.filter(e => e.ride && e.team === 1 && e.state !== 'dead').length;
    if (live < (G.coop ? 5 : 4)) {
      const n = 1 + (Math.random() < 0.35 * J.bikers ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const behind = Math.random() < 0.6,
          e = spawnEnemy('biker', behind ? -1 : 1);
        e.elite = null;
        e.ride = true;
        e.face = 1;
        e.x = behind ? cx - 30 - i * 30 : cx + W + 30 + i * 30;
        e.y = rand(DRIVE.top, DRIVE.bot);
        e.bk = { v: behind ? DRIVE.max + 0.6 : DRIVE.cruise - 0.6, crash: 0 };
        e.cool = 40 + i * 20;
        setS(e, 'ride');
      }
    }
    D.spawnX += rand(520, 900) / J.bikers;
  }
  // civilian cars, slower than you, in a lane of their own
  if (cx > D.carX) {
    const y = rand(DRIVE.top + 4, DRIVE.bot - 2);
    const cars = G.ents.filter(o => o.veh === 'car' && o.x > cx - 40);
    if (cars.length < 4 && !cars.some(o => Math.abs(o.y - y) < 24 && o.x > cx + W - 140))
      G.ents.push({
        kind: 'car',
        veh: 'car',
        team: 2,
        d: { name: 'Car', passive: true },
        pal: PALS[0],
        x: cx + W + 90,
        y,
        z: 0,
        vz: 0,
        face: 1,
        state: 'idle',
        t: 0,
        walk: 0,
        inv: 0,
        flash: 0,
        hp: 1,
        maxHp: 1,
        col: pick(['#4a6b8a', '#7a5a34', '#5a2f6e', '#2f5a4a', '#8a3a3a', '#6b6280']),
        bk: { v: rand(1.6, 2.8) }
      });
    D.carX += rand(380, 720) / J.traffic;
  }
  // oil on the road
  if (cx > D.oilX) {
    G.ents.push({
      kind: 'oil',
      veh: 'oil',
      team: 2,
      d: { name: 'Oil', passive: true },
      pal: PALS[0],
      x: cx + W + 50,
      y: rand(DRIVE.top + 6, DRIVE.bot - 4),
      z: 0,
      vz: 0,
      face: 1,
      state: 'idle',
      t: 0,
      walk: 0,
      inv: 0,
      flash: 0,
      hp: 1,
      maxHp: 1
    });
    D.oilX += rand(1300, 2300);
  }
  // the Interceptor comes for you on the last stretch
  if (!D.boss && cx > bossAt) {
    D.boss = true;
    const v = spawnEnemy('interceptor', -1);
    v.elite = null;
    v.veh = 'van';
    v.x = cx - 90;
    v.y = (DRIVE.top + DRIVE.bot) / 2;
    v.face = 1;
    v.bk = { v: DRIVE.max + 1 };
    v.cool = 120;
    v.ramT = 0;
    setS(v, 'ride');
    musicPlay('boss');
  }
}
function driveEnd(win) {
  const D = G.drive;
  D.done = true;
  D.win = win;
  D.endT = 110;
  G.texts.push({
    x: G.camX + W / 2,
    y: 150,
    z: 0,
    s: win ? 'DELIVERED' : 'BRIDGE CLOSED',
    c: win ? '#ffc63d' : '#ff3d4a',
    life: 110,
    big: true
  });
  (win ? sfx.level : sfx.clank)();
}
function driveFinish() {
  const D = G.drive,
    J = driveJob(),
    left = Math.max(0, Math.round((J.time - G.dtime) / 60));
  const pay = D.win ? J.pay + D.takedowns * 10 + (D.bossDown ? 150 : 0) + left * 2 : D.takedowns * 5,
    karma = D.win ? J.karma + D.takedowns * 4 + (D.bossDown ? 60 : 0) : 0;
  PARTY.creds += pay;
  if (karma) jobKarma(karma);
  const rec = store.load('cs_drive') || {},
    prev = rec[D.id];
  const best = D.win && (!prev || !prev.best || G.dtime < prev.best);
  if (D.win)
    rec[D.id] = {
      best: best ? G.dtime : prev.best,
      takedowns: Math.max(D.takedowns, (prev && prev.takedowns) || 0)
    };
  store.set('cs_drive', rec);
  if (D.win) bump('drives');
  logRun('Job', J.name, D.win ? fmtTime(G.dtime) : 'Bridge closed');
  G.dresult = {
    win: D.win,
    time: G.dtime,
    takedowns: D.takedowns,
    crashes: D.crashes,
    boss: D.bossDown,
    pay,
    karma,
    best,
    coop: G.coop,
    take: jobTake()
  };
  musicPlay('title');
  setMode('driveover');
}
const fmtTime = f => {
  const s = Math.round(f / 60);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};

/* ---------- screens ---------- */
function jobsHtml() {
  const rec = store.load('cs_drive') || {},
    srec = store.load('cs_stealth') || {};
  const drive = Object.keys(DRIVE_JOBS)
    .map(k => {
      const J = DRIVE_JOBS[k],
        r = rec[k];
      return `<div class="job"><div class="row" style="justify-content:space-between"><b>${esc(J.name)}</b><span class="st" style="color:var(--gold)">Driving · ${STAGES[J.stage].name}</span></div>
    <span style="color:var(--muted);font-size:13px">${esc(J.sub)}. ${fmtTime(J.time)} on the clock.${r && r.best ? ` Your best: ${fmtTime(r.best)}, ${r.takedowns} takedowns.` : ''}</span>
    <div class="row" style="margin-top:6px"><button class="btn sm" data-a="drive:${k}:1">Ride solo</button><button class="btn sm ghost" data-a="drive:${k}:2">Ride co-op</button></div></div>`;
    })
    .join('');
  const frec = store.load('cs_flight') || {};
  const flight = Object.keys(FLIGHT_JOBS)
    .map(k => {
      const J = FLIGHT_JOBS[k],
        r = frec[k];
      return `<div class="job"><div class="row" style="justify-content:space-between"><b>${esc(J.name)}</b><span class="st" style="color:#ff9f6b">Flight · ${STAGES[J.stage].name}</span></div>
    <span style="color:var(--muted);font-size:13px">${esc(J.sub)}.${r && r.kills ? ` Your best: ${r.kills} shot down, hull ${r.hull}%.` : ''}</span>
    <div class="row" style="margin-top:6px"><button class="btn sm" data-a="flight:${k}:1">Fly solo</button><button class="btn sm ghost" data-a="flight:${k}:2">Pilot and gunner</button></div></div>`;
    })
    .join('');
  const stealth = Object.keys(STEALTH_JOBS)
    .map(k => {
      const J = STEALTH_JOBS[k],
        r = srec[k];
      return `<div class="job"><div class="row" style="justify-content:space-between"><b>${esc(J.name)}</b><span class="st" style="color:var(--mana)">Drone · ${STAGES[J.stage].name}</span></div>
    <span style="color:var(--muted);font-size:13px">${esc(J.sub)}.${r && r.best ? ` Your best: ${fmtTime(r.best)}${r.ghost ? ', ghosted' : ''}.` : ''}</span>
    <div class="row" style="margin-top:6px"><button class="btn sm" data-a="stealth:${k}:1">Fly solo</button><button class="btn sm ghost" data-a="stealth:${k}:2">Fly co-op</button><button class="btn sm ghost" data-a="stealth:${k}:ow">Overwatch co-op</button></div></div>`;
    })
    .join('');
  return `<div class="card"><p class="eyebrow">Jobs · Juno's side work</p><h2>Jobs</h2>
    <p>Quick jobs that aren't a brawl. Pay and gear from a job can be banked to your campaign or Sprawl save afterwards.</p>
    <h3>Driving</h3>
    <p style="font-size:13px">Each runner gets a bike: <b>hold right to throttle</b>, left to brake, up and down to change lanes. Punch and kick riders alongside you, shoot what's ahead (or behind), <b>dodge for nitro</b> and <b>jump over oil</b>. Stay off the civilian cars, and watch for the Kagemori Interceptor on the last stretch.</p>
    ${drive}
    <h3>Drone stealth</h3>
    <p style="font-size:13px">Each runner flies a drone through a corp floor. <b>Stay out of the light cones</b>: cameras sweep from the ceiling and guards see ahead of them. Walls only open at their vents and lasers blink on and off. <b>Punch</b> hacks the terminal, <b>kick</b> fires a shock dart (only works from behind), <b>dodge</b> cloaks for a moment. Get seen too long and the alarm goes up; three alarms and the floor locks down.</p>
    ${stealth}
    <h3>Flight</h3>
    <p style="font-size:13px">A VTOL run over the city that scrolls by on its own. Runner 1 flies: <b>hold punch</b> (or gun) for the nose cannon, <b>spell</b> fires a rocket, <b>dodge</b> drops a flare that shakes missiles. Runner 2 works the <b>door gun</b>: up and down to swing it, hold punch to fire (solo, it fires on its own). Watch the towers' searchlights: hold still in one and flak comes for you.</p>
    ${flight}
    <div class="row"><button class="btn ghost" data-a="back2title">Back</button></div></div>`;
}
function driveOverHtml() {
  const r = G.dresult || {},
    J = driveJob();
  return `<div class="card"><p class="eyebrow">Job · ${esc(J.name)}${r.coop ? ' · co-op' : ''}</p><h1>${r.win ? 'Delivered' : 'Bridge closed'}</h1>
    <p>${r.win ? `Across in ${fmtTime(r.time)}.${r.best ? ' Your best time yet.' : ''}` : "Kagemori shut the causeway before you made it across. Juno's not paying for a package that's still on this side."}</p>
    <div class="list">
      <div class="item"><div><div class="nm">Takedowns</div></div><div class="acts">${r.takedowns || 0}</div></div>
      <div class="item"><div><div class="nm">Crashes</div></div><div class="acts">${r.crashes || 0}</div></div>
      <div class="item"><div><div class="nm">Interceptor</div></div><div class="acts">${r.boss ? 'Wrecked (+¥150)' : 'Got away'}</div></div>
      <div class="item"><div><div class="nm">Paid</div></div><div class="acts" style="color:var(--gold)">¥${r.pay || 0}${r.karma ? ` · ${r.karma} karma` : ''}</div></div>
    </div>
    ${jobEndHtml(r.take, '<button class="btn" data-a="driveagain">Ride it again</button>')}</div>`;
}
