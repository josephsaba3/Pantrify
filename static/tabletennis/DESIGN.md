---
name: Table Tennis World Tour - local modes
description: Original game imagery with native title and stats screens, mode selection, a complete finals bracket and CPU Handicap progress.
colors:
  ink: "#182b4c"
  paper: "#f6f8fc"
  soft: "#c7d7ee"
  line: "#869fc3"
  gold: "#ffcf52"
  backdrop: "#263e67"
  match-surface: "#253e65"
  winner-surface: "#34557d"
typography:
  headline:
    fontFamily: '"Finals Archivo", Arial, sans-serif'
    fontSize: "clamp(28px, 4vw, 46px)"
    fontWeight: 800
    lineHeight: 1.1
  title:
    fontFamily: '"Finals Archivo", Arial, sans-serif'
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1.15
  body:
    fontFamily: '"Finals Archivo", Arial, sans-serif'
    fontSize: "16px"
    lineHeight: 1.45
  bracket:
    fontFamily: '"Finals Archivo", Arial, sans-serif'
    fontSize: "13px"
rounded:
  match: "7px"
  control: "8px"
  panel: "12px"
  mode: "16px"
spacing:
  small: "8px"
  inline: "12px"
  compact: "16px"
  panel: "20px"
  section: "24px"
  wide: "28px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 22px"
  button-quiet:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  mode-choice:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.mode}"
    padding: "28px"
  match-brief:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "20px"
---

# Design System: Table Tennis World Tour

## Overview

The active game is the supplied copy in [reference-game/](reference-game/). Extend its blue denim backdrop, country flags, map and trophy artwork faithfully. Country selection, tutorial, World tour, match and pause screens retain the copied canvas presentation. The native title reuses the original logo and bat artwork with Play and Stats actions. Country selection leads to mode selection, then Easy, Medium, Challenging or Hard. The added title, stats, mode and difficulty choosers, Finals bracket and CPU Handicap progress page use the established navy, gold and Archivo system with the same game imagery.

The implementation authority is [game-modes.css](reference-game/game-modes.css) and [game-modes.js](reference-game/game-modes.js). This document captures their current styles; the tokens above describe the new HTML menus, not a replacement theme for the canvas. The source bundle and media remain unchanged. Visual and input verification in a live browser is still outstanding; the recorded checks use a simulated DOM and canvas.

## Colors

Gold marks the main play action, current round, next match and the player's team label. Cream paper surfaces carry navy text for the mode choices and next-match summary. Navy supports the bracket and quieter navigation; pale blue supplies borders, pending teams and scrollbars. Completed winners use the lighter winner surface and heavier text.

Use the original [bgMain.jpg](reference-game/images/bgMain.jpg) over the backdrop color, centered and covering the viewport. The flag and interface atlases supply the visual identity of each country and mode.

## Typography

The HTML menus load the local [Archivo variable font](assets/fonts/archivo-latin-wght-normal-E0tuGl4L.woff2) as `Finals Archivo`, with Arial and sans-serif fallbacks. Headings and mode names are heavy; supporting copy uses the body setting. The mode title reduces to 23px on phones and 24px in short landscape viewports. Bracket scores use tabular numerals; round headings use 17px at weight 750.

Handicap starting-score digits use tabular numerals at 56px and weight 800, with a 1.1 line height. The mode-card preview reduces them to 36px on phones and in short landscape viewports. Stage starting scores use 28px tabular numerals at weight 800.

Keep explanatory copy brief: mode descriptions are limited to 30ch, difficulty descriptions to 42ch and the Finals summary to 65ch. Difficulty titles retain their 28px size at all widths. The original canvas typography continues to come from the copied game.

## Layout

The entry fills the viewport. Country selection leads to three mode choices; their centered container is at most 1120px wide with a three-column grid and a 24px gap. From 651px to 999px, the first two choices share a row and CPU Handicap spans the next row with its score preview beside its description. At 650px and below, the choices form one column and each places its artwork beside its label and description. Above that width, viewports no taller than 500px also use one column of compact horizontal choices. Outer padding accounts for safe areas; the menu itself scrolls.

The difficulty chooser is at most 760px wide with four stacked choice buttons. Each places its title and description on the left and its action on the right. At 650px and below, the action stacks beneath the description and aligns left.

The CPU Handicap page is at most 900px wide. Its order is heading and latest result, difficulty, countries, starting-score panel and play action, then five stage panels. Stages occupy five columns, wrapping into three columns at 650px and below; the header and starting-score panel also stack at that width.

