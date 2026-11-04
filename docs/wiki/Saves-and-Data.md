# Saves and data

Everything is stored in the browser's `localStorage` under `cs_*` keys, through `store` in core/utils.js. `store.load(key)` reads a slot **and checks its shape** against `SAVE_SHAPES`, returning `null` for anything malformed, so an old, partial or hand-edited save is ignored instead of crashing a menu. Settings can export every key to a backup file and import it again (pwa.js).

## Cloud save (sync.js)

No server: the bundle that a backup file holds (`saveBundle()`: every `cs_*` key, the date and a change stamp) can also travel as a **save code** or through a **sync file**.

```mermaid
flowchart LR
  W["store.set / store.del on a cs_ key"] --> T["syncTouch(): cct_sync.stamp = now"]
  T -->|linked| F["syncFlush() after 4 s:<br/>write the bundle to the file"]
  F --> S["cct_sync.synced = stamp"]
  B["launch: syncBoot()"] --> H{"handle in IndexedDB?<br/>permission granted?"}
  H -- no permission --> P["paused: Resume in Settings"]
  H -- yes --> A["syncAdopt(): read the file"]
  A -->|"file stamp > local stamp"| Q["hold: ask to load<br/>or keep this device's"]
  A -->|"older, empty or not ours"| F
```

- **Stamps, not dates.** `cct_sync` in localStorage (outside the `cs_` keys, so never in a bundle) holds `stamp`, bumped on every save write, and `synced`, the stamp last written to or read from the file. A file is "newer" only when its bundle's stamp is above this device's stamp.
- **Nothing loads silently.** A newer file becomes a pending import (`G.importData.from = 'sync'`); until the player answers, the file is not written (`SYNC.state = 'hold'`), and leaving Settings keeps the question. *Keep this device's saves* restamps them above the file's and writes them out.
- **Loading a backup file or a save code** counts as the newest change (`stamp = now`), so it goes out to a linked file; loading from the sync file sets both stamps to the file's.
- **Save codes** are `CCTSz` + base64url of the deflated bundle (`CCTSp` + plain base64url where `CompressionStream` is missing). Online invite codes start `CCT1`, so neither box accepts the other's code.
- **The file handle** is kept in IndexedDB (`cct` → `kv` → `syncFile`). Browsers drop the write permission on restart, so `syncBoot()` sees `prompt` and waits for *Resume*, a click, which `requestPermission()` needs.
- The sync file needs `showSaveFilePicker` (Chrome and Edge), and is hidden in the claude.ai preview, where pickers are blocked; save codes work everywhere.

| Key | What | Written by | Read by |
|---|---|---|---|
| `cs_save3` | The campaign: stage, phase (Den or briefing), difficulty, NG+, mutators, party, runners, shop stock, debrief, choices, side jobs | `saveGame()` | `loadGame()`, Continue |
| `cs_world` | The Sprawl: block, heat, cred, faction standing, party, runners, stock | `saveWorld()` | `loadWorld()` |
| `cs_legend` | Your legend: feats, stats, legendaries found, lore, bestiary, run history | `saveLeg()` | boot |
| `cs_prefs` | Settings, seen tips, training done | `savePrefs()` | boot |
| `cs_arena` | Arena high scores (top 8) | `arenaOver()` | Arena screens |
| `cs_day`, `cs_week` | Daily and weekly challenge progress and streaks | challenge end | challenge screens |
| `cs_drive`, `cs_stealth`, `cs_flight` | Job records: best times, ghosts, hull | job results | Jobs board |

## What a runner saves

`RUNNER_KEYS` (game/state.js) lists the fields copied in and out: archetype, level, karma, points, attributes, cyberware `cy`, chrome `tech`, equipment `eq`, spells, HP and mana, ammo, lives, skills `sk`, skill points and coat. On load, each runner is rebuilt from `newRunner()` defaults, then the saved fields are laid over it, so a field added later always has a default.

```mermaid
flowchart TD
  LS[(localStorage)] -->|"store.get"| RAW[raw JSON]
  RAW --> MIG{"old version?"}
  MIG -->|"v3 campaign"| SHIFT["shift districts 4+ up one<br/>(the Undercity Market arrived)"]
  MIG --> SHAPE{"SAVE_SHAPES[key] ok?"}
  SHIFT --> SHAPE
  SHAPE -->|no| NULL["null: ignored, never crashes"]
  SHAPE -->|yes| LOAD["loadGame / loadWorld:<br/>newRunner() defaults + saved RUNNER_KEYS"]
  LOAD --> FIX["fixGear(): items get makers and parts"]
  FIX --> READY[playable]
```

## Migrations so far

| Change | Handled by |
|---|---|
| District 4 (the Undercity Market) inserted | `store.load` shifts v3 campaign stages ≥ 3 up one |
| Skill trees added | runners without `sk` get fresh skills |
| Chrome (`p.tech`) added | `loadGame` resets a non-object to `{}` |
| Side jobs (`G.sideJobs`) added | `loadGame` resets a non-object to `{}` |
| Makers and parts on items | `fixItem()` / `fixGear()` |

See [[Robustness Audit]] for the save-handling fixes made in November 2026.
