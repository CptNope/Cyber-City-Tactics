/* Cyber City Tactics · src/js/modes/training.js
 * Juno's ten training drills.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ---------- training ---------- */
const trainee = (k, x, y, o) => {
  const e = spawnEnemy(k, 1);
  e.x = clamp(x, 40, W - 40);
  e.y = clamp(y, FY0 + 8, FY1 - 4);
  e.elite = null;
  e.inv = 0;
  e.trainee = !(o && o.live);
  e.cool = o && o.live ? 40 : 9999;
  if (o && o.hp) e.hp = e.maxHp = o.hp;
  if (o && o.dmg !== undefined) e.dmg = o.dmg;
  return e;
};
const clearFoes = () => {
  G.ents = G.ents.filter(e => e.team !== 1);
  G.props = [];
  G.projs = [];
  const p = PL[0];
  if (p && p.x > W - 200) {
    burst(p.x, p.y, 20, '#7dffb0', 10);
    p.x = 120;
    p.face = 1;
    burst(p.x, p.y, 20, '#7dffb0', 10);
  }
};
// Each step: what to say (touch / keyboard), how to set it up, and when it counts as done
const TRAIN = [
  {
    t: 'Drag anywhere on the left to walk to the glowing marker.',
    k: 'Walk to the glowing marker with WASD or the arrow keys.',
    setup() {
      G.marker = { x: 390, y: 245 };
    },
    done: p => Math.hypot(p.x - G.marker.x, (p.y - G.marker.y) * 1.6) < 16
  },
  {
    t: 'Tap PUNCH three times in a row on the dummy. The third hit is an uppercut.',
    k: 'Press J three times in a row on the dummy. The third hit is an uppercut.',
    setup(p) {
      G.marker = null;
      clearFoes();
      trainee('orc', p.x + 60, p.y, { hp: 999 });
    },
    done: () => G.tf.upper
  },
  {
    t: 'Riot shields block punches. KICK this one to break his guard.',
    k: 'Riot shields block punches. Kick (K) this one to break his guard.',
    setup(p) {
      clearFoes();
      const e = trainee('riot', p.x + 50, p.y, { hp: 999 });
      e.face = -1;
    },
    done: () => G.ents.some(e => e.kind === 'riot' && e.state === 'hurt')
  },
  {
    t: 'Drones fly. JUMP, then PUNCH or KICK in the air to knock this one out.',
    k: 'Drones fly. Jump (Space), then punch or kick in the air to knock this one out.',
    setup(p) {
      clearFoes();
      trainee('drone', p.x + 60, p.y, { hp: 12 });
    },
    done: () => !G.ents.some(e => e.kind === 'drone' && e.state !== 'dead')
  },
  {
    t: 'This ganger will swing at you. Tap DODGE as he winds up to roll through it.',
    k: 'This ganger will swing at you. Press O or Left Shift as he winds up to roll through it.',
    setup(p) {
      clearFoes();
      trainee('ganger', p.x + 70, p.y, { live: true, hp: 999, dmg: 1 });
    },
    done: () => G.tf.dodged
  },
  {
    t: 'Hit the ganger to stagger him, then walk into him to grab. KICK throws him.',
    k: 'Hit the ganger to stagger him, then walk into him to grab. K throws him.',
    setup(p) {
      clearFoes();
      trainee('ganger', p.x + 50, p.y, { hp: 999 });
    },
    done: () => G.tf.threw
  },
  {
    t: 'Stand by the drum and tap LIFT, then THROW it at the orc.',
    k: 'Stand by the drum and press J to lift it, then J again to throw it at the orc.',
    setup(p) {
      clearFoes();
      G.props = [{ kind: 'drum', x: p.x + 24, y: p.y, z: 0 }];
      trainee('orc', p.x + 150, p.y, { hp: 999 });
    },
    done: () => G.tf.prop
  },
  {
    t: 'Hold PUNCH until the ring glows, then let go for a heavy blow.',
    k: 'Hold J until the ring glows, then let go for a heavy blow.',
    setup(p) {
      clearFoes();
      trainee('orc', p.x + 50, p.y, { hp: 999 });
    },
    done: () => G.tf.heavy
  },
  {
    t: 'Tap GUN to shoot, then tap SPELL to cast. Hold SPELL to swap spells later.',
    k: 'Press U to shoot, then I to cast. Q swaps spells later.',
    setup(p) {
      clearFoes();
      trainee('ganger', p.x + 140, p.y, { hp: 999 });
      p.ammo = Math.max(p.ammo, 10);
      p.mp = p.maxMp;
      G.tf.shot = G.tf.cast = false;
    },
    done: () => G.tf.shot && G.tf.cast
  },
  {
    t: 'Your ★ meter fills as you fight. It is full now. Tap ★ to unleash your special.',
    k: 'Your ★ meter fills as you fight. It is full now. Press F (or punch and kick together).',
    setup(p) {
      clearFoes();
      trainee('ganger', p.x + 70, p.y, { hp: 60 });
      trainee('ganger', p.x + 110, p.y + 14, { hp: 60 });
      p.sp = 100;
    },
    done: () => G.tf.special
  }
];
function startTraining() {
  G.challenge = null;
  G.rngW = G.rngP = null;
  G.diff = 1;
  G.ng = 0;
  G.coop = false;
  PL = [newRunner(0)];
  applyArch(PL[0], G.pendArch[0]);
  Object.assign(PARTY, { creds: 0, bag: [], med: 2, contract: null, ally: null });
  G.training = true;
  G.arena = false;
  G.den = false;
  G.world = false;
  G.dun = null;
  G.stage = 0;
  resetWorld();
  G.bg = genBg(TRAIN_STAGE, 777);
  placeRunners(120);
  G.ents.push(PL[0]);
  makeRain(true);
  G.fade = 1;
  G.tstep = 0;
  G.tf = {};
  G.tdone = 0;
  TRAIN[0].setup(PL[0]);
  musicPlay('den');
  setMode('play');
}
function trainTick() {
  const p = PL[0];
  p.hp = Math.max(p.hp, p.maxHp * 0.5);
  p.lives = 3;
  if (p.state === 'upper') G.tf.upper = true;
  if (p.state === 'heavy') G.tf.heavy = true;
  if (
    p.state === 'roll' &&
    p.t < 12 &&
    G.ents.some(e => e.team === 1 && e.state === 'windup' && Math.abs(e.x - p.x) < 40)
  )
    G.tf.dodged = true;
  if (G.tdone > 0) {
    G.tdone--;
    if (G.tdone === 0) {
      G.tstep++;
      if (G.tstep >= TRAIN.length) {
        prefs.trained = true;
        savePrefs();
        clearFoes();
        setMode('trained');
        return;
      }
      G.tf = {};
      TRAIN[G.tstep].setup(p);
    }
    return;
  }
  if (TRAIN[G.tstep].done(p)) {
    G.tdone = 60;
    sfx.loot();
    G.texts.push({ x: p.x, y: p.y, z: 70, s: 'NICE', c: '#7dffb0', life: 50, big: true });
  }
}
function drawTraining() {
  if (!G.training) return;
  if (G.marker) {
    const sx = G.marker.x - G.camX;
    ctx.strokeStyle = `rgba(125,255,176,${0.5 + 0.3 * Math.sin(G.t * 0.15)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(sx, G.marker.y, 16, 5, 0, 0, 7);
    ctx.stroke();
    fillPoly([sx - 5, G.marker.y - 30, sx + 5, G.marker.y - 30, sx, G.marker.y - 20], '#7dffb0');
  }
  const st = TRAIN[Math.min(G.tstep, TRAIN.length - 1)],
    lines = wrapTip(ctl(st.t, st.k), 330),
    h = lines.length * 13 + 24,
    y = 48;
  ctx.globalAlpha = 0.94;
  ctx.fillStyle = '#0b0812';
  ctx.fillRect(W / 2 - 175, y, 350, h);
  ctx.strokeStyle = G.tdone > 0 ? '#7dffb0' : '#ff3d8b';
  ctx.lineWidth = 1;
  ctx.strokeRect(W / 2 - 174.5, y + 0.5, 349, h - 1);
  ctx.globalAlpha = 1;
  txt(
    'STEP ' +
      (Math.min(G.tstep, TRAIN.length - 1) + 1) +
      ' OF ' +
      TRAIN.length +
      (G.tdone > 0 ? '  ·  DONE' : ''),
    W / 2,
    y + 13,
    12,
    G.tdone > 0 ? '#7dffb0' : '#ff3d8b',
    'center',
    false
  );
  ctx.font = '11px "Chakra Petch", sans-serif';
  ctx.fillStyle = '#efe9ff';
  ctx.textAlign = 'center';
  lines.forEach((l, i) => ctx.fillText(l, W / 2, y + 28 + i * 13));
}
