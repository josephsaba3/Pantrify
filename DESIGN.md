---
name: Pantrify
description: A crisp, colour-coded shared household checklist.
colors:
  ink: "#171916"
  canvas: "#FFFFFF"
  surface: "#F8F9F7"
  line: "#D9DDD8"
  muted: "#747B75"
  staples: "#8569C8"
  staples-soft: "#F1EEF9"
  fruit-vege: "#4EA960"
  fruit-vege-soft: "#ECF6ED"
  snacks: "#D69B1F"
  snacks-soft: "#FBF4E4"
  household: "#CC5757"
  household-soft: "#FBEAEA"
  drinks: "#59A7CC"
  drinks-soft: "#E8F4FA"
typography:
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 750
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "0.04em"
rounded:
  control: "8px"
  group: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "46px"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "34px"
  input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
    height: "46px"
  list-group:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.group}"
---

# Design System: Pantrify

## Overview

**Creative North Star: "The Colour-Coded Checklist"**

Pantrify is a compact household utility that should disappear into the task. A clean white canvas, crisp black typography, and clearly bounded category groups make the shared list instantly scannable on a phone. Colour is functional: every category owns one restrained hue and a very light tonal surface.

The interface is flat, direct, and familiar. It rejects beige warmth, cute ornament, corporate polish, dark surfaces, and clutter. Motion exists only to confirm state changes; it never performs for its own sake.

**Key Characteristics:**

- White, high-contrast working canvas
- Compact, one-handed mobile interaction
- Flat category containers with lightly tinted backgrounds
- Strong black controls and typography
- Colour used for organization rather than decoration

## Colors

The palette pairs a neutral black-and-white foundation with five restrained category identities.

### Primary

- **Checklist Ink:** The near-black anchor for typography, primary actions, and active navigation.

### Secondary

- **Fruit Green:** Fruit & Vege group identity and checked-success states.
- **Drinks Blue:** Drinks group identity.
- **Snack Amber:** Snacks group identity.
- **Household Red:** Household group identity.
- **Staples Violet:** Recurring Staples group identity.

### Neutral

- **Working Canvas:** The full-page and primary field background.
- **Quiet Surface:** Neutral controls and inactive areas.
- **Rule Line:** Dividers, group outlines, and input borders.
- **Supporting Text:** Dates, counts, hints, and secondary labels.

**The Category Ownership Rule.** Each category uses exactly one saturated marker and one matching pale surface. Never mix category colours within one group.

**The White Canvas Rule.** The application background remains white. Beige, cream, and parchment surfaces are prohibited.

## Typography

**Display Font:** Inter with system sans-serif fallback
**Body Font:** Inter with system sans-serif fallback

**Character:** One crisp sans-serif family keeps the utility coherent. Hierarchy comes from weight, size, and spacing—not decorative font pairing.

### Hierarchy

- **Headline** (750, 2rem, 1.1): Page-level task framing only.
- **Title** (700, 1rem, 1.25): Product names, primary row content, and compact headings.
- **Body** (400, 1rem, 1.45): Inputs, supporting instructions, and readable content.
- **Label** (750, 0.75rem, 0.04em): Category names, counts, and short control labels.

**The Grocery-Aisle Rule.** Product names always win the hierarchy. Metadata must remain visibly secondary without falling below accessible contrast.

## Elevation

Pantrify is flat by default. Depth comes from tinted category surfaces, one-pixel rules, and state changes rather than floating cards. Shadows are reserved for temporary overlays such as the toast; ordinary list groups, rows, buttons, and inputs do not use decorative shadows.

**The Flat-by-Default Rule.** If a permanent element needs a wide shadow to feel distinct, its boundary or tonal contrast is wrong.

## Components

### Buttons

- **Shape:** Compact rounded rectangles (8px radius), never oversized pills.
- **Primary:** Checklist Ink fill, white text, strong weight, and a 46px touch height.
- **Hover / Focus:** Small tonal shift and a clearly visible focus outline; no bounce or rotation.
- **Secondary:** White fill with a solid dark or neutral border.

### Cards / Containers

- **Corner Style:** Gently rounded category groups (12px radius).
- **Background:** Each category uses its own pale tint; individual rows share the group surface.
- **Shadow Strategy:** No shadow.
- **Border:** One-pixel category-tinted outline and one-pixel row dividers.
- **Internal Padding:** 12px to 16px, compact enough to show several items on a phone.

### Inputs / Fields

- **Style:** White background, one-pixel Rule Line border, 8px radius, and a 46px minimum height.
- **Focus:** Darker border and a visible, low-opacity focus outline.
- **Error / Disabled:** Error copy uses Household Red; disabled controls retain legible text and obvious inactive contrast.

### Navigation

The header is slim and task-focused. The Pantrify wordmark anchors the left; shared status and list actions align right. Tabs use black text and a simple underline for active state. On narrow screens, nonessential status copy may collapse before actions do.

### Grocery Category Group

Every group includes a coloured square marker, uppercase category label, optional remaining/total count, and contiguous product rows. Checkboxes sit on the leading edge, product names occupy the flexible centre, and quantity or last-bought metadata stays secondary.

## Do's and Don'ts

### Do:

- **Do** keep the canvas white and typography near-black.
- **Do** use colour-coded category groups to make scanning faster.
- **Do** keep controls at least 44px tall on mobile.
- **Do** use compact rows and familiar checkbox affordances.
- **Do** preserve clear focus states, strong contrast, and reduced-motion behavior.

### Don't:

- **Don't** use beige, cream, parchment, or warm paper backgrounds.
- **Don't** make the product cute with doodles, mascots, novelty icons, or playful type.
- **Don't** make it corporate with dashboard chrome, excessive metrics, or formal enterprise copy.
- **Don't** use dark mode as the default visual language.
- **Don't** clutter the list with redundant labels, cards, effects, or controls.
- **Don't** add decorative ambient blobs, page-load choreography, rotation, bounce, or ornamental motion.
- **Don't** pair one-pixel borders with wide decorative shadows.
