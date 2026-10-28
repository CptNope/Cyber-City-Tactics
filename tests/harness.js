/* Headless test harness for Cyber City Tactics.
 *
 * Loads the real game scripts (in the order index.html lists them) into this Node process with stubbed
 * DOM, canvas, storage and timers, then exposes helpers as globals so a test reads like a script:
 *
 *   require('./harness');
 *   click('pick'); click('new');          // press a menu button by its data-a action
 *   key('KeyJ', true); key('KeyJ', false); // keyboard
 *   tap('KeyU');                           // press and release
 *   step(60);                              // advance 60 frames (one second)
 *   __G, __PL(), __PARTY                   // game state
 *   __api.someFunction(...)                // any top-level game function or constant, by name
 *   els.ov._h                              // the HTML currently shown in the menu overlay
 *
 * Each game file runs with vm.runInThisContext, which behaves like a browser classic <script>: files share
 * one global scope, so a test can reach any game global.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const noop = () => {};
const ctxP = new Proxy(
  {},
  {
    get: (t, k) =>
      k === 'measureText'
        ? () => ({ width: 30 })
        : k === 'createLinearGradient' || k === 'createRadialGradient'
          ? () => ({ addColorStop: noop })
          : typeof t[k] !== 'undefined'
            ? t[k]
            : noop,
    set: (t, k, v) => {
      t[k] = v;
      return true;
    }
  }
);
const els = {};
let ovClick = null;
function el(id) {
  return (
    els[id] ||
    (els[id] = {
      id,
      style: {},
      classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
      hidden: false,
      dataset: {},
      scrollTop: 0,
      offsetWidth: 120,
      getBoundingClientRect: () => ({ width: 900, height: 500, left: 0, top: 0 }),
      getContext: () => ctxP,
      addEventListener: (t, f) => {
        if (id === 'ov' && t === 'click') ovClick = f;
      },
      setPointerCapture: noop,
      focus: noop,
      click: noop,
      appendChild: noop,
      remove: noop,
      set innerHTML(v) {
        this._h = v;
      },
      get innerHTML() {
        return this._h;
      },
      querySelector: s => el(s.replace(/^[.#]/, '')),
      querySelectorAll: () => []
    })
  );
}
const handlers = {};
let rafCb = null;
global.T = 0;
global.window = global;
global.devicePixelRatio = 1;
global.document = {
  getElementById: el,
  querySelectorAll: () => [],
  querySelector: s => el(s),
  createElement: () => el('tmp' + Math.random()),
  body: el('body'),
  documentElement: el('html'),
  addEventListener: noop,
  fonts: { ready: Promise.resolve() },
  hidden: false
};
global.matchMedia = () => ({ matches: false });
global.addEventListener = (t, f) => {
  (handlers[t] = handlers[t] || []).push(f);
};
global.localStorage = {
  _d: {},
  get length() {
    return Object.keys(this._d).length;
  },
  key(i) {
    return Object.keys(this._d)[i];
  },
  getItem(k) {
    return k in this._d ? this._d[k] : null;
  },
  setItem(k, v) {
    this._d[k] = String(v);
  },
  removeItem(k) {
    delete this._d[k];
  }
};
global.requestAnimationFrame = f => {
  rafCb = f;
};
global.raf = t => rafCb && rafCb(t);
global.performance = { now: () => global.T };
global.location = { protocol: 'file:', hostname: '', search: '', pathname: '/', reload: noop };
global.history = { replaceState: noop };
Object.defineProperty(global, 'navigator', { value: {}, configurable: true, writable: true });
global.setTimeout = noop;
global.setInterval = noop;
global.COOP = process.argv[2] === 'coop';
global.els = els;
global.handlers = handlers;
Object.defineProperty(global, 'ovClick', { get: () => ovClick, configurable: true });

// Load the game exactly as index.html does.
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const block = index.match(/<!-- BUILD:SCRIPTS -->([\s\S]*?)<!-- \/BUILD:SCRIPTS -->/)[1];
const scripts = [...block.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
for (const f of scripts) vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });

vm.runInThisContext('global.__G = G; global.__PL = () => PL; global.__PARTY = PARTY;');
// suites click straight into runs: treat the one-time "train first?" offer as already seen (shop.test checks it)
vm.runInThisContext('prefs.seen = prefs.seen || {}; prefs.seen.trainoffer = true;');
global.__api = new Proxy({}, { get: (_, name) => vm.runInThisContext(String(name)) });

global.click = a => ovClick({ target: { closest: () => ({ dataset: { a }, disabled: false }) } });
global.key = (code, down) =>
  handlers[down ? 'keydown' : 'keyup'].forEach(h => h({ code, preventDefault: noop, repeat: false }));
global.tap = c => {
  key(c, true);
  key(c, false);
};
global.step = n => {
  for (let i = 0; i < n; i++) {
    __G.stop = 0;
    global.T += 1000 / 60;
    raf(global.T);
  }
};
global.ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
global.SCRIPTS = scripts;
