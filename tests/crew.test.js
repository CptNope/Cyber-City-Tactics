/* Crew contracts: hiring named runners from Kit, their specials, being downed and revived, their cut of each
 * payday, loyalty and what full loyalty changes. */
'use strict';
require('./harness');
const G = __G,
  A = __api,
  PARTY = __PARTY;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.tips = false;
G.pendArch = ['samurai', 'runner'];
A.newRun(true);
A.startStage(0);
step(5);
const P = __PL()[0],
  Q = __PL()[1];
const clear = () => {
  G.ents = G.ents.filter(e => e.team !== 1 && !(e.kind === 'ally'));
  G.projs = [];
  PARTY.ally = null;
  PARTY.creds = 1000;
};
const foe = (dx, k, o) => {
  const e = A.spawnEnemy(k || 'ganger', 1);
  e.x = P.x + dx;
  e.y = P.y;
  e.cool = 1e9;
  e.club = null;
  e.elite = null;
  e.hp = e.maxHp = 9999;
  e.mercy = 'rolled';
  e.inv = 0;
  Object.assign(e, o || {});
  return e;
};

/* ---------- Kit's card ---------- */
A.enterDen();
G.npc = 'kit';
A.setMode('npc');
ok(
  /Crew for hire/.test(els.ov._h) &&
    /Kestrel/.test(els.ov._h) &&
    /Pixel/.test(els.ov._h) &&
    /Moss/.test(els.ov._h),
  'Kit offers three named runners'
);
ok(/data-a="hirecrew:kestrel"/.test(els.ov._h) && /20% cut/.test(els.ov._h), 'each with a fee and a cut');
PARTY.creds = 50;
ok(!A.hireCrew('kestrel'), 'no hire without the fee');
PARTY.creds = 1000;
A.spawnAlly('brick');
PARTY.ally = { type: 'brick', hp: 100, maxHp: 100 };
click('hirecrew:kestrel');
ok(A.crewOf() === 'kestrel' && PARTY.creds === 1000 - A.crewFee('kestrel'), 'hire one: the fee is paid');
ok(
  G.ents.filter(e => e.kind === 'ally' && !e.summon).length === 1 && A.crewEnt().ally === 'kestrel',
  'and they take the companion slot (Brick goes)'
);
ok(!A.ALLIES.kestrel.desc && A.ALLIES.kestrel.hidden, 'crew are never a random Arena companion');
A.setMode('play');

/* ---------- specials ---------- */
A.startStage(0);
step(3);
clear();
A.hireCrew('kestrel');
let k = A.crewEnt();
k.x = P.x;
k.y = P.y;
const inLine = foe(60),
  inLine2 = foe(90),
  off = foe(70, 'ganger', { y: P.y + 40 > A.FY1 ? P.y - 40 : P.y + 40 });
ok(A.crewSpecial(k, inLine2), 'Kestrel: Blade Rush');
ok(
  inLine.hp < 9999 && inLine2.hp < 9999 && off.hp === 9999,
  'cuts everything in the line, and nothing off it'
);
clear();
A.hireCrew('pixel');
let px = A.crewEnt();
const g1 = foe(80);
ok(!A.crewSpecial(px, g1), 'Pixel: Shutdown waits for a machine');
const dr = foe(80, 'drone');
ok(A.crewSpecial(px, dr) && dr.stunT >= 150, 'then stuns every one on screen');
clear();
A.hireCrew('moss');
let ms = A.crewEnt();
ms.x = P.x;
ms.y = P.y;
P.hp = Math.round(P.maxHp / 2);
const h0 = P.hp,
  c1 = foe(40);
ok(
  A.crewSpecial(ms, c1) && P.hp > h0 && c1.curseT > G.t,
  'Moss: Mending heals the runners and curses the foes around her'
);
// the cooldown
clear();
A.hireCrew('kestrel');
k = A.crewEnt();
k.spT = 2;
const tg = foe(60);
A.crewTick(k, tg);
A.crewTick(k, tg);
ok(k.spT === 0 && tg.hp === 9999, 'the special charges first');
A.crewTick(k, tg);
ok(k.spT === 720 && tg.hp < 9999, 'then fires, and recharges for twelve seconds');

