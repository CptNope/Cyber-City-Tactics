/* Cyber City Tactics · src/js/render/r3world.js
 * The 3D street, built once per stage from its colours and signs (STAGES in data/content.js): wet asphalt and a
 * kerb, three rows of buildings whose windows and shopfronts are lit in the shader (one draw call per row), neon
 * signs that flicker and pour their colour onto the wet road, street lamps, a skyline in the fog, rain, and
 * each district's own touches (tunnel arches and rails, market lanterns, the Arcology's floor grid, the
 * Host's wireframe towers). Lights move with the camera: a few lamps and signs nearest the fight light it.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
const R3_LAMP_GAP = 260;
function r3Hex(c, k) {
  const v = new THREE.Color(c);
  if (k) v.multiplyScalar(k);
  return v;
}
// Lit windows and shopfronts, worked out per pixel from the world position, so one box can be any building
function r3Facade(opts) {
  const m = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.82,
    metalness: 0.1,
    envMapIntensity: 0.4
  });
  const U = {
    uCell: { value: new THREE.Vector2(opts.cw, opts.ch) },
    uWinCol: { value: r3Hex(opts.win, opts.glow) },
    uShopCol: { value: r3Hex(opts.shop || opts.win, 1.1) },
    uAlt: { value: r3Hex(opts.alt || opts.win, opts.glow) },
    uDensity: { value: opts.density },
    uShop: { value: opts.shop ? 1 : 0 },
    uEra: { value: 0 },
    uWire: { value: opts.wire ? 1 : 0 },
    uYOff: { value: opts.yoff || 0 }
  };
  m.userData.U = U;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vON;')
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vec4 wq = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
        wq = instanceMatrix * wq;
        #endif
        vWP = (modelMatrix * wq).xyz; vON = objectNormal;`
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWP; varying vec3 vON;
        uniform vec2 uCell; uniform vec3 uWinCol; uniform vec3 uShopCol; uniform float uDensity;
        uniform float uShop; uniform float uEra; uniform float uWire; uniform vec3 uAlt; uniform float uYOff;
        float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        if (abs(vON.y) < 0.5) {
          vec2 p = abs(vON.z) > 0.5 ? vec2(vWP.x, vWP.y - uYOff) : vec2(vWP.z, vWP.y - uYOff);
          vec2 c = floor(p / uCell), f = fract(p / uCell);
          float win = step(0.22, f.x) * step(f.x, 0.78) * step(0.25, f.y) * step(f.y, 0.75);
          float shopTop = 30.0 * uShop;
          float up = step(shopTop + 4.0, p.y);
          float on = win * up * step(1.0 - uDensity, h21(c)) * step(0.06, h21(c * 1.37 + uEra));
          totalEmissiveRadiance += mix(uWinCol, uAlt, step(0.84, h21(c * 5.3))) * on * (0.35 + 0.9 * h21(c * 3.1));
          diffuseColor.rgb *= 1.0 - win * up * 0.45;
          if (uShop > 0.5 && abs(vON.z) > 0.5 && p.y < shopTop) {
            // a lit shopfront under each building: glass with mullions, a dark door now and then
            float bay = floor(vWP.x / 18.0), fx = fract(vWP.x / 18.0);
            float glass = step(5.0, p.y) * step(p.y, 25.0) * step(0.06, fx) * step(fx, 0.94);
            float door = step(0.82, h21(vec2(bay, 7.0)));
            float lit = step(0.45, h21(vec2(bay, 3.0)));
            vec3 tint = mix(uShopCol, uAlt, step(0.6, h21(vec2(bay, 9.0))));
            totalEmissiveRadiance += tint * glass * (1.0 - door) * lit * (0.22 + 0.1 * sin(vWP.x * 0.31));
            diffuseColor.rgb *= 1.0 - glass * 0.6;
            // the awning line
            float aw = step(26.0, p.y) * step(p.y, 29.0);
            totalEmissiveRadiance += tint * aw * 0.25;
          }
          if (uWire > 0.5) {
            // the Host: every edge of a cell glows
            float e = max(step(0.94, f.x) + step(f.x, 0.06), step(0.94, f.y) + step(f.y, 0.06));
            totalEmissiveRadiance += uWinCol * min(e, 1.0) * 0.8;
          }
        }`
      );
  };
  return m;
}
// one row of buildings as a single instanced mesh
function r3Row(list, mat, depth) {
  const T = THREE,
    geo = new T.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, -0.5);
  const im = new T.InstancedMesh(geo, mat, list.length),
    M = new T.Matrix4(),
    c = new T.Color();
  list.forEach((b, i) => {
    M.makeScale(b.w, b.h, b.d || depth);
    M.setPosition(b.x + b.w / 2, 0, b.z);
    im.setMatrixAt(i, M);
    im.setColorAt(i, c.set(b.col));
  });
  im.instanceMatrix.needsUpdate = true;
  im.computeBoundingSphere();
  return im;
}
// a neon sign: a dark plate with the word in its colour, bright enough to bloom
function r3SignMesh(t, col, vert) {
  const T = THREE,
    cv = document.createElement('canvas'),
    g = cv.getContext('2d'),
    fs = 40;
  g.font = `600 ${fs}px Teko, Impact, sans-serif`;
  const tw = vert ? fs * 1.1 : Math.ceil(g.measureText(t).width) + 28,
    th = vert ? t.length * fs * 0.86 + 24 : fs + 18;
  cv.width = tw;
  cv.height = th;
  g.fillStyle = '#07050c';
  g.fillRect(0, 0, tw, th);
  g.strokeStyle = col;
  g.lineWidth = 4;
  g.strokeRect(4, 4, tw - 8, th - 8);
  g.fillStyle = col;
  g.font = `600 ${fs}px Teko, Impact, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (vert) t.split('').forEach((ch, i) => g.fillText(ch, tw / 2, 14 + fs * 0.43 + i * fs * 0.86));
  else g.fillText(t, tw / 2, th / 2 + 3);
  const tex = new T.CanvasTexture(cv);
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new T.MeshBasicMaterial({ map: tex, toneMapped: false, color: new T.Color(2.4, 2.4, 2.4) });
  const m = new T.Mesh(new T.BoxGeometry(tw / 2.8, th / 2.8, 3), [
    R3.signBack,
    R3.signBack,
    R3.signBack,
    R3.signBack,
    mat,
    R3.signBack
  ]);
  m.userData.mat = mat;
  m.userData.w = tw / 2.8;
  m.userData.h = th / 2.8;
  return m;
}
// Free everything a built place holds on the GPU: geometry, materials and every texture they use (not just
// the colour map: roughness, emissive and alpha maps too), and the shadow map of any light that casts one.
// Anything left behind piles up with each place built until the browser drops the WebGL context.
function r3Dispose(o) {
  o.traverse(c => {
    if (c.geometry && !Object.values(R3.geo).includes(c.geometry)) c.geometry.dispose();
    if (c.isLight && c.shadow && c.shadow.map) {
      c.shadow.map.dispose();
      c.shadow.map = null;
    }
    for (const m of [].concat(c.material || [])) {
      if (m === R3.shadowMat || m === R3.signBack) continue;
      for (const k in m) if (m[k] && m[k].isTexture && m[k] !== R3.glowTex) m[k].dispose();
      m.dispose();
    }
  });
}
// Buildings at fixed spots: the Sprawl block's doors and the Den's shopfronts, in the order they stand
const R3_BTYPE = {
  safe: ['#18261e', 86],
  home: ['#231c33', 94],
  business: ['#18243a', 78],
  hideout: ['#2a1a1c', 70],
  blacksite: ['#10141f', 114],
  club: ['#2a1630', 88],
  precinct: ['#141c2e', 104],
  clinic: ['#14262a', 82],
  talisman: ['#241a30', 76]
};
function r3FixedFronts(back) {
  const out = [];
  if (G.world && !G.dun && G.wd && G.wd.street)
    for (const b of G.wd.street.buildings) {
      const t = R3_BTYPE[b.type];
      if (!t) continue; // a hidden door sits in a gap between buildings
      out.push({ x: b.x - b.w / 2, w: b.w, h: t[1] * 1.9, z: back, col: r3Hex(t[0], 1.7), fixed: true });
    }
  else if (G.den)
    for (const n of NPCS)
      if (n.front)
        out.push({
          x: n.x - n.front.w / 2,
          w: n.front.w,
          h: 150,
          z: back,
          col: r3Hex('#1c1426', 1.6),
          fixed: true
        });
  return out.sort((a, b) => a.x - b.x);
}
function r3BuildWorld(S) {
  const T = THREE,
    F = R3;
  if (F.world) {
    F.scene.remove(F.world);
    r3Dispose(F.world);
  }
  if (F.envRT) F.envRT.dispose();
  F.envRT = F.env = null;
  if (F.skyTex) F.skyTex.dispose();
  F.skyTex = null;
  const W3 = (F.world = new T.Group());
  F.scene.add(W3);
  F.signBack = F.signBack || new T.MeshStandardMaterial({ color: '#0b0812', roughness: 0.6 });
  F.moon = F.rain = F.refl = F.dance = F.exitDoor = null;
  F.signs = [];
  F.facades = [];
  F.fac = F.roofLights = F.city = null;
  // the edge light on every figure takes the district's first neon colour
  r3RimColor((S.signs && S.signs[0] && S.signs[0][1]) || S.win || '#45d2ff');
  // two lights for the brightest effects (muzzle flashes, fireballs, impacts), shared by every place
  r3FxInit();
  F.fxl = [0, 1].map(() => {
    const L = new T.PointLight('#ffffff', 0, 260, 1.4);
    W3.add(L);
    return L;
  });
  if (G.dun) return r3BuildRoom(S, W3);
  if (G.stealth) return r3BuildFacility(S, W3);
  const tunnel = !!S.tunnel,
    matrix = !!S.matrix,
    len = Math.max(S.len || 1500, 1600) + WMAX + 400,
    r = srng(((S.name || '').length * 7919 + (S.len || 0)) >>> 0),
    rr = (a, b) => a + r() * (b - a),
    wet = !!S.rain;
  // sky and fog
  const sky = document.createElement('canvas');
  sky.width = 4;
  sky.height = 256;
  const sg = sky.getContext('2d'),
    grd = sg.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#05030a');
  grd.addColorStop(0.45, S.sky[0]);
  grd.addColorStop(1, S.sky[1]);
  sg.fillStyle = grd;
  sg.fillRect(0, 0, 4, 256);
  const skyTex = new T.CanvasTexture(sky);
  skyTex.colorSpace = T.SRGBColorSpace;
  F.scene.background = skyTex;
  F.skyTex = skyTex;
  const fogCol = new T.Color(S.sky[1]).lerp(new T.Color(S.far), 0.5);
  F.scene.fog = new T.Fog(fogCol, 700, 2600);
  F.fogNear = 700;
  // lights: a cold fill from the camera's side, the moon behind for rim light, and a sky/ground ambient
  W3.add(
    new T.HemisphereLight(
      r3Hex(S.sky[1]).lerp(new T.Color('#9a8cff'), 0.35),
      new T.Color(S.ground[1]),
      tunnel ? 0.9 : 0.3
    )
  );
  const moon = new T.DirectionalLight(S.moon, 1.4);
  moon.position.set(-260, 820, -420);
  W3.add(moon, moon.target);
  F.moonLight = moon;
  const fill = new T.DirectionalLight('#b8c4ff', 0.75);
  fill.position.set(120, 260, 600);
  W3.add(fill, fill.target);
  F.fill = fill;
  F.lamps = [];
  F.pl = [];
  for (let i = 0; i < 4; i++) {
    const p = new T.PointLight('#ffffff', 0, 380, 1.2);
    W3.add(p);
    F.pl.push(p);
  }
  if (G.flight) return r3BuildFlight(S, W3, len, r, rr);
  // the road: dark asphalt with puddles that are glossier than the rest
  const gw = 512,
    gh = 256,
    gc = document.createElement('canvas'),
    rc = document.createElement('canvas');
  gc.width = rc.width = gw;
  gc.height = rc.height = gh;
  const g = gc.getContext('2d'),
    rg = rc.getContext('2d');
  g.fillStyle = S.ground[0];
  g.fillRect(0, 0, gw, gh);
  rg.fillStyle = wet ? '#8c8c8c' : '#cfcfcf';
  rg.fillRect(0, 0, gw, gh);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.12)';
    g.fillRect(r() * gw, r() * gh, 1 + r() * 3, 1 + r() * 2);
  }
  // cracks and tar seams
  g.strokeStyle = 'rgba(0,0,0,0.28)';
  g.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    g.beginPath();
    let x = r() * gw,
      y = r() * gh;
    g.moveTo(x, y);
    for (let k = 0; k < 6; k++) g.lineTo((x += rr(-40, 40)), (y += rr(-18, 18)));
    g.stroke();
  }
  if (wet)
    for (let i = 0; i < 12; i++) {
      const x = r() * gw,
        y = r() * gh,
        rx = rr(20, 70),
        ry = rr(8, 22),
        pg = rg.createRadialGradient(x, y, 1, x, y, rx);
      pg.addColorStop(0, '#080808');
      pg.addColorStop(0.7, '#1a1a1a');
      pg.addColorStop(1, 'rgba(106,106,106,0)');
      rg.fillStyle = pg;
      rg.save();
      rg.translate(x, y);
      rg.scale(1, ry / rx);
      rg.translate(-x, -y);
      rg.beginPath();
      rg.arc(x, y, rx, 0, 7);
      rg.fill();
      rg.restore();
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.beginPath();
      g.ellipse(x, y, rx * 0.8, ry * 0.8, 0, 0, 7);
      g.fill();
    }
  const gt = new T.CanvasTexture(gc),
    rt = new T.CanvasTexture(rc);
  gt.colorSpace = T.SRGBColorSpace;
  for (const t of [gt, rt]) {
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(len / 380, 1.4);
    t.anisotropy = 8;
  }
  const depth = (FY1 - FY0) * DZ + 260;
  const road = new T.Mesh(
    new T.PlaneGeometry(len, depth),
    new T.MeshStandardMaterial({
      map: gt,
      roughnessMap: rt,
      roughness: 1,
      metalness: matrix ? 0.4 : 0.15,
      envMapIntensity: wet ? 0.9 : 0.4,
      color: matrix ? '#203040' : wet ? '#5a5466' : '#8a8494'
    })
  );
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  road.position.set(len / 2 - 300, 0, depth / 2 - 4);
  W3.add(road);
  // lane markings: a dashed line down the middle lane
  const dashes = Math.ceil(len / 48),
    dm = new T.InstancedMesh(
      new T.BoxGeometry(22, 0.3, 2.2),
      new T.MeshStandardMaterial({ color: S.line, roughness: 0.5, emissive: S.line, emissiveIntensity: 0.6 }),
      dashes
    ),
    M = new T.Matrix4();
  for (let i = 0; i < dashes; i++) {
    M.makeTranslation(-300 + i * 48, 0.2, zOf(212.5));
    dm.setMatrixAt(i, M);
  }
  W3.add(dm);
  // the kerb and the pavement under the shopfronts
  const back = -14 * DZ;
  const kerb = new T.Mesh(
    new T.BoxGeometry(len, 3, 3),
    new T.MeshStandardMaterial({ color: r3Hex(S.line).multiplyScalar(1.6), roughness: 0.7 })
  );
  kerb.position.set(len / 2 - 300, 1.5, -1.5);
  const walk = new T.Mesh(
    new T.BoxGeometry(len, 3, -back),
    new T.MeshStandardMaterial({ color: r3Hex(S.wall).multiplyScalar(1.5), roughness: 0.85 })
  );
  walk.position.set(len / 2 - 300, 1.5, back / 2);
  kerb.receiveShadow = walk.receiveShadow = true;
  W3.add(kerb, walk);
  // buildings: the shopfront row, a taller row behind, and the skyline far off in the fog
  const front = [],
    mid = [],
    far = [];
  // the places with real doors on the street (the Sprawl's buildings, the Den's shops) stand where the game
  // puts them; generic buildings fill the gaps between
  const fixed = r3FixedFronts(back);
  const fillRow = (x0, x1) => {
    let x = x0;
    while (x < x1 - 20) {
      const w = Math.min(rr(60, 140), x1 - x),
        gap = r() < 0.18 ? rr(18, 36) : 2;
      front.push({
        x,
        w: tunnel ? w + gap : w,
        h: tunnel ? 420 : rr(95, 210),
        z: back - (!tunnel && r() < 0.25 ? 10 : 0),
        col: r3Hex(tunnel ? S.wall : S.near, tunnel ? rr(1.6, 2.1) : rr(0.85, 1.25))
      });
      x += w + gap;
    }
  };
  let at = -320;
  for (const b of fixed) {
    fillRow(at, b.x - 2);
    front.push(b);
    at = b.x + b.w + 2;
  }
  fillRow(at, len);
  let x = -400;
  while (x < len + 200) {
    const w = rr(90, 200);
    mid.push({ x, w, h: rr(240, 460), z: back - 130 - rr(0, 60), d: 90, col: r3Hex(S.near, rr(0.6, 0.9)) });
    x += w + rr(10, 60);
  }
  x = -1200;
  while (x < len + 1200) {
    const w = rr(120, 320);
    far.push({ x, w, h: rr(380, 1100), z: -900 - rr(0, 500), d: 200, col: r3Hex(S.far, rr(0.8, 1.2)) });
    x += w + rr(20, 120);
  }
  const alt = S.signs && S.signs.length ? S.signs[0][1] : S.moon;
  const frontMat = tunnel
    ? r3Facade({ alt, cw: 9, ch: 9, win: S.win, glow: 0.5, density: 0.012, wire: false })
    : r3Facade({ alt, cw: 11, ch: 13, win: S.win, glow: 0.9, density: 0.16, shop: S.win, wire: matrix });
  F.facades = [frontMat];
  if (!tunnel) {
    const midMat = r3Facade({ alt, cw: 12, ch: 14, win: S.win, glow: 0.8, density: 0.14, wire: matrix }),
      farMat = r3Facade({ alt, cw: 14, ch: 16, win: S.win, glow: 1.1, density: 0.12, wire: matrix });
    W3.add(r3Row(front, frontMat, 70), r3Row(mid, midMat, 90), r3Row(far, farMat, 200));
    F.facades.push(midMat, farMat);
  } else W3.add(r3Row(front, frontMat, 70));
  // roof lines in neon on some of the front row
  const trims = front.filter(() => r() < 0.35);
  if (trims.length && !tunnel) {
    const tm = new T.InstancedMesh(
      new T.BoxGeometry(1, 1.6, 1.6),
      new T.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
      trims.length
    );
    const c = new T.Color();
    trims.forEach((b, i) => {
      M.makeScale(b.w, 1, 1);
      M.setPosition(b.x + b.w / 2, b.h, b.z + 0.8);
      tm.setMatrixAt(i, M);
      const sg2 = S.signs && S.signs.length ? S.signs[i % S.signs.length][1] : S.win;
      tm.setColorAt(i, c.set(sg2).multiplyScalar(2));
    });
    W3.add(tm);
  }
  // neon signs on the shopfronts, each pouring its colour onto the wet road
  F.signs = [];
  const refl = [];
  if (S.signs && S.signs.length) {
    let si = 0;
    for (const b of front) {
      if (b.fixed || r() > 0.62 || b.x > len - 200) continue;
      const [t, col] = S.signs[si++ % S.signs.length],
        vert = r() < 0.35,
        m = r3SignMesh(t, col, vert),
        sw = m.userData.w,
        sh = m.userData.h,
        x = b.x + rr(sw / 2 + 4, Math.max(sw / 2 + 5, b.w - sw / 2 - 4)),
        y = vert
          ? rr(48, Math.max(50, b.h - sh / 2 - 10))
          : rr(38 + sh / 2, Math.max(40 + sh / 2, b.h * 0.55));
      m.position.set(x, y, b.z + 3);
      W3.add(m);
      F.signs.push({ m, x, y, col, ph: r() * 100 });
      refl.push({ x, w: sw, col });
    }
  }
  // street lamps along the kerb
  const lampN = Math.ceil(len / R3_LAMP_GAP),
    lampCol = S.market ? '#ffb36b' : tunnel ? '#7dffb0' : S.grid ? '#cfe6ff' : S.win || '#ffb36b';
  const pole = new T.InstancedMesh(
      new T.CylinderGeometry(1.4, 1.8, 110, 6).translate(0, 55, 0),
      new T.MeshStandardMaterial({ color: '#2a2633', roughness: 0.5, metalness: 0.6 }),
      lampN
    ),
    arm = new T.InstancedMesh(
      new T.BoxGeometry(26, 2, 2).translate(13, 0, 0),
      new T.MeshStandardMaterial({ color: '#2a2633', roughness: 0.5, metalness: 0.6 }),
      lampN
    ),
    head = new T.InstancedMesh(
      new T.BoxGeometry(12, 2.5, 6),
      new T.MeshBasicMaterial({ color: r3Hex(lampCol, 3), toneMapped: false }),
      lampN
    );
  if (!tunnel && !matrix) {
    for (let i = 0; i < lampN; i++) {
      const x = -200 + i * R3_LAMP_GAP;
      M.makeTranslation(x, 0, -6);
      pole.setMatrixAt(i, M);
      M.makeTranslation(x, 108, -6);
      arm.setMatrixAt(i, M);
      M.makeTranslation(x + 24, 106, -6);
      head.setMatrixAt(i, M);
      F.lamps.push({ x: x + 24, y: 100, z: -6, col: lampCol, k: 1 });
      refl.push({ x: x + 24, w: 14, col: lampCol, lamp: true });
    }
    W3.add(pole, arm, head);
  }
  for (const s of F.signs) F.lamps.push({ x: s.x, y: s.y, z: back + 10, col: s.col, k: 0.8, sign: s });
  // reflections: soft streaks of colour on the road under each light
  if (wet && refl.length) {
    const sc = document.createElement('canvas');
    sc.width = 32;
    sc.height = 128;
    const sg3 = sc.getContext('2d'),
      sgr = sg3.createLinearGradient(0, 0, 0, 128);
    sgr.addColorStop(0, 'rgba(255,255,255,0.0)');
    sgr.addColorStop(0.15, 'rgba(255,255,255,0.9)');
    sgr.addColorStop(1, 'rgba(255,255,255,0)');
    sg3.fillStyle = sgr;
    sg3.fillRect(0, 0, 32, 128);
    const hg = sg3.createLinearGradient(0, 0, 32, 0);
    hg.addColorStop(0, 'rgba(0,0,0,1)');
    hg.addColorStop(0.5, 'rgba(0,0,0,0)');
    hg.addColorStop(1, 'rgba(0,0,0,1)');
    sg3.globalCompositeOperation = 'destination-out';
    sg3.fillStyle = hg;
    sg3.fillRect(0, 0, 32, 128);
    const st = new T.CanvasTexture(sc);
    const rm = new T.InstancedMesh(
      new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5),
      new T.MeshBasicMaterial({
        map: st,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
        toneMapped: false,
        opacity: 0.55
      }),
      refl.length
    );
    const c = new T.Color();
    refl.forEach((o, i) => {
      M.makeScale(o.w * 0.9, 1, o.lamp ? 150 : 210);
      M.setPosition(o.x, 0.3, -2);
      rm.setMatrixAt(i, M);
      rm.setColorAt(i, c.set(o.col).multiplyScalar(o.lamp ? 0.5 : 0.8));
    });
    W3.add(rm);
    F.refl = rm;
  } else F.refl = null;
  // each district's own touches
  if (tunnel) r3Tunnel(W3, S, len, r);
  if (S.market) r3Lanterns(W3, len, r);
  if (S.grid || matrix) r3Grid(W3, S, len, depth);
  if (!tunnel) r3Moon(W3, S);
  if (!tunnel) r3BuildCity(W3, S, len, r);
  r3Rain(W3, S);
  // the exit: a gate of light at the end of the street
  const gate = new T.Mesh(
    new T.BoxGeometry(6, 90, (FY1 - FY0) * DZ),
    new T.MeshBasicMaterial({
      color: r3Hex('#ff3d8b', 2),
      toneMapped: false,
      transparent: true,
      opacity: 0.35
    })
  );
  gate.position.set(S.len - 15, 45, ((FY1 - FY0) * DZ) / 2);
  W3.add(gate);
  F.gate = gate;
  // reflections for shiny things: a tiny room of the district's neon, prefiltered once
  r3EnvMap(S);
}
function r3Tunnel(W3, S, len, r) {
  const T = THREE,
    M = new T.Matrix4(),
    n = Math.ceil(len / 120) + 4,
    back = -14 * DZ,
    span = (FY1 - FY0) * DZ + 220;
  // concrete pillars along the wall, a beam over the track from each, and a strip light under every other
  const conc = new T.MeshStandardMaterial({ color: r3Hex(S.wall, 2.4), roughness: 0.9 });
  const pil = new T.InstancedMesh(new T.BoxGeometry(18, 420, 18).translate(0, 210, 0), conc, n),
    beam = new T.InstancedMesh(new T.BoxGeometry(16, 14, span).translate(0, 0, span / 2), conc, n),
    tube = new T.InstancedMesh(
      new T.BoxGeometry(4, 2, 70),
      new T.MeshBasicMaterial({ color: r3Hex(S.win, 2.6), toneMapped: false }),
      n
    );
  for (let i = 0; i < n; i++) {
    const x = -300 + i * 120;
    M.makeTranslation(x, 0, back + 4);
    pil.setMatrixAt(i, M);
    M.makeTranslation(x, 300, back);
    beam.setMatrixAt(i, M);
    M.makeTranslation(x + 60, i % 2 ? 292 : -50, back + 90);
    tube.setMatrixAt(i, M);
    if (i % 2) R3.lamps.push({ x: x + 60, y: 280, z: back + 90, col: S.win, k: 1.6 });
  }
  W3.add(pil, beam, tube);
  for (const ry of [226, 248]) {
    const rail = new T.Mesh(
      new T.BoxGeometry(len, 2, 2.5),
      new T.MeshStandardMaterial({ color: '#6a7a72', roughness: 0.25, metalness: 0.9 })
    );
    rail.position.set(len / 2 - 300, 1, zOf(ry));
    W3.add(rail);
  }
}
function r3Lanterns(W3, len, r) {
  const T = THREE,
    n = Math.ceil(len / 14),
    lm = new T.InstancedMesh(
      new T.IcosahedronGeometry(2.6, 0),
      new T.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
      n * 2
    ),
    M = new T.Matrix4(),
    c = new T.Color(),
    cols = ['#ff3d8b', '#ffc63d', '#ff6a3d', '#ffb36b'];
  let i = 0;
  for (const [y0, z] of [
    [96, -10],
    [130, -60]
  ])
    for (let k = 0; k < n; k++) {
      const x = -300 + k * 14;
      M.makeTranslation(x, y0 + Math.sin(x * 0.045) * 9, z);
      lm.setMatrixAt(i, M);
      lm.setColorAt(i++, c.set(cols[k % 4]).multiplyScalar(2.2));
    }
  W3.add(lm);
}
function r3Grid(W3, S, len, depth) {
  const T = THREE,
    pts = [],
    col = S.matrix ? '#45d2ff' : '#ffc63d';
  for (let x = -300; x < len; x += 40) pts.push(x, 0.5, -4, x, 0.5, depth - 10);
  for (let z = 0; z < depth; z += 40) pts.push(-300, 0.5, z, len, 0.5, z);
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
  W3.add(
    new T.LineSegments(
      g,
      new T.LineBasicMaterial({
        color: r3Hex(col, S.matrix ? 1.4 : 0.6),
        transparent: true,
        opacity: S.matrix ? 0.7 : 0.25,
        toneMapped: false
      })
    )
  );
}
function r3Moon(W3, S) {
  const T = THREE,
    c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d'),
    gr = g.createRadialGradient(64, 64, 10, 64, 64, 64);
  gr.addColorStop(0, S.moon);
  gr.addColorStop(0.28, S.moon);
  gr.addColorStop(0.32, 'rgba(255,255,255,0.25)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  const m = new T.Sprite(
    new T.SpriteMaterial({ map: tex, fog: false, toneMapped: false, depthWrite: false })
  );
  m.scale.set(420, 420, 1);
  m.renderOrder = -1;
  W3.add(m);
  R3.moon = m;
}
// Rain: streaks falling through a box that travels with the camera, moved entirely in the vertex shader
function r3Rain(W3, S) {
  const T = THREE,
    n = 1400,
    pos = new Float32Array(n * 6),
    seed = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const x = Math.random(),
      z = Math.random(),
      y = Math.random();
    pos.set([x, y, z, x, y, z], i * 6);
    seed[i * 2] = 0;
    seed[i * 2 + 1] = 1;
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3));
  g.setAttribute('tail', new T.BufferAttribute(seed, 1));
  const col = S.matrix ? '#45ffb0' : '#a9c8ff';
  const mat = new T.ShaderMaterial({
    uniforms: {
      uT: { value: 0 },
      uC: { value: new T.Vector3() },
      uCol: { value: r3Hex(col, S.matrix ? 2 : 1.2) },
      uA: { value: 0.35 },
      uLen: { value: S.matrix ? 22 : 12 }
    },
    vertexShader: `attribute float tail; uniform float uT; uniform vec3 uC; uniform float uLen; varying float vA;
      void main() {
        vec3 p = position;
        float fall = fract(p.y - uT * (0.9 + p.x * 0.3));
        vec3 w = vec3(uC.x + (p.x - 0.5) * 1400.0, fall * 420.0, -40.0 + p.z * 420.0);
        w.x += fall * 18.0; // slanting in the wind
        w.y += tail * uLen; w.x -= tail * uLen * 0.25;
        vA = 1.0 - tail * 0.8;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: `uniform vec3 uCol; uniform float uA; varying float vA;
      void main() { gl_FragColor = vec4(uCol, uA * vA); }`,
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    toneMapped: false
  });
  const rain = new T.LineSegments(g, mat);
  rain.frustumCulled = false;
  W3.add(rain);
  R3.rain = rain;
}
function r3EnvMap(S) {
  const T = THREE,
    room = new T.Scene(),
    pm = new T.PMREMGenerator(R3.r);
  room.background = new T.Color(S.sky[0]).multiplyScalar(0.5);
  const cols = (S.signs || []).map(s => s[1]).concat([S.win, S.moon]);
  cols.forEach((c, i) => {
    const m = new T.Mesh(
      new T.PlaneGeometry(4, 1.2),
      new T.MeshBasicMaterial({ color: r3Hex(c, 3), side: T.DoubleSide })
    );
    const a = (i / cols.length) * Math.PI * 2;
    m.position.set(Math.cos(a) * 8, 1 + (i % 3) * 1.4, Math.sin(a) * 8);
    m.lookAt(0, 0, 0);
    room.add(m);
  });
  // keep the whole render target: freeing only its texture leaves the target behind, one per place built
  if (R3.envRT) R3.envRT.dispose();
  R3.envRT = pm.fromScene(room, 0.04);
  R3.env = R3.envRT.texture;
  R3.scene.environment = R3.env;
  pm.dispose();
  room.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
}
/* ---------- every frame ---------- */
function r3UpdateWorld(S) {
  const F = R3,
    cx = G.camX + W / 2,
    wx = typeof wxNow === 'function' ? wxNow() : 'clear',
    wet = !!S.rain || wx === 'storm' || wx === 'rain' || wx === 'sleet';
  // the lights travel with the fight: the four lamps and signs nearest the middle of the view
  const near = F.lamps
    .filter(l => Math.abs(l.x - cx) < W)
    .sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx))
    .slice(0, F.pl.length);
  F.pl.forEach((p, i) => {
    const l = near[i];
    if (!l) {
      p.intensity = 0;
      return;
    }
    p.position.set(l.x, l.y, l.z + 30);
    p.color.set(l.col);
    const on = l.sign ? !(Math.sin(G.t * 0.05 + l.x) > 0.96) : 1;
    p.intensity = (l.sign ? 70 : 45) * l.k * (on ? 1 : 0.1);
  });
  // flickering signs
  for (const s of F.signs) {
    const on = !(Math.sin(G.t * 0.05 + s.x) > 0.96);
    s.m.userData.mat.color.setScalar(on ? 2.4 : 0.35);
  }
  // windows switch on and off over time
  for (const m of F.facades) m.userData.U.uEra.value = G.t >> 8;
  r3MoonShadow(F.moonLight, cx);
  F.fill.position.set(cx + 120, 260, 600);
  F.fill.target.position.set(cx, 0, 60);
  if (F.moon) F.moon.position.set(cx + 420 - G.camX * 0.02, 520, -2600);
  // rain while it's wet, fog closing in when it's foggy
  if (F.rain) {
    F.rain.visible = wet || !!S.matrix;
    const U = F.rain.material.uniforms;
    U.uT.value = G.t * 0.022;
    U.uC.value.set(cx, 0, 0);
    U.uA.value = lowFx() ? 0.22 : 0.35;
    F.rain.geometry.setDrawRange(0, lowFx() ? 900 : 2800);
  }
  if (F.refl) F.refl.visible = wet;
  const fog = wx === 'fog';
  F.scene.fog.near = fog ? 380 : F.fogNear;
  F.scene.fog.far = fog ? 1300 : 2600;
  r3UpdateFacility();
  r3UpdateRoof();
  if (F.exitDoor) F.exitDoor.material.color.set(G.exitOpen ? '#7dffb0' : '#ff3d4a').multiplyScalar(2);
  if (F.dance) {
    const cols = ['#ff3d8b', '#45d2ff', '#ffc63d', '#b98cff', '#7dffb0'],
      beat = G.t >> 4,
      c = F.col || (F.col = new THREE.Color());
    let i = 0;
    for (let ty = 0; ty < 4; ty++)
      for (let tx = 0; tx * 40 < W; tx++) {
        const k = (tx * 7 + ty * 3 + beat) % 9;
        c.set(cols[(tx + ty + beat) % cols.length]).multiplyScalar(k > 3 ? 0.05 : k === 0 ? 1.4 : 0.7);
        F.dance.setColorAt(i++, c);
      }
    F.dance.instanceColor.needsUpdate = true;
  }
  F.gate.visible = !!G.exitOpen && !G.den && !G.dun;
  if (F.gate.visible) F.gate.material.opacity = 0.25 + 0.2 * Math.sin(G.t * 0.15);
  // lightning lights the whole street for a frame or two
  F.moonLight.intensity = G.flash > 0.2 && wx === 'storm' ? 5 : 1.4;
}

