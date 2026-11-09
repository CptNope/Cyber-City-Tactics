/* Cyber City Tactics · src/js/render/r3figs.js
 * Everyone in the 3D view. Fighters are low-poly puppets driven by the same pose the 2D figure eases toward
 * every frame (hips, shoulders, hands, feet, knee bend, lean), so every punch, throw and stagger is the one the
 * game already animates. Creatures and machines without a puppet (drones, mechs, hounds, the dragon, vending
 * machines, bikes) are their 2D drawings on camera-facing cards, so nothing is ever missing. Also here: ground
 * shadows, elite rings, street props, and particles as glowing points.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
// a 2D context that draws nothing: running drawFig against it keeps each fighter's pose current without
// painting anything
const R3NULL = (() => {
  const o = {},
    grad = { addColorStop() {} };
  const P = typeof CanvasRenderingContext2D !== 'undefined' ? CanvasRenderingContext2D.prototype : {};
  for (const k of Object.getOwnPropertyNames(P)) {
    const d = Object.getOwnPropertyDescriptor(P, k);
    if (d && typeof d.value === 'function') o[k] = () => {};
  }
  o.measureText = () => ({ width: 0 });
  o.createLinearGradient = o.createRadialGradient = o.createConicGradient = () => grad;
  o.createPattern = () => null;
  o.getTransform = () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
  o.globalAlpha = 1;
  return o;
})();
const R3_PROPS = { can: 1, crate: 1, drum: 1 };
/* ---------- shared pieces ---------- */
function r3InitFigs() {
  const T = THREE,
    F = R3;
  F.figs = new T.Group();
  F.scene.add(F.figs);
  F.geo = {
    cyl: new T.CylinderGeometry(1, 1, 1, 6),
    tor: new T.CylinderGeometry(1, 0.86, 1, 4, 1),
    head: new T.IcosahedronGeometry(1, 1),
    gem: new T.IcosahedronGeometry(1, 0),
    box: new T.BoxGeometry(1, 1, 1),
    cap: new T.SphereGeometry(1, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2),
    ring: new T.TorusGeometry(1, 0.08, 4, 24),
    disc: new T.PlaneGeometry(1, 1)
  };
  F.geo.tor.rotateY(Math.PI / 4);
  F.geo.ring.rotateX(Math.PI / 2);
  F.geo.disc.rotateX(-Math.PI / 2);
  // a soft round shadow
  const sc = document.createElement('canvas');
  sc.width = sc.height = 64;
  const g = sc.getContext('2d'),
    gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  gr.addColorStop(0, 'rgba(0,0,0,0.75)');
  gr.addColorStop(0.6, 'rgba(0,0,0,0.35)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  F.shadowMat = new T.MeshBasicMaterial({
    map: new T.CanvasTexture(sc),
    transparent: true,
    depthWrite: false,
    toneMapped: false
  });
  F.pool = new Map(); // entity → its 3D object
  F.propPool = new Map();
  F.tmpQ = new T.Quaternion();
  F.up = new T.Vector3(0, 1, 0);
  F.a = new T.Vector3();
  F.b = new T.Vector3();
  F.col = new T.Color();
  r3InitParts();
  // one puppet and one card kept far below the street, so their shaders compile with each district
  const warm = r3Puppet();
  warm.root.position.y = warm.shadow.position.y = warm.ring.position.y = -5000;
  const wc = r3Card({ d: {} });
  wc.card.position.y = -5000;
}
// a limb segment from a to b: a stretched cylinder
function r3Seg(m, ax, ay, az, bx, by, bz, r) {
  const F = R3,
    a = F.a.set(ax, ay, az),
    d = F.b.set(bx - ax, by - ay, bz - az),
    L = d.length() || 0.001;
  m.position.set(ax + d.x / 2, ay + d.y / 2, az + d.z / 2);
  m.quaternion.setFromUnitVectors(F.up, d.multiplyScalar(1 / L));
  m.scale.set(r, L, r);
  return a;
}
function r3Mat(hex, rough, emis) {
  const m = new THREE.MeshStandardMaterial({
    color: hex,
    roughness: rough === undefined ? 0.62 : rough,
    metalness: 0.05,
    flatShading: true,
    envMapIntensity: 0.6
  });
  if (emis) {
    m.emissive.set(emis);
    m.emissiveIntensity = 2.2;
  }
  m.userData.base = hex;
  return m;
}
const R3ROLES = ['skin', 'coat', 'coat2', 'pants', 'boot', 'hair', 'acc', 'arm', 'dark'];
/* ---------- the puppet ---------- */
function r3Puppet() {
  const T = THREE,
    G3 = R3.geo,
    root = new T.Group(),
    pivot = new T.Group(),
    inner = new T.Group(),
    body = new T.Group();
  root.add(pivot);
  pivot.add(inner);
  inner.add(body);
  const mats = {};
  for (const r of R3ROLES) mats[r] = r3Mat('#888888', r === 'skin' ? 0.55 : r === 'boot' ? 0.4 : 0.7);
  mats.glow = new T.MeshBasicMaterial({ color: '#45d2ff', toneMapped: false });
  mats.metal = r3Mat('#8a8f9c', 0.3);
  mats.metal.metalness = 0.7;
  const m = (geo, mat) => {
    const x = new T.Mesh(geo, mat);
    body.add(x);
    return x;
  };
  const P = {
    root,
    pivot,
    inner,
    body,
    mats,
    // back limbs first, in their colours; the front set gets its colours each frame
    bArmU: m(G3.cyl, mats.coat2),
    bArmL: m(G3.cyl, mats.coat2),
    bHand: m(G3.gem, mats.skin),
    bThigh: m(G3.cyl, mats.pants),
    bShin: m(G3.cyl, mats.pants),
    bKnee: m(G3.gem, mats.pants),
    bBoot: m(G3.box, mats.boot),
    hips: m(G3.box, mats.pants),
    torso: m(G3.tor, mats.coat),
    tails: m(G3.box, mats.coat2),
    fThigh: m(G3.cyl, mats.pants),
    fShin: m(G3.cyl, mats.pants),
    fKnee: m(G3.gem, mats.pants),
    fBoot: m(G3.box, mats.boot),
    neck: m(G3.cyl, mats.skin),
    head: m(G3.head, mats.skin),
    hair: m(G3.cap, mats.hair),
    helm: m(G3.box, mats.acc),
    eyes: m(G3.box, mats.glow),
    fArmU: m(G3.cyl, mats.arm),
    fArmL: m(G3.cyl, mats.arm),
    fElbow: m(G3.gem, mats.arm),
    fHand: m(G3.gem, mats.skin),
    wpn: m(G3.box, mats.metal),
    wpn2: m(G3.box, mats.dark),
    orb: m(G3.gem, new T.MeshBasicMaterial({ color: '#ff6a3d', toneMapped: false, transparent: true })),
    shield: m(G3.box, new T.MeshStandardMaterial({ color: '#9fb4d8', transparent: true, opacity: 0.45 }))
  };
  const shadow = new T.Mesh(G3.disc, R3.shadowMat);
  shadow.renderOrder = 1;
  const ring = new T.Mesh(G3.ring, new T.MeshBasicMaterial({ color: '#ff3d4a', toneMapped: false }));
  P.shadow = shadow;
  P.ring = ring;
  R3.figs.add(root, shadow, ring);
  return P;
}
// colour every role from the fighter's palette; a hit flash turns them all white for a frame
function r3Paint(P, e, rig) {
  const pal = e.pal || {},
    fl = e.flash > 0 && e.flash % 2,
    isP = e.kind === 'player',
    armor =
      isP && e.eq && e.eq.armor && e.eq.armor.rar
        ? ['', e.idx ? '#6a2f80' : '#1d3f63', '#4a3a18', '#3a2a50', '#4a3010'][e.eq.armor.rar]
        : null,
    cyb = isP && e.cy && e.cy.arm > 0,
    elem = e.state === 'dead' ? e.elem : null,
    ch = elem === 'fire' ? Math.min(0.8, e.t / 30) : 0,
    style = rig.style;
  const want = {
    skin: pal.skin || '#c98a6b',
    coat: armor || pal.coat || '#3a3048',
    coat2: pal.coat2 || pal.coat || '#2a2236',
    pants: pal.pants || '#22202c',
    boot: pal.boot || '#141018',
    hair: pal.hair || '#1b1520',
    acc: pal.acc || '#45d2ff',
    arm:
      style === 'runner'
        ? cyb
          ? pal.cyber || '#c9f4ff'
          : armor || pal.coat || '#3a3048'
        : style === 'blade'
          ? '#c9d2e6'
          : pal.coat || '#3a3048',
    dark: '#1a1622'
  };
  const key = (fl ? 'F' : '') + ch.toFixed(2) + want.coat + want.arm + want.skin;
  if (P.paintKey === key && P.palRef === pal) return;
  P.paintKey = key;
  P.palRef = pal;
  for (const r of R3ROLES) {
    const mt = P.mats[r];
    if (fl) {
      mt.color.set('#ffffff');
      mt.emissive.set('#ffffff');
      mt.emissiveIntensity = 0.8;
    } else {
      mt.color.set(want[r]);
      if (ch) mt.color.lerp(R3.col.set('#1a1418'), ch);
      mt.emissive.set('#000000');
      mt.emissiveIntensity = 1;
    }
  }
  // cyber arms and runner accents glow faintly
  if (!fl && cyb) {
    P.mats.arm.emissive.set(pal.acc || '#45d2ff');
    P.mats.arm.emissiveIntensity = 0.25;
  }
  // eyes: a visor in the runner's accent, elites' eyes in their colour, everyone else dark
  const eye = e.elite === 'berserk' || e.elite === 'vampiric' ? ELITES[e.elite].col : isP ? pal.acc : null;
  P.mats.glow.color.set(eye || '#120c18');
  if (eye) P.mats.glow.color.multiplyScalar(2.2);
}
const HAIRLESS = { helmet: 1, riot: 1, ghoul: 1, sec: 1 };
const LONGCOAT = { runner: 1, mage: 1, doc: 1, beard: 1, vamp: 1 };
// Pose the puppet from the 2D figure's eased pose (local 2D coordinates: x forward, y down)
function r3Pose(P, e) {
  const p = e._pose,
    rig = e._rig || {},
    st = e.state,
    t = e.t;
  if (!p) return false;
  const style = rig.style || 'runner';
  r3Paint(P, e, rig);
  const hip = [p[0], -p[1]],
    sh0 = [p[2] + p[14], -p[3]],
    ff = [p[4], -p[5]],
    bf = [p[6], -p[7]],
    fh = [p[8], -p[9]],
    bh = [p[10], -p[11]],
    fkb = p[12],
    bkb = p[13];
  const knee = (a, c, bend) => {
    // the 2D joint(): bend sideways from the a→c line (flipped for y up)
    const mx = (a[0] + c[0]) / 2,
      my = (a[1] + c[1]) / 2,
      dx = c[0] - a[0],
      dy = c[1] - a[1],
      L = Math.hypot(dx, dy) || 1;
    return [mx + (dy / L) * bend, my - (dx / L) * bend];
  };
  const ZF = 3.2,
    ZB = -3.2;
  // legs
  const hb = [hip[0] - 2, hip[1]],
    hf = [hip[0] + 2, hip[1]],
    kb = knee(hb, bf, -bkb),
    kf = knee(hf, ff, -fkb);
  r3Seg(P.bThigh, hb[0], hb[1], ZB, kb[0], kb[1], ZB, 2.5);
  r3Seg(P.bShin, kb[0], kb[1], ZB, bf[0], bf[1] + 1.5, ZB, 2.2);
  P.bKnee.position.set(kb[0], kb[1], ZB);
  P.bKnee.scale.setScalar(2.5);
  P.bBoot.position.set(bf[0] + 0.8, bf[1] + 1.4, ZB);
  P.bBoot.scale.set(7.5, 3.2, 4.6);
  r3Seg(P.fThigh, hf[0], hf[1], ZF, kf[0], kf[1], ZF, 2.5);
  r3Seg(P.fShin, kf[0], kf[1], ZF, ff[0], ff[1] + 1.5, ZF, 2.2);
  P.fKnee.position.set(kf[0], kf[1], ZF);
  P.fKnee.scale.setScalar(2.5);
  P.fBoot.position.set(ff[0] + 0.8, ff[1] + 1.4, ZF);
  P.fBoot.scale.set(7.5, 3.2, 4.6);
  // hips and torso: a tapered block from the hips to the shoulders
  P.hips.position.set(hip[0], hip[1] - 1, 0);
  P.hips.scale.set(11, 5, 9);
  P.hips.rotation.set(0, 0, 0);
  const tx = sh0[0] - hip[0],
    ty = sh0[1] - hip[1];
  r3Seg(P.torso, hip[0], hip[1] - 1, 0, sh0[0], sh0[1] + 1, 0, 1);
  P.torso.scale.set(6.6, Math.hypot(tx, ty) + 2, 5.2);
  // a long coat's tails, swinging with the stride
  P.tails.visible = !!LONGCOAT[style];
  if (P.tails.visible) {
    const sw = (st === 'walk' ? Math.sin(e.walk * 0.2) * 2 : 0) - (p[14] || 0) * 0.5;
    r3Seg(P.tails, hip[0] - 1, hip[1] + 4, -1.5, hip[0] - 3 + sw, hip[1] - 12, -2.5, 1);
    P.tails.scale.set(12, P.tails.scale.y, 7.5);
  }
  // head
  const hd = [sh0[0] + 1, sh0[1] + 7.5];
  r3Seg(P.neck, sh0[0], sh0[1], 0, hd[0], hd[1] - 3, 0, 1.8);
  P.head.position.set(hd[0], hd[1], 0);
  P.head.scale.set(5.3, 5.8, 5);
  const helm = HAIRLESS[style];
  P.hair.visible = !helm;
  P.hair.position.set(hd[0] - 0.8, hd[1] + 0.6, 0);
  P.hair.scale.set(5.9, 5.6, 5.5);
  P.hair.rotation.set(0, 0, 0.22);
  P.helm.visible = style === 'helmet' || style === 'riot' || style === 'sec';
  if (P.helm.visible) {
    P.helm.position.set(hd[0], hd[1] + 1.5, 0);
    P.helm.scale.set(12, 9.5, 11);
  }
  P.eyes.position.set(hd[0] + 4.6, hd[1] + 0.6, 0);
  P.eyes.scale.set(1.6, e.kind === 'player' || helm ? 1.6 : 1.1, e.kind === 'player' || helm ? 8 : 6);
  // arms: elbows bend back, as in 2D
  const shF = [sh0[0] + 2, sh0[1] - 1],
    shB = [sh0[0] - 2, sh0[1] - 1],
    eb = knee(shB, bh, -3),
    ef = knee(shF, fh, -3);
  r3Seg(P.bArmU, shB[0], shB[1], ZB - 1, eb[0], eb[1], ZB - 1, 2.1);
  r3Seg(P.bArmL, eb[0], eb[1], ZB - 1, bh[0], bh[1], ZB - 1, 1.8);
  P.bHand.position.set(bh[0], bh[1], ZB - 1);
  P.bHand.scale.setScalar(2.2);
  r3Seg(P.fArmU, shF[0], shF[1], ZF + 1, ef[0], ef[1], ZF + 1, 2.2);
  r3Seg(P.fArmL, ef[0], ef[1], ZF + 1, fh[0], fh[1], ZF + 1, 1.9);
  P.fElbow.position.set(ef[0], ef[1], ZF + 1);
  P.fElbow.scale.setScalar(2.2);
  P.fHand.position.set(fh[0], fh[1], ZF + 1);
  P.fHand.scale.setScalar(2.5);
  // what's in hand
  r3Held(P, e, rig, fh, ef, st, t);
  return true;
}
// melee weapon, gun, staff, spell glow, riot shield: simple shapes along the forearm
function r3Held(P, e, rig, fh, ef, st, t) {
  const isP = e.kind === 'player',
    club = e.club && CLUBS[e.club.kind],
    busy = e.holding || st === 'cast' || st === 'roll' || st === 'beg';
  let look = null;
  if (club && !rig.gun && !busy) look = club.look;
  else if (isP && e.eq && e.eq.weapon && !rig.gun && !busy && st !== 'grab')
    look = e.eq.weapon.look || 'pipe';
  else if (rig.style === 'blade') look = 'blade';
  P.wpn.visible = P.wpn2.visible = false;
  if (look || rig.gun || rig.staff) {
    // the blade points along the forearm when swinging, raised when at rest
    let ang = Math.atan2(fh[1] - ef[1], fh[0] - ef[0]);
    if (!rig.swing && !rig.gun) ang += 0.9;
    const len = rig.gun
        ? 9
        : rig.staff
          ? 26
          : { knucks: 3, pipe: 12, bat: 14, chain: 13, katana: 20, blade: 13, axe: 13, hammer: 13 }[look] ||
            12,
      w = rig.gun ? 3.2 : look === 'bat' ? 2.6 : look === 'knucks' ? 4 : 1.5;
    P.wpn.visible = true;
    const cx = fh[0] + Math.cos(ang) * (len / 2 + 1),
      cy = fh[1] + Math.sin(ang) * (len / 2 + 1);
    P.wpn.position.set(cx, cy, 4.6);
    P.wpn.rotation.set(0, 0, ang);
    P.wpn.scale.set(len, w, rig.gun ? 2.4 : 1.4);
    const metal = {
      pipe: '#8a8f9c',
      katana: '#e9f6ff',
      blade: '#e9f6ff',
      chain: '#9aa2b4',
      knucks: '#ffc63d'
    }[look];
    P.mats.metal.color.set(
      rig.gun ? '#2a2836' : rig.staff ? '#8a5a3a' : look === 'bat' ? '#8a5a3a' : metal || '#8a8f9c'
    );
    // the grip, with the maker's colour
    P.wpn2.visible = !rig.staff;
    P.wpn2.position.set(fh[0] + Math.cos(ang) * 1.2, fh[1] + Math.sin(ang) * 1.2, 4.6);
    P.wpn2.rotation.set(0, 0, ang);
    P.wpn2.scale.set(4, rig.gun ? 4.5 : 2.6, 2.6);
  }
  // a spell gathering in the hand
  P.orb.visible = rig.glow > 0;
  if (P.orb.visible) {
    let gc = e.team ? '#45d2ff' : '#ff6a3d';
    if (isP && e.spells) {
      const id = e.spells[e.spell];
      gc =
        id === 'bolt' || id === 'chain'
          ? '#b98cff'
          : id === 'heal'
            ? '#7dffb0'
            : id === 'barrier'
              ? '#45d2ff'
              : gc;
    }
    P.orb.material.color.set(gc).multiplyScalar(3);
    P.orb.material.opacity = Math.min(1, 0.5 + rig.glow);
    P.orb.position.set(fh[0] + 4, fh[1], 5);
    P.orb.scale.setScalar(2 + rig.glow * 3 + Math.sin(G.t * 0.6) * 0.5);
  }
  P.shield.visible = rig.style === 'riot' && st !== 'grabbed';
  if (P.shield.visible) {
    P.shield.position.set(fh[0] + 3, fh[1] - 2 - 13, 7);
    P.shield.scale.set(2, 30, 14);
  }
}
// The whole-body turn for falls, rolls, grabs and pile drivers, as drawFig does it (in its mirrored frame)
function r3Body(P, e, sq) {
  const st = e.state,
    t = e.t,
    lying = st === 'down' || st === 'dead',
    rk = e.react,
    elem = st === 'dead' ? e.elem : null,
    fwd = st === 'dead' && rk === 'light' && !elem;
  const pv = P.pivot,
    inn = P.inner;
  pv.position.set(0, 0, 0);
  pv.rotation.set(0, 0, 0);
  inn.position.set(0, 0, 0);
  if (e.flip) {
    pv.position.set(0, 24, 0);
    pv.rotation.z = Math.PI;
    inn.position.set(0, -24, 0);
  } else if (lying) {
    if (e.z > 0) {
      pv.rotation.z =
        rk === 'spin'
          ? t * 0.42
          : rk === 'launch'
            ? Math.min(2.4, t * 0.09)
            : -(fwd ? 1 : -1) * Math.min(1.5, t * 0.12);
    } else if (fwd) {
      pv.position.set(6, 4, 0);
      pv.rotation.z = -Math.PI / 2;
    } else {
      pv.position.set(-6, 4, 0);
      pv.rotation.z = Math.PI / 2 - (elem === 'shock' && t % 14 < 2 ? 0.06 : 0);
    }
  } else if (st === 'roll') {
    pv.position.set(0, 12, 0);
    pv.rotation.z = -(t / 22) * Math.PI * 2;
    inn.position.set(0, -12, 0);
  } else if (st === 'grabbed') pv.rotation.z = -0.15;
  P.body.scale.set(sq ? sq[0] : 1, sq ? sq[1] : 1, 1);
}
/* ---------- cards for everything without a puppet ---------- */
function r3CardSize(e) {
  const d = e.d || {},
    sc = d.scale || e.scale || 1;
  if (d.dragon) return [300, 240];
  if (e.veh || e.air || e.kind === 'vtol') return [240, 170];
  if (d.mech) return [150 * sc, 150 * sc];
  if (d.quad) return [100 * sc, 80 * sc];
  return [110 * sc, 110 * sc];
}
function r3Card(e) {
  const T = THREE,
    [w, h] = r3CardSize(e),
    res = 2,
    cv = document.createElement('canvas');
  cv.width = Math.ceil(w * res);
  cv.height = Math.ceil(h * res);
  const tex = new T.CanvasTexture(cv);
  tex.colorSpace = T.SRGBColorSpace;
  const mat = new T.SpriteMaterial({ map: tex, toneMapped: false, transparent: true, fog: false });
  const sp = new T.Sprite(mat);
  sp.center.set(0.5, 0.18);
  sp.scale.set(w, h, 1);
  R3.figs.add(sp);
  return { card: sp, cv, g: cv.getContext('2d'), tex, w, h, res };
}
// draw the 2D figure into the card, its feet at the card's anchor
function r3DrawCard(C, e) {
  const g = C.g,
    keep = ctx;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, C.cv.width, C.cv.height);
  g.setTransform(C.res, 0, 0, C.res, C.res * (C.w / 2 - (e.x - G.camX)), C.res * (C.h * 0.82 - e.y));
  ctx = g;
  try {
    if (e.air || e.kind === 'vtol') drawAir(e);
    else if (e.drone) drawDroneP(e);
    else if (e.veh) drawVehicle(e);
    else {
      if (e.bk && e.ride) drawBike(e);
      drawFig(e);
    }
  } finally {
    ctx = keep;
  }
  C.tex.needsUpdate = true;
}
const r3Puppeted = e =>
  !(e.air || e.kind === 'vtol' || e.drone || e.veh || e.mist > 0) &&
  !(
    e.d &&
    (e.d.turret || e.d.passive || e.d.ice || e.d.spirit || e.d.fly || e.d.quad || e.d.mech || e.d.dragon)
  );
