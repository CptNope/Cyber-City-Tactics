/* Browser checks with Playwright (npm i -D playwright, then npm run test:browser).
 * Serves the repo locally and checks, in a real Chromium:
 *  - the modular page and the single-file bundle both boot with no errors and can start a run
 *  - the manifest is valid and every icon, shortcut icon and screenshot it lists exists
 *  - app shortcuts (?go=codex) open the right screen
 *  - the service worker precaches every file and the game loads with the network switched off
 *  - the phone layout boots too
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
        (await page.textContent('#ov h1')) === 'Cyber City Tactics',
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
      ok((await page.textContent('#ov h1')) === 'Cyber City Tactics', 'bundle boots to the title screen');
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
      ok((await page.textContent('#ov h1')) === 'Cyber City Tactics', 'the game loads with the network off');
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
    // 6. Update flow, on a throwaway copy of the repo so the real files aren't touched
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
        'tools'
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
