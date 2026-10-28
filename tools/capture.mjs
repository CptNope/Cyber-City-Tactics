#!/usr/bin/env node
/* Cyber City Tactics store kit: screenshots, cover art, a social card and a short trailer, all captured from
 * the game itself so they never drift from what players see.
 *
 *   NODE_PATH=<dir with playwright> node tools/capture.mjs [--no-video | --video-only]
 *
 * Writes:
 *   screenshots/*.png             install-dialog screenshots listed in manifest.webmanifest
 *   docs/store/shot-*.png          1920x1080 store screenshots
 *   docs/store/cover-630x500.png   itch.io cover
 *   docs/store/social-1200x630.png link preview / og:image
 *   docs/store/trailer.mp4         about 30 seconds, 1280x720, H.264 (needs ffmpeg on PATH)
 *
 * The game runs frame by frame under this script's control (the real loop is paused), and the runners are
 * driven by a tiny autopilot, so every capture is the same every time apart from the game's own dice.
 * Playwright is a dev tool only; the game itself still has no dependencies.
 */
import { createRequire } from 'node:module';
import { mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs/store');
const VIDEO = !process.argv.includes('--no-video'),
  ONLY_VIDEO = process.argv.includes('--video-only');
mkdirSync(OUT, { recursive: true });

// ---------- in-page helpers (serialized into the page) ----------
const HELPERS = () => {
  window.__cap = {
    // pause the real loop; we step the game ourselves
    freeze() {
      frame = () => {};
      prefs.tips = false;
      prefs.seen = prefs.seen || {};
      prefs.seen.trainoffer = true;
      document.getElementById('ov').style.display = 'none';
    },
    // runners fight on their own: walk to the nearest foe, then a punch, punch, kick rhythm, specials when full
    auto() {
      for (const p of PL) {
        const I = INP[p.idx];
        I.held = {};
        I.pressed = {};
        if (p.out || p.state === 'dead') continue;
        p.hp = Math.max(p.hp, p.maxHp * 0.55); // nobody flatlines in a trailer
        const foes = G.ents
          .filter(e => e.team === 1 && e.state !== 'dead' && !(e.d && e.d.passive) && !e.mist)
          .sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x));
        const t = foes[p.idx % Math.max(1, foes.length)] || foes[0];
        if (!t) continue;
        const dx = t.x - p.x,
          dy = t.y - p.y,
          reach = 22 + p.idx * 4;
        if (Math.abs(dy) > 4) I.held[dy < 0 ? 'up' : 'down'] = true;
        if (Math.abs(dx) > reach) I.held[dx < 0 ? 'left' : 'right'] = true;
        else {
          p.face = dx < 0 ? -1 : 1;
          const r = (G.t + p.idx * 9) % 44;
          if (r === 0 || r === 10) I.pressed.punch = true;
          else if (r === 22) I.pressed.kick = true;
          else if (r === 34 && (p.sp || 0) >= 100) I.pressed.special = true;
          else if (r === 34 && p.mp > 20 && p.idx === 1) I.pressed.spell = true;
        }
      }
    },
    step(n) {
      for (let i = 0; i < n; i++) {
        __cap.auto();
        stepOnce();
        G.toasts = []; // no feat pop-ups over the action
      }
      lerpRender(0);
    },
    caption(text, sub) {
      let el = document.getElementById('cap');
      if (!el) {
        el = document.createElement('div');
        el.id = 'cap';
        el.style.cssText =
          'position:fixed;left:0;right:0;top:24%;text-align:center;pointer-events:none;z-index:50;' +
          'font-family:Teko,Impact,sans-serif;color:#efe9ff;text-shadow:0 2px 0 #0c0a14,0 0 18px #0c0a14;';
        document.body.appendChild(el);
      }
      el.innerHTML = text
        ? `<div style="font-size:64px;line-height:.95;letter-spacing:.02em;text-transform:uppercase">${text}</div>` +
          (sub
            ? `<div style="font:500 22px 'Chakra Petch',sans-serif;color:#a79dc2;margin-top:8px">${sub}</div>`
            : '')
        : '';
    },
    // a fresh co-op run at a district, runners placed, the street cleared, with a mix of foes
    scene(si, foes, opts) {
      opts = opts || {};
      G.pendArch = opts.arch || ['samurai', 'mage'];
      G.pendDiff = 1;
      newRun(true);
      G.choices = opts.choices || {};
      briefing(si, false); // hands out this district's contract
      startStage(si);
      setMode('play');
      document.getElementById('ov').style.display = 'none';
      G.fade = 0;
      G.banner = 0;
      G.ents = G.ents.filter(e => e.team !== 1);
      G.waveLive = true;
      G.wave = 99;
      G.camX = opts.camX || 300;
      G.pcamX = G.camX;
      PL.forEach((p, i) => {
        p.x = G.camX + 110 + i * 26;
        p.y = 205 + i * 26;
        p.inv = 0;
        p.lvl = 9;
        p.sp = opts.sp ? 100 : 0;
      });
      (foes || []).forEach((k, i) => {
        const left = !opts.right && i % 2;
        const e = spawnEnemy(k, left ? -1 : 1);
        e.x = left ? G.camX + 40 + (i >> 1) * 30 : G.camX + W - 60 - i * 34;
        e.y = 190 + ((i * 23) % 64);
        e.inv = 0;
        if (opts.elite) e.elite = opts.elite[i] || null;
      });
    }
  };
};

