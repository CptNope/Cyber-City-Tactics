/* Cyber City Tactics · src/js/modes/hacking.js
 * The lock-cracking minigames. The building picks the lock: the classic timing lock (homes, businesses,
 * clubs, vaults and job terminals), Sequence (gang hideouts' keypads), Trace (a precinct's network) and
 * Firewall (a black site's ICE). Settings → Hacking minigames: Classic keeps every lock the timing one.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ----- hacking ----- */
function startHack(b, vault) {
  const hak = Math.max(...active().map(p => p.D.a.hak || 1)),
    tier = vault ? vault.lockTier || 4 : b.tier,
    decks = active()
      .map(p => p.eq && p.eq.deck)
      .filter(Boolean);
  G.hack = {
    b,
    vault: vault || null,
    tier,
    pos: 0,
    dir: 1,
    speed: (0.42 + 0.2 * tier) * Math.min(1, ...decks.map(d => d.slow || 1)), // a deck can slow the cursor
    need: tier + 1,
    hits: 0,
    miss: 0,
    maxMiss: 2 + (anyHas('spare') ? 1 : 0) + Math.max(0, ...decks.map(d => d.miss || 0)),
    w:
      clamp(0.1 + hak * 0.03 - tier * 0.02, 0.06, 0.32) *
      (anyHas('probe') ? 1.25 : 1) *
      (active().some(p => setOn(p, 'voltaic', 3)) ? 1.15 : 1) *
      (evOn('blackout') ? 1.3 : 1),
    zone: 0.5,
    flash: 0,
    flashCol: '',
    skip: false,
    // how much more time the other locks give: Hacking, Port Scanner and a slow deck all help
    ease:
      (((1 + hak * 0.04) * (anyHas('probe') ? 1.2 : 1)) / Math.min(1, ...decks.map(d => d.slow || 1))) *
      (evOn('blackout') ? 1.2 : 1)
  };
  G.hack.kind = hackKindFor(b, vault);
  if (G.hack.kind === 'seq') seqInit(G.hack);
  else if (G.hack.kind === 'trace') traceInit(G.hack);
  else if (G.hack.kind === 'wall') wallInit(G.hack);
  else newZone();
  setMode('hack');
}
// which lock a building has
function hackKindFor(b, vault) {
  if (prefs.hackKind === 'classic') return 'lock';
  if (vault && vault.hackKind) return vault.hackKind; // a stealth door or safe names its own lock
  if (vault || G.stealth || !b) return 'lock';
  return { hideout: 'seq', precinct: 'trace', blacksite: 'wall' }[b.type] || 'lock';
}
const HACK_NAMES = {
  lock: 'Timing lock',
  seq: 'Keypad sequence',
  trace: 'Network trace',
  wall: 'Firewall run'
};
const DIRS = ['up', 'left', 'right', 'down'];
const DIR_ICON = { up: '▲', left: '◀', right: '▶', down: '▼' };
/* --- Sequence: watch the pattern, then repeat it --- */
function seqInit(h) {
  const L = 3 + h.tier;
  h.seq = Array.from({ length: L }, () => pick(DIRS));
  h.need = L;
  seqShow(h);
}
function seqShow(h) {
  h.phase = 'show';
  h.i = 0;
  h.hits = 0;
  h.st = -30; // a beat before the first light
  h.lit = null;
}
function seqTick(h) {
  if (h.phase !== 'show') return;
  const on = Math.round(32 * h.ease),
    gap = 10;
  h.st++;
  const k = Math.floor(h.st / (on + gap)),
    inOn = h.st >= 0 && h.st % (on + gap) < on;
  h.lit = h.st >= 0 && k < h.seq.length && inOn ? h.seq[k] : null;
  if (h.st >= 0 && k >= h.seq.length) {
    h.phase = 'input';
    h.lit = null;
    hackInfo();
  }
}
function seqDir(h, d) {
  if (h.phase !== 'input') return;
  h.lit = d;
  h.litT = 8;
  if (d === h.seq[h.i]) {
    h.i++;
    h.hits = h.i;
    sfx.coin();
    if (h.i >= h.seq.length) return hackWin();
    hackInfo();
  } else if (hackMiss()) seqShow(h); // wrong pad: watch it again
}
/* --- Trace: walk the signal through the network before the trace finds you --- */
const TR_W = 7,
  TR_H = 4;
