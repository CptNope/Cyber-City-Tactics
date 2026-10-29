# Roadmap

Where Cyber City Tactics has been and where it could go next. Items are grouped by theme and roughly ordered by value within each group. Effort is a rough guess: **S** is an evening, **M** a few sessions, **L** a bigger project.

The guiding rules:
- No framework and no runtime dependencies: plain JavaScript files that any static host can serve, plus a small build that also produces a single-file copy.
- Every feature has to work on a phone with touch controls.
- Every system should make a choice more interesting rather than just add a number.

---

## Shipped

- [x] Core brawler: punch combos, kicks, jumps, flying kicks, grabs, throws, guns, spells
- [x] RPG layer: karma levels, attributes, loot in three rarities, cyberware, spells, fixer contracts
- [x] Campaign: five districts, five bosses, and the Den hub with seven NPCs
- [x] Two-player co-op on one keyboard, gamepads or touch
- [x] Difficulty levels, New Game+, elite enemies, boss rage phases
- [x] Mobile layout: portrait and landscape, floating stick, contextual buttons, settings, first-time tips
- [x] Arena mode with perks, a weekly seeded challenge, score sharing and run stats
- [x] Archetypes with specials, heavy blows, throwables and breakables, a Matrix district
- [x] Companions (drone, troll merc, fire spirit), Barrier and Chain Lightning
- [x] Training level and boss rematches
- [x] **The Sprawl:** open world with procedural buildings, a hacking minigame, heat, cops and street cred
- [x] **Skill trees:** Brawler, Gunslinger, Mage and Decker, six skills each with a capstone
- [x] **Modular source and a robust PWA:** the code split by system with an architecture guide, a build script, checked-in tests, offline app-shell caching, in-game updates, install and backup
- [x] **Renamed to Cyber City Tactics**
- [x] **Content drop:** Shaman and Rigger archetypes with summons, campaign mutators, eight runner coats, Sprawl block events (gang war, blackout, lockdown, night market), the Lantern Vault final job with the Avatar of Ssareth, a ninth legendary and run history
- [x] **Replayability layer:** 42 feats (some hidden), legend ranks with a starting-creds bonus, 8 legendaries unlocked by feats, a bestiary, 24 lore shards telling the Project LANTERN story, the Codex screen, an unlockable Decker archetype, a daily challenge with streaks, and Sprawl bounties, hidden doors and courier drones
- [x] **Design and brand:** a brand book, a design system with tokens and 16 components, and design panels (key art, store and social art, annotated screens), all in `docs/design/`
- [x] **Graphics and animation pass:** neon reflections on wet streets, puddles, steam, air traffic and haze; fighters that ease between poses, squash and stretch, and bend their knees the right way; hounds, mechs and the dragon animated to match; every regular enemy with its own look; fireball explosions, hit flashes and spell trails; health bars that show the bite; a neon power-on title; a four-step automatic quality ladder with a pixel budget for big screens; and a frame rate counter
- [x] **Inventory:** a 40-slot party bag grouped by slot, selling at every store counter (Ratchet pays best), "sell all Street-grade" and item locking
- [x] **Expansion 11:** street politics (crew and Kagemori standing, rivalries, hit squads, crew backup) and weapon trails
- [x] **Expansion 10:** the Wyrm's Roost and the fight with Ssareth (ground, flight and lane-breath phases), the Wyrmheart legendary and the Wyrmslayer coat
- [x] **Expansion 9:** the Street Doc and Physical Adept archetypes, and shareable challenge seeds for Sprawl blocks and Arena runs
- [x] **Expansion 8:** hazard rooms, vaults with a second hack, back-alley clinics with rare cyberware, and talisman shops with two rare spells
- [x] **Expansion 7:** co-op team attacks, mech walkers, feral spirits and hostage rooms
- [x] **Expansion 6:** a parry on the dodge button, gang nightclubs and Lone Star precincts in the Sprawl, and a block map
- [x] **Expansion 5:** hellhound packs, cloaked Kagemori shadows, and salvage and crafting at Ratchet's workbench
- [x] **Expansion 4:** a heavy blow for every melee weapon, four gun mods at Ratchet's bench, the spirit storm event, and a gear comparison card
- [x] **Expansion 3:** Turbo, Fog, Split and Pacifist mutators; acid rain, corp parade and manhunt block events; co-op revive; Doc's neural reset; five new feats; GitHub Actions CI
- [x] **New gear:** spur knuckles, fire axe, gravity hammer, assault rifle, smartgun, railgun, grenade launcher, warded duster, thermoptic cloak, exo-frame, and six affixes

---

## Next up

