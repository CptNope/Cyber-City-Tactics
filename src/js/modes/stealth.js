/* Cyber City Tactics · src/js/modes/stealth.js
 * Drone stealth jobs: a rigger's run through a corp floor seen in cross-section. Each runner flies a small
 * drone: left and right to fly, up and down to climb and drop, dodge to cloak for a moment. Ceiling cameras
 * sweep cones of light and guards walk patrols with a cone of sight ahead of them; walls only let you through
 * at their vents, and laser gates blink on and off. Being seen fills your drone's detection meter; fill it and
 * the alarm goes up a level (three and the floor locks down). Punch at the terminal to hack it (the usual
 * minigame), kick to fire a shock dart into someone from behind, and leave through the vent at the far end.
 *
 * Like the driving jobs, everything lives in G.ents and plain G fields (the layout in G.stealth; camera sweeps
 * and laser timing come from G.t), so couch and online co-op need nothing extra: each runner flies a drone.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
const STEALTH_JOBS = {
  arcology: {
    name: 'Ghost in the Arcology',
    sub: 'Fly a drone into Kagemori research, pull the LANTERN files, get out unseen',
    stage: 4,
    len: 3400,
    cams: 6,
    guards: 4,
    lasers: 3,
    walls: 4,
    pay: 320,
    karma: 150,
    target: 'Aide Morrow'
  },
  clinic: {
    name: 'The Night Clinic',
    sub: 'Into a black clinic under the Neon Market for a patient list somebody wants back',
    stage: 1,
    len: 2800,
    cams: 4,
    guards: 3,
    lasers: 2,
    walls: 3,
    pay: 240,
    karma: 110,
    target: 'Doc Varga'
  }
};
const SF = {
  floor: FY1 - 30, // everything stands on one plane; height is z
  ceil: 128, // the ceiling, in z
  zMin: 10,
  zMax: 118,
  vMax: 2.4,
  climb: 1.7,
  camLen: 150,
  camHalf: 0.3,
  eye: 44,
  sightLen: 130,
  sightHalf: 0.42
};
// overwatch co-op: runner 2 doesn't fly. They sit on the building's network with a reticle over the floor,
// looping cameras and lasers and pinging noises to pull guards off their patrols
const OW = { loops: 3, pings: 3, loopT: 420, lureT: 240, pingR: 170, pickR: 40, maxLoops: 5 };
const owOf = () => (G.stealth && G.stealth.ow && PL[1] && !PL[1].out ? PL[1] : null);
const stealthJob = () => (G.stealth && STEALTH_JOBS[G.stealth.id]) || STEALTH_JOBS.arcology;

function startStealth(id, coop, ow) {
  const J = STEALTH_JOBS[id] || STEALTH_JOBS.arcology;
  if (NET.role === 'host' && NET.live) coop = true;
  if (ow) coop = true;
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
    len: J.len,
    waves: [],
    props: [],
    passives: [],
    rain: false,
    weather: 'clear'
  });
  G.stealth = Object.assign(
    { id: STEALTH_JOBS[id] ? id : 'arcology', S, done: false, win: false, endT: 0 },
    stealthLayout(J)
  );
  G.stealth.ow = !!ow && PL.length > 1;
  G.owX = W * 0.6;
  G.owZ = 60;
  G.owLoops = OW.loops;
  G.owPings = OW.pings;
  G.salarm = 0;
  G.stime = 0;
  G.bg = genBg(S, 3300 + J.stage * 17);
  PL.forEach((p, i) => {
    if (G.stealth.ow && i === 1) {
      p.drone = null; // on the network, not on the floor
      return;
    }
    stealthMount(p);
    p.x = 50 + i * 26;
    p.z = 60 + i * 18;
    G.ents.push(p);
  });
  for (const g of G.stealth.guardSpecs) stealthGuard(g);
  G.rain = [];
  G.fade = 1;
  G.banner = 150;
  musicPlay('d' + Math.min(J.stage, 5));
  setMode('play');
  if (G.stealth.ow)
    tip(
      'overwatch',
      'Runner 2 is overwatch: move the reticle, PUNCH loops a camera or laser under it, KICK pings a noise that pulls guards to it.',
      'Runner 2 is overwatch: arrows move the reticle, comma loops a camera or laser under it, period pings a noise that pulls guards to it.'
    );
  tip(
    'stealth',
    'Stick to fly, up and down to climb. Stay out of the light cones. PUNCH hacks the terminal, KICK darts a guard from behind, DODGE cloaks.',
    'A/D to fly, W/S to climb and drop. Stay out of the light cones. J hacks the terminal, K darts a guard from behind, O cloaks.'
  );
}
// the floor's layout from a fresh seed: cameras, walls with vents, laser gates, guard patrols, the terminal,
// the target's office and the exit vent
function stealthLayout(J) {
  const seed = (Math.random() * 1e9) | 0,
    r = srng(seed),
    L = J.len;
  const cams = [],
    walls = [],
    lasers = [],
    guardSpecs = [];
  // obstacles spread through the middle of the floor, never on top of each other
  const slots = [];
  for (let x = 260; x < L - 260; x += 120) slots.push(x + Math.floor(r() * 50));
  const take = () => slots.splice(Math.floor(r() * slots.length), 1)[0];
  for (let i = 0; i < J.walls && slots.length; i++) {
    const x = take(),
      low = r() < 0.5,
      h = 34 + Math.floor(r() * 10);
    walls.push({ x, w: 14, gap: low ? [SF.zMin, SF.zMin + h] : [SF.ceil - 10 - h, SF.ceil - 10] });
  }
  for (let i = 0; i < J.lasers && slots.length; i++)
    lasers.push({
      x: take(),
      per: 150 + Math.floor(r() * 60),
      on: 70 + Math.floor(r() * 30),
      ph: Math.floor(r() * 200)
    });
  for (let i = 0; i < J.cams && slots.length; i++)
    cams.push({ x: take(), amp: 0.45 + r() * 0.35, spd: 0.012 + r() * 0.012, ph: r() * 6.28 });
  for (let i = 0; i < J.guards; i++) {
    const x = 380 + ((L - 900) * (i + 0.5)) / J.guards + (r() - 0.5) * 80;
    guardSpecs.push({ x1: x - 70 - r() * 40, x2: x + 70 + r() * 40 });
  }
  const term = { x: Math.round(L * 0.55), y: SF.floor, z: 30, done: false, vaultDone: false, bonus: false };
  const tx = Math.round(L * 0.82);
  guardSpecs.push({ x1: tx - 80, x2: tx + 80, target: J.target });
  return { seed, cams, walls, lasers, guardSpecs, term, exit: L - 70, data: false, aide: false, tries: 0 };
}
function stealthMount(p) {
  p.drone = { vx: 0, vz: 0, cloak: 0, batt: 100, seen: 0, shotT: 0, dartT: 0 };
  p.maxHp = 60;
  p.hp = 60;
  p.y = SF.floor;
  p.z = Math.max(p.z || 0, 50);
  p.face = 1;
  setS(p, 'idle');
}
function stealthGuard(spec) {
  const e = spawnEnemy('sec', 1);
  e.elite = null;
  e.x = (spec.x1 + spec.x2) / 2;
  e.y = SF.floor;
  e.z = 0;
  e.patrol = [spec.x1, spec.x2];
  e.face = Math.random() < 0.5 ? 1 : -1;
  e.pauseT = 0;
  e.guard = true;
  if (spec.target) {
    e.name = spec.target;
    e.target = true;
    e.pal = Object.assign({}, e.pal, {
      coat: '#e9e4f2',
      coat2: '#c9c2d8',
      pants: '#2a2436',
      hair: '#3a2d48'
    });
  }
  setS(e, 'walk');
  return e;
}

/* ---------- the step ---------- */
function stealthUpdate() {
  const S = G.stealth,
    J = stealthJob();
  for (const p of PL)
    if (!p.drone && !(S.ow && p === PL[1])) {
      stealthMount(p);
      p.x = G.camX + 60;
      if (!G.ents.includes(p)) G.ents.push(p);
    }
  if (!S.done) G.stime++;
  for (const p of PL) stealthDrone(p, S);
  const ow = owOf();
  if (ow) stealthOverwatch(ow, S);
  for (const c of S.cams) if (c.offT > 0) c.offT--;
  for (const l of S.lasers) if (l.offT > 0) l.offT--;
  for (const e of G.ents) if (e.guard) stealthPatrol(e, S);
  // the camera follows the drones along the floor
  const a = PL.filter(p => !p.out && p.drone);
  if (a.length) {
    const mean = a.reduce((t, p) => t + p.x, 0) / a.length;
    G.camX = clamp(G.camX + (mean - W * 0.4 - G.camX) * 0.1, 0, Math.max(0, J.len - W));
    for (const p of a) p.x = clamp(p.x, Math.max(8, G.camX + 8), Math.min(J.len - 8, G.camX + W - 8));
  }
  // out through the vent with the data, or the floor locks down, or every drone is down
  if (!S.done) {
    if (S.data && a.some(p => p.x >= S.exit - 10)) stealthEnd(true, 'OUT CLEAN');
    else if (G.salarm >= 3) stealthEnd(false, 'LOCKDOWN');
    else if (!a.length) stealthEnd(false, 'SIGNAL LOST');
  }
  if (S.done && --S.endT <= 0 && G.mode === 'play') stealthFinish();
  tickFx();
  if (G.shake > 0) G.shake *= 0.85;
  if (G.shake < 0.3) G.shake = 0;
}
function stealthDrone(p, S) {
  const I = INP[p.idx] || { held: {}, pressed: {} },
    d = p.drone;
  if (!d) return;
  p.t++;
  if (p.flash > 0) p.flash--;
  if (p.out) {
    // a downed drone drops to the floor and sparks
    p.z = Math.max(0, p.z - 2);
    return;
  }
  if (S.done) return;
  if (I.held.right) d.vx = Math.min(SF.vMax, d.vx + 0.18);
  else if (I.held.left) d.vx = Math.max(-SF.vMax, d.vx - 0.18);
  else d.vx *= 0.86;
  if (I.held.up) d.vz = Math.min(SF.climb, d.vz + 0.16);
  else if (I.held.down) d.vz = Math.max(-SF.climb, d.vz - 0.16);
  else d.vz *= 0.82;
  if (Math.abs(d.vx) > 0.2) p.face = d.vx > 0 ? 1 : -1;
  const nx = p.x + d.vx,
    nz = clamp(p.z + d.vz, SF.zMin, SF.zMax);
  // walls: through the vent or not at all
  let blocked = false;
  for (const w of S.walls)
    if (Math.abs(nx - w.x) < w.w / 2 + 6 && !(nz > w.gap[0] + 4 && nz < w.gap[1] - 4)) blocked = true;
  if (blocked) d.vx = 0;
  else p.x = nx;
  p.z = nz;
  p.walk += Math.abs(d.vx) + 1;
  // cloak: a short spell of invisibility from the battery
  if (d.cloak > 0) d.cloak--;
  else d.batt = Math.min(100, d.batt + 0.12);
  if (I.pressed.dodge && d.batt >= 50 && !d.cloak) {
    d.batt -= 50;
    d.cloak = 120;
    sfx.zap();
  }
  if (d.dartT > 0) d.dartT--;
  if (d.tripT > 0) d.tripT--;
  if (d.shotT > 0) d.shotT--;
  // punch: the terminal; kick: a shock dart
  if (I.pressed.punch) stealthInteract(p, S);
  if (I.pressed.kick && !d.dartT) stealthDart(p);
  if (I.pressed.item && PARTY.med > 0 && p.hp < p.maxHp) {
    PARTY.med--;
    p.hp = Math.min(p.maxHp, p.hp + 30);
    say(p, 'REPAIRED', '#7dffb0');
    sfx.heal();
  }
  // being seen: by a camera, a guard, or a laser you flew through
  let seen = 0;
  if (!d.cloak) {
    for (const c of S.cams) if (stealthCamSees(c, p, S)) seen = Math.max(seen, 2.2 * (1 + G.salarm * 0.4));
    for (const e of G.ents) if (e.guard && stealthGuardSees(e, p, S)) seen = Math.max(seen, 3);
    // a live laser trips the alarm once per crossing
    for (const l of S.lasers)
      if (laserOn(l) && Math.abs(p.x - l.x) < 5 && !d.tripT) {
        seen = 100;
        d.tripT = 60;
        G.texts.push({ x: l.x, y: SF.floor, z: p.z + 20, s: 'TRIPPED', c: '#ff3d4a', life: 40, sm: true });
      }
  }
  d.seenNow = seen > 0;
  d.seen = clamp(d.seen + (seen || -0.7), 0, 100);
  if (d.seen >= 100) stealthAlarm(p);
}
function laserOn(l) {
  if (l.offT > 0) return false; // looped by overwatch
  return (G.t + l.ph) % l.per < l.on;
}
function camAngle(c) {
  return Math.PI / 2 + Math.sin(G.t * c.spd * (1 + G.salarm * 0.4) + c.ph) * c.amp;
}
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
// does a wall stand between two points (a wall blocks unless the sight line passes through its vent)?
function stealthBlocked(S, x0, z0, x1, z1) {
  for (const w of S.walls) {
    if ((w.x - x0) * (w.x - x1) > 0) continue;
    const k = (w.x - x0) / (x1 - x0 || 1),
      z = z0 + (z1 - z0) * k;
    if (!(z > w.gap[0] && z < w.gap[1])) return true;
  }
  return false;
}
function stealthCamSees(c, p, S) {
  if (c.offT > 0) return false;
  const dx = p.x - c.x,
    dz = SF.ceil - p.z; // downward from the ceiling
  if (Math.hypot(dx, dz) > SF.camLen) return false;
  if (Math.abs(angDiff(Math.atan2(dz, dx), camAngle(c))) > SF.camHalf) return false;
  return !stealthBlocked(S, c.x, SF.ceil, p.x, p.z);
}
function stealthGuardSees(e, p, S) {
  if (e.state === 'down' || e.state === 'dead') return false;
  const dx = (p.x - e.x) * e.face,
    dz = p.z - SF.eye;
  const len = SF.sightLen * (1 + G.salarm * 0.25);
  if (dx <= 0 || dx > len) return false;
  if (Math.abs(Math.atan2(dz, dx)) > SF.sightHalf * (1 + G.salarm * 0.2)) return false;
  return !stealthBlocked(S, e.x, SF.eye, p.x, p.z);
}
function stealthPatrol(e, S) {
  e.t++;
  if (e.flash > 0) e.flash--;
  if (e.state === 'down') return; // tased: out cold for the rest of the job
  // on alert, a guard who can see a drone stops and shoots at it
  const tgt = G.salarm > 0 && PL.find(p => !p.out && p.drone && !p.drone.cloak && stealthGuardSees(e, p, S));
  if (tgt) {
    if (e.state !== 'shoot') setS(e, 'shoot');
    if (e.t % 40 === 20) {
      sfx.shot();
      for (let i = 0; i < 5; i++)
        G.parts.push({
          x: e.x + ((tgt.x - e.x) * i) / 5,
          y: SF.floor,
          z: SF.eye - 10 + ((tgt.z - SF.eye + 10) * i) / 5,
          vx: 0,
          vy: 0,
          vz: 0,
          life: 6 + i,
          c: '#ffe28a',
          sz: 1.5
        });
      stealthHurt(tgt, 20);
    }
    return;
  }
  // pulled off the patrol by a ping: walk over to it, look around, then go back
  if (e.lure) {
    if (--e.lure.t <= 0) {
      e.lure = null;
      e.pauseT = 40;
    } else {
      const dx = e.lure.x - e.x;
      if (Math.abs(dx) > 6) {
        e.face = Math.sign(dx);
        if (e.state !== 'walk') setS(e, 'walk');
        e.x += e.face * 0.75;
        e.walk += 1.5;
      } else if (e.state !== 'idle') setS(e, 'idle');
      return;
    }
  }
  if (e.pauseT > 0) {
    if (e.state !== 'idle') setS(e, 'idle');
    if (--e.pauseT === 0) {
      e.face = -e.face;
      setS(e, 'walk');
    }
    return;
  }
  if (e.state !== 'walk') setS(e, 'walk');
  const sp = 0.55 * (1 + G.salarm * 0.3);
  e.x += e.face * sp;
  e.walk += sp * 2;
  if ((e.face > 0 && e.x >= e.patrol[1]) || (e.face < 0 && e.x <= e.patrol[0])) e.pauseT = 70;
}
function stealthHurt(p, dmg) {
  p.hp -= dmg;
  p.flash = 8;
  G.shake = Math.max(G.shake, 3);
  sfx.hurt();
  if (p.hp <= 0) {
    p.hp = 0;
    p.out = true;
    say(p, 'DRONE DOWN', '#ff3d4a', 70, 60);
    sfx.boom();
  }
}
function stealthAlarm(p) {
  p.drone.seen = 40;
  G.salarm = Math.min(3, G.salarm + 1);
  G.flash = 0.3;
  sfx.clank();
  G.texts.push({
    x: G.camX + W / 2,
    y: 150,
    z: 0,
    s: G.salarm >= 3 ? 'LOCKDOWN' : 'ALARM ' + G.salarm,
    c: '#ff3d4a',
    life: 80,
    big: true
  });
  // reinforcements walk in ahead of you
  if (G.salarm < 3) stealthGuard({ x1: p.x + 140, x2: p.x + 300 });
}
function stealthInteract(p, S) {
  const T = S.term;
  if (!T.done && Math.abs(p.x - T.x) < 38 && p.z < 70) {
    S.tries++;
    startHack({ tier: 3 }, T);
    return;
  }
  if (!S.data && Math.abs(p.x - S.exit) < 60) say(p, 'GET THE DATA FIRST', '#a79dc2', 60, 40, true);
}
// after the hacking minigame: the files are yours, or the terminal locks and the alarm goes up a notch
function stealthHackDone() {
  const S = G.stealth,
    T = S && S.term;
  if (!T || !T.vaultDone || T.done) return;
  if (T.bonus) {
    T.done = true;
    S.data = true;
    G.texts.push({ x: T.x, y: SF.floor, z: 80, s: 'FILES PULLED', c: '#7dffb0', life: 80 });
  } else {
    T.vaultDone = false; // locked for a moment, then try again
    const p = active().find(q => q.drone);
    if (p) {
      p.drone.seen = 100;
      stealthAlarm(p);
    }
  }
}
/* ---------- overwatch ---------- */
function stealthOverwatch(p, S) {
  const I = INP[p.idx] || { held: {}, pressed: {} };
  p.t++;
  if (S.done) return;
  if (I.held.right) G.owX += 3.2;
  if (I.held.left) G.owX -= 3.2;
  if (I.held.up) G.owZ += 2.4;
  if (I.held.down) G.owZ -= 2.4;
  G.owX = Math.round(clamp(G.owX, 10, W - 10) * 10) / 10;
  G.owZ = Math.round(clamp(G.owZ, 4, SF.ceil - 6) * 10) / 10;
  const wx = G.camX + G.owX;
  if (I.pressed.punch) owLoop(wx, S);
  if (I.pressed.kick) owPing(wx, S);
}
// what a loop would take: the nearest live camera or laser to the reticle
function owPick(wx, S) {
  let best = null,
    bd = OW.pickR;
  for (const o of S.cams.concat(S.lasers)) {
    const d = Math.abs(o.x - wx);
    if (d < bd && !(o.offT > 0)) {
      bd = d;
      best = o;
    }
  }
  return best;
}
function owLoop(wx, S) {
  const o = owPick(wx, S);
  if (!o) return;
  if (G.owLoops <= 0) {
    G.texts.push({ x: wx, y: SF.floor, z: G.owZ + 14, s: 'NO LOOPS LEFT', c: '#a79dc2', life: 40, sm: true });
    return;
  }
  G.owLoops--;
  o.offT = OW.loopT;
  sfx.zap();
  G.texts.push({ x: o.x, y: SF.floor, z: SF.ceil - 18, s: 'LOOPED', c: '#45d2ff', life: 50, sm: true });
}
function owPing(wx, S) {
  if (G.owPings <= 0) {
    G.texts.push({ x: wx, y: SF.floor, z: G.owZ + 14, s: 'NO PINGS LEFT', c: '#a79dc2', life: 40, sm: true });
    return;
  }
  G.owPings--;
  sfx.clank();
  G.texts.push({ x: wx, y: SF.floor, z: 24, s: 'PING', c: '#ffc63d', life: 45, sm: true });
  for (const e of G.ents)
    if (e.guard && e.state !== 'down' && Math.abs(e.x - wx) < OW.pingR) {
      e.lure = { x: clamp(wx, 20, S.S.len - 20), t: OW.lureT };
      e.pauseT = 0;
      G.texts.push({ x: e.x, y: SF.floor, z: 62, s: '?', c: '#ffc63d', life: 40 });
    }
}
// a shock dart: from behind it drops anyone; from the front it just tells them you're there
function stealthDart(p) {
  p.drone.dartT = 50;
  sfx.zap();
  let best = null;
  for (const e of G.ents) {
    if (!e.guard || e.state === 'down') continue;
    const dx = e.x - p.x;
    if (Math.abs(dx) > 40 || p.z > 90) continue;
    if (!best || Math.abs(dx) < Math.abs(best.x - p.x)) best = e;
  }
  if (!best) return;
  for (let i = 0; i < 5; i++)
    G.parts.push({
      x: p.x + ((best.x - p.x) * i) / 5,
      y: SF.floor,
      z: p.z + ((32 - p.z) * i) / 5,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 6 + i,
      c: '#45d2ff',
      sz: 1.6
    });
  const behind = best.face * (p.x - best.x) < 0;
  if (behind) {
    setS(best, 'down');
    best.elem = 'shock';
    best.react = 'light';
    const S = G.stealth;
    if (best.target) {
      S.aide = true;
      G.texts.push({ x: best.x, y: SF.floor, z: 70, s: 'TARGET DOWN', c: '#ffc63d', life: 80 });
      jobKarma(40);
    } else G.texts.push({ x: best.x, y: SF.floor, z: 60, s: 'LIGHTS OUT', c: '#45d2ff', life: 50, sm: true });
    if (G.run) G.run.kills++;
    if (S.ow) G.owLoops = Math.min(OW.maxLoops, G.owLoops + 1); // a guard down frees up a loop
    sfx.hit();
  } else {
    p.drone.seen = Math.min(100, p.drone.seen + 50);
    best.face = Math.sign(p.x - best.x) || 1;
    G.texts.push({ x: best.x, y: SF.floor, z: 60, s: '?!', c: '#ff3d4a', life: 40 });
  }
}
function stealthEnd(win, msg) {
  const S = G.stealth;
  S.done = true;
  S.win = win;
  S.endT = 100;
  G.texts.push({
    x: G.camX + W / 2,
    y: 150,
    z: 0,
    s: msg,
    c: win ? '#7dffb0' : '#ff3d4a',
    life: 100,
    big: true
  });
  (win ? sfx.level : sfx.hurt)();
}
function stealthFinish() {
  const S = G.stealth,
    J = stealthJob(),
    ghost = S.win && G.salarm === 0;
  const pay = S.win ? J.pay + (S.aide ? 200 : 0) + (ghost ? 150 : 0) : 0,
    karma = S.win ? J.karma + (ghost ? 60 : 0) : 0;
  PARTY.creds += pay;
  if (karma) jobKarma(karma);
  const rec = store.load('cs_stealth') || {},
    prev = rec[S.id] || {};
  if (S.win)
    rec[S.id] = {
      best: !prev.best || G.stime < prev.best ? G.stime : prev.best,
      ghost: prev.ghost || ghost,
      aide: prev.aide || S.aide
    };
  store.set('cs_stealth', rec);
  if (S.win) bump('stealths');
  logRun('Job', J.name, S.win ? (ghost ? 'Ghost' : 'Out, alarm ' + G.salarm) : 'Failed');
  G.sresult = {
    win: S.win,
    time: G.stime,
    alarm: G.salarm,
    ghost,
    aide: S.aide,
    pay,
    karma,
    coop: G.coop,
    take: jobTake()
  };
  musicPlay('title');
  setMode('stealthover');
}
function stealthOverHtml() {
  const r = G.sresult || {},
    J = stealthJob();
  return `<div class="card"><p class="eyebrow">Job · ${esc(J.name)}${r.coop ? ' · co-op' : ''}</p><h1>${r.win ? (r.ghost ? 'Ghosted it' : 'Got out') : 'Busted'}</h1>
    <p>${r.win ? `In and out in ${fmtTime(r.time)}${r.ghost ? ', and nobody ever knew you were there.' : `, with the alarm at ${r.alarm}.`}` : 'The floor locked down, or your drone went dark. The files stay where they are.'}</p>
    <div class="list">
      <div class="item"><div><div class="nm">The files</div></div><div class="acts">${r.win ? 'Pulled' : 'Left behind'}</div></div>
      <div class="item"><div><div class="nm">${esc(J.target)}</div></div><div class="acts">${r.aide ? 'Darted (+¥200)' : 'Untouched'}</div></div>
      <div class="item"><div><div class="nm">Ghost bonus</div></div><div class="acts">${r.ghost ? 'No alarms (+¥150)' : 'Alarm ' + (r.alarm || 0)}</div></div>
      <div class="item"><div><div class="nm">Paid</div></div><div class="acts" style="color:var(--gold)">¥${r.pay || 0}${r.karma ? ` · ${r.karma} karma` : ''}</div></div>
    </div>
    ${jobEndHtml(r.take, '<button class="btn" data-a="stealthagain">Fly it again</button>')}</div>`;
}
