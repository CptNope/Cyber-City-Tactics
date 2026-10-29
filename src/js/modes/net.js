/* Cyber City Tactics · src/js/modes/net.js
 * Online co-op: two browsers, any mode (the Arena, the campaign, the Sprawl).
 *
 * Connecting: WebRTC peer to peer. The host makes an invite code (its connection offer, compressed and
 * base64'd); the friend pastes it and gets a reply code to send back; the host pastes that and the data
 * channel opens. Codes travel however the players like: chat, text, email. A public STUN server helps the
 * two find each other across the internet; on one Wi-Fi network it isn't needed at all.
 *
 * Playing: the host's game is the real one. It runs the simulation as usual with the friend as runner 2:
 * the friend's browser sends its buttons (held flags plus a press counter per button, so a quick tap is
 * never lost between packets) and the host feeds them into INP[1]. About 30 times a second the host sends
 * a snapshot: only the entity fields that changed since the last one, the projectiles, new particles,
 * floating text and effects, the sounds that played and the song. The friend's browser runs no game logic;
 * it eases entities toward each snapshot, ticks the cosmetic bits itself and draws with the normal renderer.
 *
 * Scope: once connected the host gets a hub (it stands in for the title) and starts anything; the friend joins
 * it as runner 2 (netHostTick adds them). The host runs the menus, shops and briefings while the friend sees
 * what they're doing; the friend's own character sheet sends its point, skill and gear clicks to the host
 * (netRemoteAct), which runs them as runner 2. Training stays solo.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
const NET_ICE = [{ urls: 'stun:stun.cloudflare.com:3478' }];
// The lobby (server/worker.js on Cloudflare): short room codes instead of long ones, and relay passes (TURN)
// for networks that block direct connections. Empty means long codes only. ?lobby=URL overrides it.
const NET_LOBBY = 'https://cct-lobby.jca2016satx.workers.dev';
const NET_ROOM_RE = /^[A-HJ-NP-Za-hj-np-z2-9]{5}$/;
const NET_ACTS = [
  'left',
  'right',
  'up',
  'down',
  'punch',
  'kick',
  'jump',
  'gun',
  'spell',
  'dodge',
  'swap',
  'item',
  'special'
];
// G fields the friend's screen never needs: sent another way, the host's own menus and choices, or local
// render caches. Everything else in G is mirrored, so any mode (Arena, the campaign, the Sprawl) just works.
const NET_GDENY = new Set([
  'ents',
  'projs',
  'parts',
  'texts',
  'fx',
  'picks',
  'props',
  'rain',
  'bg',
  'mode',
  'ret',
  'pendArch',
  'pendDiff',
  'pendMuts',
  'pendCoat',
  'pendTrail',
  'booted',
  'sheetIdx',
  'sheetTab',
  'tree',
  'justLearned',
  'seedPre',
  'seedErr',
  'rngW',
  'rngP',
  'run',
  'tipQ',
  'pcamX',
  'hack',
  'arenaSeed',
  'shopSig'
]);
// what the friend sees while the host is in each menu
const NET_WAIT = {
  title: 'Your partner is choosing what to play.',
  nethub: 'Your partner is choosing what to play.',
  online: 'Your partner is choosing what to play.',
  pick: 'Your partner is setting up a campaign run.',
  arenapick: 'Your partner is setting up an Arena run.',
  worldpick: 'Your partner is heading out into the Sprawl.',
  trainpick: 'Your partner is choosing what to play.',
  trainoffer: 'Your partner is choosing what to play.',
  settings: 'Your partner is changing settings.',
  codex: 'Your partner is reading the Codex.',
  start: 'Joining…',
  brief: 'Your partner is reading the job briefing.',
  perk: 'Your partner is picking a perk for the team.',
  pause: 'Your partner paused the game.',
  sheet: 'Your partner is on the character sheet.',
  npc: 'Your partner is talking to someone in the Den.',
  shop: 'Your partner is shopping.',
  trader: 'Your partner is haggling with Sable.',
  locker: 'Your partner is in the locker.',
  safe: 'Your partner is cracking a safe.',
  bcard: 'Your partner is sizing up a building.',
  map: 'Your partner is looking at the block map.',
  hack: 'Your partner is hacking a terminal.',
  over: 'Out of lives. Your partner can retry or head back.',
  wiped: 'Wiped out. Your partner can retry or head back.',
  win: 'The campaign is done. Nice work.',
  jobs: 'Your partner is picking a job.',
  driveover: 'The run is over. Your partner can ride it again or pick another job.',
  stealthover: 'The job is over. Your partner can fly it again or pick another job.'
};
const NET = {
  role: null, // 'host' | 'guest' | null
  live: false, // connected and in a game together
  status: '', // what the online card shows: '', 'making', 'offer', 'joining', 'answer', 'connecting', 'error'
  err: '',
  code: '', // this side's code to send
  draft: '', // what's pasted in the code box
  pc: null,
  dc: null,
  ice: NET_ICE,
  // host
  nid: 0,
  sent: new Map(), // nid -> {key: last sent JSON}
  gsent: {},
  gref: {},
  snapN: 0,
  bgRef: null,
  rIn: null,
  rCnt: {},
  sfxQ: [],
  inUpd: false,
  hmode: '',
  // guest
  ents: new Map(),
  q: [],
  hm: 'play',
  cnt: {},
  lastIn: '',
  inT: 0,
  rxT: 0,
  lostMsg: ''
};
const netHost = () => NET.role === 'host' && NET.live;
const netGuest = () => NET.role === 'guest' && NET.live;
// true when runner 2's buttons come over the network, so this keyboard and pad drive runner 1 only
const netP2 = () => netHost();

/* ---------- invite codes ---------- */
const b64u = u8 => {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000)
    s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64u = s => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  const u = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return u;
};
async function packCode(desc) {
  const raw = new TextEncoder().encode(JSON.stringify({ t: desc.type, s: desc.sdp, v: APP_VERSION }));
  if (typeof CompressionStream === 'undefined') return 'CCT1p' + b64u(raw);
  const st = new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return 'CCT1z' + b64u(new Uint8Array(await new Response(st).arrayBuffer()));
}
async function unpackCode(code) {
  code = (code || '').replace(/\s+/g, '');
  const m = code.match(/CCT1([zp])([A-Za-z0-9_-]+)/);
  if (!m) throw new Error("That doesn't look like a Cyber City Tactics code.");
  let u = unb64u(m[2]);
  if (m[1] === 'z') {
    const st = new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    u = new Uint8Array(await new Response(st).arrayBuffer());
  }
  const o = JSON.parse(new TextDecoder().decode(u));
  return { type: o.t, sdp: o.s, v: o.v };
}
// codes are fixed once ICE gathering finishes (no trickle), so give it a few seconds at most
function iceDone(pc) {
  return new Promise(res => {
    if (pc.iceGatheringState === 'complete') return res();
    const t = setTimeout(res, 3500);
    pc.addEventListener('icegatheringstatechange', () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(t);
        res();
      }
    });
  });
}
function netPc(ice) {
  const pc = new RTCPeerConnection({ iceServers: ice || NET.ice });
  pc.addEventListener('connectionstatechange', () => {
    if (pc !== NET.pc) return;
    if (pc.connectionState === 'failed')
      netLost(
        NET.live
          ? 'The connection dropped.'
          : "Couldn't connect. Check both codes, or try on the same Wi-Fi.",
        NET.live
      );
  });
  NET.pc = pc;
  return pc;
}
function lobbyUrl() {
  if (typeof location === 'undefined') return '';
  try {
    const q = new URLSearchParams(location.search).get('lobby');
    if (q === 'off') return '';
    if (q && /^https?:\/\/[^\s]+$/.test(q)) return q.replace(/\/+$/, '');
  } catch (e) {}
  return /^https?:$/.test(location.protocol) ? NET_LOBBY : '';
}
async function lobby(path, body) {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null,
    t = setTimeout(() => ctl && ctl.abort(), 6000);
  try {
    return await fetch(lobbyUrl() + path, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctl ? ctl.signal : undefined,
      cache: 'no-store'
    });
  } finally {
    clearTimeout(t);
  }
}
// relay passes from the lobby when it's there; plain STUN otherwise (or whatever a test pinned in NET.ice)
async function netIce() {
  if (NET.ice !== NET_ICE || !lobbyUrl()) return NET.ice;
  try {
    const r = await lobby('/ice');
    if (r.ok) {
      const d = await r.json();
      NET.relay = !!d.relay;
      if (Array.isArray(d.iceServers) && d.iceServers.length) return d.iceServers;
    }
  } catch (e) {}
  return NET.ice;
}
function netPollStop() {
  clearInterval(NET.pollT);
  NET.pollT = 0;
}
// the host waits for the friend's reply to land in the room
function netPollAnswer() {
  netPollStop();
  const room = NET.room;
  NET.pollT = setInterval(async () => {
    if (NET.room !== room || NET.status !== 'offer') return netPollStop();
    try {
      const r = await lobby('/rooms/' + room + '/answer');
      if (NET.room !== room || NET.status !== 'offer') return;
      if (r.status === 200) {
        netPollStop();
        const d = await r.json();
        netAnswer(d.answer);
      } else if (r.status === 404) {
        netPollStop();
        netFail(new Error('That room expired. Host again for a new code.'));
      }
    } catch (e) {}
  }, 1500);
}
function netFail(e) {
  NET.status = 'error';
  NET.err = (e && e.message) || String(e);
  if (G.mode === 'netlost') NET.lostMsg = NET.err; // a rejoin that didn't take: say why on the same card
  if (G.mode === 'online' || G.mode === 'netlost') renderOv();
}
async function netStartHost() {
  netClose();
  NET.role = 'host';
  NET.status = 'making';
  renderOv();
  try {
    if (typeof RTCPeerConnection === 'undefined') throw new Error("This browser can't do online play.");
    const pc = netPc(await netIce());
    netBind(pc.createDataChannel('cct', { ordered: true }));
    await pc.setLocalDescription(await pc.createOffer());
    await iceDone(pc);
    if (pc !== NET.pc) return;
    NET.code = await packCode(pc.localDescription);
    NET.draft = '';
    NET.room = '';
    if (lobbyUrl())
      try {
        const r = await lobby('/rooms', { offer: NET.code });
        if (r.status === 201) {
          const d = await r.json();
          NET.room = d.code;
          NET.roomKey = d.key || '';
        }
      } catch (e) {}
    if (pc !== NET.pc) return;
    NET.lobbyDown = !!lobbyUrl() && !NET.room;
    NET.status = 'offer';
    if (NET.room) netPollAnswer();
  } catch (e) {
    return netFail(e);
  }
  if (G.mode === 'online') renderOv();
}
async function netAnswer(code) {
  try {
    const d = await unpackCode(code);
    if (d.type !== 'answer')
      throw new Error('That is an invite code. Paste the reply code your friend sent back.');
    NET.status = 'connecting';
    renderOv();
    await NET.pc.setRemoteDescription({ type: 'answer', sdp: d.sdp });
  } catch (e) {
    netFail(e);
  }
}
async function netStartJoin(code) {
  netClose();
  NET.role = 'guest';
  NET.status = 'joining';
  renderOv();
  let room = '';
  try {
    if (typeof RTCPeerConnection === 'undefined') throw new Error("This browser can't do online play.");
    code = (code || '').trim();
    // a five-letter room code: fetch the invite from the lobby
    if (NET_ROOM_RE.test(code)) {
      if (!lobbyUrl())
        throw new Error('Room codes need the online lobby. Ask the host for the long invite code.');
      let r;
      try {
        r = await lobby('/rooms/' + code.toUpperCase());
      } catch (e) {
        throw new Error(
          "Couldn't reach the lobby. Check your connection, or ask the host for the long invite code."
        );
      }
      if (r.status === 404)
        throw new Error('No room with that code. Check the letters, or ask the host to host again.');
      if (!r.ok) throw new Error("The lobby didn't answer. Ask the host for the long invite code.");
      room = code.toUpperCase();
      code = (await r.json()).offer;
    }
    const d = await unpackCode(code);
    if (d.type !== 'offer') throw new Error("That's a reply code. Paste the invite code from the host.");
    if (d.v && d.v.split('+')[0] !== APP_VERSION.split('+')[0])
      throw new Error(
        `The host is on version ${d.v.split('+')[0]} and you're on ${APP_VERSION.split('+')[0]}. Both reload the game and try again.`
      );
    const pc = netPc(await netIce());
    pc.addEventListener('datachannel', e => netBind(e.channel));
    await pc.setRemoteDescription({ type: 'offer', sdp: d.sdp });
    await pc.setLocalDescription(await pc.createAnswer());
    await iceDone(pc);
    if (pc !== NET.pc) return;
    NET.code = await packCode(pc.localDescription);
    NET.room = room;
    if (room) NET.lastRoom = room;
    NET.status = 'answer';
    if (room) {
      const r = await lobby('/rooms/' + room + '/answer', { answer: NET.code }).catch(() => null);
      if (r && r.status === 409)
        throw new Error(
          NET.rejoining
            ? "The host hasn't reopened the room yet. Give it a few seconds and try again."
            : 'Someone already joined that room. Ask the host to host again.'
        );
      NET.status = r && r.ok ? 'sent' : 'answer';
    }
  } catch (e) {
    return netFail(e);
  }
  if (G.mode === 'online') renderOv();
}
function netBind(dc) {
  NET.dc = dc;
  dc.addEventListener('open', () => {
    if (dc !== NET.dc) return;
    if (NET.role === 'guest')
      netSend({
        k: 'hello',
        arch: G.pendArch[0],
        coat: pendCoat(0),
        trail: pendTrail(0)
      });
  });
  dc.addEventListener('message', e => {
    if (dc !== NET.dc) return;
    try {
      netRecv(e.data);
    } catch (err) {
      console.error('Cyber City Tactics net message', err);
    }
  });
  dc.addEventListener('close', () => {
    if (dc === NET.dc)
      netLost(NET.role === 'guest' ? 'The connection to the host dropped.' : 'Your partner dropped.', true);
  });
}
function netSend(o) {
  const dc = NET.dc;
  if (!dc || dc.readyState !== 'open') return false;
  try {
    dc.send(typeof o === 'string' ? o : JSON.stringify(o));
    return true;
  } catch (e) {
    return false;
  }
}
// tear everything down without telling anyone (used before starting over)
function netClose() {
  const pc = NET.pc,
    dc = NET.dc;
  NET.pc = NET.dc = null;
  netPollStop();
  NET.room = '';
  NET.roomKey = '';
  NET.lobbyDown = false;
  NET.relay = false;
  try {
    if (dc) dc.close();
  } catch (e) {}
  try {
    if (pc) pc.close();
  } catch (e) {}
  NET.live = false;
  NET.role = null;
  NET.status = '';
  NET.err = '';
  NET.code = '';
  NET.rIn = null;
  NET.rCnt = {};
  NET.sent = new Map();
  NET.gsent = {};
  NET.gref = {};
  NET.bgRef = null;
  NET.sfxQ = [];
  NET.ents = new Map();
  NET.q = [];
  NET.cnt = {};
  NET.hmode = '';
}
// leaving on purpose: say goodbye first so the other side shows a clean message
function netLeave() {
  netSend({ k: 'bye' });
  const guest = NET.role === 'guest';
  netClose();
  if (guest) attract(); // put a valid street back behind the menus
}
// dropped: the connection failed rather than someone choosing to leave, so a rejoin makes sense
function netLost(msg, dropped) {
  const role = NET.role,
    was = NET.live,
    room = NET.room,
    key = NET.roomKey,
    away = role === 'host' && was && dropped && PL[1] ? PL[1] : null;
  netClose();
  if (role === 'host') {
    if (was && G.coop) {
      dropRunner2();
      G.texts.push({
        x: G.camX + W / 2,
        y: 140,
        z: 0,
        s: dropped ? 'PARTNER DROPPED' : 'PARTNER LEFT',
        c: '#ff3d8b',
        life: 110,
        big: true
      });
    }
    // keep their runner and reopen the same room code, so they can come straight back
    if (away && room && key && lobbyUrl()) {
      NET.away = away;
      netRehost(room, key);
    }
    if (G.mode === 'online') {
      NET.status = 'error';
      NET.err = msg;
      renderOv();
    }
  } else if (role === 'guest') {
    NET.lostMsg = msg;
    NET.canRejoin = !!(dropped && NET.lastRoom && lobbyUrl());
    NET.rejoining = false;
    attract();
    musicPlay('title');
    setMode('netlost');
  }
}
async function netRehost(room, key) {
  NET.role = 'host';
  NET.status = 'making';
  try {
    const pc = netPc(await netIce());
    netBind(pc.createDataChannel('cct', { ordered: true }));
    await pc.setLocalDescription(await pc.createOffer());
    await iceDone(pc);
    if (pc !== NET.pc) return;
    NET.code = await packCode(pc.localDescription);
    const r = await lobby('/rooms/' + room + '/reopen', { offer: NET.code, key });
    if (pc !== NET.pc) return;
    if (!r.ok) throw new Error('reopen ' + r.status);
    NET.room = room;
    NET.roomKey = key;
    NET.status = 'offer';
    netPollAnswer();
  } catch (e) {
    NET.away = null;
    netClose();
  }
}
// the host's tag while the friend is away
function netAwayTag() {
  return NET.role === 'host' && NET.away && NET.room && !NET.live
    ? 'PARTNER DROPPED · ROOM ' + NET.room + ' TO REJOIN'
    : '';
}

