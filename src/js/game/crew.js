/* Cyber City Tactics · src/js/game/crew.js
 * Crew contracts: named runners you hire from Kit, in the Den or at the safehouse. A crew member takes the
 * companion slot (one at a time, so it's a crew member or a drone, merc or spirit), fights with a special of
 * their own on a cooldown, and takes a cut of each payday: a district's contract in the campaign, each
 * building's cache in the Sprawl. Go down on the job and they wait to be revived (stand by them); a payday
 * where they're standing earns loyalty, and at full loyalty their special changes.
 *
 * Their state lives in PARTY.crew ({ id: { loy } }), so it's saved with the party like everything else.
 * Loaded as a classic script after allies.js: every file shares one global scope, in the order in index.html. */
'use strict';
const CREW_LOY = 5; // loyalty at which the special changes
const CREW_REV = 90; // steps standing beside a downed crew member to get them up
const CREW = {
  kestrel: {
    name: 'Kestrel',
    role: 'Street samurai',
    fee: 150,
    cut: 0.2,
    sp: 'Blade Rush',
    spDesc: 'dashes through the nearest foes, cutting everything in a line',
    loyDesc: 'Blade Rush cuts twice and dazes what it hits',
    line: 'You pay, I cut. Skip the pay and I stop cutting.'
  },
  pixel: {
    name: 'Pixel',
    role: 'Decker',
    fee: 160,
    cut: 0.25,
    sp: 'Shutdown',
    spDesc: 'stuns every drone, turret, mech and ICE on screen; snipes with a smartgun between',
    loyDesc: 'Shutdown also hacks one machine to fight for you',
    line: "I'm not a fighter. I'm the reason the turrets stop shooting at you."
  },
  moss: {
    name: 'Moss',
    role: 'Street shaman',
    fee: 140,
    cut: 0.2,
    sp: 'Mending',
    spDesc: 'heals every runner a little and curses the foes around her',
    loyDesc: 'Mending also gets a downed partner back on their feet',
    line: 'The spirits like you. I reserve judgment.'
  }
};
// their bodies, for the shared companion code (hidden: never a random Arena companion, and not in Kit's list)
Object.assign(ALLIES, {
  kestrel: {
    name: 'Kestrel',
    hidden: true,
    crew: true,
    hp: 120,
    armor: 6,
    d: { scale: 1, style: 'blade' },
    pal: {
      skin: '#e0b08f',
      coat: '#3a1c2e',
      coat2: '#2b1422',
      pants: '#1c1a28',
      hair: '#ff3d8b',
      acc: '#ff3d8b',
      boot: '#141018'
    }
  },
  pixel: {
    name: 'Pixel',
    hidden: true,
    crew: true,
    ranged: true,
    hp: 85,
    armor: 3,
    d: { scale: 0.95, style: 'cap' },
    pal: {
      skin: '#a8724f',
      coat: '#1e3346',
      coat2: '#16263a',
      pants: '#22202e',
      hair: '#45d2ff',
      acc: '#45d2ff',
      boot: '#121418'
    }
  },
  moss: {
    name: 'Moss',
    hidden: true,
    crew: true,
    hp: 100,
    armor: 4,
    d: { scale: 1, style: 'feathers' },
    pal: {
      skin: '#c98a6b',
      coat: '#2f3f2a',
      coat2: '#24321f',
      pants: '#2a2622',
      hair: '#b98cff',
      acc: '#b98cff',
      boot: '#161412'
    }
  }
});
const crewOf = () => (PARTY.ally && CREW[PARTY.ally.type] ? PARTY.ally.type : null);
const crewRec = id => {
  PARTY.crew = isObj(PARTY.crew) ? PARTY.crew : {};
  if (!isObj(PARTY.crew[id])) PARTY.crew[id] = { loy: 0 };
  PARTY.crew[id].loy = clamp(+PARTY.crew[id].loy || 0, 0, CREW_LOY);
  return PARTY.crew[id];
};
const crewLoyal = id => crewRec(id).loy >= CREW_LOY;
const crewFee = id => Math.round(CREW[id].fee * buyMul());
const crewEnt = () => G.ents.find(e => e.kind === 'ally' && !e.summon && CREW[e.ally]);

