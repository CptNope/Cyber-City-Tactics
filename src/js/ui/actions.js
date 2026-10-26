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
  let keep = true;
  const p = PL[G.sheetIdx] || PL[0];
  const rerender = () => {
    renderOv();
    if (G.world) saveWorld();
    else if (G.mode === 'npc' || G.ret === 'den') saveGame('den');
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
    case 'arena1':
      startArena(false);
      keep = false;
      break;
    case 'arena2':
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
      newRun(false);
      keep = false;
      break;
    case 'new2':
      newRun(true);
      keep = false;
      break;
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
        ck = G.wd.copKills;
      G.wd = newWorld(G.wd.level + 1);
      G.wd.rep = rep;
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
      briefing(G.stage + 1, true);
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
      if (it && PARTY.bag.length < 12) {
        PARTY.bag.push(it);
        p.eq[arg] = null;
        refresh(p);
        sfx.click();
      }
      rerender();
      break;
    }
    case 'drop': {
      const i = findBag(arg);
      if (i >= 0) PARTY.bag.splice(i, 1);
      rerender();
      break;
    }
    case 'sell': {
      const i = findBag(arg);
      if (i >= 0) {
        PARTY.creds += Math.round(PARTY.bag[i].price * sellRate());
        PARTY.bag.splice(i, 1);
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
    case 'cyber': {
      const l = p.cy[arg],
        c = Math.round(CYBER[arg].cost(l) * buyMul());
      if (l < 3 && PARTY.creds >= c) {
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
      if (i >= 0 && PARTY.creds >= G.stock[i].price && PARTY.bag.length < 12) {
        PARTY.creds -= G.stock[i].price;
        PARTY.bag.push(G.stock[i]);
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
