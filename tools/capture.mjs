#!/usr/bin/env node
/* Cyber City Tactics store kit: screenshots, cover art, a social card and a short trailer, all captured from
 * the game itself so they never drift from what players see.
 *
 *   NODE_PATH=<dir with playwright> node tools/capture.mjs [--no-video | --video-only | --only=stills,cards,readme,video]
 *
 * Writes:
 *   screenshots/*.png             install-dialog screenshots listed in manifest.webmanifest
 *   docs/store/shot-*.png          1920x1080 store screenshots
 *   docs/store/cover-630x500.png   itch.io cover
 *   docs/store/social-1200x630.png link preview / og:image
 *   docs/store/trailer.mp4         about 30 seconds, 1280x720, H.264 (needs ffmpeg on PATH)
 *   docs/media/*.png               README pictures: the Den, the skill tree, the Codex, online co-op
 *   docs/media/trailer-preview.gif a short looping cut of the trailer for the README (needs ffmpeg)
 *
 * The game runs frame by frame under this script's control (the real loop is paused), and the runners are
 * driven by a tiny autopilot, so every capture is the same every time apart from the game's own dice.
 * Everything is captured in the 3D view (forced on, even where Chromium only has software WebGL); --2d
 * captures the classic flat view instead.
 * Playwright is a dev tool only; the game itself still has no dependencies.
 */