function hireCrew(id) {
  const C = CREW[id];
  if (!C || crewOf() === id || PARTY.creds < crewFee(id)) return false;
  PARTY.creds -= crewFee(id);
  PARTY.ally = null;
  crewRec(id);
  const e = spawnAlly(id);
  e.spT = 300;
  return true;
}

/** Payday: the crew member takes their cut, and earns loyalty if they're on their feet for it. */
// (fromDrop: the money is still on the floor, so the caller drops less instead of it coming out of PARTY.creds)
function crewPay(amount, what, fromDrop) {
  const id = crewOf();
  if (!id || !(amount > 0)) return 0;
  const C = CREW[id],
    e = crewEnt(),
    up = e && e.state !== 'dead',
    cut = fromDrop ? Math.round(amount * C.cut) : Math.min(PARTY.creds, Math.round(amount * C.cut));
  if (!fromDrop) PARTY.creds -= cut;
  const r = crewRec(id),
    was = r.loy;
  if (up) r.loy = Math.min(CREW_LOY, r.loy + 1);
  if (r.loy >= CREW_LOY && was < CREW_LOY) feat('loyal');
  const lead = alive()[0] || PL[0];
  if (lead)
    G.texts.push({
      x: (e || lead).x,
      y: (e || lead).y,
      z: 96,
      s: `${C.name.toUpperCase()} TAKES ¥${cut}${up ? '' : ' · WAS DOWN, NO LOYALTY'}`,
      c: up ? '#ffc63d' : '#a79dc2',
      life: 100,
      sm: true
    });
  if (r.loy >= CREW_LOY && was < CREW_LOY && lead)
    G.texts.push({
      x: lead.x,
      y: lead.y,
      z: 118,
      s: C.name.toUpperCase() + ' IS LOYAL',
      c: '#7dffb0',
      life: 120
    });
  G.crewCut = { id, cut, what, loy: r.loy };
  return cut;
}

/** Downed: they wait where they fell. A runner standing beside them for a moment gets them back up. */
function crewDownTick(e) {
  if (!e.downed) {
    e.downed = true;
    e.rev = 0;
    // if nobody gets them up, the next street sees them patched up to a quarter
    if (PARTY.ally) PARTY.ally.hp = Math.max(1, Math.round(e.maxHp * 0.25));
    const p = alive()[0];
    if (p) say(p, CREW[e.ally].name.toUpperCase() + ' IS DOWN', '#ff3d8b', 80, 80);
  }
  const near = alive().some(p => Math.abs(p.x - e.x) < 30 && Math.abs(p.y - e.y) < 16);
  e.rev = near ? e.rev + 1 : Math.max(0, e.rev - 2);
  if (e.rev >= CREW_REV) {
    e.downed = false;
    e.rev = 0;
    e.hp = Math.round(e.maxHp * 0.5);
    e.inv = 90;
    e.gone = false;
    setS(e, 'idle');
    if (PARTY.ally) PARTY.ally.hp = e.hp;
    burst(e.x, e.y, 20, '#7dffb0', 12);
    say(e, 'BACK UP', '#7dffb0', 70, 50, true);
    bump('crewrev');
  }
}

