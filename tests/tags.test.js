/* Graffiti tags in the Sprawl: spraying a cleared crew building, the cred it earns, painters coming to cover
 * it, and stopping them. */
'use strict';
require('./harness');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.tips = false;
G.pendArch = ['samurai', 'runner'];
A.startWorld(false);
step(5);
const w = () => G.wd;
const b = A.crewBuildings(w())[0];
ok(b, 'a crew building to work with');
ok(!A.canTag(b), 'no tag on a building you haven’t cleaned out');
G.bsel = b;
A.setMode('bcard');
ok(!/data-a="spraytag"/.test(els.ov._h), 'and its card offers none');
w().looted.push(b.id);
A.renderOv();
ok(A.canTag(b) && /data-a="spraytag"/.test(els.ov._h), 'cleaned out: Spray your tag');
const rep0 = w().rep;
click('spraytag');
ok(
  A.tagsOf(w()).includes(b.id) && w().rep === rep0 + 3 && G.mode === 'play',
  'tagged: a little cred at once, back on the street'
);
ok(!A.canTag(b), 'once per building');
G.bsel = b;
A.setMode('bcard');
ok(/Your tag is on the wall/.test(els.ov._h), 'the card says it’s yours');
A.setMode('play');

/* ---------- cred over time ---------- */
G.ents = G.ents.filter(e => e.team !== 1);
w().paintT = 1e9;
w().patT = 1e9;
w().copT = 1e9;
const r1 = w().rep;
G.t = Math.ceil(G.t / 1800) * 1800 - 1;
step(3);
ok(w().rep === r1 + 1, 'each tag earns a point of cred every half minute');

/* ---------- a painter ---------- */
w().paintT = 1;
step(2);
let pn = G.ents.find(e => e.painter === b.id);
ok(pn && /painter/.test(pn.name), 'now and then the old owners send a painter');
pn.x = b.x - 22;
pn.y = A.FY0 + 8;
pn.paintT = 3;
for (let i = 0; i < 20 && A.tagsOf(w()).includes(b.id); i++) step(1);
ok(!A.tagsOf(w()).includes(b.id), 'left to it, they paint over the tag');
// tag again, and stop the painter this time
A.sprayTag(b);
w().paintT = 1;
step(2);
pn = G.ents.find(e => e.painter === b.id);
const r2 = w().rep;
pn.inv = 0;
A.hurt(pn, 3, 1, { src: __PL()[0], melee: true });
step(20);
ok(!pn.painter, 'hit a painter and they forget the wall and fight');
pn.inv = 0;
A.hurt(pn, 9999, 1, { src: __PL()[0], melee: true });
ok(
  A.tagsOf(w()).includes(b.id) && w().rep >= r2 + 2,
  'drop them and the tag stays, with a little extra cred'
);

/* ---------- saved ---------- */
A.saveWorld();
const sw = JSON.parse(localStorage.getItem('cs_world'));
ok(sw.wd.tags.includes(b.id), 'tags are saved with the block');
sw.wd.tags = ['x', 3, null];
A.loadWorld(sw);
ok(A.tagsOf(w()).length === 1 && A.tagsOf(w())[0] === 3, 'and a junk list is cleaned up');
ok(
  A.FEATS.find(f => f.id === 'tagger'),
  'Writer is a feat'
);
