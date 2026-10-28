/* Cyber City Tactics · src/js/render/sprawl.js
 * Sprawl street buildings, signs, hidden doors and the minimap.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
function drawBuildings(base) {
  const w = G.wd;
  // the facades hide the skyline's signs, so the street reflects the shopfronts instead
  REFL.length = 0;
  for (const b of w.street.buildings) {
    const x = b.x - b.w / 2 - G.camX;
    if (x > W || x + b.w < 0) continue;
    if (b.type === 'secret') {
      const dx = b.x - G.camX,
        fd = w.found.includes(b.id),
        lo = w.looted.includes(b.id);
      ctx.fillStyle = '#0a0710';
      ctx.fillRect(dx - 11, base - 38, 22, 38);
      ctx.strokeStyle = fd ? '#b98cff' : 'rgba(185,140,255,.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(dx - 11.5, base - 38.5, 22, 38);
      if (fd && !lo) {
        ctx.fillStyle = '#b98cff';
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(G.t * 0.1);
        ctx.beginPath();
        ctx.arc(dx, base - 48, 3, 0, 7);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      continue;
    }
    const H0 = {
        safe: 86,
        home: 94,
        business: 78,
        hideout: 70,
        blacksite: 114,
        club: 88,
        precinct: 104,
        clinic: 82,
        talisman: 76
      }[b.type],
      col = {
        safe: '#18261e',
        home: '#231c33',
        business: '#18243a',
        hideout: '#2a1a1c',
        blacksite: '#10141f',
        club: '#2a1630',
        precinct: '#141c2e',
        clinic: '#14262a',
        talisman: '#241a30'
      }[b.type];
    ctx.fillStyle = col;
    ctx.fillRect(x, base - H0, b.w, H0);
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    ctx.fillRect(x, base - H0, b.w, 2);
    const wr = srng(b.seed);
    ctx.fillStyle =
      b.type === 'blacksite' || b.type === 'precinct'
        ? '#45d2ff'
        : b.type === 'hideout'
          ? '#ff6a3d'
          : b.type === 'club'
            ? '#ff3d8b'
            : '#ffb36b';
    ctx.globalAlpha = 0.4;
    for (let wy = base - H0 + 8; wy < base - 60; wy += 12)
      for (let wx = x + 6; wx < x + b.w - 8; wx += 12) if (wr() < 0.45) ctx.fillRect(wx, wy, 5, 6);
    ctx.globalAlpha = 1;
    if (b.type === 'club') {
      // a strip of chasing lights over the door
      for (let k = 0; k < b.w / 8; k++) {
        ctx.fillStyle = ['#ff3d8b', '#45d2ff', '#ffc63d', '#b98cff'][(k + (G.t >> 3)) % 4];
        ctx.fillRect(x + 2 + k * 8, base - 46, 4, 2);
      }
      glow(x + b.w / 2, base - 45, b.w * 0.6, 10, '#ff3d8b', 0.3);
      REFL.push(x + b.w / 2, b.w * 0.6, '#ff3d8b', 1);
    } else if (b.type === 'precinct') {
      // a siren bar on the roof
      const sc = (G.t >> 4) % 2 ? '#ff3d4a' : '#45d2ff';
      glow(b.x - G.camX, base - H0 - 2, 26, 12, sc, 0.55);
      ctx.fillStyle = sc;
      ctx.fillRect(b.x - G.camX - 8, base - H0 - 4, 16, 4);
      REFL.push(b.x - G.camX, 16, sc, 1);
    }
    const looted = w.looted.includes(b.id),
      dx = b.x - G.camX,
      shop = isShop(b),
      good = shop || isGood(b);
    const frame =
      b.type === 'safe' ? '#7dffb0' : shop ? '#ffc63d' : ['#efe9ff', '#efe9ff', '#45d2ff', '#ffc63d'][b.tier];
    if (!looted && !lowFx()) glow(dx, base - 20, 24, 28, frame, 0.2);
    if (!looted) REFL.push(dx, 24, frame, 1);
    ctx.fillStyle = '#07050b';
    ctx.fillRect(dx - 12, base - 40, 24, 40);
    ctx.strokeStyle = frame;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(dx - 12.5, base - 40.5, 25, 40);
    if (!looted && !shop) {
      ctx.fillStyle = frame;
      ctx.globalAlpha = 0.08 + 0.05 * Math.sin(G.t * 0.1 + b.id);
      ctx.fillRect(dx - 12, base - 40, 24, 40);
      ctx.globalAlpha = 1;
    }
    if (looted) {
      ctx.strokeStyle = '#7a5a34';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(dx - 12, base - 36);
      ctx.lineTo(dx + 12, base - 6);
      ctx.moveTo(dx + 12, base - 36);
      ctx.lineTo(dx - 12, base - 6);
      ctx.stroke();
    }
    ctx.font = '600 11px Teko, Impact, sans-serif';
    const tw = Math.min(b.w - 6, ctx.measureText(b.name).width + 10);
    const nc = looted ? '#6b6280' : shop && b.type !== 'safe' ? '#ffc63d' : good ? '#7dffb0' : '#ff3d8b';
    if (!looted && !lowFx()) glow(dx, base - 50, tw * 0.75, 14, nc, 0.22);
    ctx.fillStyle = '#0b0812';
    ctx.fillRect(dx - tw / 2, base - 57, tw, 13);
    ctx.fillStyle = nc;
    ctx.textAlign = 'center';
    ctx.fillText(b.name, dx, base - 47);
    if (b.bounty && !w.bountyDone) {
      ctx.fillStyle = '#ffc63d';
      ctx.font = '600 13px Teko, Impact, sans-serif';
      ctx.fillText('☠ BOUNTY', dx, base - 68 + Math.sin(G.t * 0.1) * 1.5);
    }
    if (b.type === 'clinic' || b.type === 'talisman') {
      // a lit shop sign: a cross for the clinic, an eye for the talisman shop
      ctx.fillStyle = b.type === 'clinic' ? '#7dffb0' : '#b98cff';
      glow(dx, base - 70, 16, 14, ctx.fillStyle, 0.45);
      if (b.type === 'clinic') {
        ctx.fillRect(dx - 2, base - 76, 4, 12);
        ctx.fillRect(dx - 6, base - 72, 12, 4);
      } else {
        ctx.beginPath();
        ctx.ellipse(dx, base - 70, 7, 4, 0, 0, 7);
        ctx.fill();
        ctx.fillStyle = '#0b0812';
        ctx.fillRect(dx - 1.5, base - 72, 3, 4);
      }
    } else if (b.type !== 'safe') {
      for (let k = 0; k < b.tier; k++) {
        ctx.fillStyle = frame;
        ctx.fillRect(dx - 8 + k * 6, base - 63, 4, 3);
      }
    }
  }
}
function drawMinimapTrader(x0, mw, y) {
  const t = traderOf(G.wd);
  if (!t) return;
  ctx.fillStyle = '#b98cff';
  ctx.fillRect(x0 + (t.x / G.wd.street.len) * mw - 2, y - 3, 4, 4);
}
function drawMinimap() {
  const w = G.wd,
    st = w.street,
    x0 = 90,
    mw = 300,
    y = H - 7;
  ctx.fillStyle = 'rgba(11,8,18,.75)';
  ctx.fillRect(x0 - 4, y - 5, mw + 8, 10);
  for (const b of st.buildings) {
    if (b.hidden && !w.found.includes(b.id)) continue;
    const mx = x0 + (b.x / st.len) * mw;
    if (b.bounty && !w.bountyDone) {
      ctx.fillStyle = '#ffc63d';
      ctx.fillRect(mx - 2.5, y - 5, 5, 2);
    }
    ctx.fillStyle =
      b.type === 'safe'
        ? '#7dffb0'
        : isShop(b)
          ? '#ffc63d'
          : w.looted.includes(b.id)
            ? '#4a4060'
            : isGood(b)
              ? '#7dffb0'
              : '#ff3d8b';
    ctx.fillRect(mx - 1.5, y - 2, 3, 4);
  }
  for (const e of G.ents)
    if (e.kind === 'cop' && e.state !== 'dead') {
      ctx.fillStyle = (G.t >> 3) % 2 ? '#45d2ff' : '#ff3d4a';
      ctx.fillRect(x0 + (e.x / st.len) * mw - 1, y + 1, 2, 2);
    }
  drawMinimapTrader(x0, mw, y);
  for (const p of alive()) {
    ctx.fillStyle = '#efe9ff';
    ctx.fillRect(x0 + (p.x / st.len) * mw - 1, y - 4, 2, 8);
  }
}
