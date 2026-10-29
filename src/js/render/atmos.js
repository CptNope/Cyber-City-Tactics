/* Cyber City Tactics · src/js/render/atmos.js
 * Atmosphere: cached glow sprites, neon halos, wet-street reflections, puddles, rain splashes, steam vents,
 * distant air traffic and interior light pools.
 * Everything soft is drawn by stretching one small pre-rendered radial sprite per colour, never by building
 * a gradient each frame: a sprite blit is far cheaper per pixel, which is what limits slow devices.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
const GLOW = {};
// '#rrggbb' + alpha -> 'rgba(...)'; anything else is returned unchanged
function hexA(c, a) {
  if (typeof c !== 'string' || c.length !== 7 || c[0] !== '#') return c;
  const n = parseInt(c.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
function glowSpr(c) {
  let s = GLOW[c];
  if (s) return s;
  s = document.createElement('canvas');
  s.width = s.height = 64;
  const g = s.getContext('2d'),
    gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, hexA(c, 1));
  gr.addColorStop(0.3, hexA(c, 0.45));
  gr.addColorStop(1, hexA(c, 0));
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return (GLOW[c] = s);
}
// soft elliptical glow centred on x,y
function glow(x, y, rx, ry, c, a) {
  if (a <= 0.004 || rx <= 0 || ry <= 0) return;
  const ga = ctx.globalAlpha;
  ctx.globalAlpha = ga * Math.min(1, a);
  ctx.drawImage(glowSpr(c), x - rx, y - ry, rx * 2, ry * 2);
  ctx.globalAlpha = ga;
}
// cheap integer hash -> 0..1, for things that must look random but stay put
const hash01 = n => {
  n = Math.imul(n ^ (n >>> 15), 0x2c1b3c6d);
  n = Math.imul(n ^ (n >>> 12), 0x297a2d39);
  return ((n ^ (n >>> 15)) >>> 0) / 4294967296;
};
// Neon signs seen this frame (screen x, width, colour, lit), reflected in the wet street afterwards
const REFL = [];
const outdoors = S => !G.dun && !S.matrix;
/* ---------- sky ---------- */
// air traffic: a few spinners crossing the skyline with head and tail lights
function drawTraffic(S, cx) {
  if (S.tunnel || S.matrix || G.dun) return;
  const n = lowFx() ? 2 : 4;
  for (let i = 0; i < n; i++) {
    const dir = i % 2 ? 1 : -1,
      sp = 0.22 + 0.1 * i,
      span = W + 240,
      x = ((((G.t * sp * dir + i * 397 - cx * 0.12) % span) + span) % span) - 120,
      y = 24 + i * 19 + Math.sin(G.t * 0.02 + i * 2) * 2;
    ctx.fillStyle = '#07050b';
    ctx.fillRect(x - 5, y - 1, 10, 3);
    glow(x + dir * 6, y, 7, 3, '#ffe9b0', 0.55);
    glow(x - dir * 6, y + 0.5, 4, 2.5, '#ff3d4a', 0.5);
    if ((G.t + i * 23) % 50 < 4) glow(x, y - 2, 4, 4, '#45d2ff', 0.8);
  }
}
// mix two '#rrggbb' colours
function mixHex(a, b, t) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== 7 || b.length !== 7) return a;
  const x = parseInt(a.slice(1), 16),
    y = parseInt(b.slice(1), 16),
    ch = s => Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}
