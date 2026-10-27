/* Cyber City Tactics · src/js/game/flow.js
 * Moving between places: district start, briefings, the Den, joining/dropping Runner 2, and spawning enemies
 * and breakables.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ================= flow ================= */
function placeRunners(x0) {
  PL.forEach((p, i) => {
    p.x = x0 + i * 14;
    p.y = 212 + i * 20;
    p.z = 0;
    p.vz = 0;
    p.vx = 0;
    p.state = 'idle';
    p.t = 0;
    p.inv = 60;
    p.dead = false;
    p.face = 1;
    p.holding = null;
    p.grab = null;
    p.buffT = 0;
    p.freeAmmo = 0;
    p.chargeT = 0;
    refresh(p);
  });
}
function resetWorld() {
  G.hazard = null;
  // a downed partner's revive marker belongs to the scene they fell in
  for (const p of PL) p.outX = null;
  G.zaps = [];
  G.slowFoes = 0;
  G.camX = 0;
  G.lock = null;
  G.wave = 0;
  G.waveLive = false;
  G.ents = [];
  G.projs = [];
  G.parts = [];
  G.texts = [];
  G.picks = [];
  G.props = [];
  G.fx = [];
  G.exitOpen = false;
  G.goT = 0;
  G.combo = 0;
  G.comboT = 999;
  G.outro = 0;
  G.afterOutro = null;
  G.slow = 0;
  G.flash = 0;
}
function makeRain(on) {
  G.rain = [];
  if (on && !RM)
    for (let i = 0; i < (lowFx() ? 35 : 70); i++)
      G.rain.push({ x: rand(0, W), y: rand(0, H), s: rand(5, 8) });
}
function startStage(si) {
  G.stage = si;
  G.den = false;
  G.arena = false;
  G.training = false;
  G.world = false;
  G.dun = null;
  resetWorld();
  G.stageLost = 0;
  G.gunUsed = false;
  G.banner = 150;
  G.fade = 1;
  const S = STAGES[si];
  G.bg = genBg(S, 1000 + si * 77);
  placeRunners(40);
  for (const p of PL) if (!p.out) G.ents.push(p);
  G.props = S.props.map(([kind, x, y]) => ({ kind, x, y, z: 0 }));
  for (const [k, x, y] of S.passives || []) spawnPassive(k, x, y);
  if (PARTY.ally) spawnAlly(PARTY.ally.type);
  makeRain(S.rain);
  saveGame('play');
  musicPlay('d' + si);
  setMode('play');
  if (si === 1)
    tip(
      'charge',
      'Hold PUNCH to charge a heavy blow, then let go.',
      'Hold J to charge a heavy blow, then let go.'
    );
  if (si === 4) tip('node', 'Data nodes are the glowing crystals. Smash five of them to finish the job.');
  if (si === 0 && !G.ng)
    tip(
      'move',
      'Drag anywhere on the left to move. Tap PUNCH three times for an uppercut.',
      'Move with WASD or the arrows. Press J three times for an uppercut, K to kick.'
    );
}
function briefing(si, fromDen) {
  G.arena = false;
  const C = CONTRACTS[si];
  if (!PARTY.contract || PARTY.contract.idx !== si)
    PARTY.contract = {
      idx: si,
      title: C.title,
      goal: C.goal,
      key: C.key,
      need: C.need,
      count: 0,
      done: false,
      failed: false
    };
  for (const p of PL) {
    p.out = false;
    p.lives = maxLives();
  }
  G.stage = si;
  G.briefFromDen = !!fromDen;
  saveGame('brief');
  if (!fromDen) {
    G.den = false;
    resetWorld();
    G.bg = genBg(STAGES[si], 1000 + si * 77);
  }
  setMode('brief');
}
function enterDen() {
  G.den = true;
  G.arena = false;
  G.training = false;
  G.world = false;
  G.dun = null;
  resetWorld();
  G.fade = 1;
  G.bg = genBg(DEN, 4242);
  placeRunners(70);
  for (const p of PL) {
    p.out = false;
    p.hp = Math.max(p.hp, Math.round(p.maxHp * 0.6));
    p.mp = p.maxMp;
    G.ents.push(p);
  }
  if (PARTY.ally) {
    PARTY.ally.hp = PARTY.ally.maxHp;
    spawnAlly(PARTY.ally.type);
  }
  makeRain(true);
  musicPlay('den');
  saveGame('den');
  setMode('den');
  tip(
    'den',
    'Walk up to people and tap TALK to chat or shop. Kit rents companions. The next job starts at the right end of the street.',
    'Walk up to people and press J to talk or shop. Kit rents companions. The next job starts at the right end of the street.'
  );
}
function joinRunner2() {
  if (G.coop) return;
  const p = newRunner(1);
  const p1 = PL[0];
  applyArch(p, G.pendArch[1] !== p1.arch ? G.pendArch[1] : p1.arch === 'samurai' ? 'mage' : 'samurai');
  p.lvl = p1.lvl;
  p.pts = (p1.lvl - 1) * 2;
  p.spts = (p.spts || 0) + p1.lvl - 1;
  refresh(p);
  p.hp = p.maxHp;
  p.mp = p.maxMp;
  PL.push(p);
  G.coop = true;
  if (G.mode === 'play' || G.mode === 'den' || G.ret === 'play' || G.ret === 'den') {
    p.x = clamp(p1.x - 20, G.camX + 20, G.camX + W - 20);
    p.y = clamp(p1.y + 16, FY0 + 6, FY1);
    p.inv = 90;
    G.ents.push(p);
    say(p, 'JINX JOINS', '#ffc63d', 70, 80);
  }
  sfx.level();
}
function dropRunner2() {
  if (!G.coop) return;
  const p = PL[1];
  G.ents = G.ents.filter(e => e !== p);
  if (p.holding) {
    p.holding = null;
  }
  PL = [PL[0]];
  G.coop = false;
}

