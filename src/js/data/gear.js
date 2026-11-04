/* Cyber City Tactics · src/js/data/gear.js
 * Attributes, weapon/gun/armor bases, rarities, affixes, spells, archetypes, and the item factory (mkItem,
 * randItem).
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ================= RPG data ================= */
const ATTRS = {
  bod: { name: 'Body', hint: 'Max HP and armor' },
  str: { name: 'Strength', hint: 'Punch, kick, grab and throw damage' },
  agi: { name: 'Agility', hint: 'Speed, gun damage, crits' },
  mag: { name: 'Magic', hint: 'Mana, spell power, regen' },
  hak: { name: 'Hacking', hint: 'Wider windows when cracking locks in the Sprawl' }
};
const BASES = {
  weapon: {
    pipe: { name: 'Lead pipe', dmg: 3, reach: 2, price: 40, look: 'pipe' },
    knucks: {
      name: 'Spur knuckles',
      dmg: 4,
      reach: 0,
      price: 70,
      look: 'knucks',
      crit: 0.08,
      note: '+8% crit, heavy blow is a three-hit flurry'
    },
    baton: {
      name: 'Shock baton',
      dmg: 5,
      reach: 4,
      price: 90,
      look: 'baton',
      note: 'heavy blow stuns everything it hits'
    },
    katana: {
      name: 'Katana',
      dmg: 8,
      reach: 8,
      price: 180,
      look: 'blade',
      note: 'heavy blow is a dash slash'
    },
    axe: {
      name: 'Fire axe',
      dmg: 10,
      reach: 6,
      price: 240,
      look: 'axe',
      breaker: true,
      note: 'every hit breaks guards, heavy blow cleaves both ways'
    },
    whip: {
      name: 'Monowhip',
      dmg: 11,
      reach: 14,
      price: 320,
      look: 'whip',
      note: 'heavy blow yanks a distant enemy to you'
    },
    hammer: {
      name: 'Gravity hammer',
      dmg: 15,
      reach: 7,
      price: 420,
      look: 'hammer',
      breaker: true,
      note: 'breaks guards, heavy blow is a ground pound'
    }
  },
  gun: {
    light: { name: 'Streetline pistol', dmg: 11, fire: 'single', price: 50 },
    heavy: { name: 'Heavy pistol', dmg: 17, fire: 'single', price: 120 },
    smg: { name: 'Machine pistol', dmg: 8, fire: 'burst', price: 170 },
    shot: { name: 'Sawed-off shotgun', dmg: 22, fire: 'spread', price: 220 },
    rifle: { name: 'Assault rifle', dmg: 9, fire: 'auto', price: 260 },
    smart: { name: 'Smartgun', dmg: 15, fire: 'seek', price: 300 },
    rail: { name: 'Railgun', dmg: 30, fire: 'pierce', price: 380 },
    launcher: { name: 'Grenade launcher', dmg: 26, fire: 'grenade', price: 420 }
  },
  armor: {
    coat: { name: 'Lined coat', arm: 3, price: 40 },
    robe: { name: 'Warded duster', arm: 2, price: 100, bonus: { mag: 2 } },
    jacket: { name: 'Armor jacket', arm: 6, price: 110 },
    weave: { name: 'Form-fit weave', arm: 4, price: 130, bonus: { agi: 1 } },
    cloak: { name: 'Thermoptic cloak', arm: 5, price: 260, bonus: { agi: 2, hak: 1 } },
    vest: { name: 'Riot vest', arm: 9, price: 200 },
    exo: { name: 'Exo-frame', arm: 13, price: 340, bonus: { str: 2, agi: -1 } }
  }
};
// Gun mods: fitted at Ratchet's bench, one per gun, and they stay with the gun
const GMODS = {
  mag: { name: 'Extended mag', desc: 'Ammo pickups give 50% more rounds.', price: 150 },
  laser: { name: 'Laser sight', desc: '+10% crit chance with this gun.', price: 200 },
  supp: { name: 'Suppressor', desc: 'Cops you shoot down add no heat.', price: 180 },
  ugl: { name: 'Underbarrel launcher', desc: 'Every 20 seconds, a shot also lobs a grenade.', price: 300 }
};
const gmodOf = p => (p && p.eq && p.eq.gun && p.eq.gun.gmod) || null;
const FIRE = {
  single: 'single shot',
  burst: '3-round burst',
  spread: 'close-range spread',
  auto: '4-round auto',
  seek: 'smart rounds that track targets',
  pierce: 'rail slug that pierces every target',
  grenade: 'arcing grenade that explodes'
};
const AFFIX = {
  shock: {
    n: 'Shock',
    slots: ['weapon', 'gun'],
    desc: "25% chance to stun, delaying the target's next attack"
  },
  burn: {
    n: 'Incendiary',
    slots: ['weapon', 'gun'],
    desc: 'Sets targets on fire for extra damage over 2 seconds'
  },
  leech: { n: 'Leeching', slots: ['weapon', 'gun'], desc: 'Heals you for 15% of the damage you deal' },
  keen: { n: 'Keen', slots: ['weapon', 'gun'], desc: '+8% crit chance' },
  spiked: { n: 'Spiked', slots: ['armor'], desc: 'Enemies that hit you in melee take 6 damage' },
  padded: { n: 'Padded', slots: ['armor'], desc: '+25 max HP' }
};
const AFX_COL = { shock: '#45d2ff', burn: '#ff6a3d', leech: '#7dffb0' };
/* Gear works like Borderlands: every piece comes from a manufacturer with its own speciality, and rolls 0–4
 * parts. The number of parts is its rarity, and its colour: white Street (none), green Tuned (one), blue
 * Prototype (two), purple Black-market (three), orange Legendary (four, or a named legendary from a feat).
 * The tier itself adds a little; the parts are what make two katanas play differently. */
