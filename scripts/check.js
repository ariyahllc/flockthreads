// Preflight: verify credentials before any build. Run: npm run check
import { gql } from "./lib/shopify.js";

async function main() {
  console.log("Checking Shopify…");
  const shop = await gql(`{ shop { name myshopifyDomain currencyCode } }`);
  console.log("  OK:", shop.shop.name, shop.shop.myshopifyDomain, shop.shop.currencyCode);

  const provider = process.env.POD_PROVIDER || "printful";
  console.log(`Checking POD provider = ${provider}…`);
  if (provider === "printful") {
    const { ping } = await import("./lib/printful.js");
    const stores = await ping();
    console.log("  OK: Printful stores:", JSON.stringify(stores).slice(0, 200));
  } else {
    console.log("  Skipped (only printful wired so far).");
  }
  console.log("\nAll credentials valid. Ready to build.");
}

main().catch((e) => {
  console.error("\nCHECK FAILED:", e.message);
  process.exit(1);
});
