/* Bot plays the whole campaign on Runner difficulty and should win. */
require('./harness');
const G = __G,
  PARTY = __PARTY;
// Optional args: node tests/campaign-bot.test.js [coop] [difficulty 0-2] [NG+ runs]
const DIFFN = +(process.argv[3] || 1),
  NGRUNS = +(process.argv[4] || 0);
let minR = 1,
  meds = 0,
  dmgTaken = 0,
  ngDone = 0,
  elites = 0,
  enr = 0,
  lifeLost = 0;
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
click('pick');
click('diff:' + DIFFN);
click(COOP ? 'new2' : 'new');
let log = [],
  stats = { grabs: 0, throws: 0, props: 0, rolls: 0, maxCombo: 0, npc: 0 };
function spend() {
  for (let i = 0; i < __PL().length; i++) {
    click('who:' + i);
    const p = __PL()[i];
    let n = 0;
    while (p.pts > 0 && n++ < 40) click('attr:' + ['str', 'agi', 'bod', 'mag'][p.pts % 4]);
  }
}
function den() {
  for (const id of ['juno', 'sal', 'doc', 'wen', 'ratchet', 'pixel']) {
    __api.openNPC(id);
    stats.npc++;
    if (id === 'doc') {
      click('buy:med');
      click('buy:ammo');
      click('cyber:arm');
    }
    if (id === 'wen') {
      click('learn:bolt');
      click('learn:heal');
    }
    if (id === 'ratchet') {
      for (const it of G.stock.slice()) if (PARTY.creds > it.price + 60) click('fbuy:' + it.uid);
    }
    click('leave');
  }
  if (!__PARTY.ally) {
    __api.openNPC('kit');
    click('hire:brick');
    click('leave');
  }
  click('sheet');
  for (let i = 0; i < __PL().length; i++) {
    click('who:' + i);
    const p = __PL()[i];
    for (const it of PARTY.bag.slice()) {
      const cur = p.eq[it.slot];
      const k = it.slot === 'armor' ? 'arm' : 'dmg';
      if (!cur || it[k] > cur[k]) click('equip:' + it.uid);
    }
  }
  spend();
  click('close');
  log.push(
    `DEN after st${G.stage}: ally=${__PARTY.ally ? __PARTY.ally.type + ' ' + __PARTY.ally.hp : '-'} ${__PL()
      .map(
        p =>
          `${p.name} L${p.lvl} ${Object.values(p.eq)
            .map(i => i && i.name)
            .join('/')} sp:${p.spells}`
      )
      .join(' | ')} ¥${PARTY.creds} bag${PARTY.bag.length} deb:${G.debrief.done}`
  );
}
let denDone = -1;
for (let f = 0; f < 60 * 60 * 40; f++) {
  if (G.mode === 'brief') {
    click('sheet');
    spend();
    click('close');
    click('go');
  }
  if (G.mode === 'den' && denDone !== G.stage) {
    denDone = G.stage;
    den();
  }
  if (G.mode === 'over') {
    log.push('OVER st' + G.stage + ' at ' + ((f / 60) | 0) + 's');
    click('retry');
  }
  if (G.mode === 'win') {
    log.push(
      'WIN ' +
        ['Street', 'Runner', 'Prime'][G.diff] +
        ' NG' +
        G.ng +
        ' at ' +
        ((f / 60) | 0) +
        's lvls ' +
        __PL().map(p => p.lvl) +
        ' best combo ' +
        G.bestCombo
    );
    if (ngDone < NGRUNS) {
      ngDone++;
      click('ngplus');
      denDone = -1;
    } else break;
  }
  if (G.mode === 'play' || G.mode === 'den') {
    __PL().forEach((P, i) => {
      const K = MAPS[i];
      [K.l, K.r, K.u, K.d].forEach(k => key(k, false));
      if (P.out || P.state === 'dead') return;
      if (G.den) {
        key(K.r, true);
        return;
      }
      if (P.hp < P.maxHp * 0.35 && f % 40 === i) tap(K.h);
      if (f % 600 === i * 7) tap(K.q);
      if (P.state === 'grab') {
        if (P.knees < 2 && f % 6 === 0) tap(K.p);
        else if (f % 6 === 3) {
          tap(K.k);
          stats.throws++;
        }
        return;
      }
      if (P.holding) {
        const foe = G.ents.find(e => e.team === 1 && e.state !== 'dead');
        if (!foe) {
          tap(K.k);
          return;
        }
        if (foe) {
          if (Math.abs(foe.y - P.y) > 4) key(foe.y < P.y ? K.u : K.d, true);
          if (Math.sign(foe.x - P.x) !== P.face) key(foe.x < P.x ? K.l : K.r, true);
          else if (f % 5 === 0) tap(K.p);
        }
        return;
      }
      const foes = G.ents.filter(e => e.team === 1 && e.state !== 'dead');
      const prop = G.props.find(o => Math.abs(o.x - P.x) < 120 && o.x > G.camX + 10);
      let tgt = foes.length
        ? foes.sort((a, b) => Math.abs(a.x - P.x) - Math.abs(b.x - P.x))[0]
        : G.picks.find(
            k => ((k.k === 'gear' && PARTY.bag.length < 12) || k.k === 'chip') && k.x > G.camX + 12
          ) || null;
      if (foes.length && prop && Math.random() < 0.3 && Math.abs(prop.x - P.x) < 40) tgt = prop;
      if (tgt) {
        const dx = tgt.x - P.x,
          dy = tgt.y - P.y;
        if (Math.abs(dy) > 4) key(dy < 0 ? K.u : K.d, true);
        const isProp = tgt === prop;
        if (Math.abs(dx) > (foes.length && !isProp ? 24 : 6)) key(dx < 0 ? K.l : K.r, true);
        else if (foes.length && Math.sign(dx) !== P.face && !isProp) key(dx < 0 ? K.l : K.r, true);
        if (isProp && Math.abs(dx) < 14 && Math.abs(dy) < 8 && f % 5 === 0) {
          tap(K.p);
          if (P.holding || P.state === 'lift') stats.props++;
        } else if (foes.length && !isProp && f % 9 === i) {
          const near = G.ents.some(
            e => e.team === 1 && e.state === 'windup' && Math.abs(e.x - P.x) < 30 && Math.abs(e.y - P.y) < 8
          );
          const a =
            near && f % 2
              ? K.o
              : tgt.d && tgt.d.fly && !tgt.d.spirit
                ? K.j
                : Math.abs(dx) > 60
                  ? f % 2
                    ? K.s
                    : K.g
                  : [K.p, K.k, K.p][((f / 9) % 3) | 0];
          if (a === K.o) stats.rolls++;
          tap(a);
        }
        if (foes.length && tgt.d && tgt.d.fly && !tgt.d.spirit && f % 9 === 4 + i) tap(K.k);
        if (tgt.state === 'hurt' && f % 30 === i) key(dx < 0 ? K.l : K.r, true);
      } else key(K.r, true);
      if (P.state === 'grab') stats.grabs++;
    });
  }
  stats.maxCombo = Math.max(stats.maxCombo, G.combo);
  for (const e of G.ents) {
    if (e.elite && !e._c) {
      e._c = 1;
      elites++;
    }
    if (e.enraged && !e._r) {
      e._r = 1;
      enr++;
    }
  }
  for (const p of __PL()) {
    if (G.mode === 'play' && !p.out) minR = Math.min(minR, p.hp / p.maxHp);
    if (p._h !== undefined && p.hp < p._h) dmgTaken += p._h - p.hp;
    p._h = p.hp;
    if (p._l === undefined) p._l = p.lives;
    if (p.lives < p._l) lifeLost++;
    p._l = p.lives;
  }
  T += 1000 / 60;
  raf(T);
  if (f % 3600 === 0) {
    const P = __PL();
    log.push(
      `t${(f / 60) | 0}s ${G.mode} st${G.stage} w${G.wave} ${P.map(p => `${p.name} L${p.lvl} ${Math.round(p.hp)}/${p.maxHp} lives${p.lives}${p.out ? ' OUT' : ''}`).join(', ')} ¥${PARTY.creds} C:${PARTY.contract ? PARTY.contract.count + '/' + PARTY.contract.need + (PARTY.contract.done ? '✓' : '') + (PARTY.contract.failed ? '✗' : '') : '-'}`
    );
  }
}
console.log(log.join('\n'));
console.log(
  'stats',
  JSON.stringify(stats),
  'elites seen',
  elites,
  'bosses enraged',
  enr,
  'lives lost',
  lifeLost,
  'min hp%',
  Math.round(minR * 100),
  'dmg taken',
  Math.round(dmgTaken),
  'meds left',
  PARTY.med
);
for (const m of ['pause', 'sheet', 'title', 'over', 'win']) {
  G.ret = 'play';
  __api.setMode(m);
}
console.log('overlays ok; music', G.mode);
