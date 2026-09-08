---
name: Rally Eleven
description: A compact, touch-first championship venue for high-stakes table tennis.
colors:
  tournament-navy: "#071b27"
  raised-navy: "#0d2b38"
  panel-navy: "#0b2a37"
  table-green: "#176a66"
  court-beech: "#c98d58"
  bone: "#f5eddb"
  signal-orange: "#ff5a36"
  signal-orange-hover: "#ff7658"
  rally-yellow: "#ffcb54"
  ink: "#09202b"
  cool-muted: "#bdd0d2"
  selected-red: "#8e2f20"
typography:
  display:
    fontFamily: "Archivo Variable, sans-serif"
    fontSize: "clamp(2.55rem, 6vw, 5.75rem)"
    fontWeight: 880
    lineHeight: 0.87
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Archivo Variable, sans-serif"
    fontSize: "clamp(2.5rem, 5vw, 5rem)"
    fontWeight: 880
    lineHeight: 0.87
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Archivo Variable, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 860
    lineHeight: 1
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Public Sans Variable, Helvetica Neue, sans-serif"
    fontSize: "clamp(0.84rem, 1.4vw, 1.05rem)"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Public Sans Variable, Helvetica Neue, sans-serif"
    fontSize: "0.68rem"
    fontWeight: 760
    lineHeight: 1.25
    letterSpacing: "0.1em"
  score:
    fontFamily: "Archivo Variable, sans-serif"
    fontSize: "2rem"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "normal"
  hit-readout:
    fontFamily: "Public Sans Variable, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "normal"
  control:
    fontFamily: "Archivo Variable, sans-serif"
    fontSize: "1rem"
    fontWeight: 800
    letterSpacing: "-0.01em"
  brand:
    fontFamily: "Archivo Variable, sans-serif"
    fontSize: "clamp(1.05rem, 2.2vw, 1.65rem)"
    fontWeight: 850
    lineHeight: 1
    letterSpacing: "-0.035em"
rounded:
  badge: "3px"
  panel: "4px"
  control: "6px"
  overlay: "8px"
  round: "50%"
spacing:
  hairline-gap: "4px"
  compact: "8px"
  control: "12px"
  cluster: "18px"
  panel: "24px"
  broad: "32px"
components:
  primary-action:
    backgroundColor: "{colors.signal-orange}"
    textColor: "#241006"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "12px 22px"
    height: "46px"
  primary-action-hover:
    backgroundColor: "{colors.signal-orange-hover}"
  secondary-action:
    backgroundColor: "#0b2b38"
    textColor: "{colors.bone}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
    height: "46px"
  difficulty-option:
    backgroundColor: "rgba(8, 31, 42, 0.88)"
    textColor: "#d8e4e4"
    rounded: "{rounded.panel}"
    padding: "10px"
    height: "62px"
  difficulty-option-selected:
    backgroundColor: "{colors.selected-red}"
    textColor: "#fff6ef"
    rounded: "{rounded.panel}"
  score-ribbon:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    height: "52px"
    width: "min(620px, calc(100% - 150px))"
  bracket-match:
    backgroundColor: "{colors.panel-navy}"
    textColor: "#b9ccce"
    rounded: "{rounded.panel}"
  serve-ticket:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.ink}"
    rounded: "{rounded.overlay}"
    padding: "22px 26px"
    width: "min(360px, calc(100% - 40px))"
  square-control:
    backgroundColor: "{colors.panel-navy}"
    textColor: "{colors.bone}"
    rounded: "{rounded.panel}"
    height: "44px"
  cup-badge:
    backgroundColor: "{colors.rally-yellow}"
    textColor: "{colors.ink}"
    rounded: "{rounded.round}"
    size: "74px"
  brand-lockup:
    textColor: "{colors.bone}"
    typography: "{typography.brand}"
---

# Design System: Rally Eleven

## Overview

**Creative North Star: "The Compact Championship"**

The Compact Championship turns every viewport into a small, credible tournament venue. The game borrows the clarity and hierarchy of televised sport—score ribbon, seeded draw, court lines, officiating labels—without pretending to be a simulation or imitating a licensed broadcast package.

The rally is the visual hero. In play, the Canvas 2D court fills the screen from the player’s eye line, the near paddle owns the lower third, and interface chrome compresses into a taut band at the top. Away from the rally, the same navy, bone, orange, and ruled geometry make difficulty selection, bracket progression, and results feel like parts of one championship.

The system is athletic, direct, and deliberately compact: condensed Archivo delivers the calls, Public Sans carries explanation, warm court materials keep the dark arena human, and small high-contrast signals make current state unmistakable. All shipped visuals are CSS or Canvas 2D; texture, atmosphere, and depth come from geometry, tonal layering, and restrained shadow rather than raster decoration.

