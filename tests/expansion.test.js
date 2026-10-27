/* Mutators (Turbo, Fog, Split, Pacifist), block events (acid rain, corp parade, manhunt), Doc's neural reset
 * and co-op revive. */
require('./harness');
const G = __G,
  A = __api;
const step = n => {
  for (let i = 0; i < n; i++) {
    G.stop = 0;
    T += 1000 / 60;
    raf(T);
  }
};
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
const clearFoes = () => (G.ents = G.ents.filter(e => e.team !== 1));
const start = (muts, coop) => {
  click('pick');
  click('diff:1');
  G.pendMuts = [];
  for (const m of muts) click('mut:' + m);
  click(coop ? 'new2' : 'new');
  click('go');
  step(70);
  G.wave = 99;
  G.waveLive = false;
  clearFoes();
  return __PL()[0];
};
const foe = (k, dx) => {
  const P = __PL()[0];
  const e = A.spawnEnemy(k, 1);
  e.x = P.x + dx;
  e.y = P.y;
  e.inv = 0;
  e.elite = null;
  e.cool = 999;
  return e;
};

// ---- mutators
ok(
  ['turbo', 'fog', 'split', 'pacifist'].every(k => A.MUTS[k] && A.MUTD[k]),
  'four new mutators listed'
);
click('pick');
ok(/data-a="mut:pacifist"/.test(els.ov._h), 'mutators offered on the new-run screen');
click('back2title');

let P = start(['turbo']);
ok(G.muts.includes('turbo'), 'turbo on');
let t0 = G.t;
step(120);
ok(G.t - t0 === 150, 'turbo: 120 frames run 150 updates (' + (G.t - t0) + ')');
click('quit');

P = start(['fog']);
const near = foe('ganger', 40),
  far = foe('ganger', 300);
ok(A.fogAlpha(near) === 1 && A.fogAlpha(far) === 0, 'fog hides far enemies, shows near ones');
click('quit');

P = start(['split']);
let g = foe('ganger', 30);
A.hurt(g, 9999, 1, { src: P });
step(2);
let minis = G.ents.filter(e => e.mini && e.kind === 'ganger' && e.state !== 'dead');
ok(minis.length === 2, 'split: ganger splits into 2 minis');
for (const m of minis) {
  m.inv = 0;
  A.hurt(m, 9999, 1, { src: P });
}
step(2);
ok(!G.ents.some(e => e.mini && e.state !== 'dead'), 'minis do not split again');
click('quit');

P = start(['pacifist']);
let k0 = P.karma,
  l0 = P.lvl;
__PARTY.contract.done = true;
A.stageClear();
ok(
  G.debrief.pacifist && G.debrief.karma === A.CONTRACTS[0].karma * 2,
  'pacifist: no gunfire doubles contract karma'
);
ok(A.LEG.feats.pacifist, 'Hands Only feat');
click('quit');
P = start(['pacifist']);
P.ammo = 10;
key('KeyU', true);
step(2);
key('KeyU', false);
step(30);
ok(G.gunUsed, 'firing a gun is tracked');
__PARTY.contract.done = true;
A.stageClear();
ok(!G.debrief.pacifist, 'pacifist bonus lost after firing');
click('quit');

// ---- block events
ok(
  ['acidrain', 'parade', 'manhunt'].every(k => A.EVENTS[k]),
  'three new block events'
);
click('worldpick');
click('world1');
P = __PL()[0];
G.wd.heat = 0;
G.wd.street.event = 'acidrain';
clearFoes();
g = foe('ganger', 80);
g.hp = g.maxHp = 100;
P.hp = P.maxHp;
P.inv = 0;
let ph = P.hp;
step(242);
ok(
  g.hp <= 98 && P.hp < ph,
  'acid rain hurts runner and ganger (' + ph + '→' + P.hp + ', ganger ' + g.hp + ')'
);
P.hp = 1;
step(130);
ok(P.hp === 1, 'acid rain never flatlines you');
P.hp = P.maxHp;

G.wd.street.event = 'parade';
clearFoes();
G.wd.parT = 2;
step(4);
ok(G.wd.heat === 0 && G.ents.some(e => e.kind === 'cop'), 'parade: patrol cop with no heat');
const cop = G.ents.find(e => e.kind === 'cop');
cop.x = P.x + 30;
const before = G.picks.filter(k => k.k === 'cred').length;
A.hurt(cop, 99999, 1, { src: P });
step(2);
ok(G.picks.filter(k => k.k === 'cred').length > before, 'parade cop drops creds');

