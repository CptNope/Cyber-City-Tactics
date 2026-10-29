/* Cyber City Tactics · src/js/game/update.js
 * One simulation step: entities, projectiles, pickups, waves, the Den, the camera and district clears.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ================= world update ================= */
function update() {
  G.t++;
  if (G.banner > 0) G.banner--;
  else if (G.banner < 0) G.banner++;
  if (G.goT > 0 && !G.waveLive) G.goT--;
  if (G.fade > 0 && !G.outro) G.fade = Math.max(0, G.fade - 0.035);
  if (G.flash > 0) G.flash = Math.max(0, G.flash - 0.05);
  G.comboT++;
  if (G.comboT > (G.dun && G.dun.b.type === 'club' ? 220 : 110)) G.combo = 0;
  if (G.drive) return driveUpdate(); // driving missions run their own step (modes/drive.js)
  if (G.stealth) return stealthUpdate(); // and so do drone stealth jobs (modes/stealth.js)
  for (const p of PL) {
    if (p.parryT > 0) p.parryT--;
    if (p.chiT > 0) p.chiT--;
    if (!p.out) upRunner(p);
  }
  reviveTick();
  for (const e of G.ents) if (e.kind === 'ally') upAlly(e);
  if (G.mode !== 'play' && G.mode !== 'den') return;
  // melee slots per target
  for (const p of PL) {
    const mel = G.ents
      .filter(
        e => e.team === 1 && e.tgt === p && e.state !== 'dead' && !e.d.ranged && !e.d.fly && !e.d.passive
      )
      .sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x));
    mel.forEach((e, i) => (e.slot = i));
  }
  const slowSkip = G.slowFoes > 0 && G.t % 2 === 1;
  if (G.slowFoes > 0) G.slowFoes--;
  for (const e of G.ents) if (e.team === 1 && (!slowSkip || e.d.passive)) upEnemy(e);
  for (const z of G.zaps) {
    z.delay--;
    if (z.delay === 0) {
      const tg = z.tg;
      if (tg.state !== 'dead') {
        G.fx.push({
          k: 'zap',
          x: tg.x,
          y: tg.y,
          z: tg.z + 20,
          c: z.bul ? '#ffe28a' : '#b98cff',
          life: 10,
          max: 10,
          r: 0
        });
        sfx.zap();
        hurt(tg, z.dmg, tg.x >= z.src.x ? 1 : -1, {
          src: z.src,
          magic: !z.bul && !z.mel,
          bullet: !!z.bul,
          rico: !!z.bul,
          melee: !!z.mel,
          silk: !!z.mel,
          col: z.mel ? '#ff3d8b' : z.bul ? '#ffe28a' : '#b98cff',
          air: true,
          ax: z.src.x
        });
      }
    }
  }
  G.zaps = G.zaps.filter(z => z.delay > 0);
  while (LATER.length) LATER.shift()();
  for (const e of G.ents) {
    if (e.burnT > 0 && e.state !== 'dead') {
      e.burnT--;
      if (G.t % 8 === 0)
        G.parts.push({
          x: e.x + rand(-6, 6),
          y: e.y,
          z: rand(10, 40),
          vx: 0,
          vy: 0,
          vz: rand(0.4, 1),
          life: 14,
          c: Math.random() < 0.5 ? '#ff6a3d' : '#ffc63d',
          sz: 2
        });
      if (e.burnT % 30 === 0) {
        e.hp -= e.burnDmg;
        e.flash = 4;
        G.texts.push({ x: e.x, y: e.y, z: e.z + 48, s: '' + e.burnDmg, c: '#ff6a3d', life: 24, sm: true });
        if (e.hp <= 0) kill(e, 1, { src: active()[0] });
      }
    }
  }
  G.ents = G.ents.filter(e => !e.gone);
  for (const pr of G.projs) {
    pr.x += pr.vx * (pr.team === 1 && G.slowFoes > 0 ? 0.5 : 1);
    pr.life--;
    if (pr.k === 'prop') {
      pr.z += pr.vz;
      pr.vz -= 0.12;
      if (pr.z <= 0) {
        pr.z = 0;
        shatter(pr);
        pr.life = 0;
        continue;
      }
    }
    if (pr.k === 'nade') {
      pr.z += pr.vz;
      pr.vz -= 0.09;
      if (pr.z <= 0) {
        pr.z = 0;
        explode(pr, { gun: true });
        pr.life = 0;
        continue;
      }
    }
    if (pr.seek) {
      let best = null,
        bd = 1e9;
      for (const e of G.ents) {
        if (
          e.team === pr.team ||
          e.team === 2 ||
          e.state === 'dead' ||
          (e.d && e.d.passive) ||
          (e.x - pr.x) * Math.sign(pr.vx) < 0
        )
          continue;
        const d = Math.abs(e.x - pr.x);
        if (d < bd) {
          bd = d;
          best = e;
        }
      }
      if (best) pr.y += clamp(best.y - pr.y, -0.9, 0.9);
    }
    if (pr.k === 'hex') {
      const tg = alive()[0];
      if (tg) {
        let best = tg;
        for (const q of alive()) if (Math.abs(q.x - pr.x) < Math.abs(best.x - pr.x)) best = q;
        pr.y += clamp(best.y - pr.y, -0.25, 0.25);
      }
      if (G.t % 3 === 0)
        G.parts.push({ x: pr.x, y: pr.y, z: pr.z, vx: 0, vy: 0, vz: 0.3, life: 14, c: '#45d2ff', sz: 1.6 });
    }
    if (pr.k === 'fire' && G.t % 2 === 0)
      G.parts.push({
        x: pr.x - pr.vx,
        y: pr.y,
        z: pr.z + rand(-3, 3),
        vx: -pr.vx * 0.1,
        vy: 0,
        vz: rand(0.2, 0.8),
        life: 16,
        c: Math.random() < 0.5 ? '#ff6a3d' : '#ffc63d',
        sz: 2
      });
    if (pr.k === 'wave' && G.t % 2 === 0)
      G.parts.push({
        x: pr.x,
        y: pr.y + rand(-18, 18),
        z: 0,
        vx: 0,
        vy: 0,
        vz: rand(1, 2.5),
        life: 12,
        c: Math.random() < 0.5 ? '#ff6a3d' : '#8a7a9a',
        sz: 2
      });
    if (pr.k === 'bolt')
      G.parts.push({
        x: pr.x - pr.vx * 0.5,
        y: pr.y,
        z: pr.z,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 8,
        c: '#b98cff',
        sz: 2
      });
    if (pr.x < G.camX - 30 || pr.x > G.camX + W + 30) pr.life = 0;
    if (pr.life <= 0) continue;
    for (const t of G.ents) {
      if (t.team === pr.team || t.state === 'dead' || t.state === 'down' || t.inv > 0 || t.out) continue;
      if (Math.abs(t.y - pr.y) > (pr.wide ? 24 : 9) || Math.abs(t.x - pr.x) > 11) continue;
      const hb = hitbox(t);
      if (pr.z < hb[0] || pr.z > hb[1]) continue;
      if (pr.k === 'wave') {
        if (t.team !== 0) continue;
      }
      if (pr.k === 'bullet' && t.d && t.d.noBullet) {
        if (!pr.warned) {
          pr.warned = true;
          G.texts.push({ x: t.x, y: t.y, z: t.z + 30, s: 'IMMUNE', c: '#ffc63d', life: 24, sm: true });
        }
        continue;
      }
      if (pr.hit && pr.hit.includes(t)) continue;
      if (pr.k === 'fire') explode(pr);
      else if (pr.k === 'nade') {
        explode(pr, { gun: true });
      } else if (pr.k === 'prop') {
        hurt(t, pr.dmg, Math.sign(pr.vx), { kd: true, big: true, src: pr.src, ax: pr.x - pr.vx * 10 });
        shatter(pr);
      } else if (pr.k === 'wave') {
        hurt(t, pr.dmg, Math.sign(pr.vx), { kd: true, big: true, col: '#ff6a3d', ax: pr.x - pr.vx * 10 });
        continue;
      } else
        hurt(t, pr.dmg, Math.sign(pr.vx), {
          kb: 5,
          col: pr.k === 'hex' || pr.k === 'laser' ? '#45d2ff' : pr.k === 'bolt' ? '#b98cff' : '#ffe28a',
          kd: pr.k === 'hex' || !!pr.kd,
          src: pr.src,
          ax: pr.x - pr.vx * 10,
          bullet: pr.k === 'bullet',
          magic: pr.k === 'bolt',
          ap: pr.pierce > 0
        });
      if (pr.drain && pr.src && pr.src.state !== 'dead') {
        const n = Math.round(pr.dmg * 0.5);
        pr.src.hp = Math.min(pr.src.maxHp, pr.src.hp + n);
        say(pr.src, '+' + n + ' HP', '#7dffb0', 60, 34, true);
      }
      if (pr.pierce > 0 && pr.k === 'bullet') {
        pr.pierce--;
        pr.hit.push(t);
        continue;
      }
      pr.life = 0;
      break;
    }
  }
  G.projs = G.projs.filter(p => p.life > 0);
  tickFx();
  for (const k of G.picks) {
    k.t++;
    for (const p of alive())
      if (!k.got && p.z < 12 && Math.abs(k.x - p.x) < 13 && Math.abs(k.y - p.y) < 10) collect(k, p);
  }
  G.picks = G.picks.filter(
    k => !k.got && (k.t < 1200 || k.k === 'gear' || k.k === 'chip' || k.k === 'icebrk' || k.k === 'shard')
  );
  if (G.t % 30 === 0 && !G.den) {
    for (const p of alive()) {
      if (G.ents.some(e => e.kind === 'vend' && e.state !== 'dead' && Math.abs(e.x - p.x) < 80))
        tip('vend', 'Smash vending machines for medkits, ammo and mana.');
      if (G.props.some(o => Math.abs(o.x - p.x) < 70 && o.x > G.camX))
        tip(
          'prop',
          'Stand next to a can, crate or drum and tap LIFT, then THROW.',
          'Stand next to a can, crate or drum and press J to lift it, then J again to throw.'
        );
      if (p.hp < p.maxHp * 0.35 && PARTY.med > 0)
        tip('med', 'Low on health. Tap MED to use a medkit.', 'Low on health. Press H to use a medkit.');
    }
  }
  if (G.world) worldTick();
  else if (G.den) denTick();
  else if (G.arena) arenaTick();
  else if (G.training) trainTick();
  else waves();
  camera();
  if (G.shake > 0) G.shake *= 0.85;
  if (G.shake < 0.3) G.shake = 0;
  if (G.outro > 0) {
    G.outro--;
    if (G.outro < 30) G.fade = Math.min(1, G.fade + 0.04);
    if (G.outro === 0 && G.afterOutro) {
      const f = G.afterOutro;
      G.afterOutro = null;
      f();
    }
  }
}
function collect(k, p) {
  if (k.k === 'cred') {
    PARTY.creds += k.v;
    sfx.coin();
    say(p, '+¥' + k.v, '#ffc63d');
  }
  if (k.k === 'med') {
    if (PARTY.med >= 5 && p.hp >= p.maxHp) return;
    if (PARTY.med < 5) {
      PARTY.med++;
      say(p, '+1 MEDKIT', '#7dffb0');
    } else {
      p.hp = Math.min(p.maxHp, p.hp + 25);
      say(p, '+25 HP', '#7dffb0');
    }
    sfx.buy();
  }
  if (k.k === 'ammo') {
    const n = gmodOf(p) === 'mag' ? 12 : 8;
    p.ammo += n;
    sfx.buy();
    say(p, '+' + n + ' AMMO', '#ffe28a');
  }
  if (k.k === 'mana') {
    p.mp = Math.min(p.maxMp, p.mp + 30);
    sfx.buy();
    say(p, '+30 MANA', '#45d2ff');
  }
  if (k.k === 'chip') {
    contractTick('chip');
    sfx.loot();
    say(p, 'DATA CHIP', '#7dffb0');
  }
  if (k.k === 'icebrk') {
    PARTY.ice = (PARTY.ice || 0) + 1;
    sfx.loot();
    say(p, '+1 ICEBREAKER', '#45d2ff');
  }
  if (k.k === 'gear') {
    if (PARTY.bag.length >= BAG_MAX) {
      if (k.t % 60 === 1) say(p, 'BAG FULL', '#a79dc2');
      return;
    }
    PARTY.bag.push(gotItem(k.item));
    sfx.loot();
    say(p, k.item.name.toUpperCase(), RCOL[k.item.rar]);
    gotLegend(k.item);
  }
  if (k.k === 'shard') {
    gotShard(p);
  }
  k.got = true;
}
const waveAt = (S, w) => Math.min(w.at, Math.max(0, S.len - W));
function waves() {
  const S = STAGES[G.stage];
  if (G.outro) return;
  const foes = G.ents.filter(e => e.team === 1 && e.state !== 'dead' && !e.d.passive).length;
  if (G.waveLive && foes === 0) {
    G.waveLive = false;
    G.lock = null;
    G.wave++;
    musicPlay('d' + G.stage);
    if (G.wave >= S.waves.length) G.exitOpen = true;
    G.goT = 150;
  }
  if (!G.waveLive && G.wave < S.waves.length) {
    const w = S.waves[G.wave],
      at = waveAt(S, w); // on a wide screen the camera stops short of the last trigger, so meet it there
    if (G.camX >= at - 1) {
      G.camX = at;
      G.lock = at;
      G.waveLive = true;
      choiceSpawn(G.stage, w).forEach((k0, i) => {
        const re = k0.endsWith('!'),
          k = re ? k0.slice(0, -1) : k0;
        const e = spawnEnemy(k, i % 2 ? -1 : 1);
        e.x += (i >> 1) * (i % 2 ? -18 : 18);
        if (DEF[k].boss) {
          e.x = G.camX + W - 40;
          e.y = (FY0 + FY1) / 2;
          e.inv = 40;
        }
        if (re) rematch(e);
        choiceBoss(e);
      });
      if (w.boss) {
        G.banner = -120;
        musicPlay('boss');
        if (PARTY.contract && PARTY.contract.key === 'ghost' && !PARTY.contract.failed) contractTick('ghost');
      }
    }
  }
  if (G.exitOpen && alive().some(p => p.x > S.len - 24)) stageClear();
}
function denTick() {
  G.denPrompt = null;
  for (const p of alive()) {
    const n = nearNPC(p);
    if (n) G.denPrompt = n;
  }
  if (alive().some(p => p.x > DEN.len - 24)) {
    for (const p of PL) p.x = Math.min(p.x, DEN.len - 60);
    // Juno needs an answer first
    if (pendingChoice()) openNPC('juno');
    else briefing(G.stage + 1, true);
  }
}
function camera() {
  const S = curS(),
    a = alive();
  if (!a.length) return;
  const minX = Math.min(...a.map(p => p.x)),
    maxX = Math.max(...a.map(p => p.x));
  let target = Math.min((minX + maxX) / 2 - W * 0.42, minX - 14);
  if (G.den || (G.world && !G.dun)) {
    G.camX += (clamp(target, 0, Math.max(0, S.len - W)) - G.camX) * 0.12;
    return;
  }
  if (G.arena || G.training || G.dun) {
    G.camX = 0;
    return;
  }
  const next = S.waves[G.wave];
  let max = Math.max(0, S.len - W);
  if (G.lock != null) max = G.lock;
  else if (next) max = Math.min(max, waveAt(S, next));
  target = clamp(target, 0, max);
  if (G.lock != null) target = G.lock;
  if (target > G.camX) G.camX = Math.min(target, G.camX + 2.2);
  G.camX = Math.max(0, G.camX);
}