### Missions: new ways to play a job
Side jobs from Juno (and a **Jobs** board on the title and online hub) that break up the brawling. Each works solo, in couch co-op and online, because each runs on the same entities and snapshots as everything else.

- [x] ~~**Driving.**~~ Shipped: two jobs on the Jobs board (The Causeway Run, Neon Market Getaway), solo, couch and online. Still to come: Road Rash on the causeway. Each runner rides a bike in the street's depth lanes: hold right to throttle, left to brake, up and down to change lanes, dodge for a nitro burst, jump to hop an oil slick. Punch and kick riders alongside you, shoot what's ahead, and don't hit civilian traffic. Gang bikers swing chains, Kagemori interceptors ram, and a boss vehicle waits at the end of the run. Crash and you're back on the bike a moment later, a little lighter in HP. Pays creds and karma by finish time and takedowns.
  - Car chases with a rigger driving and a partner shooting from the window; a delivery variant (keep the cargo intact); a night run with headlights only; bike upgrades bought with the pay; a driving job as a district's side contract.
  - The original pitch, for reference: Road Rash on the causeway. Each runner rides a bike in the street's depth lanes, throttle, brake, lanes, nitro, hop; punch and kick riders alongside, shoot what's ahead, avoid civilian traffic; gang bikers, a ramming Kagemori van at the end; crash and get back on.
- [x] ~~**Drone stealth.**~~ Shipped: two jobs (Ghost in the Arcology, The Night Clinic) with cameras, guards, vents, lasers, the terminal hack, shock darts and a three-step alarm; solo, couch and online, each runner flying a drone. Overwatch co-op shipped too: runner 2 runs a reticle on the building's network, looping cameras and lasers and pinging noises that guards walk over to investigate. Still to come: doors the hack can open. The original pitch: A rigger's job: fly a small drone through a corp site seen in cross-section. Cameras sweep cones of light and guards walk patrol routes with vision arcs; stay in the dark, hug ceilings, wait out the sweep. Reach a terminal to start a hack (the existing hacking minigame, timed, while the drone hovers), or reach a target and take them down from behind with a shock dart for a quiet kill. Get seen and an alarm ticks up: more guards, then lockdown. Co-op: one runner pilots, the other runs overwatch on a camera feed, marking guards and opening doors.
- [x] ~~**Flight.**~~ Shipped: two jobs (Over the Skyline, Into the Storm) with a pilot and a door gunner (or an autogun solo), drones, gunships, towers, searchlights and flak, salvage, and the Raijin. Over the Skyline now lands straight into a rooftop brawl: three waves of Kagemori security on the Arcology roof. The original pitch: A VTOL run over the skyline as a side-scrolling shooter: weave between towers and billboards, shoot down corp drones and gunships, dodge searchlights and flak, and drop the team onto a rooftop at the end (which leads straight into a brawl). Co-op: pilot and door gunner. The same parallax skyline as the districts, seen from above the rooftops for once.
- [x] ~~**Job pay into your saves.**~~ Shipped: a job's creds and gear can be banked to the Sprawl stash or the campaign's Den locker.
- [x] ~~**Missions in the campaign.**~~ Shipped: in each Den, Juno offers one optional side job (the Causeway Run, the clinic drone job, the Market getaway, the Arcology drone job, then the flight over the skyline). It runs with the campaign's own runners, and the take, gear and karma go straight into the campaign. One shot per Den, win or lose.

### Gear and loot
- [x] ~~**Black-market rarity.**~~ Shipped as eight legendaries unlocked by feats.
- [ ] **More legendaries (S each).** One per new boss and per new hidden feat, so there's always a ??? left in the Codex.
- [x] ~~**Weapon-specific moves.**~~ Shipped: dash slash, flurry, yank, shock stun, cleave and ground pound.
- [x] ~~**Gun mods.**~~ Shipped: extended mag, laser sight, suppressor and underbarrel launcher at Ratchet's bench.
- [x] ~~**Item comparison.**~~ Shipped as a floating card over gear on the floor.
- [x] ~~**Salvage and crafting.**~~ Shipped: scrap gear for parts, reroll affixes and upgrade rarity at Ratchet's.
- [ ] **Sets (L).** Two- and three-piece bonuses for matching gear, such as Kagemori Security: armored riot vest + smartgun + shock baton.

### Skills and progression
- [x] ~~**Skill respec.**~~ Shipped as Doc's neural reset.
- [ ] **Active skills (M).** One per tree, mapped to the special button as an alternative to the archetype special:
  - Brawler: *Ground Slam*
  - Gunslinger: *Fan the Hammer*
  - Mage: *Summon Spirit*
  - Decker: *Overload*, which stuns every drone and cop on screen
