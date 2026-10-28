/* District 4, the Undercity Market: thralls, Mother Vesper's mist steps and drain, her contract and legendary. */
require('./harness');
const G = __G,
  A = __api,
  PARTY = __PARTY;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
G.pendArch = ['runner', 'samurai'];
click('pick');
click('new');
const S = A.STAGES[3];
ok(S.name === 'Undercity Market' && A.STAGES.length === 6, 'the Undercity Market is district 4 of 6');
ok(
  A.STAGES[4].name === 'Kagemori Arcology' && A.STAGES[5].name === 'Kagemori Host',
  'the Arcology and the Host follow it'
);
ok(S.waves[S.waves.length - 1].spawn.includes('vesper'), 'Mother Vesper waits at the end');
ok(A.CONTRACTS[3].key === 'thrall' && A.CONTRACTS.length === 6, "Juno's contract for it: take down thralls");
A.briefing(3, false);
ok(PARTY.contract && PARTY.contract.key === 'thrall', "Juno's briefing hands out that contract");
A.startStage(3);
G.mode = 'play';
const P = __PL()[0];
P.x = G.camX + 120;
P.y = 215;
P.inv = 0;
G.ents = G.ents.filter(e => e.team !== 1);
const v = A.spawnEnemy('vesper', 1);
v.x = P.x + 90;
v.y = P.y;
v.mistCD = 1;
v.state = 'idle';
let misted = false,
  untouchable = true;
for (let i = 0; i < 80; i++) {
  A.upEnemy(v);
  if (v.mist > 0) {
    misted = true;
    if (A.hurt(v, 5, 1, { melee: true, src: P })) untouchable = false;
  }
}
ok(misted && untouchable, 'she dissolves into mist, and nothing touches her while she drifts');
ok(
  Math.abs(v.x - P.x) < 34 && (v.state === 'windup' || v.state === 'idle'),
  'and reforms right next to a runner, mid-swing'
);
v.hp = 100;
A.setS(P, 'idle');
P.inv = 0;
A.hurt(P, 10, 1, { att: v, melee: true });
ok(v.hp > 100, 'every hit she lands heals her');
const th = A.spawnEnemy('thrall', 1);
th.hp = 20;
A.setS(P, 'idle');
P.inv = 0;
A.hurt(P, 10, 1, { att: th, melee: true });
ok(th.hp > 20, 'so do her thralls');
// enraged: she calls thralls
G.ents = G.ents.filter(e => e.kind !== 'thrall');
v.enraged = true;
v.mistCD = 9999;
v.thrT = 0;
v.state = 'idle';
A.upEnemy(v);
ok(G.ents.filter(e => e.kind === 'thrall').length === 2, 'once angry, she calls two thralls');
// her legendary
const fang = A.mkLegend('vfang');
P.eq.weapon = fang;
P.hp = 50;
P.mp = 0;
const victim = A.spawnEnemy('ganger', 1);
victim.inv = 0;
victim.hp = 1;
A.hurt(victim, 10, 1, { melee: true, src: P });
ok(P.hp >= 58 && P.mp >= 5, "Vesper's Fang: a takedown restores 8 HP and 5 mana");
ok(A.FEATBY.b_vesper && A.FEATBY.b_vesper.leg === 'vfang', 'beating her is a feat that unlocks the Fang');
ok(!!A.BEST.vesper && !!A.BEST.thrall, 'both go in the bestiary');
// an old save in the Arcology (district 4 of 5) resumes in the Arcology, now district 5
{
  const vm = require('vm');
  localStorage.setItem(
    'cs_save3',
    JSON.stringify({ v: 3, phase: 'brief', stage: 3, runners: [{ name: 'VEX' }], party: {} })
  );
  const s = A.store.load('cs_save3');
  ok(
    s && s.stage === 4 && A.STAGES[s.stage].name === 'Kagemori Arcology',
    'old saves land in the same district'
  );
  vm.runInThisContext('saveGame("den")');
  ok(JSON.parse(localStorage.getItem('cs_save3')).v === 4, 'new saves are marked as six-district saves');
}
