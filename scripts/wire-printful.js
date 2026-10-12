// Wires Shopify variants to their physical Printful print, from data/printful-wiring.json.
// Sets per-variant metafields printful.variant_id, printful.art_url, printful.position
// (read by sync-orders.js), and can pull Printful's own mockups to check photos against.
//
//   node --env-file=.env scripts/wire-printful.js            # plan only, writes nothing
//   node --env-file=.env scripts/wire-printful.js apply      # write metafields
//   node --env-file=.env scripts/wire-printful.js mockups    # save Printful mockups to tmp/printful-mockups/
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { gql } from "./lib/shopify.js";
import { pf } from "./lib/printful.js";
import { uploadImage } from "./lib/shopify-files.js";

const APPLY = process.argv.includes("apply");
const MOCKUPS = process.argv.includes("mockups");
const root = new URL("../", import.meta.url);
const cfg = JSON.parse(await readFile(new URL("data/printful-wiring.json", root), "utf8"));
const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// PNG width/height straight from the IHDR header.
async function pngSize(path) {
  const b = await readFile(path);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

const catalog = {};
async function catalogIndex(id) {
  if (!catalog[id]) {
    const d = await pf(`/products/${id}`);
    catalog[id] = new Map(d.variants.map((v) => [`${norm(v.color)}:${norm(v.size)}`, v.id]));
  }
  return catalog[id];
}

// Printful mockup generator is rate-limited (~2/min): honor its wait on 429.
async function mockup(catalogId, variantId, file) {
  let task;
  for (let i = 0; !task; i++) {
    try { task = await pf(`/mockup-generator/create-task/${catalogId}`, { method: "POST", body: { variant_ids: [variantId], format: "jpg", files: [file] } }); }
    catch (e) {
      if (!/429|TooManyRequests/.test(e.message) || i > 6) throw e;
      const wait = Number(/after (\d+)/i.exec(e.message)?.[1] || 50) + 3;
      process.stdout.write(`(429 wait ${wait}s) `); await sleep(wait * 1000);
    }
  }
  for (let i = 0; i < 40; i++) {
    await sleep(3000);
    const out = await pf(`/mockup-generator/task?task_key=${task.task_key}`);
    if (out.status === "completed") return out.mockups[0].mockup_url;
    if (out.status === "failed") throw new Error(`mockup failed: ${JSON.stringify(out)}`);
  }
  throw new Error("mockup timed out");
}

const outDir = new URL("tmp/printful-mockups/", root);
if (MOCKUPS) await mkdir(outDir, { recursive: true });

const ONLY = process.argv.find((a) => a.startsWith("only="))?.slice(5).split(",");
for (const [handle, spec] of Object.entries(cfg.products)) {
  if (ONLY && !ONLY.includes(handle)) continue;
  const { productByHandle: p } = await gql(
    `query($h:String!){ productByHandle(handle:$h){ variants(first:100){ nodes{ id selectedOptions{ name value } } } } }`,
    { h: handle }
  );
  if (!p) throw new Error(`no product: ${handle}`);

  const metafields = [];
  const unmapped = new Set();
  for (const [color, [pfColor, ink, blankKey]] of Object.entries(spec.colors)) {
    const blank = cfg.blanks[blankKey || spec.blank];
    const index = await catalogIndex(blank.catalog_id);
    const artPath = new URL(`print-art/print-ready/${spec.art}-${ink}.png`, root).pathname;
    const [aw, ah] = await pngSize(artPath);
    // Art is 300dpi, Printful area is 150dpi: native size = art px / 2.
    const w = Math.round((aw / 2) * blank.scale), h = Math.round((ah / 2) * blank.scale);
    const position = { placement: "front", area_width: blank.area[0], area_height: blank.area[1],
      width: w, height: h, top: Math.round(blank.top_in * 150), left: Math.round((blank.area[0] - w) / 2) };
    const url = APPLY || MOCKUPS ? await uploadImage(artPath) : "(not uploaded in plan mode)";

    const vs = p.variants.nodes.filter((v) => v.selectedOptions.find((o) => /colou?r/i.test(o.name))?.value === color);
    if (!vs.length) throw new Error(`${handle}: no Shopify variants with color "${color}"`);
    let firstVid;
    for (const v of vs) {
      const size = v.selectedOptions.find((o) => /size/i.test(o.name))?.value;
      const vid = index.get(`${norm(pfColor)}:${norm(size)}`);
      if (!vid) throw new Error(`${handle}: Printful has no ${pfColor} / ${size} on catalog ${blank.catalog_id}`);
      firstVid ??= vid;
      for (const [key, value, type] of [["variant_id", String(vid), "single_line_text_field"],
        ["art_url", url, "url"], ["position", JSON.stringify(position), "json"]]) {
        metafields.push({ ownerId: v.id, namespace: "printful", key, type, value });
      }
    }
    console.log(`${handle} | ${color} -> ${pfColor}, ${ink} ink, ${(w / 150).toFixed(1)}x${(h / 150).toFixed(1)}in, ${vs.length} sizes`);

    if (MOCKUPS) {
      const m = await mockup(blank.catalog_id, firstVid, { placement: "front", image_url: url,
        position: { area_width: position.area_width, area_height: position.area_height, width: w, height: h, top: position.top, left: position.left } });
      const res = await fetch(m);
      await writeFile(new URL(`${handle}--${norm(color)}.jpg`, outDir), Buffer.from(await res.arrayBuffer()));
      await writeFile(new URL(`${handle}--${norm(color)}.url`, outDir), m);
    }
  }
  for (const v of p.variants.nodes) {
    const c = v.selectedOptions.find((o) => /colou?r/i.test(o.name))?.value;
    if (!spec.colors[c]) unmapped.add(c);
  }
  if (unmapped.size) console.log(`  WARNING ${handle}: colors with no physical print mapped: ${[...unmapped].join(", ")}`);

  if (APPLY) {
    for (let i = 0; i < metafields.length; i += 25) {
      await gql(`mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ userErrors{ field message } } }`,
        { m: metafields.slice(i, i + 25) });
    }
    console.log(`  wrote ${metafields.length} metafields`);
  }
}