- [ ] **A fifth tree: Shaman (M).** Spirit allies, totems and curses, for players who want magic without blasting.
- [ ] **Archetype mastery (M).** Each archetype gets a small set of extra tiers past level 15 that change how its special works.
- [ ] **Show skill effects in the HUD (S).** For example, a small Archon counter showing how many casts until the free one.

### The Sprawl
- [x] ~~**Nightclubs and cop precincts.**~~ Shipped: dance-floor brawls, and precincts that open up at street cred +30.
- [x] ~~**Clinics and talisman shops.**~~ Shipped: rare cyberware and rare spells on the street.
- [x] ~~**Hostage rooms.**~~ Shipped: clear the room without hitting the hostage.
- [x] ~~**Hazard and vault rooms.**~~ Shipped: live wiring, unstable ceilings, and lock-4 vaults.
- [x] ~~**Faction reputation.**~~ Shipped as street politics: four crews and Kagemori, rivalries, hit squads and backup.
- [x] ~~**Bounties.**~~ Shipped: Juno posts a named target each block.
- [ ] **Day and night (M).** At night there are fewer cops, more gangs and better loot. In the day, shops are open and break-ins are riskier.
- [x] ~~**A block map.**~~ Shipped: press M in the Sprawl.
- [ ] **Persistent consequences (M).** Rob a family and their window stays boarded. Clear a hideout and the shops next to it lower their prices.

### Hacking
- [ ] **More hacking minigames (M):**
  - *Trace:* route a signal through a small grid
  - *Sequence:* repeat a pattern
  - *Firewall:* dodge ICE in a tiny side-scroller

  The building type picks which one you get.
- [ ] **Hack things in combat (M).** Turrets, cameras and drones can be hacked mid-fight with a short window to turn them on their owners.
- [ ] **Cyberdecks (S).** A fourth gear slot for deckers: hacking bonus, icebreaker capacity, and an overload spell-like ability.

### Campaign and story
- [x] ~~**The Undercity Market.**~~ Shipped as district 4 (between the Tunnels and the Arcology, where the story goes): a lantern-strung ghoul bazaar with its own music, thralls that heal off every hit, a Hollow Saint rematch, Juno's Night market contract, and Mother Vesper, who mist-steps behind you mid-swing and calls her thralls when angry. Beating her unlocks Vesper's Fang. Saves from before it are moved to the same place in the new order.
- [x] ~~**Choices that matter.**~~ Shipped: after the Market, sell Vesper's books through Juno (¥250, but an extra Kagemori guard in every Arcology wave) or leak them to Pixel's feeds (nothing, but one guard fewer). After the Arcology, wipe Voss's backup core (no Voss.exe in the host, more ICE) or keep it as a key (Black ICE starts a quarter weaker, Voss.exe waits). Saved with the run.
- [ ] **Cutscenes in the engine (M).** Short scripted moments using the existing figures, with speech bubbles and camera pans.
- [x] ~~**Endings.**~~ Shipped: four epilogues from Juno, one for each pair of choices.

### Combat and enemies
- [x] ~~**Corp ninjas and hellhounds.**~~ Shipped as Kagemori shadows and hellhound packs.
- [x] ~~**Mech walkers and feral spirits.**~~ Shipped: a plated walker with a weak back, and a spirit that echoes your last spell.
- [x] ~~**A parry.**~~ Shipped: a perfect dodge staggers the attacker and sets up a guaranteed crit.
- [x] ~~**Grabs you can actually find.**~~ Shipped: two hits in a row daze a foe for a second (stars over its head), so there's time to walk in and grab; the help screen lists every move.
- [x] ~~**Chrome techniques.**~~ Shipped: six one-off implants from Doc, River City Ransom books in chrome: faster punches, faster kicks, longer grabs, harder throws, higher jumps, faster get-ups.
- [x] ~~**Chrome moves.**~~ Shipped: five more from Doc that add moves: Mach fists and Dragon feet (mash for a punch or kick flurry), Grand slam (swing a grabbed foe through the crowd), Heel spikes (stomp the downed) and Turbo calves (double-tap to sprint; shoulder charge and slide).
- [x] ~~**Foes who fight like runners.**~~ Shipped: grabs you mash out of (gangers, orcs, the Gutter King), flurries with a tell (Razor Mei, Kagemori shadows), and gangers and orcs picking up and throwing props.
- [ ] **Juggles and wall bounces (M).** Enemies knocked into the street's back wall bounce back for follow-ups.
- [ ] **Status effects on enemies too (S).** Some enemies use shock and fire rounds against you, with counters from armor affixes.

