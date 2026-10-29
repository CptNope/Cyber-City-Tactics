/* Cyber City Tactics · src/js/render/air.js
 * Flight jobs on screen: the towers standing up into the flight path with their searchlights and flak, the
 * VTOL and its door gun, corp drones, gunships and the Raijin, and the hull and progress in the HUD.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
function drawTowers() {
  const F = G.flight,
    cx = G.camX,
    C = curS();
  // the street is far below: push it back into the dark
  ctx.fillStyle = 'rgba(5,4,10,.6)';
  ctx.fillRect(0, FY0 - 14, W, H - FY0 + 60);
  for (const t of F.towers) {
    const x = t.x - cx;
    if (x + t.w < -10 || x > W + 10) continue;
    ctx.fillStyle = '#0c0a14';
    ctx.fillRect(x, t.top, t.w, H - t.top);
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.fillRect(x, t.top, t.w, 2);
    ctx.fillStyle = C.win || '#ffb36b';
    ctx.globalAlpha = 0.45;
    for (let wy = t.top + 10; wy < H; wy += 11)
      for (let wx = x + 5; wx < x + t.w - 5; wx += 8)
        if (hash01(wx * 13 + wy * 7 + t.x) > 0.55) ctx.fillRect(wx, wy, 3, 4);
    ctx.globalAlpha = 1;
    // an aviation light on the antenna
    ctx.fillStyle = '#2a2436';
    ctx.fillRect(x + t.w / 2 - 1, t.top - 14, 2, 14);
    if ((G.t + t.x) % 80 < 40) glow(x + t.w / 2, t.top - 15, 5, 5, '#ff3d4a', 0.9);
    if (t.light) {
      const a = searchAngle(t),
        lx = x + t.w / 2,
        locked = (t.lock || 0) > 20;
      ctx.fillStyle = locked ? '#ff3d4a' : '#efe9ff';
      ctx.globalAlpha = locked ? 0.2 : 0.1;
      ctx.beginPath();
      ctx.moveTo(lx, t.top - 2);
      ctx.lineTo(lx + Math.cos(a - 0.12) * 230, t.top - 2 + Math.sin(a - 0.12) * 230);
      ctx.lineTo(lx + Math.cos(a + 0.12) * 230, t.top - 2 + Math.sin(a + 0.12) * 230);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#efe9ff';
      ctx.fillRect(lx - 3, t.top - 4, 6, 4);
    }
    // flak about to burst: a closing warning ring
    if (t.flak) {
      const k = t.flak.t / 34,
        fx = t.flak.x - cx,
        fy = FL.base - t.flak.z;
      ctx.strokeStyle = `rgba(255,61,74,${0.4 + 0.5 * (1 - k)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(fx, fy, 34 * (0.4 + k * 0.6), 0, 7);
      ctx.stroke();
    }
  }
}
function drawAir(e) {
  const sx = e.x - G.camX,
    sy = flyY(e);
  if (sx < -120 || sx > W + 120) return;
  ctx.save();
  ctx.translate(sx, sy);
  const fl = e.flash > 0 && e.flash % 2;
  if (e.kind === 'vtol') {
    if (e.inv > 0 && (G.t >> 2) % 2 && G.fhull > 0) ctx.globalAlpha = 0.55;
    ctx.rotate(clamp((e.vz || 0) * -0.04, -0.12, 0.12));
    // hull, cockpit, tilt rotors, the door and its gun
    ctx.fillStyle = fl ? '#ffffff' : '#2a2f40';
    ctx.beginPath();
    ctx.moveTo(-34, -6);
    ctx.lineTo(18, -10);
    ctx.lineTo(34, -2);
    ctx.lineTo(18, 8);
    ctx.lineTo(-30, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(159,233,255,.55)';
    ctx.beginPath();
    ctx.moveTo(18, -8);
    ctx.lineTo(30, -2);
    ctx.lineTo(18, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff3d8b';
    ctx.fillRect(-26, -1, 34, 2);
    ctx.fillStyle = '#1a1c26';
    ctx.fillRect(-12, -4, 14, 10);
    for (const rx of [-22, 12]) {
      ctx.fillStyle = '#3a3e50';
      ctx.fillRect(rx - 2, -16, 4, 8);
      const w = 14 + Math.sin(G.t * 1.9 + rx) * 4;
      ctx.fillStyle = 'rgba(200,210,240,.4)';
      ctx.fillRect(rx - w, -18, w * 2, 2);
    }
    ctx.strokeStyle = '#ffc63d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-5, 4);
    ctx.lineTo(-5 + Math.cos(e.aim) * 12, 4 + Math.sin(e.aim) * 12);
    ctx.stroke();
    glow(34, -2, 18, 6, '#ffe28a', 0.3);
    if (G.fhull < FL.hull * 0.3 && G.t % 6 < 3)
      G.parts.push({
        x: e.x - 30,
        y: FL.base,
        z: e.z + 2,
        vx: -1.4,
        vy: 0,
        vz: 0.4,
        life: 22,
        c: '#3a3344',
        sz: 3
      });
  } else if (e.big) {
    ctx.fillStyle = fl ? '#ffffff' : '#1d2230';
    ctx.beginPath();
    ctx.moveTo(48, -10);
    ctx.lineTo(-30, -18);
    ctx.lineTo(-50, -2);
    ctx.lineTo(-30, 14);
    ctx.lineTo(48, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff3d4a';
    ctx.fillRect(-36, -2, 70, 3);
    txt('RAIJIN', 6, -4, 10, '#efe9ff', 'center');
    for (const rx of [-26, 26]) {
      const w = 26 + Math.sin(G.t * 1.6 + rx) * 6;
      ctx.fillStyle = 'rgba(200,210,240,.35)';
      ctx.fillRect(rx - w, -24, w * 2, 2);
    }
    glow(-50, 0, 20, 10, '#ff3d4a', 0.4);
  } else if (e.gun) {
    ctx.fillStyle = fl ? '#ffffff' : '#202536';
    ctx.beginPath();
    ctx.moveTo(26, -6);
    ctx.lineTo(-18, -10);
    ctx.lineTo(-28, 0);
    ctx.lineTo(-18, 8);
    ctx.lineTo(26, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#45d2ff';
    ctx.fillRect(-20, -1, 36, 2);
    const w = 20 + Math.sin(G.t * 1.8) * 5;
    ctx.fillStyle = 'rgba(200,210,240,.35)';
    ctx.fillRect(-w, -14, w * 2, 2);
    glow(-28, 0, 12, 6, '#ff3d4a', 0.5);
  } else {
    ctx.fillStyle = fl ? '#ffffff' : '#1a1c26';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 4, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,210,240,.35)';
    ctx.fillRect(-12, -5, 8, 1.5);
    ctx.fillRect(4, -5, 8, 1.5);
    ctx.fillStyle = '#ff3d4a';
    ctx.fillRect(-6, -1, 3, 2);
    glow(-5, 0, 7, 4, '#ff3d4a', 0.5);
  }
  ctx.restore();
  // health bars on the bigger threats
  if ((e.gun || e.big) && e.hp > 0 && e.hp < e.maxHp) {
    const bw = e.big ? 60 : 30;
    ctx.fillStyle = 'rgba(11,8,18,.8)';
    ctx.fillRect(sx - bw / 2, sy - 30, bw, 3);
    ctx.fillStyle = '#ff3d4a';
    ctx.fillRect(sx - bw / 2, sy - 30, (bw * e.hp) / e.maxHp, 3);
  }
}
function drawFlightHud() {
  const F = G.flight,
    bw = Math.min(170, W * 0.36),
    bx = (W - bw) / 2,
    by = BAND + H - (G.coop ? 62 : 46); // along the bottom, out of the way of the sky you fly in
  ctx.fillStyle = 'rgba(11,8,18,.75)';
  ctx.fillRect(bx - 6, by - 4, bw + 12, 30);
  ctx.fillStyle = '#2a2436';
  ctx.fillRect(bx, by + 2, bw, 3);
  ctx.fillStyle = '#ffc63d';
  ctx.fillRect(bx, by + 2, bw * (G.fdist || 0), 3);
  ctx.fillStyle = 'rgba(255,61,74,.55)';
  ctx.fillRect(bx + bw * 0.86, by, 2, 7);
  const v = vtolOf();
  ctx.font = '11px "Chakra Petch", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = G.fhull < FL.hull * 0.3 && (G.t >> 3) % 2 ? '#ff3d4a' : '#efe9ff';
  ctx.fillText('HULL ' + Math.round(((G.fhull || 0) / FL.hull) * 100) + '%', bx, by + 19);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffc63d';
  ctx.fillText('FLARES ' + (v ? v.flares : 0), bx + bw, by + 19);
  if (F.boss && !F.bossDown) {
    const r = G.ents.find(e => e.big && e.hp > 0);
    if (r) {
      ctx.fillStyle = 'rgba(11,8,18,.75)';
      ctx.fillRect(bx - 6, by + 28, bw + 12, 10);
      ctx.fillStyle = '#ff3d4a';
      ctx.fillRect(bx, by + 31, (bw * r.hp) / r.maxHp, 4);
    }
  }
}
// the Arcology roof after the drop: the city far below, a parapet, the landing pad and the stairwell heads
function drawRoof() {
  const R = G.flight.roof,
    cx = G.camX,
    C = curS();
  // the street is a long way down: drown it, then lay the roof deck over the floor band
  ctx.fillStyle = 'rgba(5,4,10,.75)';
  ctx.fillRect(0, FY0 - 40, W, H - FY0 + 80);
  const top = FY0 - 16;
  ctx.fillStyle = '#1b1a26';
  ctx.fillRect(0, top, W, H - top);
  ctx.fillStyle = 'rgba(255,255,255,.04)';
  for (let x = -((cx * 1) % 48); x < W; x += 48) ctx.fillRect(x, top, 1, H - top);
  for (let y = top + 22; y < H; y += 22) ctx.fillRect(0, y, W, 1);
  // the parapet along the back, with the stairwell heads and a vent stack
  ctx.fillStyle = '#262536';
  ctx.fillRect(0, top - 10, W, 10);
  ctx.fillStyle = C.win || '#ffb36b';
  ctx.globalAlpha = 0.35;
  ctx.fillRect(0, top - 10, W, 1);
  ctx.globalAlpha = 1;
  for (const sx of [30, W - 92]) {
    ctx.fillStyle = '#2c2a3c';
    ctx.fillRect(sx, top - 46, 62, 40);
    ctx.fillStyle = '#0d0b14';
    ctx.fillRect(sx + 20, top - 34, 22, 28);
    const live = R.live && G.t % 40 < 20;
    glow(sx + 31, top - 40, 6, 4, live ? '#ff3d4a' : '#7dffb0', 0.8);
  }
  ctx.fillStyle = '#23222f';
  ctx.fillRect(W * 0.42, top - 30, 40, 24);
  ctx.fillStyle = 'rgba(255,255,255,.07)';
  for (let i = 0; i < 4; i++) ctx.fillRect(W * 0.42 + 4, top - 26 + i * 5, 32, 2);
  // the pad, painted on the deck
  const px = W * 0.5,
    py = (FY0 + FY1) / 2 + 4;
  ctx.strokeStyle = 'rgba(255,198,61,.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(px, py, 92, 34, 0, 0, 7);
  ctx.stroke();
  txt('H', px, py + 9, 26, 'rgba(255,198,61,.3)', 'center');
  // the edge lights blink along the front
  for (let x = 12; x < W; x += 40) if ((G.t + x) % 90 < 45) glow(x, H - 6, 4, 3, '#ff3d4a', 0.6);
}
