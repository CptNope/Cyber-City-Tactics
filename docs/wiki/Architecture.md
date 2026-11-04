# Architecture

Plain JavaScript drawing on a `<canvas>`, with HTML menus over it. There's no framework and no runtime dependency. `index.html` loads one stylesheet and 49 small **classic scripts** (not modules), in order, into **one shared global scope**. The rule that keeps this sane is that a file may only use, *at load time*, what files above it defined. At run time anything can call anything.

## Folder layout

| Path | What lives there |
|---|---|
| `index.html` | The page, the `BUILD:SCRIPTS` list (the one place the load order is defined), meta and link-preview tags |
| `src/js/core/` | Platform: canvas and frame loop, utils and storage (`store`, `prefs`), audio, music, input (keyboard, pads, touch) |
| `src/js/data/` | Tables only: enemies and districts (`DEF`, `STAGES`), gear (`BASES`, `MFR`, `PARTS`, `RAR`), world (`CYBER`, `TECH`, `CONTRACTS`, `NPCS`, `DIFF`), legend data |
| `src/js/systems/` | Cross-mode systems: legend (feats, legendaries, Codex), story scenes, skill trees, haggling |
| `src/js/game/` | The simulation: state, flow between places, combat, props and grabs, runners, allies, enemies, the update step |
| `src/js/modes/` | Mode rules: Sprawl, black market, choices, dungeons, hacking, training, Arena, jobs (driving, drone, flight), online co-op |
| `src/js/render/` | Drawing: figures and weapons, light, enemy looks, boss intros, vehicles, the corp floor, the skyline, backgrounds, the Sprawl street, the HUD and `render()` |
| `src/js/ui/` | HTML menus: title attract, screens, overlay and `setMode`, the single action handler |
| `src/js/pwa.js`, `src/js/sync.js`, `src/js/main.js` | Install, updates and backups; save codes and the sync file; the game loop and boot |
| `sw.js` | Service worker: precaches the build for offline play |
| `server/` | The online lobby: a Cloudflare Worker with room codes and TURN relay passes |
| `tools/` | `build.mjs` (version stamp, precache list, single-file build), local server, screenshot and trailer capture, local lobby |
| `tests/` | Headless tests in Node (a stubbed DOM in `harness.js`) and Playwright browser tests |
| `docs/` | Architecture guide, design system and brand book, README media, store kit |

## Load order

```mermaid
flowchart LR
  V[version.js] --> CORE["core/<br/>canvas → utils → audio → music → input"]
  CORE --> DATA["data/<br/>content → gear → world → legend-data"]
  DATA --> SYS["systems/<br/>legend → story → skills → haggle"]
  SYS --> GAME["game/<br/>state → flow → combat → props → runners → allies → enemies → update"]
  GAME --> MODES["modes/<br/>sprawl → blackmarket → choices → dungeons → hacking → training → arena → jobs → drive → stealth → flight → net"]
  MODES --> REND["render/<br/>figures → atmos → looks → intro → vehicles → facility → air → world → sprawl → hud"]
  REND --> UI["ui/<br/>attract → screens → overlay → actions"]
  UI --> PWA[pwa.js] --> SYNC[sync.js] --> MAIN[main.js: boots]
```

## A frame

The logic runs at a fixed 60 steps a second on any screen. Rendering interpolates between the last two steps, so 120 and 144 Hz screens get smooth motion and 30 Hz phones still run at full game speed.

```mermaid
sequenceDiagram
  participant RAF as requestAnimationFrame
  participant L as loop (main.js)
  participant U as update() (game/update.js)
  participant R as render() (render/hud.js)
  RAF->>L: timestamp
  L->>L: accumulate elapsed time (capped: at most 8 catch-up steps)
  loop each 1/60 s owed
    L->>U: stepOnce()
    alt a job is running
      U->>U: driveUpdate / stealthUpdate / flightUpdate (until a flight lands on a roof)
    else brawling
      U->>U: runners → allies → enemies → projectiles → picks → mode tick (waves / Den / Arena / Sprawl / roof)
    end
    U->>U: tickFx(): particles, texts, rain, tips
  end
  L->>R: lerpRender(): move everything to an in-between point, draw, move it back
  Note over L: perfSample() watches frame time and steps the graphics tier down on slow devices
```

Online, the friend's browser calls `netGuestStep()` instead of `update()`: it applies the host's snapshots and eases everything toward them (see [[Online Co-op]]).

## Where state lives

| Thing | File | What |
|---|---|---|
| `G` | game/state.js | The moment: mode, entities `G.ents`, projectiles, particles, camera, stage, flags (`G.world`, `G.arena`, `G.dun`, `G.drive`, `G.stealth`, `G.flight`, `G.cjob`) |
| `PL` | game/state.js | The runners (1 or 2) |
| `PARTY` | game/state.js | Shared: creds, bag, stash, medkits, icebreakers, contract, companion |
| `G.wd` | modes/sprawl.js | The current Sprawl block: level, seed, heat, cred, looted buildings |
| `LEG` | systems/legend.js | Your legend across all runs: feats, stats, legendaries, lore, bestiary, run history |
| `prefs` | core/utils.js | Settings and seen tips |
| `NET` | modes/net.js | The online session |
| `INP[0]`, `INP[1]` | core/input.js | Each runner's held and pressed buttons, filled by keyboard, pads, touch or the network |

Entities are plain objects in `G.ents`. Runners have `kind: 'player'`. Foes have a `kind` that keys into `DEF` and `team: 1`. Allies are `kind: 'ally'` with `team: 0`. Positions are `x` (along the street), `y` (depth into the street) and `z` (height).

```mermaid
classDiagram
  class Entity {
    kind
    team
    x / y / z
    vx / vz
    state, t
    hp / maxHp
    face
    inv, flash
  }
  class Runner {
    idx, arch, lvl, karma
    attr, sk, cy, tech
    eq: weapon / gun / armor / deck
    D: derived stats
    grab, heldBy, holding
  }
  class Foe {
    d: DEF entry
    dmg, cool, elite
    dazeUntil, holdP, holding
    tgt
  }
  class Item {
    slot, base, mfr, parts
    rar, dmg / arm, crit, speed
    daze, kb, mod, leg
  }
  Entity <|-- Runner
  Entity <|-- Foe
  Runner "1" o-- "3" Item : eq
```

## Menus

Menus are HTML in the `#ov` overlay. `setMode(m)` (ui/overlay.js) sets `G.mode` and calls `renderOv()`, which builds the screen's HTML. Every button carries `data-a="action:arg"`, and **one click handler** in ui/actions.js handles them all in a `switch`. Online, the host substitutes the `nethub` screen for the title.

## The build

`npm run build` (tools/build.mjs) does three things. It stamps `APP_VERSION` from a hash of the files, refreshes the service worker's precache list, and writes a single-file copy to `dist/`. `npm run check` fails CI if a commit forgot to build. The service worker serves every file from a cache named after the version, so two versions are never mixed. A new deploy installs in the background, and the game offers "Update now" between fights.
