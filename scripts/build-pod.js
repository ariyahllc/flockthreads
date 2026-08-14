// Creates POD products (Printful) from data/products.json and syncs to Shopify.
// Idempotent by handle. Run: npm run build:pod
//
// NOTE: skeleton. Fills in once wash-test picks the provider and printful_variant_map
// is populated per product. Guards against half-configured data so it fails loud, not silent.
import { readFile } from "node:fs/promises";

const PROVIDER = process.env.POD_PROVIDER || "printful";

async function main() {
  const raw = await readFile(new URL("../data/products.json", import.meta.url), "utf8");
  const { products } = JSON.parse(raw);
  const real = products.filter((p) => !p.handle.startsWith("example-"));

  if (!real.length) {
    console.log("Only example product present. Add real products to data/products.json first.");
    return;
  }
  if (PROVIDER !== "printful") {
    console.log(`POD_PROVIDER=${PROVIDER} not wired yet (only printful).`);
    return;
  }

  const { pf } = await import("./lib/printful.js");
  for (const p of real) {
    if (p.price == null) throw new Error(`Product ${p.handle}: price is null (set from wash-test COGS).`);
    if (!p.printful_variant_map || !Object.keys(p.printful_variant_map).length) {
      throw new Error(`Product ${p.handle}: printful_variant_map empty (map + fulfillment-test each variant first).`);
    }
    // Create sync product -> Printful pushes it to the connected Shopify store.
    // Endpoint + payload finalized against the live catalog once a mapping exists.
    console.log(`  would create Printful sync product: ${p.handle} (${Object.keys(p.printful_variant_map).length} variants)`);
    // await pf("/store/products", { method: "POST", body: buildSyncProduct(p) });
  }
  console.log("POD build complete (dry run until variant maps + prices are filled).");
}

main().catch((e) => {
  console.error("BUILD FAILED:", e.message);
  process.exit(1);
});
