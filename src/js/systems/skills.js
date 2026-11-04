/* Cyber City Tactics · src/js/systems/skills.js
 * The five skill trees (Brawler, Gunslinger, Mage, Decker, Shaman), unlock rules and helpers like has(p, id).
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ---------- skill trees ---------- */
const TREES = {
  brawler: { name: 'Brawler', col: '#ff3d8b', blurb: 'Fists, blades and bad decisions.' },
  gunner: { name: 'Gunslinger', col: '#ffc63d', blurb: 'More lead, better aim.' },
  mage: { name: 'Mage', col: '#b98cff', blurb: 'Mana, fire and lightning.' },
  decker: { name: 'Decker', col: '#45d2ff', blurb: 'Locks, ICE, cops and cash.' },
  shaman: {
    name: 'Shaman',
    col: '#7dffb0',
    blurb: 'Spirits, totems and curses: magic without the fireworks.'
  }
};
const SKILLS = {
  iron: { t: 'brawler', row: 0, name: 'Iron Fists', desc: '+20% melee damage.' },
  breaker: {
    t: 'brawler',
    row: 1,
    name: 'Guard Breaker',
    desc: 'Punches and uppercuts break riot shields, like kicks do.'
  },
  brute: {
    t: 'brawler',
    row: 1,
    name: 'Brute',
    desc: 'Everything you do to a grabbed foe deals 50% more damage: punches, knees, throws, slams and pile drivers.'
  },
  leech: {
    t: 'brawler',
    row: 2,
    name: 'Bloodlust',
    desc: 'Melee hits heal you for 2 HP, or 4 HP on a crit.'
  },
  whirl: { t: 'brawler', row: 2, name: 'Whirlwind', desc: 'Heavy blows hit enemies behind you too.' },
  berserk: {
    t: 'brawler',
    row: 3,
    name: 'Berserker',
    desc: 'Below 40% HP you deal 40% more damage and take 20% less.'
  },
  steady: { t: 'gunner', row: 0, name: 'Steady Hands', desc: '+20% gun damage.' },
  scav: {
    t: 'gunner',
    row: 1,
    name: 'Scavenger',
    desc: 'Enemies you kill have a 35% chance to drop 4 rounds straight into your gun.'
  },
  quick: { t: 'gunner', row: 1, name: 'Quickdraw', desc: 'Guns fire 30% faster.' },
  pierce: {
    t: 'gunner',
    row: 2,
    name: 'Armor Piercing',
    desc: 'Bullets pass through the first target and ignore armored elites.'
  },
  rico: {
    t: 'gunner',
    row: 2,
    name: 'Ricochet',
    desc: 'Critical bullets bounce to a second enemy for half damage.'
  },
  deadeye: {
    t: 'gunner',
    row: 3,
    name: 'Deadeye',
    desc: '+15% crit chance with guns, and gun crits deal 2.5× instead of 1.8×.'
  },
  focus: { t: 'mage', row: 0, name: 'Focus', desc: '+20% spell damage, healing and barrier strength.' },
  flow: { t: 'mage', row: 1, name: 'Mana Flow', desc: 'Mana regenerates 40% faster.' },
  thrift: { t: 'mage', row: 1, name: 'Thrift', desc: 'Spells cost 25% less mana.' },
  over: { t: 'mage', row: 2, name: 'Overcharge', desc: 'Fireball blasts are 60% wider.' },
  siphon: { t: 'mage', row: 2, name: 'Siphon', desc: 'Every kill restores 4 mana.' },
  archon: { t: 'mage', row: 3, name: 'Archon', desc: 'Every fourth spell is free and hits twice as hard.' },
  probe: { t: 'decker', row: 0, name: 'Port Scanner', desc: 'Hacking windows are 25% wider.' },
  spare: { t: 'decker', row: 1, name: 'Spare Cycles', desc: 'One extra miss allowed on every hack.' },
  icecraft: {
    t: 'decker',
    row: 1,
    name: 'Icecraft',
    desc: '30% chance an icebreaker is not used up. Caches drop more of them.'
  },
  jam: {
    t: 'decker',
    row: 2,
    name: 'Jammer',
    desc: 'Drones and ICE take double damage from you. Cops show up 30% less often.'
  },
  fence: {
    t: 'decker',
    row: 2,
    name: 'Fence Contacts',
    desc: 'Sell gear for 15% more and buy for 10% less.'
  },
  ghost: {
    t: 'decker',
    row: 3,
    name: 'Ghost Protocol',
    desc: 'Failed hacks never trip alarms, and break-ins add one less heat star.'
  },
  kin: {
    t: 'shaman',
    row: 0,
    name: 'Spirit Kin',
    desc: 'Companions and summons (yours and the party’s) deal 25% more damage and take 20% less.'
  },
  hex: {
    t: 'shaman',
    row: 1,
    name: 'Hex',
    desc: 'Your melee hits curse a foe for 4 seconds. Cursed foes take 15% more damage from everyone.'
  },
  ward: {
    t: 'shaman',
    row: 1,
    name: 'Ward Totem',
    desc: 'Using a medkit also plants a small totem that heals anyone beside it for 8 seconds.'
  },
  wild: {
    t: 'shaman',
    row: 2,
    name: 'Wild Call',
    desc: 'Your kills have a 15% chance to call a fire spirit to your side for 10 seconds.'
  },
  wither: {
    t: 'shaman',
    row: 2,
    name: 'Withering',
    desc: 'Your curses also make foes deal 25% less damage while they last.'
  },
  swalk: {
    t: 'shaman',
    row: 3,
    name: 'Spirit Walk',
    desc: 'While a companion or summon fights beside you, take 20% less damage and regain mana 50% faster.'
  }
};
// Active skills: three points in a tree unlock its active skill, which can take the ★ special's place
// (pick it on the Skills tab). It spends the same full meter.
const ACTIVE_NEED = 3;
const ACTIVES = {
  brawler: {
    name: 'Ground Slam',
    desc: 'Leap and slam the street: a shockwave both ways knocks down everyone close and hurts them.'
  },
  gunner: {
    name: 'Fan the Hammer',
    desc: 'Six rounds fanned out in front, fast, without using ammo. Each hits like your gun.'
  },
  mage: { name: 'Summon Spirit', desc: 'A fire spirit fights at your side for 15 seconds.' },
  shaman: {
    name: 'Totem',
    desc: 'Plant a spirit totem for 12 seconds: every second it heals runners beside it and curses foes near it.'
  },
  decker: {
    name: 'Short Circuit',
    desc: 'Every drone, ICE, mech, cop and guard on screen shorts out: stunned for 3 seconds and shocked. A better cyberdeck hits harder.'
  }
};
const activeOpen = (p, t) => !!ACTIVES[t] && treePts(p, t) >= ACTIVE_NEED;
// what the ★ button will do right now: an unlocked active skill the runner picked, else the archetype's special
const spKey = p => (p && p.spSel && p.spSel !== 'arch' && activeOpen(p, p.spSel) ? p.spSel : 'arch');
const spName = p => (spKey(p) === 'arch' ? (ARCH[p.arch] || ARCH.runner).spName : ACTIVES[spKey(p)].name);
const ROW_NEED = [0, 1, 2, 4],
  ROW_LVL = [1, 1, 4, 8];
