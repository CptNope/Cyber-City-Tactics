/* Cyber City Tactics · src/js/render/vehicles.js
 * Driving missions on screen: the road's lane markings and finish line, bikes under their riders, civilian
 * cars, the Kagemori Interceptor van, oil slicks, and the run's progress bar and clock.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
function drawRoad() {
  const cx = G.camX,
    J = driveJob();
  // the guard rail along the wall
  ctx.fillStyle = '#3a3348';
  ctx.fillRect(0, FY0 - 6, W, 2);
  for (let x = -((cx * 1) % 48); x < W; x += 48) ctx.fillRect(x, FY0 - 12, 2, 8);
  // road edges and dashed lane lines that scroll with you
  ctx.fillStyle = 'rgba(255,198,61,.55)';
  ctx.fillRect(0, DRIVE.top - 8, W, 1.5);
  ctx.fillStyle = 'rgba(239,233,255,.28)';
  const off = -(cx % 44);
  for (const y of [DRIVE.top + 22, DRIVE.top + 48])
    for (let x = off; x < W; x += 44) ctx.fillRect(x, y, 22, 1.5);
  // the finish: a checkered strip across the road and a gantry over it
  const fx = J.len - cx;
  if (fx > -40 && fx < W + 40) {
    for (let i = 0; i < 14; i++)
      for (let j = 0; j < 2; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#efe9ff' : '#0b0812';
        ctx.fillRect(fx + j * 5, DRIVE.top - 8 + i * 6, 5, 6);
      }
    ctx.fillStyle = '#2a2436';
    ctx.fillRect(fx - 2, FY0 - 70, 4, 70);
    ctx.fillRect(fx - 40, FY0 - 72, 84, 14);
    glow(fx + 2, FY0 - 65, 50, 14, '#ffc63d', 0.4);
    txt('FINISH', fx + 2, FY0 - 61, 13, '#ffc63d', 'center');
  }
  // speed lines while anyone is on nitro
  if (!RM && PL.some(p => p.bk && p.bk.boostT > 0)) {
    ctx.strokeStyle = 'rgba(239,233,255,.18)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const y = DRIVE.top + hash01(i * 17 + (G.t >> 1)) * (DRIVE.bot - DRIVE.top),
        x = hash01(i * 31 + G.t) * W;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 30, y);
      ctx.stroke();
    }
  }
}
function wheel(x, y, r, spin) {
  ctx.fillStyle = '#0d0a12';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 7);
  ctx.fill();
  ctx.strokeStyle = '#3a3348';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = '#5a5266';
  ctx.lineWidth = 1;
  for (let i = 0; i < 2; i++) {
    const a = spin + (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8);
    ctx.lineTo(x - Math.cos(a) * r * 0.8, y - Math.sin(a) * r * 0.8);
    ctx.stroke();
  }
}
// a bike under its rider; crashed, it lies on its side and skids
function drawBike(e) {
  const sx = e.x - G.camX,
    gy = e.y - e.z,
    down = e.state === 'dead' || e.state === 'down',
    col = (e.pal && e.pal.acc) || '#ff3d8b';
  if (e.inv > 0 && !down && (G.t >> 2) % 2) return; // blinks with its rider while they're briefly safe
  shadow(sx, e.y, 20);
  ctx.save();
  ctx.translate(sx, down ? e.y : gy);
  if (down) {
    ctx.translate(8, -2);
    ctx.scale(1, 0.45);
  }
  const spin = (e.walk || 0) * 0.28;
  wheel(-14, -6.5, 6.5, spin);
  wheel(13, -6.5, 6.5, spin);
  ctx.strokeStyle = '#2a2436';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-14, -6.5);
  ctx.lineTo(-3, -15);
  ctx.lineTo(9, -16);
  ctx.lineTo(13, -6.5);
  ctx.stroke();
  ctx.fillStyle = e.flash > 0 && e.flash % 2 ? '#ffffff' : col;
  ctx.beginPath();
  ctx.moveTo(-3, -20);
  ctx.lineTo(9, -21);
  ctx.lineTo(12, -15);
  ctx.lineTo(-1, -14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#14101c';
  ctx.fillRect(-11, -19, 9, 3);
  ctx.fillStyle = '#5a5266';
  ctx.fillRect(-17, -11, 9, 2);
  if (!down) {
    glow(17, -17, 18, 7, '#ffe28a', 0.35);
    ctx.fillStyle = '#ffe28a';
    ctx.fillRect(12, -19, 3, 3);
    ctx.fillStyle = '#ff3d4a';
    ctx.fillRect(-17, -18, 2, 2);
  }
  ctx.restore();
  // a runner's nitro, as a thin bar under the bike
  if (e.kind === 'player' && e.bk && !down) {
    ctx.fillStyle = 'rgba(11,8,18,.7)';
    ctx.fillRect(sx - 13, e.y + 3, 26, 3);
    ctx.fillStyle = e.bk.nitro >= DRIVE.nitroCost ? '#45d2ff' : '#3a5a70';
    ctx.fillRect(sx - 12, e.y + 4, (24 * e.bk.nitro) / 100, 1.5);
  }
}
function drawVehicle(e) {
  const sx = e.x - G.camX,
    y = e.y;
  if (sx < -120 || sx > W + 120) return;
  if (e.veh === 'oil') {
    ctx.fillStyle = 'rgba(8,6,12,.92)';
    ctx.beginPath();
    ctx.ellipse(sx, y, 18, 5, 0, 0, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(69,210,255,.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(sx - 3, y - 1, 9, 2, 0, 0, 3.4);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(185,140,255,.3)';
    ctx.beginPath();
    ctx.ellipse(sx + 4, y, 6, 1.5, 0, 3, 6.2);
    ctx.stroke();
    return;
  }
  const van = e.veh === 'van',
    dead = e.state === 'dead',
    L = van ? 44 : 32,
    spin = (e.walk || 0) * 0.22;
  shadow(sx, y, van ? 46 : 34);
  ctx.save();
  ctx.translate(sx, y - (e.z || 0));
  if (van && e.ramT > 0) ctx.rotate(Math.sign(e.ramY - e.y) * 0.04);
  const body = dead ? '#1a1620' : van ? '#1d2230' : e.col || '#4a6b8a';
  if (van) {
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-L, -8);
    ctx.lineTo(-L, -34);
    ctx.lineTo(L - 14, -34);
    ctx.lineTo(L, -20);
    ctx.lineTo(L, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.lineWidth = 1;
    for (let i = -L + 14; i < L - 14; i += 14) {
      ctx.beginPath();
      ctx.moveTo(i, -33);
      ctx.lineTo(i, -9);
      ctx.stroke();
    }
    ctx.fillStyle = dead ? '#3a1a1a' : '#ff3d4a';
    ctx.fillRect(-L, -20, L * 2 - 2, 3);
    ctx.fillStyle = 'rgba(159,233,255,.3)';
    ctx.fillRect(L - 20, -31, 10, 7);
    txt('KGM', -6, -23, 11, dead ? '#4a4256' : '#efe9ff', 'center');
    if (!dead) {
      const red = (G.t >> 3) % 2;
      ctx.fillStyle = red ? '#ff3d4a' : '#45d2ff';
      ctx.fillRect(-10, -38, 20, 4);
      glow(0, -36, 26, 10, red ? '#ff3d4a' : '#45d2ff', 0.5);
      glow(L + 4, -14, 22, 8, '#efe9ff', 0.35);
    } else glow(0, -30, 30, 16, '#ff6a3d', 0.25 + 0.15 * Math.sin(G.t * 0.4));
  } else {
    ctx.fillStyle = body;
    ctx.fillRect(-L, -18, L * 2, 11);
    ctx.beginPath();
    ctx.moveTo(-16, -18);
    ctx.lineTo(-10, -28);
    ctx.lineTo(12, -28);
    ctx.lineTo(18, -18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(159,233,255,.35)';
    ctx.fillRect(-9, -26, 9, 7);
    ctx.fillRect(2, -26, 9, 7);
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.fillRect(-L, -18, L * 2, 1);
    glow(L + 4, -13, 18, 7, '#ffe28a', 0.35);
    ctx.fillStyle = '#ffe28a';
    ctx.fillRect(L - 3, -15, 3, 3);
    ctx.fillStyle = '#ff3d4a';
    ctx.fillRect(-L, -15, 2, 3);
  }
  wheel(-L + 12, -7, van ? 7.5 : 6, spin);
  wheel(L - 12, -7, van ? 7.5 : 6, spin);
  if (e.flash > 0 && e.flash % 2) {
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-L, -34, L * 2, 28);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
// the run's progress, the clock, and where the Interceptor waits
function drawDriveHud() {
  const J = driveJob(),
    bw = Math.min(170, W * 0.36),
    bx = (W - bw) / 2,
    by = BAND + (G.coop ? 50 : 8); // two runner panels fill the top in co-op
  ctx.fillStyle = 'rgba(11,8,18,.75)';
  ctx.fillRect(bx - 6, by - 4, bw + 12, 26);
  ctx.fillStyle = '#2a2436';
  ctx.fillRect(bx, by + 2, bw, 3);
  ctx.fillStyle = '#ffc63d';
  ctx.fillRect(bx, by + 2, bw * (G.ddist || 0), 3);
  // the stretch where the Interceptor hunts
  ctx.fillStyle = 'rgba(255,61,74,.55)';
  ctx.fillRect(bx + bw * 0.72, by, 2, 7);
  for (const p of PL) {
    if (!p.bk) continue;
    const px = bx + bw * clamp(p.x / J.len, 0, 1);
    ctx.fillStyle = p.idx ? '#ffc63d' : '#ff3d8b';
    ctx.beginPath();
    ctx.moveTo(px, by + 1);
    ctx.lineTo(px - 3, by - 3);
    ctx.lineTo(px + 3, by - 3);
    ctx.fill();
  }
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 2; j++) {
      ctx.fillStyle = (i + j) % 2 ? '#efe9ff' : '#0b0812';
      ctx.fillRect(bx + bw + 3 + j * 3, by - 1 + i * 3, 3, 3);
    }
  const left = (J.time - (G.dtime || 0)) / 60;
  txt(
    fmtTime(Math.max(0, J.time - (G.dtime || 0))),
    W / 2,
    by + 19,
    12,
    left < 15 && (G.t >> 3) % 2 ? '#ff3d4a' : '#efe9ff',
    'center'
  );
}
