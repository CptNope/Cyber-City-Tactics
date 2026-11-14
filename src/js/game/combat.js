/* Cyber City Tactics · src/js/game/combat.js
 * Damage and death: hurt() (crits, shields, elites, affixes, legendaries, skills), kill() with drops, melee
 * strike(), explosions and particles.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ================= combat ================= */
function setS(e, s) {
  e.state = s;
  e.t = 0;
  e.didHit = false;
}
function fxSpark(x, y, z, col, big) {
  G.fx.push({
    k: 'star',
    x,
    y,
    z,
    c: col,
    life: big ? 12 : 8,
    max: big ? 12 : 8,
    r: big ? 14 : 9,
    rot: Math.random() * 3
  });
  if (big) G.fx.push({ k: 'ring', x, y, z, c: col, life: 14, max: 14, r: 22 });
}
const LATER = [];
function setTimeout0(f) {
  LATER.push(f);
}
const legOf0 = 0;
const legOf = (p, slot) => p && p.eq && p.eq[slot] && p.eq[slot].leg;
function roninCrit(o) {
  const p = o.src;
  if (!o.melee || legOf(p, 'weapon') !== 'ronin') return false;
  p.roninN = (p.roninN || 0) + 1;
  return p.roninN % 6 === 0;
}
/* ---------- how a hit feels ---------- */
// weight 1 a jab, 2 a heavy blow or a crit, 3 the blow that drops them. The game holds the frame longer the
// heavier it is (hitstop), the view jolts the way the blow travelled and springs back, and in 3D a heavy
// blow pulls the camera in toward it. Reduced motion and the screen-shake setting keep the view still.
const FEEL = { stop: [0, 3, 5, 8], kick: [0, 1.6, 3.6, 6], shake: [0, 2, 5, 7], punch: [0, 0, 0.5, 0.9] };
function impact(t, dir, w, byRunner) {
  G.stop = Math.max(G.stop || 0, FEEL.stop[w]);
  G.shake = Math.max(G.shake, FEEL.shake[w]);
  if (!byRunner && t.team === 1) return; // foes hitting foes (thrown bodies, crossfire) jolt nothing more
  const k = FEEL.kick[w] * (dir || 1);
  if (Math.abs(k) > Math.abs(G.kick || 0)) G.kick = k;
  if (FEEL.punch[w] > (G.punch || 0)) {
    G.punch = FEEL.punch[w];
    G.punchX = t.x;
    G.punchY = t.y;
  }
}
// eases the jolt and the push-in back, frame by frame; held still during hitstop, so the freeze lands
function feelTick() {
  if (G.stop > 0) return;
  G.kick = Math.abs(G.kick || 0) < 0.05 ? 0 : G.kick * 0.7;
  G.punch = (G.punch || 0) < 0.01 ? 0 : G.punch * 0.88;
}
// a combo that keeps going gets called out, louder each time
const COMBO_BEATS = [
  [10, 'SLICK', '#45d2ff'],
  [25, 'SAVAGE', '#ffc63d'],
  [50, 'CHROME FURY', '#ff3d8b'],
  [100, 'LEGEND', '#efe9ff']
];
function comboBeat(src) {
  const i = COMBO_BEATS.findIndex(b => b[0] === G.combo);
  if (i < 0 || !src) return;
  const [, s, c] = COMBO_BEATS[i];
  G.texts.push({ x: src.x, y: src.y, z: (src.z || 0) + 86, s: s + '!', c, life: 60, big: true, beat: i + 1 });
  G.punch = Math.max(G.punch || 0, 0.35 + i * 0.15);
  G.punchX = src.x;
  G.punchY = src.y;
  sfx.beat(i);
}
function hurt(t, dmg, dir, o) {
  o = o || {};
  if (t.state === 'dead' || t.inv > 0) return false;
  if (t.vault && !t.vaultDone) {
    // a vault doesn't break: you hack it, once the room is clear
    if (o.src && o.src.kind === 'player' && G.mode === 'play') {
      const foes = G.ents.filter(e => e.team === 1 && e.state !== 'dead' && !e.d.passive).length;
      if (foes) {
        if (G.t - (t.vaultSaid || -99) > 60) {
          t.vaultSaid = G.t;
          G.texts.push({
            x: t.x,
            y: t.y,
            z: 50,
            s: 'CLEAR THE ROOM FIRST',
            c: '#a79dc2',
            life: 50,
            sm: true
          });
        }
      } else startHack(G.dun.b, t);
    }
    return false;
  }
  // a foe bounced off the wall is fair game in the air: a juggle (three at most)
  const juggle = canJuggle(t, o.src || o.att);
  if (t.state === 'down' && !o.air && !juggle) return false;
  if (juggle) {
    o.kd = true;
    t.juggles = (t.juggles || 0) + 1;
    if (t.juggles >= 2)
      G.texts.push({
        x: t.x,
        y: t.y,
        z: t.z + 50,
        s: 'JUGGLE ×' + t.juggles,
        c: '#45d2ff',
        life: 30,
        sm: true
      });
    if (G.training) G.tf.juggle = true;
  }
  // Parry: dodge in the last moment before a melee hit lands and the attacker is thrown off balance
  if (
    t.team === 0 &&
    t.kind === 'player' &&
    t.state === 'roll' &&
    t.t <= PARRY_WINDOW + (t.cy && t.cy.boost ? 6 : 0) + (setOn(t, 'kagemori', 3) ? 3 : 0) &&
    o.att &&
    o.att.team === 1 &&
    !o.bullet &&
    !o.magic
  ) {
    parry(t, o.att);
    return false;
  }
  if (t.team === 0 && t.state === 'roll' && t.t < 15) return false;
  if (
    t.team === 0 &&
    legOf(t, 'armor') === 'iceshard' &&
    G.t - (t.iceT === undefined ? -9999 : t.iceT) > 480
  ) {
    t.iceT = G.t;
    t.inv = 20;
    sfx.clank();
    G.fx.push({ k: 'ring', x: t.x, y: t.y, z: 26, c: '#45d2ff', life: 14, max: 14, r: 26 });
    G.texts.push({ x: t.x, y: t.y, z: t.z + 56, s: 'DEFLECT', c: '#45d2ff', life: 30, sm: true });
    return true;
  }
  // riot shield blocks frontal hits unless kicked, knocked down or exploded
  if (
    t.d &&
    t.d.shield &&
    !o.breaker &&
    !o.kd &&
    t.state !== 'hurt' &&
    t.state !== 'grabbed' &&
    o.ax !== undefined &&
    (o.ax - t.x) * t.face > 0
  ) {
    dmg = Math.max(1, Math.round(dmg * 0.15));
    t.hp -= dmg;
    sfx.clank();
    fxSpark(t.x + t.face * 10, t.y, t.z + 28, '#9fb4d8', false);
    G.texts.push({ x: t.x, y: t.y, z: t.z + 50, s: 'BLOCK', c: '#9fb4d8', life: 26, sm: true });
    if (t.hp <= 0) kill(t, dir);
    return true;
  }
  if (t.d && t.d.stealth) {
    t.cloaked = false;
    t.recloakT = 150;
  }
  if (o.melee && o.src && o.src.chiT > 0) o.kd = true; // Killing Hands
  if (t.d && t.d.mech) {
    // plated front, weak back: hits from behind do 50% more, hits from the front 60% less
    const back = o.ax !== undefined && (o.ax - t.x) * t.face < 0;
    o.kd = false;
    if (back) {
      dmg *= 1.5;
      if (G.t - (t.weakT || -999) > 40) {
        t.weakT = G.t;
        G.texts.push({ x: t.x, y: t.y, z: t.z + 78, s: 'WEAK SPOT', c: '#ffc63d', life: 34, sm: true });
      }
    } else {
      dmg *= 0.4;
      if (G.t - (t.plateT || -999) > 50) {
        t.plateT = G.t;
        sfx.clank();
        G.texts.push({ x: t.x, y: t.y, z: t.z + 78, s: 'PLATED', c: '#9fb4d8', life: 30, sm: true });
        tip('mech', 'Mech walkers are plated in front. Roll past and hit the glowing vent on the back.');
      }
    }
  }
  // (the *T stamps below only drive visuals: a ward ripple, a ricochet spark, a drain stream)
  if (t.elite === 'warded') {
    o.kd = false;
    if (o.magic) {
      dmg *= 0.4;
      t.wardT = G.t;
    }
  }
  if (t.elite === 'armored' && o.bullet && !o.ap) {
    dmg *= 0.45;
    t.pingT = G.t;
  }
  const sp = o.src && o.src.kind === 'player' ? o.src : null;
  if (sp) {
    if (o.magic) dmg *= sp.D.spellMul || 1;
    if (has(sp, 'berserk') && sp.hp < sp.maxHp * 0.4) dmg *= 1.4;
    if (
      has(sp, 'jam') &&
      t.d &&
      ((t.d.fly && !t.d.spirit) || ['ice', 'blackice', 'glitch', 'node'].includes(t.kind))
    )
      dmg *= 2;
  }
  if (t.team === 0 && has(t, 'berserk') && t.hp < t.maxHp * 0.4) dmg *= 0.8;
  if (t.state === 'vent') dmg *= 1.5;
  if (modOn('glass')) dmg *= 1.6;
  if (o.src && o.src.buffT > 0) dmg *= 1.5;
  let crit = false;
  if (t.team === 0) dmg = (dmg * 20) / (20 + t.D.armor);
  if (t.team === 0 && o.fire && legOf(t, 'armor') === 'wyrmheart') dmg *= 0.5;
  if (t.shield > 0) {
    const a = Math.min(t.shield, dmg);
    t.shield = Math.max(0, Math.round(t.shield - a));
    dmg -= a;
    G.fx.push({ k: 'ring', x: t.x, y: t.y, z: 24, c: '#45d2ff', life: 10, max: 10, r: 22 });
    if (dmg <= 0) {
      sfx.clank();
      G.texts.push({ x: t.x, y: t.y, z: t.z + 50, s: 'ABSORBED', c: '#45d2ff', life: 26, sm: true });
      return true;
    }
  } else if (
    o.src &&
    (roninCrit(o) ||
      (o.melee && o.src.parryT > 0 && useParryCrit(o.src)) ||
      (o.melee && o.src.chiT > 0) ||
      Math.random() <
        o.src.D.crit +
          (o.bullet && has(o.src, 'deadeye') ? 0.15 : 0) +
          (o.bullet && gmodOf(o.src) === 'laser' ? 0.1 : 0))
  ) {
    dmg *=
      (o.bullet && has(o.src, 'deadeye') ? 2.5 : 1.8) *
      (o.bullet && o.src.eq && o.src.eq.gun ? o.src.eq.gun.critMul || 1 : 1) *
      (setOn(o.src, 'kagemori', 3) ? 1.25 : 1);
    crit = true;
  }
  if (t.team === 0 && t.kind === 'player' && setOn(t, 'ironside', 3)) dmg *= 0.85; // the Ironside set
  // the Shaman tree: curses, kin and the spirit walk
  if (t.team === 1 && t.curseT > G.t) dmg *= 1.15;
  if (t.team === 0 && o.att && o.att.curseT > G.t && o.att.curseW) dmg *= 0.75;
  if (t.kind === 'ally' && anyHas('kin')) dmg *= 0.8;
  if (t.kind === 'player' && has(t, 'swalk') && spiritNear(t)) dmg *= 0.8;
  if (t.kind === 'player' && marked(t)) dmg *= 1.25; // a fireteam spotter's laser is on them
  // a hit on a fireteam spotter knocks the laser off whoever it was on
  if (t.d && t.d.role === 'spot' && t.team === 1) for (const q of PL) if (q.markBy === t) q.markT = 0;
  if (t.d && t.d.rival && t.team === 1) {
    dmg = rivalHit(t, o, dmg); // Vane notes every hit, and turns away the kind it's ready for
    if (dmg <= 0) return true;
  }
  dmg = Math.max(1, Math.round(dmg));
  if (t.state === 'beg' && o.src && o.src.team === 0) dmg = Math.max(dmg, t.hp); // no mercy: it's over
  const fixed = t.d && t.d.passive;
  t.hp -= dmg;
  t.flash = 8;
  if (t.team === 0 && legOf(t, 'armor') === 'dragonscale')
    t.mp = Math.min(t.maxMp, t.mp + Math.round(dmg * 0.5));
  const heavy = !!(t.d && t.d.heavy);
  const wkb = o.melee && o.src && o.src.eq && o.src.eq.weapon ? o.src.eq.weapon.kb || 1 : 1; // Brutal and Rustline knock further
  if (t.state !== 'grabbed' && !fixed && !heavy) t.x += dir * (o.kb || 3) * wkb * (wxWet() ? WX.slide : 1); // a wet street slides
  if (!fixed && !heavy) t.face = -dir;
  if (G.t - t.lastHit > 50) t.hits = 0;
  t.lastHit = G.t;
  t.hits++;
  const big = o.big || crit;
  burst(t.x, t.y, t.z + (t.d && t.d.fly ? 0 : 28), o.col || '#fff3c4', big ? 12 : 6);
  fxSpark(t.x - dir * 4, t.y, t.z + (t.d && t.d.fly ? 0 : 30), o.col || '#fff3c4', big);
  G.texts.push({
    x: t.x + rand(-4, 4),
    y: t.y,
    z: t.z + 50,
    s: (crit ? 'CRIT ' : '') + dmg,
    c: t.team === 0 ? '#ff3d8b' : crit ? '#ffc63d' : o.col || '#efe9ff',
    life: 34,
    big: crit
  });
  const lethal = t.hp <= 0 && t.team === 1 && !fixed;
  impact(t, dir, lethal ? 3 : big ? 2 : 1, !!o.src);
  if (crit) G.flash = Math.max(G.flash, 0.12);
  if (G.run) {
    if (o.src) G.run.dealt += dmg;
    if (t.team === 0) G.run.taken += dmg;
  }
  if (t.team === 0 && t.idx === 0) buzz(big ? 60 : 30);
  else if (o.src && o.src.idx === 0 && big) buzz(12);
  const rise = o.src ? Math.min(G.combo, 40) : 0; // a combo climbs in pitch as it builds
  (big ? sfx.heavy : sfx.hit)(rise);
  if (crit) sfx.crack();
  if (lethal) sfx.ko();
  if (o.src && o.src.kind === 'player' && t.team === 1 && !o.team && t.hp > 0) teamCheck(t, o.src);
  if (o.src) {
    G.combo++;
    G.comboT = 0;
    if (G.combo > G.bestCombo) G.bestCombo = G.combo;
    if (G.combo >= 25) peak('combo', G.combo);
    comboBeat(o.src);
    spGain(o.src, dmg * 0.8);
  }
  if (sp && sp.state !== 'dead') {
    const it = o.melee ? sp.eq.weapon : o.bullet ? sp.eq.gun : null,
      mod = it && (it.mod || (it.leg === 'wyrmfang' ? 'burn' : null));
    const foe2 = r =>
      G.ents
        .filter(
          e =>
            e !== t &&
            e.team === 1 &&
            e.state !== 'dead' &&
            !(e.d && e.d.passive) &&
            Math.hypot(e.x - t.x, e.y - t.y) < r
        )
        .sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y))[0];
    if (o.melee && !o.silk && it && it.leg === 'silk' && Math.random() < 0.3) {
      const o2 = foe2(80);
      if (o2) G.zaps.push({ tg: o2, delay: 4, dmg: dmg * 0.7, src: sp, mel: true });
    }
    if (o.bullet && !o.rico && it && it.leg === 'smartlink' && Math.random() < 0.5) {
      const o2 = foe2(110);
      if (o2) G.zaps.push({ tg: o2, delay: 3, dmg: dmg * 0.6, src: sp, bul: true });
    }
    if (o.melee && sp.arch === 'medic' && t.team === 1) {
      // Street Doc: every melee hit patches you up, and a partner standing close
      sp.hp = Math.min(sp.maxHp, sp.hp + 2);
      for (const q of alive())
        if (q !== sp && Math.hypot(q.x - sp.x, q.y - sp.y) < 80) q.hp = Math.min(q.maxHp, q.hp + 1);
    }
    if (o.melee && has(sp, 'leech')) {
      sp.hp = Math.min(sp.maxHp, sp.hp + (crit ? 4 : 2));
    }
    if (mod === 'leech') {
      sp.hp = Math.min(sp.maxHp, sp.hp + Math.max(1, Math.round(dmg * 0.15)));
    }
    if (mod === 'shock' && t.team === 1 && !(t.d && t.d.passive) && Math.random() < 0.25) {
      t.cool = Math.max(t.cool || 0, 90);
      G.texts.push({ x: t.x, y: t.y, z: t.z + 62, s: 'STUN', c: '#45d2ff', life: 28, sm: true });
      G.fx.push({ k: 'ring', x: t.x, y: t.y, z: 30, c: '#45d2ff', life: 10, max: 10, r: 16 });
    }
    if (mod === 'burn' && t.team === 1 && !(t.d && t.d.passive)) {
      t.burnT = 120;
      t.burnDmg = Math.max(2, Math.round(dmg * 0.12));
      t.burnSrc = sp; // whoever lit them gets the kill
    }
    if (crit && o.bullet && !o.rico && has(sp, 'rico')) {
      const o2 = G.ents
        .filter(
          e =>
            e !== t &&
            e.team === 1 &&
            e.state !== 'dead' &&
            !(e.d && e.d.passive) &&
            Math.hypot(e.x - t.x, e.y - t.y) < 120
        )
        .sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y))[0];
      if (o2) G.zaps.push({ tg: o2, delay: 3, dmg: dmg * 0.5, src: sp, bul: true });
    }
  }
  if (
    t.team === 0 &&
    o.att &&
    o.att.team === 1 &&
    !o.bullet &&
    t.eq &&
    t.eq.armor &&
    t.eq.armor.mod === 'spiked' &&
    o.att.state !== 'dead' &&
    o.att.hp > 0
  )
    setTimeout0(() => hurt(o.att, 6, -dir, { col: '#ff3d8b', kb: 2 }));
  if (t.team === 0) spGain(t, dmg * 0.6);
  if (
    t.team === 0 &&
    o.att &&
    (o.att.elite === 'vampiric' || (o.att.d && o.att.d.drain)) &&
    o.att.state !== 'dead'
  ) {
    const v = o.att;
    v.hp = Math.min(v.maxHp, v.hp + Math.round(dmg * 0.6));
    v.drainT = G.t;
    v.drainX = t.x;
    v.drainY = t.y - t.z;
    G.texts.push({
      x: v.x,
      y: v.y,
      z: v.z + 56,
      s: '+' + Math.round(dmg * 0.6),
      c: '#b98cff',
      life: 28,
      sm: true
    });
  }
  // How the hit should look (visual only): the motion it causes and any element it carries
  t.react =
    o.src && o.src.state === 'upper'
      ? 'launch'
      : o.big || (o.kb || 0) >= 8
        ? 'spin'
        : o.bullet
          ? 'gun'
          : 'light';
  t.elem = o.fire || o.col === '#ff6a3d' ? 'fire' : o.col === '#45d2ff' ? 'shock' : o.magic ? 'magic' : null;
  t.reactN = (t.reactN || 0) + 1;
  if (t.d && t.d.boss && !t.enraged && t.hp > 0 && t.hp < t.maxHp * 0.5) enrage(t);
  if (t.holding) dropProp(t);
  if (t.team === 0 && t.grab) releaseGrab(t);
  // River City endings: a beaten regular may beg for mercy or run for it, once
  if (t.hp > 0 && mercyRoll(t, o)) return true;
  // most regulars go down in one hit from above the begging line, so the blow that would have finished them
  // can be the moment they give up instead, on 1 HP (not a massive overkill: that one just lands)
  if (t.hp <= 0 && dmg < t.maxHp * 0.6 && !t.mercy && MERCY[t.kind]) {
    const left = t.hp;
    t.hp = 1;
    if (mercyRoll(t, o)) return true;
    t.hp = left;
  }
  if (t.d && t.d.boss && !t.taunted2 && t.hp > 0 && t.hp < t.maxHp * 0.25) {
    t.taunted2 = true;
    taunt(t, 1);
  }
  if (t.holdP && !o.held) enemyRelease(t); // hit the one holding your partner and they let go
  // Hex: a runner's melee hit curses the foe
  if (o.melee && o.src && o.src.kind === 'player' && t.team === 1 && has(o.src, 'hex') && t.hp > 0) {
    if (!(t.curseT > G.t))
      G.texts.push({ x: t.x, y: t.y, z: t.z + 58, s: 'HEXED', c: '#7dffb0', life: 30, sm: true });
    t.curseT = G.t + 240;
    t.curseW = has(o.src, 'wither');
  }
  // the Voltaic set: a melee hit arcs to the nearest other foe
  if (o.melee && !o.arc && o.src && o.src.kind === 'player' && t.team === 1 && setOn(o.src, 'voltaic', 2))
    voltArc(t, Math.min(dmg, dmg + Math.min(0, t.hp)), o.src); // the arc carries what the hit dealt, not overkill
  if (t.hp <= 0) {
    kill(t, dir, o);
    return true;
  }
  if (fixed) {
    sfx.clank();
    return true;
  }
  if (t.state === 'held' && o.held) return true; // a knee to someone held: it hurts, they stay held
  if (t.state === 'grabbed' && !o.kd) return true;
  if (t.state === 'grabbed') {
    const g = PL.find(p => p.grab === t);
    if (g) releaseGrab(g, true);
  }
  if (heavy) return true; // walkers never flinch or fall
  const boss = t.d && t.d.boss;
  if (boss) {
    if (o.kd && !t.d.fly && Math.random() < 0.35) {
      setS(t, 'down');
      t.vz = 2.2;
      t.vx = dir * 1.6;
      t.hits = 0;
    }
    return true;
  }
  if (t.d && t.d.fly) {
    t.x += dir * 6;
    return true;
  }
  if (o.kd || (t.hits >= 3 && !o.flurry)) {
    setS(t, 'down');
    if (t.club) dropClub(t); // knocked flat: the street weapon goes flying
    if (t.team === 1 && o.src && o.src.team === 0 && grabbable(Object.assign({}, t, { state: 'idle' })))
      tip(
        'haul',
        'Knocked down? PUNCH beside them to haul them back up into a grab. Foes on their last legs reel and can be grabbed too.',
        'Knocked down? Press J beside them to haul them back up into a grab. Foes on their last legs reel and can be grabbed too.'
      );
    t.vz = 2.8;
    t.vx = dir * 2.2;
    t.hits = 0;
    if (t.team === 0) sfx.hurt();
  } else {
    setS(t, 'hurt');
    if (t.team === 0) sfx.hurt();
    // two hits in a row leave a foe dazed (stars over its head): walk into it and you grab it
    // (a Concussive or Voltaic weapon dazes on the first hit)
    else if (
      o.src &&
      o.src.team === 0 &&
      o.melee &&
      (t.hits >= 2 || (o.src.eq && o.src.eq.weapon && o.src.eq.weapon.daze)) &&
      grabbable(t)
    ) {
      t.dazeUntil = G.t + (hasTech(o.src, 'grip') ? 110 : 60);
      tip(
        'grab',
        'Stars over a foe mean it is dazed: walk into it to grab. PUNCH punches, KICK knees, a direction plus either throws, JUMP leaps with them.',
        'Stars over a foe mean it is dazed: walk into it to grab. J punches, K knees, a direction plus either throws, Space leaps with them.'
      );
    }
  }
  if (t.team === 0)
    tip(
      'dodge',
      'Tap DODGE to roll through attacks untouched.',
      'Press O or Left Shift to roll through attacks untouched.'
    );
  return true;
}
const REMATCH = {
  troll: { name: 'Gutter King, chromed', acc: '#45d2ff', coat: '#3a4a5a' },
  blade: { name: 'Razor Mei, under contract', acc: '#ffc63d', coat: '#3a1a2a' },
  saint: { name: 'The Hollow Saint, reborn', acc: '#b98cff', coat: '#2a1a3a' },
  archmage: { name: 'Voss.exe', acc: '#45d2ff', coat: '#0b2533' }
};
// A beaten boss comes back mid-district: smaller health pool, but already enraged with its rage-phase moves
function rematch(e) {
  const r = REMATCH[e.kind];
  if (!r) return;
  e.rematch = true;
  e.name = r.name;
  e.hp = e.maxHp = Math.round(e.maxHp * 0.6);
  e.enraged = true;
  e.spdMul = 1.25;
  e.coolMul *= 0.75;
  e.pal = Object.assign({}, e.pal, { acc: r.acc, coat: r.coat });
  G.banner = -150;
  musicPlay('boss');
  tip('rematch', 'Beaten bosses can come back. They start enraged, with their new moves already unlocked.');
}

