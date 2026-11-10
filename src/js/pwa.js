/* Cyber City Tactics · src/js/pwa.js
 * Everything that makes the game behave like an installed app:
 *  - registers the service worker (sw.js) and shows an "update ready" bar when a new version has downloaded
 *  - captures the browser's install prompt so Settings and the title screen can offer "Install app"
 *  - asks the browser to keep saves from being evicted (persistent storage)
 *  - save backups: export every save to a JSON file and import it on another device (save codes and the sync
 *    file are in sync.js)
 *  - app shortcuts: ?go=daily, ?go=arena, ?go=sprawl or ?go=codex open that screen on launch
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';

const PWA = {
  deferred: null, // the saved beforeinstallprompt event
  waiting: null, // a new service worker that has installed and is waiting to take over
  installed:
    matchMedia('(display-mode: standalone)').matches ||
    matchMedia('(display-mode: fullscreen)').matches ||
    navigator.standalone === true,
  // No service worker inside the claude.ai preview, and none on localhost unless ?sw=1 (so edits show up
  // instantly while developing). GitHub Pages and other https hosts always get it.
  canSW:
    typeof BUNDLED === 'undefined' &&
    'serviceWorker' in navigator &&
    !/claude\.ai|claudeusercontent/.test(location.hostname) &&
    (location.protocol === 'https:' ||
      (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]sw=1/.test(location.search)))
};
const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/* ---------- install ---------- */
addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  PWA.deferred = e;
  if (['title', 'settings'].includes(G.mode)) renderOv();
});
addEventListener('appinstalled', () => {
  PWA.deferred = null;
  PWA.installed = true;
  if (['title', 'settings'].includes(G.mode)) renderOv();
});
async function pwaInstall() {
  const e = PWA.deferred;
  if (!e) return;
  PWA.deferred = null;
  try {
    e.prompt();
    await e.userChoice;
  } catch (err) {}
  renderOv();
}
/** The install part of the Settings screen. */
function pwaSettingsRows(row) {
  let install;
  if (PWA.installed)
    install = row(
      'App',
      'Installed. It works offline and saves stay on this device.',
      '<span class="ds">✓ Installed</span>'
    );
  else if (PWA.deferred)
    install = row(
      'Install the app',
      'Full screen, its own icon, and it works offline',
      '<button class="btn sm" data-a="install">Install</button>'
    );
  else if (isIOS())
    install = row(
      'Install the app',
      'In Safari, tap Share, then “Add to Home Screen”.',
      '<span class="ds">Safari</span>'
    );
  else
    install = row(
      'Install the app',
      'Use your browser menu: “Install app” or “Add to Home screen”.',
      '<span class="ds">Browser menu</span>'
    );
  const fromSync = G.importData && G.importData.from === 'sync';
  const imp = G.importData
    ? `<div class="job" style="border-color:var(--gold)"><b>${fromSync ? 'Your sync file has newer saves. Load them?' : `Replace your saves with this ${G.importData.from === 'code' ? 'code' : 'backup'}?`}</b><span style="color:var(--muted);font-size:13px">Saved ${esc(G.importData.date || 'on an unknown date')} · ${Object.keys(G.importData.data).length} save slots. Everything on this device is replaced and the game restarts.</span>
      <div class="row"><button class="btn sm" data-a="importok">${fromSync ? 'Load and restart' : 'Replace and restart'}</button><button class="btn sm ghost" data-a="importno">${fromSync ? 'Keep this device’s saves' : 'Cancel'}</button></div></div>`
    : G.importErr
      ? `<p class="say"><b>Import failed</b>${esc(G.importErr)}</p>`
      : '';
  // The claude.ai preview can't download or pick files, so only save codes are offered there.
  if (/claude\.ai|claudeusercontent/.test(location.hostname)) return install + syncSettingsRows(row) + imp;
  return (
    install +
    row(
      'Save backup',
      'Download every save (campaign, Sprawl, Arena scores, your legend) as a file, or load one from another device',
      '<span class="row" style="gap:6px;flex-wrap:nowrap"><button class="btn sm ghost" data-a="export">Export</button><button class="btn sm ghost" data-a="import">Import</button></span>'
    ) +
    syncSettingsRows(row) +
    imp +
    `<p class="ds" style="margin-top:8px">Version ${esc(typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'dev')}${PWA.waiting ? ' · update ready' : ''}${typeof BUNDLED === 'undefined' ? ' · <a href="privacy.html" target="_blank" rel="noopener">Privacy</a>' : ''}</p>`
  );
}

/* ---------- service worker and updates ---------- */
const updBar = document.getElementById('updBar');
function pwaRegister() {
  if (!PWA.canSW) return;
  navigator.serviceWorker
    .register('sw.js')
    .then(reg => {
      if (reg.waiting && navigator.serviceWorker.controller) PWA.waiting = reg.waiting;
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (w)
          w.addEventListener('statechange', () => {
            // Only prompt when an older version is already in charge; the very first install needs no reload.
            if (w.state === 'installed' && navigator.serviceWorker.controller) PWA.waiting = w;
          });
      });
      const check = () => reg.update().catch(() => {});
      setInterval(check, 30 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) check();
      });
    })
    .catch(() => {});
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !PWA.applying) return;
    reloading = true;
    location.reload();
  });
}
/** Save what can be saved, then let the waiting worker take over (which reloads the page). */
function pwaApplyUpdate() {
  try {
    saveLeg();
    if (G.world && G.wd) saveWorld();
  } catch (err) {}
  PWA.applying = true;
  // a worker another tab already switched on won't fire controllerchange here: just reload into it
  if (PWA.waiting && PWA.waiting.state === 'installed') PWA.waiting.postMessage({ type: 'SKIP_WAITING' });
  else location.reload();
}
// Show the update bar only between fights, never in the middle of one.
setInterval(() => {
  if (!updBar) return;
  const show = !!PWA.waiting && G.mode !== 'play' && G.mode !== 'den' && G.mode !== 'hack';
  if (updBar.hidden === show) updBar.hidden = !show;
}, 500);
if (updBar)
  updBar.addEventListener('click', e => {
    const a = e.target.closest('[data-u]');
    if (!a) return;
    if (a.dataset.u === 'go') pwaApplyUpdate();
    else {
      PWA.waiting = null;
      updBar.hidden = true;
    }
  });

