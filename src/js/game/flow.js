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
  G.cut = null; // a story scene never outlives the street it was on
  G.totems = []; // and nor does a totem
  for (const p of PL) p.club = null; // a street weapon stays on the street it was found on
  LATER.length = 0; // team-ups and thorns queued in the last scene stay there
  G.hazard = null;
  G.drive = null;
  G.stealth = null;
  G.flight = null;
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
  G.kick = 0;
  G.punch = 0;
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
  // street weapons lying about: a couple per district, spread along the street
  for (let i = 0; i < 2; i++) {
    const ck = pick(CLUB_KINDS);
    G.props.push(
      clubProp(
        ck,
        140 + Math.floor(Math.random() * Math.max(200, (S.len || 1200) - 300)),
        rand(FY0 + 14, FY1 - 6)
      )
    );
  }
  for (const [k, x, y] of S.passives || []) spawnPassive(k, x, y);
  if (PARTY.ally) spawnAlly(PARTY.ally.type);
  makeRain(S.rain || S.weather === 'sleet');
  wxTip();
  saveGame('play');
  musicPlay('d' + si);
  setMode('play');
  cutOpen(si);
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
  G.training = false; // a run started straight after training is a real run (One Life, tips)
  if (fromDen) G.preBriefStage = G.stage; // "Not yet" goes back to this Den
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
    'chrome',
    'Doc sells cyberware and chrome: faster punches and kicks, longer grabs, new moves like Mach fists. Juno has an optional side job each visit.',
    'Doc sells cyberware and chrome: faster punches and kicks, longer grabs, new moves like Mach fists. Juno has an optional side job each visit.'
  );
  tip(
    'den',
    'Walk up to people and tap TALK to chat or shop. Kit rents companions. The next job starts at the right end of the street.',
    'Walk up to people and press J to talk or shop. Kit rents companions. The next job starts at the right end of the street.'
  );
}
// another runner joins the run (couch co-op, up to four): they come in at the lead's level, with the archetype
// picked for that seat (or the first free one, so the crew doesn't double up), next to whoever's in front
function joinRunner() {
  if (PL.length >= MAX_RUNNERS) return null;
  if (typeof NET !== 'undefined' && NET.live && PL.length >= 2) return null; // online seats are their own thing
  const idx = PL.length,
    p = newRunner(idx),
    p1 = PL[0],
    taken = PL.map(q => q.arch),
    want = G.pendArch[idx];
  const arch =
    want && ARCH[want] && !archLocked(want) && !taken.includes(want)
      ? want
      : Object.keys(ARCH).find(k => !archLocked(k) && !taken.includes(k)) || 'runner';
  applyArch(p, arch);
  G.pendArch[idx] = arch;
  p.lvl = p1.lvl;
  p.pts = (p1.lvl - 1) * 2;
  p.spts = (p.spts || 0) + p1.lvl - 1;
  refresh(p);
  p.hp = p.maxHp;
  p.mp = p.maxMp;
  PL.push(p);
  G.coop = true;
  G.pendN = PL.length; // a restart keeps the crew together
  if (G.mode === 'play' || G.mode === 'den' || G.ret === 'play' || G.ret === 'den') {
    const lead = alive()[0] || p1;
    p.x = clamp(lead.x - 20 - 14 * (idx - 1), G.camX + 20, G.camX + W - 20);
    p.y = clamp(lead.y + (idx % 2 ? 16 : -16), FY0 + 6, FY1);
    p.inv = 90;
    G.ents.push(p);
    say(p, p.name + ' JOINS', p.pal.acc, 70, 80);
  }
  sfx.level();
  return p;
}
const joinRunner2 = () => (PL.length === 1 ? joinRunner() : null);
// the last runner to join leaves (only the newest seat can go, so everyone else keeps their color and pad)
function dropRunner() {
  if (PL.length < 2) return;
  const p = PL[PL.length - 1];
  // let go of anything they had hold of, and of them
  if (p.heldBy) enemyRelease(p.heldBy);
  if (p.grab) releaseGrab(p);
  if (p.holding) dropProp(p);
  for (const q of PL) if (q.grab === p) releaseGrab(q);
  G.ents = G.ents.filter(e => e !== p);
  PL = PL.slice(0, -1);
  G.coop = PL.length > 1;
  G.pendN = Math.max(2, PL.length);
  if (G.sheetIdx >= PL.length) G.sheetIdx = 0;
  // everyone left is already out of lives: the run ends as if they'd fallen
  if (!active().length && G.mode !== 'title') {
    if (G.arena) arenaOver();
    else if (G.world) worldWipe();
    else if (gauntOn()) gauntEnd(false);
    else if (!G.training && !G.drive && !G.stealth && !G.flight) {
      musicPlay(null);
      setMode('over');
    }
  }
}
const dropRunner2 = () => {
  while (PL.length > 1) dropRunner();
};

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
// Foes grow with the runners as well as with the district, so a strong party still has a fight on its hands:
// a regular foe takes four or five punches at any level, which is also what leaves time to daze and grab it.
// Driving, drone and flight jobs keep their own tuning (their crews have fixed strength).
const partyLvl = () => {
  const a = PL.filter(p => !p.out);
  return a.length ? a.reduce((t, p) => t + (p.lvl || 1), 0) / a.length : 1;
};
// a district you keep flatlining in: 10% lighter crews per retry, down to 70%
const graceMul = () =>
  G.grace && G.grace.st === G.stage && !gauntOn() && !G.arena && !G.world ? 1 - 0.1 * G.grace.n : 1;
function lvlMul() {
  if (G.drive || G.stealth || (G.flight && !G.flight.roof) || G.training) return { hp: 1, dmg: 1 };
  const l = Math.max(0, partyLvl() - 1);
  return { hp: 1 + 0.09 * l, dmg: 1 + 0.08 * l };
}
// how far into the run this fight is: the district, or in the Gauntlet (any district in any order) how many
// districts in you are, so a late district drawn first plays like a first one
const depth = () => (gauntOn() ? G.gaunt.i : G.stage);
function spawnEnemy(kind, side) {
  const d = DEF[kind],
    DF = DIFF[G.diff],
    NG = ngMul(),
    LV = lvlMul(),
    hpm = (1 + depth() * 0.42) * DF.hp * NG.hp * LV.hp * graceMul();
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
    hp: Math.round(d.hp * hpm * crewHp()),
    dmg: Math.round(d.dmg * (1 + depth() * 0.26) * DF.dmg * NG.dmg * LV.dmg * graceMul()),
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
  makeLook(e); // its own skin, clothes, build and maybe an accessory (visual only)
  if (
    !d.boss &&
    kind !== 'rival' && // Vane is never an elite (spawnRival scales him itself)
    G.mode !== 'title' &&
    (modOn('elite') || Math.random() < DF.elite + NG.elite + depth() * 0.02)
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
  // some street foes walk in carrying a pipe, a chain or a bat
  const cc = CLUB_FOES[kind];
  if (cc && G.mode === 'play' && !G.training && !G.drive && !G.flight && Math.random() < cc) {
    const ck = pick(CLUB_KINDS);
    e.club = { kind: ck, uses: CLUBS[ck].uses };
  }
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