const ARCH_SKILL = {
  runner: null,
  samurai: 'iron',
  mage: 'focus',
  gunslinger: 'steady',
  decker: 'probe',
  adept: 'breaker',
  shaman: 'focus',
  rigger: 'steady'
};
const has = (p, id) => !!(p && p.sk && p.sk[id]);
const anyHas = id => active().some(p => has(p, id));
const treePts = (p, t) => Object.keys(p.sk || {}).filter(k => SKILLS[k] && SKILLS[k].t === t).length;
function canLearn(p, id) {
  const S = SKILLS[id];
  return !has(p, id) && p.spts > 0 && treePts(p, S.t) >= ROW_NEED[S.row] && p.lvl >= ROW_LVL[S.row];
}
function initSkills(p) {
  if (p.sk && p.spts !== undefined) return;
  p.sk = {};
  const a = ARCH_SKILL[p.arch];
  if (a) p.sk[a] = 1;
  p.spts = Math.max(0, (p.lvl || 1) - 1) + (a ? 0 : 1);
}
// Doc's neural reset: refunds every skill except the archetype's starting one
const respecRefund = p => Object.keys(p.sk || {}).filter(k => SKILLS[k] && k !== ARCH_SKILL[p.arch]).length;
const respecCost = p => Math.round(60 * (p.lvl || 1) * buyMul());
function respec(p) {
  const n = respecRefund(p),
    a = ARCH_SKILL[p.arch];
  p.sk = {};
  if (a) p.sk[a] = 1;
  p.spts = (p.spts || 0) + n;
  refresh(p);
  return n;
}
const spellCost = (p, sp) =>
  Math.max(
    1,
    Math.round(
      sp.cost *
        (has(p, 'thrift') ? 0.75 : 1) *
        (evOn('spiritstorm') ? 0.5 : 1) *
        (setOn(p, 'hexwright', 3) ? 0.8 : 1)
    )
  );
