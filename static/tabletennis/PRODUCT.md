# Product

## Current direction

Use the user's supplied Table Tennis World Tour game as the working base, then build further changes on it. This follows the user's explicit request to copy the reference after the independently tuned version still felt different.

## Runtime

A static local copy in `reference-game/`. Root `index.html` opens its entry page. The source game bundle, images, and audio are local. `local-platform.js` supplies hosting callbacks and namespaced browser storage.

## Game modes

The title offers Play and Stats. Play asks for a country on first use, or reuses the saved country, then opens World mode, Finals system, or CPU Handicap and the Easy, Medium, Challenging, or Hard difficulty choices. Change country remains available in the mode chooser. World mode preserves the original tour and saved progress; the selected difficulty controls the opponent independently of the tour's round.

Finals system is a 32-country single-elimination competition: round of 32, round of 16, quarterfinals, semifinals, final. The draw includes the selected country and 31 distinct opponents from the original available countries. The player plays their own matches; other matches are simulated when each round finishes. Five wins make the player champion. One loss eliminates the player and completes the remaining draw so its champion and results can be shown.

Finals saves each country's draw and completed matches separately for each difficulty and separately from World progress. An uncompleted match restarts after quitting or reloading. Completed tournaments remain viewable, with an action to start a new finals draw. Earlier saves without a difficulty resume under Easy, preserving their bracket and results.

CPU Handicap is a five-stage comeback challenge. The player starts at 0 while the CPU starts at 6, then 7, 8, 9, and 10 after successive player wins. A loss stays on the same stage. The same CPU country and selected difficulty persist for the run. Five wins complete the challenge, with an action to play again. Progress and completed scores save per country and difficulty, separately from World and Finals. Restarting or leaving an unfinished match returns to its original head start. First-to-11, win-by-two scoring applies throughout, including the 0-10 stage.

Easy, Medium, Challenging, and Hard vary only the opponent: reaction delay, movement and recovery speed, placement accuracy under pressure, tactical returns into open space, return pace, and spin. Easy leaves more time and room for mistakes. All four levels have stronger reaction, movement, recovery, placement, pace and spin settings; Challenging sits closer to Hard to soften the final step. Hard recovers and places the ball more effectively but has finite movement and shot-speed limits. Opponents correct their forecast after the bounce and brake near the ball. Every level can send occasional returns long or wide, more often when stretched and less often at higher levels; real missed shots feed the unforced-error statistic. A Finals draw keeps its difficulty across all rounds. World difficulty can be changed by returning through the mode selector, without resetting tour progress.

Keep the copied game's player paddle movement, aiming, shot-speed cap, spin response, ball physics, and match rendering as the baseline. Matches retain first-to-11, win-by-two scoring and the source's 99-point cap.

The source is the supplied `Downloads.zip`; missing media was restored from the same public game's CDN. Origin and hashes are recorded in `reference-game/source-manifest.json`. The original bundle and assets retain their source identity.

## Match and player stats

Every completed player match opens an opponent comparison before continuing the current mode. It shows both countries and the final score, points won, aces, points won on serve and return, unforced errors, match points saved, and longest and average rally length in returns. Average rally length is total returns divided by actual points played. An ace is a legal serve the receiver does not touch. Unforced errors count shots into the net or out, excluding missed returns. A match point saved is a point won when the opponent could have won the match. Between points, a banner names who holds match points and how many remain for up to four seconds; it clears when the serve starts, on pause or on exit.

Stats on the title shows completed matches, wins, losses, win rate, cumulative player/opponent figures and longest and average rally length across every mode, country and difficulty. The all-time rally average is weighted across recorded points. Aces count from the addition of ace tracking; older saves retain all previous stats with zero historical aces. Totals begin with this update; older results, simulated Finals matches and unfinished or restarted attempts do not contribute. CPU Handicap free starting points are excluded from points won and rally averages but remain part of the final score. Totals save in this browser's localStorage, with session-only fallback when storage is blocked or writes fail.

## Previous work

The custom Rally Eleven game remains available through `rally-eleven.html`, with its earlier product brief preserved in `RALLY_ELEVEN_PRODUCT.md`. The active game is the copied reference, not that earlier implementation.

## Verification limits

Source/media smoke and feature checks use a simulated DOM and canvas. They cover navigation, scoring and statistics, progression, persistence, unfinished-match handling and storage fallback. Live browser input, rendering, touch and audio remain unverified because no browser was connected.
