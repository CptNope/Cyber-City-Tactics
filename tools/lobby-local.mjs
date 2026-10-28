#!/usr/bin/env node
/* Runs the online lobby (server/worker.js) locally in Node, with an in-memory stand-in for Durable Objects,
 * for tests and offline development: `node tools/lobby-local.mjs 8787`, then point the game at it with
 * ?lobby=http://localhost:8787. No Cloudflare account or wrangler needed. */
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import worker, { Room, Limiter } from '../server/worker.js';

function memStorage() {
  const m = new Map();
  let alarm = null;
  return {
    async get(k) {
      return m.get(k);
    },
    async put(k, v) {
      if (typeof k === 'object') for (const [a, b] of Object.entries(k)) m.set(a, b);
      else m.set(k, v);
    },
    async deleteAll() {
      m.clear();
    },
    async setAlarm(t, cb) {
      clearTimeout(alarm);
      alarm = setTimeout(cb || (() => {}), Math.max(0, t - Date.now()));
      if (alarm.unref) alarm.unref();
    }
  };
}
export function memRooms(Cls = Room) {
  const rooms = new Map();
  return {
    idFromName: n => n,
    get(id) {
      if (!rooms.has(id)) {
        const storage = memStorage();
        const r = new Cls({ storage });
        const set = storage.setAlarm;
        storage.setAlarm = t => set(t, () => r.alarm());
        rooms.set(id, r);
      }
      const r = rooms.get(id);
      return { fetch: (u, init) => r.fetch(new Request(u, init)) };
    }
  };
}
export function serveLobby(port, extra = {}) {
  const env = Object.assign({ ROOMS: memRooms(), LIMITS: memRooms(Limiter), ALLOWED_ORIGINS: '' }, extra);
  const server = createServer(async (req, res) => {
    try {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const r = await worker.fetch(
        new Request('http://localhost' + req.url, {
          method: req.method,
          headers: req.headers,
          body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body
        }),
        env
      );
      res.writeHead(r.status, Object.fromEntries(r.headers));
      res.end(Buffer.from(await r.arrayBuffer()));
    } catch (e) {
      res.writeHead(500);
      res.end(String(e));
    }
  });
  return new Promise(ok => server.listen(port, () => ok(server)));
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const port = Number(process.argv[2] || 8787);
  serveLobby(port).then(() => console.log(`Lobby on http://localhost:${port}`));
}
