# FlockThreads — Store Handoff

Faith-apparel Shopify store, built store-as-code. This doc is a complete
context transfer for an agent picking up the work.

## Business
- **Brand:** FlockThreads — tasteful, quality-first faith apparel.
- **Two tracks:** (1) DTC brand — minimal left-chest designs on premium blanks;
  (2) church/ministry group orders (B2B wedge, higher margin, referral-driven).
- **Positioning:** quality + restraint. Competitors are Gildan-tier and "cringe";
  research shows the #1 unserved gap is **trust** ("isn't a scam"), not price.
- **Price:** $26.99 free shipping. POD cost ~$11.95 → ~38% contribution.
- **Deliberately skipped:** patriotic-faith crossover designs (high volume, but
  breaks broad-welcome positioning and the cross-denominational church channel).

## Stack
| Layer | Choice |
|---|---|
| Storefront | Shopify, store `rbamk2-r2.myshopify.com`, domain `flockthreads.com` |
| Theme | Horizon, EB Garamond headings (Google Fonts override in `assets/base.css`) |
| Fulfillment | **Printful, Manual/API store** ("FlockThreads API", id 18634169, type=native) |
| Blank | Bella+Canvas 6400 (women's), 3001 (men's/unisex), left-chest DTG |
| Payments | Shopify Payments live under Ariyah LLC (verified) |
| Repo | `~/repos/flockthreads`, local git, no remote yet |

**Critical:** the Shopify-connected Printful store rejects API product/order
creation. Only the **Manual/API** store type works. `PRINTFUL_TOKEN` in `.env`
must belong to that store.

## Architecture (Path B — no native Printful↔Shopify app)
```
data/products.json          catalog: designs, colorways, print files, variant maps
scripts/lib/shopify.js      Admin GraphQL client
scripts/lib/printful.js     Printful API client
scripts/lib/shopify-files.js staged upload of art -> Shopify CDN (cached)
scripts/lib/description.js  shared product copy + size chart
```
Products are created in **Shopify** (not Printful). Each variant carries metafields
`printful.variant_id` and `printful.art_url`. `sync-orders.js` reads those to place
Printful orders. This means new designs = edit JSON + rerun scripts, no clicking.

### Scripts
| Script | Purpose |
|---|---|
| `check.js` | preflight: verify Shopify + Printful credentials |
| `resolve-catalog.js` | fill `printful_variant_map` from Printful catalog |
| `build-shopify-products.js` | create products + variants + metafields (`replace`, `all`, `only=`) |
| `build-mockups.js` | Printful mockup generator (left-chest) → Shopify product images |
| `associate-variant-media.js` | link each color's mockup to its variants (image swaps on color pick) |
| `add-details.js` | apply shared description + size chart |
| `build-collections.js`, `set-collection-images.js`, `build-nav.js` | collections, images, menu |
| `activate-products.js` | DRAFT ↔ ACTIVE + publish to Online Store |
| `sync-orders.js` | paid Shopify order → Printful order (draft; `confirm` to submit); `track` writes tracking back |

Left-chest placement is solved and stored in `data/products.json`
→ `defaults.printful_placement` (1500×1800 front area, box 430×430 at top 300 / left 760).

## Current state
- **8 products / 145 variants.** 5 women's **ACTIVE**; 3 men's still **DRAFT**.
- Collections: faith(8), women(5), men(3), best-sellers(3), for-churches(2),
  espanol(1), **bundles(0 — empty)**.
- Nav: Best Sellers | Women | Men | Bundles | For Churches | About.
- Homepage: designed bone hero banner (rendered from Claude Design HTML),
  product rows, collections grid with real images.
- Pages published: About, Quality, For Churches, Shipping & Returns.
- Every PDP: garment mockups, color-swap, Hollister-style size chart (S–2XL,
  bust/waist), fit + model reference line, print guarantee.
- Store is still **password-protected** (not public).

## Open items
1. **Bundles is empty** but in the nav. Plan: couples/2-pack at $45.98
   (= $8 off two) via native Shopify automatic discount, no app.
   **Art already exists**: `business-os/design/out/print/CPL_*` — his/hers pairs
   (findeth / favour / foundfirst) in bone + charcoal.
2. **Men's products are DRAFT** — activate when ready.
3. **No end-to-end test order yet.** Sequence: test-mode purchase →
   `node --env-file=.env scripts/sync-orders.js` → verify Printful draft →
   add `confirm` → then remove store password.
4. **Order poller is not scheduled** (cron/GitHub Action) — run manually for now.
5. **Split-pay group ordering deferred** — not buildable off-the-shelf on Shopify.
   Launch model is leader-pays-lump-sum.
6. **No real photography** — all images are Printful-generated mockups.

## Research-backed next moves
1. Publish trust signals (free, highest ROI): name the blank, guarantee above fold,
   founder story, honest shipping times.
2. Ship Bundles from existing couples art.
3. Add demand-backed designs: Be Still (Ps 46:10), The Lord is My Shepherd (Ps 23),
   Faith over Fear, botanical/wildflower scripture.
4. Expand Spanish line (currently 1 design).
5. Personalization add-on (+$2) — highest-margin lever.

**Design no-list** (from Reddit customer voice): no brand parodies, no puns,
no confrontational messaging, no bare "Blessed" + cross, no possessive framing.

## Key docs
- `business-os/reports/faith-apparel-market-gap-2026-08.md` — market gap analysis
- `business-os/reports/faith-apparel-launch-2026-07-14.md` — pricing/margin model
- `~/.gstack/projects/tshirt-business/dinesh-unknown-design-*.md` — design doc + review
