# Table Tennis

The working base is now a local copy of the supplied **Table Tennis World Tour** game.

Open [index.html](index.html), which goes directly to [reference-game/index.html](reference-game/index.html). Everything required for the single-language game is local: its original game bundle, graphics, and audio. No server, Node installation, or build step is needed to play.

The original paddle movement, aiming, ball physics, and match rendering are retained. A local hosting adapter supplies the callbacks and storage previously provided by the portal. New menu and competition scripts add Finals and CPU Handicap without modifying the supplied bundle.

The first mouse press, tap or Enter/Space activation anywhere in the game requests browser fullscreen on supported browsers. Requests run before the canvas handles the input and retry on a later gesture if rejected. Firefox and other browsers require a user gesture, so a fresh page load alone cannot force fullscreen. The title also has a Full screen / Exit full screen toggle. Fullscreen includes the entire game, so menus, results and the court stay together; Escape exits and resizes the game without automatically re-entering. Play continues normally if fullscreen is blocked or unsupported, and the title toggle remains available to retry where supported.

## Game flow

The title offers **Play** and **Stats**. Press Play, choose your country on first use, choose **World mode**, **Finals system**, or **CPU Handicap**, then choose **Easy**, **Medium**, **Challenging**, or **Hard**. Later visits reuse your saved country; Change country remains available in the mode chooser.

- World mode keeps the original tour and its saved progress.
- Finals draws 32 distinct countries, including yours, into a single-elimination bracket: round of 32, round of 16, quarterfinals, semifinals, final.
- Win five matches to become champion. Matches use the original first-to-11, win-by-two scoring (including its 99-point cap). Other countries' matches are simulated after each round.
- Your bracket and completed results save automatically for each country and difficulty. Choosing the same level resumes that draw. A loss ends your run and completes the rest of the bracket; after a win or elimination you can start a new draw.
- Quitting a paused finals match returns to the bracket; that uncompleted match can be replayed. Reloading also restarts an uncompleted match.

CPU Handicap is a five-stage comeback challenge against one CPU opponent. You start each match at 0; the CPU starts at 6, then 7, 8, 9, and 10 as you win. A loss keeps the same stage available to retry. Clearing 0-10 completes the challenge and unlocks Play again. Normal win-by-two scoring applies, so the last stage needs at least a 12-10 win. Progress saves separately for each country and difficulty, independently of World and Finals. Restarting or quitting a paused match lets you replay its original head start.

Difficulty applies to all three modes. Easy gives the opponent slower reactions, gentler returns, less spin, and larger placement errors when stretched. Medium adds speed and variation. All four levels now react sooner, move and recover faster, and use more pace, spin and open-space placement. Challenging sits closer to Hard, with a smaller final step in movement, accuracy and shot strength. Hard reacts and recovers faster, covers more ground, uses stronger spin, and aims more often away from the player's current position. Its movement and shot speeds remain capped; it can still miss. Opponents correct their aim after the bounce and brake near the ball. Every level can occasionally send a return long or wide; mishits become less frequent at higher levels and more likely when stretched. Those shots use the normal physics and count as unforced errors when they lose the point.

Player paddle movement, shot power limits, and ball physics are unchanged. World tour progress is shared across difficulty choices; Finals keeps each level separate. Existing finals saves from before this feature resume under Easy with the same draw and completed results.

## Match and all-time stats

Every completed match shows the final score and an opponent comparison: points won, aces, points won on serve and return, unforced errors, match points saved, and longest and average rally length in returns. The rally average divides total returns by actual points played. An ace is a legal serve the receiver does not touch. Unforced errors count shots into the net or out, excluding missed returns. Match points saved count points won when the opponent could have won the match. Between points, a banner names who holds match points and how many remain for up to four seconds, clearing when the serve starts. Continue returns to the current mode.

Stats on the title adds matches played, wins, losses and win rate to cumulative player/opponent figures across every mode, country and difficulty, with an all-time rally average weighted across recorded points. Aces count from the addition of ace tracking; older saves retain all previous stats with zero historical aces. Totals begin with this update and include completed player matches only. Unfinished or restarted attempts and simulated Finals matches do not contribute; CPU Handicap free starting points are excluded from points won and rally averages, while remaining part of the final score. Stats save in this browser's localStorage, with session-only fallback when storage is blocked or writes fail.