function drop(k, x, y, extra) {
  G.picks.push(
    Object.assign(
      { k, x: clamp(x, G.camX + 18, G.camX + W - 18), y: clamp(y, FY0 + 4, FY1), t: 0 },
      extra || {}
    )
  );
}
function kill(t, dir, o) {
  t.flip = false;
  if (t.club) dropClub(t);
  // Wild Call: a Shaman's kill can call a fire spirit (one at a time)
  const wk = o && o.src && o.src.kind === 'player' ? o.src : null;
  if (
    wk &&
    t.team === 1 &&
    has(wk, 'wild') &&
    Math.random() < 0.15 &&
    !G.ents.some(e => e.wild && e.state !== 'dead')
  ) {
    const s = spawnSummon('ember', wk, 600, 1);
    s.wild = true;
    say(wk, 'WILD CALL', '#7dffb0', 50, 40, true);
  }
  const ks = o && o.src && o.src.kind === 'player' ? o.src : null;
  onKill(t, ks);
  if (ks && t.team === 1 && !(t.d && t.d.passive)) {
    if (has(ks, 'scav') && ks.eq.gun && Math.random() < 0.35) {
      ks.ammo += 4;
      say(ks, '+4 AMMO', '#ffe28a', 70, 30, true);
    }
    if (has(ks, 'siphon')) {
      ks.mp = Math.min(ks.maxMp, ks.mp + 4);
    }
    if (legOf(ks, 'weapon') === 'vfang') {
      ks.hp = Math.min(ks.maxHp, ks.hp + 8);
      ks.mp = Math.min(ks.maxMp, ks.mp + 5);
    }
  }
  if (t.state === 'grabbed') {
    const g = PL.find(p => p.grab === t);
    if (g) {
      g.grab = null;
      setS(g, 'idle');
    }
  }
  setS(t, 'dead');
  // a finishing jab drops them where they stand (a small hop, then face-down); anything bigger sends them flying
  const crumple = t.react === 'light' && !t.elem && t.z === 0;
  t.vz = crumple ? 1.4 : 3.2;
  t.vx = dir * (crumple ? 0.6 : 2.6);
  if (t.d && t.d.turret) t.vx = t.vz = 0; // bolted down
  t.hp = 0;
  if (t.team === 0) {
    t.dead = true;
    return;
  }
  // a foe a medic already got back up pays out once: no second drops, karma or contract count
  if (t.revived) {
    t.revived = 'twice';
    return;
  }
  const d = t.d;
  if (d.boss) {
    G.texts.push({ x: t.x, y: t.y, z: t.z + 64, s: 'FLATLINED', c: '#efe9ff', life: 70 });
    G.slow = 70;
    G.flash = 0.5;
    G.punch = 1;
  } else if (
    t.team === 1 &&
    !d.passive &&
    !G.world && // the Sprawl's streets never empty for long: only a fight with waves has a last foe
    o &&
    o.src &&
    !G.ents.some(e => e !== t && e.team === 1 && e.state !== 'dead' && !(e.d && e.d.passive))
  ) {
    // the last of them: the blow lands in slow motion, the camera leaning in
    G.slow = Math.max(G.slow, 24);
    G.punch = 1;
    G.punchX = t.x;
    G.punchY = t.y;
  }
  const em = t.elite ? 2 : 1;
  if (G.run && !d.passive) {
    G.run.kills++;
    if (t.elite) G.run.elites++;
    if (d.boss) G.run.bosses++;
  }
  if (G.world && G.wd) {
    if (t.kind === 'cop') {
      G.wd.copKills++;
      if (o && o.bullet && gmodOf(ks) === 'supp') {
        G.texts.push({ x: t.x, y: t.y, z: 70, s: 'QUIET', c: '#a79dc2', life: 40, sm: true });
      } else if (G.wd.copKills % 2 === 0) G.wd.heat = Math.min(5, G.wd.heat + 1);
      G.wd.rep = Math.max(-100, G.wd.rep - 2);
    } else if (!G.dun && ['ganger', 'orc', 'shaman', 'ghoul'].includes(t.kind))
      G.wd.rep = Math.min(100, G.wd.rep + 1);
  }
  if (t.kind === 'chest' && G.dun) lootChest(t);
  if (t.kind === 'hostage') hostageLost(t);
  if (d.passive) {
    t.gone = false;
    burst(t.x, t.y, 20, t.kind === 'node' ? '#45d2ff' : '#ffc63d', 18);
    sfx.boom();
    if (t.kind === 'vend') {
      drop(pick(['med', 'ammo', 'mana']), t.x - 10, t.y + 12);
      drop(pick(['med', 'mana', 'ammo']), t.x + 10, t.y + 16);
      shardDrop(t.x, t.y + 20, 0.15);
    }
  }
  if (modOn('split') && !d.split && !d.boss && !d.passive && !t.mini && !t.courier && t.kind !== 'cop') {
    for (const s of [-1, 1]) {
      const c = spawnEnemy(t.kind, 1);
      c.mini = true;
      c.x = t.x + s * 10;
      c.y = clamp(t.y + s * 6, FY0 + 6, FY1);
      c.hp = c.maxHp = Math.max(6, Math.round(t.maxHp * 0.4));
      c.inv = 12;
      c.elite = null;
    }
    G.texts.push({ x: t.x, y: t.y, z: 60, s: 'SPLIT', c: '#45d2ff', life: 30, sm: true });
  }
  if (t.squad && G.wd && !G.ents.some(e => e !== t && e.squad && e.state !== 'dead')) feat('squad');
  if (t.wasPainter) painterDown(t);
  if (d.rival) rivalDown(t);
  if (t.hunter && G.wd) {
    const v = 80 + G.wd.level * 40;
    drop('cred', t.x + 8, t.y + 6, { v });
    bump('hunters');
    G.texts.push({ x: t.x, y: t.y, z: 80, s: 'HUNTER DOWN ¥' + v, c: '#ffc63d', life: 70 });
  }
  if (d.split && !t.mini) {
    for (const s of [-1, 1]) {
      const c = spawnEnemy('glitch', 1);
      c.mini = true;
      c.x = t.x + s * 10;
      c.y = clamp(t.y + s * 6, FY0 + 6, FY1);
      c.hp = c.maxHp = Math.max(6, Math.round(t.maxHp * 0.4));
      c.inv = 12;
      c.elite = null;
    }
    G.texts.push({ x: t.x, y: t.y, z: 60, s: 'SPLIT', c: '#45d2ff', life: 30, sm: true });
  }
  (G.cjob ? jobKarma : gainKarma)(
    Math.round(
      d.karma *
        em *
        DIFF[G.diff].karma *
        (1 + G.stage * 0.3 + G.ng * 0.3) *
        (1 + Math.min(G.combo, 30) * 0.02)
    )
  );
  if (G.arena) {
    const pts = Math.round(
      (d.karma || 40) * em * 10 * (1 + Math.min(G.combo, 30) * 0.05) * (0.8 + G.diff * 0.2)
    );
    G.score += pts;
    G.texts.push({ x: t.x, y: t.y, z: t.z + 70, s: '+' + pts, c: '#ffc63d', life: 36, sm: true });
  }
  contractTick(t.kind);
  const c = Math.round(
    ri(d.creds[0], d.creds[1]) *
      em *
      (1 + G.ng * 0.25) *
      (1 + Math.min(G.combo, 30) * 0.02) *
      (evOn('parade') ? 1.5 : 1) *
      (G.dun && G.dun.b.type === 'club' ? 1.5 : 1) *
      (t.mini ? 0.5 : 1)
  );
  if (c > 0) drop('cred', t.x, t.y, { v: c });
  if (t.elite) {
    const it = randItem(G.stage + G.ng, true);
    if (it.rar < 1) {
      const b = it.base;
      Object.assign(it, mkItem(it.slot, b, 1));
    }
    drop('gear', t.x - 12, t.y + 2, { item: it });
  }
  const C = PARTY.contract;
  if (t.kind === 'sec' && C && C.key === 'chip' && !C.done) drop('chip', t.x - 8, t.y - 4);
  if (d.boss) drop('gear', t.x + 14, t.y + 2, { item: randItem(G.stage + G.ng, true) });
  else if (Math.random() < 0.08) drop('gear', t.x + 12, t.y + 2, { item: randItem(G.stage, false) });
  const r = Math.random();
  if (r < 0.11) drop('med', t.x + 10, t.y + 4);
  else if (r < 0.24) {
    if (!modOn('brawl')) drop('ammo', t.x - 10, t.y + 4);
  } else if (r < 0.34) drop('mana', t.x + 6, t.y - 4);
  if (d.spirit) {
    burst(t.x, t.y, t.z, '#ffc63d', 20);
    t.gone = true;
  }
  if (d.boss) {
    G.shake = 10;
    burst(t.x, t.y, 30, '#ffc63d', 30);
    G.fx.push({ k: 'ring', x: t.x, y: t.y, z: 30, c: '#ffc63d', life: 30, max: 30, r: 70 });
  }
}
function inZ(att, t) {
  const tz = t.d && t.d.fly ? t.z - 12 : t.d && t.d.dragon ? t.z - 30 : t.z;
  return tz <= att.z + 14 && tz >= att.z - 30;
}
// Team attack: two or more runners land hits on the same enemy within half a second for a combined finisher.
// Once two have, the crew gets a beat (a fifth of a second) for anyone else to pile in: two make a TEAM UP,
// three a CREW UP, all four a FULL CREW, each heavier than the last.
const TEAM_WINDOW = 30,
  TEAM_GATHER = 12;
