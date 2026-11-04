/* Cyber City Tactics · src/js/modes/gauntlet.js
 * The Gauntlet, a roguelite run: one life each, every district of the campaign in a random order, a random
 * mutator on each, and a perk pick (from the Arena's perks) after every boss instead of the Den. No saves:
 * fall and the run is over, scored by how deep you got. Every run has a seed (G-XXXX) so it can be shared and
 * replayed, and there's a gauntlet of the day that everyone gets the same.
 *
 * It runs on the campaign's own districts, contracts and loot (G.stage is the district being played); G.gaunt
 * holds the run: { seed, code, order, muts, i, perks, daily }. Saves are skipped while it's set.
 * Loaded as a classic script after arena.js (PERKS, MUTS): every file shares one global scope. */
'use strict';

// One Life is the rule here, and Pacifist only pays in the campaign's contracts: neither is drawn
const GAUNT_MUTS = ['glass', 'elite', 'brawl', 'turbo', 'fog', 'split'];
const gauntDayCode = () => 'G-' + (hstr('gauntlet ' + dayId(new Date())) >>> 0).toString(36).toUpperCase();
const gauntOn = () => !!(G.gaunt && !G.arena && !G.world && !G.training);

/** The run a seed makes: the district order and a mutator for each, the same on every device. */
function gauntPlan(seed) {
  const r = srng(seed),
    order = STAGES.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { order, muts: order.map(() => GAUNT_MUTS[Math.floor(r() * GAUNT_MUTS.length)]) };
}
function gauntStart(coop, code, daily) {
  const ch = parseSeed(code);
  const seed = ch && ch.mode === 'gauntlet' ? ch.seed : newSeed();
  newRun(coop, true); // the campaign's runners, party and stats, without its briefing (that would save)
  const plan = gauntPlan(seed);
  G.gaunt = {
    seed,
    code: seedCode('gauntlet', seed),
    order: plan.order,
    muts: plan.muts,
    i: 0,
    perks: [],
    daily: !!daily
  };
  G.rngP = srng(hstr(G.gaunt.code + 'p'));
  if (daily) feat('daily');
  gauntBrief();
}
/** The briefing for the next district on the list, with its mutator. */
function gauntBrief() {
  const g = G.gaunt;
  G.muts = [g.muts[g.i]];
  briefing(g.order[g.i], false);
}
/** A district cleared: the last one wins the run, any other offers a perk and moves on. */
function gauntCleared() {
  const g = G.gaunt;
  if (g.i >= g.order.length - 1) return gauntEnd(true);
  g.i++;
  if (g.i >= 3) feat('gaunt3');
  for (const p of PL) {
    p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.4));
    p.mp = p.maxMp;
  }
  const ok = PERKS.filter(p => p.ok() && p.id !== 'life'); // one life is the rule: no second winds
  const out = [];
  while (out.length < 3 && ok.length) out.push(ok.splice(Math.floor(pr() * ok.length), 1)[0]);
  G.perks = out.map(p => p.id);
  musicPlay('title');
  setMode('perk');
}
function gauntPerk(pk) {
  pk.go();
  G.gaunt.perks.push(pk.id);
  sfx.level();
  gauntBrief();
}
const gauntScore = (g, win) =>
  g.i * 1000 + (win ? 2000 : 0) + ((G.run && G.run.kills) || 0) * 10 + ((G.run && G.run.bosses) || 0) * 250;
/** The run is over: won, or the last runner standing went down. */
function gauntEnd(win) {
  const g = G.gaunt;
  const cleared = win ? g.order.length : g.i;
  const score = gauntScore(g, win);
  if (win) feat('gauntwin');
  const rec = store.load('cs_gaunt') || {};
  const best = rec.best || { score: 0 };
  rec.runs = (rec.runs || 0) + 1;
  if (score > best.score) rec.best = { score, cleared, code: g.code, date: dayId(new Date()) };
  if (g.daily) {
    const day = dayId(new Date());
    if (!rec.day || rec.day.id !== day || score > rec.day.score) rec.day = { id: day, score, cleared };
  }
  store.set('cs_gaunt', rec);
  logRun('Gauntlet', win ? 'Ran it all' : 'Fell in district ' + (g.i + 1), score.toLocaleString() + ' pts');
  G.gres = { win, cleared, score, best: rec.best, newBest: rec.best.score === score && score > 0 };
  musicPlay(win ? 'title' : null);
  setMode('gauntover');
}

