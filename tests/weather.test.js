/* Weather that changes play: slick wet streets, drones shorting out in the rain, gunmen closing in through the
 * fog, quieter break-ins in Sprawl fog, and acid rain corroding cheap armor. */
'use strict';
require('./harness');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.tips = false;
G.pendArch = ['samurai', 'runner'];
A.newRun(false);
const realRandom = Math.random;
const at = si => {
  A.startStage(si);
  step(3);
  G.cut = null;
  G.ents = G.ents.filter(e => e.team !== 1);
  G.props = [];
  return __PL()[0];
};
const foe = (P, dx, k) => {
  const e = A.spawnEnemy(k || 'ganger', 1);
  Object.assign(e, { x: P.x + dx, y: P.y, elite: null, club: null, mercy: 'rolled', inv: 0, cool: 1e9 });
  e.hp = e.maxHp = 9999;
  return e;
};

/* ---------- which weather ---------- */
let P = at(0);
ok(A.wxNow() === 'storm' && A.wxWet(), 'the Barrens are stormy, and wet');
const knock = () => {
  const e = foe(P, 30);
  const x0 = e.x;
  Math.random = () => 0.99;
  A.hurt(e, 5, 1, { src: P, melee: true, kb: 4 });
  Math.random = realRandom;
  return e.x - x0;
};
const wet = knock();
P = at(3);
ok(A.wxNow() === 'clear' && !A.wxWet(), 'the Undercity Market is dry');
const dry = knock();
ok(wet > dry * 1.2, `a wet street slides: a knock carries further (${wet.toFixed(1)} vs ${dry.toFixed(1)})`);

/* ---------- drones short out in the rain ---------- */
P = at(1);
ok(A.wxWet(), 'rain in the Market');
const dr = foe(P, 120, 'drone');
dr.wxT = 1;
Math.random = () => 0.01;
A.wxShort(dr);
Math.random = realRandom;
ok(dr.stunT >= 90, 'a drone in the rain shorts out now and then');
const dr2 = foe(P, 140, 'drone');
dr2.wxT = 1;
Math.random = () => 0.99;
A.wxShort(dr2);
Math.random = realRandom;
ok(!(dr2.stunT > 0), 'not every time');

/* ---------- fog ---------- */
P = at(2);
ok(A.wxNow() === 'fog' && A.wxSight() < 1, 'fog in the Tunnels shortens sight');
const gun = foe(P, 190, 'sec');
gun.cool = 0;
gun.y = P.y;
step(2);
ok(gun.state !== 'aim', 'a gunman 190 px off in the fog holds fire and closes in');
P = at(3);
const gun2 = foe(P, 190, 'sec');
gun2.cool = 0;
gun2.y = P.y;
step(2);
ok(gun2.state === 'aim', 'in clear air he opens up from there');

/* ---------- indoors, the weather stays outside ---------- */
A.enterDen();
ok(A.wxNow() === 'clear', 'the Den is dry');

/* ---------- the Sprawl: fog, and acid rain ---------- */
// a block with a home or business that isn't fair game (most have one)
const badB = () =>
  G.wd.street.buildings.find(x => (x.type === 'home' || x.type === 'business') && !A.isGood(x));
for (let i = 0; i < 40; i++) {
  A.startWorld(false);
  step(3);
  if (badB()) break;
}
const S = A.curS();
S.weather = 'fog';
ok(A.wxNow() === 'fog', 'a foggy Sprawl block');
const b = badB();
const heatAfter = weather => {
  S.weather = weather;
  G.wd.heat = 0;
  A.startHack(b);
  A.hackWin();
  G.dun = null;
  G.mode = 'play';
  return G.wd.heat;
};
const hf = heatAfter('fog'),
  hc = heatAfter('clear');
ok(hf === hc - 1, `a break-in in the fog draws one less heat star (${hf} vs ${hc})`);
S.weather = 'clear';
const R = __PL()[0];
R.eq.armor = A.mkItem('armor', Object.keys(A.BASES.armor)[0], 0);
R.eq.armor.arm = 5;
A.refresh(R);
G.t = 1800 * 7;
A.wxCorrode();
ok(R.eq.armor.arm === 4 && R.eq.armor.corroded === 1, 'acid rain eats a point off Street-grade armor');
R.eq.armor = A.mkItem('armor', Object.keys(A.BASES.armor)[0], 2);
const good = R.eq.armor.arm;
A.wxCorrode();
ok(R.eq.armor.arm === good, 'but not off anything better');
