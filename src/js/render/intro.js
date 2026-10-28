/* Cyber City Tactics · src/js/render/intro.js
 * Boss entrances: the first time each boss shows up in a run, letterbox bars slide in, the camera pushes in
 * a touch on the boss, and a name card slams in from the left with a one-line epithet and a sting.
 * Nothing waits on it: the fight is live the whole time (the boss spawns invulnerable for a moment anyway),
 * so there is nothing to skip. Under reduced motion the card simply appears, with no push or slide.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
const INTRO_LEN = 96;
const EPITHET = {
  troll: 'Rules the Barrens from a throne of scrap',
  blade: 'Kagemori trained her. Then they tried to retire her',
  saint: 'The ghouls pray to it. It answers',
  archmage: 'Kagemori security director. Owns the street, the cops and the sky',
  blackice: 'Lethal countermeasure. It does not negotiate',
  avatar: 'What Project LANTERN was built to wake',
  dragon: 'Who lights the way'
};
let introE = null,
  introT = 0;
// one entrance per boss per run: remembered against the run's stats object, so a new run starts fresh
const introRuns = new WeakMap(),
  introLoose = new Set();
// Called by render() each frame with the live boss (or null). Starts an intro the first time a boss appears.
function introCheck(boss) {
  if (!boss) return;
  if (introE === boss) return;
  let seen = introLoose;
  if (G.run) {
    seen = introRuns.get(G.run);
    if (!seen) introRuns.set(G.run, (seen = new Set()));
  }
  const key = (boss.rematch ? 'r:' : '') + boss.kind;
  if (seen.has(key)) return;
  seen.add(key);
  introE = boss;
  introT = G.t;
  sfx.boom();
}
// 0..1 eased progress of the current intro's "in" phase and its fade-out, or 0 when none is running
function introK() {
  if (!introE) return 0;
  const a = G.t - introT;
  if (a < 0 || a > INTRO_LEN || introE.state === 'dead' || G.mode !== 'play') {
    introE = null;
    return 0;
  }
  const inn = Math.min(1, a / 14),
    out = Math.min(1, (INTRO_LEN - a) / 16),
    k = Math.min(inn, out);
  return k * k * (3 - 2 * k);
}
// Camera push around the boss: applied inside render()'s world transform
function introPush() {
  const k = introK();
  if (!k || RM || !introE) return;
  const bx = introE.x - G.camX,
    by = introE.y - introE.z - 30,
    z = 1 + 0.07 * k;
  ctx.translate(bx, by);
  ctx.scale(z, z);
  ctx.translate(-bx, -by);
}
// Letterbox bars over the street, drawn before the HUD so health bars stay readable on top of them
function drawIntroBars() {
  const k = introK();
  if (!k) return;
  const bar = 14 * k;
  ctx.fillStyle = '#07050b';
  ctx.fillRect(0, BAND, W, bar);
  ctx.fillRect(0, BAND + H - bar, W, bar);
}
// The name card, drawn last in screen space
function drawIntro() {
  const k = introK();
  if (!k || !introE) return;
  const e = introE,
    a = G.t - introT;
  const name = (e.name || e.d.name).toUpperCase(),
    epi = e.rematch ? 'Back for a rematch, already enraged' : EPITHET[e.kind] || '',
    slide = RM ? 0 : Math.pow(1 - Math.min(1, a / 10), 3) * -260,
    y = BAND + 92;
  ctx.font = '600 34px Teko, Impact, sans-serif';
  const nw = ctx.measureText(name).width;
  ctx.save();
  ctx.globalAlpha = k;
  ctx.translate(slide, 0);
  // a slanted Neon Pink plate behind the name: the brand's bar shape, leaning into the fight
  ctx.fillStyle = 'rgba(11,8,18,.82)';
  ctx.beginPath();
  ctx.moveTo(0, y - 34);
  ctx.lineTo(nw + 52, y - 34);
  ctx.lineTo(nw + 38, y + 22);
  ctx.lineTo(0, y + 22);
  ctx.fill();
  ctx.fillStyle = e.rematch ? '#45d2ff' : '#ff3d8b';
  ctx.fillRect(0, y + 6, nw + 34, 3);
  txt(e.rematch ? 'REMATCH' : 'BOSS', 16, y - 22, 11, e.rematch ? '#45d2ff' : '#ffc63d');
  txt(name, 16, y, 34, '#efe9ff');
  if (epi) {
    ctx.font = '11px "Chakra Petch", sans-serif';
    ctx.fillStyle = '#a79dc2';
    ctx.textAlign = 'left';
    ctx.fillText(epi, 16, y + 19);
  }
  ctx.restore();
}

// Low health: under a quarter HP the street's edges bleed red in time with a heartbeat and the music goes
// muffled, as if heard underwater. One cached vignette sprite, stretched; light mode keeps only the sound.
let vigSpr = null;
function drawLowHealth() {
  const low = G.mode === 'play' && alive().some(p => p.hp > 0 && p.hp < p.maxHp * 0.25);
  A.muffle(low);
  if (!low || lowFx()) return;
  if (!vigSpr) {
    vigSpr = document.createElement('canvas');
    vigSpr.width = 160;
    vigSpr.height = 90;
    const g = vigSpr.getContext('2d'),
      gr = g.createRadialGradient(80, 45, 30, 80, 45, 96);
    gr.addColorStop(0, 'rgba(255,26,74,0)');
    gr.addColorStop(1, 'rgba(255,26,74,0.75)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 160, 90);
  }
  const ph = G.t % 54,
    beat = RM ? 0.5 : ph < 5 ? 1 - ph / 5 : ph > 9 && ph < 15 ? (1 - (ph - 9) / 6) * 0.6 : 0;
  ctx.globalAlpha = 0.35 + 0.4 * beat;
  ctx.drawImage(vigSpr, 0, BAND, W, H);
  ctx.globalAlpha = 1;
}
