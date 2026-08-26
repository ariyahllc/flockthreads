# Handoff: FlockThreads Shopify storefront

## Overview

FlockThreads is a faith-apparel brand selling heavyweight tees and crewnecks direct to
consumers (Men / Women / Unisex) **and** wholesale to churches — both plain blanks and
custom-printed runs. This bundle covers the full storefront: nine screens, a logo system,
and a Shopify implementation spec.

Brand in one line: quietly premium. Warm neutrals, serif display type, generous whitespace,
scripture as a small physical detail of the garment rather than a slogan.

## About the design files

The HTML in this bundle is a **design reference**, not production code. `FlockThreads Store.dc.html`
is a prototype that shows intended look and behaviour — real swatch/size/quantity state, a
working church tier calculator, a working fit finder — so you can see how things are meant to
respond, not so you can lift the markup.

The job is to **rebuild these designs in the target environment**, which here is a Shopify
theme (Liquid + sections/blocks + the theme's own CSS conventions). `HANDOFF.md` maps every
screen to its Shopify template and spells out metafields, variant structure and B2B setup.
If any part of this ends up outside Shopify, use that codebase's established patterns rather
than the prototype's inline styles.

## Fidelity

**High fidelity.** Colors, typography, spacing, and interaction states are final and should
be matched closely. Exact values are in `HANDOFF.md` §1 (tokens) and §2 (component
inventory). Two deliberate exceptions:

- **Product photography is missing.** Every image area in the prototype is a labelled
  placeholder describing the shot that belongs there. Layout and aspect ratios are final;
  the images are not.
- **Wholesale tier prices** ($16/$14/$12 tee, $34/$30/$26 crewneck) are plausible
  placeholders pending real margins.

## Screens

Nine screens, in build order, all designed at 1440px. Full per-screen detail — layout,
components, copy, colors, states — is in `HANDOFF.md`; summary here.

| # | Screen | Purpose | Key notes |
|---|---|---|---|
| 01 | Home | Orient and route to a fit | Full-bleed hero, category triptych, editorial splits, church cross-sell |
| 02 | Collection | Browse one fit | Sticky filter bar, 3-up grid, verse micro-label on cards |
| 03 | Product | Choose colorway + size, add to cart | Live swatch/size/qty state, fit accordion, wholesale nudge |
| 04 | Cart | Review and adjust | Slide-out drawer (470px, right) + full cart page. Text-only free-ship meter |
| 05 | Checkout | Pay | Shopify checkout branding editor, not Liquid. Design shows target styling only |
| 06 | Churches (B2B) | Convert a church to a wholesale account | Tier table, live calculator, account request form with EIN + artwork upload |
| 07 | Size & fit | Pick the right size without guessing | Fit finder (two sliders + fit chips) and measurement tables per fit |
| 08 | Search | Find a product or answer | Query header, filters, mixed product + content results |
| 09 | Order status | Track an order | 4-step timeline, order summary, reorder path for churches |

## Interactions & behaviour

- **Motion is deliberately minimal**: 180ms ease-out on color and border only. No slides,
  no parallax, no reveal-on-scroll. The cart drawer is the only element that moves.
- **PDP state**: selected color and size drive the gallery, price and add-to-cart label.
  Sold-out sizes get a strikethrough rule and stay visible — never hidden.
- **Tier calculator** (Churches): quantity slider + product toggle + print checkbox
  recalculate tier, per-piece price, total and savings live. It must read tier data from a
  metaobject, not hardcoded JS, so the public estimate can never disagree with the price a
  logged-in company account actually pays.
- **Fit finder**: height + weight + fit preference → recommended size. Algorithm in
  `HANDOFF.md` §7. Persist the result to `localStorage` and pre-select it on PDPs. Never
  block add-to-cart on it.
- **Wholesale nudge** is the single recurring cross-sell pattern (PDP, cart, search, order
  status). Reuse it; don't invent variants.
- **Responsive**: breakpoint table in `HANDOFF.md` §8. Mobile keeps a 2-up product grid —
  the cards are calm enough — and the filter bar becomes a bottom sheet.
- Minimum tap target 44px throughout.

## State

Per-visitor state the storefront needs, beyond Shopify's own cart:

| State | Where | Persistence |
|---|---|---|
| selected color / size / quantity | PDP | Component-local, reflected in the URL variant param |
| cart contents + drawer open | global | Shopify Cart AJAX API |
| recommended size | fit finder → PDP | `localStorage` |
| calculator inputs | Churches page | Component-local, not persisted |
| logged-in company + catalog | global | Shopify B2B customer context |

## Design tokens

Full table in `HANDOFF.md` §1. The short version:

- **Colors** — Bone `#EDE7DC`, Vintage White `#F1EDE4`, Olive `#5F6650`, Pink `#E3C5C2`,
  Ink `#2B2B2B`, hairline `rgba(43,43,43,0.12)`. Text tints step down from Ink.
- **Type** — `EB Garamond` (display, product names, prices) + `Jost` 300/400/500 (all UI).
  Labels are 11–12px uppercase at `letter-spacing: 0.18em–0.26em`.
- **Spacing** — 4px base; section padding `76px 72px` desktop / `48px 24px` mobile.
- **Radius: 0 everywhere.** Squared corners are the brand. Only the cart-count pill is round.
- **Shadows: almost none.** Cart drawer only.

## Assets

| Asset | Notes |
|---|---|
| `flockthreads-hero-2400x1300.png` | Home hero. Center third is deliberately empty and light so `#2B2B2B` text clears ~12:1. Never place text outside it, never add a scrim |
| `assets/ft-mark.svg` | Full logo mark — three ascending birds plus a dashed running stitch. Min width 96px |
| `assets/ft-mark-compact.svg` | **Nav asset.** No stitch line, heavier strokes. Min width 24px |
| `assets/ft-mark-reversed.svg` | For olive or charcoal grounds |
| `assets/ft-mark-mono.svg` | One-color, `currentColor` strokes — embroidery, print, stamps |
| `assets/ft-favicon.svg` | 112×112 charcoal tile, **one** bird. Three don't survive 32px |

Logo rules (clear space, lockup ratios, what not to do) are in `HANDOFF.md` §5b. The wordmark
is live `EB Garamond` text, not an outlined path — set it in CSS, don't ship it as an image.

**Product photography is not included and needs to be shot.** Placeholder notes in the
prototype describe each shot.

## Files in this bundle

| File | What it is |
|---|---|
| `HANDOFF.md` | The implementation spec: tokens, components, screen→template map, catalog structure, metafields, B2B setup, fit-finder algorithm, responsive rules, copy rules, build order |
| `FlockThreads Store.dc.html` | The nine-screen prototype. Open it in a browser |
| `StoreNav.dc.html` | Shared header component used by every screen. Copy its logo SVG verbatim into `snippets/icon-logo.liquid` |
| `FlockThreads Logo.dc.html` | Logo exploration. Direction **1A "Flight Stitch"** is approved; 1B and 1C are kept for reference only |
| `assets/*.svg` | Logo assets, production-ready |
| `flockthreads-hero-2400x1300.png` | Hero image |
| `support.js`, `image-slot.js` | Runtime files that make the prototypes open standalone. **Not** part of the deliverable — do not port them |

## Start here

1. Read `HANDOFF.md` §1–§2, then open `FlockThreads Store.dc.html` alongside it.
2. Confirm the Shopify plan before touching screen 06 — `HANDOFF.md` §6 assumes **Plus**
   (Company accounts + catalogs). Without Plus the whole Churches flow degrades to
   tagged-customer discounts, which is materially worse and changes the design.
3. Follow the build order in `HANDOFF.md` §10 — nav and product card first, Churches last.