const RAR = [
  { n: 'Street', m: 1 },
  { n: 'Tuned', m: 1.12 },
  { n: 'Prototype', m: 1.25 },
  { n: 'Black-market', m: 1.4 },
  { n: 'Legendary', m: 1.55 }
];
// Manufacturers: who makes what, their colour on the item card and the weapon, and the parts they favour
const MFR = {
  kagemori: {
    name: 'Kagemori',
    col: '#ff3d4a',
    spec: 'Precision: crits',
    slots: ['weapon', 'gun', 'armor'],
    attr: 'agi',
    likes: ['keen', 'keen', 'sight', 'swift', 'attr', 'plated']
  },
  rustline: {
    name: 'Rustline Forge',
    col: '#ff8a3d',
    spec: 'Raw damage and knockback',
    slots: ['weapon', 'gun', 'armor'],
    attr: 'str',
    likes: ['heavy', 'heavy', 'brutal', 'burn', 'attr', 'plated', 'spiked']
  },
  voltaic: {
    name: 'Voltaic',
    col: '#45d2ff',
    spec: 'Shock and fire; its melee weapons always daze',
    slots: ['weapon', 'gun'],
    attr: 'hak',
    likes: ['shock', 'shock', 'burn', 'swift', 'concuss', 'drum']
  },
  hexwright: {
    name: 'Hexwright',
    col: '#b98cff',
    spec: 'Magic: mana, spell power, leeching',
    slots: ['weapon', 'gun', 'armor'],
    attr: 'mag',
    likes: ['attr', 'attr', 'leech', 'warded', 'keen', 'padded']
  },
  ironside: {
    name: 'Ironside Arms',
    col: '#c9d1e0',
    spec: 'Speed: faster swings and fire, bigger mags',
    slots: ['weapon', 'gun', 'armor'],
    attr: 'bod',
    likes: ['swift', 'swift', 'drum', 'heavy', 'padded', 'plated']
  }
};
// Parts: what each one does, the word it lends the item's name, and which slots can have it
const PARTS = {
  heavy: { n: 'Heavy', slots: ['weapon', 'gun'], desc: '+20% damage' },
  brutal: { n: 'Brutal', slots: ['weapon'], desc: 'knocks foes further' },
  keen: { n: 'Keen', slots: ['weapon', 'gun'], desc: '+8% crit chance' },
  sight: { n: 'Scoped', slots: ['gun'], desc: '+6% crit chance and crits hit harder' },
  swift: {
    n: 'Swift',
    slots: ['weapon', 'gun', 'armor'],
    desc: 'attacks recover 20% faster',
    adesc: 'move 8% faster'
  },
  concuss: { n: 'Concussive', slots: ['weapon'], desc: 'one hit dazes a foe (ready to grab)' },
  drum: { n: 'Drum-fed', slots: ['gun'], desc: 'ammo pickups give 50% more rounds' },
  attr: { n: 'Augmented', slots: ['weapon', 'gun', 'armor'], desc: '+2 more to the maker’s attribute' },
  shock: { n: 'Shock', slots: ['weapon', 'gun'], mod: 'shock' },
  burn: { n: 'Incendiary', slots: ['weapon', 'gun'], mod: 'burn' },
  leech: { n: 'Leeching', slots: ['weapon', 'gun'], mod: 'leech' },
  plated: { n: 'Plated', slots: ['armor'], desc: '+30% armor' },
  spiked: { n: 'Spiked', slots: ['armor'], mod: 'spiked' },
  padded: { n: 'Padded', slots: ['armor'], mod: 'padded' },
  warded: { n: 'Warded', slots: ['armor'], desc: '+2 Magic' }
};
const partDesc = (k, slot) => {
  const P = PARTS[k];
  if (P.mod) return AFFIX[P.mod].desc;
  return slot === 'armor' && P.adesc ? P.adesc : P.desc;
};
const hasPart = (it, k) => !!(it && it.parts && it.parts.includes(k));
const makersFor = slot => Object.keys(MFR).filter(k => MFR[k].slots.includes(slot));
// The party bag holds this many items (it was 12). Shops buy anything in it. The stash (Den locker and Sprawl
// safehouse, shared) holds STASH_MAX more and never leaves home.
const BAG_MAX = 40,
  STASH_MAX = 60;
