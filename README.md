# Cyber-City-Tactics

**Chrome & Sorcery**: a vector-drawn, River City Ransom–style brawler RPG for one or two players, set in a cyberpunk sprawl where magic is real. It's one HTML file with no build step, and it installs as a PWA.

## Play
- GitHub Pages: `https://cptnope.github.io/Cyber-City-Tactics/`
- Locally: `npx serve .` (or `python3 -m http.server`) and open the URL it prints.
- Install on a phone with "Add to Home Screen" / "Install app". It works offline after the first load. Bump `VERSION` in `sw.js` when you ship changes.

## What's in it
- **Arena mode:** endless waves on one street, for one or two players. Waves grow, the street changes every five waves, a boss arrives every fifth wave, and every third wave you pick one of three perks. You start at level 3. Scores, waves and best combos go on a high-score table saved on the device.
- **Difficulty:** Street, Runner or Prime, chosen at the start of a run. After the final boss, **New Game+** keeps your runners, levels, gear, cyberware and spells, and makes enemies tougher, elites more common and loot better. You can repeat it.
- **Elite enemies:** Armored (halves bullet damage), Berserk (faster, hits harder), Warded (can't be knocked down, resists magic) and Vampiric (heals when it hits you). Each has a colored aura and a name tag, and drops better gear.
- **Boss rage phases:** at half health each boss enrages. The Gutter King and the Hollow Saint slam the ground and send shockwaves you have to jump. Razor Mei chains three dashes. The Hollow Saint summons fire spirits too. Director Voss fires five-way hexes and teleports more often.
- **Four districts:** Rustline Barrens, Neon Market, Undercity Tunnels and Kagemori Arcology. Each has a boss: Gutter King, Razor Mei, the Hollow Saint and Director Voss.
- **Enemies:** gangers, orcs, corp security, riot troopers (shields block punches; kick them), drones, street shamans, ghouls (they lunge) and fire spirits (bullets pass through).
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
- **The Den:** a walkable street hub between districts. Talk to Juno (fixer), Sal, Doc Kessler (street doc), Old Wen (talismonger), Ratchet (fence) and Pixel. Their story lines change after each job.
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
