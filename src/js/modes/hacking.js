/* Cyber City Tactics · src/js/modes/hacking.js
 * The lock-cracking minigame.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ----- hacking ----- */
function startHack(b, vault) {
  const hak = Math.max(...active().map(p => p.D.a.hak || 1)),
    tier = vault ? 4 : b.tier;
  G.hack = {
    b,
    vault: vault || null,
    tier,
    pos: 0,
    dir: 1,
    speed: 0.42 + 0.2 * tier,
    need: tier + 1,
    hits: 0,
    miss: 0,
    maxMiss: 2 + (anyHas('spare') ? 1 : 0),
    w:
      clamp(0.1 + hak * 0.03 - tier * 0.02, 0.06, 0.32) *
      (anyHas('probe') ? 1.25 : 1) *
      (evOn('blackout') ? 1.3 : 1),
    zone: 0.5,
    flash: 0,
    flashCol: '',
    skip: false
  };
  newZone();
  setMode('hack');
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
  if (!h || G.mode !== 'hack') return;
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
  if (G.hack && (PARTY.ice || 0) > 0) {
    if (anyHas('icecraft') && Math.random() < 0.3) {
      const p = active()[0];
      G.texts.push({ x: p.x, y: p.y, z: 70, s: 'ICEBREAKER KEPT', c: '#45d2ff', life: 50, sm: true });
    } else PARTY.ice--;
    hackHit();
  }
}
function hackInfo() {
  const h = G.hack;
  if (!h) return;
  const el = document.getElementById('hkProg');
  if (el)
    el.innerHTML = `Nodes ${'<b style="color:var(--ok)">●</b> '.repeat(h.hits)}${'○ '.repeat(h.need - h.hits)} · Misses left ${'<b style="color:var(--neon)">♦</b> '.repeat(h.maxMiss + 1 - h.miss)}`;
  const ib = document.getElementById('hkIce');
  if (ib) {
    ib.textContent = `Icebreaker (${PARTY.ice || 0})`;
    ib.disabled = !(PARTY.ice > 0);
  }
}
function hackStep() {
  const h = G.hack;
  if (!h) return;
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
    G.texts.push({ x: v.x, y: v.y, z: 60, s: 'VAULT OPEN · BREAK IT', c: '#ffc63d', life: 90 });
    return;
  }
  if (b.tier >= 3 && G.hack.miss === 0) feat('zero');
  G.hack = null;
  sfx.level();
  if (!isGood(b)) {
    G.wd.heat = Math.min(5, G.wd.heat + Math.max(0, heatFor(b) - (anyHas('ghost') ? 1 : 0)));
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
    G.texts.push({ x: v.x, y: v.y, z: 60, s: 'VAULT SEALED · CACHE ONLY', c: '#ff3d8b', life: 90 });
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