/* ---------- downed and revived ---------- */
clear();
A.hireCrew('kestrel');
k = A.crewEnt();
G.ents = G.ents.filter(e => e.team !== 1);
k.x = P.x + 200;
k.inv = 0;
A.hurt(k, 99999, 1, {});
step(3);
ok(
  k.state === 'dead' && k.downed && A.crewOf() === 'kestrel' && G.ents.includes(k),
  'down on the job: they wait where they fell'
);
ok(PARTY.ally.hp > 0, 'still on the books');
step(120);
ok(k.downed, 'nobody beside them: they stay down');
for (const r of __PL()) {
  r.x = k.x;
  r.y = k.y;
}
step(100);
ok(
  !k.downed && k.state !== 'dead' && k.hp === Math.round(k.maxHp * 0.5),
  'stand by them and they get back up'
);

/* ---------- paydays and loyalty ---------- */
A.crewRec('kestrel').loy = 0;
PARTY.creds = 500;
const cut = A.crewPay(300, 'contract');
ok(
  cut === 60 && PARTY.creds === 440 && A.crewRec('kestrel').loy === 1,
  'payday: a 20% cut, and a point of loyalty'
);
k.state = 'dead';
k.downed = true;
A.crewPay(300, 'contract');
ok(A.crewRec('kestrel').loy === 1, 'down at payday: they still take the cut, but no loyalty');
k.downed = false;
A.setS(k, 'idle');
k.hp = k.maxHp;
const c0 = PARTY.creds;
ok(
  A.crewPay(100, 'cache', true) === 20 && PARTY.creds === c0,
  'a Sprawl cache: the cut comes off what drops'
);
PARTY.crew.kestrel.loy = 4;
A.crewPay(100, 'contract');
ok(A.crewLoyal('kestrel') && A.LEG.feats.loyal, 'at five, they’re loyal (Ride or Die)');
A.crewPay(100, 'contract');
ok(A.crewRec('kestrel').loy === 5, 'and it tops out there');
// loyal specials
clear();
A.hireCrew('kestrel');
k = A.crewEnt();
k.x = P.x;
k.y = P.y;
const lf = foe(60);
A.crewSpecial(k, lf);
const once = 9999 - lf.hp;
ok(lf.dazeUntil > G.t, 'loyal Kestrel: Blade Rush dazes');
PARTY.crew.kestrel.loy = 0;
const lf2 = foe(60);
k.x = P.x;
A.crewSpecial(k, lf2);
ok(once > 9999 - lf2.hp, `and cuts twice (${once} vs ${9999 - lf2.hp})`);
clear();
PARTY.crew = { moss: { loy: 5 } };
A.hireCrew('moss');
ms = A.crewEnt();
Q.out = true;
Q.outX = Q.x;
Q.outY = Q.y;
G.ents = G.ents.filter(e => e !== Q);
A.crewSpecial(ms, foe(40));
ok(!Q.out, 'loyal Moss: Mending gets a downed partner up');

/* ---------- the contract pays the crew ---------- */
clear();
PARTY.crew = {};
A.hireCrew('pixel');
PARTY.contract.done = true;
PARTY.creds = 0;
A.stageClear();
const pay = A.CONTRACTS[G.stage].creds;
ok(
  G.debrief.cut === Math.round(pay * 0.25) && PARTY.creds === pay - G.debrief.cut,
  'clearing a district’s contract is a payday'
);
ok(A.crewRec('pixel').loy === 1, 'Pixel was standing: loyalty up');
A.saveGame('den');
ok(
  JSON.parse(localStorage.getItem('cs_save3')).party.crew.pixel.loy === 1,
  'loyalty is saved with the party'
);
PARTY.crew = 'junk';
ok(A.crewRec('pixel').loy === 0, 'a junk crew record is reset');
G.npc = 'kit';
A.setMode('npc');
ok(
  /With you/.test(els.ov._h) && /stand by them to get them up/.test(els.ov._h),
  'Kit’s card says how crew work when they go down'
);
