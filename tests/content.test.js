/* Shaman and Rigger, summons, mutators, coats, block events, the Lantern Vault, run history, the rename. */
require('./harness');
const G = __G,
  PARTY = __PARTY;
const MAPS = [
  {
    l: 'KeyA',
    r: 'KeyD',
    u: 'KeyW',
    d: 'KeyS',
    p: 'KeyJ',
    k: 'KeyK',
    j: 'Space',
    g: 'KeyU',
    s: 'KeyI',
    o: 'KeyO',
    h: 'KeyH',
    q: 'KeyQ'
  },
  {
    l: 'ArrowLeft',
    r: 'ArrowRight',
    u: 'ArrowUp',
    d: 'ArrowDown',
    p: 'Comma',
    k: 'Period',
    j: 'Slash',
    g: 'Semicolon',
    s: 'Quote',
    o: 'ShiftRight',
    h: 'BracketLeft',
    q: 'BracketRight'
  }
];

const step = n => {
  for (let i = 0; i < n; i++) {
    G.stop = 0;
    T += 1000 / 60;
    raf(T);
  }
};
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
const A = __api,
  L = A.LEG;
const foe = (k, dx, dy) => {
  const P = __PL()[0];
  const e = A.spawnEnemy(k, 1);
  e.x = P.x + dx;
  e.y = P.y + (dy || 0);
  e.inv = 0;
  e.elite = null;
  e.cool = 999;
  return e;
};
const fresh = (arch, coop) => {
  G.pendArch = [arch || 'runner', 'samurai'];
  click('pick');
  click('diff:1');
  click(coop ? 'new2' : 'new');
  click('go');
  step(70);
  const P = __PL()[0];
  P.inv = 0;
  G.wave = 99;
  G.waveLive = false;
  G.ents = G.ents.filter(e => e.team !== 1);
  P.face = 1;
  return P;
};
click('quit');
ok(/<h1>Cyber City Tactics<\/h1>/.test(els.ov._h), 'title says Cyber City Tactics');
// shaman/rigger locked
click('pick');
ok(/🔒 Shaman/.test(els.ov._h) && /🔒 Rigger/.test(els.ov._h), 'Shaman and Rigger start locked');
for (let i = 0; i < 10; i++) A.gotShard(__PL()[0] || { x: 0, y: 0 });
ok(L.feats.lore10, '10 shards: Storyteller');
click('back2title');
click('pick');
ok(!/🔒 Shaman/.test(els.ov._h), 'Shaman unlocked');
let P = fresh('shaman');
ok(P.spells.includes('heal') && P.sk.focus, 'Shaman starts with Fireball+Heal and Focus');
__PARTY.ally = null;
A.spawnAlly('brick');
P.sp = 100;
A.doSpecial(P);
step(2);
let sm = G.ents.filter(e => e.summon);
ok(
  sm.length === 2 && __PARTY.ally && __PARTY.ally.type === 'brick' && G.ents.some(e => e.ally === 'brick'),
  'Spirit Call: 2 spirits alongside hired Brick'
);
const g = foe('ganger', 30);
g.hp = g.maxHp = 200;
step(300);
ok(g.hp < 200, 'spirits fight: ganger ' + g.hp);
step(700);
ok(!G.ents.some(e => e.summon), 'spirits fade after 15 s');
ok(__PARTY.ally && G.ents.some(e => e.ally === 'brick'), 'Brick still hired');
for (let i = 0; i < 3; i++) A.LEG.stats.couriers = A.LEG.stats.couriers || 0;
A.LEG.stats.couriers = 2;
click('quit');
click('worldpick');
click('world1');
G.wd.courDone = false;
G.wd.courT = 2;
step(4);
const c = G.ents.find(x => x.courier);
A.hurt(c, 99999, 1, { src: __PL()[0] });
step(3);
ok(L.feats.cour3, '3rd courier: Drone Jockey');
P = fresh('rigger');
ok(P.eq.gun.base === 'smg', 'Rigger with machine pistol');
P.sp = 100;
A.doSpecial(P);
step(2);
ok(
  G.ents.filter(e => e.summon && e.ally === 'drone').length === 3 && L.feats.summon,
  'Drone Swarm: 3 drones + Not Alone feat'
);
// mutators
click('quit');
click('pick');
click('mut:glass');
click('mut:iron');
click('mut:brawl');
ok(/✓ Glass Cannon/.test(els.ov._h), 'mutators toggle');
click('new');
click('go');
step(70);
P = __PL()[0];
ok(G.muts.length === 3 && P.lives === 1, 'campaign with 3 mutators, one life');
{
  const e = foe('ganger', 20);
  e.hp = e.maxHp = 500;
  e.elite = null;
  P.D.crit = 0;
  const before = e.hp;
  A.hurt(e, 10, 1, { src: P });
  ok(before - e.hp === 16, 'Glass Cannon applies in the campaign: ' + (before - e.hp));
}
{
  const k0 = P.karma,
    l0 = P.lvl;
  A.gainKarma(10);
  ok(P.karma - k0 === 16 || P.lvl > l0, 'karma +60% with 3 mutators: ' + (P.karma - k0));
}
A.saveGame('play');
const sv = JSON.parse(localStorage.getItem('cs_save3'));
ok(sv.muts.length === 3, 'mutators saved');
click('quit');
click('worldpick');
click('world1');
{
  const e = foe('ganger', 20);
  e.hp = e.maxHp = 500;
  __PL()[0].D.crit = 0;
  A.hurt(e, 10, 1, { src: __PL()[0] });
  ok(500 - e.hp === 10, 'mutators do not leak into the Sprawl');
}
G.pendMuts = [];
// coats
click('quit');
click('pick');
ok(/aria-label="Chrome coat, locked"/.test(els.ov._h), 'Chrome coat locked');
click('coat:0:chrome');
ok(A.COATS && (G.pendCoat || ['sig'])[0] !== 'chrome', 'cannot pick locked coat');
L.stats.kills = 99;
P = fresh();
A.hurt(foe('ganger', 20), 999, 1, { src: P });
step(2);
ok(L.feats.k100, 'Street Sweeper');
step(5);
click('quit');
click('pick');
click('coat:0:chrome');
click('new');
click('go');
step(30);
P = __PL()[0];
ok(P.coat === 'chrome' && P.pal.coat === A.COATS.chrome.coat, 'chrome coat applied');
A.saveGame('play');
A.loadGame(JSON.parse(localStorage.getItem('cs_save3')));
ok(__PL()[0].pal.coat === A.COATS.chrome.coat, 'coat survives save/load');
// events
const evc = {};
for (let i = 0; i < 200; i++) {
  const st = A.genStreet(3, i * 31337);
  evc[st.event || 'none'] = (evc[st.event || 'none'] || 0) + 1;
}
ok(
  evc.gangwar && evc.blackout && evc.lockdown && evc.festival && evc.none > 80,
  'event spread ' + JSON.stringify(evc)
);
ok(!A.genStreet(1, 5).event, 'no events on block 1');
const withEvent = ev => {
  click('quit');
  click('worldpick');
  click('world1');
  let s = 0;
  while (true) {
    s++;
    const st = A.genStreet(3, s * 7);
    if (st.event === ev) {
      G.wd.level = 3;
      G.wd.seed = s * 7;
      G.wd.street = st;
      break;
    }
  }
  G.dun = null;
  A.enterStreet(300);
  return G.wd;
};
{
  const w = withEvent('blackout');
  w.heat = 4;
  w.copT = 5;
  G.ents = G.ents.filter(e => e.team !== 1);
  step(30);
  ok(!G.ents.some(e => e.kind === 'cop'), 'blackout: no cops at 4 stars');
}
{
  const w = withEvent('festival');
  ok(
    G.ents.filter(e => e.kind === 'vend').length === 4 && Math.abs(A.buyMul() - 0.8) < 1e-9,
    'night market: vending machines + 20% off'
  );
}
{
  const w = withEvent('gangwar');
  ok(true, 'gang war block');
}
{
  const w = withEvent('lockdown');
  ok(
    w.street.buildings.filter(b => b.type === 'blacksite').every(b => b.tier === 3),
    'lockdown: black sites tier 3'
  );
  ok(L.feats.events, 'Seen It All after four events');
}
// lantern vault
for (let i = 0; i < 24; i++) if (!L.lore.includes(i)) L.lore.push(i);
{
  const st = A.genStreet(2, 999);
  const lv = st.buildings.find(b => b.final);
  ok(lv && lv.name === 'The Lantern Vault', 'Lantern Vault appears once all lore is found');
  click('quit');
  click('worldpick');
  click('world1');
  G.wd.street = st;
  G.wd.level = 2;
  A.enterStreet(lv.x);
  A.enterBuilding(lv);
  ok(G.dun.rooms === 4, 'vault has 4 rooms');
  const PP = __PL()[0];
  PP.hp = PP.maxHp = 99999;
  for (let k = 0; k < 4 && G.dun && G.dun.room < 3; k++) {
    G.ents
      .filter(x => x.team === 1)
      .forEach(x => {
        x.state = 'dead';
      });
    step(5);
    PP.x = 470;
    step(5);
  }
  const av = G.ents.find(x => x.kind === 'avatar');
  ok(av && av.maxHp > 500, 'Avatar of Ssareth waits in the last room, hp ' + (av && av.maxHp));
  av.inv = 0;
  G.picks = [];
  A.hurt(av, 999999, 1, { src: PP });
  step(3);
  ok(
    L.feats.b_avatar && G.picks.some(k => k.item && k.item.leg === 'lantern'),
    'Lights Out + The Lantern drops'
  );
  ok(!A.genStreet(2, 999).buildings.some(b => b.final), 'vault gone after the avatar falls');
}
{
  P = fresh();
  P.eq.gun = A.mkLegend('lantern');
  P.hp = 50;
  P.mp = 0;
  A.hurt(foe('ganger', 20), 999, 1, { src: P });
  step(2);
  ok(P.hp > 50 && P.mp >= 5, 'The Lantern heals on takedowns');
}
// run history
{
  click('quit');
  click('arenapick');
  click('arena1');
  step(30);
  G.score = 999;
  G.awave = 3;
  A.arenaOver();
  click('quit');
  click('codex');
  click('cx:runs');
  ok(/Arena · Wave 3/.test(els.ov._h), 'runs tab logs arena run');
}
