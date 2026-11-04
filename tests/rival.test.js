/* Vane, the rival runner: where Vane turns up, growing tougher each meeting, remembering the attack you won
 * with, turning a third of those away, Vane's own special, and the memory carrying across runs. */
'use strict';
require('./harness');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
A.prefs.tips = false;
G.pendArch = ['samurai', 'runner'];
A.newRun(false);
A.startStage(1);
step(3);
G.cut = null;
const P = __PL()[0];
const realRandom = Math.random;
const calm = () => {
  G.ents = G.ents.filter(e => e.team !== 1);
  G.projs = [];
  G.texts = [];
};
delete A.LEG.rival;

/* ---------- where Vane turns up ---------- */
ok(
  A.RIVAL_STAGES.includes(1) && A.RIVAL_STAGES.includes(3) && A.RIVAL_STAGES.includes(4),
  'three campaign districts'
);
ok(A.RIVAL_BLOCKS.join() === '2,4', 'and Sprawl blocks 2 and 4');
calm();
A.rivalWave(0);
ok(!G.ents.some(e => e.kind === 'rival'), 'not on an early wave');
A.rivalWave(A.STAGES[1].waves.length - 2);
let v = G.ents.find(e => e.kind === 'rival');
ok(v && /Vane/.test(v.name) && /samurai/.test(v.name), 'the wave before the boss: Vane, in your own style');
ok(A.rivalRec().meets === 1 && G.texts.some(t => /RIVAL/.test(t.s)), 'a name card, and the meeting counted');
calm();
A.rivalWave(A.STAGES[1].waves.length - 2);
ok(!G.ents.some(e => e.kind === 'rival'), 'once per district per run');
A.startStage(0);
calm();
A.rivalWave(A.STAGES[0].waves.length - 2);
ok(!G.ents.some(e => e.kind === 'rival'), 'and not in the Barrens');

/* ---------- the fight, and the memory ---------- */
calm();
const hp1 = A.spawnRival(1).maxHp;
v = G.ents.find(e => e.kind === 'rival');
v.cool = 1e9;
v.spT = 1e9;
Math.random = () => 0.99;
for (let i = 0; i < 3; i++) {
  v.inv = 0;
  A.setS(v, 'idle');
  A.hurt(v, 20, 1, { src: P, bullet: true });
}
v.inv = 0;
A.setS(v, 'idle');
A.hurt(v, 5, 1, { src: P, melee: true });
ok(v.taken.gun > v.taken.melee, 'Vane keeps count of what hits');
v.inv = 0;
A.setS(v, 'idle'); // up off the floor: a downed foe can't be hit
v.hp = 10; // nearly done: the finisher only counts for what was left
A.hurt(v, 99999, 1, { src: P, melee: true });
Math.random = realRandom;
ok(v.state === 'dead' && A.rivalRec().wins === 1, 'Vane goes down');
// the killing blow was a punch, but you leaned on the gun all fight
ok(A.rivalRec().fav === 'gun', 'and remembers what did the most damage (the gun), not just the last blow');
A.LEG.rival.fav = 'gun';
calm();
const v2 = A.spawnRival(1);
v2.cool = 1e9;
v2.spT = 1e9;
ok(v2.maxHp > hp1, `tougher at the next meeting (${hp1} → ${v2.maxHp})`);
ok(
  v2.rivalFav === 'gun' && /gun/.test(G.texts.map(t => t.s).join() + JSON.stringify(G.texts)),
  'and ready for your gun'
);
Math.random = () => 0.01;
A.setS(v2, 'idle');
v2.inv = 0;
const h0 = v2.hp;
A.hurt(v2, 30, 1, { src: P, bullet: true });
ok(v2.hp === h0 && G.texts.some(t => t.s === 'DODGED'), 'a third of your shots, dodged outright');
Math.random = () => 0.99;
A.setS(v2, 'idle');
v2.inv = 0;
const h1 = v2.hp;
A.hurt(v2, 30, 1, { src: P, bullet: true });
const shot = h1 - v2.hp;
A.setS(v2, 'idle');
v2.inv = 0;
const h2 = v2.hp;
A.hurt(v2, 30, 1, { src: P, melee: true });
const punch = h2 - v2.hp;
Math.random = realRandom;
ok(shot < punch, `the rest take less (${shot} from a shot, ${punch} from a punch)`);

/* ---------- Vane's special ---------- */
calm();
const v3 = A.spawnRival(1);
v3.x = P.x + 80;
v3.y = P.y;
v3.spT = 0;
A.setS(v3, 'idle');
P.hp = P.maxHp;
P.inv = 0;
A.setS(P, 'idle');
ok(A.rivalTick(v3, P) && Math.abs(v3.x - P.x) < 30, 'a samurai’s Vane dashes in for a heavy strike');
ok(v3.spT === 600, 'every ten seconds');
A.setS(P, 'idle');
P.arch = 'gunslinger';
calm();
const v4 = A.spawnRival(1);
v4.x = P.x + 120;
v4.y = P.y;
v4.spT = 0;
A.setS(v4, 'idle');
const pj = G.projs.length;
A.rivalTick(v4, P);
ok(G.projs.length >= pj + 3, 'a gunslinger’s Vane fires a three-round burst');
P.arch = 'samurai';

/* ---------- the Sprawl, and the legend ---------- */
A.startWorld(false);
step(3);
G.wd.level = 2;
G.ents = G.ents.filter(e => e.team !== 1);
G.wd.rivalT = 1;
step(2);
ok(G.ents.some(e => e.kind === 'rival') && G.wd.rivalDone, 'on block 2, Vane comes looking for you');
A.LEG.rival.wins = 3;
A.rivalDown(G.ents.find(e => e.kind === 'rival'));
ok(A.LEG.feats.rival, 'three wins: Know Your Enemy');
A.saveLeg();
ok(JSON.parse(localStorage.getItem('cs_legend')).rival.wins >= 3, 'Vane’s memory is saved with your legend');
A.LEG.rival = 'junk';
ok(A.rivalRec().meets === 0 && A.rivalRec().fav === null, 'and a junk record starts over');
ok(A.BEST.rival, 'Vane has a bestiary entry');