/* ---------- inside a building ---------- */
// A room of the Sprawl: the wall and trim in the building's own colours, lamp strips under the ceiling, its
// decor (server racks, shelves, frames, tags), the exit door, and a dance floor in a club
function r3BuildRoom(S, W3) {
  const T = THREE,
    F = R3,
    D0 = G.dun,
    b = D0.b,
    I = INT[facOf(b)],
    r = srng(b.seed + D0.room * 97),
    back = -14 * DZ,
    x0 = -60,
    len = W + 120,
    deep = (FY1 - FY0) * DZ + 240,
    M = new T.Matrix4();
  F.scene.background = new T.Color('#030206');
  F.scene.fog = new T.Fog('#030206', 900, 2400);
  F.fogNear = 900;
  W3.add(new T.HemisphereLight(r3Hex(I.lamp).lerp(new T.Color('#ffffff'), 0.5), new T.Color(I.trim), 0.55));
  const moon = new T.DirectionalLight(I.lamp, 0.6);
  moon.position.set(-100, 300, -200);
  const fill = new T.DirectionalLight('#b8c4ff', 0.55);
  fill.position.set(100, 200, 600);
  W3.add(moon, moon.target, fill, fill.target);
  F.moonLight = moon;
  F.fill = fill;
  F.lamps = [];
  F.pl = [];
  for (let i = 0; i < 4; i++) {
    const p = new T.PointLight('#ffffff', 0, 380, 1.2);
    W3.add(p);
    F.pl.push(p);
  }
  const blacksite = I.deco === 'rack';
  const mat = (c, rough, metal) =>
    new T.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal || 0.1, envMapIntensity: 0.6 });
  // floor, wall, trim, ceiling
  const floor = new T.Mesh(
    new T.PlaneGeometry(len, deep),
    mat(r3Hex(I.trim, 0.9), blacksite ? 0.3 : 0.6, 0.2)
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(x0 + len / 2, 0, back + deep / 2);
  const wall = new T.Mesh(new T.BoxGeometry(len, 200, 8), mat(r3Hex(I.wall, 1.5), 0.8));
  wall.position.set(x0 + len / 2, 100, back - 4);
  const trim = new T.Mesh(new T.BoxGeometry(len, 34, 3), mat(r3Hex(I.trim, 1.6), 0.6));
  trim.position.set(x0 + len / 2, 17, back + 1.5);
  const ceil = new T.Mesh(new T.BoxGeometry(len, 6, deep), mat('#07050b', 1));
  ceil.position.set(x0 + len / 2, 200, back + deep / 2);
  floor.receiveShadow = true;
  W3.add(floor, wall, trim, ceil);
  // panel seams down the wall
  const seams = Math.ceil(len / 40),
    sm = new T.InstancedMesh(new T.BoxGeometry(1.2, 166, 1), mat('#000000', 1), seams);
  for (let i = 0; i < seams; i++) {
    M.makeTranslation(x0 + i * 40, 117, back + 0.5);
    sm.setMatrixAt(i, M);
  }
  W3.add(sm);
  // lamp strips, each lighting the room
  const lampN = Math.ceil(W / 120),
    lm = new T.InstancedMesh(
      new T.BoxGeometry(28, 3, 10),
      new T.MeshBasicMaterial({ color: r3Hex(I.lamp, 2.6), toneMapped: false }),
      lampN
    );
  for (let i = 0; i < lampN; i++) {
    const x = 60 + i * 120;
    M.makeTranslation(x, 194, back + 60);
    lm.setMatrixAt(i, M);
    F.lamps.push({ x, y: 180, z: back + 60, col: I.lamp, k: 1.4 });
  }
  W3.add(lm);
  // decor along the wall
  for (let i = 0; i < 4; i++) {
    const x = 40 + i * 110 + r() * 40,
      top = 156 - (40 + r() * 30);
    if (I.deco === 'rack') {
      const rk = new T.Mesh(new T.BoxGeometry(26, top + 10, 14), mat('#0a0f18', 0.4, 0.6));
      rk.position.set(x + 13, (top + 10) / 2, back + 8);
      W3.add(rk);
      const leds = new T.InstancedMesh(
        new T.BoxGeometry(3, 2, 1),
        new T.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
        12
      );
      const c = new T.Color();
      for (let k = 0; k < 12; k++) {
        M.makeTranslation(x + 5 + (k % 2) * 12, 20 + Math.floor(k / 2) * 12, back + 15.2);
        leds.setMatrixAt(k, M);
        leds.setColorAt(k, c.set(k % 3 ? '#45d2ff' : '#7dffb0').multiplyScalar(2));
      }
      W3.add(leds);
    } else if (I.deco === 'shelf') {
      for (const y of [top, top - 22]) {
        const sh = new T.Mesh(new T.BoxGeometry(44, 3, 12), mat('#141826', 0.7));
        sh.position.set(x + 18, y, back + 6);
        W3.add(sh);
        for (let k = 0; k < 5; k++) {
          const bx = new T.Mesh(
            new T.BoxGeometry(5, 8, 6),
            mat(pick(['#ff6a3d', '#45d2ff', '#ffc63d', '#b98cff']), 0.5)
          );
          bx.position.set(x + k * 8 + 2, y + 5.5, back + 6);
          W3.add(bx);
        }
      }
    } else if (I.deco === 'frame' || I.deco === 'art') {
      const fr = new T.Mesh(
        new T.BoxGeometry(22, 28, 2),
        mat(I.deco === 'art' ? '#ffc63d' : '#6b6280', 0.4, 0.5)
      );
      fr.position.set(x + 11, top + 14, back + 1);
      const pic = new T.Mesh(
        new T.BoxGeometry(18, 24, 1),
        new T.MeshBasicMaterial({ color: r3Hex(pick(['#3a2a50', '#22324a', '#4a2a30']), 1.6) })
      );
      pic.position.set(x + 11, top + 14, back + 2.2);
      W3.add(fr, pic);
    } else if (I.deco === 'tag') {
      // a spray tag in glowing paint
      const pts = [];
      let px = x,
        py = top + 20;
      for (let k = 1; k < 6; k++) {
        const nx = x + k * 8,
          ny = top + 20 - (k % 2 ? 18 : 4) * r();
        pts.push(px, 190 - py, back + 1, nx, 190 - ny, back + 1);
        px = nx;
        py = ny;
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
      W3.add(
        new T.LineSegments(
          g,
          new T.LineBasicMaterial({
            color: r3Hex(pick(['#ff3d8b', '#7dffb0', '#ffc63d']), 1.6),
            toneMapped: false
          })
        )
      );
    }
  }
  // the way out: a door at the right with its light red until the room is clear
  const ex = W - 26;
  const door = new T.Mesh(new T.BoxGeometry(26, 44, 3), mat('#07050b', 0.6));
  door.position.set(ex, 22, back + 1.5);
  const frame = new T.Mesh(
    new T.BoxGeometry(29, 47, 2),
    new T.MeshBasicMaterial({ color: '#ff3d4a', toneMapped: false })
  );
  frame.position.set(ex, 23, back + 0.5);
  W3.add(door, frame);
  F.exitDoor = frame;
  // a club's dance floor: tiles that light to the beat
  if (b.type === 'club') {
    const tiles = new T.InstancedMesh(
      new T.BoxGeometry(36, 0.6, 20 * DZ),
      new T.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true, opacity: 0.6 }),
      Math.ceil(W / 40) * 4
    );
    let i = 0;
    for (let ty = 0; ty < 4; ty++)
      for (let tx = 0; tx * 40 < W; tx++) {
        M.makeTranslation(tx * 40 + 20, 0.3, zOf(FY0 + 14 + ty * 23));
        tiles.setMatrixAt(i, M);
        tiles.setColorAt(i++, new T.Color(0, 0, 0));
      }
    W3.add(tiles);
    F.dance = tiles;
  }
  F.gate = new T.Group();
  r3EnvMap({ sky: [I.wall, I.trim], signs: [['', I.lamp]], win: I.lamp, moon: I.lamp });
}

