/* PWA helpers that don't need a real browser: save backups, the Settings rows and app shortcuts. */
require('./harness');
const G = __G,
  A = __api;
localStorage.setItem(
  'cs_legend',
  JSON.stringify({ feats: { first: 1 }, kills: {}, lore: [], legs: [], stats: {} })
);
localStorage.setItem('cs_prefs', JSON.stringify({ sound: false }));
localStorage.setItem('other_app', 'keep me');

click('settings');
ok(
  /Save backup/.test(els.ov._h) && /Install the app/.test(els.ov._h) && /Version/.test(els.ov._h),
  'Settings shows install, backup and version'
);

A.pwaImportText('not json');
ok(
  G.importErr && !G.importData && /isn't a Cyber City Tactics save/.test(els.ov._h),
  'a bad file is rejected with a message'
);
A.pwaImportText(JSON.stringify({ app: 'something-else', data: {} }));
ok(!G.importData, "another app's file is rejected");
A.pwaImportText(
  JSON.stringify({ app: 'cyber-city-tactics', v: 1, date: '2026-01-02', data: { cs_legend: '{bad' } })
);
ok(!G.importData, 'a backup with a corrupt slot is rejected');

const backup = {
  app: 'cyber-city-tactics',
  v: 1,
  date: '2026-10-26',
  data: { cs_legend: JSON.stringify({ feats: { win: 1 } }), cs_world: '{"v":1}', evil: 'x' }
};
A.pwaImportText(JSON.stringify(backup));
ok(
  G.importData && Object.keys(G.importData.data).join() === 'cs_legend,cs_world',
  'a valid backup is accepted, foreign keys dropped'
);
ok(
  /Replace your saves with this backup/.test(els.ov._h) && /2026-10-26/.test(els.ov._h),
  'Settings asks before replacing'
);
click('importok');
ok(
  localStorage.getItem('cs_world') === '{"v":1}' &&
    JSON.parse(localStorage.getItem('cs_legend')).feats.win &&
    localStorage.getItem('cs_prefs') === null &&
    localStorage.getItem('other_app') === 'keep me',
  'import replaces every cs_ slot and leaves other keys alone'
);

click('setdone');
ok(!G.importData && !G.importErr, 'leaving Settings clears a pending import');

let downloaded = null;
const origCreate = document.createElement;
document.createElement = () => ({
  click() {
    downloaded = this.download;
  },
  remove() {},
  set href(v) {},
  get href() {
    return 'blob:x';
  }
});
document.body.appendChild = () => {};
A.pwaExport();
document.createElement = origCreate;
ok(
  /^cyber-city-tactics-save-\d{4}-\d{2}-\d{2}\.json$/.test(downloaded || ''),
  'export downloads a dated backup file: ' + downloaded
);

location.search = '?go=sprawl';
A.pwaShortcut();
ok(G.mode === 'worldpick', 'shortcut ?go=sprawl opens the Sprawl screen');
location.search = '?go=daily';
A.pwaShortcut();
ok(G.mode === 'arenapick', 'shortcut ?go=daily opens the Arena screen with the daily challenge');

// Corrupt or foreign saves must never crash a menu.
localStorage.setItem('cs_save3', '{"runners":5,"stage":"x"}');
localStorage.setItem('cs_world', '{"wd":{}}');
localStorage.setItem('cs_arena', '"nope"');
localStorage.setItem('cs_week', '[1,2]');
localStorage.setItem('cs_day', '7');
let crashed = null;
try {
  click('back2title');
  click('worldpick');
  click('back2title');
  click('arenapick');
  click('back2title');
} catch (e) {
  crashed = e.message;
}
ok(
  !crashed && !/data-a="cont"/.test(els.ov._h),
  'corrupt saves are ignored, not fatal' + (crashed ? ': ' + crashed : '')
);
