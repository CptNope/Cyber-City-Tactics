/* Cyber City Tactics · src/js/data/world.js
 * Cyberware, fixer contracts, Den NPCs, companions for hire, difficulty levels, elite types and New Game+
 * scaling.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
const CYBER = {
  arm: { name: 'Cyberarm tune-up', desc: '+3 melee damage.', cost: l => 90 + l * 60 },
  wired: { name: 'Wired reflexes', desc: 'Faster movement, +4% crit chance.', cost: l => 110 + l * 70 },
  plate: { name: 'Dermal plating', desc: '+3 armor.', cost: l => 100 + l * 60 },
  // rare pieces: one level each, only at Sprawl clinics
  eyes: {
    name: 'Thermographic eyes',
    desc: '+8% crit chance, and cloaked Kagemori shadows show up clearly.',
    cost: () => 600,
    max: 1,
    rare: true
  },
  boost: {
    name: 'Reflex booster',
    desc: 'Your parry window is nearly twice as wide.',
    cost: () => 750,
    max: 1,
    rare: true
  }
};
const cyMax = k => CYBER[k].max || 3;
const CONTRACTS = [
  {
    title: 'Clear the Barrens',
    goal: 'Take down 8 gangers',
    key: 'ganger',
    need: 8,
    creds: 90,
    karma: 50,
    say: "New in town and already broke? Good. Hungry runners don't ask questions. The Gutter King's crew has been squeezing my noodle stand on Rustline. Break his gangers, then break him."
  },
  {
    title: 'Data run',
    goal: 'Recover 3 data chips from corp security',
    key: 'chip',
    need: 3,
    creds: 140,
    karma: 70,
    say: "You made noise in the Barrens. Now I need finesse. Kagemori security in the Neon Market is carrying data chips on some project. Bring me three. And watch for Razor Mei. She's been killing my couriers."
  },
  {
    title: 'Exorcism',
    goal: 'Banish 4 fire spirits',
    key: 'spirit',
    need: 4,
    creds: 160,
    karma: 90,
    say: 'The chips point under the city. Kagemori has been dumping failed experiments into the old transit tunnels, and something down there is eating them. Spirits are loose too. Banish four of them. The thing that runs that pit calls itself the Hollow Saint.'
  },
  {
    title: 'Night market',
    goal: 'Take down 6 thralls',
    key: 'thrall',
    need: 6,
    creds: 180,
    karma: 110,
    say: 'The Saint was only a mouth. Below the tunnels the ghouls run a night market, and the woman who owns it, Mother Vesper, buys everything Kagemori throws away. She keeps the books on who sells to her. Break her thralls, then get me those books.'
  },
  {
    title: 'Ghost',
    goal: 'Reach Director Voss without losing a life',
    key: 'ghost',
    need: 1,
    creds: 100,
    karma: 140,
    prize: true,
    say: "Vesper's books all lead to one buyer: Kagemori. Director Voss runs their magic program from the top floor, and she knows your face now. Go up and get paid. Do it clean, no close calls, and I'll throw in something special."
  },
  {
    title: 'Trace',
    goal: 'Crash 5 data nodes in the host',
    key: 'node',
    need: 5,
    creds: 0,
    karma: 180,
    say: "Bad news. That body upstairs was a shell. Voss uploaded herself into Kagemori's host before you got there. Pixel can jack you in. Crash her data nodes so she can't run, then find what's guarding her. They call it Black ICE."
  }
];
// Den NPCs. Story lines are indexed by the district just cleared.
const NPCS = [
  {
    id: 'juno',
    name: 'Juno',
    role: 'fixer',
    x: 170,
    face: 1,
    style: 'bob',
    front: { t: "JUNO'S NOODLES", c: '#ff3d8b', w: 120 },
    pal: {
      skin: '#e8c09e',
      coat: '#2a1f33',
      coat2: '#1f1726',
      pants: '#1a1520',
      hair: '#121018',
      acc: '#ff3d8b',
      boot: '#0e0b12'
    }
  },
  {
    id: 'sal',
    name: 'Sal',
    role: 'bartender',
    x: 300,
    face: 1,
    style: 'apron',
    front: { t: 'THE DEN', c: '#ffc63d', w: 96 },
    pal: {
      skin: '#9c6a52',
      coat: '#d8d2c4',
      coat2: '#3a2f2a',
      pants: '#2a2420',
      hair: '#2a2420',
      acc: '#ffc63d',
      boot: '#141010'
    },
    lines: [
      "Gutter King's crew scattered the minute word got out. First round's on the house. Second round, you're paying.",
      "Razor Mei's gone? Half this bar owes you a drink and the other half owed her money. Watch your back either way.",
      "You smell like the tunnels, and that's not a compliment. Whatever is at the top of that arcology is what fed those ghouls.",
      "So Voss isn't really dead? Figures. The corps never let anything die, not even their bosses."
    ]
  },
  {
    id: 'doc',
    name: 'Doc Kessler',
    role: 'street doc',
    x: 440,
    face: -1,
    style: 'doc',
    front: { t: 'CLINIC', c: '#45d2ff', w: 90 },
    pal: {
      skin: '#e4c3a8',
      coat: '#e6e9ee',
      coat2: '#c3c8d2',
      pants: '#2a2c36',
      hair: '#9aa0ab',
      acc: '#45d2ff',
      boot: '#14161c'
    }
  },
  {
    id: 'wen',
    name: 'Old Wen',
    role: 'talismonger',
    x: 580,
    face: 1,
    style: 'beard',
    front: { t: 'TALISMANS', c: '#b98cff', w: 104 },
    pal: {
      skin: '#c99c7a',
      coat: '#3b2a55',
      coat2: '#2c1f40',
      pants: '#2a1f36',
      hair: '#ece4c6',
      acc: '#b98cff',
      boot: '#150f1c'
    }
  },
  {
    id: 'ratchet',
    name: 'Ratchet',
    role: 'fence',
    x: 720,
    face: -1,
    style: 'cap',
    front: { t: 'PAWN', c: '#ff6a3d', w: 80 },
    pal: {
      skin: '#c88f6e',
      coat: '#4a3a24',
      coat2: '#38291a',
      pants: '#232a33',
      hair: '#ff6a3d',
      acc: '#ff6a3d',
      boot: '#141010'
    }
  },
  {
    id: 'kit',
    name: 'Kit',
    role: 'companion broker',
    x: 510,
    face: 1,
    style: 'bob',
    pal: {
      skin: '#c99272',
      coat: '#3b4a24',
      coat2: '#2d3a1b',
      pants: '#2a2a24',
      hair: '#ffc63d',
      acc: '#7dffb0',
      boot: '#121210'
    }
  },
  {
    id: 'pixel',
    name: 'Pixel',
    role: 'street kid',
    x: 830,
    face: -1,
    style: 'cap',
    scale: 0.8,
    pal: {
      skin: '#e3b896',
      coat: '#2b6a5a',
      coat2: '#1e4f42',
      pants: '#2a2a3a',
      hair: '#7dffb0',
      acc: '#7dffb0',
      boot: '#121216'
    },
    lines: [
      "Saw Kagemori trucks in the Market last night. No plates. Corp guys only go dark when it's bad.",
      'Those chips you brought back? They map the old transit tunnels. Nobody comes back from there. Well, almost nobody.',
      "I hacked a cam feed. The Director's office glows at night. Not the lights. Her.",
      "I can jack you into the host from right here. Don't die in there. Seriously, your brain won't like it."
    ]
  }
];
const SHOPS = { doc: 'doc', wen: 'talis', ratchet: 'fence' };
const ALLIES = {
  // a crew member who shows up when you're friendly with their crew; not for hire
  crew: {
    name: 'Crew backup',
    hidden: true,
    hp: 90,
    armor: 4,
    d: { scale: 1, style: 'mohawk' },
    pal: {
      skin: '#c98a6b',
      coat: '#2a2236',
      coat2: '#1e182a',
      pants: '#22324a',
      hair: '#7dffb0',
      acc: '#7dffb0',
      boot: '#141018'
    }
  },
  drone: {
    name: 'Rigger drone',
    desc: 'Hovers at your shoulder and snipes anything that lines up with it.',
    cost: 140,
    hp: 60,
    armor: 3,
    d: { fly: true, scale: 1 }
  },
  brick: {
    name: 'Brick, troll merc',
    desc: 'Walks into the fight, hits like a truck and pulls enemies off you.',
    cost: 180,
    hp: 170,
    armor: 8,
    d: { scale: 1.35, style: 'horns' },
    pal: {
      skin: '#7e9aa6',
      coat: '#2f4a3a',
      coat2: '#243a2d',
      pants: '#232a26',
      hair: '#e6e1d4',
      acc: '#7dffb0',
      boot: '#121614'
    }
  },
  ember: {
    name: 'Bound fire spirit',
    desc: 'Burns everything it touches. Bullets pass straight through it.',
    cost: 200,
    hp: 90,
    armor: 4,
    d: { fly: true, spirit: true, noBullet: true, scale: 1 }
  }
};
const DIFF = [
  {
    name: 'Street',
    desc: 'Softer hits, fewer elites. For learning the streets.',
    hp: 0.75,
    dmg: 0.7,
    cool: 1.25,
    elite: 0.03,
    karma: 0.9
  },
  {
    name: 'Runner',
    desc: 'The intended run. Elites show up from the start.',
    hp: 1,
    dmg: 1,
    cool: 1,
    elite: 0.08,
    karma: 1
  },
  {
    name: 'Prime',
    desc: 'Faster, tougher, meaner. Elites everywhere, and they hit hard.',
    hp: 1.35,
    dmg: 1.35,
    cool: 0.8,
    elite: 0.16,
    karma: 1.3
  }
];
const ELITES = {
  armored: { name: 'Armored', col: '#9fb4d8', hint: '+70% HP, shrugs off bullets' },
  berserk: { name: 'Berserk', col: '#ff4a4a', hint: 'faster and hits harder' },
  warded: { name: 'Warded', col: '#45d2ff', hint: "can't be knocked down, resists magic" },
  vampiric: { name: 'Vampiric', col: '#b98cff', hint: 'heals when it hits you' }
};
const ngMul = () => ({
  hp: 1 + G.ng * 0.45,
  dmg: 1 + G.ng * 0.3,
  cool: Math.max(0.6, 1 - G.ng * 0.1),
  elite: G.ng * 0.05
});
