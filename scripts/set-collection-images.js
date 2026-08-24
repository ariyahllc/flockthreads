// Gives each collection a real image (its first product's featured mockup),
// so the storefront grid stops falling back to Shopify placeholder illustrations.
import { gql } from "./lib/shopify.js";

const PICK = {
  "best-sellers": "her-children-rise",
  "women":        "amen-again",
  "men":          "called-to-this-mens",
  "for-churches": "strength-and-dignity",
  "espanol":      "fuerza-y-dignidad",
};

for (const [coll, productHandle] of Object.entries(PICK)) {
  const c = await gql(`query($q:String!){ collections(first:1, query:$q){ nodes{ id title } } }`, { q: `handle:${coll}` });
  const col = c.collections.nodes[0];
  if (!col) { console.log(`  no collection ${coll}`); continue; }

  const p = await gql(`query($q:String!){ products(first:1, query:$q){ nodes{ featuredMedia{ preview{ image{ url } } } } } }`, { q: `handle:${productHandle}` });
  const url = p.products.nodes[0]?.featuredMedia?.preview?.image?.url;
  if (!url) { console.log(`  ${coll}: no image on ${productHandle}`); continue; }

  const r = await gql(`mutation($input:CollectionInput!){ collectionUpdate(input:$input){ userErrors{ field message } } }`,
    { input: { id: col.id, image: { src: url.split("?")[0], altText: col.title } } });
  console.log(`  ${coll} <- ${productHandle}`);
}
console.log("Collection images set.");
