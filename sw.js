/* Cyber City Tactics service worker.
 *
 * App-shell model: every file the game needs is precached together under one versioned cache, and the page
 * is always served from that cache. That way the HTML, CSS and scripts can never come from two different
 * versions. When a new version is deployed, the browser downloads it in the background; the game then shows
 * an "update ready" bar (src/js/pwa.js) and the new version takes over only when the player says so.
 *
 * The BUILD block below is rewritten by tools/build.mjs: VERSION is a hash of every precached file, so it
 * changes whenever any of them does. Run `npm run build` before you commit.
 */

/* BUILD:MANIFEST */
const VERSION = '093069e55edf';
const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'src/css/game.css',
  'src/fonts/teko-500.woff',
  'src/fonts/teko-600.woff',
  'src/fonts/chakra-petch-400.woff',
  'src/fonts/chakra-petch-600.woff',
  'src/js/version.js',
  'src/js/core/canvas.js',
  'src/js/core/utils.js',
  'src/js/core/audio.js',
  'src/js/core/music.js',
  'src/js/core/input.js',
  'src/js/data/content.js',
  'src/js/data/gear.js',
  'src/js/data/world.js',
  'src/js/data/legend-data.js',
  'src/js/systems/legend.js',
  'src/js/systems/skills.js',
  'src/js/systems/haggle.js',
  'src/js/game/state.js',
  'src/js/game/flow.js',
  'src/js/game/combat.js',
  'src/js/game/props.js',
  'src/js/game/runners.js',
  'src/js/game/allies.js',
  'src/js/game/enemies.js',
  'src/js/game/update.js',
  'src/js/modes/sprawl.js',
  'src/js/modes/blackmarket.js',
  'src/js/modes/choices.js',
  'src/js/modes/dungeons.js',
  'src/js/modes/hacking.js',
  'src/js/modes/training.js',
  'src/js/modes/arena.js',
  'src/js/modes/jobs.js',
  'src/js/modes/drive.js',
  'src/js/modes/stealth.js',
  'src/js/modes/flight.js',
  'src/js/modes/net.js',
  'src/js/render/figures.js',
  'src/js/render/atmos.js',
  'src/js/render/looks.js',
  'src/js/render/intro.js',
  'src/js/render/vehicles.js',
  'src/js/render/facility.js',
  'src/js/render/air.js',
  'src/js/render/world.js',
  'src/js/render/sprawl.js',
  'src/js/render/hud.js',
  'src/js/ui/attract.js',
  'src/js/ui/screens.js',
  'src/js/ui/overlay.js',
  'src/js/ui/actions.js',
  'src/js/pwa.js',
  'src/js/main.js',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/shortcut-daily.png',
  'icons/shortcut-sprawl.png',
  'icons/shortcut-arena.png',
  'icons/shortcut-codex.png'
];
/* /BUILD:MANIFEST */

const SHELL = 'cct-shell-' + VERSION;
const RUNTIME = 'cct-runtime'; // fonts and anything else fetched later
const FONT_HOSTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com$/;

self.addEventListener('install', event => {
  // cache: 'reload' skips the HTTP cache so a deploy never precaches a stale file.
  event.waitUntil(
    caches.open(SHELL).then(cache => cache.addAll(PRECACHE.map(url => new Request(url, { cache: 'reload' }))))
  );
  // Normally no skipWaiting(): the player decides when to switch (see the message handler). The exception is
  // coming from the old single-file version, which has no update bar; it's safe to take over at once.
  event.waitUntil(
    caches.keys().then(keys => {
      if (keys.some(k => /^cs-v\d+$/.test(k))) return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(k => k.startsWith('cct-shell-') && k !== SHELL).map(k => caches.delete(k))
      );
      // Caches from the old single-file version of the game.
      await Promise.all(keys.filter(k => /^cs-v\d+$/.test(k)).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // The page itself: always the precached shell (works offline, never mixes versions). Only the game's own
  // page, though: opening a file from the site directly (the trailer, a screenshot) goes to the network.
  const last = url.pathname.split('/').pop(),
    isPage = last === '' || last === 'index.html' || !last.includes('.');
  if (req.mode === 'navigate' && url.origin === location.origin && isPage) {
    event.respondWith(
      (async () => {
        const shell = await caches.open(SHELL);
        const hit = (await shell.match('index.html')) || (await shell.match('./'));
        if (hit) return hit;
        try {
          return await fetch(req);
        } catch (err) {
          return new Response('<h1>Offline</h1><p>Cyber City Tactics has not finished downloading yet.</p>', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
            status: 503
          });
        }
      })()
    );
    return;
  }

  if (req.mode === 'navigate') return; // a file opened directly: straight from the network, not cached
  // Game files: cache first from the shell, network as a fallback.
  if (url.origin === location.origin) {
    event.respondWith(
      (async () => {
        const hit = await caches.match(req, { ignoreSearch: true });
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) (await caches.open(RUNTIME)).put(req, res.clone());
        return res;
      })()
    );
    return;
  }

  // Google Fonts: serve the cached copy at once and refresh it in the background.
  if (FONT_HOSTS.test(url.origin)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME);
        const hit = await cache.match(req);
        const fresh = fetch(req)
          .then(res => {
            if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
            return res;
          })
          // Offline with nothing cached yet: an empty stylesheet lets the game fall back to system fonts quietly.
          .catch(() => hit || new Response('', { headers: { 'Content-Type': 'text/css' } }));
        return hit || fresh;
      })()
    );
  }
});
