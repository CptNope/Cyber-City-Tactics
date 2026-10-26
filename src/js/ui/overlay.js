/* Cyber City Tactics · src/js/ui/overlay.js
 * Mode switching (setMode) and renderOv(), which draws whichever menu is open; NPC shops; pause and
 * character-sheet toggles; new runs.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
function setMode(m) {
  if (legDirty) saveLeg();
  wake(m === 'play' || m === 'den');
  G.mode = m;
  ov.hidden = m === 'play' || m === 'den';
  if (m !== 'play' && m !== 'den') for (const s of INP) for (const k in s.held) s.held[k] = false;
  renderOv();
}
function soundBtns() {
  return `<button class="btn ghost" data-a="mute">${prefs.sound ? 'Sound on' : 'Sound off'}</button><button class="btn ghost" data-a="music">${prefs.music ? 'Music on' : 'Music off'}</button>`;
}
function renderOv() {
  const m = G.mode;
  let h = '';
  if (m === 'title') {
    const sv = store.load('cs_save3');
    if (G.mode === 'title') G.pendDiff = sv && sv.diff !== undefined ? sv.diff : 1;
    h = `<div class="card"><p class="eyebrow">Seattle sprawl, 2079 · brawler RPG for one or two</p><h1 class="wordmark" aria-label="Cyber City Tactics"><span class="wm-city">Cyber City</span><span class="wm-bar">Tactics</span></h1>
    <p>Two shadowrunners, a fixer with a grudge and five districts between you and Director Voss, from the gang turf to the Kagemori host itself. Level up with karma, loot gear off the street, grab and throw whatever isn't bolted down, and spend it all in the Den.</p>
    <div class="row"><button class="btn" data-a="pick">New run</button><button class="btn ghost" data-a="arenapick">Arena</button><button class="btn ghost" data-a="worldpick">The Sprawl</button><button class="btn ghost" data-a="codex">Codex · ${esc(RANKS[rankOf(legLP())][1])}</button><button class="btn ghost" data-a="trainpick">Training</button>${sv ? `<button class="btn ghost" data-a="cont">Continue · ${DIFF[sv.diff === undefined ? 1 : sv.diff].name}${sv.ng ? ' NG+' + sv.ng : ''}, ${sv.phase === 'den' ? 'the Den after district ' + (sv.stage + 1) : 'district ' + (sv.stage + 1)}</button>` : ''}<button class="btn ghost" data-a="settings">Settings</button>${PWA.deferred && !PWA.installed ? '<button class="btn ghost" data-a="install">Install app</button>' : ''}</div>${helpHtml()}</div>`;
  }
  if (m === 'pick') {
    h = `<div class="card"><p class="eyebrow">New run</p><h2>How hard are the streets?</h2>${prefs.trained ? '' : '<p>New here? <button class="btn sm ghost" data-a="trainpick">Try training first</button></p>'}
    <div class="list">${DIFF.map((d, i) => `<div class="item"><div><div class="nm">${d.name}</div><div class="ds">${d.desc}</div></div><div class="acts"><button class="btn sm${G.pendDiff === i ? '' : ' ghost'}" data-a="diff:${i}" aria-pressed="${G.pendDiff === i}">${G.pendDiff === i ? 'Selected' : 'Choose'}</button></div></div>`).join('')}</div>
    ${archHtml()}
    <h3>Mutators <small style="color:var(--muted);font-weight:400;text-transform:none;letter-spacing:0">optional · +20% karma each</small></h3>
    <div class="row">${Object.keys(MUTS)
      .map(k => {
        const on = (G.pendMuts || []).includes(k);
        return `<button class="btn sm${on ? '' : ' ghost'}" data-a="mut:${k}" aria-pressed="${on}" title="${esc(MUTD[k])}">${on ? '✓ ' : ''}${MUTS[k]}</button>`;
      })
      .join('')}</div>
    <span style="color:var(--muted);font-size:12.5px">${(G.pendMuts || []).length ? (G.pendMuts || []).map(k => MUTD[k]).join(' ') : 'Make the campaign harder for more karma and feats.'}</span>
    <p style="font-size:12.5px">Elites have a colored aura and a name tag: ${Object.values(ELITES)
      .map(x => `<b style="color:${x.col}">${x.name}</b> ${x.hint}`)
      .join(', ')}. They drop better gear.</p>
    <div class="row"><button class="btn" data-a="new">Start solo</button><button class="btn ghost" data-a="new2">Start co-op</button><button class="btn ghost" data-a="back2title">Back</button></div></div>`;
  }
  if (m === 'trainpick') {
    h = `<div class="card"><p class="eyebrow">Training · Juno's back alley</p><h2>Learn the moves</h2>
    <p>Ten short drills with harmless sparring partners: moving, combos, guard breaks, air attacks, dodging, grabs, throwing a drum, heavy blows, guns and spells, and your special. You can't lose. Skip it from the pause menu any time.</p>
    ${archHtml(1)}
    <div class="row"><button class="btn" data-a="train">Start training</button><button class="btn ghost" data-a="back2title">Back</button></div></div>`;
  }
  if (m === 'trained') {
    h = `<div class="card"><p class="eyebrow">Training complete</p><h2>You're ready for the streets</h2>
    <p class="say"><b>Juno · fixer</b>Not bad. Now go break something that's worth money.</p>
    <div class="row"><button class="btn" data-a="pick">Start a run</button><button class="btn ghost" data-a="arenapick">Arena</button><button class="btn ghost" data-a="quit">Title</button></div></div>`;
  }
  if (m === 'arenapick') {
    const wk = thisWeek(),
      wb = store.load('cs_week');
    h = `<div class="card"><p class="eyebrow">Arena · endless waves</p><h2>How long can you last?</h2>
    <p>One street, no exits. Waves get bigger and meaner, the street changes every five waves, and a boss shows up every fifth. Clear three waves and pick a perk. You start at level 3 with points to spend.</p>
    <div class="job"><div class="row" style="justify-content:space-between"><b>Weekly challenge · ${wk.id}</b><span class="st" style="color:var(--gold)">${esc(MODS[wk.mod].name)}</span></div>
    <span style="color:var(--muted);font-size:13px">${esc(MODS[wk.mod].desc)} Same waves and perk offers for everyone this week, on Runner difficulty.${wb && wb.id === wk.id ? ` Your best this week: ${wb.score.toLocaleString()} (wave ${wb.wave}).` : ''}</span>
    <div class="row" style="margin-top:6px"><button class="btn sm" data-a="week1">Play solo</button><button class="btn sm ghost" data-a="week2">Play co-op</button></div></div>
    ${(() => {
      const dy = thisDay(),
        dd = store.load('cs_day') || {};
      return `<div class="job"><div class="row" style="justify-content:space-between"><b>Daily challenge · ${dy.day}</b><span class="st" style="color:var(--gold)">${esc(MODS[dy.mod].name)} · ${ARCH[dy.arch].short}</span></div>
    <span style="color:var(--muted);font-size:13px">A new seed every day, on Runner difficulty. Today you play as the ${ARCH[dy.arch].name}. ${esc(MODS[dy.mod].desc)}${dd.id === dy.id && dd.score ? ` Today's best: ${dd.score.toLocaleString()} (wave ${dd.wave}).` : ''}${dd.streak > 1 ? ` Streak: ${dd.streak} days.` : ''}</span>
    <div class="row" style="margin-top:6px"><button class="btn sm" data-a="day1">Play solo</button><button class="btn sm ghost" data-a="day2">Play co-op</button></div></div>`;
    })()}
    ${archHtml()}
    <h3>Open arena</h3>
    <div class="row" role="group" aria-label="Difficulty">${DIFF.map((d, i) => `<button class="btn sm${G.pendDiff === i ? '' : ' ghost'}" data-a="diff:${i}" aria-pressed="${G.pendDiff === i}">${d.name}</button>`).join('')}</div>
    <div class="row"><button class="btn" data-a="arena1">Start solo</button><button class="btn ghost" data-a="arena2">Start co-op</button><button class="btn ghost" data-a="back2title">Back</button></div>
    <h3>Best runs</h3>${scoreTable()}</div>`;
  }
  if (m === 'perk') {
    h = `<div class="card"><p class="eyebrow">Arena · wave ${G.awave} cleared · score ${G.score.toLocaleString()}</p><h2>Pick a perk</h2>
    <div class="list">${G.perks
      .map(id => {
        const pk = PERKS.find(x => x.id === id);
        return `<div class="item"><div><div class="nm">${esc(pk.name)}</div><div class="ds">${esc(pk.desc)}</div></div><div class="acts"><button class="btn sm" data-a="perk:${id}">Take it</button></div></div>`;
      })
      .join('')}</div>
    <div class="row"><button class="btn ghost" data-a="sheet">Character${PL.some(p => p.pts || p.spts) ? ' (points to spend)' : ''}</button></div></div>`;
  }
  if (m === 'arenaover') {
    const e = G.lastEntry || { score: 0, wave: 0 },
      list = store.load('cs_arena') || [],
      rank = list.findIndex(x => x.id === e.id);
    h = `<div class="card"><p class="eyebrow">Arena · ${G.challenge ? (G.challenge.daily ? 'daily ' + G.challenge.day : 'weekly ' + G.challenge.id) + ' · ' + esc(MODS[G.challenge.mod].name) : DIFF[G.diff].name}${G.coop ? ' · co-op' : ''}</p><h1>${e.score.toLocaleString()}</h1>
    <p>You made it to wave ${e.wave} at level ${e.lvl}.${rank === 0 ? ' That is your best run yet.' : rank > 0 ? ` That ranks #${rank + 1} on this device.` : ''}</p>
    ${statsHtml()}${shareHtml()}
    <div class="row"><button class="btn" data-a="arenaagain">Run it again</button><button class="btn ghost" data-a="arenapick">Change difficulty</button><button class="btn ghost" data-a="quit">Title</button></div>
    <h3>Best runs</h3>${scoreTable(e.id)}</div>`;
  }
  if (m === 'brief') {
    const C = CONTRACTS[G.stage],
      S = STAGES[G.stage];
    h = `<div class="card"><p class="eyebrow">Job ${G.stage + 1} of ${STAGES.length} · ${esc(S.name)} · ${DIFF[G.diff].name}${G.ng ? ' NG+' + G.ng : ''}</p><h2>${esc(C.title)}</h2>
    <p class="say"><b>Juno · fixer</b>${esc(C.say)}</p>${jobHtml(PARTY.contract)}
    <div class="row"><button class="btn" data-a="go">Take the job</button><button class="btn ghost" data-a="sheet">Character</button>${G.briefFromDen ? '<button class="btn ghost" data-a="notyet">Not yet</button>' : ''}</div></div>`;
  }
  if (m === 'sheet') {
    h = `<div class="card"><p class="eyebrow">${G.ret === 'brief' ? 'Before the job' : G.ret === 'den' ? 'The Den' : G.ret === 'perk' ? 'Arena · between waves' : G.arena ? 'Paused · arena wave ' + G.awave : G.world ? 'The Sprawl · block ' + G.wd.level : 'Paused · district ' + (G.stage + 1)}</p><h2>Runners</h2>${charHtml()}${G.ret === 'play' && !G.arena ? jobHtml(PARTY.contract) : ''}
    <div class="row"><button class="btn" data-a="close">${G.ret === 'play' ? 'Back to the fight' : G.ret === 'perk' ? 'Back to the perks' : 'Done'}</button></div></div>`;
  }
  if (m === 'pause') {
    h = `<div class="card"><p class="eyebrow">Paused · ${G.world ? 'the Sprawl · block ' + G.wd.level + ' · heat ' + G.wd.heat : G.training ? 'training step ' + (G.tstep + 1) + ' of ' + TRAIN.length : G.arena ? 'arena wave ' + G.awave + ' · score ' + G.score.toLocaleString() : G.den ? 'the Den' : 'district ' + (G.stage + 1)} · ${DIFF[G.diff].name}${G.ng && !G.arena ? ' NG+' + G.ng : ''}</p><h2>Catch your breath</h2>${G.den || G.arena ? '' : jobHtml(PARTY.contract)}
    <div class="row"><button class="btn" data-a="resume">Resume</button><button class="btn ghost" data-a="sheet">Character</button>${G.coop ? '<button class="btn ghost" data-a="drop2">Drop Runner 2</button>' : '<button class="btn ghost" data-a="join2">Add Runner 2</button>'}${G.training ? '<button class="btn ghost" data-a="skipstep">Skip this step</button>' : ''}<button class="btn ghost" data-a="settings">Settings</button><button class="btn ghost" data-a="quit">${G.training ? 'Leave training' : 'Quit to title'}</button></div>${helpHtml()}</div>`;
  }
  if (m === 'npc') h = npcHtml(G.npc);
  if (m === 'settings') h = settingsHtml();
  if (m === 'codex') h = codexHtml();
  if (m === 'bcard') h = bcardHtml(G.bsel);
  if (m === 'hack') h = hackHtml();
  if (m === 'safe') h = safeHtml();
  if (m === 'worldpick') {
    const sw = store.load('cs_world');
    h = `<div class="card"><p class="eyebrow">Open world</p><h2>The Sprawl</h2>
    <p>One long block, fourteen doors. Hack your way into gang hideouts, corp black sites, businesses and homes. Every building is a randomly built run of rooms with its own guards, boss and loot tier.</p>
    <p class="say"><b>Juno · fixer</b>Hit the crews and the corps and the street will love you. Hit the noodle shop or some family's flat and the cops will be on you before you're out the door. Your call. It always is.</p>
    ${archHtml()}
    <div class="row"><button class="btn" data-a="world1">Start solo</button><button class="btn ghost" data-a="world2">Start co-op</button>${sw ? `<button class="btn ghost" data-a="worldcont">Continue · block ${sw.wd.level}, cred ${Math.round(sw.wd.rep)}</button>` : ''}<button class="btn ghost" data-a="back2title">Back</button></div></div>`;
  }
  if (m === 'wiped') {
    h = `<div class="card"><p class="eyebrow">The Sprawl · block ${G.wd.level}</p><h2 style="color:var(--neon)">Flatlined</h2>
    <p class="say"><b>Kit</b>My people dragged you back to the safehouse. The medics took ¥${G.wipeLost}. Good news: nobody's looking for a corpse, so the heat is off.</p>
    <div class="row"><button class="btn" data-a="wake">Get back up</button><button class="btn ghost" data-a="quit">Title</button></div></div>`;
  }
  if (m === 'over') {
    h = `<div class="card"><p class="eyebrow">District ${G.stage + 1} · ${esc(STAGES[G.stage].name)}</p><h2 style="color:var(--neon)">Flatlined</h2>
    <p>You keep levels, karma, gear and cyberware. The district restarts with full health, three lives each and half your creds. The contract resets.</p>
    <div class="row"><button class="btn" data-a="retry">Run it again</button><button class="btn ghost" data-a="quit">Quit to title</button></div></div>`;
  }
  if (m === 'win') {
    const d = G.debrief || {};
    h = `<div class="card"><p class="eyebrow">Run complete · ${DIFF[G.diff].name}${G.ng ? ' NG+' + G.ng : ''} · level ${PL[0].lvl}${G.coop ? ' and ' + PL[1].lvl : ''} · best combo ${G.bestCombo}</p><h1>Paid in full</h1>
    <p class="say"><b>Juno · fixer</b>${d.done ? "Her nodes are crashed and the ICE is slag. Voss is gone for good this time, scattered across a thousand dead servers. Kagemori's stock dropped forty points before lunch. Nice work." : "The ICE is down and Voss is scattered across a thousand dead servers. Some of her nodes are still running, but that's Kagemori's problem now."}</p>
    <p>You walk out with ¥${PARTY.creds}, ${PARTY.bag.length} item${PARTY.bag.length === 1 ? '' : 's'} in the bag and a cyberarm that still hums.</p>
    ${statsHtml()}${shareHtml()}
    <p>New Game+ keeps your runners, levels, gear, cyberware and spells. Enemies get tougher, elites get more common and loot gets better.</p>
    <div class="row"><button class="btn" data-a="ngplus">New Game+ ${G.ng + 1}</button><button class="btn ghost" data-a="pick">Fresh run</button></div></div>`;
  }
  ov.innerHTML = h;
  if (G.justLearned) {
    const el = ov.querySelector(`[data-a="skill:${G.justLearned}"]`);
    if (el && el.classList) el.classList.add('pop');
  }
  if (m === 'hack') {
    hackInfo();
    hackStep();
    const hb = document.getElementById('hkBtn');
    if (hb) hb.focus({ preventScroll: true });
  }
  if (
    [
      'title',
      'pause',
      'over',
      'win',
      'brief',
      'pick',
      'settings',
      'arenapick',
      'perk',
      'arenaover',
      'trainpick',
      'trained',
      'bcard',
      'worldpick',
      'wiped',
      'codex'
    ].includes(m)
  ) {
    const f = ov.querySelector('.btn');
    if (f) f.focus({ preventScroll: true });
  }
  padRestoreFocus();
}
function npcHtml(id) {
  const n = NPCS.find(x => x.id === id),
    stage = G.stage;
  let body = '',
    sayTxt = '';
  if (id === 'juno') {
    const d = G.debrief || { done: false, title: 'the job' };
    sayTxt = d.done
      ? `${d.title}: done. Here's your cut. When you're ready, the next job starts at the end of the street.`
      : `You didn't finish ${d.title}. No bonus this time, but you're still breathing. The next job starts at the end of the street.`;
    body = `<div class="job"><div class="row" style="justify-content:space-between"><b>Debrief</b><span class="st ${d.done ? 'up' : 'down'}">${d.done ? 'Paid' : 'No bonus'}</span></div>
    <span style="color:var(--muted);font-size:13px">${d.done ? `+¥${d.creds} · +${d.karma} karma each${d.levels ? ` · <span class="up">level up ×${d.levels}</span>` : ''}${d.prize ? ` · ${esc(d.prize.name)} added to the bag` : ''}` : 'Contract rewards withheld.'}</span></div>
    <p>Next: <b style="color:var(--text)">${esc(STAGES[stage + 1].name)}</b>. ${esc(STAGES[stage + 1].sub)}.</p>`;
  } else if (n.lines) {
    sayTxt = n.lines[Math.min(stage, n.lines.length - 1)];
  } else if (id === 'doc') {
    sayTxt = "Chrome costs essence, choomba. Every piece I put in you is mana you won't get back.";
    const cons = [
      {
        k: 'med',
        n: 'Medkit',
        ds: `Party carries up to 5. H to use. Heals 45% HP. You have ${PARTY.med}.`,
        c: Math.round(30 * buyMul()),
        ok: PARTY.med < 5
      },
      {
        k: 'ammo',
        n: 'Ammo box',
        ds: `+16 rounds for each runner.`,
        c: Math.round(30 * (G.coop ? 2 : 1) * buyMul()),
        ok: true
      }
    ];
    body = `${whoTabs()}<div class="list">${cons
      .map(c => {
        const ok = c.ok && PARTY.creds >= c.c;
        return `<div class="item"><div><div class="nm">${c.n}</div><div class="ds">${c.ds}</div></div><div class="acts"><button class="btn sm${ok ? '' : ' ghost'}" data-a="buy:${c.k}" ${ok ? '' : 'disabled'}>¥${c.c}</button></div></div>`;
      })
      .join('')}
    ${Object.keys(CYBER)
      .map(k => {
        const p = PL[G.sheetIdx] || PL[0],
          cy = CYBER[k],
          l = p.cy[k],
          c = Math.round(cy.cost(l) * buyMul()),
          ok = l < 3 && PARTY.creds >= c;
        return `<div class="item"><div><div class="nm">${cy.name} <span style="color:var(--muted);font-weight:400">· ${p.name} ${l}/3</span></div><div class="ds">${cy.desc} Costs 6 max mana.</div></div><div class="acts"><button class="btn sm${ok ? '' : ' ghost'}" data-a="cyber:${k}" ${ok ? '' : 'disabled'}>${l >= 3 ? 'Maxed' : '¥' + c}</button></div></div>`;
      })
      .join('')}</div>`;
  } else if (id === 'ratchet') {
    sayTxt = 'No receipts, no refunds, no questions. Selling? I pay forty cents on the nuyen.';
    body = `${G.world ? `<div class="list"><div class="item"><div><div class="nm">Icebreaker program</div><div class="ds">Cracks one node of any lock instantly. You have ${PARTY.ice || 0}.</div></div><div class="acts"><button class="btn sm${PARTY.creds >= 40 ? '' : ' ghost'}" data-a="buyice" ${PARTY.creds >= 40 ? '' : 'disabled'}>¥40</button></div></div></div>` : ''}
    <h3>For sale</h3><div class="list">${
      G.stock.length
        ? G.stock
            .map(it => {
              const ok = PARTY.creds >= it.price && PARTY.bag.length < 12;
              return `<div class="item"><div><div class="nm r${it.rar}">${esc(it.name)}</div><div class="ds">${SLOTN[it.slot]} · ${itemLine(it)}</div></div><div class="acts"><button class="btn sm${ok ? '' : ' ghost'}" data-a="fbuy:${it.uid}" ${ok ? '' : 'disabled'}>¥${it.price}</button></div></div>`;
            })
            .join('')
        : '<p>Sold out.</p>'
    }</div>
    <h3>Party bag</h3><div class="list">${PARTY.bag.length ? PARTY.bag.map(it => `<div class="item"><div><div class="nm r${it.rar}">${esc(it.name)}</div><div class="ds">${itemLine(it)}</div></div><div class="acts"><button class="btn sm ghost" data-a="sell:${it.uid}">Sell ¥${Math.round(it.price * sellRate())}</button></div></div>`).join('') : '<p>Nothing to sell.</p>'}</div>`;
  } else if (id === 'kit') {
    sayTxt =
      'Need backup? I rent muscle, metal and the odd spirit. One at a time, and no refunds if they get scrapped. I patch up whatever you bring back.';
    const cur = PARTY.ally;
    body = `${cur ? `<div class="job"><div class="row" style="justify-content:space-between"><b>${esc(ALLIES[cur.type].name)}</b><span class="st up">With you</span></div><span style="color:var(--muted);font-size:13px">${cur.hp}/${cur.maxHp} HP. Fully repaired whenever you're back in the Den. If it goes down on a job, it's gone.</span><div class="row"><button class="btn sm ghost" data-a="dismiss">Dismiss</button></div></div>` : '<p>No companion yet.</p>'}
    <div class="list">${Object.keys(ALLIES)
      .map(k => {
        const A = ALLIES[k],
          ac = Math.round(A.cost * buyMul()),
          have = cur && cur.type === k,
          ok = !have && PARTY.creds >= ac;
        return `<div class="item"><div><div class="nm">${esc(A.name)}</div><div class="ds">${esc(A.desc)} ${A.hp} HP base, grows with your level.${cur && !have ? ' Replaces your current companion.' : ''}</div></div><div class="acts"><button class="btn sm${ok ? '' : ' ghost'}" data-a="hire:${k}" ${ok ? '' : 'disabled'}>${have ? 'Hired' : '¥' + ac}</button></div></div>`;
      })
      .join('')}</div>`;
  } else if (id === 'wen') {
    sayTxt =
      "Magic isn't bought, it's earned. But I can sell you the formula. Whether you can hold it is your business.";
    const p = PL[G.sheetIdx] || PL[0];
    body = `${whoTabs()}<div class="list">${Object.keys(SPELLS)
      .map(sid => {
        const s = SPELLS[sid],
          have = p.spells.includes(sid),
          okM = p.D.a.mag >= s.req,
          ok = !have && okM && PARTY.creds >= s.price;
        return `<div class="item"><div><div class="nm">${s.name} <span style="color:var(--muted);font-weight:400">· ${s.cost} mana</span></div><div class="ds">${s.desc}${s.req ? ` Needs Magic ${s.req}.` : ''}</div></div><div class="acts"><button class="btn sm${ok ? '' : ' ghost'}" data-a="learn:${sid}" ${ok ? '' : 'disabled'}>${have ? 'Known' : !okM ? 'Magic ' + s.req : '¥' + s.price}</button></div></div>`;
      })
      .join('')}</div>`;
  }
  return `<div class="card"><p class="eyebrow">The Den · ${esc(n.role)}</p><div class="row" style="justify-content:space-between;align-items:baseline"><h2>${esc(n.name)}</h2><span class="wallet">¥${PARTY.creds}</span></div>
  <p class="say"><b>${esc(n.name)}</b>${esc(sayTxt)}</p>${body}
  <div class="row"><button class="btn" data-a="leave">Leave</button>${id === 'juno' ? '<button class="btn ghost" data-a="nextjob">Take the next job</button>' : ''}<button class="btn ghost" data-a="sheet">Character</button></div></div>`;
}
function openNPC(id) {
  G.npc = id;
  sfx.talk();
  setMode('npc');
}
function selectShare() {
  const el = document.getElementById('shareTxt');
  if (!el || !window.getSelection) return;
  const r = document.createRange();
  r.selectNodeContents(el);
  const s = getSelection();
  s.removeAllRanges();
  s.addRange(r);
}
function findBag(uid) {
  return PARTY.bag.findIndex(i => i.uid === uid);
}
function toggleSheet(who) {
  if (G.mode === 'play' || G.mode === 'den') {
    G.ret = G.mode;
    G.sheetIdx = who < PL.length ? who : 0;
    setMode('sheet');
  } else if (G.mode === 'sheet' && (G.ret === 'play' || G.ret === 'den')) setMode(G.ret);
}
function togglePause() {
  if (G.mode === 'play' || G.mode === 'den') {
    G.ret = G.mode;
    setMode('pause');
  } else if (G.mode === 'pause' || (G.mode === 'sheet' && (G.ret === 'play' || G.ret === 'den')))
    setMode(G.ret);
  else if (G.mode === 'npc') setMode('den');
  else if (G.mode === 'bcard' || G.mode === 'safe') setMode('play');
}
function newRun(coop) {
  G.muts = (G.pendMuts || []).slice();
  G.diff = G.pendDiff;
  G.ng = 0;
  G.challenge = null;
  G.rngW = G.rngP = null;
  newRunStats();
  PL = [newRunner(0)];
  if (coop) PL.push(newRunner(1));
  G.coop = !!coop;
  PL.forEach((p, i) => applyArch(p, G.pendArch[i]));
  Object.assign(PARTY, { creds: rankOf(legLP()) * 15, bag: [], med: 2, contract: null, ally: null });
  G.debrief = null;
  G.stock = [];
  G.bestCombo = 0;
  briefing(0, false);
}
