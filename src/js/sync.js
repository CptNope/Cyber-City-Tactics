/* Cyber City Tactics · src/js/sync.js
 * Cloud save without a server, two ways:
 *  - save codes: every save packed into one short text code (deflated, base64url) to paste on another device
 *  - a sync file: the player picks a file (File System Access API, Chrome and Edge) and the game keeps it up to
 *    date as it saves. Put the file in a Dropbox, Google Drive, OneDrive or iCloud folder and that service
 *    carries it to the player's other devices; on launch the game offers to load it when it is newer.
 * Every save write bumps a local stamp (cct_sync in localStorage, outside the cs_ backup keys); bundles carry
 * the stamp, so "newer" means "changed later", not "a later date on the file".
 * Loaded as a classic script after pwa.js: every file shares one global scope, in the order listed in index.html. */
'use strict';

const SYNC = {
  ok: typeof showSaveFilePicker === 'function' && !/claude\.ai|claudeusercontent/.test(location.hostname),
  handle: null, // the linked FileSystemFileHandle
  state: 'off', // off | on | paused (needs a click to grant access again) | hold (asking which saves win) | error
  name: '',
  last: 0, // Date.now() of the last successful read or write
  timer: null,
  busy: false
};
const syncMeta = () => {
  try {
    const m = JSON.parse(localStorage.getItem('cct_sync'));
    if (m && typeof m === 'object') return m;
  } catch (err) {}
  return { stamp: 0, synced: 0 };
};
const syncMetaSet = m => {
  try {
    localStorage.setItem('cct_sync', JSON.stringify(m));
  } catch (err) {}
};

/** Every save write lands here (store.set / store.del on a cs_ key): bump the stamp, and push to the file soon. */
function syncTouch() {
  const m = syncMeta();
  m.stamp = Math.max(Date.now(), (m.stamp || 0) + 1);
  syncMetaSet(m);
  if (SYNC.state !== 'on') return;
  clearTimeout(SYNC.timer);
  SYNC.timer = setTimeout(syncFlush, 4000);
}

/** Every cs_ slot, with the date and the change stamp. */
function saveBundle() {
  const data = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(SAVE_PREFIX)) data[k] = localStorage.getItem(k);
    }
  } catch (err) {}
  return {
    app: 'cyber-city-tactics',
    v: 1,
    date: new Date().toISOString().slice(0, 10),
    stamp: syncMeta().stamp || 0,
    data
  };
}

/* ---------- save codes ---------- */
// b64u / unb64u are the invite-code helpers in net.js
const canZip = () => typeof CompressionStream === 'function' && typeof Response === 'function';
const zipPipe = (bytes, Stream) =>
  new Response(new Blob([bytes]).stream().pipeThrough(new Stream('deflate-raw'))).arrayBuffer();

/** Pack every save into a code: CCTSz<deflated base64url>, or CCTSp<plain base64url> without compression.
 * (Online invite codes start CCT1, so neither box takes the other's code.) */
async function saveCode() {
  const raw = new TextEncoder().encode(JSON.stringify(saveBundle()));
  if (canZip()) return 'CCTSz' + b64u(new Uint8Array(await zipPipe(raw, CompressionStream)));
  return 'CCTSp' + b64u(raw);
}
/** Unpack a save code into a backup's JSON text; throws on anything that isn't one. */
async function codeText(code) {
  const s = String(code || '').replace(/\s+/g, '');
  const m = /^CCTS([zp])([A-Za-z0-9_-]+)$/.exec(s);
  if (!m) throw new Error('not a save code');
  const bytes = unb64u(m[2]);
  if (m[1] === 'p') return new TextDecoder().decode(bytes);
  if (typeof DecompressionStream !== 'function') throw new Error('no decompression');
  return new TextDecoder().decode(new Uint8Array(await zipPipe(bytes, DecompressionStream)));
}
async function codeMake() {
  G.codeOut = null;
  G.codeIn = false;
  G.codeMsg = '';
  try {
    G.codeOut = await saveCode();
  } catch (err) {
    G.codeMsg = "Couldn't make a code in this browser. Use Export instead.";
  }
  if (G.mode === 'settings') renderOv();
}
async function codeCopy() {
  try {
    await navigator.clipboard.writeText(G.codeOut);
    G.codeMsg = 'Copied. Paste it into Settings → Save code on your other device.';
  } catch (err) {
    G.codeMsg = 'Select the code and copy it yourself: this browser blocked the clipboard.';
  }
  if (G.mode === 'settings') renderOv();
}
/** Read a pasted code; on success it becomes a pending import, asked about like a backup file. */
async function codeLoad(code) {
  G.codeMsg = '';
  let t;
  try {
    t = await codeText(code);
  } catch (err) {
    G.importData = null;
    G.importErr = "That isn't a Cyber City Tactics save code. Check that you copied all of it.";
    if (G.mode === 'settings') renderOv();
    return;
  }
  G.codeIn = false;
  pwaImportText(t, 'code');
}