const browser = await chromium.launch();
async function page(w, h, scale) {
  const pg = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale || 1 });
  pg.on('pageerror', e => console.error('page error:', e.message));
  await pg.goto(pathToFileURL(join(ROOT, 'index.html')).href);
  await pg.waitForFunction(() => typeof G !== 'undefined');
  await pg.evaluate(() => document.fonts.ready);
  await pg.waitForTimeout(500);
  await pg.evaluate(HELPERS);
  return pg;
}

// ---------- stills ----------
const STILLS = [
  // [file, setup in page, steps to run first]
  ['street-storm', () => __cap.scene(0, ['ganger', 'orc', 'ganger', 'hound', 'ganger']), 150],
  ['undercity-market', () => __cap.scene(3, ['thrall', 'thrall', 'ghoul', 'vesper']), 120],
  ['neon-market-boss', () => __cap.scene(1, ['blade', 'sec', 'drone'], { sp: true }), 70],
  [
    'arcology-elites',
    () => __cap.scene(4, ['mech', 'sec', 'ninja', 'riot'], { elite: ['armored', 'berserk', null, 'warded'] }),
    140
  ],
  [
    'sprawl-black-market',
    () => {
      G.pendArch = ['samurai', 'mage'];
      startWorld(true);
      let s = 1;
      while (!traderOf(newWorld(2, s))) s++;
      G.wd = newWorld(2, s);
      G.wd.rep = 20;
      enterStreet(0);
      setMode('play');
      document.getElementById('ov').style.display = 'none';
      G.fade = 0;
      G.banner = 0;
      G.ents = G.ents.filter(e => e.team !== 1);
      const t = traderOf(G.wd);
      G.camX = Math.max(0, t.x - W / 2);
      PL.forEach((p, i) => {
        p.x = t.x + 50 + i * 30;
        p.y = FY0 + 20 + i * 20;
        p.inv = 0;
      });
    },
    6
  ]
];
async function stills() {
  // 1920x1080 store shots
  const pg = await page(1920, 1080);
  await pg.evaluate(() => __cap.freeze());
  for (const [name, setup, n] of STILLS) {
    await pg.evaluate(setup);
    await pg.evaluate(n => {
      if (G.world) {
        for (let i = 0; i < n; i++) {
          worldTick();
          G.t++;
        }
        G.toasts = [];
        render();
      } else __cap.step(n);
    }, n);
    await pg.screenshot({ path: join(OUT, `shot-${name}.png`) });
    console.log('shot', name);
  }
  // the title screen, wordmark settled
  const t = await page(1920, 1080);
  await t.waitForTimeout(1500);
  await t.screenshot({ path: join(OUT, 'shot-title.png') });
  await t.close();
  // install-dialog screenshots: wide 1280x720 and narrow phone portrait (390x844 at 2x)
  const wide = await page(1280, 720);
  await wide.evaluate(() => __cap.freeze());
  await wide.evaluate(() => __cap.scene(3, ['thrall', 'thrall', 'ghoul', 'vesper']));
  await wide.evaluate(() => __cap.step(110));
  await wide.screenshot({ path: join(ROOT, 'screenshots/wide-market.png') });
  await wide.evaluate(() => __cap.scene(0, ['ganger', 'orc', 'ganger', 'hound']));
  await wide.evaluate(() => __cap.step(150));
  await wide.screenshot({ path: join(ROOT, 'screenshots/wide-street.png') });
  await wide.close();
  const narrow = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  await narrow.goto(pathToFileURL(join(ROOT, 'index.html')).href);
  await narrow.waitForFunction(() => typeof G !== 'undefined');
  await narrow.evaluate(() => document.fonts.ready);
  await narrow.evaluate(HELPERS);
  await narrow.waitForTimeout(400);
  await narrow.evaluate(() => {
    document.body.classList.add('touch');
    __cap.freeze();
    __cap.scene(0, ['ganger', 'orc', 'ganger']);
    fit();
    __cap.step(120);
    document.getElementById('ov').style.display = '';
  });
  await narrow.screenshot({ path: join(ROOT, 'screenshots/narrow-play.png') });
  await narrow.evaluate(() => {
    G.ret = 'play';
    setMode('codex');
  });
  await narrow.waitForTimeout(300);
  await narrow.screenshot({ path: join(ROOT, 'screenshots/narrow-codex.png') });
  await narrow.close();
  await pg.close();
}