const TEAM_CALL = [null, null, 'TEAM UP!', 'CREW UP!', 'FULL CREW!'];
const teamCrew = t =>
  PL.filter(p => t.hitBy && t.hitBy[p.idx] != null && G.t - t.hitBy[p.idx] <= TEAM_WINDOW + TEAM_GATHER);
function teamCheck(t, sp) {
  t.hitBy = t.hitBy || {};
  t.hitBy[sp.idx] = G.t;
  t.teamLast = sp;
  if (!G.coop || (t.teamCD || 0) > G.t || t.teamAt) return;
  const two = PL.filter(p => t.hitBy[p.idx] != null && G.t - t.hitBy[p.idx] <= TEAM_WINDOW).length >= 2;
  if (!two) return;
  // everyone in already: no need to wait
  if (teamCrew(t).length >= alive().length) teamFire(t);
  else t.teamAt = G.t + TEAM_GATHER;
}
// called every frame: a team-up waiting on its gather beat goes off
function teamTick() {
  for (const t of G.ents) if (t.teamAt && G.t >= t.teamAt) teamFire(t);
}
function teamFire(t) {
  t.teamAt = 0;
  const crew = teamCrew(t),
    sp = t.teamLast;
  t.hitBy = {};
  if (crew.length < 2 || !sp || t.state === 'dead') return;
  t.teamCD = G.t + 120;
  const n = crew.length,
    dmg = Math.round(14 * (n - 1) + crew.reduce((a, p) => a + p.D.melee, 0) * 0.6);
  G.slow = Math.max(G.slow, 12 + 4 * n);
  G.flash = Math.max(G.flash, 0.12 + 0.06 * n);
  G.punch = Math.max(G.punch || 0, 0.5 + 0.15 * n);
  G.punchX = t.x;
  G.punchY = t.y;
  crew.forEach((p, i) =>
    G.fx.push({ k: 'ring', x: t.x, y: t.y, z: 26, c: p.pal.acc, life: 22, max: 22, r: 36 + 10 * i })
  );
  G.texts.push({
    x: t.x,
    y: t.y,
    z: t.z + 84,
    s: TEAM_CALL[Math.min(n, 4)],
    c: '#ffc63d',
    life: 60,
    big: true
  });
  bump('teamups');
  if (n >= 3) bump('crewups');
  setTimeout0(() => {
    if (t.state !== 'dead')
      hurt(t, dmg, sp.x <= t.x ? 1 : -1, {
        kd: true,
        big: true,
        col: '#ffc63d',
        src: sp,
        team: true,
        ax: sp.x
      });
  });
}
const useParryCrit = p => ((p.parryT = 0), true); // a parry's counter is one guaranteed crit
const PARRY_WINDOW = 8; // frames into a dodge that count as a parry (about 0.13 s)
function parry(p, e) {
  if (e.parried === G.t) return;
  e.parried = G.t;
  p.parryT = 90;
  e.cool = Math.max(e.cool || 0, e.d.boss ? 70 : 130);
  if (!e.d.boss && !e.d.fly && e.state !== 'down') {
    setS(e, 'hurt');
    e.t = -30; // a longer stagger than a normal flinch
    e.vx = (e.x >= p.x ? 1 : -1) * 2;
  }
  G.slow = Math.max(G.slow, 14);
  G.fx.push({ k: 'ring', x: p.x, y: p.y, z: 26, c: '#ffc63d', life: 16, max: 16, r: 30 });
  G.texts.push({ x: p.x, y: p.y, z: 64, s: 'PARRY', c: '#ffc63d', life: 46, big: true });
  sfx.clank();
  buzz(20);
  bump('parries');
  tip('parry', 'Parried! Your next hit in the next second and a half is a guaranteed crit.');
}
function voltArc(from, dmg, src) {
  let best = null,
    bd = 64;
  for (const e of G.ents) {
    if (e === from || e.team !== 1 || e.state === 'dead' || (e.d && e.d.passive)) continue;
    const d = Math.hypot(e.x - from.x, (e.y - from.y) * 2);
    if (d < bd) {
      bd = d;
      best = e;
    }
  }
  if (!best) return;
  G.fx.push({ k: 'zap', x: best.x, y: best.y, z: best.z + 24, c: '#45d2ff', life: 10, max: 10, r: 0 });
  hurt(best, Math.max(1, Math.round(dmg * 0.3)), best.x >= from.x ? 1 : -1, {
    arc: true,
    src,
    col: '#45d2ff',
    kb: 1,
    ax: from.x
  });
  if (setOn(src, 'voltaic', 3) && best.state !== 'dead' && grabbable(best)) best.dazeUntil = G.t + 60;
}
// a companion or summon still fighting near a runner (Spirit Walk)
const spiritNear = p =>
  G.ents.some(e => e.kind === 'ally' && e.state !== 'dead' && Math.abs(e.x - p.x) < 160);
