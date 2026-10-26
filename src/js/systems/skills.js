/* Cyber City Tactics · src/js/systems/skills.js
 * The four skill trees (Brawler, Gunslinger, Mage, Decker), unlock rules and helpers like has(p, id).
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ---------- skill trees ---------- */
const TREES = {
  brawler: { name: 'Brawler', col: '#ff3d8b', blurb: 'Fists, blades and bad decisions.' },
  gunner: { name: 'Gunslinger', col: '#ffc63d', blurb: 'More lead, better aim.' },
  mage: { name: 'Mage', col: '#b98cff', blurb: 'Mana, fire and lightning.' },
  decker: { name: 'Decker', col: '#45d2ff', blurb: 'Locks, ICE, cops and cash.' }
};
const SKILLS = {
  iron: { t: 'brawler', row: 0, name: 'Iron Fists', desc: '+20% melee damage.' },
  breaker: {
    t: 'brawler',
    row: 1,
    name: 'Guard Breaker',
    desc: 'Punches and uppercuts break riot shields, like kicks do.'
  },
  brute: { t: 'brawler', row: 1, name: 'Brute', desc: 'Knees and throws deal 50% more damage.' },
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
  }
};
const ROW_NEED = [0, 1, 2, 4],
  ROW_LVL = [1, 1, 4, 8];
const ARCH_SKILL = {
  runner: null,
  samurai: 'iron',
  mage: 'focus',
  gunslinger: 'steady',
  decker: 'probe',
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
const spellCost = (p, sp) => Math.max(1, Math.round(sp.cost * (has(p, 'thrift') ? 0.75 : 1)));
