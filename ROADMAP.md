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
- [x] Campaign: six districts, six bosses, and the Den hub with seven NPCs
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
- [x] **Online co-op:** room codes through a Cloudflare lobby with TURN relay, in every mode, with shared shops, the friend's own character sheet and rejoining after a drop
- [x] **Jobs:** driving, drone stealth (with overwatch co-op) and flight (landing in a rooftop brawl) on a Jobs board, pay banked into your saves, and one as Juno's side job in every Den
- [x] **River City Ransom and Double Dragon fighting:** dazes and a full grab menu (punches, knees, directional throws, jump slams and pile drivers), twelve chrome techniques and moves from Doc, foes that grab, flurry and throw props, and Training drills for all of it
- [x] **Archetype mastery:** the special grows at levels 15 and 20 and changes at 25
- [x] **The Shaman tree:** spirits, totems and curses, with the Totem active skill
- [x] **Story and presentation:** in-engine scenes, two-mood district music, and accessibility settings
- [x] **The living Sprawl:** day and night, a block that remembers, sentry turrets, and hacking in a fight
- [x] **Sets and actives:** maker set bonuses, a cyberdeck slot, and an active skill for every tree
- [x] **River City street fights:** street weapons, wall bounces and juggles, mercy and runners, boss taunts, a fourteenth training drill, and two feats (Street Mercy, Off the Wall)
- [x] **New gear:** spur knuckles, fire axe, gravity hammer, assault rifle, smartgun, railgun, grenade launcher, warded duster, thermoptic cloak, exo-frame, and six affixes

---

## Next up

The first wave, nearly all shipped. Open items from it moved to Horizon two below.

### Missions: new ways to play a job
Side jobs from Juno (and a **Jobs** board on the title and online hub) that break up the brawling. Each works solo, in couch co-op and online, because each runs on the same entities and snapshots as everything else.

- [x] ~~**Driving.**~~ Shipped: two jobs on the Jobs board (The Causeway Run, Neon Market Getaway), solo, couch and online. Each runner rides a bike in the street's depth lanes: hold right to throttle, left to brake, up and down to change lanes, dodge for a nitro burst, jump to hop an oil slick. Punch and kick riders alongside you (either side), shoot and cast either way, grab loot off the road, and don't hit civilian traffic. Gang bikers swing chains and the Kagemori Interceptor rams at the end. Crash and you're back on the bike a moment later. Pays creds and karma by finish time and takedowns. Still to come:
  - Car chases with a rigger driving and a partner shooting from the window; a delivery variant (keep the cargo intact); a night run with headlights only; bike upgrades bought with the pay.
  - The original pitch, for reference: Road Rash on the causeway. Each runner rides a bike in the street's depth lanes, throttle, brake, lanes, nitro, hop; punch and kick riders alongside, shoot what's ahead, avoid civilian traffic; gang bikers, a ramming Kagemori van at the end; crash and get back on.
- [x] ~~**Drone stealth.**~~ Shipped: two jobs (Ghost in the Arcology, The Night Clinic) with cameras, guards, vents, lasers, the terminal hack, shock darts and a three-step alarm; solo, couch and online, each runner flying a drone. Overwatch co-op shipped too: runner 2 runs a reticle on the building's network, looping cameras and lasers and pinging noises that guards walk over to investigate. Still to come: doors the hack can open. The original pitch: A rigger's job: fly a small drone through a corp site seen in cross-section. Cameras sweep cones of light and guards walk patrol routes with vision arcs; stay in the dark, hug ceilings, wait out the sweep. Reach a terminal to start a hack (the existing hacking minigame, timed, while the drone hovers), or reach a target and take them down from behind with a shock dart for a quiet kill. Get seen and an alarm ticks up: more guards, then lockdown. Co-op: one runner pilots, the other runs overwatch on a camera feed, marking guards and opening doors.
- [x] ~~**Flight.**~~ Shipped: two jobs (Over the Skyline, Into the Storm) with a pilot and a door gunner (or an autogun solo), drones, gunships, towers, searchlights and flak, salvage, and the Raijin. Over the Skyline now lands straight into a rooftop brawl: three waves of Kagemori security on the Arcology roof. The original pitch: A VTOL run over the skyline as a side-scrolling shooter: weave between towers and billboards, shoot down corp drones and gunships, dodge searchlights and flak, and drop the team onto a rooftop at the end (which leads straight into a brawl). Co-op: pilot and door gunner. The same parallax skyline as the districts, seen from above the rooftops for once.
- [x] ~~**Job pay into your saves.**~~ Shipped: a job's creds and gear can be banked to the Sprawl stash or the campaign's Den locker.
- [x] ~~**Missions in the campaign.**~~ Shipped: in each Den, Juno offers one optional side job (the Causeway Run, the clinic drone job, the Market getaway, the Arcology drone job, then the flight over the skyline). It runs with the campaign's own runners, and the take, gear and karma go straight into the campaign. One shot per Den, win or lose.