// ---------- cover and social card: the wordmark over a live frame ----------
async function cards() {
  for (const [file, w, h, big] of [
    ['cover-630x500.png', 630, 500, 64],
    ['social-1200x630.png', 1200, 630, 96]
  ]) {
    const pg = await page(w * 2, Math.round(w * 2 * (9 / 16)));
    await pg.evaluate(() => __cap.freeze());
    await pg.evaluate(() => __cap.scene(3, ['thrall', 'ghoul', 'thrall', 'vesper']));
    // key art: the same street, without the HUD (render skips it on the title screen)
    await pg.evaluate(() => {
      __cap.step(140);
      G.mode = 'title';
      G.texts = [];
      render();
    });
    const frame = await pg.screenshot({ type: 'png' });
    await pg.close();
    const card = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    // the game's own @font-face rules, with the font files inlined (a blank page can't load file URLs)
    const css = readFileSync(join(ROOT, 'src/css/game.css'), 'utf8');
    const fontCss = (css.match(/@font-face\s*{[^}]*}/g) || [])
      .join('\n')
      .replace(
        /url\('\.\.\/fonts\/([^']+)'\)/g,
        (_, f) =>
          `url('data:font/woff;base64,${readFileSync(join(ROOT, 'src/fonts', f)).toString('base64')}')`
      );
    await card.setContent(`<!doctype html><html><head><style>${fontCss}
      body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:#0c0a14;font-family:'Chakra Petch',sans-serif}
      .bg{position:absolute;inset:0;background:url(data:image/png;base64,${frame.toString('base64')}) center/cover}
      .shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(12,10,20,.92) 0%,rgba(12,10,20,.7) 45%,rgba(12,10,20,0) 80%)}
      .wm{position:absolute;left:${Math.round(w * 0.06)}px;top:50%;transform:translateY(-55%);display:flex;flex-direction:column;align-items:flex-start;gap:${Math.round(big * 0.07)}px;font-family:Teko,Impact,sans-serif;font-weight:600;text-transform:uppercase;line-height:.82}
      .city{font-size:${big}px;color:#efe9ff;text-shadow:-3px 0 #ff3d8b,3px 0 #45d2ff}
      .bar{font-size:${Math.round(big * 0.56)}px;background:#ff3d8b;color:#0c0a14;padding:${Math.round(big * 0.08)}px ${Math.round(big * 0.24)}px 0;letter-spacing:.14em}
      .tag{position:absolute;left:${Math.round(w * 0.06)}px;bottom:${Math.round(h * 0.08)}px;color:#a79dc2;font-size:${Math.round(big * 0.24)}px}
      </style></head><body><div class="bg"></div><div class="shade"></div>
      <div class="wm"><div class="city">Cyber City</div><div class="bar">Tactics</div></div>
      <div class="tag">Neon brawler RPG · 1–2 players · free in your browser</div></body></html>`);
    await card.evaluate(() => document.fonts.ready);
    await card.waitForTimeout(200);
    await card.screenshot({ path: join(OUT, file) });
    await card.close();
    console.log('card', file);
  }
}

