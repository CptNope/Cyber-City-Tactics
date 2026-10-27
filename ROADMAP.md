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
- [x] **Expansion 6:** a parry on the dodge button, gang nightclubs and Lone Star precincts in the Sprawl, and a block map
- [x] **Expansion 5:** hellhound packs, cloaked Kagemori shadows, and salvage and crafting at Ratchet's workbench
- [x] **Expansion 4:** a heavy blow for every melee weapon, four gun mods at Ratchet's bench, the spirit storm event, and a gear comparison card
- [x] **Expansion 3:** Turbo, Fog, Split and Pacifist mutators; acid rain, corp parade and manhunt block events; co-op revive; Doc's neural reset; five new feats; GitHub Actions CI
- [x] **New gear:** spur knuckles, fire axe, gravity hammer, assault rifle, smartgun, railgun, grenade launcher, warded duster, thermoptic cloak, exo-frame, and six affixes

---

## Next up

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
- [ ] **More building types (M):**
  - clinics that trade cyberware
  - talisman shops that teach rare spells
- [ ] **Room variety (M).** Hazard rooms (electrified floors, collapsing ceilings), hostage rooms (free them for cred), and vault rooms with a second, harder hack.
- [ ] **Faction reputation (L).** Separate standing with each gang and with Kagemori. Hitting one crew makes its rivals friendlier, and they'll sell to you or send backup.
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
- [ ] **District 6: the Undercity Market (L).** A ghoul-run bazaar with a vampire boss, its own NPCs and a branching contract.
- [ ] **Choices that matter (M).** At two points in the campaign, pick a side (Juno or Pixel, the Saints or the corps). Your choice changes a district's enemies and the ending.
- [ ] **Cutscenes in the engine (M).** Short scripted moments using the existing figures, with speech bubbles and camera pans.
- [ ] **Endings (S).** A different epilogue depending on street cred, choices and how many bosses you spared.

### Combat and enemies
- [x] ~~**Corp ninjas and hellhounds.**~~ Shipped as Kagemori shadows and hellhound packs.
- [ ] **More new enemies (M):**
  - mech walkers (big, weak spot on the back)
  - feral spirits (copy your last spell)
- [x] ~~**A parry.**~~ Shipped: a perfect dodge staggers the attacker and sets up a guaranteed crit.
- [ ] **Juggles and wall bounces (M).** Enemies knocked into the street's back wall bounce back for follow-ups.
- [ ] **Status effects on enemies too (S).** Some enemies use shock and fire rounds against you, with counters from armor affixes.

### Co-op and online
- [ ] **Team attacks (M).** When both runners hit the same enemy within half a second, they do a combined finisher.
- [x] ~~**Revive.**~~ Shipped: stand by your partner's marker.
- [ ] **Online co-op (L).** WebRTC peer-to-peer with a share code, keeping the single-file rule by using a tiny public signaling option or manual offer/answer codes.
- [x] ~~**Daily challenge.**~~ Shipped, with a set archetype per day and a play streak.
- [ ] **Leaderboard snapshots (M).** An optional, opt-in way to compare daily and weekly scores with friends, for example a share code that encodes your score and seed so others can verify it.

### Presentation
- [ ] **Animated title and menus (S).** Motion on the title card, menu transitions and the skill-tree unlock pulse, all in hand-written CSS and JavaScript (no libraries).
- [ ] **Per-district music variations (M).** A calmer loop between waves and an intense one during them.
- [ ] **Accessibility (M).** A high-contrast mode, a colorblind-safe palette for door signs and affixes, remappable keys, a hold-to-toggle option for the heavy blow, and reduced-motion support everywhere.
- [ ] **Localization scaffolding (M).** Move all text into one table so the game can be translated.

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
- [ ] **Performance pass (S).** Cache static background layers to an offscreen canvas for low-end phones.

### Discovery and replayability
These are the next ways to keep "one more run" alive:
- [x] ~~**Lore that changes the game.**~~ Shipped as the Lantern Vault.
- [ ] **Lantern Vault, part two (L).** A real dragon fight: Ssareth itself, with a flight phase and breath attacks across lanes, unlocked after beating the Avatar on Prime.
- [x] ~~**Rotating Sprawl events.**~~ Shipped: gang war, blackout, lockdown and night market.
- [x] ~~**More block events.**~~ Shipped: acid rain, corp parade and manhunt.
- [x] ~~**Spirit storm.**~~ Shipped.
- [x] ~~**Mutators for the campaign.**~~ Shipped: Glass Cannon, Elite Streets, Bare Knuckles and One Life.
- [x] ~~**More mutators.**~~ Shipped: Turbo, Fog, Split and Pacifist.
- [x] ~~**Shaman and Rigger.**~~ Shipped and unlocked by feats.
- [ ] **Street Doc archetype (M).** Heals with every hit; unlocked by finishing a co-op campaign.
- [ ] **Adept archetype (M).** Magic-fuelled martial artist: no guns, chi-powered combos; unlocked by finishing a district with Bare Knuckles.
- [x] ~~**Cosmetics from feats.**~~ Shipped as eight runner coats.
- [ ] **More cosmetics (S).** Visor colors, hair, a title under your name, and a weapon trail.
- [ ] **Achievement-only secrets (S).** Hidden rooms that only appear once you hold a certain legendary, or once you've earned a certain feat.
- [x] ~~**Run history.**~~ Shipped in the Codex.
- [ ] **Challenge seeds (S).** Type or share a seed to replay the exact same Sprawl block or Arena run as a friend.

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
