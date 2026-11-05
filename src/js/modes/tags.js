/* Cyber City Tactics · src/js/modes/tags.js
 * Graffiti tags. A crew building you've cleaned out can take your tag: open its door and spray it. Every tag
 * on a block earns a point of street cred every half minute while you're on the street. The crew that lost
 * the building wants its wall back: now and then one of theirs comes to paint over a tag. Catch the painter
 * before they finish (ten seconds at the wall) and the tag stays, with a little extra cred; leave them to it
 * and it's gone. Tags are saved with the block (G.wd.tags).
 * Loaded as a classic script after sprawl.js: every file shares one global scope, in the order in index.html. */
'use strict';
const TAG = { credT: 1800, paintT: 600, painterT: [2400, 3600] };
const tagsOf = w => (w && Array.isArray(w.tags) ? w.tags : []);
const canTag = b =>
  !!(
    G.wd &&
    b &&
    (b.type === 'hideout' || b.type === 'club') &&
    G.wd.looted.includes(b.id) &&
    !tagsOf(G.wd).includes(b.id)
  );
function sprayTag(b) {
  const w = G.wd;
  if (!canTag(b)) return false;
  w.tags = tagsOf(w).concat(b.id);
  w.rep = Math.min(100, w.rep + 3);
  bump('tags');
  const p = alive()[0];
  if (p) say(p, 'TAGGED', p.pal.acc || '#ff3d8b', 80, 60);
  sfx.spell();
  tip(
    'tags',
    'Every tag earns street cred while you are on the block. Their old owners send painters to cover them: stop them.'
  );
  saveWorld();
  return true;
}
/** On the street each step: cred from your tags, and now and then a painter coming for one. */
function tagTick(w) {
  const tags = tagsOf(w);
  if (!tags.length) return;
  if (G.t % TAG.credT === 0) {
    w.rep = Math.min(100, w.rep + tags.length);
    const p = alive()[0];
    if (p)
      G.texts.push({
        x: p.x,
        y: p.y,
        z: 90,
        s: 'TAGS · CRED +' + tags.length,
        c: '#7dffb0',
        life: 50,
        sm: true
      });
  }
  w.paintT = (w.paintT === undefined ? ri(TAG.painterT[0], TAG.painterT[1]) : w.paintT) - 1;
  if (w.paintT > 0) return;
  w.paintT = ri(TAG.painterT[0], TAG.painterT[1]);
  if (G.ents.some(e => e.painter && e.state !== 'dead')) return;
  const b = w.street.buildings.find(x => x.id === pick(tags));
  if (!b) return;
  const e = spawnEnemy('ganger', b.x > G.camX + W / 2 ? 1 : -1);
  e.painter = e.wasPainter = b.id;
  e.paintT = TAG.paintT;
  e.elite = null;
  e.club = null;
  e.name = (FACTIONS[b.fac] ? FACTIONS[b.fac].name : 'Crew') + ' painter';
  const p = alive()[0];
  if (p) say(p, 'SOMEONE IS AT YOUR TAG', '#ffc63d', 90, 80);
}
/** A painter's step: walk to the wall and paint, unless someone picks a fight. True when it took the step. */
function painterTick(e) {
  if (e.hp < e.maxHp) {
    e.painter = null; // hit them and they forget the wall and fight
    return false;
  }
  const b = G.wd && G.wd.street.buildings.find(x => x.id === e.painter);
  if (!b || !tagsOf(G.wd).includes(b.id)) {
    e.painter = null;
    return false;
  }
  const tx = b.x - 22,
    ty = FY0 + 8;
  if (Math.abs(e.x - tx) > 3 || Math.abs(e.y - ty) > 3) {
    const s = e.d.spd * 1.2;
    e.x += clamp(tx - e.x, -s, s);
    e.y += clamp(ty - e.y, -s * 0.7, s * 0.7);
    e.face = tx >= e.x ? 1 : -1;
    if (e.state !== 'walk') setS(e, 'walk');
    e.walk += 1;
    return true;
  }
  if (e.state !== 'idle') setS(e, 'idle');
  e.face = -1;
  e.paintT--;
  if (G.t % 6 === 0)
    G.parts.push({ x: e.x - 8, y: e.y, z: 40, vx: -0.6, vy: 0, vz: 0.2, life: 18, c: '#9fb4d8', sz: 2 });
  if (e.paintT <= 0) {
    G.wd.tags = tagsOf(G.wd).filter(id => id !== b.id);
    G.texts.push({ x: b.x, y: FY0, z: 70, s: 'TAG PAINTED OVER', c: '#ff3d4a', life: 80 });
    e.gone = true;
  }
  return true;
}
/** A painter stopped before they finished: the tag stays, and the street notices. */
function painterDown(e) {
  if (!G.wd || !tagsOf(G.wd).includes(e.wasPainter)) return;
  G.wd.rep = Math.min(100, G.wd.rep + 2);
  G.texts.push({ x: e.x, y: e.y, z: 80, s: 'TAG DEFENDED', c: '#7dffb0', life: 70 });
}
/** On the building's wall: your runner's tag, a scrawl in their colour. */
function drawTag(b, dx, base) {
  if (!tagsOf(G.wd).includes(b.id)) return;
  const col = (PL[0] && PL[0].pal && PL[0].pal.acc) || '#ff3d8b',
    x = dx - 40,
    y = base - 28;
  ctx.strokeStyle = col;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const n = (PL[0] && PL[0].name) || 'RUN';
  // a scrawl seeded by the runner's name, so the same runner always throws the same tag
  let h = 7;
  for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  ctx.moveTo(x - 12, y + 4);
  for (let i = 0; i < 6; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    ctx.lineTo(x - 12 + i * 5, y - 4 + ((h >>> 16) % 12));
  }
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x + 16, y - 4, 3, 0, 6.29);
  ctx.stroke();
}
