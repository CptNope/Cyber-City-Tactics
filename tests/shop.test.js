/* The bigger party bag and selling gear at every store counter. */
require('./harness');
const vm = require('vm');
const G = __G,
  A = __api,
  PARTY = __PARTY;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
G.pendArch = ['runner', 'samurai'];
click('pick');
click('diff:1');
click('new');
click('go');
const item = (rar, slot) => {
  for (let i = 0; i < 400; i++) {
    const it = A.randItem(2, rar > 0);
    if (it.slot === (slot || it.slot)) {
      it.rar = rar;
      return it;
    }
  }
};
ok(A.BAG_MAX === 40, 'the party bag holds 40 items (was 12)');

// picking gear up past the old limit
PARTY.bag = [];
for (let i = 0; i < 20; i++) PARTY.bag.push(item(i % 3));
const P = __PL()[0],
  k = { k: 'gear', item: item(1), x: P.x, y: P.y, t: 1 };
A.collect(k, P);
ok(PARTY.bag.length === 21, 'a 21st item still goes in the bag');
while (PARTY.bag.length < 40) PARTY.bag.push(item(0));
A.collect({ k: 'gear', item: item(1), x: P.x, y: P.y, t: 1 }, P);
ok(PARTY.bag.length === 40, 'a full bag (40) refuses more');

// every store counter buys gear
A.enterDen();
const before = PARTY.creds;
for (const id of ['doc', 'wen', 'ratchet']) {
  A.openNPC(id);
  ok(/data-a="sell:/.test(els.ov._h), `${id} has a Sell section`);
}
A.openNPC('doc');
const it = PARTY.bag.find(x => x.rar === 1),
  docPay = A.sellPrice(it, 'doc'),
  fencePay = A.sellPrice(it, 'fence');
ok(fencePay > docPay && docPay > 0, `Ratchet pays more than a clinic (¥${fencePay} vs ¥${docPay})`);
click('sell:' + it.uid + ':doc');
ok(
  PARTY.creds === before + docPay && !PARTY.bag.includes(it),
  'selling at Doc pays the clinic rate and removes it'
);
const commons = PARTY.bag.filter(x => x.rar === 0),
  total = commons.reduce((s, x) => s + A.sellPrice(x, 'doc'), 0),
  c0 = PARTY.creds;
ok(/data-a="sellcommon:doc"/.test(els.ov._h), 'a bulk button for Street-grade gear');
click('sellcommon:doc');
ok(
  PARTY.creds === c0 + total && PARTY.bag.every(x => x.rar !== 0),
  `"Sell all" clears ${commons.length} Street-grade items for ¥${total}`
);
ok(PARTY.bag.length > 0, 'and keeps everything better');
// the Sprawl shops buy too
click('leave');
G.world = true;
G.wd = A.newWorld(2);
const shopB = { type: 'clinic', name: 'Test clinic' };
ok(/data-a="sell:[^"]+:doc"/.test(A.shopHtml(shopB)), 'Sprawl back-alley clinics have a Sell section');
ok(/data-a="sell:[^"]+:talis"/.test(A.shopHtml({ type: 'talisman', name: 'T' })), 'and so do talisman shops');
ok(!/salvage:/.test(A.shopHtml(shopB)), 'only Ratchet scraps gear for parts');
G.world = false;

// locking keepers
A.enterDen();
A.openNPC('ratchet');
const keep = item(0),
  junk = item(0);
PARTY.bag.push(keep, junk);
click('lock:' + keep.uid);
ok(
  keep.lock === true && /data-a="lock:[^"]+" aria-pressed="true"/.test(els.ov._h),
  'an item can be locked from the sell list'
);
const c1 = PARTY.creds;
click('sell:' + keep.uid + ':fence');
click('salvage:' + keep.uid);
ok(PARTY.bag.includes(keep) && PARTY.creds === c1, "a locked item can't be sold or scrapped");
click('sellcommon:fence');
ok(PARTY.bag.includes(keep) && !PARTY.bag.includes(junk), '"Sell all" skips locked items and sells the rest');
click('leave');
click('sheet');
click('drop:' + keep.uid);
ok(PARTY.bag.includes(keep), "and it can't be dropped");
click('lock:' + keep.uid);
click('drop:' + keep.uid);
ok(!PARTY.bag.includes(keep), 'unlocked, it drops normally');

// first run: Juno offers training once, then the run starts straight after
{
  const pf = A.prefs;
  pf.trained = false;
  pf.seen.trainoffer = false;
  click('quit');
  click('pick');
  click('new2');
  ok(G.mode === 'trainoffer', 'the first run offers two minutes of training');
  click('trainfirst');
  ok(G.training && G.mode === 'play', 'Train first starts the drills');
  vm.runInThisContext('setMode("trained")');
  ok(
    /data-a="trainrun"/.test(els.ov._h) && /co-op/.test(els.ov._h),
    'when training ends, one button starts the co-op run that was waiting'
  );
  click('trainrun');
  ok(!G.training && G.coop && __PL().length === 2, 'and it does');
  click('quit');
  click('pick');
  click('new');
  ok(G.mode !== 'trainoffer', 'the offer only ever shows once');
}