G.wd.street.event = 'manhunt';
clearFoes();
G.wd.huntT = 2;
step(4);
const h = G.ents.find(e => e.hunter);
ok(h && h.name === 'Bounty hunter' && h.elite === 'berserk', 'manhunt: bounty hunter spawns');
h.x = P.x + 30;
const c0 = G.picks.filter(k => k.k === 'cred').reduce((a, k) => a + (k.v || 0), 0);
A.hurt(h, 99999, 1, { src: P });
step(2);
const c1 = G.picks.filter(k => k.k === 'cred').reduce((a, k) => a + (k.v || 0), 0);
ok(c1 - c0 >= 80 + G.wd.level * 40, 'hunter pays out ¥' + (c1 - c0));
ok(A.LEG.stats.hunters === 1, 'hunter count tracked');
G.wd.street.event = null;
click('quit');

// ---- Doc's neural reset
P = start([]);
P.lvl = 6;
P.sk = { iron: 1, brute: 1, breaker: 1 };
P.spts = 0;
A.refresh(P);
__PARTY.creds = 5000;
G.sheetIdx = 0;
ok(A.respecRefund(P) === 3, 'reset would refund 3 skills');
click('buy:reset');
ok(
  P.spts === 3 && !P.sk.iron && __PARTY.creds === 5000 - A.respecCost(P),
  'runner: all 3 points back, creds paid'
);
P.arch = 'samurai';
P.sk = { iron: 1, brute: 1 };
P.spts = 0;
click('buy:reset');
ok(P.sk.iron && !P.sk.brute && P.spts === 1, 'samurai keeps Iron Fists');
ok(A.LEG.feats.respec, 'Second Opinion feat');
click('quit');

// ---- co-op revive
start([], true);
const [p1, p2] = __PL();
p2.lives = 0;
p2.hp = 0;
A.respawn(p2);
ok(p2.out && p2.outX != null, 'runner 2 out, marker left where they fell');
p1.x = p2.outX + 60;
p1.y = p2.outY;
step(200);
ok(p2.out, 'no revive from a distance');
p1.x = p2.outX + 8;
step(160);
ok(!p2.out && G.ents.includes(p2) && p2.hp > 0, 'standing by the marker revives runner 2');
ok(A.LEG.feats.revive, 'Not Today feat');

// ---- weapon heavy blows
const heavyWith = (base, setup) => {
  click('quit');
  const P = start([]);
  P.eq.weapon = A.mkItem('weapon', base, 0);
  A.refresh(P);
  P.face = 1;
  P.inv = 999;
  const r = setup(P);
  key('KeyJ', true);
  step(36);
  key('KeyJ', false);
  step(30);
  return { P, r };
};
const tough = (k, dx) => {
  const e = foe(k, dx);
  e.hp = e.maxHp = 999;
  return e;
};
let x0;
let hv = heavyWith('katana', P => {
  x0 = P.x;
  return [tough('ganger', 40), tough('ganger', 70)];
});
ok(
  hv.P.x - x0 > 40 && hv.r.every(e => e.hp < 999),
  'katana: dash slash moves ' + Math.round(hv.P.x - x0) + ' px and cuts both gangers'
);
hv = heavyWith('knucks', () => tough('orc', 22));
ok(hv.r.hp < 999 && hv.r.state === 'down', 'knuckles: flurry ends in a knockdown');
hv = heavyWith('whip', () => tough('ganger', 110));
ok(
  hv.r.x - hv.P.x < 100 && hv.r.hp < 999,
  'whip: yanks a ganger from 110 px and hits it (dx ' + Math.round(hv.r.x - hv.P.x) + ', hp ' + hv.r.hp + ')'
);
hv = heavyWith('baton', () => {
  const e = tough('ganger', 24);
  e.cool = 0;
  return e;
});
ok(hv.r.cool >= 100, 'baton: heavy blow stuns (cool ' + hv.r.cool + ')');
hv = heavyWith('axe', () => [tough('ganger', 24), tough('ganger', -20)]);
ok(
  hv.r.every(e => e.hp < 999),
  'axe: cleave hits in front and behind'
);

// ---- gun mods
click('quit');
P = start([]);
P.eq.gun = A.mkItem('gun', 'heavy', 0);
A.refresh(P);
__PARTY.creds = 5000;
G.sheetIdx = 0;
ok(/Gun bench/.test(A.npcHtml('ratchet')), "Ratchet's gun bench is listed");
click('gmod:mag');
ok(P.eq.gun.gmod === 'mag' && A.LEG.feats.gmod1, 'extended mag fitted, Tinkerer feat');
let a0 = P.ammo;
A.collect({ k: 'ammo', x: P.x, y: P.y, t: 1 }, P);
ok(P.ammo - a0 === 12, 'extended mag: ammo pickup gives 12');
click('gmod:ugl');
ok(P.eq.gun.gmod === 'ugl', 'a new mod replaces the old one');
ok(/Underbarrel launcher/.test(A.itemLine(P.eq.gun)), 'mod shows on the item line');
P.ammo = 20;
P.uglT = undefined;
tap('KeyU');
step(8);
ok(
  G.projs.some(q => q.k === 'nade'),
  'underbarrel: shot also lobs a grenade'
);
ok(P.ammo === 19, 'the grenade costs no extra ammo (' + P.ammo + ')');