import { createRequire } from 'node:module';
import { mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs/store');
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const want = k =>
  ONLY.length
    ? ONLY.includes(k)
    : k === 'video'
      ? !process.argv.includes('--no-video')
      : !process.argv.includes('--video-only');
const MEDIA = join(ROOT, 'docs/media');
const FLAT = process.argv.includes('--2d');
mkdirSync(OUT, { recursive: true });
mkdirSync(MEDIA, { recursive: true });

// ---------- in-page helpers (serialized into the page) ----------
const HELPERS = () => {
  window.__cap = {
    // pause the real loop; we step the game ourselves
    freeze() {
      frame = () => {};
      if (typeof R3 !== 'undefined') R3.force = true; // 3D even on software WebGL
      prefs.tips = false;
      prefs.story = false; // no story scenes over the action
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
    // one video frame straight from the canvases (far faster than a page screenshot on software WebGL): the
    // 3D scene, the game canvas over it, and the caption drawn in the game's own type
    compose(w, h) {
      render();
      const c = __cap.cv || (__cap.cv = document.createElement('canvas'));
      c.width = w;
      c.height = h;
      const x = c.getContext('2d');
      x.fillStyle = '#0c0a14';
      x.fillRect(0, 0, w, h);
      if (typeof R3 !== 'undefined' && R3.on) x.drawImage(R3.cv, 0, 0, w, h);
      x.drawImage(document.getElementById('game'), 0, 0, w, h);
      const [t, sub] = __cap.cap || [];
      if (t) {
        x.textAlign = 'center';
        x.shadowColor = '#0c0a14';
        x.shadowBlur = 18;
        x.fillStyle = '#efe9ff';
        x.font = '64px Teko, Impact, sans-serif';
        x.fillText(t.toUpperCase(), w / 2, h * 0.24 + 52);
        if (sub) {
          x.fillStyle = '#a79dc2';
          x.font = "500 22px 'Chakra Petch', sans-serif";
          x.fillText(sub, w / 2, h * 0.24 + 92);
        }
        x.shadowBlur = 0;
      }
      return c.toDataURL('image/jpeg', 0.92);
    },
    caption(text, sub) {
      __cap.cap = [text, sub];
      if (__cap.noDom) return;
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
      G.cut = null;
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

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
// wait for the 3D scene of whatever place is on screen to be built and compiled (it happens between frames)
const ready3d = pg =>
  FLAT
    ? Promise.resolve()
    : pg
        .waitForFunction(() => (render(), typeof R3 === 'undefined' || R3.ok === false || R3.on), null, {
          timeout: 90000,
          polling: 200
        })
        .catch(() => console.log('  (3D not ready; captured in 2D)'));
async function page(w, h, scale) {
  const pg = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale || 1 });
  pg.setDefaultTimeout(240000); // a page screenshot of a 3D scene is slow on software WebGL
  pg.on('pageerror', e => console.error('page error:', e.message));
  await pg.goto(pathToFileURL(join(ROOT, 'index.html')).href);
  await pg.waitForFunction(() => typeof G !== 'undefined');
  await pg.evaluate(() => document.fonts.ready);
  await pg.waitForTimeout(500);
  await pg.evaluate(HELPERS);
  await pg.evaluate(flat => {
    prefs.view = flat ? '2d' : '3d';
    if (typeof R3 !== 'undefined') R3.force = true;
  }, FLAT);
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
    await ready3d(pg);
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
  await ready3d(t);
  await t.waitForTimeout(1500);
  // hold the frame still: a live 1080p loop on software WebGL can starve the screenshot
  await t.evaluate(() => {
    frame = () => {};
    render();
  });
  await t.screenshot({ path: join(OUT, 'shot-title.png') });
  await t.close();
  // install-dialog screenshots: wide 1280x720 and narrow phone portrait (390x844 at 2x)
  const wide = await page(1280, 720);
  await wide.evaluate(() => __cap.freeze());
  await wide.evaluate(() => __cap.scene(3, ['thrall', 'thrall', 'ghoul', 'vesper']));
  await ready3d(wide);
  await wide.evaluate(() => __cap.step(110));
  await wide.screenshot({ path: join(ROOT, 'screenshots/wide-market.png') });
  await wide.evaluate(() => __cap.scene(0, ['ganger', 'orc', 'ganger', 'hound']));
  await ready3d(wide);
  await wide.evaluate(() => __cap.step(150));
  await wide.screenshot({ path: join(ROOT, 'screenshots/wide-street.png') });
  await wide.close();
  const narrow = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  narrow.setDefaultTimeout(240000);
  await narrow.goto(pathToFileURL(join(ROOT, 'index.html')).href);
  await narrow.waitForFunction(() => typeof G !== 'undefined');
  await narrow.evaluate(() => document.fonts.ready);
  await narrow.evaluate(HELPERS);
  await narrow.waitForTimeout(400);
  await narrow.evaluate(flat => {
    prefs.view = flat ? '2d' : '3d';
    document.body.classList.add('touch');
    __cap.freeze();
    __cap.scene(0, ['ganger', 'orc', 'ganger']);
    fit();
  }, FLAT);
  await ready3d(narrow);
  await narrow.evaluate(() => {
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
    ['social-1200x630.png', 1200, 630, 96],
    ['wide-cover-1260x540.png', 1260, 540, 112] // 21:9, itch.io's featured banner
  ]) {
    const pg = await page(w * 2, Math.round(w * 2 * (9 / 16)));
    await pg.evaluate(() => __cap.freeze());
    await pg.evaluate(() => __cap.scene(3, ['thrall', 'ghoul', 'thrall', 'vesper']));
    await ready3d(pg);
    // key art: the same street, without the HUD (render skips it on the title screen)
    await pg.evaluate(() => {
      // the runners stay on their feet for the key art
      for (let i = 0; i < 28; i++) {
        for (const p of PL) {
          p.inv = 20;
          p.hp = p.maxHp;
        }
        __cap.step(5);
      }
      // frame the fight right of centre, clear of the wordmark
      const mid = PL.reduce((t, p) => t + p.x, 0) / PL.length;
      for (const p of PL) p.inv = 0; // invulnerable runners blink; show them solid
      G.camX = mid - W * 0.6;
      G.mode = 'title';
      G.texts = [];
      G.picks = []; // no loot labels or hit flashes on the key art
      G.fx = [];
      G.projs = [];
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
      <div class="tag">Neon brawler RPG · 1–4 players, couch or online · free in your browser</div></body></html>`);
    await card.evaluate(() => document.fonts.ready);
    await card.waitForTimeout(200);
    await card.screenshot({ path: join(OUT, file) });
    await card.close();
    console.log('card', file);
  }
  // the wordmark alone, on one line, on a transparent background (itch.io's logo slot)
  const css = readFileSync(join(ROOT, 'src/css/game.css'), 'utf8');
  const fontCss = (css.match(/@font-face\s*{[^}]*}/g) || [])
    .join('\n')
    .replace(
      /url\('\.\.\/fonts\/([^']+)'\)/g,
      (_, f) => `url('data:font/woff;base64,${readFileSync(join(ROOT, 'src/fonts', f)).toString('base64')}')`
    );
  const lg = await browser.newPage({ viewport: { width: 1400, height: 300 }, deviceScaleFactor: 1 });
  await lg.setContent(`<!doctype html><html><head><style>${fontCss}
    body{margin:0;background:transparent}
    .wm{display:inline-flex;align-items:center;gap:22px;padding:16px 20px 8px;font-family:Teko,Impact,sans-serif;font-weight:600;text-transform:uppercase;line-height:.82}
    .city{font-size:150px;color:#efe9ff;text-shadow:-4px 0 #ff3d8b,4px 0 #45d2ff,0 0 3px #0c0a14}
    .bar{font-size:84px;background:#ff3d8b;color:#0c0a14;padding:12px 30px 0;letter-spacing:.14em}
    </style></head><body><div class="wm"><div class="city">Cyber City</div><div class="bar">Tactics</div></div></body></html>`);
  await lg.evaluate(() => document.fonts.ready);
  await lg.waitForTimeout(200);
  await (await lg.$('.wm')).screenshot({ path: join(OUT, 'logo.png'), omitBackground: true });
  await lg.close();
  console.log('card logo.png');
}

// ---------- trailer ----------
async function trailer() {
  const FR = join(OUT, '.frames');
  rmSync(FR, { recursive: true, force: true });
  mkdirSync(FR, { recursive: true });
  const pg = await page(1280, 720);
  await pg.evaluate(() => __cap.freeze());
  let n = 0;
  await pg.evaluate(() => (__cap.noDom = true)); // captions are drawn into the frames instead
  const grab = async () => {
    const url = await pg.evaluate(() => __cap.compose(1280, 720));
    writeFileSync(join(FR, `f${String(n++).padStart(5, '0')}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
  };
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
    `<p class="eyebrow" style="font-size:18px">Seattle sprawl, 2079 · brawler RPG for one to four</p>`
  );
  hold(60);
  // 2. the Barrens in a storm
  await pg.evaluate(() => __cap.scene(0, ['ganger', 'orc', 'ganger', 'hound', 'ganger', 'hound']));
  await ready3d(pg);
  await cap('Two runners. One rotten city.', 'Punch, kick, shoot, cast, grab and throw');
  await play(150);
  // 3. a boss entrance
  await pg.evaluate(() => __cap.scene(1, ['blade', 'sec', 'drone'], { sp: true }));
  await ready3d(pg);
  await cap('', '');
  await play(55); // the boss card has the screen to itself
  await cap('Six districts. Six bosses.', '');
  await play(75);
  // 4. the Undercity Market and Mother Vesper
  await pg.evaluate(() => __cap.scene(3, ['vesper', 'thrall', 'thrall', 'ghoul']));
  await ready3d(pg);
  await cap('', '');
  await play(110);
  // 5. elites
  await pg.evaluate(() =>
    __cap.scene(4, ['mech', 'sec', 'ninja', 'riot'], {
      elite: ['armored', 'berserk', null, 'warded'],
      right: true
    })
  );
  await ready3d(pg);
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

// ---------- README pictures ----------
async function readme() {
  const pg = await page(1280, 720);
  await pg.evaluate(() => __cap.freeze());
  const snap = async (name, menu) => {
    await ready3d(pg);
    await pg.evaluate(menu => {
      document.getElementById('ov').style.display = menu ? '' : 'none';
      render();
    }, menu);
    await pg.waitForTimeout(250);
    await pg.screenshot({ path: join(MEDIA, name + '.png') });
    console.log('readme', name);
  };
  // the Den between districts, both runners and the locals
  await pg.evaluate(() => {
    G.pendArch = ['samurai', 'mage'];
    newRun(true);
    G.stage = 1;
    enterDen();
    setMode('den');
    G.fade = 0;
    G.banner = 0;
    PL.forEach((p, i) => {
      p.x = G.camX + 560 + i * 60;
      p.y = 222 + i * 16;
      p.face = i ? -1 : 1;
    });
    __cap.step(40);
    G.toasts = [];
    G.tip = null;
    render();
  });
  await snap('den');
  // the character sheet: Runner 2's skill trees
  await pg.evaluate(() => {
    for (const p of PL) {
      p.lvl = 6;
      p.spts = 3;
      p.pts = 2;
    }
    G.sheetIdx = 1;
    G.sheetTab = 'skills';
    G.ret = 'den';
    setMode('sheet');
  });
  await snap('skills', true);
  await pg.evaluate(() => {
    G.sheetTab = 'char';
    renderOv();
  });
  await snap('sheet', true);
  // a driving job: both runners on bikes, a biker alongside and traffic ahead
  await pg.evaluate(() => {
    G.pendArch = ['samurai', 'mage'];
    startDrive('causeway', true);
    G.fade = 0;
    G.banner = 0;
    for (let i = 0; i < 360; i++) {
      for (const p of PL) {
        INP[p.idx].held.right = true;
        p.hp = p.maxHp;
        if (p.bk) p.bk.crash = 0;
        if (p.state === 'down') setS(p, 'ride');
        p.inv = 0;
      }
      __cap.step(1);
    }
    G.toasts = [];
    G.tip = null;
  });
  await snap('drive');
  // a drone job: two drones in the dark, a camera sweeping, a guard on patrol
  await pg.evaluate(() => {
    G.pendArch = ['samurai', 'mage'];
    startStealth('arcology', true);
    G.fade = 0;
    G.banner = 0;
    for (let i = 0; i < 260; i++) {
      for (const p of PL) {
        INP[p.idx].held.right = i < 200;
        INP[p.idx].held.up = p.z < 76 + p.idx * 14;
        p.drone.seen = 0;
      }
      __cap.step(1);
    }
    G.salarm = 0;
    G.toasts = [];
    G.tip = null;
  });
  await snap('stealth');
  // a flight job: the VTOL over the towers, drones ahead
  await pg.evaluate(() => {
    G.pendArch = ['samurai', 'mage'];
    startFlight('skyline', true);
    G.fade = 0;
    G.banner = 0;
    for (let i = 0; i < 300; i++) {
      INP[0].held.punch = true;
      INP[0].held.up = i % 160 < 80;
      INP[0].held.down = i % 160 >= 80;
      G.fhull = 120;
      __cap.step(1);
    }
    G.toasts = [];
    G.tip = null;
  });
  await snap('flight');
  // the Codex
  await pg.evaluate(() => {
    G.ret = 'title';
    setMode('codex');
  });
  await snap('codex', true);
  // online co-op: the host's room code (a made-up one; the real ones come from the lobby)
  await pg.evaluate(() => {
    attract();
    netClose();
    NET.role = 'host';
    NET.status = 'offer';
    NET.room = 'K7Q2X';
    NET.code = 'CCT1z' + 'x'.repeat(400);
    setMode('online');
    __cap.step(30);
  });
  await snap('online-room', true);
  // and the friend's side: typing the code
  await pg.evaluate(() => {
    netClose();
    NET.role = 'guest';
    NET.status = 'paste';
    NET.draft = 'K7Q2X';
    renderOv();
  });
  await snap('online-join', true);
  await pg.close();
  // a looping cut of the trailer: the fights in the middle, small enough for a README
  const mp4 = join(OUT, 'trailer.mp4'),
    gif = join(MEDIA, 'trailer-preview.gif');
  try {
    execFileSync('ffmpeg', [
      '-y',
      '-loglevel',
      'error',
      '-ss',
      '3.2',
      '-t',
      '9',
      '-i',
      mp4,
      '-vf',
      // the 3D view's soft light compresses worse than flat art: fewer colours and frames keep it near 3 MB
      'fps=10,scale=520:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
      '-loop',
      '0',
      gif
    ]);
    console.log('readme trailer-preview.gif');
  } catch (e) {
    console.log('readme: no ffmpeg, skipped the trailer preview');
  }
}

// ---------- YouTube: a full trailer, a vertical Short, thumbnails ----------
// Clean gameplay clips are captured once (no captions), with every sound effect the game plays logged against
// the clip's clock. Each video is then cut from the clips, captions laid over in ffmpeg, and its soundtrack
// (the game's own sequencer and sound effects) rendered offline in an OfflineAudioContext, so it is in sync.
const YT = join(OUT, 'youtube');
const FPS = 30;
async function youtube() {
  // clips are cached in .work: YT_CLIPS=brawl,boss captures just those (run two at once on two cores),
  // YT_BUILD=1 skips capturing and builds from what's cached
  const TMP = join(YT, '.work');
  const PICK = (process.env.YT_CLIPS || '').split(',').filter(Boolean);
  const BUILD_ONLY = !!process.env.YT_BUILD;
  mkdirSync(TMP, { recursive: true });
  const css = readFileSync(join(ROOT, 'src/css/game.css'), 'utf8');
  const fontCss = (css.match(/@font-face\s*{[^}]*}/g) || [])
    .join('\n')
    .replace(
      /url\('\.\.\/fonts\/([^']+)'\)/g,
      (_, f) => `url('data:font/woff;base64,${readFileSync(join(ROOT, 'src/fonts', f)).toString('base64')}')`
    );
  const ff = args => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });

  // ---- 1. clips ----
  const pg = await page(1280, 720);
  await pg.evaluate(() => {
    __cap.freeze();
    __cap.noDom = true;
    __cap.cap = [];
    prefs.music = false; // the soundtrack is rendered offline
    prefs.sound = true;
    window.__ev = [];
    window.__vt = 0;
    A.ac = { currentTime: 0, state: 'running', resume() {} };
    A.tone = (f, d, type, v, slide) => __ev.push([__vt, 't', f, d, type || 'square', v || 0.06, slide || 0]);
    A.noise = (d, v, cut) => __ev.push([__vt, 'n', d, v || 0.12, cut || 2400]);
    A.muffle = () => {};
    // four runners, placed across the street
    __cap.crew = (si, foes, opts) => {
      G.pendN = 4;
      __cap.scene(si, foes, Object.assign({ arch: ['samurai', 'mage', 'gunslinger', 'runner'] }, opts));
      PL.forEach((p, i) => {
        p.x = G.camX + 120 + (i % 2) * 34;
        p.y = [192, 214, 236, 252][i];
      });
    };
  });
  const clips = {};
  // capture `frames` video frames; `setup` runs first, `drive` (optional) replaces the autopilot each logic step
  const clip = async (name, frames, setup, drive) => {
    const dir = join(TMP, name);
    if (PICK.length && !PICK.includes(name)) return; // another process captures this one
    if (BUILD_ONLY) {
      clips[name] = { dir, frames, ev: JSON.parse(readFileSync(join(dir, 'ev.json'), 'utf8')) };
      return;
    }
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    await pg.evaluate(setup);
    await ready3d(pg);
    // a string evaluated through the debugger protocol, so the game's CSP (no eval) doesn't apply
    await pg.evaluate(
      drive ? `window.__drive = function (i, k) { ${drive} }; 0` : 'window.__drive = null; 0'
    );
    await pg.evaluate(() => {
      __ev = [];
      __vt = 0;
    });
    for (let i = 0; i < frames; i++) {
      const url = await pg.evaluate(i => {
        for (let k = 0; k < 2; k++) {
          __vt = (i + k / 2) / 30;
          if (__drive) __drive(i, k);
          else __cap.auto();
          stepOnce();
          G.toasts = [];
        }
        return __cap.compose(1280, 720); // renders once
      }, i);
      writeFileSync(
        join(dir, `f${String(i).padStart(5, '0')}.jpg`),
        Buffer.from(url.split(',')[1], 'base64')
      );
    }
    clips[name] = { dir, frames, ev: await pg.evaluate(() => __ev) };
    writeFileSync(join(dir, 'ev.json'), JSON.stringify(clips[name].ev));
    console.log('youtube clip', name, frames);
  };
  await clip('brawl', 330, () =>
    __cap.crew(0, ['ganger', 'orc', 'ganger', 'hound', 'ganger', 'hound', 'ganger', 'orc'])
  );
  await clip('boss', 210, () => __cap.crew(1, ['blade', 'sec', 'drone', 'sec'], { sp: true }));
  await clip('vesper', 180, () => __cap.crew(3, ['vesper', 'thrall', 'thrall', 'ghoul', 'ghoul']));
  await clip('elites', 180, () =>
    __cap.crew(4, ['mech', 'sec', 'ninja', 'riot', 'sec'], {
      elite: ['armored', 'berserk', null, 'warded', null],
      right: true
    })
  );
  await clip('finale', 240, () => {
    __cap.crew(5, ['ganger', 'orc', 'sec', 'ninja', 'orc', 'hound', 'sec'], { sp: true });
    for (const p of PL) p.sp = 100;
  });
  await clip(
    'sprawl',
    150,
    () => {
      G.pendN = 4;
      G.pendArch = ['samurai', 'mage', 'gunslinger', 'runner'];
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
      PL.forEach((p, i) => {
        p.x = 80 + (i % 2) * 30;
        p.y = FY0 + 14 + i * 22;
        p.inv = 0;
      });
    },
    // the crew walks the block together
    `for (const p of PL) { const I = INP[p.idx]; I.held = { right: true }; I.pressed = {}; }
     if (G.world) worldTick();`
  );
  await clip(
    'drive',
    120,
    () => {
      G.pendN = 4;
      G.pendArch = ['samurai', 'mage', 'gunslinger', 'runner'];
      startDrive('causeway', true);
      G.fade = 0;
      G.banner = 0;
      for (let i = 0; i < 300; i++) {
        for (const p of PL) {
          INP[p.idx].held = { right: true };
          p.hp = p.maxHp;
          if (p.bk) p.bk.crash = 0;
          if (p.state === 'down') setS(p, 'ride');
        }
        stepOnce();
      }
      G.toasts = [];
      G.tip = null;
    },
    `for (const p of PL) { const I = INP[p.idx]; I.held = { right: true }; I.pressed = {};
       if ((i + p.idx * 7) % 40 === 0) I.pressed.dodge = true;
       if ((i + p.idx * 11) % 25 === 0) I.pressed.punch = true;
       p.hp = Math.max(p.hp, p.maxHp * 0.6); if (p.bk) p.bk.crash = 0; if (p.state === 'down') setS(p, 'ride'); }`
  );
  await clip(
    'flight',
    120,
    () => {
      G.pendN = 2;
      G.pendArch = ['samurai', 'mage'];
      startFlight('skyline', true);
      G.fade = 0;
      G.banner = 0;
      for (let i = 0; i < 240; i++) {
        INP[0].held = { punch: true, up: i % 160 < 80, down: i % 160 >= 80 };
        G.fhull = 120;
        stepOnce();
      }
      G.toasts = [];
      G.tip = null;
    },
    `INP[0].held = { punch: true, up: i % 120 < 60, down: i % 120 >= 60 }; INP[0].pressed = {};
     if (INP[1]) { INP[1].held = { punch: true }; INP[1].pressed = {}; } G.fhull = 120;`
  );
  await clip(
    'stealth',
    105,
    () => {
      G.pendN = 2;
      G.pendArch = ['samurai', 'mage'];
      startStealth('arcology', true);
      G.fade = 0;
      G.banner = 0;
      for (let i = 0; i < 120; i++) {
        for (const p of PL) {
          INP[p.idx].held = { right: true, up: p.z < 76 + p.idx * 14 };
          p.drone.seen = 0;
        }
        stepOnce();
      }
      G.toasts = [];
      G.tip = null;
    },
    `for (const p of PL) { INP[p.idx].held = { right: i < 100, up: p.z < 76 + p.idx * 14 }; INP[p.idx].pressed = {}; p.drone.seen = 0; }
     G.salarm = 0;`
  );
  if (PICK.length && !PICK.includes('online')) {
    await pg.close();
    return;
  }
  // the host's online room card, as a still (a made-up code; real ones come from the lobby)
  if (!BUILD_ONLY)
    await pg.evaluate(() => {
      attract();
      netClose();
      NET.role = 'host';
      NET.status = 'offer';
      NET.room = 'K7Q2X';
      NET.code = 'CCT1z' + 'x'.repeat(400);
      setMode('online');
      document.getElementById('ov').style.display = '';
      __cap.step(20);
    });
  if (!BUILD_ONLY) {
    await pg.waitForTimeout(300);
    await pg.screenshot({ path: join(TMP, 'online.jpg'), type: 'jpeg', quality: 92 });
  }
  await pg.close();
  if (PICK.length) return;

  // ---- 2. cards and caption overlays, drawn as HTML in the game's own type ----
  const html = async (file, w, h, body, extra, transparent) => {
    const c = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await c.setContent(`<!doctype html><html><head><style>${fontCss}
      *{box-sizing:border-box}body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:${transparent ? 'transparent' : '#0c0a14'};font-family:'Chakra Petch',sans-serif;color:#e9e4f5}
      .wm{display:flex;flex-direction:column;align-items:flex-start;font-family:Teko,Impact,sans-serif;font-weight:600;text-transform:uppercase;line-height:.82}
      .city{color:#efe9ff;text-shadow:-4px 0 #ff3d8b,4px 0 #45d2ff}
      .bar{background:#ff3d8b;color:#0c0a14;letter-spacing:.14em}
      .cap{position:absolute;left:0;right:0;text-align:center;font-family:Teko,Impact,sans-serif;font-weight:600;text-transform:uppercase;color:#efe9ff;
        text-shadow:0 3px 0 #0c0a14,0 0 24px #0c0a14,0 0 48px #0c0a14;line-height:.92}
      .sub{font-family:'Chakra Petch',sans-serif;font-weight:500;text-transform:none;color:#d6cff0;line-height:1.25;margin-top:.35em}
      .pink{color:#ff3d8b}.cyan{color:#45d2ff}.gold{color:#ffc63d}
      ${extra || ''}</style></head><body>${body}</body></html>`);
    await c.evaluate(() => document.fonts.ready);
    await c.waitForTimeout(150);
    await c.screenshot({ path: file, omitBackground: !!transparent });
    await c.close();
  };
  const capH = (t, sub, w, h, size, top) =>
    `<div class="cap" style="top:${top}px;font-size:${size}px;padding:0 ${Math.round(w * 0.06)}px">${t}${
      sub ? `<div class="sub" style="font-size:${Math.round(size * 0.3)}px">${sub}</div>` : ''
    }</div>`;
  const wm = big =>
    `<div class="wm" style="gap:${Math.round(big * 0.07)}px"><div class="city" style="font-size:${big}px">Cyber City</div><div class="bar" style="font-size:${Math.round(big * 0.56)}px;padding:${Math.round(big * 0.08)}px ${Math.round(big * 0.24)}px 0">Tactics</div></div>`;
  const onlineB64 = readFileSync(join(TMP, 'online.jpg')).toString('base64');

  // a video made of segments; each segment is a clip range, a held card, or the online still
  const build = async (name, w, h, segs, song) => {
    const parts = [];
    let t0 = 0;
    const events = [];
    for (let si = 0; si < segs.length; si++) {
      const s = segs[si];
      const out = join(TMP, `${name}-${si}.mp4`);
      const dur = s.dur || (s.to - s.from) / FPS;
      let ov = null;
      if (s.cap) {
        ov = join(TMP, `${name}-${si}-cap.png`);
        await html(ov, w, h, s.cap, '', true);
      }
      if (s.card) {
        const png = join(TMP, `${name}-${si}-card.png`);
        await html(png, w, h, s.card, s.cardCss);
        ff([
          '-framerate',
          '30',
          '-i',
          png,
          '-vf',
          `format=yuv420p,loop=-1:1,trim=duration=${dur},fade=t=in:st=0:d=0.35${s.fadeOut ? `,fade=t=out:st=${dur - 0.6}:d=0.6` : ''}`,
          '-c:v',
          'libx264',
          '-crf',
          '18',
          '-preset',
          'veryfast',
          '-pix_fmt',
          'yuv420p',
          '-r',
          '30',
          out + '.tmp.mp4'
        ]);
      } else {
        const c = clips[s.clip];
        const fit =
          w > h
            ? `scale=${w}:${h}:flags=lanczos`
            : // vertical: a blurred fill behind a square-ish crop of the action
              `split[a][b];[a]scale=-2:${h},crop=${w}:${h},boxblur=24:2,eq=brightness=-0.18[bg];[b]crop=900:720,scale=${w}:${Math.round((w * 720) / 900)}:flags=lanczos[fg];[bg][fg]overlay=0:${Math.round(h * 0.29)}`;
        const args = ['-framerate', '30', '-start_number', String(s.from), '-i', join(c.dir, 'f%05d.jpg')];
        if (ov) args.push('-i', ov);
        const chain = `[0:v]${fit}[v0];` + (ov ? `[v0][1:v]overlay=0:0[v1]` : `[v0]null[v1]`);
        args.push(
          '-filter_complex',
          chain + `;[v1]format=yuv420p${s.fadeIn ? ',fade=t=in:st=0:d=0.3' : ''}[v]`,
          '-map',
          '[v]',
          '-frames:v',
          String(s.to - s.from),
          '-c:v',
          'libx264',
          '-crf',
          '18',
          '-preset',
          'veryfast',
          '-pix_fmt',
          'yuv420p',
          '-r',
          '30',
          out + '.tmp.mp4'
        );
        ff(args);
        for (const e of c.ev) {
          const et = e[0] - s.from / FPS;
          if (et >= 0 && et < dur) events.push([t0 + et, ...e.slice(1)]);
        }
      }
      execFileSync('mv', [out + '.tmp.mp4', out]);
      parts.push(out);
      t0 += dur;
    }
    const list = join(TMP, `${name}.txt`);
    writeFileSync(list, parts.map(p => `file '${p}'`).join('\n'));
    const silent = join(TMP, `${name}-v.mp4`);
    ff(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);
    // the soundtrack: the game's sequencer and its sound effects, rendered offline
    const ap = await page(320, 180);
    const wav = await ap.evaluate(
      async ([dur, events, song, endSong]) => {
        prefs.music = false;
        prefs.sound = false;
        const sr = 44100,
          ac = new OfflineAudioContext(2, Math.ceil(sr * (dur + 0.5)), sr);
        A.ac = ac;
        A.master = ac.createGain();
        A.master.gain.value = 0.8;
        A.master.connect(ac.destination);
        const mus = ac.createGain();
        mus.gain.value = 0.55;
        mus.connect(ac.destination);
        let last = -1;
        for (const e of events) {
          if (e[0] - last < 0.02 && e[1] === 'n') continue; // thin out stacked noise bursts
          if (e[1] === 't') A.osc(A.master, e[2], e[0], e[3], e[4], e[5], e[6] || 0);
          else A.nz(A.master, e[0], e[2], e[3], e[4]);
          last = e[0];
        }
        // the music: one song for the action, the title theme under the end card, faded in and out
        const seq = (S, from, to, out) => {
          const spb = 60 / S.bpm / 4;
          for (let st = 0, t = from; t < to; st++, t += spb) {
            const s16 = st % 16,
              bar = Math.floor(st / 16) % S.prog.length,
              root = S.root + S.prog[bar];
            const b = S.bass[s16];
            if (b && b !== '.')
              A.osc(out, midi(root - 12 + ({ r: 0, f: 7, o: 12 }[b] || 0)), t, spb * 1.7, 'triangle', 0.11);
            const ar = S.arp[s16];
            if (ar && ar !== '.') A.osc(out, midi(root + 12 + MINOR[+ar]), t, spb * 0.8, 'square', 0.022);
            const L = S.lead[st % S.lead.length];
            if (L && L !== '.') A.osc(out, midi(root + 24 + MINOR[+L]), t, spb * 2.2, 'square', 0.03);
            if (S.kick[s16] === 'x') A.osc(out, 140, t, 0.14, 'sine', 0.35, -100);
            if (S.snare[s16] === 's') A.nz(out, t, 0.12, 0.12, 1800);
            if (S.hat[s16] === 'h') A.nz(out, t, 0.03, 0.04, 7000, true);
          }
        };
        const g1 = ac.createGain(),
          g2 = ac.createGain();
        g1.connect(mus);
        g2.connect(mus);
        const endAt = Math.max(0, dur - endSong);
        g1.gain.setValueAtTime(0, 0);
        g1.gain.linearRampToValueAtTime(1, 0.4);
        g1.gain.setValueAtTime(1, Math.max(0.5, endAt - 0.4));
        g1.gain.linearRampToValueAtTime(0, endAt + 0.2);
        seq(SONGS[song], 0, endAt + 0.3, g1);
        if (endSong > 0) {
          g2.gain.setValueAtTime(0, endAt);
          g2.gain.linearRampToValueAtTime(1, endAt + 0.4);
          g2.gain.setValueAtTime(1, dur - 1.2);
          g2.gain.linearRampToValueAtTime(0, dur);
          seq(SONGS.title, endAt, dur, g2);
        }
        const buf = await ac.startRendering();
        // 16-bit WAV
        const n = buf.length,
          L = buf.getChannelData(0),
          R = buf.getChannelData(1),
          dv = new DataView(new ArrayBuffer(44 + n * 4));
        const w = (o, s) => [...s].forEach((ch, i) => dv.setUint8(o + i, ch.charCodeAt(0)));
        w(0, 'RIFF');
        dv.setUint32(4, 36 + n * 4, true);
        w(8, 'WAVEfmt ');
        dv.setUint32(16, 16, true);
        dv.setUint16(20, 1, true);
        dv.setUint16(22, 2, true);
        dv.setUint32(24, sr, true);
        dv.setUint32(28, sr * 4, true);
        dv.setUint16(32, 4, true);
        dv.setUint16(34, 16, true);
        w(36, 'data');
        dv.setUint32(40, n * 4, true);
        for (let i = 0; i < n; i++) {
          dv.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true);
          dv.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true);
        }
        let s = '';
        const u8 = new Uint8Array(dv.buffer);
        for (let i = 0; i < u8.length; i += 32768)
          s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
        return btoa(s);
      },
      [t0, events, song, segs[segs.length - 1].card ? segs[segs.length - 1].dur : 0]
    );
    await ap.close();
    const wavF = join(TMP, `${name}.wav`);
    writeFileSync(wavF, Buffer.from(wav, 'base64'));
    const out = join(YT, `${name}.mp4`);
    ff([
      '-i',
      silent,
      '-i',
      wavF,
      '-map',
      '0:v',
      '-map',
      '1:a',
      '-c:v',
      'copy',
      '-af',
      'loudnorm=I=-14:TP=-1.5:LRA=11',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-ar',
      '48000',
      '-shortest',
      '-movflags',
      '+faststart',
      out + '.tmp.mp4'
    ]);
    execFileSync('mv', [out + '.tmp.mp4', out]);
    console.log('youtube', name, t0.toFixed(1) + 's');
  };

  // ---- 3. the trailer (1920x1080, about 75 s) ----
  const W1 = 1920,
    H1 = 1080;
  const c1 = (t, sub) => capH(t, sub, W1, H1, 112, 300);
  const onlineCard = (w, h, title, size) =>
    `<div style="position:absolute;inset:0;background:url(data:image/jpeg;base64,${onlineB64}) center/cover;filter:brightness(.55)"></div>` +
    capH(
      title,
      'Host a game, share the code, and up to three friends drop in, mid-run if they like.',
      w,
      h,
      size,
      Math.round(h * 0.07)
    );
  await build(
    'cyber-city-tactics-trailer',
    W1,
    H1,
    [
      { clip: 'brawl', from: 0, to: 96, cap: c1('Four runners.<br>One rotten city.'), fadeIn: true },
      {
        card: `<div style="position:absolute;left:150px;top:50%;transform:translateY(-55%)">${wm(260)}<div style="margin-top:40px;font-size:40px;color:#a79dc2">Seattle, 2079 · a neon brawler RPG for 1–4 players</div></div>`,
        dur: 3
      },
      {
        clip: 'brawl',
        from: 96,
        to: 330,
        cap: c1(
          'Punch. Kick. Grab. Throw.',
          'Fights in the spirit of River City Ransom and Double Dragon, now in 3D'
        )
      },
      { clip: 'boss', from: 0, to: 66 }, // the boss card has the screen to itself
      { clip: 'boss', from: 66, to: 210, cap: c1('Six districts. Six bosses.') },
      { clip: 'vesper', from: 0, to: 180, cap: c1('Ghoul markets. Spirits. A dragon.') },
      { clip: 'elites', from: 0, to: 180, cap: c1('Choose who you hurt.', 'Two choices change the ending') },
      {
        clip: 'sprawl',
        from: 0,
        to: 150,
        cap: c1(
          'An open-world Sprawl',
          'Doors to crack, cops, heat, a black market, and a city that remembers'
        )
      },
      { clip: 'drive', from: 0, to: 120, cap: c1('Bike chases') },
      { clip: 'flight', from: 0, to: 120, cap: c1('VTOL runs over the skyline') },
      { clip: 'stealth', from: 0, to: 105, cap: c1('Drone stealth') },
      { card: onlineCard(W1, H1, 'Couch or online.<br>One five-letter code.', 104), dur: 4.5 },
      {
        clip: 'finale',
        from: 0,
        to: 240,
        cap: c1('Pile on for a<br><span class="pink">FULL CREW</span> finisher')
      },
      {
        card: `<div style="position:absolute;left:150px;top:50%;transform:translateY(-55%)">${wm(220)}
          <div style="margin-top:44px;font-size:46px;color:#efe9ff">Free in your browser.</div>
          <div style="margin-top:10px;font-size:32px;color:#a79dc2">No account, no ads. Phones, laptops and TVs. Installs and plays offline.</div>
          <div style="margin-top:40px;font-size:40px" class="gold">cptnope.itch.io/cyber-city-tactics</div></div>`,
        dur: 6,
        fadeOut: true
      }
    ],
    'd1'
  );

  // ---- 4. the Short (1080x1920, about 33 s) ----
  const W2 = 1080,
    H2 = 1920;
  const c2 = (t, sub) => capH(t, sub, W2, H2, 120, 180);
  const foot = `<div style="position:absolute;left:0;right:0;bottom:250px;display:flex;justify-content:center">${wm(92)}</div>`;
  const cs = (t, sub) => c2(t, sub) + foot;
  await build(
    'cyber-city-tactics-short',
    W2,
    H2,
    [
      {
        clip: 'brawl',
        from: 30,
        to: 120,
        cap: cs('A 4-player brawler<br><span class="pink">in your browser</span>'),
        fadeIn: true
      },
      { clip: 'brawl', from: 150, to: 270, cap: cs('Grab. Throw.<br>Pile drive.') },
      { clip: 'boss', from: 40, to: 150, cap: cs('Six bosses') },
      { clip: 'finale', from: 60, to: 210, cap: cs('Team up for a<br><span class="pink">FULL CREW</span>') },
      { clip: 'drive', from: 0, to: 75, cap: cs('Bike chases') },
      { clip: 'flight', from: 20, to: 95, cap: cs('VTOL runs') },
      { clip: 'elites', from: 30, to: 120, cap: cs('Couch or online', 'One five-letter room code') },
      {
        card: `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 70px">${wm(170)}
          <div style="margin-top:60px;font-size:64px;color:#efe9ff">Free. No download.</div>
          <div style="margin-top:16px;font-size:40px;color:#a79dc2">Play it on itch.io</div>
          <div style="margin-top:30px;font-size:38px" class="gold">cptnope.itch.io/<br>cyber-city-tactics</div></div>`,
        cardCss: '.wm{align-items:center}',
        dur: 4,
        fadeOut: true
      }
    ],
    'd5'
  );

  // ---- 5. thumbnails ----
  const frameB64 = (c, i) =>
    readFileSync(join(clips[c].dir, `f${String(i).padStart(5, '0')}.jpg`)).toString('base64');
  const thumbBg = (c, i, pos) =>
    `<div style="position:absolute;inset:0;background:url(data:image/jpeg;base64,${frameB64(c, i)}) ${pos || 'center'}/cover"></div>`;
  await html(
    join(YT, 'thumbnail-trailer.png'),
    1280,
    720,
    thumbBg('finale', 150, '65% center') +
      `<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(12,10,20,.95) 0%,rgba(12,10,20,.75) 42%,rgba(12,10,20,0) 72%)"></div>
       <div style="position:absolute;left:56px;top:54px">${wm(118)}</div>
       <div class="cap" style="text-align:left;left:56px;right:auto;top:300px;font-size:150px">4-Player<br><span class="pink">Brawler</span></div>
       <div style="position:absolute;left:58px;bottom:44px;background:#ffc63d;color:#0c0a14;font:600 34px 'Chakra Petch';padding:8px 20px 6px;letter-spacing:.04em">FREE · PLAY IN YOUR BROWSER</div>`
  );
  await html(
    join(YT, 'thumbnail-short.png'),
    1080,
    1920,
    `<div style="position:absolute;inset:0;background:url(data:image/jpeg;base64,${frameB64('finale', 150)}) center/cover;filter:blur(18px) brightness(.45)"></div>
     <div style="position:absolute;left:0;right:0;top:560px;height:864px;background:url(data:image/jpeg;base64,${frameB64('finale', 150)}) center/cover"></div>
     <div class="cap" style="top:170px;font-size:150px">4-Player<br><span class="pink">Brawler</span></div>
     <div style="position:absolute;left:0;right:0;bottom:240px;display:flex;justify-content:center">${wm(110)}</div>
     <div style="position:absolute;left:0;right:0;bottom:130px;text-align:center"><span style="background:#ffc63d;color:#0c0a14;font:600 40px 'Chakra Petch';padding:8px 22px 6px">FREE IN YOUR BROWSER</span></div>`,
    '.wm{align-items:center}'
  );
  // a channel-style alternative: the boss entrance
  await html(
    join(YT, 'thumbnail-alt.png'),
    1280,
    720,
    thumbBg('boss', 70, 'center') +
      `<div style="position:absolute;inset:0;background:linear-gradient(0deg,rgba(12,10,20,.95) 0%,rgba(12,10,20,.2) 55%,rgba(12,10,20,0) 100%)"></div>
       <div class="cap" style="bottom:120px;top:auto;font-size:132px">Six districts.<br><span class="cyan">Six bosses.</span></div>
       <div style="position:absolute;right:40px;top:36px">${wm(64)}</div>`
  );
  console.log('youtube thumbnails (clips stay cached in docs/store/youtube/.work until you delete it)');
}

if (want('stills')) await stills();
if (want('cards')) await cards();
if (want('video')) await trailer();
if (want('readme')) await readme();
if (ONLY.includes('youtube')) await youtube();
await browser.close();
