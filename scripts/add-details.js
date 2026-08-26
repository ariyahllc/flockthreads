import { readFile } from "node:fs/promises";
import { dataFileUrl } from "./lib/datafile.js";
import { gql } from "./lib/shopify.js";
import { productDescription } from "./lib/description.js";
const data = JSON.parse(await readFile(dataFileUrl(), "utf8"));
for (const p of data.products) {
  const d = await gql(`query($q:String!){ products(first:1, query:$q){ nodes{ id } } }`, { q:`handle:${p.handle}` });
  const id = d.products.nodes[0]?.id;
  if (!id) { console.log(`  skip ${p.handle}`); continue; }
  await gql(`mutation($p:ProductInput!){ productUpdate(input:$p){ userErrors{ message } } }`, { p:{ id, descriptionHtml: productDescription(p, data.defaults) } });
  console.log(`  ${p.handle}: description + size chart set`);
}
console.log("Done.");
