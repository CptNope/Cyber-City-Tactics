#!/usr/bin/env node
/* Rebuild vendor/three.min.js: the parts of three.js the 3D view uses (src/js/render/r3*.js), bundled into one
 * classic script that sets window.THREE. The game loads only classic scripts, with no module loader and no
 * CDN (the Content Security Policy allows the site's own files only), so three.js is vendored like this.
 *
 *   node tools/vendor-three.mjs <path to a three.js checkout at the pinned tag> [path to esbuild]
 *
 * The names come from the renderer's own source (every THREE.Name it uses), so adding one there and running
 * this again is all an upgrade or a new feature needs. The checkout's LICENSE is copied into the header.
 * Pinned: three.js r186 (git tag r186). esbuild is only needed here, not to build or test the game. */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [three, esbuild = 'esbuild'] = process.argv.slice(2);
if (!three) throw new Error('usage: node tools/vendor-three.mjs <three.js checkout> [esbuild]');
const REV = '186';
const pkg = readFileSync(join(three, 'build/three.core.js'), 'utf8').match(/REVISION = '(\d+)'/);
if (!pkg || pkg[1] !== REV)
  throw new Error(`expected three.js r${REV}, found ${pkg ? 'r' + pkg[1] : 'unknown'}`);

const dir = join(ROOT, 'src/js/render');
const src = readdirSync(dir)
  .filter(f => /^r3.*\.js$/.test(f))
  .map(f => readFileSync(join(dir, f), 'utf8'))
  .join('\n');
const names = new Set();
for (const m of src.matchAll(/\b(?:THREE|T)\.([A-Z][A-Za-z0-9_]*)/g)) names.add(m[1]);
const addons = { UnrealBloomPass: 'examples/jsm/postprocessing/UnrealBloomPass.js' };
const core = [...names].filter(n => !addons[n]).sort();
const extra = [...names].filter(n => addons[n]).sort();
const tmp = join(ROOT, 'node_modules/.vendor-three');
mkdirSync(tmp, { recursive: true });
const entry = join(tmp, 'entry.js');
writeFileSync(
  entry,
  `import { ${core.join(', ')} } from '${join(three, 'build/three.module.js')}';\n` +
    extra.map(n => `import { ${n} } from '${join(three, addons[n])}';\n`).join('') +
    `globalThis.THREE = Object.freeze({ ${[...core, ...extra].join(', ')} });\n`
);
const out = join(tmp, 'three.min.js');
execFileSync(
  esbuild,
  [
    entry,
    '--bundle',
    '--minify',
    '--format=iife',
    '--target=es2020',
    '--legal-comments=none',
    `--alias:three=${join(three, 'build/three.module.js')}`,
    `--outfile=${out}`
  ],
  { stdio: 'inherit' }
);
const license = readFileSync(join(three, 'LICENSE'), 'utf8').trim();
mkdirSync(join(ROOT, 'vendor'), { recursive: true });
writeFileSync(
  join(ROOT, 'vendor/three.min.js'),
  `/*! three.js r${REV} (https://threejs.org), bundled for Cyber City Tactics by tools/vendor-three.mjs:\n` +
    ` * ${[...core, ...extra].join(', ')}\n *\n * ${license.replace(/\n/g, '\n * ')}\n */\n` +
    readFileSync(out, 'utf8')
);
console.log(`vendor/three.min.js: ${core.length + extra.length} exports`);
