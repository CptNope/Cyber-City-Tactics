# Contributing

The README covers running, building and testing. The flow is: edit `src/`, run `npm test`, run `npm run build`, then open a pull request. The rule for code: a file may only use, at load time, things defined in files listed above it in `index.html`.

## Recipes

| To add | Do this |
|---|---|
| A foe | An entry in `DEF` (data/content.js). Flags such as `ranged`, `lunge`, `teleport`, `grab`, `thrower` and `flurry` switch on existing behaviours in game/enemies.js. Add a bestiary line to `BEST`, then spawn it from a district's waves, an Arena pool or a Sprawl faction (`FAC`) |
| A weapon, gun or armor | A base in `BASES` (data/gear.js). Give a melee base a `look` and draw it in `drawWeapon()`, and a gun base a silhouette in `GUN_SHAPE` (render/figures.js) |
| A part | An entry in `PARTS`, with its effect in `applyParts()`, and read the field where it matters (`crit`, `critMul`, `speed`, `daze`, `kb`) |
| A maker | An entry in `MFR`: name, colour, speciality, attribute, the slots it makes and the parts it favours |
| A legendary | `LEGS` (data/legend-data.js), a feat in `FEATS` that unlocks it, and its effect wherever it applies (search for `legOf(`) |
| A chrome technique or move | `TECH` (data/world.js), with `move: true` to list it as a move and `innate(p)` for archetypes that know it. Check `hasTech(p, id)` in game/runners.js, then add a line to `movesHtml` (ui/screens.js) and the README |
| A training drill | A step in `TRAIN` (modes/training.js): the touch and keyboard text, `setup(p)`, `done()` on a `G.tf` flag the game sets, and optionally `tick(p)`. Then teach the bot in tests/training.test.js |
| A feat | `FEATS`: counting feats use `stat` and `n` with `bump()` or `peak()`; others call `feat(id)` |
| A skill | `SKILLS` (systems/skills.js), then check `has(p, id)` where it matters |
| A Sprawl event | `EVENTS` (modes/sprawl.js), a slice of the roll in `genStreet()`, and `evOn(id)` where it changes things |
| A mutator | `MUTS` and `MUTD` (modes/arena.js), then `modOn(id)` where it changes things |
| An archetype | `ARCH` (data/gear.js), its free skill in `ARCH_SKILL`, and its special in `doSpecial()` |
| A job | A mode file like modes/drive.js: a `start…()` that calls `jobCrew()`, its own update called from `update()` while its `G.` flag is set, a results screen using `jobEndHtml()`, and the flag cleared in `resetWorld()` |
| A save field | Write it in `saveGame()`/`saveWorld()`, give it a default in `loadGame()`/`loadWorld()`, and extend `SAVE_SHAPES` if a bad value could crash a menu |

## Writing

Player-facing text uses plain words, describes what a thing does for the player, and says it in the game's voice. Help screens, tips, training and the README should all agree. [[Testing and CI]] has tips for tests.

## Editing this wiki

The pages live in `docs/wiki/` in the repo, so a wiki change goes through a pull request like any other. When it lands on `main`, the **Wiki** workflow (`.github/workflows/wiki.yml`) copies the folder to the Wiki tab. Edits made directly in the Wiki tab are overwritten on the next sync, so make them in the repo. Link pages with `[[Page Name]]`; `_Sidebar.md` and `_Footer.md` frame every page.
