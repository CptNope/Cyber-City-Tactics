# How Cyber City Tactics is put together

This is a guide for reading and changing the code. For what the game *is*, see the [README](../README.md).

## The big picture

- **No framework, no bundler required.** The game is plain JavaScript drawing on a `<canvas>`, plus a little HTML for menus. `index.html` loads one CSS file and 49 small scripts in order. You can open it from any static server and it runs.
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
    systems/             cross-mode systems: legend (feats, legendaries, Codex), story scenes, skill trees, haggling
    game/                the simulation: state, flow between places, combat, runners, enemies, allies, update
    modes/               mode-specific rules: Sprawl, black market, choices, dungeons, hacking, training, Arena (and
                         challenges), jobs (shared banking and side jobs, driving, drone stealth, flight), online co-op
    render/              drawing: figures, light, looks, intros, vehicles, the corp floor, the skyline, backgrounds,
                         Sprawl street, HUD and the main render(); the 3D view of every mode (r3d, r3figs,
                         r3beasts, r3fx, r3world)
    ui/                  HTML menus: screens, overlay and mode switching, button actions, title attract
    pwa.js               install prompt, update bar, backups, shortcuts, persistent storage
    main.js              the game loop and boot
icons/                   app icons (any, maskable, Apple, favicon, shortcuts)
screenshots/             install-dialog screenshots (regenerate with tools/screenshots.mjs)
dist/                    generated single-file build
vendor/                  three.min.js: the parts of three.js the 3D view uses (rebuild with tools/vendor-three.mjs)
tools/                   build.mjs, serve.mjs, screenshots.mjs, vendor-three.mjs
tests/                   headless tests (Node) and browser tests (Playwright)
server/                  the online lobby: a Cloudflare Worker with room codes and TURN relay passes (see its README)
docs/                    this file, the design system and brand book, README media and the store kit
```

## Load order

The `BUILD:SCRIPTS` block in `index.html` is the one place the order is defined; the build and the tests read it from there. In short:

1. `version.js`, then **core/** (canvas → utils → audio → music → input)
2. **data/** (content → gear → world → legend-data)
3. **systems/** (legend → story → skills → haggle)
4. **game/** (state → flow → combat → props → runners → allies → enemies → update)
5. **modes/** (sprawl → blackmarket → choices → dungeons → hacking → training → arena → jobs → drive → stealth → flight → net)
6. **render/** (vendor/three.min.js → figures → atmos → looks → intro → vehicles → facility → air → world → sprawl → hud → r3d → r3figs → r3beasts → r3fx → r3world)
7. **ui/** (attract → screens → overlay → actions)
8. `pwa.js`, then `main.js`, which boots everything

If you add a file, add its `<script>` tag in the right place, then run `npm run build` and `npm test`.

## How a frame works

`main.js` runs a fixed-timestep loop: the game logic always advances in steps of exactly 1/60 s, however fast or slow the screen refreshes. That keeps speed, physics, hit timing and seeded runs identical on a 30 Hz phone and a 240 Hz monitor.

```
frame(now)                        requestAnimationFrame, any refresh rate
  requestAnimationFrame(frame)    queued first, so an error in this frame can't stop the loop
  perfSample(dt)                  adaptive quality (below)
  acc += dt (capped at 250 ms)    time owed to the simulation
  pollPads()                      read gamepads into INP[0], INP[1]
  while acc >= 1/60 s, up to 8 steps:
    snapPrev()                    remember positions before the step
    if playing: update()          game/update.js: one simulation step
    if title:   attractStep()
    if hacking: hackStep()
    clear one-frame "pressed" inputs
  drop any backlog past 8 steps   a stall slows the game a moment instead of fast-forwarding it
  lerpRender(acc / step)          draw positions blended between the last two steps
  updateTouchUI()                 relabel touch buttons (LIFT, THROW, TALK, ENTER...)
