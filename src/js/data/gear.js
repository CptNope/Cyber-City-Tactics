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
const RAR = [
  { n: 'Street', m: 1 },
  { n: 'Tuned', m: 1.25 },
  { n: 'Prototype', m: 1.55 },
  { n: 'Black-market', m: 1.9 }
];
const RCOL = ['#efe9ff', '#45d2ff', '#ffc63d', '#ff8a3d'];
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

function mkItem(slot, base, rar, mod) {
  const b = BASES[slot][base] || Object.values(BASES[slot])[0],
    r = RAR[rar];
  if (mod === true) {
    const ms = Object.keys(AFFIX).filter(k => AFFIX[k].slots.includes(slot));
    mod = pick(ms);
  }
  const it = {
    uid: Math.random().toString(36).slice(2, 9),
    slot,
    base,
    rar,
    name: (rar ? r.n + ' ' : '') + (mod ? AFFIX[mod].n + ' ' : '') + b.name,
    bonus: Object.assign({}, b.bonus || {})
  };
  if (mod) it.mod = mod;
  if (b.dmg) it.dmg = Math.round(b.dmg * r.m);
  if (b.arm) it.arm = Math.round(b.arm * r.m);
  if (b.reach) it.reach = b.reach;
  if (b.fire) it.fire = b.fire;
  if (b.look) it.look = b.look;
  const ks = Object.keys(ATTRS);
  for (let i = 0; i < rar; i++) {
    const k = pick(ks);
    it.bonus[k] = (it.bonus[k] || 0) + 1;
  }
  it.price = Math.round(b.price * (1 + rar * 0.7) * (mod ? 1.3 : 1));
  return it;
}
/* Salvage and crafting at Ratchet's: scrap gear into parts, then spend parts to reroll an affix or raise rarity. */
const salvageParts = it => (it.leg ? 0 : 1 + it.rar * 2 + (it.mod ? 1 : 0));
const REROLL = { parts: 3, creds: 40 };
const upgradeCost = it => ({ parts: 4 * (it.rar + 1), creds: 80 * (it.rar + 1) });
const canUpgrade = it => !!it && !it.leg && it.rar < 2;
const canReroll = it => !!it && !it.leg;
function renameItem(it) {
  const b = BASES[it.slot][it.base];
  it.name = (it.rar ? RAR[it.rar].n + ' ' : '') + (it.mod ? AFFIX[it.mod].n + ' ' : '') + b.name;
  it.price = Math.round(b.price * (1 + it.rar * 0.7) * (it.mod ? 1.3 : 1));
}
function rerollItem(it) {
  if (!canReroll(it)) return false;
  const ms = Object.keys(AFFIX).filter(k => AFFIX[k].slots.includes(it.slot) && k !== it.mod);
  it.mod = pick(ms);
  renameItem(it);
  return true;
}
function upgradeItem(it) {
  if (!canUpgrade(it)) return false;
  const b = BASES[it.slot][it.base];
  it.rar++;
  if (b.dmg) it.dmg = Math.round(b.dmg * RAR[it.rar].m);
  if (b.arm) it.arm = Math.round(b.arm * RAR[it.rar].m);
  const k = pick(Object.keys(ATTRS));
  it.bonus[k] = (it.bonus[k] || 0) + 1;
  renameItem(it);
  return true;
}
function randItem(stage, boost) {
  const slot = pick(['weapon', 'gun', 'armor', 'weapon', 'gun']);
  const bases = Object.keys(BASES[slot]);
  const top = clamp(Math.floor(stage) + 1 + (boost ? 1 : 0), 0, bases.length - 1);
  const base = bases[ri(Math.max(0, top - 2), top)];
  const roll = Math.random() + stage * 0.12 + (boost ? 0.45 : 0);
  const rar = roll > 1.15 ? 2 : roll > 0.68 ? 1 : 0;
  return mkItem(slot, base, rar, Math.random() < [0, 0.4, 0.8][rar]);
}
