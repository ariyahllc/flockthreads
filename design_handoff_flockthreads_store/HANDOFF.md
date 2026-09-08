# FlockThreads — Shopify build handoff

Design source: `FlockThreads Store.dc.html` (9 screens at 1440 px, in build order).
Nav component: `StoreNav.dc.html`. Hero asset: `flockthreads-hero-2400x1300.png`.

Brand in one line: quietly premium faith apparel. Warm neutrals, serif display, generous
whitespace, scripture as a small detail rather than a slogan. Nothing loud, nothing preachy.

---

## 1. Design tokens

Put these in `assets/base.css` as CSS custom properties on `:root`, and mirror the four
colors into Theme Settings so merchandisers can't drift off palette.

| Token | Value | Use |
|---|---|---|
| `--c-bone` | `#EDE7DC` | Page background, default surface |
| `--c-vintage-white` | `#F1EDE4` | Cards, alternating bands, drawer body |
| `--c-white` | `#FFFDF8` | Form inputs only |
| `--c-olive` | `#5F6650` | Accent: rules, badges, active states, B2B panel |
| `--c-olive-light` | `#A9AF98` | Text/accents on charcoal or olive grounds |
| `--c-pink` | `#E3C5C2` | One colorway; never UI chrome |
| `--c-ink` | `#2B2B2B` | Primary text, primary button, footer ground |
| `--c-ink-70` | `#4A463E` | Emphasised body copy |
| `--c-ink-55` | `#57534A` | Body copy |
| `--c-ink-40` | `#6E6A61` | Labels, secondary |
| `--c-ink-28` | `#8A8477` | Meta, placeholders, disabled |
| `--hairline` | `rgba(43,43,43,0.12)` | All dividers and card borders |

**Type.** `EB Garamond` (400/500 + 400 italic) for display, product names, prices, numbers.
`Jost` (300/400/500) for everything UI: labels, buttons, nav, body copy.

- Display XL 92px / 1.04 / -0.015em — home hero only
- Display L 60px / 1.04 — B2B hero
- H1 50–54px / 1.05 — page titles
- H2 34–42px / 1.1
- Product name 21–25px Garamond
- Body 15.5–16.5px Jost 300 / 1.7
- Label 11–12px Jost 400, `letter-spacing: 0.18em–0.26em`, uppercase
- Button 12–12.5px Jost 400, `letter-spacing: 0.2em`, uppercase

**Spacing.** 4px base. Section padding `76px 72px` desktop, `48px 24px` mobile.
Page gutter 72px. Grid gaps: 28px (4-up), 32px (3-up).
**Radius: 0 everywhere.** Squared corners are the brand. Only exception: the cart count
pill and swatch-selected rings.
**Shadows:** almost none. Cart drawer `-30px 0 70px rgba(43,43,43,0.22)`, nothing else.
**Motion:** 180ms ease-out on color/border only. No slides, no parallax, no reveal-on-scroll.

---

## 2. Component inventory

| Component | Where | Notes |
|---|---|---|
| `announcement-bar` | global | Olive band, uppercase 12px/0.22em. Two messages max, no carousel |
| `header` | global | `StoreNav.dc.html`. Wordmark left, 4 links center, Search/Account/Cart right. Active link = 1.5px olive underline |
| `hero-banner` | home | Full-bleed image + centered serif H1 + outlined button. Text stays in center third — see §5 |
| `category-triptych` | home | 3 equal cells, hairline dividers, hover fills Vintage White |
| `product-card` | grids | 4:5 image, name, verse micro-label, price. Verse slot keeps `min-height: 13px` so cards align when a product has no verse |
| `editorial-split` | home, B2B | Image one side, copy the other. Alternate sides down the page |
| `filter-bar` | collection | Sticky on scroll, Vintage White ground |
| `variant-swatch` | PDP | 46px square, selected = 1.5px charcoal ring offset 6px outward |
| `size-selector` | PDP | 62px min-width pills. Sold out = strikethrough rule, not hidden |
| `qty-stepper` | PDP, cart | 48px controls, 56px tall |
| `wholesale-nudge` | PDP, cart, search, order | Vintage White block, 2px olive left border. The one recurring cross-sell pattern — reuse it, don't invent variants |
| `cart-drawer` | global | 470px, right, scrim `rgba(43,43,43,0.34)` |
| `free-ship-meter` | cart | Text only, no progress bar |
| `tier-table` | B2B | 4 columns, hairline rows |
| `tier-calculator` | B2B | Charcoal panel. Product toggle + qty range + print checkbox → tier, per-piece, total, savings |
| `account-request-form` | B2B | Includes EIN field and artwork dropzone |
| `fit-finder` | size guide | Two sliders + 3 fit chips → olive result panel |
| `measure-table` | size guide | Inches, garment laid flat |
| `order-timeline` | order status | 4 steps, olive = complete |
| `footer` | global | Charcoal, 4 columns: brand / Shop / Churches / Help |

---

## 3. Screens → templates