## Files to build on

- [reference-game/game.js](reference-game/game.js): copied game and library bundle; identical to the supplied source at the start of this baseline.
- [reference-game/local-platform.js](reference-game/local-platform.js): local platform callbacks and separate saved progress.
- [reference-game/fullscreen.js](reference-game/fullscreen.js): browser fullscreen requests, title toggle state and resize handling.
- [reference-game/game-modes.js](reference-game/game-modes.js): country/mode navigation and finals integration.
- [reference-game/match-stats.js](reference-game/match-stats.js): match bookkeeping, match-point announcements and persistent player totals.
- [reference-game/difficulty.js](reference-game/difficulty.js): opponent profiles, reactions, movement, return placement, pace, and spin.
- [reference-game/finals-tournament.js](reference-game/finals-tournament.js): 32-country draw, results, progression, and save validation.
- [reference-game/handicap-challenge.js](reference-game/handicap-challenge.js): CPU head starts, five-stage progression, retries, and saved results.
- [reference-game/game-modes.css](reference-game/game-modes.css): responsive mode chooser and full bracket.
- [reference-game/index.html](reference-game/index.html): the local entry page.
- `reference-game/images/` and `reference-game/audio/`: restored original media.
- [reference-game/source-manifest.json](reference-game/source-manifest.json): source locations and hashes.
- `reference-game/supplied/`: the untouched ZIP contents.

See [reference-game/README.md](reference-game/README.md) for restoration details.

## Checks

Run `node reference-game/verify.cjs` if Node is available. It checks the source bundle hash, all 18 media hashes, loaded sprite bounds, country-to-mode-to-World flow, rally scoring, pause/resume, and unavailable-storage handling at desktop, portrait, and landscape sizes.

Run `node reference-game/finals.test.cjs` for 12 finals checks covering unique 32-country draws, five wins, elimination in every round, saved/reloaded progress, invalid saves, World isolation, pause/restart/quit, duplicate results, immediate next-round transitions, and storage write failures.

Run `node reference-game/difficulty.test.cjs` for 11 difficulty checks covering all four levels in all three modes at three viewport sizes, per-level saves, legacy migration, reaction timing at 30/60/144 FPS, motion limits, shot pace/spin/placement, unchanged player strokes, and real ball-to-opponent contact in a seeded 405-shot comparison covering recovery from both sides, both spin directions and faster/wider shots. The suite also verifies occasional CPU mishits and real ball flights that score opponent unforced errors. That comparison is a regression scenario, not a player win-rate estimate.

Run `node reference-game/handicap.test.cjs` for 11 CPU Handicap checks: five actual starting scores, wins/losses, deuce, completion, pause/restart/quit, saved progress, country/difficulty isolation, failed storage, World/Finals score isolation, and immediate next-stage transitions.

Run `node reference-game/match-stats.test.cjs` for checks covering title/Stats navigation, match comparisons, rally statistics, serve/return points, aces and legacy-save compatibility, net/out errors, match points and announcement timing, cumulative totals, Handicap exclusions, unfinished attempts, storage fallback and World continuation.

These checks run against a simulated DOM and canvas. They do not verify live browser input, rendering, touch or audio playback. No browser was connected during implementation. Saved progress requires browser storage; when unavailable, the game supports the current session only.

Run `node reference-game/fullscreen.test.cjs` for ten checks covering immediate requests from captured mouse/touch/keyboard gestures, retries, existing activation at startup, the title controls, duplicate requests, exit/Escape resizing, WebKit support and blocked/unsupported fullscreen. Browser fullscreen APIs are simulated; a live Firefox check remains outstanding.

## Previous version

The earlier custom Rally Eleven game is preserved at [rally-eleven.html](rally-eleven.html). Its `src/`, `assets/`, and `tests/` remain available. Its documentation is preserved in [RALLY_ELEVEN.md](RALLY_ELEVEN.md), [RALLY_ELEVEN_DESIGN.md](RALLY_ELEVEN_DESIGN.md), and [RALLY_ELEVEN_PRODUCT.md](RALLY_ELEVEN_PRODUCT.md).
