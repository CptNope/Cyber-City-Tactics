/* Cyber City Tactics · src/js/render/r3fx.js
 * The 3D view's finishing layer:
 *   rim light    every fighter, creature and machine catches a thin edge of the district's neon (a fresnel
 *                term added to their materials), so figures stand out of the dark street
 *   swing trails a ribbon of light behind every weapon swing, punch and kick
 *   shots        projectiles get a glowing core and a streak behind them; hits flash, rings expand, zaps
 *                strike; two lights follow the brightest of these, so a muzzle flash or a fireball lights
 *                the fighters and the wet road around it
 *   camera       a slow push in for a boss's entrance, a drift in on a finishing blow's slow motion, a small
 *                punch on heavy hits, and a slow sway behind the title screen
 *   the city     traffic flying between the towers, animated billboard screens, steam from street grates,
 *                snow and sleet, and lightning you can see in a storm
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ---------- rim light ---------- */
const R3_RIMU = { uRim: { value: null }, uRimK: { value: 0.55 } };
// added to fighter and model materials: a fresnel edge in the district's accent colour
function r3Rim(sh) {
  if (!R3_RIMU.uRim.value) R3_RIMU.uRim.value = new THREE.Color('#45d2ff');
  sh.uniforms.uRim = R3_RIMU.uRim;
  sh.uniforms.uRimK = R3_RIMU.uRimK;
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform vec3 uRim; uniform float uRimK;')
    .replace(
      '#include <opaque_fragment>',
      `float rimF = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);
      outgoingLight += uRim * rimF * uRimK;
      #include <opaque_fragment>`
    );
}
function r3RimColor(c) {
  if (!R3_RIMU.uRim.value) R3_RIMU.uRim.value = new THREE.Color();
  R3_RIMU.uRim.value.set(c || '#45d2ff');
}
/* ---------- shared bits ---------- */
function r3FxInit() {
  const T = THREE,
    F = R3;
  if (F.fxReady) return;
  F.fxReady = true;
  // a soft round glow
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d'),
    gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  F.glowTex = new T.CanvasTexture(c);
  F.fxGroup = new T.Group();
  F.scene.add(F.fxGroup);
  F.sprites = [];
  F.rings = [];
  F.zaps = [];
  F.trailMat = new T.ShaderMaterial({
    uniforms: {},
    vertexShader: `attribute float a; attribute vec3 color; varying float vA; varying vec3 vC;
      void main() { vA = a; vC = color; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying float vA; varying vec3 vC; void main() { gl_FragColor = vec4(vC * vA, vA); }`,
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    side: T.DoubleSide,
    toneMapped: false
  });
}
// a pooled additive glow sprite
function r3Glow(i, x, y, z, size, col, k) {
  const F = R3,
    T = THREE;
  let s = F.sprites[i];
  if (!s) {
    s = new T.Sprite(
      new T.SpriteMaterial({
        map: F.glowTex,
        blending: T.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        toneMapped: false,
        fog: false
      })
    );
    F.sprites.push(s);
    F.fxGroup.add(s);
  }
  s.visible = true;
  s.position.set(x, y, z);
  s.scale.set(size, size, 1);
  r3Col(col, s.material.color).multiplyScalar(k);
  return s;
}
/* ---------- each frame ---------- */
const R3_SHOTCOL = {
  bullet: '#ffe28a',
  laser: '#ff3d4a',
  eshot: '#ff3d4a',
  fire: '#ff6a3d',
  bolt: '#b98cff',
  hex: '#b98cff',
  wave: '#c9a8ff',
  rocket: '#ffc63d',
  missile: '#ffc63d',
  nade: '#ff9f6b'
};
function r3UpdateFx() {
  r3FxInit();
  const F = R3,
    T = THREE;
  let n = 0;
  const lights = []; // candidates for the two effect lights: [x, y, z, colour, strength]
  // shots: a hot core and a streak behind
  for (const p of G.projs) {
    const col = p.tint === 'fire' ? '#ff6a3d' : p.tint === 'bolt' ? '#b98cff' : R3_SHOTCOL[p.k] || p.c;
    if (!col || p.k === 'prop') continue;
    const z = zOf(p.y),
      y = p.z || (p.air ? 0 : 12),
      big = p.k === 'fire' || p.k === 'wave' || p.k === 'rocket' || p.wide;
    r3Glow(n++, p.x, y, z, big ? 34 : p.k === 'bullet' ? 9 : 18, col, big ? 2.2 : 2.6);
    r3Glow(n++, p.x - (p.vx || 0) * 3, y, z, big ? 22 : 7, col, 0.9);
    if (big || p.k === 'laser') lights.push([p.x, y, z, col, big ? 1 : 0.6]);
  }
  // impact flashes, expanding rings and lightning
  let ri = 0,
    zi = 0;
  for (const f of G.fx) {
    const k = f.life / (f.max || 1),
      z = zOf(f.y);
    if (f.k === 'star') {
      if (k > 0.4) {
        r3Glow(n++, f.x, f.z, z + 4, f.r * 2.6 * k, f.c, 3 * k);
        r3Glow(n++, f.x, f.z, z + 5, f.r * 1.1 * k, '#ffffff', 3 * k);
        lights.push([f.x, f.z, z + 20, f.c, k]);
      }
    } else if (f.k === 'ring') {
      let r = F.rings[ri];
      if (!r) {
        r = new T.Mesh(
          new T.TorusGeometry(1, 0.06, 4, 32),
          new T.MeshBasicMaterial({
            transparent: true,
            blending: T.AdditiveBlending,
            depthWrite: false,
            toneMapped: false
          })
        );
        r.rotation.x = Math.PI / 2;
        F.rings.push(r);
        F.fxGroup.add(r);
      }
      ri++;
      const rad = f.r * (1.25 - k * 0.6);
      r.visible = true;
      r.position.set(f.x, Math.max(1, f.z * 0.15), z);
      r.scale.set(rad, rad * DZ * 0.5, rad);
      r3Col(f.c, r.material.color).multiplyScalar(2.4 * k);
    } else if (f.k === 'zap') {
      let b = F.zaps[zi];
      if (!b) {
        b = new T.Mesh(
          new T.BoxGeometry(2, 1, 2),
          new T.MeshBasicMaterial({
            transparent: true,
            blending: T.AdditiveBlending,
            depthWrite: false,
            toneMapped: false
          })
        );
        F.zaps.push(b);
        F.fxGroup.add(b);
      }
      zi++;
      b.visible = true;
      b.scale.set(1 + k * 2, 400, 1 + k * 2);
      b.position.set(f.x + rand(-2, 2), 200 + f.z, z);
      r3Col(f.c || '#b98cff', b.material.color).multiplyScalar(3 * k);
      lights.push([f.x, 60, z, f.c || '#b98cff', 1.4 * k]);
    }
  }
  for (let i = n; i < F.sprites.length; i++) F.sprites[i].visible = false;
  for (let i = ri; i < F.rings.length; i++) F.rings[i].visible = false;
  for (let i = zi; i < F.zaps.length; i++) F.zaps[i].visible = false;
  // the two effect lights take the strongest
  lights.sort((a, b) => b[4] - a[4]);
  (F.fxl || []).forEach((L, i) => {
    const c = lights[i];
    L.intensity = c ? 220 * c[4] : 0;
    if (c) {
      L.position.set(c[0], c[1] + 6, c[2] + 12);
      r3Col(c[3], L.color);
    }
  });
  r3UpdateTrails();
  r3UpdateCity();
}
/* ---------- swing trails ---------- */
// the frames of each strike that leave a trail: [from, to] of the state's timer
const R3_STRIKES = {
  punch: [3, 10],
  rpunch: [3, 10],
  kick: [4, 12],
  rkick: [4, 12],
  upper: [4, 14],
  heavy: [6, 16],
  dashp: [0, 12],
  slide: [0, 14],
  swipe: [10, 22],
  slam: [8, 18],
  gslam: [6, 16],
  stomp: [4, 12],
  lunge: [0, 10]
};
const R3_TRAIL = 9;
function r3Trail(o) {
  const T = THREE,
    geo = new T.BufferGeometry(),
    n = R3_TRAIL;
  const pos = new Float32Array(n * 2 * 3),
    a = new Float32Array(n * 2),
    col = new Float32Array(n * 2 * 3),
    idx = [];
  for (let i = 0; i < n - 1; i++) {
    const v = i * 2;
    idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
  }
  geo.setIndex(idx);
  geo.setAttribute('position', new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage));
  geo.setAttribute('a', new T.BufferAttribute(a, 1).setUsage(T.DynamicDrawUsage));
  geo.setAttribute('color', new T.BufferAttribute(col, 3).setUsage(T.DynamicDrawUsage));
  const m = new T.Mesh(geo, R3.trailMat);
  m.frustumCulled = false;
  R3.fxGroup.add(m);
  o.trail = { m, hist: [], col: new T.Color() };
}
const R3V1 = { x: 0, y: 0, z: 0 };
function r3UpdateTrails() {
  const F = R3,
    T = THREE,
    va = F.va || (F.va = new T.Vector3()),
    vb = F.vb || (F.vb = new T.Vector3());
  for (const [e, o] of F.pool) {
    if (!o.root || o.beast || o.card) continue;
    const rig = e._rig || {},
      strike = R3_STRIKES[e.state],
      swinging = (!!rig.swing || (strike && e.t >= strike[0] && e.t <= strike[1])) && o.root.visible;
    if (!o.trail) {
      if (!swinging) continue;
      r3Trail(o);
    }
    const tr = o.trail;
    if (swinging) {
      o.root.updateMatrixWorld(true);
      if (o.wpn.visible) {
        va.set(0.5, 0, 0).applyMatrix4(o.wpn.matrixWorld);
        vb.set(-0.2, 0, 0).applyMatrix4(o.wpn.matrixWorld);
      } else {
        // a fist or a boot: whichever is further out
        const kick = /kick|slide|stomp/.test(e.state);
        const tip = kick ? o.fBoot : o.fHand,
          base = kick ? o.fShin : o.fArmL;
        va.setFromMatrixPosition(tip.matrixWorld);
        vb.setFromMatrixPosition(base.matrixWorld);
        vb.lerp(va, 0.55);
      }
      tr.hist.unshift([va.x, va.y, va.z, vb.x, vb.y, vb.z, 1]);
      const wcol = o.wpn.visible ? o.mats.metal.color : null;
      tr.col.set(e.kind === 'player' ? (e.pal && e.pal.acc) || '#ff3d8b' : wcol ? '#e9f6ff' : '#ffffff');
    } else for (const h of tr.hist) h[6] -= 0.34;
    if (tr.hist.length > R3_TRAIL) tr.hist.length = R3_TRAIL;
    while (tr.hist.length && tr.hist[tr.hist.length - 1][6] <= 0) tr.hist.pop();
    const P = tr.m.geometry.attributes.position.array,
      A = tr.m.geometry.attributes.a.array,
      C = tr.m.geometry.attributes.color.array;
    for (let i = 0; i < R3_TRAIL; i++) {
      const h = tr.hist[Math.min(i, tr.hist.length - 1)] || [0, -999, 0, 0, -999, 0, 0],
        fade = h[6] * (1 - i / R3_TRAIL) * (i < tr.hist.length ? 1 : 0);
      P.set(h.slice(0, 3), i * 6);
      P.set(h.slice(3, 6), i * 6 + 3);
      A[i * 2] = fade * 0.9;
      A[i * 2 + 1] = 0;
      for (let k = 0; k < 2; k++) {
        C[(i * 2 + k) * 3] = tr.col.r * 2;
        C[(i * 2 + k) * 3 + 1] = tr.col.g * 2;
        C[(i * 2 + k) * 3 + 2] = tr.col.b * 2;
      }
    }
    const g = tr.m.geometry.attributes;
    g.position.needsUpdate = g.a.needsUpdate = g.color.needsUpdate = true;
    tr.m.visible = tr.hist.length > 1;
  }
  void R3V1;
}
/* ---------- the camera ---------- */
// zoom and nudges layered on the framed camera: a boss's entrance, a finishing blow, a heavy hit, the title
function r3CamFx() {
  const out = R3.camFx || (R3.camFx = { zoom: 1, dy: 0, sway: 0 }),
    intro = typeof introK === 'function' ? introK() || 0 : 0,
    slow = Math.min(1, (G.slow || 0) / 30),
    punch = G.shake > 6 ? Math.min(1, (G.shake - 6) / 8) : 0,
    title = G.mode === 'title' ? 1 : 0;
  let want = 1 + 0.12 * intro + 0.07 * slow + 0.02 * punch;
  if (RM) want = 1;
  // ease toward it, so nothing snaps
  out.zoom += (want - out.zoom) * (want > out.zoom ? 0.18 : 0.06);
  out.dy += ((RM ? 0 : -14 * intro - 6 * slow) - out.dy) * 0.08;
  out.sway = RM ? 0 : title * Math.sin(G.t * 0.004) * 14;
  return out;
}
/* ---------- the living city ---------- */
// built with a district (r3BuildCity is called by r3BuildWorld for outdoor places)
function r3BuildCity(W3, S, len, r) {
  r3FxInit();
  const T = THREE,
    F = R3,
    M = new T.Matrix4();
  F.city = { cars: null, boards: [], vents: null, snow: null, bolt: null };
  // sky traffic: hover cars on three lanes between the towers, head and tail lights
  const n = 46,
    cars = new T.InstancedMesh(
      new T.BoxGeometry(14, 4, 6),
      new T.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
      n
    );
  F.city.carData = [];
  const c = new T.Color();
  for (let i = 0; i < n; i++) {
    const lane = i % 3,
      dir = lane === 1 ? -1 : 1;
    F.city.carData.push({
      x: r() * (len + 1200) - 600,
      y: 230 + lane * 70 + r() * 20,
      z: -260 - lane * 160 - r() * 60,
      v: dir * (1.4 + r() * 1.6),
      lane
    });
    cars.setColorAt(i, c.set(dir > 0 ? '#ff3d4a' : '#fff3c4').multiplyScalar(2.2));
  }
  cars.frustumCulled = false;
  W3.add(cars);
  F.city.cars = cars;
  F.city.len = len;
  // animated billboard screens on some of the taller buildings
  const words = (S.signs || []).map(s => s[0]).concat(['KAGEMORI', 'SOYCAF', 'NEON NIGHTS', 'CHROME 4 U']);
  for (let i = 0; i < 4; i++) {
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 128;
    const tex = new T.CanvasTexture(cv);
    tex.colorSpace = T.SRGBColorSpace;
    const m = new T.Mesh(
      new T.PlaneGeometry(96, 48),
      new T.MeshBasicMaterial({ map: tex, toneMapped: false, color: new T.Color(1.6, 1.6, 1.6) })
    );
    m.position.set(200 + i * (len / 4) + r() * 100, 250 + r() * 80, -190);
    W3.add(m);
    F.city.boards.push({
      m,
      cv,
      g: cv.getContext('2d'),
      tex,
      word: words[(i * 3) % words.length],
      col:
        (S.signs && S.signs[i % Math.max(1, S.signs.length)] && S.signs[i % S.signs.length][1]) || '#45d2ff',
      ph: r() * 100
    });
  }
  // steam from street grates: soft puffs rising and fading
  const vn = Math.ceil(len / 420),
    per = 10,
    vpos = new Float32Array(vn * per * 3),
    vseed = new Float32Array(vn * per);
  for (let i = 0; i < vn; i++)
    for (let k = 0; k < per; k++) {
      const j = i * per + k;
      vpos[j * 3] = 140 + i * 420 + r() * 120;
      vpos[j * 3 + 1] = 0;
      vpos[j * 3 + 2] = zOf(196 + r() * 40);
      vseed[j] = k / per + r() * 0.1;
    }
  const vg = new T.BufferGeometry();
  vg.setAttribute('position', new T.BufferAttribute(vpos, 3));
  vg.setAttribute('seed', new T.BufferAttribute(vseed, 1));
  const vents = new T.Points(
    vg,
    new T.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uScale: { value: 1 }, uMap: { value: F.glowTex } },
      vertexShader: `attribute float seed; uniform float uT; uniform float uScale; varying float vA;
        void main() { float k = fract(seed + uT); vec3 p = position;
          p.y += k * 70.0; p.x += sin(k * 6.0 + seed * 20.0) * 6.0 + k * 10.0;
          vA = (1.0 - k) * smoothstep(0.0, 0.15, k) * 0.16;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (10.0 + k * 26.0) * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D uMap; varying float vA;
        void main() { gl_FragColor = vec4(vec3(0.75, 0.78, 0.85), texture2D(uMap, gl_PointCoord).a * vA); }`,
      transparent: true,
      depthWrite: false,
      toneMapped: false
    })
  );
  vents.frustumCulled = false;
  W3.add(vents);
  F.city.vents = vents;
  // snow and sleet: flakes drifting down through a box that follows the camera
  const sn = 1200,
    sp = new Float32Array(sn * 3);
  for (let i = 0; i < sn * 3; i++) sp[i] = r();
  const sg = new T.BufferGeometry();
  sg.setAttribute('position', new T.BufferAttribute(sp, 3));
  const snow = new T.Points(
    sg,
    new T.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uC: { value: 0 }, uScale: { value: 1 }, uMap: { value: F.glowTex } },
      vertexShader: `uniform float uT; uniform float uC; uniform float uScale;
        void main() { vec3 p = position; float fall = fract(p.y - uT * (0.25 + p.x * 0.1));
          vec3 w = vec3(uC + (p.x - 0.5) * 1300.0 + sin(uT * 6.0 + p.z * 30.0) * 12.0, fall * 420.0, -40.0 + p.z * 420.0);
          vec4 mv = modelViewMatrix * vec4(w, 1.0);
          gl_PointSize = 5.0 * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D uMap;
        void main() { gl_FragColor = vec4(vec3(1.4), texture2D(uMap, gl_PointCoord).a * 0.8); }`,
      transparent: true,
      depthWrite: false,
      toneMapped: false
    })
  );
  snow.frustumCulled = false;
  W3.add(snow);
  F.city.snow = snow;
  // lightning: a jagged bolt far off over the skyline, shown for a frame or two in a storm
  const pts = [];
  let x = 0,
    y = 900;
  while (y > 120) {
    const nx = x + (r() - 0.5) * 60,
      ny = y - 30 - r() * 50;
    pts.push(x, y, 0, nx, ny, 0);
    if (r() < 0.25) pts.push(nx, ny, 0, nx + (r() - 0.5) * 80, ny - 40, 0);
    x = nx;
    y = ny;
  }
  const bg = new T.BufferGeometry();
  bg.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
  const bolt = new T.LineSegments(
    bg,
    new T.LineBasicMaterial({ color: new T.Color(3, 3, 4), toneMapped: false, fog: false })
  );
  bolt.visible = false;
  W3.add(bolt);
  F.city.bolt = bolt;
  void M;
}
function r3UpdateCity() {
  const F = R3,
    C = F.city;
  if (!C) return;
  const cx = G.camX + W / 2,
    sc = ((R3.gh || R3.h) / VH) * (VH / (2 * Math.tan((R3_FOV * Math.PI) / 360))),
    wx = typeof wxNow === 'function' ? wxNow() : 'clear';
  if (C.cars) {
    const M = F.mtx || (F.mtx = new THREE.Matrix4());
    C.carData.forEach((d, i) => {
      d.x += d.v;
      if (d.x > C.len + 700) d.x = -700;
      if (d.x < -700) d.x = C.len + 700;
      M.makeTranslation(d.x, d.y + Math.sin(G.t * 0.02 + i) * 3, d.z);
      C.cars.setMatrixAt(i, M);
    });
    C.cars.instanceMatrix.needsUpdate = true;
    C.cars.visible = !G.dun && !G.stealth;
  }
  // a billboard redraws a few times a second: its word sliding past, scanlines, a flicker
  for (const b of C.boards) {
    if ((G.t + b.ph) % 6) continue;
    const g = b.g,
      t = (G.t + b.ph) * 0.02;
    g.fillStyle = '#05030a';
    g.fillRect(0, 0, 256, 128);
    const gr = g.createLinearGradient(0, 0, 256, 128);
    gr.addColorStop(0, b.col);
    gr.addColorStop(1, '#05030a');
    g.globalAlpha = 0.35 + 0.15 * Math.sin(t * 3);
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 128);
    g.globalAlpha = 1;
    g.fillStyle = b.col;
    g.font = '600 64px Teko, Impact, sans-serif';
    g.textBaseline = 'middle';
    const w = g.measureText(b.word).width + 60,
      x = 256 - ((t * 60) % (w + 256));
    g.fillText(b.word, x, 70);
    g.fillStyle = 'rgba(0,0,0,.35)';
    for (let y = 0; y < 128; y += 4) g.fillRect(0, y, 256, 1);
    b.tex.needsUpdate = true;
  }
  if (C.vents) {
    C.vents.material.uniforms.uT.value = G.t * 0.006;
    C.vents.material.uniforms.uScale.value = sc;
    C.vents.visible = !lowFx();
  }
  if (C.snow) {
    C.snow.visible = wx === 'snow' || wx === 'sleet';
    C.snow.material.uniforms.uT.value = G.t * 0.004;
    C.snow.material.uniforms.uC.value = cx;
    C.snow.material.uniforms.uScale.value = sc;
  }
  if (C.bolt) {
    const strike = wx === 'storm' && G.flash > 0.2;
    if (strike && !C.bolt.visible) C.bolt.position.set(cx + (Math.random() - 0.5) * 900, 0, -1400);
    C.bolt.visible = strike;
  }
}
