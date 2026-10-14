// Creates the "Design Your Own Tee" product + page behind theme/sections/ft-design-yours.liquid.
// Shoppers upload art and buy from 1 tee. One variant per colour x size, each wired to its
// Printful Bella+Canvas 3001 variant. The art itself rides on the cart line (properties[Print file]),
// already rendered at full print-area size, so the Printful position is the whole area.
//
//   node --env-file=.env scripts/build-design-yours.js
// Safe to re-run: reuses the product and page if they exist, rewrites the Printful metafields.
import { gql } from "./lib/shopify.js";
import { pf } from "./lib/printful.js";

const HANDLE = "design-your-own-tee";
const PAGE = "design-yours";
const CATALOG = 71; // Bella+Canvas 3001
const PRICE = "29.99", PRICE_2XL = "31.99";
// Keep in sync with COLORS in the section.
const COLORS = ["Black", "White", "Vintage White", "Heather Dust", "Navy", "Forest", "Maroon", "Dark Grey"];
const SIZES = ["S", "M", "L", "XL", "2XL"];
const POSITION = { placement: "front", area_width: 1800, area_height: 2400, width: 1800, height: 2400, top: 0, left: 0 };

const { variants: pfVariants } = await pf(`/products/${CATALOG}`);
const pfId = (c, s) => pfVariants.find((v) => v.color === c && v.size === s)?.id;
for (const c of COLORS) for (const s of SIZES) if (!pfId(c, s)) throw new Error(`Printful has no ${c} / ${s}`);

let { products } = await gql(`query($q:String!){ products(first:1, query:$q){ nodes{ id } } }`, { q: `handle:${HANDLE}` });
let productId = products.nodes[0]?.id;
if (!productId) {
  const r = await gql(`mutation($p:ProductCreateInput!){ productCreate(product:$p){ product{ id } userErrors{ field message } } }`, {
    p: {
      title: "Design Your Own Tee", handle: HANDLE, status: "ACTIVE", productType: "T-Shirt", vendor: "FlockThreads",
      tags: ["custom", "design-yours"],
      descriptionHtml: `<p>Your own art, printed on a soft Bella+Canvas 3001 unisex tee. Order just one as a sample, then order more when you love it.</p>
<p>Design it at <a href="/pages/${PAGE}">Design Yours</a>.</p>`,
      productOptions: [
        { name: "Color", values: COLORS.map((name) => ({ name })) },
        { name: "Size", values: SIZES.map((name) => ({ name })) },
      ],
    },
  });
  if (r.productCreate.userErrors.length) throw new Error(JSON.stringify(r.productCreate.userErrors));
  productId = r.productCreate.product.id;
  const variants = COLORS.flatMap((c) => SIZES.map((s) => ({
    price: s === "2XL" ? PRICE_2XL : PRICE, inventoryPolicy: "CONTINUE",
    optionValues: [{ optionName: "Color", name: c }, { optionName: "Size", name: s }],
  })));
  const v = await gql(`mutation($id:ID!,$v:[ProductVariantsBulkInput!]!){ productVariantsBulkCreate(productId:$id, variants:$v, strategy:REMOVE_STANDALONE_VARIANT){ userErrors{ field message } } }`, { id: productId, v: variants });
  if (v.productVariantsBulkCreate.userErrors.length) throw new Error(JSON.stringify(v.productVariantsBulkCreate.userErrors));
  const pub = await gql(`{ publications(first:10){ nodes{ id name } } }`);
  const online = pub.publications.nodes.find((p) => /online store/i.test(p.name));
  await gql(`mutation($id:ID!,$pid:ID!){ publishablePublish(id:$id, input:{publicationId:$pid}){ userErrors{ message } } }`, { id: productId, pid: online.id });
  console.log(`created ${HANDLE}: ${variants.length} variants`);
}

// Printful wiring + keep the bare product page out of search (shoppers start on the design page).
const { product } = await gql(`query($id:ID!){ product(id:$id){ variants(first:100){ nodes{ id selectedOptions{ name value } } } } }`, { id: productId });
const mf = [{ ownerId: productId, namespace: "seo", key: "hidden", type: "number_integer", value: "1" }];
for (const v of product.variants.nodes) {
  const o = Object.fromEntries(v.selectedOptions.map((x) => [x.name, x.value]));
  mf.push({ ownerId: v.id, namespace: "printful", key: "variant_id", type: "single_line_text_field", value: String(pfId(o.Color, o.Size)) });
  mf.push({ ownerId: v.id, namespace: "printful", key: "position", type: "json", value: JSON.stringify(POSITION) });
}
for (let i = 0; i < mf.length; i += 25) {
  const r = await gql(`mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ userErrors{ field message } } }`, { m: mf.slice(i, i + 25) });
  if (r.metafieldsSet.userErrors.length) throw new Error(JSON.stringify(r.metafieldsSet.userErrors));
}
console.log(`wired ${product.variants.nodes.length} variants to Printful`);

const { pages } = await gql(`query($q:String!){ pages(first:1, query:$q){ nodes{ id } } }`, { q: `handle:${PAGE}` });
if (!pages.nodes[0]) {
  const r = await gql(`mutation($p:PageCreateInput!){ pageCreate(page:$p){ page{ id } userErrors{ field message } } }`,
    { p: { title: "Design Yours", handle: PAGE, templateSuffix: PAGE, isPublished: true, body: "" } });
  if (r.pageCreate.userErrors.length) throw new Error(JSON.stringify(r.pageCreate.userErrors));
  console.log(`created page /pages/${PAGE}`);
}
