# Security

## Reporting a problem

Please report security problems privately, not in a public issue: use **Security → Report a vulnerability** on
this repository (GitHub's private vulnerability reporting). Say what you found, how to reproduce it, and what it
lets someone do. You'll get a reply within a week.

## What the game does to stay safe

- **No server holds your data.** Saves live in your browser (localStorage), and cloud saves are a file or a code
  you move yourself. The online lobby (`server/worker.js`) only passes WebRTC invites between two browsers, keeps
  them for 15 minutes, and stores nothing else.
- **Content Security Policy.** The page may only run its own script files (`script-src 'self'`; the single-file
  build allows exactly its one inline script by hash), loads nothing from other sites, and talks only to the
  game's own lobby. There are no inline event handlers, no `eval` and no `new Function`.
- **Untrusted text is defused at the door.** Everything read from storage (including imported backups, save
  codes and sync files) and everything received from an online partner passes through a reviver that drops
  `< > " \``, and the UI escapes text it puts into HTML.
- **Online play.** The host checks every message from the friend (only button states, a fixed set of actions,
  and the friend's look); the friend's game takes the host's picture of the game, with prototype keys refused and
  messages over 1 MB dropped. The game only talks to its own lobby (`?lobby=` accepts that one or localhost).
- **The lobby.** Origin checks, request size caps, per-address rate limits, room codes from a cryptographic
  random source, a per-room key so only the host can reopen a room or read the friend's reply (which carries
  their network address), and a daily ceiling on TURN relay passes.
- **The offline cache.** The service worker only serves files under the game's own folder, from its own caches;
  the site's origin is shared with other projects on the same account.
- **The repository.** CI runs with read-only permissions, GitHub Actions are pinned to commits, dev tools are
  pinned to exact versions and installed without install scripts, CodeQL scans every pull request, and
  Dependabot proposes updates weekly.

## Before an app-store or plugin release

- Serve the game from its own origin (a custom domain, or the app's own bundle) rather than a shared
  `*.github.io` origin, so its storage isn't shared with other sites.
- A store build should set the CSP as an HTTP header (or in the app's web view) as well as the meta tag, and add
  `frame-ancestors 'none'`, which a meta tag can't set.
- A WordPress plugin wrapper must escape everything it prints, check a nonce and the user's capabilities in every
  handler that reads `$_GET`, `$_POST` or `$_REQUEST`, and load the game from the plugin's own folder.
