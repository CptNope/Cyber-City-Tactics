/* Cyber City Tactics · src/js/ui/actions.js
 * Every menu button: one click handler keyed by data-a attributes.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
ov.addEventListener('pointerdown', e => {
  if (e.target.closest && e.target.closest('#hkBtn') && G.hack) {
    e.preventDefault();
    G.hack.skip = true;
    A.unlock();
    hackPress();
  }
});
ov.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (!b || b.disabled) return;
  A.unlock();
  const parts = b.dataset.a.split(':'),
    a = parts[0],
    arg = parts[1];
  const card = ov.querySelector('.card'),
    top = card ? card.scrollTop : 0;
  if (netAct(a, b)) return;
  let keep = true;
  const p = PL[G.sheetIdx] || PL[0];
  const rerender = () => {
    renderOv();
    if (G.world) saveWorld();
    else if (G.mode === 'npc' || G.mode === 'locker' || G.ret === 'den') saveGame('den');
  };
  switch (a) {
    case 'pick':
      G.pendDiff = G.diff;
      setMode('pick');
      keep = false;
      break;
    case 'trainpick':
      setMode('trainpick');
      keep = false;
      break;
    case 'train':
      startTraining();
      keep = false;
      break;
    case 'skipstep':
      if (G.training) {
        G.tdone = 1;
        setMode('play');
      }
      keep = false;
      break;
    case 'arenapick':
      G.pendDiff = G.arena ? G.diff : G.pendDiff;
      setMode('arenapick');
      keep = false;
      break;
    case 'jobs':
      setMode('jobs');
      keep = false;
      break;
    case 'drive':
      startDrive(arg, parts[2] === '2');
      keep = false;
      break;
    case 'driveagain':
      startDrive((G.drive && G.drive.id) || G.lastDrive || 'causeway', G.coop);
      keep = false;
      break;
    case 'arena1':
      G.arenaSeed = null;
      startArena(false);
      keep = false;
      break;
    case 'arena2':
      G.arenaSeed = null;
      startArena(true);
      keep = false;
      break;
    case 'arenaagain':
      G.pendDiff = G.diff;
      startArena(G.coop, G.challenge ? (G.challenge.daily ? 'day' : true) : false);
      keep = false;
      break;
    case 'day1':
      startArena(false, 'day');
      keep = false;
      break;
    case 'day2':
      startArena(true, 'day');
      keep = false;
      break;
    case 'week1':
      startArena(false, true);
      keep = false;
      break;
    case 'week2':
      startArena(true, true);
      keep = false;
      break;
    case 'perfreport': {
      G.perfTxt = perfReport();
      renderOv();
      const btn = document.getElementById('perfBtn'),
        done = ok => {
          if (btn) btn.textContent = ok ? 'Copied' : 'Select the text below to copy';
        };
      try {
        navigator.clipboard.writeText(G.perfTxt).then(
          () => done(true),
          () => {
            selectShare();
            done(false);
          }
        );
      } catch (err) {
        selectShare();
        done(false);
      }
      break;
    }
    case 'copyshare': {
      const t = shareLine(),
        btn = document.getElementById('copyBtn');
      const done = ok => {
        if (btn) btn.textContent = ok ? 'Copied' : 'Select the text above to copy';
      };
      try {
        navigator.clipboard.writeText(t).then(
          () => done(true),
          () => {
            selectShare();
            done(false);
          }
        );
      } catch (err) {
        selectShare();
        done(false);
      }
      break;
    }
    case 'nativeshare': {
      try {
        navigator.share({ title: 'Cyber City Tactics', text: shareLine() }).catch(() => {});
      } catch (err) {}
      break;
    }
    case 'perk': {
      const pk = PERKS.find(x => x.id === arg);
      if (pk && G.mode === 'perk') {
        pk.go();
        sfx.level();
        setMode('play');
        nextArenaWave();
      }
      keep = false;
      break;
    }
    case 'install':
      pwaInstall();
      break;
    case 'export':
      pwaExport();
      break;
    case 'import':
      pwaImportPick();
      break;
    case 'importok':
      pwaImportApply();
      break;
    case 'importno':
      G.importData = null;
      G.importErr = null;
      renderOv();
      break;
    case 'settings':
      G.setRet = G.mode;
      setMode('settings');
      keep = false;
      break;
    case 'setdone':
      G.importData = G.importErr = null;
      setMode(G.setRet || 'title');
      break;
    case 'pref': {
      const k = arg,
        raw = parts[2];
      const v = raw === 'true' ? true : raw === 'false' ? false : raw;
      if (k === 'music') setMusic(v);
      else prefs[k] = v;
      savePrefs();
      applyPrefs();
      renderOv();
      break;
    }
    case 'tipsreset':
      prefs.seen = {};
      prefs.rotDismissed = false;
      prefs.tips = true;
      savePrefs();
      renderOv();
      break;
    case 'full':
      goFull();
      break;
    case 'diff':
      G.pendDiff = +arg;
      renderOv();
      break;
    case 'mut': {
      G.pendMuts = G.pendMuts || [];
      const i = G.pendMuts.indexOf(arg);
      if (i >= 0) G.pendMuts.splice(i, 1);
      else G.pendMuts.push(arg);
      renderOv();
      break;
    }
    case 'coat':
      if (coatOpen(parts[2])) {
        G.pendCoat = G.pendCoat || (LEG.pendCoat || ['sig', 'sig']).slice();
        G.pendCoat[+arg] = parts[2];
        LEG.pendCoat = G.pendCoat;
        saveLeg();
      }
      renderOv();
      break;
    case 'trail':
      if (trailOpen(parts[2])) {
        G.pendTrail = G.pendTrail || (LEG.pendTrail || ['none', 'none']).slice();
        G.pendTrail[+arg] = parts[2];
        LEG.pendTrail = G.pendTrail;
        saveLeg();
      }
      renderOv();
      break;
    case 'arch':
      if (!archLocked(parts[2])) G.pendArch[+arg] = parts[2];
      renderOv();
      break;
    case 'back2title':
      setMode('title');
      break;
    case 'ngplus':
      feat('ngp');
      G.ng++;
      newRunStats();
      for (const q of PL) {
        q.hp = q.maxHp;
        q.mp = q.maxMp;
        q.ammo = Math.max(q.ammo, 24);
      }
      PARTY.contract = null;
      G.debrief = null;
      briefing(0, false);
      keep = false;
      break;
    case 'new':
    case 'new2': {
      const coop = a === 'new2';
      // the very first run: offer Juno's training once, then go straight into the run afterward
      if (!prefs.trained && !(prefs.seen && prefs.seen.trainoffer)) {
        prefs.seen = prefs.seen || {};
        prefs.seen.trainoffer = true;
        savePrefs();
        G.trainThen = { coop };
        setMode('trainoffer');
      } else {
        G.trainThen = null;
        newRun(coop);
      }
      keep = false;
      break;
    }
    case 'trainfirst':
      startTraining();
      keep = false;
      break;
    case 'trainskip':
    case 'trainrun': {
      const then = G.trainThen || { coop: false };
      G.trainThen = null;
      G.training = false;
      newRun(then.coop);
      keep = false;
      break;
    }
    case 'cont': {
      const s = store.load('cs_save3');
      if (!s) break;
      loadGame(s);
      if (s.phase === 'den') enterDen();
      else if (s.phase === 'brief') briefing(s.stage, false);
      else startStage(s.stage);
      keep = false;
      break;
    }
    case 'mute':
      prefs.sound = !prefs.sound;
      savePrefs();
      renderOv();
      break;
    case 'music':
      setMusic(!prefs.music);
      renderOv();
      break;
    case 'go':
      startStage(G.stage);
      break;
    case 'notyet':
      G.mode = 'den';
      setMode('den');
      break;
    case 'resume':
      setMode(G.ret);
      break;
    case 'close':
      setMode(G.ret);
      break;
    case 'map':
      if (G.mode === 'play') G.ret = 'play';
      setMode('map');
      keep = false;
      break;
    case 'leave':
      setMode(G.world ? 'play' : 'den');
      if (G.world) saveWorld();
      break;
    case 'codex':
      saveLeg();
      G.cxTab = G.cxTab || 'feats';
      setMode('codex');
      keep = false;
      break;
    case 'cx':
      G.cxTab = arg;
      renderOv();
      keep = false;
      break;
    case 'safetab':
      G.safeTab = arg;
      renderOv();
      keep = false;
      break;
    case 'hack':
      if (G.bsel && !G.wd.looted.includes(G.bsel.id)) {
        startHack(G.bsel);
        keep = false;
      }
      break;
    case 'hackpress':
      if (G.hack && G.hack.skip) {
        G.hack.skip = false;
        break;
      }
      hackPress();
      keep = false;
      break;
    case 'useice':
      useIce();
      keep = false;
      break;
    case 'hackquit':
      G.hack = null;
      setMode('play');
      break;
    case 'buyice':
      if (PARTY.creds >= 40) {
        PARTY.creds -= 40;
        PARTY.ice = (PARTY.ice || 0) + 1;
        sfx.buy();
      }
      rerender();
      break;
    case 'laylow': {
      const lc = 60 * G.wd.heat * G.wd.level;
      if (G.wd.heat && PARTY.creds >= lc) {
        PARTY.creds -= lc;
        G.wd.heat = 0;
        G.wd.heatT = 0;
        G.ents = G.ents.filter(e => e.kind !== 'cop');
        sfx.buy();
      }
      rerender();
      break;
    }
    case 'newblock': {
      const rep = G.wd.rep,
        ck = G.wd.copKills,
        fac = G.wd.fac;
      const bm = G.wd.bm;
      G.wd = newWorld(G.wd.level + 1);
      // Sable's offer follows you, a little cheaper for every block you walked past it
      if (bm) {
        bm.skips = (bm.skips || 0) + 1;
        G.wd.bm = bm;
      }
      G.wd.rep = rep;
      G.wd.fac = fac || {};
      G.wd.copKills = ck;
      G.stock = [
        randItem(G.wd.level, false),
        randItem(G.wd.level, false),
        randItem(G.wd.level, true),
        randItem(G.wd.level - 1, false)
      ];
      enterStreet(180);
      keep = false;
      break;
    }
    case 'worldpick':
      setMode('worldpick');
      keep = false;
      break;
    case 'seedgo':
    case 'seedgo2': {
      const inp = document.getElementById('seedIn'),
        ch = parseSeed(inp && inp.value);
      if (!ch) {
        G.seedErr = true;
        renderOv();
        break;
      }
      G.seedErr = false;
      G.seedPre = '';
      if (ch.mode === 'arena') {
        G.arenaSeed = ch.code;
        startArena(a === 'seedgo2');
      } else startWorld(a === 'seedgo2', ch);
      keep = false;
      break;
    }
    case 'copyseed': {
      const t = seedShareLine(),
        btn = document.getElementById('seedCopy');
      try {
        navigator.clipboard.writeText(t).then(
          () => btn && (btn.textContent = 'Copied'),
          () => btn && (btn.textContent = 'Select the text to copy')
        );
      } catch (err) {
        if (btn) btn.textContent = 'Select the text to copy';
      }
      break;
    }
    case 'world1':
      startWorld(false);
      keep = false;
      break;
    case 'world2':
      startWorld(true);
      keep = false;
      break;
    case 'worldcont': {
      const sw = store.load('cs_world');
      if (sw) {
        loadWorld(sw);
        enterStreet((sw.wd && sw.wd.lastX) || 180);
      }
      keep = false;
      break;
    }
    case 'wake':
      for (const q of PL) {
        q.out = false;
        q.lives = 3;
        q.hp = q.maxHp;
        q.mp = q.maxMp;
        q.dead = false;
        setS(q, 'idle');
      }
      enterStreet(110);
      keep = false;
      break;
    case 'nextjob':
      if (pendingChoice()) renderOv();
      else briefing(G.stage + 1, true);
      break;
    case 'choose':
      makeChoice(arg, parts[2]);
      renderOv();
      break;
    case 'sheet':
      G.ret = G.mode === 'npc' ? 'den' : G.mode === 'pause' ? G.ret : G.mode;
      if (G.mode === 'npc') G.retNpc = G.npc;
      setMode('sheet');
      keep = false;
      break;
    case 'who':
      G.sheetIdx = +arg;
      renderOv();
      break;
    case 'join2':
      joinRunner2();
      renderOv();
      break;
    case 'drop2':
      dropRunner2();
      G.sheetIdx = 0;
      renderOv();
      break;
    case 'quit':
      if (G.world) saveWorld();
      musicPlay('title');
      attract();
      setMode('title');
      break;
    case 'retry':
      for (const q of PL) {
        q.lives = maxLives();
        q.ammo = Math.max(q.ammo, 12);
        refresh(q);
        q.hp = q.maxHp;
        q.mp = q.maxMp;
      }
      PARTY.creds = Math.floor(PARTY.creds / 2);
      PARTY.contract = null;
      briefing(G.stage, false);
      break;
    case 'stab':
      G.sheetTab = arg;
      renderOv();
      keep = false;
      break;
    case 'tree':
      G.tree = arg;
      renderOv();
      break;
    case 'skill':
      if (canLearn(p, arg)) {
        p.sk[arg] = 1;
        p.spts--;
        refresh(p);
        if (SKILLS[arg].row === 3) feat('cap');
        if (Object.keys(TREES).every(t => treePts(p, t) > 0)) feat('jack');
        sfx.level();
        buzz([15, 30, 15]);
        G.justLearned = arg;
        rerender();
        setTimeout(() => {
          G.justLearned = null;
        }, 700);
      } else sfx.click();
      break;
    case 'attr':
      if (p.pts > 0 && p.attr[arg] < 10) {
        p.attr[arg]++;
        p.pts--;
        const oh = p.maxHp,
          om = p.maxMp;
        refresh(p);
        p.hp += Math.max(0, p.maxHp - oh);
        p.mp += Math.max(0, p.maxMp - om);
        sfx.buy();
      }
      rerender();
      break;
    case 'equip': {
      const i = findBag(arg);
      if (i < 0) break;
      const it = PARTY.bag[i];
      const cur = p.eq[it.slot];
      PARTY.bag.splice(i, 1);
      if (cur) PARTY.bag.push(cur);
      p.eq[it.slot] = it;
      refresh(p);
      sfx.click();
      rerender();
      break;
    }
    case 'unequip': {
      const it = p.eq[arg];
      if (it && PARTY.bag.length < BAG_MAX) {
        PARTY.bag.push(it);
        p.eq[arg] = null;
        refresh(p);
        sfx.click();
      }
      rerender();
      break;
    }
    case 'stash': {
      const i = findBag(arg);
      PARTY.stash = PARTY.stash || [];
      if (i >= 0 && PARTY.stash.length < STASH_MAX) {
        const it = PARTY.bag.splice(i, 1)[0];
        it.fresh = false;
        PARTY.stash.push(it);
        sfx.click();
      }
      rerender();
      break;
    }
    case 'unstash': {
      const st = PARTY.stash || [],
        i = st.findIndex(x => x.uid === arg);
      if (i >= 0 && PARTY.bag.length < BAG_MAX) {
        PARTY.bag.push(st.splice(i, 1)[0]);
        sfx.click();
      }
      rerender();
      break;
    }
    case 'haggle':
      tryHaggle();
      rerender();
      break;
    case 'bmbuy':
      bmBuy();
      rerender();
      break;
    case 'locker':
      setMode('locker');
      break;
    case 'lockerback':
      openNPC('ratchet');
      break;
    case 'lock': {
      // locked items can't be sold, dropped or scrapped, by a click or by "Sell all"
      const i = findBag(arg);
      if (i >= 0) {
        PARTY.bag[i].lock = !PARTY.bag[i].lock;
        sfx.click();
      }
      rerender();
      break;
    }
    case 'drop': {
      const i = findBag(arg);
      if (i >= 0 && !PARTY.bag[i].lock) PARTY.bag.splice(i, 1);
      rerender();
      break;
    }
    case 'sell': {
      // sell:<uid>:<store kind>. The fence pays full rate; other counters pay less (storeRate)
      const i = findBag(arg);
      if (i >= 0 && !PARTY.bag[i].lock) {
        PARTY.creds += sellPrice(PARTY.bag[i], parts[2]);
        PARTY.bag.splice(i, 1);
        bump('sold');
        sfx.coin();
      }
      rerender();
      break;
    }
    case 'sellcommon': {
      // clear out every Street-grade (common) item in one go
      let got = 0,
        n = 0;
      PARTY.bag = PARTY.bag.filter(it => {
        if (it.rar !== 0 || it.lock) return true;
        got += sellPrice(it, arg);
        n++;
        return false;
      });
      if (n) {
        PARTY.creds += got;
        bump('sold', n);
        sfx.coin();
      }
      rerender();
      break;
    }
    case 'spell':
      p.spell = +arg;
      rerender();
      break;
    case 'buy':
      {
        const mc = Math.round(30 * buyMul());
        if (arg === 'med' && PARTY.creds >= mc && PARTY.med < 5) {
          PARTY.creds -= mc;
          PARTY.med++;
          sfx.buy();
        }
      }
      if (arg === 'reset') {
        const c = respecCost(p);
        if (respecRefund(p) > 0 && PARTY.creds >= c) {
          PARTY.creds -= c;
          respec(p);
          feat('respec');
          sfx.buy();
        }
      }
      if (arg === 'ammo') {
        const c = Math.round(30 * (G.coop ? 2 : 1) * buyMul());
        if (PARTY.creds >= c) {
          PARTY.creds -= c;
          for (const q of PL) q.ammo += 16;
          sfx.buy();
        }
      }
      rerender();
      break;
    case 'salvage': {
      const i = findBag(arg);
      if (i >= 0 && !PARTY.bag[i].lock && salvageParts(PARTY.bag[i])) {
        const n = salvageParts(PARTY.bag[i]);
        PARTY.parts = (PARTY.parts || 0) + n;
        PARTY.bag.splice(i, 1);
        bump('scrapped');
        sfx.clank();
      }
      rerender();
      break;
    }
    case 'reroll':
    case 'upgrade': {
      const it = p.eq[arg],
        c = a === 'reroll' ? REROLL : it && upgradeCost(it);
      if (
        it &&
        (PARTY.parts || 0) >= c.parts &&
        PARTY.creds >= c.creds &&
        (a === 'reroll' ? rerollItem(it) : upgradeItem(it))
      ) {
        PARTY.parts -= c.parts;
        PARTY.creds -= c.creds;
        refresh(p);
        bump('crafted');
        sfx.buy();
      }
      rerender();
      break;
    }
    case 'gmod': {
      const g = p.eq.gun,
        c = Math.round(GMODS[arg].price * buyMul());
      if (g && g.gmod !== arg && PARTY.creds >= c) {
        PARTY.creds -= c;
        g.gmod = arg;
        bump('gmods');
        sfx.buy();
      }
      rerender();
      break;
    }
    case 'cyber': {
      const l = p.cy[arg] || 0,
        c = Math.round(CYBER[arg].cost(l) * buyMul());
      if (l < cyMax(arg) && PARTY.creds >= c) {
        p.cy[arg] = l;
        if (CYBER[arg].rare) feat('rare');
        PARTY.creds -= c;
        p.cy[arg]++;
        refresh(p);
        sfx.buy();
      }
      rerender();
      break;
    }
    case 'fbuy': {
      const i = G.stock.findIndex(x => x.uid === arg);
      if (i >= 0 && PARTY.creds >= stockPrice(G.stock[i]) && PARTY.bag.length < BAG_MAX) {
        PARTY.creds -= stockPrice(G.stock[i]);
        PARTY.bag.push(gotItem(G.stock[i]));
        G.stock.splice(i, 1);
        sfx.loot();
      }
      rerender();
      break;
    }
    case 'hire': {
      const A = ALLIES[arg],
        ac = A ? Math.round(A.cost * buyMul()) : 0;
      if (A && PARTY.creds >= ac && !(PARTY.ally && PARTY.ally.type === arg)) {
        PARTY.creds -= ac;
        PARTY.ally = null;
        spawnAlly(arg);
        sfx.buy();
      }
      rerender();
      break;
    }
    case 'dismiss':
      PARTY.ally = null;
      G.ents = G.ents.filter(e => e.kind !== 'ally');
      rerender();
      break;
    case 'learn': {
      const s = SPELLS[arg];
      if (!p.spells.includes(arg) && p.D.a.mag >= s.req && PARTY.creds >= s.price) {
        PARTY.creds -= s.price;
        p.spells.push(arg);
        if (s.rare) feat('rare');
        sfx.level();
      }
      rerender();
      break;
    }
  }
  if (keep) {
    const c2 = ov.querySelector('.card');
    if (c2) c2.scrollTop = top;
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && (G.mode === 'play' || G.mode === 'den')) togglePause();
});