function stageClear() {
  const C = PARTY.contract,
    def = CONTRACTS[G.stage];
  if (G.coop) feat('coop');
  if (!G.stageLost) feat('ghost');
  if (mutN()) feat('mut1');
  if (modOn('brawl')) feat('knuckles');
  const deb = {
    stage: G.stage,
    title: C ? C.title : 'the job',
    done: !!(C && C.done),
    creds: 0,
    karma: 0,
    prize: null,
    levels: 0
  };
  if (deb.done) {
    deb.creds = def.creds;
    deb.karma = def.karma;
    if (modOn('pacifist') && !G.gunUsed) {
      deb.karma *= 2;
      deb.pacifist = true;
      feat('pacifist');
    }
    PARTY.creds += def.creds;
    if (def.prize) {
      deb.prize = randItem(3, true);
    }
  }
  PARTY.contract = null;
  const l0 = PL[0].lvl;
  if (deb.karma)
    for (const p of PL) {
      p.karma += deb.karma;
      while (p.karma >= karmaNext(p.lvl)) {
        p.karma -= karmaNext(p.lvl);
        p.lvl++;
        p.pts += 2;
        p.spts = (p.spts || 0) + 1;
      }
      refresh(p);
    }
  deb.levels = PL[0].lvl - l0;
  if (deb.prize) {
    const pz = deb.prize;
    pz.rar = 2;
    pz.name = 'Prototype ' + BASES[pz.slot][pz.base].name;
    if (PARTY.bag.length < BAG_MAX) PARTY.bag.push(gotItem(pz));
  }
  G.debrief = deb;
  G.texts.push({ x: G.camX + W / 2, y: 150, z: 0, s: 'DISTRICT CLEAR', c: '#ffc63d', life: 90, big: true });
  G.outro = 90;
  G.afterOutro = () => {
    if (G.stage >= STAGES.length - 1) {
      feat('win');
      if (G.coop) feat('coopwin');
      if (G.diff === 2) feat('prime');
      if (mutN() >= 3) feat('mut3');
      logRun('Campaign', 'Won');
      store.del('cs_save3');
      musicPlay('title');
      setMode('win');
      return;
    }
    for (const p of PL) {
      p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.4));
      p.mp = p.maxMp;
    }
    G.stock = [
      randItem(G.stage + 1, false),
      randItem(G.stage + 1, false),
      randItem(G.stage + 1, true),
      randItem(G.stage, false),
      randItem(G.stage + 1, false)
    ];
    enterDen();
  };
}