// ---- spirit storm and compare card
ok(A.EVENTS.spiritstorm, 'spirit storm event');
click('quit');
click('worldpick');
click('world1');
P = __PL()[0];
G.wd.street.event = 'spiritstorm';
const fb = A.SPELLS.fire;
ok(A.spellCost(P, fb) === Math.max(1, Math.round(fb.cost * 0.5)), 'spells cost half in a spirit storm');
clearFoes();
G.wd.stormT = 2;
step(4);
ok(
  G.ents.some(e => e.kind === 'spirit'),
  'wild spirit drifts in'
);
G.wd.street.event = null;
const it = A.mkItem('armor', 'exo', 2);
G.picks.push({ k: 'gear', item: it, x: P.x + 40, y: P.y, t: 0 });
P.x = G.picks[G.picks.length - 1].x - 30;
let err = null;
try {
  A.drawCompare();
} catch (e) {
  err = e;
}
ok(!err && A.cmpVal(it) > A.cmpVal(P.eq.armor), 'compare card draws, exo-frame beats the starting armor');

// ---- corp ninjas and hellhounds
ok(A.DEF.ninja && A.DEF.hound && A.BEST.ninja && A.BEST.hound, 'two new enemies with bestiary notes');
click('quit');
P = start([]);
P.inv = 999;
const nj = A.spawnEnemy('ninja', 1);
nj.x = P.x + 120;
nj.y = P.y;
nj.elite = null;
step(3);
ok(nj.cloaked, 'shadow is cloaked while it closes in');
let sawStrike = false;
for (let i = 0; i < 400 && !sawStrike; i++) {
  step(1);
  if (nj.state === 'windup') sawStrike = !nj.cloaked;
}
ok(sawStrike, 'shadow drops the cloak to strike');
nj.state = 'idle';
nj.recloakT = 0;
step(2);
nj.inv = 0;
A.hurt(nj, 1, 1, { src: P });
ok(!nj.cloaked && nj.recloakT > 100, 'getting hit drops the cloak');
clearFoes();
const pack = [0, 1, 2].map(i => {
  const h = A.spawnEnemy('hound', 1);
  h.x = P.x + 200 + i * 10;
  h.elite = null;
  return h;
});
step(2);
const fast = pack[0].spdMul;
A.hurt(pack[1], 999, 1, { src: P });
A.hurt(pack[2], 999, 1, { src: P });
step(2);
ok(
  fast > pack[0].spdMul && fast > 1.2,
  'hounds are faster in a pack (' + fast.toFixed(2) + ' → ' + pack[0].spdMul.toFixed(2) + ')'
);
ok(
  A.STAGES[2].waves.some(w => w.spawn.includes('hound')) &&
    A.STAGES[3].waves.some(w => w.spawn.includes('ninja')),
  'hounds in the Undercity, shadows in the Arcology'
);
let drawErr = null;
try {
  A.render();
} catch (e) {
  drawErr = e;
}
ok(!drawErr, 'hound and cloaked shadow render without errors');

// ---- salvage and crafting
clearFoes();
__PARTY.creds = 5000;
__PARTY.parts = 0;
__PARTY.bag = [A.mkItem('weapon', 'pipe', 2, 'keen'), A.mkItem('gun', 'light', 0)];
const scrap = A.salvageParts(__PARTY.bag[0]);
click('salvage:' + __PARTY.bag[0].uid);
ok(
  scrap === 6 && __PARTY.parts === 6 && __PARTY.bag.length === 1,
  'scrapping a Prototype Keen pipe gives 6 parts'
);
ok(A.salvageParts(A.mkLegend('ronin')) === 0, "legendaries can't be scrapped");
P.eq.weapon = A.mkItem('weapon', 'katana', 0);
A.refresh(P);
const dm0 = P.eq.weapon.dmg;
click('upgrade:weapon');
ok(
  P.eq.weapon.rar === 1 && P.eq.weapon.dmg > dm0 && /^Tuned Katana/.test(P.eq.weapon.name),
  'upgrade: Street katana → ' + P.eq.weapon.name
);
ok(__PARTY.parts === 2 && __PARTY.creds === 5000 - 80, 'upgrade cost 4 parts and ¥80');
click('reroll:weapon');
ok(!P.eq.weapon.mod && __PARTY.parts === 2, 'not enough parts: reroll refused');
__PARTY.parts = 3;
click('reroll:weapon');
ok(
  P.eq.weapon.mod && __PARTY.parts === 0 && A.LEG.feats.craft1,
  'reroll adds an affix (' + P.eq.weapon.name + '), Back-Alley Engineer'
);
ok(/Workbench/.test(A.npcHtml('ratchet')), 'workbench listed at Ratchet');

