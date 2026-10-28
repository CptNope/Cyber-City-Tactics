/* Cyber City Tactics · src/js/render/looks.js
 * Individual looks: two gangers off the same corner shouldn't be twins. When a regular enemy spawns it gets its
 * own skin tone, clothes, hair, build and maybe an accessory. All of it is visual only: hitboxes, stats and
 * the gang colour (pal.acc, which tells you who they run with) never change.
 * Looks come from a spawn counter run through a hash, never Math.random, so they don't disturb the game's
 * random sequence (seeded challenge runs and tests replay identically).
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
const LOOK = {
  skins: ['#f1c7a5', '#d9a07c', '#b07a55', '#8a5a3c', '#5a3a28', '#e8b896'],
  coats: [
    '#5a3a6a',
    '#2a5a5a',
    '#6a3a2a',
    '#3a5a2a',
    '#2a3a6a',
    '#5a5a62',
    '#6a4a1a',
    '#4a2a44',
    '#1f2a3a',
    '#6a2a3a'
  ],
  pants: ['#22324a', '#2b2b2b', '#3a2a22', '#1f2f2a', '#2e2a3e', '#33303a'],
  neon: ['#ff3d8b', '#45d2ff', '#7dffb0', '#ffc63d', '#b98cff', '#ff6a3d'],
  hair: ['#1b1520', '#3a2418', '#6b4a2a', '#c9b08a', '#8a8a96', '#7a2a2a'],
  // metahumans and the dead keep their own skin, just lighter or darker
  keepSkin: { tusks: 1, horns: 1, ghoul: 1, glitch: 1 },
  // heads already defined by gear or ritual: these only ever get a chest accessory
  coveredHead: { helmet: 1, riot: 1, glitch: 1, mage: 1, feathers: 1, horns: 1 },
  extras: ['shades', 'bandana', 'beanie', 'patch', 'cybereye', 'chain', 'scar']
};
let lookN = 0;
function makeLook(e) {
  const d = e.d;
  if (!d || d.boss || d.passive || d.ice || d.spirit || d.dragon || e.kind === 'player') return;
  const n = ++lookN * 7919 + (e.kind.length << 8),
    r = i => hash01(n * 31 + i * 977),
    at = (arr, i) => arr[Math.floor(r(i) * arr.length) % arr.length],
    p = d.pal || {},
    style = d.style,
    pal = Object.assign({}, p);
  if (p.skin)
    pal.skin = LOOK.keepSkin[style]
      ? mixHex(p.skin, r(1) < 0.5 ? '#ffffff' : '#000000', 0.06 + r(2) * 0.12)
      : mixHex(p.skin, at(LOOK.skins, 3), 0.35 + r(4) * 0.5);
  if (p.coat) {
    pal.coat = mixHex(p.coat, at(LOOK.coats, 5), 0.5 + r(6) * 0.4);
    pal.coat2 = mixHex(pal.coat, '#000000', 0.28);
  }
  if (d.quad) pal.coat = at(['#2a1a1e', '#1e1a24', '#3a2418', '#2a2a30', '#3a1a14'], 5); // hound coats
  if (p.pants) pal.pants = mixHex(p.pants, at(LOOK.pants, 7), 0.45);
  if (p.hair && !(LOOK.keepSkin[style] && style !== 'tusks'))
    pal.hair = style === 'mohawk' ? at(LOOK.neon, 8) : style === 'cap' ? at(LOOK.coats, 8) : at(LOOK.hair, 8);
  e.pal = pal;
  // build: a little broader or leaner, taller or shorter (drawn only)
  e.build = [0.92 + r(9) * 0.16, 0.95 + r(10) * 0.1];
  // stance and rhythm, so a pack doesn't walk in lockstep
  e.walk = r(11) * 60;
  // about half get an accessory; covered heads can only take the chain
  const x = r(12);
  if (x < 0.55) {
    const ex = LOOK.coveredHead[style] ? 'chain' : at(LOOK.extras, 13);
    e.extra = ex;
    e.extraC = ex === 'bandana' || ex === 'beanie' ? at(LOOK.neon.concat(LOOK.coats), 14) : at(LOOK.neon, 14);
  }
}
// Drawn after the head, in the figure's own (facing-right) space. hd is the head centre, sh the shoulders.
function drawExtra(e, hd, sh, fl) {
  const c = fl ? '#ffffff' : e.extraC;
  switch (e.extra) {
    case 'shades':
      ctx.fillStyle = fl ? '#fff' : '#0b0812';
      ctx.fillRect(hd[0] + 0.5, hd[1] - 2.4, 6.4, 2.4);
      ctx.fillStyle = c;
      ctx.fillRect(hd[0] + 4.5, hd[1] - 2.2, 1.6, 0.8);
      break;
    case 'bandana':
      fillPoly(
        [hd[0] - 1, hd[1] + 0.5, hd[0] + 6, hd[1] + 0.5, hd[0] + 5, hd[1] + 5, hd[0] - 3, hd[1] + 4.5],
        c
      );
      break;
    case 'beanie':
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(hd[0], hd[1] - 2.6, 6, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(hd[0] - 6, hd[1] - 3.4, 12, 1.8);
      break;
    case 'patch':
      ctx.strokeStyle = fl ? '#fff' : '#0b0812';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(hd[0] - 5, hd[1] - 4);
      ctx.lineTo(hd[0] + 5.5, hd[1] - 0.5);
      ctx.stroke();
      ctx.fillStyle = fl ? '#fff' : '#0b0812';
      ctx.fillRect(hd[0] + 2, hd[1] - 2.6, 3.4, 3);
      break;
    case 'cybereye':
      ctx.fillStyle = c;
      ctx.fillRect(hd[0] + 2.5, hd[1] - 1.7, 2.2, 2);
      if (!fl && !lowFx()) glow(hd[0] + 3.6, hd[1] - 0.7, 4, 3, c, 0.6);
      break;
    case 'scar':
      ctx.strokeStyle = fl ? '#fff' : 'rgba(40,10,14,.6)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(hd[0] + 1, hd[1] - 4);
      ctx.lineTo(hd[0] + 4, hd[1] + 2.5);
      ctx.stroke();
      break;
    case 'chain':
      ctx.strokeStyle = fl ? '#fff' : '#ffc63d';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(sh[0] - 3, sh[1] + 0.5);
      ctx.quadraticCurveTo(sh[0] + 2, sh[1] + 8, sh[0] + 5, sh[1] + 0.5);
      ctx.stroke();
      break;
  }
}
