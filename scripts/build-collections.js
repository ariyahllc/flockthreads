// Creates the storefront collections and assigns products.
// Idempotent by handle. Run: node --env-file=.env scripts/build-collections.js
import { gql } from "./lib/shopify.js";

const COLLECTIONS = [
  { handle: "women", title: "Women", descr: "Soft, side-seamed women's tees with quiet left-chest type.", products: ["called-to-this", "strength-and-dignity", "fuerza-y-dignidad", "amen-again", "her-children-rise"] },
  { handle: "best-sellers", title: "Best Sellers", descr: "The pieces people keep coming back for.", products: ["called-to-this", "strength-and-dignity", "her-children-rise"] },
  { handle: "for-churches", title: "For Churches", descr: "Group orders for VBS, mission trips, camps, and ministry teams.", products: ["strength-and-dignity", "called-to-this"] },
  { handle: "espanol", title: "Español", descr: "Apparel de fe en español.", products: ["fuerza-y-dignidad"] },
  { handle: "men", title: "Men", descr: "Men's faith tees — coming soon.", products: [] },
  { handle: "bundles", title: "Bundles", descr: "Pairs and sets — mom and daughter, two colors, team packs.", products: [] },
];

async function productId(handle) {
  const d = await gql(`query($q:String!){ products(first:1, query:$q){ nodes{ id } } }`, { q: `handle:${handle}` });
  return d.products.nodes[0]?.id || null;
}

async function collectionId(handle) {
  const d = await gql(`query($q:String!){ collections(first:1, query:$q){ nodes{ id } } }`, { q: `handle:${handle}` });
  return d.collections.nodes[0]?.id || null;
}

async function main() {
  for (const c of COLLECTIONS) {
    let id = await collectionId(c.handle);
    if (!id) {
      const created = await gql(
        `mutation($input:CollectionInput!){ collectionCreate(input:$input){ collection{ id } userErrors{ field message } } }`,
        { input: { handle: c.handle, title: c.title, descriptionHtml: `<p>${c.descr}</p>` } }
      );
      id = created.collectionCreate.collection.id;
      console.log(`  created collection: ${c.title}`);
    } else {
      console.log(`  exists: ${c.title}`);
    }

    if (c.products.length) {
      const ids = (await Promise.all(c.products.map(productId))).filter(Boolean);
      await gql(`mutation($id:ID!,$p:[ID!]!){ collectionAddProducts(id:$id, productIds:$p){ userErrors{ field message } } }`, { id, p: ids });
      console.log(`    + ${ids.length} products`);
    }

    // Publish to the Online Store channel so it appears on the storefront.
    const pubs = await gql(`{ publications(first:10){ nodes{ id name } } }`);
    const online = pubs.publications.nodes.find((p) => /online store/i.test(p.name));
    if (online) {
      try {
        await gql(`mutation($id:ID!,$pid:ID!){ publishablePublish(id:$id, input:{publicationId:$pid}){ userErrors{ message } } }`, { id, pid: online.id });
      } catch { /* already published */ }
    }
  }
  console.log("\nCollections done.");
}

main().catch((e) => { console.error("COLLECTIONS FAILED:", e.message); process.exit(1); });