/* ---------- messages ---------- */
function netRecv(data) {
  const fix = [];
  const m = JSON.parse(data, function (k, v) {
    if (v && typeof v === 'object' && v.$e !== undefined) {
      fix.push([this, k, v.$e]);
      return null;
    }
    return v;
  });
  NET.rxT = performance.now();
  if (m.k === 'in' && NET.role === 'host') NET.rIn = m;
  else if (m.k === 'act' && NET.role === 'host' && NET.live) netRemoteAct(m.a, m.m);
  else if (m.k === 'hello' && NET.role === 'host') netHostBegin(m);
  else if (m.k === 'start' && NET.role === 'guest') netGuestBegin(m);
  else if (m.k === 's' && NET.role === 'guest') {
    m.fix = fix;
    NET.q.push(m);
    if (NET.q.length > 30) NET.q.splice(0, NET.q.length - 30);
  } else if (m.k === 'bye')
    netLost(NET.role === 'guest' ? 'The host left the game.' : 'Your partner left the game.', false);
}

/* ---------- host ---------- */
function netHostBegin(m) {
  if (ARCH[m.arch] && !archLocked(m.arch)) G.pendArch[1] = m.arch;
  G.pendCoat = (G.pendCoat || LEG.pendCoat || ['sig', 'sig']).slice();
  G.pendTrail = (G.pendTrail || LEG.pendTrail || ['none', 'none']).slice();
  if (COATS[m.coat]) G.pendCoat[1] = m.coat;
  if (TRAILS[m.trail]) G.pendTrail[1] = m.trail;
  NET.live = true;
  NET.status = 'live';
  NET.sent = new Map();
  NET.gsent = {};
  NET.gref = {};
  NET.bgRef = null;
  NET.hmode = '';
  NET.friend = { arch: G.pendArch[1] };
  netSend({ k: 'start', v: APP_VERSION });
  // back from a drop, mid-run: the same runner walks back in
  const away = NET.away;
  NET.away = null;
  if (away && PL.length === 1 && G.mode !== 'nethub' && G.mode !== 'title' && !G.training) {
    const p1 = PL[0];
    PL.push(away);
    G.coop = true;
    away.out = false;
    away.holding = null;
    away.inv = 90;
    away.x = clamp(p1.x - 20, G.camX + 20, G.camX + W - 20);
    away.y = clamp(p1.y + 16, FY0 + 6, FY1);
    if (G.mode === 'play' || G.mode === 'den' || G.ret === 'play' || G.ret === 'den') G.ents.push(away);
    say(away, (away.name || 'RUNNER 2') + ' IS BACK', '#ffc63d', 70, 80);
    return;
  }
  setMode('nethub');
}
// runner 2's buttons, as last reported by the friend
function netHostInput() {
  const r = NET.rIn;
  if (!r) return;
  const s = INP[1];
  for (let i = 0; i < NET_ACTS.length; i++) {
    const a = NET_ACTS[i];
    s.held[a] = r.h.charCodeAt(i) === 49;
    const c = r.c[a] || 0;
    if (c !== (NET.rCnt[a] || 0)) {
      s.pressed[a] = true;
      NET.rCnt[a] = c;
    }
  }
}
// numbers to 2 decimals and entities to {$e:nid}: smaller packets and stable deltas
function netNid(e) {
  if (!e.nid) e.nid = ++NET.nid;
  return e.nid;
}
const netIsEnt = v => v.team !== undefined && v.state !== undefined && v.x !== undefined;
function netJson(v, top) {
  return JSON.stringify(v, function (k, x) {
    if (typeof x === 'number') return Number.isInteger(x) ? x : Math.round(x * 100) / 100;
    if (x && typeof x === 'object' && x !== top && !Array.isArray(x) && netIsEnt(x)) return { $e: netNid(x) };
    if (typeof x === 'function') return undefined;
    return x;
  });
}
function netEntDelta(e, full) {
  const nid = netNid(e);
  let last = NET.sent.get(nid);
  if (!last || full) NET.sent.set(nid, (last = {}));
  const out = {};
  let n = 0;
  for (const k in e) {
    if (k.charCodeAt(0) === 95 || k === 'px' || k === 'py' || k === 'pz') continue; // _private and render caches
    const v = e[k];
    let j;
    if (k === 'd' && typeof DEF !== 'undefined' && v === DEF[e.kind]) j = '"$D"';
    else if (v === undefined || typeof v === 'function') continue;
    else j = netJson(v, e);
    if (last[k] !== j) {
      last[k] = j;
      out[k] = j;
      n++;
    }
  }
  for (const k in last)
    if (!(k in e) || e[k] === undefined) {
      if (last[k] !== '"$U"') {
        last[k] = '"$U"';
        out[k] = '"$U"';
        n++;
      }
    }
  return n
    ? '[' +
        nid +
        ',{' +
        Object.keys(out)
          .map(k => JSON.stringify(k) + ':' + out[k])
          .join(',') +
        '}]'
    : null;
}
function netFresh(list, cap) {
  const out = [];
  for (const q of list)
    if (!q._ns) {
      q._ns = 1;
      if (out.length < cap) out.push(q);
    }
  return out;
}
function netSnapshot() {
  const ents = G.ents.slice();
  for (const p of PL) if (!ents.includes(p)) ents.push(p);
  const parts = [];
  for (const e of ents) {
    const d = netEntDelta(e);
    if (d) parts.push(d);
  }
  // forget entities that are gone, so a reused object would resend in full
  const live = new Set(ents.map(netNid));
  for (const k of NET.sent.keys()) if (!live.has(k)) NET.sent.delete(k);
  // G: numbers and strings every time; objects when they're replaced, and re-checked a few times a second
  const g = {},
    deep = NET.snapN++ % 8 === 0;
  for (const k of Object.keys(G)) {
    if (NET_GDENY.has(k) || k.charCodeAt(0) === 95) continue;
    const v = G[k];
    if (typeof v === 'function') continue;
    if (v && typeof v === 'object' && !deep && NET.gref[k] === v) continue;
    NET.gref[k] = v;
    const j = v === undefined ? '"$U"' : netJson(v);
    if (NET.gsent[k] !== j) {
      NET.gsent[k] = j;
      g[k] = j;
    }
  }
  for (const q of G.projs) netNid(q);
  const pk = netJson(G.picks);
  const pp = netJson(G.props);
  const head = {
    t: G.t,
    hm: G.mode,
    mu: typeof M !== 'undefined' ? M.cur : '',
    rn: G.rain.length > 0 ? 1 : 0,
    hg: typeof haggle !== 'undefined' ? haggle : null,
    o: G.ents.map(netNid),
    pl: PL.map(netNid),
    sx: NET.sfxQ.splice(0)
  };
  let out =
    '{"k":"s",' +
    netJson(head).slice(1, -1) +
    ',"e":[' +
    parts.join(',') +
    '],"g":{' +
    Object.keys(g)
      .map(k => JSON.stringify(k) + ':' + g[k])
      .join(',') +
    '},"pr":' +
    netJson(G.projs) +
    ',"np":' +
    netJson(netFresh(G.parts, 80)) +
    ',"nt":' +
    netJson(netFresh(G.texts, 20)) +
    ',"nf":' +
    netJson(netFresh(G.fx, 20));
  if (NET.gsent.$pk !== pk) out += ',"pk":' + (NET.gsent.$pk = pk);
  if (NET.gsent.$pp !== pp) out += ',"pp":' + (NET.gsent.$pp = pp);
  // the street's backdrop only when the scene changes, and the shared wallet and bag now and then
  if (G.bg !== NET.bgRef) {
    NET.bgRef = G.bg;
    out += ',"bg":' + netJson(G.bg);
  }
  if (deep || NET.gref.$party !== PARTY.bag) {
    NET.gref.$party = PARTY.bag;
    const pa = netJson(PARTY);
    if (NET.gsent.$pa !== pa) out += ',"pa":' + (NET.gsent.$pa = pa);
  }
  return out + '}';
}
function netHostTick() {
  if (!NET.live) return;
  // whatever the host starts, the friend is runner 2 in it (training stays a solo thing)
  if ((G.mode === 'play' || G.mode === 'den') && PL.length < 2 && !G.training) {
    joinRunner2();
  }
  if (tick % 2) return;
  const dc = NET.dc;
  if (!dc || dc.readyState !== 'open' || dc.bufferedAmount > 1 << 20) return;
  netSend(netSnapshot());
}
// sounds and songs that happen on the host during a step play on the friend's side too
function netHookSfx() {
  for (const k of Object.keys(sfx)) {
    const f = sfx[k];
    if (typeof f !== 'function') continue;
    sfx[k] = function () {
      if (NET.inUpd && NET.live && NET.sfxQ.length < 24) {
        const a = [k];
        for (const x of arguments) if (typeof x === 'number' || typeof x === 'string') a.push(x);
        NET.sfxQ.push(a);
      }
      return f.apply(this, arguments);
    };
  }
}
netHookSfx();

