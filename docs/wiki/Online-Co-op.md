# Online co-op

Up to four browsers play one game over WebRTC: the host and up to three friends, each friend on their own peer-to-peer line to the host (a star, no friend-to-friend links). The host's game is the real one; each friend sends button presses and draws what the host sends back. A small Cloudflare Worker (`server/worker.js`) only swaps the connection details and hands out relay passes. It never sees gameplay.

## Connecting

```mermaid
sequenceDiagram
  autonumber
  participant H as Host browser
  participant L as Lobby (Worker + Durable Objects)
  participant F as Friend browser
  H->>L: GET /ice
  L-->>H: STUN + short-lived TURN pass
  H->>H: createOffer, wait for ICE gathering
  H->>L: POST /rooms {offer}
  L-->>H: {code: "K7QHM", key}
  Note over H: shows the room code and an invite link
  F->>L: GET /rooms/K7QHM
  L-->>F: {offer}
  F->>F: createAnswer, wait for ICE gathering
  F->>L: POST /rooms/K7QHM/answer {answer}
  loop every 1.5 s
    H->>L: GET /rooms/K7QHM/answer?key=…
  end
  L-->>H: {answer}
  H-->>F: data channel opens
  F->>H: hello {arch, coat, trail}
  H->>F: start {v, seat}
  H->>L: POST /rooms/K7QHM/reopen {offer, key}
  Note over H,L: a fresh invite for the next friend, same room code
```

