# Store kit

Everything needed for an itch.io page (or any store listing), captured from the game itself by `tools/capture.mjs`, so it always matches what players see.

## Files

| File | Size | Use |
| --- | --- | --- |
| `trailer.mp4` | 1280×720, about 22 s, H.264 | Trailer: upload to YouTube or itch's video slot |
| `cover-630x500.png` | 630×500 | itch.io cover image |
| `social-1200x630.png` | 1200×630 | Link previews (set as `og:image` in `index.html`) |
| `shot-street-storm.png` | 1920×1080 | Two runners in a storm on Rustline |
| `shot-undercity-market.png` | 1920×1080 | Mother Vesper's night market |
| `shot-neon-market-boss.png` | 1920×1080 | Razor Mei's entrance |
| `shot-arcology-elites.png` | 1920×1080 | Elites and a mech walker in the Arcology |
| `shot-sprawl-black-market.png` | 1920×1080 | Sable's cart on a Sprawl block |
| `shot-title.png` | 1920×1080 | Title screen |

The install-dialog screenshots listed in `manifest.webmanifest` live in `/screenshots` and come from the same script.

## Regenerate

```
NODE_PATH=<a folder with playwright installed> node tools/capture.mjs
```

`--no-video` skips the trailer; `--video-only` makes just the trailer. The trailer needs `ffmpeg` on your PATH. The game runs frame by frame under the script, with a small autopilot driving both runners, so each run comes out nearly the same.

## itch.io page copy

**Title:** Cyber City Tactics

**Short description:** A neon brawler RPG for one or two players. Free in your browser.

**Genre:** Action · **Tags:** beat-em-up, cyberpunk, local-co-op, online-co-op, rpg, open-world, offline

**Description:**

> Seattle, 2079. Magic came back, dragons came with it, and the corps bought the sky.
>
> You and a friend are two shadowrunners with a fixer called Juno and six districts between you and Director Voss. Punch, kick, shoot, cast, grab and throw your way from the gang turf under the dead monorail to the Kagemori host itself.
>
> - **Six districts, six bosses**, from the Gutter King to Mother Vesper's ghoul night market and the Black ICE inside the corp's network.
> - **Two choices that change the ending.** Sell the books or leak them. Wipe the core or keep the key.
> - **The Sprawl:** an open-world street of doors to crack. Corps and gangs are fair game; families and corner shops aren't, and the city remembers. Cops, heat, street cred, a black-market trader and a 60-slot stash.
> - **A real RPG under it:** karma levels, four skill trees, cyberware, spells, 70+ feats, legendaries and a Codex of lore to piece together.
> - **Co-op, couch or online:** one keyboard, two controllers, or two browsers anywhere with an invite code (Arena). Training with Juno for anyone new.
> - **Plays anywhere:** phones, tablets, laptops and TVs. Install it and it plays offline.
>
> No account, no ads, no tracking. Just the game.

**Controls:** Keyboard (WASD + J/K/Space), any standard controller, or touch. The full list is on the title screen.