/* ---------- the sync file ---------- */
// The file handle lives in IndexedDB (localStorage can't hold one), so the link survives a restart.
function idb(mode, fn) {
  return new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') return rej(new Error('no IndexedDB'));
    const rq = indexedDB.open('cct', 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore('kv');
    rq.onerror = () => rej(rq.error);
    rq.onsuccess = () => {
      const tx = rq.result.transaction('kv', mode),
        r = fn(tx.objectStore('kv'));
      tx.oncomplete = () => res(r && r.result);
      tx.onerror = () => rej(tx.error);
    };
  });
}
const syncSaveHandle = h =>
  idb('readwrite', s => (h ? s.put(h, 'syncFile') : s.delete('syncFile'))).catch(() => {});

async function syncFlush() {
  clearTimeout(SYNC.timer);
  if (!SYNC.handle || SYNC.state !== 'on' || SYNC.busy) return false;
  SYNC.busy = true;
  try {
    const b = saveBundle(),
      w = await SYNC.handle.createWritable();
    await w.write(JSON.stringify(b));
    await w.close();
    const m = syncMeta();
    m.synced = b.stamp;
    syncMetaSet(m);
    SYNC.last = Date.now();
    return true;
  } catch (err) {
    SYNC.state = 'error';
    return false;
  } finally {
    SYNC.busy = false;
    // a save that landed while this write was going goes out next
    if (SYNC.state === 'on' && syncMeta().stamp > (syncMeta().synced || 0)) {
      clearTimeout(SYNC.timer);
      SYNC.timer = setTimeout(syncFlush, 4000);
    }
    if (G.mode === 'settings') renderOv();
  }
}

/** Start syncing with a file: if it holds newer saves, ask; otherwise write this device's saves to it. */
async function syncAdopt(h) {
  SYNC.handle = h;
  SYNC.name = h.name || 'sync file';
  let text = '';
  try {
    text = await (await h.getFile()).text();
  } catch (err) {
    SYNC.state = 'error';
    if (G.mode === 'settings') renderOv();
    return;
  }
  let o = null;
  try {
    o = JSON.parse(text);
  } catch (err) {}
  const m = syncMeta();
  SYNC.last = Date.now();
  if (o && o.app === 'cyber-city-tactics' && o.data && (o.stamp || 0) > (m.stamp || 0)) {
    // the file changed after this device last did: offer it, and leave the file alone until the player picks
    SYNC.state = 'hold';
    pwaImportText(text, 'sync');
    if (G.importData) {
      if (G.mode !== 'settings')
        G.tip = { s: 'Your sync file has newer saves. Open Settings to load them.', life: 600 };
      return;
    }
    G.importErr = null;
  }
  SYNC.state = 'on';
  await syncFlush();
}
async function syncLink(open) {
  if (!SYNC.ok) return;
  let h;
  try {
    if (open)
      [h] = await showOpenFilePicker({
        types: [{ description: 'Save file', accept: { 'application/json': ['.json'] } }]
      });
    else
      h = await showSaveFilePicker({
        suggestedName: 'cyber-city-tactics-sync.json',
        types: [{ description: 'Save file', accept: { 'application/json': ['.json'] } }]
      });
    if (h.requestPermission && (await h.requestPermission({ mode: 'readwrite' })) !== 'granted') return;
  } catch (err) {
    return; // cancelled
  }
  await syncSaveHandle(h);
  await syncAdopt(h);
}
/** After a restart the browser asks again before the game may touch the file: this is that click. */
async function syncResume() {
  const h = SYNC.handle;
  if (!h) return;
  try {
    if ((await h.requestPermission({ mode: 'readwrite' })) !== 'granted') return;
  } catch (err) {
    return;
  }
  await syncAdopt(h);
}
function syncUnlink() {
  clearTimeout(SYNC.timer);
  SYNC.handle = null;
  SYNC.state = 'off';
  SYNC.name = '';
  syncSaveHandle(null);
  if (G.mode === 'settings') renderOv();
}
/** The player chose this device's saves over the file's: they win, and go to the file. */
function syncKeepLocal() {
  if (SYNC.state !== 'hold') return;
  const m = syncMeta();
  m.stamp = Math.max(Date.now(), (m.stamp || 0) + 1, ((G.importData && G.importData.stamp) || 0) + 1);
  syncMetaSet(m);
  SYNC.state = 'on';
  syncFlush();
}
/** On launch: pick up a linked file, if there is one. */
async function syncBoot() {
  if (!SYNC.ok) return;
  let h;
  try {
    h = await idb('readonly', s => s.get('syncFile'));
  } catch (err) {
    return;
  }
  if (!h) return;
  SYNC.handle = h;
  SYNC.name = h.name || 'sync file';
  let p = 'prompt';
  try {
    p = await h.queryPermission({ mode: 'readwrite' });
  } catch (err) {}
  if (p === 'granted') await syncAdopt(h);
  else SYNC.state = 'paused';
  if (['title', 'settings'].includes(G.mode)) renderOv();
}
// best effort: push the latest saves when the page is hidden or closed
addEventListener('visibilitychange', () => {
  if (document.hidden && SYNC.state === 'on' && syncMeta().stamp > (syncMeta().synced || 0)) syncFlush();
});

