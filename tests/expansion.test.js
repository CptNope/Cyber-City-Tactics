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
  if (nj.state === 'windup' || nj.state === 'ftell') sawStrike = !nj.cloaked; // a strike or a flurry's tell
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
    A.STAGES[4].waves.some(w => w.spawn.includes('ninja')),
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

// ---- co-op team attacks
click('quit');
start([], true);
let [r1, r2] = __PL();
let tg = foe('orc', 20);
tg.hp = tg.maxHp = 500;
A.hurt(tg, 5, 1, { src: r1, melee: true });
step(4);
let tx1 = G.texts.length;
A.hurt(tg, 5, 1, { src: r2, melee: true });
step(3);
ok(
  G.texts.slice(tx1).some(t => t.s === 'TEAM UP!') && tg.hp < 490 - 10,
  'two runners hitting one enemy within 0.5 s: team attack (' + tg.hp + ' hp left)'
);
ok(A.LEG.feats.team1, 'Two-Man Job feat');
step(130);
tx1 = G.texts.length;
A.hurt(tg, 5, 1, { src: r1, melee: true });
step(40);
A.hurt(tg, 5, 1, { src: r2, melee: true });
ok(!G.texts.slice(tx1).some(t => t.s === 'TEAM UP!'), 'too far apart: no team attack');

// ---- mech walker
click('quit');
P = start([]);
P.inv = 999;
const mech = A.spawnEnemy('mech', 1);
mech.x = P.x + 60;
mech.y = P.y;
mech.face = -1;
mech.elite = null;
mech.cool = 999;
mech.inv = 0;
P.D.crit = 0; // no random crits in this comparison
let h0 = mech.hp;
A.hurt(mech, 20, 1, { src: P, melee: true, ax: P.x });
const front = h0 - mech.hp;
mech.inv = 0;
h0 = mech.hp;
A.hurt(mech, 20, -1, { src: P, melee: true, ax: mech.x + 30 });
const back = h0 - mech.hp;
ok(front <= 8 && back >= 25, `mech: plated front (${front}) vs weak back (${back}) from a 20-damage hit`);
mech.inv = 0;
A.hurt(mech, 5, 1, { src: P, kd: true, ax: P.x });
ok(mech.state !== 'down' && mech.state !== 'hurt', 'mech never flinches or falls');
P.x = mech.x + 50;
step(30);
const stillFacing = mech.face === -1;
step(50);
ok(stillFacing && mech.face === 1, 'mech takes about a second to turn around');
ok(!A.tryGrab(P, -1) || P.grab !== mech, "mechs can't be grabbed");

// ---- feral spirit
clearFoes();
const fr = A.spawnEnemy('feral', 1);
fr.x = P.x + 120;
fr.y = P.y;
fr.elite = null;
fr.face = -1;
A.setS(fr, 'aim');
fr.echo = 'bolt';
fr.t = 21;
step(2);
ok(
  G.projs.some(q => q.k === 'hex' && q.tint === 'bolt' && q.team === 1),
  'feral spirit echoes the last spell (bolt)'
);
const hurtG = A.spawnEnemy('ganger', 1);
hurtG.x = fr.x + 10;
hurtG.y = fr.y;
hurtG.hp = 5;
hurtG.maxHp = 100;
fr.echo = 'heal';
A.echoSpell(fr);
ok(hurtG.hp > 5, 'an echoed heal patches up nearby enemies');
P.mp = 99;
P.spells = ['fire'];
P.spell = 0;
A.castSpell(P);
ok(G.lastSpell === 'fire', 'casting records the spell for ferals to copy');