/* ---------- storage ---------- */
// Ask once, after the player has done something, for storage the browser won't clear under pressure.
addEventListener(
  'pointerdown',
  () => {
    try {
      if (navigator.storage && navigator.storage.persist)
        navigator.storage.persisted().then(p => {
          if (!p) navigator.storage.persist();
        });
    } catch (err) {}
  },
  { once: true }
);

/* ---------- save backups ---------- */
const SAVE_PREFIX = 'cs_';
function pwaExport() {
  const b = saveBundle(),
    date = b.date;
  const blob = new Blob([JSON.stringify(b, null, 1)], {
    type: 'application/json'
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `cyber-city-tactics-save-${date}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}
function pwaImportPick() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'application/json,.json';
  inp.onchange = () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    f.text().then(t => pwaImportText(t));
  };
  inp.click();
}
/** Validate a backup's text (a file, a save code or the sync file: `from`); on success Settings asks first. */
function pwaImportText(t, from) {
  G.importData = null;
  G.importErr = null;
  try {
    const o = JSON.parse(t);
    if (!o || o.app !== 'cyber-city-tactics' || !o.data || typeof o.data !== 'object')
      throw new Error('not a backup');
    const keys = Object.keys(o.data).filter(k => k.startsWith(SAVE_PREFIX) && typeof o.data[k] === 'string');
    if (!keys.length) throw new Error('empty');
    for (const k of keys) JSON.parse(o.data[k]); // every slot must be valid JSON
    G.importData = {
      date: o.date,
      stamp: +o.stamp || 0,
      from: from || 'file',
      data: Object.fromEntries(keys.map(k => [k, o.data[k]]))
    };
  } catch (err) {
    G.importErr =
      from === 'code'
        ? "That code doesn't hold Cyber City Tactics saves."
        : "That file isn't a Cyber City Tactics save backup.";
  }
  if (G.mode === 'settings') renderOv();
}
function pwaImportApply() {
  const d = G.importData;
  if (!d) return;
  // write the backup first and only then remove the saves it doesn't have, so a failure partway (storage full)
  // never leaves the player with half their saves gone; only reload when it all went in
  try {
    for (const k in d.data) localStorage.setItem(k, d.data[k]);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(SAVE_PREFIX) && !(k in d.data)) localStorage.removeItem(k);
    }
  } catch (err) {
    G.importErr =
      "Couldn't restore the backup: this browser's storage is full or blocked. Your saves were not changed.";
    if (G.mode === 'settings') renderOv();
    return;
  }
  // loaded from the sync file: this device now matches it. Loaded from a file or a code: a deliberate change,
  // so it counts as the newest saves and goes out to a linked sync file
  const m = syncMeta();
  if (d.from === 'sync') m.stamp = m.synced = d.stamp;
  else m.stamp = Math.max(Date.now(), (m.stamp || 0) + 1);
  syncMetaSet(m);
  location.reload();
}

/* ---------- app shortcuts ---------- */
function pwaShortcut() {
  const qs = new URLSearchParams(location.search),
    sd = parseSeed(qs.get('seed'));
  if (sd) {
    // a shared challenge link: open the right start screen with the seed filled in
    G.seedPre = sd.code;
    if (sd.mode === 'gauntlet') {
      G.seedPre = '';
      G.gauntPre = sd.code;
    }
    setMode(sd.mode === 'arena' ? 'arenapick' : sd.mode === 'gauntlet' ? 'gauntpick' : 'worldpick');
    try {
      history.replaceState(null, '', location.pathname);
    } catch (err) {}
    return;
  }
  const go = qs.get('go');
  const to = { daily: 'arenapick', arena: 'arenapick', sprawl: 'worldpick', codex: 'codex' }[go];
  if (!to) return;
  if (to === 'codex') G.cxTab = 'feats';
  setMode(to);
  try {
    history.replaceState(null, '', location.pathname);
  } catch (err) {}
}

// Android's back button (the installed app and the Play Store build): pause the fight or step out of a menu
// instead of quitting mid-run. A spare history entry catches the press; on the title screen it is let go, so
// back leaves the app as usual. Chrome only honours entries added after a tap or key, hence the arming.
const BACK_BTNS = ['resume', 'close', 'leave', 'back2title'];
function backPress() {
  if (G.mode === 'title') return false;
  if (G.mode === 'hack') {
    G.hack = null;
    setMode('play');
  } else if (G.mode === 'map') setMode('play');
  else if (['play', 'den', 'pause', 'sheet', 'npc', 'bcard', 'safe', 'netmenu'].includes(G.mode))
    globalAct('pause');
  else {
    for (const a of BACK_BTNS) {
      const b = ov.querySelector(`[data-a="${a}"]:not([disabled])`);
      if (b && b.click) {
        b.click();
        break;
      }
    }
  }
  return true;
}
if (PWA.installed && history.pushState) {
  const guard = () => {
    if (G.mode !== 'title' && !(history.state && history.state.cct))
      try {
        history.pushState({ cct: 1 }, '');
      } catch (err) {}
  };
  addEventListener('popstate', () => {
    if (backPress()) guard();
  });
  addEventListener('pointerdown', guard, true);
  addEventListener('keydown', guard, true);
}
