# FlockThreads — Store as Code

Programmatic build for the FlockThreads Shopify store (DTC faith apparel + church
group orders). Kills manual clicking: content, products, and pages are data +
scripts, version-controlled and re-runnable.

## Architecture
```
data/products.json     SKUs, prices, colors, variant maps (copy drafted by Claude)
data/pages/*.md        page copy -> Shopify pages
scripts/lib/           Shopify Admin GraphQL + Printful API clients (zero deps)
scripts/check.js       preflight: verify credentials
scripts/build-store.js upsert pages (idempotent)
scripts/build-pod.js   create Printful products + sync to Shopify (idempotent)
theme/                 Liquid, managed via Shopify CLI (separate)
```

## One-time human setup (Claude can't — money/identity)
1. Create Shopify account, plan, domain (flockthreads.com), Shopify Payments.
2. Shopify admin > Develop apps > create app > Admin API scopes:
   `write_products, write_content, write_publications, read_orders, write_orders`.
   Install, copy the Admin API access token.
3. Install the **Printful** (or Gelato) app *in Shopify* — this is what auto-fulfills.
   Get a Printful API token.
4. `cp .env.example .env` and fill in tokens.

## Run
```bash
npm run check        # verify credentials
npm run build:store  # push pages
npm run build:pod    # create/sync POD products (needs prices + variant maps)
npm run build:all    # pod then store
```

## Gates before build:pod is real
- Wash-test picks blank + provider -> real COGS -> prices in products.json
- Each variant fulfillment-tested -> printful_variant_map filled
- Real photography replaces POD mockups on listings

## Rule: lock the provider
POD_PROVIDER is pinned to the wash-test winner. Never auto-route to cheapest —
quality is the moat.

## Theme
Managed separately with Shopify CLI:
```bash
npm i -g @shopify/cli @shopify/theme
shopify theme dev --store flockthreads.myshopify.com
```
