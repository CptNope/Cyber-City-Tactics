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

/* ---------- Juno's side jobs in the campaign ----------
 * In the Den between districts, Juno offers one optional job. It runs with the campaign's own runners
 * (their level, gear and skills), and when it ends the team goes back to the Den: the take goes into the
 * party's bag and wallet and the karma onto the runners. One shot per Den visit, win or lose. */
const CAMPAIGN_JOBS = [
  { kind: 'drive', id: 'causeway' },
  { kind: 'stealth', id: 'clinic' },
  { kind: 'drive', id: 'market' },
  { kind: 'stealth', id: 'arcology' },
  { kind: 'flight', id: 'skyline' }
];
const JOB_KINDS = {
  drive: { jobs: () => DRIVE_JOBS, start: (id, c) => startDrive(id, c), res: () => G.dresult, verb: 'Ride' },
  stealth: {
    jobs: () => STEALTH_JOBS,
    start: (id, c) => startStealth(id, c),
    res: () => G.sresult,
    verb: 'Fly'
  },
  flight: { jobs: () => FLIGHT_JOBS, start: (id, c) => startFlight(id, c), res: () => G.fresult, verb: 'Fly' }
};
let cjobSave = null; // the campaign as it stood in the Den, restored when the job ends (host only)
const sideJobAt = st => CAMPAIGN_JOBS[st % CAMPAIGN_JOBS.length];
const sideJobDef = c => JOB_KINDS[c.kind].jobs()[c.id];
// the crew for a job: fresh level-4 runners from the Jobs board, or the campaign's own for one of Juno's
function jobCrew(coop) {
  G.challenge = null;
  G.rngW = G.rngP = null;
  if (G.cjob) {
    for (const p of PL) {
      refresh(p);
      p.hp = p.maxHp;
      p.mp = p.maxMp;
    }
  } else {
    G.diff = G.pendDiff;
    G.ng = 0;
    G.coop = !!coop;
    newRunStats();
    PL = [newRunner(0)];
    if (coop) PL.push(newRunner(1));
    PL.forEach((p, i) => applyArch(p, G.pendArch[i]));
    for (const p of PL) {
      p.lvl = 4;
      refresh(p);
      p.hp = p.maxHp;
      p.mp = p.maxMp;
    }
  }
  Object.assign(PARTY, { creds: 0, bag: [], stash: [], med: 2, contract: null, ally: null });
}
// karma earned on a job: on the runners now, and counted so it survives the trip back to the Den
function jobKarma(n) {
  gainKarma(n);
  if (G.cjob) G.cjob.karma += n;
}
function cjobStart() {
  const c = sideJobAt(G.stage);
  if (!c || (G.sideJobs || {})[G.stage]) return false;
  saveGame('den');
  cjobSave = store.load('cs_save3');
  G.cjob = { stage: G.stage, kind: c.kind, id: c.id, karma: 0 };
  JOB_KINDS[c.kind].start(c.id, G.coop);
  return true;
}
function cjobClear() {
  G.cjob = null;
  cjobSave = null;
}
// back to the Den: the campaign as it was, plus the take, the karma, and the job marked off
function cjobBack() {
  const c = G.cjob,
    save = cjobSave;
  if (!c || !save) return false;
  const res = JOB_KINDS[c.kind].res() || {},
    take = res.take || { creds: 0, items: [] };
  cjobClear();
  loadGame(save);
  PARTY.creds += take.creds;
  let sold = 0;
  for (const it of take.items) {
    if (PARTY.bag.length < BAG_MAX) PARTY.bag.push(it);
    else if (PARTY.stash.length < STASH_MAX) PARTY.stash.push(Object.assign({}, it, { fresh: true }));
    else sold += sellPrice(it, 'fence');
  }
  PARTY.creds += sold;
  G.sideJobs = Object.assign({}, G.sideJobs, {
    [c.stage]: { win: !!res.win, creds: take.creds, items: take.items.length, karma: c.karma }
  });
  gainKarma(c.karma);
  enterDen();
  G.npc = 'juno';
  setMode('npc');
  return true;
}
// the bottom of a job's results card: banking and replays from the Jobs board, or the way back to the Den
function jobEndHtml(take, again) {
  if (G.cjob) {
    const n = take ? take.items.length : 0;
    return `<p>Juno's job: <b style="color:var(--gold)">¥${take ? take.creds : 0}${n ? ` and ${n} piece${n === 1 ? '' : 's'} of gear` : ''}</b> go into the party bag${G.cjob.karma ? `, and ${G.cjob.karma} karma onto the runners` : ''}.</p>
    <div class="row">${NET.role === 'guest' && NET.live ? '<p style="color:var(--muted)">Your partner takes the team back to the Den.</p>' : '<button class="btn" data-a="cjobback">Back to the Den</button>'}</div>`;
  }
  return `${jobBankHtml(take)}
    <div class="row">${again}<button class="btn ghost" data-a="jobs">Jobs</button><button class="btn ghost" data-a="quit">Title</button></div>`;
}
// Juno's offer, on her card in the Den
function sideJobHtml() {
  const st = G.stage,
    c = sideJobAt(st);
  if (!c || G.challenge) return '';
  const J = sideJobDef(c),
    d = (G.sideJobs || {})[st];
  if (d)
    return `<div class="job"><div class="row" style="justify-content:space-between"><b>Side job · ${esc(J.name)}</b><span class="st ${d.win ? 'up' : 'down'}">${d.win ? 'Done' : 'Blown'}</span></div>
    ${isObj(d) ? `<span style="color:var(--muted);font-size:13px">+¥${d.creds}${d.items ? ` · ${d.items} gear to the bag` : ''}${d.karma ? ` · +${d.karma} karma` : ''}</span>` : ''}</div>`;
  const what = { drive: 'A driving job', stealth: 'A drone job', flight: 'A flight job' }[c.kind];
  return `<div class="job"><div class="row" style="justify-content:space-between"><b>Side job · ${esc(J.name)}</b><span class="st">Optional</span></div>
    <span style="color:var(--muted);font-size:13px">${what}: ${esc(J.sub)}. Pays ¥${J.pay}+ into the party bag, karma for everyone. One shot, then back here.</span>
    <div class="row" style="margin-top:6px"><button class="btn sm" data-a="cjob">Take the side job</button></div></div>`;
}