### Gear and loot
- [x] ~~**Black-market rarity.**~~ Shipped as eight legendaries unlocked by feats.
- [x] ~~**Weapon-specific moves.**~~ Shipped: dash slash, flurry, yank, shock stun, cleave and ground pound.
- [x] ~~**Gun mods.**~~ Shipped: extended mag, laser sight, suppressor and underbarrel launcher at Ratchet's bench.
- [x] ~~**Item comparison.**~~ Shipped as a floating card over gear on the floor.
- [x] ~~**Salvage and crafting.**~~ Shipped: scrap gear for parts, reroll affixes and upgrade rarity at Ratchet's.
- [x] ~~**Sets.**~~ Shipped as maker sets: two and three pieces from one maker (weapon, gun, armor, cyberdeck) add a bonus.

### Skills and progression
- [x] ~~**Skill respec.**~~ Shipped as Doc's neural reset.
- [x] ~~**Active skills.**~~ Shipped: Ground Slam, Fan the Hammer, Summon Spirit and Short Circuit (the roadmap's Overload, renamed since it's the Decker archetype's special), unlocked by three points in a tree and picked for the ★ button on the Skills tab.
- [x] ~~**A fifth tree: Shaman.**~~ Shipped: Spirit Kin, Hex, Ward Totem, Wild Call, Withering and Spirit Walk, plus the Totem active skill.
- [x] ~~**Archetype mastery.**~~ Shipped: Mastery I and II (levels 15 and 20) make the archetype's special 25% stronger each, and Mastery III (level 25) changes how it works.
- [x] ~~**Show skill effects in the HUD.**~~ Shipped: Archon counts the casts toward the free one on the spell line (FREE ×2 when it's next), and Berserker and Spirit Walk frame the health bar while they're on, with a callout as they switch on.

### The Sprawl
- [x] ~~**Nightclubs and cop precincts.**~~ Shipped: dance-floor brawls, and precincts that open up at street cred +30.
- [x] ~~**Clinics and talisman shops.**~~ Shipped: rare cyberware and rare spells on the street.
- [x] ~~**Hostage rooms.**~~ Shipped: clear the room without hitting the hostage.
- [x] ~~**Hazard and vault rooms.**~~ Shipped: live wiring, unstable ceilings, and lock-4 vaults.
- [x] ~~**Faction reputation.**~~ Shipped as street politics: four crews and Kagemori, rivalries, hit squads and backup.
- [x] ~~**Bounties.**~~ Shipped: Juno posts a named target each block.
- [x] ~~**Day and night.**~~ Shipped: a three-minute day and night on every block. Night: fewer cops, bigger and more frequent gang patrols, richer caches, shops shut. Day: shops open, break-ins draw witnesses. Wait or sleep at the safehouse.
- [x] ~~**A block map.**~~ Shipped: press M in the Sprawl.
- [x] ~~**Persistent consequences.**~~ Shipped: robbed homes and businesses stay boarded up and raise the block's prices; cleared crews lower them; buildings remember the room you left (which also closes the re-entry farming noted in the audit).

### Hacking
- [x] ~~**More hacking minigames.**~~ Shipped: gang hideouts have a *Sequence* keypad (repeat a pattern), precincts a *Trace* (walk a signal through a small grid before the trace), black sites a *Firewall* (dodge ICE in three lanes); everything else keeps the timing lock. Icebreakers, Port Scanner, Spare Cycles and decks work in all of them, and Settings can put the classic lock back on every door.

  The building type picks which one you get.
- [x] ~~**Hack things in combat.**~~ Shipped: shorted-out or badly damaged drones and the new sentry turrets can be hacked with PUNCH and turned on their owners.
- [x] ~~**Cyberdecks.**~~ Shipped: a fourth slot with Street, Cobalt and Wraith decks and deck parts; Short Circuit scales with the deck.

### Campaign and story
- [x] ~~**The Undercity Market.**~~ Shipped as district 4 (between the Tunnels and the Arcology, where the story goes): a lantern-strung ghoul bazaar with its own music, thralls that heal off every hit, a Hollow Saint rematch, Juno's Night market contract, and Mother Vesper, who mist-steps behind you mid-swing and calls her thralls when angry. Beating her unlocks Vesper's Fang. Saves from before it are moved to the same place in the new order.
- [x] ~~**Choices that matter.**~~ Shipped: after the Market, sell Vesper's books through Juno (¥250, but an extra Kagemori guard in every Arcology wave) or leak them to Pixel's feeds (nothing, but one guard fewer). After the Arcology, wipe Voss's backup core (no Voss.exe in the host, more ICE) or keep it as a key (Black ICE starts a quarter weaker, Voss.exe waits). Saved with the run.
- [x] ~~**Cutscenes in the engine.**~~ Shipped: Juno on comms as each district opens and a line with each boss after its name card, with letterbox bars, a camera lean toward the speaker and speech bubbles; skippable, once per run, and optional in Settings.
- [x] ~~**Endings.**~~ Shipped: four epilogues from Juno, one for each pair of choices.

### Combat and enemies
- [x] ~~**Corp ninjas and hellhounds.**~~ Shipped as Kagemori shadows and hellhound packs.
- [x] ~~**Mech walkers and feral spirits.**~~ Shipped: a plated walker with a weak back, and a spirit that echoes your last spell.
- [x] ~~**A parry.**~~ Shipped: a perfect dodge staggers the attacker and sets up a guaranteed crit.
- [x] ~~**Grabs you can actually find.**~~ Shipped: any hit makes a foe flinch long enough to grab, and two in a row daze it for a second (stars over its head), so there's time to walk in; the help screen lists every move.
- [x] ~~**Chrome techniques.**~~ Shipped: six one-off implants from Doc, River City Ransom books in chrome: faster punches, faster kicks, longer grabs, harder throws, higher jumps, faster get-ups.
- [x] ~~**Chrome moves.**~~ Shipped: six more from Doc that add moves: Mach fists and Dragon feet (mash for a punch or kick flurry), Grand slam (swing a grabbed foe through the crowd), the Pile driver rig (street samurai and adepts know it already), Heel spikes (stomp the downed) and Turbo calves (double-tap to sprint; shoulder charge and slide).
- [x] ~~**Double Dragon grabs.**~~ Shipped: from a grab, punch only punches (jab, jab, hook) and kick only knees (knee, knee, knee lift); a direction plus either throws that way (forward, over the shoulder, into another lane); jump leaps with them, throwing in any direction pushed in the air, or landing in a body slam, or a pile driver for street samurai, adepts and anyone with the Pile driver rig.
- [x] ~~**Foes who fight like runners.**~~ Shipped: grabs you mash out of (gangers, orcs, the Gutter King), flurries with a tell (Razor Mei, Kagemori shadows), and gangers and orcs picking up and throwing props.
- [x] ~~**Foes that keep up.**~~ Shipped: enemies scale with the party's level as well as the district (about 9% health and 8% damage a level), so late districts stay a fight and there's time to daze and grab.
- [x] ~~**Makers, parts and five rarities.**~~ Shipped: Borderlands-style gear. Five manufacturers with specialities (Kagemori precision, Rustline Forge damage, Voltaic elements and dazes, Hexwright magic, Ironside Arms speed), 0–4 parts per item, and the part count as the rarity, from white Street to orange Legendary. Weapons and guns drawn with their own shapes, maker colours and shots.
- [x] ~~**Grapples at any power level.**~~ Shipped: haul a downed foe up into a grab, foes under 30% health reel and can be grabbed, and Voltaic and Concussive weapons daze in one hit.
- [x] ~~**Street weapons.**~~ Shipped: lead pipes, bike chains and spiked bats to pick up, swing until they break and throw from the air; foes carry them, pick them up and throw them too.
- [x] ~~**Taunts and begging.**~~ Shipped: bosses talk when they enrage and on their last quarter; beaten gangers, orcs and cops may beg (spare them for a payoff and karma), and bikers, security and thralls may run.
- [x] ~~**Juggles and wall bounces.**~~ Shipped: foes knocked into the screen edge while a fight holds the camera bounce back and can be juggled up to three times.

### Co-op and online
- [x] ~~**Team attacks.**~~ Shipped: two hits on one enemy within half a second trigger a combined finisher.
- [x] ~~**Revive.**~~ Shipped: stand by your partner's marker.
- [x] ~~**Online co-op.**~~ Shipped for the Arena: WebRTC peer to peer, joined with a five-letter room code from a Cloudflare Worker lobby that also hands out TURN relay passes; long manual codes as a fallback. The host runs the game; the friend's browser sends buttons and draws the host's snapshots.
- [x] ~~**Online co-op beyond the Arena.**~~ Shipped: the host's hub starts any mode with the friend as Runner 2, and the friend has their own character sheet.
- [x] ~~**Online co-op, round three.**~~ Shipped: the friend shops at the host's counter for their own runner, rejoins the same room after a drop, and watches the host's training.
- [x] ~~**Daily challenge.**~~ Shipped, with a set archetype per day and a play streak.

### Presentation
- [x] ~~**Animated title and menus.**~~ Shipped: the title powers on like a neon tube and skills pop when bought. Menus stay instant, as the brand book asks.
- [x] ~~**Per-district music variations.**~~ Shipped: each district song has a calm loop between waves and the full track during fights, switching on a bar line.
- [x] ~~**Accessibility.**~~ Shipped: a Motion setting (system, reduced, full), high contrast, a colour-blind safe palette for signs, the map and affixes, remappable keys for both runners, and a double-tap heavy blow.

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
- [x] ~~**Item sets**~~ shipped as maker sets under Gear and loot.

### Reach and onboarding
- [x] ~~**First-run tutorial.**~~ Shipped on top of Juno's existing training: the first time anyone starts a run, Juno offers the drills (now thirteen, with parry, jump-slam and break-free drills), and when they finish, one button starts the run that was waiting. Shown once; skipping is one click.
- [x] ~~**Real-device performance reports.**~~ Shipped: Settings › Performance report copies the version, browser, screen and canvas size, quality step, frame rate and game speed.
- [x] ~~**Store listing kit.**~~ Shipped in `docs/store/`: a 22-second trailer, six 1920×1080 shots, an itch.io cover, a social card (now the page's link preview) and page copy, plus fresh install-dialog screenshots, all made by `tools/capture.mjs` from the live game. The brand fonts are now bundled with the game, so it looks right offline too.

### Engineering
- [x] ~~**Check in the test bots.**~~ `tests/` with `npm test`, plus Playwright browser checks.
- [x] ~~**Split the source.**~~ 35 files by system, documented in docs/ARCHITECTURE.md, with a build that also makes a single-file copy.
- [x] ~~**Save export and import.**~~ In Settings → Save backup.
- [x] ~~**Robust PWA.**~~ App-shell service worker with versioned precache, an update-ready bar, install button, shortcuts, maskable icons, screenshots, persistent storage and save validation.
- [x] ~~**GitHub Actions.**~~ `.github/workflows/ci.yml` runs the build check, formatting, `npm test` and the browser tests on every push and pull request.
- [x] ~~**Cloud save.**~~ Shipped without a server: save codes (every save deflated into one line of text) and a sync file the game keeps up to date (File System Access API; put it in a cloud folder), with change stamps so a newer file is offered, never silently loaded.
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
- [x] ~~**Run history.**~~ Shipped in the Codex.
- [x] ~~**Challenge seeds.**~~ Shipped: S3-XXXX and A-XXXX codes, share links.

## Horizon two

The next wave, picked from what playing the shipped systems turned up. Every item still has to work on a phone, in couch co-op and online, and should add a decision rather than a number. **Shipped first:** Crew contracts, the Gauntlet (the roguelite run) and Doors the hack can open.

### The crew
- [x] ~~**Crew contracts.**~~ Shipped: Kestrel (Blade Rush), Pixel (Shutdown) and Moss (Mending) from Kit, in the companion slot. They take a cut of each payday, wait to be revived when they go down, and gain loyalty; at five their special changes. Still to come: a personal side job for each at full loyalty.
- [ ] **Loyalty and betrayal (S).** A hired runner with low loyalty may walk off with a share of the loot if you keep skipping their cut, or sell your position to a hostile crew (a hit squad that arrives knowing where you are).
- [x] ~~**The safehouse grows.**~~ Shipped: a med bay (one free wipe a block), a scanner (hidden doors found on arrival), a bolt-hole (half-price laying low, heat cools twice as fast) and an armory (ammo and a medkit each block). The safehouse already has Ratchet's bench, so the workbench became the bolt-hole; a garage for bike upgrades is still to come.

### Jobs, round two
- [x] ~~**Doors the hack can open.**~~ Shipped: security doors with keypads (a keypad sequence) that open a shortcut past the vent but let the guards see through, and a wall safe (a network trace) with creds and gear.
- [x] ~~**Car chase.**~~ Shipped as Kagemori Pursuit: one open-top car, runner 1 driving and slamming riders, runner 2 shooting from the back seat (a roof gun solo), and pursuit cars ramming from behind.
- [x] ~~**Delivery run.**~~ Shipped as Fragile Cargo: a cargo bar, crashes, wrecks and hits that cost it, pay by the share that arrives, and a mint bonus.
- [ ] **Heist planning (L).** A multi-stage job on a Kagemori tower: pick an entry (drone stealth through the vents, a flight drop on the roof, or a loud front door brawl), and each choice changes the next stage's guards, alarm level and loot. The job modes that exist become the stages.

### The Sprawl
- [x] ~~**Crew turf.**~~ Shipped: clear a block's crews with one warm to you and they take it: their name on the doors, their patrols instead of hostile ones, and a tithe from every block you hold each time you move on, until your standing slips below +10.
- [x] ~~**Graffiti tags.**~~ Shipped: spray your tag on a cleared crew building for street cred over time; the old owners send painters to cover it, and stopping one keeps the tag.
- [x] ~~**Weather that matters.**~~ Shipped: slick wet streets (knocks carry 30% further) and drones shorting out in the rain, gunmen closing in through the fog and quieter Sprawl break-ins in it, and acid rain corroding Street-grade armor.
- [ ] **Living market (S).** Prices drift block to block by supply: a gang war makes guns cost more and armor less, a lockdown doubles medkit prices. Sable's black-market cart reacts the same way.

### Combat and enemies
- [ ] **Status effects on enemies too (S).** Moved here from above: some enemies use shock and fire rounds against you, with counters from armor affixes.
- [x] ~~**Enemy squads with roles.**~~ Shipped as Kagemori fireteams: a spotter who marks you (+25% damage taken), a riot trooper covering the gunner, and a medic who gets one teammate after another back up, once each, unless you hit them first. In the Arcology and black sites.
- [x] ~~**Environmental finishers.**~~ Shipped: burning barrels, drums on the floor and live wired floors finish a thrown foe on the spot and drop their creds early. A car's path is still to come (no traffic outside the driving jobs yet).
- [x] ~~**A rival runner.**~~ Shipped as Vane: three districts and two Sprawl blocks, your archetype's style, a quarter tougher every meeting, and ready for whatever did the most damage last time (remembered in your legend).

### Progression
- [ ] **More legendaries (S each).** Moved here from above: one per new boss and per new hidden feat, so there's always a ??? left in the Codex.
- [ ] **Paragon points past 25 (S).** Every level after 25 gives a small, uncapped choice (2% damage, 2% health, 2% hacking time, or 1% crit), so long-running saves keep a reason to fight.
- [ ] **Cyberware with drawbacks (S).** Rare implants with a real cost: a reflex wire that doubles the parry window but halves mana, an armoured skin that stops dodging. Doc can pull them back out for a price.

### Modes
- [x] ~~**Roguelite run.**~~ Shipped as the Gauntlet: every district in a random order with a random mutator, one life, a perk after each boss, foes scaled by depth, G-XXXX seeds, a gauntlet of the day, a score and two feats.
- [ ] **Boss rush (S).** Every boss back to back, with a perk between each, on a timer. Unlocked by finishing the campaign; best times saved per difficulty.
- [ ] **Photo mode (S).** Promoted from the parking lot: pause, free the camera across the street, hide the HUD, pick a filter (neon, noir, VHS), and save the picture. Uses the downloads path that Save backup uses.

### Online and sharing
- [ ] **Leaderboard snapshots (M).** Moved here from above: an optional, opt-in way to compare daily and weekly scores with friends, for example a share code that encodes your score and seed so others can verify it.
- [ ] **Ghost runs (M).** The daily challenge records your runner's position each step (small, and it doesn't depend on the game replaying exactly the same); share the code and a friend races your ghost, drawn as a translucent runner.
- [ ] **Spectate (M).** A third browser joins an online room as a watcher, drawing the host's snapshots without sending buttons. Needs the host to hold two peer connections.

### Presentation
- [ ] **Pixel VFX pass (M).** A pixel-art effects library (patch-gg/pixelfx is the candidate) for sparks, smoke, explosions and spell impacts, under the existing quality ladder so slow phones keep the cheap versions.
- [ ] **More cosmetics (S).** Moved here from above: visor colors, hair styles and a title under your name.
- [ ] **Achievement-only secrets (S).** Moved here from above: hidden rooms that only appear once you hold a certain legendary, or once you've earned a certain feat.
- [ ] **Localization scaffolding (M).** Moved here from above: move all text into one table so the game can be translated.

### Engineering
- [ ] **Deploy gate (S).** Moved here from above: deploy Pages from a workflow that only runs after CI passes.
- [ ] **ES modules (M).** Moved here from above: move from shared-global classic scripts to `import`/`export`, so each file declares exactly what it uses.
- [ ] **Type checking (S).** Moved here from above: JSDoc types on the core objects (entities, items, saves) checked with `tsc --checkJs`, no TypeScript build needed.
- [ ] **Replay-based bug reports (M).** The performance report gains an opt-in "copy the last 30 seconds": the seed and inputs, so a bug can be replayed on a developer's machine. First step: check where the simulation isn't yet deterministic (unseeded `Math.random` calls) and seed them.

---

## Ideas parking lot
Not planned, but worth keeping (graffiti tags, photo mode and the roguelite run moved up to Horizon two):
- A **vehicle chase** level on a highway, punching off bikers (partly shipped as the driving jobs; the car chase is in Horizon two)
- **Pets:** a cyber-dog that fetches loot
- **A level editor** for custom districts, shared as a URL

Have an idea? Open an issue in this repo.
