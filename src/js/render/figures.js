/* Cyber City Tactics · src/js/render/figures.js
 * Drawing every character, drone, spirit, prop, projectile, pickup and effect. All vector, no sprites.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ================= drawing ================= */
function fillPoly(pts, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  ctx.fill();
}
// rim: an optional light edge stroked under the limb, so dark trousers still read against a dark street
function limb(a, b, c, col, w, rim) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.lineTo(c[0], c[1]);
  if (rim) {
    ctx.strokeStyle = rim;
    ctx.lineWidth = w + 1.8;
    ctx.stroke();
  }
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.stroke();
}
const RIM = 'rgba(190,178,235,.32)';
function joint(a, c, bend) {
  const mx = (a[0] + c[0]) / 2,
    my = (a[1] + c[1]) / 2;
  const dx = c[0] - a[0],
    dy = c[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  return [mx - (dy / L) * bend, my + (dx / L) * bend];
}
// Pose easing: limbs glide toward each new key pose instead of snapping to it. Rates are per logic step, so
// motion looks the same at any refresh rate; strikes use a fast rate so hits stay snappy, everything else a
// softer one, which gives wind-ups their anticipation and recoveries their follow-through.
function easePose(e, tgt, r) {
  let p = e._pose;
  const dt = G.t - (e._poseT === undefined ? -99 : e._poseT);
  e._poseT = G.t;
  if (!p || dt > 12 || dt < 0 || RM) {
    e._pose = tgt.slice();
    return e._pose;
  }
  if (dt === 0) return p; // several renders inside one logic step (high-refresh screens): hold
  const k = 1 - Math.pow(1 - r, dt);
  for (let i = 0; i < 15; i++) p[i] += (tgt[i] - p[i]) * k;
  return p;
}
// Squash and stretch, anchored at the feet: landings flatten, take-offs stretch, hits compress, strikes lunge
function squash(e, st, t, swing) {
  let sx = 1,
    sy = 1;
  const land = G.t - (e.landAt === undefined ? -99 : e.landAt);
  if (land >= 0 && land < 8 && e.z === 0) {
    const s = 1 - land / 8;
    sx += 0.15 * s;
    sy -= 0.17 * s;
  } else if (e.z > 0 && e.vz > 1.2) {
    sx = 0.94;
    sy = 1.07;
  } else if (st === 'hurt' && t < 8) {
    const s = 1 - t / 8;
    sx -= 0.1 * s;
    sy += 0.05 * s;
  } else if (st === 'heavy' && t < 8) {
    sx = 1.05;
    sy = 0.95;
  } else if (swing) {
    sx = 1.06;
    sy = 0.97;
  }
  return [sx, sy];
}
function shadow(x, y, w) {
  ctx.fillStyle = 'rgba(0,0,0,.33)';
  ctx.beginPath();
  ctx.ellipse(x, y, w, w * 0.3, 0, 0, 7);
  ctx.fill();
}
function drawDrone(e) {
  const sx = e.x - G.camX,
    sy = e.y - e.z;
  shadow(sx, e.y, 10);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(e.face, 1);
  if (e.state === 'dead') ctx.rotate(e.t * 0.2);
  const blink = e.flash > 0 && e.flash % 2;
  ctx.strokeStyle = '#5d6680';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-12, -6);
  ctx.lineTo(12, -6);
  ctx.stroke();
  const rw = 8 + Math.sin(G.t * 1.3) * 6;
  ctx.strokeStyle = 'rgba(200,220,255,.55)';
  ctx.beginPath();
  ctx.moveTo(-12 - rw / 2, -8);
  ctx.lineTo(-12 + rw / 2, -8);
  ctx.moveTo(12 - rw / 2, -8);
  ctx.lineTo(12 + rw / 2, -8);
  ctx.stroke();
  fillPoly([-10, -4, 10, -4, 13, 2, 6, 7, -8, 7, -11, 2], blink ? '#ffffff' : '#39405a');
  fillPoly([-10, -4, 10, -4, 8, -1, -8, -1], '#5d6680');
  ctx.fillStyle = e.state === 'aim' && e.t % 6 < 3 ? '#ffffff' : '#ff3d4a';
  ctx.beginPath();
  ctx.arc(7, 2, 2.2, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#22263a';
  ctx.fillRect(2, 6, 9, 2);
  ctx.restore();
}
// Ssareth: a long-necked wyrm in violet-black scale with a burning throat, lantern-gold eyes and great wings
function drawDragon(e) {
  const sc = e.d.scale,
    sx = e.x - G.camX,
    sy = e.y - e.z,
    st = e.state,
    air = e.ph === 'air' || e.ph === 'takeoff' || e.ph === 'dive';
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(sx, e.y, 34 * sc * (air ? 0.7 : 1), 6 * sc * (air ? 0.7 : 1), 0, 0, 7);
  ctx.fill();
  if (e.inv > 0 && (G.t >> 2) % 2) return;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(e.face * sc, sc);
  if (st === 'dead') {
    ctx.globalAlpha = Math.max(0, 1 - e.t / 70);
    ctx.rotate(Math.min(0.4, e.t * 0.01));
  }
  const fl = e.flash > 0 && e.flash % 2,
    scale1 = fl ? '#ffffff' : '#2a1236',
    scale2 = fl ? '#eeeeee' : '#1a0b24',
    belly = fl ? '#ffffff' : '#7a5a1a',
    flap = air ? Math.sin(G.t * 0.22) : Math.sin(G.t * 0.04) * 0.25,
    breath = st === 'breath' || (e.br && e.br.t > 0),
    swipe = st === 'swipe' && e.t >= 12 && e.t <= 22,
    walk = st === 'walk' ? Math.sin(e.walk * 0.15) : 0,
    lift = Math.round(flap * 10);
  // far wing
  fillPoly([-4, -30, -30, -52 - lift * 1.4, -46, -38 - lift, -38, -30, -24, -26], scale2);
  // tail
  const tw = Math.sin(G.t * 0.07) * 4 + (st === 'tail' && e.t > 16 && e.t < 30 ? -10 : 0);
  fillPoly(
    [-14, -18, -34, -14 + tw * 0.4, -52, -8 + tw, -58, -10 + tw, -36, -20 + tw * 0.4, -14, -25],
    scale1
  );
  fillPoly([-56, -9 + tw, -62, -16 + tw, -60, -6 + tw], '#ffc63d');
  // legs
  ctx.strokeStyle = scale2;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  if (!air) {
    for (const [hx, ph] of [
      [-10, 0],
      [8, Math.PI]
    ]) {
      const sw = walk ? Math.sin(e.walk * 0.15 + ph) * 3 : 0;
      ctx.beginPath();
      ctx.moveTo(hx, -16);
      ctx.lineTo(hx + 2 + sw * 0.5, -8);
      ctx.lineTo(hx + sw, 0);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(-8, -16);
    ctx.lineTo(-12, -8);
    ctx.moveTo(8, -16);
    ctx.lineTo(4, -8);
    ctx.stroke();
  }
  // body
  fillPoly([-18, -30, 6, -34, 18, -26, 16, -16, -16, -14, -22, -22], scale1);
  fillPoly([-14, -16, 14, -17, 12, -13, -12, -12], belly);
  for (let k = 0; k < 5; k++)
    fillPoly([-14 + k * 6, -33 + (k % 2), -11 + k * 6, -38, -8 + k * 6, -33], scale2);
  // neck and head, rearing back to breathe, lunging forward to claw
  const hx = breath ? 26 : swipe ? 34 : 28,
    hy = breath ? -52 : swipe ? -34 : -46;
  fillPoly([10, -30, 18, -34, hx - 2, hy + 4, hx - 6, hy + 10, 12, -24], scale1);
  fillPoly([hx - 6, hy - 4, hx + 8, hy - 2, hx + 14, hy + 3, hx + 6, hy + 7, hx - 6, hy + 6], scale1);
  fillPoly([hx - 4, hy - 4, hx - 9, hy - 12, hx, hy - 5], scale2);
  fillPoly([hx + 1, hy - 3, hx - 2, hy - 11, hx + 5, hy - 3], scale2);
  ctx.fillStyle = '#ffc63d';
  ctx.fillRect(hx + 3, hy - 1, 3, 1.6);
  if (breath) {
    ctx.fillStyle = `rgba(255,106,61,${0.6 + 0.4 * Math.sin(G.t * 0.6)})`;
    ctx.beginPath();
    ctx.arc(hx + 14, hy + 4, 3 + Math.sin(G.t * 0.5), 0, 7);
    ctx.fill();
  }
  // claws
  if (swipe) {
    ctx.strokeStyle = '#efe9ff';
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(30 + k * 4, -30);
      ctx.lineTo(44 + k * 4, -8);
      ctx.stroke();
    }
  }
  // near wing
  fillPoly([2, -32, -8, -64 - lift * 2, -34, -54 - lift * 1.4, -24, -40, -10, -30], fl ? '#fff' : '#3a1a4a');
  ctx.strokeStyle = fl ? '#fff' : '#5a2a6a';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-8, -64 - lift * 2);
  ctx.lineTo(-14, -34);
  ctx.moveTo(-8, -64 - lift * 2);
  ctx.lineTo(-24, -42);
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}
// Mech walker: a plated cockpit on two reverse-jointed legs, gun forward, a glowing vent on its back
function drawMech(e) {
  const sc = e.d.scale * (e.mini ? 0.7 : 1),
    sx = e.x - G.camX,
    sy = e.y - e.z,
    st = e.state;
  shadow(sx, e.y, 20 * sc);
  if (st === 'dead' && e.t > 40 && (G.t >> 2) % 2) return;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(e.face * sc, sc);
  if (st === 'dead') ctx.rotate(Math.min(0.5, e.t * 0.02));
  const fl = e.flash > 0 && e.flash % 2,
    plate = fl ? '#ffffff' : '#3a4560',
    plate2 = fl ? '#e8e8e8' : '#26304a',
    ph = e.walk * 0.18,
    stomp = st === 'slam' && e.t < 24 ? -Math.min(6, e.t * 0.5) : 0,
    turning = (e.turnT || 0) > 0;
  ctx.strokeStyle = plate2;
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  for (const [hx, a] of [
    [-6, 0],
    [6, Math.PI]
  ]) {
    const sw = st === 'walk' ? Math.sin(ph + a) * 5 : 0,
      lift = st === 'walk' ? Math.max(0, Math.sin(ph + a)) * 3 : 0;
    ctx.beginPath();
    ctx.moveTo(hx, -24 + stomp);
    ctx.lineTo(hx + 6 + sw * 0.4, -13 - lift);
    ctx.lineTo(hx + sw, -lift);
    ctx.stroke();
    ctx.fillStyle = plate2;
    ctx.fillRect(hx + sw - 4, -2 - lift, 8, 2.5);
  }
  // hull
  fillPoly(
    [-15, -44 + stomp, 13, -44 + stomp, 17, -34 + stomp, 13, -23 + stomp, -15, -23 + stomp, -17, -32 + stomp],
    plate
  );
  fillPoly([-15, -44 + stomp, 13, -44 + stomp, 11, -41 + stomp, -13, -41 + stomp], plate2);
  // cockpit visor and gun
  ctx.fillStyle = st === 'aim' && (e.t >> 1) % 2 ? '#ffffff' : '#ff3d4a';
  ctx.fillRect(6, -38 + stomp, 8, 3);
  ctx.fillStyle = plate2;
  ctx.fillRect(10, -30 + stomp, 14, 3.4);
  ctx.fillStyle = '#16141f';
  ctx.fillRect(22, -29.5 + stomp, 3, 2.4);
  // the weak spot: a vent on the back that glows hotter while it turns
  const glow = 0.55 + 0.35 * Math.sin(G.t * 0.2) + (turning ? 0.3 : 0);
  ctx.fillStyle = `rgba(255,198,61,${Math.min(1, glow)})`;
  ctx.fillRect(-16, -40 + stomp, 3, 12);
  ctx.fillStyle = `rgba(255,106,61,${Math.min(0.5, glow * 0.4)})`;
  ctx.fillRect(-20, -42 + stomp, 4, 16);
  ctx.restore();
}
// Hellhound: a low, four-legged figure with a burning mane and tail
function drawHound(e) {
  const sc = e.mini ? 0.75 : 1,
    sx = e.x - G.camX,
    sy = e.y - e.z,
    st = e.state,
    lying = st === 'down' || st === 'dead';
  shadow(sx, e.y, 13 * sc);
  if (e.inv > 0 && !lying && (G.t >> 2) % 2) return;
  if (st === 'dead' && e.t > 40 && (G.t >> 2) % 2) return;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(e.face * sc, sc);
  if (lying) {
    ctx.translate(0, -2);
    ctx.rotate(e.z > 0 ? -0.6 : Math.PI * 0.08);
  }
  const fl = e.flash > 0 && e.flash % 2,
    body = fl ? '#ffffff' : '#2a1a1e',
    body2 = fl ? '#e8e8e8' : '#3d2328',
    run = st === 'walk' || st === 'lunge',
    ph = e.walk * 0.35,
    leap = st === 'lunge' && e.z > 0;
  // legs: two pairs, swinging opposite each other
  ctx.strokeStyle = body;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  const leg = (hx, a) => {
    const sw = leap ? (hx > 0 ? 6 : -6) : run ? Math.sin(ph + a) * 5 : 0;
    ctx.beginPath();
    ctx.moveTo(hx, -11);
    ctx.lineTo(hx + sw * 0.5, -5);
    ctx.lineTo(hx + sw, 0);
    ctx.stroke();
  };
  leg(-9, 0);
  leg(8, Math.PI);
  ctx.strokeStyle = body2;
  leg(-6, Math.PI);
  leg(11, 0);
  // tail of fire
  const tw = Math.sin(G.t * 0.4 + e.x) * 2;
  fillPoly([-12, -15, -22, -20 + tw, -19, -14, -24, -12 - tw, -12, -11], fl ? '#fff' : '#ff6a3d');
  // body and chest
  fillPoly([-13, -16, 6, -18, 13, -15, 12, -9, -11, -9], body);
  fillPoly([-6, -18, 6, -18, 10, -16, -4, -15], body2);
  // head and snout
  const hb = run ? Math.sin(ph * 2) * 0.8 : 0;
  fillPoly([10, -21 + hb, 17, -20 + hb, 21, -17 + hb, 20, -14 + hb, 12, -13 + hb, 9, -16 + hb], body);
  fillPoly([11, -21 + hb, 13, -26 + hb, 15, -21 + hb], body2);
  // burning mane and eye
  if (!fl)
    for (let i = 0; i < 4; i++) {
      const fx = 3 + i * 2.5,
        fh = 4 + Math.sin(G.t * 0.5 + i * 1.7) * 2;
      fillPoly([fx - 2, -18, fx, -18 - fh, fx + 2, -18], i % 2 ? '#ffc63d' : '#ff6a3d');
    }
  ctx.fillStyle = st === 'windup' || st === 'lunge' ? '#fff3c4' : '#ffc63d';
  ctx.fillRect(16, -19 + hb, 2, 1.6);
  if (st === 'windup' || leap) {
    ctx.fillStyle = '#e9f6ff';
    ctx.fillRect(18, -15 + hb, 3, 1.2);
  }
  ctx.restore();
}
function drawSpirit(e) {
  const sx = e.x - G.camX,
    sy = e.y - e.z;
  ctx.fillStyle = 'rgba(255,106,61,.18)';
  ctx.beginPath();
  ctx.ellipse(sx, e.y, 12, 3.5, 0, 0, 7);
  ctx.fill();
  const fl = e.flash > 0 && e.flash % 2,
    a = e.state === 'dead' ? Math.max(0, 1 - e.t / 20) : 1;
  ctx.globalAlpha = a;
  for (let i = 0; i < 5; i++) {
    const ph = G.t * 0.25 + i * 1.3,
      r = 9 - i * 1.4,
      ox = Math.sin(ph) * 2,
      oy = -i * 4 - Math.abs(Math.cos(ph)) * 2;
    ctx.fillStyle = fl ? '#fff' : (e.d.flames || ['#ff3d1a', '#ff6a3d', '#ff9a3d', '#ffc63d', '#fff1b0'])[i];
    ctx.beginPath();
    ctx.arc(sx + ox, sy + oy, Math.max(1.5, r), 0, 7);
    ctx.fill();
  }
  ctx.fillStyle = '#2a0a04';
  ctx.fillRect(sx - 4 + e.face * 2, sy - 8, 2, 2.4);
  ctx.fillRect(sx + 1 + e.face * 2, sy - 8, 2, 2.4);
  ctx.globalAlpha = 1;
}
function drawProp(kind, sx, sy) {
  if (kind === 'can') {
    ctx.fillStyle = '#5d6680';
    ctx.fillRect(sx - 6, sy - 14, 12, 14);
    ctx.fillStyle = '#8a93a6';
    ctx.beginPath();
    ctx.ellipse(sx, sy - 14, 6, 2, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(sx - 6, sy - 9, 12, 1);
    ctx.fillRect(sx - 6, sy - 5, 12, 1);
  }
  if (kind === 'crate') {
    ctx.fillStyle = '#7a5a34';
    ctx.fillRect(sx - 8, sy - 14, 16, 14);
    ctx.strokeStyle = '#a07a4a';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(sx - 7.5, sy - 13.5, 15, 13);
    ctx.beginPath();
    ctx.moveTo(sx - 7, sy - 13);
    ctx.lineTo(sx + 7, sy - 1);
    ctx.stroke();
  }
  if (kind === 'drum') {
    ctx.fillStyle = '#b8322e';
    ctx.fillRect(sx - 6, sy - 16, 12, 16);
    ctx.fillStyle = '#ffc63d';
    ctx.fillRect(sx - 6, sy - 10, 12, 3);
    ctx.fillStyle = '#e05a4a';
    ctx.beginPath();
    ctx.ellipse(sx, sy - 16, 6, 2, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#1a0a0a';
    ctx.font = '600 7px Teko, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', sx, sy - 7.5);
  }
}
function drawPassive(e) {
  const sx = e.x - G.camX,
    sy = e.y,
    fl = e.flash > 0 && e.flash % 2;
  if (e.state === 'dead') {
    ctx.globalAlpha = Math.max(0, 1 - e.t / 40);
  }
  shadow(sx, e.y, 13);
  if (e.kind === 'hostage') {
    // a civilian sitting zip-tied on the floor, or standing up and waving once freed
    const c = e.pal || { skin: '#c98a6b', coat: '#6b6280' },
      up = e.freed,
      bob = up ? Math.sin(G.t * 0.3) * 2 : Math.sin(G.t * 0.08) * 0.6;
    ctx.fillStyle = fl ? '#fff' : '#22202c';
    ctx.fillRect(sx - 6, sy - (up ? 16 : 6), 5, up ? 16 : 6);
    ctx.fillRect(sx + 1, sy - (up ? 16 : 6), 5, up ? 16 : 6);
    ctx.fillStyle = fl ? '#fff' : c.coat;
    ctx.fillRect(sx - 7, sy - (up ? 34 : 22) + bob * 0.3, 14, 18);
    ctx.fillStyle = fl ? '#fff' : c.skin;
    ctx.beginPath();
    ctx.arc(sx, sy - (up ? 39 : 27) + bob * 0.3, 5, 0, 7);
    ctx.fill();
    if (up) {
      ctx.fillRect(sx + 6, sy - 44 + bob, 3, 12);
    } else {
      ctx.fillStyle = '#ffc63d';
      ctx.fillRect(sx - 8, sy - 14, 16, 2);
      ctx.fillStyle = '#efe9ff';
      ctx.fillRect(sx - 4, sy - 28, 8, 2);
    }
    if (!up && e.state !== 'dead') {
      ctx.fillStyle = '#7dffb0';
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(G.t * 0.15);
      fillPoly([sx - 4, sy - 46, sx + 4, sy - 46, sx, sy - 40], '#7dffb0');
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = 1;
    return;
  }
  if (e.kind === 'vend') {
    ctx.fillStyle = fl ? '#fff' : '#2b2440';
    ctx.fillRect(sx - 11, sy - 40, 22, 40);
    ctx.fillStyle = fl ? '#fff' : '#45d2ff';
    ctx.globalAlpha *= 0.8;
    ctx.fillRect(sx - 8, sy - 36, 12, 20);
    ctx.globalAlpha = e.state === 'dead' ? Math.max(0, 1 - e.t / 40) : 1;
    ctx.fillStyle = '#ff3d8b';
    for (let i = 0; i < 3; i++) ctx.fillRect(sx + 6, sy - 34 + i * 6, 3, 3);
    ctx.fillStyle = '#0b0812';
    ctx.fillRect(sx - 8, sy - 12, 16, 6);
    ctx.strokeStyle = '#ffc63d';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx - 10.5, sy - 39.5, 21, 39);
  }
  if (e.kind === 'chest' && e.vault && !e.vaultDone) {
    // a heavy vault door with a lock light that pulses until it's hacked
    ctx.fillStyle = fl ? '#fff' : '#2a2e3e';
    ctx.fillRect(sx - 14, sy - 30, 28, 30);
    ctx.strokeStyle = '#ffc63d';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx - 14.5, sy - 30.5, 29, 30);
    ctx.beginPath();
    ctx.arc(sx, sy - 15, 7, 0, 7);
    ctx.stroke();
    ctx.fillStyle = (G.t >> 4) % 2 ? '#ff3d4a' : '#ffc63d';
    ctx.fillRect(sx + 9, sy - 27, 3, 3);
    ctx.globalAlpha = 1;
    return;
  }
  if (e.kind === 'chest') {
    const tc = G.dun ? ['#efe9ff', '#efe9ff', '#45d2ff', '#ffc63d'][G.dun.b.tier] : '#ffc63d';
    ctx.fillStyle = fl ? '#fff' : '#2a2238';
    ctx.fillRect(sx - 12, sy - 16, 24, 16);
    ctx.fillStyle = fl ? '#fff' : '#3a3050';
    ctx.fillRect(sx - 13, sy - 20, 26, 6);
    ctx.strokeStyle = tc;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(sx - 12.5, sy - 19.5, 25, 19);
    ctx.fillStyle = tc;
    ctx.fillRect(sx - 2, sy - 14, 4, 5);
    ctx.globalAlpha = (0.2 + 0.15 * Math.sin(G.t * 0.15)) * (e.state === 'dead' ? 0 : 1);
    ctx.beginPath();
    ctx.arc(sx, sy - 10, 18, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (e.kind === 'node') {
    const h = 34 + Math.sin(G.t * 0.1 + e.x) * 2;
    fillPoly(
      [sx, sy - h, sx + 9, sy - h * 0.55, sx + 6, sy, sx - 6, sy, sx - 9, sy - h * 0.55],
      fl ? '#fff' : '#0b2a3a'
    );
    ctx.strokeStyle = '#45d2ff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sx, sy - h);
    ctx.lineTo(sx + 9, sy - h * 0.55);
    ctx.lineTo(sx + 6, sy);
    ctx.lineTo(sx - 6, sy);
    ctx.lineTo(sx - 9, sy - h * 0.55);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = `rgba(69,210,255,${0.4 + 0.3 * Math.sin(G.t * 0.2 + e.x)})`;
    ctx.beginPath();
    ctx.arc(sx, sy - h * 0.55, 4, 0, 7);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function drawIce(e) {
  const sx = e.x - G.camX,
    sy = e.y - e.z,
    s = (e.d.scale || 1) * (e.kind === 'blackice' ? 11 : 7),
    fl = e.flash > 0 && e.flash % 2,
    rot = G.t * 0.05 + e.x * 0.01;
  shadow(sx, e.y, s * 1.2);
  if (e.state === 'dead') {
    ctx.globalAlpha = Math.max(0, 1 - e.t / 30);
  }
  const pts = [];
  for (let i = 0; i < 4; i++) {
    const a = rot + (i * Math.PI) / 2;
    pts.push(sx + Math.cos(a) * s, sy + Math.sin(a) * s * 0.55 - s * 0.2);
  }
  fillPoly(
    [sx, sy - s * 1.4, ...pts.slice(0, 4), sx, sy + s * 0.9, ...pts.slice(4)],
    fl ? '#fff' : e.kind === 'blackice' ? '#05070c' : '#082233'
  );
  ctx.strokeStyle = e.enraged ? '#ff3d8b' : '#45d2ff';
  ctx.lineWidth = e.kind === 'blackice' ? 1.6 : 1.1;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const px = pts[i * 2],
      py = pts[i * 2 + 1];
    ctx.moveTo(sx, sy - s * 1.4);
    ctx.lineTo(px, py);
    ctx.lineTo(sx, sy + s * 0.9);
  }
  ctx.stroke();
  ctx.fillStyle = e.kind === 'blackice' ? '#ff3d4a' : e.state === 'aim' && e.t % 6 < 3 ? '#fff' : '#45d2ff';
  ctx.beginPath();
  ctx.arc(sx, sy - s * 0.2, e.kind === 'blackice' ? 4 : 2.2, 0, 7);
  ctx.fill();
  ctx.globalAlpha = 1;
}
function drawBeams() {
  for (const e of G.ents) {
    if (e.kind !== 'blackice' || e.state !== 'beam') continue;
    for (const by of e.beamYs) {
      const y = by - 22,
        firing = e.t >= 45 && e.t < 57;
      if (!firing) {
        ctx.strokeStyle = `rgba(255,61,74,${0.35 + 0.35 * ((e.t >> 2) % 2)})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = 'rgba(69,210,255,.25)';
        ctx.fillRect(0, y - 7, W, 14);
        ctx.fillStyle = '#e6fbff';
        ctx.fillRect(0, y - 2, W, 4);
      }
    }
  }
}
function drawFig(e) {
  if (e.d && e.d.passive) return drawPassive(e);
  if (e.d && e.d.ice) return drawIce(e);
  if (e.d && e.d.spirit) return drawSpirit(e);
  if (e.d && e.d.fly) return drawDrone(e);
  if (e.d && e.d.quad) return drawHound(e);
  if (e.d && e.d.mech) return drawMech(e);
  if (e.d && e.d.dragon) return drawDragon(e);
  const sc = ((e.d && e.d.scale) || e.scale || 1) * (e.mini ? 0.7 : 1),
    pal = e.pal,
    sx = e.x - G.camX + (e.kind === 'glitch' && G.t % 23 < 2 ? rand(-3, 3) : 0),
    sy = e.y - e.z;
  shadow(sx, e.y, (e.state === 'down' || e.state === 'dead') && e.z === 0 ? 20 * sc : 11 * sc);
  if (e.inv > 0 && e.state !== 'down' && e.state !== 'roll' && (G.t >> 2) % 2) return;
  if (e.state === 'dead' && e.t > 40 && (G.t >> 2) % 2) return;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(e.face * sc, sc);
  const st = e.state,
    t = e.t,
    lying = st === 'down' || st === 'dead';
  if (lying) {
    if (e.z > 0) ctx.rotate(-Math.min(1.5, t * 0.12));
    else {
      ctx.translate(-6, -4);
      ctx.rotate(-Math.PI / 2);
    }
  }
  if (st === 'roll') {
    ctx.translate(0, -12);
    ctx.rotate((t / 22) * Math.PI * 2);
    ctx.translate(0, 12);
  }
  if (st === 'grabbed') {
    ctx.rotate(0.15);
  }
  const fl = e.flash > 0 && e.flash % 2;
  const skin = fl ? '#ffffff' : pal.skin,
    coat = fl ? '#ffffff' : pal.coat,
    coat2 = fl ? '#e8e8e8' : pal.coat2,
    pants = fl ? '#ffffff' : pal.pants;
  const ws = Math.sin(e.walk * 0.2),
    wc = Math.cos(e.walk * 0.2);
  let hip = [0, -20],
    sh = [0, -35],
    lean = 0;
  let ff = [3, 0],
    bf = [-3, 0],
    fh = [7, -25],
    bh = [-5, -24],
    fkb = 4,
    bkb = 4,
    gun = false,
    glow = 0,
    staff = false,
    swing = false;
  const breath = Math.sin(G.t * 0.07 + e.x) * 0.6;
  const style = e.kind === 'player' ? 'runner' : e.d ? e.d.style : e.style;
  if (style === 'ghoul') lean = 4;
  if (st === 'heavy') {
    const a = t >= 8 && t <= 14;
    fh = a ? [24, -30] : [-10, -40];
    bh = a ? [14, -28] : [-12, -34];
    lean = a ? 6 : -5;
    ff = [9, 0];
    bf = [-8, 0];
    swing = a;
  }
  if (st === 'dance') {
    fh = [22, -28];
    bh = [-12, -30];
    lean = 7;
    ff = [12, -2];
    bf = [-12, -4];
    swing = true;
  }
  if (st === 'slam') {
    const a = e.t >= 22;
    fh = a ? [16, -6] : [4, -52];
    bh = a ? [10, -4] : [-4, -52];
    lean = a ? 8 : -4;
    ff = [8, 0];
    bf = [-7, 0];
  }
  if (st === 'idle' || st === 'blink' || st === 'summon') {
    sh = [0, -35 + breath];
    fh = [8, -27 + breath];
    bh = [-4, -25 + breath];
    ff = [5, 0];
    bf = [-4, 0];
    if (st === 'summon') {
      fh = [6, -48];
      bh = [-6, -48];
      glow = Math.min(1, t / 16);
    }
  }
  if (st === 'walk' || st === 'charge') {
    const k = st === 'charge' ? 1.5 : 1;
    ff = [ws * 7 * k, -Math.max(0, wc) * 3];
    bf = [-ws * 7 * k, -Math.max(0, -wc) * 3];
    fh = [-ws * 6 + 4, -24];
    bh = [ws * 6 - 2, -24];
    if (st === 'charge') {
      lean = 5;
      fh = [14, -30];
    }
  }
  if (st === 'punch') {
    const a = t >= 3 && t <= 8;
    fh = a ? [19, -33] : [6, -31];
    bh = [2, -28];
    lean = a ? 3 : 0;
    ff = [7, 0];
    bf = [-6, 0];
    swing = a;
  }
  if (st === 'upper') {
    const a = t >= 5 && t <= 11;
    fh = a ? [13, -49] : [4, -26];
    lean = a ? 2 : -1;
    ff = [6, 0];
    bf = [-6, 0];
    hip = [0, -19];
    swing = a;
  }
  if (st === 'kick') {
    const a = t >= 6 && t <= 12;
    ff = a ? [23, -22] : [8, -10];
    fkb = a ? -3 : 6;
    lean = a ? -4 : -1;
    bf = [-3, 0];
    fh = [3, -30];
    bh = [-9, -29];
  }
  if (st === 'jump' || st === 'roll' || st === 'lunge') {
    ff = [7, -8];
    bf = [-5, -10];
    fkb = 6;
    bkb = 6;
    fh = [8, -36];
    bh = [-8, -34];
    if (st === 'lunge') {
      fh = [18, -30];
      bh = [14, -34];
      lean = 6;
    }
  }
  if (st === 'jkick') {
    ff = [21, -12];
    bf = [-6, -12];
    fkb = 0;
    bkb = 7;
    fh = [2, -31];
    bh = [-9, -36];
    lean = -3;
  }
  if (st === 'shoot') {
    fh = [19, -32];
    bh = [10, -30];
    gun = true;
    ff = [6, 0];
    bf = [-6, 0];
    lean = t < 5 ? -2 : 0;
  }
  if (st === 'cast') {
    fh = [16, -31];
    bh = [12, -27];
    glow = Math.min(1, t / 10);
    ff = [6, 0];
    bf = [-6, 0];
    lean = -1;
  }
  if (st === 'hurt' || st === 'grabbed') {
    lean = -6;
    fh = [2, -38];
    bh = [-10, -36];
  }
  if (st === 'grab') {
    fh = [13, -30];
    bh = [11, -33];
    ff = [6, 0];
    bf = [-6, 0];
    if (e.kneeT > 0) {
      ff = [10, -18];
      fkb = -4;
    }
  }
  if (st === 'lift' || e.holding) {
    fh = [3, -47];
    bh = [-3, -47];
  }
  if (st === 'throw') {
    const a = t >= 3;
    fh = a ? [16, -38] : [-4, -46];
    bh = a ? [12, -36] : [-8, -44];
    lean = a ? 4 : -3;
    ff = [7, 0];
    bf = [-6, 0];
  }
  if (st === 'windup') {
    const a = t >= 14;
    fh = a ? [20, -31] : [-7, -38];
    lean = a ? 4 : -3;
    ff = [7, 0];
    bf = [-6, 0];
    if (e.kind === 'blade') {
      fh = a ? [24, -28] : [-6, -42];
    }
  }
  if (st === 'aim') {
    if (e.d.ranged === 'bullet') {
      fh = [19, -32];
      bh = [10, -30];
      gun = true;
    } else {
      fh = [16, -33];
      bh = [12, -28];
      glow = Math.min(1, t / 14);
      staff = true;
    }
    ff = [6, 0];
    bf = [-6, 0];
  }
  // a little bounce in the stride
  if (st === 'walk' || st === 'charge') {
    const bob = Math.abs(wc) * 1.3;
    hip = [hip[0], hip[1] - bob];
    sh = [sh[0], sh[1] - bob];
  }
  const fast = swing || (st === 'kick' && t >= 6 && t <= 12) || st === 'jkick' || st === 'shoot';
  const P = easePose(
    e,
    [hip[0], hip[1], sh[0], sh[1], ff[0], ff[1], bf[0], bf[1], fh[0], fh[1], bh[0], bh[1], fkb, bkb, lean],
    fast ? 0.72 : st === 'walk' || st === 'charge' ? 0.6 : 0.42
  );
  hip = [P[0], P[1]];
  sh = [P[2], P[3]];
  ff = [P[4], P[5]];
  bf = [P[6], P[7]];
  fh = [P[8], P[9]];
  bh = [P[10], P[11]];
  fkb = P[12];
  bkb = P[13];
  lean = P[14];
  if (!lying && st !== 'roll') {
    const q = squash(e, st, t, swing);
    if (q[0] !== 1 || q[1] !== 1) ctx.scale(q[0], q[1]);
  }
  sh = [sh[0] + lean, sh[1]];
  const shF = [sh[0] + 2, sh[1] + 1],
    shB = [sh[0] - 2, sh[1] + 1];
  const isP = e.kind === 'player';
  limb(shB, joint(shB, bh, -3), bh, coat2, 4);
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(bh[0], bh[1], 2, 0, 7);
  ctx.fill();
  limb([hip[0] - 2, hip[1]], joint([hip[0] - 2, hip[1]], bf, bkb), bf, pants, 4.6, fl ? null : RIM);
  ctx.fillStyle = pal.boot;
  ctx.fillRect(bf[0] - 3, bf[1] - 2.5, 7, 3);
  const armorCol =
    isP && e.eq.armor && e.eq.armor.rar
      ? ['', e.idx ? '#6a2f80' : '#1d3f63', '#4a3a18'][e.eq.armor.rar]
      : null;
  const cTop = fl ? '#fff' : armorCol || coat;
  if (style === 'runner' || style === 'mage' || style === 'doc' || style === 'beard') {
    const sw = (st === 'walk' ? ws * 2 : 0) - lean * 0.5;
    fillPoly(
      [
        sh[0] - 6,
        sh[1],
        sh[0] + 6,
        sh[1],
        hip[0] + 7,
        hip[1] + 2,
        hip[0] + 5 + sw,
        hip[1] + 13,
        hip[0] - 9 + sw,
        hip[1] + 12
      ],
      coat2
    );
  }
  fillPoly(
    [sh[0] - 6.5, sh[1] - 1, sh[0] + 6.5, sh[1] - 1, hip[0] + 6, hip[1] + 2, hip[0] - 6, hip[1] + 2],
    cTop
  );
  if (style === 'runner') {
    ctx.strokeStyle = pal.acc;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sh[0] + 3, sh[1]);
    ctx.lineTo(hip[0] + 2, hip[1] + 2);
    ctx.stroke();
    if (e.eq.armor && e.eq.armor.arm >= 6) {
      ctx.fillStyle = 'rgba(255,255,255,.15)';
      ctx.fillRect(sh[0] - 5, sh[1] + 2, 10, 8);
    }
  }
  if (style === 'helmet' || style === 'riot') {
    ctx.fillStyle = pal.acc;
    ctx.fillRect(sh[0] - 5, sh[1] + 4, 10, 2);
  }
  if (style === 'blade') {
    ctx.fillStyle = pal.acc;
    ctx.fillRect(sh[0] - 6, sh[1] + 8, 12, 1.5);
  }
  if (style === 'apron') {
    ctx.fillStyle = fl ? '#fff' : '#3a2f2a';
    ctx.fillRect(sh[0] - 5, sh[1] + 6, 10, 16);
  }
  if (style === 'ghoul') {
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sh[0] - 5, sh[1] + 4);
    ctx.lineTo(sh[0] + 4, sh[1] + 9);
    ctx.moveTo(sh[0] - 4, sh[1] + 9);
    ctx.lineTo(sh[0] + 5, sh[1] + 13);
    ctx.stroke();
  }
  limb([hip[0] + 2, hip[1]], joint([hip[0] + 2, hip[1]], ff, fkb), ff, pants, 4.6, fl ? null : RIM);
  ctx.fillStyle = pal.boot;
  ctx.fillRect(ff[0] - 3, ff[1] - 2.5, 7.5, 3);
  const hd = [sh[0] + 1, sh[1] - 7.5];
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(hd[0], hd[1], 5.6, 0, 7);
  ctx.fill();
  ctx.fillStyle = fl ? '#fff' : pal.hair;
  const eye = c => {
    ctx.fillStyle = c || '#1b1520';
    ctx.fillRect(hd[0] + 2.5, hd[1] - 1.5, 2, 1.6);
  };
  if (style === 'runner') {
    if (e.idx === 1) {
      fillPoly(
        [
          hd[0] - 6,
          hd[1] + 2,
          hd[0] - 5,
          hd[1] - 6,
          hd[0] + 3,
          hd[1] - 7,
          hd[0] + 6,
          hd[1] - 3,
          hd[0] + 1,
          hd[1] - 4,
          hd[0] - 3,
          hd[1] - 2,
          hd[0] - 9,
          hd[1] + 6
        ],
        fl ? '#fff' : pal.hair
      );
    } else
      fillPoly(
        [
          hd[0] - 6,
          hd[1] - 1,
          hd[0] - 4,
          hd[1] - 7,
          hd[0] + 1,
          hd[1] - 6.5,
          hd[0] + 5,
          hd[1] - 5,
          hd[0] + 3,
          hd[1] - 3,
          hd[0] - 2,
          hd[1] - 3,
          hd[0] - 5,
          hd[1] + 3
        ],
        fl ? '#fff' : pal.hair
      );
    ctx.fillStyle = pal.acc;
    ctx.fillRect(hd[0] - 1, hd[1] - 1.5, 7, 2.4);
    ctx.globalAlpha = 0.35;
    ctx.fillRect(hd[0] + 5, hd[1] - 1.5, 4, 2.4);
    ctx.globalAlpha = 1;
  } else if (style === 'mohawk') {
    fillPoly([hd[0] - 5, hd[1] - 3, hd[0] - 1, hd[1] - 12, hd[0] + 3, hd[1] - 5], pal.hair);
    eye();
  } else if (style === 'tusks') {
    ctx.beginPath();
    ctx.arc(hd[0] - 1, hd[1] - 2, 5.4, Math.PI, 0);
    ctx.fill();
    fillPoly([hd[0] + 3, hd[1] + 3, hd[0] + 5, hd[1] - 0.5, hd[0] + 5.5, hd[1] + 3.5], pal.acc);
    eye();
  }
  if (style === 'helmet' || style === 'riot') {
    ctx.fillStyle = fl ? '#fff' : coat;
    ctx.beginPath();
    ctx.arc(hd[0], hd[1] - 0.5, 6.4, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
    ctx.fillStyle = e.kind === 'cop' ? ((G.t >> 3) % 2 ? '#ff3d4a' : '#45d2ff') : pal.acc;
    ctx.fillRect(hd[0] + 0.5, hd[1] - 1.8, 6.5, 2.6);
  } else if (style === 'feathers') {
    ctx.fillStyle = pal.acc;
    ctx.fillRect(hd[0] - 6, hd[1] - 3.5, 12, 1.6);
    fillPoly([hd[0] - 5, hd[1] - 3, hd[0] - 9, hd[1] - 11, hd[0] - 6, hd[1] - 3.5], '#ece4c6');
    fillPoly([hd[0] - 3, hd[1] - 3, hd[0] - 5, hd[1] - 12, hd[0] - 2, hd[1] - 3.5], '#ff6a3d');
    eye();
  } else if (style === 'horns') {
    ctx.strokeStyle = pal.hair;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(hd[0] - 2, hd[1] - 4);
    ctx.quadraticCurveTo(hd[0] - 8, hd[1] - 9, hd[0] - 4, hd[1] - 13);
    ctx.moveTo(hd[0] + 2, hd[1] - 4);
    ctx.quadraticCurveTo(hd[0] + 7, hd[1] - 8, hd[0] + 5, hd[1] - 12);
    ctx.stroke();
    eye(pal.acc);
  } else if (style === 'blade') {
    fillPoly(
      [
        hd[0] - 6,
        hd[1],
        hd[0] - 4,
        hd[1] - 6.5,
        hd[0] + 5,
        hd[1] - 6,
        hd[0] + 5,
        hd[1] - 3,
        hd[0] - 1,
        hd[1] - 3,
        hd[0] - 8,
        hd[1] + 8
      ],
      pal.hair
    );
    ctx.fillStyle = pal.acc;
    ctx.fillRect(hd[0] + 2, hd[1] - 1.4, 4, 1.6);
  } else if (style === 'mage') {
    ctx.beginPath();
    ctx.arc(hd[0] - 1, hd[1] - 1.5, 5.8, Math.PI * 0.9, Math.PI * 2);
    ctx.fill();
    eye(pal.acc);
  } else if (style === 'ghoul') {
    eye('#ff4a4a');
    ctx.fillRect(hd[0] - 0.5, hd[1] - 1.5, 2, 1.6);
    if (e.d && e.d.crown) {
      fillPoly(
        [
          hd[0] - 5,
          hd[1] - 5,
          hd[0] - 4,
          hd[1] - 11,
          hd[0] - 1,
          hd[1] - 6,
          hd[0] + 1,
          hd[1] - 12,
          hd[0] + 3,
          hd[1] - 6,
          hd[0] + 5,
          hd[1] - 11,
          hd[0] + 5,
          hd[1] - 5
        ],
        '#c9a24a'
      );
    }
  } else if (style === 'bob') {
    fillPoly(
      [
        hd[0] - 7,
        hd[1] + 4,
        hd[0] - 6,
        hd[1] - 5,
        hd[0] - 1,
        hd[1] - 7.5,
        hd[0] + 5,
        hd[1] - 5,
        hd[0] + 6,
        hd[1] - 2,
        hd[0] + 1,
        hd[1] - 3,
        hd[0] - 2,
        hd[1] + 4
      ],
      pal.hair
    );
    ctx.fillStyle = pal.acc;
    ctx.fillRect(hd[0] - 6, hd[1] - 2, 1.6, 6);
    eye();
  } else if (style === 'doc') {
    ctx.beginPath();
    ctx.arc(hd[0] - 1, hd[1] - 2, 5.4, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#1b1520';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(hd[0] + 1.5, hd[1] - 2.2, 3.5, 2.6);
  } else if (style === 'beard') {
    fillPoly([hd[0] - 2, hd[1] + 1, hd[0] + 5, hd[1] + 1, hd[0] + 1, hd[1] + 9], pal.hair);
    eye();
  } else if (style === 'cap') {
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    ctx.arc(hd[0], hd[1] - 2, 5.8, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(hd[0], hd[1] - 3, 8, 1.8);
    eye();
  } else if (style === 'apron') {
    eye();
  } else if (style === 'glitch') {
    ctx.strokeStyle = '#45d2ff';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(hd[0], hd[1], 5.8, 0, 7);
    ctx.stroke();
    ctx.fillStyle = '#45d2ff';
    ctx.fillRect(hd[0] + 1, hd[1] - 1.5, 5, 1.4);
  }
  const cyb = isP && e.cy.arm > 0;
  const armCol =
    style === 'runner' ? (fl ? '#fff' : cyb ? pal.cyber : cTop) : style === 'blade' ? '#c9d2e6' : coat;
  limb(shF, joint(shF, fh, -3), fh, armCol, 4.2);
  ctx.fillStyle = cyb ? '#c9f4ff' : skin;
  ctx.beginPath();
  ctx.arc(fh[0], fh[1], 2.3, 0, 7);
  ctx.fill();
  if (style === 'riot' && st !== 'grabbed') {
    ctx.fillStyle = fl ? '#fff' : 'rgba(159,180,216,.55)';
    ctx.fillRect(fh[0] + 1, sh[1] - 2, 4, 30);
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.fillRect(fh[0] + 2, sh[1], 1, 26);
  }
  if (isP && e.eq.weapon && !gun && !e.holding && st !== 'cast' && st !== 'grab' && st !== 'roll') {
    const w = e.eq.weapon,
      L = { pipe: 9, baton: 9, blade: 15, whip: 18, knucks: 2, axe: 11, hammer: 11 }[w.look] || 9,
      ang = swing ? -0.15 : -1.1;
    ctx.strokeStyle =
      w.mod && AFX_COL[w.mod] && (G.t >> 3) % 3 === 0
        ? AFX_COL[w.mod]
        : {
            pipe: '#8a8f9c',
            baton: '#45d2ff',
            blade: '#e9f6ff',
            whip: '#ff3d8b',
            knucks: '#ffc63d',
            axe: '#8a6a52',
            hammer: '#6b6280'
          }[w.look] || '#8a8f9c';
    ctx.lineWidth = w.look === 'whip' ? 0.8 : 1.6;
    ctx.beginPath();
    ctx.moveTo(fh[0], fh[1]);
    ctx.lineTo(fh[0] + Math.cos(ang) * L, fh[1] + Math.sin(ang) * L);
    ctx.stroke();
    const tx = fh[0] + Math.cos(ang) * L,
      ty = fh[1] + Math.sin(ang) * L;
    if (w.look === 'hammer') {
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(ang);
      ctx.fillStyle = '#3a3150';
      ctx.fillRect(-2, -4.5, 6, 9);
      ctx.fillStyle = '#b98cff';
      ctx.globalAlpha *= 0.8;
      ctx.fillRect(3, -4.5, 1.4, 9);
      ctx.restore();
    }
    if (w.look === 'axe') {
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(ang);
      fillPoly([-3, 0, 1, -1, 3, 6, -3, 4], '#d6dbe6');
      ctx.restore();
    }
    if (w.look === 'knucks') {
      ctx.fillStyle = '#ffc63d';
      ctx.fillRect(fh[0] - 1, fh[1] - 2.5, 3.5, 5);
    }
  }
  if (gun) {
    const big = isP && e.eq.gun && e.eq.gun.fire !== 'single';
    ctx.fillStyle = '#14121a';
    ctx.fillRect(fh[0], fh[1] - 2.5, big ? 13 : 9, 3.2);
    ctx.fillRect(fh[0] + 1, fh[1], 2.4, 3.5);
    if (
      (st === 'shoot' && (t < 4 || (big && e.eq.gun.fire === 'burst' && t % 4 < 2))) ||
      (st === 'aim' && t >= 20 && t < 25)
    )
      fillPoly(
        [
          fh[0] + (big ? 13 : 9),
          fh[1] - 3,
          fh[0] + (big ? 20 : 16),
          fh[1] - 1,
          fh[0] + (big ? 13 : 9),
          fh[1] + 1
        ],
        '#ffe28a'
      );
  }
  if (style === 'blade') {
    ctx.strokeStyle = fl ? '#fff' : '#e9f6ff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(fh[0], fh[1]);
    ctx.lineTo(fh[0] + 12, fh[1] - (st === 'windup' && t < 14 ? 8 : -2));
    ctx.stroke();
  }
  if (staff) {
    ctx.strokeStyle = '#8a5a3a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(fh[0] - 3, fh[1] + 14);
    ctx.lineTo(fh[0] + 2, fh[1] - 12);
    ctx.stroke();
  }
  if (glow > 0) {
    let gc = e.team ? '69,210,255' : '255,106,61';
    if (e.kind === 'saint') gc = '255,74,74';
    if (e.kind === 'avatar') gc = '185,140,255';
    if (isP) {
      const id = e.spells[e.spell];
      gc =
        id === 'bolt' || id === 'chain'
          ? '185,140,255'
          : id === 'heal'
            ? '125,255,176'
            : id === 'barrier'
              ? '69,210,255'
              : gc;
    }
    const r = 3 + glow * 5 + Math.sin(G.t * 0.6);
    ctx.fillStyle = `rgba(${gc},${0.25 * glow})`;
    ctx.beginPath();
    ctx.arc(fh[0] + 4, fh[1], r * 1.8, 0, 7);
    ctx.fill();
    ctx.fillStyle = `rgba(${gc},${0.9 * glow})`;
    ctx.beginPath();
    ctx.arc(fh[0] + 4, fh[1], r * 0.7, 0, 7);
    ctx.fill();
  }
  ctx.restore();
  if (isP && e.shield > 0 && e.state !== 'dead') {
    ctx.strokeStyle = `rgba(69,210,255,${0.35 + 0.2 * Math.sin(G.t * 0.3)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(sx, sy - 22, 14, 26, 0, 0, 7);
    ctx.stroke();
  }
  if (isP && (e.chargeT || 0) > 12 && e.state !== 'dead') {
    const k = Math.min(1, (e.chargeT - 12) / 20);
    ctx.strokeStyle = e.chargeT >= 32 ? '#ff3d8b' : 'rgba(255,61,139,.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(sx, e.y, 8 + k * 8, 3 + k * 3, 0, 0, 7);
    ctx.stroke();
  }
  if (isP && (e.sp || 0) >= 100 && e.state !== 'dead' && (G.t >> 3) % 2) {
    ctx.fillStyle = '#ffc63d';
    ctx.font = '600 10px Teko, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', sx, sy - 64 * sc);
  }
  if (e.holding) drawProp(e.holding.kind, sx, sy - 48 * sc + (st === 'lift' ? Math.max(0, 10 - t) * 3 : 0));
  if (isP && G.coop && e.state !== 'dead') {
    ctx.fillStyle = e.pal.acc;
    fillPoly([sx - 3, sy - 60 * sc, sx + 3, sy - 60 * sc, sx, sy - 56 * sc], e.pal.acc);
  }
}
function drawProj(pr) {
  const sx = pr.x - G.camX,
    sy = pr.y - pr.z;
  shadow(sx, pr.y, pr.k === 'bullet' ? 3 : 6);
  if (pr.k === 'laser') {
    ctx.strokeStyle = '#45d2ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - Math.sign(pr.vx) * 14, sy);
    ctx.stroke();
    glow(sx, sy, 8, 4, '#45d2ff', 0.6);
    return;
  }
  if (pr.k === 'nade') {
    ctx.fillStyle = '#2a2e1a';
    ctx.beginPath();
    ctx.arc(sx, sy, 3.2, 0, 7);
    ctx.fill();
    ctx.fillStyle = (G.t >> 2) % 2 ? '#ff3d4a' : '#ffc63d';
    ctx.fillRect(sx - 1, sy - 4, 2, 2);
    return;
  }
  if (pr.k === 'bullet') {
    ctx.strokeStyle = pr.rail ? '#45d2ff' : pr.seek ? '#7dffb0' : '#ffe28a';
    ctx.lineWidth = pr.rail ? 2.4 : 1.6;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - Math.sign(pr.vx) * (pr.rail ? 22 : 9), sy);
    ctx.stroke();
    glow(sx, sy, pr.rail ? 9 : 5, pr.rail ? 5 : 3, ctx.strokeStyle, 0.6);
  } else if (pr.k === 'wave') {
    ctx.fillStyle = 'rgba(255,106,61,.25)';
    ctx.beginPath();
    ctx.ellipse(sx, pr.y, 14, 24, 0, 0, 7);
    ctx.fill();
    for (let i = -3; i <= 3; i++) {
      const h = 8 + Math.sin(G.t * 0.8 + i) * 3 - Math.abs(i);
      fillPoly(
        [sx - 4, pr.y + i * 7, sx, pr.y + i * 7 - h, sx + 4, pr.y + i * 7],
        i % 2 ? '#ff6a3d' : '#ffc63d'
      );
    }
  } else if (pr.k === 'prop') {
    ctx.save();
    ctx.translate(sx, sy + 7);
    ctx.rotate(G.t * 0.4 * Math.sign(pr.vx));
    drawProp(pr.kind, 0, 7);
    ctx.restore();
  } else {
    const c =
      pr.k === 'fire' || pr.tint === 'fire'
        ? ['255,106,61', '#ffe7a8', '#ff6a3d']
        : pr.tint === 'drain'
          ? ['122,40,90', '#ffb0d8', '#c0407e']
          : pr.tint === 'chi'
            ? ['255,198,61', '#fff3c4', '#ffc63d']
            : pr.k === 'bolt' || pr.tint === 'bolt'
              ? ['185,140,255', '#f2e9ff', '#b98cff']
              : ['69,210,255', '#e6fbff', '#45d2ff'];
    const r = pr.r + Math.sin(G.t * 0.5);
    // the orb lights the floor beneath it and leaves a fading comet tail
    glow(sx, pr.y, r * 3.2, r * 1.1, c[2], 0.35);
    if (!lowFx())
      for (let i = 3; i >= 1; i--) {
        ctx.fillStyle = `rgba(${c[0]},${0.32 - i * 0.08})`;
        ctx.beginPath();
        ctx.arc(sx - pr.vx * i * 1.6, sy - (pr.vz || 0) * i * -1.6, r * (1 - i * 0.18), 0, 7);
        ctx.fill();
      }
    glow(sx, sy, r * 2.6, r * 2.6, c[2], 0.55);
    ctx.fillStyle = `rgba(${c[0]},.85)`;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, 7);
    ctx.fill();
    ctx.fillStyle = c[1];
    ctx.beginPath();
    ctx.arc(sx + Math.sign(pr.vx) * 1.5, sy, r * 0.45, 0, 7);
    ctx.fill();
  }
}
function drawPick(k) {
  const sx = k.x - G.camX,
    bob = Math.sin((G.t + k.x) * 0.12) * 1.5,
    sy = k.y - 6 + bob;
  if (k.t > 1000 && k.k !== 'gear' && k.k !== 'chip' && (G.t >> 2) % 2) return;
  shadow(sx, k.y, 5);
  if (k.k === 'cred') {
    fillPoly([sx - 6, sy - 2, sx + 6, sy - 4, sx + 6, sy, sx - 6, sy + 2], '#ffc63d');
    ctx.fillStyle = '#7a5a10';
    ctx.fillRect(sx + 2, sy - 3, 2, 3);
  }
  if (k.k === 'med') {
    ctx.fillStyle = '#efe9ff';
    ctx.fillRect(sx - 5, sy - 5, 10, 8);
    ctx.fillStyle = '#ff3d8b';
    ctx.fillRect(sx - 1, sy - 4, 2, 6);
    ctx.fillRect(sx - 3.5, sy - 2, 7, 2);
  }
  if (k.k === 'ammo') {
    ctx.fillStyle = '#3a3344';
    ctx.fillRect(sx - 4, sy - 6, 8, 9);
    ctx.fillStyle = '#ffe28a';
    ctx.fillRect(sx - 2.5, sy - 8, 1.6, 3);
    ctx.fillRect(sx + 0.8, sy - 8, 1.6, 3);
  }
  if (k.k === 'mana') {
    ctx.fillStyle = 'rgba(69,210,255,.3)';
    ctx.beginPath();
    ctx.arc(sx, sy - 1, 6, 0, 7);
    ctx.fill();
    fillPoly([sx, sy - 7, sx + 4, sy - 1, sx, sy + 4, sx - 4, sy - 1], '#45d2ff');
  }
  if (k.k === 'icebrk') {
    ctx.fillStyle = '#082233';
    ctx.fillRect(sx - 5, sy - 6, 10, 8);
    ctx.strokeStyle = '#45d2ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx - 4.5, sy - 5.5, 9, 7);
    ctx.fillStyle = '#45d2ff';
    ctx.fillRect(sx - 3, sy - 4, 2, 4);
    ctx.fillRect(sx + 1, sy - 4, 2, 4);
  }
  if (k.k === 'chip') {
    ctx.fillStyle = '#0f2a1c';
    ctx.fillRect(sx - 5, sy - 6, 10, 8);
    ctx.strokeStyle = '#7dffb0';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx - 4.5, sy - 5.5, 9, 7);
    ctx.fillStyle = '#7dffb0';
    ctx.fillRect(sx - 2, sy - 3, 4, 3);
  }
  if (k.k === 'shard') {
    const b = Math.sin(G.t * 0.12) * 2;
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#45d2ff';
    ctx.beginPath();
    ctx.arc(sx, sy - 4 + b, 9, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
    fillPoly([sx, sy - 11 + b, sx + 4, sy - 4 + b, sx, sy + 3 + b, sx - 4, sy - 4 + b], '#9fe9ff');
  }
  if (k.k === 'gear') {
    const c = RCOL[k.item.rar];
    ctx.globalAlpha = 0.25 + 0.15 * Math.sin(G.t * 0.15);
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(sx, sy - 2, 10, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#2a2238';
    ctx.fillRect(sx - 6, sy - 7, 12, 9);
    ctx.strokeStyle = c;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(sx - 5.5, sy - 6.5, 11, 8);
    ctx.fillStyle = c;
    ctx.fillRect(sx - 1, sy - 6, 2, 7);
  }
}
function drawFx() {
  for (const f of G.fx) {
    const sx = f.x - G.camX,
      sy = f.y - f.z,
      k = f.life / f.max;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = f.c;
    if (f.k === 'star') {
      // impact flash: a hot core for the first few frames, then just the spokes
      if (k > 0.45) {
        glow(sx, sy, f.r * 1.3, f.r * 1.3, f.c, (k - 0.45) * 1.4);
        glow(sx, sy, f.r * 0.45, f.r * 0.45, '#ffffff', (k - 0.45) * 1.8);
      }
      ctx.strokeStyle = f.c;
      ctx.globalAlpha = k;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const r = f.r * (1.2 - k * 0.6);
      for (let i = 0; i < 6; i++) {
        const a = f.rot + (i * Math.PI) / 3;
        ctx.moveTo(sx + Math.cos(a) * r * 0.35, sy + Math.sin(a) * r * 0.35);
        ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
      }
      ctx.stroke();
    }
    if (f.k === 'zap') {
      ctx.globalAlpha = k;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let zx = sx,
        zy = -10;
      ctx.moveTo(zx, zy);
      while (zy < sy) {
        zy += 12;
        zx = sx + rand(-6, 6);
        ctx.lineTo(zx, Math.min(zy, sy));
      }
      ctx.stroke();
      ctx.fillStyle = f.c;
      ctx.beginPath();
      ctx.arc(sx, sy, 6 * k + 2, 0, 7);
      ctx.fill();
      glow(sx, sy, 26 * k + 6, 12 * k + 4, f.c, k * 0.8);
    }
    if (f.k === 'boom') {
      // fireball: a white-hot core, a swelling orange ball, then smoke that rises and thins
      const p = 1 - k,
        r = f.r;
      glow(sx, sy - p * 10, r * (1.1 + p * 0.7), r * (0.95 + p * 0.6), '#ff6a3d', k * 1.2);
      glow(sx, sy - p * 6, r * (0.7 + p * 0.4), r * (0.6 + p * 0.35), '#ffc63d', k * k * 1.4);
      if (k > 0.6) glow(sx, sy, r * 0.35, r * 0.3, '#ffffff', (k - 0.6) * 2.5);
      if (!lowFx() && p > 0.25)
        for (let i = 0; i < 4; i++) {
          const a = f.rot + i * 1.57,
            d = r * 0.35 * p;
          glow(
            sx + Math.cos(a) * d,
            sy - p * 34 - i * 4 + Math.sin(a) * d * 0.4,
            r * 0.4 * (0.6 + p),
            r * 0.35 * (0.6 + p),
            '#2a2236',
            (1 - p) * 0.9
          );
        }
    }
    if (f.k === 'ring') {
      ctx.globalAlpha = k * 0.9;
      ctx.lineWidth = 2 * k + 0.5;
      ctx.beginPath();
      ctx.ellipse(sx, sy, f.r * (1 - k * 0.7), f.r * (1 - k * 0.7) * 0.45, 0, 0, 7);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}
