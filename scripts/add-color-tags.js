// Adds colourway + fit tags so storefront search/filtering by colour works
// (spec screen 08 filters by Colour / Fit / Size).
import { readFile } from "node:fs/promises";
import { dataFileUrl } from "./lib/datafile.js";
import { gql } from "./lib/shopify.js";

const data = JSON.parse(await readFile(dataFileUrl(), "utf8"));
const map = data.defaults.printful_color_map || {};
const fit = (data.defaults.blank || "").includes("6400") ? "Women" : "Unisex";

for (const p of data.products) {
  const d = await gql(`query($q:String!){ products(first:1, query:$q){ nodes{ id tags } } }`, { q: `handle:${p.handle}` });
  const node = d.products.nodes[0];
  if (!node) { console.log(`  ${p.handle}: not found`); continue; }
  const colors = p.colorways.map((cw) => map[cw.slug] || cw.label);
  const tags = [...new Set([...node.tags, ...colors, fit])];
  await gql(`mutation($id:ID!,$tags:[String!]!){ tagsAdd(id:$id, tags:$tags){ userErrors{ message } } }`,
    { id: node.id, tags });
  console.log(`  ${p.handle} + ${colors.join(", ")}, ${fit}`);
}
console.log("Colour tags added.");
