/* Cyber City Tactics · src/js/modes/sprawl.js
 * The Sprawl (open world): street generation, block events, bounties, hidden doors, heat, cops, couriers and
 * world saves (cs_world).
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ---------- the Sprawl (open world) ---------- */
const BNAMES = {
  business: [
    'Noodle bar',
    'Pawn shop',
    'Soycaf stand',
    'Clinic',
    'Credit union',
    'Arcade',
    'Gun shop',
    'Pharmacy',
    'Chip shop',
    'Laundromat'
  ],
  hideout: [
    'Rustline Crew den',
    'Neon Fangs garage',
    'Red Hex chop shop',
    'Ghoul-runner nest',
    'Iron Saints clubhouse',
    'Bonefire squat'
  ],
  blacksite: ['Kagemori lab annex', 'Data vault', 'Corp black site', 'Prototype depot'],
  home: ['Walk-up 3F', 'Apartment 2C', 'Row house', 'Coffin hotel 14', 'Basement flat', 'Corner flat'],
  dirty: ['Penthouse', 'Glass condo', 'Gated loft', 'Rooftop suite']
};
const OWNERS = {
  business: [
    'A family business that barely makes rent',
    'A small shop that pays its workers on time',
    'The only clinic on the block that takes walk-ins',
    'A corner shop run by three generations of the same family'
  ],
  home: [
    'The Okafor family lives here',
    'A retired dock worker and his cat',
    'Two nurses on the night shift',
    'A student and her grandmother',
    'A street musician who sleeps all day'
  ],
  dirty: [
    "A Kagemori fixer's condo, paid for with stolen pensions",
    "A gang boss's penthouse stocked with stolen goods",
    "A crooked cop's loft full of evidence-room cash",
    "An organ broker's safe flat"
  ],
  hideout: [
    'A gang crew that shakes down every shop on the block',
    'Gangers who run chop shops and protection rackets',
    'A crew that has been feeding people to ghouls'
  ],
  blacksite: [
    'A Kagemori site running experiments on people from this block',
    'A corp vault full of stolen data',
    'A lab that has been dumping waste into the tunnels'
  ]
};
const FAC = {
  hideout: {
    pool: ['ganger', 'ganger', 'orc', 'shaman'],
    t3: ['ghoul', 'riot', 'hound'],
    boss: [null, 'orc', 'troll', 'blade'],
    bossName: ['', 'Crew lieutenant', 'Crew boss', 'Crew warlord'],
    theme: 0
  },
  blacksite: {
    pool: ['sec', 'riot', 'drone', 'sec'],
    t3: ['ice', 'glitch', 'ninja'],
    boss: [null, 'riot', 'archmage', 'blackice'],
    bossName: ['', 'Site chief', 'Research director', 'Vault ICE'],
    theme: 3
  },
  business: {
    pool: ['sec', 'sec', 'drone'],
    t3: ['riot'],
    boss: [null, null, 'riot', 'riot'],
    bossName: ['', '', 'Head of security', 'Head of security'],
    theme: 1
  },
  home: { pool: [], t3: [], boss: [null, null, null, null], bossName: ['', '', '', ''], theme: -1 },
  dirty: {
    pool: ['sec', 'orc', 'ganger'],
    t3: ['riot'],
    boss: [null, 'orc', 'blade', 'blade'],
    bossName: ['', 'Bodyguard', 'Bodyguard', 'Bodyguard'],
    theme: -1
  },
  secret: {
    pool: ['shaman', 'ghoul', 'spirit', 'shaman'],
    t3: ['glitch'],
    boss: [null, 'saint', 'saint', 'archmage'],
    bossName: ['', 'Lantern keeper', 'Lantern keeper', 'Wyrm priest'],
    theme: 2
  }
};
const isGood = b =>
  b.type === 'secret' || b.type === 'hideout' || b.type === 'blacksite' || (b.type === 'home' && b.dirty);
