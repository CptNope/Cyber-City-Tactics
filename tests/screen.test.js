/* Full-screen fitting on every screen shape, and every campaign district still playable at every view width
 * (wave triggers must stay reachable when the view is wider than 480). */
require('./harness');
const G = __G,
  A = __api;
const vm = require('vm');
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
const stage = els.stage || document.getElementById('stage'),
  pad = document.getElementById('pad'),
  body = document.body,
  cvs = document.getElementById('game');
let touch = false;
body.classList.contains = c => c === 'touch' && touch;
const fitTo = (w, h, t, padH) => {
  touch = t;
  stage.getBoundingClientRect = () => ({ width: w, height: h, left: 0, top: 0 });
  pad.getBoundingClientRect = () => ({ width: w, height: padH || 0, left: 0, top: 0 });
  A.fit();
  return {
    W: A.W,
    VH: A.VH,
    BAND: A.BAND,
    BOT: A.BOT,
    cw: parseFloat(cvs.style.width),
    ch: parseFloat(cvs.style.height)
  };
};
const SHAPES = [
  ['1920x1080 desktop', 1920, 1080, false, 0],
  ['2560x1080 ultrawide', 2560, 1080, false, 0],
  ['3440x1440 ultrawide', 3440, 1440, false, 0],
  ['1280x800 laptop', 1280, 800, false, 0],
  ['1024x768 4:3', 1024, 768, false, 0],
  ['844x390 phone landscape', 844, 390, true, 140],
  ['390x844 phone portrait', 390, 844, true, 230],
  ['360x640 small phone', 360, 640, true, 220],
  ['1180x820 tablet landscape', 1180, 820, true, 150],
  ['820x1180 tablet portrait', 820, 1180, true, 180]
];
for (const [n, w, h, t, ph] of SHAPES) {
  const r = fitTo(w, h, t, ph);
  const full = r.cw === w && r.ch === h,
    shape = Math.abs(r.W / r.VH - w / h) < 0.01,
    parts = r.VH === 270 + r.BAND + r.BOT;
  ok(
    full && shape && parts,
    `${n}: canvas ${r.cw}×${r.ch} fills the screen, view ${r.W}×${r.VH} (band ${r.BAND}, ground ${r.BOT})`
  );
}
let r = fitTo(844, 390, true, 140);
ok(r.W > 480 && r.BOT === 0, 'wide phone: sees more street, controls float over it');
r = fitTo(390, 844, true, 230);
ok(
  r.BOT >= Math.round((230 * 480) / 390) && r.BAND > 46,
  'portrait phone: ground band under the controls, HUD band on top'
);
r = fitTo(1024, 768, false, 0);
ok(r.BOT === 0 && r.BAND === 90, '4:3 desktop: no control band, extra height goes to the HUD band');
r = fitTo(6000, 1000, false, 0);
ok(r.W === A.WMAX && r.cw < 6000, 'past 3.7:1 the view stops widening (only extreme screens letterbox)');

// every district reachable at every width: walk each stage's waves with the camera pushed to its limit
for (const w of [480, 584, 640, 853, 1000]) {
  vm.runInThisContext('W = ' + w);
  let okAll = true,
    where = '';
  for (let si = 0; si < A.STAGES.length && okAll; si++) {
    A.startStage(si);
    G.mode = 'play';
    const S = A.STAGES[si];
    for (let wi = 0; wi < S.waves.length; wi++) {
      let n = 0;
      while (!G.waveLive && n++ < 3000) {
        for (const p of __PL()) p.x = Math.min(S.len - 12, G.camX + A.W - 20);
        A.camera();
        A.waves();
      }
      if (!G.waveLive) {
        okAll = false;
        where = `district ${si + 1} wave ${wi + 1}`;
        break;
      }
      G.ents = G.ents.filter(e => e.team !== 1);
      A.waves();
    }
    if (okAll && !G.exitOpen) {
      okAll = false;
      where = `district ${si + 1} exit`;
    }
  }
  ok(
    okAll,
    `view ${w} wide: every wave and exit in all ${A.STAGES.length} districts is reachable${where ? ' (stuck at ' + where + ')' : ''}`
  );
}
vm.runInThisContext('W = 1000');
A.enterDen();
G.mode = 'den';
for (const p of __PL()) p.x = 900;
for (let i = 0; i < 60; i++) A.camera();
ok(G.camX === 0, 'the Den (960 long) under a 1000-wide view: camera stays put at 0 (' + G.camX + ')');
vm.runInThisContext('W = 480');