/* ---------- totems (Shaman: Ward Totem and the Totem active skill) ---------- */
function plantTotem(p, big) {
  G.totems = G.totems || [];
  G.totems.push({ x: p.x + p.face * 14, y: p.y, life: big ? 720 : 480, big: !!big, src: p, t: 0 });
  sfx.spell();
  burst(p.x + p.face * 14, p.y, 10, '#7dffb0', 12);
}
function totemTick() {
  if (!G.totems || !G.totems.length) return;
  for (const T of G.totems) {
    T.t++;
    T.life--;
    if (T.t % 60 !== 0) continue;
    for (const q of alive())
      if (Math.abs(q.x - T.x) < 60 && Math.abs(q.y - T.y) < 24 && q.hp < q.maxHp) {
        const n = Math.max(1, Math.round(q.maxHp * (T.big ? 0.04 : 0.03)));
        q.hp = Math.min(q.maxHp, q.hp + n);
        G.texts.push({ x: q.x, y: q.y, z: 60, s: '+' + n, c: '#7dffb0', life: 24, sm: true });
      }
    if (T.big)
      for (const e of G.ents)
        if (e.team === 1 && e.state !== 'dead' && Math.abs(e.x - T.x) < 70 && Math.abs(e.y - T.y) < 26) {
          e.curseT = G.t + 120;
          e.curseW = !!(T.src && has(T.src, 'wither'));
        }
  }
  G.totems = G.totems.filter(T => T.life > 0);
}
const canJuggle = (t, src) =>
  t.state === 'down' &&
  t.team === 1 &&
  !!t.bounced &&
  t.z > 4 &&
  (t.juggles || 0) < 3 &&
  !!src &&
  src.team === 0;
