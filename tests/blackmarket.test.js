/* Sable, the black-market trader: where she appears, her price dropping block by block, the cred gate. */
require('./harness');
const G = __G,
  A = __api,
  PARTY = __PARTY;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
click('worldpick');
click('world1');
// find blocks with and without her: she's fixed by the seed
let withT = null,
  without = null;
for (let s = 1; s < 400 && !(withT && without); s++) {
  const w = A.newWorld(2, s);
  if (A.traderOf(w)) withT = withT || w;
  else without = without || w;
}
ok(withT && without, 'Sable turns up on some blocks and not others');
ok(
  A.traderOf(A.newWorld(2, withT.seed)).x === A.traderOf(withT).x,
  'the same seed puts her in the same spot'
);
const t = A.traderOf(withT),
  hits = withT.street.buildings.filter(b => !b.hidden && Math.abs(b.x - t.x) < b.w / 2 + 6);
ok(hits.length === 0, 'she stands in a gap between buildings, not in a doorway');
G.wd = withT;
G.wd.rep = 0;
const P = __PL()[0];
P.x = t.x;
P.y = A.FY0 + 20;
G.ents = G.ents.filter(e => e.team !== 1);
ok(!!A.nearTrader(P) && !A.nearDoor(P), 'walking up to her offers a trade, not a door');
A.openTrader();
ok(G.mode === 'trader' && G.wd.bm && G.wd.bm.item.rar === 3, 'she offers one Black-market item');
ok(/Cred \+15/.test(els.ov._h) && /disabled/.test(els.ov._h), "she won't sell to strangers: cred +15 first");
G.wd.rep = 20;
PARTY.creds = 0;
A.openTrader();
const p0 = A.bmPrice(G.wd.bm);
// walk on to a new block twice without buying
click('leave');
G.mode = 'safe';
click('newblock');
ok(
  G.wd.bm && G.wd.bm.skips === 1 && A.bmPrice(G.wd.bm) < p0,
  `walking past drops her price (¥${p0} → ¥${A.bmPrice(G.wd.bm)})`
);
for (let i = 0; i < 8; i++) {
  G.mode = 'safe';
  click('newblock');
}
ok(A.bmPrice(G.wd.bm) >= Math.round(G.wd.bm.base * 0.5) - 1, 'but never below half');
G.wd.rep = 20;
PARTY.creds = 99999;
PARTY.bag = [];
const it = G.wd.bm.item;
A.bmBuy();
ok(
  PARTY.bag.includes(it) && it.fresh && !G.wd.bm,
  'buying puts it in the bag (marked NEW) and clears the offer'
);