const facOf = b => (b.type === 'home' ? (b.dirty ? 'dirty' : 'home') : b.type);
const EVENTS = {
  gangwar: {
    name: 'Gang war',
    desc: 'The crews are fighting over the block. Patrols come twice as often and hideouts pay double street cred.',
    col: '#ff6a3d'
  },
  blackout: {
    name: 'Blackout',
    desc: 'The grid is down. No cops can find you, locks are easier to crack, and it is very dark.',
    col: '#45d2ff'
  },
  lockdown: {
    name: 'Kagemori lockdown',
    desc: 'Every black site is locked at tier 3 with better loot, and heat cools half as fast.',
    col: '#ffc63d'
  },
  festival: {
    name: 'Night market',
    desc: 'Lantern festival on the block. Shops are 20% cheaper and vending machines line the street.',
    col: '#b98cff'
  },
  acidrain: {
    name: 'Acid rain',
    desc: 'Toxic rain eats at everyone out on the street, gangers included: 1 HP every two seconds. Indoors is dry.',
    col: '#7dffb0'
  },
  parade: {
    name: 'Corp parade',
    desc: 'Kagemori is celebrating. Patrols walk the block even with no heat, but every takedown pays 50% more creds.',
    col: '#45d2ff'
  },
  spiritstorm: {
    name: 'Spirit storm',
    desc: 'The astral is boiling over. Wild spirits drift down the block, and every spell costs half the mana.',
    col: '#b98cff'
  },
  manhunt: {
    name: 'Manhunt',
    desc: 'Someone put a price on your head. Bounty hunters come for you now and then, and each one carries a fat payout.',
    col: '#ff3d4a'
  }
};
const evOn = k => !!(G.world && G.wd && G.wd.street && G.wd.street.event === k);
const BOUNTY_N = [
  '"Knuckles" Okoro',
  'Siobhan Vex-9',
  'The Pale Dutchman',
  'Marrow',
  'Sgt. Hollis Crane',
  'Two-Tongue Teo',
  'Mother Static',
  'Iron Juniper'
];
const roomsOf = b =>
  b.type === 'home' && !b.dirty ? 1 : b.final ? 4 : b.type === 'secret' ? (b.vault ? 3 : 2) : b.tier + 1;
const heatFor = b => (b.type === 'business' ? b.tier + 1 : 2);
const credLoss = b => (b.type === 'business' ? 5 * b.tier : 12);
const buyMul = () =>
  (G.world && G.wd && G.wd.rep >= 30 ? 0.85 : 1) * (anyHas('fence') ? 0.9 : 1) * (evOn('festival') ? 0.8 : 1);
