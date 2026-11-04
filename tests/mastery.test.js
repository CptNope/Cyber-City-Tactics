/* Archetype mastery: past level 15 each archetype's own special grows (I at 15, II at 20: +25% each), and at
 * 25 (III) it changes how it works. */
'use strict';
require('./harness');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.tips = false;
const setup = (arch, lvl) => {
  G.pendArch = [arch, 'samurai'];
  A.newRun(false);
  A.startStage(0);
  step(5);
  const P = __PL()[0];
  P.lvl = lvl;
  A.refresh(P);
  G.ents = G.ents.filter(e => e.team !== 1 && e.kind !== 'ally');
  G.projs = [];
  G.zaps = [];
  return P;
};
const foes = (P, n, k) => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const e = A.spawnEnemy(k || 'ganger', 1);
    e.x = P.x + 40 + i * 14;
    e.y = P.y;
    e.cool = 1e9;
    e.club = null;
    e.elite = null;
    e.hp = e.maxHp = 9999;
    e.mercy = 'rolled';
    out.push(e);
  }
  return out;
};

let P = setup('runner', 14);
ok(A.masteryTier(P) === 0 && A.masteryPow(P) === 1, 'below level 15: no mastery');
P.lvl = 15;
ok(A.masteryTier(P) === 1 && A.masteryPow(P) === 1.25, 'level 15: Mastery I, +25%');
P.lvl = 20;
ok(A.masteryTier(P) === 2 && A.masteryPow(P) === 1.5, 'level 20: Mastery II, +50%');
P.lvl = 25;
ok(A.masteryTier(P) === 3 && A.masteryPow(P) === 1.5, 'level 25: Mastery III changes the special instead');
ok(
  Object.keys(A.ARCH).every(k => A.MASTERY[k]),
  'every archetype has a mastery III twist'
);

// the numbers grow
const buffAt = lvl => {
  const Q = setup('runner', lvl);
  Q.sp = 100;
  A.doSpecial(Q);
  return Q.buffT;
};
ok(buffAt(15) > buffAt(1) && buffAt(20) > buffAt(15), 'Adrenaline lasts longer with each tier');
const zapsAt = lvl => {
  const Q = setup('mage', lvl);
  foes(Q, 12);
  Q.sp = 100;
  A.doSpecial(Q);
  return G.zaps.length;
};
ok(
  zapsAt(1) === 6 && zapsAt(15) === 8 && zapsAt(20) === 10,
  'Mana Storm strikes more enemies with each tier'
);

// the twists
P = setup('samurai', 25);
P.sp = 100;
A.doSpecial(P);
ok(
  G.projs.filter(pr => pr.k === 'wave' && pr.team === 0).length === 2,
  'Samurai III: Blade Dance sends a shockwave each way'
);
P = setup('mage', 25);
const mf = foes(P, 3);
P.sp = 100;
A.doSpecial(P);
ok(
  mf.every(e => e.burnT > 0),
  'Mage III: Mana Storm sets its targets on fire'
);
P = setup('shaman', 25);
P.sp = 100;
A.doSpecial(P);
ok(G.ents.filter(e => e.summon && e.ally === 'ember').length === 3, 'Shaman III: a third fire spirit');
P = setup('rigger', 25);
P.sp = 100;
A.doSpecial(P);
ok(G.ents.filter(e => e.summon && e.ally === 'drone').length === 4, 'Rigger III: a fourth drone');
P = setup('gunslinger', 25);
P.sp = 100;
A.doSpecial(P);
ok(P.bulletPierce && P.freeAmmo > 0, 'Gunslinger III: Bullet Time rounds pierce');
P = setup('decker', 25);
const dr = foes(P, 1, 'drone')[0];
P.sp = 100;
A.doSpecial(P);
ok(
  dr.gone && G.ents.some(e => e.summon && e.name === 'Hacked drone'),
  'Decker III: Overload hacks the nearest drone for free'
);
P = setup('medic', 25);
const am = P.ammo;
P.burnT = 100;
P.sp = 100;
A.doSpecial(P);
ok(P.ammo === am + 8 && !(P.burnT > 0), 'Street Doc III: Triage tops up ammo and puts out fires');
P = setup('adept', 25);
P.sp = 100;
A.doSpecial(P);
ok(P.chiPunch && P.chiT > 360, 'Adept III: Killing Hands lasts longer and throws chi with every punch');
P = setup('runner', 25);
P.burnT = 100;
P.sp = 100;
A.doSpecial(P);
ok(!(P.burnT > 0) && P.inv >= 120, 'Street Runner III: Adrenaline clears burning and makes you untouchable');
// active skills don't take mastery: it's the archetype's own special
P = setup('runner', 25);
P.sk = Object.assign(P.sk, { iron: 1, breaker: 1, leech: 1 });
P.spSel = 'brawler';
P.sp = 100;
A.doSpecial(P);
ok(!(P.buffT > 0), 'mastery belongs to the archetype’s special, not an active skill');
// the sheet and the level-up
P = setup('samurai', 19);
G.sheetIdx = 0;
G.sheetTab = 'char';
A.setMode('sheet');
ok(
  /mastery I/.test(els.ov._h) && /II at level 20/.test(els.ov._h),
  'the sheet shows the mastery and what’s next'
);
A.setMode('play');
G.toasts = [];
P.lvl = 19;
P.karma = 0;
A.gainKarma(A.karmaNext(19) + 1);
ok(P.lvl >= 20 && G.toasts.some(t => /mastery II/.test(t.s)), 'reaching a mastery level says so');

/* ---------- skill effects in the HUD ---------- */
P = setup('runner', 10);
P.sk = Object.assign(P.sk, { berserk: 1 });
P.hp = P.maxHp;
ok(!A.skillTags(P).length, 'Berserker at full health: nothing to show');
P.hp = Math.floor(P.maxHp * 0.3);
ok(
  A.skillTags(P).some(t => t.k === 'berserk'),
  'below 40% HP the HUD marks Berserker as on'
);
G.texts = [];
step(7);
ok(
  G.texts.some(t => t.s === 'BERSERK'),
  'and says so as it switches on'
);
G.texts = [];
step(12);
ok(!G.texts.some(t => t.s === 'BERSERK'), 'once');
P = setup('mage', 10);
P.sk = Object.assign(P.sk, { archon: 1 });
const drawn = [];
const realFill = A.ctx.fillText;
A.ctx.fillText = function (s) {
  drawn.push(String(s));
  return realFill && realFill.apply(this, arguments);
};
P.casts = 1;
A.drawPanel(P, 10);
ok(
  drawn.some(s => /◆◇◇/.test(s)),
  'Archon: the spell line counts the casts toward the free one'
);
drawn.length = 0;
P.casts = 3;
A.drawPanel(P, 10);
ok(
  drawn.some(s => /FREE ×2/.test(s)),
  'and says when the next one is free'
);
A.ctx.fillText = realFill;
