/* Cyber City Tactics · src/js/game/rival.js
 * Vane, a rival runner. Vane turns up in three campaign districts (the Neon Market, the Undercity Market and the
 * Arcology) and on Sprawl blocks 2 and 4, fights with your own archetype's style, levels with you, and gets a
 * quarter tougher every meeting. Vane also remembers: the attack you leaned on hardest last time (fists and
 * feet, guns, spells or throws) is the one Vane is ready for, turning nearly a third of those away outright and
 * shrugging off some of the rest. Mix it up.
 *
 * The memory lives in your legend (LEG.rival), so it carries from run to run.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
const RIVAL_STAGES = [1, 3, 4]; // the campaign districts Vane turns up in
const RIVAL_BLOCKS = [2, 4]; // and the Sprawl blocks
const RIVAL_KINDS = { melee: 'fists and feet', gun: 'guns', spell: 'spells', throw: 'throws' };
const RIVAL_SAY = {
  first: 'Nice chrome. Shame about the runner wearing it.',
  melee: 'I watched the tapes. Lead with your fists again. Go on.',
  gun: 'Still hiding behind that gun? I know where it points now.',
  spell: 'Your spells are slow. I timed them.',
  throw: 'Grab me again. See what happens.'
};
const rivalRec = () => {
  if (!isObj(LEG.rival)) LEG.rival = { meets: 0, wins: 0, fav: null };
  const r = LEG.rival;
  r.meets = Math.max(0, +r.meets || 0);
  r.wins = Math.max(0, +r.wins || 0);
  if (!RIVAL_KINDS[r.fav]) r.fav = null;
  return r;
};
const rivalStyle = arch => (['gunslinger', 'rigger', 'decker'].includes(arch) ? 'burst' : 'dash');
function spawnRival(side) {
  const r = rivalRec(),
    arch = (PL[0] && PL[0].arch) || 'runner';
  const e = spawnEnemy('rival', side || 1);
  e.rivalArch = arch;
  e.eq = {}; // drawn as a runner, who has gear
  e.rivalFav = r.fav;
  e.taken = { melee: 0, gun: 0, spell: 0, throw: 0 };
  e.elite = null;
  e.mercy = 'rolled'; // a rival never begs
  const m = 1 + 0.25 * Math.min(4, r.meets);
  e.hp = e.maxHp = Math.round(e.maxHp * m);
  e.dmg = Math.round(e.dmg * (1 + 0.12 * Math.min(4, r.meets)));
  e.spT = 300;
  e.name = 'Vane · rival ' + (ARCH[arch] ? ARCH[arch].short.toLowerCase() : 'runner');
  r.meets++;
  legDirty = true;
  G.texts.push({ x: G.camX + W / 2, y: 140, z: 0, s: 'RIVAL · VANE', c: '#b98cff', life: 110, big: true });
  say(e, r.fav ? RIVAL_SAY[r.fav] : RIVAL_SAY.first, '#b98cff', 80, 160);
  tip('rival', 'Vane remembers how you won last time and is ready for it. Mix up your attacks.');
  return e;
}
/** What kind of attack a hit is, for Vane's memory. */
const hitKind = o => (o.thrownBy ? 'throw' : o.bullet ? 'gun' : o.magic ? 'spell' : o.melee ? 'melee' : null);
/** Every hit on Vane passes through here: noted, and turned away if it's the kind Vane is ready for. */
function rivalHit(t, o, dmg) {
  const k = hitKind(o);
  if (!k) return dmg;
  t.taken[k] = (t.taken[k] || 0) + Math.min(dmg, Math.max(0, t.hp)); // a finisher counts for what was left
  if (t.rivalFav !== k) return dmg;
  if (Math.random() < 0.3) {
    const word = k === 'gun' ? 'DODGED' : k === 'spell' ? 'WARDED' : k === 'throw' ? 'SLIPPED' : 'PARRIED';
    G.texts.push({ x: t.x, y: t.y, z: t.z + 60, s: word, c: '#b98cff', life: 30, sm: true });
    sfx.clank();
    return 0;
  }
  return dmg * 0.7;
}
/** Vane's special, every ten seconds: a dash strike, or for gun archetypes a three-round burst. */
function rivalTick(e, p) {
  if (e.spT > 0) {
    e.spT--;
    return false;
  }
  if (!['idle', 'walk'].includes(e.state) || Math.abs(p.y - e.y) > 20) return false;
  e.spT = 600;
  if (rivalStyle(e.rivalArch) === 'burst') {
    e.face = p.x >= e.x ? 1 : -1;
    for (let i = 0; i < 3; i++) fireBullet(e, e.dmg, e.z + 27, false);
    say(e, 'BULLET TIME', '#b98cff', 70, 40, true);
  } else {
    const dir = p.x >= e.x ? 1 : -1;
    e.x = clamp(p.x - dir * 18, G.camX + 12, G.camX + W - 12);
    e.y = p.y;
    e.face = dir;
    strike(e, 34, Math.round(e.dmg * 1.6), { kd: true, kb: 7, big: true });
    G.fx.push({ k: 'ring', x: e.x, y: e.y, z: 20, c: '#b98cff', life: 14, max: 14, r: 26 });
    say(e, 'TOO SLOW', '#b98cff', 70, 40, true);
  }
  return true;
}
/** Vane down: remember what did it, and what you'll face next time. */
function rivalDown(e) {
  const r = rivalRec(),
    ks = Object.keys(RIVAL_KINDS);
  const fav = ks.reduce((a, k) => ((e.taken[k] || 0) > (e.taken[a] || 0) ? k : a), ks[0]);
  r.fav = (e.taken[fav] || 0) > 0 ? fav : r.fav;
  r.wins++;
  legDirty = true;
  drop('cred', e.x, e.y, { v: 120 + 40 * Math.min(5, r.meets) });
  G.texts.push({
    x: e.x,
    y: e.y,
    z: 90,
    s: r.fav ? 'VANE WILL REMEMBER YOUR ' + RIVAL_KINDS[r.fav].toUpperCase() : 'VANE IS DOWN',
    c: '#b98cff',
    life: 120
  });
  if (r.wins >= 3) feat('rival');
}
/** Campaign: one meeting per listed district per run, with the wave before the boss. */
function rivalWave(wave) {
  if (!RIVAL_STAGES.includes(G.stage) || gauntOn() || G.arena || G.world || G.cjob) return;
  const S = STAGES[G.stage];
  if (wave !== S.waves.length - 2) return;
  G.run = G.run || {};
  G.run.rival = G.run.rival || {};
  if (G.run.rival[G.stage]) return;
  G.run.rival[G.stage] = 1;
  spawnRival(1);
}
/** The Sprawl: once on each listed block, a while after you arrive. */
function rivalStreet(w) {
  if (!RIVAL_BLOCKS.includes(w.level) || w.rivalDone) return;
  w.rivalT = (w.rivalT === undefined ? 1500 : w.rivalT) - 1;
  if (w.rivalT > 0 || G.ents.some(e => e.team === 1 && e.state !== 'dead' && !e.d.passive)) return;
  w.rivalDone = true;
  spawnRival(Math.random() < 0.5 ? -1 : 1);
}