/* ---------- guest ---------- */
function netGuestBegin() {
  NET.live = true;
  NET.status = 'live';
  NET.ents = new Map();
  NET.q = [];
  NET.cnt = {};
  NET.rxT = performance.now();
  NET.theme = null;
  NET.greeted = false;
  // the title's backdrop stays up behind the "joining" card until the host's first picture replaces it
  G.projs = [];
  G.parts = [];
  G.texts = [];
  G.fx = [];
  G.picks = [];
  G.props = [];
  G.arena = true;
  G.coop = true;
  G.world = false;
  G.den = false;
  G.training = false;
  G.dun = null;
  G.challenge = null;
  G.theme = 0;
  G.bg = null;
  G.fade = 1;
  G.run = { net: 1 };
  NET.hm = 'start';
  setMode('netwait');
}
function netApply(s) {
  const map = NET.ents;
  // shells first, so references inside this snapshot resolve to the objects they will become
  const shell = nid => {
    let e = map.get(nid);
    if (!e) map.set(nid, (e = { nid, _new: 1 }));
    return e;
  };
  for (const [nid] of s.e) shell(nid);
  for (const nid of s.o) shell(nid);
  for (const nid of s.pl) shell(nid);
  const pmap = new Map(G.projs.map(q => [q.nid, q]));
  for (const [holder, k, nid] of s.fix) holder[k] = map.get(nid) || pmap.get(nid) || null;
  for (const [nid, kv] of s.e) {
    const e = map.get(nid);
    for (const k in kv) {
      const v = kv[k];
      if (v === '$U') delete e[k];
      else if (k === 'd') e.d = v === '$D' ? DEF[kv.kind || e.kind] : v;
      else if (k === 'x' || k === 'y' || k === 'z') {
        const t = '_t' + k;
        if (e._new || e[k] === undefined || Math.abs(v - e[k]) > 60) e[k] = v;
        e[t] = v;
        e._k = 2;
      } else e[k] = v;
    }
    if (e.d === '$D') e.d = DEF[e.kind];
    delete e._new;
  }
  G.ents = s.o.map(n => map.get(n));
  PL = s.pl.map(n => map.get(n));
  const keep = new Set(s.o.concat(s.pl));
  for (const k of map.keys()) if (!keep.has(k)) map.delete(k);
  for (const k in s.g) {
    const v = s.g[k];
    if (k === 'camX') {
      if (Math.abs(v - G.camX) > 80) G.camX = v;
      G._tcam = v;
    } else G[k] = v === '$U' ? undefined : v;
  }
  // projectiles: keep the same objects where we can so they glide instead of popping
  G.projs = s.pr.map(q => {
    const old = pmap.get(q.nid);
    if (old && Math.abs(old.x - q.x) < 60) {
      const ox = old.x,
        oy = old.y,
        oz = old.z;
      Object.assign(old, q);
      old._tx = q.x;
      old._ty = q.y;
      old._tz = q.z;
      old.x = ox;
      old.y = oy;
      old.z = oz;
      old._k = 2;
      return old;
    }
    return q;
  });
  if (s.pk) G.picks = s.pk;
  if (s.pp) G.props = s.pp;
  for (const q of s.np) G.parts.push(q);
  for (const q of s.nt) G.texts.push(q);
  for (const q of s.nf) G.fx.push(q);
  if (Math.abs(s.t - G.t) > 6) G.t = s.t;
  if (s.pa) {
    for (const k of Object.keys(PARTY)) if (!(k in s.pa)) delete PARTY[k];
    Object.assign(PARTY, s.pa);
  }
  if (s.bg) G.bg = s.bg;
  if (typeof haggle !== 'undefined') haggle = s.hg || null;
  if (!!s.rn !== G.rain.length > 0) makeRain(!!s.rn);
  if (s.mu && typeof M !== 'undefined' && M.cur !== s.mu) musicPlay(s.mu);
  for (const a of s.sx) if (typeof sfx[a[0]] === 'function') sfx[a[0]].apply(sfx, a.slice(1));
  NET.hm = s.hm;
  // first picture: say which runner is yours
  if (!NET.greeted && PL[1] && PL[1].name && !G.banner && NET.hm === 'play') {
    NET.greeted = true;
    G.texts.push({
      x: G.camX + W / 2,
      y: 120,
      z: 0,
      s: 'YOU ARE ' + PL[1].name,
      c: '#ffc63d',
      life: 120,
      big: true
    });
  }
}
// one guest frame: take the host's news, glide toward it, tick the cosmetic bits, report our buttons
function netGuestStep() {
  const q = NET.q.splice(0);
  for (const s of q) netApply(s);
  G.t++;
  const glide = o => {
    if (!(o._k > 0)) return;
    o.x += (o._tx - o.x) / o._k;
    o.y += (o._ty - o.y) / o._k;
    if (o._tz !== undefined) o.z += (o._tz - o.z) / o._k;
    o._k--;
  };
  for (const e of G.ents) glide(e);
  for (const pr of G.projs) glide(pr);
  if (G._tcam !== undefined) G.camX += (G._tcam - G.camX) * 0.5;
  for (const p of G.parts) {
    p.x += p.vx || 0;
    p.y += p.vy || 0;
    p.z += p.vz || 0;
    p.vz = (p.vz || 0) - 0.15;
    if (p.z < 0) {
      p.z = 0;
      p.vz *= -0.3;
      p.vx = (p.vx || 0) * 0.6;
    }
    p.life--;
  }
  G.parts = G.parts.filter(p => p.life > 0);
  if (G.parts.length > 240) G.parts.splice(0, G.parts.length - 240);
  for (const f of G.fx) f.life--;
  G.fx = G.fx.filter(f => f.life > 0);
  for (const tx of G.texts) {
    tx.z += 0.5;
    tx.life--;
  }
  G.texts = G.texts.filter(t => t.life > 0);
  const S = curS() || {};
  for (const r of G.rain) {
    r.y += r.s * (S.matrix ? 0.5 : 1);
    r.x -= S.matrix ? 0 : 1.2;
    if (r.y > H) {
      r.y = -10;
      r.x = rand(0, W + 40);
    }
  }
  // the host's menus: perks, pause, the run's end
  const hm = NET.hm;
  if (NET.optOut && NET.optOut !== hm) NET.optOut = '';
  if (NET_SHARED.has(hm) && hm !== NET.optOut && PL[1] && (G.mode === 'play' || G.mode === 'netwait')) {
    G.sheetIdx = 1;
    setMode(hm);
    NET.shopSig = netShopSig();
  } else if (NET_SHARED.has(G.mode) && hm !== G.mode)
    setMode(hm === 'play' || hm === 'den' ? 'play' : 'netwait');
  else if (G.mode === 'play' && hm !== 'play' && hm !== 'den') setMode('netwait');
  else if (G.mode === 'netwait' && (hm === 'play' || hm === 'den') && PL.length) setMode('play');
  else if (G.mode === 'netwait' && NET.shownHm !== hm) renderOv();
  // the friend's sheet follows the mirrored runner (a point spent, an item equipped)
  if (G.mode === 'sheet' && tick % 6 === 0 && netSheetSig() !== NET.sheetSig) {
    const card = ov.querySelector('.card'),
      top = card ? card.scrollTop : 0;
    NET.sheetSig = netSheetSig();
    renderOv();
    const c2 = ov.querySelector('.card');
    if (c2) c2.scrollTop = top;
  }
  // a shared counter redraws when the wallet, the bag, the stock or runner 2 changes
  if (NET_SHARED.has(G.mode) && tick % 6 === 0 && netShopSig() !== NET.shopSig) {
    const card = ov.querySelector('.card'),
      top = card ? card.scrollTop : 0;
    NET.shopSig = netShopSig();
    renderOv();
    const c2 = ov.querySelector('.card');
    if (c2) c2.scrollTop = top;
  }
  // buttons: both local key maps and any pad count as "me"
  let h = '';
  for (const a of NET_ACTS) {
    const on = G.mode === 'play' && (INP[0].held[a] || INP[1].held[a]);
    h += on ? '1' : '0';
    if (G.mode === 'play' && (INP[0].pressed[a] || INP[1].pressed[a])) NET.cnt[a] = (NET.cnt[a] || 0) + 1;
  }
  const c = JSON.stringify(NET.cnt);
  NET.inT++;
  if (h + c !== NET.lastIn || NET.inT >= 10) {
    NET.lastIn = h + c;
    NET.inT = 0;
    netSend('{"k":"in","h":"' + h + '","c":' + c + '}');
  }
  if (performance.now() - NET.rxT > 15000) netLost('Lost touch with the host.', true);
}

