/* Cyber City Tactics · src/js/systems/haggle.js
 * Haggling: once per visit to any counter you can try to talk the price down. The odds come from the party's
 * best Hacking attribute (reading the seller is the same skill as reading a lock). Win, and for the rest of
 * the visit you buy for 15% less and sell for 15% more. Lose, and they dig in: 10% worse both ways.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
const HAGGLE = { win: [0.85, 1.15], lose: [1.1, 0.9] };
let haggle = null; // { at: counter id, won: bool } for the visit in progress
// Which counter is open right now (one haggle per counter per visit)
function counterId() {
  const m = G.mode;
  if (m === 'npc') return 'den:' + G.npc;
  if (m === 'locker') return 'den:ratchet';
  if (m === 'safe') return 'safe:' + G.safeTab;
  if (m === 'shop') return 'shop:' + (G.shop && G.shop.id);
  if (m === 'trader') return 'sable';
  return null;
}
const haggleOdds = () =>
  clamp(0.3 + 0.07 * Math.max(...active().map(p => (p.D && p.D.a.hak) || 1)), 0.3, 0.85);
// price multipliers for the open counter: [buy, sell]
function haggleMul() {
  const id = counterId();
  if (!haggle || !id || haggle.at !== id) return [1, 1];
  return haggle.won ? HAGGLE.win : HAGGLE.lose;
}
function tryHaggle() {
  const id = counterId();
  if (!id || (haggle && haggle.at === id)) return;
  haggle = { at: id, won: Math.random() < haggleOdds() };
  bump(haggle.won ? 'haggled' : 'haggleLost');
  (haggle.won ? sfx.coin : sfx.clank)();
}
// a fresh visit: forget the last haggle when a counter opens
function haggleReset() {
  haggle = null;
}
function haggleHtml() {
  const id = counterId();
  if (!id || id === 'safe:lay' || id === 'safe:stash' || id === 'den:juno') return '';
  if (haggle && haggle.at === id)
    return haggle.won
      ? `<div class="job" style="border-color:var(--ok)"><b style="color:var(--ok)">You talked them down</b><span style="color:var(--muted);font-size:13px">For this visit: 15% off everything, and 15% more for anything you sell.</span></div>`
      : `<div class="job" style="border-color:var(--neon)"><b style="color:var(--neon)">They dug in</b><span style="color:var(--muted);font-size:13px">Prices are 10% worse both ways until you leave. Come back later and try again.</span></div>`;
  const pct = Math.round(haggleOdds() * 100);
  return `<div class="row" style="align-items:center"><button class="btn sm ghost" data-a="haggle">Haggle · ${pct}% chance</button><span style="color:var(--muted);font-size:13px">Win: 15% better prices this visit. Lose: 10% worse. Better Hacking, better odds.</span></div>`;
}
