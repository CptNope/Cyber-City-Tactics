/* Cyber City Tactics · src/js/modes/blackmarket.js
 * Sable, the black-market trader. She sets up between buildings on some Sprawl blocks (fixed by the block's
 * seed) with one Black-market item. The offer follows you from block to block: every block you move on
 * without buying, her price drops 15% (to half at most). She only deals with runners the street vouches for.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
const BM = { chance: 0.4, cred: 15, drop: 0.85, floor: 0.5, mark: 1.3 };
// Where Sable stands on this block, if she's here at all: in the widest gap between two buildings.
function traderOf(w) {
  if (!w || !w.street) return null;
  const st = w.street;
  if (st.trader !== undefined) return st.trader;
  st.trader = null;
  if (hash01(w.seed * 7 + 3) >= BM.chance) return null;
  const bs = st.buildings.filter(b => !b.hidden).sort((a, b) => a.x - b.x);
  let best = null,
    gap = 44; // the cart and Sable need about this much room
  for (let i = 0; i + 1 < bs.length; i++) {
    const g = bs[i + 1].x - bs[i + 1].w / 2 - (bs[i].x + bs[i].w / 2);
    if (g > gap) {
      gap = g;
      best = (bs[i].x + bs[i].w / 2 + bs[i + 1].x - bs[i + 1].w / 2) / 2;
    }
  }
  if (best !== null) st.trader = { x: Math.round(best) };
  return st.trader;
}
function nearTrader(p) {
  if (!G.world || G.dun || !G.wd) return null;
  const t = traderOf(G.wd);
  return t && Math.abs(p.x - t.x) < 22 && p.y < FY0 + 40 ? t : null;
}
// The standing offer, made the first time you meet her and kept until you buy
function bmOffer() {
  const w = G.wd;
  if (!w.bm) {
    const slot = pick(['weapon', 'gun', 'armor']),
      bases = Object.keys(BASES[slot]),
      base = bases[clamp(Math.floor(w.level / 2) + 2, 1, bases.length - 1)],
      it = mkItem(slot, base, 3, true);
    w.bm = { item: it, base: Math.round(it.price * BM.mark), skips: 0 };
  }
  return w.bm;
}
const bmPrice = o =>
  Math.round(o.base * Math.max(BM.floor, Math.pow(BM.drop, o.skips || 0)) * (anyHas('fence') ? 0.9 : 1));
const bmTrusted = () => G.wd.rep >= BM.cred || anyHas('fence');
function openTrader() {
  bmOffer();
  sfx.talk();
  setMode('trader');
}
function traderHtml() {
  const o = bmOffer(),
    it = o.item,
    price = bmPrice(o),
    trust = bmTrusted(),
    room = PARTY.bag.length < BAG_MAX,
    ok = trust && room && PARTY.creds >= price,
    p = PL[G.sheetIdx] || PL[0],
    off = Math.round((1 - price / o.base) * 100);
  const say = !trust
    ? `Don't know you. Get the street to vouch for you, cred +${BM.cred} or better, and we'll talk.`
    : o.skips
      ? `Still got it. You walked past me ${o.skips === 1 ? 'once' : o.skips + ' times'}, so I've come down. Don't push your luck.`
      : "One piece. Never been on a manifest, never will be. Buy it or don't; I'm gone by morning.";
  return `<div class="card"><p class="eyebrow">The Sprawl · block ${G.wd.level} · black market</p><div class="row" style="justify-content:space-between;align-items:baseline"><h2>Sable</h2><span class="wallet">¥${PARTY.creds}</span></div>
  <p class="say"><b>Sable · black-market trader</b>${say}</p>
  <div class="list"><div class="item"><div><div class="nm r${it.rar}">${esc(it.name)}</div><div class="ds">${SLOTN[it.slot]} · ${itemLine(it)} · ${cmp(it, p)}</div>${off > 0 ? `<div class="ds" style="color:var(--ok)">${off}% off her first price of ¥${o.base}</div>` : ''}</div>
  <div class="acts"><button class="btn sm${ok ? '' : ' ghost'}" data-a="bmbuy" ${ok ? '' : 'disabled'}>${!trust ? `Cred +${BM.cred}` : !room ? 'Bag full' : '¥' + price}</button></div></div></div>
  <p style="color:var(--muted);font-size:13px">She turns up on some blocks, not all. Every block you move on without buying, her price drops ${Math.round((1 - BM.drop) * 100)}%, down to half.</p>
  <div class="row"><button class="btn" data-a="leave">Back to the street</button><button class="btn ghost" data-a="sheet">Character</button></div></div>`;
}
function bmBuy() {
  const o = G.wd.bm,
    price = o ? bmPrice(o) : 0;
  if (!o || !bmTrusted() || PARTY.bag.length >= BAG_MAX || PARTY.creds < price) return false;
  PARTY.creds -= price;
  PARTY.bag.push(gotItem(o.item));
  G.wd.bm = null;
  bump('blackmarket');
  sfx.buy();
  return true;
}
// Drawn at the back of the street with the lamps: a battered cart under a violet holo-sign, Sable beside it
const sableEnt = {
  kind: 'npc',
  style: 'bob',
  pal: {
    skin: '#c99a7b',
    coat: '#2a1a3a',
    coat2: '#1d1228',
    pants: '#1a1424',
    hair: '#b98cff',
    acc: '#b98cff',
    boot: '#0d0a12'
  },
  scale: 1,
  y: FY0 + 10,
  z: 0,
  face: 1,
  state: 'idle',
  t: 0,
  walk: 0,
  inv: 0,
  flash: 0,
  team: 2
};
function drawTrader(base) {
  const t = traderOf(G.wd);
  if (!t) return;
  const x = t.x - G.camX;
  if (x < -60 || x > W + 60) return;
  const lite = lowFx(),
    flick = Math.sin(G.t * 0.07) > 0.95 ? 0.3 : 1;
  // the cart
  ctx.fillStyle = '#2a2034';
  ctx.fillRect(x - 4, base - 2, 26, 18);
  ctx.fillStyle = '#b98cff';
  ctx.globalAlpha = 0.7;
  ctx.fillRect(x - 4, base - 2, 26, 1.5);
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,255,255,.06)';
  ctx.fillRect(x - 2, base + 4, 22, 1);
  ctx.fillStyle = '#0b0812';
  ctx.beginPath();
  ctx.arc(x + 1, base + 17, 3.5, 0, 7);
  ctx.arc(x + 17, base + 17, 3.5, 0, 7);
  ctx.fill();
  // a holo-sign: a violet diamond that flickers now and then
  const hx = x + 9,
    hy = base - 26 + Math.sin(G.t * 0.05) * 1.5;
  if (!lite) glow(hx, hy, 22, 18, '#b98cff', 0.35 * flick);
  ctx.strokeStyle = '#b98cff';
  ctx.globalAlpha = flick;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(hx, hy - 9);
  ctx.lineTo(hx + 9, hy);
  ctx.lineTo(hx, hy + 9);
  ctx.lineTo(hx - 9, hy);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = '#b98cff';
  ctx.fillRect(hx - 1.5, hy - 3, 3, 6);
  ctx.globalAlpha = 1;
  sableEnt.x = t.x - 14;
  const near = alive().find(q => Math.abs(q.x - t.x) < 90);
  sableEnt.face = near ? (near.x > sableEnt.x ? 1 : -1) : 1;
  drawFig(sableEnt);
}
