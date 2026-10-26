/* Cyber City Tactics · src/js/render/world.js
 * Backgrounds, building interiors, Den storefronts and rain.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
function drawBg() {
  const S = curS(),
    B = G.bg,
    cx = G.camX;
  let g = ctx.createLinearGradient(0, 0, 0, FY0);
  g.addColorStop(0, S.sky[0]);
  g.addColorStop(1, S.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, FY0);
  if (!S.tunnel) {
    const mx = 390 - cx * 0.04;
    ctx.fillStyle = S.moon;
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.arc(mx, 52, 34, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(mx, 52, 17, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (S.grid) {
    ctx.strokeStyle = 'rgba(255,198,61,.06)';
    ctx.lineWidth = 1;
    for (let y = 20; y < FY0; y += 14) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }
  const base = FY0 - 14;
  for (const b of B.far) {
    const x = b.x - cx * 0.25;
    if (x > W || x + b.w < 0) continue;
    ctx.fillStyle = S.far;
    ctx.fillRect(x, base - b.h, b.w, b.h + 2);
    ctx.fillStyle = S.win;
    ctx.globalAlpha = 0.35;
    for (const w of b.wins) ctx.fillRect(x + w[0], base - b.h + w[1], 2, 3);
    ctx.globalAlpha = 1;
  }
  if (S.tunnel) {
    ctx.fillStyle = '#050a08';
    for (let i = -1; i < 6; i++) {
      const ax = i * 120 - ((cx * 0.55) % 120);
      ctx.beginPath();
      ctx.moveTo(ax, base);
      ctx.lineTo(ax, 40);
      ctx.quadraticCurveTo(ax + 60, -10, ax + 120, 40);
      ctx.lineTo(ax + 120, base);
      ctx.lineTo(ax + 108, base);
      ctx.lineTo(ax + 108, 46);
      ctx.quadraticCurveTo(ax + 60, 6, ax + 12, 46);
      ctx.lineTo(ax + 12, base);
      ctx.closePath();
      ctx.fill();
    }
  }
  for (const b of B.near) {
    const x = b.x - cx * 0.55;
    if (x > W + 60 || x + b.w < -60) continue;
    if (!S.tunnel) {
      ctx.fillStyle = S.near;
      ctx.fillRect(x, base - b.h, b.w, b.h + 2);
      ctx.fillStyle = 'rgba(255,255,255,.05)';
      ctx.fillRect(x, base - b.h, b.w, 2);
      ctx.fillStyle = S.win;
      ctx.globalAlpha = 0.55;
      for (const w of b.wins) ctx.fillRect(x + w[0], base - b.h + w[1], 3, 4);
      ctx.globalAlpha = 1;
    }
    if (b.sign) {
      const s = b.sign,
        on = !(Math.sin(G.t * 0.05 + b.x) > 0.96);
      ctx.font = '600 13px Teko, Impact, sans-serif';
      if (s.vert) {
        const ch = s.t.split('');
        const hgt = ch.length * 11 + 6,
          sx0 = x + s.dx,
          sy0 = base - b.h + s.dy;
        ctx.fillStyle = '#0b0812';
        ctx.fillRect(sx0, sy0, 15, hgt);
        ctx.strokeStyle = s.c;
        ctx.globalAlpha = on ? 1 : 0.3;
        ctx.lineWidth = 1;
        ctx.strokeRect(sx0 + 0.5, sy0 + 0.5, 14, hgt - 1);
        ctx.fillStyle = s.c;
        ctx.textAlign = 'center';
        ch.forEach((c, i) => ctx.fillText(c, sx0 + 7.5, sy0 + 14 + i * 11));
        ctx.globalAlpha = 1;
      } else {
        const tw = ctx.measureText(s.t).width + 10,
          sx0 = x + s.dx,
          sy0 = base - b.h + s.dy;
        ctx.fillStyle = '#0b0812';
        ctx.fillRect(sx0, sy0, tw, 15);
        ctx.globalAlpha = on ? 1 : 0.3;
        ctx.strokeStyle = s.c;
        ctx.strokeRect(sx0 + 0.5, sy0 + 0.5, tw - 1, 14);
        ctx.fillStyle = s.c;
        ctx.textAlign = 'left';
        ctx.fillText(s.t, sx0 + 5, sy0 + 12.5);
        ctx.globalAlpha = on ? 0.12 : 0;
        ctx.fillRect(sx0 - 6, sy0 - 6, tw + 12, 27);
        ctx.globalAlpha = 1;
      }
    }
  }
  if (G.dun) drawInterior(base);
  ctx.fillStyle = S.wall;
  ctx.fillRect(0, base, W, 14);
  ctx.fillStyle = 'rgba(255,255,255,.06)';
  ctx.fillRect(0, base, W, 1);
  if (G.den) drawStorefronts(base);
  else if (G.world && !G.dun && G.wd) {
    drawBuildings(base);
    if (evOn('festival')) {
      const yy = lx => base - 84 + Math.sin((lx + G.camX) * 0.045) * 7;
      ctx.strokeStyle = 'rgba(20,14,30,.9)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let lx = 0; lx <= W; lx += 6) ctx.lineTo(lx, yy(lx));
      ctx.stroke();
      for (let lx = -(G.camX % 14); lx < W; lx += 14) {
        const k = Math.floor((lx + G.camX) / 14);
        ctx.fillStyle = ['#ff3d8b', '#ffc63d', '#b98cff', '#45d2ff'][((k % 4) + 4) % 4];
        ctx.globalAlpha = 0.75 + 0.25 * Math.sin(G.t * 0.08 + k);
        ctx.beginPath();
        ctx.arc(lx, yy(lx) + 3, 2.8, 0, 7);
        ctx.fill();
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.arc(lx, yy(lx) + 3, 7, 0, 7);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (evOn('gangwar') && G.t % 40 === 0)
      G.parts.push({
        x: G.camX + Math.random() * W,
        y: FY0 + 4,
        z: 60 + Math.random() * 30,
        vx: 0,
        vy: 0,
        vz: 0.4,
        life: 40,
        c: '#ff6a3d',
        sz: 2
      });
  }
  g = ctx.createLinearGradient(0, FY0, 0, H);
  g.addColorStop(0, S.ground[0]);
  g.addColorStop(1, S.ground[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, FY0, W, H - FY0);
  ctx.strokeStyle = S.line;
  ctx.lineWidth = 1;
  const step = 64,
    off = -(cx % step);
  for (let x = off - step * 2; x < W + step * 2; x += step) {
    const vx = x + (x - W / 2) * 0.55;
    ctx.beginPath();
    ctx.moveTo(x, FY0);
    ctx.lineTo(vx, H);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, FY0 + 0.5);
  ctx.lineTo(W, FY0 + 0.5);
  ctx.stroke();
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, 212.5);
  ctx.lineTo(W, 212.5);
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (S.tunnel) {
    ctx.strokeStyle = '#3a4a40';
    ctx.lineWidth = 2;
    for (const ry of [226, 248]) {
      ctx.beginPath();
      ctx.moveTo(0, ry);
      ctx.lineTo(W, ry);
      ctx.stroke();
    }
  }
  if (G.exitOpen && !G.den) {
    const ex = S.len - 30 - cx;
    if (ex < W + 20) {
      ctx.fillStyle = `rgba(255,61,139,${0.25 + 0.2 * Math.sin(G.t * 0.15)})`;
      ctx.fillRect(ex, FY0, 30, H - FY0);
    }
  }
  if (G.den) {
    const ex = DEN.len - 40 - cx;
    if (ex < W + 20) {
      ctx.fillStyle = `rgba(255,61,139,${0.2 + 0.15 * Math.sin(G.t * 0.1)})`;
      ctx.fillRect(ex, FY0, 40, H - FY0);
      txt('NEXT JOB ▶', ex + 20, FY0 - 20, 14, '#ff3d8b', 'center');
    }
  }
}
const INT = {
  secret: { wall: '#1a1024', trim: '#2e1a40', lamp: '#b98cff', deco: 'art' },
  hideout: { wall: '#2a1c1e', trim: '#4a2a22', lamp: '#ff6a3d', deco: 'tag' },
  blacksite: { wall: '#0f1622', trim: '#1c2a3e', lamp: '#45d2ff', deco: 'rack' },
  business: { wall: '#1d2233', trim: '#2c3450', lamp: '#ffe9b0', deco: 'shelf' },
  home: { wall: '#2a2236', trim: '#3a3048', lamp: '#ffb36b', deco: 'frame' },
  dirty: { wall: '#1a1626', trim: '#3a2f18', lamp: '#ffc63d', deco: 'art' }
};
function drawInterior(base) {
  const D0 = G.dun,
    b = D0.b,
    T = INT[facOf(b)],
    r = srng(b.seed + D0.room * 97);
  ctx.fillStyle = T.wall;
  ctx.fillRect(0, 0, W, base);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  for (let x = 0; x < W; x += 40) ctx.fillRect(x, 0, 1, base);
  ctx.fillStyle = T.trim;
  ctx.fillRect(0, base - 34, W, 34);
  ctx.fillStyle = 'rgba(255,255,255,.06)';
  ctx.fillRect(0, base - 34, W, 1);
  ctx.fillStyle = '#07050b';
  ctx.fillRect(0, 0, W, 14);
  for (let x = 60; x < W; x += 120) {
    const fl = Math.sin(G.t * 0.07 + x) > 0.97;
    ctx.fillStyle = T.lamp;
    ctx.globalAlpha = fl ? 0.2 : 0.9;
    ctx.fillRect(x - 14, 14, 28, 3);
    const g = ctx.createRadialGradient(x, 18, 2, x, 40, 90);
    g.addColorStop(0, T.lamp);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = fl ? 0.03 : 0.12;
    ctx.fillStyle = g;
    ctx.fillRect(x - 90, 14, 180, base - 14);
    ctx.globalAlpha = 1;
  }
  for (let i = 0; i < 4; i++) {
    const x = 40 + i * 110 + r() * 40,
      y = 40 + r() * 30;
    if (T.deco === 'tag') {
      ctx.strokeStyle = pick(['#ff3d8b', '#7dffb0', '#ffc63d']);
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + 20);
      for (let k = 1; k < 6; k++) ctx.lineTo(x + k * 8, y + 20 - (k % 2 ? 18 : 4) * r());
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (T.deco === 'rack') {
      ctx.fillStyle = '#0a0f18';
      ctx.fillRect(x, y - 10, 26, base - 34 - y + 10);
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = (G.t >> 4) % 7 === (k + i) % 7 ? '#7dffb0' : '#45d2ff';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(x + 4, y - 6 + k * 9, 3, 2);
        ctx.globalAlpha = 1;
      }
    }
    if (T.deco === 'shelf') {
      ctx.fillStyle = '#141826';
      ctx.fillRect(x - 4, y, 44, 3);
      ctx.fillRect(x - 4, y + 22, 44, 3);
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = pick(['#ff6a3d', '#45d2ff', '#ffc63d', '#b98cff']);
        ctx.globalAlpha = 0.6;
        ctx.fillRect(x + k * 8, y - 8, 5, 8);
        ctx.fillRect(x + k * 8, y + 14, 5, 8);
        ctx.globalAlpha = 1;
      }
    }
    if (T.deco === 'frame' || T.deco === 'art') {
      ctx.strokeStyle = T.deco === 'art' ? '#ffc63d' : '#6b6280';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, 22, 28);
      ctx.fillStyle = pick(['#3a2a50', '#22324a', '#4a2a30']);
      ctx.fillRect(x + 2, y + 2, 18, 24);
    }
  }
  const ex = W - 26;
  ctx.fillStyle = '#07050b';
  ctx.fillRect(ex - 12, base - 44, 26, 44);
  ctx.strokeStyle = G.exitOpen ? '#7dffb0' : '#ff3d4a';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(ex - 12.5, base - 44.5, 26, 44);
  ctx.fillStyle = G.exitOpen ? '#7dffb0' : '#ff3d4a';
  ctx.fillRect(ex - 3, base - 52, 8, 4);
}
function drawStorefronts(base) {
  for (const n of NPCS) {
    if (!n.front) continue;
    const f = n.front,
      x = n.x - G.camX - f.w / 2;
    if (x > W || x + f.w < 0) continue;
    ctx.fillStyle = '#120d1a';
    ctx.fillRect(x, base - 74, f.w, 74);
    ctx.fillStyle = '#08060c';
    ctx.fillRect(x + f.w / 2 - 12, base - 44, 24, 44);
    ctx.fillStyle = f.c;
    ctx.globalAlpha = 0.12 + 0.04 * Math.sin(G.t * 0.08 + n.x);
    ctx.fillRect(x + f.w / 2 - 12, base - 44, 24, 44);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0b0812';
    ctx.fillRect(x + 4, base - 70, f.w - 8, 18);
    ctx.strokeStyle = f.c;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 4.5, base - 69.5, f.w - 9, 17);
    ctx.font = '600 15px Teko, Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = f.c;
    ctx.fillText(f.t, x + f.w / 2, base - 56);
    ctx.globalAlpha = 0.1;
    ctx.fillRect(x - 4, base - 76, f.w + 8, 30);
    ctx.globalAlpha = 1;
    ctx.fillStyle = f.c;
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < f.w - 8; i += 8) ctx.fillRect(x + 4 + i, base - 50, 5, 3);
    ctx.globalAlpha = 1;
  }
}
function drawRain() {
  if (!G.rain.length) return;
  const mx = curS().matrix;
  if (mx) {
    ctx.fillStyle = 'rgba(125,255,176,.35)';
    for (const r of G.rain) {
      ctx.fillRect(r.x, r.y, 1.5, 3);
      ctx.fillRect(r.x, r.y - 6, 1.5, 2);
    }
    return;
  }
  ctx.strokeStyle = 'rgba(170,190,255,.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const r of G.rain) {
    ctx.moveTo(r.x, r.y);
    ctx.lineTo(r.x - 2, r.y + 6);
  }
  ctx.stroke();
}
