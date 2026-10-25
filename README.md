# Cyber-City-Tactics

**Chrome & Sorcery**: a vector-drawn, River City Ransom–style brawler RPG for one or two players, set in a cyberpunk sprawl where magic is real. It's one HTML file with no build step, and it installs as a PWA.

## Play
- GitHub Pages: `https://cptnope.github.io/Cyber-City-Tactics/`
- Locally: `npx serve .` (or `python3 -m http.server`) and open the URL it prints.
- Install on a phone with "Add to Home Screen" / "Install app". It works offline after the first load. Bump `VERSION` in `sw.js` when you ship changes.

## What's in it
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

Touch controls appear automatically on phones.
