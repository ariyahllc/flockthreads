// Writes custom.verse on each product so the card + PDP can show the scripture
// reference line the design spec calls for.
import { readFile } from "node:fs/promises";
import { dataFileUrl } from "./lib/datafile.js";
import { gql } from "./lib/shopify.js";

// Accurate references. Products with no scripture stay blank (line just hides).
const VERSE = {
  "strength-and-dignity": "PROV. 31:25",
  "fuerza-y-dignidad":    "PROV. 31:25",
  "her-children-rise":    "PROV. 31:28",
  "called-to-this":       "",
  "amen-again":           "",
};

const data = JSON.parse(await readFile(dataFileUrl(), "utf8"));
const handles = new Set(data.products.map((p) => p.handle));
for (const h of [...handles]) {
  // men's variants share the base design's reference
  const base = h.replace(/-mens$/, "");
  // The catalog file is the source of truth; VERSE is a fallback for the
  // original drop, which predates the per-product `verse` field.
  const fromData = data.products.find((p) => p.handle === h)?.verse;
  const verse = fromData || VERSE[base];
  if (!verse) { console.log(`  ${h}: no verse, skip`); continue; }
  const d = await gql(`query($q:String!){ products(first:1, query:$q){ nodes{ id } } }`, { q: `handle:${h}` });
  const id = d.products.nodes[0]?.id;
  if (!id) { console.log(`  ${h}: not in Shopify`); continue; }
  await gql(`mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ userErrors{ field message } } }`,
    { m: [{ ownerId: id, namespace: "custom", key: "verse", type: "single_line_text_field", value: verse }] });
  console.log(`  ${h} <- ${verse}`);
}
console.log("Verse metafields set.");
