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
    // this machine draws WebGL in software, which the game would leave 2D: force 3D for the checks
    await page.evaluate(() => {
      if (typeof r3Ready === 'function' && r3Ready()) R3.force = true;
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
      // the district is prepared off the main thread first, then shown
      await page.waitForFunction(() => R3.on, null, { timeout: 20000 });
      await page.waitForTimeout(300);
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
        const kinds = [...R3.pool.entries()].map(([e, o]) => [e.kind, !!o.root && !o.beast, o.pup]);
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
        s.kinds.some(k => k[0] === 'hound' && k[2] === 'hound'),
        'a hound is its own 3D model'
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
      });
      // every district builds and draws
      const built = [];
      const n = await page.evaluate(() => STAGES.length);
      for (let k = 0; k < 3; k++)
        for (let i = 0; i < n; i++) {
          await page.evaluate(i => {
            startStage(i);
            G.banner = 0;
          }, i);
          const t = await page
            .waitForFunction(i => (render(), R3.on && R3.key.includes(STAGES[i].name)), i, {
              timeout: 60000
            })
            .then(() => true)
            .catch(() => false);
          if (k === 0) built.push(t);
          if (k === 0 && i === n - 1) built.geo = await page.evaluate(() => R3.r.info.memory.geometries);
        }
      ok(built.every(Boolean), `all ${built.length} districts build in 3D`);
      // and every other place: the Den, a Sprawl block, a room inside, training, a drive and a flight
      const places = {
        den: () => {
          newRun(false);
          enterDen();
        },
        block: () => startWorld(false),
        room: () => {
          const b = G.wd.street.buildings.find(x => ['hideout', 'business', 'home'].includes(x.type));
          startHack(b);
          hackWin();
          setMode('play');
        },
        training: () => startTraining(),
        drive: () => {
          startDrive('causeway', false);
          setMode('play');
        },
        flight: () => {
          startFlight('skyline', false);
          setMode('play');
        },
        roof: () => roofStart(),
        stealth: () => startStealth('arcology', false)
      };
      for (const [name, fn] of Object.entries(places)) {
        await page.evaluate(`(${fn})()`);
        const on = await page
          .waitForFunction(() => (render(), R3.on), null, { timeout: 30000 })
          .then(() => true)
          .catch(() => false);
        const kinds = await page.evaluate(() => [...R3.pool.values()].map(o => o.pup));
        ok(
          on && !kinds.includes('card'),
          `${name} is drawn in 3D, with no flat cards (${[...new Set(kinds)].join(', ') || 'nobody'})`
        );
      }
      // and the worlds it leaves behind are let go: no growing pile of GPU buffers
      const mem = [built.geo, await page.evaluate(() => R3.r.info.memory.geometries)];
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
