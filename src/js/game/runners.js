/* Cyber City Tactics · src/js/game/runners.js
 * Runner update: movement, combos, heavy blows, grabs, dodges, guns, spells, specials, medkits and respawning.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ================= runners ================= */
function physics(e) {
  if (e.d && e.d.fly && e.state !== 'dead') return;
  if (e.z > 0 || e.vz !== 0) {
    e.vz -= 0.28;
    e.z += e.vz;
    e.x += e.vx;
    if (e.z <= 0) {
      e.z = 0;
      e.vz = 0;
      e.vx = 0;
      if (e.thrown) {
        const src = e.thrown;
        e.thrown = null;
        if (e.state !== 'dead') {
          const dmg = 8 + src.D.melee * 0.7;
          e.state = 'down';
          e.hp -= Math.round(dmg);
          G.texts.push({ x: e.x, y: e.y, z: 40, s: '' + Math.round(dmg), c: '#efe9ff', life: 30 });
          burst(e.x, e.y, 4, '#a79dc2', 10);
          sfx.heavy();
          G.shake = 5;
          if (e.hp <= 0) {
            e.state = 'down';
            kill(e, Math.sign(e.vx) || 1);
          }
        }
      }
    }
  }
}
function spGain(p, n) {
  if (!p || p.team !== 0 || G.den) return;
  const was = p.sp || 0;
  p.sp = Math.min(100, was + n);
  if (was < 100 && p.sp >= 100) {
    say(p, '★ SPECIAL READY', '#ffc63d', 80, 60);
    sfx.loot();
    tip(
      'special',
      'Your special is ready. Tap ★ to unleash it.',
      'Your special is ready. Press F (or punch and kick together) to unleash it.'
    );
  }
}
function doSpecial(p) {
  if (G.training) G.tf.special = true;
  const A0 = ARCH[p.arch] || ARCH.runner;
  p.sp = 0;
  sfx.level();
  bump('specials');
  buzz([30, 30, 60]);
  G.flash = Math.max(G.flash, 0.25);
  G.texts.push({ x: p.x, y: p.y, z: 84, s: A0.spName.toUpperCase(), c: '#ffc63d', life: 70, big: true });
  G.fx.push({ k: 'ring', x: p.x, y: p.y, z: 20, c: '#ffc63d', life: 22, max: 22, r: 70 });
  if (p.arch === 'samurai') {
    p.danceHit = [];
    p.inv = Math.max(p.inv, 36);
    setS(p, 'dance');
  } else if (p.arch === 'mage') {
    setS(p, 'cast');
    p.t = 10;
    const foes = G.ents
      .filter(e => e.team === 1 && e.state !== 'dead' && e.x > G.camX - 8 && e.x < G.camX + W + 8)
      .sort(() => Math.random() - 0.5)
      .slice(0, 6);
    foes.forEach((e, i) => G.zaps.push({ tg: e, delay: 8 + i * 7, dmg: 18 + p.D.spell * 1.7, src: p }));
    if (!foes.length) say(p, 'NO TARGETS', '#a79dc2', 60, 40, true);
  } else if (p.arch === 'gunslinger') {
    G.slowFoes = 240;
    p.freeAmmo = 240;
    sfx.spell();
  } else if (p.arch === 'shaman') {
    setS(p, 'cast');
    p.t = 10;
    for (let i = 0; i < 2; i++) spawnSummon('ember', p, 900, i ? -1 : 1);
  } else if (p.arch === 'rigger') {
    sfx.zap();
    for (let i = 0; i < 3; i++) spawnSummon('drone', p, 720, i - 1);
  } else if (p.arch === 'decker') {
    sfx.zap();
    G.flash = Math.max(G.flash, 0.35);
    const hk = p.D.a.hak || 1;
    for (const e of G.ents) {
      if (
        e.team !== 1 ||
        e.state === 'dead' ||
        e.x < G.camX - 8 ||
        e.x > G.camX + W + 8 ||
        (e.d && e.d.passive && e.kind !== 'node')
      )
        continue;
      G.fx.push({ k: 'zap', x: e.x, y: e.y, z: e.z + 20, c: '#45d2ff', life: 12, max: 12, r: 0 });
      const tech =
        (e.d && e.d.fly && !e.d.spirit) ||
        ['ice', 'blackice', 'glitch', 'node', 'cop', 'sec', 'riot'].includes(e.kind);
      if (tech)
        G.zaps.push({
          tg: e,
          delay: 4 + Math.floor(Math.random() * 10),
          dmg: 20 + hk * 7,
          src: p,
          bul: true
        });
      e.cool = Math.max(e.cool || 0, 240);
      if (!e.d.boss && !e.d.fly && !e.d.passive && e.state !== 'down') setS(e, 'hurt');
    }
  } else {
    const n = Math.round(p.maxHp * 0.3);
    p.hp = Math.min(p.maxHp, p.hp + n);
    p.buffT = 300;
    say(p, '+' + n + ' HP', '#7dffb0', 60, 40);
  }
}
function useItem(p) {
  if (PARTY.med > 0 && p.hp < p.maxHp) {
    PARTY.med--;
    const n = Math.round(p.maxHp * 0.45);
    p.hp = Math.min(p.maxHp, p.hp + n);
    sfx.heal();
    burst(p.x, p.y, 30, '#7dffb0', 12);
    say(p, '+' + n + ' HP', '#7dffb0', 60, 40);
  } else {
    sfx.click();
    say(p, PARTY.med ? 'HP FULL' : 'NO MEDKITS', '#a79dc2', 60, 40, true);
  }
}
function nearNPC(p) {
  if (!G.den) return null;
  for (const n of NPCS) if (Math.abs(n.x - p.x) < 24 && Math.abs(208 - p.y) < 26) return n;
  return null;
}
function upRunner(p) {
  const I = INP[p.idx] || INP[0],
    D = p.D;
  p.t++;
  if (p.inv > 0) p.inv--;
  if (p.flash > 0) p.flash--;
  const wasAir = p.z > 0;
  physics(p);
  if (p.mp < p.maxMp && G.t % D.regen === 0) p.mp++;
  if (p.state === 'dead') {
    if (p.t > 100) respawn(p);
    return;
  }
  if (p.state === 'down') {
    if (p.t > 50) {
      setS(p, 'idle');
      p.inv = 60;
    }
    return;
  }
  if (p.state === 'hurt') {
    if (p.t > 15) setS(p, 'idle');
    return;
  }
  if ((p.state === 'jump' || p.state === 'jkick') && wasAir && p.z === 0) setS(p, 'idle');
  if (I.pressed.item) useItem(p);
  if (p.buffT > 0) {
    p.buffT--;
    if (G.t % 4 === 0)
      G.parts.push({
        x: p.x + rand(-8, 8),
        y: p.y,
        z: rand(5, 40),
        vx: 0,
        vy: 0,
        vz: 0.6,
        life: 14,
        c: '#ff6a3d',
        sz: 2
      });
  }
  if (p.freeAmmo > 0) p.freeAmmo--;
  if (p.shieldT > 0) {
    p.shieldT--;
    if (p.shieldT === 0) p.shield = 0;
  }
  // hold PUNCH to charge a heavy blow; release to swing
  const canCharge = !G.den && !p.holding && p.state !== 'grab' && p.z === 0;
  if (I.held.punch && canCharge) {
    p.chargeT = (p.chargeT || 0) + 1;
    if (p.chargeT === 32) {
      sfx.zap();
      G.fx.push({ k: 'ring', x: p.x, y: p.y, z: 2, c: '#ff3d8b', life: 14, max: 14, r: 22 });
    }
  } else {
    if ((p.chargeT || 0) >= 32 && canCharge && ['idle', 'walk', 'punch'].includes(p.state)) {
      setS(p, 'heavy');
      tip('charge2', 'Heavy blows break guards and knock everyone in front of you down.');
    }
    p.chargeT = 0;
  }
  if (I.pressed.swap && p.spells.length > 1) {
    p.spell = (p.spell + 1) % p.spells.length;
    sfx.click();
    say(p, SPELLS[p.spells[p.spell]].name.toUpperCase(), '#45d2ff', 60, 40, true);
  }
  // grab
  if (p.state === 'grab') {
    const e = p.grab;
    if (!e || e.state !== 'grabbed') {
      releaseGrab(p);
      return;
    }
    e.x = p.x + p.face * 12;
    e.y = p.y;
    e.face = -p.face;
    if (p.t > 100) {
      releaseGrab(p);
      return;
    }
    if (I.pressed.punch) {
      p.knees++;
      p.kneeT = 8;
      if (p.knees >= 3) {
        hurt(e, (6 + D.melee * 0.6) * (has(p, 'brute') ? 1.5 : 1), p.face, {
          kd: true,
          kb: 8,
          src: p,
          ax: p.x
        });
        p.grab = null;
        setS(p, 'idle');
      } else
        hurt(e, (4 + D.melee * 0.45) * (has(p, 'brute') ? 1.5 : 1), p.face, { src: p, ax: p.x, melee: true });
    } else if (I.pressed.kick) {
      let dir = (I.held.right ? 1 : 0) - (I.held.left ? 1 : 0) || p.face;
      p.grab = null;
      setS(p, 'throw');
      if (G.training) G.tf.threw = true;
      setS(e, 'down');
      e.vz = 3.4;
      e.vx = dir * 4.6;
      e.x = p.x + dir * 8;
      e.z = 8;
      e.thrown = p;
      e.thrownHit = [];
      sfx.heavy();
    }
    if (p.kneeT > 0) p.kneeT--;
    return;
  }
  const busy = {
    punch: 13,
    upper: 20,
    kick: 20,
    shoot: 13,
    cast: 24,
    lift: 10,
    throw: 16,
    roll: 22,
    heavy: 24,
    dance: 26
  };
  if (busy[p.state]) {
    const t = p.t,
      m = D.melee,
      R = D.reach;
    if (p.state === 'punch' && t === 4 && !G.den) {
      if (!strike(p, 22 + R, 4 + m * 0.65, { breaker: has(p, 'breaker') || D.breaker })) sfx.whiff();
    }
    if (p.state === 'upper' && t === 6 && !G.den) {
      if (!strike(p, 24 + R, 8 + m * 0.9, { kd: true, kb: 6, breaker: has(p, 'breaker') || D.breaker }))
        sfx.whiff();
    }
    if (p.state === 'kick' && t === 7 && !G.den) {
      if (!strike(p, 30 + R * 0.6, 6 + m * 0.8, { kb: 7, breaker: true })) sfx.whiff();
    }
    if (p.state === 'shoot') {
      const g = p.eq.gun,
        q = has(p, 'quick') ? 0.7 : 1,
        T = n => t === Math.round(n * q);
      if (g) {
        if (g.fire === 'burst') {
          if (T(2) || T(6) || T(10)) fireBullet(p, D.gun, p.z + 27);
        } else if (g.fire === 'auto') {
          if (T(2) || T(5) || T(8) || T(11)) fireBullet(p, D.gun, p.z + 27);
        } else if (T(3)) fireBullet(p, D.gun, p.z + 27, g.fire);
      }
    }
    if (p.state === 'cast' && t === 10) castSpell(p);
    if (p.state === 'throw' && t === 4 && p.holding) throwProp(p);
    if (p.state === 'roll') {
      p.x += p.rdx * 3.3;
      p.y += p.rdy * 1.8;
    }
    if (p.state === 'heavy' && t === 9) {
      let hh = strike(p, 34 + R, 14 + m * 1.4, { kd: true, kb: 10, breaker: true, big: true });
      if (has(p, 'whirl')) {
        p.face *= -1;
        hh = strike(p, 30 + R, 12 + m * 1.2, { kd: true, kb: 8, breaker: true, big: true }) || hh;
        p.face *= -1;
        G.fx.push({ k: 'ring', x: p.x, y: p.y, z: 20, c: '#ff3d8b', life: 12, max: 12, r: 34 });
      }
      if (legOf(p, 'weapon') === 'maul')
        explode({ x: p.x + p.face * 34, y: p.y, z: 4, dmg: 12 + m * 0.8, src: p }, { gun: true });
      if (p.eq.weapon && p.eq.weapon.look === 'hammer') {
        G.fx.push({ k: 'ring', x: p.x + p.face * 30, y: p.y, z: 2, c: '#b98cff', life: 16, max: 16, r: 46 });
        for (const e of G.ents)
          if (
            e.team === 1 &&
            e.state !== 'dead' &&
            !e.d.fly &&
            !e.d.boss &&
            !e.d.passive &&
            e.state !== 'down' &&
            Math.abs(e.x - p.x - p.face * 30) < 50 &&
            Math.abs(e.y - p.y) < 22
          ) {
            setS(e, 'down');
            e.vz = 2.4;
            e.vx = Math.sign(e.x - p.x) * 1.5;
          }
      }
      if (!hh) sfx.whiff();
      G.shake = Math.max(G.shake, 4);
    }
    if (p.state === 'dance') {
      p.x += p.face * 6.5;
      if (t % 2 === 0)
        G.parts.push({
          x: p.x - p.face * 8,
          y: p.y,
          z: rand(10, 40),
          vx: -p.face,
          vy: 0,
          vz: 0,
          life: 12,
          c: '#e9f6ff',
          sz: 2.5
        });
      for (const e of G.ents) {
        if (e.team !== 1 || e.state === 'dead' || p.danceHit.includes(e)) continue;
        if (Math.abs(e.x - p.x) < 24 && Math.abs(e.y - p.y) < 14) {
          p.danceHit.push(e);
          hurt(e, 20 + D.melee * 1.2, p.face, {
            kd: true,
            big: true,
            src: p,
            ax: p.x,
            breaker: true,
            air: true,
            col: '#e9f6ff'
          });
        }
      }
    }
    if (t >= (p.state === 'shoot' && has(p, 'quick') ? Math.round(busy.shoot * 0.7) : busy[p.state]))
      setS(p, 'idle');
    p.y = clamp(p.y, FY0 + 6, FY1);
    clampX(p);
    return;
  }
  let dx = (I.held.right ? 1 : 0) - (I.held.left ? 1 : 0),
    dy = (I.held.down ? 1 : 0) - (I.held.up ? 1 : 0);
  const air = p.z > 0 || p.vz > 0,
    spd = D.spd * (p.holding ? 0.75 : 1) * ((p.chargeT || 0) > 12 ? 0.5 : 1) * (p.buffT > 0 ? 1.2 : 1);
  p.x += dx * (air ? spd + 0.15 : spd);
  p.y += dy * (air ? 0.6 : spd * 0.63);
  if (dx) p.face = dx;
  if (p.state === 'jkick' && !p.didHit) {
    if (strike(p, 26 + D.reach * 0.5, 7 + D.melee * 0.9, { kd: true, air: true, kb: 6 })) p.didHit = true;
  }
  if (!air) {
    if (p.holding) {
      if (I.pressed.punch || I.pressed.gun) {
        setS(p, 'throw');
      } else if (I.pressed.kick) {
        dropProp(p);
      } else {
        const mv = dx || dy;
        if (mv) {
          if (p.state !== 'walk') setS(p, 'walk');
          p.walk += spd / 1.75;
        } else if (p.state !== 'idle') setS(p, 'idle');
      }
    } else if ((I.pressed.special || (I.pressed.punch && I.pressed.kick)) && (p.sp || 0) >= 100 && !G.den) {
      doSpecial(p);
    } else if (I.pressed.special && !G.den) {
      sfx.click();
      say(p, '★ ' + Math.floor(p.sp || 0) + '%', '#ffc63d', 56, 30, true);
    } else if (I.pressed.dodge) {
      p.rdx = dx || (dy ? 0 : p.face);
      p.rdy = dy;
      if (p.rdx) p.face = p.rdx;
      setS(p, 'roll');
      sfx.roll();
    } else if (I.pressed.jump) {
      p.vz = 4.7;
      setS(p, 'jump');
      sfx.jump();
    } else if (I.pressed.punch) {
      const npc = nearNPC(p);
      if (npc) {
        openNPC(npc.id);
        return;
      }
      const door = nearDoor(p);
      if (
        door &&
        !G.ents.some(e => e.team === 1 && e.state !== 'dead' && !e.d.passive && Math.abs(e.x - p.x) < 70)
      ) {
        openDoor(door);
        return;
      }
      const prop = !G.den && G.props.find(o => Math.abs(o.x - p.x) < 16 && Math.abs(o.y - p.y) < 9);
      const foeNear = G.ents.some(
        e =>
          e.team === 1 &&
          !e.d.passive &&
          e.state !== 'dead' &&
          Math.abs(e.y - p.y) < 10 &&
          (e.x - p.x) * p.face > -4 &&
          (e.x - p.x) * p.face < 30
      );
      if (prop && !foeNear) {
        G.props.splice(G.props.indexOf(prop), 1);
        p.holding = prop;
        setS(p, 'lift');
        sfx.grab();
      } else {
        if (G.t - p.lastPunch < 30) p.combo++;
        else p.combo = 1;
        p.lastPunch = G.t;
        if (p.combo >= 3) {
          p.combo = 0;
          setS(p, 'upper');
        } else setS(p, 'punch');
      }
    } else if (I.pressed.kick) {
      setS(p, 'kick');
    } else if (I.pressed.gun && !G.den && modOn('brawl')) {
      sfx.click();
      say(p, 'GUNS LOCKED', '#ffc63d', 56, 40, true);
    } else if (I.pressed.gun && !G.den) {
      if (!p.eq.gun) {
        sfx.click();
        say(p, 'NO GUN', '#ffc63d', 56, 40, true);
      } else if (p.ammo > 0 || p.freeAmmo > 0) {
        setS(p, 'shoot');
      } else {
        sfx.click();
        say(p, 'NO AMMO', '#ffc63d', 56, 40, true);
      }
    } else if (I.pressed.spell && !G.den) {
      const sp = SPELLS[p.spells[p.spell]],
        cst = spellCost(p, sp),
        free = has(p, 'archon') && (p.casts || 0) % 4 === 3;
      if (free || p.mp >= cst) {
        if (!free) p.mp -= cst;
        p.casts = (p.casts || 0) + 1;
        p.archonNow = free;
        if (free) say(p, 'ARCHON', '#b98cff', 70, 34, true);
        setS(p, 'cast');
        sfx.spell();
      } else {
        sfx.click();
        say(p, 'NO MANA', '#45d2ff', 56, 40, true);
      }
    } else {
      if (!G.den && tryGrab(p, dx)) return;
      const mv = dx || dy;
      if (mv) {
        if (p.state !== 'walk') setS(p, 'walk');
        p.walk += spd / 1.75;
      } else if (p.state !== 'idle') setS(p, 'idle');
    }
  } else if (p.state === 'jump' && (I.pressed.punch || I.pressed.kick)) {
    p.state = 'jkick';
    p.didHit = false;
  }
  p.y = clamp(p.y, FY0 + 6, FY1);
  clampX(p);
}
function clampX(p) {
  if (G.den || (G.world && !G.dun)) p.x = clamp(p.x, G.camX + 10, Math.min(curS().len - 10, G.camX + W - 10));
  else p.x = clamp(p.x, G.camX + 10, G.camX + W - 10);
}
function respawn(p) {
  if (G.training) {
    p.hp = p.maxHp;
    setS(p, 'idle');
    p.dead = false;
    p.inv = 90;
    return;
  }
  p.lives--;
  G.stageLost = (G.stageLost || 0) + 1;
  if (PARTY.contract && PARTY.contract.key === 'ghost' && !PARTY.contract.done) PARTY.contract.failed = true;
  if (p.lives < 0) {
    p.lives = 0;
    p.out = true;
    G.ents = G.ents.filter(e => e !== p);
    if (!active().length) {
      if (G.arena) {
        arenaOver();
        return;
      }
      if (G.world) {
        worldWipe();
        return;
      }
      logRun(
        'Campaign',
        'Flatlined',
        'district ' +
          (G.stage + 1) +
          (G.muts && G.muts.length ? ' · ' + G.muts.map(k => MUTS[k]).join(', ') : '')
      );
      musicPlay(null);
      M.cur = null;
      setMode('over');
    } else say(active()[0], p.name + ' IS OUT', '#ff3d8b', 80, 90);
    return;
  }
  p.hp = p.maxHp;
  p.mp = Math.max(p.mp, Math.round(p.maxMp / 2));
  setS(p, 'idle');
  p.dead = false;
  p.inv = 120;
  p.z = 30;
  p.vz = 0;
  p.vx = 0;
  for (const e of G.ents)
    if (e.team === 1 && e.state !== 'dead' && Math.abs(e.x - p.x) < 70)
      hurt(e, 4, e.x > p.x ? 1 : -1, { kd: true, kb: 16 });
  say(p, 'BACK IN', '#45d2ff', 70, 60);
}
function fireBullet(src, dmg, z, spread) {
  const fire = typeof spread === 'string' ? spread : spread ? 'spread' : 'single';
  spread = fire === 'spread';
  if (G.training && src.team === 0) G.tf.shot = true;
  if (src.team === 0) {
    if (src.freeAmmo > 0) sfx.shot();
    else {
      if (src.ammo <= 0) return;
      if (!(legOf(src, 'gun') === 'wyrmfang' && Math.random() < 0.5)) src.ammo--;
      sfx.shot();
    }
  } else sfx.zap();
  const base = { team: src.team, src: src.team === 0 ? src : null, z };
  if (spread) {
    const bs = legOf(src, 'gun') === 'boomstick',
      n = bs ? 2 : 1;
    for (let i = -n; i <= n; i++)
      G.projs.push(
        Object.assign(
          {
            k: 'bullet',
            x: src.x + src.face * 18,
            y: src.y + i * 5,
            vx: src.face * 6.5,
            dmg: dmg * 0.55,
            life: 20,
            kd: bs
          },
          base
        )
      );
  } else if (fire === 'grenade')
    G.projs.push(
      Object.assign(
        { k: 'nade', x: src.x + src.face * 18, y: src.y, vx: src.face * 3.6, vz: 2.6, dmg, life: 120, r: 4 },
        base,
        { z: z + 2 }
      )
    );
  else
    G.projs.push(
      Object.assign(
        {
          k: 'bullet',
          x: src.x + src.face * 18,
          y: src.y,
          vx: src.face * (fire === 'pierce' ? 9 : 6.2),
          dmg,
          life: 90,
          rail: fire === 'pierce',
          seek: fire === 'seek',
          pierce: fire === 'pierce' ? 99 : src.team === 0 && has(src, 'pierce') ? 1 : 0,
          hit: []
        },
        base
      )
    );
  burst(src.x + src.face * 20, src.y, z, '#ffe28a', 4);
}
function castSpell(p) {
  if (G.training) G.tf.cast = true;
  const id = p.spells[p.spell],
    pw0 = p.D.spell,
    am = p.archonNow ? 2 : 1;
  p.archonNow = false;
  const pw = pw0 * am + (am > 1 ? 14 : 0);
  const fm = p.D.spellMul || 1;
  if (id === 'fire')
    G.projs.push({
      k: 'fire',
      team: 0,
      src: p,
      x: p.x + p.face * 16,
      y: p.y,
      z: p.z + 28,
      vx: p.face * 3.8,
      dmg: 14 + pw,
      life: 130,
      r: 6
    });
  if (id === 'bolt')
    G.projs.push({
      k: 'bolt',
      team: 0,
      src: p,
      x: p.x + p.face * 16,
      y: p.y,
      z: p.z + 28,
      vx: p.face * 7,
      dmg: 10 + pw * 1.25,
      life: 80,
      r: 4
    });
  if (id === 'barrier') {
    p.shield = Math.round((30 + pw * 2.2) * fm);
    p.shieldT = 360;
    sfx.heal();
    say(p, 'BARRIER ' + p.shield, '#45d2ff', 64, 44);
  }
  if (id === 'chain') {
    let from = p,
      hit = [];
    const first = G.ents
      .filter(
        e =>
          e.team === 1 &&
          e.state !== 'dead' &&
          (e.x - p.x) * p.face > 0 &&
          Math.abs(e.x - p.x) < 170 &&
          Math.abs(e.y - p.y) < 30
      )
      .sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
    if (!first) {
      say(p, 'NO TARGET', '#a79dc2', 60, 30, true);
    }
    let cur = first;
    for (let i = 0; cur && i < 3; i++) {
      hit.push(cur);
      G.zaps.push({ tg: cur, delay: 2 + i * 5, dmg: 12 + pw * 1.1, src: p });
      const c = cur;
      cur = G.ents
        .filter(
          e => e.team === 1 && e.state !== 'dead' && !hit.includes(e) && Math.hypot(e.x - c.x, e.y - c.y) < 80
        )
        .sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
    }
  }
  if (id === 'heal') {
    const n = Math.round((20 + pw * 1.6) * fm);
    for (const q of alive())
      if (q === p || Math.hypot(q.x - p.x, q.y - p.y) < 60) {
        q.hp = Math.min(q.maxHp, q.hp + n);
        burst(q.x, q.y, 30, '#7dffb0', 14);
        say(q, '+' + n + ' HP', '#7dffb0', 64, 44);
      }
    sfx.heal();
    G.fx.push({ k: 'ring', x: p.x, y: p.y, z: 20, c: '#7dffb0', life: 20, max: 20, r: 60 });
  }
}
