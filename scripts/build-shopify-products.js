// Creates the catalog products IN SHOPIFY (correct flow for a Shopify-connected
// Printful store). Products are created as DRAFT, idempotent by handle.
// Printful print-file binding happens after, via sync-printful.js.
//
// Usage:
//   node --env-file=.env scripts/build-shopify-products.js            # all, DRAFT
//   node --env-file=.env scripts/build-shopify-products.js only=amen-again
import { readFile } from "node:fs/promises";
import { gql } from "./lib/shopify.js";

const args = process.argv.slice(2);
const ONLY = (args.find((a) => a.startsWith("only=")) || "").split("=")[1];

async function findProductId(handle) {
  const d = await gql(
    `query($q:String!){ products(first:1, query:$q){ nodes{ id } } }`,
    { q: `handle:${handle}` }
  );
  return d.products.nodes[0]?.id || null;
}

async function main() {
  const data = JSON.parse(await readFile(new URL("../data/products.json", import.meta.url), "utf8"));
  const { price, sizes, printful_color_map: cmap = {} } = data.defaults;

  let targets = data.products;
  if (ONLY) targets = targets.filter((p) => p.handle === ONLY);

  for (const p of targets) {
    const colors = p.colorways.map((cw) => cmap[cw.slug] || cw.label);
    const id = await findProductId(p.handle);

    const input = {
      ...(id ? { id } : {}),
      title: p.title,
      handle: p.handle,
      status: "DRAFT",
      productType: "T-Shirt",
      vendor: "FlockThreads",
      tags: [data.defaults.line, p.role].filter(Boolean),
      productOptions: [
        { name: "Color", values: colors.map((name) => ({ name })) },
        { name: "Size", values: sizes.map((name) => ({ name })) },
      ],
      variants: colors.flatMap((color) =>
        sizes.map((size) => ({
          price: price.toFixed(2),
          optionValues: [
            { optionName: "Color", name: color },
            { optionName: "Size", name: size },
          ],
        }))
      ),
    };

    const res = await gql(
      `mutation($input:ProductSetInput!){
        productSet(input:$input, synchronous:true){
          product{ id handle variantsCount{ count } }
          userErrors{ field message }
        }
      }`,
      { input }
    );
    const prod = res.productSet.product;
    console.log(`  ${id ? "updated" : "created"}: ${prod.handle} (${prod.variantsCount.count} variants) ${prod.id}`);
  }
  console.log(`\nDone. ${targets.length} product(s) in Shopify as DRAFT. Next: sync-printful.js to bind print files.`);
}

main().catch((e) => { console.error("BUILD FAILED:", e.message); process.exit(1); });
