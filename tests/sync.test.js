/* Cloud save without a server: save codes, and a sync file the game keeps up to date (with a fake file handle
 * standing in for the File System Access API). */
'use strict';
require('./harness');
const G = __G,
  A = __api;
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
const meta = () => JSON.parse(localStorage.getItem('cct_sync') || '{}');
const fake = (text, o) => {
  const h = {
    name: 'cct-sync.json',
    text: text || '',
    writes: 0,
    async getFile() {
      if (o && o.gone) throw new Error('gone');
      return { text: async () => h.text };
    },
    async createWritable() {
      let buf = '';
      return {
        write: async s => {
          buf += s;
        },
        close: async () => {
          h.text = buf;
          h.writes++;
        }
      };
    },
    async queryPermission() {
      return (o && o.perm) || 'granted';
    },
    async requestPermission() {
      return 'granted';
    }
  };
  return h;
};
const reset = () => {
  A.SYNC.handle = null;
  A.SYNC.state = 'off';
  G.importData = G.importErr = null;
};

(async () => {
  localStorage.setItem('cs_legend', JSON.stringify({ feats: { first: 1 }, kills: { ganger: 40 } }));
  localStorage.setItem('cs_world', JSON.stringify({ v: 1, creds: 1234, stash: new Array(40).fill('pipe') }));
  localStorage.setItem('other_app', 'not ours');

  /* ---------- the change stamp ---------- */
  localStorage.removeItem('cct_sync');
  A.store.set('cs_stealth', { best: 3 });
  const s1 = meta().stamp;
  ok(s1 > 0, 'saving a game slot stamps the change');
  A.store.set('cs_flight', { best: 4 });
  ok(meta().stamp > s1, 'every save moves the stamp on');
  const s2 = meta().stamp;
  A.store.set('elsewhere', 1);
  ok(meta().stamp === s2, "keys that aren't saves don't count");
  ok(!('cct_sync' in A.saveBundle().data), 'the stamp itself is never part of a backup');

  /* ---------- save codes ---------- */
  const code = await A.saveCode();
  ok(/^CCTSz[A-Za-z0-9_-]+$/.test(code), 'a save code is one line of URL-safe text');
  ok(
    code.length < JSON.stringify(A.saveBundle()).length,
    `and shorter than the backup file (${code.length} chars)`
  );
  const back = JSON.parse(await A.codeText(code));
  ok(
    back.app === 'cyber-city-tactics' &&
      JSON.parse(back.data.cs_world).creds === 1234 &&
      !back.data.other_app,
    'it unpacks to every save, and nothing else'
  );
  ok(
    JSON.parse(await A.codeText(code.replace(/(.{40})/g, '$1\n  '))).data.cs_legend,
    'line breaks pasted in are fine'
  );
  click('settings');
  await A.codeLoad('hello');
  ok(G.importErr && /save code/.test(els.ov._h), 'something that isn’t a code is turned away');
  await A.codeLoad('CCT1zAAAA');
  ok(!G.importData, 'an online invite code is not a save code');
  await A.codeLoad(code.slice(0, -30));
  ok(!G.importData && G.importErr, 'nor is half a code');
  await A.codeLoad(code);
  ok(G.importData && G.importData.from === 'code', 'a whole code is ready to load');
  ok(/Replace your saves with this code/.test(els.ov._h), 'Settings asks before replacing, as for a file');
  click('importno');
  click('codemake');
  for (let i = 0; i < 2000 && !G.codeOut; i++) await new Promise(r => setImmediate(r)); // compression takes a while on a slow runner
  ok(
    G.codeOut && /Your save code/.test(els.ov._h) && /<textarea readonly/.test(els.ov._h),
    'Make shows the code to copy'
  );
  navigator.clipboard = { writeText: async () => {} };
  await A.codeCopy();
  ok(/Copied/.test(els.ov._h), 'Copy puts it on the clipboard');
  navigator.clipboard = {
    writeText: async () => {
      throw new Error('blocked');
    }
  };
  await A.codeCopy();
  ok(/Select the code/.test(els.ov._h), 'and says what to do when the browser blocks that');
  click('codeclose');
  click('codeenter');
  ok(/id="codeIn"/.test(els.ov._h), 'Enter opens a box to paste into');
  click('codeclose');

  /* ---------- Settings ---------- */
  A.SYNC.ok = false;
  A.renderOv();
  ok(
    /Save code/.test(els.ov._h) && /Sync file/.test(els.ov._h) && /Chrome or Edge/.test(els.ov._h),
    'without file access, Settings points to save codes'
  );
  A.SYNC.ok = true;
  A.renderOv();
  ok(
    /data-a="synclink"/.test(els.ov._h) && /data-a="syncopen"/.test(els.ov._h),
    'with it: a new sync file, or open one'
  );
  location.hostname = 'claude.ai';
  A.renderOv();
  ok(
    /Save code/.test(els.ov._h) && !/data-a="export"/.test(els.ov._h) && !/Sync file/.test(els.ov._h),
    'in the claude.ai preview: save codes only'
  );
  location.hostname = '';

  /* ---------- the sync file ---------- */
  reset();
  let h = fake('');
  await A.syncAdopt(h);
  ok(A.SYNC.state === 'on' && h.writes === 1, 'a new, empty file gets this device’s saves');
  ok(
    JSON.parse(h.text).data.cs_world && meta().synced === meta().stamp,
    'all of them, and the stamp is in step'
  );
  A.renderOv();
  ok(
    /Syncing to <b>cct-sync\.json/.test(els.ov._h) && /data-a="syncnow"/.test(els.ov._h),
    'Settings shows the file'
  );
  A.store.set('cs_world', { v: 1, creds: 99 });
  ok(meta().stamp > meta().synced, 'a save marks the file as behind');
  await A.syncFlush();
  ok(
    h.writes === 2 && JSON.parse(JSON.parse(h.text).data.cs_world).creds === 99,
    'and the next sync writes it'
  );

  // another device saved later
  const newer = A.saveBundle();
  newer.stamp = meta().stamp + 5000;
  newer.data.cs_world = JSON.stringify({ v: 1, creds: 777 });
  reset();
  h = fake(JSON.stringify(newer));
  G.mode = 'title';
  await A.syncAdopt(h);
  ok(
    A.SYNC.state === 'hold' && G.importData && G.importData.from === 'sync',
    'a file with newer saves is offered'
  );
  ok(h.writes === 0, 'and left alone until you choose');
  ok(G.tip && /newer saves/.test(G.tip.s), 'outside Settings, a tip says so');
  click('settings');
  ok(
    /sync file has newer saves/.test(els.ov._h) && /Keep this device/.test(els.ov._h),
    'Settings asks which to keep'
  );
  click('setdone');
  ok(G.importData && G.importData.from === 'sync', 'leaving Settings doesn’t drop the question');
  click('settings');
  click('importok');
  ok(JSON.parse(localStorage.getItem('cs_world')).creds === 777, 'Load takes the file’s saves');
  ok(meta().stamp === newer.stamp && meta().synced === newer.stamp, 'and this device is now in step with it');

  // keep this device's instead
  newer.stamp = meta().stamp + 5000;
  newer.data.cs_world = JSON.stringify({ v: 1, creds: 5 });
  reset();
  h = fake(JSON.stringify(newer));
  await A.syncAdopt(h);
  click('settings');
  click('importno');
  await new Promise(r => setImmediate(r));
  ok(
    A.SYNC.state === 'on' && h.writes === 1 && JSON.parse(JSON.parse(h.text).data.cs_world).creds === 777,
    'Keep this device’s saves: they go to the file'
  );
  ok(JSON.parse(h.text).stamp > newer.stamp, 'stamped newer, so other devices pick them up');

  // an older file is simply brought up to date
  const older = A.saveBundle();
  older.stamp = 1;
  reset();
  h = fake(JSON.stringify(older));
  await A.syncAdopt(h);
  ok(A.SYNC.state === 'on' && !G.importData && h.writes === 1, 'an older file is overwritten without asking');

  // a file that's been moved or deleted
  reset();
  h = fake('', { gone: true });
  await A.syncAdopt(h);
  A.renderOv();
  ok(
    A.SYNC.state === 'error' && /Couldn.t reach/.test(els.ov._h) && /data-a="syncresume"/.test(els.ov._h),
    'a missing file is reported, with Resume'
  );

  // a junk file isn't loaded, and gets real saves
  reset();
  h = fake('{"app":"something-else"}');
  await A.syncAdopt(h);
  ok(
    A.SYNC.state === 'on' && JSON.parse(h.text).app === 'cyber-city-tactics',
    'a file that isn’t ours is replaced with saves'
  );

  // after a restart the browser asks again
  reset();
  h = fake('', { perm: 'prompt' });
  A.SYNC.handle = h;
  A.SYNC.state = 'paused';
  A.renderOv();
  ok(/needs your OK again/.test(els.ov._h) && /Resume/.test(els.ov._h), 'a paused link asks for a click');
  await A.syncResume();
  ok(A.SYNC.state === 'on', 'Resume picks it back up');
  A.syncUnlink();
  ok(A.SYNC.state === 'off' && !A.SYNC.handle && /data-a="synclink"/.test(els.ov._h), 'Unlink stops syncing');
  const w = h.writes;
  A.store.set('cs_world', { v: 1 });
  await A.syncFlush();
  ok(h.writes === w, 'and nothing is written after');

  // a code or file import is a deliberate change: it wins over a sync file
  const before = meta().stamp;
  A.pwaImportText(JSON.stringify(older), 'file');
  A.pwaImportApply();
  ok(meta().stamp > before, 'loading a backup counts as the newest saves');
  click('setdone');
})();
