# Releasing Cyber City Tactics

What's ready in the repo, and what only you can do (anything that needs an account, a payment or a signature). The order follows the roadmap: your own domain first, then Google Play, then the WordPress plugin, then the App Store.

## Ready in the repo

| File | What it's for |
| --- | --- |
| `privacy.html` | The privacy policy. Stores ask for its URL; the game links it from Settings. |
| `_headers` | Real security headers (CSP with `frame-ancestors`, HSTS, Permissions-Policy and more) for Cloudflare Pages or Netlify. GitHub Pages ignores it. `npm test` checks it matches the page's own policy. |
| `docs/store/android/twa-manifest.json` | A Bubblewrap config for the Play Store build. Replace `YOUR-DOMAIN.example`. |
| `docs/store/android/assetlinks.template.json` | The Digital Asset Links file that proves the app and the site belong together. |
| `docs/store/` | Screenshots, cover, social card and trailer for any listing. |
| Android back button | In the installed app, back pauses the fight or closes a menu; on the title screen it leaves the app. |

## 1. Your own domain (needed for Google Play)

A Trusted Web Activity has to prove it owns the site with a file at `https://<domain>/.well-known/assetlinks.json`. A project page like `cptnope.github.io/Cyber-City-Tactics` can't serve that path, so the game needs a domain (or subdomain) where it sits at the root.

1. Get a domain, or use a free `*.pages.dev` address.
2. Cloudflare Pages: **Workers & Pages › Create › Pages › Connect to Git**, pick this repo, no build command, output directory `/`. `_headers` then applies automatically.
3. Add the new origin to `ALLOWED_ORIGINS` in `server/wrangler.toml` so online play works there.
4. Copy `assetlinks.template.json` to `.well-known/assetlinks.json` after step 2 of the next section (it needs the signing fingerprint).

## 2. Google Play

You'll need a Play Console developer account (a one-time fee, paid by you) and a phone or emulator to test on.

1. `npm i -g @bubblewrap/cli`, then in an empty folder outside the repo: `bubblewrap init --manifest https://<domain>/manifest.webmanifest`, or copy `twa-manifest.json` in and run `bubblewrap update`.
2. `bubblewrap build` makes the `.aab` and a signing key. Keep the key and its passwords somewhere safe and **never commit them** (`.gitignore` already blocks `*.keystore`, `*.jks`, `*.aab`, `*.apk`).
3. In Play Console, create the app and turn on Play App Signing. Under **Setup › App signing**, copy the SHA-256 of the app signing key into `assetlinks.json` (`sha256_cert_fingerprints`), publish it at `/.well-known/assetlinks.json`, and check it with Google's Statement List Tester. If it's wrong, the app shows a browser address bar.
4. Store listing: copy and images from `docs/store/`. Category: Games › Action.
5. **Privacy policy:** `https://<domain>/privacy.html`.
6. **Data safety:** no data collected or shared. Saves never leave the device. The online lobby sees an IP address only to rate-limit, briefly, which Play counts as "processed ephemerally". Answer "No" to collection, and say data is encrypted in transit.
7. Content rating questionnaire: cartoon fantasy violence, no gambling, no user-generated content, users can interact online (co-op with a friend by code; no chat).
8. Testing: new personal developer accounts must run a closed test with a set number of testers for a set number of days before production. Check the current numbers in Play Console.
9. Test on a real device: the back button, rotation, touch controls, the 3D view (it falls back to 2D on weak GPUs), and online play from mobile data.

## 3. WordPress plugin (later)

The plugin wraps the single-file build (`dist/cyber-city-tactics.html`). Before submitting, every handler that reads `$_GET`, `$_POST` or `$_REQUEST` must check a nonce (`check_admin_referer` / `wp_verify_nonce`) **and** the user's capability (`current_user_can`). Also escape all output, sanitize all input, and prefix every function and option name.

## 4. App Store (last)

This needs an Apple Developer membership (yearly fee), a Mac with Xcode, and a native wrapper (a WKWebView shell, or Capacitor). Apple reviews web-wrapper apps strictly, so it should feel native: offline play works already, and controller support and Game Center would help.

## Every release

1. `npm run build && npm test && npm run test:browser`.
2. Bump `version` in `package.json` (the build stamps it into the game and the service worker).
3. For Play, raise `appVersionCode` in `twa-manifest.json`. A web-only change needs no new Play build, since the app loads the live site.
4. Look over the 3D screenshots that CI attaches to the run (`shots-3d`).