/* ---------- a flight over the skyline ---------- */
// The street is far below: the city drops away into the fog, and the towers the VTOL weaves between rise out
// of it, each where the game put it, lit window by window, with a red light on its antenna
function r3BuildFlight(S, W3, len, r, rr) {
  const T = THREE,
    F = R3,
    M = new T.Matrix4(),
    yt = FY0 + 20,
    below = -520,
    mid = [],
    far = [];
  F.scene.fog.near = 500;
  F.scene.fog.far = 2200;
  F.fogNear = 500;
  let x = -600;
  while (x < len + 600) {
    const w = rr(90, 220);
    mid.push({ x, w, h: rr(260, 520), z: -160 - rr(0, 200), d: 120, col: r3Hex(S.near, rr(0.6, 0.9)) });
    x += w + rr(20, 90);
  }
  x = -1400;
  while (x < len + 1400) {
    const w = rr(140, 340);
    far.push({ x, w, h: rr(500, 1200), z: -1000 - rr(0, 500), d: 220, col: r3Hex(S.far, rr(0.8, 1.2)) });
    x += w + rr(20, 120);
  }
  const alt = S.signs && S.signs.length ? S.signs[0][1] : S.moon,
    midMat = r3Facade({ alt, cw: 12, ch: 14, win: S.win, glow: 0.8, density: 0.14, yoff: below }),
    farMat = r3Facade({ alt, cw: 14, ch: 16, win: S.win, glow: 1.1, density: 0.12, yoff: below }),
    towMat = r3Facade({ alt, cw: 10, ch: 12, win: S.win, glow: 1.2, density: 0.3, yoff: below });
  const low = new T.Group();
  low.position.y = below;
  low.add(r3Row(mid, midMat, 120), r3Row(far, farMat, 220));
  W3.add(low);
  F.facades = [midMat, farMat, towMat];
  if (G.flight.roof) {
    r3BuildRoof(W3, S);
    r3Moon(W3, S);
    F.gate = new T.Group();
    return r3EnvMap(S);
  }
  // the towers in the flight path, tops where the 2D view draws them
  const tw = (G.flight.towers || []).map(t => ({
    x: t.x,
    w: t.w,
    h: yt - t.top - below,
    z: zOf(yt) + 30,
    d: 60,
    col: r3Hex('#1c1828', 1.4)
  }));
  if (tw.length) {
    const row = r3Row(tw, towMat, 60);
    row.position.y = below;
    W3.add(row);
    const ant = new T.InstancedMesh(
      new T.BoxGeometry(2.4, 14, 2.4),
      new T.MeshStandardMaterial({ color: '#2a2436', roughness: 0.5, metalness: 0.6 }),
      tw.length
    );
    const lamp = new T.InstancedMesh(
      new T.IcosahedronGeometry(2.2, 0),
      new T.MeshBasicMaterial({ color: r3Hex('#ff3d4a', 3), toneMapped: false }),
      tw.length
    );
    tw.forEach((t, i) => {
      M.makeTranslation(t.x + t.w / 2, yt - G.flight.towers[i].top + 7, t.z - 30);
      ant.setMatrixAt(i, M);
      M.makeTranslation(t.x + t.w / 2, yt - G.flight.towers[i].top + 15, t.z - 30);
      lamp.setMatrixAt(i, M);
    });
    W3.add(ant, lamp);
    F.towerLamps = lamp;
  }
  r3Moon(W3, S);
  r3Rain(W3, S);
  F.gate = new T.Group();
  r3EnvMap(S);
}

