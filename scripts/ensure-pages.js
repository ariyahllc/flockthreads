// Creates (or re-points) the custom storefront pages the design spec needs,
// each bound to its own theme template via templateSuffix.
import { gql } from "./lib/shopify.js";

const PAGES = [
  { handle: "size-fit",       title: "Size & Fit",   suffix: "size-fit" },
  { handle: "church-account", title: "Request a church account", suffix: "church-account" },
  { handle: "track-order",    title: "Track an order", suffix: "track-order" },
];

for (const p of PAGES) {
  const found = await gql(`query($q:String!){ pages(first:1, query:$q){ nodes{ id } } }`, { q: `handle:${p.handle}` });
  const id = found.pages.nodes[0]?.id;
  if (id) {
    await gql(`mutation($id:ID!,$page:PageUpdateInput!){ pageUpdate(id:$id, page:$page){ userErrors{ field message } } }`,
      { id, page: { templateSuffix: p.suffix } });
    console.log(`  updated ${p.handle} -> template ${p.suffix}`);
  } else {
    await gql(`mutation($page:PageCreateInput!){ pageCreate(page:$page){ userErrors{ field message } } }`,
      { page: { handle: p.handle, title: p.title, templateSuffix: p.suffix, body: "" } });
    console.log(`  created ${p.handle} -> template ${p.suffix}`);
  }
}
console.log("Pages ready.");
