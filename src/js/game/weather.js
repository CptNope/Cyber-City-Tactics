/* Cyber City Tactics · src/js/game/weather.js
 * Weather that changes how a street plays, not only how it looks:
 *  - rain and storms: the street is slick (every knock carries 30% further) and flying machines short out now
 *    and then (a drone or ICE drops sparking for a second and a half)
 *  - fog: foes with guns need to be a third closer to open up, and in the Sprawl a break-in in the fog adds one
 *    less heat star
 *  - acid rain (a Sprawl block event): cheap Street-grade armor corrodes, a point every half minute
 * Indoors (buildings, the Matrix) and on jobs, the weather stays outside.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
const WX = { slide: 1.3, fogSight: 0.65, shortT: 600, shortP: 0.25, corrodeT: 1800 };
/** The weather where the fight is: rain, storm, fog, sleet or clear. */
function wxNow() {
  if (G.drive || G.stealth || G.flight || G.training || G.den) return 'clear';
  const S = curS();
  return S ? weatherOf(S) : 'clear';
}
const wxWet = () => {
  const w = wxNow();
  return w === 'rain' || w === 'storm';
};
const wxSight = () => (wxNow() === 'fog' ? WX.fogSight : 1);
/** A flying machine in the rain: every so often, it shorts out. */
function wxShort(e) {
  e.wxT = (e.wxT === undefined ? WX.shortT : e.wxT) - 1;
  if (e.wxT > 0) return;
  e.wxT = WX.shortT;
  if (Math.random() >= WX.shortP || (e.d && e.d.boss)) return;
  e.stunT = Math.max(e.stunT || 0, 90);
  burst(e.x, e.y, e.z + 20, '#45d2ff', 8);
  G.texts.push({ x: e.x, y: e.y, z: e.z + 40, s: 'SHORTED', c: '#45d2ff', life: 40, sm: true });
  sfx.zap();
}
/** Acid rain on a Sprawl block: Street-grade armor loses a point every half minute (never below 1). */
function wxCorrode() {
  if (G.t % WX.corrodeT !== 0) return;
  for (const p of active()) {
    const a = p.eq && p.eq.armor;
    if (!a || a.rar > 0 || !(a.arm > 1)) continue;
    a.arm--;
    a.corroded = (a.corroded || 0) + 1;
    refresh(p);
    say(p, 'ARMOR CORRODING', '#b8ff4a', 70, 50, true);
  }
}
/** The first time each kind of weather starts to matter, say what it does. */
function wxTip() {
  const w = wxNow();
  if (w === 'rain' || w === 'storm')
    tip(
      'wxwet',
      'Rain: the street is slick, so every knock carries further, and drones short out now and then.'
    );
  else if (w === 'fog')
    tip(
      'wxfog',
      'Fog: gunmen have to get closer to shoot, and in the Sprawl a break-in in the fog draws one less heat star.'
    );
}
