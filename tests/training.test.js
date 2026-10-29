/* Bot completes all eleven training drills; boss rematches spawn. */
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
click('trainpick');
click('train');
const P = __PL()[0];
const log = [];
let last = -1,
  stepStart = 0;
const walkTo = (x, y, tol) => {
  rel();
  if (Math.abs(y - P.y) > 3) K(y < P.y ? 'KeyW' : 'KeyS', true);
  if (Math.abs(x - P.x) > (tol || 4)) K(x < P.x ? 'KeyA' : 'KeyD', true);
  return Math.abs(x - P.x) <= (tol || 4) && Math.abs(y - P.y) <= 3;
};
const foe = k => G.ents.find(e => e.team === 1 && e.kind === k && e.state !== 'dead');
let f = 0,
  phase = 0,
  phase0 = 0;
for (; f < 60 * 240 && G.mode !== 'trained'; f++) {
  if (G.tstep !== last) {
    if (last >= 0) log.push(`step ${last + 1} done in ${((f - stepStart) / 60).toFixed(1)}s`);
    last = G.tstep;
    stepStart = f;
    phase = 0;
    rel();
  }
  if (G.tdone > 0 || G.mode !== 'play') {
    step(1);
    continue;
  }
  const s = G.tstep;
  if (s === 0) walkTo(G.marker.x, G.marker.y, 3);
  if (s === 1) {
    const o = foe('orc');
    if (walkTo(o.x - 24, o.y, 3)) {
      P.face = 1;
      if (f % 16 === 0) tap('KeyJ');
    }
  }
  if (s === 2) {
    const o = foe('riot');
    if (walkTo(o.x - 26, o.y, 3) && f % 20 === 0) {
      P.face = 1;
      tap('KeyK');
    }
  }
  if (s === 3) {
    const o = foe('drone');
    if (walkTo(o.x - 20, o.y, 3) && P.z === 0 && f % 30 === 0) {
      tap('Space');
    }
    if (P.z > 8) tap('KeyK');
  }
  if (s === 4) {
    const o = foe('ganger');
    if (walkTo(o.x - 26, o.y, 3) && o.state === 'windup' && o.t > 4) tap('KeyO');
  }
  if (s === 5) {
    const o = foe('ganger');
    // a parry needs the swing to land mid-roll, so roll toward him, not away
    if (walkTo(o.x - 26, o.y, 3) && o.state === 'windup' && o.t === 12) {
      P.face = 1;
      K('KeyD', true);
      tap('KeyO');
    }
  }
  if (s === 6) {
    const o = foe('ganger');
    if (P.state === 'grab') {
      rel();
      // a throw is a pushed direction plus kick (a plain kick is a knee)
      if (f % 10 === 0) {
        K('KeyD', true);
        tap('KeyK');
      }
    } else if (o.state === 'hurt') {
      rel();
      K('KeyD', true);
    } else if (walkTo(o.x - 20, o.y, 3) && f % 15 === 0) {
      P.face = 1;
      tap('KeyJ');
    }
  }
  if (s === 7) {
    const pr = G.props[0];
    if (P.holding) {
      rel();
      P.face = 1;
      if (f % 10 === 0) tap('KeyJ');
    } else if (pr && walkTo(pr.x, pr.y, 4) && f % 10 === 0) tap('KeyJ');
  }
  if (s === 8) {
    const o = foe('orc');
    if (phase === 0) {
      if (walkTo(o.x - 28, o.y, 3)) {
        P.face = 1;
        ['KeyA', 'KeyD', 'KeyW', 'KeyS'].forEach(k => K(k, false));
        K('KeyJ', true);
        phase = 1;
        phase0 = f;
      }
    } else if (phase === 1 && f - phase0 > 40) {
      K('KeyJ', false);
      phase = 2;
    } else if (phase === 2 && f - phase0 > 90) {
      phase = 0;
    }
  }
  if (s === 9) {
    rel();
    P.face = 1;
    if (f % 40 === 0) tap(f % 80 === 0 ? 'KeyU' : 'KeyI');
  }
  if (s === 10) {
    rel();
    if (f % 30 === 0) tap('KeyF');
  }
  step(1);
}

log.forEach(l => console.log(l));
console.log(
  'final mode:',
  G.mode,
  'after',
  (f / 60).toFixed(1),
  's; trained pref:',
  (JSON.parse(localStorage.getItem('cs_prefs')) || {}).trained
);
// rematch spawn check
G.pendArch = ['runner', 'samurai'];
click('pick');
click('new');
for (const [si, w] of [
  [2, 2],
  [3, 2],
  [4, 2],
  [5, 2]
]) {
  __api.startStage(si);
  G.wave = w;
  G.camX = __api.STAGES[si].waves[w].at;
  step(3);
  const r = G.ents.find(e => e.rematch);
  console.log('district', si + 1, 'rematch:', r ? `${r.name} hp ${r.hp} enraged ${r.enraged}` : 'none');
}
