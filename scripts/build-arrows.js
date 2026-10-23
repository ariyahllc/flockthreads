// "Arrows — Psalm 127:4" tee: verse on the front, quiver on the back, 1-6 arrows (one per child).
// Variants: Arrows x Color x Size (120). Each variant carries its own front + back print files in
// the printful.files metafield, which sync-orders.js sends to Printful as-is.
// Art: print-art/arrows.py (front) + print-art/quiver.py (backs). Photos: assets/arrows/.
//
//   node --env-file=.env scripts/build-arrows.js
// Re-run safe: reuses the product, rewrites metafields and photos.
import { readFile } from "node:fs/promises";
import { gql } from "./lib/shopify.js";
import { pf } from "./lib/printful.js";
import { uploadImage } from "./lib/shopify-files.js";

const HANDLE = "arrows-psalm-127-tee";
const root = new URL("../", import.meta.url);
const COLORS = { Black: "cream", Navy: "cream", "Heather Dust": "espresso", "Vintage White": "espresso" };
const PHOTO = { Black: "black", Navy: "navy", "Heather Dust": "dust", "Vintage White": "white" };
const SIZES = ["S", "M", "L", "XL", "2XL"];
const COUNTS = [1, 2, 3, 4, 5, 6].map((n) => `${n} Arrow${n > 1 ? "s" : ""}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Printful 3001 front/back area: 1800x2400 px at 150 dpi. Art is 300 dpi, so px / 2. 1.5 in from the top.
async function file(type, name) {
  const path = new URL(`print-art/print-ready/${name}.png`, root).pathname;
  const b = await readFile(path);
  const w = Math.round(b.readUInt32BE(16) / 2), h = Math.round(b.readUInt32BE(20) / 2);
  return { type, url: await uploadImage(path), position: { area_width: 1800, area_height: 2400, width: w, height: h, top: 225, left: Math.round((1800 - w) / 2) } };
}

const { variants: pfv } = await pf("/products/71");
const pfId = (c, s) => pfv.find((v) => v.color === c && v.size === s)?.id ?? (() => { throw new Error(`Printful has no ${c} / ${s}`); })();

let { products } = await gql(`query($q:String!){ products(first:1, query:$q){ nodes{ id } } }`, { q: `handle:${HANDLE}` });
let productId = products.nodes[0]?.id;
if (!productId) {
  const r = await gql(`mutation($p:ProductCreateInput!){ productCreate(product:$p){ product{ id } userErrors{ field message } } }`, { p: {
    title: "Arrows — Psalm 127:4 Tee", handle: HANDLE, status: "ACTIVE", productType: "T-Shirt", vendor: "FlockThreads",
    tags: ["faith", "new", "gift-for-dad", "unisex", "psalm-127", "front-and-back"],
    descriptionHtml: `<p><strong>"As arrows are in the hand of a mighty man; so are children of the youth."</strong> Psalm 127:4 (KJV)</p>
<p>The verse on the front. On the back, a quiver holding <strong>one arrow for each of your children</strong>. Pick 1 to 6 arrows.</p>
<p>A gift for the dad, mom or grandparent whose quiver is full. Printed to order on a soft Bella+Canvas 3001 unisex tee, front and back.</p>`,
    productOptions: [
      { name: "Arrows", values: COUNTS.map((name) => ({ name })) },
      { name: "Color", values: Object.keys(COLORS).map((name) => ({ name })) },
      { name: "Size", values: SIZES.map((name) => ({ name })) },
    ],
  } });
  if (r.productCreate.userErrors.length) throw new Error(JSON.stringify(r.productCreate.userErrors));
  productId = r.productCreate.product.id;
  const variants = COUNTS.flatMap((a) => Object.keys(COLORS).flatMap((c) => SIZES.map((s) => ({
    price: s === "2XL" ? "36.99" : "34.99", inventoryPolicy: "CONTINUE",
    optionValues: [{ optionName: "Arrows", name: a }, { optionName: "Color", name: c }, { optionName: "Size", name: s }],
  }))));
  for (let i = 0; i < variants.length; i += 100) {
    const v = await gql(`mutation($id:ID!,$v:[ProductVariantsBulkInput!]!){ productVariantsBulkCreate(productId:$id, variants:$v, strategy:${i ? "DEFAULT" : "REMOVE_STANDALONE_VARIANT"}){ userErrors{ field message } } }`, { id: productId, v: variants.slice(i, i + 100) });
    if (v.productVariantsBulkCreate.userErrors.length) throw new Error(JSON.stringify(v.productVariantsBulkCreate.userErrors));
  }
  const pub = await gql(`{ publications(first:10){ nodes{ id name } } }`);
  const online = pub.publications.nodes.find((p) => /online store/i.test(p.name));
  await gql(`mutation($id:ID!,$pid:ID!){ publishablePublish(id:$id, input:{publicationId:$pid}){ userErrors{ message } } }`, { id: productId, pid: online.id });
  console.log(`created ${HANDLE}: ${variants.length} variants`);
}

// Printful wiring: variant id + both print files per variant.
const { product } = await gql(`query($id:ID!){ product(id:$id){ variants(first:250){ nodes{ id selectedOptions{ name value } } } } }`, { id: productId });
const fronts = { cream: await file("front", "arrows-front-cream"), espresso: await file("front", "arrows-front-espresso") };
const backs = {};
const mf = [];
for (const v of product.variants.nodes) {
  const o = Object.fromEntries(v.selectedOptions.map((x) => [x.name, x.value]));
  const ink = COLORS[o.Color], n = parseInt(o.Arrows, 10);
  backs[`${n}-${ink}`] ??= await file("back", `arrows-back-${n}-${ink}`);
  mf.push({ ownerId: v.id, namespace: "printful", key: "variant_id", type: "single_line_text_field", value: String(pfId(o.Color, o.Size)) });
  mf.push({ ownerId: v.id, namespace: "printful", key: "files", type: "json", value: JSON.stringify([fronts[ink], backs[`${n}-${ink}`]]) });
}
for (let i = 0; i < mf.length; i += 25) {
  const r = await gql(`mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ userErrors{ field message } } }`, { m: mf.slice(i, i + 25) });
  if (r.metafieldsSet.userErrors.length) throw new Error(JSON.stringify(r.metafieldsSet.userErrors));
}
console.log(`wired ${product.variants.nodes.length} variants (front + back files)`);

// Photos: front on Black, the arrow chart, then each colour's back (linked to that colour).
const old = await gql(`query($id:ID!){ product(id:$id){ media(first:50){ nodes{ id } } } }`, { id: productId });
const photo = async (p, alt) => ({ originalSource: await uploadImage(new URL(`assets/arrows/${p}`, root).pathname), mediaContentType: "IMAGE", alt });
const media = [await photo("a-black-front.jpg", "Arrows — Psalm 127:4 Tee — front"), await photo("choose-your-arrows.jpg", "Choose 1 to 6 arrows")];
for (const [c, p] of Object.entries(PHOTO)) media.push(await photo(`a-${p}-back.jpg`, `Arrows — Psalm 127:4 Tee — ${c}`));
const made = await gql(`mutation($id:ID!,$m:[CreateMediaInput!]!){ productCreateMedia(productId:$id, media:$m){ media{ id alt } mediaUserErrors{ message } } }`, { id: productId, m: media });
if (made.productCreateMedia.mediaUserErrors.length) throw new Error(JSON.stringify(made.productCreateMedia.mediaUserErrors));
if (old.product.media.nodes.length)
  await gql(`mutation($id:ID!,$m:[ID!]!){ productDeleteMedia(productId:$id, mediaIds:$m){ mediaUserErrors{ message } } }`, { id: productId, m: old.product.media.nodes.map((m) => m.id) });
for (let i = 0; i < 20; i++) {  // variant media must be READY before linking
  const d = await gql(`query($id:ID!){ product(id:$id){ media(first:50){ nodes{ id status alt } } } }`, { id: productId });
  if (d.product.media.nodes.every((m) => m.status === "READY")) break;
  await sleep(2000);
}
const byAlt = Object.fromEntries(made.productCreateMedia.media.map((m) => [m.alt, m.id]));
const vm = product.variants.nodes.map((v) => {
  const c = v.selectedOptions.find((x) => x.name === "Color").value;
  return { variantId: v.id, mediaIds: [byAlt[`Arrows — Psalm 127:4 Tee — ${c}`]] };
});
for (let i = 0; i < vm.length; i += 100) {
  const r = await gql(`mutation($id:ID!,$vm:[ProductVariantAppendMediaInput!]!){ productVariantAppendMedia(productId:$id, variantMedia:$vm){ userErrors{ field message } } }`, { id: productId, vm: vm.slice(i, i + 100) });
  if (r.productVariantAppendMedia.userErrors.length) throw new Error(JSON.stringify(r.productVariantAppendMedia.userErrors));
}
console.log(`photos: ${media.length}, colour photos linked`);

// "Gifts for Dad" collection (any product tagged gift-for-dad).
const { collections } = await gql(`{ collections(first:1, query:"handle:gifts-for-dad"){ nodes{ id } } }`);
if (!collections.nodes[0]) {
  const c = await gql(`mutation($c:CollectionInput!){ collectionCreate(input:$c){ collection{ id } userErrors{ message } } }`, { c: {
    title: "Gifts for Dad", handle: "gifts-for-dad",
    descriptionHtml: "<p>Faith tees for the dad who leads the way. Made to order, printed front and back.</p>",
    ruleSet: { appliedDisjunctively: false, rules: [{ column: "TAG", relation: "EQUALS", condition: "gift-for-dad" }] } } });
  const pub = await gql(`{ publications(first:10){ nodes{ id name } } }`);
  const online = pub.publications.nodes.find((p) => /online store/i.test(p.name));
  await gql(`mutation($id:ID!,$pid:ID!){ publishablePublish(id:$id, input:{publicationId:$pid}){ userErrors{ message } } }`, { id: c.collectionCreate.collection.id, pid: online.id });
  console.log("created collection gifts-for-dad");
}
