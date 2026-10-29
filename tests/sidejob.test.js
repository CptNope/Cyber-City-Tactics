/* Juno's side jobs in the campaign (modes/jobs.js): offered on her card in the Den, run with the campaign's
 * own runners, and on the way back the take goes into the party bag, the karma onto the runners, and the
 * job is marked off in the save. */
'use strict';
require('./harness');
const G = __G,
  A = __api,
  PARTY = __PARTY;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.seen.trainoffer = true;
A.prefs.tips = false;
G.pendArch = ['runner', 'samurai'];
click('pick');
click('new');
G.stage = 0;
A.enterDen();
const P0 = __PL()[0];
P0.lvl = 7;
A.refresh(P0);
PARTY.creds = 50;
const bag0 = PARTY.bag.length;
A.saveGame('den');
A.openNPC('juno');
ok(
  /Side job · The Causeway Run/.test(els.ov._h) && /data-a="cjob"/.test(els.ov._h),
  'Juno offers a side job in the Den'
);
click('cjob');
const p = __PL()[0];
ok(G.drive && G.cjob && G.mode === 'play', 'taking it starts the driving job');
ok(p.lvl === 7 && p.arch === 'runner', 'with the campaign runner, level and all (not a fresh level-4)');
ok(PARTY.creds === 0, 'the job has its own wallet');
// play it out: some karma on the way, some loot, then the finish line
A.jobKarma(40);
PARTY.creds = 120;
PARTY.bag.push(A.randItem(2, false));
A.driveEnd(true);
for (let i = 0; i < 400 && G.mode !== 'driveover'; i++) step(1);
ok(G.mode === 'driveover' && /Back to the Den/.test(els.ov._h), 'results card: Back to the Den');
ok(
  !/data-a="driveagain"/.test(els.ov._h) && !/jobbank/.test(els.ov._h),
  'no replay or banking on a side job'
);
const take = G.dresult.take,
  karma = G.cjob.karma;
ok(karma >= 40, `karma counted for the trip back (${karma})`);
click('cjobback');
const q = __PL()[0];
ok(G.den && G.mode === 'npc' && G.npc === 'juno' && !G.cjob && !G.drive, 'back in the Den, at Juno');
ok(PARTY.creds === 50 + take.creds, `the take is in the party wallet (¥50 + ¥${take.creds})`);
ok(PARTY.bag.length === bag0 + take.items.length, 'and the gear in the bag');
ok(q.lvl > 7 || q.karma > 0, `karma on the runner (level ${q.lvl}, ${q.karma} karma)`);
const s = A.store.load('cs_save3');
ok(s.sideJobs && s.sideJobs[0].win && s.party.creds === PARTY.creds, 'saved: job done, creds in the save');
ok(/Done/.test(els.ov._h) && !/data-a="cjob"/.test(els.ov._h), 'Juno shows it done, no second offer');
// the next Den has a new job
G.stage = 1;
A.enterDen();
A.openNPC('juno');
ok(/A drone job/.test(els.ov._h) && /data-a="cjob"/.test(els.ov._h), 'the next Den: a drone job');
click('cjob');
ok(G.stealth && G.cjob && __PL()[0].drone, 'it flies with the campaign runner');
// quitting mid-job: back to the title, the campaign as it was in the Den
click('quit');
ok(!G.cjob && G.mode === 'title', 'quitting drops the job');
click('cont');
ok(G.den && A.store.load('cs_save3').sideJobs[1] === undefined, 'Continue: the Den, job still on offer');
// the Jobs board is untouched by all this
click('quit');
click('jobs');
click('drive:causeway:1');
ok(G.drive && !G.cjob && __PL()[0].lvl === 4, 'a Jobs-board run is still a fresh level-4 crew');
