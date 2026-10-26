/* Hired companions and the Barrier and Chain Lightning spells. */
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
    G.stop = 0;
    T += 1000 / 60;
    raf(T);
  }
};
const fresh = () => {
  G.pendArch = ['runner', 'samurai'];
  click('pick');
  click('diff:1');
  click('new');
  click('go');
  step(70);
  const P = __PL()[0];
  P.inv = 0;
  G.wave = 99;
  G.waveLive = false;
  G.ents = G.ents.filter(e => e.team !== 1);
  return P;
};
const foe = (k, dx, dy) => {
  const P = __PL()[0];
  const e = __api.spawnEnemy(k, 1);
  e.x = P.x + dx;
  e.y = P.y + (dy || 0);
  e.inv = 0;
  e.elite = null;
  return e;
};
// hire in the Den via Kit
let P = fresh();
__G.stage = 0;
__api.enterDen();
__PARTY.creds = 1000;
__api.openNPC('kit');
click('hire:brick');
click('leave');
console.log(
  'hired:',
  JSON.stringify(__PARTY.ally),
  'ally entity in Den:',
  G.ents.filter(e => e.kind === 'ally').length
);
P.x += 200;
step(120);
const br = G.ents.find(e => e.kind === 'ally');
console.log('Brick follows: runner x', Math.round(P.x), 'brick x', Math.round(br.x));
// each ally fights
for (const type of ['brick', 'drone', 'ember']) {
  P = fresh();
  __PARTY.ally = null;
  const a = __api.spawnAlly(type);
  a.x = P.x + 10;
  const g = foe('ganger', 90, 0);
  g.cool = 60;
  let aggro = false;
  for (let i = 0; i < 360 && g.state !== 'dead'; i++) {
    step(1);
    if (g.tgt === a) aggro = true;
  }
  console.log(
    type.padEnd(6),
    'vs ganger: ganger',
    g.state === 'dead' ? 'dead' : g.hp + '/' + g.maxHp,
    '| ally hp',
    Math.round(a.hp) + '/' + a.maxHp,
    '| ganger targeted ally:',
    aggro
  );
}
// ally death clears the party slot
P = fresh();
__PARTY.ally = null;
const d = __api.spawnAlly('drone');
d.inv = 0;
__api.hurt(d, 999, 1, {});
step(5);
console.log('drone destroyed → party ally:', JSON.stringify(__PARTY.ally));
// persists into next district
P = fresh();
__PARTY.ally = null;
__api.spawnAlly('ember');
__api.startStage(1);
step(5);
console.log(
  'ember carried into district 2:',
  G.ents.some(e => e.kind === 'ally' && e.ally === 'ember')
);
// spells
P = fresh();
P.spells = ['barrier', 'chain'];
P.spell = 0;
P.mp = 99;
__api.castSpell(P);
const sh = P.shield;
const g2 = foe('orc', 20, 0);
__api.setS(g2, 'windup');
g2.t = 15;
g2.face = -1;
const h0 = P.hp;
step(3);
console.log('Barrier', sh, '→ after orc hit: shield', P.shield, 'hp', Math.round(h0), '->', Math.round(P.hp));
G.ents = G.ents.filter(e => e.team !== 1);
const c = [foe('ganger', 60, 0), foe('ganger', 100, 10), foe('ganger', 140, -10)];
c.forEach(e => (e.cool = 9999));
P.spell = 1;
P.face = 1;
__api.castSpell(P);
step(20);
console.log('Chain Lightning hp:', c.map(e => e.hp + '/' + e.maxHp).join(' '));
