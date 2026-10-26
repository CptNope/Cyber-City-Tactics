/* Cyber City Tactics · src/js/data/legend-data.js
 * The writing and tables behind your legend: the 24 lore shards, bestiary notes, the legendary items, every feat
 * and the legend ranks. Edit these freely; the logic lives in systems/legend.js.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
const LORE = [
  [
    'Seattle, 2079',
    "The Awakening came back in '11. Magic first, then dragons, then corps big enough to buy the sky. Seattle stayed a city on paper. On the street it's the Sprawl, and the Sprawl has its own rules."
  ],
  [
    'The dead monorail',
    'Rustline used to be the commuter spine. Kagemori bought the line, shut it down and never tore it out. Now the crews live under it, and the pylons hum on nights when nothing should be running.'
  ],
  [
    'The Gutter King',
    "Nobody knows his real name. He was a dock troll who broke a corp foreman's jaw and kept going. He takes a tithe from every stall on Rustline and pays it to someone he's never met."
  ],
  [
    'Juno',
    'Juno has been fixing for twenty years and has never once said who her first client was. She pays fair, remembers everything, and keeps a burner deck that never leaves her coat.'
  ],
  [
    'Doc Kessler',
    "Lost his license over a liver he says he didn't sell. Now he patches runners in the back of a noodle bar. His hands shake until the moment the knife touches skin."
  ],
  [
    'Old Wen',
    "Wen says she taught half the shamans in the Barrens and buried the other half. Her talismans are wrapped in Kagemori shipping tape. She won't say where she gets it."
  ],
  [
    'Razor Mei',
    "Mei was Kagemori's best courier killer until they tried to retire her. She survived the retirement. Now she sells her blade to whoever's hunting the people who trained her."
  ],
  [
    'Neon Market',
    'Ten thousand stalls, one rule: no corp scrip. The market runs on nuyen, favors and data chips. The chips that matter are stamped with a little paper lantern.'
  ],
  [
    'Project LANTERN',
    "A memo header on a burned chip: PROJECT LANTERN, PHASE 3, VESSEL ACQUISITION. The rest is corrupted, except a line about 'spirit retention in chromed hosts'."
  ],
  [
    'Ghouls',
    'Infected, not dead, whatever the tabloids say. Most of the tunnel ghouls were ordinary people once. Kagemori trucks drop food at the tunnel mouths every month, and nobody asks why a corp is feeding ghouls.'
  ],
  [
    'The Hollow Saint',
    'They say she was a Kagemori test subject who walked out of a lab burning and never stopped. The Undercity worships her. She hears the spirits the corp put in the chrome, and she wants them freed.'
  ],
  [
    'Fire spirits',
    'Free spirits are rare. Bound ones are a commodity. The fire spirits in the tunnels were bound by someone, and the binding marks are corporate, stamped with a lantern.'
  ],
  [
    'Kagemori',
    'Number nine on the Corporate Court list and climbing. Officially they build cyberware and security drones. Unofficially every runner in Seattle has a story about a Kagemori job that went strange.'
  ],
  [
    'Director Voss',
    'Voss ran Kagemori Seattle for six years and was decorated twice. His own staff say he started hearing voices in the server rooms and smiling at them.'
  ],
  [
    'The Arcology',
    "Two hundred floors of corp housing, sealed air and private police. The top ten floors aren't on the building plans. The elevators to them only answer to one voiceprint, and it isn't Voss's."
  ],
  [
    'Black ICE',
    "Intrusion countermeasures that can kill a decker through the jack. Kagemori's Black ICE is different: it learns, and logs show it pausing before it kills, as if it were listening to something."
  ],
  [
    'Ratchet',
    "Ratchet will buy anything once and sell it twice. He's the only fence on Rustline the Gutter King never touches. People wonder who protects him."
  ],
  [
    'Kit',
    "Kit rents muscle, drones and bound spirits by the job and never asks what the job is. Kit's spirits come with the same lantern binding marks, and Kit pretends not to notice."
  ],
  [
    'Pixel',
    'Pixel is twelve, or says so. She knows every vent and crawlspace on the block and has hacked three Kagemori cameras just to watch the guards nap.'
  ],
  [
    'Street cred',
    'On the Sprawl, reputation is currency. Hit the crews and the people cheer. Hit a family and they remember your face. Either way, the street decides who you are.'
  ],
  [
    'Wyrm cults',
    'Some people worship dragons the way their grandparents worshipped saints. The cults meet behind unmarked doors, pay in old gold, and carry a lantern on every altar.'
  ],
  [
    'The Lantern-bearer',
    "Every chip, binding and altar points the same way. Project LANTERN wasn't Voss's idea. It belongs to something older that wants chrome bodies full of bound spirits, an army that never sleeps."
  ],
  [
    'Ssareth',
    'A name scratched inside a vault door in old draconic script: SSARETH, WHO LIGHTS THE WAY. The great dragon bought Kagemori through shell companies. Voss was only ever the lamp.'
  ],
  [
    'The way out',
    "Juno's first client, twenty years ago, paid in gold coins stamped with a lantern. She's been working for Ssareth all along, and she's been hiring runners strong enough to stop it. She's hoping you're the ones."
  ]
];
const BEST = {
  ganger: 'Rustline crews. Cheap chrome, cheap knives, a lot of nerve.',
  orc: 'Big, tough and not as slow as they look. Knock them down before they knock you down.',
  sec: 'Kagemori security on a corp salary. They shoot first and file reports later.',
  riot: 'Shields stop punches from the front. Kick them, throw something, or get behind.',
  shaman: 'Street shamans throw spells from the back line. Close the distance fast.',
  ghoul: 'They lunge from far away. Roll through and punish the recovery.',
  spirit: 'Bound fire spirits. Bullets pass right through them; use fists, blades or magic.',
  cop: 'Lone Star patrol, contracted to Kagemori. Every one you drop raises the heat.',
  glitch: 'Corrupted code with a body. Kill one and it splits in two.',
  ice: 'ICE sentries teleport and fire laser spreads. Watch the windup.',
  drone: 'Rigger drones keep their distance and shoot. Jump-kick them out of the air.',
  blackice: 'Black ICE fires lane-wide beams. Change lanes or roll, then hit the core while it vents.',
  troll: "The Gutter King. Huge hits and ground slams once he's angry. Jump the shockwaves.",
  blade: "Razor Mei dashes through you, then chains three dashes when she's enraged.",
  saint: 'The Hollow Saint summons spirits and slams the floor. Keep moving.',
  archmage: 'Director Voss teleports and fires hexes, five at a time when enraged.',
  avatar:
    "Ssareth's avatar: a vessel of chrome and bound fire. It summons spirits, lunges and slams. The great dragon is watching through its eyes."
};
const LEGS = {
  ronin: {
    slot: 'weapon',
    base: 'katana',
    name: "Ronin's Last Edge",
    fx: 'Every sixth melee hit is a guaranteed crit.'
  },
  maul: {
    slot: 'weapon',
    base: 'hammer',
    name: "Saint's Cinder Maul",
    fx: 'Heavy blows erupt in a fire blast.'
  },
  silk: {
    slot: 'weapon',
    base: 'whip',
    name: "Mei's Silk",
    fx: 'Melee hits have a 30% chance to lash a second enemy.'
  },
  boomstick: {
    slot: 'gun',
    base: 'shot',
    name: "King's Boomstick",
    fx: 'Fires five pellets that knock enemies down.'
  },
  smartlink: {
    slot: 'gun',
    base: 'smart',
    name: "Voss's Smartlink",
    fx: 'Half your hits arc lightning to another enemy.'
  },
  wyrmfang: {
    slot: 'gun',
    base: 'rail',
    name: 'Wyrmfang',
    fx: 'Rail slugs set every target on fire, and half your shots cost no ammo.'
  },
  iceshard: {
    slot: 'armor',
    base: 'cloak',
    name: 'Black ICE Shard',
    fx: 'Deflects one hit every eight seconds.'
  },
  dragonscale: {
    slot: 'armor',
    base: 'robe',
    name: 'Dragonscale Duster',
    fx: 'Damage you take restores half as much mana.'
  },
  lantern: {
    slot: 'gun',
    base: 'launcher',
    name: 'The Lantern',
    fx: 'Every takedown heals 5% HP and restores 5 mana for the whole team.'
  }
};
const FEATS = [
  { id: 'first', name: 'First Blood', desc: 'Take down your first enemy.', lp: 5, stat: 'kills', n: 1 },
  { id: 'k100', name: 'Street Sweeper', desc: 'Take down 100 enemies.', lp: 10, stat: 'kills', n: 100 },
  {
    id: 'k1000',
    name: 'Thousand-Yard Stare',
    desc: 'Take down 1,000 enemies.',
    lp: 25,
    stat: 'kills',
    n: 1000
  },
  { id: 'el25', name: 'Elite Hunter', desc: 'Take down 25 elites.', lp: 15, stat: 'elites', n: 25 },
  { id: 'c25', name: 'Chain Reaction', desc: 'Land a 25-hit combo.', lp: 10, stat: 'combo', n: 25 },
  {
    id: 'c60',
    name: 'Perfect Rhythm',
    desc: 'Land a 60-hit combo.',
    lp: 25,
    stat: 'combo',
    n: 60,
    hidden: 1
  },
  { id: 'sp25', name: 'Specialist', desc: 'Use your special 25 times.', lp: 10, stat: 'specials', n: 25 },
  { id: 'lv20', name: 'Prime Runner', desc: 'Reach level 20.', lp: 20, stat: 'lvl', n: 20 },
  { id: 'b_troll', name: 'Dethroned', desc: 'Beat the Gutter King.', lp: 15, leg: 'boomstick' },
  { id: 'b_blade', name: 'Cut the Razor', desc: 'Beat Razor Mei.', lp: 15, leg: 'silk' },
  { id: 'b_saint', name: 'Ash to Ash', desc: 'Beat the Hollow Saint.', lp: 15, leg: 'maul' },
  { id: 'b_archmage', name: 'Hostile Takeover', desc: 'Beat Director Voss.', lp: 15, leg: 'smartlink' },
  { id: 'b_blackice', name: 'Defragmented', desc: 'Delete Black ICE.', lp: 15, leg: 'iceshard' },
  { id: 'win', name: 'Legend of the Sprawl', desc: 'Finish the campaign.', lp: 30 },
  { id: 'prime', name: 'Prime Time', desc: 'Finish the campaign on Prime.', lp: 40 },
  { id: 'ngp', name: 'Again, Harder', desc: 'Start New Game+.', lp: 15 },
  { id: 'rematch', name: 'Bad Blood', desc: 'Beat a boss rematch.', lp: 15, hidden: 1 },
  { id: 'coop', name: 'Partners in Crime', desc: 'Clear a district in co-op.', lp: 10 },
  { id: 'ghost', name: 'Not a Scratch', desc: 'Clear a district without losing a life.', lp: 15 },
  {
    id: 'h1',
    name: 'Script Kiddie',
    desc: 'Crack your first lock in the Sprawl.',
    lp: 5,
    stat: 'hacks',
    n: 1
  },
  {
    id: 'h10',
    name: 'Decker',
    desc: 'Crack 10 locks. Unlocks the Decker archetype.',
    lp: 20,
    stat: 'hacks',
    n: 10,
    arch: 'decker'
  },
  { id: 'zero', name: 'Zero-Day', desc: 'Crack a tier-3 lock without a single miss.', lp: 20, hidden: 1 },
  { id: 'blk5', name: 'Deep in the Sprawl', desc: 'Reach block 5.', lp: 20, stat: 'block', n: 5 },
  { id: 'folk', name: 'Folk Hero', desc: 'Reach +60 street cred.', lp: 20, leg: 'ronin' },
  { id: 'villain', name: 'Public Enemy', desc: 'Fall to −60 street cred.', lp: 10, hidden: 1 },
  {
    id: 'wanted',
    name: 'Most Wanted',
    desc: 'Survive a full minute at five heat stars.',
    lp: 20,
    hidden: 1,
    leg: 'wyrmfang'
  },
  { id: 'secret', name: 'Off the Map', desc: 'Find a hidden door.', lp: 20, hidden: 1, leg: 'dragonscale' },
  { id: 'bounty', name: 'Bounty Hunter', desc: "Collect one of Juno's bounties.", lp: 15 },
  { id: 'courier', name: 'Highway Robbery', desc: 'Take down a Kagemori courier before it escapes.', lp: 10 },
  {
    id: 'captain',
    name: 'Block Captain',
    desc: 'Clean out every hideout, black site and crooked home on a block.',
    lp: 20
  },
  { id: 'w10', name: 'Survivor', desc: 'Reach Arena wave 10.', lp: 10, stat: 'wave', n: 10 },
  { id: 'w25', name: 'Gladiator', desc: 'Reach Arena wave 25.', lp: 25, stat: 'wave', n: 25 },
  { id: 'daily', name: 'Daily Grind', desc: 'Play a daily challenge.', lp: 5 },
  { id: 'streak', name: 'Habit Forming', desc: 'Play the daily challenge three days in a row.', lp: 15 },
  { id: 'weekly', name: 'Seven-Day Itch', desc: 'Play a weekly challenge.', lp: 5 },
  { id: 'lore5', name: 'Rumor Mill', desc: 'Find 5 lore shards.', lp: 10, stat: 'shards', n: 5 },
  {
    id: 'loreall',
    name: 'The Whole Truth',
    desc: 'Find every lore shard.',
    lp: 40,
    stat: 'shards',
    n: 24,
    hidden: 1
  },
  { id: 'leg1', name: 'Black Market', desc: 'Find a legendary.', lp: 15, stat: 'legs', n: 1 },
  { id: 'legall', name: 'Collector', desc: 'Find every legendary.', lp: 40, stat: 'legs', n: 8, hidden: 1 },
  { id: 'best', name: 'Field Guide', desc: 'Take down every kind of enemy.', lp: 25, stat: 'species', n: 16 },
  { id: 'cap', name: 'Master of One', desc: 'Learn a capstone skill.', lp: 10 },
  { id: 'jack', name: 'Jack of All Trades', desc: 'Have at least one skill in all four trees.', lp: 10 },
  {
    id: 'lore10',
    name: 'Storyteller',
    desc: 'Find 10 lore shards. Unlocks the Shaman archetype.',
    lp: 20,
    stat: 'shards',
    n: 10,
    arch: 'shaman'
  },
  {
    id: 'cour3',
    name: 'Drone Jockey',
    desc: 'Down 3 Kagemori couriers. Unlocks the Rigger archetype.',
    lp: 20,
    stat: 'couriers',
    n: 3,
    arch: 'rigger'
  },
  {
    id: 'b_avatar',
    name: 'Lights Out',
    desc: 'Defeat the Avatar of Ssareth in the Lantern Vault.',
    lp: 60,
    hidden: 1,
    leg: 'lantern'
  },
  { id: 'mut1', name: 'Living Dangerously', desc: 'Clear a district with at least one mutator on.', lp: 15 },
  {
    id: 'mut3',
    name: 'Masochist',
    desc: 'Finish the campaign with three or more mutators on.',
    lp: 50,
    hidden: 1
  },
  {
    id: 'events',
    name: 'Seen It All',
    desc: 'Live through all four Sprawl block events.',
    lp: 20,
    stat: 'evseen',
    n: 4
  },
  {
    id: 'summon',
    name: 'Not Alone',
    desc: 'Have three summoned allies fighting at once.',
    lp: 10,
    hidden: 1
  },
  { id: 'dressed', name: 'Dressed to Kill', desc: 'Unlock 4 runner coats.', lp: 10, stat: 'coats', n: 4 }
];
const RANKS = [
  [0, 'Nobody'],
  [25, 'Street rat'],
  [75, 'Known face'],
  [150, 'Runner'],
  [250, 'Pro'],
  [400, 'Prime runner'],
  [600, 'Legend']
];
