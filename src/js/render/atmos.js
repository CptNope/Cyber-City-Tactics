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
  if (lite) return; // light mode keeps the reflections and drops the rest
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
