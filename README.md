# Cyber City Tactics

**Cyber City Tactics** is a vector-drawn, River City Ransom–style brawler RPG for one or two players. It's set in a cyberpunk sprawl where magic is real: street samurai, combat mages, gunslingers, deckers, shamans and riggers fighting gangs, corps, spirits and ICE.

It is one HTML file with no build step and no dependencies. It runs in any modern browser, installs as a PWA, and plays offline after the first load.

- **Play it:** https://cptnope.github.io/Cyber-City-Tactics/
- **What's next:** see [ROADMAP.md](ROADMAP.md)

---

## Contents
- [Quick start](#quick-start)
- [Game modes](#game-modes)
- [Your runner](#your-runner)
- [Skill trees](#skill-trees)
- [Gear](#gear)
- [Magic, cyberware and companions](#magic-cyberware-and-companions)
- [Combat](#combat)
- [Enemies and bosses](#enemies-and-bosses)
- [The Sprawl in depth](#the-sprawl-in-depth)
- [Your legend: feats, legendaries and the Codex](#your-legend-feats-legendaries-and-the-codex)
- [Controls](#controls)
- [On phones](#on-phones)
- [Saves](#saves)
- [Development](#development)
- [Project layout](#project-layout)

---

## Quick start
1. Open the game and pick **Training** if you're new. It's ten short drills you can't fail.
2. Pick a mode:
   - **Start a run** for the story campaign.
   - **The Sprawl** for the open world.
   - **Arena** for endless waves and high scores.
3. Pick an archetype and a difficulty, solo or co-op, and go.
4. Check the **Codex** on the title screen now and then. It tracks feats, legendaries, enemies and lore across every run, and most of it starts hidden.

To play locally, run `npx serve .` (or `python3 -m http.server`) in the repo and open the URL it prints. Opening `index.html` straight from disk also works, but the offline service worker only installs over http(s).

---

## Game modes

### Campaign
Five districts, each with waves of enemies, a side contract from the fixer, and a boss:

| # | District | Boss |
|---|---|---|
| 1 | Rustline Barrens | The Gutter King |
| 2 | Neon Market | Razor Mei |
| 3 | Undercity Tunnels | The Hollow Saint |
| 4 | Kagemori Arcology | Director Voss |
| 5 | Kagemori Host (inside the Matrix) | Black ICE |

Between districts you walk **the Den**, a street hub where you talk to the locals:

| Who | What they do |
|---|---|
| Juno | Fixer: gives you contracts |
| Sal | Bartender: rumors about the next job |
| Doc Kessler | Street doc: medkits, ammo and cyberware |
| Kit | Rents companions |
| Old Wen | Talismonger: teaches spells |
| Ratchet | Fence: buys and sells gear |
| Pixel | Street kid: what's happening on the block |

What they say changes after each job.

- **Difficulty:** Street, Runner or Prime.
- **New Game+:** after the final boss you can start again with your runners, levels, gear, skills, cyberware and spells. Enemies hit harder, elites are more common and loot is better. You can repeat it as often as you like.
- **Boss rematches:** beaten bosses can come back mid-district, already enraged: Gutter King, chromed; Razor Mei, under contract; and Voss.exe.
- **Mutators:** optional modifiers you switch on before a run. Each one adds 20% karma and counts toward the mutator feats.
  - Glass Cannon: everyone hits 60% harder, you included
  - Elite Streets: every regular enemy is an elite
  - Bare Knuckles: guns are locked, and punches and kicks hit 40% harder
  - One Life: each runner gets one life per district

### The Sprawl (open world)
One long street with a safehouse and fourteen procedurally generated buildings. You hack your way in, fight through randomly built rooms, and loot the cache. Who you rob matters: hit gangs and corps and the street respects you; hit families and small businesses and the cops come for you. See [The Sprawl in depth](#the-sprawl-in-depth).

### Arena
Endless waves on one street, solo or co-op, starting at level 3:
- The street changes every five waves, and a boss arrives every fifth wave.
- Every third wave you choose one of three perks: Street smarts, Patch up, Supply crate, Ammo drop, Second wind, Hired help or Back-alley chrome.
- Scores, waves and best combos are saved to a high-score table on the device.

**Daily challenge:** a new seeded Arena run every day, with a set archetype and modifier, so everyone plays the same day. Your best score for the day and your play streak are kept.

**Weekly challenge:** a seeded Arena run that gives everyone the same waves and perk offers for the ISO week. You play on Runner with one modifier: Glass Cannon, Powder Keg, Elite Week, Spirit Tide or Bare Knuckles. Your weekly best is kept, and the end screen has a Copy / Share button with a brag line and the game's link.

### Training
Ten drills in Juno's back alley with harmless sparring partners:
1. Moving
2. Combos
3. Guard breaks
4. Air attacks
5. Dodging
6. Grabs
7. Throwing a drum
8. Heavy blows
9. Guns and spells
10. Your special

Any step can be skipped from the pause menu.

### Co-op
A second runner joins with their own archetype, level, stats, skills and gear. Creds, medkits, icebreakers and the bag are shared. To play co-op:
- start a co-op run from any mode's start screen,
- add Runner 2 from the pause menu, or
- press Start on a second gamepad.

---

## Your runner

### Archetypes
| Archetype | Start | Special (fills as you deal and take damage) | Free skill |
|---|---|---|---|
| Street Runner | Balanced stats | **Adrenaline:** heal 30%, then hit harder and move faster for 5 s | An extra skill point instead |
| Street Samurai | Katana and a cyberarm | **Blade Dance:** dash through everything in front of you | Iron Fists |
| Combat Mage | Fireball and Manabolt | **Mana Storm:** lightning strikes up to six enemies | Focus |
| Gunslinger | Heavy pistol, double ammo | **Bullet Time:** enemies slow to half speed, shots are free | Steady Hands |
| Decker 🔒 | Smartgun, Hacking 5 | **Overload:** fries every machine, ICE and armored trooper on screen and stuns everyone for 4 s | Port Scanner |
| Shaman 🔒 | Fireball and Heal | **Spirit Call:** two bound fire spirits fight beside you for 15 s | Focus |
| Rigger 🔒 | Machine pistol, Hacking 3 | **Drone Swarm:** three combat drones join the fight for 12 s | Steady Hands |

Three archetypes are locked at first. Each is unlocked for every mode by a feat:
- **Decker:** crack 10 locks in the Sprawl.
- **Shaman:** find 10 lore shards.
- **Rigger:** down 3 Kagemori couriers.

Summoned spirits and drones don't replace a companion you've hired from Kit; they fight alongside it.

**Coats.** Pick a coat for each runner on the start screen. You start with your signature colors, and feats unlock seven more: Chrome, Neon Fang, Ember, Black ICE, Most Wanted, Prime Gold and Lantern-bearer.

### Attributes
Each level gives **2 attribute points** and **1 skill point**.

| Attribute | Effect |
|---|---|
| Body | Max HP and armor |
| Strength | Punch, kick, grab and throw damage |
| Agility | Speed, gun damage, crits |
| Magic | Mana, spell power, mana regen |
| Hacking | Wider windows when cracking locks in the Sprawl |

---

## Skill trees
Open the character sheet (**C**, or **CHAR** on a phone) and choose the **Skills** tab. There are four trees of six skills each, and you can mix trees freely:
- Rows unlock as you spend points in that tree: 0, 1, 2, then 4 points.
- The third row needs level 4, and the capstone needs level 8.
- Decker skills help the whole team.

| Row | Brawler | Gunslinger | Mage | Decker |
|---|---|---|---|---|
| 1 | **Iron Fists:** +20% melee damage | **Steady Hands:** +20% gun damage | **Focus:** +20% spell damage, healing and barriers | **Port Scanner:** hacking windows 25% wider |
| 2 | **Guard Breaker:** punches break riot shields | **Scavenger:** kills can drop 4 rounds into your gun | **Mana Flow:** mana regenerates 40% faster | **Spare Cycles:** one extra miss on every hack |
| 2 | **Brute:** knees and throws +50% | **Quickdraw:** guns fire 30% faster | **Thrift:** spells cost 25% less | **Icecraft:** icebreakers sometimes aren't used up; more drop |
| 3 | **Bloodlust:** melee hits heal you | **Armor Piercing:** bullets pass through and ignore armored elites | **Overcharge:** Fireball blasts 60% wider | **Jammer:** double damage to drones and ICE; fewer cops |
| 3 | **Whirlwind:** heavy blows hit behind you too | **Ricochet:** critical bullets bounce to a second enemy | **Siphon:** every kill restores 4 mana | **Fence Contacts:** sell for 15% more, buy for 10% less |
| Capstone | **Berserker:** below 40% HP, +40% damage and −20% damage taken | **Deadeye:** +15% gun crit, gun crits deal 2.5× | **Archon:** every 4th spell is free and hits twice as hard | **Ghost Protocol:** failed hacks never trip alarms; break-ins add one less heat star |

Old saves pick up skill points for the levels they already earned.

---

## Gear
Your runner has three slots: melee weapon, gun and armor.

Rarity sets the stat multiplier and the number of bonus attributes:

| Rarity | Multiplier | Bonus attributes |
|---|---|---|
| Street | ×1.0 | none |
| Tuned | ×1.25 | one |
| Prototype | ×1.55 | two |
| Black-market (legendary) | ×1.9 | three, plus a unique effect |

Better gear shows up as you go deeper into the campaign, the Arena or the Sprawl.

### Melee weapons
| Weapon | Notes |
|---|---|
| Lead pipe | Starter |
| Spur knuckles | +8% crit, no reach |
| Shock baton | |
| Katana | Long reach |
| Fire axe | Every hit breaks guards |
| Monowhip | Longest reach |
| Gravity hammer | Breaks guards; heavy blows knock down everything in front of you |

### Guns
| Gun | Fire mode |
|---|---|
| Streetline pistol | Single shot |
| Heavy pistol | Single shot, hits hard |
| Machine pistol | 3-round burst |
| Sawed-off shotgun | Close-range spread |
| Assault rifle | 4-round auto |
| Smartgun | Smart rounds that track targets across lanes |
| Railgun | A slug that pierces every target in the lane |
| Grenade launcher | An arcing grenade that explodes on impact |

### Armor
| Armor | Notes |
|---|---|
| Lined coat | Starter |
| Warded duster | Light; +2 Magic |
| Armor jacket | |
| Form-fit weave | +1 Agility |
| Thermoptic cloak | +2 Agility, +1 Hacking |
| Riot vest | Heavy |
| Exo-frame | Heaviest; +2 Strength, −1 Agility |

### Affixes
Tuned and Prototype items can roll an affix, which shows in the item's name (for example, *Tuned Incendiary Railgun*).

| Affix | Slots | Effect |
|---|---|---|
| Shock | Weapon, gun | 25% chance to stun, delaying the target's next attack |
| Incendiary | Weapon, gun | Sets targets on fire for 2 s |
| Leeching | Weapon, gun | Heals you for 15% of damage dealt |
| Keen | Weapon, gun | +8% crit |
| Spiked | Armor | Melee attackers take 6 damage |
| Padded | Armor | +25 max HP |

---

## Magic, cyberware and companions

**Spells** (Old Wen teaches them; Magic requirements apply):

| Spell | Effect |
|---|---|
| Fireball | Explodes and knocks down everything nearby |
| Manabolt | Cheap, fast, one target |
| Heal | Heals you and anyone close |
| Barrier | A mana shield for 6 s |
| Chain Lightning | Arcs through up to three enemies |

**Cyberware** (from Doc, up to three levels each, and each piece lowers max mana):
- Cyberarm tune-up: +melee
- Wired reflexes: speed and crit
- Dermal plating: armor

**Companions** (rented from Kit, one at a time):
- **Rigger drone:** snipes enemies in its lane.
- **Brick, troll merc:** brawls and pulls aggro.
- **Bound fire spirit:** burns what it touches and ignores bullets.

Companions carry between districts and get patched up in the Den, but if one falls on a job it's gone.

---

## Combat
- **Strikes:** punch combos end in an uppercut. You also have kicks and flying kicks.
- **Heavy blows:** hold punch to charge, then release for a guard-breaking knockdown.
- **Dodge roll:** has invincibility frames.
- **Grabs:** walk into a staggered enemy. Punch to knee them, or kick to throw them into others.
- **Throwables:** trash cans, crates and explosive drums.
- **Breakables:** vending machines spill medkits, ammo and mana.
- **Combo meter:** long combos boost karma and creds.
- **Hit-stop, screen shake and slow-mo on big hits.** You can turn shake and vibration off in Settings.

## Enemies and bosses
- **Rank and file:** gangers, orcs, corp security, riot troopers (shields block punches; kick them), drones, street shamans, ghouls (they lunge), fire spirits (bullets pass through), Glitches (split when they die), ICE sentries (teleport and fire laser spreads), and cops in the Sprawl.
- **Elites:** each has a colored aura and a name tag, and drops better gear.
  - Armored: halves bullet damage
  - Berserk: faster and hits harder
  - Warded: can't be knocked down, resists magic
  - Vampiric: heals when it hits you
- **Boss rage phases:** at half health each boss enrages.
  - The Gutter King and the Hollow Saint slam shockwaves you have to jump.
  - Razor Mei chains dashes.
  - The Hollow Saint also summons spirits.
  - Voss fires five-way hexes.
  - Black ICE fires lane-wide beams. Dodge them by changing lanes or with a well-timed roll; after each beam its core vents and takes extra damage.

---

## The Sprawl in depth

**Buildings.** Each block has a safehouse and fourteen buildings, randomly generated from a seed. A building's sign tells you whether it's fair game (green) or not (red), and small bars show its tier (1–3). Walk to a door and press **J** (or tap **ENTER**) to see who's inside, what the loot looks like, and what breaking in will cost you.

| Building | Moral | Inside |
|---|---|---|
| Gang hideout | Good: +cred, bonus karma | Gangers, orcs, shamans; a crew lieutenant or boss |
| Corp black site | Good | Security, riot troopers, drones, ICE; a site chief or vault ICE |
| Crooked exec's or gang boss's home | Good | Bodyguards |
| Business | Bad: −cred, +heat | Security and a head of security; more creds |
| Family home | Bad: −cred, +heat | Nobody to fight, and almost nothing worth taking |

**Hacking.** To get in, you play a timing minigame: press **Space/J** (or tap **HACK**) while the cursor is inside the green window.
- Higher tiers need more clean hits, and the cursor speeds up after each one.
- The Hacking attribute and Port Scanner widen the window.
- Icebreakers crack a node instantly.
- Run out of misses and the door locks for 12 s. On a bad building, that also trips the alarm.

**Dungeons.** A building has one to four single-screen rooms that match the place: graffiti and orange light in hideouts, server racks in black sites, shelves in shops. Clear a room and the exit on the right turns green. The last room has the lieutenant or boss and the **loot cache**. Its tier sets the item count, rarity and affix chance, and it can also drop icebreakers and medkits. If cops are hunting you, they can follow you inside.

**Heat (0–5 stars).** Bad break-ins and killing cops raise heat. Cops patrol the street more often the hotter you are; drones join at 3 stars and riot cops at 4. Heat drops a star after 25 seconds with no cops around, or you can pay to lay low at the safehouse.

**Street cred.** Good targets and street gangs raise it; bad targets and cop kills lower it.
- At **+30**, Doc and Kit give 15% off.
- At **−30**, Ratchet pays 60% for stolen goods, because nobody else will deal with you.

**Safehouse.** Doc, Kit, Old Wen and Ratchet (who also sells icebreakers), plus:
- **Lay low:** pay to clear heat.
- **Move to a new block:** a fresh street with tougher locks and better loot.

**Getting flatlined** in the Sprawl costs 30% of your creds and clears your heat. You wake at the safehouse.

**Things to find on every block:**
- **Juno's bounty.** One tougher building on each block holds a named target, marked ☠ BOUNTY on its sign and in gold on the minimap. Take them down for a big cred payout, karma and a shot at a legendary.
- **Hidden doors.** Some blocks have an unmarked door wedged between two buildings, and deeper blocks have more of them. It only shows up when you walk close. Behind it is a shrine, or on block 3 and beyond sometimes a wyrm-cult vault, with spirits, a lantern keeper or wyrm priest, a guaranteed lore shard and a good chance at a legendary. Hidden doors are always fair game: no heat.
- **Kagemori couriers.** Once a block, an armored courier drone crosses the street with cargo. Shoot it down before it escapes for rare gear, an icebreaker and creds.

**Block events.** From block 2 on, about half of all blocks have an event. A banner announces it, and it shows in the HUD and at the safehouse:

| Event | What changes |
|---|---|
| Gang war | Gang patrols come twice as often, and hideouts pay double street cred |
| Blackout | No cops can find you, locks are 30% easier to crack, and the street goes dark except around you |
| Kagemori lockdown | Every black site is tier 3 with better legendary odds, and heat cools half as fast |
| Night market | Lantern strings over the street, four extra vending machines, and shops 20% cheaper |

**The Lantern Vault.** Find all 24 lore shards and Juno tells you the rest. From then on, every block has a lantern-lit door: the Lantern Vault. It's four rooms deep, and at the bottom waits the Avatar of Ssareth, the hardest fight in the game. Beating it earns the *Lights Out* feat and a unique legendary, The Lantern.

---

## Your legend: feats, legendaries and the Codex
Your legend is saved separately from any one run. It carries across the campaign, the Sprawl, the Arena, solo and co-op, and survives New Game+ and starting over. Open it from **Codex** on the title screen.

**Feats.** 50 goals across every mode, for example:
- *Chain Reaction:* a 25-hit combo
- *Bounty Hunter:* collect one of Juno's bounties
- *Zero-Day:* crack a tier-3 lock without a miss
- *Habit Forming:* play the daily challenge three days running

Some feats are hidden and show as **???** until you earn them. Counting feats show your progress. Earning one pops a banner in play.

**Legend rank.** Every feat is worth legend points. They raise your rank from *Nobody* through *Street rat*, *Known face*, *Runner*, *Pro* and *Prime runner* to *Legend*. Each rank adds ¥15 to the creds you start a campaign or the Sprawl with.

**Legendaries.** Nine Black-market items. Eight are unlocked as possible drops by feats, and the ninth comes from the Lantern Vault. Once unlocked, they can drop from bosses, bounties, tier-3 caches and hidden doors, and ones you haven't found yet come up first.

| Legendary | Slot | Effect | Unlocked by |
|---|---|---|---|
| King's Boomstick | Gun | Five knockdown pellets | Beat the Gutter King |
| Mei's Silk | Weapon | Hits can lash a second enemy | Beat Razor Mei |
| Saint's Cinder Maul | Weapon | Heavy blows erupt in a fire blast | Beat the Hollow Saint |
| Voss's Smartlink | Gun | Hits arc lightning to another enemy | Beat Director Voss |
| Black ICE Shard | Armor | Deflects one hit every 8 s | Delete Black ICE |
| Ronin's Last Edge | Weapon | Every 6th melee hit crits | Reach +60 street cred |
| Wyrmfang | Gun | Rail slugs burn, and half your shots are free | A hidden feat |
| Dragonscale Duster | Armor | Damage you take restores mana | A hidden feat |
| The Lantern | Gun | Every takedown heals the team 5% HP and restores 5 mana | Defeat the Avatar of Ssareth |

**Bestiary.** Every kind of enemy starts as ??? and fills in with a field note and a running kill count once you take one down.

**Lore.** 24 data shards drop from vending machines, crates, bosses and Sprawl caches, and every hidden door holds one. Each shard tells a piece of the world. Collect them in any order and a story comes together about who is really behind Kagemori and what Project LANTERN is.

**Runs.** The Codex keeps your last 20 finished runs: mode, archetype, level, takedowns, best combo and how it ended.

---

## Controls
| Action | Runner 1 | Runner 2 | Gamepad |
|---|---|---|---|
| Move | WASD (and arrows when solo) | Arrows | D-pad / left stick |
| Punch, grab, talk, enter | J | , or Numpad 1 | X |
| Kick | K | . or Numpad 2 | B |
| Jump | Space | / or Numpad 3 | A |
| Dodge | O or Left Shift | Right Shift | LB |
| Special | F, or punch + kick | \\ or Numpad 8 | Stick click |
| Heavy blow | Hold J | Hold , | Hold X |
| Gun | U | ; | RB |
| Spell | I | ' | Y |
| Swap spell | Q | ] | RT |
| Medkit | H | [ | LT |
| Character sheet and skills | C or Tab | | Select |
| Pause | P or Esc | | Start |
| Hack (in the minigame) | Space or J | , | X or A |

## On phones
- **Sideways:** the stick sits to the left of the screen and the buttons to the right, so your thumbs never cover the fight.
- **Upright:** the view grows taller, the HUD moves into the sky at the top, and the controls sit under the screen.
- The stick appears wherever your thumb lands on the left side.
- The big buttons change their label to say what they'll do: LIFT, THROW, KNEE, TALK, ENTER. GUN shows ammo, SPELL shows mana cost, and both dim when you can't use them. CHAR shows how many points you have to spend.
- **Settings:** control size (S/M/L), left-handed layout, screen shake, vibration, tips, sound, music and full screen.
- First-time tips explain each mechanic when you first meet it, worded for touch or keyboard.

## Saves
Everything is stored in the browser's `localStorage` on the device. Nothing is sent anywhere.

| Key | What |
|---|---|
| `cs_save3` | Campaign (saved at briefings, district starts and Den visits) |
| `cs_world` | The Sprawl (saved on every street visit and shop action) |
| `cs_arena` | Arena high scores |
| `cs_week` | Weekly challenge bests |
| `cs_day` | Daily challenge best and play streak |
| `cs_legend` | Your legend: feats, stats, legendaries found, bestiary and lore |
| `cs_prefs` | Settings and which tips you've seen |

Older saves are migrated when they load. For example, saves from before skill trees get the points for the levels they already earned.

---

## Development

### How it's built
- **One file.** The whole game (HTML, CSS and JavaScript) lives in `index.html`. Drawing is Canvas 2D with vector shapes; there are no image assets for the game itself.
- **Fixed 60 fps simulation.** Hit-stop and slow-mo skip update frames without dropping inputs.
- **Audio.** Sound effects and a small chiptune sequencer are built with the Web Audio API.
- **PWA.** `manifest.webmanifest` and `sw.js` handle install and offline play. The service worker fetches the game page network-first, so updates show up on the next load, and caches icons and fonts.

### Shipping a change
1. Edit the game source, which is written as a page body fragment. `tools/wrap_for_pages.py` wraps it into the full document (doctype, viewport, reset) that GitHub Pages serves:
   ```sh
   python3 tools/wrap_for_pages.py path/to/source.html index.html
   ```
   If you edit `index.html` directly, skip this step.
2. Bump `VERSION` in `sw.js` (for example `cs-v17` → `cs-v18`), so installed copies drop their old cache.
3. Commit and push to `main`. GitHub Pages deploys from the branch.

### Testing
Changes are checked with headless Node scripts that stub the DOM and canvas, load the game script, and drive it with real key events and overlay clicks:
- full bot playthroughs of the campaign (solo and co-op), the Arena and the weekly challenge
- targeted mechanic tests (riot shields, rolls, elites, specials, companions, training, the Sprawl, skills and gear)

Layout is checked with Playwright screenshots at phone and desktop sizes. These scripts aren't in the repo yet; adding them is on the roadmap.

### Code map (inside `index.html`)
| Area | Look for |
|---|---|
| Input (keys, touch, gamepads) | `KA`, `KB`, `pollPads`, `INP` |
| Runner stats | `ATTRS`, `ARCH`, `refresh`, `eff` |
| Skill trees | `TREES`, `SKILLS`, `canLearn`, `skillsHtml` |
| Gear | `BASES`, `RAR`, `AFFIX`, `mkItem`, `randItem` |
| Combat | `strike`, `hurt`, `kill`, `fireBullet`, `castSpell`, `explode` |
| Enemies | `DEF`, `ELITES`, `spawnEnemy`, `upEnemy` |
| Campaign | `STAGES`, `CONTRACTS`, `NPCS`, `startStage`, `enterDen` |
| Arena | `startArena`, `PERKS`, `MODS`, `thisWeek`, `thisDay` |
| Legend and Codex | `FEATS`, `LEGS`, `LORE`, `BEST`, `feat`, `bump`, `legendDrop`, `codexHtml` |
| The Sprawl | `genStreet`, `worldTick`, `enterBuilding`, `enterRoom`, `lootChest`, `startHack`, `payBounty` |
| Rendering | `render`, `drawBg`, `drawFig`, `drawHud` |
| Menus | `renderOv` and the `ov` click handler |

## Project layout
```
index.html              the whole game
manifest.webmanifest    PWA manifest
sw.js                   offline cache (bump VERSION on each ship)
icon-192.png, icon-512.png
tools/wrap_for_pages.py wraps the game fragment into a full page for Pages
README.md               this file
ROADMAP.md              what's done and what's next
```
