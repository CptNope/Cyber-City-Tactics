/* Cyber City Tactics · src/js/render/facility.js
 * Drone stealth jobs on screen: a corp floor in cross-section (ceiling, back wall, floor), walls with vents,
 * laser gates, sweeping ceiling cameras and guards' sight cones, the terminal, the exit vent, the drones, and
 * the objectives and alarm in the HUD.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
const sfY = z => SF.floor - z; // screen y of a height above the floor
function drawFacility() {
  const S = G.stealth,
    C = curS(),
    cx = G.camX,
    top = sfY(SF.ceil);
  // the slab above, the back wall, the floor
  ctx.fillStyle = '#07060b';
  ctx.fillRect(0, 0, W, top);
  const g = ctx.createLinearGradient(0, top, 0, SF.floor);
  g.addColorStop(0, '#10121b');
  g.addColorStop(1, '#191c28');
  ctx.fillStyle = g;
  ctx.fillRect(0, top, W, SF.floor - top);
  ctx.fillStyle = '#0b0d13';
  ctx.fillRect(0, SF.floor, W, H - SF.floor + 40);
  ctx.fillStyle = 'rgba(255,255,255,.07)';
  ctx.fillRect(0, SF.floor, W, 1);
  ctx.fillStyle = (C.signs && C.signs[0] && C.signs[0][1]) || '#45d2ff';
  ctx.globalAlpha = 0.35;
  ctx.fillRect(0, top, W, 2);
  ctx.globalAlpha = 1;
  // wall panels and a strip of dim office lights, scrolling slower than the floor for a little depth
  ctx.strokeStyle = 'rgba(255,255,255,.04)';
  ctx.lineWidth = 1;
  for (let x = -((cx * 0.9) % 80); x < W; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, top + 4);
    ctx.lineTo(x, SF.floor);
    ctx.stroke();
  }
  for (let x = -((cx * 0.9) % 160) + 40; x < W; x += 160) glow(x, top + 18, 40, 16, '#9fe9ff', 0.08);
  // the city through a long window, now and then
  for (let k = 0; k < 6; k++) {
    const wx = 300 + k * 560 - cx * 0.9;
    if (wx < -200 || wx > W + 40) continue;
    ctx.fillStyle = C.sky ? C.sky[0] : '#1d1033';
    ctx.fillRect(wx, top + 34, 160, 46);
    ctx.fillStyle = C.win || '#ffb36b';
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 18; i++) ctx.fillRect(wx + 6 + ((i * 37) % 150), top + 50 + ((i * 13) % 26), 2, 3);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#2a2d3a';
    ctx.strokeRect(wx + 0.5, top + 34.5, 160, 46);
  }
  // the terminal
  const T = S.term,
    tx = T.x - cx;
  if (tx > -40 && tx < W + 40) {
    ctx.fillStyle = '#20232f';
    ctx.fillRect(tx - 13, SF.floor - 30, 26, 30);
    ctx.fillStyle = T.done ? '#7dffb0' : '#45d2ff';
    ctx.globalAlpha = T.done ? 0.9 : 0.55 + 0.3 * Math.sin(G.t * 0.1);
    ctx.fillRect(tx - 9, SF.floor - 27, 18, 11);
    ctx.globalAlpha = 1;
    glow(tx, SF.floor - 22, 26, 16, T.done ? '#7dffb0' : '#45d2ff', 0.25);
    txt(T.done ? 'DONE' : 'TERMINAL', tx, SF.floor - 34, 10, T.done ? '#7dffb0' : '#9fe9ff', 'center');
    // a drone close enough: say what to press, or that it's flying too high to plug in
    const near = !T.done && PL.find(p => p.drone && !p.out && Math.abs(p.x - T.x) < 38);
    if (near) {
      const ok = near.z < 70;
      ctx.fillStyle = 'rgba(11,8,18,.8)';
      ctx.fillRect(tx - 44, SF.floor - 62, 88, 16);
      txt(
        ok ? ctl('PUNCH TO HACK', 'J TO HACK') : 'FLY LOWER',
        tx,
        SF.floor - 50,
        11,
        ok ? '#ffc63d' : '#a79dc2',
        'center'
      );
    }
  }
  // the exit vent at the far end
  const ex = S.exit - cx;
  if (ex > -60 && ex < W + 60) {
    const col = S.data ? '#7dffb0' : '#4a4256';
    ctx.fillStyle = '#0d0f16';
    ctx.fillRect(ex - 16, sfY(100), 32, 60);
    ctx.strokeStyle = col;
    ctx.strokeRect(ex - 15.5, sfY(100) + 0.5, 31, 59);
    for (let i = 1; i < 6; i++) ctx.fillRect(ex - 14, sfY(100) + i * 10, 28, 1);
    if (S.data) glow(ex, sfY(70), 34, 40, '#7dffb0', 0.25);
    txt(S.data ? 'EXIT · FLY IN' : 'EXIT · LOCKED', ex, sfY(104), 11, col, 'center');
    if (!S.data) txt('GET THE FILES FIRST', ex, sfY(116), 9, '#a79dc2', 'center');
  }
  // walls, open only at their vents
  for (const w of S.walls) {
    const x = w.x - cx;
    if (x < -30 || x > W + 30) continue;
    ctx.fillStyle = '#262a38';
    ctx.fillRect(x - w.w / 2, top, w.w, sfY(w.gap[1]) - top);
    ctx.fillRect(x - w.w / 2, sfY(w.gap[0]), w.w, SF.floor - sfY(w.gap[0]));
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.fillRect(x - w.w / 2, top, 1, SF.floor - top);
    ctx.strokeStyle = 'rgba(159,233,255,.25)';
    ctx.strokeRect(x - w.w / 2 + 0.5, sfY(w.gap[1]) + 0.5, w.w - 1, sfY(w.gap[0]) - sfY(w.gap[1]) - 1);
  }
  // laser gates
  for (const l of S.lasers) {
    const x = l.x - cx;
    if (x < -20 || x > W + 20) continue;
    ctx.fillStyle = '#2a2436';
    ctx.fillRect(x - 4, top, 8, 6);
    ctx.fillRect(x - 4, SF.floor - 6, 8, 6);
    if (laserOn(l)) {
      ctx.fillStyle = '#ff3d4a';
      ctx.fillRect(x - 0.75, top + 6, 1.5, SF.floor - top - 12);
      glow(x, (top + SF.floor) / 2, 8, (SF.floor - top) / 2, '#ff3d4a', 0.35);
    } else {
      // about to switch on: a warning flicker
      const soon = !(l.offT > 0) && (G.t + l.ph) % l.per > l.per - 24;
      if (soon && (G.t >> 2) % 2) {
        ctx.fillStyle = 'rgba(255,61,74,.35)';
        ctx.fillRect(x - 0.5, top + 6, 1, SF.floor - top - 12);
      }
    }
  }
}
function cone(x, y, a, half, len, col, alpha) {
  ctx.fillStyle = col;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(a - half) * len, y + Math.sin(a - half) * len);
  ctx.lineTo(x + Math.cos(a + half) * len, y + Math.sin(a + half) * len);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}
// what can see: the ceiling cameras' sweeps and the guards' sight, red once the alarm is up
function drawStealthCones() {
  const S = G.stealth,
    cx = G.camX,
    alert = G.salarm > 0,
    top = sfY(SF.ceil);
  // light stays inside the room
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, top, W, SF.floor - top);
  ctx.clip();
  for (const c of S.cams) {
    const x = c.x - cx;
    if (x < -SF.camLen || x > W + SF.camLen) continue;
    const looped = c.offT > 0;
    if (!looped) cone(x, top + 6, camAngle(c), SF.camHalf, SF.camLen, alert ? '#ff3d4a' : '#ffc63d', 0.13);
    ctx.fillStyle = '#2a2436';
    ctx.fillRect(x - 6, top, 12, 6);
    ctx.fillStyle = looped
      ? (G.t >> 3) % 2
        ? '#45d2ff'
        : '#1a3a4a'
      : alert || (G.t >> 4) % 2
        ? '#ff3d4a'
        : '#3a1a1a';
    ctx.fillRect(x - 1.5, top + 6, 3, 3);
  }
  for (const e of G.ents) {
    if (!e.guard || e.state === 'down') continue;
    const x = e.x - cx;
    if (x < -SF.sightLen || x > W + SF.sightLen) continue;
    const len = SF.sightLen * (1 + G.salarm * 0.25),
      half = SF.sightHalf * (1 + G.salarm * 0.2);
    cone(
      x + e.face * 6,
      sfY(SF.eye),
      e.face > 0 ? 0 : Math.PI,
      half,
      len,
      alert ? '#ff3d4a' : '#9fe9ff',
      0.09
    );
  }
  ctx.restore();
  // a guard a drone could dart: say whether it would drop them (from behind) or just give you away
  for (const p of PL) {
    if (!p.drone || p.out || S.done) continue;
    const e = dartTarget(p);
    if (!e) continue;
    const ok = dartBehind(p, e),
      ex = e.x - cx;
    ctx.fillStyle = 'rgba(11,8,18,.8)';
    ctx.fillRect(ex - 40, sfY(78) - 11, 80, 15);
    txt(
      p.drone.dartT ? 'RELOADING' : ok ? ctl('KICK TO DART', 'K TO DART') : 'GET BEHIND THEM',
      ex,
      sfY(78),
      10,
      p.drone.dartT ? '#6b6280' : ok ? '#ffc63d' : '#a79dc2',
      'center'
    );
  }
  if (S.ow) drawOverwatch(S);
}
// overwatch's reticle: brackets over the floor, the camera or laser a loop would take, and the ping's reach
function drawOverwatch(S) {
  const ow = owOf();
  if (!ow) return;
  const x = G.owX,
    y = sfY(G.owZ),
    col = '#45d2ff',
    s = 9;
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (const [dx, dy] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1]
  ]) {
    ctx.moveTo(x + dx * s, y + dy * (s - 4));
    ctx.lineTo(x + dx * s, y + dy * s);
    ctx.lineTo(x + dx * (s - 4), y + dy * s);
  }
  ctx.stroke();
  ctx.fillStyle = col;
  ctx.fillRect(x - 1, y - 1, 2, 2);
  // the ping's reach along the floor
  ctx.strokeStyle = 'rgba(255,198,61,.25)';
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(x - OW.pingR, SF.floor - 2);
  ctx.lineTo(x + OW.pingR, SF.floor - 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // what a loop would take
  const o = owPick(G.camX + x, S);
  if (o && G.owLoops > 0) {
    const ox = o.x - G.camX,
      ot = sfY(SF.ceil);
    ctx.strokeStyle = 'rgba(69,210,255,.7)';
    ctx.strokeRect(ox - 9, ot - 2, 18, 12);
  }
  txt('OVERWATCH', x, y - s - 4, 8, col, 'center');
}
// a runner's drone: four rotors, a light in their colour, and its detection meter
function drawDroneP(p) {
  const d = p.drone,
    sx = p.x - G.camX,
    sy = sfY(p.z);
  shadow(sx, SF.floor, 10 * Math.max(0.3, 1 - p.z / 140));
  ctx.save();
  if (d && d.cloak) ctx.globalAlpha = 0.28 + 0.1 * Math.sin(G.t * 0.5);
  ctx.translate(sx, sy);
  ctx.rotate(p.out ? 0.6 : clamp((d ? d.vx : 0) * 0.08, -0.2, 0.2));
  const col = p.idx ? '#ffc63d' : '#ff3d8b';
  ctx.fillStyle = p.flash > 0 && p.flash % 2 ? '#ffffff' : '#1a1c26';
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 4, 0, 0, 7);
  ctx.fill();
  ctx.strokeStyle = '#3a3e50';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-12, -3);
  ctx.lineTo(12, -3);
  ctx.stroke();
  for (const rx of [-12, 12]) {
    const w = p.out ? 4 : 5 + Math.sin(G.t * 1.7 + rx) * 2;
    ctx.fillStyle = 'rgba(200,210,240,.35)';
    ctx.fillRect(rx - w, -5, w * 2, 1.5);
  }
  if (!p.out) {
    ctx.fillStyle = col;
    ctx.fillRect(4, -1, 3, 2);
    glow(6, 0, 10, 6, col, 0.5);
  } else if (G.t % 9 < 3) glow(0, 0, 8, 6, '#ffc63d', 0.6);
  ctx.restore();
  // detection: a meter that fills while something sees you
  if (d && !p.out && (d.seen > 1 || d.seenNow)) {
    const k = d.seen / 100;
    ctx.fillStyle = 'rgba(11,8,18,.75)';
    ctx.fillRect(sx - 12, sy - 14, 24, 4);
    ctx.fillStyle = k > 0.66 ? '#ff3d4a' : k > 0.33 ? '#ff9f6b' : '#ffc63d';
    ctx.fillRect(sx - 11, sy - 13, 22 * k, 2);
    if (d.seenNow && (G.t >> 2) % 2) txt('!', sx, sy - 16, 13, '#ff3d4a', 'center');
  }
  // the cloak's battery under it
  if (d && !p.out) {
    ctx.fillStyle = d.batt >= 50 ? 'rgba(69,210,255,.8)' : 'rgba(69,210,255,.3)';
    ctx.fillRect(sx - 8, sy + 7, (16 * d.batt) / 100, 1.5);
  }
}
// where to go next: the terminal until the files are pulled, then the exit vent
function stealthGoal() {
  const S = G.stealth;
  if (!S) return null;
  if (!S.data) return { x: S.term.x, z: 30, s: 'TERMINAL', c: '#45d2ff' };
  return { x: S.exit, z: 70, s: 'EXIT', c: '#7dffb0' };
}
function drawStealthHud() {
  const S = G.stealth,
    J = stealthJob(),
    bw = 236,
    bx = (W - bw) / 2,
    by = BAND + 52, // under the runners' panels, clear of money and ammo
    g = stealthGoal(),
    lead = PL.find(p => p.drone && !p.out),
    dist = g && lead ? Math.max(0, Math.round(Math.abs(g.x - lead.x) / 10)) : 0;
  ctx.fillStyle = 'rgba(11,8,18,.75)';
  ctx.fillRect(bx, by - 4, bw, 34);
  ctx.font = '11px "Chakra Petch", sans-serif';
  ctx.textAlign = 'left';
  // the one thing to do now, with how far away it is
  const now =
    S.done && S.win
      ? 'Out clean'
      : !S.data
        ? 'Pull the files from the terminal'
        : 'Out through the exit vent';
  ctx.fillStyle = S.done && S.win ? '#7dffb0' : '#efe9ff';
  ctx.fillText('▸ ' + now, bx + 8, by + 8);
  if (g && !S.done) {
    ctx.textAlign = 'right';
    ctx.fillStyle = g.c;
    ctx.fillText(
      (g.x >= (lead ? lead.x : 0) ? '' : '◂ ') + dist + ' m' + (g.x >= (lead ? lead.x : 0) ? ' ▸' : ''),
      bx + bw - 16,
      by + 8
    );
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = S.aide ? '#7dffb0' : '#a79dc2';
  ctx.fillText((S.aide ? '✓ ' : '○ ') + 'Bonus: dart ' + J.target + ' from behind', bx + 8, by + 21);
  if (S.ow && owOf()) {
    ctx.fillStyle = 'rgba(11,8,18,.75)';
    ctx.fillRect(bx, by + 32, bw, 14);
    ctx.font = '10px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#45d2ff';
    ctx.fillText(`OVERWATCH · LOOPS ${G.owLoops} · PINGS ${G.owPings}`, bx + bw / 2, by + 42);
  }
  // the objective marker: a bouncing chevron over it on screen, an arrow at the screen's edge when it isn't
  if (g && !S.done) {
    const sx = g.x - G.camX,
      sy = BAND + sfY(g.z + 40) + Math.sin(G.t * 0.15) * 3;
    ctx.fillStyle = g.c;
    if (sx > 12 && sx < W - 12) {
      ctx.beginPath();
      ctx.moveTo(sx - 6, sy - 8);
      ctx.lineTo(sx + 6, sy - 8);
      ctx.lineTo(sx, sy);
      ctx.closePath();
      ctx.fill();
    } else {
      const right = sx >= W - 12,
        ax = right ? W - 10 : 10,
        ay = BAND + sfY(g.z);
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(G.t * 0.15);
      ctx.beginPath();
      ctx.moveTo(ax + (right ? 6 : -6), ay);
      ctx.lineTo(ax - (right ? 4 : -4), ay - 8);
      ctx.lineTo(ax - (right ? 4 : -4), ay + 8);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.font = '9px "Chakra Petch", sans-serif';
      ctx.textAlign = right ? 'right' : 'left';
      ctx.fillText(g.s + ' ' + dist + ' m', right ? ax - 6 : ax + 6, ay + 18);
    }
  }
  // the alarm: three pips down the right edge
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < G.salarm ? '#ff3d4a' : '#3a3150';
    ctx.fillRect(bx + bw - 10, by + i * 12, 5, 8);
  }
}