/* ---------- screens ---------- */
function netInviteLink() {
  if (typeof location === 'undefined' || !/^https?:$/.test(location.protocol) || !NET.code) return '';
  try {
    if (window.top !== window) return ''; // inside a frame the address isn't one a friend can open
  } catch (e) {
    return '';
  }
  return (
    location.origin +
    location.pathname +
    (location.search || '') +
    (NET.room ? '#room=' + NET.room : '#join=' + NET.code)
  );
}
function netHtml(m) {
  if (m === 'netwait') {
    NET.shownHm = NET.hm;
    const over =
      NET.hm === 'arenaover' ||
      NET.hm === 'over' ||
      NET.hm === 'wiped' ||
      NET.hm === 'win' ||
      NET.hm === 'driveover' ||
      NET.hm === 'stealthover';
    const what = NET_WAIT[NET.hm] || 'Your partner is in a menu.';
    const txt =
      NET.hm === 'arenaover'
        ? `The run is over: wave ${G.awave}, ${(G.score || 0).toLocaleString()} points. Your partner can start another one.`
        : what;
    return `<div class="card"><p class="eyebrow">Online co-op</p><h2>${over ? (NET.hm === 'win' ? 'You did it' : 'Run over') : 'One moment'}</h2><p>${txt}</p>
    <div class="row">${PL[1] && (PL[1].pts || PL[1].spts) && !over ? '<button class="btn" data-a="netsheet">Your character (points to spend)</button>' : ''}<button class="btn ghost" data-a="netleave">Leave the game</button></div></div>`;
  }
  if (m === 'nethub')
    return `<div class="card"><p class="eyebrow">Online co-op · connected</p><h2>Your friend is here</h2>
    <p>${NET.friend && ARCH[NET.friend.arch] ? `They're playing the ${esc(ARCH[NET.friend.arch].name)}. ` : ''}Pick what to play. Whatever you start, your friend joins it as Runner 2: the Arena and its challenges, the campaign (new or continued) or the Sprawl. You run the menus, shops and briefings; they can spend their own points from their character sheet.</p>
    <div class="row"><button class="btn" data-a="arenapick">Arena</button><button class="btn ghost" data-a="pick">Campaign</button>${store.load('cs_save3') ? '<button class="btn ghost" data-a="cont">Continue campaign</button>' : ''}<button class="btn ghost" data-a="worldpick">The Sprawl</button><button class="btn ghost" data-a="jobs">Jobs</button><button class="btn ghost" data-a="trainpick">Training (they watch)</button></div>
    <div class="row"><button class="btn ghost" data-a="netleave">End online game</button></div></div>`;
  if (m === 'netmenu')
    return `<div class="card"><p class="eyebrow">Online co-op</p><h2>Paused for you</h2><p>The fight keeps going on your partner's screen while this is open.</p>
    <div class="row"><button class="btn" data-a="netresume">Back to the fight</button>${soundBtns()}<button class="btn ghost" data-a="netleave">Leave the game</button></div></div>`;
  if (m === 'netlost')
    return `<div class="card"><p class="eyebrow">Online co-op</p><h2>Disconnected</h2><p>${esc(NET.lostMsg || 'The connection dropped.')}</p>
    <div class="row">${NET.canRejoin ? `<button class="btn" data-a="netrejoin">Rejoin room ${esc(NET.lastRoom)}</button>` : ''}<button class="btn${NET.canRejoin ? ' ghost' : ''}" data-a="online">Online co-op</button><button class="btn ghost" data-a="back2title">Title</button></div></div>`;
  // the connect card
  const st = NET.status,
    busy = st === 'making' || st === 'joining' || st === 'connecting',
    lob = !!lobbyUrl(),
    err = st === 'error' ? `<p style="color:var(--neon)">${esc(NET.err)}</p>` : '';
  let body = '';
  const longHost = `<p><b>1.</b> Send this invite code to your friend.</p>
    <textarea class="netcode" readonly rows="3" aria-label="Your invite code">${esc(NET.code)}</textarea>
    <div class="row"><button class="btn sm" data-a="netcopy">Copy code</button></div>
    <p><b>2.</b> Paste the reply code they send back.</p>
    <textarea class="netcode" data-net="draft" rows="3" placeholder="Paste the reply code here" aria-label="Reply code">${esc(NET.draft)}</textarea>
    <div class="row"><button class="btn" data-a="netconnect"${busy ? ' disabled' : ''}>${st === 'connecting' ? 'Connecting…' : 'Connect'}</button></div>`;
  if (!NET.role || st === 'error' || st === '') {
    body = `<p>Play with a friend in another browser, on another device, anywhere: the Arena, the campaign or the Sprawl. One of you hosts; the other joins${lob ? ' with a five-letter room code' : ' by swapping two codes over chat or text'}. No accounts.</p>
    ${err}
    ${archHtml(1)}
    <div class="row"><button class="btn" data-a="nethost">Host a game</button><button class="btn ghost" data-a="netjoin">Join a game</button><button class="btn ghost" data-a="netback">Back</button></div>
    <p style="color:var(--muted);font-size:12.5px">The host plays as Runner 1 and runs the menus; the friend plays as Runner 2 with the archetype and coat chosen above. ${lob ? 'The two browsers connect directly; when a network blocks that, the game is relayed through Cloudflare.' : 'Works best on the same Wi-Fi; across the internet it works on most home networks, but some office and school networks block direct connections.'}</p>`;
  } else if (NET.role === 'host') {
    const link = netInviteLink();
    if (st === 'making') body = '<p>Opening a room…</p>';
    else if (NET.room)
      body = `<p>Tell your friend this room code. They pick <b>Online co-op › Join a game</b> and type it in.</p>
    <div class="roomcode" aria-label="Room code ${NET.room.split('').join(' ')}">${NET.room}</div>
    <div class="row"><button class="btn sm" data-a="netcopyroom">Copy code</button>${link ? '<button class="btn sm ghost" data-a="netcopylink">Copy invite link</button>' : ''}<button class="btn sm ghost" data-a="netcancel">Cancel</button></div>
    <p style="color:var(--muted)">${st === 'connecting' ? 'Your friend is here. Connecting…' : 'Waiting for your friend… the room stays open for 15 minutes.'}</p>
    <details class="netmore"><summary>Trouble? Use long codes instead</summary>${longHost}</details>`;
    else
      body = `${NET.lobbyDown ? '<p style="color:var(--muted)">The lobby is unreachable right now, so this uses long codes.</p>' : ''}${longHost}
    <div class="row">${link ? '<button class="btn sm ghost" data-a="netcopylink">Copy invite link</button>' : ''}<button class="btn ghost" data-a="netcancel">Cancel</button></div>`;
  } else {
    body =
      st === 'joining'
        ? '<p>Joining…</p>'
        : st === 'sent'
          ? `<p>You're in the room. Connecting to the host…</p>
    <details class="netmore"><summary>Stuck? Send the host a long reply code</summary><textarea class="netcode" readonly rows="3" aria-label="Your reply code">${esc(NET.code)}</textarea>
    <div class="row"><button class="btn sm" data-a="netcopy">Copy code</button></div></details>
    <div class="row"><button class="btn ghost" data-a="netcancel">Cancel</button></div>`
          : st === 'answer'
            ? `<p><b>2.</b> Send this reply code back to the host. The game starts as soon as they paste it.</p>
    <textarea class="netcode" readonly rows="3" aria-label="Your reply code">${esc(NET.code)}</textarea>
    <div class="row"><button class="btn sm" data-a="netcopy">Copy code</button><button class="btn ghost" data-a="netcancel">Cancel</button></div>
    <p style="color:var(--muted)">Waiting for the host…</p>`
            : `<p>${lob ? 'Type the room code from the host (or paste a long invite code).' : '<b>1.</b> Paste the invite code from the host.'}</p>
    <textarea class="netcode${lob ? ' short' : ''}" data-net="draft" rows="${lob ? 1 : 3}" placeholder="${lob ? 'K7Q2X' : 'Paste the invite code here'}" aria-label="${lob ? 'Room code or invite code' : 'Invite code'}" autocapitalize="characters" spellcheck="false">${esc(NET.draft)}</textarea>
    <div class="row"><button class="btn" data-a="netanswer">${lob ? 'Join' : 'Make my reply code'}</button><button class="btn ghost" data-a="netcancel">Cancel</button></div>`;
  }
  return `<div class="card"><p class="eyebrow">Online co-op</p><h2>${NET.role === 'host' ? 'Host a game' : NET.role === 'guest' ? 'Join a game' : 'Play online'}</h2>${body}</div>`;
}
function netCopy(text, btn) {
  const done = () => {
    if (btn) btn.textContent = 'Copied';
  };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText)
      return navigator.clipboard.writeText(text).then(done, () => netSelect());
  } catch (e) {}
  netSelect();
}
function netSelect() {
  const t = ov.querySelector('textarea.netcode[readonly]');
  if (t) {
    t.focus();
    t.select();
  }
}
// The friend's own character sheet: it draws from the mirrored runner, and the buttons that change something
// are run on the host, as runner 2, with the same code a local click would use.
const NET_REMOTE = new Set(['skill', 'attr', 'equip', 'unequip', 'spell', 'drop', 'lock']);
// Shops the friend shares with the host: they see the same counter and buy and sell as runner 2
const NET_SHARED = new Set(['npc', 'shop', 'trader', 'locker', 'safe']);
const NET_SHOP = new Set([
  'buy',
  'buyice',
  'cyber',
  'fbuy',
  'gmod',
  'hire',
  'learn',
  'reroll',
  'salvage',
  'sell',
  'sellcommon',
  'upgrade',
  'bmbuy',
  'haggle',
  'lock',
  'stash',
  'unstash',
  'equip',
  'unequip',
  'drop'
]);
// what the sheet shows, so it redraws only when one of those changes (not every time runner 2 moves)
function netSheetSig() {
  const p = PL[G.sheetIdx] || PL[0];
  if (!p) return '';
  return JSON.stringify([
    p.lvl,
    p.pts,
    p.spts,
    p.attr,
    p.sk,
    p.eq,
    p.spells,
    p.spell,
    p.cy,
    p.karma,
    p.maxHp,
    p.maxMp,
    PARTY.bag,
    PARTY.creds,
    G.sheetIdx,
    G.sheetTab
  ]);
}
function netShopSig() {
  return netSheetSig() + JSON.stringify([PARTY, G.stock, G.npc, G.shop, G.safeTab, G.wd && G.wd.bm, haggle]);
}
function netGuestSheet() {
  if (G.mode === 'sheet') return setMode('play');
  if (!PL[1]) return;
  G.sheetIdx = 1;
  G.ret = 'play';
  setMode('sheet');
  NET.sheetSig = netSheetSig();
}
function netRemoteAct(a, mode) {
  if (typeof a !== 'string' || a.length > 80 || PL.length < 2) return;
  const name = a.split(':')[0];
  // a shop click only counts while the host is still at that same counter
  const ok = NET_REMOTE.has(name) || (NET_SHOP.has(name) && NET_SHARED.has(G.mode) && mode === G.mode);
  if (!ok) return;
  const si = G.sheetIdx,
    btn = document.createElement('button');
  G.sheetIdx = 1;
  btn.dataset.a = a;
  btn.hidden = true;
  ov.appendChild(btn);
  try {
    btn.click();
  } finally {
    btn.remove();
    G.sheetIdx = si;
    if (G.mode !== 'play' && G.mode !== 'den') renderOv();
  }
}
// returns true when the action was an online one
function netAct(a, b) {
  // the friend at the host's counter: buying and selling run on the host as runner 2
  if (NET.role === 'guest' && NET.live && NET_SHARED.has(G.mode)) {
    if (a === 'leave' || a === 'close' || a === 'lockerback' || a === 'back2title') {
      NET.optOut = G.mode;
      setMode('netwait');
      return true;
    }
    if (a === 'sheet') {
      netGuestSheet();
      return true;
    }
    if (NET_SHOP.has(a)) {
      if (b && b.dataset) {
        netSend({ k: 'act', a: b.dataset.a, m: G.mode });
        sfx.click();
      }
      return true;
    }
    if (a !== 'who' && a !== 'stab' && a !== 'safetab' && a !== 'tree') return true; // the host's to press
  }
  if (NET.role === 'guest' && NET.live && G.mode === 'sheet') {
    if (a === 'close' || a === 'sheet') {
      setMode('play');
      return true;
    }
    if (NET_REMOTE.has(a)) {
      if (G.sheetIdx === 1 && b && b.dataset) {
        netSend({ k: 'act', a: b.dataset.a });
        sfx.click();
      }
      return true;
    }
  }
  switch (a) {
    case 'netrejoin':
      NET.rejoining = true;
      netStartJoin(NET.lastRoom);
      return true;
    case 'netsheet':
      netGuestSheet();
      return true;
    case 'online':
      if (!NET.live) netClose();
      setMode('online');
      return true;
    case 'nethost':
      netStartHost();
      return true;
    case 'netjoin':
      netClose();
      NET.role = 'guest';
      NET.status = 'paste';
      renderOv();
      return true;
    case 'netanswer':
      if (NET.draft.trim()) netStartJoin(NET.draft);
      return true;
    case 'netconnect':
      if (NET.draft.trim()) netAnswer(NET.draft);
      return true;
    case 'netcopy':
      netCopy(NET.code, b);
      return true;
    case 'netcopyroom':
      netCopy(NET.room, b);
      return true;
    case 'netcopylink':
      netCopy(netInviteLink(), b);
      return true;
    case 'netcancel':
      netClose();
      renderOv();
      return true;
    case 'netback':
      netClose();
      setMode('title');
      return true;
    case 'netresume':
      setMode('play');
      return true;
    case 'netleave':
      netLeave();
      musicPlay('title');
      attract();
      setMode('title');
      return true;
  }
  return false;
}
ov.addEventListener('input', e => {
  const t = e.target;
  if (t && t.dataset && t.dataset.net === 'draft') NET.draft = t.value;
});
// an invite link opens straight onto the join card with the code filled in
function netFromHash() {
  if (typeof location === 'undefined') return false;
  const m = (location.hash || '').match(/(?:join|room)=(CCT1[A-Za-z0-9_-]+|[A-Za-z0-9]{5})(?![A-Za-z0-9])/);
  if (!m) return false;
  try {
    history.replaceState(null, '', location.pathname + location.search);
  } catch (e) {}
  netClose();
  NET.role = 'guest';
  NET.status = 'paste';
  NET.draft = m[1];
  setMode('online');
  return true;
}
// a link opened while the game is already up (same page, new #room=…) works too
addEventListener('hashchange', () => {
  if (!NET.live) netFromHash();
});

// A quiet tag along the bottom: the friend watching a solo mode, or the host waiting for a dropped friend
function netDrawTag(t) {
  ctx.font = '600 13px Teko, Impact, sans-serif';
  const w = ctx.measureText(t).width + 20;
  ctx.fillStyle = 'rgba(11,8,18,.75)';
  ctx.fillRect(W / 2 - w / 2, BAND + H - 34, w, 20);
  txt(t, W / 2, BAND + H - 19, 13, '#45d2ff', 'center');
}
function netDrawTags() {
  if (G.mode !== 'play' && G.mode !== 'den') return;
  if (NET.role === 'guest' && NET.live && PL.length === 1)
    netDrawTag(G.training ? 'WATCHING · TRAINING IS SOLO' : 'WATCHING');
  else {
    const t = netAwayTag();
    if (t) netDrawTag(t);
  }
}
