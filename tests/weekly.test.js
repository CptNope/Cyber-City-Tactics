/* Weekly challenge seeding, modifiers and the share line. */
require('./harness');
const G = __G,
  PARTY = __PARTY;
const MAPS = [
  {
    l: 'KeyA',
    r: 'KeyD',
    u: 'KeyW',
    d: 'KeyS',
    p: 'KeyJ',
    k: 'KeyK',
    j: 'Space',
    g: 'KeyU',
    s: 'KeyI',
    o: 'KeyO',
    h: 'KeyH',
    q: 'KeyQ'
  },
  {
    l: 'ArrowLeft',
    r: 'ArrowRight',
    u: 'ArrowUp',
    d: 'ArrowDown',
    p: 'Comma',
    k: 'Period',
    j: 'Slash',
    g: 'Semicolon',
    s: 'Quote',
    o: 'ShiftRight',
    h: 'BracketLeft',
    q: 'BracketRight'
  }
];

const step = n => {
  for (let i = 0; i < n; i++) {
    T += 1000 / 60;
    raf(T);
  }
};
function runWaves() {
  click('arenapick');
  click('week1');
  const out = [];
  for (let w = 0; w < 6; w++) {
    G.ents = G.ents.filter(e => e.team !== 1);
    __api.nextArenaWave();
    out.push(
      G.ents
        .filter(e => e.team === 1)
        .map(e => e.kind)
        .join('+') +
        ' props:' +
        G.props.map(p => p.kind[0]).join('')
    );
  }
  __api.offerPerks();
  const perks = G.perks.join(',');
  __api.offerPerks();
  const perks2 = G.perks.join(',');
  return { wk: G.challenge, out, perks, perks2 };
}
const a = runWaves();
__api.setMode('title');
const b = runWaves();
console.log('week', JSON.stringify(a.wk), '→', __api.MODS[a.wk.mod].name);
console.log(
  'waves identical across runs:',
  JSON.stringify(a.out) === JSON.stringify(b.out),
  '| perks identical:',
  a.perks === b.perks && a.perks2 === b.perks2
);
a.out.forEach((w, i) => console.log(' wave', i + 1, w));
console.log(' perk offers', a.perks, 'then', a.perks2);
// open arena should differ run to run
click('arenapick');
click('arena1');
const o1 = [];
for (let w = 0; w < 4; w++) {
  G.ents = G.ents.filter(e => e.team !== 1);
  __api.nextArenaWave();
  o1.push(
    G.ents
      .filter(e => e.team === 1)
      .map(e => e.kind)
      .join('+')
  );
}
click('arenapick');
click('arena1');
const o2 = [];
for (let w = 0; w < 4; w++) {
  G.ents = G.ents.filter(e => e.team !== 1);
  __api.nextArenaWave();
  o2.push(
    G.ents
      .filter(e => e.team === 1)
      .map(e => e.kind)
      .join('+')
  );
}
console.log('open arena runs differ:', JSON.stringify(o1) !== JSON.stringify(o2));
// modifiers: force each and check effect
for (const mod of ['glass', 'brawl', 'elite', 'keg']) {
  click('arenapick');
  click('week1');
  G.challenge.mod = mod;
  const P = __PL()[0];
  if (mod === 'glass') {
    const e = __api.spawnEnemy('ganger', 1);
    e.inv = 0;
    const h0 = e.hp;
    __api.hurt(e, 10, 1, {});
    console.log(' glass: 10 dmg ->', h0 - e.hp);
  }
  if (mod === 'brawl') {
    const before = P.D.melee;
    G.challenge.mod = 'x';
    P.attr.str++;
    P.attr.str--;
  }
  if (mod === 'elite') {
    G.ents = G.ents.filter(e => e.team !== 1);
    __api.nextArenaWave();
    console.log(
      ' elite week: elites',
      G.ents.filter(e => e.team === 1 && e.elite).length,
      'of',
      G.ents.filter(e => e.team === 1 && !e.d.boss).length
    );
  }
  if (mod === 'keg') {
    G.props = [];
    G.ents = G.ents.filter(e => e.team !== 1);
    __api.nextArenaWave();
    console.log(' powder keg props:', G.props.map(p => p.kind).join(','));
  }
}
G.mode = 'arenaover';
G.lastEntry = { score: 12345, wave: 9, combo: 22 };
G.challenge = { id: '2026-W43', mod: 'glass' };
console.log('share:', __api.shareLine());
