/* Robustness fixes from the full audit (wiki: Robustness-Audit).
 *  - corrupt or hand-edited saves are refused or repaired instead of crashing a menu
 *  - "Not yet" on a briefing from the Den keeps the Den's district
 *  - Juno's side job keeps the campaign's gear out of reach
 *  - a downed foe can be hauled up once per knockdown
 *  - a Swift rifle's burst fires the same four rounds, just faster
 *  - runner 2 dropping while runner 1 is already out ends the run
 *  - online: the friend's buttons and clicks are checked, prototype keys are ignored, ?lobby= is allowlisted */
'use strict';
require('./harness');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.tips = false;

/* ---------- saves ---------- */
const good = () => ({
  v: 4,
  stage: 1,
  runners: [{ arch: 'runner', lvl: 3, attr: { str: 4 }, eq: {}, cy: {}, sk: {} }],
  party: { creds: 100, bag: [] }
});
const shape = (k, v) => {
  localStorage.setItem(k, JSON.stringify(v));
  return A.store.load(k) !== null;
};
ok(shape('cs_save3', good()), 'a sound campaign save loads');
ok(!shape('cs_save3', Object.assign(good(), { diff: 7 })), 'a save with an unknown difficulty is refused');
ok(!shape('cs_save3', Object.assign(good(), { diff: '1' })), 'a difficulty that is a string is refused');
ok(!shape('cs_save3', Object.assign(good(), { runners: [null] })), 'a null runner is refused');
ok(
  !shape('cs_save3', Object.assign(good(), { runners: [{ eq: [] }] })),
  'a runner whose gear is an array is refused'
);
ok(!shape('cs_save3', Object.assign(good(), { stage: 99 })), 'a stage past the last district is refused');
ok(!shape('cs_arena', [{ score: 'lots', wave: 3 }]), 'an Arena record without a number score is refused');
ok(shape('cs_arena', [{ score: 10, wave: 3, diff: 1 }]), 'a sound Arena record loads');
localStorage.removeItem('cs_arena');

// loading fills what an old save lacks, with the right types
A.loadGame({
  stage: 1,
  runners: [{ arch: 'runner', lvl: 2, spells: 'x', tech: null }],
  party: { creds: 'NaN', bag: [null, 5] }
});
let P = __PL()[0];
ok(
  Array.isArray(P.spells) && A.isObj(P.tech) && A.isObj(P.eq) && A.isObj(P.attr),
  'a thin runner gets spells, techniques, gear and attributes back'
);
ok(__PARTY.creds === 0 && __PARTY.bag.length === 0, 'junk creds and bag entries are cleaned');
ok(G.diff === 1, 'a missing difficulty becomes Normal');

// the Sprawl: a world save without heat, rep or looted still loads
const ws = A.store;
A.prefs.seen.trainoffer = true;
G.pendArch = ['runner', 'samurai'];
A.newRun(false);
let threw = null;
try {
  A.loadWorld({ wd: { level: 2 }, runners: [{ arch: 'runner' }], party: {} });
} catch (e) {
  threw = e;
}
ok(
  !threw && G.wd && Number.isFinite(G.wd.heat) && Array.isArray(G.wd.looted),
  'a thin Sprawl save loads with defaults'
);

// a full or blocked store says so instead of failing silently
const realSet = localStorage.setItem;
localStorage.setItem = () => {
  throw new Error('QuotaExceededError');
};
const wrote = ws.set('cs_test', { a: 1 });
localStorage.setItem = realSet;
ok(wrote === false && ws.failed > 0, 'a save that cannot be written reports failure');

/* ---------- campaign flow ---------- */
A.newRun(false);
G.stage = 2;
A.briefing(3, true);
ok(G.stage === 3, 'the briefing moves on to the next district');
click('notyet');
ok(G.stage === 2 && G.mode === 'den', '"Not yet" goes back to the Den at its own district');

