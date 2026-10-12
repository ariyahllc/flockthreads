// Add one photo per color and link it to that color's variants,
// so picking a color on the product page swaps the photo.
// Usage: node --env-file=.env scripts/set-color-shots.js <handle> "<Color>=<image|main>" ...
//   "main" = reuse the product's current first image for that color.
import { gql } from "./lib/shopify.js";
import { uploadImage } from "./lib/shopify-files.js";

const [handle, ...pairs] = process.argv.slice(2);
if (!handle || !pairs.length) {
  console.error('usage: set-color-shots.js <handle> "<Color>=<image|main>" ...');
  process.exit(1);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { productByHandle: p } = await gql(
  `query($h:String!){ productByHandle(handle:$h){ id title
    media(first:50){ nodes{ id } }
    variants(first:100){ nodes{ id selectedOptions{ name value } } } } }`,
  { h: handle }
);
if (!p) throw new Error(`no product: ${handle}`);
const colorOf = (v) => v.selectedOptions.find((o) => /colou?r/i.test(o.name))?.value;

async function waitReady(mediaId) {
  for (let i = 0; i < 20; i++) {
    const d = await gql(`query($id:ID!){ node(id:$id){ ... on MediaImage { status } } }`, { id: mediaId });
    if (d.node?.status === "READY") return;
    if (d.node?.status === "FAILED") throw new Error(`media failed: ${mediaId}`);
    await sleep(2000);
  }
  throw new Error(`media not ready: ${mediaId}`);
}

const vm = [];
for (const pair of pairs) {
  const [color, file] = pair.split("=");
  const variants = p.variants.nodes.filter((v) => colorOf(v) === color);
  if (!variants.length) throw new Error(`${handle}: no variants with color "${color}"`);
  let mediaId;
  if (file === "main") {
    mediaId = p.media.nodes[0]?.id;
    if (!mediaId) throw new Error(`${handle}: no existing image for "main"`);
  } else {
    const url = await uploadImage(file);
    const r = await gql(
      `mutation($id:ID!,$m:[CreateMediaInput!]!){ productCreateMedia(productId:$id, media:$m){ media{ id } mediaUserErrors{ message } } }`,
      { id: p.id, m: [{ originalSource: url, mediaContentType: "IMAGE", alt: `${p.title} — ${color}` }] }
    );
    const errs = r.productCreateMedia.mediaUserErrors;
    if (errs.length) throw new Error(`${handle} ${color}: ${JSON.stringify(errs)}`);
    mediaId = r.productCreateMedia.media[0].id;
  }
  await waitReady(mediaId);
  for (const v of variants) vm.push({ variantId: v.id, mediaIds: [mediaId] });
  console.log(`${handle}: ${color} -> ${variants.length} variants`);
}

await gql(
  `mutation($id:ID!,$vm:[ProductVariantAppendMediaInput!]!){ productVariantAppendMedia(productId:$id, variantMedia:$vm){ userErrors{ field message } } }`,
  { id: p.id, vm }
);
console.log(`${handle}: linked ${vm.length} variants`);
