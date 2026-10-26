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
