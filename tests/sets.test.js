/* Gear sets, cyberdecks and active skills: two and three pieces from one maker add bonuses; the cyberdeck is a
 * fourth slot that helps hacking; three points in a tree unlock its active skill for the ★ button. */
'use strict';
require('./harness');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.tips = false;
G.pendArch = ['runner', 'samurai'];
A.newRun(false);
A.startStage(0);
step(30);
const P = __PL()[0];
const calm = () => {
  G.ents = G.ents.filter(e => e.team !== 1);
  G.props = [];
  G.projs = [];
  G.zaps = [];
  if (P.state !== 'idle') A.setS(P, 'idle');
  P.z = P.vz = 0;
  P.inv = 999;
  P.face = 1;
};
const foe = (k, dx, o) => {
  const e = A.spawnEnemy(k, 1);
  e.x = P.x + dx;
  e.y = P.y;
  e.elite = null;
  e.club = null;
  e.cool = 1e9;
  e.inv = 0;
  e.dmg = 0;
  e.hp = e.maxHp = 999;
  Object.assign(e, o || {});
  return e;
};
const kit = (m, deck) => {
  P.eq.weapon = A.mkItem('weapon', 'pipe', 0, false, m);
  P.eq.gun = A.mkItem('gun', 'light', 0, false, m);
  P.eq.armor =
    m === 'voltaic'
      ? A.mkItem('armor', 'coat', 0, false, 'rustline')
      : A.mkItem('armor', 'coat', 0, false, m);
  P.eq.deck = deck ? A.mkItem('deck', 'street', 0, false, m) : null;
  A.refresh(P);
};

/* ---------- cyberdecks ---------- */
ok(A.SLOTS.length === 4 && A.SLOTS.includes('deck'), 'a fourth gear slot: the cyberdeck');
ok(A.newRunner(0).eq.deck === null, 'a new runner has no deck yet');
const d = A.mkItem('deck', 'cobalt', 0, false, 'hexwright');
ok(
  d.hack === 2 && d.miss === 1 && d.bonus.hak === 2 && /Cobalt deck/.test(d.name),
  'a Cobalt deck: +2 Hacking, one extra miss'
);
ok(
  A.makersFor('deck').sort().join() === 'hexwright,kagemori,voltaic',
  'Kagemori, Voltaic and Hexwright make decks'
);
const d3 = A.mkItem('deck', 'wraith', 3, false, 'kagemori');
ok(
  d3.rar === 3 && d3.hack > 3 && d3.bonus.hak === d3.hack,
  'parts add Hacking, and rarity counts parts as for any gear'
);
ok(
  d3.parts.every(k => A.PARTS[k].slots.includes('deck')),
  'a deck only rolls parts that fit a deck'
);
const dm = A.mkItem('deck', 'cobalt', 3, true);
ok(
  dm.parts.length === 3 && dm.parts.every(k => A.PARTS[k]),
  'a deck asked for with an affix rolls ordinary parts instead'
);
P.eq.deck = null;
A.refresh(P);
const h0 = P.D.a.hak;
P.eq.deck = A.mkItem('deck', 'wraith', 0, false, 'kagemori');
A.refresh(P);
ok(P.D.a.hak === h0 + 3, 'equipped, a deck raises Hacking');
A.startHack({ tier: 2, name: 'test' });
const slowSpeed = G.hack.speed;
A.setMode('play');
P.eq.deck = A.mkItem('deck', 'cobalt', 0, false, 'kagemori');
A.refresh(P);
A.startHack({ tier: 2, name: 'test' });
ok(G.hack.maxMiss === 3 && slowSpeed < G.hack.speed, 'decks forgive a miss or slow the hacking cursor');
A.setMode('play');
ok(
  A.randItem(2) && Array.from({ length: 400 }, () => A.randItem(3).slot).includes('deck'),
  'decks drop as loot'
);

