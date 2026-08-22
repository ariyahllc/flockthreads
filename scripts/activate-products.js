import { readFile } from "node:fs/promises";
import { gql } from "./lib/shopify.js";
const data = JSON.parse(await readFile(new URL("../data/products.json", import.meta.url), "utf8"));
const pub = await gql(`{ publications(first:10){ nodes{ id name } } }`);
const online = pub.publications.nodes.find(p=>/online store/i.test(p.name));
for (const p of data.products) {
  const d = await gql(`query($q:String!){ products(first:1, query:$q){ nodes{ id status } } }`, { q:`handle:${p.handle}` });
  const prod = d.products.nodes[0]; if (!prod) { console.log(`skip ${p.handle}`); continue; }
  await gql(`mutation($p:ProductInput!){ productUpdate(input:$p){ product{status} userErrors{message} } }`, { p:{ id:prod.id, status:"ACTIVE" } });
  if (online) await gql(`mutation($id:ID!,$pid:ID!){ publishablePublish(id:$id, input:{publicationId:$pid}){ userErrors{message} } }`, { id:prod.id, pid:online.id });
  console.log(`  ${p.handle}: ACTIVE + published`);
}
console.log("Done.");
