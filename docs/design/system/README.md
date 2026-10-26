Cyber City Tactics is a neon brawler RPG for one or two players, set in a rain-soaked Seattle in 2079. Everything here is taken from the game's own code (`CptNope/Cyber-City-Tactics`): the colors and sizes from `src/css/game.css`, the canvas colors from `src/js/render/`. The full brand story, voice and applications live in the **Cyber City Tactics Brand Book**; this system is the part you build with.

## Content fundamentals

The game talks like a good fixer: short, specific, a little dry, always straight about the cost.

- **Two registers.** Characters (Juno, Kit, Pixel, Old Wen) speak in first person with attitude, two or three sentences, in the **Dialogue** component. System text (buttons, tips, cards) is plain and active: what happens, what it costs.
- **Buttons are verbs with the price on them:** *Hack the door*, *Lay low · ¥180*, *Get back up*, *Update now*. Never *OK* or *Submit*.
- **Numbers beat adjectives:** "+20% gun damage", "Heat +3, cred −10".
- **Players' words:** creds (money), street cred, heat, karma, the Den, the Sprawl, runners. Never internal names.
- **Case:** titles in title case (`heading`); labels, buttons, tabs and HUD text in caps; body in sentence case. Separators are ` · `.
- **No exclamation marks** in system text, no emoji as decoration. Glyphs that carry meaning are fine: ★ (special, heat), ⇄ (swap spell), ☠ (bounty), ✓ (learned, installed), 🔒 (locked), ▲▼ (better, worse), ¥ (creds).
- **Write for the input in hand.** Touch says *Tap PUNCH*, keyboard *Press J*, controller *Press X*. The game switches automatically (`ctl()` in `src/js/core/input.js`).

> Breaking in here hurts people who did nothing to you. Heat +3 (cops will come), cred −10.

> My people dragged you back to the safehouse. The medics took ¥120. Good news: nobody's looking for a corpse, so the heat is off.

## Visual foundations

**Color.** One theme, Night: neon on ink, about 80% `ink`/`panel`, 15% `text`/`muted`, 5% neon. Each neon has one meaning:
- `neon` the brand, the main action, and danger to you (your HP, bad buildings)
- `mana` magic, tech and hacking
- `gold` money, rewards and attention
- `ok` safe, good, done
- `karma` progress and secrets

Supporting colors stay in their lane: `fire` for fire, `siren` for heat and cops, `legendary` for Black-market items. Put labels on `neon` fills in `on-neon`, never white. Never set neon text on another neon.

**Type.** Two Google Fonts. `display` (Teko) is the street sign, for short words only: `title`, `heading`, `subhead`, `stat`, `wallet`, `node`, `hud`. `body` (Chakra Petch) is the readout, for anything longer than a line: `body`, `small`, `button`, `tab`, `label`, `eyebrow`. Titles scale with `clamp()` in code. Numbers that change use tabular figures. Everything must stay readable on the fallbacks (Impact, system UI) before the fonts load.

**Spacing and radius.** Small and tight, like a HUD. Card padding `space-16`/`space-18`, gaps `space-8` to `space-12`. Corners are small: `radius-sm` for controls, `radius-md` for blocks; only touch buttons are round.

**Surfaces.** Menus are cards over the paused game on an `ink` overlay at 90%, so the street stays visible. Blocks are `panel` with a 1px `line` border; selected is `panel2`. No drop shadows on surfaces; only things floating over play get `shadow-float`.

**Motion.** Hits feel heavy, menus feel instant. Hit-stop of 3 frames (5 on a crit), 2 to 6px screen shake, slow motion when a boss falls. Menu cards rise 8px over 0.2s; an available skill pulses; a learned one pops once. Respect reduced motion (no pulses, half the particles) and the separate shake, vibration and music switches.

**States and focus.** Disabled is 35% opacity with the reason in the label. Keyboard focus is a 2px `mana` ring; controller focus is a 3px `gold` ring with `shadow-pad-focus`, so it can't be lost on a TV.

**The canvas world.** Everything in play is flat vector shapes drawn in code on a 480 × 270 stage: two-tone coats, one accent per character, neon signs as the light source, rain outside. Every HUD word has a 3px `track` outline. No sprites, gradients on figures, photographic textures or outlines over 2px.

## Iconography

There is no icon set. The game uses words first (touch buttons say PUNCH, GUN, ENTER), then the text glyphs listed above. App and shortcut icons are PNGs in **Logos** and **Shortcuts**; they contain no text.

## Logos

The wordmark is type: render it with the **Wordmark** component (CYBER CITY with the `neon`/`mana` chromatic split, TACTICS knocked out of a `neon` bar in `ink`). Never rebuild it as an image or recolor the bar. The app icon is a runner mid-kick under a rising neon sun, kept inside the center 80% so the maskable version survives a circle crop.

## Controls and input

Every screen works three ways: touch, keyboard and controller. On a controller, the D-pad or left stick moves focus, A selects, B goes back, LB and RB switch tabs. The on-screen pad hides while a controller is in use, and prompts switch to the controller's button names.

## Accessibility

- `text` and `muted` meet AA on `ink`, `panel` and `panel2` (`muted` on `ink` is 7.7:1). `on-neon` on `neon` is 5.9:1.
- `dim` (3.4:1) is only for spent or locked things that also say so in words (*CLEANED OUT*, *OUT*).
- Never carry meaning by color alone: door signs name the building, heat uses stars, rarity is in the item's name, locked things show 🔒.
- Touch targets are at least `control-min` (44px).

## Not synced from code

- **Fonts** are Google-hosted (Teko 500/600, Chakra Petch 400/600); there are no font files to copy.
- **Components** are static renditions of the game's real CSS (`components/bundle.css` is copied from `src/css/game.css`); the game has no component library, so there is no `bundle.js`. `.cct-preview` in the stylesheet is an addition for previews only.
- **Canvas art** (figures, signs, the HUD) is drawn in code; the HUD preview redraws its layout with these tokens.
