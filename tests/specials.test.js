/* Archetype specials, vending machines, data nodes, Glitch splitting, Black ICE beams. */
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
const fresh = arch => {
  G.pendArch = [arch, 'samurai'];
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
const foes = (k, n, dx) => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const e = __api.spawnEnemy(k, 1);
    e.x = __PL()[0].x + dx + i * 14;
    e.y = __PL()[0].y;
    e.cool = 9999;
    e.inv = 0;
    e.elite = null;
    out.push(e);
  }
  return out;
};
// archetype stats
for (const a of ['runner', 'samurai', 'mage', 'gunslinger']) {
  const P = fresh(a);
  console.log(
    a.padEnd(10),
    'attr',
    JSON.stringify(P.attr),
    'weapon',
    P.eq.weapon && P.eq.weapon.name,
    'gun',
    P.eq.gun.name,
    'spells',
    P.spells.join('+'),
    'ammo',
    P.ammo,
    'hp',
    P.maxHp,
    'mp',
    P.maxMp
  );
}
// samurai blade dance
let P = fresh('samurai');
let fz = foes('ganger', 3, 30);
P.sp = 100;
tap('KeyF');
step(30);
console.log(
  'Blade Dance: runner moved',
  Math.round(P.x - 40),
  'px; gangers hp',
  fz.map(e => e.hp + '/' + e.maxHp + ':' + e.state).join(' ')
);
// mage storm
P = fresh('mage');
fz = foes('orc', 4, 120);
P.sp = 100;
tap('KeyF');
step(60);
console.log('Mana Storm: orcs hp', fz.map(e => e.hp + '/' + e.maxHp).join(' '));
// gunslinger bullet time
P = fresh('gunslinger');
fz = foes('ganger', 1, 120);
P.sp = 100;
const am = P.ammo;
tap('KeyF');
step(2);
let moved0 = fz[0].x;
fz[0].cool = 0;
step(40);
tap('KeyU');
step(20);
console.log('Bullet Time: slowFoes', G.slowFoes > 0, 'ammo', am, '->', P.ammo, '(free shots)');
// runner adrenaline
P = fresh('runner');
P.hp = 40;
P.sp = 100;
tap('KeyF');
step(2);
console.log('Adrenaline: hp 40 ->', P.hp, 'buff frames', P.buffT);
// special via punch+kick together
P = fresh('runner');
P.sp = 100;
key('KeyJ', true);
key('KeyK', true);
step(1);
key('KeyJ', false);
key('KeyK', false);
console.log('punch+kick special fired:', P.sp === 0);
// heavy charge
P = fresh('runner');
fz = foes('riot', 1, 24);
fz[0].face = -1;
key('KeyJ', true);
step(40);
key('KeyJ', false);
step(2);
console.log('charged state:', P.state);
step(12);
console.log('heavy vs riot shield: hp', fz[0].hp + '/' + fz[0].maxHp, 'state', fz[0].state);
// meter fills by fighting
P = fresh('runner');
fz = foes('orc', 1, 18);
for (let i = 0; i < 6; i++) {
  tap('KeyJ');
  step(14);
}
console.log('meter after 6 punches:', Math.round(P.sp) + '%');
// vending + node
P = fresh('runner');
const v = __api.spawnPassive('vend', P.x + 18, P.y);
for (let i = 0; i < 8 && v.state !== 'dead'; i++) {
  tap('KeyK');
  step(22);
}
console.log('vending machine:', v.state, 'drops on street:', G.picks.map(k => k.k).join(','));
// district 5 nodes + contract
G.pendArch = ['runner', 'samurai'];
click('pick');
click('new');
__api.startStage(4);
step(5);
console.log(
  'district 5:',
  G.ents.filter(e => e.kind === 'node').length,
  'nodes; contract',
  JSON.stringify(G.mode)
);
// glitch split
P = __PL()[0];
G.wave = 99;
G.ents = G.ents.filter(e => e.team !== 1);
const g = foes('glitch', 1, 20)[0];
__api.hurt(g, 999, 1, { src: P, ax: P.x });
console.log(
  'glitch split into',
  G.ents.filter(e => e.kind === 'glitch' && e.state !== 'dead').length,
  'minis'
);
// black ice beam: standing vs rolling
G.ents = G.ents.filter(e => e.team !== 1);
P.inv = 0;
P.state = 'idle';
const b = __api.spawnEnemy('blackice', 1);
b.x = P.x + 150;
b.y = P.y;
b.inv = 0;
b.cool = 9999;
__api.setS(b, 'beam');
b.beamHit = [];
b.beamYs = [P.y];
const h0 = P.hp;
step(70);
console.log('beam vs standing runner: hp', Math.round(h0), '->', Math.round(P.hp));
step(60);
P.inv = 0;
P.state = 'idle';
P.hp = P.maxHp;
__api.setS(b, 'beam');
b.beamHit = [];
b.beamYs = [P.y];
step(42);
tap('KeyO');
step(30);
console.log('beam vs rolling runner: hp', P.maxHp, '->', Math.round(P.hp));
