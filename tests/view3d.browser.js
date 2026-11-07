/* The 3D view in a real Chromium (software WebGL is enough): a street fight draws in 3D with no errors, the
 * picture is the lit street rather than a blank frame, the fighters are 3D puppets and creatures are cards,
 * the Den falls back to 2D, Settings → View switches to the classic view and back, and every district
 * builds. If the browser has no WebGL 2 the game must simply stay 2D. Run by npm run test:browser. */
'use strict';
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const { chromium } = require('playwright');
  const { serve } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'serve.mjs')).href);
  const port = 9100 + Math.floor(Math.random() * 800);
  const server = await serve(port);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  let failed = 0;
  const ok = (c, m) => {
    console.log((c ? 'PASS ' : 'FAIL ') + m);
    if (!c) failed++;
  };
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => {
      if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errs.push(m.text());
    });
    await page.goto(`http://localhost:${port}/index.html`);
    await page.waitForFunction(() => typeof G !== 'undefined', null, { timeout: 10000 });
    const gl2 = await page.evaluate(() => !!document.createElement('canvas').getContext('webgl2'));
    await page.evaluate(() => {
      prefs.tips = false;
      prefs.story = false;
      G.pendArch = ['samurai', 'runner'];
      newRun(false);
      startStage(1);
    });
    await page.waitForTimeout(1500);
    if (!gl2) {
      ok(
        await page.evaluate(() => R3.on === false && G.mode === 'play'),
        'no WebGL 2 here: the game plays in 2D'
      );
    } else {
      await page.evaluate(() => {
        G.banner = 0;
        const P = PL[0];
        for (const k of ['ganger', 'hound']) {
          const e = spawnEnemy(k, 1);
          e.x = P.x + 80;
          e.y = P.y;
          e.cool = 1e9;
        }
      });
      await page.waitForTimeout(500);
      const s = await page.evaluate(() => {
        render();
        // sample the game canvas: a lit street has colour and contrast, a failed frame is flat
        const g = document.getElementById('game'),
          c = document.createElement('canvas');
        c.width = 64;
        c.height = 36;
        const x = c.getContext('2d');
        // the 3D canvas underneath, then the game canvas over it, as the page stacks them
        x.drawImage(R3.cv, 0, 0, 64, 36);
        x.drawImage(g, 0, 0, 64, 36);
        const d = x.getImageData(0, 0, 64, 36).data;
        let sum = 0,
          sq = 0;
        for (let i = 0; i < d.length; i += 4) {
          const l = (d[i] + d[i + 1] + d[i + 2]) / 3;
          sum += l;
          sq += l * l;
        }
        const n = d.length / 4,
          mean = sum / n;
        const kinds = [...R3.pool.entries()].map(([e, o]) => [e.kind, !!o.root]);
        return { on: R3.on, mean, sd: Math.sqrt(sq / n - mean * mean), kinds };
      });
      ok(s.on, 'a street fight is drawn in 3D');
      ok(
        s.mean > 12 && s.sd > 12,
        `the picture is the lit street, not a blank frame (mean ${s.mean | 0}, spread ${s.sd | 0})`
      );
      ok(
        s.kinds.some(k => k[0] === 'player' && k[1]) && s.kinds.some(k => k[0] === 'ganger' && k[1]),
        'runners and gangers are 3D puppets'
      );
      ok(
        s.kinds.some(k => k[0] === 'hound' && !k[1]),
        'a hound, with no puppet, is its 2D drawing on a card'
      );
      const t = await page.evaluate(() => {
        const t0 = performance.now();
        for (let i = 0; i < 10; i++) render();
        return (performance.now() - t0) / 10;
      });
      ok(t < 60, `a frame takes ${t.toFixed(1)} ms even on software WebGL`);
      await page.evaluate(() => {
        prefs.view = '2d';
        render();
      });
      ok(await page.evaluate(() => R3.on === false), 'Settings → View: Classic 2D switches it off');
      await page.evaluate(() => {
        prefs.view = '3d';
        enterDen();
      });
      await page.waitForTimeout(300);
      ok(await page.evaluate(() => R3.on === false && !!G.den), 'the Den stays 2D');
      // every district builds and draws
      const built = await page.evaluate(() => {
        const out = [];
        for (let i = 0; i < STAGES.length; i++) {
          startStage(i);
          G.banner = 0;
          render();
          out.push(R3.on && R3.key.includes(STAGES[i].name));
        }
        return out;
      });
      ok(built.every(Boolean), `all ${built.length} districts build in 3D`);
      // and the world it leaves behind is let go: no growing pile of GPU buffers
      const mem = await page.evaluate(() => {
        const a = R3.r.info.memory.geometries;
        for (let k = 0; k < 3; k++)
          for (let i = 0; i < STAGES.length; i++) {
            startStage(i);
            render();
          }
        return [a, R3.r.info.memory.geometries];
      });
      ok(mem[1] <= mem[0] + 12, `rebuilding districts frees the old ones (geometries ${mem[0]} → ${mem[1]})`);
    }
    ok(!errs.length, 'no errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  } catch (e) {
    console.log('FAIL ' + (e && e.stack ? e.stack : e));
    failed++;
  } finally {
    await browser.close();
    server.close();
  }
  process.exit(failed ? 1 : 0);
})();
