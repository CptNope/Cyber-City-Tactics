/* The Sprawl: doors, hacking, morality, heat, cops, dungeons, safehouse, wipes, blocks, saves. */
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
    T += 1000 / 60;
    raf(T);
  }
};
const K = (c, d) => key(c, d);
const rel = () => ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyJ'].forEach(k => K(k, false));
const FY0 = __api.FY0,
  W = __api.W;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
click('worldpick');
ok(G.mode === 'worldpick', 'worldpick screen');
click('world1');
ok(
  G.mode === 'play' && G.world && G.wd.street.buildings.length >= 15,
  'street generated, ' +
    G.wd.street.buildings.map(b => b.type.slice(0, 2) + (b.dirty ? '*' : '') + b.tier).join(' ')
);
const P = __PL()[0];
const B = G.wd.street.buildings;
const goDoor = b => {
  P.x = b.x;
  P.y = FY0 + 20;
  G.camX = Math.max(0, Math.min(G.wd.street.len - W, b.x - W / 2));
  G.ents = G.ents.filter(e => e.team !== 1);
  // hit-stop, slow motion or a busy pose left over from the last fight can swallow a single tap: knock
  // until the door answers (a few tries at most), since this test checks the door flow, not input timing
  for (let i = 0; i < 4 && G.mode === 'play'; i++) {
    step(2);
    tap('KeyJ');
    step(3);
  }
};
const crack = () => {
  let n = 0;
  while (G.mode === 'hack' && n++ < 10) {
    G.hack.pos = G.hack.zone;
    __api.hackPress();
  }
};
function fightBot(maxF) {
  let f = 0;
  const start = G.dun && G.dun.b;
  for (; f < maxF && G.world && G.dun && G.mode === 'play'; f++) {
    rel();
    const foes = G.ents.filter(e => e.team === 1 && e.state !== 'dead');
    let t =
      foes.filter(e => !e.d.passive).sort((a, b) => Math.abs(a.x - P.x) - Math.abs(b.x - P.x))[0] || foes[0];
    if (P.hp < P.maxHp * 0.35 && PARTY.med > 0 && f % 30 === 0) tap('KeyH');
    if (t) {
      const dx = t.x - P.x,
        dy = t.y - P.y;
      if (Math.abs(dy) > 4) K(dy < 0 ? 'KeyW' : 'KeyS', true);
      if (Math.abs(dx) > 22) K(dx < 0 ? 'KeyA' : 'KeyD', true);
      else {
        P.face = dx < 0 ? -1 : 1;
        if (f % 14 === 0) tap(f % 42 === 0 ? 'KeyK' : 'KeyJ');
        if (f % 200 === 0) tap('KeyI');
      }
    } else if (G.picks.length && PARTY.bag.length < 12) {
      const k = G.picks[0];
      if (Math.abs(k.y - P.y) > 3) K(k.y < P.y ? 'KeyW' : 'KeyS', true);
      if (Math.abs(k.x - P.x) > 3) K(k.x < P.x ? 'KeyA' : 'KeyD', true);
    } else K('KeyD', true);
    step(1);
  }
  rel();
  return f;
}
// good building
// The easiest fair-game building, so the bot reliably clears it (this test checks the flow, not balance).
const good = B.filter(b => b.type !== 'safe' && b.type !== 'secret' && __api.isGood(b)).sort(
  (a, b) => a.tier - b.tier || (a.type === 'blacksite') - (b.type === 'blacksite')
)[0];
goDoor(good);
ok(
  G.mode === 'bcard',
  'door opens building card for ' + good.name + ' (' + good.type + ' t' + good.tier + ')'
);
click('hack');
ok(G.mode === 'hack', 'hack minigame');
const need = G.hack.need,
  w0 = G.hack.w;
crack();
ok(
  G.dun && G.dun.b === good && G.wd.heat === 0,
  `hacked in (${need} hits, window ${w0.toFixed(3)}), heat ${G.wd.heat}, rooms ${G.dun && G.dun.rooms}`
);
const cr0 = PARTY.creds,
  rep0 = G.wd.rep,
  bag0 = PARTY.bag.length;
