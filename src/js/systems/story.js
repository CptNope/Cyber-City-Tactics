/* Cyber City Tactics · src/js/systems/story.js
 * Short scenes in the engine: Juno on comms as each district opens, and a word with each boss as it arrives.
 * The street freezes, letterbox bars come in, the camera leans a touch toward whoever is talking and their
 * line appears in a speech bubble over them. PUNCH, KICK or JUMP moves on; DODGE skips the scene; Settings →
 * Story scenes turns them off. Each plays once per run, and only in the campaign.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
// who: 'comms' (Juno, over the radio), 'p' (runner 1), 'boss' (the boss on screen)
const CUTS = {
  open: [
    [
      ['comms', "The Barrens. The Gutter King's crews run everything under the dead monorail."],
      ['p', "Then I'll run through them."]
    ],
    [
      ['comms', 'Neon Market. Razor Mei is guarding a Kagemori clinic three levels down.'],
      ['p', 'Three levels. Three floors of trouble.']
    ],
    [
      ['comms', 'The old transit lines. Whatever ate the last crew is still down there.'],
      ['p', 'Lights on. Eyes open.']
    ],
    [
      ['comms', 'Mother Vesper keeps the books down here. Every debt, every body.'],
      ['p', 'Time somebody audited her.']
    ],
    [
      ['comms', "Top floor of the Arcology. The Director's expecting you."],
      ['p', 'Good. I hate surprises.']
    ],
    [
      ['comms', "You're jacked in. Voss is in the host somewhere, wearing it like a coat."],
      ['p', "Then let's tear it off her."]
    ]
  ],
  boss: {
    troll: [
      ['boss', "You're in my Barrens, little runner."],
      ['p', 'Not for long. Neither are you.']
    ],
    blade: [
      ['boss', 'Kagemori paid for my steel. You get it for free.'],
      ['p', "I'll pass on the discount."]
    ],
    saint: [
      ['boss', 'Kneel. The Hollow is hungry, and it is kind.'],
      ['p', "I've seen kind. That isn't it."]
    ],
    vesper: [
      ['boss', 'Everyone owes Mother Vesper something, dear.'],
      ['p', 'Put it on my tab.']
    ],
    archmage: [
      ['boss', 'The Arcology, the cops, the sky. All mine.'],
      ['p', "Let's start with the floor."]
    ],
    blackice: [
      ['boss', 'INTRUDER DETECTED. PURGE PROTOCOL ENGAGED.'],
      ['p', 'Purge this.']
    ]
  }
};
const CUT_MIN = 24, // steps before a press can move a line on (so a held punch doesn't skip it)
  CUT_MAX = 240; // and a line moves on by itself after four seconds
// scenes only where the story is: the campaign proper, once per run
const cutOK = () =>
  prefs.story !== false &&
  !(G.gaunt && !G.arena && !G.world) && // the Gauntlet's random order would tell the story out of order
  G.mode === 'play' &&
  !G.arena &&
  !G.world &&
  !G.training &&
  !G.den &&
  !G.cjob &&
  !G.drive &&
  !G.stealth &&
  !G.flight &&
  !(typeof netGuest === 'function' && netGuest());
function cutStart(key, lines) {
  if (!cutOK() || !lines || !lines.length) return false;
  G.run = G.run || {};
  G.run.cuts = G.run.cuts || {};
  if (G.run.cuts[key]) return false;
  G.run.cuts[key] = 1;
  G.cut = { key, lines: lines.map(([who, s]) => ({ who, s })), i: 0, t: 0, wait: 0 };
  return true;
}
const cutOpen = si => cutStart('open' + si, CUTS.open[si]);
function cutBoss(e) {
  if (!e || e.rematch) return false; // a rematch is its own entrance
  if (!cutStart('boss:' + e.kind, CUTS.boss[e.kind])) return false;
  G.cut.wait = INTRO_LEN; // the name card plays first, then they talk
  return true;
}
// one frozen step of a scene: only the clock and the scene move
function cutTick() {
  const c = G.cut;
  if (!c) return;
  const any = k => INP.some(s => s.pressed[k]);
  if (c.wait > 0) {
    c.wait--; // the boss's name card, with the street already holding still
    if (any('dodge')) G.cut = null;
    return;
  }
  c.t++;
  if (any('dodge')) {
    G.cut = null; // skip the whole scene
    return;
  }
  if ((c.t >= CUT_MIN && (any('punch') || any('kick') || any('jump'))) || c.t >= CUT_MAX) {
    c.i++;
    c.t = 0;
    sfx.click();
    if (c.i >= c.lines.length) G.cut = null;
  }
}
// who is talking right now (null for comms)
function cutSpeaker() {
  const c = G.cut,
    L = c && c.lines[c.i];
  if (!L) return null;
  if (L.who === 'p') return PL[0] || null;
  if (L.who === 'boss')
    return G.ents.find(e => e.team === 1 && e.d && e.d.boss && e.state !== 'dead') || null;
  return null;
}
// a gentle lean toward the speaker, inside render()'s world transform (none under reduced motion)
function cutPush() {
  const e = G.cut && !(G.cut.wait > 0) && cutSpeaker();
  if (!e || RM) return;
  const k = Math.min(1, G.cut.t / 12),
    sx = e.x - G.camX,
    sy = e.y - e.z - 30,
    z = 1 + 0.05 * k;
  ctx.translate(sx, sy);
  ctx.scale(z, z);
  ctx.translate(-sx, -sy);
}
// letterbox bars, the speech bubble (or the comms box) and the hint, in HUD space
function drawCut() {
  const c = G.cut;
  if (!c) return;
  const L = c.lines[c.i];
  if (!L) return;
  const bh = 26;
  if (c.wait > 0) {
    // bars only while the name card plays
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, bh);
    ctx.fillRect(0, H - bh, W, bh);
    return;
  }
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, bh);
  ctx.fillRect(0, H - bh, W, bh);
  const a = RM ? 1 : Math.min(1, c.t / 8);
  ctx.globalAlpha = a;
  ctx.font = '12px "Chakra Petch", sans-serif';
  const lines = wrapTip(L.s, 210),
    w = Math.min(230, Math.max(...lines.map(l => ctx.measureText(l).width)) + 20),
    h = lines.length * 14 + 12;
  const e = cutSpeaker();
  let x, y;
  if (e) {
    x = clamp(e.x - G.camX - w / 2, 6, W - w - 6);
    y = clamp(e.y - e.z - 92 * ((e.d && e.d.scale) || 1) - h, bh + 6, H - bh - h - 10);
  } else {
    // comms: a radio box along the bottom, clear of the HUD
    x = (W - w) / 2;
    y = H - bh - h - 12;
  }
  const boss = L.who === 'boss',
    comms = L.who === 'comms',
    edge = comms ? '#45d2ff' : boss ? '#ff3d4a' : '#ffc63d';
  ctx.fillStyle = 'rgba(11,8,18,.94)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = edge;
  ctx.lineWidth = prefs.contrast ? 2 : 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  if (e) {
    // the bubble's tail, pointing at the speaker
    const tx = clamp(e.x - G.camX, x + 10, x + w - 10);
    ctx.fillStyle = 'rgba(11,8,18,.94)';
    ctx.beginPath();
    ctx.moveTo(tx - 5, y + h - 1);
    ctx.lineTo(tx, y + h + 7);
    ctx.lineTo(tx + 5, y + h - 1);
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.beginPath();
    ctx.moveTo(tx - 5, y + h);
    ctx.lineTo(tx, y + h + 7);
    ctx.lineTo(tx + 5, y + h);
    ctx.stroke();
  }
  const name = comms
    ? 'JUNO · COMMS'
    : boss
      ? (e && (e.name || e.d.name)) || ''
      : (PL[0] && PL[0].name) || '';
  txt(String(name).toUpperCase(), x + 8, y - 3, 12, edge, 'left');
  ctx.font = '12px "Chakra Petch", sans-serif';
  ctx.fillStyle = '#efe9ff';
  ctx.textAlign = 'left';
  lines.forEach((l, i) => ctx.fillText(l, x + 10, y + 17 + i * 14));
  ctx.globalAlpha = 1;
  // the hint speaks the device's language; on touch it sits up top, clear of the buttons
  const hint = PAD.active
    ? 'X: next · LB: skip'
    : isTouch()
      ? 'Tap to continue · DODGE: skip'
      : (keysOf(0, 'punch')[0] || 'J') + ': next · ' + (keysOf(0, 'dodge')[0] || 'O') + ': skip';
  if (isTouch() && !PAD.active) txt(hint, W / 2, bh - 9, 11, '#a79dc2', 'center');
  else txt(hint, W - 10, H - 9, 11, '#a79dc2', 'right');
}