/* ---------- screens ---------- */
function gauntPickHtml() {
  const rec = store.load('cs_gaunt') || {},
    day = gauntDayCode(),
    dp = gauntPlan(parseSeed(day).seed),
    today = rec.day && rec.day.id === dayId(new Date()) ? rec.day : null;
  return `<div class="card"><p class="eyebrow">The Gauntlet · roguelite</p><h2>One life. Every district.</h2>
    <p>All ${STAGES.length} districts in a random order, each with a random mutator. One life each: fall and the run is over. After every boss, pick one of three perks instead of going back to the Den. No saves, no retries; score by how deep you get.</p>
    ${archHtml()}
    <div class="row" role="group" aria-label="Difficulty">${DIFF.map((d, i) => `<button class="btn sm${G.pendDiff === i ? '' : ' ghost'}" data-a="diff:${i}" aria-pressed="${G.pendDiff === i}">${d.name}</button>`).join('')}</div>
    <div class="job"><div class="row" style="justify-content:space-between"><b>Gauntlet of the day · ${esc(day)}</b><span class="st" style="color:var(--gold)">starts in ${esc(STAGES[dp.order[0]].name)} · ${esc(MUTS[dp.muts[0]])}</span></div>
    <span style="color:var(--muted);font-size:13px">The same districts, mutators and perk offers for everyone today.${today ? ` Your best today: ${today.score.toLocaleString()} (${today.cleared} cleared).` : ''}</span>
    <div class="row" style="margin-top:6px"><button class="btn sm" data-a="gauntday1">Run it solo</button><button class="btn sm ghost" data-a="gauntday2">Run it co-op</button></div></div>
    <div class="job"><b>Run a seed</b><span style="color:var(--muted);font-size:13px">A friend's Gauntlet code, like <b style="white-space:nowrap">G-K2F9QX</b>, plays their exact run.</span>
    <div class="row" style="align-items:center"><input id="gauntSeed" class="seedin" value="${esc(G.gauntPre || '')}" placeholder="G-K2F9QX" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="14" aria-label="Gauntlet seed"><button class="btn sm" data-a="gauntseed1">Play solo</button><button class="btn sm ghost" data-a="gauntseed2">Co-op</button></div>
    ${G.seedErr ? '<span style="color:var(--neon);font-size:13px">That isn\'t a Gauntlet code. They start with G-.</span>' : ''}</div>
    <div class="row"><button class="btn" data-a="gaunt1">New run solo</button><button class="btn ghost" data-a="gaunt2">New run co-op</button><button class="btn ghost" data-a="back2title">Back</button></div>
    ${rec.best ? `<p class="ds">Best: ${rec.best.score.toLocaleString()} points, ${rec.best.cleared} of ${STAGES.length} districts (${esc(rec.best.code)}) · ${rec.runs} run${rec.runs === 1 ? '' : 's'}</p>` : ''}</div>`;
}
/** The line under the briefing: where in the run you are, this district's mutator, and the perks so far. */
function gauntBriefLine() {
  const g = G.gaunt,
    m = g.muts[g.i];
  return `<div class="job" style="border-color:var(--gold)"><div class="row" style="justify-content:space-between"><b>Gauntlet · district ${g.i + 1} of ${g.order.length}</b><span class="st" style="color:var(--gold)">${esc(MUTS[m])}</span></div>
    <span style="color:var(--muted);font-size:13px">${esc(MUTD[m])} One life each.${g.perks.length ? ' Perks: ' + g.perks.map(id => esc(PERKS.find(p => p.id === id).name)).join(', ') + '.' : ''} Seed ${esc(g.code)}.</span></div>`;
}
const gauntShareLine = () => {
  const r = G.gres || {},
    g = G.gaunt || {};
  return `Cyber City Tactics Gauntlet ${g.code}${g.daily ? ' (today’s)' : ''}: ${r.win ? 'ran all ' + r.cleared + ' districts' : r.cleared + ' district' + (r.cleared === 1 ? '' : 's') + ' cleared'}, ${(r.score || 0).toLocaleString()} points. Same run: ${HOME}?seed=${g.code}`;
};
function gauntOverHtml() {
  const r = G.gres || {},
    g = G.gaunt || { order: [], perks: [] };
  return `<div class="card"><p class="eyebrow">The Gauntlet · ${esc(g.code || '')}${G.coop ? ' · co-op' : ''} · ${DIFF[G.diff].name}</p><h1>${r.win ? 'Ran the Gauntlet' : (r.score || 0).toLocaleString()}</h1>
    <p>${r.win ? `Every district, one life, ${(r.score || 0).toLocaleString()} points.` : `Flatlined in ${esc(STAGES[g.order[g.i]] ? STAGES[g.order[g.i]].name : 'the street')}, district ${g.i + 1} of ${g.order.length}. ${r.cleared} cleared.`}${r.newBest ? ' Your best run yet.' : r.best ? ` Best: ${r.best.score.toLocaleString()}.` : ''}</p>
    <div class="list">${g.order
      .map(
        (si, k) =>
          `<div class="item"><div><div class="nm">${k + 1}. ${esc(STAGES[si].name)}</div><div class="ds">${esc(MUTS[g.muts[k]])}</div></div><div class="acts">${k < r.cleared ? '✓ Cleared' : k === g.i && !r.win ? 'Fell here' : '—'}</div></div>`
      )
      .join('')}</div>
    ${statsHtml()}
    <h3>Brag</h3><div class="sharebox" id="shareTxt">${esc(gauntShareLine())}</div>
    <div class="row"><button class="btn sm" data-a="copyshare" id="copyBtn">Copy</button></div>
    <div class="row"><button class="btn" data-a="gauntagain">Same seed again</button><button class="btn ghost" data-a="gauntpick">New run</button><button class="btn ghost" data-a="quit">Title</button></div></div>`;
}
