#!/usr/bin/env node
/* Regenerates the store-style screenshots listed in manifest.webmanifest (needs Playwright).
 *   node tools/screenshots.mjs
 * Browsers show these in the richer install dialog on phones and desktops. */
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'screenshots');
mkdirSync(OUT, { recursive: true });

const port = 8900;
const server = await serve(port);
const base = `http://localhost:${port}/`;
const browser = await chromium.launch();

// Wide: a night-market block in the Sprawl.
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(base);
  await page.waitForSelector('#ov h1');
  await page.evaluate(() => {
    prefs.tips = false;
    startWorld(false);
    let s = 0;
    for (;;) {
      s++;
      const st = genStreet(3, s * 7);
      if (st.event === 'festival') {
        G.wd.level = 3;
        G.wd.seed = s * 7;
        G.wd.street = st;
        break;
      }
    }
    G.toasts = [];
    enterStreet(700);
    G.toasts = [];
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(OUT, 'wide-sprawl.png') });
  await page.close();
}
// Narrow: the Codex, and a fight with touch controls.
for (const [name, setup] of [
  [
    'narrow-codex',
    async page => {
      await page.evaluate(() => {
        for (const id of ['first', 'k100', 'c25', 'b_troll', 'h1', 'lore5']) LEG.feats[id] = Date.now();
        G.cxTab = 'feats';
        setMode('codex');
      });
    }
  ],
  [
    'narrow-play',
    async page => {
      await page.evaluate(() => {
        G.pendArch = ['samurai', 'mage'];
        newRun(false);
        startStage(0);
        setMode('play');
      });
      await page.waitForTimeout(3500);
      await page.evaluate(() => {
        const p = PL[0];
        p.x = 200;
        for (const [k, dx, dy] of [
          ['ganger', 46, -6],
          ['orc', 80, 14],
          ['ganger', -40, 10]
        ]) {
          const e = spawnEnemy(k, 1);
          e.x = p.x + dx;
          e.y = p.y + dy;
        }
      });
      await page.waitForTimeout(700);
    }
  ]
]) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const page = await ctx.newPage();
  // Skip first-run hints so the screenshots stay clean.
  await page.addInitScript(() =>
    localStorage.setItem('cs_prefs', JSON.stringify({ tips: false, rotDismissed: true }))
  );
  await page.goto(base);
  await page.waitForSelector('#ov h1');
  await setup(page);
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, name + '.png') });
  await ctx.close();
}
await browser.close();
server.close();
console.log('screenshots written to', OUT);
