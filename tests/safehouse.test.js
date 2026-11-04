/* Safehouse upgrades in the Sprawl: the med bay, the scanner, the bolt-hole and the armory, bought once and kept
 * with the Sprawl save; and a fresh party never inheriting crew or upgrades from another mode. */
'use strict';
require('./harness');
const G = __G,
  A = __api,
  PARTY = __PARTY;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.tips = false;
G.pendArch = ['samurai', 'runner'];
A.startWorld(false);
step(5);

/* ---------- the Upgrades tab ---------- */
G.safeTab = 'home';
A.setMode('safe');
ok(
  /Upgrades/.test(els.ov._h) &&
    ['Med bay', 'Scanner', 'Bolt-hole', 'Armory'].every(n => els.ov._h.includes(n)),
  'the safehouse has an Upgrades tab with four upgrades'
);
PARTY.creds = 100;
ok(!A.buyUp('med') && !A.hasUp('med'), 'no upgrade without the creds');
PARTY.creds = 5000;
click('buyup:bolt');
ok(A.hasUp('bolt') && PARTY.creds === 4600 && /Built/.test(els.ov._h), 'buy one: it’s built');
ok(!A.buyUp('bolt') && PARTY.creds === 4600, 'and only once');

/* ---------- the bolt-hole ---------- */
G.wd.heat = 3;
ok(A.layCost(G.wd) === Math.round(60 * 3 * G.wd.level * 0.5), 'bolt-hole: laying low costs half');
G.safeTab = 'lay';
A.renderOv();
ok(
  /bolt-hole halves the price/.test(els.ov._h) && /every 12 seconds/.test(els.ov._h),
  'and the Lay low tab says so'
);
A.setMode('play');
G.ents = G.ents.filter(e => e.kind !== 'cop');
G.wd.copT = 1e9;
G.wd.heatT = 0;
step(10);
ok(G.wd.heatT >= 18, `heat cools twice as fast (${G.wd.heatT} in 10 steps)`);

/* ---------- the scanner ---------- */
const hid = G.wd.street.buildings.filter(b => b.hidden);
G.wd.found = [];
A.buyUp('scan');
ok(
  !hid.length || hid.every(b => G.wd.found.includes(b.id)),
  `scanner: the block’s hidden doors are found (${hid.length})`
);

/* ---------- the armory, on a new block ---------- */
A.buyUp('armory');
const P = __PL()[0],
  am = P.ammo;
PARTY.med = 2;
G.mode = 'safe';
click('newblock');
ok(P.ammo === am + 20 && PARTY.med === 3, 'armory: a new block starts with 20 more rounds and a medkit');
const hid2 = G.wd.street.buildings.filter(b => b.hidden);
ok(
  hid2.every(b => G.wd.found.includes(b.id)),
  'and the scanner finds the new block’s hidden doors on arrival'
);

/* ---------- the med bay ---------- */
A.buyUp('med');
ok(A.LEG.feats.homely, 'all four built: Home Sweet Home');
PARTY.creds = 1000;
A.worldWipe();
ok(PARTY.creds === 1000 && G.wipeMed && G.wd.medUsed, 'med bay: the first wipe on a block costs nothing');
ok(/med bay/.test(els.ov._h) && /<b>Doc<\/b>/.test(els.ov._h), 'and Doc says so');
A.worldWipe();
ok(PARTY.creds === 700 && !G.wipeMed, 'the second one costs as usual');
click('wake');

/* ---------- saved with the Sprawl ---------- */
A.saveWorld();
const sw = JSON.parse(localStorage.getItem('cs_world'));
ok(
  sw.party.safe.med && sw.party.safe.armory && sw.wd.medUsed === true,
  'upgrades and the med bay’s use are saved'
);
PARTY.safe = {};
A.loadWorld(sw);
ok(A.hasUp('med') && A.hasUp('scan') && G.wd.medUsed, 'and come back on load');

/* ---------- other modes start clean ---------- */
PARTY.crew = { kestrel: { loy: 4 } };
A.newRun(false);
ok(
  !A.hasUp('med') && Object.keys(PARTY.safe).length === 0 && Object.keys(PARTY.crew).length === 0,
  'a campaign run inherits no upgrades or crew'
);
A.startWorld(false);
ok(Object.keys(PARTY.safe).length === 0, 'nor does a fresh Sprawl');
PARTY.safe = { med: 1 };
A.startArena(false);
ok(!A.hasUp('med') && Object.keys(PARTY.safe).length === 0, 'and the Arena never has them');