// Every newly acquired item is stamped: marked NEW until the character sheet is closed, and numbered so the
// bag can sort newest first.
function gotItem(it) {
  it.fresh = true;
  it.got = PARTY.gotN = (PARTY.gotN || 0) + 1;
  return it;
}
// Bag ordering, shared by the character sheet, every sell list and the stash (prefs.bagSort)
const BAG_SORTS = {
  best: (a, b) => b.rar - a.rar || b.price - a.price,
  value: (a, b) => b.price - a.price,
  new: (a, b) => (b.got || 0) - (a.got || 0)
};
const bagSort = () => BAG_SORTS[prefs.bagSort] || BAG_SORTS.best;
// rarity colours, Borderlands order: white, green, blue, purple, orange
const RCOL = ['#efe9ff', '#7dffb0', '#45d2ff', '#b98cff', '#ffa630'];
const SPELLS = {
  fire: {
    name: 'Fireball',
    cost: 20,
    desc: 'Explodes on contact and knocks down everything nearby.',
    req: 0,
    price: 0
  },
  bolt: {
    name: 'Manabolt',
    cost: 10,
    desc: 'A fast bolt of raw mana. Cheap and hard-hitting, one target.',
    req: 3,
    price: 140
  },
  heal: {
    name: 'Heal',
    cost: 24,
    desc: 'Restores HP to you and anyone standing close. Scales with Magic.',
    req: 4,
    price: 200
  },
  barrier: {
    name: 'Barrier',
    cost: 18,
    desc: 'A mana shield that soaks damage for six seconds. Stronger with Magic.',
    req: 2,
    price: 160
  },
  chain: {
    name: 'Chain Lightning',
    cost: 22,
    desc: 'Arcs through up to three enemies in front of you.',
    req: 4,
    price: 240
  },
  // rare spells: only taught at Sprawl talisman shops
  frost: {
    name: 'Frost Nova',
    cost: 26,
    desc: 'A ring of ice around you: damages everything close and slows every enemy for three seconds.',
    req: 5,
    price: 380,
    rare: true
  },
  drain: {
    name: 'Soul Drain',
    cost: 16,
    desc: 'A dark bolt that heals you for half the damage it deals.',
    req: 4,
    price: 320,
    rare: true
  }
};
const ARCH = {
  runner: {
    name: 'Street Runner',
    short: 'Runner',
    desc: 'Balanced at everything.',
    spName: 'Adrenaline',
    spDesc: 'Heal 30% and hit 50% harder and move faster for five seconds.',
    attr: { bod: 2, str: 2, agi: 2, mag: 2 }
  },
  samurai: {
    name: 'Street Samurai',
    short: 'Samurai',
    desc: 'Chrome and steel. Starts with a katana and a cyberarm.',
    spName: 'Blade Dance',
    spDesc: 'Dash through everything in front of you, cutting each enemy once.',
    attr: { bod: 3, str: 4, agi: 2, mag: 1 },
    cy: { arm: 1 },
    weapon: 'katana'
  },
  mage: {
    name: 'Combat Mage',
    short: 'Mage',
    desc: 'Fragile but devastating. Knows Fireball and Manabolt.',
    spName: 'Mana Storm',
    spDesc: 'Lightning strikes up to six enemies on screen.',
    attr: { bod: 2, str: 1, agi: 2, mag: 5 },
    spells: ['fire', 'bolt']
  },
  shaman: {
    name: 'Shaman',
    short: 'Shaman',
    desc: 'Talks to spirits. Knows Fireball and Heal.',
    spName: 'Spirit Call',
    spDesc: 'Two bound fire spirits fight beside you for 15 seconds.',
    attr: { bod: 3, str: 1, agi: 2, mag: 4, hak: 1 },
    spells: ['fire', 'heal'],
    locked: 'lore10'
  },
  rigger: {
    name: 'Rigger',
    short: 'Rigger',
    desc: 'Drones are family. Machine pistol and Hacking 3.',
    spName: 'Drone Swarm',
    spDesc: 'Three combat drones join the fight for 12 seconds.',
    attr: { bod: 2, str: 2, agi: 3, mag: 1, hak: 3 },
    gun: 'smg',
    ammo: 40,
    locked: 'cour3'
  },
  decker: {
    name: 'Decker',
    short: 'Decker',
    desc: 'A hacker who fights dirty. Hacking 5, a smartgun and Port Scanner.',
    spName: 'Overload',
    spDesc:
      'Fries every enemy on screen: machines, ICE and armored troops take heavy damage, and everyone is stunned for four seconds.',
    attr: { bod: 2, str: 1, agi: 3, mag: 1, hak: 5 },
    gun: 'smart',
    ammo: 36,
    locked: 'h10'
  },
  gunslinger: {
    name: 'Gunslinger',
    short: 'Gunslinger',
    desc: 'Fast hands. Heavy pistol and double ammo.',
    spName: 'Bullet Time',
    spDesc: 'Enemies slow to half speed for four seconds, and your shots cost no ammo.',
    attr: { bod: 2, str: 2, agi: 5, mag: 1 },
    gun: 'heavy',
    ammo: 48
  },
  medic: {
    name: 'Street Doc',
    short: 'Street Doc',
    desc: 'Patches people up between punches. Every melee hit heals you, and a partner close by. Knows Heal.',
    spName: 'Triage',
    spDesc:
      'Heals the whole team by half, gives everyone two seconds of invulnerability, and brings a downed partner straight back.',
    attr: { bod: 3, str: 2, agi: 2, mag: 3 },
    spells: ['heal', 'fire'],
    locked: 'coopwin'
  },
  adept: {
    name: 'Physical Adept',
    short: 'Adept',
    desc: 'Magic turned inward. Never uses guns: fists hit 30% harder, and every uppercut throws a chi blast.',
    spName: 'Killing Hands',
    spDesc: 'For six seconds every melee hit is a crit that knocks down.',
    attr: { bod: 2, str: 3, agi: 4, mag: 3 },
    noGun: true,
    locked: 'knuckles'
  }
};
function applyArch(p, key) {
  const A0 = ARCH[key] || ARCH.runner;
  p.arch = ARCH[key] ? key : 'runner';
  p.attr = Object.assign({ hak: 1 }, A0.attr);
  p.cy = Object.assign({ arm: 0, wired: 0, plate: 0 }, A0.cy || {});
  if (A0.weapon) p.eq.weapon = mkItem('weapon', A0.weapon, 0);
  if (A0.gun) p.eq.gun = mkItem('gun', A0.gun, 0);
  if (A0.noGun) p.eq.gun = null;
  if (A0.spells) p.spells = A0.spells.slice();
  if (A0.ammo) p.ammo = A0.ammo;
  p.sk = null;
  p.spts = undefined;
  initSkills(p);
  p.coat = pendCoat(p.idx);
  p.trail = trailOpen(pendTrail(p.idx)) ? pendTrail(p.idx) : 'none';
  if (!coatOpen(p.coat)) p.coat = 'sig';
  applyCoat(p);
  refresh(p);
  p.hp = p.maxHp;
  p.mp = p.maxMp;
}