// ---------- trailer ----------
async function trailer() {
  const FR = join(OUT, '.frames');
  rmSync(FR, { recursive: true, force: true });
  mkdirSync(FR, { recursive: true });
  const pg = await page(1280, 720);
  await pg.evaluate(() => __cap.freeze());
  let n = 0;
  const grab = async () =>
    pg.screenshot({ path: join(FR, `f${String(n++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
  // repeat the last captured frame (a title card, an end card) for a number of video frames (30 fps)
  const hold = frames => {
    const src = join(FR, `f${String(n - 1).padStart(5, '0')}.jpg`);
    for (let i = 1; i < frames; i++)
      execFileSync('cp', [src, join(FR, `f${String(n++).padStart(5, '0')}.jpg`)]);
  };
  // run the game for a number of video frames, two logic steps each (60 steps/s at 30 fps)
  const play = async frames => {
    for (let i = 0; i < frames; i++) {
      await pg.evaluate(() => __cap.step(2));
      await grab();
    }
  };
  const cap = (t, s) => pg.evaluate(([t, s]) => __cap.caption(t, s), [t, s]);

  // a full-screen card in the game's own type: the wordmark big, a line or two under it
  const card = async lines => {
    const c = await page(1280, 720);
    await c.evaluate(lines => {
      document.getElementById('ov').innerHTML =
        `<div class="card" style="text-align:left;max-width:900px"><h1 class="wordmark" style="font-size:150px" aria-label="Cyber City Tactics"><span class="wm-city">Cyber City</span><span class="wm-bar">Tactics</span></h1>${lines}</div>`;
    }, lines);
    await c.waitForTimeout(300);
    await c.screenshot({ path: join(FR, `f${String(n++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
    await c.close();
  };
  // 1. title card
  await card(
    `<p class="eyebrow" style="font-size:18px">Seattle sprawl, 2079 · brawler RPG for one or two</p>`
  );
  hold(60);
  // 2. the Barrens in a storm
  await pg.evaluate(() => __cap.scene(0, ['ganger', 'orc', 'ganger', 'hound', 'ganger', 'hound']));
  await cap('Two runners. One rotten city.', 'Punch, kick, shoot, cast, grab and throw');
  await play(150);
  // 3. a boss entrance
  await pg.evaluate(() => __cap.scene(1, ['blade', 'sec', 'drone'], { sp: true }));
  await cap('', '');
  await play(55); // the boss card has the screen to itself
  await cap('Six districts. Six bosses.', '');
  await play(75);
  // 4. the Undercity Market and Mother Vesper
  await pg.evaluate(() => __cap.scene(3, ['vesper', 'thrall', 'thrall', 'ghoul']));
  await cap('', '');
  await play(110);
  // 5. elites
  await pg.evaluate(() =>
    __cap.scene(4, ['mech', 'sec', 'ninja', 'riot'], {
      elite: ['armored', 'berserk', null, 'warded'],
      right: true
    })
  );
  await cap(
    'Choose who you hurt.',
    'An open-world Sprawl, a black market and two choices that change the ending'
  );
  await play(120);
  // 6. end card
  await cap('', '');
  await card(
    `<p style="font-size:24px">Free in your browser. Plays offline, on a phone or a TV, solo or with a friend.</p><p style="font-size:22px;color:var(--gold)">cptnope.github.io/Cyber-City-Tactics</p>`
  );
  hold(90);
  await pg.close();
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-loglevel',
      'error',
      '-framerate',
      '30',
      '-i',
      join(FR, 'f%05d.jpg'),
      '-vf',
      'fade=t=in:st=0:d=0.5,format=yuv420p',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '20',
      '-movflags',
      '+faststart',
      join(OUT, 'trailer.mp4')
    ],
    { stdio: 'inherit' }
  );
  rmSync(FR, { recursive: true, force: true });
  console.log('trailer', n, 'frames');
}

if (!ONLY_VIDEO) {
  await stills();
  await cards();
}
if (VIDEO) await trailer();
await browser.close();
