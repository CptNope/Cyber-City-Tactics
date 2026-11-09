/* Cyber City Tactics · src/js/render/r3d.js
 * The 3D view of street fights, drawn with three.js (vendor/three.min.js): a tilted three-quarter camera over a
 * neon low-poly street. The game itself doesn't change: positions, poses and effects all come from the same
 * state the 2D renderer draws. This file owns the WebGL renderer, the camera and the frame:
 *
 *   world → 3D   game x (along the street) is X, height z is Y, and depth y (FY0 far … FY1 near) is
 *                Z = (y - FY0) * DZ, toward the camera.
 *   camera       looks down at TILT = atan(1 / DZ), so a step in depth and a step in height move a point the same
 *                distance on screen, as in 2D. It sits where one unit is one logical pixel across at the middle
 *                lane, with that lane at the same height on screen as in the 2D view. That keeps the 3D picture
 *                close to the 2D one, so the 2D game's own overlays (health bars, damage numbers, sparks,
 *                beams) are drawn on top with a small per-object transform and line up.
 *   frame        three.js draws into its own canvas, stacked under the game canvas (cleared to transparent);
 *                the overlays and the HUD are drawn on the game canvas in 2D, as before.
 *
 * Interiors, the Den, the Sprawl, driving, flying, stealth and training stay 2D, as does everything when WebGL
 * isn't available or Settings → View is Classic 2D. Loaded as a classic script: every file shares one global
 * scope, in the order listed in index.html. */
'use strict';
const DZ = 2.2, // world units per pixel of depth
  TILT = Math.atan(1 / DZ),
  R3_FOV = 26,
  R3_MIDY = 216; // the lane the camera is framed on, as in the 2D view
const R3 = {
  ok: null, // null: not tried yet; false: no WebGL (or it failed); true: ready
  on: false, // drawing in 3D this frame
  key: '', // the stage the scene was built for
  t: 0
};
const zOf = y => (y - FY0) * DZ;
/** Whether this frame is drawn in 3D: a street fight (or the title's street), WebGL works, and the player
 * hasn't picked Classic 2D. */
function r3On() {
  if (typeof prefs === 'undefined' || prefs.view === '2d' || typeof THREE === 'undefined') return false;
  if (G.stealth || (G.flight && G.flight.roof)) return false; // still 2D: the corp floor and the rooftop deck
  if (gfxTier() >= 3 && prefs.view !== '3d!') return false; // a device that can't hold even the lean 2D view
  if (!r3Ready() || (R3.soft && !R3.force)) return false;
  // a district is built and its shaders compiled off the main thread before it is shown; until then the
  // frame is drawn in 2D, so starting a stage never freezes the page
  const S = curS(),
    key = r3Key(S);
  if (R3.key === key) return true;
  if (R3.pending !== key) r3Prepare(S, key);
  return false;
}
// which place the scene was built for: a district, the Den, a Sprawl block, a room of a building
const r3Key = S =>
  (G.drive
    ? 'drive' + (G.drive.id || '')
    : G.flight
      ? 'flight' + (G.flight.id || '') + ':' + (G.flight.towers || []).length
      : G.dun
        ? 'room' + G.dun.b.id + ':' + G.dun.room + ':' + (G.wd ? G.wd.level : 0)
        : G.world && G.wd
          ? 'block' + G.wd.level + ':' + G.wd.seed
          : G.den
            ? 'den'
            : G.training
              ? 'train'
              : G.arena
                ? 'a' + G.theme
                : 's' + G.stage) +
  ':' +
  S.name +
  ':' +
  (G.challenge ? 1 : 0) +
  ':' +
  (S.len || 0);
