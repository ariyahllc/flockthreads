// Reorders product media so each product's FIRST image is a different colorway,
// so the storefront grid isn't five identical beige shirts.
import { gql } from "./lib/shopify.js";

const FEATURE = {
  "called-to-this":       "Heather Stone",
  "strength-and-dignity": "Military Green",
  "fuerza-y-dignidad":    "Black",
  "amen-again":           "Vintage White",
  "her-children-rise":    "Mauve",
};

for (const [handle, color] of Object.entries(FEATURE)) {
  const d = await gql(`query($q:String!){ products(first:1, query:$q){ nodes{ id media(first:20){ nodes{ id alt } } } } }`, { q:`handle:${handle}` });
  const p = d.products.nodes[0];
  if (!p) { console.log(`  skip ${handle}`); continue; }
  const target = p.media.nodes.find(m => (m.alt||"").endsWith(color));
  if (!target) { console.log(`  ${handle}: no media for ${color}`); continue; }
  if (p.media.nodes[0].id === target.id) { console.log(`  ${handle}: already ${color}`); continue; }
  await gql(`mutation($id:ID!,$moves:[MoveInput!]!){ productReorderMedia(id:$id, moves:$moves){ userErrors{ message } } }`,
    { id: p.id, moves: [{ id: target.id, newPosition: "0" }] });
  console.log(`  ${handle}: featured -> ${color}`);
}
console.log("Done.");