// The cosmetic tick shared by every mode (driving missions run their own update but still need it): particles,
// effects, floating text, rain and the tip box
function tickFx() {
  for (const q of G.parts) {
    q.x += q.vx;
    q.y += q.vy;
    q.z += q.vz;
    q.vz -= 0.15;
    if (q.z < 0) {
      q.z = 0;
      q.vz *= -0.3;
      q.vx *= 0.6;
    }
    q.life--;
  }
  G.parts = G.parts.filter(q => q.life > 0);
  const cap = lowFx() ? 90 : 240; // a hard cap so a huge fight can't bog down a slow device
  if (G.parts.length > cap) G.parts.splice(0, G.parts.length - cap);
  for (const f of G.fx) f.life--;
  G.fx = G.fx.filter(f => f.life > 0);
  for (const tx of G.texts) {
    tx.z += 0.5;
    tx.life--;
  }
  G.texts = G.texts.filter(t => t.life > 0);
  const mxr = curS().matrix;
  for (const r of G.rain) {
    r.y += r.s * (mxr ? 0.5 : 1);
    r.x -= mxr ? 0 : 1.2;
    if (r.y > H) {
      r.y = -10;
      r.x = rand(0, W + 40);
    }
  }
  if (G.tip) {
    G.tip.life--;
    if (G.tip.life <= 0) G.tip = G.tipQ && G.tipQ.length ? G.tipQ.shift() : null;
  }
}