### Co-op and online
- [x] ~~**Team attacks.**~~ Shipped: two hits on one enemy within half a second trigger a combined finisher.
- [x] ~~**Revive.**~~ Shipped: stand by your partner's marker.
- [x] ~~**Online co-op.**~~ Shipped for the Arena: WebRTC peer to peer, joined with a five-letter room code from a Cloudflare Worker lobby that also hands out TURN relay passes; long manual codes as a fallback. The host runs the game; the friend's browser sends buttons and draws the host's snapshots.
- [x] ~~**Online co-op beyond the Arena.**~~ Shipped: the host's hub starts any mode with the friend as Runner 2, and the friend has their own character sheet.
- [x] ~~**Online co-op, round three.**~~ Shipped: the friend shops at the host's counter for their own runner, rejoins the same room after a drop, and watches the host's training.
- [x] ~~**Daily challenge.**~~ Shipped, with a set archetype per day and a play streak.
- [ ] **Leaderboard snapshots (M).** An optional, opt-in way to compare daily and weekly scores with friends, for example a share code that encodes your score and seed so others can verify it.

### Presentation
- [x] ~~**Animated title and menus.**~~ Shipped: the title powers on like a neon tube and skills pop when bought. Menus stay instant, as the brand book asks.
- [ ] **Per-district music variations (M).** A calmer loop between waves and an intense one during them.
- [ ] **Accessibility (M).** A high-contrast mode, a colorblind-safe palette for door signs and affixes, remappable keys, a hold-to-toggle option for the heavy blow, and reduced-motion support everywhere.
- [ ] **Localization scaffolding (M).** Move all text into one table so the game can be translated.

### Feel and presentation, round two
Picked from what the graphics pass turned up:
- [x] ~~**Elites you can read at a glance.**~~ Shipped: armored elites wear steel plates that bullets spark off, berserkers leave red afterimages and steam, warded ones turn a ring of runes that ripples when a spell slides off, vampiric ones have a heartbeat glow and visibly drain you.
- [x] ~~**Hit reactions and deaths.**~~ Shipped: punches alternate a head snap and a doubled-over flinch, bullets jolt, shocks lock the body rigid, heavy blows spin them through the air, uppercuts tip them over backward with flailing limbs. A finishing jab drops them face-down where they stand; fire kills char and smoke, shock kills twitch and spark, magic kills dissolve into rising motes.
- [x] ~~**Boss entrances.**~~ Shipped: letterbox bars, a short camera push and a slanted name card with an epithet and a sting, once per boss per run. The fight stays live throughout, so there's nothing to skip.
- [x] ~~**Street props with light.**~~ Shipped: fire barrels and lamp posts (sodium, cyan, white or tunnel green by district, some flickering) that pool light on the street and light up anyone standing near them.
- [x] ~~**District weather.**~~ Shipped: storms with lightning and thunder over the Barrens, rain in the Market, fog banks rolling through the Tunnels, sleet over the Arcology, and per-block weather in the Sprawl fixed by the block's seed. Lightning is soft (sky only) and never shown under reduced motion.
- [x] ~~**Low-health feel.**~~ Shipped: under 25% HP the edges bleed red on a heartbeat and the music muffles. Steady instead of pulsing under reduced motion; light mode keeps only the sound.

