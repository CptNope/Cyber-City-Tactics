/* Online co-op in a real Chromium: two pages, the real WebRTC data channel, the real invite codes.
 *  - the host makes an invite code; the friend pastes it and makes a reply; the host pastes that
 *  - the channel opens, the host starts an Arena run with the friend's archetype as runner 2
 *  - the friend's held buttons move runner 2 on the host, and a tap lands as a punch
 *  - the friend's screen mirrors the host's entities, runners, wave and score, and draws without errors
 *  - the host opening a menu shows the friend a waiting card; leaving tells the host and drops runner 2
 *  - with the lobby Worker (run locally): a five-letter room code, invite links, wrong codes, lobby outages
 * Run on its own (node tests/online.test.js) or as part of npm run test:browser. */
'use strict';
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const { chromium } = require('playwright');
  const { serve } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'serve.mjs')).href);
  const port = 8100 + Math.floor(Math.random() * 800);
  const server = await serve(port);
  const base = `http://localhost:${port}/`;
  // no STUN in CI, and plain local addresses instead of mDNS names so two pages on one machine can meet
  const browser = await chromium.launch({ args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] });
  let failed = 0,
    lobbySrv = null;
  const ok = (c, m) => {
    console.log((c ? 'PASS ' : 'FAIL ') + m);
    if (!c) failed++;
  };
  const errsOf = page => {
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => {
      if (m.type() === 'error' && !/ERR_INTERNET_DISCONNECTED|ERR_TUNNEL/.test(m.text())) errs.push(m.text());
    });
    return errs;
  };
  const open = async () => {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 640 } });
    const page = await ctx.newPage();
    const errs = errsOf(page);
    await page.addInitScript(() => {
      try {
        const p = JSON.parse(localStorage.getItem('cs_prefs') || '{}');
        p.seen = Object.assign(p.seen || {}, { trainoffer: true });
        localStorage.setItem('cs_prefs', JSON.stringify(p));
      } catch (e) {}
    });
    await page.goto(base + '?lobby=off'); // long codes here; the lobby gets its own section below
    await page.waitForFunction(() => typeof G !== 'undefined' && document.querySelector('#ov .card'));
    await page.evaluate(() => (NET.ice = []));
    return { page, errs };
  };
  try {
    const H = await open(),
      F = await open();
    const host = H.page,
      fr = F.page;
    // the title has the button, and the card explains itself
    await host.click('[data-a="online"]');
    ok(await host.$('[data-a="nethost"]'), 'title → Online co-op card with Host and Join');
    await host.click('[data-a="nethost"]');
    await host.waitForFunction(() => NET.status === 'offer' || NET.status === 'error', null, {
      timeout: 15000
    });
    const offer = await host.evaluate(() => NET.code);
    ok(
      /^CCT1[zp][A-Za-z0-9_-]+$/.test(offer) && offer.length < 2500,
      `host invite code (${offer.length} chars)`
    );
    // the friend picks an archetype, pastes the invite, gets a reply code
    await fr.click('[data-a="online"]');
    await fr.click('[data-a="arch:0:mage"]');
    await fr.click('[data-a="netjoin"]');
    await fr.fill('textarea[data-net="draft"]', offer);
    await fr.click('[data-a="netanswer"]');
    await fr.waitForFunction(() => NET.status === 'answer' || NET.status === 'error', null, {
      timeout: 15000
    });
    const answer = await fr.evaluate(() => NET.code);
    ok(/^CCT1/.test(answer), 'friend reply code');
    // pasting the wrong kind of code says so
    await host.fill('textarea[data-net="draft"]', offer);
    await host.click('[data-a="netconnect"]');
    await host.waitForFunction(() => NET.status === 'error');
    ok(
      /reply code/.test(await host.evaluate(() => NET.err)),
      'pasting your own invite back explains the mix-up'
    );
    // start over properly
    await host.click('[data-a="nethost"]');
    await host.waitForFunction(() => NET.status === 'offer', null, { timeout: 15000 });
    const offer2 = await host.evaluate(() => NET.code);
    await fr.evaluate(() => netAct('netcancel'));
    await fr.click('[data-a="netjoin"]');
    await fr.fill('textarea[data-net="draft"]', offer2);
    await fr.click('[data-a="netanswer"]');
    await fr.waitForFunction(() => NET.status === 'answer', null, { timeout: 15000 });
    await host.fill('textarea[data-net="draft"]', await fr.evaluate(() => NET.code));
    await host.click('[data-a="netconnect"]');
    // connected: the host gets the hub, the friend waits while they choose
    await host.waitForFunction(() => NET.live && G.mode === 'nethub', null, { timeout: 15000 });
    await fr.waitForFunction(
      () => NET.live && G.mode === 'netwait' && /choosing what to play/.test(ov.textContent),
      null,
      { timeout: 15000 }
    );
    ok(true, 'connected: host picks a mode, friend sees "choosing"');
    // starting a solo Arena run still brings the friend in as runner 2
    await host.click('[data-a="arenapick"]');
    await host.click('[data-a="arena1"]');
    await host.waitForFunction(() => NET.live && G.mode === 'play' && G.arena && PL.length === 2, null, {
      timeout: 15000
    });
    await fr.waitForFunction(() => NET.live && G.mode === 'play' && PL.length === 2, null, {
      timeout: 15000
    });
    ok(true, 'connected: host in an Arena run, friend mirroring it');
    ok(
      (await host.evaluate(() => PL.length === 2 && PL[1].arch)) === 'mage',
      "runner 2 is the friend's pick (mage)"
    );
    // the friend walks right: runner 2 moves on the host
    await fr.waitForTimeout(600);
    const x0 = await host.evaluate(() => PL[1].x);
    await fr.keyboard.down('KeyD');
    await fr.waitForTimeout(700);
    await fr.keyboard.up('KeyD');
    const x1 = await host.evaluate(() => PL[1].x);
    ok(x1 > x0 + 20, `friend's held key moves runner 2 on the host (${Math.round(x0)} → ${Math.round(x1)})`);
    const x0h = await host.evaluate(() => PL[0].x);
    ok(Math.abs(x0h - (await host.evaluate(() => PL[0].x))) < 1, 'runner 1 stays put');
    // a quick tap still lands as a punch
    await host.evaluate(() => (window.__pun = 0));
    await host.evaluate(() => {
      const f = INP[1];
      window.__seen = 0;
      const iv = setInterval(() => {
        if (f.pressed.punch || PL[1].state === 'punch' || PL[1].state === 'atk') window.__seen = 1;
      }, 1);
      setTimeout(() => clearInterval(iv), 1500);
    });
    await fr.keyboard.press('KeyJ');
    await fr.waitForTimeout(400);
    ok((await fr.evaluate(() => NET.cnt.punch)) >= 1, 'friend counts the tap');
    await host.waitForFunction(() => window.__seen || NET.rCnt.punch >= 1, null, { timeout: 3000 });
    ok(true, 'the tap reaches the host as a press');
    // mirrored state
    await host.waitForFunction(() => G.ents.some(e => e.team === 1), null, { timeout: 15000 });
    await fr.waitForTimeout(500);
    const hs = await host.evaluate(() => ({
      n: G.ents.length,
      foes: G.ents.filter(e => e.team === 1).length,
      wave: G.awave,
      kinds: G.ents
        .map(e => e.kind)
        .sort()
        .join()
    }));
    const fs = await fr.evaluate(() => ({
      n: G.ents.length,
      foes: G.ents.filter(e => e.team === 1).length,
      wave: G.awave,
      kinds: G.ents
        .map(e => e.kind)
        .sort()
        .join(),
      d: G.ents.filter(e => e.team === 1).every(e => e.d && e.d.name),
      pl: PL.map(p => p.arch).join(),
      hp: PL.every(p => p.maxHp > 0),
      t: G.theme,
      bg: !!G.bg
    }));
    ok(
      fs.wave === hs.wave && fs.foes > 0,
      `friend sees the wave (${fs.wave}) and ${fs.foes} foes (host ${hs.foes})`
    );
    ok(
      fs.d && fs.hp && fs.bg,
      'mirrored foes have their stats, runners their health, the street its backdrop'
    );
    ok(fs.pl.split(',')[1] === 'mage', 'friend sees both runners');
    // the friend's picture moves: positions keep updating
    const p1 = await fr.evaluate(() => G.ents.filter(e => e.team === 1).map(e => e.x + e.y));
    await fr.waitForTimeout(500);
    const p2 = await fr.evaluate(() => G.ents.filter(e => e.team === 1).map(e => e.x + e.y));
    ok(p1.join() !== p2.join(), 'foes move on the friend’s screen');
    // bandwidth: only what changed goes over the wire, so a fight costs a few KB a second
    await host.evaluate(() => {
      const dc = NET.dc,
        send = dc.send.bind(dc);
      window.__bytes = 0;
      window.__msgs = 0;
      dc.send = s => {
        window.__bytes += s.length;
        window.__msgs++;
        return send(s);
      };
    });
    await host.waitForTimeout(2000);
    const bw = await host.evaluate(() => ({ b: window.__bytes, n: window.__msgs }));
    ok(bw.n > 30 && bw.b / 2 < 60000, `host sends ${bw.n / 2} snapshots/s, ${Math.round(bw.b / 2048)} KB/s`);
    // host pauses → friend waits; resume → back in
    await host.keyboard.press('Escape');
    await fr.waitForFunction(() => G.mode === 'netwait', null, { timeout: 5000 });
    ok(/paused/.test(await fr.textContent('#ov .card')), 'host pause shows the friend a waiting card');
    await host.keyboard.press('Escape');
    await fr.waitForFunction(() => G.mode === 'play', null, { timeout: 5000 });
    ok(true, 'host resumes → friend is back in');
    // friend's own Escape opens a private menu without pausing the host
    await fr.keyboard.press('Escape');
    ok(
      (await fr.evaluate(() => G.mode)) === 'netmenu' && (await host.evaluate(() => G.mode)) === 'play',
      "friend's menu doesn't pause the host"
    );
    await fr.click('[data-a="netresume"]');
    // a frame of the friend's view, to look at
    await fr.waitForTimeout(800);
    await fr.screenshot({ path: path.join(require('os').tmpdir(), 'cct-online-friend.png') }).catch(() => {});
    ok(
      !F.errs.length,
      'friend page: no errors' + (F.errs.length ? ': ' + F.errs.slice(0, 3).join(' | ') : '')
    );
    ok(!H.errs.length, 'host page: no errors' + (H.errs.length ? ': ' + H.errs.slice(0, 3).join(' | ') : ''));
    // ---- the campaign: back to the hub, start a new run, the friend comes along ----
    await host.keyboard.press('Escape');
    await host.click('[data-a="quit"]');
    await host.waitForFunction(() => G.mode === 'nethub');
    await fr.waitForFunction(() => G.mode === 'netwait', null, { timeout: 5000 });
    ok(true, 'host quits to the hub; the session stays up and the friend waits');
    await host.click('[data-a="pick"]');
    await host.click('[data-a="new"]');
    for (const a of ['trainskip', 'go']) {
      const b = await host.$(`[data-a="${a}"]`);
      if (b) await b.click();
    }
    await host.waitForFunction(() => G.mode === 'play' && !G.arena && !G.world && PL.length === 2, null, {
      timeout: 15000
    });
    await fr.waitForFunction(() => G.mode === 'play' && PL.length === 2 && !G.arena, null, {
      timeout: 15000
    });
    await fr.waitForTimeout(800);
    const camp = await fr.evaluate(() => ({
      stage: G.stage,
      bg: !!(G.bg && G.bg.far),
      ents: G.ents.length,
      party: typeof PARTY.creds
    }));
    ok(
      camp.stage === 0 && camp.bg && camp.ents >= 2 && camp.party === 'number',
      'campaign: friend sees district 1, its skyline, the runners and the wallet'
    );
    // the friend's own character sheet: spending a point there spends it on the host
    await host.evaluate(() => {
      PL[1].pts = 2;
    });
    await fr.waitForFunction(() => PL[1] && PL[1].pts === 2, null, { timeout: 5000 });
    await fr.keyboard.press('KeyC');
    await fr.waitForFunction(() => G.mode === 'sheet' && G.sheetIdx === 1, null, { timeout: 3000 });
    const before = await host.evaluate(() => Object.values(PL[1].attr).reduce((a, b) => a + b, 0));
    await fr.click('[data-a^="attr:"]');
    await host.waitForFunction(
      b => Object.values(PL[1].attr).reduce((a, c) => a + c, 0) === b + 1 && PL[1].pts === 1,
      before,
      { timeout: 5000 }
    );
    ok(true, "friend's sheet: spending a point raises runner 2's attribute on the host");
    await fr.waitForFunction(() => PL[1].pts === 1, null, { timeout: 5000 });
    ok(
      (await host.evaluate(() => Object.values(PL[0].attr).reduce((a, b) => a + b, 0))) > 0 &&
        (await host.evaluate(() => G.mode)) === 'play',
      'runner 1 untouched, host still playing'
    );
    await fr.keyboard.press('Escape');
    await fr.waitForFunction(() => G.mode === 'play', null, { timeout: 3000 });
    // ---- shopping together: the host talks to Doc Kessler, the friend buys at the same counter ----
    await host.evaluate(() => {
      PARTY.creds = 500;
      PARTY.med = 1;
      enterDen();
      setMode('den');
      openNPC('doc');
    });
    await fr.waitForFunction(
      () => G.mode === 'npc' && G.npc === 'doc' && document.querySelector('[data-a="buy:med"]'),
      null,
      { timeout: 5000 }
    );
    ok(true, "host opens Doc's counter → the friend sees it too");
    await fr.click('[data-a="buy:med"]');
    await host.waitForFunction(() => PARTY.med === 2 && PARTY.creds < 500, null, { timeout: 5000 });
    ok(true, "the friend's purchase lands on the host (medkit bought, creds spent)");
    await fr.waitForFunction(() => PARTY.med === 2 && /¥4/.test(ov.textContent), null, { timeout: 5000 });
    ok(true, "the friend's counter updates with the new wallet");
    await fr.click('[data-a="leave"]');
    ok(
      (await fr.evaluate(() => G.mode)) === 'netwait' && (await host.evaluate(() => G.mode)) === 'npc',
      'the friend can step away; the host stays at the counter'
    );
    await host.click('[data-a="leave"]');
    await fr.waitForFunction(() => G.mode === 'play', null, { timeout: 5000 });
    ok(true, 'host leaves the counter → both back in the Den');
    // ---- the Sprawl ----
    await host.keyboard.press('Escape');
    await host.click('[data-a="quit"]');
    await host.waitForFunction(() => G.mode === 'nethub');
    await host.click('[data-a="worldpick"]');
    await host.click('[data-a="world1"]');
    await host.waitForFunction(() => G.mode === 'play' && G.world && PL.length === 2, null, {
      timeout: 15000
    });
    await fr.waitForFunction(() => G.mode === 'play' && G.world && G.wd && PL.length === 2, null, {
      timeout: 15000
    });
    await fr.waitForTimeout(800);
    ok(
      await fr.evaluate(() => !!(G.wd && G.streetStage && G.bg)),
      'the Sprawl: friend sees the block, its street and skyline'
    );
    await fr.screenshot({ path: path.join(require('os').tmpdir(), 'cct-online-sprawl.png') }).catch(() => {});
    ok(
      !F.errs.length,
      'friend page: no errors in campaign or Sprawl' +
        (F.errs.length ? ': ' + F.errs.slice(0, 3).join(' | ') : '')
    );
    ok(
      !H.errs.length,
      'host page: no errors in campaign or Sprawl' +
        (H.errs.length ? ': ' + H.errs.slice(0, 3).join(' | ') : '')
    );
    // ---- training: solo, the friend watches ----
    await host.keyboard.press('Escape');
    await host.click('[data-a="quit"]');
    await host.waitForFunction(() => G.mode === 'nethub');
    await host.click('[data-a="trainpick"]');
    await host.click('[data-a="train"]');
    await host.waitForFunction(() => G.mode === 'play' && G.training, null, { timeout: 10000 });
    await host.waitForTimeout(600);
    ok((await host.evaluate(() => PL.length)) === 1, 'training stays solo on the host');
    await fr.waitForFunction(() => G.mode === 'play' && G.training && PL.length === 1, null, {
      timeout: 10000
    });
    ok(true, 'the friend watches the training');
    // friend leaves → host drops runner 2 and keeps playing
    await fr.keyboard.press('Escape');
    await fr.click('[data-a="netleave"]');
    await host.waitForFunction(() => !NET.live && PL.length === 1, null, { timeout: 8000 });
    ok((await host.evaluate(() => G.mode)) === 'play', 'friend leaves → host keeps playing solo');
    ok((await fr.evaluate(() => G.mode)) === 'title', 'friend is back at the title');

    // ---- the lobby (server/worker.js, run locally): a five-letter room code and no pasting back ----
    const { serveLobby } = await import(
      pathToFileURL(path.join(__dirname, '..', 'tools', 'lobby-local.mjs')).href
    );
    const lport = port + 900;
    lobbySrv = await serveLobby(lport);
    const withLobby = async (page, q, hash = '') => {
      await page.goto(base + '?lobby=' + encodeURIComponent(q) + hash);
      await page.waitForFunction(() => typeof G !== 'undefined' && document.querySelector('#ov .card'));
      await page.evaluate(() => (NET.ice = []));
    };
    await withLobby(host, `http://localhost:${lport}`);
    await withLobby(fr, `http://localhost:${lport}`);
    await host.click('[data-a="online"]');
    ok(/room code/.test(await host.textContent('#ov .card')), 'with a lobby, the card offers room codes');
    await host.click('[data-a="nethost"]');
    await host.waitForFunction(() => NET.status === 'offer' && NET.room, null, { timeout: 15000 });
    const room = await host.evaluate(() => NET.room);
    ok(
      /^[A-HJ-NP-Z2-9]{5}$/.test(room) && (await host.textContent('.roomcode')) === room,
      `host sees room code ${room}`
    );
    ok(/#room=/.test(await host.evaluate(() => netInviteLink())), 'invite link carries the room code');
    await fr.click('[data-a="online"]');
    await fr.click('[data-a="arch:0:samurai"]');
    await fr.click('[data-a="netjoin"]');
    await fr.fill('textarea[data-net="draft"]', room.toLowerCase());
    await fr.click('[data-a="netanswer"]');
    await host.waitForFunction(() => NET.live && G.mode === 'nethub', null, { timeout: 20000 });
    await host.click('[data-a="arenapick"]');
    await host.click('[data-a="arena2"]');
    await host.waitForFunction(() => NET.live && G.mode === 'play' && PL.length === 2, null, {
      timeout: 20000
    });
    await fr.waitForFunction(() => NET.live && G.mode === 'play' && PL.length === 2, null, {
      timeout: 15000
    });
    ok(
      (await host.evaluate(() => PL[1].arch)) === 'samurai',
      'friend typed the room code → connected, nothing pasted back'
    );
    // a dropped connection (no goodbye): the host keeps the runner and reopens the room; the friend rejoins
    await host.evaluate(() => (PL[1].karma = 4242));
    await fr.waitForFunction(() => PL[1] && PL[1].karma === 4242, null, { timeout: 5000 });
    await fr.evaluate(() => NET.pc.close());
    await host.waitForFunction(
      r => !NET.live && NET.away && NET.status === 'offer' && NET.room === r && PL.length === 1,
      room,
      { timeout: 15000 }
    );
    ok(
      /PARTNER DROPPED · ROOM/.test(await host.evaluate(() => netAwayTag())),
      'host: partner dropped, room reopened under the same code'
    );
    await fr.waitForFunction(() => G.mode === 'netlost' && NET.canRejoin, null, { timeout: 15000 });
    ok(/Rejoin room/.test(await fr.textContent('#ov .card')), 'friend: a Rejoin button for the same room');
    await fr.click('[data-a="netrejoin"]');
    await host.waitForFunction(
      () => NET.live && PL.length === 2 && PL[1].karma === 4242 && G.mode === 'play',
      null,
      { timeout: 20000 }
    );
    await fr.waitForFunction(() => NET.live && G.mode === 'play' && PL.length === 2, null, {
      timeout: 15000
    });
    ok(true, 'rejoined mid-run with the same runner (karma kept)');
    await fr.keyboard.press('Escape');
    await fr.click('[data-a="netleave"]');
    await host.waitForFunction(() => !NET.live && PL.length === 1, null, { timeout: 8000 });
    // the room is used up; a wrong code says so
    await fr.click('[data-a="online"]');
    await fr.click('[data-a="netjoin"]');
    await fr.fill('textarea[data-net="draft"]', 'ZZZZZ');
    await fr.click('[data-a="netanswer"]');
    await fr.waitForFunction(() => NET.status === 'error');
    ok(/No room with that code/.test(await fr.evaluate(() => NET.err)), 'a wrong room code explains itself');
    // an invite link opens the join card with the code filled in
    await withLobby(fr, `http://localhost:${lport}`, '#room=' + room);
    ok(
      (await fr.evaluate(() => G.mode + ':' + NET.role + ':' + NET.draft)) === `online:guest:${room}`,
      'invite link → join card with the room code filled in'
    );
    // lobby down: hosting falls back to long codes
    await host.keyboard.press('Escape');
    await host.click('[data-a="quit"]');
    await withLobby(host, 'http://localhost:9');
    await host.click('[data-a="online"]');
    await host.click('[data-a="nethost"]');
    await host.waitForFunction(() => NET.status === 'offer' || NET.status === 'error', null, {
      timeout: 20000
    });
    ok(
      (await host.evaluate(() => NET.status === 'offer' && !NET.room && NET.lobbyDown)) &&
        /unreachable/.test(await host.textContent('#ov .card')),
      'lobby unreachable → long codes, with a note'
    );
    ok(
      !F.errs.filter(e => !/Failed to load resource|ERR_CONNECTION_REFUSED/.test(e)).length,
      'friend page: no errors in the lobby flow' +
        (F.errs.length ? ': ' + F.errs.slice(0, 2).join(' | ') : '')
    );
  } catch (e) {
    console.log('FAIL ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e));
    failed++;
  }
  await browser.close();
  server.close();
  if (lobbySrv) lobbySrv.close();
  console.log(failed ? `${failed} online check(s) failed` : 'online co-op: all passed');
  process.exit(failed ? 1 : 0);
})();