// River City endings. Some beaten regulars drop to their knees: leave them be for a few seconds and they pay
// you off and leave (karma for mercy); hit them and they go down for good. Others just run for it.
function mercyRoll(t, o) {
  const M = t.team === 1 && MERCY[t.kind];
  if (!M || t.mercy || t.hp >= t.maxHp * 0.18 || t.d.boss || t.elite || t.squad || t.hunter || t.courier)
    return false;
  if (G.training || G.mode !== 'play' || modOn('pacifist') || t.state === 'grabbed' || t.holdP) return false;
  if (!o || !o.src || o.src.team !== 0) return false; // only a runner's beating makes them quit
  const C = PARTY.contract; // an open contract's targets fight to the end, so it can always be finished
  if (C && !C.done && !C.failed && (C.key === t.kind || (C.key === 'chip' && t.kind === 'sec'))) return false;
  t.mercy = 'rolled';
  const r = Math.random();
  const say1 = () =>
    G.texts.push({ x: t.x, y: t.y, z: t.z + 62, s: pick(M.lines), c: '#ffc63d', life: 80, sm: true });
  if (M.beg && r < M.beg) {
    t.mercy = 'beg';
    if (t.club) dropClub(t);
    setS(t, 'beg');
    say1();
    tip(
      'beg',
      'A beaten foe is begging. Leave them for a moment and they pay you off and leave, for some karma. Or finish them for the usual drop.',
      'A beaten foe is begging. Leave them for a moment and they pay you off and leave, for some karma. Or finish them for the usual drop.'
    );
    return true;
  }
  if (M.run && r < M.run) {
    t.mercy = 'run';
    setS(t, 'flee');
    say1();
    return true;
  }
  return false;
}
// spared: a payoff in creds, karma for the mercy, and they're gone
function spare(t) {
  const d = t.d;
  t.mercy = 'spared';
  const v = Math.round(ri(d.creds[0], d.creds[1]) * 1.5 * (1 + G.ng * 0.25));
  drop('cred', t.x, t.y + 6, { v });
  (G.cjob ? jobKarma : gainKarma)(
    Math.round(d.karma * 0.6 * DIFF[G.diff].karma * (1 + G.stage * 0.3 + G.ng * 0.3))
  );
  G.texts.push({ x: t.x, y: t.y, z: t.z + 60, s: 'SPARED · ¥' + v, c: '#7dffb0', life: 60, sm: true });
  bump('spared');
  if (G.run) G.run.spared = (G.run.spared || 0) + 1;
  t.inv = 9999; // spared and paid: they leave untouched (no second payout)
  if (G.world && G.wd && (t.kind === 'cop' || t.kind === 'sec')) G.wd.rep = Math.min(100, G.wd.rep + 1);
  setS(t, 'flee');
}
// a boss's line between phases (0: enraged, 1: on its last quarter)
function taunt(e, phase) {
  const L = TAUNTS[e.kind];
  if (!L) return;
  G.texts.push({
    x: e.x,
    y: e.y,
    z: e.z + 96 * ((e.d && e.d.scale) || 1),
    s: '“' + L[phase % L.length] + '”',
    c: '#efe9ff',
    life: 110
  });
}
function strike(att, reach, dmg, o) {
  let hit = false;
  o = Object.assign({}, o || {});
  if (att.team === 0) {
    o.src = att;
    if (o.melee === undefined) o.melee = true;
    if (att.D && att.D.breaker) o.breaker = true;
  }
  o.ax = att.x;
  o.att = att;
  for (const t of G.ents) {
    if (t.team === att.team || t.state === 'dead' || t.out) continue;
    if (t.state === 'down' && !o.air && !canJuggle(t, att)) continue;
    const sc = (t.d && t.d.scale) || 1;
    const dx = (t.x - att.x) * att.face;
    if (dx < -6 || dx > reach + 6 * sc) continue;
    if (Math.abs(t.y - att.y) > 9 * sc) continue;
    if (!inZ(att, t)) continue;
    if (hurt(t, dmg, att.face, Object.assign({}, o))) hit = true;
  }
  return hit;
}
function hitbox(t) {
  const sc = (t.d && t.d.scale) || 1;
  if (t.d && t.d.dragon) return [t.z - 30, t.z + 80];
  if (t.d && t.d.fly) return [t.z - 10, t.z + 12];
  return [t.z + 2, t.z + 46 * sc];
}
function burst(x, y, z, col, n) {
  if (RM || lowFx()) n = Math.ceil(n / 2);
  for (let i = 0; i < n; i++)
    G.parts.push({
      x,
      y,
      z,
      vx: rand(-2, 2),
      vy: rand(-0.4, 0.4),
      vz: rand(0.5, 3),
      life: ri(14, 26),
      c: col,
      sz: rand(1, 2.4)
    });
}