/* ---------- a drone stealth job ---------- */
// The corp floor as a cut-away: the back wall with its long windows, a ceiling soffit with light strips, a rail
// along the cut the cameras hang from, partition walls open only at their vents, laser gates, the terminal and
// the exit vent. Everything the drones fly through stands on one plane (SF.floor), as in the game
function r3BuildFacility(S, W3) {
  const T = THREE,
    F = R3,
    L = G.stealth,
    Z0 = zOf(SF.floor),
    back = Z0 - 70,
    len = (S.len || 3000) + 600,
    x0 = -300,
    M = new T.Matrix4(),
    mat = (c, rough, metal) =>
      new T.MeshStandardMaterial({
        color: c,
        roughness: rough,
        metalness: metal || 0.2,
        envMapIntensity: 0.7
      }),
    glow = (c, k) => new T.MeshBasicMaterial({ color: r3Hex(c, k || 2.2), toneMapped: false }),
    accent = (S.signs && S.signs[0] && S.signs[0][1]) || '#45d2ff';
  F.scene.background = new T.Color('#05040a');
  F.scene.fog = new T.Fog('#05040a', 900, 2400);
  F.fogNear = 900;
  W3.add(new T.HemisphereLight('#b8c8ff', '#262a3a', 1.1));
  const moon = new T.DirectionalLight('#9fe9ff', 0.5);
  moon.position.set(-200, 400, -300);
  const fill = new T.DirectionalLight('#c8d0ff', 1);
  fill.position.set(100, 260, 600);
  W3.add(moon, moon.target, fill, fill.target);
  F.moonLight = moon;
  F.fill = fill;
  F.lamps = [];
  F.pl = [];
  for (let i = 0; i < 4; i++) {
    const p = new T.PointLight('#ffffff', 0, 380, 1.2);
    W3.add(p);
    F.pl.push(p);
  }
  // floor, back wall, soffit, the rail along the cut
  const floor = new T.Mesh(new T.PlaneGeometry(len, 260), mat('#1c2030', 0.6, 0.1));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(x0 + len / 2, 0, back + 130);
  const wall = new T.Mesh(new T.BoxGeometry(len, SF.ceil + 20, 6), mat('#2a3044', 0.8));
  wall.position.set(x0 + len / 2, (SF.ceil + 20) / 2, back - 3);
  const soffit = new T.Mesh(new T.BoxGeometry(len, 12, 60), mat('#07060b', 1));
  soffit.position.set(x0 + len / 2, SF.ceil + 6, back + 30);
  const rail = new T.Mesh(new T.BoxGeometry(len, 4, 6), mat('#262a38', 0.4, 0.6));
  rail.position.set(x0 + len / 2, SF.ceil + 2, Z0);
  const trim = new T.Mesh(new T.BoxGeometry(len, 1.5, 1), glow(accent, 1.4));
  trim.position.set(x0 + len / 2, SF.ceil - 0.5, back + 0.6);
  floor.receiveShadow = wall.receiveShadow = true;
  W3.add(floor, wall, soffit, rail, trim);
  // panel seams and strip lights
  const seams = Math.ceil(len / 80),
    sm = new T.InstancedMesh(new T.BoxGeometry(1, SF.ceil, 1), mat('#000000', 1), seams),
    lights = new T.InstancedMesh(new T.BoxGeometry(40, 2, 8), glow('#9fe9ff', 2.4), Math.ceil(len / 160));
  for (let i = 0; i < seams; i++) {
    M.makeTranslation(x0 + i * 80, SF.ceil / 2, back + 0.5);
    sm.setMatrixAt(i, M);
  }
  for (let i = 0; i * 160 < len; i++) {
    const x = x0 + 40 + i * 160;
    M.makeTranslation(x, SF.ceil, back + 24);
    lights.setMatrixAt(i, M);
    F.lamps.push({ x, y: SF.ceil - 8, z: back + 30, col: '#9fe9ff', k: 1.4 });
  }
  W3.add(sm, lights);
  // long windows onto the night city
  const winTex = (() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const g = c.getContext('2d'),
      gr = g.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, S.sky ? S.sky[0] : '#1d1033');
    gr.addColorStop(1, S.sky ? S.sky[1] : '#4a1a3a');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 64);
    const r = srng(91);
    for (let i = 0; i < 24; i++) {
      const bw = 8 + r() * 22,
        bh = 18 + r() * 40,
        bx = r() * 256;
      g.fillStyle = '#0a0812';
      g.fillRect(bx, 64 - bh, bw, bh);
      g.fillStyle = S.win || '#ffb36b';
      for (let k = 0; k < 6; k++) g.fillRect(bx + 2 + r() * (bw - 4), 64 - bh + 3 + r() * (bh - 6), 2, 2);
    }
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    return t;
  })();
  for (let k = 0; k < 8; k++) {
    const wx = 300 + k * 560;
    if (wx > len) break;
    const pane = new T.Mesh(
      new T.PlaneGeometry(160, 46),
      new T.MeshBasicMaterial({ map: winTex, color: new T.Color(1.3, 1.3, 1.3), toneMapped: false })
    );
    pane.position.set(wx + 80, SF.ceil - 34 - 23, back + 0.8);
    const frame = new T.Mesh(new T.BoxGeometry(164, 50, 1), mat('#2a2d3a', 0.5, 0.5));
    frame.position.set(wx + 80, SF.ceil - 57, back + 0.3);
    W3.add(frame, pane);
  }
  // partition walls: steel above and below the vent, with the vent's frame lit
  const steel = mat('#2c3142', 0.45, 0.5);
  F.fac = { walls: [], lasers: [], cams: [] };
  for (const w of L.walls) {
    const lo = new T.Mesh(new T.BoxGeometry(w.w, w.gap[0], 60), steel),
      hi = new T.Mesh(new T.BoxGeometry(w.w, SF.ceil - w.gap[1], 60), steel),
      vent = new T.Mesh(
        new T.BoxGeometry(w.w + 1, w.gap[1] - w.gap[0], 61),
        new T.MeshBasicMaterial({ color: r3Hex('#9fe9ff', 1.2), toneMapped: false, wireframe: true })
      ),
      cap = new T.Mesh(new T.BoxGeometry(w.w, 8, 60), steel);
    lo.position.set(w.x, w.gap[0] / 2, Z0);
    hi.position.set(w.x, (SF.ceil + w.gap[1]) / 2, Z0);
    vent.position.set(w.x, (w.gap[0] + w.gap[1]) / 2, Z0);
    cap.position.set(w.x, SF.ceil - 4, Z0);
    W3.add(lo, hi, vent, cap);
    F.fac.walls.push({ w, lo, hi, vent, cap });
  }
  // laser gates: emitters top and bottom, three beams across the corridor
  for (const l of L.lasers) {
    const g = new T.Group(),
      em = mat('#2a2436', 0.4, 0.6);
    for (const y of [3, SF.ceil - 3]) {
      const e = new T.Mesh(new T.BoxGeometry(8, 6, 60), em);
      e.position.y = y;
      g.add(e);
    }
    const beams = [];
    for (const z of [-20, 0, 20]) {
      const b = new T.Mesh(new T.BoxGeometry(1.2, SF.ceil - 12, 1.2), glow('#ff3d4a', 3));
      b.position.set(0, SF.ceil / 2, z);
      g.add(b);
      beams.push(b);
    }
    g.position.set(l.x, 0, Z0);
    W3.add(g);
    F.fac.lasers.push({ l, beams });
  }
  // cameras hanging from the rail
  for (const c of L.cams) {
    const dome = new T.Mesh(R3.geo.head, mat('#2a2436', 0.3, 0.6));
    dome.scale.set(6, 4, 6);
    dome.position.set(c.x, SF.ceil - 4, Z0);
    const led = new T.Mesh(R3.geo.gem, glow('#ff3d4a', 2.4));
    led.scale.setScalar(1.6);
    led.position.set(c.x, SF.ceil - 8, Z0 + 4);
    W3.add(dome, led);
    F.fac.cams.push({ c, led });
  }
  // the terminal
  const t = L.term,
    desk = new T.Mesh(new T.BoxGeometry(26, 30, 16), mat('#20232f', 0.4, 0.4)),
    screen = new T.Mesh(new T.BoxGeometry(18, 11, 1), glow('#45d2ff', 2));
  desk.position.set(t.x, 15, Z0 - 10);
  screen.position.set(t.x, 22, Z0 - 1.6);
  W3.add(desk, screen);
  F.fac.screen = screen;
  // the exit vent at the far end: a grille that lights green once the files are pulled
  const ex = new T.Group(),
    grille = mat('#0d0f16', 0.5, 0.4);
  const bx = new T.Mesh(new T.BoxGeometry(32, 60, 12), grille);
  bx.position.y = 70;
  ex.add(bx);
  const slats = [];
  for (let i = 1; i < 6; i++) {
    const sl = new T.Mesh(new T.BoxGeometry(28, 1.2, 1), glow('#4a4256', 1));
    sl.position.set(0, 100 - i * 10, 6.2);
    ex.add(sl);
    slats.push(sl);
  }
  ex.position.set(L.exit, 0, Z0 - 10);
  W3.add(ex);
  F.fac.slats = slats;
  F.gate = new T.Group();
  r3EnvMap({ sky: ['#10121b', '#191c28'], signs: [['', accent]], win: '#9fe9ff', moon: '#45d2ff' });
}
// each frame: lasers blink, doors slide open, the terminal and exit change colour, the cameras' lights
function r3UpdateFacility() {
  const F = R3.fac;
  if (!F) return;
  for (const { l, beams } of F.lasers) {
    const on = laserOn(l);
    for (const b of beams) b.visible = on;
  }
  for (const { w, lo, hi, vent, cap } of F.walls) {
    lo.visible = hi.visible = vent.visible = !w.open;
    cap.visible = !!w.open;
  }
  const S = G.stealth;
  F.screen.material.color
    .set(S.term.done ? '#7dffb0' : '#45d2ff')
    .multiplyScalar(S.term.done ? 2.4 : 1.6 + 0.6 * Math.sin(G.t * 0.1));
  for (const sl of F.slats)
    sl.material.color.set(S.data ? '#7dffb0' : '#4a4256').multiplyScalar(S.data ? 2.4 : 1);
  const alert = G.salarm > 0;
  for (const { c, led } of F.cams) {
    const looped = c.offT > 0;
    led.material.color
      .set(
        looped ? ((G.t >> 3) % 2 ? '#45d2ff' : '#1a3a4a') : alert || (G.t >> 4) % 2 ? '#ff3d4a' : '#3a1a1a'
      )
      .multiplyScalar(2.4);
  }
}

