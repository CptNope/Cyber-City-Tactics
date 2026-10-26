/* Core combat mechanics: drums, rolls, riot shields, spirits vs bullets, combos. */
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

let log = [],
  stats = { grabs: 0, throws: 0, props: 0, rolls: 0, maxCombo: 0, npc: 0 };
const step = n => {
  for (let i = 0; i < n; i++) {
    T += 1000 / 60;
    raf(T);
  }
};
click('new');
click('go');
step(5);
const P = __PL()[0];
// ---- grab, knee, throw
G.wave = 99;
G.waveLive = false;
const a = __api.spawnEnemy('ganger', 1),
  b = __api.spawnEnemy('ganger', 1);
a.x = P.x + 14;
a.y = P.y;
b.x = P.x + 60;
b.y = P.y;
a.inv = 0;
b.inv = 0;
a.cool = 999;
b.cool = 999;
__api.setS(a, 'hurt');
P.face = 1;
key('KeyD', true);
step(1);
key('KeyD', false);
console.log('grab state:', P.state, 'enemy:', a.state);
tap('KeyJ');
step(2);
console.log('after knee: hp', a.hp, '/', a.maxHp, 'knees', P.knees, 'enemy', a.state);
const bh = b.hp;
tap('KeyK');
step(1);
console.log('throw: runner', P.state, 'enemy', a.state, 'thrown?', !!a.thrown, 'z', a.z.toFixed(1));
step(40);
console.log('after landing: a hp', a.hp, 'state', a.state, '| b hp', bh, '->', b.hp, 'b state', b.state);
// ---- prop lift and throw
G.ents = G.ents.filter(e => e.team !== 1);
const c = __api.spawnEnemy('orc', 1);
c.x = P.x + 90;
c.y = P.y;
c.cool = 999;
c.inv = 0;
G.props = [{ kind: 'drum', x: P.x + 4, y: P.y, z: 0 }];
P.state = 'idle';
P.face = 1;
tap('KeyJ');
step(1);
console.log('lift: holding', P.holding && P.holding.kind, 'state', P.state);
step(12);
tap('KeyJ');
step(30);
console.log(
  'drum thrown: orc hp',
  c.hp,
  '/',
  c.maxHp,
  'state',
  c.state,
  'props left',
  G.props.length,
  'projs',
  G.projs.length
);
// ---- dodge i-frames
const g = __api.spawnEnemy('ganger', 1);
g.x = P.x + 20;
g.y = P.y;
__api.setS(g, 'windup');
g.t = 10;
P.state = 'idle';
const hp0 = P.hp;
tap('KeyO');
step(10);
console.log('roll: state', P.state, 'hp', hp0, '->', P.hp);
// ---- riot shield
G.ents = G.ents.filter(e => e.team !== 1);
P.state = 'idle';
P.x = 200;
P.y = 220;
P.face = 1;
const r = __api.spawnEnemy('riot', 1);
r.x = P.x + 18;
r.y = P.y;
r.face = -1;
r.cool = 999;
r.inv = 0;
const rh = r.hp;
tap('KeyJ');
step(14);
console.log('riot vs punch: hp', rh, '->', r.hp, 'state', r.state);
P.state = 'idle';
tap('KeyK');
step(14);
console.log('riot vs kick: hp ->', r.hp, 'state', r.state);
// ---- spirit immune to bullets
G.ents = G.ents.filter(e => e.team !== 1);
P.state = 'idle';
const s = __api.spawnEnemy('spirit', 1);
s.x = P.x + 80;
s.y = P.y;
s.cool = 999;
s.inv = 0;
const sh = s.hp;
tap('KeyU');
step(25);
console.log('spirit vs bullet: hp', sh, '->', s.hp);
console.log('combo now', G.combo, 'best', G.bestCombo);