**Key Characteristics:**

- Full-bleed, player-eye court composition with the paddle, ball, and contact trail as the signature interaction.
- Deep tournament navy and bone broadcast surfaces grounded by a sea-green table and warm beech floor.
- Condensed athletic display type paired with a plain, highly legible interface sans.
- Taut rectangular panels, fine rules, circular seals, and small enamel-like competitor marks.
- Signal orange for player agency and decisive state; rally yellow for ball, focus, scores, and brief feedback.
- Mobile-first safe-area handling, short-landscape compression, and portrait fallbacks that preserve the competition structure.

## Colors

The palette feels like an evening club championship: dark architectural navy, a sea-green playing surface, warm wood, bone score stock, and two bright officiating signals.

### Primary

- **Signal Orange** (`colors.signal-orange`): Marks the player paddle, primary actions, the brand slash, serving indicator, active bracket outline, and selected-choice edge. Its hover state uses `colors.signal-orange-hover`.
- **Selected Club Red** (`colors.selected-red`): Gives a chosen difficulty enough body to read as locked in without turning the whole interface orange.

### Secondary

- **Table Sea Green** (`colors.table-green`): Owns the court plane and the win field on results, keeping play visually distinct from interface chrome.

### Tertiary

- **Warm Beech Court** (`colors.court-beech`): Humanizes the arena floor and separates the physical venue from the dark stands.
- **Rally Yellow** (`colors.rally-yellow`): Identifies the ball, keyboard focus, point calls, match-score chips, cup badge, and contact flash.

### Neutral

- **Tournament Navy** (`colors.tournament-navy`): The permanent app field and dark-room atmosphere.
- **Raised Navy** (`colors.raised-navy`): Sticky strips and elevated structural bands.
- **Panel Navy** (`colors.panel-navy`): Bracket cards, match tools, and the nearer dark geometry inside the arena.
- **Bone Score Stock** (`colors.bone`): Headlines, score ribbons, modal tickets, and high-priority information surfaces.
- **Broadcast Ink** (`colors.ink`): Text and linework on bone or yellow surfaces.
- **Cool Muted Type** (`colors.cool-muted`): Orientation notes, tournament metadata, and supporting labels on navy.

**The Orange Earns the Whistle Rule.** Signal orange belongs to player agency or a decisive state; do not use it as general decoration or a large background field.

**The Bone Carries the Score Rule.** Bone surfaces are reserved for high-salience broadcast information over the dark arena, especially scoring and interruption overlays.

## Typography

**Display Font:** Archivo Variable (with sans-serif fallback)

**Body Font:** Public Sans Variable (with Helvetica Neue and sans-serif fallbacks)

**Character:** Archivo is compressed, heavy, and competitive without becoming ornamental. Public Sans stays neutral and readable, allowing instructions and opponent information to recede behind the rally.

### Hierarchy

- **Display** (`typography.display`): Home and result declarations; tightly tracked, extremely heavy, and balanced into short lines.
- **Headline** (`typography.headline`): Championship draw and other major tournament headings at a slightly calmer scale.
- **Title** (`typography.title`): Serve calls, pause titles, and compact panel statements.
- **Body** (`typography.body`): Explanations and result summaries; keep line lengths near the implemented 38–57 character range.
- **Label** (`typography.label`): Uppercase tournament metadata, round names, field legends, and stamps with deliberate tracking.
- **Score** (`typography.score`): Tabular scoreboard numerals and other compact competitive figures.
- **Control** (`typography.control`): Heavy condensed action labels at the inherited interface size.
- **Brand** (`typography.brand`): Responsive condensed wordmark with tightly drawn letter spacing.

**The Two Voices Rule.** Archivo calls the match—identity, headlines, controls, labels, and scores—while Public Sans explains it. Do not add a third typographic personality.

## Layout

Every principal surface fills the viewport height (`100svh`) and is clipped to a minimum playable size of 320px. Gameplay and the home attract scene use an absolutely positioned, full-bleed canvas; touch interaction belongs directly to that plane.

The home screen is a court with a readable broadcast scrim, not a card placed over decorative art. Wide screens use a left editorial column capped at roughly half the viewport, while narrow screens change the scrim to a vertical fade and anchor the content near the bottom. Difficulty choices remain a single four-choice row on narrow screens, expand to two columns when descriptions fit, and keep the primary entry action close to the selection.

The tournament bracket uses three proportional columns in landscape, with ruled connectors joining quarterfinal, semifinal, and final. At the portrait breakpoint, the rounds stack and connectors disappear rather than tangling. The next-match strip remains anchored to the bottom edge with the opponent on one side and the decisive action on the other.

