/* Choices that change the campaign: Vesper's books and Voss's backup core, their effects and the four endings. */
require('./harness');
const G = __G,
  A = __api,
  PARTY = __PARTY;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
const vm = require('vm');
G.pendArch = ['runner', 'samurai'];
click('pick');
click('new');
ok(JSON.stringify(G.choices) === '{}', 'a fresh run starts with no choices made');
// after the Undercity Market: the books
G.stage = 3;
A.enterDen();
ok(A.pendingChoice() === 'books', "after the Market, Juno needs an answer about Vesper's books");
A.openNPC('juno');
ok(
  /data-a="choose:books:sell"/.test(els.ov._h) && /data-a="nextjob" disabled/.test(els.ov._h),
  'she asks, and the next job waits'
);
click('nextjob');
ok(G.mode === 'npc', "taking the next job doesn't skip the question");
const c0 = PARTY.creds;
click('choose:books:sell');
ok(A.choiceOf('books') === 'sell' && PARTY.creds === c0 + 250, 'selling them pays ¥250');
ok(!A.pendingChoice() && !/data-a="nextjob" disabled/.test(els.ov._h), 'then the next job opens');
click('choose:books:leak');
ok(A.choiceOf('books') === 'sell', "and you can't take it back");
const arc = A.STAGES[4],
  w0 = arc.waves[0];
ok(
  A.choiceSpawn(4, w0).length === w0.spawn.length + 1,
  'sold: Kagemori knows, an extra guard in every Arcology wave'
);
G.choices = { books: 'leak' };
ok(A.choiceSpawn(4, w0).length === w0.spawn.length - 1, 'leaked: one guard fewer');
ok(
  A.choiceSpawn(4, arc.waves[arc.waves.length - 1]).length === arc.waves[arc.waves.length - 1].spawn.length,
  'the boss wave is never touched'
);
// after the Arcology: Voss's core
G.stage = 4;
ok(A.pendingChoice() === 'voss', "after the Arcology: Voss's backup core");
G.choices.voss = 'wipe';
const host = A.STAGES[5],
  withVoss = host.waves.find(w => w.spawn.includes('archmage!'));
ok(withVoss && !A.choiceSpawn(5, withVoss).includes('archmage!'), 'wiped: no Voss.exe in the host');
G.choices.voss = 'keep';
ok(A.choiceSpawn(5, withVoss).includes('archmage!'), 'kept: Voss.exe is waiting');
const ice = A.spawnEnemy('blackice', 1),
  full = ice.maxHp;
A.choiceBoss(ice);
ok(ice.maxHp === Math.round(full * 0.75), 'kept: the back door takes a quarter off Black ICE');
// endings
const texts = new Set();
for (const b of ['sell', 'leak'])
  for (const v of ['wipe', 'keep']) {
    G.choices = { books: b, voss: v };
    texts.add(A.endingText(true));
  }
ok(texts.size === 4, 'four different endings');
// saved with the run, cleared by a fresh one
G.choices = { books: 'leak', voss: 'keep' };
vm.runInThisContext('saveGame("den")');
G.choices = {};
vm.runInThisContext('loadGame(store.load("cs_save3"))');
ok(A.choiceOf('books') === 'leak' && A.choiceOf('voss') === 'keep', 'choices are saved with the run');
click('quit');
click('pick');
click('new');
ok(!A.choiceOf('books'), 'and a fresh run forgets them');