function explode(pr, o) {
  o = o || {};
  const big = !o.gun && pr.src && has(pr.src, 'over') ? 1.6 : 1;
  sfx.boom();
  G.shake = 7;
  burst(pr.x, pr.y, pr.z, '#ff6a3d', 18);
  burst(pr.x, pr.y, pr.z, '#ffc63d', 10);
  G.fx.push({ k: 'ring', x: pr.x, y: pr.y, z: pr.z, c: '#ff6a3d', life: 18, max: 18, r: 40 * big });
  G.fx.push({
    k: 'boom',
    x: pr.x,
    y: pr.y,
    z: pr.z + 8,
    c: '#ff6a3d',
    life: 30,
    max: 30,
    r: 30 * big,
    rot: rand(0, 6)
  });
  for (const t of G.ents) {
    if (t.team !== 1 || t.state === 'dead') continue;
    if (Math.abs(t.x - pr.x) < 36 * big && Math.abs(t.y - pr.y) < 16 * big)
      hurt(t, pr.dmg, t.x >= pr.x ? 1 : -1, {
        kd: true,
        kb: 8,
        big: true,
        col: '#ff6a3d',
        air: true,
        src: pr.src,
        ax: pr.x,
        magic: !o.gun,
        bullet: false
      });
  }
}