// Make an item: base from BASES, `rar` parts (0–4) favouring its maker's speciality. `mod` true asks for an
// elemental or affix part among them; a string asks for that affix. `mfr` picks the maker (random otherwise).
function mkItem(slot, base, rar, mod, mfr) {
  const b = BASES[slot][base] ? BASES[slot][base] : Object.values(BASES[slot])[0];
  if (!BASES[slot][base]) base = Object.keys(BASES[slot])[0];
  const it = {
    uid: Math.random().toString(36).slice(2, 9),
    slot,
    base,
    rar: 0,
    mfr: MFR[mfr] && MFR[mfr].slots.includes(slot) ? mfr : pick(makersFor(slot)),
    parts: [],
    bonus: Object.assign({}, b.bonus || {})
  };
  if (b.reach) it.reach = b.reach;
  if (b.fire) it.fire = b.fire;
  if (b.look) it.look = b.look;
  const want = typeof mod === 'string' ? Object.keys(PARTS).find(k => PARTS[k].mod === mod) : null;
  if (want) it.parts.push(want);
  else if (mod === true && rar > 0) {
    const ms = Object.keys(PARTS).filter(k => PARTS[k].mod && PARTS[k].slots.includes(slot));
    it.parts.push(pick(ms));
  }
  while (it.parts.length < Math.min(4, rar)) addPart(it);
  applyParts(it);
  return it;
}
// one more part, picked from the maker's favourites most of the time; at most one affix part per item
function addPart(it) {
  const M = MFR[it.mfr],
    ok = k =>
      PARTS[k] &&
      PARTS[k].slots.includes(it.slot) &&
      (!PARTS[k].mod || !it.parts.some(q => PARTS[q].mod)) &&
      (k === 'attr' || k === 'heavy' || !it.parts.includes(k));
  const fav = M.likes.filter(ok),
    any = Object.keys(PARTS).filter(ok),
    pool = fav.length && Math.random() < 0.75 ? fav : any;
  if (pool.length) it.parts.push(pick(pool));
}
// work out an item's numbers, name and price from its base, maker and parts
function applyParts(it) {
  const b = BASES[it.slot][it.base],
    M = MFR[it.mfr] || MFR.ironside;
  it.rar = it.leg ? 4 : Math.min(4, it.parts.length);
  const r = RAR[it.rar],
    n = k => it.parts.filter(q => q === k).length;
  it.bonus = Object.assign({}, b.bonus || {});
  if (b.dmg) it.dmg = Math.round(b.dmg * r.m * (1 + 0.2 * n('heavy')));
  if (b.arm) it.arm = Math.round(b.arm * r.m * (1 + 0.3 * n('plated')));
  // every tier adds a point to the maker's attribute (as tiers always added a point); Augmented parts add two more
  const ap = it.rar + 2 * n('attr');
  if (ap) it.bonus[M.attr] = (it.bonus[M.attr] || 0) + ap;
  if (n('warded')) it.bonus.mag = (it.bonus.mag || 0) + 2;
  it.crit = 0.08 * n('keen') + 0.06 * n('sight');
  it.critMul = n('sight') ? 1.25 : 1;
  it.speed = it.slot !== 'armor' && n('swift') ? 0.8 : 1;
  it.daze = !!(n('concuss') || (it.slot === 'weapon' && it.mfr === 'voltaic'));
  it.kb = n('brutal') ? 1.6 : it.mfr === 'rustline' && it.slot === 'weapon' ? 1.2 : 1;
  const mp = it.parts.find(q => PARTS[q].mod);
  it.mod = mp ? PARTS[mp].mod : it.legMod || null;
  if (!it.mod) delete it.mod;
  if (!it.leg) {
    const lead = it.parts.find(q => q !== 'attr') || it.parts[0];
    it.name = M.name + ' ' + (lead ? PARTS[lead].n + ' ' : '') + b.name;
  }
  it.price = Math.round(it.leg ? b.price * 4 : b.price * (1 + it.rar * 0.6)); // named legendaries: one price, always
}
// older saves: items from before makers and parts get a maker (fixed by their id) and parts to match their tier
function fixItem(it) {
  if (!it || !BASES[it.slot] || !BASES[it.slot][it.base]) return it;
  if (it.mfr && MFR[it.mfr] && Array.isArray(it.parts)) {
    // up to date, but drop any part this version doesn't know (a save from a newer or edited build)
    if (it.parts.some(k => !PARTS[k])) {
      it.parts = it.parts.filter(k => PARTS[k]);
      applyParts(it);
    }
    return it;
  }
  if (!MFR[it.mfr]) delete it.mfr;
  const ks = makersFor(it.slot);
  let h = 0;
  for (const c of String(it.uid)) h = (h * 31 + c.charCodeAt(0)) | 0;
  it.mfr = ks[Math.abs(h) % ks.length];
  const keepName = it.leg ? it.name : null,
    oldMod = it.mod;
  it.parts = [];
  // an old Street item with an affix keeps the affix as it was rather than gaining a tier for it
  if (oldMod && !it.leg && !(it.rar > 0)) it.legMod = oldMod;
  else if (oldMod && !it.leg) {
    const k =
      oldMod === 'keen'
        ? 'keen'
        : Object.keys(PARTS).find(q => PARTS[q].mod === oldMod && PARTS[q].slots.includes(it.slot));
    if (k) it.parts.push(k);
  }
  if (it.leg && oldMod) it.legMod = oldMod;
  const want = it.leg ? 2 : Math.min(3, it.rar || 0);
  while (it.parts.length < want) addPart(it);
  applyParts(it);
  if (keepName) it.name = keepName;
  return it;
}
/* Salvage and crafting at Ratchet's: scrap gear into parts, then spend parts to reroll an affix or raise rarity. */
const salvageParts = it => (it.leg ? 0 : 1 + it.rar * 2);
const REROLL = { parts: 3, creds: 40 };
const upgradeCost = it => ({ parts: 4 * (it.rar + 1), creds: 80 * (it.rar + 1) });
const canUpgrade = it => !!it && !it.leg && it.rar < 3; // Ratchet adds parts up to Black-market; Legendary only drops
const canReroll = it => !!it && !it.leg && Array.isArray(it.parts) && it.parts.length > 0; // rerolling never adds a tier
function renameItem(it) {
  fixItem(it);
  applyParts(it);
}
// Ratchet's reroll: the same number of parts, rolled again
function rerollItem(it) {
  if (!canReroll(it)) return false;
  fixItem(it);
  const n = it.parts.length;
  it.parts = [];
  while (it.parts.length < n) addPart(it);
  applyParts(it);
  return true;
}
// Ratchet's upgrade: one more part, so one tier up
function upgradeItem(it) {
  if (!canUpgrade(it)) return false;
  fixItem(it);
  addPart(it);
  applyParts(it);
  return true;
}
function randItem(stage, boost) {
  const slot = pick(['weapon', 'gun', 'armor', 'weapon', 'gun']);
  const bases = Object.keys(BASES[slot]);
  const top = clamp(Math.floor(stage) + 1 + (boost ? 1 : 0), 0, bases.length - 1);
  const base = bases[ri(Math.max(0, top - 2), top)];
  // how many parts it rolls is its rarity; deeper districts and elites and bosses (boost) roll more
  const roll = Math.random() + stage * 0.1 + (boost ? 0.4 : 0);
  const rar = roll > 1.6 ? 4 : roll > 1.25 ? 3 : roll > 0.95 ? 2 : roll > 0.6 ? 1 : 0;
  return mkItem(slot, base, rar);
}
