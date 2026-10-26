# How Cyber City Tactics is put together

This is a guide for reading and changing the code. For what the game *is*, see the [README](../README.md).

## The big picture

- **No framework, no bundler required.** The game is plain JavaScript drawing on a `<canvas>`, plus a little HTML for menus. `index.html` loads one CSS file and 35 small scripts in order. You can open it from any static server and it runs.
- **One shared global scope.** The scripts are *classic* scripts, not ES modules, so every top-level `const`, `let` and `function` in one file is visible to the files after it. That keeps the code simple to move around. The rule that comes with it: **a file may only use, at load time, things defined in files listed above it.** Functions can call each other freely at run time; the order only matters for code that runs while the page is loading.
- **A tiny build step for shipping.** `npm run build` stamps a version, refreshes the service worker's file list, and writes a single-file copy of the whole game to `dist/`. Development doesn't need it; deploying does.

## Folder layout

```
index.html               the page: markup, the stylesheet link and the ordered list of scripts
manifest.webmanifest     PWA manifest: name, icons, shortcuts, screenshots
sw.js                    service worker (offline play and updates)
src/
  css/game.css           every style: page, canvas, menus, touch controls
  js/
    version.js           generated: APP_VERSION
    core/                platform layer: canvas, utils and storage, audio, music, input
    data/                tables only: enemies, districts, gear, contracts, lore, feats
    systems/             cross-mode systems: legend (feats, legendaries, Codex) and skill trees
    game/                the simulation: state, flow between places, combat, runners, enemies, allies, update
    modes/               mode-specific rules: Sprawl, dungeons, hacking, training, Arena (and challenges)
    render/              drawing: figures, backgrounds, Sprawl street, HUD and the main render()
    ui/                  HTML menus: screens, overlay and mode switching, button actions, title attract
    pwa.js               install prompt, update bar, backups, shortcuts, persistent storage
    main.js              the game loop and boot
icons/                   app icons (any, maskable, Apple, favicon, shortcuts)
screenshots/             install-dialog screenshots (regenerate with tools/screenshots.mjs)
dist/                    generated single-file build
tools/                   build.mjs, serve.mjs, screenshots.mjs
tests/                   headless tests (Node) and browser tests (Playwright)
docs/                    this file
```

## Load order

The `BUILD:SCRIPTS` block in `index.html` is the one place the order is defined; the build and the tests read it from there. In short:

