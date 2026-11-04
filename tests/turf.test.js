/* Crew turf in the Sprawl: clearing a block's crews hands it to a friendly crew, who patrol it, keep hostile
 * gangs off it and pay a tithe for every block held, until your standing with them slips. */
'use strict';
require('./harness');
const G = __G,
  A = __api,
  PARTY = __PARTY;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.tips = false;
G.pendArch = ['samurai', 'runner'];
const w = () => G.wd;
// some blocks have no crew buildings at all: start on (and move on to) ones that do
const crewWorld = () => {
  for (let i = 0; i < 40; i++) {
    A.startWorld(false);
    step(2);
    if (A.crewBuildings(w()).length >= 2) return;
  }
};
const nextCrewBlock = () => {
  for (let i = 0; i < 40; i++) {
    G.mode = 'safe';
    click('newblock');
    if (A.crewBuildings(w()).length) return;
  }
};
crewWorld();
const clearCrews = () => {
  for (const b of A.crewBuildings(w())) if (!w().looted.includes(b.id)) w().looted.push(b.id);
};
const cb = A.crewBuildings(w());
ok(cb.length > 0, `the block has crew buildings (${cb.length})`);

/* ---------- nobody warm: nobody steps in ---------- */
w().fac = {};
clearCrews();
A.turfCheck();
ok(!w().turf && !A.turfs().length, 'clear the crews with nobody warm to you: the block stays nobody’s');

/* ---------- a warm crew takes it ---------- */
w().fac = { fang: 25, rust: -30 };
A.turfCheck();
ok(
  w().turf === 'fang' && A.turfs().length === 1 && A.turfs()[0].crew === 'fang',
  'with the Neon Fangs warm (+25), they take the block'
);
ok(A.turfs()[0].lv === w().level, 'and it’s on your books');
// not until every crew building is clear
crewWorld();
w().fac = { fang: 25 };
const first = A.crewBuildings(w())[0];
w().looted.push(first.id);
A.turfCheck();
ok(
  A.crewBuildings(w()).length === 1 ? w().turf === 'fang' : !w().turf,
  'one door of several cleared: not yet'
);
clearCrews();
A.turfCheck();
ok(w().turf === 'fang', 'every one: theirs');

/* ---------- on the street ---------- */
A.setMode('play');
G.ents = G.ents.filter(e => e.team !== 1 && e.kind !== 'ally');
w().patT = 1;
w().heat = 0;
w().copT = 1e9;
step(2);
ok(
  !G.ents.some(e => e.team === 1 && ['ganger', 'orc', 'shaman'].includes(e.kind)),
  'no hostile gang patrols on a held block'
);
w().turfT = 1;
step(2);
const pat = G.ents.find(e => e.turfPatrol);
ok(pat && pat.team === 0 && /Neon Fangs patrol/.test(pat.name), 'the Fangs walk it instead');

/* ---------- the tithe ---------- */
PARTY.creds = 0;
G.safeTab = 'lay';
A.setMode('safe');
ok(/Turf/.test(els.ov._h) && /Neon Fangs/.test(els.ov._h), 'the safehouse lists your turf');
const lv = w().level;
G.mode = 'safe';
click('newblock');
ok(
  PARTY.creds === A.tithe(lv) && G.titheLast === A.tithe(lv),
  `moving on, the block pays a tithe (¥${A.tithe(lv)})`
);
ok(!w().turf, 'the new block is nobody’s yet');
if (!A.crewBuildings(w()).length) nextCrewBlock();

/* ---------- three blocks: Landlord ---------- */
for (let i = 0; i < 2; i++) {
  w().fac = Object.assign({}, w().fac, { fang: 25 });
  clearCrews();
  A.turfCheck();
  nextCrewBlock();
}
ok(A.turfs().length === 3 && A.LEG.feats.turf, 'hold three: Landlord');
const sum = A.turfs().reduce((t, x) => t + A.tithe(x.lv), 0);
PARTY.creds = 0;
A.turfTithe();
ok(PARTY.creds === sum, 'each block held pays every time');

/* ---------- standing slips ---------- */
w().fac.fang = 5;
PARTY.creds = 0;
A.turfTithe();
ok(
  PARTY.creds === 0 && !A.turfs().length,
  'let the Fangs cool below +10 and they cut ties: no turf, no tithe'
);
w().fac.fang = 25;
clearCrews();
A.turfCheck();
A.setMode('play');
w().fac.fang = 0;
step(2);
ok(!w().turf, 'lose them while you stand on their block and it goes at once');

/* ---------- saved ---------- */
w().fac.saint = 40;
w().turf = null;
clearCrews();
A.turfCheck();
A.saveWorld();
const sw = JSON.parse(localStorage.getItem('cs_world'));
ok(
  sw.wd.turf === 'saint' && sw.party.turfs.some(t => t.crew === 'saint'),
  'turf is saved with the block and the party'
);
sw.wd.turf = 'nonsense';
sw.party.turfs = 'junk';
A.loadWorld(sw);
ok(w().turf === null && Array.isArray(PARTY.turfs), 'and a junk save is cleaned up');
A.newRun(false);
ok(PARTY.turfs.length === 0, 'a campaign party holds no turf');
