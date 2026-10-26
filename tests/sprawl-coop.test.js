/* Two runners clear a Sprawl building together (bot; can occasionally lose a fight). */
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
const K = (c, d) => key(c, d);
const rel = () => ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyJ'].forEach(k => K(k, false));
const FY0 = __api.FY0,
  W = __api.W;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
click('worldpick');
ok(G.mode === 'worldpick', 'worldpick screen');
click('world2');
ok(
  G.mode === 'play' && G.world && G.wd.street.buildings.length >= 15,
  'street generated, ' +
    G.wd.street.buildings.map(b => b.type.slice(0, 2) + (b.dirty ? '*' : '') + b.tier).join(' ')
);
const P = __PL()[0];
const B = G.wd.street.buildings;
const goDoor = b => {
  P.x = b.x;
  P.y = FY0 + 20;
  G.camX = Math.max(0, Math.min(G.wd.street.len - W, b.x - W / 2));
  G.ents = G.ents.filter(e => e.team !== 1);
  step(2);
  tap('KeyJ');
  step(3);
};
const crack = () => {
  let n = 0;
  while (G.mode === 'hack' && n++ < 10) {
    G.hack.pos = G.hack.zone;
    __api.hackPress();
  }
};
function fightBot(maxF) {
  let f = 0;
  const start = G.dun && G.dun.b;
  for (; f < maxF && G.world && G.dun && G.mode === 'play'; f++) {
    rel();
    const foes = G.ents.filter(e => e.team === 1 && e.state !== 'dead');
    let t =
      foes.filter(e => !e.d.passive).sort((a, b) => Math.abs(a.x - P.x) - Math.abs(b.x - P.x))[0] || foes[0];
    if (P.hp < P.maxHp * 0.35 && PARTY.med > 0 && f % 30 === 0) tap('KeyH');
    if (t) {
      const dx = t.x - P.x,
        dy = t.y - P.y;
      if (Math.abs(dy) > 4) K(dy < 0 ? 'KeyW' : 'KeyS', true);
      if (Math.abs(dx) > 22) K(dx < 0 ? 'KeyA' : 'KeyD', true);
      else {
        P.face = dx < 0 ? -1 : 1;
        if (f % 14 === 0) tap(f % 42 === 0 ? 'KeyK' : 'KeyJ');
        if (f % 200 === 0) tap('KeyI');
      }
    } else if (G.picks.length && PARTY.bag.length < 12) {
      const k = G.picks[0];
      if (Math.abs(k.y - P.y) > 3) K(k.y < P.y ? 'KeyW' : 'KeyS', true);
      if (Math.abs(k.x - P.x) > 3) K(k.x < P.x ? 'KeyA' : 'KeyD', true);
    } else K('KeyD', true);
    step(1);
  }
  rel();
  return f;
}
ok(
  __PL().length === 2 && G.ents.filter(e => e.kind === 'player').length === 2,
  'co-op: two runners on the street'
);
const gb = B.find(b => b.type !== 'safe' && __api.isGood(b));
goDoor(gb);
click('hack');
let n = 0;
while (G.mode === 'hack' && n++ < 10) {
  G.hack.pos = G.hack.zone;
  __api.hackPress();
}
ok(G.dun && G.ents.filter(e => e.kind === 'player').length === 2, 'co-op: both runners inside ' + gb.name);
let fr = 0;
while (G.dun && G.mode === 'play' && fr < 60 * 200) fr += fightBot(60);
ok(!G.dun && G.mode === 'play', 'co-op cleared in ' + ((fr / 60) | 0) + 's');
console.log(
  'end',
  G.mode,
  G.dun && G.dun.b.name,
  G.dun && G.dun.b.type + G.dun.b.tier,
  __PL()
    .map(p => p.lvl + ':' + p.arch + ':' + Math.round(p.hp) + '/' + p.lives + (p.out ? 'out' : ''))
    .join(' '),
  G.ents
    .filter(e => e.team === 1 && e.state !== 'dead')
    .map(e => e.kind + (e.elite ? '*' : ''))
    .join(',')
);
