/* Cyber City Tactics · src/js/modes/arena.js
 * Arena waves and perks, daily/weekly challenges, campaign mutators, run stats, sharing and the high-score
 * table.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ---------- arena ---------- */
const HOME = 'https://cptnope.github.io/Cyber-City-Tactics/';
const MODS = {
  glass: { name: 'Glass Cannon', desc: 'Everyone hits 60% harder, you included.' },
  keg: { name: 'Powder Keg', desc: 'Explosive drums every wave, with bigger blasts.' },
  elite: { name: 'Elite Week', desc: 'Every regular enemy is an elite. Every one drops gear.' },
  tide: { name: 'Spirit Tide', desc: 'Fire spirits join every wave. Bring fists and spells.' },
  brawl: { name: 'Bare Knuckles', desc: 'Guns are locked. Punches and kicks hit 40% harder.' }
};
function hstr(s) {
  let h = 2166136261;
  for (const c of s) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function weekId(d) {
  d = d || new Date();
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return y + '-W' + String(w).padStart(2, '0');
}
function dayId(d) {
  d = d || new Date();
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}
function thisDay() {
  const id = dayId(),
    ks = Object.keys(MODS),
    as = ['runner', 'samurai', 'mage', 'gunslinger'];
  return {
    id: 'D' + id,
    day: id,
    mod: ks[hstr(id + 'm') % ks.length],
    arch: as[hstr(id + 'a') % as.length],
    daily: true
  };
}
function thisWeek() {
  const id = weekId(),
    ks = Object.keys(MODS);
  return { id, mod: ks[hstr(id) % ks.length] };
}
const modOn = k =>
  !!(
    (G.arena && G.challenge && G.challenge.mod === k) ||
    (!G.arena && !G.training && !G.world && G.muts && G.muts.includes(k))
  );
const MUTS = {
  glass: 'Glass Cannon',
  elite: 'Elite Streets',
  brawl: 'Bare Knuckles',
  iron: 'One Life',
  turbo: 'Turbo',
  fog: 'Fog',
  split: 'Split',
  pacifist: 'Pacifist'
};
const MUTD = {
  glass: 'Everyone hits 60% harder, you included.',
  elite: 'Every regular enemy is an elite.',
  brawl: 'Guns are locked; punches and kicks hit 40% harder.',
  iron: 'Each runner gets one life per district.',
  turbo: 'Everything runs 25% faster, you included.',
  fog: 'Enemies stay hidden until they are close.',
  split: 'Regular enemies split in two when they go down.',
  pacifist: 'Clear a district without firing a gun for double contract karma.'
};
const mutN = () => (!G.arena && !G.world && !G.training && G.muts ? G.muts.length : 0);
const maxLives = () => (mutN() && G.muts.includes('iron') ? 1 : 3);
// Seeded streams so everyone gets the same waves and perk offers in a given week
const wr = () => (G.rngW ? G.rngW() : Math.random()),
  pr = () => (G.rngP ? G.rngP() : Math.random());
const wpick = a => a[Math.floor(wr() * a.length)];
function newRunStats() {
  G.run = { kills: 0, elites: 0, bosses: 0, dealt: 0, taken: 0 };
}
function statsHtml() {
  const r = G.run || { kills: 0, elites: 0, bosses: 0, dealt: 0, taken: 0 };
  return `<div class="stats"><div><b>${r.kills}</b><span>Takedowns</span></div><div><b>${r.elites}</b><span>Elites</span></div><div><b>${r.bosses}</b><span>Bosses</span></div><div><b>${Math.round(r.dealt).toLocaleString()}</b><span>Damage dealt</span></div><div><b>${Math.round(r.taken).toLocaleString()}</b><span>Damage taken</span></div><div><b>${G.bestCombo}</b><span>Best combo</span></div></div>`;
}
function shareLine() {
  const who = G.coop ? 'co-op' : 'solo',
    d = DIFF[G.diff].name;
  if (G.mode === 'arenaover') {
    const e = G.lastEntry || { score: 0, wave: 0 };
    return `Cyber City Tactics Arena${G.challenge ? ` · ${G.challenge.daily ? 'daily ' + G.challenge.day : 'weekly ' + G.challenge.id} "${MODS[G.challenge.mod].name}"` : ' · seed ' + G.arenaSeed}: ${e.score.toLocaleString()} points, wave ${e.wave} (${d}, ${who}), best combo ${e.combo}. Beat it: ${HOME}${G.challenge ? '' : '?seed=' + G.arenaSeed}`;
  }
  return `Cyber City Tactics: took down Director Voss on ${d}${G.ng ? ' NG+' + G.ng : ''} (${who}), level ${PL[0].lvl}, best combo ${G.bestCombo}, ${(G.run || {}).kills || 0} takedowns. Play: ${HOME}`;
}
function shareHtml() {
  const t = shareLine();
  return `<h3>Brag</h3><div class="sharebox" id="shareTxt">${esc(t)}</div><div class="row"><button class="btn sm" data-a="copyshare" id="copyBtn">Copy</button>${navigator.share ? '<button class="btn sm ghost" data-a="nativeshare">Share…</button>' : ''}</div>`;
}
const PERKS = [
  {
    id: 'pts',
    name: 'Street smarts',
    desc: '+2 attribute points and +1 skill point for each runner.',
    ok: () => true,
    go() {
      for (const p of PL) {
        p.pts += 2;
        p.spts = (p.spts || 0) + 1;
      }
    }
  },
  {
    id: 'heal',
    name: 'Patch up',
    desc: 'Full HP and mana for everyone, plus 2 medkits.',
    ok: () => true,
    go() {
      for (const p of active()) {
        p.hp = p.maxHp;
        p.mp = p.maxMp;
      }
      PARTY.med = Math.min(5, PARTY.med + 2);
    }
  },
  {
    id: 'gear',
    name: 'Supply crate',
    desc: 'A Tuned or better item goes into the bag.',
    ok: () => PARTY.bag.length < 12,
    go() {
      const it = randItem(G.stage + G.ng, true);
      if (!it.rar) Object.assign(it, mkItem(it.slot, it.base, 1));
      PARTY.bag.push(it);
      G.texts.push({
        x: W / 2,
        y: 150,
        z: 0,
        s: it.name.toUpperCase(),
        c: ['#efe9ff', '#45d2ff', '#ffc63d'][it.rar],
        life: 80
      });
    }
  },
  {
    id: 'ammo',
    name: 'Ammo drop',
    desc: '+20 rounds for each runner.',
    ok: () => true,
    go() {
      for (const p of PL) p.ammo += 20;
    }
  },
  {
    id: 'spell',
    name: "Old Wen's scroll",
    desc: "Each runner learns a spell they don't know, no Magic needed.",
    ok: () => PL.some(p => p.spells.length < 3),
    go() {
      for (const p of PL) {
        const n = Object.keys(SPELLS).find(x => !p.spells.includes(x));
        if (n) p.spells.push(n);
      }
    }
  },
  {
    id: 'life',
    name: 'Second wind',
    desc: '+1 life each. Brings back anyone who is out.',
    ok: () => true,
    go() {
      for (const p of PL) {
        if (p.out) {
          p.out = false;
          p.lives = 0;
          p.hp = p.maxHp;
          p.mp = p.maxMp;
          setS(p, 'idle');
          p.dead = false;
          p.x = 200;
          p.y = 220;
          p.z = 0;
          p.inv = 90;
          G.ents.push(p);
        } else p.lives++;
      }
    }
  },
  {
    id: 'ally',
    name: 'Hired help',
    desc: 'A random companion joins you, or yours is patched up and toughened by a quarter.',
    ok: () => true,
    go() {
      if (PARTY.ally && G.ents.some(e => e.kind === 'ally' && e.state !== 'dead')) {
        PARTY.ally.maxHp = Math.round(PARTY.ally.maxHp * 1.25);
        PARTY.ally.hp = PARTY.ally.maxHp;
        const e = G.ents.find(x => x.kind === 'ally');
        e.maxHp = PARTY.ally.maxHp;
        e.hp = e.maxHp;
      } else {
        PARTY.ally = null;
        spawnAlly(pick(Object.keys(ALLIES).filter(k => !ALLIES[k].hidden)));
      }
    }
  },
  {
    id: 'cyber',
    name: 'Back-alley chrome',
    desc: 'Each runner gets +1 level of random cyberware (it still costs max mana).',
    ok: () => PL.some(p => p.cy.arm + p.cy.wired + p.cy.plate < 9),
    go() {
      for (const p of PL) {
        const ks = ['arm', 'wired', 'plate'].filter(k => p.cy[k] < 3);
        if (ks.length) {
          p.cy[pick(ks)]++;
          refresh(p);
        }
      }
    }
  }
];
function startArena(coop, challenge) {
  G.diff = challenge ? 1 : G.pendDiff;
  G.ng = 0;
  G.coop = !!coop;
  G.challenge = challenge === 'day' ? thisDay() : challenge ? thisWeek() : null;
  if (G.challenge && G.challenge.daily) {
    G.pendArch[0] = G.challenge.arch;
    const dd = store.load('cs_day') || {};
    const y = dayId(new Date(Date.now() - 864e5));
    if (dd.last !== G.challenge.day) {
      dd.streak = dd.last === y ? (dd.streak || 0) + 1 : 1;
      dd.last = G.challenge.day;
    }
    if (dd.id !== G.challenge.id) {
      dd.id = G.challenge.id;
      dd.score = 0;
      dd.wave = 0;
    }
    store.set('cs_day', dd);
    feat('daily');
    if (dd.streak >= 3) feat('streak');
  } else if (G.challenge) feat('weekly');
  // open runs get a seed too, so any run can be shared and replayed
  if (!G.challenge && !G.arenaSeed) G.arenaSeed = seedCode('arena', newSeed());
  const sid = G.challenge ? G.challenge.id : G.arenaSeed;
  G.rngW = srng(hstr(sid + 'w'));
  G.rngP = srng(hstr(sid + 'p'));
  newRunStats();
  PL = [newRunner(0)];
  if (coop) PL.push(newRunner(1));
  Object.assign(PARTY, { creds: 0, bag: [], med: 2, contract: null, ally: null });
  PL.forEach((p, i) => applyArch(p, G.pendArch[i]));
  for (const p of PL) {
    p.lvl = 3;
    p.pts = 4;
    p.spts = (p.spts || 0) + 2;
    refresh(p);
    p.hp = p.maxHp;
    p.mp = p.maxMp;
  }
  G.arena = true;
  G.den = false;
  G.training = false;
  G.world = false;
  G.dun = null;
  G.score = 0;
  G.awave = 0;
  G.theme = 0;
  G.stage = 0;
  G.bestCombo = 0;
  resetWorld();
  G.bg = genBg(STAGES[0], 1000);
  placeRunners(190);
  for (const p of PL) G.ents.push(p);
  makeRain(true);
  G.fade = 1;
  G.nextWaveT = 80;
  G.perkPending = false;
  musicPlay('d0');
  setMode('play');
  if (G.challenge)
    G.texts.push({
      x: W / 2,
      y: 150,
      z: 0,
      s: MODS[G.challenge.mod].name.toUpperCase(),
      c: '#ffc63d',
      life: 120,
      big: true
    });
  tip(
    'arena',
    'Arena: survive as long as you can. A boss every fifth wave, a perk every third. Spend points from CHAR.',
    'Arena: survive as long as you can. A boss every fifth wave, a perk every third. Press C to spend points.'
  );
}
function nextArenaWave() {
  G.awave++;
  const w = G.awave;
  peak('wave', w);
  G.stage = Math.min(3, Math.floor((w - 1) / 3));
  G.ng = Math.max(0, (w - 10) * 0.07);
  const th = Math.floor((w - 1) / 5) % 5;
  if (th !== G.theme || !G.bg) {
    G.theme = th;
    G.bg = genBg(STAGES[th], 1000 + th * 77);
    makeRain(STAGES[th].rain);
  }
  const wantProps = modOn('keg') ? 4 : 2;
  while (G.props.length < wantProps) {
    const kinds = modOn('keg') ? ['drum'] : ['can', 'crate', 'drum'];
    G.props.push({
      kind: wpick(kinds),
      x: 80 + Math.floor(wr() * 320),
      y: FY0 + 20 + Math.floor(wr() * (FY1 - FY0 - 30)),
      z: 0
    });
  }
  const boss = w % 5 === 0;
  let list = [];
  if (boss) {
    list = [
      ['troll', 'blade', 'saint', 'archmage', 'blackice'][(w / 5 - 1) % 5],
      wpick(['ganger', 'sec', 'ghoul'])
    ];
    if (w >= 10) list.push(wpick(['riot', 'shaman']));
  } else {
    const pool = ['ganger'];
    if (w >= 2) pool.push('orc');
    if (w >= 3) pool.push('shaman');
    if (w >= 4) pool.push('sec');
    if (w >= 5) pool.push('drone', 'ghoul');
    if (w >= 7) pool.push('riot', 'spirit');
    if (w >= 6) pool.push('hound', 'hound');
    if (w >= 8) pool.push('ninja', 'feral');
    if (w >= 13) pool.push('mech');
    if (w >= 9) pool.push('glitch', 'ice');
    const n = Math.min(7, 2 + Math.floor(w * 0.5)) + (G.coop ? 1 : 0);
    for (let i = 0; i < n; i++) list.push(wpick(pool));
    let mechs = 0;
    list = list.map(k => (k === 'mech' && mechs++ ? 'sec' : k)); // one walker per wave is plenty
    if (modOn('tide')) list.push('spirit');
  }
  list.forEach((k, i) => {
    const e = spawnEnemy(k, i % 2 ? -1 : 1);
    e.x += (i >> 1) * (i % 2 ? -16 : 16);
    if (DEF[k].boss) {
      e.x = W - 40;
      e.y = (FY0 + FY1) / 2;
      e.inv = 40;
    }
  });
  if (w % 4 === 2 && !G.ents.some(e => e.kind === 'vend' && e.state !== 'dead'))
    spawnPassive('vend', 60 + Math.floor(wr() * 360), 182);
  if (w === 3)
    tip(
      'charge',
      'Hold PUNCH to charge a heavy blow, then let go.',
      'Hold J to charge a heavy blow, then let go.'
    );
  G.waveLive = true;
  G.banner = boss ? -120 : 110;
  musicPlay(boss ? 'boss' : 'd' + G.theme);
}
function arenaTick() {
  const foes = G.ents.filter(e => e.team === 1 && e.state !== 'dead' && !e.d.passive).length;
  if (G.waveLive && foes === 0) {
    G.waveLive = false;
    const b = G.awave * 150;
    G.score += b;
    G.texts.push({
      x: W / 2,
      y: 160,
      z: 0,
      s: 'WAVE ' + G.awave + ' CLEAR  +' + b,
      c: '#7dffb0',
      life: 90,
      big: true
    });
    sfx.loot();
    G.perkPending = G.awave % 3 === 0;
    G.nextWaveT = G.perkPending ? 70 : 150;
  }
  if (!G.waveLive && G.nextWaveT > 0) {
    G.nextWaveT--;
    if (G.nextWaveT === 0) {
      if (G.perkPending) {
        G.perkPending = false;
        offerPerks();
      } else nextArenaWave();
    }
  }
}
function offerPerks() {
  const ok = PERKS.filter(p => p.ok());
  const out = [];
  while (out.length < 3 && ok.length) out.push(ok.splice(Math.floor(pr() * ok.length), 1)[0]);
  G.perks = out.map(p => p.id);
  setMode('perk');
}
function arenaOver() {
  logRun(
    G.challenge ? (G.challenge.daily ? 'Daily' : 'Weekly') : 'Arena',
    'Wave ' + G.awave,
    (G.score || 0).toLocaleString() + ' pts'
  );
  const entry = {
    score: G.score,
    wave: G.awave,
    diff: G.diff,
    coop: G.coop,
    lvl: Math.max(...PL.map(p => p.lvl)),
    combo: G.bestCombo,
    date: new Date().toISOString().slice(0, 10),
    id: Date.now(),
    week: G.challenge ? G.challenge.id : null,
    mod: G.challenge ? G.challenge.mod : null
  };
  if (G.challenge && G.challenge.daily) {
    const dd = store.load('cs_day') || {};
    if (entry.score > (dd.score || 0)) {
      dd.score = entry.score;
      dd.wave = entry.wave;
      store.set('cs_day', dd);
    }
  } else if (G.challenge) {
    const wb = store.load('cs_week') || {};
    if (wb.id !== G.challenge.id || entry.score > (wb.score || 0))
      store.set('cs_week', { id: G.challenge.id, score: entry.score, wave: entry.wave });
  }
  const list = (store.load('cs_arena') || [])
    .concat([entry])
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  store.set('cs_arena', list);
  G.lastEntry = entry;
  musicPlay('title');
  setMode('arenaover');
}
function scoreTable(hl) {
  const list = store.load('cs_arena') || [];
  if (!list.length) return '<p>No runs yet. Your best scores show up here.</p>';
  return `<div class="list">${list.map((e, i) => `<div class="item"${hl && e.id === hl ? ' style="border-color:var(--gold)"' : ''}><div><div class="nm">${i + 1}. ${e.score.toLocaleString()} <span style="color:var(--muted);font-weight:400">· wave ${e.wave}</span></div><div class="ds">${e.week ? `Weekly ${e.week} · ${MODS[e.mod] ? MODS[e.mod].name : ''}` : DIFF[e.diff].name}${e.coop ? ' · co-op' : ''} · level ${e.lvl} · best combo ${e.combo} · ${e.date}</div></div><div class="acts">${hl && e.id === hl ? '<span style="color:var(--gold);font-size:12px;letter-spacing:.1em">NEW</span>' : ''}</div></div>`).join('')}</div>`;
}
