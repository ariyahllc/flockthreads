// "Matching Family Christmas Plaid": one shared plaid (print-art/pj_tiles.py) across every family member.
// Options: Piece x Size (32 variants). Each variant carries its Printful variant id and the full
// all-over-print panel list in printful.files, which sync-orders.js sends to Printful as-is.
//
//   node --env-file=.env scripts/build-pj.js           # build or refresh, as a DRAFT
//   node --env-file=.env scripts/build-pj.js --live    # make it ACTIVE and show it on the Online Store
// Re-run safe: reuses the product, rewrites metafields, mockups and photos.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { basename } from "node:path";
import { gql } from "./lib/shopify.js";
import { pf } from "./lib/printful.js";
import { uploadImage } from "./lib/shopify-files.js";

const HANDLE = "matching-family-christmas-plaid";
const LIVE = process.argv.includes("--live");
const root = new URL("../", import.meta.url);
const PJ = new URL("print-art/print-ready/pj/", root).pathname;
const MOCK = new URL("assets/christmas-pj/mockups/", root).pathname;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Piece -> Printful product, colour (label/piping), sizes with prices, panels per placement.
const PIECES = [
  // Women's joggers, not the PJ set: Printful makes its women's PJ top/pants only in China (Christmas cutoff
  // Nov 26 for US delivery); every piece here is made in the US (cutoff Dec 9). printful.com/holiday-order-deadlines
  { name: "Women's joggers", product: 401, sizes: { XS: 59, S: 59, M: 59, L: 59, XL: 59, "2XL": 61, "3XL": 63 },
    panels: { leg_left: "4950x7500", leg_right: "4950x7500" } },
  { name: "Men's joggers", product: 400, sizes: { XS: 59, S: 59, M: 59, L: 59, XL: 59, "2XL": 61, "3XL": 63 },
    panels: { leg_left: "4950x7500", leg_right: "4950x7500" } },
  { name: "Kids leggings (2T-7)", product: 322, sizes: { "2T": 32, "3T": 32, "4T": 32, "5T": 32, 6: 32, "6X": 32, 7: 32 },
    panels: { default: "5400x4650" } },
  { name: "Youth leggings (8-20)", product: 323, sizes: { 8: 32, 10: 32, 12: 32, 14: 32, 16: 32, 18: 32, 20: 32 },
    panels: { default: "6000x6000" } },
  { name: "Baby bodysuit (6-24M)", product: 843, color: "White", sizes: { "6M": 26, "12M": 26, "18M": 26, "24M": 26 }, heart: true },
];
const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "2T", "3T", "4T", "5T", "6", "6X", "7", "8", "10", "12", "14", "16", "18", "20", "6M", "12M", "18M", "24M"];

// Shopify Files upload (mockup photos and the baby heart).
async function upload(path, kind) {
  const filename = basename(path), bytes = await readFile(path), mime = path.endsWith(".png") ? "image/png" : "image/jpeg";
  const s = await gql(`mutation($input:[StagedUploadInput!]!){ stagedUploadsCreate(input:$input){ stagedTargets{ url resourceUrl parameters{ name value } } userErrors{ message } } }`,
    { input: [{ filename, mimeType: mime, httpMethod: "POST", resource: kind }] });
  const t = s.stagedUploadsCreate.stagedTargets[0], form = new FormData();
  t.parameters.forEach((p) => form.append(p.name, p.value)); form.append("file", new Blob([bytes], { type: mime }), filename);
  if (!(await fetch(t.url, { method: "POST", body: form })).ok) throw new Error("upload " + filename);
  const c = await gql(`mutation($f:[FileCreateInput!]!){ fileCreate(files:$f){ files{ id } userErrors{ message } } }`,
    { f: [{ originalSource: t.resourceUrl, contentType: kind === "FILE" ? "FILE" : "IMAGE" }] });
  if (c.fileCreate.userErrors.length) throw new Error(JSON.stringify(c.fileCreate.userErrors));
  const id = c.fileCreate.files[0].id;
  for (let i = 0; i < 80; i++) {
    const n = (await gql(`query($id:ID!){ node(id:$id){ ... on GenericFile { fileStatus url } ... on MediaImage { fileStatus image{ url } } } }`, { id })).node;
    if (n.fileStatus === "READY") return n.url || n.image.url;
    if (n.fileStatus === "FAILED") throw new Error("processing " + filename);
    await sleep(3000);
  }
  throw new Error("timeout " + filename);
}

