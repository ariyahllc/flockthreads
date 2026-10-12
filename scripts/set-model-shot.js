// Replace a product's images with one model shot.
// Usage: node --env-file=.env scripts/set-model-shot.js <handle>=<local-image> [...]
import { gql } from "./lib/shopify.js";
import { uploadImage } from "./lib/shopify-files.js";

const pairs = process.argv.slice(2).map((a) => a.split("="));
if (!pairs.length || pairs.some((p) => p.length !== 2)) {
  console.error("usage: set-model-shot.js <handle>=<image> ...");
  process.exit(1);
}

for (const [handle, file] of pairs) {
  const { productByHandle: p } = await gql(
    `query($h:String!){ productByHandle(handle:$h){ id title media(first:50){ nodes{ id } } } }`,
    { h: handle }
  );
  if (!p) throw new Error(`no product: ${handle}`);
  const url = await uploadImage(file);
  // Add new first, then delete old, so the product is never left without an image.
  await gql(
    `mutation($id:ID!,$m:[CreateMediaInput!]!){ productCreateMedia(productId:$id, media:$m){ mediaUserErrors{ message } } }`,
    { id: p.id, m: [{ originalSource: url, mediaContentType: "IMAGE", alt: p.title }] }
  );
  const old = p.media.nodes.map((n) => n.id);
  if (old.length) {
    await gql(
      `mutation($id:ID!,$m:[ID!]!){ productDeleteMedia(productId:$id, mediaIds:$m){ mediaUserErrors{ message } } }`,
      { id: p.id, m: old }
    );
  }
  console.log(`${handle}: replaced ${old.length} image(s) -> ${url}`);
}
