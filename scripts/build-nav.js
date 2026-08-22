import { gql } from "./lib/shopify.js";

// 1. Faith collection (smart, tag=faith) — all 5 tees.
async function ensureFaithCollection() {
  const q = await gql(`query{ collections(first:20){ nodes{ id handle } } }`);
  if (q.collections.nodes.find(c => c.handle === "faith")) { console.log("  collection 'faith' exists"); return; }
  const r = await gql(`mutation($input:CollectionInput!){ collectionCreate(input:$input){ collection{ handle } userErrors{ field message } } }`,
    { input: { title: "Faith", handle: "faith", descriptionHtml: "<p>Tasteful faith tees, printed to last.</p>",
      ruleSet: { appliedDisjunctively: false, rules: [{ column: "TAG", relation: "EQUALS", condition: "faith" }] } } });
  console.log("  collection created:", r.collectionCreate.collection?.handle);
}

async function menuByHandle(h) {
  const q = await gql(`query($h:String!){ menus(first:10, query:$h){ nodes{ id handle } } }`, { h });
  return q.menus.nodes.find(m => m.handle === h);
}
async function setMenu(handle, title, items) {
  const m = await menuByHandle(handle);
  if (!m) { console.log(`  menu '${handle}' not found, skip`); return; }
  const r = await gql(`mutation($id:ID!,$title:String!,$handle:String!,$items:[MenuItemUpdateInput!]!){
    menuUpdate(id:$id, title:$title, handle:$handle, items:$items){ userErrors{ field message } } }`,
    { id: m.id, title, handle, items });
  const err = r.menuUpdate.userErrors;
  console.log(`  menu '${handle}':`, err.length ? JSON.stringify(err) : "updated");
}

await ensureFaithCollection();
// Menus need write_online_store_navigation (app lacks it). Done via admin UI instead.
// Kept for reference; wrapped so the collection step never fails on scope.
try {
await setMenu("main-menu", "Main menu", [
  { title: "Home", type: "FRONTPAGE", url: "/" },
  { title: "Shop", type: "HTTP", url: "/collections/faith" },
  { title: "For Churches", type: "HTTP", url: "/pages/for-churches" },
  { title: "About", type: "HTTP", url: "/pages/about" },
]);
await setMenu("footer", "Footer menu", [
  { title: "Quality", type: "HTTP", url: "/pages/quality" },
  { title: "Shipping & Returns", type: "HTTP", url: "/pages/shipping-returns" },
  { title: "For Churches", type: "HTTP", url: "/pages/for-churches" },
]);
} catch (e) { console.log("  menus skipped (needs write_online_store_navigation; set in admin UI):", e.message); }
console.log("Done.");