/* ---------- each frame ---------- */
function r3UpdateFigs() {
  const F = R3,
    seen = new Set();
  // the Den's shopkeepers stand outside the entity list; drawing them once keeps their figure current
  if (G.den) {
    const keep = ctx;
    ctx = R3NULL;
    try {
      for (const n of NPCS) drawNPC(n);
    } finally {
      ctx = keep;
    }
  }
  const list = G.den ? G.ents.concat(NPCS.map(n => npcEnt[n.id]).filter(Boolean)) : G.ents;
  for (const e of list) {
    seen.add(e);
    let o = F.pool.get(e);
    // a puppet for fighters, a model for creatures and machines, the 2D drawing on a card for the rest
    const beast = r3Puppeted(e) ? null : r3BeastKind(e),
      pup = r3Puppeted(e) ? 'pup' : beast || 'card';
    if (o && o.pup !== pup) {
      r3Drop(o);
      o = null;
    }
    if (!o) {
      o = pup === 'pup' ? r3Puppet() : beast ? r3Beast(beast, e) : r3Card(e);
      o.pup = pup;
      F.pool.set(e, o);
    }
    r3Place(o, e);
  }
  for (const [e, o] of F.pool)
    if (!seen.has(e)) {
      r3Drop(o);
      F.pool.delete(e);
    }
  r3UpdateProps();
  r3UpdateParts();
}
function r3Ride(o, e, X, Zw) {
  const bk = e.bk && e.ride && !e.bk.pass ? e.bk : null;
  if (!bk) {
    if (o.bike) o.bike.root.visible = false;
    return;
  }
  if (!o.bike) o.bike = bk.car ? r3BeastOf('car', e) : r3Bike((e.pal && e.pal.acc) || '#ff3d8b');
  const b = o.bike,
    down = e.state === 'dead' || e.state === 'down';
  b.root.visible = o.root.visible || down;
  b.root.position.set(X, down ? 0 : e.z, Zw);
  b.root.scale.set(e.face || 1, down ? 0.45 : 1, 1);
  if (b.beast) b.root.scale.multiplyScalar(VEH_SCALE * 0.8);
  for (const w of b.P.wheels) w.rotation.z = -(e.walk || 0) * 0.28;
}
// a vehicle model used as something to sit on, not an entity of its own
function r3BeastOf(kind, e) {
  const K = r3Kit(),
    o = { beast: kind, root: K.root, body: K.body, mats: K.mats, P: {} };
  R3_BUILD[kind](K, o, e);
  R3.figs.add(K.root);
  return o;
}
function r3Drop(o) {
  if (o.bike) {
    R3.figs.remove(o.bike.root);
    r3Dispose(o.bike.root);
  }
  if (o.beast) {
    R3.figs.remove(o.root, o.shadow, o.ring);
    r3Dispose(o.root);
    o.ring.material.dispose();
  } else if (o.root) {
    R3.figs.remove(o.root, o.shadow, o.ring);
    for (const k in o.mats) o.mats[k].dispose();
    o.orb.material.dispose();
    o.shield.material.dispose();
    o.ring.material.dispose();
  } else {
    R3.figs.remove(o.card);
    o.tex.dispose();
    o.card.material.dispose();
  }
}
function r3Place(o, e) {
  const fa = fogAlpha(e),
    blinkInv = e.inv > 0 && e.state !== 'down' && e.state !== 'roll' && (G.t >> 2) % 2,
    dead = e.state === 'dead',
    blinkDead = dead && !e.elem && e.t > 40 && (G.t >> 2) % 2,
    cloak = e.cloaked && !dead,
    seen = cloak && PL.some(q => !q.out && q.cy && q.cy.eyes),
    sc = ((e.d && e.d.scale) || e.scale || 1) * (e.mini ? 0.7 : 1),
    X = e.x,
    Zw = zOf(e.y),
    vis = fa > 0 && !blinkInv && !blinkDead && !(cloak && !seen && (G.t >> 1) % 6);
  if (o.beast) {
    r3PlaceBeast(o, e);
    return;
  }
  if (!o.root) {
    o.card.visible = fa > 0;
    if (o.card.visible) {
      r3DrawCard(o, e);
      o.card.position.set(X, 0, Zw + 2);
    }
    return;
  }
  // the pose: run the 2D figure against a blank context so its pose eases on exactly as in 2D
  const keep = ctx;
  ctx = R3NULL;
  try {
    drawFig(e);
  } catch (err) {
    /* a figure that can't pose this frame keeps its last pose */
  } finally {
    ctx = keep;
  }
  const ok = r3Pose(o, e);
  o.root.visible = ok && vis;
  const big = (e.state === 'down' || dead) && e.z === 0;
  o.shadow.visible = fa > 0 && !e.flip;
  o.shadow.position.set(X, 0.4, Zw);
  const sw = (big ? 40 : 24) * sc * Math.max(0.45, 1 - e.z / 140);
  o.shadow.scale.set(sw, 1, sw * 0.55);
  if (!o.root.visible) {
    o.ring.visible = false;
    return;
  }
  const rig = e._rig || {},
    b = e.build || [1, 1];
  o.root.position.set(X, e.z, Zw);
  o.root.scale.set(e.face * sc * b[0], sc * b[1], sc);
  r3Body(o, e, e.state !== 'roll' && !big && rig.sq ? rig.sq : null);
  // elites keep a ground ring in their colour
  o.ring.visible = !!(e.elite && !dead && !cloak);
  if (o.ring.visible) {
    o.ring.position.set(X, 0.8, Zw);
    o.ring.scale.set(15 * sc, 1, 9 * sc);
    o.ring.material.color.set(ELITES[e.elite].col).multiplyScalar(1.6 + 0.6 * Math.sin(G.t * 0.2));
  }
  // the ghostly look of a cloak someone can see through
  const ghost = cloak ? (seen ? 0.55 : 0.12) : 1;
  if (o.ghost !== ghost) {
    o.ghost = ghost;
    for (const k of R3ROLES) {
      o.mats[k].transparent = ghost < 1;
      o.mats[k].opacity = ghost;
      o.mats[k].needsUpdate = true;
    }
  }
  // a prop held overhead
  if (e.holding) r3HeldProp(e, X, Zw, sc);
  // a rider's bike (or the open-top car) under them
  r3Ride(o, e, X, Zw);
}
/* ---------- street props ---------- */
function r3PropMesh(kind) {
  const T = THREE,
    G3 = R3.geo,
    g = new T.Group();
  const add = (geo, col, sx, sy, sz, y, opt) => {
    const m = new T.Mesh(geo, opt || r3Mat(col, 0.55));
    m.scale.set(sx, sy, sz);
    m.position.y = y;
    g.add(m);
    return m;
  };
  if (kind === 'crate') {
    add(G3.box, '#7a5a34', 16, 14, 14, 7);
    add(G3.box, '#a07a4a', 17, 2, 15, 13);
    add(G3.box, '#a07a4a', 17, 2, 15, 1);
  } else if (kind === 'drum') {
    const c = new T.CylinderGeometry(6.5, 6.5, 16, 10);
    add(c, '#b8322e', 1, 1, 1, 8);
    const band = new T.MeshBasicMaterial({
      color: new T.Color('#ffc63d').multiplyScalar(1.4),
      toneMapped: false
    });
    add(new T.CylinderGeometry(6.7, 6.7, 2.4, 10), null, 1, 1, 1, 7, band);
  } else {
    add(new T.CylinderGeometry(6, 6, 14, 9), '#5d6680', 1, 1, 1, 7);
    add(new T.CylinderGeometry(6.2, 6.2, 1.2, 9), '#8a93a6', 1, 1, 1, 14);
  }
  const sh = new T.Mesh(G3.disc, R3.shadowMat);
  sh.scale.set(26, 1, 14);
  sh.position.y = 0.4;
  g.add(sh);
  R3.figs.add(g);
  return g;
}
function r3UpdateProps() {
  const F = R3,
    seen = new Set();
  for (const o of G.props) {
    if (!R3_PROPS[o.kind]) continue;
    seen.add(o);
    let m = F.propPool.get(o);
    if (!m) F.propPool.set(o, (m = r3PropMesh(o.kind)));
    m.position.set(o.x, o.z || 0, zOf(o.y));
    // a thrown or kicked prop tumbles
    m.rotation.z = o.vx ? -(o.x * 0.06) : 0;
  }
  if (F.held) F.held.visible = false;
  for (const [o, m] of F.propPool)
    if (!seen.has(o)) {
      F.figs.remove(m);
      F.propPool.delete(o);
    }
}
function r3HeldProp(e, X, Zw, sc) {
  const kind = R3_PROPS[e.holding.kind] ? e.holding.kind : 'crate',
    F = R3;
  if (!F.heldBy) F.heldBy = {};
  const m = F.heldBy[kind] || (F.heldBy[kind] = r3PropMesh(kind));
  m.visible = true;
  m.children[m.children.length - 1].visible = false; // no shadow up there
  const lift = e.state === 'lift' ? Math.max(0, 10 - e.t) * 3 : 0;
  m.position.set(X, e.z + 46 * sc - lift, Zw);
  F.held = m;
}
/* ---------- particles: glowing points ---------- */
const R3COLS = new Map();
// parse a CSS colour once and remember it (particles reuse a handful of colours thousands of times)
function r3Col(css, out) {
  let v = R3COLS.get(css);
  if (v === undefined) {
    const s = String(css || '#ffffff'),
      m = s.match(/^rgba?\(([^)]+)\)/);
    const c = new THREE.Color();
    if (m) {
      const p = m[1].split(',').map(Number);
      c.setRGB(p[0] / 255, p[1] / 255, p[2] / 255, THREE.SRGBColorSpace);
    } else c.setStyle(s);
    v = c;
    if (R3COLS.size < 400) R3COLS.set(css, v);
  }
  return out.copy(v);
}
const R3_MAXP = 900;
function r3InitParts() {
  const T = THREE,
    geo = new T.BufferGeometry();
  R3.pPos = new Float32Array(R3_MAXP * 3);
  R3.pCol = new Float32Array(R3_MAXP * 3);
  R3.pSize = new Float32Array(R3_MAXP);
  geo.setAttribute('position', new T.BufferAttribute(R3.pPos, 3).setUsage(T.DynamicDrawUsage));
  geo.setAttribute('color', new T.BufferAttribute(R3.pCol, 3).setUsage(T.DynamicDrawUsage));
  geo.setAttribute('size', new T.BufferAttribute(R3.pSize, 1).setUsage(T.DynamicDrawUsage));
  const mat = new T.ShaderMaterial({
    uniforms: { uScale: { value: 1 } },
    vertexShader: `attribute float size; attribute vec3 color; varying vec3 vC;
      uniform float uScale;
      void main() { vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vC;
      void main() { vec2 d = gl_PointCoord - 0.5; float r = dot(d, d) * 4.0; if (r > 1.0) discard;
        gl_FragColor = vec4(vC * (1.4 - r), 1.0 - r * r); }`,
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    toneMapped: false
  });
  R3.parts = new T.Points(geo, mat);
  R3.parts.frustumCulled = false;
  R3.figs.add(R3.parts);
}
function r3UpdateParts() {
  const F = R3,
    n = Math.min(R3_MAXP, G.parts.length),
    P = F.pPos,
    C = F.pCol,
    S = F.pSize,
    c = F.col;
  for (let i = 0; i < n; i++) {
    const q = G.parts[i];
    P[i * 3] = q.x;
    P[i * 3 + 1] = q.z;
    P[i * 3 + 2] = zOf(q.y);
    r3Col(q.c, c);
    const a = Math.min(1, q.life / 10) * 1.6;
    C[i * 3] = c.r * a;
    C[i * 3 + 1] = c.g * a;
    C[i * 3 + 2] = c.b * a;
    S[i] = (q.sz || 2) * 1.6;
  }
  const geo = F.parts.geometry;
  geo.setDrawRange(0, n);
  for (const k of ['position', 'color', 'size']) geo.attributes[k].needsUpdate = true;
  // gl_PointSize is in pixels: a unit at distance d is (canvas height / view height) * d-scaled pixels
  F.parts.material.uniforms.uScale.value = (R3.h / VH) * (VH / (2 * Math.tan((R3_FOV * Math.PI) / 360)));
}
