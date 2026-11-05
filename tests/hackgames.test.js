/* The newer hacking minigames: Sequence (hideouts), Trace (precincts) and Firewall (black sites), with
 * icebreakers, misses and lockouts, and the classic timing lock everywhere else. */
'use strict';
require('./harness');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.tips = false;
A.prefs.hackKind = 'varied';
G.pendArch = ['decker', 'samurai'];
A.startWorld(false);
step(10);
const B = (type, tier) => ({
  type,
  tier: tier || 2,
  name: 'Test ' + type,
  x: 300,
  id: 60 + type.length,
  owner: 'x',
  seed: 5
});
const reset = () => {
  G.hack = null;
  G.dun = null;
  A.setMode('play');
};

/* ---------- which lock ---------- */
ok(A.hackKindFor(B('hideout')) === 'seq', 'gang hideouts have a keypad sequence');
ok(A.hackKindFor(B('precinct')) === 'trace', 'precincts have a network trace');
ok(A.hackKindFor(B('blacksite')) === 'wall', 'black sites have a firewall run');
ok(
  ['home', 'business', 'club'].every(t => A.hackKindFor(B(t)) === 'lock'),
  'homes, businesses and clubs keep the timing lock'
);
ok(A.hackKindFor(B('blacksite'), { vault: 1 }) === 'lock', 'vaults keep the timing lock');
A.prefs.hackKind = 'classic';
ok(A.hackKindFor(B('hideout')) === 'lock', 'Settings → Classic only: every lock is the timing lock');
A.prefs.hackKind = 'varied';

/* ---------- Sequence ---------- */
A.startHack(B('hideout', 2));
let h = G.hack;
ok(h.kind === 'seq' && h.seq.length === 5 && h.phase === 'show', 'a lock-2 keypad shows a pattern of five');
A.hackDir(h.seq[0]);
ok(h.i === 0, 'presses while it plays don’t count');
for (let i = 0; i < 600 && h.phase === 'show'; i++) A.hackStep();
ok(h.phase === 'input', 'then it is your turn');
A.hackDir(h.seq[0]);
ok(h.i === 1, 'the right pad moves you on');
const wrong = ['up', 'left', 'right', 'down'].find(d => d !== h.seq[1]);
A.hackDir(wrong);
ok(h.miss === 1 && h.phase === 'show' && h.i === 0, 'a wrong pad costs a miss and replays the pattern');
for (let i = 0; i < 600 && h.phase === 'show'; i++) A.hackStep();
for (const d of h.seq) A.hackDir(d);
ok(!G.hack && G.dun, 'repeat it all: the door opens');
reset();
A.startHack(B('hideout', 1));
h = G.hack;
for (let i = 0; i < 600 && h.phase === 'show'; i++) A.hackStep();
for (let i = 0; i < 4 && G.hack; i++) {
  for (let j = 0; j < 600 && h.phase === 'show'; j++) A.hackStep();
  A.hackDir(['up', 'left', 'right', 'down'].find(d => d !== h.seq[0]));
}
ok(!G.hack && G.mode === 'play' && !G.dun, 'too many wrong pads: locked out');
reset();

/* ---------- Trace ---------- */
A.startHack(B('precinct', 2));
h = G.hack;
ok(
  h.kind === 'trace' && h.cx === 0 && h.cy === h.sy && h.left > 0,
  'a trace starts on the left with the clock running'
);
// the generator always leaves a route: find it
const key = (x, y) => x + ',' + y,
  prev = {},
  q = [[0, h.sy]];
prev[key(0, h.sy)] = null;
while (q.length) {
  const [x, y] = q.shift();
  for (const [dx, dy, d] of [
    [1, 0, 'right'],
    [-1, 0, 'left'],
    [0, 1, 'down'],
    [0, -1, 'up']
  ]) {
    const nx = x + dx,
      ny = y + dy;
    if (
      nx < 0 ||
      ny < 0 ||
      nx >= A.TR_W ||
      ny >= A.TR_H ||
      h.walls.includes(key(nx, ny)) ||
      key(nx, ny) in prev
    )
      continue;
    prev[key(nx, ny)] = [x, y, d];
    q.push([nx, ny]);
  }
}
ok(key(h.ex, h.ey) in prev, 'there is always a way through');
const route = [];
let cur = [h.ex, h.ey];
while (prev[key(cur[0], cur[1])]) {
  const p = prev[key(cur[0], cur[1])];
  route.unshift(p[2]);
  cur = [p[0], p[1]];
}
// bump into ICE once, if there is ICE next to the start
const iceNext = [
  ['right', 1, 0],
  ['down', 0, 1],
  ['up', 0, -1]
].find(n => h.walls.includes(key(n[1], h.sy + n[2])));
if (iceNext) {
  A.hackDir(iceNext[0]);
  ok(h.miss === 1 && h.cx === 0, 'running into ICE costs a miss and you stay put');
}
for (const d of route) A.hackDir(d);
ok(!G.hack && G.dun, 'reach the exit node: in');
reset();
A.startHack(B('precinct', 3));
h = G.hack;
h.left = 2;
A.hackStep();
A.hackStep();
ok(!G.hack && !G.dun, 'let the trace run out and you’re locked out');
reset();

/* ---------- Firewall ---------- */
A.startHack(B('blacksite', 2));
h = G.hack;
ok(h.kind === 'wall' && h.lane === 1, 'a firewall run starts in the middle lane');
A.hackDir('up');
A.hackDir('up');
ok(h.lane === 0, 'up and down switch lanes, within the three');
h.blocks = [{ x: 14, lane: 0 }];
A.hackStep();
ok(h.miss === 1, 'ICE in your lane costs a miss');
h.blocks = [{ x: 14, lane: 2 }];
A.hackStep();
ok(h.miss === 1, 'ICE in another lane passes by');
h.left = 1;
h.blocks = [];
A.hackStep();
ok(!G.hack && G.dun, 'last until it’s through: in');
reset();

/* ---------- icebreakers and help ---------- */
__PARTY.ice = 5;
A.startHack(B('blacksite', 2));
h = G.hack;
h.blocks = [{ x: 50, lane: 1 }];
A.useIce();
ok(!h.blocks.length && __PARTY.ice === 4, 'an icebreaker clears the firewall’s ICE');
reset();
A.startHack(B('precinct', 2));
h = G.hack;
const t0 = h.left;
A.useIce();
ok(h.left > t0, 'an icebreaker buys the trace time');
reset();
A.startHack(B('hideout', 2));
h = G.hack;
A.useIce();
ok(h.phase === 'input' && h.i === 1, 'an icebreaker enters the next pad of the pattern');
reset();
for (const p of __PL()) delete p.sk.probe;
const easy = (() => {
  A.startHack(B('precinct', 2));
  const t = G.hack.time;
  reset();
  return t;
})();
for (const p of __PL()) p.sk.probe = 1;
A.startHack(B('precinct', 2));
ok(G.hack.time > easy, 'Port Scanner gives the newer locks more time');
reset();
A.startHack(B('hideout', 2));
A.setMode('hack');
ok(
  /Crack the keypad/.test(els.ov._h) && /data-a="hkdir:up"/.test(els.ov._h),
  'the card explains the lock and has pads to tap'
);
click('hkdir:' + G.hack.seq[0]);
ok(G.hack.i === 0, 'pads work by click too (ignored while the pattern plays)');
reset();