// Juno's side job: the campaign's gear can't be swapped out
P = __PL()[0];
G.cjob = { kind: 'drive' };
const w = P.eq.weapon;
G.sheetIdx = 0;
click('unequip:weapon');
ok(P.eq.weapon === w, 'gear is locked during a side job');
G.cjob = null;

/* ---------- combat ---------- */
A.newRun(true);
A.startStage(0);
G.wave = 99;
step(30);
G.ents = G.ents.filter(e => e.team !== 1);
P = __PL()[0];
const foe = A.spawnEnemy('ganger', 1);
foe.x = P.x + 14;
foe.y = P.y;
foe.inv = 0;
P.face = 1;
A.setS(foe, 'down');
foe.z = 0;
ok(A.haulTarget(P) === foe, 'a downed foe in front can be hauled up');
A.haulUp(P, foe);
A.releaseGrab(P);
A.setS(foe, 'down');
ok(A.haulTarget(P) !== foe, 'but only once per knockdown');
foe.st = 999;
foe.state = 'down';
for (let i = 0; i < 300 && foe.state === 'down'; i++) step(1);
ok(!foe.hauled, 'getting up resets it for the next knockdown');

// dropping runner 2 while runner 1 is already out ends the run
G.ents = G.ents.filter(e => e.team !== 1);
G.arena = false;
G.world = false;
__PL()[0].out = true;
A.dropRunner2();
ok(__PL().length === 1 && G.mode === 'over', 'runner 2 dropping with runner 1 out ends the run');

/* ---------- online ---------- */
const NET = A.NET;
ok(A.netInOk({ h: '0101000000000', c: { punch: 3 } }), 'a well-formed button report passes');
ok(!A.netInOk({ h: '01', c: {} }), 'a short button string is refused');
ok(!A.netInOk({ h: '0101000000002', c: {} }), 'a button string with other digits is refused');
ok(!A.netInOk({ h: '0000000000000', c: { punch: 'x' } }), 'a press counter that is not a number is refused');
ok(!A.netInOk({ h: '0000000000000', c: { hack: 1 } }), 'a press counter for an unknown button is refused');
A.newRun(true);
const Q = __PL()[1];
Q.spells = ['bolt'];
ok(A.netActOk('unequip:weapon'), 'a click on a real gear slot passes');
ok(!A.netActOk('unequip:__proto__'), 'a click naming __proto__ is refused');
ok(!A.netActOk('unequip:toString'), 'a slot the runner does not have is refused');
ok(!A.netActOk('gmod:nope'), 'an unknown gun mod is refused');
ok(A.netActOk('spell:0') && !A.netActOk('spell:4') && !A.netActOk('spell:-1'), 'spell picks stay in range');
ok(!A.netActOk('attr:str:x:y'), 'clicks with extra pieces are refused');
// the guest never lets a snapshot key reach an object's prototype
NET.ents = new Map();
A.netApply({
  e: [[1, JSON.parse('{"__proto__":{"evil":1},"x":5,"y":5,"kind":"ganger"}')]],
  o: [1],
  pl: [],
  fix: [],
  g: JSON.parse('{"__proto__":{"evil":1}}'),
  pr: [],
  np: [],
  nt: [],
  nf: [],
  sx: [],
  t: G.t,
  pa: JSON.parse('{"__proto__":{"evil":1},"creds":5,"bag":[]}')
});
ok(
  {}.evil === undefined && NET.ents.get(1).evil === undefined && __PARTY.evil === undefined,
  'snapshot prototype keys are ignored'
);
// ?lobby= only reaches our lobby or a local one
ok(
  A.netLobbyOk('http://localhost:8787') && A.netLobbyOk(A.NET_LOBBY),
  'a local lobby and the game’s own pass'
);
ok(!A.netLobbyOk('https://cct-lobby.someone.workers.dev'), 'someone else’s workers.dev lobby is refused');
ok(
  !A.netLobbyOk('https://evil.example') && !A.netLobbyOk('javascript:alert(1)'),
  'other lobby hosts are refused'
);