The match canvas is always the largest layer. A narrow score ribbon sits along the top with utility controls to its right; the near paddle dominates the lower third and the projected table converges toward the opponent. Short landscape screens compress headers, tiles, typography, and vertical gaps instead of shrinking the touch model. All outer chrome respects safe-area insets.

**The Rally Owns Landscape Rule.** Compress chrome before court space; the ball, table, and controllable paddle must remain immediately readable on a short phone viewport.

## Elevation & Depth

The interface is mostly planar, but not flat. Depth is structural: bone tickets and the score ribbon lift clearly above the live court, the next-match strip separates from a scrolling draw, and the primary action gains a warm, low shadow. Bracket cards receive only a modest ambient lift. Inside the canvas, object shadows, perspective taper, floor rules, and paddle overlap make the venue dimensional without raster texture or simulated material gloss.

### Shadow Vocabulary

- **High Broadcast Lift** (`0 18px 44px rgba(2, 13, 18, 0.34)`): Score ribbon, serve ticket, and pause panel over live play.
- **Primary Action Lift** (`0 10px 24px rgba(91, 22, 10, 0.28)`): Orange primary action at rest; hover deepens it to `0 13px 30px rgba(91, 22, 10, 0.34)` and raises the control by one pixel.
- **Bracket Card Lift** (`0 8px 24px rgba(2, 13, 18, 0.2)`): Low separation for entrant cards against tournament navy.
- **Sticky Strip Lift** (`0 -14px 30px rgba(2, 13, 18, 0.26)`): Upward separation for the next-match strip.

**The Lift Only What Interrupts Rule.** Strong elevation belongs to score, serve, pause, and decisive action layers; ordinary tournament structure stays close to the navy field.

## Shapes

The default form language is taut and broadcast-like. Stamps use the tightest corners, cards and score panels use compact corners, controls are slightly more forgiving, and modal tickets carry the softest rectangular edge. Borders are fine and cool-toned; active items change border color instead of swelling or glowing.

Circles have specific jobs: the Eleven Cup seal, competitor status marks, serving dot, ball, paddle face, and contact ring. They do not become generic pill containers. The projected table trapezoid, horizontal net, ruled floor, and bracket connectors are the recurring geometric signatures.

**The Squared Broadcast Rule.** Keep structural UI within the badge-to-overlay radius range; reserve full circles for sport objects, status marks, and the cup seal.

## Components

### Brand Lockup

- **Character:** A compact, condensed wordmark with the double slash acting as a signal-orange match mark.
- **Type:** Very heavy Archivo with tight negative tracking and a single-line baseline.
- **Behavior:** Links home where navigation is meaningful; never decorate it with a surrounding badge or card.

### Buttons

- **Shape:** Direct rectangular controls with a gently eased edge (`rounded.control`) and a minimum implemented height of 46px.
- **Primary:** Signal-orange field, dark warm text, heavy condensed label, and compact horizontal padding (`components.primary-action`).
- **Hover / Focus / Active:** Hover brightens and lifts one pixel, active presses down one pixel, and keyboard focus uses a three-pixel rally-yellow outline with offset.
- **Secondary:** Dark navy with a cool rule and bone label; it supports rather than competes with the orange action.
- **Text:** Transparent, underlined, and deliberately sparse for home, back, and forfeit actions.

### Difficulty Options

- **Character:** Four concise competitive tiers that read as equipment-panel choices rather than promotional cards.
- **Default:** Translucent navy field, cool border, bone-leaning text, compact corners, and a minimum 62px height at full layouts.
- **Selected:** Club-red fill with signal-orange border and warm-white text; the semantic state is also carried by `aria-pressed` and the visible summary.
- **Responsive:** Descriptions appear only when the layout has room; the summary directly below the set preserves the selected tier’s meaning on compact screens.

### Score Ribbon

- **Character:** A narrow bone broadcast bar floating above the match, with mirrored competitors, large tabular scores, and a centered round/rule cell.
- **Structure:** Three columns, compact corners, fine cool border, and strong broadcast lift (`components.score-ribbon`).
- **State:** A signal-orange dot beneath the active side marks service while names and score placement keep meaning independent of color.

### Bracket Matches

- **Character:** Dense two-row entrant cards connected by tournament rules, designed to show a full eight-player draw at landscape-phone width.
- **Default:** Panel navy, thin cool border, compact corners, competitor mark, name, and seed.
- **State:** The live match receives an orange outline; winners receive a lighter navy row; pending matches use a dashed border and explicit “To be decided” copy.

### Serve and Pause Tickets

- **Character:** Bone officiating cards that temporarily interrupt the court without replacing it.
- **Structure:** Centered, compact, and lifted; eyebrow, decisive Archivo call, primary action, and one short instruction form a strict vertical stack.
- **Behavior:** The serve ticket appears once at the opening of each match; later rallies restart automatically after the point call. Pause remains available throughout play.
- **Motion:** The serve layer fades through opacity and visibility; reduced-motion preferences collapse that transition to effectively instant.

