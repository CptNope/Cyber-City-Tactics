/* Cyber City Tactics · src/js/modes/safehouse.js
 * Safehouse upgrades in the Sprawl: bought once with creds on the safehouse's Upgrades tab, kept with the
 * Sprawl save (PARTY.safe), and each changes how a block plays. Creds spent here aren't spent on gear, which is
 * the choice.
 * Loaded as a classic script after sprawl.js: every file shares one global scope, in the order in index.html. */
'use strict';
const SAFE_UPS = {
  med: {
    name: 'Med bay',
    cost: 600,
    desc: 'Once a block, a wipe costs nothing: Doc patches everyone up here and the medics take no creds.'
  },
  scan: {
    name: 'Scanner',
    cost: 450,
    desc: 'Every hidden door on a block shows on the street and the block map from the moment you arrive.'
  },
  bolt: {
    name: 'Bolt-hole',
    cost: 400,
    desc: 'Laying low costs half, and heat cools twice as fast while no cops are around.'
  },
  armory: {
    name: 'Armory',
    cost: 500,
    desc: 'Every new block starts with 20 more rounds for each runner and a medkit (up to 5).'
  }
};
const hasUp = k => !!(G.world && isObj(PARTY.safe) && PARTY.safe[k]);
const layCost = w => Math.round(60 * w.heat * w.level * (hasUp('bolt') ? 0.5 : 1));
function buyUp(k) {
  const U = SAFE_UPS[k];
  if (!U || hasUp(k) || PARTY.creds < U.cost) return false;
  PARTY.creds -= U.cost;
  PARTY.safe = isObj(PARTY.safe) ? PARTY.safe : {};
  PARTY.safe[k] = 1;
  if (k === 'scan') safeScan();
  if (Object.keys(SAFE_UPS).every(hasUp)) feat('homely');
  saveWorld();
  return true;
}
/** The scanner: every hidden door on this block is found. */
function safeScan() {
  const w = G.wd;
  if (!w || !hasUp('scan')) return;
  for (const b of w.street.buildings) if (b.hidden && !w.found.includes(b.id)) w.found.push(b.id);
}
/** The armory, on arriving at a new block. */
function safeArmory() {
  if (!hasUp('armory')) return;
  for (const p of PL) p.ammo += 20;
  PARTY.med = Math.min(5, PARTY.med + 1);
  G.texts.push({
    x: G.camX + W / 2,
    y: 150,
    z: 0,
    s: 'ARMORY · +20 ROUNDS · +1 MEDKIT',
    c: '#ffc63d',
    life: 100
  });
}
function safeUpHtml() {
  const n = Object.keys(SAFE_UPS).filter(hasUp).length;
  return `<p class="ds">Fix the place up. Each upgrade is bought once and stays with your Sprawl save, on every block after.</p>
  <div class="list">${Object.keys(SAFE_UPS)
    .map(k => {
      const U = SAFE_UPS[k],
        have = hasUp(k),
        ok = !have && PARTY.creds >= U.cost;
      return `<div class="item"><div><div class="nm">${esc(U.name)}${k === 'med' && have && G.wd.medUsed ? ' <span style="color:var(--muted);font-weight:400">· used on this block</span>' : ''}</div><div class="ds">${esc(U.desc)}</div></div><div class="acts"><button class="btn sm${ok ? '' : ' ghost'}" data-a="buyup:${k}" ${ok ? '' : 'disabled'}>${have ? 'Built' : '¥' + U.cost}</button></div></div>`;
    })
    .join('')}</div>
  <p class="ds">${n} of ${Object.keys(SAFE_UPS).length} built.</p>`;
}
