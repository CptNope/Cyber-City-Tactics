/* Cyber City Tactics · src/js/modes/turf.js
 * Crew turf. Clear every crew building on a block (its hideouts and clubs) and the crew you stand best with
 * moves in, if they're at least warm to you (standing +10): the cleared doors carry their name, their people
 * walk the street instead of hostile gangs, and every time you move on to a new block, each block you hold
 * pays you a tithe. Let your standing with them drop below +10 and they cut ties: the turf is gone.
 *
 * The block's holder is G.wd.turf (saved with the block); the blocks you hold are PARTY.turfs, saved with the
 * Sprawl party.
 * Loaded as a classic script after sprawl.js: every file shares one global scope, in the order in index.html. */
'use strict';
const TURF_MIN = 10; // standing a crew needs to take a block, and to keep it
const TURF_MAX = 6; // blocks held at once (the oldest is let go)
const tithe = lv => 60 + lv * 30;
const turfs = () => (Array.isArray(PARTY.turfs) ? PARTY.turfs.filter(t => isObj(t) && FACTIONS[t.crew]) : []);
const crewBuildings = w =>
  w.street.buildings.filter(b => (b.type === 'hideout' || b.type === 'club') && CREWS.includes(b.fac));

/** After a cache is looted: was that the block's last crew building? Then someone moves in. */
function turfCheck() {
  const w = G.wd;
  if (!w || w.turf) return;
  const cb = crewBuildings(w);
  if (!cb.length || !cb.every(b => w.looted.includes(b.id))) return;
  const crew = CREWS.slice().sort((a, b) => facStand(b) - facStand(a))[0];
  const p = alive()[0];
  if (facStand(crew) < TURF_MIN) {
    if (p) say(p, 'NOBODY STEPS IN', '#a79dc2', 90, 90);
    tip('turf', 'Clear a block of its crews while one of them is warm to you (+10) and they take it over.');
    return;
  }
  w.turf = crew;
  const list = turfs().filter(t => t.lv !== w.level);
  list.push({ lv: w.level, crew });
  while (list.length > TURF_MAX) list.shift();
  PARTY.turfs = list;
  if (list.length >= 3) feat('turf');
  const F = FACTIONS[crew];
  if (p) say(p, F.name.toUpperCase() + ' TAKE THE BLOCK', F.col, 100, 120);
  tip(
    'turf',
    `The ${F.name} hold this block now: their people walk the street, and every block you hold pays a tithe when you move on.`
  );
  saveWorld();
}
/** On the street each step: a friendly patrol now and then, and the turf lost if standing slips. */
function turfTick(w) {
  if (!w.turf) return;
  if (facStand(w.turf) < TURF_MIN) return turfLose(w.turf);
  w.turfT = (w.turfT === undefined ? 900 : w.turfT) - 1;
  if (w.turfT > 0) return;
  w.turfT = ri(2000, 2800);
  const p = alive()[0];
  if (!p || G.ents.some(e => e.turfPatrol && e.state !== 'dead')) return;
  const F = FACTIONS[w.turf],
    e = spawnSummon('crew', p, 1500, 1);
  e.turfPatrol = true;
  e.name = F.name + ' patrol';
  e.pal = Object.assign({}, e.pal, { hair: F.col, acc: F.col });
}
function turfLose(crew) {
  const F = FACTIONS[crew],
    held = turfs();
  if (!held.some(t => t.crew === crew) && !(G.wd && G.wd.turf === crew)) return;
  PARTY.turfs = held.filter(t => t.crew !== crew);
  if (G.wd && G.wd.turf === crew) G.wd.turf = null;
  const p = alive()[0];
  if (p) say(p, F.name.toUpperCase() + ' CUT TIES', '#ff3d4a', 100, 120);
}
/** Moving to a new block: every block still held pays up; any crew gone cold takes theirs back. */
function turfTithe() {
  let total = 0;
  for (const t of turfs()) {
    if (facStand(t.crew) < TURF_MIN) {
      turfLose(t.crew);
      continue;
    }
    total += tithe(t.lv);
  }
  if (total) {
    PARTY.creds += total;
    G.texts.push({ x: G.camX + W / 2, y: 130, z: 0, s: 'TITHE · ¥' + total, c: '#ffc63d', life: 110 });
  }
  G.titheLast = total;
  return total;
}
/** The safehouse's Lay low tab: what you hold and what it pays. */
function turfHtml() {
  const held = turfs();
  if (!held.length && !G.wd.turf)
    return `<div class="job"><div class="row" style="justify-content:space-between"><b>Turf</b><span class="st" style="color:var(--muted)">None yet</span></div>
    <span style="color:var(--muted);font-size:13px">Clear every hideout and club on a block while a crew is warm to you (+${TURF_MIN}) and they take the block over. Each block you hold pays a tithe every time you move on.</span></div>`;
  return `<div class="job"><div class="row" style="justify-content:space-between"><b>Turf</b><span class="st" style="color:var(--gold)">¥${held.reduce((t, x) => t + tithe(x.lv), 0)} a block</span></div>
    <span style="color:var(--muted);font-size:13px">${held
      .map(
        t =>
          `Block ${t.lv}: <b style="color:${FACTIONS[t.crew].col}">${esc(FACTIONS[t.crew].name)}</b> (¥${tithe(t.lv)})`
      )
      .join(' · ')}. Keep them at +${TURF_MIN} or better or they cut ties.</span></div>`;
}