// Per-stage gradients, built once: haze and the wet-street sheen are baked into fills the scene paints
// anyway (building faces fade into the sky colour toward their feet, the road starts with the skyline's
// glow), so the atmosphere costs no extra pixels. Gradients live in logical space, so they survive resizes.
function bgGrads(S) {
  if (S._gr && S._gr.ctx === ctx) return S._gr;
  const base = FY0 - 14,
    hz = S.matrix ? 0 : 0.42,
    lin = (y0, y1, stops) => {
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      for (const [o, c] of stops) g.addColorStop(o, c);
      return g;
    },
    wet = S.rain ? 0.32 : 0.16;
  const gr = {
    ctx,
    far: lin(base - 150, base, [
      [0, S.far],
      [0.6, S.far],
      [1, mixHex(S.far, S.sky[1], hz * 0.9)]
    ]),
    near: lin(base - 150, base, [
      [0, S.near],
      [0.62, S.near],
      [1, mixHex(S.near, S.sky[1], hz * 0.6)]
    ]),
    ground: lin(FY0, H, [
      [0, S.matrix ? S.ground[0] : mixHex(S.ground[0], S.sky[1], wet)],
      [0.3, S.ground[0]],
      [1, S.ground[1]]
    ])
  };
  try {
    Object.defineProperty(S, '_gr', { value: gr, writable: true, configurable: true, enumerable: false });
  } catch (e) {
    /* frozen stage data: just rebuild next time */
  }
  return gr;
}
/* ---------- street ---------- */
function drawWet(S, cx) {
  const lite = lowFx();
  LIGHTS.length = 0;
  if (G.dun) return drawPools(cx);
  if (!outdoors(S)) return;
  const wet = S.rain || evOn('acidrain');
  // neon signs mirrored in the street: a soft column of colour plus a few rippling highlights
  for (let i = 0; i < REFL.length; i += 4) {
    const x = REFL[i],
      w = REFL[i + 1],
      c = REFL[i + 2],
      on = REFL[i + 3];
    if (!on && lite) continue;
    glow(x, FY0 + 22, Math.max(8, w * 0.38), wet ? 28 : 16, c, (on ? 0.2 : 0.06) * (wet ? 1 : 0.6));
    if (lite || !wet) continue;
    ctx.fillStyle = c;
    for (let k = 0; k < 4; k++) {
      const wob = Math.sin(G.t * 0.06 + k * 1.7 + x * 0.1) * 3,
        len = Math.max(6, w * 0.7) * (1 - k * 0.2);
      ctx.globalAlpha = (on ? 0.3 : 0.1) * (1 - k * 0.2);
      ctx.fillRect(x - len / 2 + wob, FY0 + 6 + k * 8, len, 1);
    }
    ctx.globalAlpha = 1;
  }
  drawStreetLights(S, cx);
  if (lite) return; // light mode keeps the reflections and the lights, and drops the rest
  drawPuddles(S, cx, wet);
  drawVents(S, cx);
  if (wet && !S.tunnel) drawSplashes();
}
// puddles fixed in the world; each picks up the colour of the nearest sign above it
function drawPuddles(S, cx, wet) {
  const step = 170,
    k0 = Math.floor((cx - 60) / step);
  for (let k = k0; k * step - cx < W + 60; k++) {
    const h = hash01(k * 7919 + 13);
    if (h < (wet ? 0.35 : 0.7)) continue;
    const x = k * step + hash01(k * 31) * 80 - cx,
      y = FY0 + 18 + hash01(k * 57 + 3) * 64,
      rx = 16 + hash01(k * 91) * 20,
      ry = 2.5 + hash01(k * 13) * 2.5;
    ctx.fillStyle = hexA(S.ground[1], 0.75);
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, 7);
    ctx.fill();
    let tint = S.sky[1],
      best = 120;
    for (let i = 0; i < REFL.length; i += 4) {
      const d = Math.abs(REFL[i] - x);
      if (d < best && REFL[i + 3]) {
        best = d;
        tint = REFL[i + 2];
      }
    }
    if (best < 120) glow(x, y, rx * 0.8, ry * 0.9, tint, 0.45);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(x - rx * 0.5 + Math.sin(G.t * 0.03 + k) * 2, y - ry * 0.4, rx * 0.5, 1);
  }
}
// rain landing: a handful of short-lived rings that never touch the particle budget
function drawSplashes() {
  const n = 9,
    cyc = G.t >> 2,
    age = (G.t & 3) / 4;
  ctx.strokeStyle = evOn('acidrain') ? 'rgba(170,255,120,.5)' : 'rgba(200,215,255,.45)';
  ctx.lineWidth = 0.7;
  ctx.globalAlpha = 1 - age;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = hash01(cyc * 13 + i * 7) * W,
      y = FY0 + 6 + hash01(cyc * 17 + i * 11) * (H - FY0 - 10),
      r = 1 + age * 3;
    ctx.moveTo(x + r, y);
    ctx.ellipse(x, y, r, r * 0.35, 0, 0, 7);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}
