/* The online lobby Worker (server/worker.js), run in Node with an in-memory Durable Object stand-in:
 * room codes, the invite/reply round trip, origin checks, size limits, expiry and TURN credentials. */
'use strict';
const path = require('path');
const { pathToFileURL } = require('url');
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);

(async () => {
  const W = await import(pathToFileURL(path.join(__dirname, '..', 'server', 'worker.js')).href);
  const { memRooms } = await import(
    pathToFileURL(path.join(__dirname, '..', 'tools', 'lobby-local.mjs')).href
  );
  const worker = W.default;
  const env = {
    ROOMS: memRooms(),
    LIMITS: memRooms(W.Limiter),
    ALLOWED_ORIGINS: 'https://cptnope.github.io'
  };
  const ORIGIN = 'https://cptnope.github.io';
  const call = (method, p, body, origin = ORIGIN, e = env) =>
    worker.fetch(
      new Request('https://lobby.test' + p, {
        method,
        headers: Object.assign({ 'Content-Type': 'application/json' }, origin ? { Origin: origin } : {}),
        body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body)
      }),
      e
    );
  const OFFER = 'CCT1z' + 'A'.repeat(400),
    ANSWER = 'CCT1z' + 'B'.repeat(300);

  // codes
  const codes = new Set();
  for (let i = 0; i < 500; i++) codes.add(W.makeCode());
  ok(
    [...codes].every(W.validCode) && codes.size > 490,
    'room codes are 5 unambiguous letters and rarely repeat'
  );
  ok(!W.validCode('A0O1I') && !W.validCode('ABCD'), 'codes reject 0, O, 1, I and wrong lengths');

  // health is public; everything else needs an allowed origin
  ok((await call('GET', '/health', undefined, null)).status === 200, 'health check needs no origin');
  ok(
    (await call('GET', '/ice', undefined, 'https://evil.example')).status === 403,
    'other sites are refused'
  );
  ok((await call('GET', '/ice', undefined, 'http://localhost:8123')).status === 200, 'localhost is allowed');
  const pre = await call('OPTIONS', '/rooms');
  ok(pre.status === 204 && pre.headers.get('Access-Control-Allow-Origin') === ORIGIN, 'CORS preflight');

  // the round trip
  let r = await call('POST', '/rooms', { offer: OFFER });
  const { code } = await r.json();
  ok(r.status === 201 && W.validCode(code), `host gets a room code (${code})`);
  r = await call('GET', '/rooms/' + code.toLowerCase());
  ok(
    r.status === 200 && (await r.json()).offer === OFFER,
    'friend fetches the invite (code is case-insensitive)'
  );
  r = await call('GET', '/rooms/' + code + '/answer');
  ok(r.status === 204, 'no reply yet');
  r = await call('POST', '/rooms/' + code + '/answer', { answer: ANSWER });
  ok(r.status === 204, 'friend posts the reply');
  r = await call('POST', '/rooms/' + code + '/answer', { answer: ANSWER });
  ok(r.status === 409, 'a room takes one reply only');
  r = await call('GET', '/rooms/' + code + '/answer');
  ok(r.status === 200 && (await r.json()).answer === ANSWER, 'host picks up the reply');
  ok((await call('GET', '/rooms/ZZZZZ')).status === 404, 'unknown rooms are 404');

  // junk and oversize bodies
  ok((await call('POST', '/rooms', { offer: 'hello' })).status === 400, 'non-game invites are refused');
  ok(
    (await call('POST', '/rooms', { offer: 'CCT1z' + 'A'.repeat(20000) })).status === 400,
    'oversize invites are refused'
  );
  ok((await call('POST', '/rooms', 'not json')).status === 400, 'bad JSON is refused');

  // rooms expire
  const realNow = Date.now;
  Date.now = () => realNow() + 16 * 60 * 1000;
  ok((await call('GET', '/rooms/' + code)).status === 404, 'rooms expire after 15 minutes');
  Date.now = realNow;

  // rate limits: relay passes and rooms per address per hour
  const fromIp = (ip, p, method = 'GET', body) =>
    worker.fetch(
      new Request('https://lobby.test' + p, {
        method,
        headers: { Origin: ORIGIN, 'CF-Connecting-IP': ip, 'Content-Type': 'application/json' },
        body: body && JSON.stringify(body)
      }),
      env
    );
  const st = [];
  for (let i = 0; i < 14; i++) st.push((await fromIp('203.0.113.7', '/ice')).status);
  ok(
    st.slice(0, 12).every(s => s === 200) && st[12] === 429 && st[13] === 429,
    'relay passes: 12 an hour per address, then 429'
  );
  ok((await fromIp('203.0.113.8', '/ice')).status === 200, 'another address is unaffected');
  const rs = [];
  for (let i = 0; i < 21; i++)
    rs.push((await fromIp('203.0.113.9', '/rooms', 'POST', { offer: OFFER })).status);
  ok(rs.slice(0, 20).every(s => s === 201) && rs[20] === 429, 'rooms: 20 an hour per address, then 429');
  Date.now = () => realNow() + 61 * 60 * 1000;
  ok((await fromIp('203.0.113.7', '/ice')).status === 200, 'the window slides: an hour later it works again');
  Date.now = realNow;

  // ICE: STUN only without secrets; TURN with them, minus port 53
  r = await call('GET', '/ice');
  let ice = await r.json();
  ok(
    !ice.relay && ice.iceServers[0].urls[0] === 'stun:stun.cloudflare.com:3478',
    'no TURN secrets → Cloudflare STUN only'
  );
  let asked = null;
  const fake = async (u, init) => {
    asked = { u, auth: init.headers.Authorization, body: init.body };
    return new Response(
      JSON.stringify({
        iceServers: [
          { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.cloudflare.com:53'] },
          {
            urls: [
              'turn:turn.cloudflare.com:3478?transport=udp',
              'turn:turn.cloudflare.com:53?transport=udp',
              'turns:turn.cloudflare.com:443?transport=tcp'
            ],
            username: 'u',
            credential: 'c'
          }
        ]
      }),
      { status: 201 }
    );
  };
  ice = await W.iceServers({ TURN_KEY_ID: 'kid', TURN_KEY_API_TOKEN: 'tok' }, fake);
  ok(
    /\/turn\/keys\/kid\/credentials\/generate-ice-servers$/.test(asked.u) && asked.auth === 'Bearer tok',
    'TURN credentials requested with the key'
  );
  ok(
    ice.relay && ice.iceServers.every(s => s.urls.every(u => !/:53(\?|$)/.test(u))),
    'TURN servers returned, port 53 dropped'
  );
  ice = await W.iceServers(
    { TURN_KEY_ID: 'kid', TURN_KEY_API_TOKEN: 'tok' },
    async () => new Response('', { status: 500 })
  );
  ok(!ice.relay && ice.iceServers.length === 1, 'a TURN outage falls back to STUN');
})().catch(e => {
  console.log('FAIL ' + e.stack);
});
