/* Cyber City Tactics · server/worker.js
 * The online lobby: a Cloudflare Worker with one Durable Object per room. It does two small jobs and never
 * touches gameplay, which stays peer to peer between the two browsers.
 *
 *  1. Room codes. The host posts its WebRTC invite and gets a five-letter code back; the friend types the
 *     code, fetches the invite and posts a reply; the host polls for the reply. A room holds those two
 *     strings for fifteen minutes and is then wiped.
 *       POST /rooms               {offer}  → 201 {code}
 *       GET  /rooms/CODE                   → 200 {offer} | 404
 *       POST /rooms/CODE/answer   {answer} → 204 | 404 | 409 (already answered)
 *       GET  /rooms/CODE/answer            → 200 {answer} | 204 (not yet) | 404
 *  2. Relay passes. GET /ice returns ICE servers for RTCPeerConnection: Cloudflare's STUN, plus short-lived
 *     Cloudflare TURN credentials when the TURN_KEY_ID and TURN_KEY_API_TOKEN secrets are set, so players on
 *     networks that block direct connections still meet (their traffic is relayed through Cloudflare).
 *
 * Only browsers on ALLOWED_ORIGINS get answers (plus localhost for development). Bodies are capped at 16 KB.
 * Deploy: see server/README.md. */

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/L
const CODE_LEN = 5;
const ROOM_TTL_MS = 15 * 60 * 1000;
const MAX_BODY = 16 * 1024;
const STUN = { urls: ['stun:stun.cloudflare.com:3478'] };
const TURN_TTL_S = 4 * 60 * 60;

export function makeCode(rand = Math.random) {
  let s = '';
  for (let i = 0; i < CODE_LEN; i++) s += CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)];
  return s;
}
export const validCode = c =>
  typeof c === 'string' && c.length === CODE_LEN && [...c].every(ch => CODE_CHARS.includes(ch));

function allowedOrigin(origin, env) {
  if (!origin) return false;
  if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)) return true;
  const list = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  return list.includes('*') || list.includes(origin);
}
function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}
const json = (body, status, h) =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, h)
  });
async function readBody(req) {
  const len = Number(req.headers.get('Content-Length') || 0);
  if (len > MAX_BODY) return null;
  const t = await req.text();
  if (t.length > MAX_BODY) return null;
  try {
    return JSON.parse(t);
  } catch (e) {
    return null;
  }
}
const goodBlob = s =>
  typeof s === 'string' && s.length > 10 && s.length <= MAX_BODY && /^CCT1[zp][A-Za-z0-9_-]+$/.test(s);

// TURN credentials from Cloudflare Realtime; port 53 is dropped because browsers block it and, without
// trickle ICE, a dead URL only makes the invite slower to build
export async function iceServers(env, fetcher = fetch) {
  if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return { iceServers: [STUN], relay: false };
  try {
    const r = await fetcher(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl: TURN_TTL_S })
      }
    );
    if (!r.ok) throw new Error('TURN ' + r.status);
    const d = await r.json();
    const list = (d.iceServers || []).map(s => {
      const urls = (Array.isArray(s.urls) ? s.urls : [s.urls]).filter(u => !/:53(\?|$)/.test(u));
      return Object.assign({}, s, { urls });
    });
    return { iceServers: list.length ? list : [STUN], relay: list.some(s => s.username) };
  } catch (e) {
    return { iceServers: [STUN], relay: false };
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url),
      origin = req.headers.get('Origin') || '';
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (path === '/' || path === '/health') return json({ ok: true, game: 'cyber-city-tactics' }, 200);
    if (!allowedOrigin(origin, env)) return json({ error: 'origin not allowed' }, 403);
    const h = cors(origin);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (path === '/ice' && req.method === 'GET') return json(await iceServers(env), 200, h);
    if (path === '/rooms' && req.method === 'POST') {
      const b = await readBody(req);
      if (!b || !goodBlob(b.offer)) return json({ error: 'bad invite' }, 400, h);
      for (let i = 0; i < 6; i++) {
        const code = makeCode();
        const r = await room(env, code).fetch('https://room/create', {
          method: 'POST',
          body: JSON.stringify({ offer: b.offer })
        });
        if (r.status === 201) return json({ code }, 201, h);
      }
      return json({ error: 'busy, try again' }, 503, h);
    }
    const m = path.match(/^\/rooms\/([A-Za-z0-9]+)(\/answer)?$/);
    if (m) {
      const code = m[1].toUpperCase();
      if (!validCode(code)) return json({ error: 'no such room' }, 404, h);
      const stub = room(env, code);
      if (!m[2] && req.method === 'GET') return relay(await stub.fetch('https://room/offer'), h);
      if (m[2] && req.method === 'GET') return relay(await stub.fetch('https://room/answer'), h);
      if (m[2] && req.method === 'POST') {
        const b = await readBody(req);
        if (!b || !goodBlob(b.answer)) return json({ error: 'bad reply' }, 400, h);
        return relay(
          await stub.fetch('https://room/answer', {
            method: 'POST',
            body: JSON.stringify({ answer: b.answer })
          }),
          h
        );
      }
    }
    return json({ error: 'not found' }, 404, h);
  }
};
const room = (env, code) => env.ROOMS.get(env.ROOMS.idFromName(code));
async function relay(r, h) {
  const body = r.status === 204 ? null : await r.text();
  return new Response(body, {
    status: r.status,
    headers: Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, h)
  });
}

// One room: the invite, the reply (once), and an alarm that wipes both
export class Room {
  constructor(state) {
    this.state = state;
  }
  async fetch(req) {
    const url = new URL(req.url),
      st = this.state.storage;
    const now = Date.now();
    const made = await st.get('made');
    const live = made && now - made < ROOM_TTL_MS;
    if (url.pathname === '/create') {
      if (live) return new Response(null, { status: 409 });
      const { offer } = await req.json();
      await st.deleteAll();
      await st.put({ made: now, offer });
      await st.setAlarm(now + ROOM_TTL_MS);
      return new Response(null, { status: 201 });
    }
    if (!live) return json({ error: 'no such room' }, 404);
    if (url.pathname === '/offer') return json({ offer: await st.get('offer') }, 200);
    if (url.pathname === '/answer' && req.method === 'POST') {
      if (await st.get('answer')) return json({ error: 'already answered' }, 409);
      const { answer } = await req.json();
      await st.put('answer', answer);
      return new Response(null, { status: 204 });
    }
    if (url.pathname === '/answer') {
      const a = await st.get('answer');
      return a ? json({ answer: a }, 200) : new Response(null, { status: 204 });
    }
    return json({ error: 'not found' }, 404);
  }
  async alarm() {
    await this.state.storage.deleteAll();
  }
}