// Panels are served from the public GitHub repo: Shopify's CDN returns 404 for images over ~25 MP, and the jogger panel is 37 MP.
const RAW = "https://raw.githubusercontent.com/ariyahllc/flockthreads/main/print-art/print-ready/pj/";
const panelUrl = {};
for (const p of new Set(PIECES.flatMap((x) => Object.values(x.panels || {})))) {
  panelUrl[p] = `${RAW}plaid-${p}.jpg`;
  const h = await fetch(panelUrl[p], { method: "HEAD" });
  if (!h.ok) throw new Error(`${panelUrl[p]} -> ${h.status} (commit and push print-art/print-ready/pj first)`);
}
const heartUrl = await uploadImage(`${PJ}baby-plaid-heart.png`);
const heartFile = { type: "front", url: heartUrl, position: { area_width: 1050, area_height: 1200, width: 668, height: 604, top: 200, left: 191 } };
const panelPos = (p) => { const [w, h] = p.split("x").map(Number); return { area_width: w, area_height: h, width: w, height: h, top: 0, left: 0 }; };
const filesFor = (piece) => piece.heart ? [heartFile] : Object.entries(piece.panels).map(([type, p]) => ({ type, url: panelUrl[p], position: panelPos(p) }));
console.log("print files uploaded");

// Printful variant ids per piece + size.
for (const piece of PIECES) {
  const { variants } = await pf(`/products/${piece.product}`);
  piece.pfv = {};
  for (const s of Object.keys(piece.sizes)) {
    const v = variants.find((x) => String(x.size) === String(s) && (!piece.color || x.color === piece.color));
    if (!v) throw new Error(`Printful ${piece.product} has no ${s} ${piece.color || ""}`);
    piece.pfv[s] = v.id;
  }
}

// Mockups from the real print files (same files the orders will use).
await mkdir(MOCK, { recursive: true });
const shots = [];
for (const piece of PIECES) {
  const size = Object.keys(piece.sizes)[Math.min(2, Object.keys(piece.sizes).length - 1)];
  const files = filesFor(piece).map(({ type, url, position }) => ({ placement: type, image_url: url, ...(position && { position }) }));
  let task;
  for (let i = 0; !task; i++) {
    try { task = await pf(`/mockup-generator/create-task/${piece.product}`, { method: "POST", body: { variant_ids: [piece.pfv[size]], format: "jpg", files } }); }
    catch (e) { if (!/429/.test(e.message) || i > 6) throw e; await sleep(60000); }
  }
  for (let i = 0; i < 120; i++) {
    await sleep(3000);
    const o = await pf(`/mockup-generator/task?task_key=${task.task_key}`);
    if (o.status === "failed") throw new Error(`${piece.name} mockup: ${JSON.stringify(o.error)}`);
    if (o.status !== "completed") continue;
    const urls = o.mockups.flatMap((m) => [m.mockup_url, ...(m.extra || []).map((e) => e.url)]).slice(0, 2);
    for (const [k, u] of urls.entries()) {
      const path = `${MOCK}${HANDLE}-${piece.product}-${k}.jpg`;
      await writeFile(path, Buffer.from(await (await fetch(u)).arrayBuffer()));
      shots.push({ path, alt: `Matching Family Christmas Plaid — ${piece.name}`, piece: piece.name });
    }
    break;
  }
}
console.log(`mockups: ${shots.length}`);

// Product (created as a draft; --live publishes it).
let { products } = await gql(`query($q:String!){ products(first:1, query:$q){ nodes{ id } } }`, { q: `handle:${HANDLE}` });
let productId = products.nodes[0]?.id;
if (!productId) {
  const sizes = SIZE_ORDER.filter((s) => PIECES.some((p) => String(s) in p.sizes));
  const r = await gql(`mutation($p:ProductCreateInput!){ productCreate(product:$p){ product{ id } userErrors{ field message } } }`, { p: {
    title: "Matching Family Christmas Plaid", handle: HANDLE, status: "DRAFT", productType: "Pajamas", vendor: "FlockThreads",
    tags: ["holiday", "christmas", "christmas-pj", "family", "matching", "women", "men", "kids", "baby"],
    descriptionHtml: `<p>One red and evergreen plaid for the whole family, from the baby to the grandparents. Pick a piece for each person and everyone matches on Christmas morning.</p>
<p><strong>Look closely:</strong> a tiny cream cross sits where the cream lines meet. Quiet, like the rest of what we make.</p>
<ul>
<li><strong>Women's and men's joggers:</strong> soft cotton-feel recycled polyester with a little stretch, brushed inside. Pair with a cream tee or sweatshirt.</li>
<li><strong>Kids and youth leggings:</strong> soft, stretchy polyester-elastane with an elastic waist.</li>
<li><strong>Baby bodysuit:</strong> 100% cotton jersey with a plaid heart, lap shoulders and a three-snap closure.</li>
</ul>
<p>Every piece is printed to order in the USA just for your family. <strong>Order by December 9</strong> for delivery before Christmas with standard shipping.</p>`,
    productOptions: [
      { name: "Piece", values: PIECES.map((p) => ({ name: p.name })) },
      { name: "Size", values: sizes.map((name) => ({ name: String(name) })) },
    ],
  } });
  if (r.productCreate.userErrors.length) throw new Error(JSON.stringify(r.productCreate.userErrors));
  productId = r.productCreate.product.id;
  const variants = PIECES.flatMap((p) => Object.entries(p.sizes).map(([s, price]) => ({
    price: price.toFixed(2), inventoryPolicy: "CONTINUE",
    optionValues: [{ optionName: "Piece", name: p.name }, { optionName: "Size", name: String(s) }],
  })));
  const v = await gql(`mutation($id:ID!,$v:[ProductVariantsBulkInput!]!){ productVariantsBulkCreate(productId:$id, variants:$v, strategy:REMOVE_STANDALONE_VARIANT){ userErrors{ field message } } }`, { id: productId, v: variants });
  if (v.productVariantsBulkCreate.userErrors.length) throw new Error(JSON.stringify(v.productVariantsBulkCreate.userErrors));
  console.log(`created ${HANDLE}: ${variants.length} variants (draft)`);
}

