Buttons say exactly what happens: a primary Neon Pink button for the one main action, ghost buttons for everything else.

**Use** `.btn` for the main action on a screen (one per screen, first in its row), `.btn.ghost` for alternatives and Back, `.btn.sm` inside list items and tiles, `.btn.big` for the one thumb-sized action in a minigame (HACK). Disabled buttons keep their label and say why in the label (*Cleaned out*, *Alarm resets in 9s*).

**The consumer provides** the label (a verb phrase in the game's voice; prices go on the button: *Lay low · ¥180*) and a `data-a` action.

**Tokens:** fill `neon`, label `on-neon`; ghost border `line`, label `text`; radius `radius-sm`; `button` text style; padding `space-10`/`space-16`. On a coarse pointer every button is at least `control-min` tall.

**Don't** put two primary buttons side by side, use icons alone, or write *OK*/*Submit*.