The Finals view is at most 1300px wide. Its order is heading and result, next-match action, round navigation, then the full bracket. On phones the header and match summary stack. All five rounds remain in the board: fixed 220px columns, 28px gaps and a shared 32-row grid align advancing matches. The board scrolls horizontally and vertically, keeps round headings sticky and opens at the player's current match. Round buttons scroll to columns without hiding the other rounds.

The title centers a vertical composition in a container at most 520px wide, with actions at least 56px tall. Short landscape viewports reduce the artwork and place Play and Stats beside each other. Match results and all-time stats share a 760px maximum width. Their comparison table keeps statistic, You and Opponent/Opponents columns together at narrow widths, with wrapping labels and smaller cell padding. The all-time record changes from four columns to two at 650px; post-match actions stack at that width.

## Elevation & Depth

The denim image supplies texture. Cream panels, navy surfaces, borders and winner fills establish separation; the new menus have no shadows or animated transitions. Round navigation uses immediate scrolling.

## Shapes

Use softly rounded rectangular controls and panels, with tighter corners for dense bracket matches. Thin borders separate teams and connect each match to the next round. The next match gets a two-pixel gold border. Preserve the original atlas artwork rather than replacing it with new icons.

## Components

- **Title:** original logo and bats sit above gold Play and navy Stats buttons. A visually hidden heading names the game; native navigation labels the actions.
- **Statistics:** cream comparison tables use navy headers, scoped row/column headings and a visually hidden caption. Bold tabular figures align for comparison; final scores use 56px figures with flags and country names. Longest and average rally length use returns as their unit. The empty record explains how to begin, and notes define errors, starting-point exclusions and browser storage. Results offer a mode-specific Continue action and Back to title.
- **Match-point announcement:** an eight-pixel-radius gold banner with navy Archivo text sits near the top of the court. It announces the holder and remaining match points through a polite status region, stays visible for up to four seconds between points, clears when the serve starts and allows pointer input to pass through. Its lifecycle is implemented in [match-stats.js](reference-game/match-stats.js).

- **Mode choices:** each complete cream panel is one native button. The World map and Finals trophy are crops of the original interface atlas; CPU Handicap uses a native score preview showing `YOU 0` and `CPU 6` in two navy panels. Hover changes the border to gold and the surface to warm cream. The inner action label is part of that same button.
- **Difficulty choices:** `showDifficulty` renders the four native buttons using the difficulty page, options and option styles in the menu sources linked above. Each cream panel contains the level, descriptive copy and a play, continue or results action, with the same hover and focus treatment as mode choices. Finals and CPU Handicap show the selected level in gold and keep separate progress for each level; existing Finals saves continue intact under Easy.
- **Handicap progress:** five navy stage panels show starting scores from 0–6 through 0–10. Gold borders and text identify the current stage alongside its text label; completed stages show actual winning scores. The latest result appears in a status message. The gold action advances after a win, retries the same stage after a loss and offers play again beside the original trophy when all five stages are complete.
- **Play and navigation buttons:** gold marks the next match or new draw action; navy marks change-country, choose-mode and back actions. Primary buttons have a 48px minimum height; quieter buttons and round navigation have a 44px minimum height. Keyboard focus uses a three-pixel gold outline with four-pixel offset.
- **Match summary:** flags and country names identify the next opponent beside the play action. Championship and elimination states show a trophy and new-draw action. The latest actual player score appears in a status message.
- **Bracket:** each match shows two countries, their flags and available scores. `YOU` identifies the player in text; winners receive a lighter fill and heavier weight; unresolved slots name their preceding matches. All rounds and completed results remain available after the tournament ends.
- **Menu/court handoff:** the active HTML menu receives focus while the canvas is hidden. Playing a match returns to the original canvas and its controls. Native menu buttons and a focusable bracket scroll area support operating the menus; they do not establish keyboard support for the canvas match.

## Do's and Don'ts

- **Do** keep the original game artwork, canvas projection, paddle movement and shot behavior as the baseline.
- **Do** use country names alongside flags, text alongside state colors and real completed player scores in the bracket.
- **Do** preserve the complete bracket and usable scrolling at narrow widths.
- **Do** keep difficulty changes in [difficulty.js](reference-game/difficulty.js) limited to opponent reactions, movement, return pace, spin, placement and recovery; preserve the original player paddle and ball behavior in `game.js`.
- **Don't** treat simulated-DOM checks as evidence of live rendering, touch behavior or audio playback.
- **Don't** apply the archived [Rally Eleven design](RALLY_ELEVEN_DESIGN.md), root `.impeccable/design.json`, older surface briefs or `.impeccable/review/` captures to this game. Those describe the earlier implementation.