// ---- parry
click('quit');
P = start([]);
P.inv = 0;
P.hp = P.maxHp;
let pg = foe('ganger', 18);
pg.face = -1;
A.setS(pg, 'windup');
pg.t = 14;
A.setS(P, 'roll');
P.rdx = 0;
P.rdy = 0;
let hp0 = P.hp;
step(3);
ok(
  P.hp === hp0 && pg.state === 'hurt' && P.parryT > 0,
  'dodging just before a hit parries: no damage, attacker staggered'
);
ok(A.LEG.feats.parry1, 'Not Even Close feat');
pg.inv = 0;
const tx0 = G.texts.length;
A.hurt(pg, 5, 1, { src: P, melee: true });
ok(
  G.texts.slice(tx0).some(t => /CRIT/.test(t.s)) && P.parryT === 0,
  'the counter-hit is a guaranteed crit, used once'
);
clearFoes();
step(40);
pg = foe('ganger', 18);
pg.face = -1;
A.setS(pg, 'windup');
pg.t = 14;
A.setS(P, 'roll');
P.t = 12;
P.rdx = 0;
P.rdy = 0;
step(3);
ok(pg.state !== 'hurt' && !(P.parryT > 0), 'a late dodge still dodges, but is no parry');

// ---- nightclubs and precincts
let clubs = 0,
  precs = 0,
  okGen = true;
for (let i = 0; i < 200; i++) {
  const st = A.genStreet(3, i * 7919);
  const c = st.buildings.filter(b => b.type === 'club').length,
    pc = st.buildings.filter(b => b.type === 'precinct');
  clubs += c;
  precs += pc.length;
  if (c > 2 || pc.length > 1 || pc.some(b => b.tier !== 3)) okGen = false;
  if (A.genStreet(1, i * 7919).buildings.some(b => b.type === 'precinct')) okGen = false;
}
ok(
  okGen && clubs > 50 && precs > 30,
  `streets get clubs (${clubs}) and precincts (${precs}); ≤2 clubs, ≤1 tier-3 precinct, none on block 1`
);
click('quit');
click('worldpick');
click('world1');
P = __PL()[0];
const prec = {
  id: 77,
  type: 'precinct',
  tier: 3,
  x: P.x,
  w: 140,
  name: 'Lone Star precinct 9',
  owner: 'x',
  seed: 5
};
G.wd.rep = 0;
ok(
  !A.isGood(prec) && /Get your street cred to \+30/.test(A.bcardHtml(prec)),
  'precinct is off limits below +30 cred'
);
G.wd.rep = 40;
ok(A.isGood(prec) && /Evidence locker/.test(A.bcardHtml(prec)), 'at +30 cred it becomes fair game');
G.wd.heat = 3;
A.enterBuilding(prec);
G.dun.room = G.dun.rooms - 1;
const chest = { x: P.x + 40, y: P.y, kind: 'chest' };
A.lootChest(chest);
ok(G.wd.heat === 0 && A.LEG.feats.precinct, 'clearing a precinct shreds your file: heat 0, Clean Record');
A.exitBuilding();
const club = { id: 78, type: 'club', tier: 2, x: P.x, w: 140, name: 'Club Static', owner: 'x', seed: 9 };
A.enterBuilding(club);
const crowd = G.ents.filter(e => e.team === 1 && !e.d.passive).length;
ok(A.isGood(club) && crowd === 4, 'nightclub: fair game, double crowd (' + crowd + ' in room 1)');
let derr = null;
try {
  A.render();
} catch (e) {
  derr = e;
}
ok(!derr, 'dance floor renders' + (derr ? ': ' + derr.message : ''));
A.exitBuilding();

// ---- block map
setMode = A.setMode;
A.setMode('play');
click('map');
ok(
  G.mode === 'map' && /Block 1 map/.test(els.ov._h) && /Safehouse/.test(els.ov._h),
  'block map lists the street'
);
ok(/fair-game job/.test(els.ov._h) || /Block cleared/.test(els.ov._h), 'map counts the jobs left');
click('close');
ok(G.mode === 'play', 'map closes back to the street');