/** Their special, on its own cooldown, when there's something to use it on. */
function crewSpecial(e, tg) {
  const id = e.ally,
    C = CREW[id],
    loyal = crewLoyal(id),
    lead = alive()[0] || PL[0],
    lv = lead.lvl || 1;
  if (id === 'kestrel') {
    // a dash through the line toward the target: everything within reach of the path is cut
    const dir = tg.x >= e.x ? 1 : -1,
      x0 = e.x,
      x1 = clamp(tg.x + dir * 40, G.camX + 10, G.camX + W - 10);
    e.x = x1;
    e.y = tg.y;
    e.face = dir;
    const hits = G.ents.filter(
      o =>
        o.team === 1 &&
        o.state !== 'dead' &&
        !(o.d && o.d.passive) &&
        (o.x - x0) * dir >= -10 &&
        (o.x - x1) * dir <= 10 &&
        Math.abs(o.y - tg.y) < 22
    );
    for (let k = 0; k < (loyal ? 2 : 1); k++)
      for (const o of hits) {
        hurt(o, (18 + lv * 2.4) * kinMul(), dir, { src: lead, col: '#ff3d8b', ax: e.x, kb: 5, big: true });
        if (loyal && !(o.d && o.d.boss) && o.state !== 'dead') o.dazeUntil = G.t + 60;
      }
    G.fx.push({ k: 'ring', x: e.x, y: e.y, z: 20, c: '#ff3d8b', life: 14, max: 14, r: 24 });
    sfx.heavy();
  } else if (id === 'pixel') {
    const techs = G.ents.filter(
      o => o.team === 1 && o.state !== 'dead' && isTech(o) && o.x > G.camX - 10 && o.x < G.camX + W + 10
    );
    if (!techs.length) return false;
    for (const o of techs) {
      if (!(o.d && o.d.boss)) o.stunT = Math.max(o.stunT || 0, 150);
      G.fx.push({ k: 'zap', x: o.x, y: o.y, z: o.z + 20, c: '#45d2ff', life: 14, max: 14, r: 0 });
    }
    if (loyal) {
      const h = techs.find(o => hackOpen(o) && !(o.d && o.d.boss));
      if (h && lead) hackFoe(lead, h, true);
    }
    sfx.zap();
  } else if (id === 'moss') {
    let did = false;
    for (const p of active()) {
      if (p.hp < p.maxHp) did = true;
      p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.12));
    }
    for (const o of G.ents)
      if (o.team === 1 && o.state !== 'dead' && Math.abs(o.x - e.x) < 120 && Math.abs(o.y - e.y) < 40) {
        o.curseT = G.t + 300;
        did = true;
      }
    if (loyal) {
      const down = PL.find(p => p.outX != null && p.out);
      if (down) {
        revive(down, lead);
        did = true;
      }
    }
    if (!did) return false;
    burst(e.x, e.y, 26, '#b98cff', 14);
    G.fx.push({ k: 'ring', x: e.x, y: e.y, z: 10, c: '#b98cff', life: 20, max: 20, r: 60 });
    sfx.spell();
  }
  say(
    e,
    C.sp.toUpperCase(),
    id === 'kestrel' ? '#ff3d8b' : id === 'pixel' ? '#45d2ff' : '#b98cff',
    72,
    40,
    true
  );
  return true;
}
/** Called from upAlly each step for a crew member who is up and fighting. */
function crewTick(e, tg) {
  if (e.spT === undefined) e.spT = 300;
  if (e.spT > 0) e.spT--;
  else if (tg && crewSpecial(e, tg)) e.spT = 720;
  else e.spT = 60; // nothing to use it on yet: look again in a second
}

/* ---------- Kit's card ---------- */
function crewHtml() {
  const cur = crewOf();
  return `<h3>Crew for hire</h3><p class="ds">A named runner takes your companion slot, fights with a special of their own, and takes a cut of every payday (a district's contract, a building's cache). Be standing at payday and they get more loyal; at full loyalty their special changes. Go down and they wait for you to stand by them.</p>
    <div class="list">${Object.keys(CREW)
      .map(id => {
        const C = CREW[id],
          r = crewRec(id),
          fee = crewFee(id),
          have = cur === id,
          ok = !have && PARTY.creds >= fee;
        return `<div class="item"><div><div class="nm">${esc(C.name)} <span style="color:var(--muted);font-weight:400">· ${esc(C.role)} · ${Math.round(C.cut * 100)}% cut</span></div>
          <div class="ds">“${esc(C.line)}” <b>${esc(C.sp)}:</b> ${esc(C.spDesc)}.</div>
          <div class="ds">Loyalty <span class="loy" aria-label="${r.loy} of ${CREW_LOY}">${'◆'.repeat(r.loy)}${'◇'.repeat(CREW_LOY - r.loy)}</span>${r.loy >= CREW_LOY ? ` · <b style="color:var(--ok)">${esc(C.loyDesc)}</b>` : ` · at ${CREW_LOY}: ${esc(C.loyDesc)}`}</div></div>
          <div class="acts"><button class="btn sm${ok ? '' : ' ghost'}" data-a="hirecrew:${id}" ${ok ? '' : 'disabled'}>${have ? 'With you' : '¥' + fee}</button></div></div>`;
      })
      .join('')}</div>`;
}