// ---- hostage rooms
click('quit');
click('worldpick');
click('world1');
P = __PL()[0];
const hb = { id: 81, type: 'hideout', tier: 2, x: P.x, w: 140, name: 'Test den', owner: 'x', seed: 4 };
A.enterBuilding(hb);
clearFoes();
const hs = A.spawnHostage(300, A.FY0 + 34);
ok(hs.team === 2 && hs.d.hostage, 'hostage spawns on its own side');
const g2 = A.spawnEnemy('ganger', 1);
g2.x = 200;
const rep0 = G.wd.rep;
step(2);
ok(!hs.freed, 'not freed while enemies are standing');
A.hurt(g2, 999, 1, { src: P });
step(3);
ok(
  hs.freed && G.wd.rep === rep0 + 5 && A.LEG.feats.hostage1,
  'room cleared: hostage freed, cred +5, Not on My Watch'
);
const hs2 = A.spawnHostage(260, A.FY0 + 34);
const g3 = A.spawnEnemy('ganger', 1);
g3.x = 100;
const rep1 = G.wd.rep;
A.hurt(hs2, 999, 1, { src: P, melee: true, ax: P.x });
step(2);
ok(hs2.state === 'dead' && G.wd.rep === rep1 - 8, 'a hostage caught by a stray hit is lost: cred −8');
let herr = null;
try {
  A.render();
} catch (e) {
  herr = e;
}
ok(!herr, 'hostage, mech and feral render without errors' + (herr ? ': ' + herr.message : ''));

// ---- street shops: clinic and talisman
let shopsOk = true,
  nClinic = 0,
  nTal = 0;
for (let i = 0; i < 150; i++) {
  const st = A.genStreet(2, i * 4241 + 7);
  nClinic += st.buildings.filter(b => b.type === 'clinic').length;
  nTal += st.buildings.filter(b => b.type === 'talisman').length;
  if (st.buildings.some(b => A.isShop(b) && A.isGood(b))) shopsOk = false;
  if (A.genStreet(1, i * 4241 + 7).buildings.some(b => b.type === 'clinic' || b.type === 'talisman'))
    shopsOk = false;
}
ok(
  shopsOk && nClinic > 60 && nTal > 60,
  `clinics (${nClinic}) and talisman shops (${nTal}) from block 2, never robbable`
);
click('quit');
click('worldpick');
click('world1');
P = __PL()[0];
G.sheetIdx = 0;
__PARTY.creds = 5000;
const clinicB = { id: 90, type: 'clinic', tier: 0, x: P.x, w: 140, name: 'Ripperdoc Saito', seed: 1 };
A.openDoor(clinicB);
ok(
  G.mode === 'shop' && /Thermographic eyes/.test(els.ov._h) && /Reflex booster/.test(els.ov._h),
  'clinic sells rare cyberware'
);
ok(!/Thermographic eyes/.test(A.npcHtml('doc')), "Doc doesn't stock it");
const crit0 = P.D.crit;
click('cyber:eyes');
ok(
  P.cy.eyes === 1 && P.D.crit > crit0 && A.LEG.feats.rare,
  'thermographic eyes installed: +crit, Off the Books'
);
const cr0 = __PARTY.creds;
click('cyber:eyes');
ok(__PARTY.creds === cr0 && P.cy.eyes === 1, 'rare pieces install once');
click('leave');
const talB = { id: 91, type: 'talisman', tier: 0, x: P.x, w: 140, name: 'Moonlit Talismans', seed: 2 };
A.openDoor(talB);
ok(
  /Frost Nova/.test(els.ov._h) && /Soul Drain/.test(els.ov._h) && !/Frost Nova/.test(A.npcHtml('wen')),
  'talisman shop teaches rare spells; Old Wen does not'
);
P.D.a.mag = 9;
click('learn:frost');
click('learn:drain');
ok(P.spells.includes('frost') && P.spells.includes('drain'), 'learned Frost Nova and Soul Drain');
click('leave');
clearFoes();
let fz = foe('ganger', 30);
fz.hp = fz.maxHp = 200;
P.spell = P.spells.indexOf('frost');
A.castSpell(P);
ok(fz.hp < 200 && G.slowFoes > 100, 'Frost Nova hurts nearby enemies and slows them all');
fz.inv = 0;
P.hp = 20;
P.spell = P.spells.indexOf('drain');
A.castSpell(P);
step(12);
ok(P.hp > 20, 'Soul Drain heals the caster (' + P.hp + ')');

