// Generates Printful garment mockups (left-chest) per colorway, uploads them to
// Shopify, and replaces each product's flat print-art images with the mockups.
//
// Usage:
//   node --env-file=.env scripts/build-mockups.js              # first product only
//   node --env-file=.env scripts/build-mockups.js only=amen-again
//   node --env-file=.env scripts/build-mockups.js all
import { readFile, writeFile } from "node:fs/promises";
import { dataFileUrl } from "./lib/datafile.js";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gql } from "./lib/shopify.js";
import { pf } from "./lib/printful.js";
import { uploadImage } from "./lib/shopify-files.js";

const args = process.argv.slice(2);
const ALL = args.includes("all");
const ONLY = (args.find((a) => a.startsWith("only=")) || "").split("=")[1];

const data = JSON.parse(await readFile(dataFileUrl(), "utf8"));
const { defaults } = data;
const PLACE = defaults.printful_placement;
const colorName = (cw) => defaults.printful_color_map?.[cw.slug] || cw.label;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Bella 6400 catalog product id (mockup generator).
let CATALOG_ID;
async function catalogId() {
  if (CATALOG_ID) return CATALOG_ID;
  if (defaults.catalog_product_id) { CATALOG_ID = defaults.catalog_product_id; return CATALOG_ID; }
  const products = await pf("/products");
  const n = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const model = defaults.blank && defaults.blank.match(/\d{4}/) ? defaults.blank.match(/\d{4}/)[0] : "6400";
  CATALOG_ID = products.find((p) => n(p.model).includes(model) || n(p.title).includes(model)).id;
  return CATALOG_ID;
}

// Printful mockup generator is rate-limited (~2/min). Retry on 429, honoring the wait.
async function createTaskRetry(id, body) {
  for (let attempt = 0; attempt < 6; attempt++) {
    try { return await pf(`/mockup-generator/create-task/${id}`, { method: "POST", body }); }
    catch (e) {
      const m = /try again after (\d+)/i.exec(e.message);
      if (!/429|TooManyRequests/.test(e.message)) throw e;
      const wait = (m ? Number(m[1]) : 50) + 3;
      process.stdout.write(`(429, wait ${wait}s) `);
      await sleep(wait * 1000);
    }
  }
  throw new Error("mockup create-task: still rate-limited after retries");
}

async function mockupFor(variantId, artUrl) {
  const id = await catalogId();
  const task = await createTaskRetry(id, { variant_ids: [variantId], format: "png",
    files: [{ placement: PLACE.placement, image_url: artUrl,
      position: { area_width: PLACE.area_width, area_height: PLACE.area_height, width: PLACE.width, height: PLACE.height, top: PLACE.top, left: PLACE.left } }] });
  for (let i = 0; i < 30; i++) {
    await sleep(3000);
    const out = await pf(`/mockup-generator/task?task_key=${task.task_key}`);
    if (out.status === "completed") return out.mockups[0].mockup_url;
    if (out.status === "failed") throw new Error(`mockup task failed: ${JSON.stringify(out)}`);
  }
  throw new Error("mockup task timed out");
}

async function downloadTemp(url, name) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const p = join(tmpdir(), name);
  await writeFile(p, Buffer.from(await res.arrayBuffer()));
  return p;
}

async function replaceMedia(productId, mockups) {
  const cur = await gql(`query($id:ID!){ product(id:$id){ media(first:50){ nodes{ id } } } }`, { id: productId });
  const ids = cur.product.media.nodes.map((n) => n.id);
  if (ids.length) await gql(`mutation($id:ID!,$m:[ID!]!){ productDeleteMedia(productId:$id, mediaIds:$m){ deletedMediaIds mediaUserErrors{ message } } }`, { id: productId, m: ids });
  await gql(`mutation($id:ID!,$media:[CreateMediaInput!]!){ productCreateMedia(productId:$id, media:$media){ mediaUserErrors{ field message } } }`,
    { id: productId, media: mockups.map((m) => ({ originalSource: m.url, mediaContentType: "IMAGE", alt: m.alt })) });
}

async function main() {
  let targets = data.products;
  if (ONLY) targets = targets.filter((p) => p.handle === ONLY);
  else if (!ALL) targets = targets.slice(0, 1);
  console.log(`Targets: ${targets.map((t) => t.handle).join(", ")}\n`);

  for (const p of targets) {
    const d = await gql(`query($q:String!){ products(first:1, query:$q){ nodes{ id } } }`, { q: `handle:${p.handle}` });
    const productId = d.products.nodes[0]?.id;
    if (!productId) { console.log(`  not in Shopify, skip: ${p.handle}`); continue; }

    const mockups = [];
    for (const cw of p.colorways) {
      const artUrl = await uploadImage(cw.print_file);           // Shopify CDN url of print art
      const variantId = p.printful_variant_map[`${cw.slug}:S`];  // any size = same mockup
      process.stdout.write(`  mockup ${p.handle}/${cw.slug} … `);
      const mockUrl = await mockupFor(variantId, artUrl);
      const localPath = await downloadTemp(mockUrl, `mk_${p.handle}_${cw.slug}.png`);
      const cdnUrl = await uploadImage(localPath);               // upload mockup to Shopify
      mockups.push({ url: cdnUrl, alt: `${p.title} — ${colorName(cw)}` });
      console.log("ok");
    }
    await replaceMedia(productId, mockups);
    console.log(`  ${p.handle}: replaced with ${mockups.length} mockups\n`);
  }
  console.log("Done. Product images are now garment mockups.");
}

main().catch((e) => { console.error("MOCKUP BUILD FAILED:", e.message); process.exit(1); });
