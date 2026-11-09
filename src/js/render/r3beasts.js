/* Cyber City Tactics · src/js/render/r3beasts.js
 * Low-poly 3D models for everything that isn't a fighter: corp drones, hellhounds, mech walkers, Ssareth the
 * dragon, fire spirits, sentry turrets, ICE in the Host, vending machines, loot chests and vault doors, data
 * nodes and hostages. Each model is a handful of shapes animated from the same state the 2D drawing reads
 * (state, timer, walk phase, flash, facing), so a hound's gallop, a mech's stomp or the dragon's wingbeat
 * keeps the 2D timing. Anything still without a model is drawn as its 2D picture on a card (r3figs.js).
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/** Which 3D model an entity gets, or null for none. */
function r3BeastKind(e) {
  if (e.air || e.kind === 'vtol' || e.drone || e.veh || e.mist > 0 || (e.bk && e.ride)) return null;
  const d = e.d || {};
  if (d.dragon) return 'dragon';
  if (d.mech) return 'mech';
  if (d.quad) return 'hound';
  if (d.spirit) return 'spirit';
  if (d.ice) return 'ice';
  if (d.fly) return 'drone';
  if (d.turret) return 'turret';
  if (d.passive && R3_PASSIVE[e.kind]) return e.kind === 'chest' && e.vault ? 'vault' : e.kind;
  return null;
}
const R3_PASSIVE = { vend: 1, chest: 1, node: 1, hostage: 1 };
// a small kit for building models: every solid part's material is kept so a hit can flash them all
function r3Kit() {
  const T = THREE,
    G3 = R3.geo,
    root = new T.Group(),
    body = new T.Group(),
    mats = [];
  root.add(body);
  const mat = (col, rough, metal) => {
    const m = new T.MeshStandardMaterial({
      color: col,
      roughness: rough === undefined ? 0.55 : rough,
      metalness: metal || 0.15,
      flatShading: true,
      envMapIntensity: 0.7
    });
    m.userData.base = col;
    mats.push(m);
    return m;
  };
  const glow = (col, k) =>
    new T.MeshBasicMaterial({ color: new T.Color(col).multiplyScalar(k || 2.2), toneMapped: false });
  // a part: geometry, material, size, position, parent
  const part = (geo, m, sx, sy, sz, x, y, z, parent) => {
    const p = new T.Mesh(geo, m);
    p.scale.set(sx, sy, sz);
    p.position.set(x || 0, y || 0, z || 0);
    (parent || body).add(p);
    return p;
  };
  const group = (x, y, z, parent) => {
    const g = new T.Group();
    g.position.set(x || 0, y || 0, z || 0);
    (parent || body).add(g);
    return g;
  };
  return { T, G3, root, body, mats, mat, glow, part, group };
}
function r3Beast(kind, e) {
  const K = r3Kit(),
    o = { beast: kind, root: K.root, body: K.body, mats: K.mats, P: {} };
  (R3_BUILD[kind] || R3_BUILD.vend)(K, o, e);
  const shadow = new THREE.Mesh(R3.geo.disc, R3.shadowMat),
    ring = new THREE.Mesh(R3.geo.ring, new THREE.MeshBasicMaterial({ color: '#ff3d4a', toneMapped: false }));
  o.shadow = shadow;
  o.ring = ring;
  R3.figs.add(K.root, shadow, ring);
  return o;
}
/* ---------- the models ---------- */
const R3_BUILD = {
  // a corp quadcopter: a flat armoured hull, four rotors on two cross arms, a red eye and a chin gun
  drone(K, o) {
    const { G3, part, mat, glow, group } = K,
      hull = mat('#39405a', 0.4, 0.5),
      dark = mat('#22263a', 0.5, 0.4);
    part(G3.gem, hull, 11, 5, 9, 0, 0, 0);
    part(G3.box, mat('#5d6680', 0.35, 0.6), 18, 2, 9, 0, 3.2, 0);
    part(G3.box, dark, 28, 1.6, 2, 0, 5, 0);
    part(G3.box, dark, 2, 1.6, 22, 0, 5, 0);
    o.P.rotors = [];
    const rm = new THREE.MeshBasicMaterial({
      color: '#c8dcff',
      transparent: true,
      opacity: 0.35,
      toneMapped: false
    });
    for (const [x, z] of [
      [-13, 0],
      [13, 0],
      [0, -10],
      [0, 10]
    ]) {
      const r = group(x, 6.5, z);
      part(G3.box, rm, 13, 0.4, 1.6, 0, 0, 0, r);
      o.P.rotors.push(r);
    }
    o.P.eye = part(G3.gem, glow('#ff3d4a'), 2.2, 2.2, 2.2, 7, -1.5, 3.5);
    part(G3.box, dark, 9, 2, 2.5, 6, -6, 0);
  },
  // a hellhound: lean body, a long head, four legs that gallop, a mane and tail of fire
  hound(K, o, e) {
    const { G3, part, mat, glow, group } = K,
      fur = (e.pal && e.pal.coat) || '#2a1a1e',
      m1 = mat(fur, 0.8),
      m2 = mat(mixHex(fur, '#ff6a3d', 0.12), 0.8);
    o.P.torso = part(G3.tor, m1, 6.5, 26, 6, 0, 13.5, 0);
    o.P.torso.rotation.z = Math.PI / 2;
    o.P.head = group(12, 17, 0);
    part(G3.box, m1, 9, 7, 7, 1, 0, 0, o.P.head);
    part(G3.box, m2, 7, 4, 5, 7, -1.5, 0, o.P.head);
    for (const z of [-2.2, 2.2]) {
      const ear = part(G3.gem, m2, 1.6, 4, 1.4, -1, 5, z, o.P.head);
      ear.rotation.z = -0.3;
    }
    o.P.eyes = part(G3.box, glow('#ffc63d', 2.6), 1.6, 1.2, 7.4, 4, 1.4, 0, o.P.head);
    o.P.legs = [];
    for (const [x, z, ph, m] of [
      [-9, 3, 0, m1],
      [8, 3, Math.PI, m1],
      [-6, -3, Math.PI, m2],
      [11, -3, 0, m2]
    ]) {
      const hip = group(x, 11, z);
      const up = part(G3.cyl, m, 1.5, 6, 1.5, 0, -3, 0, hip);
      const knee = group(0, -6, 0, hip);
      part(G3.cyl, m, 1.3, 6, 1.3, 0, -3, 0, knee);
      o.P.legs.push({ hip, knee, ph, up, back: x < 0 });
    }
    // fire: a tail and a mane of glowing shards that flicker
    o.P.fire = [];
    const fm = [glow('#ff6a3d', 2.4), glow('#ffc63d', 2.6)];
    for (let i = 0; i < 4; i++)
      o.P.fire.push(part(G3.gem, fm[i % 2], 1.6, 4, 1.6, 2 + i * 2.6, 19.5, (i % 2) - 0.5));
    o.P.tail = group(-13, 15, 0);
    for (let i = 0; i < 3; i++)
      o.P.fire.push(part(G3.gem, fm[i % 2], 2.6 - i * 0.5, 2, 2, -3 - i * 3, 2 + i * 1.6, 0, o.P.tail));
  },
  // a mech walker: a plated hull on two reverse-jointed legs, a gun forward and a glowing vent on its back
  mech(K, o) {
    const { G3, part, mat, glow, group } = K,
      plate = mat('#5a6a8c', 0.32, 0.55),
      plate2 = mat('#36425e', 0.42, 0.5);
    o.P.hull = group(0, 33, 0);
    part(G3.tor, plate, 13, 20, 12, 0, 0, 0, o.P.hull);
    // a lit canopy and a hazard stripe down each flank
    part(G3.box, glow('#45d2ff', 0.9), 8, 6, 16, 9, 6, 0, o.P.hull);
    part(G3.box, glow('#ff3d4a', 1.4), 22, 1.2, 23, -1, -6, 0, o.P.hull);
    part(G3.box, plate2, 26, 3, 20, -1, 11, 0, o.P.hull);
    part(G3.box, plate2, 6, 14, 24, -15, 1, 0, o.P.hull);
    o.P.visor = part(G3.box, glow('#ff3d4a'), 3, 3, 14, 15, 4, 0, o.P.hull);
    part(G3.box, plate2, 16, 3.4, 3.4, 18, -3, 7, o.P.hull);
    part(G3.box, plate2, 16, 3.4, 3.4, 18, -3, -7, o.P.hull);
    o.P.vent = part(G3.box, glow('#ffc63d', 2), 2, 12, 14, -18, 0, 0, o.P.hull);
    o.P.legs = [];
    for (const [z, a] of [
      [8, 0],
      [-8, Math.PI]
    ]) {
      const hip = group(-2, 24, z);
      part(G3.gem, plate2, 3.6, 3.6, 3.6, 0, 0, 0, hip);
      const th = part(G3.cyl, plate2, 2.4, 1, 2.4, 0, 0, 0, hip);
      const sh = part(G3.cyl, plate2, 2, 1, 2, 0, 0, 0, hip);
      const foot = part(G3.box, plate, 11, 2.6, 7, 0, 0, 0, hip);
      o.P.legs.push({ hip, th, sh, foot, a });
    }
  },
  // Ssareth: violet-black scale, a long neck and horned head, burning throat and gold eyes, great wings
  dragon(K, o) {
    const { G3, part, mat, glow, group, T } = K,
      s1 = mat('#2a1236', 0.5, 0.3),
      s2 = mat('#1a0b24', 0.6, 0.2),
      belly = mat('#7a5a1a', 0.6),
      wingM = mat('#3a1a4a', 0.7);
    wingM.side = T.DoubleSide;
    o.P.torso = part(G3.head, s1, 20, 9, 11, 0, 23, 0);
    part(G3.head, belly, 15, 3, 8, 0, 15.5, 0);
    for (let k = 0; k < 5; k++) part(G3.gem, s2, 2, 4, 1.6, -12 + k * 6, 33, 0);
    o.P.neck = part(G3.cyl, s1, 3.6, 1, 3.6, 0, 0, 0);
    o.P.head = group(28, 46, 0);
    part(G3.box, s1, 12, 7, 8, 2, 0, 0, o.P.head);
    part(G3.box, s1, 8, 4, 6, 9, -1.5, 0, o.P.head);
    for (const z of [-3, 3]) {
      const h = part(G3.gem, s2, 1.6, 6, 1.6, -4, 6, z, o.P.head);
      h.rotation.z = 0.5;
    }
    o.P.eyes = part(G3.box, glow('#ffc63d', 3), 3, 1.4, 8.6, 4, 1.5, 0, o.P.head);
    o.P.throat = part(G3.gem, glow('#ff6a3d', 3), 3, 3, 3, 14, -3, 0, o.P.head);
    // tail: a chain of segments tapering to a golden tip
    o.P.tail = [];
    let prev = group(-16, 22, 0);
    for (let i = 0; i < 4; i++) {
      const seg = group(i ? -11 : 0, i ? 1.5 : 0, 0, prev);
      part(G3.cyl, s1, 4 - i * 0.8, 12, 4 - i * 0.8, -5.5, 0, 0, seg).rotation.z = Math.PI / 2;
      o.P.tail.push(seg);
      prev = seg;
    }
    part(G3.gem, glow('#ffc63d', 2.2), 3, 3, 2, -12, 0, 0, prev);
    // legs
    o.P.legs = [];
    for (const [x, z, ph] of [
      [-10, 5, 0],
      [8, 5, Math.PI],
      [-10, -5, Math.PI],
      [8, -5, 0]
    ]) {
      const hip = group(x, 17, z);
      part(G3.cyl, s2, 2.4, 16, 2.4, 0, -8, 0, hip);
      o.P.legs.push({ hip, ph });
    }
    // wings: a membrane on a hinge at each shoulder
    const wg = new T.BufferGeometry();
    wg.setAttribute(
      'position',
      new T.Float32BufferAttribute(
        [0, 0, 0, -30, 0, 22, -6, 0, 40, 0, 0, 0, -6, 0, 40, 18, 0, 30, 0, 0, 0, 18, 0, 30, 10, 0, 6],
        3
      )
    );
    wg.computeVertexNormals();
    o.P.wings = [];
    for (const side of [1, -1]) {
      const hinge = group(0, 32, side * 5);
      const w = new T.Mesh(wg, wingM);
      w.scale.set(1, 1, side);
      hinge.add(w);
      o.P.wings.push({ hinge, side });
    }
  },
  // a fire spirit: a stack of flame-balls that sways and flickers
  spirit(K, o, e) {
    const { G3, part, glow } = K,
      cols = (e.d && e.d.flames) || ['#ff3d1a', '#ff6a3d', '#ff9a3d', '#ffc63d', '#fff1b0'];
    o.P.balls = cols.map((c, i) => part(G3.head, glow(c, 2.2), 1, 1, 1, 0, 0, 0));
    o.P.eyes = part(G3.box, new THREE.MeshBasicMaterial({ color: '#2a0a04' }), 2, 2.4, 9, 2, 8, 0);
  },
  // a sentry turret on its post
  turret(K, o) {
    const { G3, part, mat, glow, group } = K;
    part(G3.cyl, mat('#2a2e3a', 0.4, 0.6), 2, 26, 2, 0, 13, 0);
    part(G3.box, mat('#3a3f4e', 0.5, 0.5), 14, 4, 12, 0, 2, 0);
    o.P.head = group(0, 31, 0);
    part(G3.box, mat('#4a5064', 0.35, 0.6), 18, 13, 14, 0, 0, 0, o.P.head);
    part(G3.box, mat('#1a1622', 0.4, 0.5), 11, 4, 4, 13, -1, 0, o.P.head);
    o.P.eye = part(G3.box, glow('#ff3d4a'), 4, 3, 15, 4, 2.5, 0, o.P.head);
    o.P.flash = part(G3.gem, glow('#ffe28a', 3), 3, 3, 3, 20, -1, 0, o.P.head);
  },
  // ICE in the Host: a dark crystal turning on its axis, its edges and core alight
  ice(K, o, e) {
    const { part, mat, glow, group, T } = K,
      black = e.kind === 'blackice',
      s = ((e.d && e.d.scale) || 1) * (black ? 11 : 7),
      g = new T.OctahedronGeometry(1, 0);
    o.P.spin = group(0, s * 1.6, 0);
    const c = part(g, mat(black ? '#05070c' : '#082233', 0.25, 0.6), s, s * 1.15, s, 0, 0, 0, o.P.spin);
    o.P.edgeMat = new T.LineBasicMaterial({
      color: new T.Color(black ? '#ff3d8b' : '#45d2ff').multiplyScalar(2),
      toneMapped: false
    });
    const ed = new T.LineSegments(new T.EdgesGeometry(g), o.P.edgeMat);
    ed.scale.copy(c.scale);
    o.P.spin.add(ed);
    o.P.core = part(
      R3.geo.gem,
      glow(black ? '#ff3d4a' : '#45d2ff', 3),
      black ? 3.6 : 2.2,
      black ? 3.6 : 2.2,
      black ? 3.6 : 2.2,
      0,
      0,
      0,
      o.P.spin
    );
  },
  // a street vending machine: a lit panel, buttons, a gold trim
  vend(K, o) {
    const { G3, part, mat, glow } = K;
    part(G3.box, mat('#2b2440', 0.5, 0.3), 22, 40, 14, 0, 20, 0);
    o.P.panel = part(G3.box, glow('#45d2ff', 1.6), 12, 20, 1, -2, 26, 7.1);
    for (let i = 0; i < 3; i++) part(G3.box, glow('#ff3d8b', 2), 3, 3, 1, 7, 34 - i * 6, 7.1);
    part(G3.box, mat('#0b0812', 0.6), 16, 6, 1, 0, 9, 7.1);
    part(G3.box, glow('#ffc63d', 1.2), 22.6, 1, 14.6, 0, 40, 0);
  },
  // a loot chest: a lidded crate trimmed in its tier's colour, glowing softly
  chest(K, o) {
    const { G3, part, mat, glow, group } = K,
      tc = G.dun ? ['#efe9ff', '#efe9ff', '#45d2ff', '#ffc63d'][G.dun.b.tier] : '#ffc63d';
    part(G3.box, mat('#2a2238', 0.5, 0.3), 24, 16, 14, 0, 8, 0);
    o.P.lid = group(0, 16, -7);
    part(G3.box, mat('#3a3050', 0.45, 0.3), 26, 5, 15, 0, 2.5, 7, o.P.lid);
    part(G3.box, glow(tc, 1.8), 26.6, 1, 15.6, 0, 0.2, 7, o.P.lid);
    part(G3.box, glow(tc, 2.4), 4, 5, 1, 0, 9, 7.2);
  },
  // a vault door with a lock light that pulses until it's cracked
  vault(K, o) {
    const { G3, part, mat, glow } = K;
    part(G3.box, mat('#2a2e3e', 0.3, 0.7), 28, 30, 8, 0, 15, 0);
    part(new THREE.TorusGeometry(7, 1.1, 5, 18), glow('#ffc63d', 1.6), 1, 1, 1, 0, 15, 4.2);
    o.P.lock = part(G3.box, glow('#ff3d4a', 2.4), 3, 3, 1, 10.5, 25.5, 4.2);
  },
  // a data node in the Host: a crystal spire with a pulsing core
  node(K, o) {
    const { part, mat, glow, T } = K,
      g = new T.OctahedronGeometry(1, 0);
    o.P.spire = part(g, mat('#0b2a3a', 0.25, 0.6), 9, 18, 9, 0, 18, 0);
    const ed = new T.LineSegments(
      new T.EdgesGeometry(g),
      new T.LineBasicMaterial({ color: new T.Color('#45d2ff').multiplyScalar(2), toneMapped: false })
    );
    ed.scale.copy(o.P.spire.scale);
    ed.position.copy(o.P.spire.position);
    K.body.add(ed);
    o.P.core = part(R3.geo.gem, glow('#45d2ff', 2.6), 3.5, 3.5, 3.5, 0, 18, 0);
  },
  // a hostage: zip-tied on the floor, standing and waving once freed
  hostage(K, o, e) {
    const { G3, part, mat, glow, group } = K,
      c = e.pal || { skin: '#c98a6b', coat: '#6b6280' };
    o.P.fig = group(0, 0, 0);
    o.P.legs = part(G3.box, mat('#22202c', 0.8), 11, 6, 8, 0, 3, 0, o.P.fig);
    o.P.coat = part(G3.box, mat(c.coat, 0.8), 14, 18, 9, 0, 15, 0, o.P.fig);
    o.P.head = part(G3.head, mat(c.skin, 0.55), 5, 5.2, 5, 0, 29, 0, o.P.fig);
    o.P.arm = part(G3.cyl, mat(c.skin, 0.55), 1.5, 12, 1.5, 7, 38, 0, o.P.fig);
    o.P.tie = part(G3.box, glow('#ffc63d', 1.4), 16, 2, 9.5, 0, 12, 0, o.P.fig);
    o.P.mark = part(G3.gem, glow('#7dffb0', 2), 3, 3, 3, 0, 44, 0);
  }
};
/* ---------- each frame: pose the model from the entity's state ---------- */
const R3_ANIM = {
  drone(o, e) {
    const P = o.P;
    for (let i = 0; i < P.rotors.length; i++) P.rotors[i].rotation.y = G.t * 0.9 + i;
    o.body.rotation.z = e.state === 'dead' ? -e.t * 0.2 : e.state === 'walk' ? -0.12 : 0;
    o.body.position.y = Math.sin(G.t * 0.12 + e.x) * 1.2;
    P.eye.material.color.set(e.state === 'aim' && e.t % 6 < 3 ? '#ffffff' : '#ff3d4a').multiplyScalar(2.4);
  },
  hound(o, e) {
    const P = o.P,
      st = e.state,
      run = st === 'walk' || st === 'lunge',
      leap = st === 'lunge' && e.z > 0,
      ph = e.walk * 0.35,
      lying = st === 'down' || st === 'dead';
    o.body.rotation.z = lying
      ? e.z > 0
        ? 0.6
        : -Math.PI * 0.08
      : run && !leap
        ? -Math.sin(ph) * 0.07
        : st === 'windup'
          ? 0.12
          : 0;
    o.body.position.y = lying ? -2 : st === 'windup' ? -1.5 : 0;
    o.body.scale.set(leap ? 1.12 : 1, leap ? 0.92 : 1, 1);
    for (const L of P.legs) {
      const sw = leap ? (L.back ? -0.9 : 0.9) : run ? Math.sin(ph + L.ph) * 0.55 : 0;
      L.hip.rotation.z = sw;
      L.knee.rotation.z = (L.back ? -1 : 1) * (run && !leap ? Math.max(0, Math.cos(ph + L.ph)) * 0.6 : 0.15);
    }
    P.head.position.y = 17 + (run ? Math.sin(ph * 2) * 0.8 : 0);
    for (let i = 0; i < P.fire.length; i++) P.fire[i].scale.y = 3 + Math.sin(G.t * 0.5 + i * 1.7) * 1.4;
    P.tail.rotation.z = Math.sin(G.t * 0.4 + e.x) * 0.25;
    P.eyes.material.color.set(st === 'windup' || st === 'lunge' ? '#fff3c4' : '#ffc63d').multiplyScalar(2.6);
  },
  mech(o, e) {
    const P = o.P,
      st = e.state,
      ph = e.walk * 0.18,
      bob = st === 'walk' ? -Math.abs(Math.cos(ph)) * 1.6 : 0,
      stomp = (st === 'slam' && e.t < 24 ? -Math.min(6, e.t * 0.5) : 0) + bob,
      kick = st === 'shoot' || (st === 'aim' && e.t % 10 < 2) ? -2 : 0;
    P.hull.position.set(kick, 33 + stomp, 0);
    o.body.rotation.z = st === 'dead' ? -Math.min(0.5, e.t * 0.02) : 0;
    for (const L of P.legs) {
      const sw = st === 'walk' ? Math.sin(ph + L.a) * 5 : 0,
        lift = st === 'walk' ? Math.max(0, Math.sin(ph + L.a)) * 3 : 0;
      // hip (0, 24 + stomp) → knee (6 + sw * .4, 13 + lift) → foot (sw, lift): reverse-jointed, as in 2D
      L.hip.position.y = 24 + stomp;
      const kx = 6 + sw * 0.4,
        ky = 13 + lift - (24 + stomp),
        fx = sw,
        fy = lift - (24 + stomp);
      r3Seg(L.th, 0, 0, 0, kx, ky, 0, 2.4);
      r3Seg(L.sh, kx, ky, 0, fx, fy + 1, 0, 2);
      L.foot.position.set(fx, fy + 1.3, 0);
    }
    const turning = (e.turnT || 0) > 0,
      v = Math.min(1.4, 0.55 + 0.35 * Math.sin(G.t * 0.2) + (turning ? 0.5 : 0));
    P.vent.material.color.set('#ffc63d').multiplyScalar(1 + v * 1.6);
    P.visor.material.color.set(st === 'aim' && (e.t >> 1) % 2 ? '#ffffff' : '#ff3d4a').multiplyScalar(2.4);
  },
  dragon(o, e) {
    const P = o.P,
      st = e.state,
      air = e.ph === 'air' || e.ph === 'takeoff' || e.ph === 'dive',
      flap = air ? Math.sin(G.t * 0.22) : Math.sin(G.t * 0.04) * 0.25,
      breath = st === 'breath' || (e.br && e.br.t > 0),
      swipe = st === 'swipe' && e.t >= 12 && e.t <= 22,
      walk = st === 'walk' ? e.walk * 0.15 : 0;
    o.body.rotation.z = st === 'dead' ? -Math.min(0.4, e.t * 0.01) : 0;
    o.body.position.y =
      e.z === 0 ? (st === 'walk' ? -Math.abs(Math.sin(walk)) * 1.5 : Math.sin(G.t * 0.05) * 0.6) : 0;
    const hx = breath ? 26 : swipe ? 34 : 28,
      hy = breath ? 52 : swipe ? 34 : 46;
    P.head.position.set(hx, hy, 0);
    P.head.rotation.z = breath ? 0.35 : swipe ? -0.3 : 0;
    r3Seg(P.neck, 12, 28, 0, hx - 3, hy - 3, 0, 4);
    P.throat.visible = breath;
    if (breath) P.throat.scale.setScalar(3 + Math.sin(G.t * 0.5));
    for (let i = 0; i < P.tail.length; i++)
      P.tail[i].rotation.z =
        Math.sin(G.t * 0.07 - i * 0.6) * 0.18 + (st === 'tail' && e.t > 16 && e.t < 30 ? 0.25 : 0);
    for (const L of P.legs) {
      L.hip.visible = true;
      L.hip.rotation.z = air ? -0.5 : st === 'walk' ? Math.sin(walk + L.ph) * 0.35 : 0;
    }
    for (const W of P.wings) W.hinge.rotation.x = W.side * (-0.35 - flap * 0.7);
  },
  spirit(o, e) {
    const P = o.P,
      dead = e.state === 'dead',
      a = dead ? Math.max(0, 1 - e.t / 20) : 1;
    P.balls.forEach((b, i) => {
      const ph = G.t * 0.25 + i * 1.3,
        r = Math.max(1.5, 9 - i * 1.4) * a;
      b.position.set(Math.sin(ph) * 2, 8 + i * 4 + Math.abs(Math.cos(ph)) * 2, 0);
      b.scale.setScalar(r);
    });
    P.eyes.visible = !dead;
  },
  turret(o, e) {
    const P = o.P,
      dead = e.state === 'dead',
      eye = dead
        ? '#3a3150'
        : e.stunT > 0
          ? (G.t >> 2) % 2
            ? '#45d2ff'
            : '#1a1622'
          : e.team === 0
            ? '#7dffb0'
            : '#ff3d4a';
    P.eye.material.color.set(eye).multiplyScalar(dead ? 1 : 2.4);
    P.flash.visible = e.flash > 0 && !dead;
    P.head.rotation.z = dead ? -0.3 : 0;
  },
  ice(o, e) {
    const P = o.P;
    P.spin.rotation.y = G.t * 0.05 + e.x * 0.01;
    const s = e.state === 'dead' ? Math.max(0.01, 1 - e.t / 30) : 1;
    P.spin.scale.setScalar(s);
    P.edgeMat.color
      .set(e.enraged ? '#ff3d8b' : e.kind === 'blackice' ? '#ff3d8b' : '#45d2ff')
      .multiplyScalar(2);
    if (e.kind !== 'blackice')
      P.core.material.color.set(e.state === 'aim' && e.t % 6 < 3 ? '#ffffff' : '#45d2ff').multiplyScalar(3);
  },
  vend(o, e) {
    o.P.panel.material.color
      .set('#45d2ff')
      .multiplyScalar(e.state === 'dead' ? 0.2 : 1.4 + 0.2 * Math.sin(G.t * 0.1 + e.x));
  },
  chest(o, e) {
    o.P.lid.rotation.z = 0;
    o.P.lid.rotation.x = e.state === 'dead' ? -Math.min(1.6, e.t * 0.12) : 0;
  },
  vault(o) {
    o.P.lock.material.color.set((G.t >> 4) % 2 ? '#ff3d4a' : '#ffc63d').multiplyScalar(2.4);
  },
  node(o, e) {
    const h = 1 + Math.sin(G.t * 0.1 + e.x) * 0.06;
    o.P.spire.scale.set(9, 18 * h, 9);
    o.P.core.material.color
      .set('#45d2ff')
      .multiplyScalar(1.4 + 1.2 * (0.5 + 0.5 * Math.sin(G.t * 0.2 + e.x)));
  },
  hostage(o, e) {
    const P = o.P,
      up = e.freed,
      bob = up ? Math.sin(G.t * 0.3) * 2 : Math.sin(G.t * 0.08) * 0.6;
    P.legs.scale.y = up ? 16 : 6;
    P.legs.position.y = up ? 8 : 3;
    P.coat.position.y = (up ? 25 : 15) + bob * 0.3;
    P.head.position.y = (up ? 39 : 29) + bob * 0.3;
    P.arm.visible = !!up;
    P.arm.position.y = 44 + bob;
    P.tie.visible = !up;
    P.mark.visible = !up && e.state !== 'dead';
    P.mark.rotation.y = G.t * 0.06;
  }
};
// place, light and animate a model; returns false when it's hidden this frame
function r3PlaceBeast(o, e) {
  const dead = e.state === 'dead',
    fa = fogAlpha(e),
    blink = (e.inv > 0 && e.state !== 'down' && (G.t >> 2) % 2) || (dead && e.t > 40 && (G.t >> 2) % 2),
    passive = e.d && e.d.passive,
    gone = dead && passive && e.t > 40,
    sc = ((e.d && e.d.scale) || e.scale || 1) * (e.mini ? 0.7 : 1),
    s =
      o.beast === 'ice' || o.beast === 'drone' || o.beast === 'spirit' || passive || o.beast === 'turret'
        ? 1
        : sc,
    Zw = zOf(e.y);
  o.root.visible = fa > 0 && !blink && !gone;
  o.shadow.visible = fa > 0 && !gone;
  o.shadow.position.set(e.x, 0.4, Zw);
  const sw = (o.beast === 'dragon' ? 70 : o.beast === 'mech' ? 44 : 26) * sc * Math.max(0.4, 1 - e.z / 160);
  o.shadow.scale.set(sw, 1, sw * 0.55);
  o.ring.visible = !!(e.elite && !dead && o.root.visible);
  if (o.ring.visible) {
    o.ring.position.set(e.x, 0.8, Zw);
    o.ring.scale.set(18 * sc, 1, 11 * sc);
    o.ring.material.color.set(ELITES[e.elite].col).multiplyScalar(1.6 + 0.6 * Math.sin(G.t * 0.2));
  }
  if (!o.root.visible) return false;
  o.root.position.set(e.x, e.z, Zw);
  o.root.scale.set((e.face || 1) * s, s, s);
  // a hit turns it white for a frame
  const fl = e.flash > 0 && e.flash % 2;
  if (o.fl !== fl) {
    o.fl = fl;
    for (const m of o.mats) {
      m.emissive.set(fl ? '#ffffff' : '#000000');
      m.emissiveIntensity = fl ? 0.9 : 1;
    }
  }
  (R3_ANIM[o.beast] || (() => {}))(o, e);
  return true;
}