```

- **Interpolation.** `lerpRender()` (core/canvas.js) temporarily moves every entity, projectile and the camera to a point between its position before and after the last step, calls `render()`, then puts the real values back. On a 120 Hz or 144 Hz screen this gives smooth motion instead of each step being shown twice. Moves over 40 px in one step (respawns, doors, scene changes) snap instead of sliding. Rendering never changes game state.
- **Stalls.** Coming back to a background tab resets the clock. A long pause (GC, a slow phone) catches up at most 8 steps (133 ms), so the game stays at full speed down to about 8 fps.
- **Adaptive quality.** Profiling showed script takes about 1 ms a frame; what limits slow devices is painting pixels. So `perfSample()` keeps a smoothed frame time and, when it stays above 22 ms (under ~45 fps), steps down one tier, waits a second for the change to settle, and checks again. Tier 0 is sharp (up to 2× density) with every effect. Tier 1 drops to 1× density but keeps the effects. Tier 2 is light (`lowFx()`): fewer glows, no puddles, vents or splashes, flat building fills, half the particles and rain, particles capped at 90 (240 normally). Tier 3 is lean, rendering at ¾ resolution as a last resort. It never steps back up within a session. Settings › Graphics: High pins tier 0; Low starts at tier 2.
- **Figure animation.** `drawFig` still picks a key pose for each state, but `easePose()` glides the joints toward it at a per-logic-step rate: fast for strikes, softer for wind-ups and recoveries. That keeps it identical at any refresh rate, and it is off under reduced motion. `squash()` scales the body from the feet: flat on landing (`e.landAt`, set in `physics`), stretched on take-off, compressed when hit, lunging on strikes. Legs get a light rim stroke so dark trousers read against the street.
- **Black market (`modes/blackmarket.js`).** `traderOf(w)` places Sable in the widest gap between buildings on blocks where `hash01(seed)` says so (cached on `w.street.trader`). The offer lives on `G.wd.bm` and is carried to the next block by the `newblock` action with `skips + 1`; `bmPrice()` applies 0.85 per skip, floored at half. Her cart is drawn with the street lights so it sits on the ground plane.
- **Individual looks (`render/looks.js`).** `makeLook()` runs once per regular enemy at spawn and gives it its own skin tone, coat, trousers, hair, build (±8%, drawn only) and, about half the time, an accessory (shades, bandana, beanie, eyepatch, cybereye, scar or chain). The gang colour `pal.acc` never changes, bosses keep their signature look, and the variation comes from a hashed spawn counter rather than `Math.random`, so seeded runs replay identically.
- **The 3D view (`render/r3d.js`, `r3figs.js`, `r3beasts.js`, `r3fx.js`, `r3world.js`, `vendor/three.min.js`).** Everything is drawn with three.js when the browser has WebGL 2 (on a real graphics chip) and Settings → View is 3D: the districts, Arena, Gauntlet, the title's street, the Den, Sprawl blocks and the rooms inside their buildings, training, driving jobs, flights over the skyline and their rooftop fights, and the drone stealth jobs (`r3BuildFacility()`: the corp floor as a cut-away diorama, with the sight cones, keypads and prompts drawn on its plane by `drawFacility()`, which skips what is 3D). Without WebGL 2, on software WebGL, or with Classic 2D picked, the game is 2D. Nothing in the simulation changes. `render()` asks `r3On()`; if it says yes, `r3Render()` draws the 3D frame into its own canvas (`#game3d`), which sits under the game canvas; the game canvas is cleared to transparent and the overlays and the HUD are drawn on it in 2D. Stacking the two canvases, rather than copying the 3D frame across, avoids a GPU read-back every frame. A new place is built and its shaders compiled a piece at a time between frames (`r3Prepare()`), and the frame stays 2D until it's ready, so entering a district never freezes the page. The street maps to 3D as X = x, Y = z (height), Z = (y - FY0) * DZ (depth, toward the camera). The camera looks down at TILT = atan(1/DZ), so a step in depth and a step in height move a point the same distance on screen, and it stands where one unit is one logical pixel across at the middle lane, with that lane where the 2D view puts it (a shifted frustum via `setViewOffset`). Because the 3D picture stays close to the 2D one, the 2D game's own overlays (foe bars, daze stars, damage numbers, sparks, beams, pickups, projectiles) are drawn by their usual functions after `r3Affine(x, y)` points the 2D context at that object's projected spot and scale. Fighters are low-poly puppets (`r3Puppet()`): each frame `drawFig(e)` runs against a do-nothing context (`R3NULL`) so the figure's eased pose (`e._pose`: hips, shoulders, feet, hands, knee bend, lean) and its dress (`e._rig`: style, gun, staff, spell glow, squash) stay current exactly as in 2D, and `r3Pose()` sets limbs, torso, head, hair or helmet, visor, weapon and spell orb from them; `r3Body()` repeats drawFig's whole-body turns for falls, rolls, grabs and pile drivers. Creatures and machines have their own low-poly models in `render/r3beasts.js` (drones, hellhounds, mech walkers, the dragon, fire spirits, turrets, ICE, vending machines, chests, vaults, data nodes, hostages, cars, the Interceptor van, oil slicks, bikes under their riders, the VTOL and the enemy air), each animated from the same state its 2D drawing reads; anything still without one is its 2D drawing on a camera-facing card (`r3Card()`), so nothing is ever missing. The Sprawl's buildings and the Den's shops stand as 3D facades at their real positions (`r3FixedFronts()`), and their doors, name signs and markers are the 2D art (`drawBuilding()`, `drawStorefronts(base, only)`) drawn onto those facades; a building's rooms are built by `r3BuildRoom()` from its `INT` palette and decor, and a flight by `r3BuildFlight()` from the job's towers. `r3BuildWorld(S)` builds each district once from its colours and signs: the road (canvas texture, a roughness map whose puddles are glossier), lane dashes, kerb and pavement, three instanced rows of buildings whose windows and shopfronts are lit in the material's shader from the world position (`r3Facade()`), neon signs that flicker and bloom, instanced lamps, additive reflection streaks on a wet road, rain moved entirely in the vertex shader, a small prefiltered environment of the district's neon for reflections, and each district's own touches (tunnel pillars and rails, market lanterns, the Arcology's floor grid, the Host's wireframe towers). Four point lights follow the fight, taking the nearest lamps and signs each frame, so the shaders never recompile. Bloom runs through `renderer.setEffects()` below graphics tier 2; at tier 0 the moon (or a room's key light) casts real shadows from a shadow box that follows the view in whole texels (`r3MoonShadow()`); the 3D canvas renders at 100/80/66% resolution on tiers 0/1/2 and is capped near 3.7 million pixels (`r3Size()`); at tier 3 the game goes back to 2D. `render/r3fx.js` finishes the picture: fighters turn three-quarters to the camera and carry follow-through (coat tails and hair trail the motion, they breathe at rest, a hit knocks them back), every figure's material gets a fresnel rim in the district's neon (`r3Rim`), strikes leave ribbons (`R3_STRIKES` lists each attack's active frames), shots get glowing cores and streaks, impact flashes, rings and zaps are 3D with two effect lights following the brightest, the camera pushes in for boss entrances, finishing blows and heavy hits (`r3CamFx()`), and outdoor places get sky traffic, animated billboards, street steam, snow and sleet, and lightning (`r3BuildCity()`). Bosses get signature pieces on their puppets (`R3_EXTRAS` in r3figs.js: horns and a scrap crown, a ponytail and scarf, a halo, orbiting gems, a collar and cape, a gold mantle with orbiting runes). three.js is vendored as one classic script holding only the parts the renderer names: `tools/vendor-three.mjs <three.js checkout at the pinned tag>` rebuilds it (with esbuild), and `tests/view3d.test.js` fails if the renderer uses a name the bundle lacks. `tests/view3d.browser.js` checks the real thing in Chromium on software WebGL.
- **Atmosphere (`render/atmos.js`).** Soft light is never a per-frame gradient. `glow(x, y, rx, ry, colour, alpha)` stretches one cached 64 px radial sprite per colour. Haze at the foot of the skyline and the wet sheen on the road are baked into per-stage gradients (`bgGrads`) that the scene paints anyway, so they cost no extra pixels. Neon signs register in `REFL` as they draw, and the street reflects them afterwards.
- **Driving jobs (`modes/drive.js`, `render/vehicles.js`).** `startDrive(id, coop)` builds a run from `DRIVE_JOBS`: a copy of a district's stage stretched to the run's length (`G.drive.S`, which `curS()` returns first), with no waves or props of its own. While `G.drive` is set, `update()` hands the step to `driveUpdate()` after its header, and `tickFx()` (factored out of `update()`) still runs the particles, texts, rain and tips. Riders are ordinary entities with a `bk` bike (`v`, `nitro`, `boostT`, `crash`); vehicles carry `veh` (`car`, `van`, `oil`) and are drawn by `drawVehicle()` instead of `drawFig()`. Players get the seated `ride`, `rpunch`, `rkick` and `rshoot` poses. Because it is all `G.ents` and plain `G` fields (`G.ddist`, `G.dtime`), couch and online co-op need nothing extra; `driveUpdate()` puts any runner who joins mid-run on a bike. `resetWorld()` clears `G.drive`, so every other mode starts on foot.
- **Drone stealth jobs (`modes/stealth.js`, `render/facility.js`).** Built the same way as driving: `G.stealth` holds a freshly seeded layout (cameras, walls with vent gaps, laser gates, guard patrols, the terminal and the exit), `curS()` returns its stage, `update()` hands the step to `stealthUpdate()`, and runners carry a `drone` (velocity, cloak, battery, detection meter). Everything stands on one plane (`SF.floor`); height is `z`. Camera sweeps and laser timing are functions of `G.t`, so the friend's screen online draws them without extra data. The terminal reuses the hacking minigame through its vault path: `startHack({tier: 3}, term)`, and `hackWin`/`hackFail` call `stealthHackDone()` when a stealth job is running. Overwatch co-op (`G.stealth.ow`) keeps runner 2 out of `G.ents` with no drone: `stealthOverwatch()` moves a screen-space reticle in the primitive `G.owX`/`G.owZ` (so snapshots carry it every time it moves), loops set `offT` on a camera or laser (`stealthCamSees()` and `laserOn()` respect it), and pings give guards a `lure` that `stealthPatrol()` walks to before returning. `modes/jobs.js` holds what all jobs share: the crew (`jobCrew()`), karma (`jobKarma()`), the take (`jobTake()`) and banking it into a save (`jobBank()`). Juno's campaign side jobs (`CAMPAIGN_JOBS`, one per Den visit) set `G.cjob`: `jobCrew()` then keeps the campaign's runners instead of making fresh ones, `cjobStart()` saves the Den and keeps a copy, and `cjobBack()` reloads that copy, adds the take and the karma counted in `G.cjob.karma`, and marks `G.sideJobs[stage]` (saved with the run).
- **Flight jobs (`modes/flight.js`, `render/air.js`).** Same pattern again: `G.flight` holds the run (towers, spawn marks, the boss flag), `update()` hands the step to `flightUpdate()`, and the city scrolls by advancing `G.camX` itself. The VTOL is one entity (`kind: 'vtol'`, with the door gun's `aim`); flying things carry `air` and live on one plane (`FL.base`) with their height in `z`. Runner 1's input flies; runner 2's swings and fires the door gun, which aims itself when nobody holds it. Shots are `G.projs` entries with `air` (`bullet`, `rocket`, enemy `eshot` and homing `missile`), drawn by `drawProj()`. The runners ride inside, so `flightUpdate()` keeps them out of `G.ents`. A job with `roof` waves (Over the Skyline) lands into a brawl: `roofStart()` sets `G.flight.roof`, puts the runners in `G.ents`, and from then `update()` runs the ordinary brawler step with `roofTick()` in place of `waves()` (the camera holds on one screen, `render/air.js` `drawRoof()` paints the deck). Losing every runner there calls `roofEnd(false)` from `runners.js`.
- **Online co-op (`modes/net.js`, `server/`).** WebRTC, peer to peer. `netStartHost()` makes an offer and waits for ICE gathering to finish (no trickle). Normally it posts the offer to the lobby (`lobby()`, a Cloudflare Worker in `server/worker.js` with Durable Objects for rooms and rate limits) and gets a five-letter room code; the friend's `netStartJoin()` fetches the offer by code and posts an answer, which `netPollAnswer()` picks up. `netIce()` asks the lobby for TURN relay passes first. With `?lobby=off`, or when the lobby can't be reached, the SDP is packed into a `CCT1z…` code (deflate-raw, base64url) to swap by hand. After a drop, the host reopens the same room (`/reopen` with its key) so the friend can rejoin. The host is authoritative. Each logic step `netHostInput()` copies the friend's last `{h, c}` message into `INP[1]`: `h` is one held flag per action and `c` a press counter per action, so a tap shorter than a packet still lands. Every second step `netSnapshot()` sends, for every entity in `G.ents` and `PL` (given a stable `nid`), only the fields whose rounded JSON changed since the last send (`NET.sent`), plus every `G` field not in `NET_GDENY` whose rounded JSON changed (objects are re-checked every eighth snapshot or when replaced; the backdrop `G.bg` only when replaced), `PARTY`, all projectiles, new particles, texts and effects (tagged `_ns` once sent), picks and props when they change, the sounds played during the step (`sfx` is wrapped while `NET.inUpd`) and the song. Entity references travel as `{$e: nid}` and resolve on arrival. Once connected the host lands on `nethub`, which `setMode` substitutes for the title while online; any mode it starts gets runner 2 from `joinRunner2()` in `netHostTick()`. The friend's character sheet forwards `NET_REMOTE` clicks (`skill`, `attr`, `equip`, `unequip`, `spell`, `drop`, `lock`) as `{k:'act'}`; `netRemoteAct()` replays them on the host through a hidden button in the overlay with `G.sheetIdx` set to 1, so they run the exact same code as a local click. On the friend's side `stepOnce()` calls `netGuestStep()` instead of `update()`: it applies the queued snapshots, eases entities and projectiles toward them over two steps, ticks particles, texts, effects and rain itself, and shows `netwait` whenever the host is in a menu. Fields starting with `_` (render caches like `_pose`) never cross. Neither side trusts the other's messages: the host takes `in` only as 13 `0`/`1` flags plus finite counters for known buttons (`netInOk`), lets go of the friend's buttons after 300 ms of silence and drops them after 15 s, accepts one `hello` per connection, and checks each `act` against the table it names (`netActOk`: a real gear slot, attribute, skill, gun mod and so on, never `__proto__`). The guest ignores `__proto__`, `constructor` and `prototype` keys in snapshots, and when more than 30 snapshots pile up (a hidden tab) it throws them away and sends `{k:'full'}`; the host's `netResync()` then sends everything again with `f:1`, because snapshots are deltas and dropping one would leave stale pieces. `?lobby=` only accepts our lobby, a `cct-lobby.*.workers.dev` deploy, or localhost (`netLobbyOk`). `tests/online.test.js` connects two Chromium pages for real; `tests/robust.test.js` checks the validators.
- **Fighting like River City Ransom and Double Dragon (`game/runners.js`, `game/props.js`, `game/enemies.js`).** Two melee hits in a row set `e.dazeUntil` (`hurt()` in combat.js; stars drawn by `drawDaze()`), and `tryGrab()` grabs a foe that is `dazed()` when a runner walks into it, recording the direction held (`grabLockX/Y`) so it doesn't count as a throw until released or changed. The grab branch of `upRunner()` reads that: punch is a jab string (`p.gp`), kick a knee string (`p.knees`), a pushed direction plus either calls `throwGrabbed()`, and jump starts `jthrow`/`pdrive`, which `grabJumpTick()` runs (a direction in the air throws; landing without one body slams or, for `canPile()`, pile drives). Thrown foes carry `thrown`, `hardLand` and `laneV`, and their landing damage is in `physics()`. Doc's chrome is `TECH` in data/world.js, saved per runner in `p.tech` (in `RUNNER_KEYS`) and checked with `hasTech(p, k)`; `busyFor()` shortens punches and kicks, `flurryTick()` runs Mach fists and Dragon feet (hits with `flurry: true` never add up to a knockdown), `slamTick()` Grand slam, `stompHit()` Heel spikes, and the sprint is `p.sprint`. Foes get the same moves through `DEF` flags (`grab`, `holdNeed`, `thrower`, `flurry`): `streetChoose()` picks one in place of a plain swing and `streetTick()` runs it; a held runner is in state `held` (`heldTick()` counts mashes), and `enemyRelease()` lets go when they break free, when anyone hits the holder, or when the holder leaves.
- **Tests.** `tests/timing.test.js` drives the real loop at 30–240 Hz and checks the step count, stall handling, interpolation, error recovery and quality switching.

Hit-stop (`G.stop`) and slow motion (`G.slow`) skip update steps without dropping button presses.

`update()` steps every entity (`upRunner`, `upEnemy`, `upAlly`), projectiles, pickups and effects, then hands off to the current mode: `worldTick()` (Sprawl), `denTick()`, `arenaTick()`, `trainTick()` or `waves()` (campaign).

## Screen fitting

`fit()` in core/canvas.js sizes the canvas to fill the whole screen (inside the notch-safe area) and picks a logical view to match its shape. The street is always `H` = 270 tall.

| Screen | View | Extra space |
|---|---|---|
| 16:9 or wider | `W` grows from 480 up to `WMAX` (1000) | none; you see more street |
| Narrower than 16:9 | `W` = 480 | `BAND` on top (HUD and sky), and on touch screens `BOT` underneath, sized to the on-screen controls |

`VH` = `BAND` + 270 + `BOT`. `render()` draws the world translated down by `BAND`, then `drawSkyBand()` and `drawGroundBand()` fill the bands. Because `W` varies, never assume 480: use `W` for the view width and `W0` for the 16:9 baseline. Wave triggers go through `waveAt()`, which clamps each wave's `at` to where the camera can actually reach (`len - W`). Without it, the boss wave of a 1500-long district would never trigger on a wide screen. `tests/screen.test.js` checks ten screen shapes and walks every district's waves at five view widths.

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

**Enemy strength.** `spawnEnemy()` (game/flow.js) multiplies a foe's health and damage by the district (`G.stage`), the difficulty (`DIFF`), New Game+ (`ngMul()`) and the party's level (`lvlMul()`, which returns 1 during driving, drone and flight jobs and training).

**A new enemy.** Add an entry to `DEF` in data/content.js (copy a similar one: `ranged`, `lunge`, `teleport`, `shield`, `grab`, `thrower`, `flurry` and the other flags switch on existing behaviors in game/enemies.js). Add a bestiary line to `BEST` in data/legend-data.js. Spawn it from a district's wave list in `STAGES`, an Arena pool in modes/arena.js, or a Sprawl faction in `FAC` (modes/sprawl.js).

**A new weapon, gun or armor.** Add a base to `BASES` in data/gear.js; give a melee base a `look` and draw it in `drawWeapon()`, and a gun base a silhouette in `GUN_SHAPE` (render/figures.js). Items are made by `mkItem(slot, base, parts, mod, maker)`: `applyParts()` works out the numbers, name, rarity (the part count) and price from the base, the maker (`MFR`) and the parts (`PARTS`), and `fixItem()` brings items from older saves up to date. A new part goes in `PARTS` with its effect in `applyParts()` (and wherever its field is read: `crit`, `critMul`, `speed`, `daze`, `kb`); a new maker in `MFR` with the parts it favours. Guns pick a `fire` mode; new fire modes go in `fireBullet()` (game/runners.js). Order matters: bases later in each list drop later in the game.

**A new affix or legendary.** Affixes: `AFFIX` in data/gear.js, effect in `hurt()` (game/combat.js). Legendaries: `LEGS` in data/legend-data.js, a feat that unlocks it in `FEATS`, and the effect wherever it applies (search for `legOf(`).

**A new feat.** Add it to `FEATS` in data/legend-data.js. A counting feat uses `stat` and `n` and is earned automatically when code calls `bump('thatStat')` or `peak('thatStat', value)`. Any other feat is earned by calling `feat('id')` where it happens.

**A new skill.** Add it to `SKILLS` in systems/skills.js (tree and row), then check `has(p, 'id')` (one runner) or `anyHas('id')` (team-wide) where it should matter.

**A new Sprawl block event.** Add it to `EVENTS` in modes/sprawl.js, give it a slice of the roll in `genStreet()`, and check `evOn('id')` where it changes things. Anything that runs every tick on the street goes in `blockEventTick()`.

**A new campaign mutator.** Add a name to `MUTS` and a one-line rule to `MUTD` in modes/arena.js (the new-run screen lists them automatically), then check `modOn('id')` where it changes things. Each mutator adds 20% karma through `mutN()`.

**A new chrome technique or move.** Add it to `TECH` in data/world.js (`move: true` lists it under Chrome moves; `innate(p)` marks archetypes that already know it), check `hasTech(p, 'id')` where it changes things in game/runners.js, and add a line to the help screen's `movesHtml` (ui/screens.js) and the README.

**A new training drill.** Add a step to `TRAIN` in modes/training.js: the touch and keyboard text, a `setup(p)`, a `done()` check on a `G.tf` flag that the game sets when the move happens (`if (G.training) G.tf.x = true`), and optionally a `tick(p)` that runs every step. Then teach the bot in tests/training.test.js.

**A new archetype.** Add it to `ARCH` in data/gear.js (with `locked: 'featId'` if it should be unlocked), its free skill to `ARCH_SKILL` in systems/skills.js, and its special in `doSpecial()` (game/runners.js).

## The PWA

- **sw.js** precaches every file listed in its `BUILD:MANIFEST` block under a cache named after `VERSION`, which is a hash of all those files. The page is always served from that cache, so files from two versions are never mixed. A new deploy installs in the background and waits.
- **pwa.js** notices the waiting version and shows an "update ready" bar between fights. *Update now* saves what it can and switches over. It also handles the install prompt, persistent storage, save backups, app shortcuts and, in the installed app, the Android back button (`backPress()`: pause, close a menu, or let go on the title screen).
- The service worker is **off on localhost** so edits show up on a normal reload. Add `?sw=1` to the URL to test it locally.
- `npm run build` must run before each commit, or the service worker won't notice the change. `npm run check` fails if you forgot.

## Tests

- `npm test` runs every headless test in `tests/`. Each loads the real scripts into Node with a stubbed DOM (`tests/harness.js`) and drives the game with key presses and menu clicks. `npm run test:quick` skips the two long bot playthroughs.
- `npm run test:browser` (needs Playwright) runs real-Chromium checks: both builds boot, the manifest is valid, shortcuts work, the game plays offline, and the update bar works end to end.
