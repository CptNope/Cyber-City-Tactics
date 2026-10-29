/* Cyber City Tactics · src/js/modes/flight.js
 * Flight jobs: a VTOL run over the skyline as a side-scrolling shooter. The city scrolls by on its own; Runner
 * 1 flies (stick to move, punch or gun for the nose cannon, spell for a rocket, dodge for a flare that clears
 * missiles and a moment of evasion, medkit to patch the hull). Runner 2, on the couch or online, works the door
 * turret: up and down swing it, punch fires. Solo, the turret fires on its own, slower. Corp drones weave and
 * shoot, gunships hold the right of the screen and fire spreads, searchlights on the towers call down flak,
 * and the towers themselves stand in the way. At the end the Raijin gunship guards the drop zone.
 *
 * As with the other jobs, everything is entities and plain G fields (the VTOL is an entity; the hull is
 * G.fhull), so couch and online co-op need nothing extra.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
const FLIGHT_JOBS = {
  skyline: {
    name: 'Over the Skyline',
    sub: 'Fly the team across Kagemori airspace and drop them on the Arcology roof',
    stage: 4,
    len: 9000,
    drones: 1,
    pay: 300,
    karma: 140,
    // the drop: off the ramp onto the Arcology roof, and Kagemori security comes up the stairwells
    roof: [
      ['sec', 'sec', 'drone'],
      ['riot', 'sec', 'ninja', 'drone'],
      ['mech', 'sec', 'ninja']
    ]
  },
  storm: {
    name: 'Into the Storm',
    sub: 'A night run out of the Barrens through a lightning storm, gunships on your tail',
    stage: 0,
    len: 8000,
    drones: 1.35,
    pay: 360,
    karma: 170
  }
};
const FL = {
  base: FY1, // every flying thing stands on this plane; height above it is z
  zMin: 44,
  zMax: 196, // keeps the VTOL clear of the HUD at the top
  scroll: 2.1,
  speed: 2.6,
  hull: 120
};
const flightJob = () => (G.flight && FLIGHT_JOBS[G.flight.id]) || FLIGHT_JOBS.skyline;
const flyY = e => FL.base - e.z; // screen y of anything in the air

function startFlight(id, coop) {
  const J = FLIGHT_JOBS[id] || FLIGHT_JOBS.skyline;
  if (NET.role === 'host' && NET.live) coop = true;
  jobCrew(coop);
  G.arena = false;
  G.den = false;
  G.training = false;
  G.world = false;
  G.dun = null;
  G.stage = J.stage;
  G.score = 0;
  resetWorld();
  const S = Object.assign({}, STAGES[J.stage], {
    name: J.name,
    sub: J.sub,
    len: J.len + WMAX + 900,
    waves: [],
    props: [],
    passives: []
  });
  const r = srng((Math.random() * 1e9) | 0);
  // the towers that stand up into your flight path, each with a roof height and maybe a searchlight
  const towers = [];
  for (let x = 700; x < J.len - 600; x += 380 + Math.floor(r() * 420))
    towers.push({
      x,
      w: 46 + Math.floor(r() * 40),
      top: 120 + Math.floor(r() * 70),
      light: r() < 0.45,
      ph: r() * 6.28
    });
  G.flight = {
    id: FLIGHT_JOBS[id] ? id : 'skyline',
    S,
    towers,
    done: false,
    win: false,
    endT: 0,
    kills: 0,
    boss: false,
    bossDown: false,
    spawnX: 420,
    gunX: 1600
  };
  G.fhull = FL.hull;
  G.fdist = 0;
  G.ftime = 0;
  G.bg = genBg(S, 4100 + J.stage * 13);
  const v = {
    kind: 'vtol',
    veh: 'vtol',
    team: 0,
    d: { name: 'VTOL', passive: true },
    pal: PALS[0],
    x: 120,
    y: FL.base,
    z: 150,
    vx: 0,
    vz: 0,
    face: 1,
    state: 'idle',
    t: 0,
    walk: 0,
    inv: 0,
    flash: 0,
    hp: 1,
    maxHp: 1,
    aim: 0.35, // the door turret's angle, below the horizon
    fireT: 0,
    turT: 0,
    flareT: 0,
    flares: 3
  };
  G.ents.push(v);
  makeRain(J.stage === 0);
  G.fade = 1;
  G.banner = 150;
  musicPlay('d' + Math.min(J.stage, 5));
  setMode('play');
  tip(
    'flight',
    'Stick to fly. PUNCH fires the cannon, SPELL a rocket, DODGE drops a flare (three a flight) that clears incoming missiles. Runner 2 swings the door gun with up and down and fires with PUNCH.',
    'WASD to fly, J (or U) fires, I fires a rocket, O drops a flare (three a flight) that clears incoming missiles. Runner 2 swings the door gun with up and down and fires with PUNCH (arrows and comma on a shared keyboard, your usual keys online).'
  );
}
const vtolOf = () => G.ents.find(e => e.kind === 'vtol');

/* ---------- the step ---------- */
function flightUpdate() {
  const F = G.flight,
    J = flightJob(),
    v = vtolOf();
  if (!v) return;
  if (!F.done) G.ftime++;
  // the city scrolls on its own; the VTOL flies inside the frame
  const goal = J.len - W * 0.5;
  if (!F.done)
    G.camX = Math.min(goal, G.camX + FL.scroll * (F.boss && !F.bossDown && G.camX >= goal ? 0 : 1));
  G.fdist = Math.min(1, G.camX / goal);
  flightPilot(v, F);
  flightGunner(v, F);
  for (const e of G.ents) {
    if (e.air) flightFoe(e, v, F);
    if (e.flash > 0) e.flash--;
  }
  flightShots(v, F);
  flightTowers(v, F);
  flightPickups(v);
  flightSpawns(F, J);
  // runners ride inside the VTOL (one who joins mid-flight takes the door gun), so they're never on screen
  G.ents = G.ents.filter(e => e.kind !== 'player' && (e.kind === 'vtol' || e.x > G.camX - 120));
  if (!F.done) {
    if (F.bossDown) flightEnd(true, 'DROP ZONE');
    else if (G.fhull <= 0) flightEnd(false, 'GOING DOWN');
  }
  if (F.done && --F.endT <= 0 && G.mode === 'play') {
    if (F.win && J.roof) roofStart();
    else flightFinish();
  }
  tickFx();
  if (G.shake > 0) G.shake *= 0.85;
  if (G.shake < 0.3) G.shake = 0;
}
function flightPilot(v, F) {
  const p = PL[0],
    I = INP[0];
  v.t++;
  if (v.inv > 0) v.inv--;
  if (v.flareT > 0) v.flareT--;
  if (v.fireT > 0) v.fireT--;
  if (F.done) {
    // after the drop: drift down onto the roof, or spiral out
    v.x += F.win ? 1.6 : 2.4;
    v.z = Math.max(FL.zMin, v.z - (F.win ? 0.6 : 1.8));
    return;
  }
  const ax = (I.held.right ? 1 : 0) - (I.held.left ? 1 : 0),
    az = (I.held.up ? 1 : 0) - (I.held.down ? 1 : 0);
  v.vx += (ax * FL.speed - v.vx) * 0.18;
  v.vz += (az * FL.speed - v.vz) * 0.18;
  v.x = clamp(v.x + v.vx + FL.scroll, G.camX + 24, G.camX + W - 70);
  v.z = clamp(v.z + v.vz, FL.zMin, FL.zMax);
  v.walk += 3;
  // the nose cannon: hold to keep firing
  if ((I.held.punch || I.held.gun) && v.fireT <= 0) {
    v.fireT = 7;
    flightShot(v.x + 30, v.z + 2, 7.5, 0, 6 + attrOf(p, 'agi') * 0.8, 'bullet');
    if (G.t % 2) sfx.shot();
  }
  // a rocket from the mana pool
  if (I.pressed.spell) {
    const cost = 16;
    if (p.mp >= cost) {
      p.mp -= cost;
      flightShot(v.x + 26, v.z - 4, 4.5, 0, 26 + ((p.D && p.D.spell) || 10), 'rocket');
      sfx.spell();
    } else say(p, 'NO MANA', '#45d2ff', 60, 30, true);
  }
  // a flare: missiles chase it instead, and the VTOL jinks clear for a moment
  if (I.pressed.dodge && v.flares > 0 && !v.flareT) {
    v.flares--;
    v.flareT = 60;
    v.inv = 50;
    for (const q of G.projs) if (q.foe && q.k === 'missile') q.life = 0;
    for (let i = 0; i < 10; i++)
      G.parts.push({
        x: v.x - 10,
        y: FL.base,
        z: v.z,
        vx: -1 - Math.random() * 2,
        vy: 0,
        vz: (Math.random() - 0.5) * 2,
        life: 30,
        c: i % 2 ? '#ffc63d' : '#ff6a3d',
        sz: 2.4
      });
    sfx.zap();
  }
  if (I.pressed.item && PARTY.med > 0 && G.fhull < FL.hull) {
    PARTY.med--;
    G.fhull = Math.min(FL.hull, G.fhull + 30);
    say(p, 'HULL PATCHED', '#7dffb0');
    sfx.heal();
  }
}
// the door turret: runner 2 aims it; alone, it picks targets itself at a slower rate
function flightGunner(v, F) {
  if (v.turT > 0) v.turT--;
  if (F.done) return;
  const gunner = PL[1];
  if (gunner) {
    const I = INP[1];
    if (I.held.up) v.aim = Math.max(-0.9, v.aim - 0.04);
    if (I.held.down) v.aim = Math.min(1.25, v.aim + 0.04);
    if ((I.held.punch || I.held.gun) && v.turT <= 0) {
      v.turT = 6;
      flightShot(
        v.x + 4,
        v.z - 10,
        Math.cos(v.aim) * 7,
        -Math.sin(v.aim) * 7,
        6 + attrOf(gunner, 'agi') * 0.8,
        'bullet'
      );
      if (G.t % 2) sfx.shot();
    }
  } else if (v.turT <= 0) {
    // the autogun: the nearest target in front and below
    let best = null;
    for (const e of G.ents)
      if (
        e.air &&
        e.hp > 0 &&
        e.x > v.x - 20 &&
        e.x < v.x + 280 &&
        (!best || Math.abs(e.x - v.x) < Math.abs(best.x - v.x))
      )
        best = e;
    if (best) {
      const a = Math.atan2(v.z - 10 - best.z, best.x - v.x);
      v.aim = clamp(a, -0.9, 1.25);
      v.turT = 26;
      flightShot(v.x + 4, v.z - 10, Math.cos(v.aim) * 7, -Math.sin(v.aim) * 7, 5, 'bullet');
    }
  }
}
function flightShot(x, z, vx, vz, dmg, k, foe) {
  G.projs.push({
    k,
    air: true,
    foe: !!foe,
    x,
    y: FL.base,
    z,
    vx,
    vz,
    dmg,
    life: k === 'missile' ? 220 : 120,
    r: k === 'rocket' ? 5 : 3
  });
}
function flightShots(v, F) {
  for (const q of G.projs) {
    if (!q.air) continue;
    if (q.k === 'missile' && q.life > 0) {
      // missiles turn toward the VTOL (slowly), unless a flare is burning
      const a = Math.atan2(v.z - q.z, v.x - q.x),
        sp = 2.6;
      q.vx += (Math.cos(a) * sp - q.vx) * 0.04;
      q.vz += (Math.sin(a) * sp - q.vz) * 0.04;
    }
    q.x += q.vx + (q.foe ? 0 : 0);
    q.z += q.vz;
    q.life--;
    if (q.z < -20 || q.z > 300 || q.x < G.camX - 40 || q.x > G.camX + W + 60) q.life = 0;
    if (q.life <= 0) continue;
    if (q.foe) {
      if (!F.done && v.inv <= 0 && Math.abs(q.x - v.x) < 26 && Math.abs(q.z - v.z) < 12) {
        q.life = 0;
        flightHurt(v, q.dmg);
      }
    } else
      for (const e of G.ents) {
        if (!e.air || e.hp <= 0) continue;
        const R = e.big ? 34 : e.gun ? 22 : 12;
        if (Math.abs(q.x - e.x) < R && Math.abs(q.z - e.z) < R * 0.6) {
          q.life = 0;
          flightHit(e, q.dmg, q.k === 'rocket');
          break;
        }
      }
  }
  G.projs = G.projs.filter(q => q.life > 0);
}
function flightHit(e, dmg, boom) {
  e.hp -= dmg;
  e.flash = 5;
  sfx.hit();
  if (boom) {
    G.fx.push({ k: 'ring', x: e.x, y: FL.base, z: e.z, c: '#ff6a3d', life: 16, max: 16, r: 30 });
    for (const o of G.ents)
      if (o !== e && o.air && o.hp > 0 && Math.hypot(o.x - e.x, o.z - e.z) < 40) o.hp -= dmg * 0.5;
  }
  if (e.hp <= 0) flightKill(e);
}
function flightKill(e) {
  const F = G.flight;
  e.hp = 0;
  F.kills++;
  if (G.run) G.run.kills++;
  jobKarma(e.big ? 80 : e.gun ? 16 : 6);
  onKill({ team: 1, kind: e.kind, elite: null, d: { passive: false } }, PL[0]);
  sfx.boom();
  G.shake = Math.max(G.shake, e.big ? 12 : 3);
  for (let i = 0; i < (e.big ? 30 : 10); i++)
    G.parts.push({
      x: e.x,
      y: FL.base,
      z: e.z,
      vx: (Math.random() - 0.5) * 5,
      vy: 0,
      vz: (Math.random() - 0.3) * 4,
      life: 24,
      c: pick(['#ff6a3d', '#ffc63d', '#3a3344']),
      sz: 2.6
    });
  G.fx.push({ k: 'ring', x: e.x, y: FL.base, z: e.z, c: '#ffc63d', life: 18, max: 18, r: e.big ? 80 : 26 });
  // salvage drifts in the air where they fell: fly through it to grab it
  const drop = (k, dx, dz, extra) =>
    G.picks.push(
      Object.assign({ k, air: true, x: e.x + dx, y: flyY(e) + dz, z: e.z - dz, t: 0 }, extra || {})
    );
  drop('cred', 0, 0, { v: e.big ? 160 : e.gun ? 30 : 8 });
  if (e.big) {
    drop('gear', 24, -10, { item: randItem(G.stage + 1, true) });
    F.bossDown = true;
    G.slow = 60;
    G.texts.push({ x: e.x, y: FL.base, z: e.z + 30, s: 'RAIJIN DOWN', c: '#efe9ff', life: 90, big: true });
  } else if (Math.random() < (e.gun ? 0.5 : 0.12)) drop(pick(['med', 'mana', 'ammo']), 16, 0);
  e.dead = true;
  e.x = -9999; // gone: the explosion is what's left
}
function flightHurt(v, dmg) {
  G.fhull = Math.max(0, G.fhull - dmg);
  v.flash = 8;
  v.inv = 30;
  G.shake = Math.max(G.shake, 5);
  sfx.hurt();
  G.texts.push({ x: v.x, y: FL.base, z: v.z + 20, s: '-' + dmg, c: '#ff3d4a', life: 26, sm: true });
}
// towers: fly into a roof and it hurts; searchlights on top lock on and call down flak
function flightTowers(v, F) {
  for (const t of F.towers) {
    if (t.x + t.w < G.camX - 20 || t.x > G.camX + W + 20) continue;
    if (!F.done && v.inv <= 0 && v.x + 28 > t.x && v.x - 28 < t.x + t.w && flyY(v) + 10 > t.top) {
      flightHurt(v, 10);
      v.z = Math.min(FL.zMax, FL.base - t.top + 24);
    }
    if (t.light && !F.done) {
      const a = searchAngle(t),
        lx = t.x + t.w / 2,
        dx = v.x - lx,
        dy = t.top - flyY(v);
      const inBeam = dy > 0 && Math.abs(angDiff(Math.atan2(-dy, dx), a)) < 0.12 && Math.hypot(dx, dy) < 220;
      t.lock = clamp((t.lock || 0) + (inBeam ? 1 : -0.5), 0, 40);
      if (t.lock >= 40 && !t.flak) {
        t.flak = { x: v.x, z: v.z, t: 34 };
        t.lock = 0;
        sfx.clank();
      }
    }
    if (t.flak && --t.flak.t <= 0) {
      if (!F.done && Math.hypot(v.x - t.flak.x, v.z - t.flak.z) < 34) flightHurt(v, 14);
      G.fx.push({ k: 'ring', x: t.flak.x, y: FL.base, z: t.flak.z, c: '#ff9f6b', life: 16, max: 16, r: 34 });
      t.flak = null;
    }
  }
}
function searchAngle(t) {
  return -Math.PI / 2 + Math.sin(G.t * 0.015 + t.ph) * 0.9;
}
function flightPickups(v) {
  for (const k of G.picks) {
    k.t++;
    if (!k.air || k.got) continue;
    k.x -= 0.4; // drifting back on the wind
    if (Math.abs(k.x - v.x) < 26 && Math.abs(k.z - v.z) < 16) {
      collect(k, PL[k.k === 'mana' && PL[1] ? 1 : 0]);
      if (k.k === 'ammo') for (const p of PL) p.ammo += 4;
      k.got = true;
    }
  }
  G.picks = G.picks.filter(k => !k.got && k.x > G.camX - 60);
}
// corp drones weave and shoot; gunships hold position and fire spreads; the Raijin does both, harder
function flightFoe(e, v, F) {
  if (e.hp <= 0) return;
  e.t++;
  if (e.big) {
    e.x += (G.camX + W - 90 - e.x) * 0.03;
    e.z += (clamp(v.z, 90, 210) - e.z) * 0.012 + Math.sin(e.t * 0.03) * 0.5;
    if (e.t % 70 === 0) for (const k of [-0.3, -0.15, 0, 0.15, 0.3]) flightAimed(e, v, 3.2, k, 8);
    if (e.t % 160 === 80) flightShot(e.x - 30, e.z, -2, 0, 22, 'missile', true);
    return;
  }
  if (e.gun) {
    e.x += (G.camX + W - 70 - e.x) * 0.02;
    e.z += Math.sin(e.t * 0.025 + e.ph) * 0.7;
    if (e.t % 80 === 40) for (const k of [-0.18, 0, 0.18]) flightAimed(e, v, 3, k, 6);
    return;
  }
  e.x -= e.sp;
  e.z = e.z0 + Math.sin(e.t * 0.05 + e.ph) * e.amp;
  if (e.t % e.cool === 0 && e.x < G.camX + W - 20 && e.x > v.x) flightAimed(e, v, 2.6, 0, 5);
}
function flightAimed(e, v, sp, off, dmg) {
  const a = Math.atan2(v.z - e.z, v.x - e.x) + off;
  flightShot(e.x - 10, e.z, Math.cos(a) * sp, Math.sin(a) * sp, dmg, 'eshot', true);
}
function flightFoeEnt(kind, extra) {
  return Object.assign(
    {
      kind,
      air: true,
      team: 1,
      d: { name: kind, passive: true },
      pal: PALS[0],
      y: FL.base,
      vx: 0,
      vz: 0,
      face: -1,
      state: 'idle',
      t: 0,
      walk: 0,
      inv: 0,
      flash: 0
    },
    extra
  );
}
function flightSpawns(F, J) {
  if (F.done) return;
  const cx = G.camX,
    bossAt = J.len * 0.86;
  if (cx > F.spawnX && cx < bossAt) {
    const n = 2 + (Math.random() < 0.4 * J.drones ? 2 : 1),
      z0 = 70 + Math.random() * 140;
    for (let i = 0; i < n; i++)
      G.ents.push(
        flightFoeEnt('kdrone', {
          x: cx + W + 30 + i * 34,
          z: z0,
          z0: z0 + (i % 2 ? 14 : -14),
          amp: 18 + Math.random() * 24,
          ph: i * 0.9,
          sp: 1.1 + Math.random() * 0.6,
          cool: 100 + i * 20,
          hp: 14,
          maxHp: 14
        })
      );
    F.spawnX += (300 + Math.random() * 300) / J.drones;
  }
  if (cx > F.gunX && cx < bossAt && !G.ents.some(e => e.gun && e.hp > 0)) {
    const z = 110 + Math.random() * 90;
    G.ents.push(
      flightFoeEnt('gunship', { gun: true, x: cx + W + 60, z, ph: Math.random() * 6, hp: 120, maxHp: 120 })
    );
    F.gunX += 1400 + Math.random() * 900;
  }
  if (!F.boss && cx > bossAt) {
    F.boss = true;
    G.ents.push(
      flightFoeEnt('raijin', {
        big: true,
        name: 'Raijin',
        x: cx + W + 120,
        z: 160,
        hp: 650,
        maxHp: 650,
        d: { name: 'Raijin gunship', passive: true }
      })
    );
    G.texts.push({
      x: cx + W / 2,
      y: FL.base,
      z: 150,
      s: 'RAIJIN INBOUND',
      c: '#ff3d4a',
      life: 90,
      big: true
    });
    musicPlay('boss');
  }
}
function flightEnd(win, msg) {
  const F = G.flight;
  F.done = true;
  F.win = win;
  F.endT = 130;
  G.texts.push({
    x: G.camX + W / 2,
    y: FL.base,
    z: 150,
    s: msg,
    c: win ? '#7dffb0' : '#ff3d4a',
    life: 110,
    big: true
  });
  (win ? sfx.level : sfx.boom)();
}
/* ---------- the drop: a rooftop brawl ----------
 * When a job has a roof, a won flight doesn't end at the drop zone: the runners jump off the ramp onto the
 * roof and fight it out on foot, wave by wave, with the ordinary brawler step (update() hands a flight with a
 * roof back to it, and roofTick() runs the waves). Clear the roof and the job is done; lose everyone and the
 * flight still pays, but the job is blown. */
