# Table Tennis World Tour — local reference base

Open `index.html` directly. The game uses local scripts, images, and audio; a server or build step is not required.

`game.js` is the exact bundle supplied in `Downloads.zip`, where it was named `Table Tennis World Tour_files/a_data/TweenMax.min_0op3.js`. It includes the libraries and the game itself. Its paddle movement, aiming, ball physics, and match rendering remain the baseline; separate extensions apply difficulty and paddle bonuses.

`game-modes.js` extends the original global menu and match-completion functions. The title offers Play and Stats using the original logo and bat artwork. Play selects a country on first use, or reuses the saved country, then opens World mode, Finals system, or CPU Handicap and Easy, Medium, Challenging, or Hard. World keeps the original tour. Finals uses `finals-tournament.js` for a 32-country single-elimination draw with five rounds, per-country/per-level saved progress, real player scores, simulated other matches, and a complete results bracket. `game-modes.css` styles the new screens using the original imagery and a numeric head-start preview.

Finals saves use `finals32:v1:<countryId>:<difficulty>` within the local platform's namespace; they do not write World tour progress. Older `finals32:v1:<countryId>` draws without a difficulty migrate to Easy without replacing their original entry. Only completed matches are saved. Quitting or reloading during a match lets you replay that same opponent. Invalid saves start a fresh draw; blocked browser storage falls back to session memory.

`handicap-challenge.js` manages CPU Handicap: the player starts at 0, the CPU at 6 through 10 in five stages. Only a win advances; losses keep the stage and record the latest result. One CPU opponent persists through the run. The final stage still uses win-by-two, so an unanswered comeback wins 12-10. Five wins finish the run; Play again starts a new one. Saves use `handicap:v1:<countryId>:<difficulty>` and do not modify either other mode's progress.

During an active handicap match, `game-modes.js` supplies `user_score: 0` and the stage's `enemy_score` through the source's existing `forced_mode` state reader. It does not enable the forced-game mode or change scoring rules. The source reads these initial scores before constructing its match UI and ball. Paused restarts reuse the same head start; other modes receive their usual initial state. Only completed match attempts are saved, so quitting or reloading an unfinished match allows a retry.

`difficulty.js` wraps `Elements.EnemyBat` after the original bundle loads. It retains the source's projection, collision checks, pursuit choices, recovery tweens, and stroke model, while applying opponent-only profiles. Reactions count down in game time, pausing with play. Motion has finite lateral speed; harder opponents recover faster and choose open-space placements more often. Return pace and spin are capped. After a legal bounce, stronger opponents adjust their initial forecast sooner, and tracking brakes near the ball instead of overshooting. All four profiles are stronger, with Challenging closer to Hard. Occasional long/wide mishits affect returns, with base chances of 6.5%, 4.3%, 3.0% and 2.4%; stretched contacts add up to 8, 6, 4.5 and 3.5 percentage points respectively. These are shot-generation probabilities, not measured point-loss rates. The real ball flight decides whether the return misses and records an unforced error. A single cached stroke supplies both physics and the source's repeated analytics lookup. The player's paddle and `Elements.Ball` are not modified.

| Profile | Reaction delay | Lateral speed cap* | Return pace cap* | Spin cap* |
| --- | --- | --- | --- | --- |
| Easy | 140-200 ms | 540 | 0.46 | 0.36 |
| Medium | 75-120 ms | 740 | 0.53 | 0.65 |
| Challenging | 25-50 ms | 930 | 0.575 | 0.86 |
| Hard | 10-25 ms | 1000 | 0.59 | 0.94 |

*These are source-engine units, not physical m/s or RPM, and the shot caps are before paddle bonuses. Pursuit and distance can make movement slower than the cap. The selected level replaces the original AI skill ramp in World mode, while its countries, visual progression, and saved position remain intact.

All four levels react sooner, move into position and recover faster, and start correcting their forecast earlier after the bounce. Challenging receives a larger defensive increase to handle Speedy smashes. The reaction ranges above use game time and are resolved on frame updates. Return pace, spin, placement and mishit probabilities keep their previous settings.

`paddle-types.js` loads after `difficulty.js`. The mode chooser's Your paddle radio group offers Balanced (green), Spinny (red), and Speedy (blue) across every mode. Balanced returns the original player stroke unchanged. Spinny lowers the normalized lateral swipe threshold from 0.5 to 0.45 and raises maximum player spin to 1.05, retaining swipe direction and the reduction in spin during hard forward strokes. For the CPU, Spinny multiplies its generated spin by 1.05 and preserves no-spin shots. Speedy multiplies the engine's shot pace parameter by 1.04 without changing aim or spin; the strongest player returns travel about 6.4% faster than Balanced. Existing difficulty behavior remains in place beneath these bonuses.

