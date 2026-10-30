/* Foes scale with the party's level as well as the district; jobs keep their own tuning. */
'use strict';
require('./harness');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.seen.trainoffer = true;
A.prefs.tips = false;
G.pendArch = ['runner', 'samurai'];
A.newRun(false);
A.startStage(2);
G.wave = 99;
step(5);
const P = __PL()[0];
const hpAt = lvl => {
  P.lvl = lvl;
  const e = A.spawnEnemy('ganger', 1);
  e.elite = null;
  const r = { hp: e.maxHp, dmg: e.dmg };
  G.ents = G.ents.filter(x => x !== e);
  return r;
};
// elites roll at random; take the lowest of a few spawns as the plain value
const plain = lvl => {
  let best = null;
  for (let i = 0; i < 12; i++) {
    const r = hpAt(lvl);
    if (!best || r.hp < best.hp) best = r;
  }
  return best;
};
const lo = plain(1),
  hi = plain(11);
ok(hi.hp > lo.hp * 1.8 && hi.hp < lo.hp * 2.1, `a ganger at party level 11 has about 1.9x the health of level 1 (${lo.hp} → ${hi.hp})`);
ok(hi.dmg > lo.dmg * 1.6, `and hits harder (${lo.dmg} → ${hi.dmg})`);
ok(A.lvlMul().hp > 1.8, 'lvlMul follows the party');
// a drone job's guards don't scale with the crew
click('quit');
click('jobs');
click('stealth:clinic:1');
ok(A.lvlMul().hp === 1 && A.lvlMul().dmg === 1, 'jobs keep their own tuning');
