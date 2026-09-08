# Table Tennis World Tour — local reference base

Open `index.html` directly. The game uses local scripts, images, and audio; a server or build step is not required.

`game.js` is the exact bundle supplied in `Downloads.zip`, where it was named `Table Tennis World Tour_files/a_data/TweenMax.min_0op3.js`. It includes the libraries and the game itself. Paddle movement, aiming, ball physics, and match rendering have not been rewritten or tuned.

`game-modes.js` extends the original global menu and match-completion functions. Play now leads to country selection, then a choice of World mode or Finals system. World keeps the original tour. Finals uses `finals-tournament.js` for a 32-country single-elimination draw with five rounds, per-country saved progress, real player scores, simulated other matches, and a complete results bracket. `game-modes.css` styles the new screens using the original imagery. Finals uses the source's opening-match settings until difficulty selection is added.

Finals saves use `finals32:v1:<countryId>` within the local platform's namespace; they do not write World tour progress. Only completed matches are saved. Quitting or reloading during a match lets you replay that same opponent. Invalid saves start a fresh draw; blocked browser storage falls back to session memory.

`supplied/` preserves all 20 original files from the ZIP. Missing game media was restored from the reference game's public CDN. `source-manifest.json` records URLs, sizes, and SHA-256 hashes. The old `images/preloadImage.jpg` URL is unavailable, but it is only referenced in an unused language-selection branch; the supplied game has one language and uses `loader.png` and `loadSpinner.png` to start.

`local-platform.js` provides the host integration the game expects: viewport dimensions, local saves, ready callbacks, and resolved analytics callbacks. The copied portal's advertising and tracking scripts are not loaded. Saves use a separate local prefix. The Famobi branding in the original assets is retained.

To begin changes, edit `game.js` or add a separate script after it. The untouched source remains under `supplied/`. `restore-assets.ps1` restores media without replacing an edited `game.js`.

Checks, run from the project root:

```
node reference-game/verify.cjs
node reference-game/finals.test.cjs
```

These verify the actual copied JavaScript in a simulated DOM/canvas, not a browser playtest. The first check also verifies bundle/media hashes and source sprite bounds. The finals checks cover all five rounds, elimination, persistence, World isolation, pause/restart/quit, and one match loop after an immediate round transition. Browser appearance, real pointer interaction, and audio remain unverified.
