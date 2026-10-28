# Cyber City Tactics

**Cyber City Tactics** is a vector-drawn, River City Ransom–style brawler RPG for one or two players. It's set in a cyberpunk sprawl where magic is real: street samurai, combat mages, gunslingers, deckers, shamans and riggers fighting gangs, corps, spirits and ICE.

It's plain JavaScript with no framework and no runtime dependencies, split into small files by system. It runs in any modern browser and installs as an app (PWA) that plays fully offline.

- **Play it:** https://cptnope.github.io/Cyber-City-Tactics/
- **What's next:** see [ROADMAP.md](ROADMAP.md)
- **Brand and design:** the [Brand Book](https://claude.ai/artifact/SJeAWr27Fua7MpdYEhZqS7) (story, voice, logo, color, type) and the [Design System](https://claude.ai/artifact/7MgLArML6pr2ZNGthKNg7Q) (tokens, components, icons), plus the [Design Panels](https://claude.ai/artifact/QRGJ2rzUJLrJbqcxjpcKoc) (key art, store and social art, annotated screens). Copies of all three live in [`docs/design/`](docs/design/); the live values are in `src/css/game.css`.

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
- [Controllers](#controllers)
- [Install it as an app](#install-it-as-an-app)
- [Saves](#saves)
- [Development](#development)

---

## Quick start
1. Open the game and pick **Training** if you're new. It's ten short drills you can't fail.
2. Pick a mode:
   - **Start a run** for the story campaign.
   - **The Sprawl** for the open world.
   - **Arena** for endless waves and high scores.
3. Pick an archetype and a difficulty, solo or co-op, and go.
4. Check the **Codex** on the title screen now and then. It tracks feats, legendaries, enemies and lore across every run, and most of it starts hidden.

To play locally, run `npm start` (no install needed) and open the URL it prints. There's also a single-file copy of the whole game at `dist/cyber-city-tactics.html` that you can open straight from disk or send to someone.

---

## Game modes

### Campaign
Six districts, each with waves of enemies, a side contract from the fixer, and a boss:

| # | District | Boss |
|---|---|---|
| 1 | Rustline Barrens | The Gutter King |
| 2 | Neon Market | Razor Mei |
| 3 | Undercity Tunnels | The Hollow Saint |
| 4 | Undercity Market | Mother Vesper |
| 5 | Kagemori Arcology | Director Voss |
| 6 | Kagemori Host (inside the Matrix) | Black ICE |

Between districts you walk **the Den**, a street hub where you talk to the locals:

| Who | What they do |
|---|---|
| Juno | Fixer: gives you contracts |
| Sal | Bartender: rumors about the next job |
| Doc Kessler | Street doc: medkits, ammo and cyberware |
| Kit | Rents companions |
| Old Wen | Talismonger: teaches spells |
| Ratchet | Fence: buys and sells gear, fits gun mods, scraps gear for parts and reworks it |
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
  - Turbo: everything runs 25% faster, you included
  - Fog: enemies stay hidden until they're close (bosses always show)
  - Split: regular enemies split into two half-strength minis when they go down
  - Pacifist: finish a district's contract without firing a gun for double contract karma

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

**Team attacks.** When both runners land a hit on the same enemy within half a second, it triggers a combined finisher: a big knockdown hit with a moment of slow motion. Each enemy can take one every two seconds.

**Revive.** When a runner loses their last life, they leave a green marker where they fell. Their partner stands next to it for about two and a half seconds, without getting knocked around, to bring them back with 40% health and no spare lives. The marker goes away when you leave the scene, and then they're back next district as before.

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
| Street Doc 🔒 | Heal and Fireball; every melee hit heals you 2 HP and a close partner 1 HP | **Triage:** heals the whole team by half, two seconds of invulnerability, and a downed partner gets straight back up | An extra skill point |
| Physical Adept 🔒 | No guns, ever; fists hit 30% harder and every uppercut throws a chi blast | **Killing Hands:** for six seconds every melee hit crits and knocks down | Guard Breaker |

Five archetypes are locked at first. Each is unlocked for every mode by a feat:
- **Street Doc:** finish the campaign in co-op.
- **Physical Adept:** clear a district with the Bare Knuckles mutator on.
- **Decker:** crack 10 locks in the Sprawl.
- **Shaman:** find 10 lore shards.
- **Rigger:** down 3 Kagemori couriers.

Summoned spirits and drones don't replace a companion you've hired from Kit; they fight alongside it.

**Weapon trails.** Next to the coats, pick a trail: a streak of light behind every punch, kick and swing. *Spark* (your first parry), *Neon* (a 25-hit combo), *Ember* (beat the Hollow Saint), *Black ICE* (beat Black ICE), *Lantern* (find every lore shard) and *Wyrmfire* (slay Ssareth). Trails switch off in the light graphics mode.

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

**Neural reset.** Changed your mind? Doc Kessler sells a reset that refunds every skill point except your archetype's starting skill, for ¥60 per level.

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
Every weapon has its own heavy blow (hold punch, then release).

| Weapon | Notes | Heavy blow |
|---|---|---|
| Lead pipe | Starter | A guard-breaking knockdown swing |
| Spur knuckles | +8% crit, no reach | **Flurry:** three fast hits, the last one knocks down |
| Shock baton | | **Shock stun:** knockdown swing that also stuns everything in front of you for 2.5 s |
| Katana | Long reach | **Dash slash:** dash about 55 px through the crowd, cutting twice |
| Fire axe | Every hit breaks guards | **Cleave:** the swing also hits anyone behind you |
| Monowhip | Longest reach | **Yank:** pulls the nearest enemy in your lane (up to 130 px, not bosses or flyers) to you, then hits it |
| Gravity hammer | Breaks guards | **Ground pound:** knocks down everything in front of you |

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

**Gun mods.** Ratchet's gun bench (in the Den and at Sprawl safehouses) fits one mod to the current runner's gun. The mod stays with that gun; fitting another replaces it.

| Mod | Price | Effect |
|---|---|---|
| Extended mag | ¥150 | Ammo pickups give 12 rounds instead of 8 |
| Laser sight | ¥200 | +10% crit chance with this gun |
| Suppressor | ¥180 | Cops you shoot down in the Sprawl add no heat |
| Underbarrel launcher | ¥300 | Every 20 seconds, a shot also lobs a free grenade |

**Salvage and crafting.** At Ratchet's (the Den and Sprawl safehouses), scrap gear from the bag for parts: 1 part, plus 2 per rarity tier, plus 1 for an affix. Legendaries can't be scrapped. Then spend parts at the workbench on what the current runner has equipped:

| Job | Cost | Result |
|---|---|---|
| Reroll affix | 3 parts + ¥40 | A new random affix (or a first one if it had none) |
| Upgrade rarity | 4 parts + ¥80 per tier | Street → Tuned → Prototype: more damage or armor, plus one attribute point |

**Comparing gear.** Walk near gear on the floor and a small card shows its name and how its damage or armor compares to what you're wearing (▲ better, ▼ worse).

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
- **Parry:** dodge in the last moment before a melee hit lands (within about 0.13 s of it) and you take nothing. The attacker staggers, and your next hit within 1.5 seconds is a guaranteed crit. Bosses don't stagger, but their next attack is delayed. Bullets and spells can't be parried, only dodged.
- **Dodge roll:** has invincibility frames.
- **Grabs:** walk into a staggered enemy. Punch to knee them, or kick to throw them into others.
- **Throwables:** trash cans, crates and explosive drums.
- **Breakables:** vending machines spill medkits, ammo and mana.
- **Combo meter:** long combos boost karma and creds.
- **Hit-stop, screen shake and slow-mo on big hits.** You can turn shake and vibration off in Settings.

## Enemies and bosses
- **Rank and file:** gangers, orcs, corp security, riot troopers (shields block punches; kick them), drones, street shamans, ghouls (they lunge), fire spirits (bullets pass through), Glitches (split when they die), ICE sentries (teleport and fire laser spreads), and cops in the Sprawl.
- **Hellhounds** hunt in packs from the Undercity Tunnels on. Each hound still standing makes the rest 12% faster, so thin the pack early.
- **Mech walkers** patrol the Arcology and tough black sites. The front plates cut damage by 60%, and they never flinch, fall or get grabbed. They take about a second to turn around, though, and the glowing vent on the back takes 50% extra. Up close they stomp out shockwaves; at range they fire three-round bursts.
- **Feral spirits** drift through the Undercity and hidden shrines. They copy the last spell any runner cast: fireballs and bolts come back at you, an echoed heal patches up nearby enemies, and an echoed barrier shields the spirit. Bullets pass through them.
- **Kagemori shadows** guard the Arcology. They're nearly invisible until they strike, with a fast, hard hit. Land any hit and the cloak drops for a few seconds.
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
| Gang nightclub | Good | Twice the crowd: gangers and orcs, a head bouncer or the club owner. A pulsing dance floor; combos last twice as long and takedowns pay 50% more creds |
| Back-alley clinic (from block 2) | Shop, never robbed | Rare cyberware: *Thermographic eyes* (+8% crit, and cloaked shadows show up clearly) ¥600; *Reflex booster* (a much wider parry window) ¥750. One of each per runner, 6 max mana each |
| Talisman shop (from block 2) | Shop, never robbed | Rare spells: *Frost Nova* (damages everything close and slows every enemy for 3 s; Magic 5, ¥380) and *Soul Drain* (a bolt that heals you for half its damage; Magic 4, ¥320) |
| Lone Star precinct (always tier 3, at most one per block, never on block 1) | Good only at street cred +30 or more; before that, bad: −20 cred, +4 heat | Cops, drones, riot troopers and a watch commander. Clearing it shreds your file: heat drops to zero, plus a big creds payout and an icebreaker |
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
- **Hazard rooms.** About three in ten rooms without a hostage come with a hazard, and it hurts everyone on the floor, enemies included:
  - *Live wiring:* one lane of the floor flickers as a warning for a second, then carries current for a second and a half. Change lanes or jump.
  - *Unstable ceiling:* a shadow grows under falling debris near a runner, then the chunk lands with a knockdown.
- **Vaults.** In tier-3 fair-game buildings the final cache is a vault. Clear the room, then hit it to start a lock-4 hack (five clean hits, a faster cursor). Crack it for double creds, an extra Prototype item and a 35% shot at a legendary. Fail and the vault seals, leaving only the ordinary cache.
- **Hostages.** About a third of the non-final rooms in fair-game buildings hold a zip-tied civilian. Clear the room and they go free: karma, +5 street cred and a medkit. But anyone's stray hit can land on them, yours included, along with gang bullets and explosions. Lose one and it costs 8 cred.
- **Street politics.** Every gang hideout and nightclub belongs to one of four crews (Rustline Crew, Neon Fangs, Red Hex, Iron Saints), and black sites belong to Kagemori. The building card says who owns it. Cleaning one out costs you 25 standing with its owner and earns 15 with its rival (Rustline and the Neon Fangs hate each other, as do Red Hex and the Iron Saints); hitting Kagemori earns 5 with every crew. Standing carries from block to block, and the block map shows where you stand.
  - *Hostile (−40 or worse):* the faction sends a hit squad after you on the street every 40 to 55 seconds. Kagemori sends cleaners: a shadow and two security guards.
  - *Friendly (+40 or better):* when a patrol or a hit squad shows up, one of the crew's members arrives to fight beside you for 30 seconds (at most once a minute).
- **Challenge seeds.** Every Sprawl block and every Arena run has a seed code: *S3-K2F9QX* is block 3 of one particular street, *A-9XK2* one particular Arena run. The block map shows the current block's code with a share line and link, and Arena results include the run's code. Type a code into the *Challenge seed* box on the Sprawl or Arena start screen, or open a shared link (`?seed=S3-K2F9QX`), and you get the same street (buildings, owners, event, bounty and hidden doors) or the same waves and perk offers. Starting past block 1 brings your runners up to the level they'd have reached.
- **Block map.** Press **M** in the Sprawl, or pick *Block map* from the pause menu, for a list of every building on the street in order: its type, tier, whether it's fair game or already cleaned out, any bounty, and how far away it is.
- **Kagemori couriers.** Once a block, an armored courier drone crosses the street with cargo. Shoot it down before it escapes for rare gear, an icebreaker and creds.

**Block events.** From block 2 on, about seven blocks in ten have an event. A banner announces it, and it shows in the HUD and at the safehouse:

| Event | What changes |
|---|---|
| Gang war | Gang patrols come twice as often, and hideouts pay double street cred |
| Blackout | No cops can find you, locks are 30% easier to crack, and the street goes dark except around you |
| Kagemori lockdown | Every black site is tier 3 with better legendary odds, and heat cools half as fast |
| Night market | Lantern strings over the street, four extra vending machines, and shops 20% cheaper |
| Acid rain | Green rain eats at everyone outside, gangers included: 1 HP every two seconds, never below 1. Indoors is dry |
| Corp parade | Patrol cops walk the block even with no heat, and every takedown pays 50% more creds |
| Manhunt | Bounty hunters come for you now and then: tough berserk elites that each drop ¥80 plus ¥40 per block |
| Spirit storm | Wild spirits drift down the block (bullets go straight through them), and every spell costs half the mana |

**The Lantern Vault.** Find all 24 lore shards and Juno tells you the rest. From then on, every block has a lantern-lit door: the Lantern Vault. It's four rooms deep, and at the bottom waits the Avatar of Ssareth, the hardest fight in the game. Beating it earns the *Lights Out* feat and a unique legendary, The Lantern.

**The Wyrm's Roost.** Once the Avatar falls, a last door appears on every block: the Wyrm's Roost, three rooms deep, with Ssareth itself at the bottom. It's a one-on-one fight in phases:
- *On the ground* it stalks you, claws everything in front of it, and sweeps its tail into shockwaves you have to jump.
- *Every 12 seconds, and as it drops below 70% and 40% health,* it takes off. In the air, ground punches can't reach it; bullets, spells and jump-kicks can. It breathes fire down two of the three lanes: the lanes flicker orange for a second first, so move to the one it leaves dark (a well-timed roll also gets you through).
- *After three breaths* (four when enraged) it dives at a runner and lands with a shockwave, then the cycle starts again.
- *Enraged,* below half health, it breathes faster and brings two fire spirits with it each time it takes off.

Slaying Ssareth earns *Who Lights the Way*, the Wyrmslayer coat and the Wyrmheart legendary (exo-frame armor: +40 max HP, fire hurts half as much, and the special meter fills 25% faster). Then the Roost closes for good.

---

## Your legend: feats, legendaries and the Codex
Your legend is saved separately from any one run. It carries across the campaign, the Sprawl, the Arena, solo and co-op, and survives New Game+ and starting over. Open it from **Codex** on the title screen.

**Feats.** 74 goals across every mode, for example:
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
| Dodge (and parry) | O or Left Shift | Right Shift | LB |
| Block map (Sprawl) | M | | Pause menu |
| Special | F, or punch + kick | \\ or Numpad 8 | Stick click |
| Heavy blow | Hold J | Hold , | Hold X |
| Gun | U | ; | RB |
| Spell | I | ' | Y |
| Swap spell | Q | ] | RT |
| Medkit | H | [ | LT |
| Character sheet and skills | C or Tab | | Select |
| Pause | P or Esc | | Start |
| Hack (in the minigame) | Space or J | , | A or X (Y uses an icebreaker, B backs off) |
| Menus | Mouse, touch or Tab | | D-pad/stick, A select, B back, LB/RB tabs |

## On phones
- **Sideways:** the stick sits to the left of the screen and the buttons to the right, so your thumbs never cover the fight.
- **Upright:** the view grows taller, the HUD moves into the sky at the top, and the controls sit under the screen.
- The stick appears wherever your thumb lands on the left side.
- The big buttons change their label to say what they'll do: LIFT, THROW, KNEE, TALK, ENTER. GUN shows ammo, SPELL shows mana cost, and both dim when you can't use them. CHAR shows how many points you have to spend.
- **Settings:** control size (S/M/L), left-handed layout, graphics quality, screen shake, vibration, tips, sound, music and full screen.
- **Fills any screen:** the game covers the whole screen on every device, inside the notch-safe area. Wider screens (phones held sideways, ultrawide monitors) see more of the street. Taller screens get a sky band on top for the HUD, and on touch screens a strip of pavement under the controls, so your thumbs never cover the fight. Only screens wider than 3.7:1 show bars.
- **Runs the same everywhere:** the game logic steps at a fixed 60 per second on any screen, from a 30 Hz phone to a 240 Hz monitor, and motion is interpolated so high-refresh screens stay smooth. On a slow device, *Graphics: Auto* switches to a lighter mode (sharper pixels off, fewer particles) after a few seconds. You can force *High* or *Low* in Settings.
- First-time tips explain each mechanic when you first meet it, worded for touch or keyboard.

## Controllers
Any standard controller works everywhere, menus included: Xbox, PlayStation, Switch Pro and most others.
- **In menus:** D-pad or left stick moves, **A** selects, **B** goes back, **LB / RB** switch tabs, **Menu** confirms.
- **In play:** the Controls table below. Plug in a second controller and press **Menu** on it to add Runner 2.
- The on-screen touch pad hides while a controller is in use, and tips and prompts switch to controller buttons ("Press X").
- Hits rumble the controller (turn it off with *Vibration* in Settings). Unplugging a controller mid-fight pauses the game.

## Install it as an app
Cyber City Tactics is a Progressive Web App.
- **Install:** Settings → *Install the app* (or *Install app* on the title screen) in Chrome, Edge and Android browsers. On iPhone and iPad, open it in Safari, tap **Share**, then **Add to Home Screen**.
- **Offline:** after the first visit everything is stored on the device, so it plays on a plane, in a tunnel, or with the network off.
- **Updates:** new versions download in the background. Between fights, an *A new version is ready* bar appears; tap **Update now** when it suits you. You're never pulled out of a fight.
- **Shortcuts:** long-press the app icon for *Daily challenge*, *The Sprawl*, *Arena* and *Codex*.
- **Your saves are safe:** the game asks the browser for persistent storage so saves aren't cleared to free space. Settings → *Save backup* → **Export** downloads every save as a file; **Import** loads it on another device.
- The screen stays awake while you play, and the game pauses itself when you switch away.

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

Older saves are migrated when they load. For example, saves from before skill trees get the points for the levels they already earned. A save that's damaged or from an unknown format is ignored rather than allowed to crash the game. Settings → *Save backup* exports and imports all of them as one file.

---

## Development
The code is split into small files by system and documented in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**: the folder layout, the load order, how a frame works, where state lives, and recipes for adding enemies, gear, feats, skills, Sprawl events and archetypes.

You need Node 18 or newer. Nothing has to be installed to run, build or test the game; Playwright and Prettier are optional extras for the browser tests and formatting.

| Command | What it does |
|---|---|
| `npm start` | Serves the game at http://localhost:8080 (the service worker is off on localhost so edits show on reload; add `?sw=1` to test it) |
| `npm run build` | Stamps the version, refreshes the service worker's file list, writes `dist/cyber-city-tactics.html`. **Run before every commit.** |
| `npm run check` | Fails if the build is out of date (handy in CI) |
| `npm test` | Every headless test, including two bot playthroughs (about 20 s) |
| `npm run test:quick` | The same without the bot playthroughs |
| `npm run test:browser` | Real-Chromium checks: both builds boot, manifest, shortcuts, offline play, the update flow (needs `npm i -D playwright`) |
| `npm run format` | Prettier over the source (needs `npm i -D prettier`) |

### Shipping a change
1. Edit files in `src/`.
2. `npm test`, then `npm run build`.
3. Commit everything, including the generated `src/js/version.js`, `sw.js` and `dist/`, and push to `main`. GitHub Pages serves the repo root. Installed copies see the new version and offer the update.

### Project layout
```
index.html             the page and the ordered list of scripts
manifest.webmanifest   PWA manifest
sw.js                  service worker
src/css/game.css       all styles
src/js/core/           canvas, utils and storage, audio, music, input
src/js/data/           tables: enemies, districts, gear, contracts, lore, feats
src/js/systems/        legend (feats, legendaries, Codex) and skill trees
src/js/game/           simulation: state, flow, combat, runners, enemies, allies, update
src/js/modes/          the Sprawl, dungeons, hacking, training, Arena
src/js/render/         drawing and the HUD
src/js/ui/             menus and buttons
src/js/pwa.js          install, updates, backups, shortcuts
src/js/main.js         game loop and boot
icons/, screenshots/   app icons and install-dialog screenshots
docs/store/            store kit: trailer, cover, social card, screenshots and itch.io copy (tools/capture.mjs)
src/fonts/             Teko and Chakra Petch, self-hosted (SIL OFL)
dist/                  generated single-file build
tools/                 build, local server, screenshot generator
tests/                 headless tests and browser tests
docs/                  architecture guide
```

---

Built by [Jeremy Anderson Tech](https://jeremyanderson.tech/), a web development and security practice in Shrewsbury, MA. [Services](https://jeremyanderson.tech/services/)