/* ---------- the roof after a flight ---------- */
// The Arcology roof: a deck over the city far below, a parapet along the back with two stairwell heads (their
// lights red while security keeps coming up), a vent stack, the landing pad painted on the deck, edge lights
function r3BuildRoof(W3, S) {
  const T = THREE,
    F = R3,
    M = new T.Matrix4(),
    back = zOf(FY0 - 16),
    depth = (FY1 - (FY0 - 16)) * DZ + 120,
    x0 = -200,
    len = W + 400,
    mat = (c, rough, metal) =>
      new T.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal || 0.2 });
  const deck = new T.Mesh(new T.BoxGeometry(len, 8, depth), mat('#121119', 0.75, 0.2));
  deck.position.set(x0 + len / 2, -4, back + depth / 2);
  deck.receiveShadow = true;
  W3.add(deck);
  // deck seams
  const seams = Math.ceil(len / 48),
    sm = new T.InstancedMesh(new T.BoxGeometry(0.8, 0.4, depth), mat('#2c2a3c', 0.8), seams);
  for (let i = 0; i < seams; i++) {
    M.makeTranslation(x0 + i * 48, 0.2, back + depth / 2);
    sm.setMatrixAt(i, M);
  }
  W3.add(sm);
  const par = new T.Mesh(new T.BoxGeometry(len, 14, 6), mat('#262536', 0.6));
  par.position.set(x0 + len / 2, 7, back - 3);
  const strip = new T.Mesh(
    new T.BoxGeometry(len, 1, 6.4),
    new T.MeshBasicMaterial({ color: r3Hex(S.win || '#ffb36b', 1.2), toneMapped: false })
  );
  strip.position.set(x0 + len / 2, 14, back - 3);
  W3.add(par, strip);
  F.roofLights = [];
  for (const sx of [30, W - 92]) {
    const hut = new T.Mesh(new T.BoxGeometry(62, 46, 40), mat('#2c2a3c', 0.5, 0.3));
    hut.position.set(sx + 31, 23, back - 24);
    const door = new T.Mesh(new T.BoxGeometry(22, 28, 1), mat('#0d0b14', 0.6));
    door.position.set(sx + 31, 14, back - 3.4);
    const lamp = new T.Mesh(R3.geo.gem, new T.MeshBasicMaterial({ color: '#7dffb0', toneMapped: false }));
    lamp.scale.setScalar(2.4);
    lamp.position.set(sx + 31, 34, back - 3);
    W3.add(hut, door, lamp);
    F.roofLights.push(lamp);
    F.lamps.push({ x: sx + 31, y: 40, z: back + 10, col: '#ff3d4a', k: 0.6 });
  }
  const vent = new T.Mesh(new T.BoxGeometry(40, 24, 30), mat('#23222f', 0.5, 0.4));
  vent.position.set(W * 0.42 + 20, 12, back - 15);
  W3.add(vent);
  // the pad
  const pc = document.createElement('canvas');
  pc.width = pc.height = 256;
  const g = pc.getContext('2d');
  g.strokeStyle = 'rgba(255,198,61,.6)';
  g.lineWidth = 10;
  g.beginPath();
  g.arc(128, 128, 112, 0, 7);
  g.stroke();
  g.fillStyle = 'rgba(255,198,61,.45)';
  g.font = '600 150px Teko, Impact, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('H', 128, 140);
  const pt = new T.CanvasTexture(pc);
  pt.colorSpace = T.SRGBColorSpace;
  const pad = new T.Mesh(
    new T.PlaneGeometry(184, 68 * DZ),
    new T.MeshBasicMaterial({ map: pt, transparent: true, depthWrite: false })
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(W * 0.5, 0.3, zOf((FY0 + FY1) / 2 + 4));
  W3.add(pad);
  // edge lights along the front
  const n = Math.ceil(len / 40),
    el = new T.InstancedMesh(
      new T.IcosahedronGeometry(1.6, 0),
      new T.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
      n
    );
  for (let i = 0; i < n; i++) {
    M.makeTranslation(x0 + 12 + i * 40, 1.6, back + depth - 6);
    el.setMatrixAt(i, M);
    el.setColorAt(i, new T.Color(0, 0, 0));
  }
  W3.add(el);
  F.edge = el;
}
function r3UpdateRoof() {
  const F = R3,
    R = G.flight && G.flight.roof;
  if (!R || !F.roofLights) return;
  const live = R.live && G.t % 40 < 20;
  for (const l of F.roofLights) l.material.color.set(live ? '#ff3d4a' : '#7dffb0').multiplyScalar(2.4);
  const c = F.col || (F.col = new THREE.Color());
  for (let i = 0; i < F.edge.count; i++) {
    const x = 12 + i * 40;
    F.edge.setColorAt(i, c.set('#ff3d4a').multiplyScalar((G.t + x) % 90 < 45 ? 2.4 : 0.15));
  }
  F.edge.instanceColor.needsUpdate = true;
}

// the moon (or the room's key light) casts the shadows: a box around the view, kept steady by moving it in
// whole shadow-map texels so the edges don't shimmer as the camera scrolls
function r3MoonShadow(L, cx) {
  const T = THREE,
    tz = zOf(R3_MIDY);
  if (!L.userData.shadowy) {
    L.userData.shadowy = true;
    L.userData.dir = L.position.clone().normalize();
    L.castShadow = true;
    L.shadow.mapSize.set(1024, 1024);
    const c = L.shadow.camera;
    c.left = -W * 0.7;
    c.right = W * 0.7;
    c.top = 260;
    c.bottom = -260;
    c.near = 10;
    c.far = 2400;
    c.updateProjectionMatrix();
    L.shadow.bias = -0.0006;
    L.shadow.normalBias = 0.6;
    L.shadow.radius = 2;
  }
  const texel = (W * 1.4) / 1024,
    x = Math.round(cx / texel) * texel,
    d = L.userData.dir;
  L.target.position.set(x, 0, tz);
  L.position.set(x + d.x * 900, d.y * 900, tz + d.z * 900);
  L.target.updateMatrixWorld();
}
