/* Story and presentation: scenes in the engine, music with a calm and a full mood, and the accessibility
 * settings (motion, contrast, colour-blind safe colours, remappable keys, a double-tap heavy blow). */
'use strict';
require('./harness');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.tips = false;
A.prefs.story = true;
G.pendArch = ['runner', 'samurai'];
A.newRun(false);
A.startStage(0);
const P = __PL()[0];
const press = (k, n) => {
  key(k, false);
  step(1);
  key(k, true);
  step(n || 2);
  key(k, false);
  step(1);
};

/* ---------- scenes ---------- */
ok(G.cut && G.cut.lines[0].who === 'comms', 'a district opens with Juno on comms');
const x0 = P.x,
  t0 = G.cut.t;
key('KeyD', true);
step(20);
key('KeyD', false);
ok(P.x === x0 && G.cut.t > t0, 'the street holds still while the scene plays');
press('KeyJ');
ok(G.cut && G.cut.i === 0, 'a press too soon does not skip a line');
step(30);
press('KeyJ');
ok(G.cut && G.cut.i === 1 && G.cut.lines[1].who === 'p', 'PUNCH moves on to the runner’s reply');
step(30);
press('KeyJ');
ok(!G.cut, 'and the last line ends the scene');
A.startStage(0);
ok(!G.cut, 'a scene plays once per run');
A.newRun(false);
A.startStage(1);
ok(G.cut, 'a new run hears it again');
press('KeyO');
ok(!G.cut, 'DODGE skips the whole scene');
step(400);
for (let i = 0; i < 400 && G.cut; i++) step(1);
ok(!G.cut, 'an unanswered line moves on by itself');
A.newRun(false);
A.startStage(0);
G.cut = null;
const boss = A.spawnEnemy('troll', 1);
ok(
  A.cutBoss(boss) && G.cut.lines[0].who === 'boss' && A.cutSpeaker() === boss,
  'bosses get a word as they arrive'
);
G.cut = null;
const re = A.spawnEnemy('blade', 1);
re.rematch = true;
ok(!A.cutBoss(re), 'but not a rematch');
A.prefs.story = false;
A.newRun(false);
A.startStage(2);
ok(!G.cut, 'Settings → Story scenes off: none');
A.prefs.story = true;
G.cut = { key: 'x', lines: [{ who: 'p', s: 'test' }], i: 0, t: 0 };
A.resetWorld();
ok(!G.cut, 'a scene never outlives the street it was on');
G.pendArch = ['runner', 'samurai'];
A.startArena(false);
ok(!G.cut, 'no scenes in the Arena');
ok(
  Object.keys(A.CUTS.boss).every(k => A.DEF[k] && A.DEF[k].boss),
  'every boss scene belongs to a boss'
);
ok(A.CUTS.open.length === A.STAGES.length, 'every district has an opening scene');

/* ---------- music moods ---------- */
A.newRun(false);
A.startStage(0);
G.cut = null;
A.M.cur = 'd0';
G.ents = G.ents.filter(e => e.team !== 1);
ok(A.musicCalmNow(), 'with no foes up, a district song plays its calm loop');
A.spawnEnemy('ganger', 1);
ok(!A.musicCalmNow(), 'with foes up, the full track');
A.M.cur = 'boss';
ok(!A.musicCalmNow(), 'the boss song never goes calm');

/* ---------- accessibility ---------- */
A.prefs.motion = 'reduced';
A.applyPrefs();
ok(A.RM === true, 'Motion: Reduced turns reduced motion on');
A.prefs.motion = 'full';
A.applyPrefs();
ok(A.RM === false, 'Motion: Full turns it off');
A.prefs.motion = 'auto';
A.prefs.contrast = true;
A.prefs.cb = true;
A.applyPrefs();
ok(
  A.goodCol() === '#45d2ff' && A.badCol() === '#ffa630' && A.afxCol('leech') !== '#7dffb0',
  'colour-blind safe: blue and orange, and no green leech'
);
A.prefs.contrast = A.prefs.cb = false;
A.applyPrefs();
ok(A.goodCol() === '#7dffb0', 'and back to the usual palette');
A.setMode('settings');
ok(
  /Accessibility/.test(els.ov._h) && /Story scenes/.test(els.ov._h) && /Change keys/.test(els.ov._h),
  'Settings lists the accessibility options'
);
click('keys');
ok(/data-a="rebind:0:punch"/.test(els.ov._h), 'the key table opens');
click('rebind:0:punch');
ok(G.rebind && G.rebind.a === 'punch', 'click a key to change it');
key('KeyN', true);
key('KeyN', false);
ok(
  !G.rebind && A.KA.KeyN === 'punch' && !A.KA.KeyJ && A.prefs.keys['0'].punch === 'KeyN',
  'the next key pressed takes over'
);
click('rebind:0:kick');
key('Escape', true);
key('Escape', false);
ok(!G.rebind && A.KA.KeyK === 'kick', 'Escape cancels');
click('rebind:0:jump');
key('KeyP', true);
key('KeyP', false);
ok(G.rebind && A.KA.Space === 'jump', 'pause keys can’t be taken');
key('Escape', true);
key('Escape', false);
click('rebind:1:kick');
key('KeyN', true);
key('KeyN', false);
ok(A.KB.KeyN === 'kick' && !A.KA.KeyN, 'a key reused for the other runner leaves its old job');
click('keysreset');
ok(A.KA.KeyJ === 'punch' && A.KA.KeyN === undefined && A.KB.Period === 'kick', 'Reset all keys');
A.setMode('play');
// the double-tap heavy blow
const R = __PL()[0];
A.prefs.heavyTap = true;
G.ents = G.ents.filter(e => e.team !== 1);
A.setS(R, 'idle');
press('KeyJ', 1);
step(4);
press('KeyJ', 1);
ok(R.tapCharge, 'Heavy blow: Double-tap starts the charge with two quick punches');
step(40);
ok(R.chargeT >= 32, 'it charges without holding');
press('KeyJ', 1);
ok(R.state === 'heavy', 'and the next punch swings it');
A.prefs.heavyTap = false;