// steam vents in the road, each breathing a slow plume
function drawVents(S, cx) {
  const step = 430,
    k0 = Math.floor((cx - 80) / step);
  for (let k = k0; k * step - cx < W + 80; k++) {
    if (hash01(k * 4099 + 5) < 0.45) continue;
    const x = k * step + 120 + hash01(k * 77) * 160 - cx,
      y = FY0 + 10 + hash01(k * 53) * 22;
    ctx.fillStyle = '#0a0810';
    ctx.fillRect(x - 9, y - 2, 18, 4);
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    for (let j = -6; j <= 6; j += 4) ctx.fillRect(x + j, y - 2, 1, 4);
    for (let j = 0; j < 6; j++) {
      const ph = ((G.t * 0.6 + j * 15 + k * 37) % 90) / 90,
        r = 6 + ph * 16;
      glow(
        x + Math.sin(ph * 5 + k + j) * 5 * ph,
        y - 4 - ph * 46,
        r,
        r * 0.85,
        '#c8bee6',
        0.22 * (1 - ph) * Math.min(1, ph * 6)
      );
    }
  }
}
/* ---------- interiors ---------- */
// light pooling on the floor under each ceiling lamp
function drawPools() {
  const T = INT[facOf(G.dun.b)];
  if (!T) return;
  for (let x = 60; x < W; x += 120) {
    const fl = Math.sin(G.t * 0.07 + x) > 0.97;
    glow(x, FY0 + 14, 56, 11, T.lamp, fl ? 0.04 : 0.16);
  }
}
/* ---------- street props that cast light ---------- */
// Fire barrels and street lamps along the back of the street, fixed in the world like the puddles. Each one
// registers in LIGHTS (screen x, ground y, colour, reach) as it draws, and after the fighters are drawn
// anyone standing near one picks up its colour on that side (litFigures).
const LIGHTS = [];
function lampColor(S) {
  if (S.market) return '#ffb36b';
  return S.tunnel ? '#7dffb0' : S.grid ? '#cfe6ff' : S.win || '#ffb36b';
}
function drawStreetLights(S, cx) {
  LIGHTS.length = 0;
  if (!outdoors(S)) return;
  // Sable's holo-sign lights whoever comes to deal
  const tr = G.world && G.wd ? traderOf(G.wd) : null;
  if (tr) {
    drawTrader(FY0 - 6);
    LIGHTS.push(tr.x + 9 - cx, FY0 + 6, '#b98cff', 60);
  }
  const step = 260,
    k0 = Math.floor((cx - 120) / step),
    lamp = lampColor(S),
    lite = lowFx();
  for (let k = k0; k * step - cx < W + 120; k++) {
    const h = hash01(k * 6151 + 29);
    if (h < 0.3) continue;
    const x = k * step + 40 + hash01(k * 37) * 150 - cx,
      y = FY0 + 5;
    if (tr && Math.abs(x + cx - tr.x) < 50) continue; // leave Sable's corner to her own sign
    // the Barrens and the Sprawl burn barrels; the corp districts and tunnels get proper lamps
    const barrel = (S.market || (!S.tunnel && !S.grid)) && h < 0.62;
    if (barrel) {
      const fl = 0.75 + 0.25 * Math.sin(G.t * 0.31 + k * 2.1) * Math.sin(G.t * 0.13 + k);
      if (!lite) glow(x, y - 4, 42, 12, '#ff6a3d', 0.22 * fl); // light pooled on the ground
      ctx.fillStyle = '#2a2026';
      ctx.fillRect(x - 6, y - 14, 12, 14);
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      ctx.fillRect(x - 6, y - 10, 12, 1);
      ctx.fillRect(x - 6, y - 5, 12, 1);
      for (let i = 0; i < 3; i++) {
        const fh = 7 + Math.sin(G.t * 0.5 + i * 2.3 + k) * 3;
        fillPoly(
          [x - 5 + i * 3.5, y - 14, x - 3 + i * 3.5, y - 14 - fh, x - 0.5 + i * 3.5, y - 14],
          i === 1 ? '#ffc63d' : '#ff6a3d'
        );
      }
      if (!lite) glow(x, y - 20, 16, 16, '#ffc63d', 0.5 * fl);
      LIGHTS.push(x, y, '#ff6a3d', 70 * fl);
    } else {
      // a lamp post: pole, head, a soft cone and a pool on the ground; one in seven flickers
      const flick = hash01(k * 101) < 0.14 && Math.sin(G.t * 0.9 + k) > 0.6 ? 0.25 : 1,
        top = y - 66;
      ctx.fillStyle = '#14101c';
      ctx.fillRect(x - 1, top, 2.5, 66);
      ctx.fillRect(x - 1, top, 10, 2);
      ctx.fillStyle = flick < 1 ? '#3a3448' : lamp;
      ctx.fillRect(x + 6, top + 2, 5, 2);
      if (!lite) glow(x + 8.5, y - 30, 16, 36, lamp, 0.12 * flick);
      glow(x + 8.5, top + 3, 8, 5, lamp, 0.8 * flick);
      if (!lite) glow(x + 8, y - 2, 46, 11, lamp, 0.24 * flick);
      LIGHTS.push(x + 8, y, lamp, 76 * flick);
    }
  }
}
// After the fighters: anyone near a light picks up its colour on the side facing it
function litFigures() {
  if (!LIGHTS.length || lowFx()) return;
  const op = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  for (const e of G.ents) {
    if (
      e.state === 'dead' ||
      e.veh ||
      e.drone ||
      (e.d && (e.d.fly || e.d.passive || e.d.dragon)) ||
      e.cloaked
    )
      continue;
    const ex = e.x - G.camX,
      sc = (e.d && e.d.scale) || e.scale || 1;
    for (let i = 0; i < LIGHTS.length; i += 4) {
      const dx = LIGHTS[i] - ex,
        d = Math.hypot(dx, (e.y - LIGHTS[i + 1]) * 0.8),
        r = LIGHTS[i + 3];
      if (d > r) continue;
      const a = (1 - d / r) * 0.5;
      glow(ex + Math.sign(dx) * 4 * sc, e.y - e.z - 22 * sc, 9 * sc, 22 * sc, LIGHTS[i + 2], a);
    }
  }
  ctx.globalCompositeOperation = op;
}
/* ---------- district weather ---------- */
// storm: rain plus lightning; rain; fog: banks rolling along the floor; sleet: fast white streaks; clear
function weatherOf(S) {
  if (G.dun || S.matrix) return 'clear';
  return S.weather || (S.rain ? 'rain' : 'clear');
}
// Lightning, drawn into the sky behind the skyline. Never under reduced motion: no flashes for anyone who
// asked for calm, and the flash itself is soft (sky only, a third of full white).
function drawLightning(S, base) {
  if (weatherOf(S) !== 'storm' || RM) return;
  const cyc = Math.floor(G.t / 470),
    lt = G.t % 470,
    x = 40 + hash01(cyc * 53 + 7) * (W - 80);
  if (lt === 40) A.noise(1.1, 0.07, 260); // the thunder, a beat after the flash
  if (!(lt < 3 || (lt > 6 && lt < 9))) return;
  ctx.fillStyle = 'rgba(220,214,255,.32)';
  ctx.fillRect(0, 0, W, base);
  ctx.strokeStyle = 'rgba(240,236,255,.9)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  let bx = x,
    by = 0;
  ctx.moveTo(bx, by);
  for (let i = 1; i < 9; i++) {
    bx += (hash01(cyc * 17 + i * 31) - 0.5) * 22;
    by = (base - 30) * (i / 8);
    ctx.lineTo(bx, by);
  }
  ctx.stroke();
}
// Fog banks drifting along the floor, in front of the fighters (they're half hidden in it)
function drawFog(S) {
  if (weatherOf(S) !== 'fog') return;
  const n = lowFx() ? 2 : 4;
  for (let i = 0; i < n; i++) {
    const sp = 0.15 + i * 0.07,
      span = W + 360,
      x = ((((G.t * sp - G.camX * 0.3 + i * 271) % span) + span) % span) - 180,
      y = FY0 + 30 + i * 18;
    glow(x, y, 170, 26, '#9fb4a8', 0.16);
  }
}
// The Undercity Market's lantern strings: paper lanterns swaying on wires across the bazaar
function drawMarketLanterns(S, base) {
  if (!S.market || G.dun) return;
  const lite = lowFx();
  for (const [yb, par, step] of [
    [base - 96, 0.55, 18],
    [base - 62, 0.8, 22]
  ]) {
    const off = G.camX * par,
      yy = lx => yb + Math.sin((lx + off) * 0.03) * 9;
    ctx.strokeStyle = 'rgba(20,10,12,.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let lx = 0; lx <= W; lx += 6) ctx.lineTo(lx, yy(lx));
    ctx.stroke();
    for (let lx = -(off % step); lx < W; lx += step) {
      const k = Math.floor((lx + off) / step),
        sway = Math.sin(G.t * 0.04 + k) * 1.5,
        c = ['#ffb36b', '#ff4a4a', '#ffc63d'][((k % 3) + 3) % 3],
        x = lx + sway,
        y = yy(lx) + 5;
      if (!lite) glow(x, y, 10, 10, c, 0.35);
      ctx.fillStyle = c;
      ctx.fillRect(x - 2.5, y - 3.5, 5, 7);
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(x - 2.5, y - 0.5, 5, 1);
    }
  }
}
