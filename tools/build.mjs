#!/usr/bin/env node
/* Cyber City Tactics build. No dependencies: plain Node 18+.
 *
 *   node tools/build.mjs                       update the generated files (run before every commit)
 *   node tools/build.mjs --check               exit 1 if any generated file is out of date (for CI)
 *   node tools/build.mjs --fragment <file>     also write a single-file fragment for the claude.ai preview
 *
 * What it generates:
 *   src/js/version.js            APP_VERSION, shown in Settings
 *   sw.js (BUILD:MANIFEST block)  the precache list and a VERSION hash of every precached file
 *   dist/cyber-city-tactics.html  the whole game in one HTML file (handy to share or play from disk)
 *
 * The source of truth for which scripts load, and in what order, is the BUILD:SCRIPTS block in index.html.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const fragIdx = args.indexOf('--fragment');
const FRAGMENT = fragIdx >= 0 ? args[fragIdx + 1] : null;

const read = p => readFileSync(join(ROOT, p), 'utf8');
const pkg = JSON.parse(read('package.json'));
const index = read('index.html');

// ---- what the page loads ----
const block = index.match(/<!-- BUILD:SCRIPTS -->([\s\S]*?)<!-- \/BUILD:SCRIPTS -->/);
if (!block) throw new Error('index.html is missing the BUILD:SCRIPTS block');
const scripts = [...block[1].matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const styles = [...index.matchAll(/<link rel="stylesheet" href="((?!https?:)[^"]+)">/g)].map(m => m[1]);
const manifest = JSON.parse(read('manifest.webmanifest'));
const icons = new Set(['icons/apple-touch-icon.png', 'icons/favicon-32.png']);
for (const i of manifest.icons || []) icons.add(i.src);
for (const s of manifest.shortcuts || []) for (const i of s.icons || []) icons.add(i.src);
for (const f of [...scripts, ...styles, ...icons])
  if (!existsSync(join(ROOT, f))) throw new Error('missing file: ' + f);

// ---- version: a hash of everything the service worker precaches (except version.js, which holds it) ----
const precache = ['./', 'index.html', 'manifest.webmanifest', ...styles, ...scripts, ...icons];
const h = createHash('sha256');
for (const f of precache) {
  if (f === './' || f === 'src/js/version.js') continue;
  h.update(f + '\0');
  h.update(readFileSync(join(ROOT, f)));
}
const hash = h.digest('hex').slice(0, 12);
const appVersion = `${pkg.version}+${hash.slice(0, 7)}`;

const outputs = {};
outputs['src/js/version.js'] = `/* Cyber City Tactics · src/js/version.js
 * Written by tools/build.mjs. Do not edit by hand. */
'use strict';
const APP_VERSION = '${appVersion}';
`;

const sw = read('sw.js');
const swBlock = `/* BUILD:MANIFEST */
const VERSION = '${hash}';
const PRECACHE = [
${precache.map(f => `  '${f}'`).join(',\n')}
];
/* /BUILD:MANIFEST */`;
if (!/\/\* BUILD:MANIFEST \*\/[\s\S]*?\/\* \/BUILD:MANIFEST \*\//.test(sw))
  throw new Error('sw.js is missing the BUILD:MANIFEST block');
outputs['sw.js'] = sw.replace(/\/\* BUILD:MANIFEST \*\/[\s\S]*?\/\* \/BUILD:MANIFEST \*\//, swBlock);

// ---- single-file bundle ----
// All scripts go inside one function, so nothing leaks into the page's global scope, and BUNDLED tells
// src/js/pwa.js not to register a service worker (there are no separate files to cache).
const js = scripts
  .map(f => {
    const src = f === 'src/js/version.js' ? outputs[f] : read(f);
    return `/* ===== ${f} ===== */\n` + src.replace(/^'use strict';\n/m, '');
  })
  .join('\n');
const css = styles.map(f => read(f)).join('\n');
const head = index.slice(index.indexOf('<head>') + 6, index.indexOf('</head>'));
const bodyStart = index.indexOf('<body>') + 6;
const markup = index.slice(bodyStart, index.indexOf('<!-- Game scripts.')).trim();
const headStatic = head
  .replace(/<link rel="stylesheet" href="(?!https?:)[^"]+">\n?/g, '')
  .replace(/<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n?/g, '')
  .trim();
const script = `<script>\n(()=>{\n'use strict';\nconst BUNDLED = true;\n${js}\n})();\n</script>`;
outputs['dist/cyber-city-tactics.html'] = `<!doctype html>
<html lang="en">
<head>
${headStatic}
<style>
${css}</style>
</head>
<body>
${markup}
${script}
</body>
</html>
`;

// ---- write or check ----
let stale = [];
for (const [p, content] of Object.entries(outputs)) {
  const full = join(ROOT, p);
  const cur = existsSync(full) ? readFileSync(full, 'utf8') : null;
  if (cur === content) continue;
  stale.push(p);
  if (!CHECK) {
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
}
if (FRAGMENT) {
  // The claude.ai artifact viewer supplies <html>, <head>, <body> and the viewport, so the preview gets a fragment.
  const frag = `${headStatic.replace(/<meta (charset|name="viewport")[^>]*>\n?/g, '')}\n<style>\n${css}</style>\n${markup}\n${script}\n`;
  writeFileSync(FRAGMENT, frag);
  console.log('fragment ->', FRAGMENT, frag.length, 'bytes');
}
if (CHECK) {
  if (stale.length) {
    console.error('Out of date: ' + stale.join(', ') + '\nRun: npm run build');
    process.exit(1);
  }
  console.log('Build is up to date (' + appVersion + ').');
} else {
  console.log(
    `Cyber City Tactics ${appVersion}: ${scripts.length} scripts, ${precache.length} precached files.`
  );
  console.log(stale.length ? 'Updated: ' + stale.join(', ') : 'Nothing changed.');
}
