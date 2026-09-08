// Creates the "Custom Church Tee" product that the church designer adds to cart.
// One variant per colour + size. Priced for POD-fulfilled group runs.
import { gql } from "./lib/shopify.js";

const HANDLE = "custom-church-tee";
const PRICE = "21.99";
const COLORS = ["Heather Dust", "Vintage White", "Heather Olive", "Black"];
const SIZES = ["S", "M", "L", "XL", "2XL"];

// Group orders are one design across mixed sizes, so Colour is the only variant.
// The size breakdown rides along as a line-item property and is confirmed at proof.
const existing = await gql(`query($q:String!){ products(first:1, query:$q){ nodes{ id } } }`, { q: `handle:${HANDLE}` });
if (existing.products.nodes[0]) {
  await gql(`mutation($id:ID!){ productDelete(input:{id:$id}){ deletedProductId } }`, { id: existing.products.nodes[0].id });
  console.log("replaced existing", HANDLE);
}

const created = await gql(
  `mutation($input:ProductInput!){ productCreate(input:$input){ product{ id } userErrors{ field message } } }`,
  { input: {
      title: "Custom Church Tee",
      handle: HANDLE,
      status: "ACTIVE",
      productType: "T-Shirt",
      vendor: "FlockThreads",
      tags: ["custom", "churches", "group-order"],
      descriptionHtml: `
<p>Your church's own design, printed on the same Bella+Canvas blanks we use for our whole range.</p>
<p><strong>How it works:</strong> design it in the builder, add to cart, and we send a proof before anything is printed. Nothing goes to press without your approval.</p>
<p><strong>Minimum order:</strong> 24 pieces. Mix sizes and colours freely.</p>
<p><strong>Turnaround:</strong> proof within 1 business day, then 7-10 days to deliver.</p>`,
      productOptions: [{ name: "Color", values: COLORS.map((name) => ({ name })) }],
    } }
);
const productId = created.productCreate.product.id;

const variants = COLORS.map((c) => ({
  price: PRICE,
  optionValues: [{ optionName: "Color", name: c }],
  inventoryPolicy: "CONTINUE",
}));
await gql(
  `mutation($productId:ID!,$variants:[ProductVariantsBulkInput!]!){
     productVariantsBulkCreate(productId:$productId, variants:$variants, strategy:REMOVE_STANDALONE_VARIANT){ userErrors{ field message } } }`,
  { productId, variants }
);

const pub = await gql(`{ publications(first:5){ nodes{ id name } } }`);
const online = pub.publications.nodes.find((p) => /online store/i.test(p.name));
if (online) await gql(`mutation($id:ID!,$pid:ID!){ publishablePublish(id:$id, input:{publicationId:$pid}){ userErrors{ message } } }`, { id: productId, pid: online.id });

console.log(`created ${HANDLE}: ${variants.length} variants @ $${PRICE}, published`);