// Printful wiring.
const { product } = await gql(`query($id:ID!){ product(id:$id){ variants(first:100){ nodes{ id selectedOptions{ name value } } } } }`, { id: productId });
const mf = [];
for (const v of product.variants.nodes) {
  const o = Object.fromEntries(v.selectedOptions.map((x) => [x.name, x.value]));
  const piece = PIECES.find((p) => p.name === o.Piece);
  mf.push({ ownerId: v.id, namespace: "printful", key: "variant_id", type: "single_line_text_field", value: String(piece.pfv[o.Size]) });
  mf.push({ ownerId: v.id, namespace: "printful", key: "files", type: "json", value: JSON.stringify(filesFor(piece)) });
}
for (let i = 0; i < mf.length; i += 25) {
  const r = await gql(`mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ userErrors{ field message } } }`, { m: mf.slice(i, i + 25) });
  if (r.metafieldsSet.userErrors.length) throw new Error(JSON.stringify(r.metafieldsSet.userErrors));
}
console.log(`wired ${product.variants.nodes.length} variants`);

// Photos: optional family hero first (assets/christmas-pj/family.jpg), then each piece; each piece's first photo is linked to its variants.
const old = await gql(`query($id:ID!){ product(id:$id){ media(first:50){ nodes{ id } } } }`, { id: productId });
const media = [];
try { await readFile(new URL("assets/christmas-pj/family.jpg", root)); media.push({ originalSource: await upload(new URL("assets/christmas-pj/family.jpg", root).pathname, "IMAGE"), mediaContentType: "IMAGE", alt: "Matching Family Christmas Plaid — the whole family" }); } catch {}
for (const s of shots) media.push({ originalSource: await upload(s.path, "IMAGE"), mediaContentType: "IMAGE", alt: s.alt });
const made = await gql(`mutation($id:ID!,$m:[CreateMediaInput!]!){ productCreateMedia(productId:$id, media:$m){ media{ id alt } mediaUserErrors{ message } } }`, { id: productId, m: media });
if (made.productCreateMedia.mediaUserErrors.length) throw new Error(JSON.stringify(made.productCreateMedia.mediaUserErrors));
if (old.product.media.nodes.length)
  await gql(`mutation($id:ID!,$m:[ID!]!){ productDeleteMedia(productId:$id, mediaIds:$m){ mediaUserErrors{ message } } }`, { id: productId, m: old.product.media.nodes.map((m) => m.id) });
for (let i = 0; i < 30; i++) {
  const d = await gql(`query($id:ID!){ product(id:$id){ media(first:50){ nodes{ status } } } }`, { id: productId });
  if (d.product.media.nodes.every((m) => m.status === "READY")) break;
  await sleep(2000);
}
const firstByAlt = {};
for (const m of made.productCreateMedia.media) firstByAlt[m.alt] ??= m.id;
const vm = product.variants.nodes.map((v) => ({ variantId: v.id, mediaIds: [firstByAlt[`Matching Family Christmas Plaid — ${v.selectedOptions.find((x) => x.name === "Piece").value}`]] }));
const r = await gql(`mutation($id:ID!,$vm:[ProductVariantAppendMediaInput!]!){ productVariantAppendMedia(productId:$id, variantMedia:$vm){ userErrors{ field message } } }`, { id: productId, vm });
if (r.productVariantAppendMedia.userErrors.length) throw new Error(JSON.stringify(r.productVariantAppendMedia.userErrors));
console.log(`photos: ${media.length}`);

if (LIVE) {
  await gql(`mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ userErrors{ message } } }`, { p: { id: productId, status: "ACTIVE" } });
  const pub = await gql(`{ publications(first:10){ nodes{ id name } } }`);
  const online = pub.publications.nodes.find((p) => /online store/i.test(p.name));
  await gql(`mutation($id:ID!,$pid:ID!){ publishablePublish(id:$id, input:{publicationId:$pid}){ userErrors{ message } } }`, { id: productId, pid: online.id });
  console.log("LIVE: active + on the Online Store");
}
console.log(`admin: https://admin.shopify.com/store/rbamk2-r2/products/${productId.split("/").pop()}`);
