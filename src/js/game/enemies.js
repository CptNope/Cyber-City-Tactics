/* Cyber City Tactics · src/js/game/enemies.js
 * Enemy AI: targeting, every attack pattern, boss rage phases.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ================= enemies ================= */
function pickTarget(e) {
  const a = alive(),
    br = G.ents.find(x => x.kind === 'ally' && x.ally === 'brick' && x.state !== 'dead');
  if (!a.length && !br) return null;
  if (e.tgt && (a.includes(e.tgt) || e.tgt === br) && e.tgt.state !== 'dead' && G.t % 30 !== 0) return e.tgt;
  let best = null,
    bd = 1e9;
  for (const p of a) {
    const d = Math.abs(p.x - e.x) + Math.abs(p.y - e.y) * 2;
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  if (br && !e.d.boss) {
    const d = (Math.abs(br.x - e.x) + Math.abs(br.y - e.y) * 2) * 0.65;
    if (d < bd) best = br;
  } // Brick draws aggro
  return best;
}

function upEnemy(e) {
  e.t++;
  if (e.flash > 0) e.flash--;
  if (e.thrown && e.z > 0) {
    for (const o of G.ents) {
      if (o === e || o.team !== 1 || o.state === 'dead' || e.thrownHit.includes(o)) continue;
      if (Math.abs(o.x - e.x) < 16 && Math.abs(o.y - e.y) < 10) {
        e.thrownHit.push(o);
        hurt(o, (10 + e.thrown.D.melee * 0.6) * (has(e.thrown, 'brute') ? 1.5 : 1), Math.sign(e.vx) || 1, {
          kd: true,
          big: true,
          src: e.thrown,
          ax: e.x
        });
      }
    }
  }
  physics(e);
  if (e.state === 'grabbed') return;
  if (e.d.passive) {
    if (e.state === 'dead') {
      if (e.t > 40) e.gone = true;
    }
    return;
  }
  if (e.state === 'dead') {
    if (e.d.fly && e.z <= 0) e.z = 0;
    if (e.t > 70) e.gone = true;
    return;
  }
  if (e.state === 'down') {
    if (e.t > 58 && (e.z === 0 || (e.d.fly && e.t > 80))) {
      setS(e, 'idle');
      e.inv = 24;
    }
    return;
  }
  if (e.state === 'hurt') {
    if (e.t > 14) setS(e, 'idle');
    return;
  }
  if (e.inv > 0) e.inv--;
  const d = e.d,
    cd = d.cool * (e.coolMul || 1);
  if (d.stealth) {
    // shadows cloak whenever they aren't attacking, and drop the cloak for a while when hit
    if (e.recloakT > 0) e.recloakT--;
    e.cloaked = !(e.recloakT > 0) && e.state !== 'windup';
  }
  if (d.pack) {
    const n = G.ents.filter(x => x.kind === e.kind && x.state !== 'dead').length;
    e.spdMul = (e.enraged ? 1.3 : 1) * (1 + 0.12 * Math.min(4, n - 1));
  }
  e.tgt = pickTarget(e);
  const p = e.tgt;
  if (d.fly && e.state !== 'vent') {
    e.hover += 0.08;
    const zt = (d.spirit ? 18 : d.ice ? 20 : 24) + Math.sin(e.hover) * 3;
    e.z += (zt - e.z) * 0.15;
  }
  if (e.state === 'windup') {
    if (e.t === 16 && !strike(e, d.reach, e.dmg, { kd: d.boss, kb: d.boss ? 8 : 4, big: d.boss }))
      A.noise(0.04, 0.04, 3000);
    if (e.t >= 28) {
      setS(e, 'idle');
      e.cool = cd * rand(0.7, 1.3);
    }
    return;
  }
  if (e.state === 'slam') {
    if (e.t === 24) {
      for (const s of [-1, 1])
        G.projs.push({
          k: 'wave',
          team: 1,
          x: e.x + s * 16,
          y: e.y,
          z: 3,
          vx: s * 3.2,
          dmg: e.dmg,
          life: 110,
          wide: true
        });
      sfx.boom();
      G.shake = 9;
      burst(e.x, e.y, 2, '#8a7a9a', 16);
    }
    if (e.t >= 40) {
      setS(e, 'idle');
      e.cool = cd * rand(0.8, 1.2);
    }
    return;
  }
  if (e.state === 'aim') {
    if (e.t === 22) {
      if (d.ranged === 'laser') {
        for (const oy of [-10, 0, 10])
          G.projs.push({
            k: 'laser',
            team: 1,
            x: e.x + e.face * 10,
            y: e.y + oy,
            z: e.z + 4,
            vx: e.face * 4.4,
            dmg: e.dmg,
            life: 110
          });
        sfx.zap();
      } else if (d.mimic) echoSpell(e);
      else if (d.ranged === 'bullet') fireBullet(e, e.dmg, e.z + (d.fly ? 0 : 27));
      else {
        const n = d.ranged === 'hex3' ? (e.enraged ? 5 : 3) : 1;
        for (let i = 0; i < n; i++)
          G.projs.push({
            k: 'hex',
            team: 1,
            x: e.x + e.face * 16,
            y: e.y + (n > 1 ? (i - (n - 1) / 2) * 13 : 0),
            z: e.z + 30,
            vx: e.face * 2.4,
            dmg: e.dmg,
            life: 170,
            r: 5
          });
        sfx.zap();
      }
    }
    if (d.burst && (e.t === 26 || e.t === 30)) fireBullet(e, e.dmg, e.z + 27 * (d.scale || 1));
    if (e.t >= 34) {
      setS(e, 'idle');
      e.cool = cd * rand(0.7, 1.3);
    }
    return;
  }
  if (e.state === 'charge') {
    e.x += e.face * d.charge;
    e.walk += 2;
    if (!e.didHit && strike(e, 22, e.dmg + 4, { kd: true, kb: 10, big: true })) e.didHit = true;
    if (e.t > 48 || e.x < G.camX - 30 || e.x > G.camX + W + 30) {
      e.x = clamp(e.x, G.camX - 10, G.camX + W + 10);
      if (e.enraged && (e.chain || 0) < 2 && p) {
        e.chain = (e.chain || 0) + 1;
        e.face = p.x >= e.x ? 1 : -1;
        e.y += clamp(p.y - e.y, -12, 12);
        setS(e, 'charge');
        sfx.heavy();
      } else {
        e.chain = 0;
        setS(e, 'idle');
        e.cool = cd;
      }
    }
    if (G.t % 3 === 0) burst(e.x - e.face * 10, e.y, 4, '#8a7a9a', 1);
    return;
  }
  if (e.state === 'lunge') {
    if (!e.didHit && e.z > 0 && strike(e, 18, e.dmg + 2, { kd: d.boss, kb: 6 })) e.didHit = true;
    if (e.z === 0 && e.t > 4) {
      setS(e, 'idle');
      e.cool = cd * rand(0.8, 1.2);
    }
    return;
  }
  if (e.state === 'beam') {
    if (e.t >= 45 && e.t < 57) {
      for (const q of alive()) {
        if (e.beamHit.includes(q)) continue;
        if (
          e.beamYs.some(by => Math.abs(q.y - by) < 10) &&
          q.z < 26 &&
          !(q.state === 'roll' && q.t < 15) &&
          q.inv <= 0
        ) {
          e.beamHit.push(q);
          hurt(q, e.dmg, q.x >= e.x ? 1 : -1, { kd: true, big: true, col: '#45d2ff', ax: e.x });
        }
      }
    }
    if (e.t === 45) {
      sfx.boom();
      G.shake = 6;
    }
    if (e.t >= 72) {
      setS(e, 'vent');
      e.cool = cd * rand(0.8, 1.2);
      e.anchor = undefined;
      G.texts.push({ x: e.x, y: e.y, z: 50, s: 'CORE EXPOSED', c: '#ff3d8b', life: 60, sm: true });
    }
    return;
  }
  if (e.state === 'vent') {
    e.z = Math.max(4, e.z - 1);
    if (G.t % 4 === 0)
      G.parts.push({
        x: e.x + rand(-10, 10),
        y: e.y,
        z: e.z + 10,
        vx: 0,
        vy: 0,
        vz: 1,
        life: 16,
        c: '#45d2ff',
        sz: 2
      });
    if (e.t >= 110) setS(e, 'idle');
    return;
  }
  if (e.state === 'summon') {
    if (e.t === 24) {
      for (const s of [-1, 1]) {
        const g = spawnEnemy(e.kind === 'blackice' ? 'ice' : e.enraged && s > 0 ? 'spirit' : 'ghoul', s);
        g.inv = 20;
      }
      G.texts.push({ x: e.x, y: e.y, z: 80, s: 'RISE', c: '#ff4a4a', life: 50 });
      sfx.spell();
    }
    if (e.t >= 40) setS(e, 'idle');
    return;
  }
  if (e.state === 'blink' && p) {
    if (e.t === 10 && e.d.ice) burst(e.x, e.y, e.z, '#45d2ff', 10);
    if (e.t === 20) {
      e.x = clamp(p.x + (Math.random() < 0.5 ? -1 : 1) * rand(110, 150), G.camX + 20, G.camX + W - 20);
      e.y = clamp(p.y + rand(-12, 12), FY0 + 8, FY1);
      burst(e.x, e.y, 30, '#ffc63d', 12);
    }
    if (e.t >= 34) setS(e, 'idle');
    return;
  }
  e.cool--;
  if (e.trainee) {
    if (p) e.face = p.x >= e.x ? 1 : -1;
    if (e.state !== 'idle') setS(e, 'idle');
    return;
  }
  if (!p) {
    if (e.state !== 'idle') setS(e, 'idle');
    return;
  }
  const dx = p.x - e.x,
    dy = p.y - e.y,
    adx = Math.abs(dx),
    ady = Math.abs(dy);
  if (d.slowTurn) {
    // walkers take a full second to turn around: that's the window to hit the back
    const want = dx >= 0 ? 1 : -1;
    if (want !== e.face) {
      e.turnT = (e.turnT || 0) + 1;
      if (e.turnT > 60) {
        e.face = want;
        e.turnT = 0;
      }
    } else e.turnT = 0;
  } else e.face = dx >= 0 ? 1 : -1;
  if (d.mech && e.cool <= 0 && adx < 46 && ady < 14 && Math.random() < 0.05) {
    setS(e, 'slam');
    sfx.heavy();
    return;
  }
  if (d.mimic) {
    // feral spirits hang back and cast your own last spell at you
    const s = d.spd * e.spdMul,
      tx = p.x - Math.sign(dx || 1) * d.range;
    e.x += clamp(tx - e.x, -s, s);
    e.y += clamp(p.y - e.y, -s * 0.7, s * 0.7);
    e.y = clamp(e.y, FY0 + 6, FY1);
    if (e.cool <= 0 && ady < 12 && adx < 200) {
      setS(e, 'aim');
      e.echo = G.lastSpell || 'fire';
    }
    return;
  }
  if (d.spirit) {
    const s = d.spd * e.spdMul;
    e.x += clamp(dx, -s, s);
    e.y += clamp(dy, -s * 0.7, s * 0.7);
    e.y = clamp(e.y, FY0 + 6, FY1);
    if (adx < 18 && ady < 9 && e.cool <= 0) {
      hurt(p, e.dmg, e.face, { col: '#ff6a3d', ax: e.x, att: e });
      e.cool = cd;
      burst(e.x, e.y, e.z, '#ff6a3d', 8);
    }
    return;
  }
  if (d.summon) {
    e.sumT--;
    if (e.sumT <= 0 && G.ents.filter(x => x.kind === 'ghoul' && x.state !== 'dead').length < 3) {
      e.sumT = ri(e.enraged ? 260 : 360, e.enraged ? 340 : 480);
      setS(e, 'summon');
      return;
    }
  }
  if (
    e.enraged &&
    (e.kind === 'troll' || e.kind === 'saint' || e.kind === 'avatar') &&
    e.cool <= 0 &&
    ady < 40 &&
    adx < 200 &&
    Math.random() < 0.02
  ) {
    setS(e, 'slam');
    sfx.spell();
    return;
  }
  let tx,
    ty = p.y;
  if (d.beam) {
    if (e.anchor === undefined || (Math.abs(e.anchor - e.x) < 3 && Math.random() < 0.01))
      e.anchor = G.camX + 60 + Math.random() * (W - 120);
    const s2 = d.spd * e.spdMul;
    e.x += clamp(e.anchor - e.x, -s2, s2);
    e.y += clamp(p.y - e.y, -s2 * 0.5, s2 * 0.5);
    if (e.cool <= 0) {
      const ices = G.ents.filter(x => x.kind === 'ice' && x.state !== 'dead').length;
      if (ices < 2 && Math.random() < 0.35) {
        setS(e, 'summon');
        e.cool = cd;
        G.texts.push({ x: e.x, y: e.y, z: 70, s: 'SPAWNING ICE', c: '#45d2ff', life: 40, sm: true });
        return;
      }
      setS(e, 'beam');
      e.beamHit = [];
      e.beamYs = [p.y];
      if (e.enraged) e.beamYs.push(clamp(p.y + (p.y > 216 ? -26 : 26), FY0 + 8, FY1));
      sfx.spell();
    }
    return;
  }
  if (d.ice && e.cool <= 0 && Math.random() < 0.006) {
    setS(e, 'blink');
    e.cool = cd;
    sfx.zap();
    return;
  }
  if (d.ranged) {
    if (
      d.teleport &&
      e.cool <= 0 &&
      adx < (e.enraged ? 90 : 60) &&
      Math.random() < (e.enraged ? 0.08 : 0.04)
    ) {
      setS(e, 'blink');
      e.cool = cd;
      sfx.spell();
      return;
    }
    if (adx < d.reach + 4 && ady < 8 && e.cool <= 0 && !d.fly) {
      setS(e, 'windup');
      return;
    }
    if (ady < 7 && adx < 230 && adx > 50 && e.cool <= 0) {
      setS(e, 'aim');
      return;
    }
    tx = clamp(p.x - Math.sign(dx || 1) * d.range, G.camX + 24, G.camX + W - 24);
  } else {
    if (d.charge && e.cool <= 0 && ady < 8 && adx > 80 && adx < 220 && Math.random() < 0.03) {
      setS(e, 'charge');
      sfx.heavy();
      return;
    }
    if (d.lunge && e.cool <= 0 && ady < 8 && adx > 30 && adx < 90 && Math.random() < 0.05) {
      setS(e, 'lunge');
      e.vz = 3;
      e.vx = e.face * Math.min(4, adx / 16);
      sfx.whiff();
      return;
    }
    if (adx < d.reach + 2 && ady < 7 && e.cool <= 0) {
      setS(e, 'windup');
      if (d.stealth) {
        e.cloaked = false;
        e.recloakT = 90;
        e.t = 8; // a shadow's strike comes fast
        G.fx.push({ k: 'ring', x: e.x, y: e.y, z: 26, c: '#ff3d4a', life: 10, max: 10, r: 18 });
      }
      return;
    }
    const near = (e.slot || 0) < 2 || d.boss;
    tx = p.x - Math.sign(dx || 1) * (near ? d.reach - 4 : 70 + (e.slot || 0) * 14);
    if (!near) tx = clamp(tx, G.camX + 16, G.camX + W - 16);
    ty = near ? p.y : p.y + e.yoff * 4;
  }
  const s = d.spd * e.spdMul;
  let mx = clamp(tx - e.x, -s, s),
    my = clamp(ty - e.y, -s * 0.7, s * 0.7);
  if (Math.abs(tx - e.x) < 1.2) mx = 0;
  if (Math.abs(ty - e.y) < 1) my = 0;
  e.x += mx;
  e.y += my;
  e.y = clamp(e.y, FY0 + 6, FY1);
  if (mx || my) {
    if (e.state !== 'walk') setS(e, 'walk');
    e.walk += 1;
  } else if (e.state !== 'idle') setS(e, 'idle');
}

// A feral spirit's echo of the last spell any runner cast
const ECHO_NAME = { fire: 'FIREBALL', bolt: 'BOLT', heal: 'HEAL', barrier: 'BARRIER', chain: 'CHAIN' };
function echoSpell(e) {
  const k = e.echo || 'fire';
  G.texts.push({ x: e.x, y: e.y, z: e.z + 40, s: 'ECHO: ' + ECHO_NAME[k], c: '#b98cff', life: 40, sm: true });
  sfx.spell();
  if (k === 'heal') {
    for (const o of G.ents)
      if (o.team === 1 && o.state !== 'dead' && Math.hypot(o.x - e.x, o.y - e.y) < 90)
        o.hp = Math.min(o.maxHp, o.hp + Math.round(o.maxHp * 0.25));
    G.fx.push({ k: 'ring', x: e.x, y: e.y, z: e.z, c: '#7dffb0', life: 18, max: 18, r: 60 });
    return;
  }
  if (k === 'barrier') {
    e.shield = Math.round(e.maxHp * 0.6);
    G.fx.push({ k: 'ring', x: e.x, y: e.y, z: e.z, c: '#45d2ff', life: 18, max: 18, r: 24 });
    return;
  }
  const n = k === 'chain' ? 3 : 1;
  for (let i = 0; i < n; i++)
    G.projs.push({
      k: 'hex',
      tint: k === 'fire' ? 'fire' : 'bolt',
      team: 1,
      x: e.x + e.face * 12,
      y: e.y + (n > 1 ? (i - 1) * 13 : 0),
      z: e.z + 6,
      vx: e.face * (k === 'bolt' ? 3.6 : 2.6),
      dmg: e.dmg * (k === 'fire' ? 1.3 : 1),
      life: 170,
      r: 5
    });
}
function enrage(e) {
  e.enraged = true;
  e.spdMul = 1.3;
  e.coolMul *= 0.7;
  e.inv = 50;
  e.cool = 40;
  setS(e, 'idle');
  G.texts.push({ x: e.x, y: e.y, z: e.z + 80, s: 'ENRAGED', c: '#ff4a4a', life: 70, big: true });
  G.flash = 0.35;
  G.shake = 10;
  sfx.boom();
  buzz([40, 30, 60]);
  tip(
    'rage',
    'Enraged bosses learn new moves. Jump over shockwaves.',
    'Enraged bosses learn new moves. Jump (Space) over shockwaves.'
  );
  G.fx.push({ k: 'ring', x: e.x, y: e.y, z: 30, c: '#ff4a4a', life: 26, max: 26, r: 80 });
  burst(e.x, e.y, 30, '#ff4a4a', 24);
}