### Inventory and economy
- [x] ~~**Stash.**~~ Shipped: 60 slots, shared between Ratchet's locker in the Den and the Sprawl safehouse's Stash tab. Stashed gear can't be sold by accident; it belongs to the save, so a new run starts empty.
- [x] ~~**New-item markers and sorting.**~~ Shipped: a NEW tag on gear until you close the character sheet, and a Best / Value / Newest toggle on every bag list.
- [x] ~~**Rotating black market.**~~ Shipped: Sable sets up her cart between buildings on about two in five Sprawl blocks (fixed by the block's seed, marked on the minimap) with one Black-market item. Her offer follows you; every block you walk past it, the price drops 15%, down to half. She only deals at cred +15 or with the Fence skill.
- [x] ~~**Haggling.**~~ Shipped as a gamble at every counter, once per visit: odds from the party's best Hacking (30–85%). Win and prices are 15% better both ways for the visit; lose and they're 10% worse. Ratchet's shelf now also honours cred, Fence Contacts and haggling.
- [ ] **Item sets (L)** stay planned under Gear and loot.

### Reach and onboarding
- [x] ~~**First-run tutorial.**~~ Shipped on top of Juno's existing training: the first time anyone starts a run, Juno offers the drills (now eleven, with a new parry drill), and when they finish, one button starts the run that was waiting. Shown once; skipping is one click.
- [x] ~~**Real-device performance reports.**~~ Shipped: Settings › Performance report copies the version, browser, screen and canvas size, quality step, frame rate and game speed.
- [x] ~~**Store listing kit.**~~ Shipped in `docs/store/`: a 22-second trailer, six 1920×1080 shots, an itch.io cover, a social card (now the page's link preview) and page copy, plus fresh install-dialog screenshots, all made by `tools/capture.mjs` from the live game. The brand fonts are now bundled with the game, so it looks right offline too.

### Engineering
- [x] ~~**Check in the test bots.**~~ `tests/` with `npm test`, plus Playwright browser checks.
- [x] ~~**Split the source.**~~ 35 files by system, documented in docs/ARCHITECTURE.md, with a build that also makes a single-file copy.
- [x] ~~**Save export and import.**~~ In Settings → Save backup.
- [x] ~~**Robust PWA.**~~ App-shell service worker with versioned precache, an update-ready bar, install button, shortcuts, maskable icons, screenshots, persistent storage and save validation.
- [x] ~~**GitHub Actions.**~~ `.github/workflows/ci.yml` runs the build check, formatting, `npm test` and the browser tests on every push and pull request.
- [ ] **Deploy gate (S).** Deploy Pages from a workflow that only runs after CI passes.
- [ ] **ES modules (M).** Move from shared-global classic scripts to `import`/`export`, so each file declares exactly what it uses. The current split makes this a mechanical change, file by file.
- [ ] **Type checking (S).** JSDoc types on the core objects (entities, items, saves) checked with `tsc --checkJs`, no TypeScript build needed.
- [ ] **Cloud save (M).** Optional sync of the save backup through a file the player picks (File System Access API) or a share code.
- [x] ~~**Full-screen on any device.**~~ The canvas fills every screen shape; wider views see more street, taller ones get HUD and control bands.
- [x] ~~**Frame timing.**~~ Fixed-timestep logic with interpolated rendering, stall recovery, a crash-proof loop and adaptive graphics quality.
- [x] ~~**Performance pass.**~~ Profiled: pixels, not script, limit slow devices, so caching layers wouldn't help. Shipped instead: a four-step quality ladder (sharpness, then effects, then ¾ resolution), sprite-based glows and atmosphere baked into existing fills.

### Discovery and replayability
These are the next ways to keep "one more run" alive:
- [x] ~~**Lore that changes the game.**~~ Shipped as the Lantern Vault.
- [x] ~~**Lantern Vault, part two.**~~ Shipped as the Wyrm's Roost: Ssareth with a flight phase and lane breath. It opens after the Avatar falls on any difficulty, not only Prime, so more players get to see it.
- [x] ~~**Rotating Sprawl events.**~~ Shipped: gang war, blackout, lockdown and night market.
- [x] ~~**More block events.**~~ Shipped: acid rain, corp parade and manhunt.
- [x] ~~**Spirit storm.**~~ Shipped.
- [x] ~~**Mutators for the campaign.**~~ Shipped: Glass Cannon, Elite Streets, Bare Knuckles and One Life.
- [x] ~~**More mutators.**~~ Shipped: Turbo, Fog, Split and Pacifist.
- [x] ~~**Shaman and Rigger.**~~ Shipped and unlocked by feats.
- [x] ~~**Street Doc archetype.**~~ Shipped: heals with every hit, Triage special.
- [x] ~~**Adept archetype.**~~ Shipped as the Physical Adept: no guns, chi blasts, Killing Hands.
- [x] ~~**Cosmetics from feats.**~~ Shipped as eight runner coats.
- [x] ~~**Weapon trails.**~~ Shipped: six trails unlocked by feats.
- [ ] **More cosmetics (S).** Visor colors, hair styles and a title under your name.
- [ ] **Achievement-only secrets (S).** Hidden rooms that only appear once you hold a certain legendary, or once you've earned a certain feat.
- [x] ~~**Run history.**~~ Shipped in the Codex.
- [x] ~~**Challenge seeds.**~~ Shipped: S3-XXXX and A-XXXX codes, share links.

---

## Ideas parking lot
Not planned, but worth keeping:
- A **vehicle chase** level on a highway, punching off bikers
- **Pets:** a cyber-dog that fetches loot
- **Graffiti tags** you can leave on cleared hideouts, which show up on later blocks
- **Photo mode** with filters and a share button
- **A level editor** for custom districts, shared as a URL
- A **roguelite mode:** one life, random districts, perks only

Have an idea? Open an issue in this repo.
