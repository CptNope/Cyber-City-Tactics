/* The Gauntlet: a roguelite run through every district in a random order, one life, a mutator a district,
 * perks instead of the Den, seeds, the gauntlet of the day, scoring, and never touching the campaign save. */
'use strict';
require('./harness');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.tips = false;
G.pendArch = ['samurai', 'runner'];
const campaign = JSON.stringify({ v: 4, phase: 'den', stage: 3, diff: 1, party: {}, runners: [] });
localStorage.setItem('cs_save3', campaign);

/* ---------- seeds and the plan ---------- */
const code = A.seedCode('gauntlet', 123456789);
ok(/^G-[0-9A-Z]+$/.test(code) && A.parseSeed(code).mode === 'gauntlet', 'Gauntlet seeds read G-XXXX');
ok(A.parseSeed(code.toLowerCase()).seed === 123456789, 'and parse back, in any case');
const p1 = A.gauntPlan(123456789),
  p2 = A.gauntPlan(123456789),
  p3 = A.gauntPlan(987654321);
ok(JSON.stringify(p1) === JSON.stringify(p2), 'the same seed makes the same run');
ok(JSON.stringify(p1.order) !== JSON.stringify(p3.order), 'another seed, another order');
ok(
  p1.order.length === A.STAGES.length && [...p1.order].sort().join() === A.STAGES.map((_, i) => i).join(),
  'every district, once each'
);
ok(
  p1.muts.every(m => A.GAUNT_MUTS.includes(m)) && !A.GAUNT_MUTS.includes('iron'),
  'each with a mutator (never One Life, which is the rule anyway)'
);
ok(/^G-/.test(A.gauntDayCode()) && A.gauntDayCode() === A.gauntDayCode(), 'there is a gauntlet of the day');

/* ---------- the pick screen ---------- */
click('gauntpick');
ok(
  G.mode === 'gauntpick' && /One life\. Every district\./.test(els.ov._h),
  'the title has a Gauntlet screen'
);
ok(
  /Gauntlet of the day/.test(els.ov._h) && /data-a="gauntseed1"/.test(els.ov._h),
  'with today’s run and a seed box'
);
document.getElementById = id => (id === 'gauntSeed' ? { value: 'A-1234' } : null);
click('gauntseed1');
ok(G.mode === 'gauntpick' && /isn't a Gauntlet code/.test(els.ov._h), 'an Arena code is turned away');

/* ---------- a run ---------- */
document.getElementById = id => (id === 'gauntSeed' ? { value: code } : null);
click('gauntseed1');
const g = G.gaunt;
ok(g && g.code === code && G.mode === 'brief', 'a seed starts that run at its first briefing');
ok(
  G.stage === p1.order[0] && G.muts.length === 1 && G.muts[0] === p1.muts[0],
  'in its first district, with its mutator'
);
ok(
  /Gauntlet · district 1 of/.test(els.ov._h) && !/data-a="notyet"/.test(els.ov._h),
  'the briefing says where in the run you are'
);
ok(__PL().every(p => p.lives === 1) && A.maxLives() === 1, 'one life each');
ok(localStorage.getItem('cs_save3') === campaign, 'the campaign save is left alone');
// a late district drawn first plays like a first one: foes scale with how deep you are, not which district
{
  const st = G.stage,
    rr = Math.random;
  Math.random = () => 0.99;
  G.stage = 5;
  const deep = A.spawnEnemy('ganger', 1).hp;
  const gg = G.gaunt;
  G.gaunt = null;
  const camp = A.spawnEnemy('ganger', 1).hp;
  G.gaunt = gg;
  G.stage = 0;
  const first = A.spawnEnemy('ganger', 1).hp;
  Math.random = rr;
  G.stage = st;
  G.ents = G.ents.filter(e => e.team !== 1);
  ok(
    deep === first && camp > deep,
    `foes scale by depth in the run (${deep} here, ${camp} in the campaign's district 6)`
  );
}
click('go');
ok(G.mode === 'play' && !G.cut, 'Take the job: no story scenes (the order is random)');
A.stageClear();
G.afterOutro();
ok(G.mode === 'perk' && g.i === 1 && G.perks.length === 3, 'a district cleared: pick a perk');
ok(!G.perks.includes('life'), 'never a second life');
ok(/Gauntlet · 1 of/.test(els.ov._h), 'the perk card says how far you are');
ok(localStorage.getItem('cs_save3') === campaign, 'still no save');
const pk = G.perks[0];
click('perk:' + pk);
ok(
  G.mode === 'brief' && G.stage === p1.order[1] && G.muts[0] === p1.muts[1],
  'then straight to the next district'
);
ok(g.perks[0] === pk && /Perks: /.test(els.ov._h), 'and the perk is on the run');

// fall
click('go');
for (const p of __PL()) {
  p.lives = 0;
  p.inv = 0;
  A.hurt(p, 99999, 1, {});
}
for (let i = 0; i < 400 && G.mode === 'play'; i++) step(1);
ok(
  G.mode === 'gauntover' && G.gres && !G.gres.win && G.gres.cleared === 1,
  'the last runner down ends the run'
);
ok(
  /Flatlined in/.test(els.ov._h) && /✓ Cleared/.test(els.ov._h) && /Fell here/.test(els.ov._h),
  'the card shows how far you got'
);
ok(new RegExp(code).test(els.ov._h) && /\?seed=G-/.test(A.gauntShareLine()), 'and a line to share the seed');
const rec = A.store.load('cs_gaunt');
ok(
  rec && rec.runs === 1 && rec.best.score === G.gres.score && rec.best.code === code,
  'the best run is kept'
);
ok(
  G.gres.score >= 1000 && G.gres.score === A.gauntScore(G.gaunt, false),
  'scored by how deep you got (1,000 a district)'
);
ok(localStorage.getItem('cs_save3') === campaign, 'a run lost never touches the campaign save');

// again, on the same seed
click('gauntagain');
ok(
  G.gaunt.code === code && G.gaunt.i === 0 && G.stage === p1.order[0],
  'Same seed again: the same run from the top'
);

/* ---------- winning ---------- */
click('go');
G.gaunt.i = G.gaunt.order.length - 1;
G.stage = G.gaunt.order[G.gaunt.i];
A.stageClear();
G.afterOutro();
ok(
  G.mode === 'gauntover' && G.gres.win && G.gres.cleared === A.STAGES.length,
  'the last district cleared wins the run'
);
ok(A.LEG.feats.gauntwin, 'and earns No Second Chances');
ok(localStorage.getItem('cs_save3') === campaign, 'and a win doesn’t delete the campaign save either');

/* ---------- the gauntlet of the day ---------- */
click('gauntpick');
click('gauntday1');
ok(
  G.gaunt.daily && G.gaunt.code === A.gauntDayCode() && G.diff === 1,
  'today’s run: today’s seed, on Runner'
);
A.gauntEnd(false);
ok(
  A.store.load('cs_gaunt').day && A.store.load('cs_gaunt').day.id === A.dayId(new Date()),
  'and today’s best is kept'
);

/* ---------- leaving ---------- */
A.startArena(false);
ok(!G.gaunt && A.maxLives() === 3, 'the Arena afterwards is no Gauntlet');
A.newRun(false);
ok(!G.gaunt, 'nor is a campaign run');
location.search = '?seed=' + code;
A.pwaShortcut();
ok(
  G.mode === 'gauntpick' && G.gauntPre === code && new RegExp('value="' + code).test(els.ov._h),
  'a shared ?seed=G- link opens the Gauntlet with it filled in'
);
location.search = '';
