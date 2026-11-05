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
const PARTY = { creds: 0, bag: [], stash: [], med: 2, contract: null, ally: null };
let PL = [];

const RUNNER_KEYS = [
  'arch',
  'lvl',
  'karma',
  'pts',
  'attr',
  'cy',
  'tech',
  'eq',
  'spells',
  'spell',
  'hp',
  'mp',
  'ammo',
  'lives',
  'sk',
  'spts',
  'coat',
  'trail',
  'spSel'
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
    tech: {},
    eq: { weapon: null, gun: mkItem('gun', 'light', 0), armor: mkItem('armor', 'coat', 0), deck: null },
    spells: ['fire'],
    spSel: 'arch', // what the ★ button does: the archetype's special, or an unlocked tree's active skill
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
  for (const k in p.eq) fixItem(p.eq[k]); // gear from before makers and parts
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
      ((w && w.mod === 'keen') || (g && g.mod === 'keen') ? 0.08 : 0) +
      ((w && w.crit) || 0) +
      ((g && g.crit) || 0),
    spd: (1.55 + Math.max(0, a.agi) * 0.045 + cy.wired * 0.08) * (hasPart(ar, 'swift') ? 1.08 : 1),
    spell: a.mag * 4,
    regen: Math.round(Math.max(12, 46 - a.mag * 3) * (has(p, 'flow') ? 0.6 : 1)),
    breaker: !!wb.breaker,
    spellMul: has(p, 'focus') ? 1.2 : 1
  };
  // maker sets: two pieces from one maker, then three
  if (setOn(p, 'kagemori', 2)) p.D.crit += 0.06;
  if (setOn(p, 'rustline', 2)) p.D.melee *= 1.1;
  if (setOn(p, 'ironside', 2)) p.D.spd *= 1.06;
  if (typeof G !== 'undefined' && modOn('brawl')) p.D.melee *= 1.4;
  if (p.arch === 'adept') p.D.melee *= 1.3;
  p.maxHp =
    70 +
    a.bod * 14 +
    (p.lvl - 1) * 5 +
    (ar && ar.mod === 'padded' ? 25 : 0) +
    (ar && ar.leg === 'wyrmheart' ? 40 : 0);
  p.maxMp = Math.max(10, 24 + a.mag * 12 - cyN * 6 - techN(p) * TECH_MANA);
  if (setOn(p, 'hexwright', 2)) p.maxMp = Math.round(p.maxMp * 1.15);
  p.hp = Math.min(p.hp, p.maxHp);
  p.mp = Math.min(p.mp, p.maxMp);
}
// a save that couldn't be written (storage full or blocked) is said out loud, at most once a minute
function saveWarn(ok) {
  if (ok !== false || typeof G === 'undefined') return ok;
  if (G.t - (G.saveWarnT === undefined ? -1e9 : G.saveWarnT) > 3600) {
    G.saveWarnT = G.t;
    G.tip = {
      s: "Couldn't save: this browser's storage is full or blocked. Free some space or leave private browsing.",
      life: 420
    };
  }
  return ok;
}
function saveGame(phase) {
  if (gauntOn()) return; // the Gauntlet never saves, and must never overwrite the campaign's save
  const o = {
    v: 4, // 4: six districts (the Undercity Market is district 4)
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
    choices: G.choices || {},
    bestCombo: G.bestCombo,
    sideJobs: G.sideJobs || {}
  };
  saveWarn(store.set('cs_save3', JSON.parse(JSON.stringify(o))));
}
// bring every item the party owns up to date (makers and parts arrived after some saves were made)
function fixGear() {
  for (const it of (PARTY.bag || []).concat(PARTY.stash || [], G.stock || [])) fixItem(it);
  for (const p of PL) for (const k in p.eq) fixItem(p.eq[k]);
}
// rebuild a runner from a save: newRunner()'s defaults, then each saved field that has a usable type
// (shared by the campaign and the Sprawl, so both clean up the same way)
function restoreRunner(r, i) {
  const p = newRunner(i);
  for (const k of RUNNER_KEYS) {
    const v = r[k];
    if (v === undefined || v === null) continue;
    if (isObj(p[k]) && !isObj(v)) continue; // an object field saved as something else: keep the default
    if (Array.isArray(p[k]) && !Array.isArray(v)) continue;
    if (typeof p[k] === 'number' && !Number.isFinite(v)) continue;
    p[k] = v;
  }
  if (r.sk === undefined) {
    p.sk = null;
    p.spts = undefined;
  }
  for (const s of SLOTS) if (p.eq[s] !== null && !isObj(p.eq[s])) p.eq[s] = null;
  p.cy = Object.assign({ arm: 0, wired: 0, plate: 0 }, p.cy);
  p.attr = Object.assign({ bod: 2, str: 2, agi: 2, mag: 2, hak: 1 }, p.attr);
  if (!isObj(p.tech)) p.tech = {};
  if (!Array.isArray(p.spells) || !p.spells.length) p.spells = ['fire'];
  if (!ARCH[p.arch]) p.arch = 'runner';
  applyCoat(p);
  return p;
}
// the party's own fields, typed the same way
function restoreParty(sp, extra) {
  Object.assign(
    PARTY,
    { creds: 0, bag: [], stash: [], med: 2, contract: null, ally: null },
    extra || {},
    isObj(sp) ? sp : {}
  );
  if (!Number.isFinite(PARTY.creds)) PARTY.creds = 0;
  for (const k of ['bag', 'stash']) PARTY[k] = Array.isArray(PARTY[k]) ? PARTY[k].filter(isObj) : [];
}
function loadGame(s) {
  G.coop = !!s.coop;
  restoreParty(s.party);
  PL = (s.runners || []).filter(isObj).map((r, i) => {
    const p = restoreRunner(r, i);
    p.lives = Math.max(1, p.lives);
    refresh(p);
    return p;
  });
  if (!PL.length) PL = [newRunner(0)];
  G.coop = PL.length > 1;
  G.muts = s.muts || [];
  G.stage = s.stage || 0;
  G.diff = Number.isInteger(s.diff) && DIFF[s.diff] ? s.diff : 1;
  G.ng = s.ng || 0;
  G.stock = s.stock || [];
  G.debrief = s.debrief || null;
  G.choices = isObj(s.choices) ? s.choices : {};
  G.bestCombo = s.bestCombo || 0;
  fixGear();
  G.sideJobs = isObj(s.sideJobs) ? s.sideJobs : {};
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
      const mt = MASTERY_LV.indexOf(p.lvl);
      if (mt >= 0)
        (G.toasts = G.toasts || []).push({
          s:
            (p.name || 'Runner') +
            ': ' +
            (ARCH[p.arch] || ARCH.runner).spName +
            ' mastery ' +
            ['I', 'II', 'III'][mt],
          d: mt < 2 ? 'Your special is 25% stronger.' : MASTERY[p.arch] || '',
          life: 300
        });
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
  if (G.training || !prefs.tips) return;
  // online, the friend sees the host's tips: show each once per online session too, even if the host knows it
  const online = typeof NET !== 'undefined' && NET.role === 'host' && NET.live;
  if (online) {
    NET.tipsSeen = NET.tipsSeen || {};
    if (NET.tipsSeen[id]) return;
    NET.tipsSeen[id] = 1;
  } else if (prefs.seen[id]) return;
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
  G.drive
    ? G.drive.S
    : G.stealth
      ? G.stealth.S
      : G.flight
        ? G.flight.S
        : G.world
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
