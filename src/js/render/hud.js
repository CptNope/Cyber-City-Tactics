/* Cyber City Tactics · src/js/render/hud.js
 * HUD, banners, toasts, the blackout overlay, and the main render() pass.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
function bar(x, y, w, h, v, max, col) {
  const f = Math.max(0, w * Math.min(1, v / max));
  ctx.fillStyle = '#0b0812';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#2a2238';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = col;
  ctx.fillRect(x, y, f, h);
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.fillRect(x, y, f, 1);
}
function txt(s, x, y, size, col, align, stroke) {
  ctx.font = `600 ${size}px Teko, Impact, sans-serif`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  if (stroke !== false) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0b0812';
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = col;
  ctx.fillText(s, x, y);
}
function drawPanel(p, x) {
  if (p.out) {
    txt(p.name + ' · OUT', x, 18, 15, '#6b6280');
    txt(
      p.outX != null ? 'Stand by the marker to revive' : 'Back next district',
      x,
      30,
      12,
      p.outX != null ? '#7dffb0' : '#6b6280'
    );
    return;
  }
  txt(p.name + ' LV ' + p.lvl, x, 18, 15, p.idx ? '#ffd27a' : '#efe9ff');
  if ((p.pts > 0 || p.spts > 0) && (G.t >> 4) % 2)
    txt('+' + ((p.pts || 0) + (p.spts || 0)) + ' PTS', x + 64, 18, 12, '#ffc63d');
  for (let i = 0; i < p.lives; i++)
    fillPoly([x + 96 + i * 7, 12, x + 99 + i * 7, 9, x + 102 + i * 7, 12, x + 99 + i * 7, 15], p.pal.acc);
  bar(x, 22, 96, 6, p.hp, p.maxHp, '#ff3d8b');
  bar(x, 31, Math.round(96 * Math.min(1, p.maxMp / 80)), 4, p.mp, p.maxMp, '#45d2ff');
  bar(x, 38, 96, 2, p.karma, karmaNext(p.lvl), '#b98cff');
  bar(x, 43, 96, 3, p.sp || 0, 100, (p.sp || 0) >= 100 && (G.t >> 3) % 2 ? '#fff3c4' : '#ffc63d');
  const sp = SPELLS[p.spells[p.spell]];
  if (p.idx === 0) txt('¥' + PARTY.creds, x + 104, 19, 15, '#ffc63d');
  else txt('MED ' + PARTY.med, x + 104, 19, 13, '#7dffb0');
  txt(
    (p.eq.gun ? 'AMMO ' + p.ammo : 'NO GUN') + (p.idx === 0 && !G.coop ? '  ·  MED ' + PARTY.med : ''),
    x + 104,
    30,
    12,
    '#ffe28a'
  );
  txt(
    sp.name.toUpperCase() + ' ' + spellCost(p, sp) + (p.spells.length > 1 ? ' ⇄' : ''),
    x + 104,
    41,
    12,
    '#45d2ff'
  );
}
function wrapTip(s, max) {
  ctx.font = '11px "Chakra Petch", sans-serif';
  const words = s.split(' '),
    out = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > max && line) {
      out.push(line);
      line = w;
    } else line = t;
  }
  if (line) out.push(line);
  return out;
}
// Revive marker where a co-op partner fell, with a progress ring
function drawRevive() {
  for (const q of PL) {
    if (!q.out || q.outX == null) continue;
    const x = q.outX - G.camX,
      y = q.outY - 6,
      pulse = 0.6 + 0.4 * Math.sin(G.t * 0.12);
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#7dffb0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y + 6, 14, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (q.revT > 0) {
      ctx.beginPath();
      ctx.arc(x, y - 30, 9, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * q.revT) / REVIVE_T);
      ctx.stroke();
    }
    txt(q.name + ' DOWN', x, y - 14, 11, '#7dffb0', 'center');
  }
  ctx.lineWidth = 1;
}
// Fog mutator: enemies fade in between 140 and 100 px from the nearest runner
function fogAlpha(e) {
  if (e.team !== 1 || !modOn('fog') || (e.d && e.d.boss)) return 1;
  let dmin = 1e9;
  for (const p of alive()) dmin = Math.min(dmin, Math.hypot(p.x - e.x, (p.y - e.y) * 2));
  return clamp((140 - dmin) / 40, 0, 1);
}
function drawHudTop() {
  // k scales the HUD up when the portrait sky band has room for it; HW is the HUD's own width
  const k = BAND >= 46 ? Math.min(BAND / 46, G.coop ? 1.3 : 1.45) : 1,
    HW = W / k,
    inBand = BAND >= 46;
  ctx.save();
  if (!inBand) ctx.translate(0, BAND);
  ctx.scale(k, k);
  drawPanel(PL[0], 10);
  if (G.coop && PL[1]) drawPanel(PL[1], HW - 180);
  const S = curS(),
    C = PARTY.contract;
  const line1 =
    G.world && G.wd
      ? G.dun
        ? G.dun.b.name.toUpperCase() + ' · ' + (G.dun.room + 1) + '/' + G.dun.rooms
        : 'BLOCK ' +
          G.wd.level +
          (G.wd.street.event ? ' · ' + EVENTS[G.wd.street.event].name.toUpperCase() : '')
      : G.arena
        ? 'WAVE ' + G.awave
        : G.training
          ? 'TRAINING'
          : G.den
            ? 'THE DEN'
            : S.name.toUpperCase();
  let line2 = null,
    col2 = '#efe9ff';
  if (G.arena) {
    line2 = 'SCORE ' + G.score.toLocaleString();
    col2 = '#ffc63d';
  } else if (G.training) {
    line2 = ARCH[PL[0].arch].name.toUpperCase();
    col2 = '#a79dc2';
  } else if (G.world && G.wd) {
    const rp = Math.round(G.wd.rep);
    line2 = 'CRED ' + (rp > 0 ? '+' : '') + rp;
    col2 = rp > 0 ? '#7dffb0' : rp < 0 ? '#ff3d8b' : '#a79dc2';
  } else if (C && !G.den) {
    const st = C.done
      ? 'DONE'
      : C.failed
        ? 'FAILED'
        : C.key === 'ghost'
          ? 'NO DEATHS'
          : C.count + '/' + C.need;
    line2 = C.title.toUpperCase() + ' · ' + st;
    col2 = C.done ? '#7dffb0' : C.failed ? '#ff3d8b' : '#efe9ff';
  }
  // Landscape: place name and objective top right. Portrait sky band: they go on one line along the bottom
  // of the band instead, because the runner panel leaves no room for them on narrow screens.
  if (!G.coop && !inBand) {
    txt(line1, HW - 48, 18, 14, G.arena ? '#efe9ff' : '#a79dc2', 'right');
    if (line2) txt(line2, HW - 48, 30, 12, col2, 'right');
  }
  if (G.world && G.wd) {
    const h = G.wd.heat,
      hot = G.ents.some(e => e.kind === 'cop' && e.state !== 'dead');
    const sy = G.coop ? (inBand ? Math.min(BAND / k - 18, 50) : 50) : inBand ? 18 : 49,
      sx0 = G.coop ? HW / 2 + 30 : HW - 48;
    for (let i = 0; i < 5; i++)
      txt(
        '★',
        sx0 - (4 - i) * 12,
        sy,
        11,
        i < h ? (hot && (G.t >> 3) % 2 ? '#45d2ff' : '#ff3d4a') : '#3a3150',
        'right'
      );
  }
  if (inBand && !(G.world && G.wd && G.coop)) {
    const yb = Math.min(BAND / k - 6, 58);
    txt(line1 + (line2 ? '  ·  ' + line2 : ''), HW / 2, yb, 12, line2 ? col2 : '#a79dc2', 'center');
  }
  ctx.restore();
  if (G.coop && !inBand) {
    const s = (G.arena ? 'WAVE ' + G.awave + ' · ' : G.den ? 'THE DEN' : '') + (line2 || '');
    if (s) txt(s, W / 2, VH - 6, 12, line2 ? col2 : '#a79dc2', 'center');
  }
}
function drawDark() {
  if (!evOn('blackout') || G.dun) return;
  ctx.fillStyle = 'rgba(2,2,8,.5)';
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  for (const p of alive()) {
    const g = ctx.createRadialGradient(p.x - G.camX, p.y - 30, 4, p.x - G.camX, p.y - 30, 90);
    g.addColorStop(0, 'rgba(255,230,180,.16)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(p.x - G.camX - 90, p.y - 120, 180, 180);
  }
  ctx.globalCompositeOperation = 'source-over';
}
function drawToasts() {
  const q = G.toasts;
  if (!q || !q.length) return;
  const t = q[0];
  t.life--;
  if (t.life <= 0) {
    q.shift();
    return;
  }
  const a = Math.min(1, t.life / 20, (260 - t.life) / 12 + 0.0),
    y = H - (G.world && !G.dun ? 60 : 50);
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
  ctx.fillStyle = 'rgba(11,8,18,.88)';
  ctx.fillRect(W / 2 - 150, y, 300, 38);
  ctx.strokeStyle = t.lore ? '#45d2ff' : '#ffc63d';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(W / 2 - 149.5, y + 0.5, 299, 37);
  txt(
    (t.lore ? '◆ ' : '★ FEAT · ') + t.s.toUpperCase(),
    W / 2,
    y + 17,
    15,
    t.lore ? '#9fe9ff' : '#ffc63d',
    'center'
  );
  ctx.font = '10px "Chakra Petch", sans-serif';
  ctx.fillStyle = '#efe9ff';
  ctx.textAlign = 'center';
  ctx.fillText(t.d, W / 2, y + 31);
  ctx.globalAlpha = 1;
}
function drawHud() {
  const S = curS();
  const boss = G.ents.find(e => e.team === 1 && e.d.boss && e.state !== 'dead');
  if (boss) {
    const bw = 200,
      bx = (W - bw) / 2,
      by = G.coop && BAND < 46 ? H - 24 : H - 11;
    txt((boss.name || boss.d.name).toUpperCase(), bx, by - 3, 14, boss.rematch ? '#45d2ff' : '#efe9ff');
    bar(bx, by, bw, 5, boss.hp, boss.maxHp, '#ffc63d');
  }
  if (G.combo >= 3) {
    const pop = Math.max(0, 8 - G.comboT) * 0.6;
    txt(G.combo + ' HITS', 12, 72, 20 + pop, '#ffc63d');
    if (G.combo >= 5)
      txt('×' + (1 + Math.min(G.combo, 30) * 0.02).toFixed(2) + ' KARMA', 12, 84, 11, '#b98cff');
  }
  if (G.goT > 0 && !G.waveLive && !G.den && !G.arena && (G.goT >> 3) % 2)
    txt(G.exitOpen ? 'EXIT ▶' : 'GO ▶', W - 16, 110, 28, '#ff3d8b', 'right');
  if (G.banner > 0) {
    const a = Math.min(1, G.banner / 30, (150 - G.banner) / 15);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(11,8,18,.7)';
    ctx.fillRect(0, 92, W, 52);
    const big = G.dun
        ? G.dun.b.name.toUpperCase()
        : G.world
          ? 'BLOCK ' + G.wd.level + ' — THE SPRAWL'
          : G.arena
            ? 'WAVE ' + G.awave
            : 'DISTRICT ' + (G.stage + 1) + ' — ' + S.name.toUpperCase(),
      sub = G.dun
        ? 'Room ' + (G.dun.room + 1) + ' of ' + G.dun.rooms
        : G.world
          ? 'Find a door. Choose who you hurt.'
          : G.arena
            ? G.awave % 5 === 0
              ? 'Boss wave'
              : S.name
            : S.sub;
    txt(big, W / 2, 122, 30, '#efe9ff', 'center');
    ctx.font = '12px "Chakra Petch", sans-serif';
    ctx.fillStyle = '#a79dc2';
    ctx.textAlign = 'center';
    ctx.fillText(sub, W / 2, 137);
    ctx.globalAlpha = 1;
  }
  if (G.banner < 0 && (-G.banner >> 3) % 2) {
    const rb = G.ents.find(e => e.rematch && e.state !== 'dead');
    txt(
      rb ? 'REMATCH — ' + rb.name.toUpperCase() : 'WARNING — BOSS',
      W / 2,
      110,
      rb ? 24 : 30,
      '#ffc63d',
      'center'
    );
  }
  if (G.tip) {
    const lines = wrapTip(G.tip.s, 300),
      a = Math.min(1, G.tip.life / 20, (330 - G.tip.life) / 12),
      h = lines.length * 13 + 10,
      y = G.coop ? 50 : 48;
    ctx.globalAlpha = a * 0.92;
    ctx.fillStyle = '#0b0812';
    ctx.fillRect(W / 2 - 160, y, 320, h);
    ctx.strokeStyle = '#ffc63d';
    ctx.lineWidth = 1;
    ctx.strokeRect(W / 2 - 159.5, y + 0.5, 319, h - 1);
    ctx.globalAlpha = a;
    ctx.font = '11px "Chakra Petch", sans-serif';
    ctx.fillStyle = '#efe9ff';
    ctx.textAlign = 'center';
    lines.forEach((l, i) => ctx.fillText(l, W / 2, y + 16 + i * 13));
    ctx.globalAlpha = 1;
  }
  if (G.world && !G.dun && G.wd) {
    drawMinimap();
    if (G.doorPrompt) {
      const b = G.doorPrompt,
        sx = b.x - G.camX,
        lo = G.wd.looted.includes(b.id);
      txt(
        '▼ ' + (b.type === 'safe' ? 'SAFEHOUSE' : b.name.toUpperCase()),
        sx,
        140,
        13,
        b.type === 'safe' || isGood(b) ? '#7dffb0' : '#ff3d8b',
        'center'
      );
      ctx.font = '10px "Chakra Petch", sans-serif';
      ctx.fillStyle = '#efe9ff';
      ctx.textAlign = 'center';
      ctx.fillText(lo ? 'CLEANED OUT' : ctl('ENTER', 'J to enter').replace(/^X$/, 'X to enter'), sx, 151);
    }
  }
  if (G.den) {
    if (G.denPrompt) {
      const n = G.denPrompt,
        sx = n.x - G.camX;
      txt('▼ ' + n.name.toUpperCase(), sx, 140, 13, '#ffc63d', 'center');
      ctx.font = '10px "Chakra Petch", sans-serif';
      ctx.fillStyle = '#efe9ff';
      ctx.textAlign = 'center';
      ctx.fillText(ctl('TALK', 'J to talk').replace(/^X$/, 'X to talk'), sx, 151);
    }
  }
}
function render() {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  if (!G.bg) G.bg = genBg(STAGES[0], 1000);
  if (BAND > 0) {
    const S = curS();
    const g = ctx.createLinearGradient(0, 0, 0, BAND);
    g.addColorStop(0, '#08060c');
    g.addColorStop(1, S.sky[0]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, BAND + 1);
  }
  let shx = 0,
    shy = 0;
  if (G.shake && !RM && prefs.shake) {
    shx = rand(-G.shake, G.shake) * 0.6;
    shy = rand(-G.shake, G.shake) * 0.6;
  }
  ctx.save();
  ctx.translate(shx, shy + BAND);
  drawBg();
  for (const k of G.picks) drawPick(k);
  const list = G.ents.map(e => ({ e, y: e.y }));
  for (const p of G.projs) list.push({ proj: p, y: p.y });
  for (const o of G.props) list.push({ prop: o, y: o.y });
  if (G.den) for (const n of NPCS) list.push({ npc: n, y: 208 });
  list.sort((a, b) => a.y - b.y);
  for (const o of list) {
    if (o.proj) drawProj(o.proj);
    else if (o.prop) {
      shadow(o.prop.x - G.camX, o.prop.y, 8);
      drawProp(o.prop.kind, o.prop.x - G.camX, o.prop.y);
    } else if (o.npc) drawNPC(o.npc);
    else {
      const fa = fogAlpha(o.e);
      if (fa <= 0) continue;
      ctx.globalAlpha = fa;
      if (o.e.elite && o.e.state !== 'dead') drawAura(o.e);
      drawFig(o.e);
      if (o.e.team === 1) drawFoeBar(o.e);
      else if (o.e.kind === 'ally') drawAllyBar(o.e);
      ctx.globalAlpha = 1;
    }
  }
  if (modOn('fog')) {
    ctx.fillStyle = 'rgba(167,157,194,0.07)';
    ctx.fillRect(0, 0, W, VH);
  }
  drawBeams();
  drawFx();
  drawRevive();
  for (const q of G.parts) {
    ctx.fillStyle = q.c;
    ctx.globalAlpha = Math.min(1, q.life / 10);
    ctx.fillRect(q.x - G.camX - q.sz / 2, q.y - q.z - q.sz / 2, q.sz, q.sz);
  }
  ctx.globalAlpha = 1;
  for (const t of G.texts) {
    ctx.globalAlpha = Math.min(1, t.life / 12);
    txt(t.s, t.x - G.camX, t.y - t.z, t.big ? 22 : t.sm ? 12 : 16, t.c, 'center');
  }
  ctx.globalAlpha = 1;
  drawRain();
  ctx.restore();
  if (G.mode !== 'title') {
    ctx.save();
    ctx.translate(0, BAND);
    drawDark();
    drawHud();
    drawToasts();
    ctx.restore();
    drawHudTop();
  }
  if (legDirty && G.t % 900 === 0) saveLeg();
  if (G.training && G.mode === 'play') {
    ctx.save();
    ctx.translate(0, BAND);
    drawTraining();
    ctx.restore();
  }
  if (G.slowFoes > 0) {
    ctx.fillStyle = `rgba(69,210,255,${Math.min(0.12, G.slowFoes / 600)})`;
    ctx.fillRect(0, 0, W, VH);
  }
  if (G.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${G.flash})`;
    ctx.fillRect(0, 0, W, VH);
  }
  if (G.fade > 0) {
    ctx.fillStyle = `rgba(8,6,12,${G.fade})`;
    ctx.fillRect(0, 0, W, VH);
  }
}
function drawAura(e) {
  const c = ELITES[e.elite].col,
    sx = e.x - G.camX,
    sc = (e.d && e.d.scale) || 1;
  ctx.globalAlpha = 0.35 + 0.15 * Math.sin(G.t * 0.2);
  ctx.strokeStyle = c;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(sx, e.y, 14 * sc, 4.5 * sc, 0, 0, 7);
  ctx.stroke();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.ellipse(sx, e.y - e.z - 22 * sc, 14 * sc, 26 * sc, 0, 0, 7);
  ctx.fill();
  ctx.globalAlpha = 1;
}
function drawFoeBar(e) {
  if (e.d.boss || e.state === 'dead' || (!e.elite && !e.name && e.hp >= e.maxHp) || e.kind === 'chest')
    return;
  const sc = e.d.scale || 1,
    sx = e.x - G.camX,
    top = e.d.fly ? e.y - e.z - 16 : e.y - e.z - 56 * sc;
  if (e.name) txt(e.name.toUpperCase(), sx, top - (e.elite ? 12 : 4), 10, '#ffc63d', 'center');
  if (e.elite) txt(ELITES[e.elite].name.toUpperCase(), sx, top - 4, 10, ELITES[e.elite].col, 'center');
  if (e.hp < e.maxHp) bar(sx - 11, top, 22, 2, e.hp, e.maxHp, e.elite ? ELITES[e.elite].col : '#ff6a3d');
}
const npcEnt = {};
function drawNPC(n) {
  const e =
    npcEnt[n.id] ||
    (npcEnt[n.id] = {
      kind: 'npc',
      style: n.style,
      pal: n.pal,
      scale: n.scale || 1,
      x: n.x,
      y: 208,
      z: 0,
      face: n.face,
      state: 'idle',
      t: 0,
      walk: 0,
      inv: 0,
      flash: 0,
      team: 2
    });
  const near = alive().find(p => Math.abs(p.x - n.x) < 60);
  if (near) e.face = near.x > n.x ? 1 : -1;
  else e.face = n.face;
  drawFig(e);
}