### Match Tools

- **Character:** Small squared SOUND and PAUSE controls that sit outside the score ribbon while sharing its top alignment.
- **Structure:** Panel navy, cool border, bone uppercase label, compact corners, and a 44px height.
- **Behavior:** Text changes explicitly between SOUND ON and SOUND OFF; controls remain usable without icons or color inference.

### Cup Badge

- **Character:** A warm enamel-like championship seal that turns the number eleven into a tournament mark.
- **Structure:** Circular rally-yellow field, double bone/yellow ring, centered condensed numerals, and tightly tracked CUP label.
- **Responsive:** Shrinks as a complete unit on phone and short-landscape layouts; do not crop or split the mark.

### Court Renderer

- **Character:** Original Canvas 2D arena geometry: dark stands, repeating spectator bays, warm ruled floor, perspective sea-green table, opaque navy net, tactile paddles, and a luminous yellow ball.
- **Depth:** Perspective scaling, a ball shadow anchored to the table plane, overlap, and a short 280ms ball trail establish speed and space. Shadow separation shows ball height.
- **Feedback:** The player paddle is signal orange, the opponent paddle is deep teal, and player contact adds a brief rally-yellow expanding ring at the ball's impact position.
- **Control and contact:** Shared court geometry keeps input, the drawn paddle, and player contact aligned. Mouse/trackpad input maps horizontal displacement from the court centre at 72% gain, giving finer control without follow delay; the paddle replaces the mouse cursor over the court. Touch retains direct tracking. Both retain sideline reach. Paddle tilt follows court position with only a small motion contribution, so tiny reversals do not flip the face. Incoming balls become hittable after one bounce on the player's side; contact follows the visible face and ball size rather than a hidden near-edge depth window. Each sampled swipe segment is retained, and stroke direction at impact determines spin.
- **Spin:** A dark seam rotates on the ball with stroke spin. The visual rotation is slowed for legibility; reduced-motion preferences keep the seam static while preserving the ball's physical trajectory. Side brushes curve in flight and kick sideways on the bounce; upward drives dip and accelerate through the bounce, while undercuts trade pace for a shorter, slower return. Contact-ring strength follows shot pace.
- **Shot response:** Both stroke axes use the same screen-distance scale, normalized to the viewport's shorter edge. Forward movement supplies power, which levels off at a firm swipe. Gentle sideways movement aims flat returns; sidespin starts with a deliberate brush and ramps continuously. Slowing the paddle takes effect immediately, without carrying old stroke strength into a small correction. Aim combines ball location and lateral stroke speed, with a small rim-contact deflection. A strong forward component reduces sidespin, so diagonal strokes cannot combine full curve with smash pace. Forward launch pace is capped at 5.5 game units per second and total ball speed at 6.2, including flight curvature and bounce kicks. Passive blocks retain some incoming pace and spin. Low contact receives net-clearance assistance; high contact allows the fastest capped smashes.
- **Edges and defence:** Aim can reach beyond the sidelines, making line shots and placement errors possible. Swept sphere contact distinguishes the table surface, top-edge/corner grazes, and clear misses. A legal edge bounce followed by a missed return awards the hitter; an unbounced long or wide ball awards the receiver. Both players can reach past the usual table edges. Opponents forecast the same capped flight and spin-dependent bounce as the live ball, with their existing reaction time, movement speed, and consistency limits.
- **Hit readout:** A compact navy strip below the top controls shows the player's last shot type, speed, and spin. It updates only on contact, stays clear of the court center, and does not intercept pointer input.

## Do's and Don'ts

### Do:

- **Do** keep the court or tournament structure visible from the first viewport; this is a championship experience, not a menu-first shell.
- **Do** preserve the full-bleed player-eye court, top score ribbon, and lower-third paddle hierarchy in match play.
- **Do** use orange for player agency and decisive state, yellow for focus and momentary rally feedback, and explicit text or position alongside both.
- **Do** keep touch targets legible, honor safe-area insets, and retain the short-landscape and portrait adaptations.
- **Do** build atmosphere with CSS and Canvas 2D geometry, tonal layers, fine rules, and restrained shadow.

### Don't:

- **Don't** replace the court-led composition with a stack of floating rounded cards or a generic casual-game dashboard.
- **Don't** introduce a third font, soft lifestyle typography, or wide airy display spacing that weakens the athletic cadence.
- **Don't** spread signal colors across decorative backgrounds; their scarcity is what makes match state immediate.
- **Don't** round structural panels into pills; full circles belong to sport objects, state marks, and the cup seal.
- **Don't** add raster textures, stock sports imagery, or licensed broadcast motifs to a visual world built from original geometry.
