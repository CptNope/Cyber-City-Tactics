# Roadmap

Where Chrome & Sorcery has been and where it could go next. Items are grouped by theme and roughly ordered by value within each group. Effort is a rough guess: **S** is an evening, **M** a few sessions, **L** a bigger project.

The guiding rules:
- Stay one HTML file with no build step.
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
- [x] **New gear:** spur knuckles, fire axe, gravity hammer, assault rifle, smartgun, railgun, grenade launcher, warded duster, thermoptic cloak, exo-frame, and six affixes

---

## Next up

### Gear and loot
- [ ] **Black-market rarity (M).** A fourth tier above Prototype, with one hand-made legendary per slot that has a unique effect. Examples:
  - *Ronin's Last Edge:* every 10th hit is a guaranteed crit.
  - *Hammer of the Hollow Saint:* heavy blows send a shockwave.
  - *Voss's Smartlink:* bullets chain like Chain Lightning.
- [ ] **Weapon-specific moves (M).** The heavy blow changes with what you hold:
  - katana: a dash slash
  - whip: pulls an enemy to you
  - hammer: a ground pound
  - knuckles: a three-hit flurry
- [ ] **Gun mods (M).** Slot one mod into a gun: extended mag (+50% ammo per pickup), laser sight (better crit), suppressor (no heat in the Sprawl), underbarrel launcher (one grenade per room).
- [ ] **Item comparison on pickup (S).** A small floating card with ▲▼ arrows when you walk over gear, so you know before you open the bag.
- [ ] **Salvage and crafting (M).** Break unwanted gear into parts at Ratchet's, then spend parts to reroll an affix or upgrade rarity.
- [ ] **Sets (L).** Two- and three-piece bonuses for matching gear, such as Kagemori Security: armored riot vest + smartgun + shock baton.

### Skills and progression
- [ ] **Skill respec (S).** Pay Doc for a neural reset that refunds all skill points.
- [ ] **Active skills (M).** One per tree, mapped to the special button as an alternative to the archetype special:
  - Brawler: *Ground Slam*
  - Gunslinger: *Fan the Hammer*
  - Mage: *Summon Spirit*
  - Decker: *Overload*, which stuns every drone and cop on screen
- [ ] **A fifth tree: Shaman (M).** Spirit allies, totems and curses, for players who want magic without blasting.
- [ ] **Archetype mastery (M).** Each archetype gets a small set of extra tiers past level 15 that change how its special works.
- [ ] **Show skill effects in the HUD (S).** For example, a small Archon counter showing how many casts until the free one.

### The Sprawl
- [ ] **More building types (M):**
  - clinics that trade cyberware
  - nightclubs with dance-floor brawls
  - talisman shops that teach rare spells
  - cop precincts, the hardest "good" target if your cred is high enough
- [ ] **Room variety (M).** Hazard rooms (electrified floors, collapsing ceilings), hostage rooms (free them for cred), and vault rooms with a second, harder hack.
- [ ] **Faction reputation (L).** Separate standing with each gang and with Kagemori. Hitting one crew makes its rivals friendlier, and they'll sell to you or send backup.
- [ ] **Bounties (S).** Juno posts a named target in a random building each block, for a big payout.
- [ ] **Day and night (M).** At night there are fewer cops, more gangs and better loot. In the day, shops are open and break-ins are riskier.
- [ ] **A block map (S).** A full-screen view of the street with every building's type, tier and looted state.
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
- [ ] **New enemies (M):**
  - corp ninjas (go invisible, then strike)
  - hellhounds (fast, in packs)
  - mech walkers (big, weak spot on the back)
  - feral spirits (copy your last spell)
- [ ] **A parry (M).** Tap block just before a hit to stagger the attacker.
- [ ] **Juggles and wall bounces (M).** Enemies knocked into the street's back wall bounce back for follow-ups.
- [ ] **Status effects on enemies too (S).** Some enemies use shock and fire rounds against you, with counters from armor affixes.

### Co-op and online
- [ ] **Team attacks (M).** When both runners hit the same enemy within half a second, they do a combined finisher.
- [ ] **Revive (S).** Hold near a downed partner to bring them back instead of waiting for the next district.
- [ ] **Online co-op (L).** WebRTC peer-to-peer with a share code, keeping the single-file rule by using a tiny public signaling option or manual offer/answer codes.
- [ ] **Daily challenge (S).** Like the weekly one, with a daily seed and a shorter run.

### Presentation
- [ ] **Animated title and menus (S).** Motion on the title card, menu transitions and the skill-tree unlock pulse, all in hand-written CSS and JavaScript (no libraries).
- [ ] **Per-district music variations (M).** A calmer loop between waves and an intense one during them.
- [ ] **Accessibility (M).** A high-contrast mode, a colorblind-safe palette for door signs and affixes, remappable keys, a hold-to-toggle option for the heavy blow, and reduced-motion support everywhere.
- [ ] **Localization scaffolding (M).** Move all text into one table so the game can be translated.

### Engineering
- [ ] **Check in the test bots (S).** Move the headless Node playthroughs and mechanic tests into `tests/`, with one command to run them all.
- [ ] **GitHub Actions (S).** Run the tests and a Playwright screenshot pass on every push, then deploy Pages only when they pass.
- [ ] **Split the source (M).** Keep one shipped HTML file, but write the source as modules and inline them with a tiny build script. That makes the game easier to work on without changing how it's played.
- [ ] **Save export and import (S).** Copy your save as text to move it to another device.
- [ ] **Performance pass (S).** Cache static background layers to an offscreen canvas for low-end phones.

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
