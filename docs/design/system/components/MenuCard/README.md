Every menu is a card over the paused game: eyebrow, title, a line or two of text, then the choices.

**Use** `.card` as the only child of the overlay. Order: `.eyebrow` (where you are, with ` · ` separators), `h2` (what this screen is for, title case), `p` in `muted` (at most two sentences), optional `h3` section labels, then a `.row` of buttons with the primary first.

**The consumer provides** the overlay ground (`ink` at 90%), so the street stays visible behind every choice.

**Tokens:** `heading`, `subhead`, `eyebrow`, `body` styles; card padding `space-16`/`space-18`, gap `space-12`; max width 640px; body text max 62ch.

**Motion:** the card rises 8px and fades in over 0.2s; off when the player prefers reduced motion.
