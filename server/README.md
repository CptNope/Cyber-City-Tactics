# Online lobby (Cloudflare Worker)

Online co-op works without this: players can always swap long invite and reply codes by hand. The lobby makes connecting easier and more reliable:

- **Room codes.** The host gets a five-letter code like `K7Q2X`. The friend types it in, and the two browsers swap their connection details through the lobby. Nobody pastes anything back.
- **Relay (TURN).** When a network blocks direct browser-to-browser connections, which is common at offices and schools, Cloudflare relays the game traffic. The lobby hands each player a pass that lasts four hours, so the Cloudflare key never reaches the browser.

Gameplay never goes through the lobby. It stays peer to peer, or relayed by Cloudflare TURN when it has to be.

## What it costs

The Workers Free plan covers the lobby: a game uses a few dozen requests to connect, and Durable Objects work on the free plan. TURN's first 1,000 GB each month is free, then $0.05 per GB. A relayed game sends about 14 KB a second, around 50 MB an hour.

## Deploy

1. In the Cloudflare dashboard, go to **Workers & Pages › Create › Import a repository** and pick this repo. Set the root directory to `server`. Every push to `main` then redeploys it.
   Or, from this folder: `npx wrangler deploy`.
2. For the relay, make a TURN key under **Realtime › TURN Server**. Add its ID and API token to the Worker under **Settings › Variables and Secrets** as the secrets `TURN_KEY_ID` and `TURN_KEY_API_TOKEN`. Without them the lobby still gives out room codes, using STUN only.
3. Put the Worker's URL (`https://cct-lobby.<your-subdomain>.workers.dev`) in `NET_LOBBY` in `src/js/modes/net.js`.
4. If the game is served anywhere other than `https://cptnope.github.io`, add that origin to `ALLOWED_ORIGINS` in `wrangler.toml`. Localhost is always allowed.

## API

| Request | Response |
| --- | --- |
| `POST /rooms {offer}` | `201 {code}` |
| `GET /rooms/CODE` | `200 {offer}` or `404` |
| `POST /rooms/CODE/answer {answer}` | `204`, `404`, or `409` if someone already answered |
| `GET /rooms/CODE/answer` | `200 {answer}`, `204` if not answered yet, or `404` |
| `GET /ice` | `200 {iceServers, relay}` |
| `GET /health` | `200 {ok}` |

Rooms are wiped 15 minutes after they're made.

## Local testing

`node tools/lobby-local.mjs 8787` runs the same Worker code in Node, with no account needed. Open the game with `?lobby=http://localhost:8787`. The tests `tests/lobby.test.js` and `tests/online.test.js` use it.
