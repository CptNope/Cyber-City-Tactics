/* Browser checks with Playwright (npm i -D playwright, then npm run test:browser).
 * Serves the repo locally and checks, in a real Chromium:
 *  - the modular page and the single-file bundle both boot with no errors and can start a run
 *  - the manifest is valid and every icon, shortcut icon and screenshot it lists exists
 *  - app shortcuts (?go=codex) open the right screen
 *  - the service worker precaches every file and the game loads with the network switched off
 *  - the phone layout boots too
 *  - controllers: a simulated Xbox pad drives menus, play, pausing, tabs, hacking, rumble and hot-unplugging
 *  - updates: after a new build, the "update ready" bar appears and switching reloads into the new version
 */
'use strict';
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const { chromium } = require('playwright');
  const { serve } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'serve.mjs')).href);
  const port = 8100 + Math.floor(Math.random() * 800);
  const server = await serve(port);
  const base = `http://localhost:${port}/`;
  const browser = await chromium.launch();
  let failed = 0;
  const ok = (c, m) => {
    console.log((c ? 'PASS ' : 'FAIL ') + m);
    if (!c) failed++;
  };
  const watch = page => {
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => {
      if (
        m.type() === 'error' &&
        !/fonts\.(googleapis|gstatic)|ERR_INTERNET_DISCONNECTED|ERR_TUNNEL/.test(m.text())
      )
        errs.push(m.text());
    });
    return errs;
  };
  const boot = async (page, url) => {
    await page.goto(url);
    await page.waitForFunction(() => typeof G !== 'undefined' || document.querySelector('#ov .card'), null, {
      timeout: 10000
    });
    await page.waitForTimeout(400);
  };
  const startRun = async page => {
    await page.click('[data-a="pick"]');
    await page.click('[data-a="new"]');
    // a first run offers Juno's training once; skip it (the offer itself is checked in shop.test.js)
    const skip = await page.$('[data-a="trainskip"]');
    if (skip) await skip.click();
    const go = await page.$('[data-a="go"]');
    if (go) await go.click();
    await page.waitForTimeout(1500);
  };

  try {
    // 1. Modular page
    {
      const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
      const errs = watch(page);
      await boot(page, base);
      ok(
        (await page.getAttribute('#ov h1', 'aria-label')) === 'Cyber City Tactics',
        'modular page boots to the title screen'
      );
      await startRun(page);
      ok(
        (await page.evaluate(() => G.mode)) === 'brief' || (await page.evaluate(() => G.mode)) === 'play',
        'a run starts'
      );
      ok(errs.length === 0, 'no errors on the modular page' + (errs.length ? ': ' + errs.join(' | ') : ''));
      await page.close();
    }
    // 2. Single-file bundle
    {
      const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
      const errs = watch(page);
      await page.goto(base + 'dist/cyber-city-tactics.html');
      await page.waitForSelector('#ov h1');
      ok(
        (await page.getAttribute('#ov h1', 'aria-label')) === 'Cyber City Tactics',
        'bundle boots to the title screen'
      );
      ok(await page.evaluate(() => typeof G === 'undefined'), 'bundle keeps game globals private');
      await startRun(page);
      ok(errs.length === 0, 'no errors in the bundle' + (errs.length ? ': ' + errs.join(' | ') : ''));
      await page.close();
    }
    // 3. Manifest and its files
    {
      const page = await browser.newPage();
      await page.goto(base);
      const res = await page.evaluate(async () => {
        const m = await (await fetch('manifest.webmanifest')).json();
        const files = [
          ...m.icons.map(i => i.src),
          ...m.shortcuts.flatMap(s => s.icons.map(i => i.src)),
          ...m.screenshots.map(s => s.src)
        ];
        const st = await Promise.all(files.map(f => fetch(f).then(r => r.status)));
        return {
          name: m.name,
          maskable: m.icons.some(i => i.purpose === 'maskable'),
          missing: files.filter((f, i) => st[i] !== 200)
        };
      });
      ok(res.name === 'Cyber City Tactics' && res.maskable, 'manifest has the name and a maskable icon');
      ok(
        res.missing.length === 0,
        'every manifest file exists' + (res.missing.length ? ': ' + res.missing.join(', ') : '')
      );
      await page.goto(base + '?go=codex');
      await page.waitForTimeout(500);
      ok((await page.evaluate(() => G.mode)) === 'codex', 'shortcut ?go=codex opens the Codex');
      await page.close();
    }
    // 4. Service worker: precache, then play offline
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      const errs = watch(page);
      await page.goto(base + '?sw=1');
      await page.evaluate(() => navigator.serviceWorker.ready);
      const cached = await page.evaluate(async () => {
        const keys = await caches.keys();
        const shell = keys.find(k => k.startsWith('cct-shell-'));
        return shell ? (await (await caches.open(shell)).keys()).length : 0;
      });
      const expected = await page.evaluate(async () => {
        const t = await (await fetch('sw.js')).text();
        return (t.match(/PRECACHE = \[([\s\S]*?)\]/)[1].match(/'/g) || []).length / 2;
      });
      ok(cached === expected && cached > 30, `service worker precached ${cached}/${expected} files`);
      await ctx.setOffline(true);
      await page.reload();
      await page.waitForSelector('#ov h1', { timeout: 10000 });
      ok(
        (await page.getAttribute('#ov h1', 'aria-label')) === 'Cyber City Tactics',
        'the game loads with the network off'
      );
      await startRun(page);
      ok((await page.evaluate(() => G.mode)) !== 'title', 'and a run starts offline');
      ok(errs.length === 0, 'no errors offline' + (errs.length ? ': ' + errs.join(' | ') : ''));
      await ctx.close();
    }
    // 5. Phone
    {
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true
      });
      const page = await ctx.newPage();
      const errs = watch(page);
      await boot(page, base);
      await startRun(page);
      ok(
        errs.length === 0,
        'phone layout boots and starts a run' + (errs.length ? ': ' + errs.join(' | ') : '')
      );
      await ctx.close();
    }
    // 6. Controllers, with a simulated standard-mapping pad
    {
      const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
      const errs = watch(page);
      await page.addInitScript(() => {
        const mk = () => ({ pressed: false, value: 0 });
        window.__pad = {
          id: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)',
          index: 0,
          connected: true,
          mapping: 'standard',
          axes: [0, 0, 0, 0],
          buttons: Array.from({ length: 17 }, mk),
          vibrationActuator: {
            playEffect: () => ((window.__rumbles = (window.__rumbles || 0) + 1), Promise.resolve('complete'))
          }
        };
        window.__pads = [window.__pad];
        Object.defineProperty(navigator, 'getGamepads', {
          value: () => [...window.__pads, null, null, null].slice(0, 4)
        });
      });
      await boot(page, base);
      const B = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, Menu: 9, Up: 12, Down: 13, Left: 14, Right: 15 };
      const press = async (name, hold = 90) => {
        await page.evaluate(i => (window.__pad.buttons[i].pressed = true), B[name]);
        await page.waitForTimeout(hold);
        await page.evaluate(i => (window.__pad.buttons[i].pressed = false), B[name]);
        await page.waitForTimeout(90);
      };
      const mode = () => page.evaluate(() => G.mode);
      const focused = () =>
        page.evaluate(
          () => document.activeElement && document.activeElement.dataset && document.activeElement.dataset.a
        );
      await press('A');
      ok((await mode()) === 'pick', 'A on the title screen starts a new run');
      ok(
        await page.evaluate(
          () =>
            document.body.classList.contains('gamepad') &&
            getComputedStyle(document.getElementById('pad')).display === 'none'
        ),
        'the on-screen pad hides when a controller is in use'
      );
      let f0 = await focused();
      await press('Down');
      ok((await focused()) !== f0, 'D-pad moves menu focus');
      await press('B');
      ok((await mode()) === 'title', 'B goes back');
      ok(
        /Left stick or D-pad/.test(await page.textContent('#ov')),
        'title help switches to controller buttons'
      );
      await press('A');
      for (let i = 0; i < 40 && (await focused()) !== 'new'; i++) await press('Down');
      ok((await focused()) === 'new', 'D-pad reaches Start solo');
      await press('A');
      if ((await mode()) === 'trainoffer') {
        for (let i = 0; i < 6 && (await focused()) !== 'trainskip'; i++)
          await press(i % 2 ? 'Down' : 'Right');
        ok(
          (await focused()) === 'trainskip',
          'the D-pad reaches "Skip, start the run" on the first-run training offer'
        );
        await press('A');
      }
      if ((await mode()) === 'brief') await press('A');
      await page.waitForTimeout(1600);
      ok((await mode()) === 'play', 'A starts the district');
      ok(await page.evaluate(() => !!G.cut), 'Juno opens the district with a short scene');
      for (let i = 0; i < 8 && (await page.evaluate(() => !!G.cut)); i++) {
        await page.waitForTimeout(500);
        await press('A');
      }
      ok(!(await page.evaluate(() => !!G.cut)), 'and the controller moves it on');
      ok(
        await page.evaluate(() => {
          Object.assign(prefs, { motion: 'reduced', contrast: true, cb: true });
          applyPrefs();
          const c = document.body.classList,
            on = c.contains('rm') && c.contains('hc') && c.contains('cb') && RM;
          Object.assign(prefs, { motion: 'auto', contrast: false, cb: false });
          applyPrefs();
          return on && !c.contains('hc') && !c.contains('cb');
        }),
        'accessibility settings switch the page’s motion, contrast and colour classes'
      );
      // save codes: make one, paste it back, and Settings offers to load it
      await page.evaluate(() => {
        G.setRet = 'play';
        setMode('settings');
      });
      await page.click('#ov [data-a="codemake"]');
      await page.waitForSelector('#ov .codebox textarea[readonly]');
      const sc = await page.$eval('#ov .codebox textarea', t => t.value);
      ok(/^CCTSz[A-Za-z0-9_-]{40,}$/.test(sc), `Settings makes a save code (${sc.length} characters)`);
      await page.click('#ov [data-a="codeenter"]');
      await page.fill('#codeIn', sc);
      await page.click('#ov [data-a="codeload"]');
      await page.waitForFunction(() => G.importData && G.importData.from === 'code', null, { timeout: 5000 });
      ok(
        await page.evaluate(() =>
          /Replace your saves with this code/.test(document.getElementById('ov').innerHTML)
        ),
        'and a pasted code is offered back, asking first'
      );
      ok(
        await page.evaluate(
          () => SYNC.ok && /data-a="synclink"/.test(document.getElementById('ov').innerHTML)
        ),
        'Chromium offers a sync file'
      );
      await page.click('#ov [data-a="importno"]');
      // a real file handle (the origin-private file system stands in for a picked file) gets every save.
      // (Reading a stored handle back from IndexedDB crashes headless Chromium here, so the restart half is
      // covered by sync.test.js with a fake handle.)
      ok(
        await page.evaluate(async () => {
          const dir = await navigator.storage.getDirectory(),
            h = await dir.getFileHandle('cct-sync.json', { create: true });
          await syncAdopt(h);
          store.set('cs_stealth', { best: 9 });
          await syncFlush();
          const saved = JSON.parse(await (await h.getFile()).text());
          return (
            SYNC.state === 'on' &&
            saved.app === 'cyber-city-tactics' &&
            JSON.parse(saved.data.cs_stealth).best === 9
          );
        }),
        'a linked file gets every save as the game writes them'
      );
      await page.evaluate(() => syncUnlink());
      await page.click('#ov [data-a="setdone"]');
      ok((await mode()) === 'play', 'back to the street');
      const x0 = await page.evaluate(() => PL[0].x);
      await page.evaluate(() => (window.__pad.axes[0] = 1));
      await page.waitForTimeout(500);
      await page.evaluate(() => (window.__pad.axes[0] = 0));
      ok((await page.evaluate(() => PL[0].x)) > x0 + 20, 'the left stick moves the runner');
      await press('X', 40);
      ok(
        ['punch', 'idle', 'upper'].includes(await page.evaluate(() => PL[0].state)) &&
          (await page.evaluate(() => PL[0].lastPunch)) > 0,
        'X punches'
      );
      await page.evaluate(() => {
        PL[0].inv = 0;
        hurt(PL[0], 5, 1, {});
      });
      await page.waitForTimeout(100);
      ok((await page.evaluate(() => window.__rumbles || 0)) > 0, 'taking a hit rumbles the controller');
      await press('Menu');
      ok((await mode()) === 'pause', 'Menu pauses');
      await press('B');
      ok((await mode()) === 'play', 'B resumes');
      await page.evaluate(() => {
        LEG.feats.first = 1;
        setMode('codex');
      });
      await page.waitForTimeout(150);
      await press('RB');
      ok((await page.evaluate(() => G.cxTab)) === 'legs', 'RB switches Codex tabs');
      await press('B');
      await page.evaluate(() => {
        startWorld(false);
        prefs.hackKind = 'classic'; // this check is about the timing lock
        const b = G.wd.street.buildings.find(x => x.type !== 'safe' && x.type !== 'secret');
        startHack(b);
        G.hack.pos = G.hack.zone;
        G.hack.speed = 0;
      });
      await press('A');
      ok(
        (await page.evaluate(() => G.hack && G.hack.hits)) === 1 || (await mode()) === 'play',
        'A cracks a node in the hacking minigame'
      );
      if ((await mode()) === 'hack') {
        await press('B');
        ok((await mode()) === 'play', 'B backs off the lock');
      }
      // the newer locks steer with the D-pad
      await page.evaluate(() => {
        prefs.hackKind = 'varied';
        G.hack = null;
        setMode('play');
        startHack({ type: 'precinct', tier: 2, name: 'Test precinct', x: 300, id: 77 });
      });
      ok(
        (await page.evaluate(() => G.hack && G.hack.kind)) === 'trace',
        'a precinct has a network trace lock'
      );
      await press('Right');
      await press('Down');
      ok(
        await page.evaluate(() => !G.hack || G.hack.cx > 0 || G.hack.cy !== G.hack.sy || G.hack.miss > 0),
        'the D-pad steers the trace'
      );
      await page.evaluate(() => {
        G.hack = null;
        setMode('play');
      });
      await page.evaluate(() => {
        window.__pads = [];
        dispatchEvent(new Event('gamepaddisconnected'));
      });
      await page.waitForTimeout(100);
      ok(
        (await mode()) === 'pause' &&
          !(await page.evaluate(() => document.body.classList.contains('gamepad'))),
        'unplugging mid-fight pauses and brings back touch controls'
      );
      ok(
        (await page.evaluate(() => padText('Tap PUNCH three times. Hold SPELL to swap spells.'))) ===
          'Press X three times. Press RT to swap spells.',
        'tips switch to controller wording'
      );
      ok(errs.length === 0, 'no errors with a controller' + (errs.length ? ': ' + errs.join(' | ') : ''));
      await page.close();
    }
    // 7. Update flow, on a throwaway copy of the repo so the real files aren't touched
    {
      const fs = require('fs'),
        os = require('os'),
        { execFileSync } = require('child_process');
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cct-'));
      const root = path.join(__dirname, '..');
      for (const f of [
        'index.html',
        'manifest.webmanifest',
        'sw.js',
        'package.json',
        'src',
        'icons',
        'tools',
        'vendor'
      ])
        fs.cpSync(path.join(root, f), path.join(tmp, f), { recursive: true });
      const { serve: serve2 } = await import(pathToFileURL(path.join(tmp, 'tools', 'serve.mjs')).href);
      const port2 = port + 1;
      const s2 = await serve2(port2);
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.goto(`http://localhost:${port2}/?sw=1`);
      await page.evaluate(() => navigator.serviceWorker.ready);
      await page.reload();
      await page.waitForSelector('#ov h1');
      const v1 = await page.evaluate(() => APP_VERSION);
      fs.appendFileSync(path.join(tmp, 'src/css/game.css'), '\n/* new build */\n');
      execFileSync(process.execPath, [path.join(tmp, 'tools', 'build.mjs')]);
      await page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
      await page.waitForFunction(() => !!PWA.waiting, null, { timeout: 15000 });
      await page.waitForTimeout(700);
      ok(
        await page.evaluate(() => !document.getElementById('updBar').hidden),
        'update bar appears when a new version is ready'
      );
      await Promise.all([page.waitForNavigation({ timeout: 15000 }), page.click('#updBar [data-u="go"]')]);
      await page.waitForSelector('#ov h1');
      const v2 = await page.evaluate(() => APP_VERSION);
      ok(v1 !== v2, `"Update now" reloads into the new version (${v1} → ${v2})`);
      await ctx.close();
      s2.close();
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  } catch (e) {
    ok(false, 'browser test crashed: ' + e.message);
  }
  await browser.close();
  server.close();
  console.log(failed ? `\n${failed} failed` : '\nAll browser checks passed');
  process.exit(failed ? 1 : 0);
})();
