// Associates each colorway's mockup image with that color's variants, so selecting
// a color on the PDP swaps the featured image (one shirt, not all colors stacked).
//
//   node --env-file=.env scripts/associate-variant-media.js        # first product
//   node --env-file=.env scripts/associate-variant-media.js all
import { readFile } from "node:fs/promises";
import { gql } from "./lib/shopify.js";

const args = process.argv.slice(2);
const ALL = args.includes("all");
const ONLY = (args.find((a) => a.startsWith("only=")) || "").split("=")[1];

const data = JSON.parse(await readFile(new URL("../data/products.json", import.meta.url), "utf8"));

async function main() {
  let targets = data.products;
  if (ONLY) targets = targets.filter((p) => p.handle === ONLY);
  else if (!ALL) targets = targets.slice(0, 1);

  for (const p of targets) {
    const d = await gql(`query($q:String!){ products(first:1, query:$q){ nodes{ id
      media(first:50){ nodes{ id alt } }
      variants(first:100){ nodes{ id selectedOptions{ name value } } } } } }`, { q: `handle:${p.handle}` });
    const prod = d.products.nodes[0];
    if (!prod) { console.log(`  skip ${p.handle}: not found`); continue; }

    // Map each color value -> its mockup mediaId (alt ends with the color name).
    const colors = [...new Set(prod.variants.nodes.map((v) => v.selectedOptions.find((o) => o.name === "Color")?.value))];
    const mediaByColor = {};
    for (const color of colors) {
      const m = prod.media.nodes.find((n) => (n.alt || "").endsWith(color));
      if (m) mediaByColor[color] = m.id;
    }

    const variantMedia = [];
    for (const v of prod.variants.nodes) {
      const color = v.selectedOptions.find((o) => o.name === "Color")?.value;
      const mediaId = mediaByColor[color];
      if (mediaId) variantMedia.push({ variantId: v.id, mediaIds: [mediaId] });
    }

    await gql(`mutation($id:ID!,$vm:[ProductVariantAppendMediaInput!]!){
      productVariantAppendMedia(productId:$id, variantMedia:$vm){ userErrors{ field message } }
    }`, { id: prod.id, vm: variantMedia });
    console.log(`  ${p.handle}: linked ${variantMedia.length} variants to ${Object.keys(mediaByColor).length} color images`);
  }
  console.log("Done. Selecting a color now swaps the image.");
}

main().catch((e) => { console.error("ASSOCIATE FAILED:", e.message); process.exit(1); });