| # | Screen | Shopify template |
|---|---|---|
| 01 | Home | `templates/index.json` |
| 02 | Collection (Men) | `templates/collection.json` |
| 03 | Product | `templates/product.json` |
| 04 | Cart drawer | `sections/cart-drawer.liquid` (global) |
| 05 | Checkout | Checkout branding editor — not Liquid |
| 06 | Churches B2B | `templates/page.churches.json` |
| 07 | Size & fit | `templates/page.size-guide.json` |
| 08 | Search | `templates/search.json` |
| 09 | Order status | `templates/customers/order.liquid` |

Every section needs schema settings for its headings, body copy and image so the client can
edit without touching Liquid. Blocks (not hardcoded loops) for the triptych cells,
tier rows, and the four "how it runs" steps.

---

## 4. Catalog structure

**Products.** One product per design+silhouette, e.g. "Still Waters Tee".
Options: `Color` (Bone, Vintage White, Heather Olive, Soft Pink, Charcoal) × `Size`
(XS–XXL). 30 variants max per product — fine within Shopify's 100 limit.

**Fit as collections, not options.** Men / Women / Unisex are the nav's top level and map to
three manual or automated collections driven by a `fit` tag (`fit:mens`, `fit:womens`,
`fit:unisex`). A women's-cut version of the same design is a **separate product** in the
Women collection — different measurements, different photography. Do not make fit a variant
option; it doubles the variant count and breaks size charts.

**Metafields** (namespace `flock`):

| Key | Type | Used on |
|---|---|---|
| `flock.verse_reference` | single line text | PDP eyebrow, product card micro-label. e.g. `Psalm 23:2` |
| `flock.verse_placement` | single line text | `inside hem`, `back neck` |
| `flock.fabric_weight` | single line text | `6.5 oz` |
| `flock.fit_note` | multi-line text | PDP accordion |
| `flock.size_chart` | metaobject reference | Points at a `size_chart` metaobject |
| `flock.wholesale_tee_base` | money | Tier-1 wholesale price, drives the calculator |
| `flock.is_blank` | boolean | True = appears in the wholesale blanks catalog |
| `flock.print_ready` | boolean | True = eligible for custom printing |

**Metaobject `size_chart`**: repeatable rows of `size`, `chest`, `length`, `shoulder`,
`sleeve` (inches). One chart per fit. The fit finder reads it, so the table and the
recommendation can never disagree.

Leave `flock.verse_reference` empty and the card/PDP eyebrow collapses — handled in the
design, keep that behaviour.

---

## 5. Hero banner

`flockthreads-hero-2400x1300.png` — 2400×1300, center third deliberately empty and light
(~`#F3EFE7`) so `#2B2B2B` text clears ~12:1 contrast.

- `object-fit: cover`, `object-position: center`. Never place text outside the center third.
- Desktop 780px tall; tablet 620px; mobile 560px with the H1 dropping to 44px.
- On mobile the crop tightens toward center — this is safe, the edges hold the only detail.
- Serve as WebP with the PNG as fallback; `loading="eager"`, `fetchpriority="high"`.
- Do not add an overlay scrim. It's already tuned; a scrim muddies the warmth.

---

## 5b. Logo — "Flight Stitch" (approved)

Chosen direction: **1A Flight Stitch** in `FlockThreads Logo.dc.html`. Three ascending
chevrons (a flock in echelon) plus a dashed running stitch. Reference lockups, reversed
tiles and small-size tests live in that file.

**Assets** (`assets/`, all SVG, transparent ground except the favicon):

| File | Use | Notes |
|---|---|---|
| `ft-mark.svg` | Full mark | Includes the dashed stitch line. Min width 96px — below that the stitch fills in. |
| `ft-mark-compact.svg` | Nav, cards, email | No stitch line, heavier strokes. **This is the nav asset.** Min width 24px. |
| `ft-mark-reversed.svg` | On `#5F6650` / `#2B2B2B` | Bone strokes (`#F1EDE4` / `#E4DDD1`). |
| `ft-mark-mono.svg` | Embroidery, print, one-color | Strokes are `currentColor` — inline it and set `color:`. |
| `ft-favicon.svg` | Favicon, app icon | 112×112, charcoal tile, **one** bird. Three don't survive 32px. |

**Lockup.** Mark + wordmark, horizontal, gap = 0.4× mark height. Wordmark is live text,
not an outlined path: `EB Garamond 400`, uppercase, `letter-spacing: 0.3em`, `#2B2B2B`.
At nav size that is 25px type against a 32×25 mark. Stacked lockup (mark above, wordmark
below, centered, 12px gap) only where width is under 240px.

**Rules.**
- Never rebuild the mark in Liquid — inline the SVG snippet via `{% render 'icon-logo' %}`
  so the strokes inherit no fill.
- Clear space = one bird-width on all sides.
- Bird strokes: olive `#5F6650` outer two, charcoal `#2B2B2B` middle. Don't recolor
  individually; use the mono asset if you need a single color.