function r3Prepare(S, key) {
  R3.pending = key;
  setTimeout(() => {
    if (R3.pending !== key || R3.ok !== true) return;
    try {
      R3.key = '';
      r3BuildWorld(S);
      r3Size();
      r3Camera(0, 0);
    } catch (e) {
      R3.ok = false; // a district that can't be built: 2D for the rest of the session
      return;
    }
    // compile the shaders a piece at a time between frames, so even a browser that compiles them on the main
    // thread never stalls for long
    const parts = [...R3.world.children, ...R3.figs.children];
    const next = () => {
      if (R3.pending !== key || R3.ok !== true) return;
      const t0 = performance.now();
      try {
        while (parts.length && performance.now() - t0 < 12) R3.r.compile(parts.shift(), R3.cam, R3.scene);
      } catch (e) {
        parts.length = 0;
      }
      if (parts.length) return setTimeout(next, 16);
      R3.key = key;
      R3.pending = null;
    };
    setTimeout(next, 16);
  }, 0);
}
function r3Ready() {
  if (R3.ok !== null) return R3.ok;
  R3.ok = false;
  try {
    const cv = document.createElement('canvas');
    if (!cv.getContext || !cv.getContext('webgl2')) return false;
    const r = new THREE.WebGLRenderer({
      canvas: cv,
      antialias: true,
      powerPreference: 'high-performance',
      outputBufferType: THREE.HalfFloatType
    });
    // WebGL drawn in software (no GPU, or a blocked one) plays far better flat: keep 2D there unless asked
    const dbg = r.getContext().getExtension('WEBGL_debug_renderer_info'),
      who = dbg ? String(r.getContext().getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    R3.soft = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(who);
    R3.gpu = who;
    r.setPixelRatio(1);
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.95;
    r.outputColorSpace = THREE.SRGBColorSpace;
    R3.r = r;
    R3.cv = cv;
    // the 3D picture is its own canvas, stacked under the (then transparent) game canvas: copying it across
    // would force a slow read-back from the GPU on any browser whose 2D canvas isn't on the GPU
    cv.id = 'game3d';
    cv.setAttribute('aria-hidden', 'true');
    cv.style.display = 'none';
    cvs.parentNode.insertBefore(cv, cvs);
    R3.scene = new THREE.Scene();
    R3.cam = new THREE.PerspectiveCamera(R3_FOV, 16 / 9, 8, 6000);
    R3.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.85, 0.55, 0.82);
    R3.bloomOn = null;
    R3.v = new THREE.Vector3();
    R3.v2 = new THREE.Vector3();
    cv.addEventListener('webglcontextlost', ev => {
      ev.preventDefault();
      R3.ok = false; // back to 2D for the rest of the session
    });
    r3InitFigs();
    R3.ok = true;
  } catch (e) {
    R3.ok = false;
  }
  return R3.ok;
}
/* ---------- sizing and the camera ---------- */
/** Show or hide the 3D canvas behind the game canvas. */
function r3Show(on) {
  R3.shown = on;
  if (!R3.cv) return;
  R3.cv.style.display = on ? 'block' : 'none';
  document.body.classList.toggle('r3', on);
}
function r3Size() {
  const w = cvs.width,
    h = cvs.height,
    st = R3.cv.style,
    l = cvs.offsetLeft + 'px',
    t = cvs.offsetTop + 'px';
  if (R3.w !== w || R3.h !== h) {
    R3.w = w;
    R3.h = h;
    R3.r.setSize(w, h, false);
  }
  // sit exactly under the game canvas
  if (st.width !== cvs.style.width) st.width = cvs.style.width;
  if (st.height !== cvs.style.height) st.height = cvs.style.height;
  if (st.left !== l) st.left = l;
  if (st.top !== t) st.top = t;
  const bloom = gfxTier() < 2 && !prefs.contrast;
  if (bloom !== R3.bloomOn) {
    R3.bloomOn = bloom;
    R3.r.setEffects(bloom ? [R3.bloom] : null);
  }
}
// Where the camera stands this frame: framed on the middle lane under the view's centre, shaken with the 2D
// screen shake, pushed in a little for boss intros and cutscenes
function r3Camera(shx, shy) {
  const cam = R3.cam,
    tx = G.camX + W / 2 + shx,
    tz = zOf(R3_MIDY),
    d = VH / (2 * Math.tan((R3_FOV * Math.PI) / 360)),
    push = typeof introK === 'function' && !RM ? 1 + 0.07 * (introK() || 0) : 1;
  cam.aspect = W / VH;
  cam.position.set(tx, d * Math.sin(TILT), tz + d * Math.cos(TILT));
  cam.lookAt(tx, 0, tz);
  cam.zoom = push;
  // the middle lane sits BAND + 216 down the view, not at its centre: shift the frustum, not the camera,
  // so the picture keeps its angle
  cam.setViewOffset(W, VH, 0, -(BAND + R3_MIDY - VH / 2) + shy, W, VH);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  R3.k = Math.cos(TILT); // how much shorter heights look than in 2D
}
/** Screen position (logical pixels) of a world point, and how many pixels one unit across is there. */
function r3Proj(x, z, y, out) {
  const v = R3.v.set(x, z, zOf(y)).project(R3.cam);
  out.x = ((v.x + 1) / 2) * W;
  out.y = ((1 - v.y) / 2) * VH;
  const u = R3.v2.set(x + 10, z, zOf(y)).project(R3.cam);
  out.s = (((u.x + 1) / 2) * W - out.x) / 10;
  out.behind = v.z > 1;
  return out;
}
const R3P = { x: 0, y: 0, s: 1 };
// Point the 2D context at a ground spot: anything a 2D drawer puts at (x - camX, y - z) lands over the 3D
// object standing at (x, y, z), at the right size for its distance
function r3Affine(x, y) {
  const p = r3Proj(x, 0, y, R3P),
    s = p.s,
    k = R3.k;
  ctx.setTransform(
    SCALE * s,
    0,
    0,
    SCALE * s * k,
    SCALE * (p.x - s * (x - G.camX)),
    SCALE * (p.y - s * k * y)
  );
  return !p.behind;
}
/* ---------- the frame ---------- */
function r3Render(shx, shy) {
  r3Size();
  const S = curS();
  R3.t = G.t;
  r3Camera(shx, shy);
  r3UpdateWorld(S);
  r3UpdateFigs();
  R3.r.render(R3.scene, R3.cam);
  // the game canvas above it starts each frame clear, then takes the overlays and the HUD
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cvs.width, cvs.height);
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  r3Overlays();
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
}
// The 2D game's overlays, drawn over the 3D picture: each at its own object's spot and scale
const R3ONE = [];
function r3Overlays() {
  const cl = e => e.cloaked && e.state !== 'dead',
    base = FY0 - 14;
  // doors, name signs and markers on the Sprawl's buildings and the Den's shops, each on its own 3D facade
  if (G.world && !G.dun && G.wd)
    for (const b of G.wd.street.buildings)
      if (Math.abs(b.x - G.camX - W / 2) < W && r3Affine(b.x, base)) drawBuilding(b, base);
  if (G.den) for (const n of NPCS) if (n.front && r3Affine(n.x, base)) drawStorefronts(base, n);
  if (G.world && G.wd && !G.dun) {
    const tr = traderOf(G.wd);
    if (tr && r3Affine(tr.x, FY0 - 6)) drawTrader(FY0 - 6);
  }
  for (const T of G.totems || []) if (r3Affine(T.x, T.y)) drawTotem(T);
  // a driving job's lane lines and finish gantry; a flight's searchlights and flak
  if (G.drive && r3Affine(G.camX + W / 2, R3_MIDY)) drawRoad();
  if (G.flight && !G.flight.roof && r3Affine(G.camX + W / 2, FL.base)) drawTowers();
  if (G.hazard && r3Affine(G.camX + W / 2, R3_MIDY)) drawHazard();
  for (const k of G.picks) if (r3Affine(k.x, k.y)) drawPick(k);
  for (const p of G.projs) if (r3Affine(p.x, p.y)) drawProj(p);
  for (const o of G.props) if (!R3_PROPS[o.kind] && r3Affine(o.x, o.y)) drawProp(o.kind, o.x - G.camX, o.y);
  for (const e of G.ents) {
    if (fogAlpha(e) <= 0 || !r3Affine(e.x, e.y)) continue;
    if (cl(e)) continue;
    if (e.team === 1 && (e.dazeUntil > G.t || reeling(e)) && dazed(e)) drawDaze(e);
    if (e.state === 'held' && e.heldBy) drawStruggle(e);
    if (e.team === 1 && e.curseT > G.t && e.state !== 'dead') drawCurse(e);
    if (e.kind === 'player' && marked(e)) drawMark(e);
    if (e.team === 1 && e.healT > 0 && e.state !== 'dead') drawHealing(e);
    if (e.air && (e.gun || e.big) && e.hp > 0 && e.hp < e.maxHp) {
      const bw = e.big ? 60 : 30,
        sx = e.x - G.camX,
        sy = e.y - e.z;
      ctx.fillStyle = 'rgba(11,8,18,.8)';
      ctx.fillRect(sx - bw / 2, sy - 30, bw, 3);
      ctx.fillStyle = '#ff3d4a';
      ctx.fillRect(sx - bw / 2, sy - 30, (bw * e.hp) / e.maxHp, 3);
    }
    if (e.team === 1 && !e.air) drawFoeBar(e);
    else if (e.kind === 'ally') drawAllyBar(e);
    if (e.kind === 'player') r3PlayerMarks(e);
  }
  // effects, one at a time at their own spot
  const fx = G.fx;
  G.fx = R3ONE;
  try {
    for (const f of fx) {
      R3ONE[0] = f;
      if (r3Affine(f.x, f.y)) drawFx();
    }
  } finally {
    G.fx = fx;
    R3ONE.length = 0;
  }
  // beams, breath and the rest span the screen: one transform for the middle lane is close enough
  r3Affine(G.camX + W / 2, R3_MIDY);
  drawBeams();
  for (const e of G.ents) if (e.d && e.d.dragon && e.br) drawBreath(e);
  drawCompare();
  drawRevive();
  ctx.globalAlpha = 1;
  for (const t of G.texts) {
    const p = r3Proj(t.x, t.z, t.y, R3P);
    if (p.behind) continue;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.globalAlpha = Math.min(1, t.life / 12);
    txt(t.s, p.x, p.y, t.big ? 22 : t.sm ? 12 : 16, t.c, 'center');
  }
  ctx.globalAlpha = 1;
}
// the bits of a runner the 2D figure draws around it: barrier bubble, charge ring, super ready, co-op marker
function r3PlayerMarks(e) {
  if (e.state === 'dead') return;
  const sx = e.x - G.camX,
    sy = e.y - e.z,
    sc = (e.d && e.d.scale) || 1;
  if (e.shield > 0) {
    ctx.strokeStyle = `rgba(69,210,255,${0.35 + 0.2 * Math.sin(G.t * 0.3)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(sx, sy - 22, 14, 26, 0, 0, 7);
    ctx.stroke();
  }
  if ((e.chargeT || 0) > 12) {
    const k = Math.min(1, (e.chargeT - 12) / 20);
    ctx.strokeStyle = e.chargeT >= 32 ? '#ff3d8b' : 'rgba(255,61,139,.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(sx, e.y, 8 + k * 8, 3 + k * 3, 0, 0, 7);
    ctx.stroke();
  }
  if ((e.sp || 0) >= 100 && (G.t >> 3) % 2) txt('★', sx, sy - 64 * sc, 10, '#ffc63d', 'center');
  if (G.coop) fillPoly([sx - 3, sy - 60 * sc, sx + 3, sy - 60 * sc, sx, sy - 56 * sc], e.pal.acc);
}
