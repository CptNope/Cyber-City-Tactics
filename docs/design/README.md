# Design

Everything that defines how Cyber City Tactics looks, sounds and talks outside the code itself.

| Folder or file | What it is | Live version |
| --- | --- | --- |
| [`BRAND.md`](BRAND.md) | The brand book: world, name and wordmark, color, type, voice, characters, visual language, motion and sound, store and social use | [Brand Book](https://claude.ai/artifact/SJeAWr27Fua7MpdYEhZqS7) |
| [`system/`](system/) | The design system: `tokens.json` (21 colors, 13 text styles, spacing, radii, shadows, control sizes), `components/bundle.css` and 16 components, each with a live `preview.html` and a README | [Design System](https://claude.ai/artifact/7MgLArML6pr2ZNGthKNg7Q) |
| [`panels/`](panels/) | Design panels: 11 artboards (key art, store feature, social post, HUD anatomy, building card, a playable hacking panel, skill tree, two phone screens, factions, controller map) laid out by `canvas.json` | [Design Panels](https://claude.ai/artifact/QRGJ2rzUJLrJbqcxjpcKoc) |

The live versions are private Claude artifacts; ask the owner for access. The copies here are the source of record for the repo.

## Rules

- **The code wins for values, the brand book wins for intent.** Hex codes and sizes live in `src/css/game.css` and the canvas renderers. If they and the design system disagree, fix whichever is wrong, then update `system/tokens.json` and `system/components/bundle.css`.
- **Screenshots are real gameplay.** Regenerate them with `node tools/screenshots.mjs`; the panels point at `../../screenshots/`, so they update with it.

## Opening the panels locally

Each `panels/*.dc.html` file is a Design Component page made for the Claude design canvas. Outside the canvas the `support.js` runtime is missing, so open them for reference, or open the live canvas. Images point at files in this repo (`screenshots/` and `panels/shots/`), and styles at `system/components/bundle.css` and `panels/cct-tokens.css`.
