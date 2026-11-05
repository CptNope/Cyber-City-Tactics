/* Security guards: untrusted text from saves and the network is defused, the Content Security Policy is strict
 * (and the single-file build's matches its one script), no inline handlers or eval anywhere, the game only
 * talks to its own lobby, the service worker stays in its own folder and caches, and CI stays locked down. */
'use strict';
require('./harness');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const XSS = 'Vex<img src=x onerror=alert(1)>"`';

/* ---------- saves ---------- */
localStorage.setItem(
  'cs_probe',
  JSON.stringify({ name: XSS, list: [{ n: '<script>' }], keep: "King's Boomstick" })
);
const got = A.store.get('cs_probe');
ok(
  !/[<>"`]/.test(got.name) && got.list[0].n === 'script',
  'a stored string loses < > " and backticks, however deep'
);
ok(got.keep === "King's Boomstick", 'and ordinary names (apostrophes too) come through untouched');
localStorage.removeItem('cs_probe');
// a doctored campaign save: the runner's name must never reach the page as markup
A.prefs.tips = false;
G.pendArch = ['samurai', 'runner'];
A.newRun(false);
A.saveGame('den');
const sv = JSON.parse(localStorage.getItem('cs_save3'));
sv.runners[0].name = XSS;
sv.party.bag = [{ slot: 'weapon', base: 'pipe', name: XSS, rar: 0, dmg: 5 }];
localStorage.setItem('cs_save3', JSON.stringify(sv));
A.loadGame(A.store.load('cs_save3'));
G.sheetIdx = 0;
G.sheetTab = 'char';
A.setMode('sheet');
ok(
  !/<img/i.test(els.ov._h) && !/onerror/.test(els.ov._h.replace(/onerror=alert/g, 'X')) === true,
  'a doctored save’s names reach the sheet without markup'
);
ok(!/<img src=x/.test(els.ov._h), 'no injected tag on the character sheet');
G.sheetTab = 'gear';
A.renderOv();
ok(!/<img src=x/.test(els.ov._h), 'nor in the bag');
A.setMode('title');

/* ---------- the network ---------- */
const NET = A.NET;
NET.role = 'guest';
NET.q = [];
NET.waitFull = false;
A.netRecv(
  JSON.stringify({
    k: 's',
    f: 1,
    e: [[1, { kind: 'ganger', name: XSS }]],
    o: [1],
    pl: [],
    g: { tip: { s: XSS } },
    pr: []
  })
);
const snap = NET.q[0];
ok(
  snap && !/[<>"`]/.test(snap.e[0][1].name) && !/[<>]/.test(snap.g.tip.s),
  'strings in a snapshot from the host are defused too'
);
NET.q = [];
A.netRecv('{"k":"s","pad":"' + 'x'.repeat((1 << 20) + 10) + '"}');
ok(!NET.q.length, 'a message over a megabyte is dropped unread');
NET.role = null;
ok(
  A.netLobbyOk(A.NET_LOBBY) && A.netLobbyOk('http://localhost:8787'),
  'the game talks to its own lobby, or a local one'
);
ok(
  !A.netLobbyOk('https://cct-lobby.attacker.workers.dev') &&
    !A.netLobbyOk('https://user:pw@' + A.NET_LOBBY.slice(8)),
  'never another lobby, even one named like it'
);

/* ---------- the page ---------- */
const index = read('index.html');
const csp = (index.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
const dir = name =>
  (
    csp
      .split(';')
      .map(s => s.trim())
      .find(s => s.startsWith(name + ' ')) || ''
  )
    .split(/\s+/)
    .slice(1);
ok(csp, 'the page has a Content Security Policy');
ok(dir('script-src').join(' ') === "'self'", 'scripts: only the site’s own files (no inline, no eval)');
ok(
  dir('object-src').includes("'none'") &&
    dir('base-uri').includes("'self'") &&
    dir('form-action').includes("'none'"),
  'no plugins, no base tag tricks, no form posts'
);
ok(
  dir('connect-src').every(s =>
    /^('self'|https:\/\/cct-lobby\.[a-z0-9-]+\.workers\.dev|http:\/\/(localhost|127\.0\.0\.1):\*)$/.test(s)
  ),
  'connections: the site, the lobby, and localhost for development only'
);
ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(index), 'no inline scripts in the page');
const srcFiles = [];
const walk = d => {
  for (const f of fs.readdirSync(path.join(ROOT, d))) {
    const p = path.join(d, f);
    if (fs.statSync(path.join(ROOT, p)).isDirectory()) walk(p);
    else if (p.endsWith('.js')) srcFiles.push(p);
  }
};
walk('src/js');
const inline = srcFiles.filter(f =>
  /\son(click|load|error|mouse\w+|key\w+|focus|blur|change|input|submit)=["']/.test(read(f))
);
ok(
  !inline.length,
  'no inline event handlers in any template' + (inline.length ? ': ' + inline.join(', ') : '')
);
const evals = srcFiles
  .concat(['sw.js'])
  .filter(f => /\beval\(|new Function\(|setTimeout\(\s*['"`]|setInterval\(\s*['"`]/.test(read(f)));
ok(!evals.length, 'no eval, new Function or string timers' + (evals.length ? ': ' + evals.join(', ') : ''));
// the single-file build: its CSP names its one inline script by hash
const dist = read('dist/cyber-city-tactics.html');
const dcsp = (dist.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
const body = (dist.match(/<script>([\s\S]*?)<\/script>/) || [])[1];
const hash =
  "'sha256-" +
  crypto
    .createHash('sha256')
    .update(body || '')
    .digest('base64') +
  "'";
ok(
  dcsp.includes('script-src ' + hash) && !/unsafe-inline'[^;]*script|script-src[^;]*unsafe/.test(dcsp),
  'the single file allows exactly its own script, by hash'
);

/* ---------- the service worker ---------- */
const sw = read('sw.js');
ok(!/https?:\/\//.test(sw.replace(/\/\/.*$/gm, '')), 'the service worker fetches nothing from other sites');
ok(
  /registration\.scope/.test(sw) && !/caches\.match\(/.test(sw.replace(/\/\/.*$/gm, '')),
  'and serves only its own folder, from its own caches'
);

/* ---------- the repository ---------- */
const ci = read('.github/workflows/ci.yml'),
  wiki = read('.github/workflows/wiki.yml'),
  codeql = read('.github/workflows/codeql.yml');
ok(/permissions:\s*\n\s*contents: read/.test(ci), 'CI runs with read-only permissions');
const uses = (ci + wiki + codeql).match(/uses: [^\s]+/g) || [];
ok(uses.length && uses.every(u => /@[0-9a-f]{40}$/.test(u)), 'every GitHub Action is pinned to a commit');
const pkg = JSON.parse(read('package.json'));
ok(
  Object.values(pkg.devDependencies).every(v => /^\d+\.\d+\.\d+$/.test(v)),
  'dev tools pinned to exact versions'
);
ok(/--ignore-scripts/.test(ci), 'and installed without running install scripts');
ok(
  fs.existsSync(path.join(ROOT, 'SECURITY.md')) && fs.existsSync(path.join(ROOT, '.github/dependabot.yml')),
  'a security policy and Dependabot'
);

/* ---------- CodeQL's findings, kept fixed ---------- */
const ids = new Set();
for (let i = 0; i < 200; i++) ids.add(A.newUid());
ok(
  ids.size === 200 && [...ids].every(u => /^[0-9a-z]{7}$/.test(u)),
  'item ids come from the crypto source, seven characters, unique'
);
ok(
  /getRandomValues/.test(read('src/js/core/utils.js')) &&
    !/uid: Math\.random/.test(read('src/js/data/gear.js')),
  'and not from Math.random'
);
(async () => {
  let refused = 0;
  for (const p of [
    '//evil.example/x',
    '/rooms/../../x',
    '/rooms/ABCDE/answer?key=<x>',
    'https://evil.example'
  ])
    await A.lobby(p).catch(() => refused++);
  ok(refused === 4, 'the lobby client refuses any request that isn’t one of its own');
})();
ok(
  /event\.source/.test(sw) && /self\.location\.origin/.test(sw),
  'the service worker only takes orders from its own pages'
);
ok(
  /startsWith\(ROOT \+ sep\)/.test(read('tools/serve.mjs')),
  'the dev server can’t be walked out of the project folder'
);
