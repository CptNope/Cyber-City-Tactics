The Cyber City Tactics wordmark: CYBER CITY with a pink and cyan chromatic split, and TACTICS knocked out of a Neon Pink bar.

**Use it** on the title screen, store art, posters, social banners and the README header. It is type, not a drawing: render it with the `wordmark` classes below rather than as an image, so it stays sharp at every size.

**Markup:** `<h1 class="wordmark" aria-label="Cyber City Tactics"><span class="wm-city">Cyber City</span><span class="wm-bar">Tactics</span></h1>` inside a `.card` (stacked). For the horizontal lockup, lay the two spans out in a row and set `.wm-bar` to about `0.62em`.

**Rules**
- Set in the `title` style (`display` family, 600, uppercase). The split on `wm-city` is the `shadow-chroma` offsets: `neon` 3px left, `mana` 3px right.
- The bar is always `neon` with `ink` letters. Never recolor it.
- Clear space: the bar's height on every side. Minimum: CYBER CITY 24px tall.
- Ground: `ink` or `panel` only. Over art, put it on an `ink` plate at 85% opacity.
- Don't outline, bevel, stretch, rotate or add a glow wider than the bar.
