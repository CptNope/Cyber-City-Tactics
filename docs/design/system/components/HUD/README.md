The in-game HUD, drawn on the canvas: the runner panel top left, the place and job top right, and Sprawl door signs.

**Use** Teko 600 caps (`hud` style) with a 3px `track` outline behind every word so it reads over any background. Bars sit on a `track` outline and `meter-bg` fill: HP `neon` (6px), mana `mana` (4px), karma `karma` (2px), special `gold` (3px, flashing `spark` when full). Creds in `gold`, ammo in `ammo`, spell in `mana`.

**Door signs:** the building name on an `ink` plate in `ok` (fair game) or `neon` (hurts ordinary people), `dim` once looted; tier bars and the door frame in the rarity colors. Heat is five ★ in `siren`, empty ones `#3a3150`.

This preview redraws the real layout with the real values; the game's own code is `src/js/render/hud.js` and `src/js/render/sprawl.js`.
