/* Cyber City Tactics · src/js/systems/legend.js
 * Your legend across runs: feats, legend ranks, legendaries, lore shards, the bestiary and run history. Saved
 * under cs_legend.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
const FEATBY = {};
for (const f of FEATS) FEATBY[f.id] = f;
const LEG = Object.assign(
  { v: 1, feats: {}, kills: {}, lore: [], legs: [], stats: {} },
  isObj(store.get('cs_legend')) ? store.get('cs_legend') : {}
);
for (const [k, def] of [
  ['feats', {}],
  ['kills', {}],
  ['stats', {}],
  ['lore', []],
  ['legs', []]
])
  if (Array.isArray(def) ? !Array.isArray(LEG[k]) : !isObj(LEG[k])) LEG[k] = def;
let legDirty = false;
function saveLeg() {
  store.set('cs_legend', LEG);
  legDirty = false;
}
const legLP = () => Object.keys(LEG.feats).reduce((a, k) => a + (FEATBY[k] ? FEATBY[k].lp : 0), 0);
function rankOf(lp) {
  let r = 0;
  for (let i = 0; i < RANKS.length; i++) if (lp >= RANKS[i][0]) r = i;
  return r;
}
const legUnlocked = () => Object.keys(LEGS).filter(k => FEATS.some(f => f.leg === k && LEG.feats[f.id]));
const archLocked = k => !!(ARCH[k] && ARCH[k].locked && !LEG.feats[ARCH[k].locked]);
function feat(id) {
  if (LEG.feats[id] || G.training) return;
  const F = FEATBY[id];
  if (!F) return;
  LEG.feats[id] = Date.now();
  const nc = Object.keys(COATS).filter(k => COATS[k].feat === id);
  if (nc.length) {
    LEG.stats.coats = Object.keys(COATS).filter(k => COATS[k].feat && LEG.feats[COATS[k].feat]).length;
  }
  saveLeg();
  if (nc.length)
    setTimeout0(() => {
      featCheck('coats');
      (G.toasts = G.toasts || []).push({
        s: 'New coat: ' + COATS[nc[0]].name,
        d: 'Pick it when you start a run',
        life: 200,
        lore: true
      });
    });
  const extra = F.leg
    ? 'Unlocks ' + LEGS[F.leg].name + ' as a drop'
    : F.arch
      ? 'Unlocks the ' + ARCH[F.arch].name + ' archetype'
      : '+' + F.lp + ' legend';
  (G.toasts = G.toasts || []).push({ s: F.name, d: extra, life: 260 });
  sfx.level();
  buzz([20, 30, 20, 30, 40]);
}
function featCheck(k) {
  const v = LEG.stats[k] || 0;
  for (const F of FEATS) if (F.stat === k && v >= F.n) feat(F.id);
}
function bump(k, n) {
  if (G.training) return;
  LEG.stats[k] = (LEG.stats[k] || 0) + (n === undefined ? 1 : n);
  legDirty = true;
  featCheck(k);
}
function peak(k, v) {
  if (G.training) return;
  if (v > (LEG.stats[k] || 0)) {
    LEG.stats[k] = v;
    legDirty = true;
    featCheck(k);
  }
}
function mkLegend(id) {
  const L = LEGS[id],
    it = mkItem(L.slot, L.base, 3);
  it.name = L.name;
  it.leg = id;
  it.price = Math.round(BASES[L.slot][L.base].price * 4);
  return it;
}
function legendDrop(x, y, chance) {
  const pool = legUnlocked();
  if (!pool.length || Math.random() >= chance) return false;
  const fresh = pool.filter(k => !LEG.legs.includes(k));
  const id = fresh.length ? pick(fresh) : pick(pool);
  drop('gear', x, y, { item: mkLegend(id) });
  G.texts.push({ x, y, z: 80, s: 'LEGENDARY!', c: '#ff8a3d', life: 90, big: true });
  sfx.level();
  return true;
}
function shardDrop(x, y, chance) {
  if (G.training || Math.random() >= chance) return;
  drop('shard', x, y);
}
function gotShard(p) {
  const left = LORE.map((_, i) => i).filter(i => !LEG.lore.includes(i));
  if (!left.length) {
    PARTY.creds += 40;
    say(p, '+¥40 (OLD NEWS)', '#45d2ff', 70, 50, true);
    return;
  }
  const i = pick(left);
  LEG.lore.push(i);
  bump('shards');
  saveLeg();
  (G.toasts = G.toasts || []).push({
    s: 'Lore: ' + LORE[i][0],
    d: 'Read it in the Codex · ' + LEG.lore.length + '/' + LORE.length,
    life: 200,
    lore: true
  });
  sfx.loot();
}
function gotLegend(it) {
  if (!it || !it.leg) return;
  if (!LEG.legs.includes(it.leg)) {
    LEG.legs.push(it.leg);
    bump('legs');
    saveLeg();
  }
}
function logRun(mode, result, extra) {
  if (G.training || !PL.length) return;
  const p = PL[0];
  LEG.runs = LEG.runs || [];
  LEG.runs.unshift({
    mode,
    result,
    arch: p.arch,
    coop: !!G.coop,
    lvl: p.lvl,
    combo: G.bestCombo || 0,
    kills: (G.run || {}).kills || 0,
    extra: extra || '',
    date: new Date().toISOString().slice(0, 10)
  });
  LEG.runs = LEG.runs.slice(0, 20);
  saveLeg();
}
function onKill(t, ks) {
  if (t.team !== 1 || (t.d && t.d.passive) || G.training) return;
  bump('kills');
  if (t.elite) bump('elites');
  const k = t.kind;
  if (BEST[k]) {
    if (!LEG.kills[k]) {
      LEG.kills[k] = 0;
      LEG.stats.species = Object.keys(LEG.kills).filter(x => BEST[x]).length + 1;
      featCheck('species');
    }
    LEG.kills[k]++;
  }
  if (t.d && t.d.boss) {
    if (!G.dun && FEATBY['b_' + t.kind]) feat('b_' + t.kind);
    if (t.rematch) feat('rematch');
    legendDrop(t.x + 20, t.y + 6, G.dun ? 0.12 : 0.22);
    shardDrop(t.x - 20, t.y + 8, 0.5);
  }
  if (t.bounty) payBounty(t);
  if (t.kind === 'avatar') {
    feat('b_avatar');
    if (!LEG.legs.includes('lantern')) drop('gear', t.x, t.y + 10, { item: mkLegend('lantern') });
    shardDrop(t.x + 20, t.y, 1);
    (G.toasts = G.toasts || []).push({
      s: 'The lantern goes dark',
      d: 'Juno: "Ssareth will feel that one. Go home, legend."',
      life: 360,
      lore: true
    });
  }
  if (ks && PL.some(q => !q.out && legOf(q, 'gun') === 'lantern')) {
    for (const q of alive()) {
      q.hp = Math.min(q.maxHp, q.hp + Math.round(q.maxHp * 0.05));
      q.mp = Math.min(q.maxMp, q.mp + 5);
    }
  }
  if (t.courier) featCourier(t);
}
