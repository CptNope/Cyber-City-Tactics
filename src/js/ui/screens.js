/* Cyber City Tactics · src/js/ui/screens.js
 * HTML for menu screens: help, archetype picker, Codex, building cards, hacking, safehouse, settings,
 * character sheet and skills.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ================= overlays ================= */
// every fighting move in one place, under each set of controls
const movesHtml = `<h3>Moves</h3><div class="keys">
<b>Combo</b><span>Punch, punch, punch: the third is an uppercut that launches</span>
<b>Daze and grab</b><span>Two hits in a row put stars over a foe. Walk into it to grab: punch knees (three knock it down), kick throws it into the crowd (hold a direction to aim)</span>
<b>Heavy blow</b><span>Hold punch, release: breaks guards, knocks down everyone in front</span>
<b>Flying kick</b><span>Jump, then punch or kick</span>
<b>Parry</b><span>Dodge right as a hit lands: they stagger and your next hit crits</span>
<b>Throwables</b><span>Punch beside a can, crate or drum to lift it, punch to throw, kick to drop</span>
<b>Shields</b><span>Kicks and heavy blows break riot shields</span>
<b>Chrome</b><span>Doc in the Den installs techniques: faster punches and kicks, longer grabs, harder throws, higher jumps</span></div>
<p style="font-size:12.5px">Bosses, mechs and anything flying can't be grabbed.</p>`;
// the sheet's one-line summary of everything Doc has put in a runner
function chromeLine(p) {
  const cy = Object.keys(CYBER)
      .filter(k => p.cy[k])
      .map(k => CYBER[k].name + (cyMax(k) > 1 ? ' ' + p.cy[k] : '')),
    te = Object.keys(TECH)
      .filter(k => hasTech(p, k))
      .map(k => TECH[k].name);
  const all = cy.concat(te);
  return `<p style="color:var(--muted);font-size:13px"><b style="color:var(--text)">Chrome:</b> ${all.length ? esc(all.join(' · ')) : 'none yet. Doc in the Den installs cyberware and fighting techniques.'}</p>`;
}
const keysHtml = `<div class="cols"><div><h3>Runner 1</h3><div class="keys">
<b>Move</b><span>WASD (arrows too, solo)</span><b>Punch / grab / talk</b><span>J</span><b>Kick</b><span>K</span><b>Jump</b><span>Space</span>
<b>Dodge, parry</b><span>O or Left Shift, right as a hit lands</span><b>Special</b><span>F, or punch and kick together</span><b>Heavy blow</b><span>Hold J, release</span><b>Gun</b><span>U</span><b>Spell</b><span>I</span><b>Swap spell</b><span>Q</span><b>Medkit</b><span>H</span><b>Character</b><span>C</span><b>Block map</b><span>M in the Sprawl</span></div></div>
<div><h3>Runner 2</h3><div class="keys"><b>Move</b><span>Arrows</span><b>Punch</b><span>, or Numpad 1</span><b>Kick</b><span>. or Numpad 2</span><b>Jump</b><span>/ or Numpad 3</span>
<b>Dodge</b><span>Right Shift</span><b>Special</b><span>\\ or Numpad 8</span><b>Gun</b><span>;</span><b>Spell</b><span>'</span><b>Swap / medkit</b><span>] and [</span></div>
<p style="font-size:12.5px">Gamepads: X punch (hold to charge), A jump, B kick, Y spell, RB gun, LB dodge, stick click special, Start pauses or adds Runner 2.</p></div></div>
${movesHtml}`;
const touchHelp = `<div class="keys">
<b>Move</b><span>Drag anywhere on the left side</span><b>PUNCH</b><span>Tap three times for an uppercut. Changes to LIFT, THROW, KNEE or TALK when that's what it will do.</span>
<b>KICK</b><span>Breaks riot shields. Throws a grabbed enemy.</span><b>JUMP</b><span>Tap PUNCH or KICK in the air for a flying kick</span>
<b>DODGE</b><span>Roll through attacks. Dodge right as a punch lands to parry</span><b>GUN · SPELL</b><span>Show ammo and mana cost; dim when you can't use them</span>
<b>MED · ★ · CHAR</b><span>Medkit, your special when the meter is full, character sheet</span>
<b>Hold PUNCH</b><span>Charge a heavy blow that breaks guards</span><b>Hold SPELL</b><span>Swap spells</span></div>
<p style="font-size:12.5px">A gamepad works too. Controls size and side are in Settings.</p>${movesHtml}`;
const padHelp = () => `<div class="keys">
<b>Move</b><span>Left stick or D-pad</span><b>A</b><span>Jump · select in menus</span><b>X</b><span>Punch, grab, talk, enter · hold to charge a heavy blow</span>
<b>B</b><span>Kick, throw · back in menus</span><b>Y</b><span>Spell (RT swaps spells)</span><b>RB</b><span>Gun</span>
<b>LB</b><span>Dodge roll</span><b>LT</b><span>Medkit</span><b>L3 / R3</b><span>Special, or X and B together</span>
<b>Menu</b><span>Pause · on a second controller, add Runner 2</span><b>View</b><span>Character sheet and skills</span><b>LB / RB in menus</b><span>Switch tabs</span></div>
<p style="font-size:12.5px">${esc(padName(PAD.name))} connected. PlayStation and Switch pads use the same positions: Cross is A, Circle is B, Square is X, Triangle is Y.</p>${movesHtml}`;
const helpHtml = () => (PAD.active ? padHelp() : isTouch() ? touchHelp : keysHtml);
function seg(key, opts) {
  return `<div class="seg" role="group">${opts.map(([v, l]) => `<button data-a="pref:${key}:${v}" aria-pressed="${String(prefs[key]) === String(v)}">${l}</button>`).join('')}</div>`;
}
function archHtml(n) {
  n = n || 2;
  const row =
    i => `<div class="job"><div class="row" style="justify-content:space-between"><b>${i ? 'Runner 2 (co-op)' : 'Runner 1'}</b><span class="st" style="color:var(--gold)">★ ${esc(ARCH[G.pendArch[i]].spName)}</span></div>
    <div class="row">${Object.keys(ARCH)
      .map(k =>
        archLocked(k)
          ? `<button class="btn sm ghost" disabled title="Unlock with the ${esc(FEATBY[ARCH[k].locked].name)} feat">🔒 ${ARCH[k].short}</button>`
          : `<button class="btn sm${G.pendArch[i] === k ? '' : ' ghost'}" data-a="arch:${i}:${k}" aria-pressed="${G.pendArch[i] === k}">${ARCH[k].short}</button>`
      )
      .join('')}</div>
    <div class="row" style="gap:5px;align-items:center"><span style="color:var(--muted);font-size:12px;margin-right:4px">Coat</span>${Object.keys(
      COATS
    )
      .map(k => {
        const c = COATS[k],
          o = coatOpen(k),
          sel = pendCoat(i) === k,
          col = c.acc || PALS[i].acc;
        return `<button class="swatch${sel ? ' on' : ''}" ${o ? `data-a="coat:${i}:${k}"` : 'disabled'} title="${esc(c.name)}${o ? '' : ' (locked: ' + esc(FEATBY[c.feat].hidden && !LEG.feats[c.feat] ? 'a hidden feat' : FEATBY[c.feat].name) + ')'}" aria-label="${esc(c.name)} coat${o ? '' : ', locked'}" style="--c1:${c.coat || PALS[i].coat};--c2:${col}">${o ? '' : '🔒'}</button>`;
      })
      .join('')}</div>
    <div class="row" style="gap:5px;align-items:center"><span style="color:var(--muted);font-size:12px;margin-right:4px">Trail</span>${Object.keys(
      TRAILS
    )
      .map(k => {
        const tr = TRAILS[k],
          o = trailOpen(k),
          sel = pendTrail(i) === k;
        return `<button class="swatch${sel ? ' on' : ''}" ${o ? `data-a="trail:${i}:${k}"` : 'disabled'} title="${esc(tr.name)}${o ? '' : ' (locked: ' + esc(FEATBY[tr.feat].hidden && !LEG.feats[tr.feat] ? 'a hidden feat' : FEATBY[tr.feat].name) + ')'}" aria-label="${esc(tr.name)} trail${o ? '' : ', locked'}" style="--c1:#0b0812;--c2:${tr.c || '#30283f'}">${o ? '' : '🔒'}</button>`;
      })
      .join('')}</div>
    ${
      Object.keys(ARCH).some(archLocked)
        ? `<span style="color:var(--muted);font-size:12px">🔒 ${Object.keys(ARCH)
            .filter(archLocked)
            .map(k => `${ARCH[k].name}: ${esc(FEATBY[ARCH[k].locked].desc)}`)
            .join(' ')}</span>`
        : ''
    }
    <span style="color:var(--muted);font-size:12.5px">${esc(ARCH[G.pendArch[i]].desc)} Special: ${esc(ARCH[G.pendArch[i]].spDesc)}</span></div>`;
  return `<h3>Choose your runner</h3>${row(0)}${n > 1 ? row(1) : ''}`;
}
function codexHtml() {
  const tab = G.cxTab || 'feats',
    lp = legLP(),
    ri0 = rankOf(lp),
    nx = RANKS[ri0 + 1];
  const tabs = [
    ['feats', 'Feats'],
    ['legs', 'Legendaries'],
    ['best', 'Bestiary'],
    ['lore', 'Lore'],
    ['runs', 'Runs']
  ];
  const bar = `<div class="tabs" role="tablist">${tabs.map(([k, n]) => `<button class="tab" role="tab" aria-selected="${tab === k}" data-a="cx:${k}">${n}</button>`).join('')}</div>`;
  const head = `<div class="row" style="justify-content:space-between;align-items:baseline"><h2>${RANKS[ri0][1]}</h2><span style="color:var(--gold);font-variant-numeric:tabular-nums">${lp} legend${nx ? ' · next: ' + nx[1] + ' at ' + nx[0] : ''}</span></div>
  ${nx ? `<div class="meter"><i style="width:${Math.round(((lp - RANKS[ri0][0]) / (nx[0] - RANKS[ri0][0])) * 100)}%"></i></div>` : ''}
  <p style="color:var(--muted);font-size:12.5px">Every rank adds ¥15 to the creds you start a campaign or the Sprawl with.</p>`;
  let body = '';
  if (tab === 'feats') {
    const got = FEATS.filter(f => LEG.feats[f.id]).length;
    body = `<p>${got} of ${FEATS.length} feats earned. Hidden feats show up as ??? until you find them.</p><div class="list">${FEATS.map(
      f => {
        const on = LEG.feats[f.id],
          hid = f.hidden && !on;
        const prog =
          f.stat && !on
            ? ` · ${Math.min(LEG.stats[f.stat] || 0, f.n).toLocaleString()}/${f.n.toLocaleString()}`
            : '';
        const rw = f.leg
          ? ` · unlocks ${LEGS[f.leg].name}`
          : f.arch
            ? ` · unlocks the ${ARCH[f.arch].name}`
            : '';
        return `<div class="item" style="${on ? 'border-color:var(--gold)' : hid ? 'opacity:.55' : ''}"><div><div class="nm" style="color:${on ? 'var(--gold)' : 'var(--text)'}">${on ? '★ ' : ''}${hid ? '???' : esc(f.name)}</div><div class="ds">${hid ? 'A hidden feat. Keep playing.' : esc(f.desc) + (hid ? '' : rw) + prog}</div></div><div class="acts"><span style="color:var(--gold);font-size:13px">+${f.lp}</span></div></div>`;
      }
    ).join('')}</div>`;
  }
  if (tab === 'legs') {
    const un = legUnlocked();
    body = `<p>${LEG.legs.length} of ${Object.keys(LEGS).length} found. Feats unlock legendaries as drops; after that they can fall from bosses, bounties, tier-3 caches and hidden doors.</p><div class="list">${Object.keys(
      LEGS
    )
      .map(k => {
        const L = LEGS[k],
          f = LEG.legs.includes(k),
          u = un.includes(k),
          src = FEATS.find(x => x.leg === k);
        return `<div class="item" style="${f ? 'border-color:#ff8a3d' : ''}"><div><div class="nm" style="color:${f ? '#ff8a3d' : u ? 'var(--text)' : 'var(--muted)'}">${f || u ? esc(L.name) : '???'}</div><div class="ds">${f ? SLOTN[L.slot] + ' · ' + esc(L.fx) : u ? 'Unlocked. Now it can drop.' : 'Locked. Earn the ' + (src && src.hidden && !LEG.feats[src.id] ? 'hidden feat' : '“' + esc(src.name) + '” feat') + ' to unlock it.'}</div></div><div class="acts">${f ? '<span style="color:#ff8a3d">Found</span>' : u ? '<span style="color:var(--gold)">Hunting</span>' : '🔒'}</div></div>`;
      })
      .join('')}</div>`;
  }
  if (tab === 'best') {
    const ks = Object.keys(BEST),
      seen = ks.filter(k => LEG.kills[k]).length;
    body = `<p>${seen} of ${ks.length} identified.</p><div class="list">${ks
      .map(k => {
        const n = LEG.kills[k] || 0;
        return `<div class="item"><div><div class="nm">${n ? esc(DEF[k].name) : '???'}</div><div class="ds">${n ? esc(BEST[k]) : 'Take one down to learn more.'}</div></div><div class="acts"><span style="color:var(--muted);font-variant-numeric:tabular-nums">${n ? n.toLocaleString() + ' down' : ''}</span></div></div>`;
      })
      .join('')}</div>`;
  }
  if (tab === 'lore') {
    body = `<p>${LEG.lore.length} of ${LORE.length} shards. Shards drop from vending machines, crates, bosses and Sprawl caches, and every hidden door holds one. Read them in order and a story comes together.</p><div class="list">${LORE.map((L, i) => (LEG.lore.includes(i) ? `<div class="item" style="grid-template-columns:1fr"><div><div class="nm" style="color:var(--mana)">${i + 1}. ${esc(L[0])}</div><div class="ds" style="font-size:13px;line-height:1.45">${esc(L[1])}</div></div></div>` : `<div class="item" style="grid-template-columns:1fr;opacity:.5"><div><div class="nm">${i + 1}. ???</div></div></div>`)).join('')}</div>`;
  }
  if (tab === 'runs') {
    const rs = LEG.runs || [];
    body = rs.length
      ? `<p>Your last ${rs.length} run${rs.length > 1 ? 's' : ''}.</p><div class="list">${rs.map(r => `<div class="item"><div><div class="nm">${esc(r.mode)} · ${esc(r.result)}</div><div class="ds">${esc((ARCH[r.arch] || ARCH.runner).name)}${r.coop ? ' + partner' : ''} · level ${r.lvl} · ${r.kills} takedowns · best combo ${r.combo}${r.extra ? ' · ' + esc(r.extra) : ''}</div></div><div class="acts"><span style="color:var(--muted);font-size:12px">${r.date}</span></div></div>`).join('')}</div>`
      : '<p>No finished runs yet. Campaign endings, Arena runs and Sprawl flatlines show up here.</p>';
  }
  if (tab === 'lore' && LEG.lore.length >= LORE.length)
    body =
      `<p class="say" style="border-color:var(--karma)"><b style="color:var(--karma)">Juno</b>You know everything now. Ssareth's Lantern Vault is hidden somewhere in the Sprawl. Walk every block until you find a door with a lantern over it.</p>` +
      body;
  return `<div class="card"><p class="eyebrow">Codex · your legend across every run</p>${head}${bar}${body}<div class="row"><button class="btn" data-a="back2title">Back</button></div></div>`;
}
function bcardHtml(b) {
  const good = isGood(b),
    lo = G.wd.looted.includes(b.id),
    lock = b.lockUntil && b.lockUntil > Date.now();
  const kind = b.roost
    ? 'The last door'
    : b.final
      ? 'The final job'
      : {
          home: b.dirty ? 'Residence · dirty money' : 'Residence',
          business: 'Business',
          hideout: 'Gang hideout',
          blacksite: 'Corporate black site',
          club: 'Gang nightclub',
          precinct: 'Lone Star precinct',
          secret: 'Hidden door'
        }[b.type];
  const hak = Math.max(...active().map(p => p.D.a.hak || 1)),
    rooms = roomsOf(b),
    f = FAC[facOf(b)];
  const loot =
    b.type === 'secret'
      ? 'lore, rare gear and maybe a legendary'
      : b.type === 'home' && !b.dirty
        ? 'a little cash and a medkit'
        : `${b.tier} item${b.tier > 1 ? 's' : ''} (${RAR[Math.max(0, b.tier - 1)].n} or better), creds and maybe an icebreaker`;
  const special =
    b.type === 'club'
      ? `<p class="say" style="border-color:var(--karma)"><b style="color:var(--karma)">Dance floor</b>Twice the crowd, all of them drunk. Combos last twice as long in here, and every takedown pays 50% more creds.</p>`
      : b.type === 'precinct'
        ? good
          ? `<p class="say" style="border-color:var(--mana)"><b style="color:var(--mana)">Evidence locker</b>Clean this place out and your file goes in the shredder: heat drops to zero. Expect cops in every room.</p>`
          : `<p class="say"><b>Juno</b>Not yet. Hit a precinct before the street trusts you and you're just a cop killer. Get your street cred to +${PRECINCT_CRED} first.</p>`
        : '';
  const moral = good
    ? `<p class="say" style="border-color:var(--ok)"><b style="color:var(--ok)">Pixel's intel</b>${esc(b.owner)}. Cleaning this place out helps the street: cred +${8 * b.tier} and bonus karma.</p>`
    : `<p class="say"><b>Pixel's intel</b>${esc(b.owner)}. Breaking in here hurts people who did nothing to you. Heat +${heatFor(b)} (cops will come), cred −${credLoss(b)}.</p>`;
  const bty =
    b.bounty && !G.wd.bountyDone
      ? `<p class="say" style="border-color:var(--gold)"><b style="color:var(--gold)">Juno's bounty</b>${esc(b.bounty.name)} is holed up in here. Bring them down for ¥${b.bounty.reward}, karma and a shot at something rare.</p>`
      : '';
  const sec =
    b.type === 'secret'
      ? `<p class="say" style="border-color:var(--karma)"><b style="color:var(--karma)">Off the map</b>${esc(b.owner)} Whatever's at the bottom has a real chance of being legendary.</p>`
      : '';
  const politics = b.fac
    ? `<p style="font-size:13px;color:var(--muted);margin:0">Owned by <b style="color:${FACTIONS[b.fac].col}">${FACTIONS[b.fac].name}</b> (${facLabel(facStand(b.fac)).toLowerCase()}, ${Math.round(facStand(b.fac))}). Cleaning it out: ${FACTIONS[b.fac].name} −25${FACTIONS[b.fac].rival ? `, ${FACTIONS[FACTIONS[b.fac].rival].name} +15` : ', every crew +5'}.</p>`
    : '';
  return `<div class="card"><p class="eyebrow">${kind} · tier ${b.tier} · block ${G.wd.level}</p><h2>${esc(b.name)}</h2>${sec || moral}${special}${bty}${politics}
  <div class="job"><span style="color:var(--muted);font-size:13px">${rooms} room${rooms > 1 ? 's' : ''}${f.boss[b.tier] ? ', guarded by a ' + esc(f.bossName[b.tier].toLowerCase()) : ''}. Loot: ${loot}.<br>Lock strength ${b.tier}: ${b.tier + 1} clean hits to crack. Your best Hacking is ${hak}. Icebreakers: ${PARTY.ice || 0}.</span></div>
  <div class="row">${lo ? '<button class="btn" disabled>Cleaned out</button>' : lock ? `<button class="btn" disabled>Alarm resets in ${Math.ceil((b.lockUntil - Date.now()) / 1000)}s</button>` : `<button class="btn" data-a="hack">Hack the door</button>`}<button class="btn ghost" data-a="leave">Walk away</button></div></div>`;
}
function hackHtml() {
  const h = G.hack,
    b = h.b;
  return `<div class="card"><p class="eyebrow">Hacking · ${esc(b.name)} · ${h.vault ? 'vault, lock 4' : 'lock ' + b.tier}</p><h2>${h.vault ? 'Crack the vault' : 'Crack the lock'}</h2>
  <p>${PAD.active ? 'Press A or X' : isTouch() ? 'Tap HACK' : 'Press Space or J'} while the cursor is inside the green window. ${h.need} clean hits open the door. Miss ${h.maxMiss + 1} times and you're locked out${isGood(b) ? '' : ' and the alarm adds heat'}.</p>
  <div class="trk" id="hkTrk"><div class="zone" id="hkZone"></div><div class="cur" id="hkCur"></div></div>
  <p id="hkProg"></p>
  <div class="row"><button class="btn big" data-a="hackpress" id="hkBtn">Hack</button><button class="btn ghost" data-a="useice" id="hkIce">Icebreaker</button><button class="btn ghost" data-a="hackquit">Back off</button></div></div>`;
}
function safeHtml() {
  const tabs = [
    ['doc', 'Doc'],
    ['kit', 'Kit'],
    ['wen', 'Old Wen'],
    ['ratchet', 'Ratchet'],
    ['stash', 'Stash'],
    ['lay', 'Lay low']
  ];
  const bar = `<div class="tabs" role="tablist">${tabs.map(([k, n]) => `<button class="tab" role="tab" aria-selected="${G.safeTab === k}" data-a="safetab:${k}">${n}</button>`).join('')}</div>`;
  if (G.safeTab === 'stash')
    return `<div class="card"><p class="eyebrow">Safehouse · block ${G.wd.level}</p><div class="row" style="justify-content:space-between;align-items:baseline"><h2>Stash</h2><span class="wallet">¥${PARTY.creds}</span></div>${bar}${stashHtml()}
    <div class="row"><button class="btn" data-a="leave">Back to the street</button><button class="btn ghost" data-a="sheet">Character</button></div></div>`;
  if (G.safeTab !== 'lay')
    return npcHtml(G.safeTab)
      .replace('<p class="eyebrow">The Den ·', '<p class="eyebrow">Safehouse ·')
      .replace('<p class="say">', bar + '<p class="say">');
  const w = G.wd,
    lc = 60 * w.heat * w.level,
    rp = Math.round(w.rep),
    done = w.looted.length,
    total = w.street.buildings.filter(b => b.type !== 'safe' && !b.hidden).length;
  const evb = w.street.event
    ? `<div class="job" style="border-color:${EVENTS[w.street.event].col}"><b style="color:${EVENTS[w.street.event].col}">Block event: ${EVENTS[w.street.event].name}</b><span style="color:var(--muted);font-size:13px">${EVENTS[w.street.event].desc}</span></div>`
    : '';
  return `<div class="card"><p class="eyebrow">Safehouse · block ${w.level}</p><div class="row" style="justify-content:space-between;align-items:baseline"><h2>Lay low</h2><span class="wallet">¥${PARTY.creds}</span></div>${bar}${evb}
  <div class="job"><div class="row" style="justify-content:space-between"><b>Heat ${'★'.repeat(w.heat)}${'☆'.repeat(5 - w.heat)}</b><span class="st" style="color:${w.heat ? 'var(--neon)' : 'var(--ok)'}">${w.heat ? 'Wanted' : 'Clean'}</span></div>
    <span style="color:var(--muted);font-size:13px">Heat cools by a star for every 25 seconds with no cops around. Or pay someone to make the paperwork disappear.</span>
    <div class="row"><button class="btn sm${w.heat && PARTY.creds >= lc ? '' : ' ghost'}" data-a="laylow" ${w.heat && PARTY.creds >= lc ? '' : 'disabled'}>${w.heat ? 'Lay low · ¥' + lc : 'Nothing to clear'}</button></div></div>
  <div class="job"><div class="row" style="justify-content:space-between"><b>Street cred ${rp > 0 ? '+' : ''}${rp}</b><span class="st" style="color:${rp >= 30 ? 'var(--ok)' : rp <= -30 ? 'var(--neon)' : 'var(--muted)'}">${rp >= 30 ? 'Respected' : rp <= -30 ? 'Feared' : 'Unknown'}</span></div>
    <span style="color:var(--muted);font-size:13px">At +30 the doc and Kit give you 15% off. At −30 Ratchet pays 60% instead of 40% for your loot, because nobody else will deal with you.</span></div>
  <div class="job"><div class="row" style="justify-content:space-between"><b>Move to a new block</b><span class="st" style="color:var(--gold)">${done}/${total} cleaned out</span></div>
    <span style="color:var(--muted);font-size:13px">A fresh street with tougher locks, meaner guards and better loot. Heat stays behind; cred comes with you.</span>
    <div class="row"><button class="btn sm" data-a="newblock">Go to block ${w.level + 1}</button></div></div>
  <div class="row"><button class="btn" data-a="leave">Back to the street</button><button class="btn ghost" data-a="sheet">Character</button></div></div>`;
}
// Plain-text snapshot for bug reports: what the game sees about the device and how fast it's running
function perfReport() {
  const tier = ['sharp (up to 2x)', '1x', 'light', 'lean (3/4 res)'][gfxTier()];
  return [
    `Cyber City Tactics ${typeof APP_VERSION === 'string' ? APP_VERSION : ''}`,
    `Browser: ${navigator.userAgent}`,
    `Screen: ${window.innerWidth}x${window.innerHeight} at ${window.devicePixelRatio || 1}x; canvas ${cvs.width}x${cvs.height}; view ${W}x${VH}`,
    `Graphics: ${prefs.gfx}, running ${tier}; reduced motion ${RM ? 'on' : 'off'}`,
    `Frame rate: ${PERF.fps || Math.round(1000 / PERF.ema)} fps (frame ${PERF.ema.toFixed(1)} ms), game ${PERF.lps || 60} steps/s`,
    `Input: ${isTouch() ? 'touch' : 'keyboard'}${PAD.active ? ' + controller' : ''}`
  ].join('\n');
}
function settingsHtml() {
  const row = (n, d, ctl) =>
    `<div class="setrow"><div><div class="nm" style="font-weight:600">${n}</div>${d ? `<div class="ds">${d}</div>` : ''}</div>${ctl}</div>`;
  const onoff = k =>
    seg(k, [
      [true, 'On'],
      [false, 'Off']
    ]);
  return `<div class="card"><p class="eyebrow">Settings</p><h2>Tune your rig</h2><div>
  ${row('Sound effects', '', onoff('sound'))}${row('Music', 'Chiptune tracks for each district', onoff('music'))}
  ${row(
    'Graphics',
    prefs.gfx === 'auto'
      ? `Auto picks for your device${['', ': running at 1x sharpness', ': running light', ': running lean'][PERF.tier]}`
      : prefs.gfx === 'low'
        ? 'Lighter effects and sharpness, for older phones'
        : 'Full effects and sharpness',
    seg('gfx', [
      ['auto', 'Auto'],
      ['high', 'High'],
      ['low', 'Low']
    ])
  )}
  ${row('Frame rate counter', 'Shows frames per second, game speed and the quality step', onoff('fps'))}
  ${row(
    'Performance report',
    'Copies your device, browser, quality step and frame rate, to paste into a bug report',
    `<button class="btn sm ghost" data-a="perfreport" id="perfBtn">Copy report</button>`
  )}${G.perfTxt ? `<pre class="share" id="shareTxt" style="white-space:pre-wrap;font-size:12px">${esc(G.perfTxt)}</pre>` : ''}
  ${row('Screen shake', '', onoff('shake'))}${navigator.vibrate || PAD.active ? row('Vibration', PAD.active ? 'Phone buzz and controller rumble on hits and level-ups' : 'Buzz on hits and level-ups', onoff('haptics')) : ''}
  ${row('Tips', 'One-time hints as you meet each mechanic', onoff('tips'))}
  ${row(
    'Touch controls size',
    '',
    seg('size', [
      ['s', 'S'],
      ['m', 'M'],
      ['l', 'L']
    ])
  )}
  ${row(
    'Touch controls side',
    'Where the buttons sit',
    seg('lefty', [
      [false, 'Buttons right'],
      [true, 'Buttons left']
    ])
  )}
  ${canFull() ? row('Full screen', 'Best on phones, held sideways', '<button class="btn sm ghost" data-a="full">Go full screen</button>') : ''}
  ${row('Controller', PAD.active ? `${esc(padName(PAD.name))}. In menus: D-pad or stick to move, A to select, B to go back, LB and RB for tabs.` : 'Plug in or pair any standard controller. It works in every menu and in play; a second one adds Runner 2.', `<span class="ds">${PAD.active ? '✓ Connected' : 'None yet'}</span>`)}
  ${pwaSettingsRows(row)}
  </div><div class="row"><button class="btn" data-a="setdone">Done</button><button class="btn ghost" data-a="tipsreset">Show tips again</button></div></div>`;
}
const AN = { bod: 'BOD', str: 'STR', agi: 'AGI', mag: 'MAG', hak: 'HAK' };
const SLOTN = { weapon: 'Melee weapon', gun: 'Gun', armor: 'Armor' };
function bonusStr(b) {
  return Object.keys(b || {})
    .filter(k => b[k])
    .map(k => `${AN[k]} ${b[k] > 0 ? '+' : '−'}${Math.abs(b[k])}`)
    .join(' · ');
}
function itemLine(it) {
  if (it.leg) return itemLine0(it) + ` · <span style="color:#ff8a3d">Legendary: ${LEGS[it.leg].fx}</span>`;
  return itemLine0(it);
}
function itemLine0(it) {
  return itemLine1(it) + (it.gmod ? ` · <span style="color:var(--mana)">${GMODS[it.gmod].name}</span>` : '');
}
function itemLine1(it) {
  const bs = BASES[it.slot][it.base] || {};
  const s =
    it.slot === 'armor'
      ? `Armor ${it.arm}`
      : it.slot === 'gun'
        ? `Damage ${it.dmg}, ${FIRE[it.fire]}`
        : `Melee +${it.dmg}, reach +${it.reach || 0}${bs.note ? ', ' + bs.note : ''}`;
  const b = bonusStr(it.bonus);
  return (
    s +
    (b ? ' · ' + b : '') +
    (it.mod
      ? ` · <span style="color:${AFX_COL[it.mod] || 'var(--gold)'}">${AFFIX[it.mod].n}: ${AFFIX[it.mod].desc}</span>`
      : '')
  );
}
const newTag = it => (it.fresh ? '<span class="newtag">New</span>' : '');
// sort toggle for any bag list
const sortSeg = () =>
  `<div class="seg" role="group" aria-label="Sort">${[
    ['best', 'Best'],
    ['value', 'Value'],
    ['new', 'Newest']
  ]
    .map(
      ([v, l]) =>
        `<button data-a="pref:bagSort:${v}" aria-pressed="${(prefs.bagSort || 'best') === v}">${l}</button>`
    )
    .join('')}</div>`;