function roofStart() {
  const F = G.flight;
  F.roof = {
    x: Math.round(G.camX),
    wave: 0,
    live: false,
    nextT: 110,
    over: false,
    win: false,
    endT: 0,
    k0: G.run.kills
  };
  F.S.name = 'The Arcology roof';
  F.S.sub = 'Hold the pad until security stops coming up the stairs';
  G.ents = [];
  G.projs = [];
  G.picks = [];
  G.waveLive = false;
  G.lock = null;
  // on the job board the crew is level 4, so the roof hits like the Neon Market; on Juno's side job, like your district
  G.stage = G.cjob ? G.cjob.stage : 1;
  placeRunners(F.roof.x + 80);
  for (const p of PL)
    if (!p.out) {
      p.z = 70; // off the ramp
      p.hp = Math.max(p.hp, Math.round(p.maxHp * 0.8));
      G.ents.push(p);
    }
  G.props = [
    { kind: 'crate', x: F.roof.x + 300, y: FY0 + 26, z: 0 },
    { kind: 'drum', x: F.roof.x + 200, y: FY1 - 14, z: 0 }
  ];
  G.texts.push({ x: F.roof.x + W / 2, y: 150, z: 0, s: 'ON THE ROOF', c: '#ffc63d', life: 90, big: true });
  G.banner = 150;
  G.shake = 6;
  sfx.boom();
  musicPlay('d4');
  tip('roof', 'Out of the VTOL and onto the roof: clear three waves of Kagemori security to finish the job.');
}
function roofTick() {
  const F = G.flight,
    R = F.roof,
    J = flightJob();
  G.camX = R.x;
  if (R.over) {
    if (--R.endT <= 0 && G.mode === 'play') flightFinish();
    return;
  }
  const foes = G.ents.filter(e => e.team === 1 && e.state !== 'dead' && !e.d.passive).length;
  if (R.live && !foes) {
    R.live = false;
    R.wave++;
    if (R.wave >= J.roof.length) return roofEnd(true);
    G.texts.push({ x: R.x + W / 2, y: 150, z: 0, s: 'STAIRWELL CLEAR', c: '#7dffb0', life: 80, big: true });
    sfx.loot();
    R.nextT = 120;
  }
  if (!R.live && --R.nextT <= 0) {
    R.live = true;
    G.waveLive = true;
    J.roof[R.wave].forEach((k, i) => {
      const e = spawnEnemy(k, i % 2 ? -1 : 1);
      e.x += (i >> 1) * (i % 2 ? -18 : 18);
    });
    if (R.wave === J.roof.length - 1) musicPlay('boss');
  }
}
function roofEnd(win) {
  const F = G.flight,
    R = F.roof;
  R.over = true;
  R.win = win;
  R.live = G.waveLive = false;
  R.endT = 120;
  R.kills = G.run.kills - R.k0;
  G.texts.push({
    x: R.x + W / 2,
    y: 150,
    z: 0,
    s: win ? 'ROOF CLEAR' : 'OVERRUN',
    c: win ? '#7dffb0' : '#ff3d4a',
    life: 110,
    big: true
  });
  (win ? sfx.level : sfx.boom)();
}
function flightFinish() {
  const F = G.flight,
    J = flightJob(),
    R = F.roof;
  const roofPay = R ? (R.win ? 220 : 0) + (R.kills || 0) * 8 : 0,
    pay = (F.win ? J.pay + F.kills * 6 + Math.round((G.fhull / FL.hull) * 100) * 2 : F.kills * 3) + roofPay,
    karma = F.win ? J.karma + F.kills * 2 + (R && R.win ? 90 : 0) : 0;
  PARTY.creds += pay;
  if (karma) jobKarma(karma);
  const rec = store.load('cs_flight') || {},
    prev = rec[F.id] || {};
  if (F.win)
    rec[F.id] = {
      hull: Math.max(prev.hull || 0, Math.round((G.fhull / FL.hull) * 100)),
      kills: Math.max(prev.kills || 0, F.kills)
    };
  store.set('cs_flight', rec);
  if (F.win) bump('flights');
  logRun(
    'Job',
    J.name,
    !F.win
      ? 'Shot down'
      : R && !R.win
        ? 'Overrun on the roof'
        : 'Dropped, hull ' + Math.round((G.fhull / FL.hull) * 100)
  );
  G.fresult = {
    win: F.win && (!R || R.win),
    flew: F.win,
    roof: R ? { win: R.win, kills: R.kills || 0 } : null,
    kills: F.kills,
    hull: Math.round((G.fhull / FL.hull) * 100),
    pay,
    karma,
    coop: G.coop,
    take: jobTake()
  };
  musicPlay('title');
  setMode('flightover');
}
function flightOverHtml() {
  const r = G.fresult || {},
    J = flightJob();
  return `<div class="card"><p class="eyebrow">Job · ${esc(J.name)}${r.coop ? ' · co-op' : ''}</p><h1>${r.win ? (r.roof ? 'Roof taken' : 'Team dropped') : r.flew ? 'Overrun' : 'Shot down'}</h1>
    <p>${r.win ? `The Raijin went down and the team hit the roof with the hull at ${r.hull}%.${r.roof ? ' Kagemori security stopped coming up the stairs.' : ''}` : r.flew ? 'The flight got you there, but Kagemori held the roof. The VTOL pulled the team out.' : 'The VTOL went down over the city. Everyone walked away, which is more than the VTOL did.'}</p>
    <div class="list">
      <div class="item"><div><div class="nm">Shot down</div></div><div class="acts">${r.kills || 0}</div></div>
      <div class="item"><div><div class="nm">Hull</div></div><div class="acts">${r.hull || 0}%</div></div>
      ${r.roof ? `<div class="item"><div><div class="nm">The roof</div></div><div class="acts">${r.roof.win ? 'Cleared (+¥220)' : 'Overrun'} · ${r.roof.kills} down</div></div>` : ''}
      <div class="item"><div><div class="nm">Paid</div></div><div class="acts" style="color:var(--gold)">¥${r.pay || 0}${r.karma ? ` · ${r.karma} karma` : ''}</div></div>
    </div>
    ${jobEndHtml(r.take, '<button class="btn" data-a="flightagain">Fly it again</button>')}</div>`;
}
