#!/usr/bin/env node
/* Runs every headless test and prints a summary.
 *
 *   npm test            all tests, including the two long bot playthroughs (a few minutes)
 *   npm run test:quick  skip the bot playthroughs
 *
 * A test passes when it exits cleanly, prints no "FAIL" line, and its output matches what's expected below.
 * Bot tests play the game with a simple AI; they can lose an unlucky fight, so they get one retry.
 */
'use strict';
const { spawnSync } = require('child_process');
const path = require('path');

const quick = process.argv.includes('--quick');
const TESTS = [
  {
    file: 'mechanics',
    expect: [
      /roll: state roll hp (\d+) -> \1/,
      /riot vs kick: hp -> \d+ state hurt/,
      /spirit vs bullet: hp 40 -> 40/,
      /combo now 5/
    ]
  },
  {
    file: 'companions',
    expect: [
      /brick +vs ganger: ganger dead/,
      /drone +vs ganger: ganger dead/,
      /ember +vs ganger: ganger dead/,
      /ember carried into district 2: true/,
      /after orc hit: shield \d+ hp (\d+) -> \1/
    ]
  },
  {
    file: 'specials',
    expect: [
      /Blade Dance: .*dead/,
      /Mana Storm: orcs hp 0\/\d+/,
      /punch\+kick special fired: true/,
      /glitch split into 2 minis/,
      /beam vs rolling runner: hp (\d+) -> \1/
    ]
  },
  {
    file: 'weekly',
    expect: [
      /waves identical across runs: true \| perks identical: true/,
      /open arena runs differ: true/,
      /share: Cyber City Tactics Arena/
    ]
  },
  {
    file: 'training',
    expect: [
      /final mode: trained/,
      /district 3 rematch: Gutter King, chromed/,
      /district 4 rematch: The Hollow Saint, reborn/,
      /district 6 rematch: Voss\.exe/
    ]
  },
  { file: 'sprawl', minPass: 28 },
  { file: 'sprawl-coop', minPass: 5, retries: 2 },
  { file: 'skills-gear', minPass: 35 },
  { file: 'legend', minPass: 41 },
  { file: 'content', minPass: 37 },
  { file: 'pwa', minPass: 12 },
  { file: 'expansion', minPass: 155 },
  { file: 'timing', minPass: 27 },
  { file: 'screen', minPass: 20 },
  { file: 'graphics', minPass: 38 },
  { file: 'lobby', minPass: 31 },
  { file: 'drive', minPass: 36 },
  { file: 'sidejob', minPass: 18 },
  { file: 'chrome', minPass: 36 },
  { file: 'streetfoes', minPass: 15 },
  { file: 'stealth', minPass: 44 },
  { file: 'flight', minPass: 34 },
  { file: 'shop', minPass: 41 },
  { file: 'blackmarket', minPass: 9 },
  { file: 'market', minPass: 15 },
  { file: 'choices', minPass: 17 },
  { file: 'campaign-bot', slow: true, retries: 1, expect: [/^WIN /m, /overlays ok/] },
  {
    file: 'arena-bot',
    slow: true,
    retries: 1,
    expect: [/ARENA OVER wave (1\d|[2-9]\d)|REACHED wave \d+/, /overlays ok/]
  }
];

let failed = 0;
const t0 = Date.now();
for (const t of TESTS) {
  if (quick && t.slow) {
    console.log(`  skip  ${t.file}`);
    continue;
  }
  let res, why;
  for (let attempt = 0; attempt <= (t.retries || 0); attempt++) {
    const r = spawnSync(process.execPath, [path.join(__dirname, t.file + '.test.js')], {
      encoding: 'utf8',
      timeout: 600000
    });
    const out = (r.stdout || '') + (r.stderr || '');
    const passes = (out.match(/^PASS /gm) || []).length;
    const fails = out.match(/^FAIL .*/gm) || [];
    why =
      r.status !== 0
        ? 'exited with ' + r.status + '\n' + out.split('\n').slice(-8).join('\n')
        : fails.length
          ? fails.join('\n')
          : t.minPass && passes < t.minPass
            ? `only ${passes}/${t.minPass} checks passed`
            : (t.expect || [])
                .filter(re => !re.test(out))
                .map(re => 'missing ' + re)
                .join('\n');
    res = { passes, ok: !why };
    if (res.ok) break;
  }
  if (res.ok) console.log(`  ok    ${t.file}${res.passes ? ` (${res.passes} checks)` : ''}`);
  else {
    failed++;
    console.log(`  FAIL  ${t.file}\n${why.replace(/^/gm, '        ')}`);
  }
}
console.log(`\n${failed ? failed + ' failed' : 'All passed'} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
process.exit(failed ? 1 : 0);
