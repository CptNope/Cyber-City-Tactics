/* Cyber City Tactics · src/js/game/state.js
 * The global game state (G), the party, runner creation, derived stats (refresh), campaign saves, karma and
 * levels, tips and floating text.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ================= state ================= */
const G = {
  mode: 'title',
  ret: 'play',
  stage: 0,
  camX: 0,
  lock: null,
  wave: 0,
  waveLive: false,
  ents: [],
  projs: [],
  parts: [],
  texts: [],
  picks: [],
  props: [],
  fx: [],
  shake: 0,
  stop: 0,
  t: 0,
  banner: 0,
  goT: 0,
  exitOpen: false,
  bg: null,
  rain: [],
  stock: [],
  debrief: null,
  coop: false,
  diff: 1,
  ng: 0,
  pendDiff: 1,
  pendArch: ['runner', 'samurai'],
  zaps: [],
  slowFoes: 0,
  arena: false,
  awave: 0,
  score: 0,
  theme: 0,
  nextWaveT: 0,
  perkPending: false,
  perks: [],
  lastEntry: null,
  den: false,
  npc: null,
  sheetIdx: 0,
  combo: 0,
  comboT: 999,
  bestCombo: 0,
  fade: 0,
  flash: 0,
  slow: 0,
  outro: 0,
  afterOutro: null,
  denPrompt: null,
  briefFromDen: false
};
const PARTY = { creds: 0, bag: [], med: 2, contract: null, ally: null };
let PL = [];

const RUNNER_KEYS = [
  'arch',
  'lvl',
  'karma',
  'pts',
  'attr',
  'cy',
  'eq',
  'spells',
  'spell',
  'hp',
  'mp',
  'ammo',
  'lives',
  'sk',
  'spts',
  'coat'
];
function newRunner(idx) {
  const p = {
    kind: 'player',
    idx,
    name: NAMES[idx],
    team: 0,
    pal: PALS[idx],
    x: 60,
    y: 220,
    z: 0,
    vx: 0,
    vz: 0,
    face: 1,
    state: 'idle',
    t: 0,
    walk: 0,
    inv: 0,
    flash: 0,
    lvl: 1,
    karma: 0,
    pts: 0,
    sk: {},
    spts: 1,
    attr: { bod: 2, str: 2, agi: 2, mag: 2, hak: 1 },
    cy: { arm: 0, wired: 0, plate: 0 },
    eq: { weapon: null, gun: mkItem('gun', 'light', 0), armor: mkItem('armor', 'coat', 0) },
    spells: ['fire'],
    spell: 0,
    hp: 1,
    mp: 1,
    maxHp: 1,
    maxMp: 1,
    ammo: 24,
    lives: 3,
    combo: 0,
    arch: 'runner',
    sp: 0,
    buffT: 0,
    freeAmmo: 0,
    chargeT: 0,
    lastPunch: -99,
    hits: 0,
    lastHit: 0,
    dead: false,
    out: false,
    holding: null,
    grab: null,
    knees: 0
  };
  refresh(p);
  p.hp = p.maxHp;
  p.mp = p.maxMp;
  return p;
}
function eff(p) {
  if (p.attr.hak === undefined) p.attr.hak = 1;
  const a = Object.assign({}, p.attr);
  for (const s in p.eq) {
    const it = p.eq[s];
    if (it) for (const k in it.bonus) a[k] += it.bonus[k];
  }
  return a;
}
function refresh(p) {
  initSkills(p);
  const a = eff(p),
    w = p.eq.weapon,
    g = p.eq.gun,
    ar = p.eq.armor,
    cy = p.cy,
    cyN = cy.arm + cy.wired + cy.plate + (cy.eyes || 0) + (cy.boost || 0),
    wb = (w && BASES.weapon[w.base]) || {};
  p.D = {
    a,
    melee: (a.str * 1.6 + (w ? w.dmg : 0) + cy.arm * 3) * (has(p, 'iron') ? 1.2 : 1),
    reach: w ? w.reach || 0 : 0,
    gun: g ? Math.round((g.dmg + a.agi * 0.8) * (has(p, 'steady') ? 1.2 : 1)) : 0,
    armor: (ar ? ar.arm : 0) + cy.plate * 3 + Math.floor(Math.max(0, a.bod) / 2),
    crit:
      0.03 +
      a.agi * 0.025 +
      cy.wired * 0.04 +
      (cy.eyes || 0) * 0.08 +
      (wb.crit || 0) +
      ((w && w.mod === 'keen') || (g && g.mod === 'keen') ? 0.08 : 0),
    spd: 1.55 + Math.max(0, a.agi) * 0.045 + cy.wired * 0.08,
    spell: a.mag * 4,
    regen: Math.round(Math.max(12, 46 - a.mag * 3) * (has(p, 'flow') ? 0.6 : 1)),
    breaker: !!wb.breaker,
    spellMul: has(p, 'focus') ? 1.2 : 1
  };
  if (typeof G !== 'undefined' && modOn('brawl')) p.D.melee *= 1.4;
  if (p.arch === 'adept') p.D.melee *= 1.3;
  p.maxHp = 70 + a.bod * 14 + (p.lvl - 1) * 5 + (ar && ar.mod === 'padded' ? 25 : 0);
  p.maxMp = Math.max(10, 24 + a.mag * 12 - cyN * 6);
  p.hp = Math.min(p.hp, p.maxHp);
  p.mp = Math.min(p.mp, p.maxMp);
}
function saveGame(phase) {
  const o = {
    v: 3,
    phase,
    stage: G.stage,
    coop: G.coop,
    diff: G.diff,
    ng: G.ng,
    muts: G.muts || [],
    party: PARTY,
    runners: PL.map(p => {
      const r = {};
      for (const k of RUNNER_KEYS) r[k] = p[k];
      return r;
    }),
    stock: G.stock,
    debrief: G.debrief,
    bestCombo: G.bestCombo
  };
  store.set('cs_save3', JSON.parse(JSON.stringify(o)));
}
function loadGame(s) {
  G.coop = !!s.coop;
  Object.assign(PARTY, { creds: 0, bag: [], med: 2, contract: null, ally: null }, s.party || {});
  PL = (s.runners || []).map((r, i) => {
    const p = newRunner(i);
    for (const k of RUNNER_KEYS) if (r[k] !== undefined) p[k] = r[k];
    if (r.sk === undefined) {
      p.sk = null;
      p.spts = undefined;
    }
    applyCoat(p);
    if (!ARCH[p.arch]) p.arch = 'runner';
    p.lives = Math.max(1, p.lives);
    refresh(p);
    return p;
  });
  if (!PL.length) PL = [newRunner(0)];
  G.coop = PL.length > 1;
  G.muts = s.muts || [];
  G.stage = s.stage || 0;
  G.diff = s.diff === undefined ? 1 : s.diff;
  G.ng = s.ng || 0;
  G.stock = s.stock || [];
  G.debrief = s.debrief || null;
  G.bestCombo = s.bestCombo || 0;
}
const karmaNext = l => 50 + l * 45;
const active = () => PL.filter(p => !p.out);
const alive = () => PL.filter(p => !p.out && p.state !== 'dead');
function gainKarma(n) {
  if (!n) return;
  if (G.coop) n = Math.max(1, Math.round(n * 0.75));
  if (mutN()) n = Math.round(n * (1 + 0.2 * mutN()));
  for (const p of active()) {
    p.karma += n;
    while (p.karma >= karmaNext(p.lvl)) {
      p.karma -= karmaNext(p.lvl);
      p.lvl++;
      p.pts += 2;
      p.spts = (p.spts || 0) + 1;
      refresh(p);
      p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.3));
      peak('lvl', p.lvl);
      say(p, 'LEVEL ' + p.lvl, '#ffc63d', 88, 80);
      sfx.level();
      buzz([20, 40, 20]);
      burst(p.x, p.y, 30, '#ffc63d', 16);
      tip(
        'level',
        'Level up! Tap CHAR to spend attribute points and unlock skills.',
        'Level up! Press C to spend attribute points and unlock skills.'
      );
    }
  }
  const p0 = active()[0];
  if (p0) G.texts.push({ x: p0.x, y: p0.y, z: 74, s: '+' + n + ' KARMA', c: '#b98cff', life: 40, sm: true });
}
function tip(id, touchTxt, keyTxt) {
  if (G.training || !prefs.tips || prefs.seen[id]) return;
  prefs.seen[id] = 1;
  savePrefs();
  const t = { s: ctl(touchTxt, keyTxt), life: 330 };
  if (G.tip && G.tip.life > 0) (G.tipQ = G.tipQ || []).push(t);
  else G.tip = t;
}
function say(p, s, c, z, life, sm) {
  G.texts.push({ x: p.x, y: p.y, z: z || 62, s, c, life: life || 46, sm: sm || s.length > 10 });
}
function contractTick(key, n) {
  const c = PARTY.contract;
  if (!c || c.done || c.failed || c.key !== key) return;
  c.count = Math.min(c.need, c.count + (n || 1));
  if (c.count >= c.need) {
    c.done = true;
    const p = active()[0];
    if (p) say(p, 'CONTRACT DONE', '#7dffb0', 96, 90);
    sfx.loot();
  }
}