function spawnHostage(x, y) {
  const e = spawnPassive('hostage', x, y);
  e.team = 2; // anyone's stray hit can land on them: runners, gangers and explosions alike
  e.hp = e.maxHp = 20;
  e.pal = pick([
    { skin: '#c98a6b', coat: '#6b6280' },
    { skin: '#e4c3a8', coat: '#4a6b8a' },
    { skin: '#8a5a3e', coat: '#7a5a34' }
  ]);
  return e;
}
function spawnPassive(kind, x, y) {
  const d = DEF[kind],
    hpm = 1 + G.stage * 0.3;
  const e = {
    kind,
    d,
    team: 1,
    x,
    y,
    z: 0,
    vx: 0,
    vz: 0,
    face: -1,
    state: 'idle',
    t: 0,
    walk: 0,
    inv: 0,
    flash: 0,
    hp: Math.round(d.hp * hpm),
    dmg: 0,
    cool: 999,
    hits: 0,
    lastHit: 0,
    coolMul: 1,
    spdMul: 1,
    elite: null,
    pal: {}
  };
  e.maxHp = e.hp;
  G.ents.push(e);
  return e;
}
function spawnEnemy(kind, side) {
  const d = DEF[kind],
    DF = DIFF[G.diff],
    NG = ngMul(),
    hpm = (1 + G.stage * 0.42) * DF.hp * NG.hp;
  const x = side < 0 ? G.camX - 24 : G.camX + W + 24;
  const e = {
    kind,
    d,
    team: 1,
    pal: d.pal,
    x,
    y: rand(FY0 + 8, FY1 - 6),
    z: d.fly ? (d.spirit ? 18 : 24) : 0,
    vx: 0,
    vz: 0,
    face: side < 0 ? 1 : -1,
    state: 'idle',
    t: 0,
    walk: 0,
    inv: 0,
    flash: 0,
    hp: Math.round(d.hp * hpm * (G.coop ? 1.25 : 1)),
    dmg: Math.round(d.dmg * (1 + G.stage * 0.26) * DF.dmg * NG.dmg),
    cool: rand(20, d.cool),
    hits: 0,
    lastHit: 0,
    yoff: rand(-5, 5),
    hover: rand(0, 6),
    tgt: null,
    sumT: 200,
    coolMul: DF.cool * NG.cool,
    spdMul: 1,
    elite: null
  };
  if (
    !d.boss &&
    G.mode !== 'title' &&
    (modOn('elite') || Math.random() < DF.elite + NG.elite + G.stage * 0.02)
  ) {
    const ks = Object.keys(ELITES).filter(k => !(k === 'vampiric' && d.spirit));
    const k = pick(ks);
    e.elite = k;
    if (k === 'armored') e.hp = Math.round(e.hp * 1.7);
    if (k === 'berserk') {
      e.spdMul = 1.35;
      e.dmg = Math.round(e.dmg * 1.3);
      e.coolMul *= 0.75;
    }
    if (k === 'warded' || k === 'vampiric') e.hp = Math.round(e.hp * 1.25);
  }
  e.maxHp = e.hp;
  G.ents.push(e);
  if (G.mode === 'play') {
    if (kind === 'riot')
      tip(
        'riot',
        'Riot shields block punches. KICK to break their guard.',
        'Riot shields block punches. Kick (K) to break their guard.'
      );
    if (kind === 'spirit') tip('spirit', 'Bullets pass through fire spirits. Use fists, kicks or spells.');
    if (e.elite) tip('elite', 'Glowing enemies are elites. They hit harder but always drop gear.');
  }
  return e;
}
