// Rebuilds the main menu to match the FlockThreads Store design spec:
// Men | Women | Unisex | Bundles | Churches | Design Yours
import { gql } from "./lib/shopify.js";

const ITEMS = [
  { title: "Men",      type: "COLLECTION", handle: "men" },
  { title: "Women",    type: "COLLECTION", handle: "women" },
  { title: "Unisex",   type: "COLLECTION", handle: "faith" },
  { title: "Bundles",  type: "COLLECTION", handle: "bundles" },
  { title: "Churches", type: "PAGE",       handle: "for-churches" },
  { title: "Design Yours", type: "PAGE",  handle: "design-your-tee" },
];

const d = await gql(`{ menus(first:10){ nodes{ id handle title } } }`);
const main = d.menus.nodes.find(m => m.handle === "main-menu") || d.menus.nodes[0];
console.log("menu:", main.handle, main.id);

// Resolve destinations
const items = [];
for (const it of ITEMS) {
  if (it.type === "COLLECTION") {
    const r = await gql(`query($q:String!){ collections(first:1, query:$q){ nodes{ id } } }`, { q:`handle:${it.handle}` });
    const id = r.collections.nodes[0]?.id;
    if (!id) { console.log(`  missing collection ${it.handle}, skip`); continue; }
    items.push({ title: it.title, type: "COLLECTION", resourceId: id });
  } else {
    const r = await gql(`query($q:String!){ pages(first:1, query:$q){ nodes{ id } } }`, { q:`handle:${it.handle}` });
    const id = r.pages.nodes[0]?.id;
    if (!id) { console.log(`  missing page ${it.handle}, skip`); continue; }
    items.push({ title: it.title, type: "PAGE", resourceId: id });
  }
}

const res = await gql(`mutation($id:ID!,$title:String!,$handle:String!,$items:[MenuItemUpdateInput!]!){
  menuUpdate(id:$id, title:$title, handle:$handle, items:$items){ menu{ items{ title } } userErrors{ field message } }
}`, { id: main.id, title: main.title, handle: main.handle, items });
console.log("nav:", res.menuUpdate.menu.items.map(i=>i.title).join(" | "));