function genBg(S, seed) {
  const r = srng(seed);
  const far = [],
    near = [];
  let x = -40;
  while (x < S.len * 0.25 + WMAX + 60) {
    const w = 24 + r() * 46,
      h = 50 + r() * 95;
    const wins = [];
    for (let wy = 8; wy < h - 6; wy += 9)
      for (let wx = 5; wx < w - 6; wx += 8) if (r() < 0.22) wins.push([wx, wy]);
    far.push({ x, w, h, wins });
    x += w + 2 + r() * 6;
  }
  x = -60;
  let si2 = 0;
  while (x < S.len * 0.55 + WMAX + 80) {
    const w = 56 + r() * 70,
      h = 70 + r() * 80;
    const wins = [];
    for (let wy = 10; wy < h - 8; wy += 12)
      for (let wx = 7; wx < w - 8; wx += 11) if (r() < 0.3) wins.push([wx, wy]);
    const b = { x, w, h, wins };
    if (S.signs.length && r() < 0.7) {
      const sg = S.signs[si2++ % S.signs.length];
      b.sign = { t: sg[0], c: sg[1], vert: r() < 0.35, dx: 6 + r() * (w - 50), dy: 12 + r() * (h * 0.4) };
    }
    near.push(b);
    x += w + 10 + r() * 30;
  }
  return { far, near };
}
const curS = () =>
  G.world
    ? G.dun
      ? G.dunStage
      : G.streetStage
    : G.den
      ? DEN
      : G.arena
        ? STAGES[G.theme]
        : G.training
          ? TRAIN_STAGE
          : STAGES[G.stage];
