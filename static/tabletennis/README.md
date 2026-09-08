# Table Tennis

The working base is now a local copy of the supplied **Table Tennis World Tour** game.

Open [index.html](index.html), which goes directly to [reference-game/index.html](reference-game/index.html). Everything required for the single-language game is local: its original game bundle, graphics, and audio. No server, Node installation, or build step is needed to play.

The original paddle movement, aiming, ball physics, and match rendering are retained. A local hosting adapter supplies the callbacks and storage previously provided by the portal. New menu and tournament scripts add the finals flow without modifying the supplied bundle.

## Game flow

Press Play, choose your country, choose **World mode** or **Finals system**, then choose **Easy**, **Medium**, or **Hard**.

- World mode keeps the original tour and its saved progress.
- Finals draws 32 distinct countries, including yours, into a single-elimination bracket: round of 32, round of 16, quarterfinals, semifinals, final.
- Win five matches to become champion. Matches use the original first-to-11, win-by-two scoring (including its 99-point cap). Other countries' matches are simulated after each round.
- Your bracket and completed results save automatically for each country and difficulty. Choosing the same level resumes that draw. A loss ends your run and completes the rest of the bracket; after a win or elimination you can start a new draw.
- Quitting a paused finals match returns to the bracket; that uncompleted match can be replayed. Reloading also restarts an uncompleted match.

Difficulty applies to both modes. Easy gives the opponent slower reactions, gentler returns, less spin, and larger placement errors when stretched. Medium adds speed and variation. Hard reacts and recovers faster, covers more ground, uses stronger spin, and aims more often away from the player's current position. Its movement and shot speeds remain capped; it can still miss.

Player paddle movement, shot power limits, and ball physics are unchanged. World tour progress is shared across difficulty choices; Finals keeps each level separate. Existing finals saves from before this feature resume under Easy with the same draw and completed results.

## Files to build on

- [reference-game/game.js](reference-game/game.js): copied game and library bundle; identical to the supplied source at the start of this baseline.
- [reference-game/local-platform.js](reference-game/local-platform.js): local platform callbacks and separate saved progress.
- [reference-game/game-modes.js](reference-game/game-modes.js): country/mode navigation and finals integration.
- [reference-game/difficulty.js](reference-game/difficulty.js): opponent profiles, reactions, movement, return placement, pace, and spin.
- [reference-game/finals-tournament.js](reference-game/finals-tournament.js): 32-country draw, results, progression, and save validation.
- [reference-game/game-modes.css](reference-game/game-modes.css): responsive mode chooser and full bracket.
- [reference-game/index.html](reference-game/index.html): the local entry page.
- `reference-game/images/` and `reference-game/audio/`: restored original media.
- [reference-game/source-manifest.json](reference-game/source-manifest.json): source locations and hashes.
- `reference-game/supplied/`: the untouched ZIP contents.

See [reference-game/README.md](reference-game/README.md) for restoration details.

## Checks

Run `node reference-game/verify.cjs` if Node is available. It checks the source bundle hash, all 18 media hashes, loaded sprite bounds, country-to-mode-to-World flow, rally scoring, pause/resume, and unavailable-storage handling at desktop, portrait, and landscape sizes.

Run `node reference-game/finals.test.cjs` for 12 finals checks covering unique 32-country draws, five wins, elimination in every round, saved/reloaded progress, invalid saves, World isolation, pause/restart/quit, duplicate results, immediate next-round transitions, and storage write failures.

Run `node reference-game/difficulty.test.cjs` for 9 difficulty checks covering both modes at three viewport sizes, per-level saves, legacy migration, reaction timing at 30/60/144 FPS, motion limits, shot pace/spin/placement, unchanged player strokes, and real ball-to-opponent contact in a seeded 30-shot comparison. That comparison is a regression scenario, not a player win-rate estimate.

These checks run against a simulated DOM and canvas. They do not verify live browser input, rendering, or audio playback. No browser was connected during implementation. Saved progress requires browser storage; when unavailable, the game supports the current session only.

## Previous version

The earlier custom Rally Eleven game is preserved at [rally-eleven.html](rally-eleven.html). Its `src/`, `assets/`, and `tests/` remain available. Its documentation is preserved in [RALLY_ELEVEN.md](RALLY_ELEVEN.md), [RALLY_ELEVEN_DESIGN.md](RALLY_ELEVEN_DESIGN.md), and [RALLY_ELEVEN_PRODUCT.md](RALLY_ELEVEN_PRODUCT.md).
