/* Cyber City Tactics · src/js/data/content.js
 * Runner palettes and coats, every enemy and boss definition (DEF), the five districts (STAGES), the Den and
 * the training alley.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ================= content ================= */
const PALS = [
  {
    skin: '#e0b08f',
    coat: '#1f4a52',
    coat2: '#163a40',
    pants: '#262033',
    hair: '#191420',
    acc: '#ff3d8b',
    boot: '#0e0b14',
    cyber: '#9fe9ff'
  },
  {
    skin: '#a8735a',
    coat: '#5a2f6e',
    coat2: '#432354',
    pants: '#2a2230',
    hair: '#ffd27a',
    acc: '#ffc63d',
    boot: '#120d16',
    cyber: '#ffe0a8'
  }
];
const NAMES = ['VEX', 'JINX'];
const COATS = {
  sig: { name: 'Signature' },
  chrome: { name: 'Chrome', feat: 'k100', coat: '#56626e', coat2: '#424c56', acc: '#9fe9ff' },
  neon: { name: 'Neon Fang', feat: 'c25', coat: '#3a1240', coat2: '#2a0e30', acc: '#ff3d8b' },
  ember: { name: 'Ember', feat: 'b_saint', coat: '#5a1e12', coat2: '#44160d', acc: '#ff6a3d' },
  ice: { name: 'Black ICE', feat: 'b_blackice', coat: '#0b1a26', coat2: '#07121a', acc: '#45d2ff' },
  wanted: { name: 'Most Wanted', feat: 'wanted', coat: '#1d2f5a', coat2: '#16244a', acc: '#ff3d4a' },
  gold: { name: 'Prime Gold', feat: 'win', coat: '#5a4a1a', coat2: '#46380f', acc: '#ffc63d' },
  lantern: { name: 'Lantern-bearer', feat: 'loreall', coat: '#2a1a3a', coat2: '#1e1229', acc: '#b98cff' }
};
const pendCoat = i =>
  ((typeof G !== 'undefined' && G.pendCoat) || (typeof LEG !== 'undefined' && LEG.pendCoat) || [])[i] ||
  'sig';
