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
  if (t.state === 'down' && !o.air) return false;
  // Parry: dodge in the last moment before a melee hit lands and the attacker is thrown off balance
  if (
    t.team === 0 &&
    t.kind === 'player' &&
    t.state === 'roll' &&
    t.t <= PARRY_WINDOW + (t.cy && t.cy.boost ? 6 : 0) &&
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
  if (t.elite === 'warded') {
    o.kd = false;
    if (o.magic) dmg *= 0.4;
  }
  if (t.elite === 'armored' && o.bullet && !o.ap) dmg *= 0.45;
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
    dmg *= o.bullet && has(o.src, 'deadeye') ? 2.5 : 1.8;
    crit = true;
  }
  dmg = Math.max(1, Math.round(dmg));
  const fixed = t.d && t.d.passive;
  t.hp -= dmg;
  t.flash = 8;
  if (t.team === 0 && legOf(t, 'armor') === 'dragonscale')
    t.mp = Math.min(t.maxMp, t.mp + Math.round(dmg * 0.5));
  const heavy = !!(t.d && t.d.heavy);
  if (t.state !== 'grabbed' && !fixed && !heavy) t.x += dir * (o.kb || 3);
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
  G.stop = big ? 5 : 3;
  G.shake = Math.max(G.shake, o.big ? 6 : crit ? 4 : 2);
  if (crit) G.flash = Math.max(G.flash, 0.12);
  if (G.run) {
    if (o.src) G.run.dealt += dmg;
    if (t.team === 0) G.run.taken += dmg;
  }
  if (t.team === 0 && t.idx === 0) buzz(big ? 60 : 30);
  else if (o.src && o.src.idx === 0 && big) buzz(12);
  (big ? sfx.heavy : sfx.hit)();
  if (o.src && o.src.kind === 'player' && t.team === 1 && !o.team && t.hp > 0) teamCheck(t, o.src);
  if (o.src) {
    G.combo++;
    G.comboT = 0;
    if (G.combo > G.bestCombo) G.bestCombo = G.combo;
    if (G.combo >= 25) peak('combo', G.combo);
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
  if (t.team === 0 && o.att && o.att.elite === 'vampiric' && o.att.state !== 'dead') {
    const v = o.att;
    v.hp = Math.min(v.maxHp, v.hp + Math.round(dmg * 0.6));
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
  if (t.d && t.d.boss && !t.enraged && t.hp > 0 && t.hp < t.maxHp * 0.5) enrage(t);
  if (t.team === 0) {
    if (t.holding) dropProp(t);
    if (t.grab) releaseGrab(t);
  }
  if (t.hp <= 0) {
    kill(t, dir, o);
    return true;
  }
  if (fixed) {
    sfx.clank();
    return true;
  }
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
  if (o.kd || t.hits >= 3) {
    setS(t, 'down');
    t.vz = 2.8;
    t.vx = dir * 2.2;
    t.hits = 0;
    if (t.team === 0) sfx.hurt();
  } else {
    setS(t, 'hurt');
    if (t.team === 0) sfx.hurt();
    else if (o.src && G.combo >= 4)
      tip(
        'grab',
        'Walk into a staggered enemy to grab it. PUNCH to knee, KICK to throw.',
        'Walk into a staggered enemy to grab it. J to knee, K to throw them into the crowd.'
      );
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
  }
  if (t.state === 'grabbed') {
    const g = PL.find(p => p.grab === t);
    if (g) {
      g.grab = null;
      setS(g, 'idle');
    }
  }
  setS(t, 'dead');
  t.vz = 3.2;
  t.vx = dir * 2.6;
  t.hp = 0;
  if (t.team === 0) {
    t.dead = true;
    return;
  }
  const d = t.d;
  if (d.boss) {
    G.texts.push({ x: t.x, y: t.y, z: t.z + 64, s: 'FLATLINED', c: '#efe9ff', life: 70 });
    G.slow = 70;
    G.flash = 0.5;
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
  gainKarma(
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
// Team attack: both runners land a hit on the same enemy within half a second for a combined finisher
const TEAM_WINDOW = 30;
function teamCheck(t, sp) {
  const prev = t.lastBy;
  t.lastBy = { i: sp.idx, t: G.t };
  if (!G.coop || !prev || prev.i === sp.idx || G.t - prev.t > TEAM_WINDOW || (t.teamCD || 0) > G.t) return;
  t.teamCD = G.t + 120;
  const a = PL[0],
    b = PL[1],
    dmg = Math.round(14 + (a.D.melee + b.D.melee) * 0.6);
  G.slow = Math.max(G.slow, 16);
  G.flash = Math.max(G.flash, 0.18);
  G.fx.push({ k: 'ring', x: t.x, y: t.y, z: 26, c: '#ffc63d', life: 22, max: 22, r: 46 });
  G.texts.push({ x: t.x, y: t.y, z: t.z + 84, s: 'TEAM UP!', c: '#ffc63d', life: 60, big: true });
  bump('teamups');
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
    if (t.state === 'down' && !o.air) continue;
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
