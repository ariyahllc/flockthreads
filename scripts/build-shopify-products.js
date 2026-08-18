// Path B: creates products in SHOPIFY (Admin API) from data/products.json.
// Each variant (color x size) carries Printful mapping as metafields:
//   printful.variant_id (catalog variant), printful.art_url (Shopify CDN print file).
// sync-orders.js reads those metafields to place Printful orders.
//
// Products are created as DRAFT (safe until order-sync is live). Idempotent by handle.
//
// Usage:
//   node --env-file=.env scripts/build-shopify-products.js            # first product only
//   node --env-file=.env scripts/build-shopify-products.js only=amen-again
//   node --env-file=.env scripts/build-shopify-products.js all
import { readFile } from "node:fs/promises";
import { gql } from "./lib/shopify.js";
import { uploadImage } from "./lib/shopify-files.js";

const args = process.argv.slice(2);
const ALL = args.includes("all");
const REPLACE = args.includes("replace"); // delete existing product by handle, then recreate
const ONLY = (args.find((a) => a.startsWith("only=")) || "").split("=")[1];

async function productIdByHandle(handle) {
  const d = await gql(`query($q:String!){ products(first:1, query:$q){ nodes{ id } } }`, { q: `handle:${handle}` });
  return d.products.nodes[0]?.id || null;
}

async function main() {
  const data = JSON.parse(await readFile(new URL("../data/products.json", import.meta.url), "utf8"));
  const { defaults } = data;
  const price = defaults.price.toFixed(2);
  const colorMap = defaults.printful_color_map || {};
  // Storefront shows the real Printful color that ships, not the design swatch name.
  const colorName = (cw) => colorMap[cw.slug] || cw.label;

  let targets = data.products;
  if (ONLY) targets = targets.filter((p) => p.handle === ONLY);
  else if (!ALL) targets = targets.slice(0, 1);

  console.log(`Targets: ${targets.map((t) => t.handle).join(", ")}\n`);

  for (const p of targets) {
    const existing = await productIdByHandle(p.handle);
    if (existing) {
      if (!REPLACE) { console.log(`  exists, skip: ${p.handle} (add 'replace' to rebuild)`); continue; }
      await gql(`mutation($id:ID!){ productDelete(input:{id:$id}){ deletedProductId userErrors{ field message } } }`, { id: existing });
      console.log(`  deleted old: ${p.handle}`);
    }

    // Upload art per colorway (cached) -> CDN url.
    const artUrl = {};
    for (const cw of p.colorways) {
      process.stdout.write(`  upload ${cw.slug} … `);
      artUrl[cw.slug] = await uploadImage(cw.print_file);
      console.log("ok");
    }

    // 1. Create product shell with Color + Size options.
    const colorValues = p.colorways.map((cw) => ({ name: colorName(cw) }));
    const sizeValues = defaults.sizes.map((s) => ({ name: s }));
    const created = await gql(
      `mutation($input:ProductInput!){
        productCreate(input:$input){ product{ id } userErrors{ field message } }
      }`,
      { input: {
          title: p.title, handle: p.handle, status: "DRAFT",
          productType: "T-Shirt", vendor: "FlockThreads",
          tags: [defaults.line, "faith", p.role].filter(Boolean),
          descriptionHtml: `<p>${p.title}${p.verse ? ` — ${p.verse}` : ""}</p>`,
          productOptions: [
            { name: "Color", values: colorValues },
            { name: "Size", values: sizeValues },
          ],
        } }
    );
    const productId = created.productCreate.product.id;

    // 2. Bulk-create variants (color x size) from the resolved map, with Printful metafields.
    const variants = [];
    for (const [key, variantId] of Object.entries(p.printful_variant_map)) {
      const [slug, size] = key.split(":");
      const cw = p.colorways.find((c) => c.slug === slug);
      variants.push({
        price,
        optionValues: [{ optionName: "Color", name: colorName(cw) }, { optionName: "Size", name: size }],
        inventoryPolicy: "CONTINUE", // POD: never out of stock
        metafields: [
          { namespace: "printful", key: "variant_id", type: "number_integer", value: String(variantId) },
          { namespace: "printful", key: "art_url", type: "url", value: artUrl[slug] },
        ],
      });
    }
    await gql(
      `mutation($productId:ID!,$variants:[ProductVariantsBulkInput!]!){
        productVariantsBulkCreate(productId:$productId, variants:$variants, strategy:REMOVE_STANDALONE_VARIANT){
          userErrors{ field message }
        }
      }`,
      { productId, variants }
    );

    // 3. Attach each colorway print file as product media.
    const media = p.colorways.map((cw) => ({ originalSource: artUrl[cw.slug], mediaContentType: "IMAGE", alt: colorName(cw) }));
    await gql(
      `mutation($productId:ID!,$media:[CreateMediaInput!]!){
        productCreateMedia(productId:$productId, media:$media){ mediaUserErrors{ field message } }
      }`,
      { productId, media }
    );

    console.log(`  CREATED ${p.handle}: ${variants.length} variants (DRAFT)`);
  }
  console.log("\nDone. Shopify admin > Products. Status DRAFT until order-sync is live.");
}

main().catch((e) => { console.error("BUILD FAILED:", e.message); process.exit(1); });