1. `version.js`, then **core/** (canvas → utils → audio → music → input)
2. **data/** (content → gear → world → legend-data)
3. **systems/** (legend → skills)
4. **game/** (state → flow → combat → props → runners → allies → enemies → update)
5. **modes/** (sprawl → dungeons → hacking → training → arena)
6. **render/** (figures → world → sprawl → hud)
7. **ui/** (attract → screens → overlay → actions)
8. `pwa.js`, then `main.js`, which boots everything

If you add a file, add its `<script>` tag in the right place, then run `npm run build` and `npm test`.

## How a frame works

`main.js` runs a fixed 60-steps-per-second loop:

```
frame(now)
  pollPads()                      read gamepads into INP[0], INP[1]
  while time is owed:
    if playing: update()          game/update.js: one simulation step
    if title:   attractStep()
    if hacking: hackStep()
    clear one-frame "pressed" inputs
  render()                        render/hud.js: draws the world, then the HUD
  updateTouchUI()                 relabel touch buttons (LIFT, THROW, TALK, ENTER...)
```

Hit-stop (`G.stop`) and slow motion (`G.slow`) skip update steps without dropping button presses.

`update()` steps every entity (`upRunner`, `upEnemy`, `upAlly`), projectiles, pickups and effects, then hands off to the current mode: `worldTick()` (Sprawl), `denTick()`, `arenaTick()`, `trainTick()` or `waves()` (campaign).

## State

| Thing | Where | What |
|---|---|---|
| `G` | game/state.js | Everything about the current moment: mode, entities, camera, stage, flags like `G.world`, `G.arena`, `G.dun`. |
| `PL` | game/state.js | The runners (1 or 2). |
| `PARTY` | game/state.js | Shared: creds, bag, medkits, icebreakers, contract, hired companion. |
| `G.wd` | modes/sprawl.js | The current Sprawl block: level, seed, heat, cred, looted buildings. |
| `LEG` | systems/legend.js | Your legend across all runs: feats, stats, legendaries, lore, bestiary, runs. |
| `prefs` | core/utils.js | Settings. |

Entities are plain objects in `G.ents`. Runners have `kind: 'player'`; enemies have a `kind` that keys into `DEF` (data/content.js) and `team: 1`; allies are `kind: 'ally'`, `team: 0`. Positions are `x` (along the street), `y` (depth into the street) and `z` (height).

## Menus

Menus are HTML in the `#ov` overlay. `setMode(m)` (ui/overlay.js) sets `G.mode` and calls `renderOv()`, which builds the screen's HTML (most screens are functions in ui/screens.js). Every button carries a `data-a="action:arg"` attribute, and **one click handler in ui/actions.js** handles them all in a `switch`.

To add a button: put `data-a="myaction"` on it, then add `case 'myaction':` in ui/actions.js.

## Saving

Everything is in `localStorage` under `cs_*` keys (listed in the README). `store.load(key)` in core/utils.js reads a save **and checks its shape**, so an old or hand-edited save is ignored instead of crashing a menu. When you add fields to a save, give them defaults when loading (see `loadGame`, `loadWorld` and the `LEG` setup for examples).

## Recipes

**A new enemy.** Add an entry to `DEF` in data/content.js (copy a similar one: `ranged`, `lunge`, `teleport`, `shield` and the other flags switch on existing behaviors in game/enemies.js). Add a bestiary line to `BEST` in data/legend-data.js. Spawn it from a district's wave list in `STAGES`, an Arena pool in modes/arena.js, or a Sprawl faction in `FAC` (modes/sprawl.js).

**A new weapon, gun or armor.** Add a base to `BASES` in data/gear.js. Guns pick a `fire` mode; new fire modes go in `fireBullet()` (game/runners.js). Order matters: bases later in each list drop later in the game.

**A new affix or legendary.** Affixes: `AFFIX` in data/gear.js, effect in `hurt()` (game/combat.js). Legendaries: `LEGS` in data/legend-data.js, a feat that unlocks it in `FEATS`, and the effect wherever it applies (search for `legOf(`).

**A new feat.** Add it to `FEATS` in data/legend-data.js. A counting feat uses `stat` and `n` and is earned automatically when code calls `bump('thatStat')` or `peak('thatStat', value)`. Any other feat is earned by calling `feat('id')` where it happens.

**A new skill.** Add it to `SKILLS` in systems/skills.js (tree and row), then check `has(p, 'id')` (one runner) or `anyHas('id')` (team-wide) where it should matter.

**A new Sprawl block event.** Add it to `EVENTS` in modes/sprawl.js, give it a slice of the roll in `genStreet()`, and check `evOn('id')` where it changes things.

**A new archetype.** Add it to `ARCH` in data/gear.js (with `locked: 'featId'` if it should be unlocked), its free skill to `ARCH_SKILL` in systems/skills.js, and its special in `doSpecial()` (game/runners.js).

## The PWA

- **sw.js** precaches every file listed in its `BUILD:MANIFEST` block under a cache named after `VERSION`, which is a hash of all those files. The page is always served from that cache, so files from two versions are never mixed. A new deploy installs in the background and waits.
- **pwa.js** notices the waiting version and shows an "update ready" bar between fights. *Update now* saves what it can and switches over. It also handles the install prompt, persistent storage, save backups and app shortcuts.
- The service worker is **off on localhost** so edits show up on a normal reload. Add `?sw=1` to the URL to test it locally.
- `npm run build` must run before each commit, or the service worker won't notice the change. `npm run check` fails if you forgot.

## Tests

- `npm test` runs every headless test in `tests/`. Each loads the real scripts into Node with a stubbed DOM (`tests/harness.js`) and drives the game with key presses and menu clicks. `npm run test:quick` skips the two long bot playthroughs.
- `npm run test:browser` (needs Playwright) runs real-Chromium checks: both builds boot, the manifest is valid, shortcuts work, the game plays offline, and the update bar works end to end.