const coatOpen = k => !COATS[k].feat || (typeof LEG !== 'undefined' && !!LEG.feats[COATS[k].feat]);
function applyCoat(p) {
  const c = COATS[p.coat] || COATS.sig;
  p.pal = Object.assign({}, PALS[p.idx], c.coat ? { coat: c.coat, coat2: c.coat2, acc: c.acc } : {});
}
const DEF = {
  ganger: {
    name: 'Ganger',
    hp: 28,
    spd: 0.85,
    dmg: 6,
    reach: 22,
    cool: 72,
    scale: 1,
    creds: [6, 14],
    karma: 10,
    style: 'mohawk',
    pal: {
      skin: '#c98a6b',
      coat: '#3d2f52',
      coat2: '#2c2240',
      pants: '#22324a',
      hair: '#ff3d8b',
      acc: '#ffc63d',
      boot: '#141018'
    }
  },
  orc: {
    name: 'Orc bruiser',
    hp: 56,
    spd: 0.7,
    dmg: 10,
    reach: 24,
    cool: 86,
    scale: 1.15,
    creds: [12, 22],
    karma: 18,
    style: 'tusks',
    pal: {
      skin: '#7d9a5a',
      coat: '#5a3030',
      coat2: '#432222',
      pants: '#2b2b2b',
      hair: '#141414',
      acc: '#ece4c6',
      boot: '#141010'
    }
  },
  sec: {
    name: 'Corp security',
    hp: 34,
    spd: 0.8,
    dmg: 9,
    reach: 22,
    cool: 115,
    scale: 1,
    ranged: 'bullet',
    range: 135,
    creds: [14, 24],
    karma: 16,
    style: 'helmet',
    pal: {
      skin: '#d6a37f',
      coat: '#2b4a7a',
      coat2: '#1f3860',
      pants: '#1c2a44',
      hair: '#a9dcff',
      acc: '#a9dcff',
      boot: '#10141e'
    }
  },
  riot: {
    name: 'Riot trooper',
    hp: 58,
    spd: 0.6,
    dmg: 12,
    reach: 24,
    cool: 95,
    scale: 1.05,
    shield: true,
    creds: [16, 26],
    karma: 22,
    style: 'riot',
    pal: {
      skin: '#c99a78',
      coat: '#26344d',
      coat2: '#1b2638',
      pants: '#151d2b',
      hair: '#9fb4d8',
      acc: '#9fb4d8',
      boot: '#0d1119'
    }
  },
  shaman: {
    name: 'Street shaman',
    hp: 30,
    spd: 0.75,
    dmg: 11,
    reach: 20,
    cool: 150,
    scale: 1,
    ranged: 'hex',
    range: 150,
    creds: [16, 26],
    karma: 20,
    style: 'feathers',
    pal: {
      skin: '#b58b6e',
      coat: '#5b2f7a',
      coat2: '#46225f',
      pants: '#3a1f4f',
      hair: '#ece4c6',
      acc: '#45d2ff',
      boot: '#1a1020'
    }
  },
  ghoul: {
    name: 'Ghoul',
    hp: 22,
    spd: 1.25,
    dmg: 7,
    reach: 18,
    cool: 55,
    scale: 0.95,
    lunge: true,
    creds: [4, 10],
    karma: 12,
    style: 'ghoul',
    pal: {
      skin: '#b9b3a2',
      coat: '#4a4436',
      coat2: '#3a3528',
      pants: '#2e2a22',
      hair: '#b9b3a2',
      acc: '#ff4a4a',
      boot: '#1a1712'
    }
  },
  spirit: {
    name: 'Fire spirit',
    hp: 40,
    spd: 0.75,
    dmg: 8,
    reach: 0,
    cool: 70,
    scale: 1,
    fly: true,
    spirit: true,
    noBullet: true,
    creds: [0, 6],
    karma: 20
  },
  ninja: {
    name: 'Kagemori shadow',
    hp: 30,
    spd: 1.1,
    dmg: 12,
    reach: 24,
    cool: 80,
    scale: 1,
    stealth: true,
    creds: [16, 28],
    karma: 24,
    style: 'blade',
    pal: {
      skin: '#c9a184',
      coat: '#16141f',
      coat2: '#0e0c15',
      pants: '#121019',
      hair: '#1f1c2b',
      acc: '#ff3d4a',
      boot: '#08070c'
    }
  },
  mech: {
    name: 'Kagemori mech walker',
    hp: 150,
    spd: 0.38,
    dmg: 11,
    reach: 30,
    cool: 110,
    scale: 1.45,
    ranged: 'bullet',
    burst: 3,
    range: 160,
    heavy: true,
    mech: true,
    slowTurn: true,
    creds: [40, 64],
    karma: 60
  },
  feral: {
    name: 'Feral spirit',
    hp: 34,
    spd: 0.7,
    dmg: 10,
    reach: 0,
    cool: 130,
    scale: 1,
    fly: true,
    spirit: true,
    noBullet: true,
    mimic: true,
    range: 130,
    flames: ['#6b2bd9', '#8f4dff', '#b98cff', '#e0c8ff', '#ffffff'],
    creds: [4, 10],
    karma: 26
  },
  hound: {
    name: 'Hellhound',
    hp: 18,
    spd: 1.45,
    dmg: 6,
    reach: 18,
    cool: 50,
    scale: 1,
    lunge: true,
    pack: true,
    quad: true,
    creds: [2, 8],
    karma: 9
  },
  cop: {
    name: 'Patrol officer',
    hp: 38,
    spd: 0.85,
    dmg: 9,
    reach: 22,
    cool: 105,
    scale: 1,
    ranged: 'bullet',
    range: 130,
    creds: [5, 12],
    karma: 6,
    style: 'helmet',
    pal: {
      skin: '#d6a37f',
      coat: '#1d2f5a',
      coat2: '#16244a',
      pants: '#141c33',
      hair: '#ffffff',
      acc: '#ff3d4a',
      boot: '#0c1020'
    }
  },
  chest: { name: 'Loot cache', hp: 1, passive: true, scale: 1, creds: [0, 0], karma: 0 },
  hostage: { name: 'Hostage', hp: 20, passive: true, hostage: true, scale: 1, creds: [0, 0], karma: 0 },
  vend: { name: 'Vending machine', hp: 24, passive: true, scale: 1, creds: [8, 20], karma: 4 },
  node: { name: 'Data node', hp: 34, passive: true, scale: 1, creds: [0, 0], karma: 14 },
  glitch: {
    name: 'Glitch',
    hp: 30,
    spd: 1.2,
    dmg: 8,
    reach: 20,
    cool: 60,
    scale: 1,
    split: true,
    creds: [4, 10],
    karma: 12,
    style: 'glitch',
    pal: {
      skin: '#07141c',
      coat: '#0b2533',
      coat2: '#081c27',
      pants: '#06141c',
      hair: '#45d2ff',
      acc: '#45d2ff',
      boot: '#45d2ff'
    }
  },
  ice: {
    name: 'ICE sentry',
    hp: 30,
    spd: 0.9,
    dmg: 9,
    reach: 0,
    cool: 110,
    scale: 1,
    fly: true,
    ice: true,
    ranged: 'laser',
    range: 140,
    creds: [10, 18],
    karma: 18
  },
  blackice: {
    name: 'Black ICE',
    hp: 330,
    spd: 0.7,
    dmg: 16,
    reach: 0,
    cool: 120,
    scale: 1.6,
    boss: true,
    fly: true,
    ice: true,
    beam: true,
    creds: [0, 0],
    karma: 0
  },
  drone: {
    name: 'Drone',
    hp: 18,
    spd: 1.1,
    dmg: 7,
    reach: 0,
    cool: 125,
    scale: 1,
    ranged: 'bullet',
    range: 120,
    fly: true,
    creds: [10, 18],
    karma: 12
  },
  troll: {
    name: 'Gutter King',
    hp: 220,
    spd: 0.75,
    dmg: 15,
    reach: 30,
    cool: 80,
    scale: 1.45,
    boss: true,
    charge: 3.2,
    creds: [90, 120],
    karma: 90,
    style: 'horns',
    pal: {
      skin: '#8a7ea6',
      coat: '#5a3a2a',
      coat2: '#432a1e',
      pants: '#2a2420',
      hair: '#ece4c6',
      acc: '#ff6a3d',
      boot: '#16110e'
    }
  },
  blade: {
    name: 'Razor Mei',
    hp: 200,
    spd: 1.15,
    dmg: 13,
    reach: 26,
    cool: 55,
    scale: 1.08,
    boss: true,
    charge: 4.4,
    creds: [110, 140],
    karma: 120,
    style: 'blade',
    pal: {
      skin: '#e3b896',
      coat: '#2a2a33',
      coat2: '#1c1c24',
      pants: '#15151b',
      hair: '#f2f2f7',
      acc: '#ff3d8b',
      boot: '#0b0b10'
    }
  },
  saint: {
    name: 'The Hollow Saint',
    hp: 240,
    spd: 1,
    dmg: 13,
    reach: 24,
    cool: 70,
    scale: 1.3,
    boss: true,
    lunge: true,
    summon: true,
    creds: [120, 160],
    karma: 150,
    style: 'ghoul',
    crown: true,
    pal: {
      skin: '#d8d0bc',
      coat: '#3b2f3f',
      coat2: '#2b2230',
      pants: '#221b26',
      hair: '#d8d0bc',
      acc: '#ff4a4a',
      boot: '#120e14'
    }
  },
  avatar: {
    name: 'Avatar of Ssareth',
    hp: 560,
    spd: 1.05,
    dmg: 17,
    reach: 28,
    cool: 62,
    scale: 1.55,
    boss: true,
    lunge: true,
    summon: true,
    creds: [300, 420],
    karma: 420,
    style: 'ghoul',
    crown: true,
    pal: {
      skin: '#ffd27a',
      coat: '#3a1a4a',
      coat2: '#2a1236',
      pants: '#1e0f28',
      hair: '#ffc63d',
      acc: '#b98cff',
      boot: '#120a18'
    }
  },
  archmage: {
    name: 'Director Voss',
    hp: 270,
    spd: 0.8,
    dmg: 13,
    reach: 24,
    cool: 100,
    scale: 1.12,
    boss: true,
    ranged: 'hex3',
    range: 160,
    teleport: true,
    creds: [140, 180],
    karma: 160,
    style: 'mage',
    pal: {
      skin: '#d9c2b0',
      coat: '#e9e4f2',
      coat2: '#bdb4d0',
      pants: '#2b2540',
      hair: '#4a3d6b',
      acc: '#ffc63d',
      boot: '#1a1426'
    }
  }
};
const STAGES = [
  {
    name: 'Rustline Barrens',
    sub: 'Gang turf under the dead monorail',
    len: 1500,
    sky: ['#1d1033', '#4a1a3a'],
    moon: '#ff9f6b',
    far: '#241838',
    near: '#2f2140',
    win: '#ffb36b',
    wall: '#1d1626',
    ground: ['#2a2134', '#17121f'],
    line: '#3a2d48',
    rain: true,
    signs: [
      ['NOODLE', '#ff3d8b'],
      ['PAWN', '#ffc63d'],
      ['24H', '#45d2ff'],
      ['SOYCAF', '#ff6a3d'],
      ['TALISMAN', '#b98cff']
    ],
    props: [
      ['can', 300, 200],
      ['crate', 560, 240],
      ['can', 820, 215],
      ['drum', 1150, 230]
    ],
    passives: [
      ['vend', 520, 182],
      ['vend', 1200, 182]
    ],
    waves: [
      { at: 110, spawn: ['ganger', 'ganger'] },
      { at: 400, spawn: ['ganger', 'orc', 'ganger'] },
      { at: 700, spawn: ['shaman', 'ganger', 'ganger'] },
      { at: 960, spawn: ['orc', 'ganger', 'orc', 'ganger'] },
      { at: 1020, boss: true, spawn: ['troll', 'ganger'] }
    ]
  },
  {
    name: 'Neon Market',
    sub: 'Black clinics and street docs, three levels deep',
    len: 1700,
    sky: ['#071a2a', '#123a4a'],
    moon: '#9ff0ff',
    far: '#0e2434',
    near: '#15303f',
    win: '#6cf2ff',
    wall: '#0f1c26',
    ground: ['#152733', '#0b141b'],
    line: '#203a48',
    rain: true,
    signs: [
      ['CYBERDOC', '#45d2ff'],
      ['RAMEN', '#ff3d8b'],
      ['CHIPS', '#ffc63d'],
      ['MOJO', '#b98cff'],
      ['GUNS', '#ff6a3d']
    ],
    props: [
      ['crate', 260, 230],
      ['can', 600, 205],
      ['drum', 880, 240],
      ['can', 1300, 220]
    ],
    passives: [
      ['vend', 700, 182],
      ['vend', 1380, 182]
    ],
    waves: [
      { at: 120, spawn: ['ganger', 'sec'] },
      { at: 420, spawn: ['drone', 'sec', 'orc'] },
      { at: 740, spawn: ['sec', 'sec', 'ganger'] },
      { at: 1000, spawn: ['shaman', 'sec', 'drone'] },
      { at: 1220, boss: true, spawn: ['blade', 'drone'] }
    ]
  },
  {
    name: 'Undercity Tunnels',
    sub: 'The old transit lines. Something down here is hungry.',
    len: 1700,
    sky: ['#070d0b', '#13221c'],
    moon: '#7dffb0',
    far: '#0e1a15',
    near: '#16261f',
    win: '#7dffb0',
    wall: '#101a15',
    ground: ['#1a2620', '#0c1410'],
    line: '#24352c',
    rain: false,
    tunnel: true,
    signs: [
      ['NO EXIT', '#ff4a4a'],
      ['KEEP OUT', '#ffc63d'],
      ['LINE 4', '#7dffb0'],
      ['FEED', '#ff4a4a']
    ],
    props: [
      ['drum', 300, 215],
      ['crate', 700, 235],
      ['can', 950, 210],
      ['drum', 1100, 225]
    ],
    waves: [
      { at: 120, spawn: ['ghoul', 'ghoul', 'ghoul'] },
      { at: 420, spawn: ['spirit', 'hound', 'hound', 'hound'] },
      { at: 740, spawn: ['troll!', 'spirit', 'ghoul'] },
      { at: 1000, spawn: ['feral', 'spirit', 'shaman', 'ghoul'] },
      { at: 1220, boss: true, spawn: ['saint', 'ghoul'] }
    ]
  },
  {
    name: 'Kagemori Arcology',
    sub: 'Top floor. The Director is waiting.',
    len: 1800,
    sky: ['#120e1c', '#2a2440'],
    moon: '#ffc63d',
    far: '#1b1730',
    near: '#262040',
    win: '#ffe2a0',
    wall: '#1a1626',
    ground: ['#2a2536', '#14111d'],
    line: '#3a3350',
    rain: false,
    grid: true,
    signs: [
      ['KAGEMORI', '#ffc63d'],
      ['SECURE', '#45d2ff'],
      ['LAB 7', '#ff3d8b'],
      ['AUTHORIZED', '#ffc63d']
    ],
    props: [
      ['crate', 330, 225],
      ['drum', 650, 210],
      ['can', 900, 240],
      ['drum', 1350, 220]
    ],
    passives: [
      ['vend', 560, 182],
      ['vend', 1150, 182]
    ],
    waves: [
      { at: 120, spawn: ['sec', 'riot', 'drone'] },
      { at: 430, spawn: ['mech', 'sec', 'shaman'] },
      { at: 760, spawn: ['blade!', 'drone', 'sec'] },
      { at: 1040, spawn: ['ninja', 'ninja', 'riot'] },
      { at: 1320, boss: true, spawn: ['archmage', 'riot'] }
    ]
  },
  {
    name: 'Kagemori Host',
    sub: 'Jacked in. Voss uploaded herself into the corporate host.',
    len: 1800,
    sky: ['#020610', '#06182a'],
    moon: '#45d2ff',
    far: '#04121f',
    near: '#071a2c',
    win: '#45d2ff',
    wall: '#041018',
    ground: ['#04101a', '#02080e'],
    line: '#0e4a66',
    rain: true,
    matrix: true,
    signs: [
      ['ICE', '#45d2ff'],
      ['ROOT', '#7dffb0'],
      ['SYS://', '#45d2ff'],
      ['VOSS', '#ff3d8b']
    ],
    props: [
      ['crate', 400, 230],
      ['drum', 900, 215]
    ],
    passives: [
      ['node', 300, 200],
      ['node', 560, 245],
      ['node', 820, 205],
      ['node', 1080, 240],
      ['node', 1300, 210],
      ['node', 1500, 235]
    ],
    waves: [
      { at: 120, spawn: ['glitch', 'glitch', 'ice'] },
      { at: 430, spawn: ['ice', 'glitch', 'sec'] },
      { at: 760, spawn: ['archmage!', 'glitch', 'glitch'] },
      { at: 1040, spawn: ['ice', 'ice', 'riot', 'glitch'] },
      { at: 1320, boss: true, spawn: ['blackice', 'glitch'] }
    ]
  }
];
const TRAIN_STAGE = {
  name: "Juno's back alley",
  sub: 'Training',
  len: 480,
  sky: ['#1a0f2a', '#3a1a3a'],
  moon: '#ff9f6b',
  far: '#24183a',
  near: '#2c2044',
  win: '#ffb36b',
  wall: '#1c1528',
  ground: ['#2c2236', '#18121f'],
  line: '#3a2d48',
  rain: true,
  signs: [
    ['DOJO', '#ff3d8b'],
    ['NOODLE', '#ffc63d']
  ],
  waves: []
};
const DEN = {
  name: 'The Den',
  sub: 'Home turf',
  len: 960,
  sky: ['#1a0f2a', '#5a2440'],
  moon: '#ffb36b',
  far: '#24183a',
  near: '#2c2044',
  win: '#ffb36b',
  wall: '#1c1528',
  ground: ['#2c2236', '#18121f'],
  line: '#3a2d48',
  rain: true,
  signs: []
};
