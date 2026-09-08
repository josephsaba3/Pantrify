# Rally Eleven

A phone-first table-tennis tournament game with direct paddle control, real first-to-11 scoring, four AI difficulty levels, and an eight-player knockout draw.

## Play locally

Open `index.html` in a browser. No Node installation, npm commands, build step, or local server is needed. Keep `index.html`, `src/`, and `assets/` together.

To play on a phone, upload `index.html`, `src/`, and `assets/` together to static website hosting and open that website. No application backend is required. Landscape orientation gives the largest playing area; portrait is supported for menus.

Progress is saved in this browser when local storage is available. If storage is blocked, the game still works, but progress only lasts for the current page session. A local file and a hosted URL have separate saves.

## Edit the game

Edit the JavaScript in `src/` and refresh the page. Styles are in `src/styles.css`; bundled fonts and their licenses are in `assets/`. The script order in `index.html` loads the game dependencies before the app. Each script keeps its internals private and shares its public functions through `window.RallyEleven`.

## Controls

- Drag the paddle directly with a finger, or move the mouse over the court. Mouse/trackpad control uses 28% less horizontal travel for finer placement, with no follow delay or drift. Touch stays directly under the finger. Both can reach the sidelines.
- Meet the incoming ball with the visible paddle face after it bounces on your side. The contact ring marks the impact position.
- Hold the paddle still for a controlled block; faster incoming balls retain more pace. Forward strokes hit harder, then power levels off. Ball speed stays capped during flight and after spin bounces.
- Move gently left or right to aim a flat return. Faster, deliberate sideways brushes add sidespin and a stronger curve and bounce while keeping forward pace close to a block. Small corrections use their own speed, even immediately after a fast stroke.
- Brush upward for a topspin drive; a fast upward stroke on a high ball produces a smash. Brush downward for a slower backspin return that lands shorter and checks its bounce. Diagonal swipes combine both kinds of spin, with stronger forward power reducing sidespin.
- Contact location and sideways stroke speed set a continuous aim, with only a small deflection from the paddle's rim. Brush toward the sideline to aim wider; controlled shots can catch the line, while outward swipes can go wide. A ball that grazes the top edge counts as a bounce. The shadow on the table helps you judge ball height.
- The last-hit readout shows shot type, ball speed in km/h, and spin in rpm. These are values from the game's arcade physics.
- Keyboard fallback: arrow keys move the paddle.
- Use **SND** to toggle generated sound and **Pause** to suspend a match.

## Tournament rules

- Eight-player single-elimination bracket.
- Quarterfinal, semifinal, and final.
- Each match is first to 11 and must be won by two points.
- Service changes every two points, then every point at deuce.
- A loss ends the current tournament run.

## Checks

Open `tests/index.html` in your browser. It runs scoring, difficulty, tournament, pointer-control, contact, stroke-power, and spin tests against the same JavaScript used by the game. Checks include desktop and phone geometry, equivalent swipe strength across screen sizes, coalesced and equal-timestamp input, quick reversals, curved swipes, cancellation, visible contact, shot placement, distinct drives and cuts, live rally progression, and playable returns at 30, 60, and 144 FPS. Speed and edge checks cover the full-flight speed ceiling, the forward-power/sidespin tradeoff, AI defence against hard strokes in all directions, reachable sidelines, finite-ball edge/corner grazes, wide misses, and long-shot scoring.

If Node is available, `node tests/run.cjs` runs the same logic tests without a browser. It does not verify browser rendering or real-device input; Node is still not required to play the game.

Mouse checks also cover small corrections after fast movement, continuous placement through nine gentle strokes, stable paddle tilt, stopping without drift, and reaching both sidelines with the reduced travel.

For a gameplay check, start a tournament, enter a match, serve, and compare a still-paddle block with slow and fast slices through contact. Try sideways, upward, downward, and diagonal swipes, then pause/resume. Check desktop, portrait phone, and landscape phone sizes. Reload to check that the tournament can be continued.

The original TypeScript source and Node configuration are retained in `.archive/before-static.zip` as a migration backup; this archive is not needed to play or publish.

The supplied Famobi reference code was inspected for mechanics. See [REFERENCE_PHYSICS.md](REFERENCE_PHYSICS.md) for the source locations and comparison.