/* ---------- sets ---------- */
kit('kagemori', false);
const c3 = P.D.crit;
P.eq.gun = A.mkItem('gun', 'light', 0, false, 'ironside');
P.eq.armor = A.mkItem('armor', 'coat', 0, false, 'ironside');
A.refresh(P);
const c1 = P.D.crit;
ok(A.setN(P, 'kagemori') === 1 && Math.abs(c3 - c1 - 0.06) < 0.05 && c3 > c1, 'Kagemori 2-piece: more crit');
kit('rustline');
const m3 = P.D.melee;
P.eq.gun = A.mkItem('gun', 'light', 0, false, 'ironside');
P.eq.armor = A.mkItem('armor', 'coat', 0, false, 'ironside');
A.refresh(P);
ok(m3 > P.D.melee * 1.05, 'Rustline 2-piece: more melee damage');
kit('hexwright');
const mp3 = P.maxMp;
P.eq.gun = A.mkItem('gun', 'light', 0, false, 'ironside');
P.eq.armor = A.mkItem('armor', 'coat', 0, false, 'ironside');
A.refresh(P);
ok(mp3 > P.maxMp, 'Hexwright 2-piece: more mana');
kit('hexwright');
ok(A.spellCost(P, A.SPELLS.fire) < A.SPELLS.fire.cost, 'Hexwright 3-piece: cheaper spells');
kit('ironside');
calm();
P.inv = 0;
const e1 = foe('ganger', 20);
let hp = P.hp;
A.hurt(P, 40, -1, { att: e1 });
const tookSet = hp - P.hp;
P.eq.armor = A.mkItem('armor', 'coat', 0, false, 'rustline');
A.refresh(P);
P.hp = P.maxHp;
hp = P.hp;
P.inv = 0;
A.setS(P, 'idle');
A.hurt(P, 40, -1, { att: e1 });
ok(tookSet < hp - P.hp, 'Ironside 3-piece: take less damage');
kit('voltaic', true);
ok(A.setN(P, 'voltaic') === 3, 'Voltaic makes weapon, gun and deck: a full set without armor');
calm();
const a = foe('ganger', 20),
  b = foe('ganger', 40);
A.hurt(a, 10, 1, { src: P, melee: true });
ok(b.hp < 999 && b.dazeUntil > G.t, 'Voltaic set: a melee hit arcs to the next foe and dazes it');
kit('rustline');
G.sheetIdx = 0;
G.sheetTab = 'char';
A.setMode('sheet');
ok(
  /Rustline Bruiser 3\/3/.test(els.ov._h) && /Cyberdeck/.test(els.ov._h),
  'the sheet shows the set and the deck slot'
);
A.setMode('play');

/* ---------- active skills ---------- */
P.sk = { iron: 1 };
P.spSel = 'brawler';
ok(!A.activeOpen(P, 'brawler') && A.spKey(P) === 'arch', 'an active skill needs three points in its tree');
P.sk = {
  iron: 1,
  breaker: 1,
  leech: 1,
  steady: 1,
  scav: 1,
  quick: 1,
  focus: 1,
  flow: 1,
  thrift: 1,
  probe: 1,
  spare: 1,
  jam: 1
};
ok(
  ['brawler', 'gunner', 'mage', 'decker'].every(t => A.activeOpen(P, t)),
  'three points open each tree’s active skill'
);
G.sheetTab = 'skills';
G.tree = 'gunner';
A.setMode('sheet');
ok(/Fan the Hammer/.test(els.ov._h) && /spsel:gunner/.test(els.ov._h), 'the Skills tab offers it');
click('spsel:gunner');
ok(P.spSel === 'gunner' && A.spName(P) === 'Fan the Hammer', 'pick it for the ★ button');
A.setMode('play');

calm();
let f = foe('ganger', 34);
P.spSel = 'brawler';
P.sp = 100;
A.doSpecial(P);
step(20);
ok(f.hp < 999 && f.state === 'down', 'Ground Slam knocks down and hurts what is close');
calm();
f = foe('ganger', 80);
P.spSel = 'gunner';
P.sp = 100;
const ammo = P.ammo;
A.doSpecial(P);
ok(
  G.projs.filter(pr => pr.k === 'bullet' && pr.team === 0).length === 6 && P.ammo === ammo,
  'Fan the Hammer: six rounds, no ammo'
);
calm();
P.spSel = 'mage';
P.sp = 100;
A.doSpecial(P);
ok(
  G.ents.some(e => e.summon && e.ally === 'ember' && e.owner === P),
  'Summon Spirit: a fire spirit at your side'
);
calm();
const drone = foe('drone', 60),
  gang = foe('ganger', 90);
P.spSel = 'decker';
P.sp = 100;
A.doSpecial(P);
ok(drone.stunT > 0 && !gang.stunT, 'Short Circuit shorts out drones, not gangers');
step(30);
ok(drone.stunT > 0 && drone.cool > 100 && drone.hp < 999, 'a shorted drone stays frozen and takes the shock');

/* ---------- saves ---------- */
P.spSel = 'decker';
P.eq.deck = A.mkItem('deck', 'cobalt', 1, false, 'voltaic');
A.saveGame('den');
const sv = A.store.load('cs_save3');
A.loadGame(sv);
const Q = __PL()[0];
ok(Q.spSel === 'decker' && Q.eq.deck && Q.eq.deck.base === 'cobalt', 'the deck and the ★ choice are saved');
delete sv.runners[0].eq.deck;
A.loadGame(sv);
ok(__PL()[0].eq.deck === null, 'an older save without a deck slot loads with it empty');