const sellRate = () => (G.world && G.wd && G.wd.rep <= -30 ? 0.6 : 0.4) + (anyHas('fence') ? 0.15 : 0);
function genStreet(level, seed) {
  const r = srng(seed),
    B = [];
  let x = 40;
  B.push({ id: 0, type: 'safe', name: 'Safehouse', x: x + 70, w: 130, tier: 0, seed: 1 });
  x += 170;
  for (let i = 1; i <= 14; i++) {
    const w = 128 + Math.floor(r() * 56),
      roll = r();
    let type = roll < 0.3 ? 'home' : roll < 0.54 ? 'business' : roll < 0.8 ? 'hideout' : 'blacksite';
    const dirty = type === 'home' && r() < 0.38;
    const tier = clamp(1 + Math.floor(r() * 2) + Math.floor((level - 1) / 2), 1, 3);
    const pool = BNAMES[dirty ? 'dirty' : type],
      own = OWNERS[dirty ? 'dirty' : type];
    let nm = pool[Math.floor(r() * pool.length)];
    for (let k = 0; k < 6 && B.some(o => o.name === nm); k++) nm = pool[Math.floor(r() * pool.length)];
    B.push({
      id: i,
      type,
      dirty,
      tier,
      x: x + w / 2,
      w,
      name: nm,
      owner: own[Math.floor(r() * own.length)],
      seed: Math.floor(r() * 1e9)
    });
    x += w + 16 + Math.floor(r() * 36);
  }
  // a block event, rolled from the seed (never on block 1)
  const er = r();
  const EVROLL = [
    ['gangwar', 0.1],
    ['blackout', 0.19],
    ['lockdown', 0.28],
    ['festival', 0.37],
    ['acidrain', 0.45],
    ['parade', 0.53],
    ['manhunt', 0.61],
    ['spiritstorm', 0.69]
  ];
  const event = level < 2 ? null : (EVROLL.find(([, p]) => er < p) || [null])[0];
  if (event === 'lockdown') for (const b of B) if (b.type === 'blacksite') b.tier = 3;
  // Juno's bounty: a named target in one of the tougher good buildings
  const cand = B.filter(b => b.id && isGood(b) && FAC[facOf(b)].boss[b.tier]);
  if (cand.length) {
    const bb = cand[Math.floor(r() * cand.length)];
    bb.bounty = { name: BOUNTY_N[Math.floor(r() * BOUNTY_N.length)], reward: 120 + level * 60 };
  }
  // a hidden door, wedged into a gap between two buildings
  if (r() < 0.4 + level * 0.08) {
    const i = 1 + Math.floor(r() * (B.length - 2)),
      a = B[i],
      c = B[i + 1],
      vault = level >= 3 && r() < 0.5;
    B.push({
      id: 99,
      type: 'secret',
      vault,
      tier: vault ? 3 : 2,
      x: (a.x + a.w / 2 + c.x - c.w / 2) / 2,
      w: 36,
      name: vault ? 'Unmarked vault' : 'Hidden shrine',
      owner: vault
        ? 'A wyrm cult keeps its tithes here, behind a door nobody remembers building.'
        : 'Lantern-bearers meet here in secret. The candles never go out.',
      seed: Math.floor(r() * 1e9),
      hidden: true
    });
  }
  // the Lantern Vault, once you know the whole story
  if (typeof LEG !== 'undefined' && LEG.lore.length >= LORE.length && !LEG.feats.b_avatar) {
    const i = 2 + Math.floor(r() * (B.length - 4)),
      a = B[i],
      c = B[i + 1];
    B.push({
      id: 98,
      type: 'secret',
      vault: true,
      final: true,
      tier: 3,
      x: (a.x + a.w / 2 + c.x - c.w / 2) / 2,
      w: 36,
      name: 'The Lantern Vault',
      owner: "Ssareth's vault. The door is warm, and a lantern burns above it.",
      seed: Math.floor(r() * 1e9),
      hidden: false
    });
  }
  return { len: x + 120, buildings: B, event };
}
function newWorld(level) {
  const seed = Math.floor(Math.random() * 1e9);
  return {
    level,
    seed,
    heat: 0,
    rep: 0,
    looted: [],
    found: [],
    bountyDone: false,
    courT: ri(1500, 2600),
    courDone: false,
    h5T: 0,
    heatT: 0,
    copT: 600,
    patT: 600,
    copKills: 0,
    lastX: 180,
    street: genStreet(level, seed)
  };
}
function startWorld(coop) {
  G.challenge = null;
  G.rngW = G.rngP = null;
  G.diff = 1;
  G.ng = 0;
  G.coop = !!coop;
  newRunStats();
  PL = [newRunner(0)];
  if (coop) PL.push(newRunner(1));
  PL.forEach((p, i) => applyArch(p, G.pendArch[i]));
  Object.assign(PARTY, {
    creds: 120 + rankOf(legLP()) * 15,
    bag: [],
    med: 2,
    contract: null,
    ally: null,
    ice: 2
  });
  G.wd = newWorld(1);
  G.stock = [randItem(0, false), randItem(1, false), randItem(1, true)];
  enterStreet(180);
}
function saveWorld() {
  if (!G.wd) return;
  const w = G.wd;
  store.set(
    'cs_world',
    JSON.parse(
      JSON.stringify({
        v: 1,
        coop: G.coop,
        party: PARTY,
        runners: PL.map(p => {
          const r = {};
          for (const k of RUNNER_KEYS) r[k] = p[k];
          return r;
        }),
        wd: {
          level: w.level,
          seed: w.seed,
          heat: w.heat,
          rep: w.rep,
          looted: w.looted,
          copKills: w.copKills,
          lastX: w.lastX,
          found: w.found,
          bountyDone: w.bountyDone,
          courDone: w.courDone
        },
        stock: G.stock,
        bestCombo: G.bestCombo
      })
    )
  );
}
function loadWorld(s) {
  G.challenge = null;
  G.rngW = G.rngP = null;
  G.diff = 1;
  G.ng = 0;
  newRunStats();
  Object.assign(PARTY, { creds: 0, bag: [], med: 2, contract: null, ally: null, ice: 0 }, s.party || {});
  PL = (s.runners || []).map((r, i) => {
    const p = newRunner(i);
    for (const k of RUNNER_KEYS) if (r[k] !== undefined) p[k] = r[k];
    if (r.sk === undefined) {
      p.sk = null;
      p.spts = undefined;
    }
    applyCoat(p);
    if (!ARCH[p.arch]) p.arch = 'runner';
    p.lives = 3;
    refresh(p);
    return p;
  });
  if (!PL.length) PL = [newRunner(0)];
  G.coop = PL.length > 1;
  G.bestCombo = s.bestCombo || 0;
  G.wd = Object.assign(
    {
      heatT: 0,
      copT: 600,
      patT: 600,
      copKills: 0,
      lastX: 180,
      found: [],
      bountyDone: false,
      courT: 2000,
      courDone: false,
      h5T: 0
    },
    s.wd
  );
  G.wd.street = genStreet(G.wd.level, G.wd.seed);
  G.stock = s.stock || [];
}
function enterStreet(x) {
  G.world = true;
  G.dun = null;
  G.den = false;
  G.arena = false;
  G.training = false;
  resetWorld();
  const w = G.wd,
    st = w.street;
  G.streetStage = Object.assign({}, DEN, {
    name: 'Block ' + w.level,
    sub: 'The Sprawl',
    len: st.len,
    signs: [
      ['NOODLE', '#ff3d8b'],
      ['24H', '#45d2ff'],
      ['PAWN', '#ffc63d'],
      ['TALISMAN', '#b98cff'],
      ['SOYCAF', '#ff6a3d']
    ]
  });
  G.bg = genBg(G.streetStage, w.seed % 100000);
  G.stage = Math.min(4, w.level - 1);
  peak('block', w.level);
  G.ng = Math.max(0, (w.level - 5) * 0.2);
  placeRunners(x);
  PL.forEach((p, i) => {
    p.out = false;
    p.lives = 3;
    p.y = 196 + i * 18;
    if (p.hp <= 0) p.hp = p.maxHp;
    G.ents.push(p);
  });
  if (PARTY.ally) spawnAlly(PARTY.ally.type);
  G.camX = clamp(x - W / 2, 0, st.len - W);
  makeRain(true);
  musicPlay('den');
  G.fade = 0.8;
  w.lastX = x;
  if (st.event) {
    LEG.evseen = LEG.evseen || [];
    if (!LEG.evseen.includes(st.event)) {
      LEG.evseen.push(st.event);
      LEG.stats.evseen = LEG.evseen.length;
      featCheck('evseen');
      legDirty = true;
    }
    if (!w.evShown) {
      w.evShown = true;
      (G.toasts = G.toasts || []).push({
        s: 'Block event: ' + EVENTS[st.event].name,
        d: EVENTS[st.event].desc.split('.')[0],
        life: 280,
        lore: true
      });
    }
    if (st.event === 'festival' && !w.vends) {
      w.vends = true;
    }
    if (st.event === 'festival')
      for (let i = 0; i < 4; i++) spawnPassive('vend', 300 + i * Math.floor((st.len - 500) / 4), FY0 + 14);
  }
  setMode('play');
  saveWorld();
  tip(
    'world',
    'Walk up to a door and tap ENTER. Green signs are fair game; red ones hurt ordinary people and bring cops.',
    'Walk up to a door and press J. Green signs are fair game; red ones hurt ordinary people and bring cops.'
  );
}
function nearDoor(p) {
  if (!G.world || G.dun || !G.wd) return null;
  for (const b of G.wd.street.buildings)
    if ((!b.hidden || G.wd.found.includes(b.id)) && Math.abs(p.x - b.x) < 20 && p.y < FY0 + 40) return b;
  return null;
}
function openDoor(b) {
  sfx.talk();
  if (b.type === 'safe') {
    G.safeTab = G.safeTab || 'doc';
    setMode('safe');
  } else {
    G.bsel = b;
    setMode('bcard');
  }
}
// Acid rain, corp parade and manhunt run here each tick, out on the street only
function blockEventTick(w) {
  if (evOn('acidrain') && G.t % 120 === 0)
    for (const e of G.ents) {
      if (e.state === 'dead' || e.out || (e.d && (e.d.passive || e.d.spirit || e.d.fly))) continue;
      if (e.team === 0 && e.kind === 'player') {
        if (e.hp > 1) e.hp--;
      } else if (e.team === 1 && e.hp > 1) e.hp--;
    }
  if (evOn('parade') && !w.heat) {
    w.parT = (w.parT === undefined ? 900 : w.parT) - 1;
    if (w.parT <= 0) {
      w.parT = ri(1400, 2000);
      if (G.ents.filter(e => e.kind === 'cop' && e.state !== 'dead').length < 2) {
        spawnEnemy('cop', 1);
        tip(
          'parade',
          'Parade patrols ignore your heat. Leave them be, or take them down for the bigger payout.'
        );
      }
    }
  }
  if (evOn('spiritstorm')) {
    w.stormT = (w.stormT === undefined ? 600 : w.stormT) - 1;
    if (w.stormT <= 0) {
      w.stormT = ri(1100, 1600);
      if (G.ents.filter(e => e.kind === 'spirit' && e.state !== 'dead').length < 2) {
        spawnEnemy('spirit', Math.random() < 0.5 ? -1 : 1);
        tip(
          'storm',
          'Wild spirits shrug off bullets. Use fists and spells, which cost half during the storm.'
        );
      }
    }
  }
  if (evOn('manhunt')) {
    w.huntT = (w.huntT === undefined ? 1200 : w.huntT) - 1;
    if (w.huntT <= 0 && !G.ents.some(e => e.hunter && e.state !== 'dead')) {
      w.huntT = ri(1800, 2600);
      const e = spawnEnemy(w.level >= 3 ? 'riot' : 'sec', Math.random() < 0.5 ? -1 : 1);
      e.hunter = true;
      e.name = 'Bounty hunter';
      e.elite = 'berserk';
      e.hp = e.maxHp = Math.round(e.maxHp * 2.2);
      const p = alive()[0];
      if (p) say(p, 'BOUNTY HUNTER INCOMING', '#ff3d4a', 90, 100);
      tip('manhunt', 'Bounty hunters are tough, but each one drops a big creds payout.');
    }
  }
}
const copKind = (h, i) => (h >= 4 && i === 0 ? 'riot' : h >= 3 && i === 1 ? 'drone' : 'cop');
function worldTick() {
  const w = G.wd;
  if (G.dun) {
    dunTick();
    return;
  }
  G.doorPrompt = null;
  for (const p of alive()) {
    const b = nearDoor(p);
    if (b) G.doorPrompt = b;
  }
  if (PL[0]) w.lastX = PL[0].x;
  for (const b of w.street.buildings)
    if (b.hidden && !w.found.includes(b.id) && alive().some(p => Math.abs(p.x - b.x) < 60)) {
      w.found.push(b.id);
      feat('secret');
      const p = alive()[0];
      say(p, 'A HIDDEN DOOR!', '#b98cff', 90, 100);
      sfx.loot();
      saveWorld();
    }
  if (w.rep >= 60) feat('folk');
  if (w.rep <= -60) feat('villain');
  if (w.heat >= 5) {
    w.h5T = (w.h5T || 0) + 1;
    if (w.h5T >= 3600) feat('wanted');
  } else w.h5T = 0;
  if (!w.courDone && !G.ents.some(e => e.courier)) {
    w.courT--;
    if (w.courT <= 0) {
      const e = spawnEnemy('drone', Math.random() < 0.5 ? -1 : 1);
      e.courier = true;
      e.name = 'Kagemori courier';
      e.elite = 'armored';
      e.hp = e.maxHp = Math.round(e.maxHp * 3);
      e.escapeT = 1080;
      w.courDone = true;
      const p = alive()[0];
      if (p) say(p, 'COURIER DRONE! TAKE IT DOWN', '#ffc63d', 90, 100);
      tip('courier', 'A Kagemori courier is crossing the block with cargo. Shoot it down before it escapes.');
    }
  }
  for (const e of G.ents)
    if (e.courier && e.state !== 'dead') {
      e.escapeT--;
      if (e.escapeT <= 0) {
        e.gone = true;
        G.texts.push({ x: e.x, y: e.y, z: 40, s: 'COURIER ESCAPED', c: '#a79dc2', life: 60 });
      }
    }
  const cops = G.ents.filter(e => e.kind === 'cop' && e.state !== 'dead').length;
  if (w.heat > 0) {
    if (!cops) {
      w.heatT += evOn('lockdown') ? 0.5 : 1;
      if (w.heatT > 1500) {
        w.heat--;
        w.heatT = 0;
        const p = alive()[0];
        if (p) say(p, w.heat ? 'HEAT DROPPING' : 'HEAT IS OFF', '#45d2ff', 80, 70);
      }
    } else w.heatT = 0;
    if (!evOn('blackout')) w.copT--;
    if (w.copT <= 0) {
      const n = 1 + Math.floor(w.heat / 2);
      for (let i = 0; i < n; i++) spawnEnemy(copKind(w.heat, i), i % 2 ? -1 : 1);
      w.copT = Math.round(Math.max(360, 1320 - w.heat * 180) * (anyHas('jam') ? 1.3 : 1));
      tip(
        'heat',
        'Cops! Heat cools off if you lose them, or pay to lay low at the safehouse. Shooting cops makes it worse.'
      );
    }
  }
  blockEventTick(w);
  w.patT--;
  if (w.patT <= 0) {
    w.patT = Math.round(ri(1500, 2400) * (evOn('gangwar') ? 0.5 : 1));
    if (G.ents.filter(e => e.team === 1 && e.state !== 'dead' && !e.d.passive).length < 3) {
      const k = ['ganger', 'ganger', 'orc', 'shaman'];
      for (let i = 0; i < 2 + (w.level > 2 ? 1 : 0); i++) spawnEnemy(pick(k), i % 2 ? -1 : 1);
    }
  }
}