// a click on the code selects all of it (a listener, not an inline handler: the page's CSP allows no inline script)
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function')
  document.addEventListener('click', e => {
    const t = e.target;
    if (t && t.matches && t.matches('.codebox textarea[readonly]')) t.select();
  });
const agoText = t => {
  const s = Math.round((Date.now() - t) / 1000);
  return s < 60 ? 'just now' : s < 3600 ? Math.round(s / 60) + ' min ago' : Math.round(s / 3600) + ' h ago';
};
/** The Save code and Sync file rows of Settings. */
function syncSettingsRows(row) {
  let out = row(
    'Save code',
    'Every save as one text code: make it here, paste it on another device',
    '<span class="row" style="gap:6px;flex-wrap:nowrap"><button class="btn sm ghost" data-a="codemake">Make</button><button class="btn sm ghost" data-a="codeenter">Enter</button></span>'
  );
  if (G.codeOut)
    out += `<div class="job codebox"><b>Your save code</b><textarea readonly rows="3" aria-label="Save code">${esc(G.codeOut)}</textarea>
      <span style="color:var(--muted);font-size:13px">${G.codeOut.length.toLocaleString()} characters · it holds every save, so anyone with it can load your progress</span>
      <div class="row"><button class="btn sm" data-a="codecopy">Copy</button><button class="btn sm ghost" data-a="codeclose">Done</button></div></div>`;
  if (G.codeIn)
    out += `<div class="job codebox"><b>Paste a save code</b><textarea id="codeIn" rows="3" aria-label="Paste a save code" placeholder="CCTSz…"></textarea>
      <div class="row"><button class="btn sm" data-a="codeload">Load</button><button class="btn sm ghost" data-a="codeclose">Cancel</button></div></div>`;
  if (G.codeMsg) out += `<p class="ds">${esc(G.codeMsg)}</p>`;
  if (/claude\.ai|claudeusercontent/.test(location.hostname)) return out;
  if (!SYNC.ok)
    return (
      out +
      row(
        'Sync file',
        'Keeps a file in your cloud folder up to date. Needs Chrome or Edge on a computer or Android; use a save code here.',
        '<span class="ds">Not here</span>'
      )
    );
  const st = {
    off: ['Pick a file in a Dropbox, Drive, OneDrive or iCloud folder and your saves follow you', ''],
    on: [
      `Syncing to <b>${esc(SYNC.name)}</b> · ${SYNC.last ? 'last synced ' + agoText(SYNC.last) : 'linked'}`,
      'on'
    ],
    paused: [`Linked to <b>${esc(SYNC.name)}</b>. The browser needs your OK again after a restart.`, ''],
    hold: [`<b>${esc(SYNC.name)}</b> has newer saves. Choose above which to keep.`, ''],
    error: [`Couldn't reach <b>${esc(SYNC.name)}</b>. It may have moved, or access was taken back.`, 'bad']
  }[SYNC.state];
  const btns =
    SYNC.state === 'off'
      ? '<button class="btn sm ghost" data-a="synclink">New file</button><button class="btn sm ghost" data-a="syncopen">Open file</button>'
      : (SYNC.state === 'paused' || SYNC.state === 'error'
          ? '<button class="btn sm" data-a="syncresume">Resume</button>'
          : SYNC.state === 'on'
            ? '<button class="btn sm ghost" data-a="syncnow">Sync now</button>'
            : '') + '<button class="btn sm ghost" data-a="syncoff">Unlink</button>';
  return (
    out +
    row(
      'Sync file',
      `<span class="sync ${st[1]}">${st[0]}</span>`,
      `<span class="row" style="gap:6px;flex-wrap:nowrap">${btns}</span>`
    )
  );
}
