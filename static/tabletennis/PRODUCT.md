# Product

## Current direction

Use the user's supplied Table Tennis World Tour game as the working base, then build further changes on it. This follows the user's explicit request to copy the reference after the independently tuned version still felt different.

## Runtime

A static local copy in `reference-game/`. Root `index.html` opens its entry page. The source game bundle, images, and audio are local. `local-platform.js` supplies hosting callbacks and namespaced browser storage.

## Game modes

The main flow is Play, choose country, choose World mode or Finals system, then choose Easy, Medium, or Hard. World mode preserves the original tour and saved progress; the selected difficulty controls the opponent independently of the tour's round.

Finals system is a 32-country single-elimination competition: round of 32, round of 16, quarterfinals, semifinals, final. The draw includes the selected country and 31 distinct opponents from the original available countries. The player plays their own matches; other matches are simulated when each round finishes. Five wins make the player champion. One loss eliminates the player and completes the remaining draw so its champion and results can be shown.

Finals saves each country's draw and completed matches separately for each difficulty and separately from World progress. An uncompleted match restarts after quitting or reloading. Completed tournaments remain viewable, with an action to start a new finals draw. Earlier saves without a difficulty resume under Easy, preserving their bracket and results.

Easy, Medium, and Hard vary only the opponent: reaction delay, movement and recovery speed, placement accuracy under pressure, tactical returns into open space, return pace, and spin. Easy leaves more time and room for mistakes; Hard recovers and places the ball more effectively but has finite movement and shot-speed limits. A Finals draw keeps its difficulty across all rounds. World difficulty can be changed by returning through the mode selector, without resetting tour progress.

Keep the copied game's player paddle movement, aiming, shot-speed cap, spin response, ball physics, and match rendering as the baseline. Matches retain first-to-11, win-by-two scoring and the source's 99-point cap.

The source is the supplied `Downloads.zip`; missing media was restored from the same public game's CDN. Origin and hashes are recorded in `reference-game/source-manifest.json`. The original bundle and assets retain their source identity.

## Previous work

The custom Rally Eleven game remains available through `rally-eleven.html`, with its earlier product brief preserved in `RALLY_ELEVEN_PRODUCT.md`. The active game is the copied reference, not that earlier implementation.

## Verification limits

Source/asset integrity, country/mode routing, World matches, finals draws and results, five-win championships, elimination, saved progress, World isolation, pause/restart/quit, and storage fallback were checked with the copied code in a simulated DOM. Live browser input, rendering, and audio remain unverified because no browser was connected.
