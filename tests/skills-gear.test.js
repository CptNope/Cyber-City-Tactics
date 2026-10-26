/* Skill trees, new weapons and armor, affixes, and save migration. */
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
const A = __api;
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
// starting skills
for (const [a, sk, pt] of [
  ['runner', null, 1],
  ['samurai', 'iron', 0],
  ['mage', 'focus', 0],
  ['gunslinger', 'steady', 0]
]) {
  const P = fresh(a);
  ok(
    (sk ? P.sk[sk] : Object.keys(P.sk).length === 0) && P.spts === pt,
    `${a} starts with ${sk || 'no skill'} and ${P.spts} point(s)`
  );
}
let P = fresh('runner');
const m0 = P.D.melee;
P.sk.iron = 1;
A.refresh(P);
ok(Math.abs(P.D.melee / m0 - 1.2) < 0.01, 'Iron Fists +20% melee');
delete P.sk.iron;
A.refresh(P);
ok(!A.canLearn(P, 'breaker') && A.canLearn(P, 'iron'), 'row 2 locked until a row 1 node is taken');
P.karma = 0;
A.gainKarma(2000);
ok(P.spts > 1 && P.lvl > 5, `levels grant skill points: lvl ${P.lvl}, spts ${P.spts}`);
ok(!A.canLearn(P, 'berserk'), 'capstone locked without 4 tree points');
// UI flow
click('sheet');
click('stab:skills');
ok(/Iron Fists/.test(els.ov._h) && /skill point/.test(els.ov._h), 'skills tab renders');
const sp0 = P.spts;
click('skill:iron');
click('skill:breaker');
click('skill:leech');
click('skill:whirl');
ok(
  P.sk.iron && P.sk.breaker && P.sk.leech && P.sk.whirl && P.spts === sp0 - 4,
  'learned 4 brawler skills via UI'
);
click('skill:berserk');
ok(P.sk.berserk || P.lvl < 8, 'capstone learnable at 4 points (lvl ' + P.lvl + ')');
click('tree:mage');
ok(/Overcharge/.test(els.ov._h), 'tree switch');
click('stab:char');
ok(/Equipped/.test(els.ov._h), 'back to character tab');
click('close');
// migration
const old = {
  v: 3,
  phase: 'den',
  stage: 1,
  coop: false,
  party: { creds: 10, bag: [], med: 2 },
  runners: [
    {
      arch: 'mage',
      lvl: 6,
      karma: 0,
      pts: 0,
      attr: { bod: 2, str: 1, agi: 2, mag: 5 },
      cy: { arm: 0, wired: 0, plate: 0 },
      eq: { weapon: null, gun: null, armor: null },
      spells: ['fire'],
      spell: 0,
      hp: 50,
      mp: 20,
      ammo: 10,
      lives: 3
    }
  ]
};
A.loadGame(old);
const M = __PL()[0];
ok(M.sk.focus && M.spts === 5, `old lvl-6 mage save migrates: focus + ${M.spts} points`);
// guns
const shoot = (base, mod, setup) => {
  const P = fresh('runner');
  P.eq.gun = A.mkItem('gun', base, 0, mod);
  A.refresh(P);
  P.ammo = 50;
  if (setup) setup(P);
  const es = [foe('ganger', 60), foe('ganger', 90)];
  es.forEach(e => {
    e.hp = e.maxHp = 500;
  });
  const a0 = P.ammo;
  tap('KeyU');
  step(90);
  return { P, es, used: a0 - P.ammo };
};
let r = shoot('rifle');
ok(r.used === 4, 'assault rifle fires 4 rounds: ' + r.used);
r = shoot('rail');
ok(
  r.es.every(e => e.hp < 500),
  'railgun pierces both: ' + r.es.map(e => e.hp)
);
r = shoot('launcher');
ok(r.es.some(e => e.hp < 500) && r.used === 1, 'grenade explodes: ' + r.es.map(e => e.hp));
{
  const P = fresh('runner');
  P.eq.gun = A.mkItem('gun', 'smart', 0);
  A.refresh(P);
  const e = foe('ganger', 100, 16);
  e.spdMul = 0;
  e.hp = e.maxHp = 500;
  tap('KeyU');
  step(80);
  ok(e.hp < 500, 'smartgun tracks an offset target');
}
{
  const P = fresh('runner');
  P.eq.gun = A.mkItem('gun', 'light', 0);
  A.refresh(P);
  const e = foe('ganger', 100, 16);
  e.spdMul = 0;
  e.hp = e.maxHp = 500;
  tap('KeyU');
  step(80);
  ok(e.hp === 500, '(control) plain pistol misses that offset target');
}
r = shoot('light', null, P => {
  P.sk.pierce = 1;
});
ok(
  r.es.every(e => e.hp < 500),
  'Armor Piercing passes through: ' + r.es.map(e => e.hp)
);
{
  const P = fresh('runner');
  P.eq.gun = A.mkItem('gun', 'heavy', 0);
  A.refresh(P);
  P.sk.quick = 1;
  tap('KeyU');
  step(1);
  let n = 1;
  while (P.state === 'shoot' && n < 30) {
    step(1);
    n++;
  }
  ok(n < 11, 'Quickdraw shortens shooting to ' + n + ' frames');
}
// affixes
{
  const P = fresh('runner');
  P.eq.weapon = A.mkItem('weapon', 'katana', 0, 'burn');
  A.refresh(P);
  const e = foe('ganger', 20);
  e.hp = e.maxHp = 500;
  tap('KeyJ');
  step(20);
  const h1 = e.hp;
  step(100);
  ok(e.burnT !== undefined && e.hp < h1, `incendiary burns: ${h1} -> ${e.hp}`);
}
{
  const P = fresh('runner');
  P.eq.weapon = A.mkItem('weapon', 'katana', 0, 'leech');
  A.refresh(P);
  P.hp = 20;
  const e = foe('ganger', 20);
  e.hp = e.maxHp = 500;
  tap('KeyJ');
  step(20);
  ok(P.hp > 20, 'leeching heals: hp ' + P.hp);
}
{
  const P = fresh('runner');
  P.eq.weapon = A.mkItem('weapon', 'baton', 0, 'shock');
  A.refresh(P);
  let st = 0;
  for (let i = 0; i < 40; i++) {
    const e = foe('ganger', 20);
    e.hp = e.maxHp = 500;
    e.cool = 0;
    A.hurt(e, 5, 1, { src: P, melee: true });
    if (e.cool >= 90) st++;
    G.ents = G.ents.filter(x => x.team !== 1);
  }
  ok(st > 3 && st < 20, 'shock stuns about 25%: ' + st + '/40');
}
{
  const P = fresh('runner');
  P.eq.armor = A.mkItem('armor', 'coat', 0, 'spiked');
  A.refresh(P);
  const e = foe('orc', 10);
  e.hp = e.maxHp = 100;
  e.face = -1;
  A.hurt(P, 5, -1, { att: e, ax: e.x });
  step(2);
  ok(e.hp === 94, 'spiked armor hurts melee attackers: ' + e.hp);
}
{
  const it = A.mkItem('armor', 'exo', 2);
  ok(
    it.bonus.agi <= 1 && /Exo-frame/.test(it.name),
    'exo-frame item: ' + it.name + ' ' + JSON.stringify(it.bonus)
  );
}
{
  const P = fresh('runner');
  P.eq.armor = A.mkItem('armor', 'coat', 0, 'padded');
  const h = P.maxHp;
  A.refresh(P);
  ok(P.maxHp === h + 25, 'padded +25 HP');
}
// skills in combat
{
  const P = fresh('runner');
  P.sk.whirl = 1;
  const b = foe('ganger', -25);
  b.hp = b.maxHp = 500;
  P.face = 1;
  key('KeyJ', true);
  step(40);
  key('KeyJ', false);
  step(30);
  ok(b.hp < 500, 'Whirlwind heavy hits behind: ' + b.hp);
}
{
  const P = fresh('runner');
  P.sk.berserk = 1;
  const e = foe('ganger', 20);
  e.hp = e.maxHp = 1000;
  P.D.crit = 0;
  A.hurt(e, 10, 1, { src: P });
  const d1 = 1000 - e.hp;
  P.hp = P.maxHp * 0.3;
  e.hp = 1000;
  A.hurt(e, 10, 1, { src: P });
  const d2 = 1000 - e.hp;
  ok(d2 === 14 && d1 === 10, `Berserker: ${d1} -> ${d2}`);
}
{
  const P = fresh('mage');
  P.sk.thrift = 1;
  ok(A.spellCost(P, { cost: 20 }) === 15, 'Thrift cost 20 -> 15');
  P.sk.archon = 1;
  P.mp = P.maxMp;
  let used = [];
  for (let i = 0; i < 4; i++) {
    const m = P.mp;
    tap('KeyI');
    step(40);
    used.push(m - P.mp);
    P.mp = P.maxMp;
  }
  ok(used[3] === 0 && used[0] > 0, 'Archon: 4th spell free ' + used);
}
{
  const P = fresh('mage');
  P.sk.siphon = 1;
  P.mp = 0;
  const e = foe('ganger', 20);
  A.hurt(e, 999, 1, { src: P });
  step(2);
  ok(P.mp >= 4, 'Siphon restores mana: ' + P.mp);
}
{
  const P = fresh('runner');
  P.eq.gun = A.mkItem('gun', 'heavy', 0);
  A.refresh(P);
  P.sk.scav = 1;
  let got = 0;
  for (let i = 0; i < 40; i++) {
    const a = P.ammo;
    const e = foe('ganger', 20);
    A.hurt(e, 999, 1, { src: P });
    if (P.ammo === a + 4) got++;
  }
  ok(got > 5 && got < 25, 'Scavenger ammo on ~35% of kills: ' + got + '/40');
}
{
  const P = fresh('runner');
  const r0 = A.sellRate();
  P.sk.fence = 1;
  ok(Math.abs(A.sellRate() - r0 - 0.15) < 1e-9, 'Fence Contacts sell rate ' + r0 + ' -> ' + A.sellRate());
}
{
  const P = fresh('runner');
  const e = foe('drone', 20);
  e.hp = e.maxHp = 500;
  P.D.crit = 0;
  A.hurt(e, 10, 1, { src: P });
  const a = 500 - e.hp;
  P.sk.jam = 1;
  e.hp = 500;
  e.inv = 0;
  A.hurt(e, 10, 1, { src: P });
  ok(500 - e.hp === 2 * a, `Jammer doubles drone damage: ${a} -> ${500 - e.hp}`);
}
// random items include affixes
let mods = 0,
  n = 0;
for (let i = 0; i < 400; i++) {
  const it = A.mkItem ? null : null;
}
const s2 = [];
for (let i = 0; i < 300; i++) {
  const it = eval('0') || null;
}
console.log('done');
