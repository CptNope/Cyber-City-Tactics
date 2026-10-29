/* Cyber City Tactics · src/js/render/hud.js
 * HUD, banners, toasts, the blackout overlay, and the main render() pass.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
// ghost: an earlier value still shown as a pale chunk, so a hit visibly takes a bite before it drains away
function bar(x, y, w, h, v, max, col, ghost) {
  const f = Math.max(0, w * Math.min(1, v / max));
  ctx.fillStyle = '#0b0812';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#2a2238';
  ctx.fillRect(x, y, w, h);
  if (ghost > v) {
    ctx.fillStyle = '#fff3f8';
    ctx.globalAlpha = 0.75;
    ctx.fillRect(x + f, y, Math.max(0, w * Math.min(1, ghost / max)) - f, h);
    ctx.globalAlpha = 1;
  }
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
// Lagging health for the chip-damage bite: holds for a moment after a hit, then drains (per logic step)
function hpGhost(e) {
  if (e._gh === undefined) {
    e._gh = e.maxHp; // a foe's bar first shows on its first hit: start full so that hit shows its bite
    e._ghT = G.t;
  }
  if (e.hp >= e._gh) {
    e._gh = e._ghHp = e.hp;
    e._ghS = G.t;
    return e.hp;
  }
  if (e._ghHp === undefined || e.hp < e._ghHp) e._ghT = G.t; // a fresh hit restarts the hold
  e._ghHp = e.hp;
  const dt = G.t - (e._ghS === undefined ? G.t : e._ghS);
  e._ghS = G.t;
  if (G.t - e._ghT > 24) e._gh = Math.max(e.hp, e._gh - e.maxHp * 0.012 * dt);
  return e._gh;
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
  const low = p.hp > 0 && p.hp < p.maxHp * 0.25,
    nm = p.name + ' LV ' + p.lvl;
  txt(nm, x, 18, 15, low && (G.t >> 3) % 2 ? '#ff3d8b' : p.idx ? '#ffd27a' : '#efe9ff');
  // unspent points sit right after the name, measured, so a wide fallback font can't push them into the lives
  if (p.pts > 0 || p.spts > 0) {
    ctx.font = '600 15px Teko, Impact, sans-serif';
    const px = x + ctx.measureText(nm).width + 5,
      s = '+' + ((p.pts || 0) + (p.spts || 0)) + (px < x + 66 ? ' PTS' : '');
    if ((G.t >> 4) % 2 || RM) txt(s, px, 18, 12, '#ffc63d');
  }
  for (let i = 0; i < p.lives; i++)
    fillPoly([x + 96 + i * 7, 12, x + 99 + i * 7, 9, x + 102 + i * 7, 12, x + 99 + i * 7, 15], p.pal.acc);
  bar(x, 22, 96, 6, p.hp, p.maxHp, low && (G.t >> 3) % 2 ? '#ff8ab8' : '#ff3d8b', hpGhost(p));
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
// Floating comparison card over gear on the floor, shown when a runner is close
const cmpVal = it => (!it ? 0 : it.slot === 'armor' ? it.arm || 0 : it.dmg || 0);
function drawCompare() {
  for (const k of G.picks) {
    if (k.k !== 'gear' || !k.item) continue;
    const p = alive().find(q => Math.abs(q.x - k.x) < 64 && Math.abs(q.y - k.y) < 30);
    if (!p) continue;
    const it = k.item,
      cur = p.eq[it.slot],
      d = cmpVal(it) - cmpVal(cur),
      lbl = it.slot === 'armor' ? 'ARM ' : 'DMG ';
    const nm = it.name.toUpperCase(),
      w = Math.max(84, (ctx.font = '600 10px Teko, Impact, sans-serif') && ctx.measureText(nm).width + 16),
      x = clamp(k.x - G.camX - w / 2, 2, W - w - 2),
      y = k.y - 58;
    ctx.fillStyle = 'rgba(23,18,31,0.92)';
    ctx.fillRect(x, y, w, 30);
    ctx.fillStyle = RCOL[it.rar];
    ctx.fillRect(x, y, 2, 30);
    txt(nm, x + 6, y + 11, 10, RCOL[it.rar]);
    txt(lbl + cmpVal(it), x + 6, y + 24, 10, '#efe9ff');
    const s = (d > 0 ? '▲' + d : d < 0 ? '▼' + -d : '=') + (cur ? '' : ' VS NONE');
    txt(s, x + w - 6, y + 24, 10, d > 0 ? '#7dffb0' : d < 0 ? '#ff3d8b' : '#a79dc2', 'right');
  }
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
// Settings › Frame rate counter: frames drawn per second, logic steps per second (60 means the game itself
// runs at full speed whatever the screen manages), the quality step and the canvas's real pixel size
function drawFpsMeter() {
  const f = PERF.fps || Math.round(1000 / PERF.ema),
    tierName = ['sharp', '1x', 'light', 'lean'][gfxTier()],
    s = `${f} fps · game ${PERF.lps || 60}/s · ${tierName} · ${cvs.width}×${cvs.height}`;
  txt(
    s,
    W / 2,
    BAND + (BAND >= 46 ? -4 : 62),
    10,
    f >= 50 ? '#7dffb0' : f >= 30 ? '#ffc63d' : '#ff3d8b',
    'center'
  );
}
function drawHudTop() {
  // k scales the HUD up when the portrait sky band has room for it; HW is the HUD's own width
  // the HUD grows into a tall top band on touch screens, where it's read at arm's length; elsewhere it keeps its size
  const k = BAND >= 46 && isTouch() ? Math.min(BAND / 46, G.coop ? 1.3 : 1.45) : 1,
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
  } else if (G.drive) {
    line2 = 'TAKEDOWNS ' + G.drive.takedowns;
    col2 = '#ff3d8b';
  } else if (G.flight) {
    const R = G.flight.roof;
    line2 = R
      ? 'ROOF · WAVE ' + Math.min(R.wave + 1, flightJob().roof.length) + '/' + flightJob().roof.length
      : 'SHOT DOWN ' + G.flight.kills;
    col2 = '#ffc63d';
  } else if (G.stealth) {
    line2 = G.salarm ? 'ALARM ' + G.salarm + '/3' : 'UNSEEN';
    col2 = G.salarm ? '#ff3d4a' : '#7dffb0';
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
    if (s) txt(s, W / 2, H - 6, 12, line2 ? col2 : '#a79dc2', 'center');
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
  introCheck(boss);
  if (boss) {
    const bw = 200,
      bx = (W - bw) / 2,
      by = G.coop && BAND < 46 ? H - 24 : H - 11;
    txt((boss.name || boss.d.name).toUpperCase(), bx, by - 3, 14, boss.rematch ? '#45d2ff' : '#efe9ff');
    bar(bx, by, bw, 5, boss.hp, boss.maxHp, '#ffc63d', hpGhost(boss));
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
          : G.drive || G.stealth || G.flight
            ? S.name.toUpperCase()
            : G.arena
              ? 'WAVE ' + G.awave
              : 'DISTRICT ' + (G.stage + 1) + ' — ' + S.name.toUpperCase(),
      sub = G.dun
        ? 'Room ' + (G.dun.room + 1) + ' of ' + G.dun.rooms
        : G.world
          ? 'Find a door. Choose who you hurt.'
          : G.drive || G.stealth || G.flight
            ? S.sub
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
  if (G.banner < 0 && !introK() && (-G.banner >> 3) % 2) {
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
    if (G.traderPrompt && !G.doorPrompt) {
      const t = traderOf(G.wd);
      txt('▼ SABLE · BLACK MARKET', t.x - G.camX, 140, 13, '#b98cff', 'center');
      ctx.font = '10px "Chakra Petch", sans-serif';
      ctx.fillStyle = '#efe9ff';
      ctx.textAlign = 'center';
      ctx.fillText(ctl('Tap TRADE', 'J to trade'), t.x - G.camX, 152);
    }
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
// Ssareth's breath: orange outlines on the lanes about to burn, then a wall of fire down each one
function drawBreath(e) {
  const br = e.br,
    warn = e.enraged ? 48 : 60;
  for (const l of br.lanes) {
    const y0 = laneY(l),
      y1 = laneY(l + 1);
    if (br.t < warn) {
      if ((G.t >> 2) % 2) {
        ctx.fillStyle = 'rgba(255,106,61,0.10)';
        ctx.fillRect(0, y0, W, y1 - y0);
        ctx.strokeStyle = 'rgba(255,106,61,0.7)';
        ctx.strokeRect(1, y0 + 0.5, W - 2, y1 - y0 - 1);
      }
    } else {
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, 'rgba(255,198,61,0.25)');
      g.addColorStop(1, 'rgba(255,61,26,0.45)');
      ctx.fillStyle = g;
      ctx.fillRect(0, y0, W, y1 - y0);
      for (let k = 0; k < W / 12; k++) {
        const fx = k * 12 + ((G.t * 5 + k * 7) % 12),
          fh = 8 + ((k * 31 + G.t * 3) % 14);
        fillPoly([fx - 5, y1, fx, y1 - fh, fx + 5, y1], k % 2 ? '#ff6a3d' : '#ffc63d');
      }
    }
  }
}
// Hazard rooms: a flickering warning, then a live lane of current; or growing shadows under falling debris
function drawHazard() {
  const h = G.hazard;
  if (h.k === 'shock') {
    const c = h.t % 240;
    if (c >= 170 || c < 1) return;
    const y0 = laneY(h.lane),
      y1 = laneY(h.lane + 1),
      live = c >= 70;
    if (!live) {
      if ((G.t >> 3) % 2) {
        ctx.strokeStyle = 'rgba(69,210,255,0.6)';
        ctx.setLineDash && ctx.setLineDash([6, 5]);
        ctx.strokeRect(1, y0, W - 2, y1 - y0);
        ctx.setLineDash && ctx.setLineDash([]);
      }
      return;
    }
    ctx.fillStyle = 'rgba(69,210,255,0.16)';
    ctx.fillRect(0, y0, W, y1 - y0);
    ctx.strokeStyle = '#bff3ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      let x = ((k * 97 + G.t * 7) % W) | 0,
        y = y0 + ((k * 13) % (y1 - y0));
      ctx.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        x += rand(4, 10);
        y = clamp(y + rand(-5, 5), y0, y1);
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  } else {
    for (const d of h.drops) {
      const sx = d.x - G.camX;
      if (d.t < 50) {
        const k = d.t / 50;
        ctx.fillStyle = `rgba(0,0,0,${0.15 + k * 0.35})`;
        ctx.beginPath();
        ctx.ellipse(sx, d.y, 6 + k * 12, 2 + k * 5, 0, 0, 7);
        ctx.fill();
        if (d.t > 30) {
          const fy = d.y - (50 - d.t) * 9;
          fillPoly([sx - 8, fy - 10, sx + 7, fy - 12, sx + 9, fy, sx - 6, fy + 2], '#4a4060');
        }
      } else {
        ctx.fillStyle = '#3a3348';
        fillPoly([sx - 12, d.y + 2, sx - 5, d.y - 6, sx + 6, d.y - 5, sx + 13, d.y + 3], '#3a3348');
      }
    }
  }
}
// A weapon trail: an arc of light that follows the swing, fading as it goes
const TRAIL_ARC = {
  punch: [13, 18, 0.9],
  upper: [20, 22, 1.6],
  kick: [20, 24, 1.1],
  heavy: [24, 30, 2.2],
  dance: [26, 26, 2.6],
  jkick: [30, 22, 1.2]
};
function drawTrail(p) {
  const T = TRAILS[p.trail],
    a = TRAIL_ARC[p.state];
  if (!T || !T.c || !a || lowFx()) return;
  const k = Math.min(1, p.t / a[0]);
  if (k >= 1) return;
  const cx = p.x - G.camX + p.face * 6,
    cy = p.y - p.z - 28,
    r = a[1],
    start = -a[2] / 2 - 0.3,
    end = start + a[2] * Math.min(1, k * 1.6);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(p.face, 1);
  ctx.strokeStyle = T.c;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = (1 - k) * (0.7 - i * 0.2);
    ctx.lineWidth = 3 - i;
    ctx.beginPath();
    ctx.arc(0, 0, r + i * 3, start, end);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
// Nightclub rooms: a dance floor of colored tiles pulsing to the beat
function drawDanceFloor() {
  const cols = ['#ff3d8b', '#45d2ff', '#ffc63d', '#b98cff', '#7dffb0'],
    beat = G.t >> 4;
  for (let ty = 0; ty < 4; ty++)
    for (let tx = 0; tx * 40 < W; tx++) {
      const k = (tx * 7 + ty * 3 + beat) % 9;
      if (k > 3) continue;
      ctx.fillStyle = cols[(tx + ty + beat) % cols.length];
      ctx.globalAlpha = 0.1 + (k === 0 ? 0.08 : 0);
      ctx.fillRect(tx * 40 + 2, FY0 + 4 + ty * 23, 36, 20);
    }
  ctx.globalAlpha = 1;
}
// Top band on tall screens: night sky fading into the district's sky, with a few stars
function drawSkyBand() {
  const S = curS(),
    g = ctx.createLinearGradient(0, 0, 0, BAND);
  g.addColorStop(0, '#08060c');
  g.addColorStop(1, S.sky[0]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, BAND + 1);
  ctx.fillStyle = 'rgba(239,233,255,0.5)';
  for (let i = 0; i < 46; i++) {
    const x = (i * 97 + 13) % W,
      y = (i * 61 + 7) % Math.max(1, BAND - 30);
    if ((G.t + i * 40) % 400 < 380) ctx.fillRect(x, y, i % 5 ? 1 : 1.5, i % 5 ? 1 : 1.5);
  }
  if (BAND >= 90) drawFarTowers(S);
}
// Distant arcology towers rising into a tall sky band; they drift at a tenth of the camera's speed
const towerH = i => (((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1;
function drawFarTowers(S) {
  const base = BAND + 4,
    off = (G.camX || 0) * 0.1,
    tw = 34;
  for (let k = Math.floor(off / tw) - 1; k * tw - off < W + tw; k++) {
    const r = towerH(k),
      h = BAND * (0.25 + r * 0.6),
      w = (tw - 6 - r * 10) | 0,
      x = k * tw - off + ((r * 7) | 0);
    ctx.fillStyle = S.far;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(x, base - h, w, h);
    if (r > 0.6) ctx.fillRect(x + w / 2 - 1, base - h - 10, 2, 10);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = S.win;
    for (let wy = base - h + 6; wy < base - 6; wy += 9)
      for (let wx = x + 4; wx < x + w - 4; wx += 7)
        if (towerH(wx * 3.1 + wy * 0.7) > 0.82) ctx.fillRect(wx, wy, 2, 3);
  }
  ctx.globalAlpha = 1;
  // blend the tower bases into the street's own sky so there's no seam
  const fade = ctx.createLinearGradient(0, BAND - 36, 0, BAND + 1);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, S.sky[0]);
  ctx.fillStyle = fade;
  ctx.fillRect(0, BAND - 36, W, 37);
}
// Bottom band under the touch controls: the pavement carries on and fades to black
function drawGroundBand() {
  const S = curS(),
    y0 = BAND + H,
    g = ctx.createLinearGradient(0, y0, 0, VH);
  g.addColorStop(0, S.ground[1]);
  g.addColorStop(1, '#08060c');
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, W, BOT + 1);
  ctx.fillStyle = S.line;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(0, y0, W, 1);
  ctx.globalAlpha = 1;
}
function render() {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  if (!G.bg) G.bg = genBg(STAGES[0], 1000);
  if (BAND > 0) drawSkyBand();
  let shx = 0,
    shy = 0;
  if (G.shake && !RM && prefs.shake) {
    shx = rand(-G.shake, G.shake) * 0.6;
    shy = rand(-G.shake, G.shake) * 0.6;
  }
  ctx.save();
  ctx.translate(shx, shy + BAND);
  introPush();
  if (G.stealth) {
    drawFacility();
    drawStealthCones();
  } else {
    drawBg();
    if (G.drive) drawRoad();
    if (G.flight) G.flight.roof ? drawRoof() : drawTowers();
  }
  if (G.dun && G.dun.b.type === 'club') drawDanceFloor();
  if (G.hazard) drawHazard();
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
      const fa = fogAlpha(o.e),
        cl = o.e.cloaked && o.e.state !== 'dead';
      if (fa <= 0) continue;
      // thermographic eyes on any runner make cloaked shadows easy to see
      const seen = cl && PL.some(q => !q.out && q.cy && q.cy.eyes);
      ctx.globalAlpha = cl ? fa * (seen ? 0.55 : 0.1 + 0.06 * Math.sin(G.t * 0.3)) : fa;
      if (o.e.elite && o.e.state !== 'dead' && !cl) drawAura(o.e);
      if (o.e.chiT > 0) {
        ctx.fillStyle = `rgba(255,198,61,${0.12 + 0.08 * Math.sin(G.t * 0.4)})`;
        ctx.beginPath();
        ctx.ellipse(o.e.x - G.camX, o.e.y - o.e.z - 22, 14, 26, 0, 0, 7);
        ctx.fill();
      }
      if (o.e.air || o.e.kind === 'vtol') drawAir(o.e);
      else if (o.e.drone) drawDroneP(o.e);
      else if (o.e.veh) drawVehicle(o.e);
      else {
        if (o.e.bk && o.e.ride) drawBike(o.e);
        drawFig(o.e);
      }
      if (o.e.elite && o.e.state !== 'dead' && !cl) drawEliteFront(o.e);
      if (o.e.team === 1 && o.e.dazeUntil > G.t && !cl && dazed(o.e)) drawDaze(o.e);
      if (o.e.state === 'held' && o.e.heldBy) drawStruggle(o.e);
      if (o.e.kind === 'player' && o.e.trail && o.e.trail !== 'none') drawTrail(o.e);
      if (o.e.team === 1 && !cl && !o.e.air) drawFoeBar(o.e);
      else if (o.e.kind === 'ally') drawAllyBar(o.e);
      ctx.globalAlpha = 1;
    }
  }
  if (modOn('fog')) {
    ctx.fillStyle = 'rgba(167,157,194,0.07)';
    ctx.fillRect(0, 0, W, VH);
  }
  litFigures();
  drawFog(curS());
  drawBeams();
  for (const e of G.ents) if (e.d && e.d.dragon && e.br) drawBreath(e);
  drawFx();
  drawCompare();
  drawRevive();
  // particles: fast ones are drawn as short motion streaks, slow ones as chips
  const streaks = !lowFx();
  ctx.lineCap = 'round';
  for (const q of G.parts) {
    const px = q.x - G.camX,
      py = q.y - q.z;
    ctx.globalAlpha = Math.min(1, q.life / 10);
    if (streaks && Math.abs(q.vx) + Math.abs(q.vz) > 1.6) {
      ctx.strokeStyle = q.c;
      ctx.lineWidth = q.sz * 0.8;
      ctx.beginPath();
      ctx.moveTo(px - q.vx * 1.6, py + q.vz * 1.6);
      ctx.lineTo(px, py);
      ctx.stroke();
    } else {
      ctx.fillStyle = q.c;
      ctx.fillRect(px - q.sz / 2, py - q.sz / 2, q.sz, q.sz);
    }
  }
  ctx.globalAlpha = 1;
  for (const t of G.texts) {
    ctx.globalAlpha = Math.min(1, t.life / 12);
    txt(t.s, t.x - G.camX, t.y - t.z, t.big ? 22 : t.sm ? 12 : 16, t.c, 'center');
  }
  ctx.globalAlpha = 1;
  drawRain();
  ctx.restore();
  if (BOT > 0) drawGroundBand();
  drawLowHealth();
  // the title's attract scene sits behind the online menus too, so they hide the HUD the same way
  const noHud =
    G.mode === 'title' ||
    G.mode === 'online' ||
    G.mode === 'netlost' ||
    (G.mode === 'netwait' && NET.hm === 'start');
  if (!noHud) {
    drawIntroBars();
    ctx.save();
    ctx.translate(0, BAND);
    drawDark();
    drawHud();
    drawToasts();
    ctx.restore();
    drawHudTop();
  }
  if (!noHud) drawIntro();
  if (G.drive && G.mode !== 'title') drawDriveHud();
  if (G.stealth && G.mode !== 'title') drawStealthHud();
  if (G.flight && !G.flight.roof && G.mode !== 'title') drawFlightHud();
  netDrawTags();
  if (prefs.fps) drawFpsMeter();
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
// Elites, readable at a glance. Each modifier has its own look, not just a coloured halo:
//  armored  - steel plates on the body (drawn in drawFig), and bullets spark off them
//  berserk  - red afterimages trailing its movement, steam off the head
//  warded   - a ring of runes turning around its waist that ripples when a spell is shrugged off
//  vampiric - a heartbeat glow, and a violet stream drawn back into it when it heals off you
// Every elite keeps a ground ring in its colour, so the type also reads by colour alone.
function drawAura(e) {
  const c = ELITES[e.elite].col,
    sx = e.x - G.camX,
    sy = e.y - e.z,
    sc = (e.d && e.d.scale) || 1,
    lite = lowFx();
  ctx.globalAlpha = 0.45 + 0.15 * Math.sin(G.t * 0.2);
  ctx.strokeStyle = c;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(sx, e.y, 14 * sc, 4.5 * sc, 0, 0, 7);
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (e.elite === 'berserk') {
    // afterimages: where it was a few steps ago, fading
    const tr = e._tr || (e._tr = []);
    if (e._trT !== G.t) {
      e._trT = G.t;
      if (G.t % 3 === 0) {
        tr.unshift(e.x, sy);
        if (tr.length > 8) tr.length = 8;
      }
    }
    if (!lite)
      for (let i = 2; i < tr.length; i += 2) {
        const d = Math.abs(tr[i] - e.x);
        if (d > 3) glow(tr[i] - G.camX, tr[i + 1] - 22 * sc, 9 * sc, 22 * sc, c, 0.32 - i * 0.035);
      }
    glow(sx, sy - 22 * sc, 13 * sc, 26 * sc, c, 0.16 + 0.06 * Math.sin(G.t * 0.5));
  } else if (e.elite === 'vampiric') {
    // a double heartbeat every second
    const ph = G.t % 60,
      beat = ph < 6 ? 1 - ph / 6 : ph > 10 && ph < 16 ? (1 - (ph - 10) / 6) * 0.7 : 0;
    glow(sx, sy - 22 * sc, 14 * sc, 27 * sc, c, 0.12 + beat * 0.25);
  } else if (e.elite === 'armored') {
    glow(sx, sy - 22 * sc, 12 * sc, 24 * sc, c, 0.1);
  } else if (e.elite === 'warded') {
    glow(sx, sy - 22 * sc, 13 * sc, 26 * sc, c, 0.12);
    drawRunes(e, sx, sy, sc, c, true);
  }
}
// The half of the rune ring behind the body (back) or in front of it
function drawRunes(e, sx, sy, sc, c, back) {
  const n = 6,
    rot = G.t * 0.04,
    wy = sy - 16 * sc;
  ctx.fillStyle = c;
  for (let i = 0; i < n; i++) {
    const a = rot + (i * Math.PI * 2) / n,
      behind = Math.sin(a) < 0;
    if (behind !== back) continue;
    const x = sx + Math.cos(a) * 15 * sc,
      y = wy + Math.sin(a) * 4 * sc;
    ctx.globalAlpha = behind ? 0.35 : 0.85;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a * 2);
    ctx.fillRect(-1.5, -1.5, 3, 3);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
// In front of the figure: rune ring front half, ward ripples, ricochet sparks, the vampiric drain stream,
// berserk steam
// a held runner: how close the mashing is to breaking the hold
function drawStruggle(p) {
  const e = p.heldBy,
    need = e.d.boss ? 10 : e.d.holdNeed || 6,
    k = Math.min(1, (p.struggle || 0) / need),
    x = p.x - G.camX - 16,
    y = p.y - p.z - 66;
  ctx.fillStyle = 'rgba(11,8,18,.8)';
  ctx.fillRect(x - 1, y - 1, 34, 6);
  ctx.fillStyle = (G.t >> 2) % 2 ? '#ffc63d' : '#ffe28a';
  ctx.fillRect(x, y, 32 * k, 4);
}
// a dazed foe: three stars circling its head, the cue that walking into it grabs it
function drawDaze(e) {
  const sc = (e.d && e.d.scale) || 1,
    cx = e.x - G.camX,
    cy = e.y - e.z - 60 * sc,
    left = (e.dazeUntil - G.t) / 60;
  ctx.save();
  ctx.globalAlpha = Math.min(1, left * 3);
  for (let i = 0; i < 3; i++) {
    const a = G.t * 0.14 + (i * Math.PI * 2) / 3,
      x = cx + Math.cos(a) * 11,
      y = cy + Math.sin(a) * 3.5,
      r = 2.6 + (Math.sin(a) > 0 ? 0.8 : 0);
    ctx.fillStyle = '#ffe28a';
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const rr = k % 2 ? r * 0.45 : r,
        aa = (k * Math.PI) / 4;
      ctx.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
function drawEliteFront(e) {
  const c = ELITES[e.elite].col,
    sx = e.x - G.camX,
    sy = e.y - e.z,
    sc = (e.d && e.d.scale) || 1,
    lite = lowFx();
  if (e.elite === 'warded') {
    drawRunes(e, sx, sy, sc, c, false);
    const w = G.t - (e.wardT === undefined ? -99 : e.wardT);
    if (w >= 0 && w < 14) {
      // a hexagonal ripple as the spell slides off
      const k = w / 14,
        r = (14 + k * 14) * sc;
      ctx.strokeStyle = c;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = (i * Math.PI) / 3 + Math.PI / 6;
        ctx[i ? 'lineTo' : 'moveTo'](sx + Math.cos(a) * r * 0.75, sy - 22 * sc + Math.sin(a) * r);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  } else if (e.elite === 'armored') {
    const w = G.t - (e.pingT === undefined ? -99 : e.pingT);
    if (w >= 0 && w < 8) {
      const k = 1 - w / 8,
        y = sy - 28 * sc;
      glow(sx, y, 9, 9, '#ffffff', k * 0.9);
      ctx.strokeStyle = '#ffe9b0';
      ctx.globalAlpha = k;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = -0.6 - i * 0.7;
        ctx.moveTo(sx + Math.cos(a) * 3, y + Math.sin(a) * 3);
        ctx.lineTo(sx + Math.cos(a) * (6 + w * 1.5), y + Math.sin(a) * (6 + w * 1.5));
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  } else if (e.elite === 'vampiric') {
    const w = G.t - (e.drainT === undefined ? -99 : e.drainT);
    if (w >= 0 && w < 24) {
      // motes flowing from the runner it just bit back into its chest
      const k = w / 24,
        x0 = e.drainX - G.camX,
        y0 = e.drainY - 26,
        x1 = sx,
        y1 = sy - 26 * sc;
      for (let i = 0; i < (lite ? 3 : 7); i++) {
        const t = Math.min(1, k * 1.6 - i * 0.08);
        if (t <= 0) continue;
        const x = x0 + (x1 - x0) * t,
          y = y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * 12;
        glow(x, y, 4, 4, c, (1 - k) * 0.9);
      }
    }
  } else if (e.elite === 'berserk' && !lite && G.t % 40 < 20) {
    const k = (G.t % 40) / 20;
    glow(sx + e.face * -2, sy - 46 * sc - k * 10, 4 + k * 4, 4 + k * 4, '#efe9ff', 0.3 * (1 - k));
  }
}
function drawFoeBar(e) {
  if (e.d.boss || e.state === 'dead' || (!e.elite && !e.name && e.hp >= e.maxHp) || e.kind === 'chest')
    return;
  const sc = e.d.scale || 1,
    sx = e.x - G.camX,
    top = e.d.fly ? e.y - e.z - 16 : e.y - e.z - 56 * sc;
  if (e.name) txt(e.name.toUpperCase(), sx, top - (e.elite ? 12 : 4), 10, '#ffc63d', 'center');
  if (e.elite) txt(ELITES[e.elite].name.toUpperCase(), sx, top - 4, 10, ELITES[e.elite].col, 'center');
  if (e.hp < e.maxHp)
    bar(sx - 11, top, 22, 2, e.hp, e.maxHp, e.elite ? ELITES[e.elite].col : '#ff6a3d', hpGhost(e));
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
