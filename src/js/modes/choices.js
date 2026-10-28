/* Cyber City Tactics · src/js/modes/choices.js
 * Two choices that change the campaign, both made in the Den with Juno:
 *  books (after the Undercity Market): sell Mother Vesper's ledgers to Juno for cash, which tips Kagemori off
 *    (the Arcology gets an extra guard in every wave), or leak them to Pixel's feeds for nothing, which buries
 *    Kagemori in scandal (one guard fewer per wave).
 *  voss (after the Arcology): Voss's backup core. Wipe it, and she can't pull herself back together in the
 *    host (no Voss.exe fight, more ICE instead), or keep it, and Pixel turns it into a back door (Black ICE
 *    starts weaker, but Voss.exe is waiting).
 * Together they pick one of four endings. Choices belong to the run (saved with it, cleared on a fresh run,
 * kept into New Game+ until made again).
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
const CHOICES = {
  books: {
    at: 3,
    title: "Vesper's books",
    q: 'Every buyer Vesper ever had is in these ledgers. Kagemori is on most pages. I can sell them back to Kagemori for a fat fee, no names, or you can give them to Pixel and let the feeds eat the corp alive. Your call.',
    a: {
      sell: {
        n: 'Sell them through Juno',
        d: '¥250 now. Kagemori learns someone had the books: an extra guard in every Arcology wave.'
      },
      leak: {
        n: 'Leak them to the feeds',
        d: 'No money. Kagemori drowns in scandal: one guard fewer in every Arcology wave.'
      }
    }
  },
  voss: {
    at: 4,
    title: "Voss's backup core",
    q: "Voss kept a backup of herself in a core under her desk. That's how she's still in the host. Wipe it and she can't hold herself together in there. Keep it, and Pixel says it's the best skeleton key he's ever seen.",
    a: {
      wipe: {
        n: 'Wipe the core',
        d: "Voss can't pull herself together in the host: no Voss.exe, but more ICE in her place."
      },
      keep: {
        n: 'Keep it as a key',
        d: 'Pixel opens a back door: Black ICE starts with a quarter less health. Voss.exe is waiting for you.'
      }
    }
  }
};
const choiceOf = k => (G.choices || {})[k];
// the choice Juno needs before the next job, if any
function pendingChoice() {
  if (G.arena || G.world || G.training) return null;
  for (const k in CHOICES) if (CHOICES[k].at === G.stage && !choiceOf(k)) return k;
  return null;
}
function makeChoice(k, v) {
  const c = CHOICES[k];
  if (!c || !c.a[v] || choiceOf(k)) return;
  G.choices = Object.assign({}, G.choices, { [k]: v });
  if (k === 'books' && v === 'sell') PARTY.creds += 250;
  bump('choices');
  sfx.click();
  saveGame('den');
}
function choiceHtml() {
  const k = pendingChoice();
  if (!k) return '';
  const c = CHOICES[k];
  return `<div class="job" style="border-color:var(--gold)"><b style="color:var(--gold)">${c.title}</b><span style="font-size:14px">${esc(c.q)}</span>
  ${Object.keys(c.a)
    .map(
      v =>
        `<div class="row" style="align-items:center"><button class="btn sm" data-a="choose:${k}:${v}">${c.a[v].n}</button><span style="color:var(--muted);font-size:13px">${esc(c.a[v].d)}</span></div>`
    )
    .join(
      ''
    )}<span style="color:var(--muted);font-size:12.5px">Decide before the next job. You can't take it back.</span></div>`;
}
// Waves bend to the choices: called with the stage index and a wave, returns the list to spawn
function choiceSpawn(si, w) {
  let list = w.spawn.slice();
  const S = STAGES[si];
  if (S && S.name === 'Kagemori Arcology' && !w.boss) {
    if (choiceOf('books') === 'sell') list.push('sec');
    else if (choiceOf('books') === 'leak' && list.length > 2) list.pop();
  }
  if (S && S.name === 'Kagemori Host' && choiceOf('voss') === 'wipe')
    list = list.map(k => (k === 'archmage!' ? 'ice' : k));
  return list;
}
// Black ICE weakened by the back door (applied once when it spawns)
function choiceBoss(e) {
  if (e.kind === 'blackice' && choiceOf('voss') === 'keep') e.hp = e.maxHp = Math.round(e.maxHp * 0.75);
}
// The ending: Juno's last word depends on both choices
function endingText(done) {
  const b = choiceOf('books'),
    v = choiceOf('voss');
  const E = {
    'sell:wipe':
      "Kagemori paid us twice: once for Vesper's books, once to forget we ever saw them. Voss is gone, really gone this time. Nobody will ever know what you did down there, and you're rich enough not to care.",
    'sell:keep':
      "Kagemori bought the books and never found the back door. Pixel still has Voss in a box, and she talks to him at night. I'd say that's a problem for another day, but it's always another day in the Sprawl.",
    'leak:wipe':
      "The feeds ran Vesper's books for a week straight. Three Kagemori VPs are in cuffs and Voss is wiped. You didn't get rich, but half the Sprawl knows your names, and that's worth more than creds down here.",
    'leak:keep':
      "The books burned Kagemori in public, and the back door burned them in private. Pixel's running Voss's old keys like a landlord now. The corp will rebuild; they always do. But for a while, the street owns the tower."
  };
  const t = E[b + ':' + v];
  if (t) return t + (done ? '' : ' Some of her nodes are still running, but that is Kagemori’s problem now.');
  return done
    ? "Her nodes are crashed and the ICE is slag. Voss is gone for good this time, scattered across a thousand dead servers. Kagemori's stock dropped forty points before lunch. Nice work."
    : "The ICE is down and Voss is scattered across a thousand dead servers. Some of her nodes are still running, but that's Kagemori's problem now.";
}