// ---- hazard rooms
const hzB = { id: 92, type: 'hideout', tier: 2, x: P.x, w: 140, name: 'Hazard den', seed: 11 };
A.enterBuilding(hzB);
clearFoes();
P = __PL()[0];
P.inv = 0;
P.hp = P.maxHp;
G.hazard = { k: 'shock', t: 239, lane: 0, drops: [] };
const zg = foe('ganger', 40);
zg.hp = zg.maxHp = 200;
zg.cool = 9999;
step(2);
const ly = G.hazard.lane;
zg.y = A.laneY(ly) + 4;
P.y = A.laneY((ly + 1) % 3) + 6;
const php = P.hp;
for (let i = 0; i < 100; i++) {
  zg.y = A.laneY(ly) + 4;
  zg.state = 'idle';
  step(1);
}
ok(zg.hp < 200 && P.hp === php, 'live wiring hurts whoever stands in its lane, and only there');
G.hazard = { k: 'ceiling', t: 1, lane: 0, drops: [{ x: P.x, y: P.y, t: 45 }] };
P.inv = 0;
const php2 = P.hp;
step(8);
ok(P.hp < php2, 'falling debris lands where its shadow was');
G.hazard = null;

// ---- vaults
const vB = { id: 93, type: 'blacksite', tier: 3, x: P.x, w: 140, name: 'Vault test', seed: 21 };
A.enterBuilding(vB);
A.enterRoom(G.dun.rooms - 1);
const vault = G.ents.find(e => e.kind === 'chest');
P = __PL()[0];
ok(vault && vault.vault, 'tier-3 fair-game building: the cache is a vault');
A.hurt(vault, 99, 1, { src: P, melee: true });
ok(G.mode === 'play' && vault.state !== 'dead', 'enemies standing: the vault waits');
clearFoes();
A.hurt(vault, 99, 1, { src: P, melee: true });
ok(
  G.mode === 'hack' && G.hack.vault === vault && G.hack.need === 5,
  'room clear: hitting the vault starts a lock-4 hack'
);
A.hackWin();
ok(G.mode === 'play' && vault.vaultDone && vault.bonus, 'cracked: vault open');
const gearN = G.picks.filter(k => k.k === 'gear').length;
A.hurt(vault, 99, 1, { src: P, melee: true });
step(2);
ok(
  A.LEG.feats.vault && G.picks.filter(k => k.k === 'gear').length > gearN,
  'breaking it pays the vault haul: Safecracker'
);

// ---- feral spirits stay on screen
click('quit');
P = start([]);
P.inv = 999;
P.x = G.camX + 30;
const fer = A.spawnEnemy('feral', 1);
fer.x = P.x + 60;
fer.y = P.y;
fer.elite = null;
fer.cool = 9999;
step(300);
ok(
  fer.x >= G.camX + 20 && fer.x <= G.camX + A.W - 20,
  'a feral spirit backs off but never leaves the screen (' + Math.round(fer.x - G.camX) + ')'
);

// ---- Street Doc and Adept
ok(
  A.ARCH.medic.locked === 'coopwin' && A.ARCH.adept.locked === 'knuckles',
  'Street Doc and Adept start locked behind feats'
);
click('quit');
click('pick');
ok(/🔒 Street Doc/.test(els.ov._h) || !!A.LEG.feats.coopwin, 'Street Doc shows locked on the picker');
click('back2title');
A.LEG.feats.coopwin = 1;
A.LEG.feats.knuckles = 1;
G.pendArch = ['medic', 'adept'];
click('pick');
click('diff:1');
G.pendMuts = [];
click('new2');
click('go');
step(70);
G.wave = 99;
G.waveLive = false;
clearFoes();
let [doc, adept] = __PL();
ok(
  doc.arch === 'medic' && doc.spells.includes('heal') && adept.arch === 'adept' && !adept.eq.gun,
  'co-op run: Street Doc with Heal, Adept with no gun'
);
doc.hp = 50;
adept.hp = 50;
adept.x = doc.x + 20;
adept.y = doc.y;
let dg = foe('ganger', 20);
dg.hp = dg.maxHp = 999;
A.hurt(dg, 5, 1, { src: doc, melee: true });
ok(doc.hp === 52 && adept.hp === 51, 'Street Doc: a melee hit heals the doc 2 and a partner close by 1');
adept.sp = 100;
doc.sp = 100;
A.doSpecial(doc);
ok(
  doc.hp >= 52 + Math.round(doc.maxHp * 0.5) - 1 && adept.inv > 100,
  'Triage heals the team by half and shields them'
);
const m0 = A.ARCH.adept;
A.refresh(adept);
const dmgAdept = adept.D.melee;
vmA = require('vm');
vmA.runInThisContext('PL[1].arch = "runner"; refresh(PL[1]);');
const dmgPlain = adept.D.melee;
vmA.runInThisContext('PL[1].arch = "adept"; refresh(PL[1]);');
ok(Math.abs(dmgAdept / dmgPlain - 1.3) < 0.01, 'Adept fists hit 30% harder');
adept.ammo = 20;
adept.eq.gun = A.mkItem('gun', 'light', 0);
const ammo0 = adept.ammo;
key('Semicolon', true);
step(2);
key('Semicolon', false);
step(20);
ok(adept.ammo === ammo0, "Adepts won't fire a gun, even one from the bag");
const proj0 = G.projs.length;
A.setS(adept, 'upper');
step(8);
ok(
  G.projs.some(q => q.tint === 'chi'),
  'an Adept uppercut throws a chi blast'
);
A.doSpecial(adept);
dg = foe('ganger', 22);
dg.hp = dg.maxHp = 999;
const tx2 = G.texts.length;
A.hurt(dg, 5, 1, { src: adept, melee: true });
ok(
  G.texts.slice(tx2).some(t => /CRIT/.test(t.s)) && dg.state === 'down',
  'Killing Hands: every melee hit crits and knocks down'
);

