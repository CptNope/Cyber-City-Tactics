/* Cyber City Tactics · src/js/modes/jobs.js
 * What every job (driving, and the missions to come) shares: banking the take. A job is a standalone run with
 * its own wallet and bag, so when it ends the creds and any gear found can be sent to a save: the Sprawl's
 * stash, or the campaign's (Ratchet's locker in the Den). The host's device holds the saves, so online the
 * host banks for the team.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
const JOB_SAVES = [
  { id: 'world', key: 'cs_world', name: 'the Sprawl', where: 'your safehouse stash' },
  { id: 'camp', key: 'cs_save3', name: 'your campaign', where: "Ratchet's locker in the Den" }
];
// the take from the run that just ended: everything in the job's wallet and bag
function jobTake() {
  return { creds: Math.max(0, Math.round(PARTY.creds || 0)), items: (PARTY.bag || []).slice(), banked: null };
}
const jobSavesFound = () => JOB_SAVES.filter(s => store.load(s.key));
// add the take to a save; gear past the stash's 60 slots is sold to the fence at its fence price instead
function jobBank(take, id) {
  const S = JOB_SAVES.find(s => s.id === id),
    save = S && store.load(S.key);
  if (!save || !take || take.banked) return false;
  const party = (save.party = save.party || {});
  party.creds = (party.creds || 0) + take.creds;
  party.stash = party.stash || [];
  let sold = 0;
  for (const it of take.items) {
    if (party.stash.length < STASH_MAX) party.stash.push(Object.assign({}, it, { fresh: true }));
    else sold += sellPrice(it, 'fence');
  }
  party.creds += sold;
  store.set(S.key, save);
  take.banked = { id, name: S.name, where: S.where, sold };
  sfx.coin();
  return true;
}
function jobBankHtml(take) {
  if (!take) return '';
  const n = take.items.length,
    what = `¥${take.creds}${n ? ` and ${n} piece${n === 1 ? '' : 's'} of gear` : ''}`;
  if (!take.creds && !n) return '';
  if (take.banked)
    return `<p style="color:var(--ok)">Banked ${what} to ${esc(take.banked.name)}: ${esc(take.banked.where)}${take.banked.sold ? ` (the stash was full, so some gear was sold for ¥${take.banked.sold})` : ''}.</p>`;
  if (NET.role === 'guest' && NET.live)
    return `<p style="color:var(--muted)">Your partner banks the take on their device.</p>`;
  const saves = jobSavesFound();
  if (!saves.length)
    return `<p style="color:var(--muted)">The take: ${what}. Start a campaign or a Sprawl run and job pay can be banked there.</p>`;
  return `<p>The take: <b style="color:var(--gold)">${what}</b>. Send it to a save:</p>
    <div class="row">${saves.map((s, i) => `<button class="btn sm${i ? ' ghost' : ''}" data-a="jobbank:${s.id}">Bank to ${esc(s.name)}</button>`).join('')}</div>`;
}
