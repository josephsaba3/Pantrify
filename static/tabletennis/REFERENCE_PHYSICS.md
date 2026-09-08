# Reference physics comparison

This records the earlier comparison and tuning of Rally Eleven. The active game has since been replaced by the copied reference in `reference-game/`; see its README for the current baseline.

Inspected the user's `C:\Users\josep\Downloads\Downloads.zip` on 2026-09-08 without executing its scripts.

The game code is bundled after the libraries in `Table Tennis World Tour_files/a_data/TweenMax.min_0op3.js`. The saved `app_0op3.js`, Howler, and VisibilityManager files contain empty placeholders. `gameapi_0op3.js` handles the platform API and loading. The relevant bundled classes are `Elements.UserBat`, `Elements.EnemyBat`, and `Elements.Ball`.

## What the reference does

- `UserBat.update`: moves directly to the pointer target, with a forward movement limit. `getHitData` measures the latest displacement over frame time.
- `UserInput.move` and `resizeCanvas`: convert the pointer into a logical canvas whose shorter dimension is bounded to 500-700 pixels. There is no player-paddle easing in `UserBat.update`; its tilt follows horizontal court position rather than switching with swipe direction.
- `UserBat.getHitData`: clamps horizontal input at 3,500 pixels/second and upward input at 4,500 pixels/second. Upward input controls a shot-speed parameter from 0.3 to 0.6. Sideways movement controls aim and sidespin, with strong forward movement suppressing sidespin. Those speed values are dimensionless game parameters, not metres/second.
- Aim combines stroke direction with the ball's contact position. The outgoing target can extend past a sideline, so placement can miss.
- Ordinary lateral movement steers without spin. Sidespin begins only above half the clamped horizontal speed range, with a forward stroke further reducing it. This distinction matters for precise placement.
- `Ball.setBouncePoint` and `Ball.update`: use target-based travel time, a separate height arc, and a bounded lateral curve contribution. Their coordinate system differs from Rally Eleven's velocity/gravity simulation; copying the numeric speed range would not reproduce the same pace.
- Player contact checks visible overlap after a legal bounce across the player's half. It uses a generous rectangular contact area. Table bounces require the ball centre to be within the tabletop bounds; the reference does not model the finite-ball edge/corner grazes now supported here.

## Applied to Rally Eleven

`MatchEngine.playerReturn` now separates forward power from sideways brushing. Stronger upward strokes reach a soft power plateau; faster lateral strokes increase spin without increasing forward pace. Diagonal strokes trade sidespin for forward power. Existing topspin, backspin, slice depth, viewport-normalized input, and swept paddle contact remain part of the original implementation.

Following the user's mouse/trackpad feedback, mouse horizontal travel is reduced to 72% while touch remains direct. This sensitivity adjustment is our tuning choice, not a copied reference constant. Gentle strokes now steer without adding sidespin, small corrections cannot inherit the preceding stroke's speed, and rim contact has less influence on aim. The bat faces its court position with a small movement contribution. These changes target precise continuous placement without adding movement lag.

The independent total-speed ceiling also applies during flight and after bounces. Wide placement, reachable sidelines, finite-ball edge contact, correct out-ball scoring, and spin-aware opponent forecasting address the user's other reported issues.

Regression checks cover power/brush separation, the diagonal tradeoff, bounded extreme input, hard-shot defence, and edges/misses. The source comparison and logic checks do not constitute a live browser or device playtest; no browser was connected for this pass.
