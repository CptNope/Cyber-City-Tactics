# Cyber-City-Tactics

**Chrome & Sorcery**: a vector-drawn, River City Ransom–style brawler in a cyberpunk sprawl where magic is real. It's one HTML file with no build step, and it installs as a PWA.

## Play
- Turn on GitHub Pages (Settings → Pages → Deploy from branch → `main` / root). The game is then at `https://cptnope.github.io/Cyber-City-Tactics/`.
- Or run it locally with `npx serve .` (or `python3 -m http.server`) and open the URL it prints.

## Install as an app
Open the Pages URL on a phone and choose "Add to Home Screen" or "Install app". It works offline after the first load.
Bump `VERSION` in `sw.js` whenever you change files, so installed copies pick up the update.

## Controls
| Action | Keys |
|---|---|
| Move | Arrows / WASD |
| Punch (3 in a row = uppercut) | J or Z |
| Kick | K or X |
| Jump (attack mid-air for a flying kick) | Space, L or C |
| Pistol | U or V |
| Fireball | I or B |
| Pause | P or Esc |

Touch controls appear automatically on phones.