**More friends, one code.** The lobby holds one invite per room. As soon as a friend is seated, the host puts a fresh invite in the same room with `/reopen` (its room key proves it's the host), so the next friend types the same code. That repeats until three friends are in. Seats are runners 2 to 4 (`seat` 1 to 3 in `start`); a friend gets the lowest free seat, or the benched runner of someone who dropped.

**Races.** A friend can fetch an invite just as the host swaps in a newer one. Every reply carries the invite it answers (its ICE username fragment, `o` in the packed code), and the host ignores a reply to an invite it no longer holds and puts up a fresh one. Both sides also give a handshake a few seconds: a reply that hasn't become a line in 7 s makes the host reopen, and a friend still not connected after 8 s fetches the current invite and answers again (up to three times). A friend who hits a room that's mid-seating (409) knocks again every 2.5 s, six times.

With `?lobby=off`, or when the lobby can't be reached, the same offer and answer are packed into long `CCT1z…` codes (deflate-raw, base64url) for the players to swap by hand.

## Messages

Every message is JSON with a `k` field.

| `k` | Direction | Contents |
|---|---|---|
| `hello` | friend → host | `arch`, `coat`, `trail`. Accepted once per connection |
| `start` | host → friend | `v` (the version), `seat` (1 to 3: which runner is theirs) |
| `in` | friend → host | `h`: 13 held flags (`0`/`1`), `c`: a press counter per button |
| `act` | friend → host | `a`: a menu button's action, `m`: the shop the friend is at |
| `full` | friend → host | none: the friend fell behind and wants a fresh picture |
| `start` | host → friend | `v`: the host's version |
| `s` | host → friend | a snapshot: `t`, `hm`, `mu`, `rn`, `hg`, `o`, `pl`, `sx`, `e`, `g`, `pr`, `np`, `nt`, `nf`, plus `pk`, `pp`, `bg`, `pa` when they change and `f:1` on a full resend |
| `bye` | both ways | none: leaving on purpose |

## A frame online

```mermaid
flowchart LR
  subgraph Friend
    K[keys and pads] --> IN["in {h, c}"]
    S2[queued snapshots] --> AP[netApply] --> GL[ease toward targets] --> DR[draw]
  end
  subgraph Host
    NI[netHostInput → INP 1] --> UP["update()"] --> SN[netSnapshot: deltas only]
  end
  IN -- data channel --> NI
  SN -- every 2nd step --> S2
```

- **Input.** `h` says what is held and `c` counts presses, so a tap shorter than one packet still lands. The friend resends at least every 10 frames.
- **Snapshots.** Every entity gets a stable `nid`. Only fields whose rounded JSON changed are sent (`NET.sent`). References travel as `{$e: nid}` and are resolved on arrival. `G` fields are mirrored except those in `NET_GDENY`.
- **Menus.** The friend's character sheet and shared shops send `act` messages. The host replays them as runner 2 through a hidden button, so they run the same code as a local click.

## What each side checks

| Check | Where | Why |
|---|---|---|
| `in` is 13 `0`/`1` flags plus finite counters for known buttons | `netInOk` | junk can't throw inside the game loop |
| No `in` for 300 ms: let go of the friend's buttons | `netHostInput` | a stalled line doesn't leave runner 2 running into a pit |
| No message for 15 s: the friend is dropped | `netHostTick` | and the room reopens for them |
| One `hello` per connection; arch, coat and trail must be real, unlocked ones | `netRecv`, `netHostBegin` | a second hello can't swap runners mid-run |
| `act` names a real slot, attribute, skill, mod, spell and so on, never `__proto__` | `netActOk` | a crafted click can't reach object prototypes or crash a handler |
| Snapshot keys `__proto__`, `constructor`, `prototype` are skipped | `netApply` | the host can't pollute the friend's objects |
| Backlog over 30 snapshots: discard and ask for `full` | `netRecv`, `netResync` | snapshots are deltas, so a dropped one would leave stale pieces |
| `?lobby=` only reaches our lobby, a `cct-lobby.*.workers.dev` deploy, or localhost | `netLobbyOk` | a shared link can't send invites somewhere else |

## Drops and rejoining

```mermaid
stateDiagram-v2
  [*] --> Live
  Live --> Dropped: channel closes, or 15 s of silence
  Live --> Left: bye
  Dropped --> Reopened: host posts /reopen with its key
  Reopened --> Live: friend rejoins with the same code
  Reopened --> Solo: invite expires, or the host starts a new run
  Left --> Solo
  Solo --> [*]
```

A dropped friend's runner goes on the bench (`netBench`: off the street, `out`, flagged `netAway`) instead of leaving the crew, so nobody else's runner, color or controller shifts, and the room reopens. Whoever comes back with the code (or the next friend) takes the benched runner and walks back in with the same gear (`netUnbench`). Every host tick reconciles the crew: a seat with a friend has a runner on the street, a seat without one sits out, even after a scene reset puts everyone back. A friend who leaves on purpose from the newest seat takes their runner with them.

Each friend gets their own delta stream: the host keeps, per friend, what it has already sent (`sent`, `gsent`, `gref`), so a friend who joins mid-run starts from a full picture without forcing one on everyone else. Sounds from a step go to every friend.

## The lobby

| Endpoint | Does | Limit per address |
|---|---|---|
| `GET /ice` | STUN, plus TURN credentials when the secrets are set | 12 an hour, and 5,000 a day for everyone together |
| `POST /rooms` | stores an invite, returns a code and a key | 20 an hour |
| `GET /rooms/CODE` | the invite | 120 an hour |
| `POST /rooms/CODE/answer` | the reply, once | 30 an hour |
| `GET /rooms/CODE/answer?key=KEY` | the reply, or 204 while waiting; 403 with the wrong key (the reply holds the friend's network address, so only the host reads it) | none (the host polls) |
| `GET /rooms/CODE/answer` (no key, games from before keys) | the same | 2,400 an hour |
| `POST /rooms/CODE/reopen` | a fresh invite under the same code, with the key | shares the rooms limit |

- Invites last 15 minutes. The key lasts four hours, so nobody else can take a code mid-game.
- IPv6 addresses are counted per /64.
- Only pages on `ALLOWED_ORIGINS`, plus localhost, get answers. Bodies are capped at 16 KB.
- Tests: `tests/lobby.test.js` runs the Worker in Node; `tests/online.test.js` connects two Chromium pages for real.
