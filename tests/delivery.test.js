/* The delivery run (Fragile Cargo): cargo with its own bar, what crashes and hits cost, pay by what arrives,
 * the mint bonus, and losing it all. */
'use strict';
require('./harness');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.tips = false;
A.prefs.seen.trainoffer = true;
const quiet = () => {
  G.ents = G.ents.filter(e => e.kind === 'player');
  const D = G.drive;
  D.spawnX = D.carX = D.oilX = D.pcarX = 1e9;
  D.boss = true;
};
const finish = () => {
  quiet();
  G.camX = A.DRIVE_JOBS.delivery.len;
  __PL()[0].x = G.camX + 200;
  for (let i = 0; i < 200 && G.mode === 'play'; i++) step(1);
};

click('jobs');
ok(
  /Fragile Cargo/.test(els.ov._h) && /drive:delivery:1/.test(els.ov._h),
  'the Jobs board has the delivery run'
);
click('drive:delivery:1');
const D = G.drive,
  p = __PL()[0];
ok(D.cargo === 100, 'the cargo starts whole');
quiet();
p.inv = 0;
A.driveCrash(p, 40, 5);
ok(D.cargo === 88, 'a crash costs 12%');
p.bk.crash = 0;
p.inv = 0;
A.setS(p, 'ride');
const rr = Math.random;
Math.random = () => 0.99; // no knock off balance on this hit
A.driveHurt(p, 10);
Math.random = rr;
ok(D.cargo === 82, 'a hit costs some too (six tenths of the damage)');
p.bk.crash = 0;
p.inv = 0;
p.hp = 5;
A.driveCrash(p, 40, 9);
ok(D.cargo === 57, 'a wreck costs a quarter');
for (let i = 0; i < 160; i++) step(1);
const cr0 = __PARTY.creds;
finish();
ok(
  G.mode === 'driveover' && G.dresult.win && Math.ceil(G.dresult.cargo) === 57,
  'delivered with 57% of the cargo'
);
const J = A.DRIVE_JOBS.delivery;
ok(
  __PARTY.creds - cr0 === G.dresult.pay &&
    G.dresult.pay < J.pay + 300 &&
    G.dresult.pay >= Math.round(J.pay * 0.57),
  'paid for the share that arrived'
);
ok(/57% arrived/.test(els.ov._h) && !/mint/.test(els.ov._h), 'the card shows the cargo');

// a clean run
A.setMode('title');
click('jobs');
click('drive:delivery:1');
finish();
ok(
  G.dresult.win && G.dresult.mint && /mint/.test(els.ov._h) && A.LEG.feats.mint,
  'nine tenths or more: a mint bonus, and Handle With Care'
);

// lose it all
A.setMode('title');
click('jobs');
click('drive:delivery:1');
quiet();
const q = __PL()[0];
for (let i = 0; i < 12 && G.drive && !G.drive.done; i++) {
  q.bk.crash = 0;
  q.inv = 0;
  A.driveCrash(q, 10, 1);
}
ok(G.drive.done && !G.drive.win && G.drive.cargoLost, 'all the cargo gone: the job is over');
for (let i = 0; i < 200 && G.mode === 'play'; i++) step(1);
ok(
  G.mode === 'driveover' && /Cargo lost/.test(els.ov._h) && /broken glass/.test(els.ov._h),
  'and the card says why'
);
// time running out says so instead
A.setMode('title');
click('jobs');
click('drive:delivery:1');
quiet();
G.dtime = J.time;
for (let i = 0; i < 200 && G.mode === 'play'; i++) step(1);
ok(/Too late/.test(els.ov._h) && /thawed/.test(els.ov._h), 'out of time: too late, not lost');
// other driving jobs carry no cargo
A.setMode('title');
click('jobs');
click('drive:causeway:1');
ok(G.drive.cargo == null, 'the other driving jobs carry no cargo');