- Stroke-linecap and linejoin are `round` everywhere. Squared caps kill it.
- Don't rotate, mirror, or reorder the birds — the ascent left-to-right is the whole idea.
- Favicon must stay the single up-pointing bird. A down-pointing chevron reads as a
  dropdown caret.

`StoreNav.dc.html` already carries the compact mark at production size — copy its SVG
markup verbatim into `snippets/icon-logo.liquid`.

---

## 6. B2B implementation

Use **Shopify B2B (Plus): Company accounts + Company locations**, not a discount-code hack.

1. **Catalogs.** Three price lists mapped to volume tiers — Tier 1 (24–99), Tier 2 (100–249),
   Tier 3 (250+). Assign a company location to a catalog on approval; upgrade the assignment
   as their annual volume grows.
2. **Volume pricing** within each catalog for the quantity breaks shown in the tier table.
   Tee: $16 / $14 / $12. Crewneck: $34 / $30 / $26. Print add-on is a separate line item
   product ($6 / $5 / $4).
3. **Minimum 24 pieces** per order — enforce with a Cart Transform / Checkout validation
   function, and surface it in the cart before checkout, not at the payment step.
4. **Tax exemption.** Set the company location tax-exempt after EIN verification. Do not
   build a custom exemption flow.
5. **Payment terms.** Net 30 enabled per company after first fulfilled order.
6. **Multiple staff on one account** = multiple customers attached to one company with
   ordering permission. Design assumes this.
7. **Account request form.** Not a Shopify customer signup — a form (Shopify Forms or a
   custom app proxy) that creates a Company on approval. Fields: organisation, contact name,
   work email, phone, congregation size, EIN, need (blanks / printing / both), artwork
   upload, notes.
8. **Custom printing** is a separate flow: artwork upload → staff proof → draft order sent
   for approval. Model the proof as a draft order with a `proof_url` line-item property.
9. **Size-run picker** (referenced from the size guide): one quantity input per size on a
   single blanks product page, adding all sizes to cart in one action. Default suggestion for
   40 people: 4 S, 12 M, 14 L, 8 XL, 2 XXL.
10. **Retail and B2B share one storefront.** A logged-in company customer sees their catalog
    prices on the normal PDP. The Churches page is marketing plus the calculator — not a
    separate store.

The calculator on the Churches page is a public estimator. It must read tier data from a
metaobject (not hardcoded JS) so pricing changes in one place, and its output must match what
the catalog charges after login.

---

## 7. Fit finder logic

Inputs: height (58–82 in), weight (90–300 lb), fit preference (Close / True to size / Roomy).

```
bmi = weight * 703 / height^2
index: bmi <19 → S, <23 → M, <27 → L, <32 → XL, else XXL   (order: XS S M L XL XXL)
if height >= 75: index += 1
if height <= 64: index -= 1
if fit == "Roomy": index += 1
if fit == "Close": index -= 1
clamp to 0..5
```

Show the recommended size plus that size's chest and body length from the `size_chart`
metaobject, and a one-line rationale that changes with the fit preference. Persist the result
to `localStorage` and pre-select it on PDPs. Never block add-to-cart on it.

---

## 8. Responsive

| Breakpoint | Behaviour |
|---|---|
| ≥ 1280 | As designed. 4-up featured, 3-up collection |
| 1024–1279 | Gutter 48px, 3-up featured, 3-up collection |
| 768–1023 | 2-up grids, editorial splits stack image-first, tier table keeps 4 columns at 13px |
| < 768 | 2-up product grid (not 1-up — the cards are small and calm enough), cart drawer full-width, filter bar becomes a bottom sheet, tier table becomes stacked cards, calculator full-width |

Minimum tap target 44px. The 46px swatches and 56px buttons already clear it; check the
qty stepper and filter chips on mobile.

---

## 9. Copy rules

- Sentence case for headings. Uppercase only for labels and buttons.
- Verse references are **references only** — `Psalm 23:2`, never the verse text on a
  marketing surface. The verse is a physical detail of the garment.
- No exclamation marks. No "Shop now!!". No emoji anywhere.
- Say what the garment is and how it fits before saying what it means.
- B2B copy is practical: quantities, prices, turnaround, who approves what.

---

## 10. Build order

1. Tokens + type + `StoreNav` + footer
2. Product card and grid, then Collection (02)
3. PDP (03) with variant/size state and the wholesale nudge
4. Home (01) — needs the card and editorial split from steps 2–3
5. Cart drawer (04) and checkout branding (05)
6. Size & fit (07) including the fit finder and `size_chart` metaobject
7. Search (08)
8. Churches (06) — biggest piece; needs Company accounts and catalogs configured first
9. Order status (09)

## Open items for the client

- Real product photography. Every `<image-slot>` in the design is a placeholder with a note
  on what belongs there.
- Confirm whether Shopify plan is Plus. Without it, §6 needs replacing with a tagged-customer
  discount approach, which is materially worse — flag this before starting screen 06.
- Actual wholesale margins — tier prices in the design are plausible placeholders.
- Whether custom printing is in-house or a partner; changes the turnaround copy.
