# Cyber-City-Tactics

**Chrome & Sorcery**: a vector-drawn, River City Ransom–style brawler RPG for one or two players, set in a cyberpunk sprawl where magic is real. It's one HTML file with no build step, and it installs as a PWA.

## Play
- GitHub Pages: `https://cptnope.github.io/Cyber-City-Tactics/`
- Locally: `npx serve .` (or `python3 -m http.server`) and open the URL it prints.
- Install on a phone with "Add to Home Screen" / "Install app". It works offline after the first load. Bump `VERSION` in `sw.js` when you ship changes.

## What's in it
- **Weekly challenge:** a seeded Arena run that gives everyone the same waves and perk offers for the ISO week, on Runner, with one modifier: Glass Cannon, Powder Keg, Elite Week, Spirit Tide or Bare Knuckles. Your weekly best is kept.
- **Sharing:** end screens show run stats (takedowns, elites, bosses, damage dealt and taken, best combo) and a Copy / Share button with a ready-to-paste brag line and the game's link.
- **Arena mode:** endless waves on one street, for one or two players. Waves grow, the street changes every five waves, a boss arrives every fifth wave, and every third wave you pick one of three perks. You start at level 3. Scores, waves and best combos go on a high-score table saved on the device.
- **Difficulty:** Street, Runner or Prime, chosen at the start of a run. After the final boss, **New Game+** keeps your runners, levels, gear, cyberware and spells, and makes enemies tougher, elites more common and loot better. You can repeat it.
- **Elite enemies:** Armored (halves bullet damage), Berserk (faster, hits harder), Warded (can't be knocked down, resists magic) and Vampiric (heals when it hits you). Each has a colored aura and a name tag, and drops better gear.
- **Boss rage phases:** at half health each boss enrages. The Gutter King and the Hollow Saint slam the ground and send shockwaves you have to jump. Razor Mei chains three dashes. The Hollow Saint summons fire spirits too. Director Voss fires five-way hexes and teleports more often.
- **Five districts:** Rustline Barrens, Neon Market, Undercity Tunnels, Kagemori Arcology and the Kagemori Host (inside the Matrix). Each has a boss: Gutter King, Razor Mei, the Hollow Saint, Director Voss and Black ICE, whose lane-wide beams you dodge by changing lanes or with a well-timed roll. After each beam it vents and its core takes extra damage.
- **Runner archetypes:** Street Runner (Adrenaline), Street Samurai (Blade Dance), Combat Mage (Mana Storm) or Gunslinger (Bullet Time). Each has its own starting stats, gear and a special move charged by a meter that fills as you deal and take damage.
- **Companions:** Kit in the Den rents one at a time. The Rigger drone snipes enemies in its lane. Brick, a troll merc, brawls and pulls enemies off you. A bound fire spirit burns what it touches and ignores bullets. Companions carry between districts and get patched up in the Den, but if one goes down on a job it's gone. In Arena, the Hired help perk brings one in.
- **Heavy blows:** hold punch to charge, release for a guard-breaking knockdown.
- **Breakables:** vending machines spill medkits, ammo and mana. Data nodes in the Matrix are the final contract.
- **Enemies:** gangers, orcs, corp security, riot troopers (shields block punches; kick them), drones, street shamans, ghouls (they lunge), fire spirits (bullets pass through), Glitches (split in two when they die) and ICE sentries (teleport and fire laser spreads).
- **Combat:**
  - punch combos ending in an uppercut, kicks and flying kicks
  - a dodge roll with invincibility frames
  - grabs: walk into a staggered enemy, punch to knee, kick to throw them into others
  - throwable trash cans, crates and explosive drums
  - a combo meter that boosts karma and creds
- **RPG:**
  - karma levels with 2 attribute points each (Body, Strength, Agility, Magic)
  - loot in three rarities, plus cyberware that costs max mana
  - spells: Fireball, Manabolt and Heal (Heal also heals a nearby partner)
  - a side contract from the fixer in every district
- **The Den:** a walkable street hub between districts. Talk to Juno (fixer), Sal, Doc Kessler (street doc), Kit (companions), Old Wen (talismonger: Manabolt, Heal, Barrier, Chain Lightning), Ratchet (fence) and Pixel. Their story lines change after each job.
- **Co-op:** a second runner with their own level, stats and gear. Creds, medkits and the bag are shared. Start a co-op run from the title screen, or add Runner 2 from the pause menu or by pressing Start on a second gamepad.
- **Audio:** chiptune tracks for the title, the Den, each district and boss fights, all made with Web Audio. Sound and music toggle separately.
- **Saves:** progress saves to the browser at each briefing, district start and Den visit.

## Controls
| Action | Runner 1 | Runner 2 | Gamepad |
|---|---|---|---|
| Move | WASD (and arrows when solo) | Arrows | D-pad / left stick |
| Punch, grab, talk | J | , or Numpad 1 | X |
| Kick | K | . or Numpad 2 | B |
| Jump | Space | / or Numpad 3 | A |
| Dodge | O or Left Shift | Right Shift | LB |
| Special | F, or punch + kick | \\ or Numpad 8 | Stick click |
| Heavy blow | Hold J | Hold , | Hold X |
| Gun | U | ; | RB |
| Spell | I | ' | Y |
| Swap spell | Q | ] | RT |
| Medkit | H | [ | LT |
| Character sheet | C or Tab | | Select |
| Pause | P or Esc | | Start |

## On phones
- Upright, the game view grows taller and the HUD moves into the extra sky at the top, larger and easier to read.
- Hold the phone sideways. The stick sits left of the screen and the buttons right, so your thumbs never cover the fight. Upright works too, with the controls under the screen.
- The stick appears wherever your thumb lands on the left side.
- The big buttons change their label to say what they'll do right now: LIFT, THROW, KNEE, TALK. GUN shows ammo, SPELL shows mana cost, and both dim when you can't use them.
- Settings: control size (S/M/L), buttons on the left for left-handed play, screen shake, vibration, tips, sound, music and full screen.
- First-time tips explain each mechanic the moment you meet it, worded for touch or keyboard.