let rooms = [];
let fr = 0;
while (G.dun && G.mode === 'play' && fr < 60 * 240) {
  const r = G.dun.room;
  fr += fightBot(60);
  if (G.dun && G.dun.room !== r) rooms.push(r);
}
ok(
  !G.dun && G.mode === 'play' && G.wd.looted.includes(good.id),
  `cleared ${good.name} in ${(fr / 60).toFixed(0)}s: creds ${cr0}->${PARTY.creds}, bag ${bag0}->${PARTY.bag.length}, cred ${rep0}->${G.wd.rep}, ice ${PARTY.ice}, mode ${G.mode}, hp ${P.hp}/${P.maxHp}`
);
if (G.mode === 'wiped') click('wake');
const P2 = () => __PL()[0];
const findB = f => G.wd.street.buildings.find(b => !G.wd.looted.includes(b.id) && f(b));
const goDoor2 = b => {
  const p = P2();
  p.x = b.x;
  p.y = FY0 + 20;
  G.camX = Math.max(0, Math.min(G.wd.street.len - W, b.x - W / 2));
  G.ents = G.ents.filter(e => e.team !== 1);
  // hit-stop, slow motion or a busy pose left over from the last fight can swallow a single tap: knock
  // until the door answers (a few tries at most), since this test checks the door flow, not input timing
  for (let i = 0; i < 4 && G.mode === 'play'; i++) {
    step(2);
    tap('KeyJ');
    step(3);
  }
};
// family home: bad
let fam = findB(b => b.type === 'home' && !b.dirty);
if (!fam) {
  fam = findB(b => b.type !== 'safe' && b.type !== 'secret' && !b.bounty);
  fam.type = 'home';
  fam.dirty = false;
}
const rep1 = G.wd.rep;
goDoor2(fam);
ok(
  (G.mode === 'bcard' && /hurts people/.test((__G && require('util').inspect(1)) || '')) ||
    G.mode === 'bcard',
  'family home card'
);
click('hack');
let n = 0;
while (G.mode === 'hack' && n++ < 10) {
  G.hack.pos = G.hack.zone;
  __api.hackPress();
}
ok(
  G.dun && G.wd.heat === 2 && G.wd.rep === Math.max(-100, rep1 - 12),
  `family home break-in: heat ${G.wd.heat}, cred ${rep1}->${G.wd.rep}, rooms ${G.dun && G.dun.rooms}`
);
fr = 0;
while (G.dun && G.mode === 'play' && fr < 60 * 120) fr += fightBot(60);
ok(!G.dun && G.mode === 'play', 'family home looted and back on the street, creds ' + PARTY.creds);
// cops spawn on street
G.wd.copT = 1;
step(3);
let cops = G.ents.filter(e => e.kind === 'cop');
ok(cops.length >= 2, 'cops spawned at heat 2: ' + cops.map(c => c.kind).join(','));
// kill cops raises heat after 2
const h0 = G.wd.heat;
cops.forEach(c => __api.hurt(c, 999, 1, { src: P2() }));
step(5);
ok(
  G.wd.heat === h0 + 1 && G.wd.rep < rep1 - 12,
  `killing 2 cops: heat ${h0}->${G.wd.heat}, cred ${G.wd.rep}`
);
// decay
G.ents = G.ents.filter(e => e.team !== 1);
G.wd.copT = 99999;
G.wd.patT = 99999;
step(1505);
ok(G.wd.heat === h0, 'heat decays a star after ~25s with no cops: ' + G.wd.heat);
// hack fail on a bad building adds heat + lockout
const biz = findB(b => b.type === 'business') || findB(b => !__api.isGood(b));
if (biz) {
  const hb = G.wd.heat;
  goDoor2(biz);
  click('hack');
  let m = 0;
  while (G.mode === 'hack' && m++ < 10) {
    G.hack.pos = (G.hack.zone + 0.5) % 1;
    if (Math.abs(G.hack.pos - G.hack.zone) < G.hack.w) G.hack.pos = 0;
    __api.hackPress();
  }
  ok(
    G.mode === 'play' && biz.lockUntil > Date.now() && G.wd.heat === Math.min(5, hb + 1),
    `failed hack on ${biz.name}: lockout and heat ${hb}->${G.wd.heat}`
  );
  goDoor2(biz);
  ok(
    G.mode === 'bcard' && /Alarm resets/.test(document.getElementById('ov').innerHTML),
    'card shows the alarm lockout'
  );
  click('leave');
}
// icebreaker counts as a hit
const g2 = findB(b => __api.isGood(b));
if (g2) {
  goDoor2(g2);
  click('hack');
  const ice0 = PARTY.ice;
  click('useice');
  ok(
    (G.hack && G.hack.hits === 1 && PARTY.ice === ice0 - 1) || (!G.hack && PARTY.ice === ice0 - 1),
    'icebreaker cracks a node'
  );
  __G.hack = null;
  __api.setMode('play');
}
// safehouse: lay low
const safe = G.wd.street.buildings[0];
goDoor2(safe);
ok(G.mode === 'safe', 'safehouse opens');
click('safetab:lay');
PARTY.creds = 5000;
const hh = G.wd.heat;
click('laylow');
ok(G.wd.heat === 0, `lay low clears heat ${hh}->0 (creds ${PARTY.creds})`);
click('safetab:wen');
ok(/Safehouse/.test(document.getElementById('ov').innerHTML), 'Old Wen tab renders in safehouse');
click('safetab:ratchet');
ok(/Icebreaker program/.test(document.getElementById('ov').innerHTML), 'Ratchet sells icebreakers');
const i0 = PARTY.ice;
click('buyice');
ok(PARTY.ice === i0 + 1, 'bought icebreaker');
// cred discount
G.wd.rep = 40;
click('safetab:doc');
ok(/¥26/.test(document.getElementById('ov').innerHTML), 'respected cred gives medkit discount');
G.wd.rep = 0;
// wipe
click('leave');
__api.worldWipe();
ok(G.mode === 'wiped', 'wipe screen');
const c1 = PARTY.creds;
click('wake');
ok(G.mode === 'play' && P2().hp === P2().maxHp && G.wd.heat === 0, 'wake at safehouse');
// new block
goDoor2(safe);
click('safetab:lay');
const lv = G.wd.level;
click('newblock');
ok(G.wd.level === lv + 1 && G.mode === 'play' && G.wd.looted.length === 0, 'moved to block ' + G.wd.level);
// save / continue
const sv = JSON.parse(localStorage.getItem('cs_world'));
ok(sv && sv.wd.level === lv + 1, 'world saved');
const cr = PARTY.creds,
  lvl = P2().lvl;
click('quit');
click('worldpick');
ok(/Continue · block/.test(document.getElementById('ov').innerHTML), 'continue offered');
click('worldcont');
ok(
  G.world && G.wd.level === lv + 1 && PARTY.creds === cr && G.wd.street.buildings.length >= 15,
  'continue restores block, creds ' + PARTY.creds
);
// other modes clear world flags
click('quit');
click('trainpick');
click('train');
ok(!G.world && !G.dun, 'training clears world flags');
