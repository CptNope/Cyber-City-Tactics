/* Feats, legendaries, the Codex, lore, Decker unlock, bounties, hidden doors, couriers, daily challenge. */
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
const fresh = arch => {
  G.pendArch = [arch || 'runner', 'samurai'];
  click('pick');
  click('diff:1');
  click('new');
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
// locked decker
click('pick');
ok(/🔒 Decker/.test(els.ov._h), 'Decker shows locked on the run screen');
click('arch:0:decker');
ok(G.pendArch[0] !== 'decker', 'cannot pick locked Decker');
let P = fresh();
let e = foe('ganger', 20);
A.hurt(e, 999, 1, { src: P });
step(3);
ok(L.feats.first && L.kills.ganger === 1, 'first kill: feat + bestiary count');
ok(G.toasts && G.toasts.length, 'feat toast queued');
step(300);
click('codex');
ok(
  G.mode === 'codex' &&
    /First Blood/.test(els.ov._h) &&
    JSON.parse(localStorage.getItem('cs_legend')).feats.first,
  'codex shows feats and legend is saved'
);
click('cx:best');
ok(/Ganger/.test(els.ov._h) && /\?\?\?/.test(els.ov._h), 'bestiary reveals only seen enemies');
click('cx:legs');
ok(/Locked/.test(els.ov._h), 'legendaries locked at start');
click('back2title');
// boss feat unlock & legendary
P = fresh();
const b = foe('troll', 40);
A.hurt(b, 99999, 1, { src: P });
step(3);
ok(L.feats.b_troll && A.legUnlocked().includes('boomstick'), 'Gutter King kill: Dethroned unlocks Boomstick');
G.picks = [];
A.legendDrop(P.x + 10, P.y, 1);
const pk = G.picks.find(k => k.k === 'gear' && k.item.leg);
ok(pk && pk.item.leg === 'boomstick' && pk.item.rar === 3, 'legendary drop: ' + (pk && pk.item.name));
P.x = pk.x;
P.y = pk.y;
step(5);
ok(L.legs.includes('boomstick') && L.feats.leg1, 'picking it up registers it + Black Market feat');
// boomstick effect
{
  P = fresh();
  P.eq.gun = A.mkLegend('boomstick');
  A.refresh(P);
  G.projs = [];
  tap('KeyU');
  step(6);
  ok(G.projs.filter(q => q.k === 'bullet' && q.kd).length === 5, 'Boomstick fires 5 knockdown pellets');
}
{
  P = fresh();
  P.eq.weapon = A.mkLegend('ronin');
  A.refresh(P);
  P.D.crit = 0;
  const e = foe('ganger', 20);
  e.hp = e.maxHp = 9999;
  let crits = 0;
  for (let i = 0; i < 12; i++) {
    const h = e.hp;
    e.inv = 0;
    e.state = 'idle';
    A.hurt(e, 10, 1, { src: P, melee: true });
    if (h - e.hp > 10) crits++;
  }
  ok(crits === 2, 'Ronin: every 6th melee hit crits (' + crits + '/12)');
}
{
  P = fresh();
  P.eq.armor = A.mkLegend('iceshard');
  A.refresh(P);
  const h = P.hp;
  A.hurt(P, 20, 1, {});
  ok(P.hp === h, 'ICE Shard deflects first hit');
  P.inv = 0;
  A.hurt(P, 20, 1, {});
  ok(P.hp < h, 'second hit lands');
}
{
  P = fresh();
  P.eq.armor = A.mkLegend('dragonscale');
  A.refresh(P);
  P.mp = 0;
  P.inv = 0;
  A.hurt(P, 20, 1, {});
  ok(P.mp > 0, 'Dragonscale: damage restores mana ' + P.mp);
}
{
  P = fresh();
  P.eq.gun = A.mkLegend('wyrmfang');
  A.refresh(P);
  P.ammo = 100;
  for (let i = 0; i < 20; i++) {
    tap('KeyU');
    step(20);
  }
  ok(P.ammo > 100 - 17 && P.ammo < 100 - 3, 'Wyrmfang saves ~half ammo: used ' + (100 - P.ammo) + '/20');
}
{
  P = fresh();
  P.eq.weapon = A.mkLegend('maul');
  A.refresh(P);
  const e = foe('ganger', 30);
  e.hp = e.maxHp = 999;
  key('KeyJ', true);
  step(40);
  key('KeyJ', false);
  G.fx = [];
  step(12);
  ok(
    G.fx.some(f => f.k === 'ring' && f.c === '#ff6a3d'),
    'Cinder Maul heavy blow erupts'
  );
}
// lore
{
  const n = L.lore.length;
  A.gotShard(__PL()[0]);
  ok(L.lore.length === n + 1 && L.stats.shards >= 1, 'lore shard found');
  click('codex');
  click('cx:lore');
  ok(new RegExp(require('util').format('%d of', L.lore.length)).test(els.ov._h), 'lore tab counts');
  click('back2title');
}
// decker unlock via hacks
L.stats.hacks = 9;
A.feat && 0;
__api.LEG.stats.hacks = 9;
click('worldpick');
click('world1');
P = __PL()[0];
const gb = G.wd.street.buildings.find(b => b.type !== 'safe' && b.type !== 'secret' && A.isGood(b));
P.x = gb.x;
P.y = 190;
G.camX = Math.max(0, gb.x - 240);
G.ents = G.ents.filter(e => e.team !== 1);
step(2);
tap('KeyJ');
step(3);
click('hack');
let n = 0;
while (G.mode === 'hack' && n++ < 10) {
  G.hack.pos = G.hack.zone;
  A.hackPress();
}
ok(L.feats.h10, '10th hack unlocks Decker feat');
click('quit');
click('pick');
ok(!/🔒 Decker/.test(els.ov._h), 'Decker now selectable');
P = fresh('decker');
ok(
  P.arch === 'decker' && P.sk.probe && P.eq.gun.base === 'smart' && P.D.a.hak >= 5,
  'Decker starts with smartgun, Port Scanner, Hacking 5'
);
{
  const d = foe('drone', 60),
    g = foe('ganger', 40);
  d.hp = d.maxHp = 200;
  g.cool = 0;
  P.sp = 100;
  A.doSpecial(P);
  step(30);
  ok(d.hp < 200 && g.cool >= 150, 'Overload: drone fried ' + d.hp + ', ganger stunned cool ' + g.cool);
}
// Sprawl: bounty + secret
let sec = 0,
  bty = 0;
for (let i = 0; i < 60; i++) {
  const st = A.genStreet(1 + (i % 5), i * 7919);
  if (st.buildings.some(b => b.type === 'secret')) sec++;
  if (st.buildings.some(b => b.bounty)) bty++;
}
ok(sec > 15 && sec < 55 && bty >= 55, `secrets on ${sec}/60 streets, bounties on ${bty}/60`);
click('quit');
click('worldpick');
click('world1');
let tries = 0;
while (!G.wd.street.buildings.some(b => b.type === 'secret') && tries++ < 50) {
  G.wd.level = 4;
  G.wd.seed = tries * 104729;
  G.wd.street = A.genStreet(4, G.wd.seed);
}
const sb = G.wd.street.buildings.find(b => b.type === 'secret');
P = __PL()[0];
ok(sb && !A.nearDoor(Object.assign({}, P, { x: sb.x, y: 180 })), 'hidden door not usable before it is found');
P.x = sb.x - 40;
P.y = 190;
G.camX = Math.max(0, sb.x - 240);
step(3);
ok(G.wd.found.includes(sb.id) && L.feats.secret, 'walking near reveals the hidden door + Off the Map');
G.ents = G.ents.filter(e => e.team !== 1);
P.x = sb.x;
step(2);
tap('KeyJ');
step(3);
ok(G.mode === 'bcard' && /Off the map/.test(els.ov._h), 'hidden door card');
click('hack');
n = 0;
while (G.mode === 'hack' && n++ < 10) {
  G.hack.pos = G.hack.zone;
  A.hackPress();
}
ok(
  G.dun && G.dun.b === sb && G.wd.heat === 0,
  'into the ' + sb.name + ' (' + G.dun.rooms + ' rooms), no heat'
);
// skip to last room: kill everything quickly
for (let k = 0; k < 6 && G.dun; k++) {
  for (const x of G.ents)
    if (x.team === 1 && x.state !== 'dead' && !x.d.passive) {
      A.hurt(x, 99999, 1, { src: P });
    }
  step(40);
  if (G.exitOpen && G.dun && G.dun.room < G.dun.rooms - 1) {
    P.x = 470;
    step(5);
  }
}
const chest = G.ents.find(x => x.kind === 'chest');
if (chest) {
  G.picks = [];
  A.hurt(chest, 99, 1, { src: P });
  step(3);
  ok(
    G.picks.some(k => k.k === 'shard'),
    'secret cache always drops a lore shard; drops: ' +
      G.picks.map(k => k.k + (k.item && k.item.leg ? '(LEG)' : '')).join(',')
  );
} else ok(false, 'no chest');
// bounty
{
  const bb = G.wd.street.buildings.find(b => b.bounty);
  G.dun = null;
  A.enterStreet(bb.x);
  A.enterBuilding(bb);
  for (let k = 0; k < 6 && G.dun && G.dun.room < G.dun.rooms - 1; k++) {
    G.ents
      .filter(x => x.team === 1)
      .forEach(x => {
        x.state = 'dead';
      });
    step(5);
    P.x = 470;
    step(5);
  }
  const boss = G.ents.find(x => x.bounty);
  ok(boss && /☠/.test(boss.name), 'bounty target named ' + (boss && boss.name));
  const c0 = PARTY.creds;
  boss.inv = 0;
  A.hurt(boss, 99999, 1, { src: P });
  step(4);
  console.log(
    'dbg',
    G.wd.bountyDone,
    !!L.feats.bounty,
    G.picks.map(k => k.k + ':' + k.v).join(','),
    bb.bounty.reward
  );
  ok(
    G.wd.bountyDone && L.feats.bounty && G.picks.some(k => k.k === 'cred' && k.v >= bb.bounty.reward),
    'bounty paid'
  );
}
// courier
{
  G.dun = null;
  A.enterStreet(400);
  G.wd.courDone = false;
  G.wd.courT = 2;
  step(4);
  const c = G.ents.find(x => x.courier);
  ok(c && c.name === 'Kagemori courier', 'courier drone spawns');
  A.hurt(c, 99999, 1, { src: __PL()[0] });
  step(3);
  ok(L.feats.courier, 'courier downed: Highway Robbery');
  step(200);
  G.wd.courDone = false;
  G.wd.courT = 2;
  step(4);
  const c2 = G.ents.find(x => x.courier && x.state !== 'dead');
  c2.escapeT = 2;
  step(4);
  ok(!G.ents.includes(c2), 'second courier escapes when ignored');
}
// save/continue keeps found + bounty
A.saveWorld();
const sw = JSON.parse(localStorage.getItem('cs_world'));
ok(sw.wd.found.includes(sb.id) && sw.wd.bountyDone, 'world save keeps hidden door + bounty state');
// daily
click('quit');
click('arenapick');
ok(/Daily challenge/.test(els.ov._h), 'daily challenge offered');
click('day1');
const dy = A.thisDay();
ok(
  G.challenge && G.challenge.daily && __PL()[0].arch === dy.arch && L.feats.daily,
  'daily run as ' + dy.arch + ' with ' + dy.mod
);
ok(JSON.parse(localStorage.getItem('cs_day')).streak === 1, 'streak 1');
{
  const dd = JSON.parse(localStorage.getItem('cs_day'));
  const y = new Date(Date.now() - 864e5);
  dd.last =
    y.getFullYear() +
    '-' +
    String(y.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(y.getDate()).padStart(2, '0');
  dd.streak = 2;
  localStorage.setItem('cs_day', JSON.stringify(dd));
  A.startArena(false, 'day');
  ok(JSON.parse(localStorage.getItem('cs_day')).streak === 3 && L.feats.streak, '3-day streak feat');
}
G.score = 4321;
G.awave = 4;
A.arenaOver();
ok(
  /daily/.test(els.ov._h) && JSON.parse(localStorage.getItem('cs_day')).score === 4321,
  'daily score saved and shown'
);
// rank bonus
const r = A.rankOf(A.legLP());
click('quit');
click('pick');
click('new');
ok(PARTY.creds === r * 15, 'rank ' + r + ' start bonus ¥' + PARTY.creds + ' (LP ' + A.legLP() + ')');
console.log('feats earned', Object.keys(L.feats).length, '/', require('util').inspect(0));