function traceInit(h) {
  const r = Math.random;
  h.sy = Math.floor(r() * TR_H);
  h.ex = TR_W - 1;
  h.ey = Math.floor(r() * TR_H);
  // a guaranteed route first, then walls everywhere else at random
  const path = new Set();
  let x = 0,
    y = h.sy;
  path.add(x + ',' + y);
  while (x < h.ex || y !== h.ey) {
    if (x < h.ex && (y === h.ey || r() < 0.6)) x++;
    else y += y < h.ey ? 1 : -1;
    path.add(x + ',' + y);
  }
  h.walls = [];
  for (let gx = 0; gx < TR_W; gx++)
    for (let gy = 0; gy < TR_H; gy++)
      if (!path.has(gx + ',' + gy) && r() < 0.32 + 0.06 * h.tier) h.walls.push(gx + ',' + gy);
  h.cx = 0;
  h.cy = h.sy;
  h.trail = [h.cx + ',' + h.cy];
  h.time = h.left = Math.round((7 + 3 * (4 - h.tier)) * 60 * h.ease);
  h.need = TR_W - 1;
  h.hits = 0;
}
function traceTick(h) {
  h.left--;
  if (h.left <= 0) hackFail();
}
function traceDir(h, d) {
  const nx = h.cx + (d === 'right' ? 1 : d === 'left' ? -1 : 0),
    ny = h.cy + (d === 'down' ? 1 : d === 'up' ? -1 : 0);
  if (nx < 0 || ny < 0 || nx >= TR_W || ny >= TR_H) return;
  if (h.walls.includes(nx + ',' + ny)) {
    hackMiss(); // ran into ICE
    return;
  }
  h.cx = nx;
  h.cy = ny;
  if (!h.trail.includes(nx + ',' + ny)) h.trail.push(nx + ',' + ny);
  h.hits = Math.max(h.hits, nx);
  sfx.click();
  if (nx === h.ex && ny === h.ey) return hackWin();
  hackInfo();
}
/* --- Firewall: the signal runs right; switch lanes to dodge the ICE until it's through --- */
function wallInit(h) {
  h.lane = 1;
  h.blocks = [];
  h.dur = h.left = Math.round((5 + h.tier * 2) * 60);
  h.spd = (0.9 + 0.25 * h.tier) / h.ease; // % of the track per step
  h.spawnT = 30;
  h.need = 1;
  h.hits = 0;
}
function wallTick(h) {
  h.left--;
  for (const k of h.blocks) k.x -= h.spd;
  // the signal sits at 12% of the track: a block passing over it in its lane is a hit
  for (const k of h.blocks)
    if (!k.hit && k.lane === h.lane && k.x < 15 && k.x > 6) {
      k.hit = true;
      if (!hackMiss()) return;
    }
  h.blocks = h.blocks.filter(k => k.x > -8 && !k.hit);
  if (--h.spawnT <= 0) {
    const last = h.blocks[h.blocks.length - 1];
    let lane = Math.floor(Math.random() * 3);
    if (last && last.x > 80 && lane === last.lane) lane = (lane + 1) % 3;
    h.blocks.push({ x: 104, lane });
    h.spawnT = Math.round((46 - h.tier * 6) * h.ease);
  }
  if (h.left <= 0) hackWin();
}
function wallDir(h, d) {
  if (d === 'up') h.lane = Math.max(0, h.lane - 1);
  if (d === 'down') h.lane = Math.min(2, h.lane + 1);
}
// a direction pressed during a hack (keys, D-pad or the on-screen pads)
function hackDir(d) {
  const h = G.hack;
  if (!h || G.mode !== 'hack') return;
  if (h.kind === 'seq') seqDir(h, d);
  else if (h.kind === 'trace') traceDir(h, d);
  else if (h.kind === 'wall') wallDir(h, d);
}
// a miss in any lock: the flash, the buzz, maybe the lockout. False when the hack is over.
function hackMiss() {
  const h = G.hack;
  h.miss++;
  sfx.click();
  buzz(40);
  h.flash = 14;
  h.flashCol = 'bad';
  if (h.miss > h.maxMiss) {
    hackFail();
    return false;
  }
  hackInfo();
  return true;
}
function newZone() {
  const h = G.hack;
  let z;
  do {
    z = h.w / 2 + Math.random() * (1 - h.w);
  } while (Math.abs(z - h.pos) < 0.15);
  h.zone = z;
}
function hackPress() {
  const h = G.hack;
  if (!h || G.mode !== 'hack' || (h.kind && h.kind !== 'lock')) return;
  if (Math.abs(h.pos - h.zone) <= h.w / 2) hackHit();
  else {
    h.miss++;
    sfx.click();
    buzz(40);
    h.flash = 14;
    h.flashCol = 'bad';
    if (h.miss > h.maxMiss) hackFail();
    else hackInfo();
  }
}
function hackHit() {
  const h = G.hack;
  h.hits++;
  sfx.coin();
  buzz(12);
  h.flash = 14;
  h.flashCol = 'ok';
  h.speed *= 1.12;
  if (h.hits >= h.need) {
    hackWin();
    return;
  }
  newZone();
  hackInfo();
}
function useIce() {
  const h = G.hack;
  if (h && (PARTY.ice || 0) > 0) {
    if (anyHas('icecraft') && Math.random() < 0.3) {
      const p = active()[0];
      G.texts.push({ x: p.x, y: p.y, z: 70, s: 'ICEBREAKER KEPT', c: '#45d2ff', life: 50, sm: true });
    } else PARTY.ice--;
    // an icebreaker does each lock's hardest part for you
    if (h.kind === 'seq') {
      if (h.phase === 'show') h.st = 1e6; // skip the replay
      seqTick(h);
      seqDir(h, h.seq[h.i]);
    } else if (h.kind === 'trace') {
      h.left += 300; // five more seconds, and the ICE around you melts
      h.walls = h.walls.filter(w => {
        const [x, y] = w.split(',').map(Number);
        return Math.abs(x - h.cx) > 1 || Math.abs(y - h.cy) > 1;
      });
      hackInfo();
    } else if (h.kind === 'wall') {
      h.blocks = [];
      h.left = Math.max(0, h.left - 120);
      hackInfo();
    } else hackHit();
  }
}
function hackInfo() {
  const h = G.hack;
  if (!h) return;
  const el = document.getElementById('hkProg'),
    left = `Misses left ${'<b style="color:var(--neon)">♦</b> '.repeat(Math.max(0, h.maxMiss + 1 - h.miss))}`;
  if (el)
    el.innerHTML =
      h.kind === 'seq'
        ? `${h.phase === 'show' ? 'Watch…' : 'Your turn'} · ${'<b style="color:var(--ok)">●</b> '.repeat(h.hits)}${'○ '.repeat(h.need - h.hits)} · ${left}`
        : h.kind === 'trace'
          ? `Trace in ${Math.ceil(h.left / 60)} s · ${left}`
          : h.kind === 'wall'
            ? `Through in ${Math.ceil(h.left / 60)} s · ${left}`
            : `Nodes ${'<b style="color:var(--ok)">●</b> '.repeat(h.hits)}${'○ '.repeat(h.need - h.hits)} · ${left}`;
  const ib = document.getElementById('hkIce');
  if (ib) {
    ib.textContent = `Icebreaker (${PARTY.ice || 0})`;
    ib.disabled = !(PARTY.ice > 0);
  }
}
function hackStep() {
  const h = G.hack;
  if (!h) return;
  if (h.kind && h.kind !== 'lock') return hackStep2(h);
  h.pos += (h.dir * h.speed) / 60;
  if (h.pos > 1) {
    h.pos = 1;
    h.dir = -1;
  }
  if (h.pos < 0) {
    h.pos = 0;
    h.dir = 1;
  }
  if (h.flash > 0) h.flash--;
  const c = document.getElementById('hkCur'),
    z = document.getElementById('hkZone'),
    t = document.getElementById('hkTrk');
  if (c) c.style.left = h.pos * 100 + '%';
  if (z) {
    z.style.left = (h.zone - h.w / 2) * 100 + '%';
    z.style.width = h.w * 100 + '%';
  }
  if (t) t.dataset.f = h.flash > 0 ? h.flashCol : '';
}
// the three newer locks: tick, then draw into their boxes on the card
function hackStep2(h) {
  if (h.flash > 0) h.flash--;
  if (h.litT > 0 && --h.litT === 0 && h.phase === 'input') h.lit = null;
  if (h.kind === 'seq') seqTick(h);
  else if (h.kind === 'trace') traceTick(h);
  else if (h.kind === 'wall') wallTick(h);
  if (!G.hack) return; // won or lost this step
  const box = document.getElementById('hkGame');
  if (box) box.dataset.f = h.flash > 0 ? h.flashCol : '';
  if (h.kind === 'seq') {
    for (const d of DIRS) {
      const b = document.getElementById('hkP-' + d);
      if (b) b.classList.toggle('lit', h.lit === d);
    }
  } else if (h.kind === 'trace') {
    const g = document.getElementById('hkGrid');
    if (g) {
      let s = '';
      for (let y = 0; y < TR_H; y++)
        for (let x = 0; x < TR_W; x++) {
          const k = x + ',' + y,
            c =
              x === h.cx && y === h.cy
                ? 'me'
                : x === h.ex && y === h.ey
                  ? 'exit'
                  : h.walls.includes(k)
                    ? 'ice'
                    : h.trail.includes(k)
                      ? 'trail'
                      : '';
          s += `<i class="${c}"></i>`;
        }
      if (g._s !== s) g.innerHTML = g._s = s;
    }
    const bar = document.getElementById('hkTime');
    if (bar) bar.style.width = (h.left / h.time) * 100 + '%';
    if (h.left % 30 === 0) hackInfo();
  } else if (h.kind === 'wall') {
    const lanes = document.getElementById('hkLanes');
    if (lanes)
      lanes.innerHTML =
        `<i class="sig" style="top:${h.lane * 33.3 + 8}%"></i>` +
        h.blocks.map(k => `<i class="blk" style="left:${k.x}%;top:${k.lane * 33.3 + 4}%"></i>`).join('');
    const bar = document.getElementById('hkTime');
    if (bar) bar.style.width = (1 - h.left / h.dur) * 100 + '%';
    if (h.left % 30 === 0) hackInfo();
  }
}
function hackWin() {
  const b = G.hack.b;
  bump('hacks');
  if (G.hack.vault) {
    const v = G.hack.vault;
    v.vaultDone = true;
    v.bonus = true;
    G.hack = null;
    sfx.level();
    setMode('play');
    if (G.stealth) stealthHackDone(v);
    else G.texts.push({ x: v.x, y: v.y, z: 60, s: 'VAULT OPEN · BREAK IT', c: '#ffc63d', life: 90 });
    return;
  }
  if (b.tier >= 3 && G.hack.miss === 0) feat('zero');
  G.hack = null;
  sfx.level();
  if (!isGood(b)) {
    // in daylight there are witnesses: one more star
    G.wd.heat = Math.min(
      5,
      G.wd.heat +
        Math.max(
          0,
          heatFor(b) + (isNight(G.wd) ? 0 : 1) - (anyHas('ghost') ? 1 : 0) - (wxNow() === 'fog' ? 1 : 0)
        )
    );
    G.wd.heatT = 0;
    G.wd.rep = Math.max(-100, G.wd.rep - credLoss(b));
  }
  enterBuilding(b);
}
function hackFail() {
  const b = G.hack.b;
  if (G.hack.vault) {
    const v = G.hack.vault;
    v.vaultDone = true;
    G.hack = null;
    sfx.hurt();
    setMode('play');
    if (G.stealth) stealthHackDone(v);
    else G.texts.push({ x: v.x, y: v.y, z: 60, s: 'VAULT SEALED · CACHE ONLY', c: '#ff3d8b', life: 90 });
    return;
  }
  G.hack = null;
  b.lockUntil = Date.now() + 12000;
  sfx.hurt();
  buzz([60, 40, 60]);
  if (!isGood(b) && !anyHas('ghost')) {
    G.wd.heat = Math.min(5, G.wd.heat + 1);
    G.wd.heatT = 0;
  }
  setMode('play');
  const p = alive()[0];
  if (p) say(p, isGood(b) ? 'LOCKED OUT' : 'ALARM! LOCKED OUT', '#ff3d8b', 80, 80);
}