function cmp(it, p) {
  const cur = p.eq[it.slot],
    k = it.slot === 'armor' ? 'arm' : 'dmg';
  const d = (it[k] || 0) - (cur ? cur[k] || 0 : 0);
  return d > 0
    ? `<span class="up">▲ ${d}</span>`
    : d < 0
      ? `<span class="down">▼ ${-d}</span>`
      : '<span>= same</span>';
}
function whoTabs() {
  if (!G.coop) return '';
  return `<div class="tabs" role="tablist">${PL.map((p, i) => `<button class="tab" role="tab" aria-selected="${G.sheetIdx === i}" data-a="who:${i}">${p.name}${p.pts ? '<span class="dot"></span>' : ''}</button>`).join('')}</div>`;
}
function sheetTabs(p) {
  const st = G.sheetTab || 'char';
  return `<div class="tabs" role="tablist" style="margin-top:6px"><button class="tab" role="tab" aria-selected="${st === 'char'}" data-a="stab:char">Character${p.pts ? '<span class="dot"></span>' : ''}</button><button class="tab" role="tab" aria-selected="${st === 'skills'}" data-a="stab:skills">Skills${p.spts ? '<span class="dot"></span>' : ''}</button></div>`;
}
function skillsHtml() {
  const p = PL[G.sheetIdx] || PL[0];
  initSkills(p);
  const tr = G.tree || (ARCH_SKILL[p.arch] ? SKILLS[ARCH_SKILL[p.arch]].t : 'brawler');
  G.tree = tr;
  const T = TREES[tr],
    pts = treePts(p, tr);
  const tt = `<div class="tabs" role="tablist">${Object.keys(TREES)
    .map(
      k =>
        `<button class="tab" role="tab" aria-selected="${k === tr}" data-a="tree:${k}" style="${k === tr ? 'color:' + TREES[k].col : ''}">${TREES[k].name} <small style="opacity:.7">${treePts(p, k)}</small></button>`
    )
    .join('')}</div>`;
  const rows = [0, 1, 2, 3]
    .map(r => {
      const ids = Object.keys(SKILLS).filter(k => SKILLS[k].t === tr && SKILLS[k].row === r);
      const lockTxt =
        pts < ROW_NEED[r]
          ? `${ROW_NEED[r]} point${ROW_NEED[r] > 1 ? 's' : ''} in ${T.name}`
          : p.lvl < ROW_LVL[r]
            ? `Level ${ROW_LVL[r]}`
            : '';
      return `<div class="sk-row">${ids
        .map(id => {
          const S = SKILLS[id],
            own = has(p, id),
            can = canLearn(p, id),
            st = own ? 'own' : can ? 'can' : 'lock';
          return `<button class="sk ${st}" style="--tc:${T.col}" data-a="skill:${id}" ${can ? '' : 'aria-disabled="true"'}><span class="sk-n">${own ? '✓ ' : ''}${S.name}</span><span class="sk-d">${S.desc}</span>${!own && !can && lockTxt ? `<span class="sk-l">Needs ${lockTxt}</span>` : ''}</button>`;
        })
        .join('')}</div>`;
    })
    .join('<div class="sk-link" style="--tc:' + T.col + '"></div>');
  return `${whoTabs()}${sheetTabs(p)}<div class="row" style="justify-content:space-between;align-items:baseline"><p class="eyebrow">${p.name} · level ${p.lvl}</p><b style="color:var(--gold);font-variant-numeric:tabular-nums">${p.spts} skill point${p.spts === 1 ? '' : 's'}</b></div>
  ${tt}<p style="color:var(--muted);margin:8px 0 4px;font-size:13px">${T.blurb} You earn a skill point every level. Each row needs points spent higher up the tree; the capstone also needs level 8. Decker skills help the whole team.</p>
  <div class="sk-tree">${rows}</div>`;
}
function charHtml() {
  if (G.sheetTab === 'skills') return skillsHtml();
  const p = PL[G.sheetIdx] || PL[0],
    D = p.D,
    a = D.a,
    nx = karmaNext(p.lvl);
  const attrs = Object.keys(ATTRS)
    .map(
      k =>
        `<div class="attr"><span class="k">${ATTRS[k].name}</span><span class="v"><span>${a[k]}${a[k] !== p.attr[k] ? `<small style="font-size:13px;color:var(--mana)"> (${p.attr[k]}+${a[k] - p.attr[k]})</small>` : ''}</span>${p.pts > 0 && p.attr[k] < 10 ? `<button class="btn sm" data-a="attr:${k}" aria-label="Raise ${ATTRS[k].name}">+1</button>` : ''}</span><span class="h">${ATTRS[k].hint}</span></div>`
    )
    .join('');
  const eq = ['weapon', 'gun', 'armor']
    .map(s => {
      const it = p.eq[s];
      return `<div class="item"><div><div class="ds">${SLOTN[s]}</div><div class="nm ${it ? 'r' + it.rar : ''}">${it ? esc(it.name) : s === 'weapon' ? 'Bare cyberfists' : 'Nothing'}</div>${it ? `<div class="ds">${itemLine(it)}</div>` : ''}</div><div class="acts">${it ? `<button class="btn sm ghost" data-a="unequip:${s}">Unequip</button>` : ''}</div></div>`;
    })
    .join('');
  // grouped by slot, best first, so a big bag stays scannable
  const bag = PARTY.bag.length
    ? ['weapon', 'gun', 'armor']
        .map(slot => {
          const its = PARTY.bag.filter(it => it.slot === slot).sort(bagSort());
          return its.length
            ? `<p class="eyebrow">${SLOTN[slot]} · ${its.length}</p>` +
                its
                  .map(
                    it =>
                      `<div class="item${it.lock ? ' locked' : ''}"><div><div class="nm r${it.rar}">${lockName(it)}</div><div class="ds">${itemLine(it)} · ${cmp(it, p)}</div></div><div class="acts"><button class="btn sm" data-a="equip:${it.uid}">Equip</button>${lockBtn(it)}${it.lock ? '' : `<button class="btn sm ghost" data-a="drop:${it.uid}">Drop</button>`}</div></div>`
                  )
                  .join('')
            : '';
        })
        .join('')
    : '<p>The bag is empty. Gear drops from enemies and bosses, and Ratchet sells it in the Den.</p>';
  const spells = p.spells
    .map(
      (id, i) =>
        `<button class="btn sm ${i === p.spell ? '' : 'ghost'}" data-a="spell:${i}">${SPELLS[id].name} · ${SPELLS[id].cost} mana</button>`
    )
    .join('');
  return `${whoTabs()}${sheetTabs(p)}<div class="row" style="justify-content:space-between"><p class="eyebrow">${p.name} · ${ARCH[p.arch].name} · level ${p.lvl} · ${p.pts} point${p.pts === 1 ? '' : 's'} to spend</p><span style="color:var(--muted);font-size:12.5px;font-variant-numeric:tabular-nums">Karma ${p.karma}/${nx}</span></div>
  <div class="meter"><i style="width:${Math.round((p.karma / nx) * 100)}%"></i></div>
  <div class="attrs">${attrs}</div>
  <div class="derived"><span>HP <b>${Math.ceil(p.hp)}/${p.maxHp}</b></span><span>Mana <b>${p.mp}/${p.maxMp}</b></span><span>Armor <b>${D.armor}</b></span><span>Melee <b>+${Math.round(D.melee)}</b></span><span>Gun <b>${D.gun}</b></span><span>Crit <b>${Math.round(D.crit * 100)}%</b></span><span>Spell power <b>${D.spell}</b></span><span>Best combo <b>${G.bestCombo}</b></span></div>
  <h3>Equipped</h3><div class="list">${eq}</div>
  ${chromeLine(p)}
  <div class="row" style="justify-content:space-between;align-items:center"><h3>Party bag · ${PARTY.bag.length}/${BAG_MAX}</h3>${sortSeg()}</div><p style="color:var(--muted);font-size:13px">Sell spare gear at any shop counter. Ratchet the fence pays best. Lock anything you want to keep: locked items can't be sold, dropped or scrapped.</p><div class="list">${bag}</div>
  <h3>Spells</h3><div class="row">${spells}</div>
  <h3>Special · ${esc(ARCH[p.arch].spName)}</h3><p>${esc(ARCH[p.arch].spDesc)} The meter fills as you deal and take damage. ${PAD.active ? 'Press L3 or R3 (or X and B together) when it is full.' : isTouch() ? 'Tap ★ when it reads READY.' : 'Press F (Runner 2: \\) when it is full, or punch and kick together.'}</p>`;
}
function jobHtml(C) {
  if (!C) return '';
  const st = C.done
    ? '<span class="st up">Complete</span>'
    : C.failed
      ? '<span class="st down">Failed</span>'
      : `<span class="st" style="color:var(--gold)">${C.key === 'ghost' ? "Don't lose a life" : C.count + ' / ' + C.need}</span>`;
  const def = CONTRACTS[C.idx];
  return `<div class="job"><div class="row" style="justify-content:space-between"><b>${esc(C.title)}</b>${st}</div><span style="color:var(--muted);font-size:13px">${esc(C.goal)}. Reward: ${def.creds ? '¥' + def.creds + ', ' : ''}${def.karma} karma${def.prize ? ', plus a Prototype item' : ''}.</span></div>`;
}