// ---- challenge seeds
ok(
  A.parseSeed('s3-k2f9qx').level === 3 && A.parseSeed('CCT-A-9XK2').mode === 'arena' && !A.parseSeed('hello'),
  'seed codes parse (and junk is rejected)'
);
const s1 = A.genStreet(3, A.parseSeed('S3-K2F9QX').seed),
  s2 = A.genStreet(3, A.parseSeed('s3-k2f9qx').seed);
ok(JSON.stringify(s1) === JSON.stringify(s2), 'the same seed builds the same street');
click('quit');
click('worldpick');
ok(/Challenge seed/.test(els.ov._h), 'seed box on the Sprawl start screen');
document.getElementById('seedIn').value = 'nonsense';
click('seedgo');
ok(G.mode === 'worldpick' && /doesn't look like a seed/.test(els.ov._h), 'a bad code shows a gentle error');
document.getElementById('seedIn').value = 'S3-K2F9QX';
G.pendArch = ['runner', 'samurai'];
click('seedgo');
ok(
  G.world && G.wd.level === 3 && JSON.stringify(G.wd.street) === JSON.stringify(s1),
  'seeded Sprawl: block 3, the exact street'
);
ok(__PL()[0].lvl === 7 && A.LEG.feats.seeded, 'runners start at the level they would have reached (7)');
A.setMode('play');
click('map');
ok(/S3-K2F9QX/.test(els.ov._h), 'the block map shows the seed to share');
click('close');
click('quit');
click('arenapick');
ok(/Challenge seed/.test(els.ov._h), 'seed box on the Arena start screen');
document.getElementById('seedIn').value = 'A-9XK2';
click('seedgo');
ok(G.arena && G.arenaSeed === 'A-9XK2', 'seeded Arena run');
const firstWave = () =>
  G.ents
    .filter(e => e.team === 1 && !e.d.passive)
    .map(e => e.kind)
    .join(',');
for (let i = 0; i < 200 && !G.ents.some(e => e.team === 1 && !e.d.passive); i++) step(1);
const w1 = firstWave();
click('quit');
click('arenapick');
document.getElementById('seedIn').value = 'a-9xk2';
click('seedgo');
for (let i = 0; i < 200 && !G.ents.some(e => e.team === 1 && !e.d.passive); i++) step(1);
ok(w1 && firstWave() === w1, 'the same Arena seed sends the same first wave (' + w1 + ')');
click('quit');
click('arenapick');
click('arena1');
ok(/^A-[0-9A-Z]+$/.test(G.arenaSeed), 'open Arena runs get a shareable seed too (' + G.arenaSeed + ')');

// ---- Ssareth, the Wyrm's Roost
delete A.LEG.feats.b_avatar;
delete A.LEG.feats.b_ssareth;
ok(!A.genStreet(3, 555).buildings.some(b => b.roost), "no Wyrm's Roost before the Avatar falls");
A.LEG.feats.b_avatar = 1;
const roost = A.genStreet(3, 555).buildings.find(b => b.roost);
ok(
  roost && A.roomsOf(roost) === 3 && A.isGood(roost),
  "after the Avatar: the Wyrm's Roost, three rooms deep"
);
click('quit');
click('worldpick');
G.pendArch = ['runner', 'samurai'];
click('world1');
P = __PL()[0];
A.enterBuilding(roost);
A.enterRoom(2);
let dr = G.ents.find(e => e.kind === 'dragon');
ok(
  dr && dr.maxHp === Math.round(1800 * A.DIFF[G.diff].hp),
  'Ssareth waits in the last room (' + (dr && dr.maxHp) + ' HP)'
);
ok(G.ents.filter(e => e.team === 1 && !e.d.passive).length === 1, 'the last room is a one-on-one fight');
G.ents = G.ents.filter(e => e.team !== 1 || e === dr || e.kind === 'chest');
// claws
P.inv = 0;
P.hp = P.maxHp;
dr.inv = 0;
dr.x = P.x + 50;
dr.y = P.y;
dr.cool = 0;
dr.flyCD = 9999;
step(2);
ok(dr.state === 'swipe', 'up close, it rears back to claw');
let hpb = P.hp;
step(30);
ok(P.hp < hpb, 'the claws land (' + hpb + '→' + P.hp + ')');
// take off and the air phase
P.inv = 999;
dr.flyCD = 1;
dr.state = 'idle';
step(45);
ok(dr.ph === 'air' && dr.z > 40, 'it takes off (z ' + Math.round(dr.z) + ')');
dr.inv = 0;
let dh = dr.hp;
P.x = dr.x - 30;
P.y = dr.y;
P.face = 1;
A.strike(P, 60, 30, { melee: true });
ok(dr.hp === dh, "in the air, ground punches can't reach it");
P.ammo = 30;
P.eq.gun = A.mkItem('gun', 'heavy', 0);
A.refresh(P);
A.fireBullet(P, 20, P.z + 27);
for (let i = 0; i < 30 && dr.hp === dh; i++) step(1);
ok(dr.hp < dh, 'but bullets do');
// breath
P.inv = 0;
P.hp = P.maxHp;
dr.br = { t: 0, lanes: [0, 1] };
dr.breaths = 0;
for (let i = 0; i < 70; i++) {
  P.y = A.laneY(0) + 5;
  P.state = 'idle';
  step(1);
}
ok(P.hp < P.maxHp, 'its breath burns the marked lanes');
P.hp = P.maxHp;
dr.br = { t: 0, lanes: [0, 1] };
for (let i = 0; i < 110; i++) {
  P.y = A.laneY(2) + 5;
  P.state = 'idle';
  step(1);
}
ok(P.hp === P.maxHp, 'the lane it leaves dark is safe');
// a full simulated fight: every phase cycles and the fight ends
P.inv = 999;
const seen = new Set();
let ticks = 0;
while (dr.state !== 'dead' && ticks < 20000) {
  seen.add(dr.ph);
  if (ticks % 12 === 0) {
    dr.inv = 0;
    A.hurt(dr, 9, 1, { src: P, bullet: true, ax: dr.x - 40 });
  }
  P.hp = P.maxHp;
  step(1);
  ticks++;
}
ok(
  dr.state === 'dead' && ['ground', 'takeoff', 'air', 'dive'].every(k => seen.has(k)),
  `simulated fight: all four phases, Ssareth falls after ${Math.round(ticks / 60)} s`
);
step(4);
ok(
  A.LEG.feats.b_ssareth && G.picks.some(k => k.item && k.item.leg === 'wyrmheart'),
  'Who Lights the Way, and Wyrmheart drops'
);
ok(!A.genStreet(3, 555).buildings.some(b => b.roost), 'the Roost is gone once Ssareth is dead');
const wh = A.mkLegend('wyrmheart');
const mh0 = P.maxHp;
P.eq.armor = wh;
A.refresh(P);
ok(P.maxHp - mh0 >= 40 - 14, 'Wyrmheart: +40 max HP (' + mh0 + '→' + P.maxHp + ')');
P.inv = 0;
P.hp = 200;
P.maxHp = 400;
A.hurt(P, 20, 1, { fire: true });
const fireTaken = 200 - P.hp;
P.inv = 0;
P.hp = 200;
P.state = 'idle';
A.hurt(P, 20, 1, {});
ok(fireTaken < 200 - P.hp, 'Wyrmheart: fire hurts half as much');
P.sp = 0;
A.spGain(P, 40);
ok(P.sp === 50, 'Wyrmheart: the special meter fills 25% faster');

// ---- street politics
const polSt = A.genStreet(3, 4242);
ok(
  polSt.buildings
    .filter(b => b.type === 'hideout' || b.type === 'club')
    .every(b => A.CREWS.includes(b.fac)) &&
    polSt.buildings.filter(b => b.type === 'blacksite').every(b => b.fac === 'kage'),
  'every hideout and club has a crew, every black site is Kagemori'
);
ok(
  A.genStreet(3, 4242)
    .buildings.filter(b => b.name === 'Rustline Crew den')
    .every(b => b.fac === 'rust'),
  'named dens belong to their crew'
);
click('quit');
click('worldpick');
G.pendArch = ['runner', 'samurai'];
click('world1');
P = __PL()[0];
const den = {
  id: 70,
  type: 'hideout',
  tier: 1,
  x: P.x,
  w: 140,
  name: 'Rustline Crew den',
  fac: 'rust',
  seed: 3
};
A.enterBuilding(den);
A.lootChest({ x: P.x + 40, y: P.y, kind: 'chest' });
ok(
  A.facStand('rust') === -25 && A.facStand('fang') === 15,
  'hitting the Rustline den: Rustline −25, rival Neon Fangs +15'
);
A.exitBuilding();
const site = { id: 71, type: 'blacksite', tier: 1, x: P.x, w: 140, name: 'Data vault', fac: 'kage', seed: 4 };
A.enterBuilding(site);
A.lootChest({ x: P.x + 40, y: P.y, kind: 'chest' });
ok(A.facStand('kage') === -25 && A.facStand('hex') === 5, 'hitting Kagemori: Kagemori −25, every crew +5');
A.exitBuilding();
ok(/Owned by <b[^>]*>Rustline Crew/.test(A.bcardHtml(den)), 'the building card names the owner and the cost');
A.setMode('play');
click('map');
ok(/Street politics/.test(els.ov._h) && /Neon Fangs/.test(els.ov._h), 'the block map shows street politics');
click('close');
// hostile: hit squads
G.wd.fac.rust = -60;
G.wd.fac.fang = 60;
clearFoes();
G.wd.squadT = 1;
G.wd.backT = 0;
step(3);
const sq = G.ents.filter(e => e.squad === 'rust' && e.state !== 'dead');
ok(
  sq.length === 3 && sq.filter(e => /Rustline Crew hit squad/.test(e.name || '')).length === 1,
  'Rustline at −60 sends a hit squad (one name tag, on the leader)'
);
ok(
  G.ents.some(e => e.ally === 'crew' && e.name === 'Neon Fangs'),
  'and the friendly Neon Fangs send backup'
);
for (const e of sq) {
  e.inv = 0;
  A.hurt(e, 9999, 1, { src: P });
}
step(2);
ok(A.LEG.feats.squad, 'Return to Sender: the whole squad down');
G.wd.fac.hex = 50;
A.facShift('fang', 0);
A.facHit({ fac: 'saint' });
ok(A.LEG.feats.friends, 'two crews friendly at once: Friends in Low Places');
const lvl0 = G.wd.level;
G.safeTab = 'lay';
A.setMode('safe');
click('newblock');
ok(G.wd.level === lvl0 + 1 && A.facStand('rust') === -60, 'standing carries to the next block');
ok(!/Crew backup/.test(A.npcHtml('kit')), "crew backup can't be hired from Kit");

// ---- weapon trails
click('quit');
click('pick');
ok(/Trail/.test(els.ov._h) && /data-a="trail:0:none"/.test(els.ov._h), 'trail picker on the start screen');
A.LEG.feats.c25 = 1;
click('trail:0:neon');
click('back2title');
P = start([]);
ok(P.trail === 'neon', 'runner starts with the Neon trail');
A.setS(P, 'punch');
P.t = 4;
let terr = null;
try {
  A.drawTrail(P);
} catch (e) {
  terr = e;
}
ok(!terr, 'trail draws mid-punch');
click('quit');
click('pick');
click('trail:0:wyrm');
ok((A.LEG.pendTrail || [])[0] !== 'wyrm' || A.LEG.feats.b_ssareth, 'locked trails stay locked');
click('back2title');