The player choice saves as `paddle:v1` within the local platform's namespace and defaults to Balanced for a missing or invalid value. Blocked storage uses session memory. Every new match and next opponent, including all five Finals rounds, independently selects a CPU paddle uniformly from the three types. Pause/resume keeps the current choice; restart creates a new CPU paddle and retains the player's selection. Player rendering uses a private atlas mapping of the source green/red/blue sprites, and CPU rendering uses their existing sprite IDs, leaving shared artwork, `game.js`, and media files unchanged. The selector follows the existing navy/gold and Archivo styling, shows names and descriptions alongside color, and stacks its choices on narrow screens.

`supplied/` preserves all 20 original files from the ZIP. Missing game media was restored from the reference game's public CDN. `source-manifest.json` records URLs, sizes, and SHA-256 hashes. The old `images/preloadImage.jpg` URL is unavailable, but it is only referenced in an unused language-selection branch; the supplied game has one language and uses `loader.png` and `loadSpinner.png` to start.

`local-platform.js` provides the host integration the game expects: viewport dimensions, local saves, ready callbacks, and resolved analytics callbacks. The copied portal's advertising and tracking scripts are not loaded. Saves use a separate local prefix. The Famobi branding in the original assets is retained.

To begin changes, edit `game.js` or add a separate script after it. The untouched source remains under `supplied/`. `restore-assets.ps1` restores media without replacing an edited `game.js`.

`match-stats.js` hooks startup, serves, shots and scoring to count points won, aces, serve/return points, net/out unforced errors and match points saved for both sides, plus longest and average rally length in returns. The rally average divides total returns by actual points played; all-time averages are weighted across recorded points. An ace is a legal serve the receiver does not touch. Missed returns are excluded from unforced errors. A match point saved is a point won while the opponent could win the match. A status banner names who holds match points and how many remain for up to four seconds between points, clearing when the serve starts, on pause or on exit. Counts respect deuce and the 99-point cap.

Completed matches open an opponent comparison before continuing the current mode. The title's Stats page adds matches, wins, losses and win rate to cumulative player/opponent figures. Totals use `player-stats:v1` within the local platform's namespace across all modes, countries and difficulties. Aces count from the addition of ace tracking; older saves retain all previous stats with zero historical aces. Totals begin with this update and include completed player matches only; older results, simulated Finals matches and unfinished or restarted attempts are excluded. CPU Handicap free points appear in final scores but not points won or rally averages. Browser localStorage persists totals; blocked or failed storage uses session memory only. Invalid saved stats start with an empty record.

Checks, run from `static/tabletennis/`:

```
node reference-game/verify.cjs
node reference-game/finals.test.cjs
node reference-game/difficulty.test.cjs
node reference-game/smash-defense.test.cjs
node reference-game/paddle-types.test.cjs
node reference-game/handicap.test.cjs
node reference-game/match-stats.test.cjs
```

The match-stats checks cover navigation, scoring categories, aces and legacy-save compatibility, rally statistics, announcement timing, saved match points, cumulative totals, Handicap exclusions, unfinished attempts, storage fallback and World continuation. These verify the actual copied JavaScript in a simulated DOM/canvas, not a browser playtest. The first check also verifies bundle/media hashes and source sprite bounds. The 12 finals checks cover all five rounds, elimination, persistence, World isolation, pause/restart/quit, and one match loop after an immediate round transition. The 11 difficulty checks cover all four levels in World, Finals, and CPU Handicap, saved-level separation/migration, bounded motion and shots, player-stroke consistency, and reaction timing across frame rates. A seeded 405-shot contact scenario includes displaced starting paddles, both spin directions and faster/wider shots; it produces increasing opponent return coverage. CPU mishit checks cover ordinary/stretched error frequency and actual ball flights that lose points and record errors. These checks do not measure human win rates. The 11 handicap checks cover actual scores through all five stages, loss/retry, deuce, pause/restart/quit, save isolation, failed storage, completion, and next-stage loop handling.

The smash-defense checks compare the previous defensive settings against the current ones with identical seeded Speedy strokes at 30, 60 and 144 FPS. They cover three paddle starting positions, five shot placements and two stroke strengths, including full power. Every level must return more shots, difficulty must increase in order, and Hard must still miss some shots. These measure actual paddle contact in the simulation, not human win rates.

The paddle checks cover defaults and persistence, invalid selections and blocked storage, selection in all three modes, pause/restart, private sprite mapping, Balanced equivalence to the supplied stroke across serves/swipes/frame rates, Spinny's threshold and cap, Speedy's pace multiplier, non-compounding CPU bonuses, equal-probability selection, independent choices through all five Finals rounds, and effects on actual ball velocity and curvature. No browser was connected; browser appearance, real pointer/touch interaction and audio remain unverified. A browser pass should check keyboard selection and visible focus, the narrow-screen selector, saved selection after reload, the selected artwork in play, and paddle feel with pointer and touch input.
