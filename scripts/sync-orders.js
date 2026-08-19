// Path B order sync: bridges Shopify sales -> Printful fulfillment (no native app).
//
//   default : find PAID + UNFULFILLED Shopify orders not yet sent, create Printful orders
//   confirm : same, but auto-submit the Printful order (charges you). Without it, orders
//             are created as DRAFTS in Printful for you to review — nothing is charged.
//   track   : pull tracking from shipped Printful orders, write Shopify fulfillments back
//
// PRINTFUL_TOKEN must be a Manual Order / API store token (Shopify-connected stores
// reject API order creation, same as product creation).
import { readFile } from "node:fs/promises";
import { gql } from "./lib/shopify.js";
import { pf } from "./lib/printful.js";

const args = process.argv.slice(2);
const CONFIRM = args.includes("confirm");
const TRACK = args.includes("track");

// Left-chest placement (position box) shared by every order item.
const { defaults } = JSON.parse(await readFile(new URL("../data/products.json", import.meta.url), "utf8"));
const PLACE = defaults.printful_placement;

// --- Shopify helpers ---
async function paidUnsentOrders() {
  const d = await gql(`query{
    orders(first:25, query:"financial_status:paid fulfillment_status:unfulfilled"){
      nodes{ id name
        printful:metafield(namespace:"printful", key:"order_id"){ value }
        shippingAddress{ firstName lastName address1 address2 city provinceCode countryCodeV2 zip phone }
        lineItems(first:50){ nodes{ quantity
          variant{ id
            vid:metafield(namespace:"printful", key:"variant_id"){ value }
            art:metafield(namespace:"printful", key:"art_url"){ value } } } } }
    } }`);
  return d.orders.nodes.filter((o) => !o.printful?.value); // skip already-sent
}

async function markSent(orderId, printfulId) {
  await gql(`mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ userErrors{ field message } } }`,
    { m: [{ ownerId: orderId, namespace: "printful", key: "order_id", type: "single_line_text_field", value: String(printfulId) }] });
}

function toPrintfulOrder(o) {
  const a = o.shippingAddress;
  if (!a) throw new Error(`${o.name}: no shipping address`);
  const items = [];
  for (const li of o.lineItems.nodes) {
    const vid = li.variant?.vid?.value, art = li.variant?.art?.value;
    if (!vid || !art) throw new Error(`${o.name}: line item missing printful mapping (skip/fix product)`);
    items.push({
      variant_id: Number(vid), quantity: li.quantity,
      files: [{
        type: PLACE.placement, url: art,
        position: { area_width: PLACE.area_width, area_height: PLACE.area_height, width: PLACE.width, height: PLACE.height, top: PLACE.top, left: PLACE.left },
      }],
    });
  }
  return {
    external_id: o.name,
    recipient: {
      name: [a.firstName, a.lastName].filter(Boolean).join(" "),
      address1: a.address1, address2: a.address2 || "",
      city: a.city, state_code: a.provinceCode, country_code: a.countryCodeV2,
      zip: a.zip, phone: a.phone || "",
    },
    items,
  };
}

async function createOrders() {
  const orders = await paidUnsentOrders();
  if (!orders.length) { console.log("No new paid orders to send."); return; }
  for (const o of orders) {
    try {
      const payload = toPrintfulOrder(o);
      const path = CONFIRM ? "/orders?confirm=1" : "/orders";
      const res = await pf(path, { method: "POST", body: payload });
      await markSent(o.id, res.id);
      console.log(`  ${o.name} -> Printful #${res.id} (${CONFIRM ? "SUBMITTED" : "draft"})`);
    } catch (e) {
      console.error(`  ${o.name} FAILED: ${e.message}`);
    }
  }
}

// --- Tracking write-back: Printful shipped -> Shopify fulfillment ---
async function writeBackTracking() {
  const shipped = await pf("/orders?status=fulfilled");
  if (!Array.isArray(shipped) || !shipped.length) { console.log("No fulfilled Printful orders."); return; }
  for (const po of shipped) {
    const ship = (po.shipments || [])[0];
    if (!ship?.tracking_number || !po.external_id) continue;
    // Find the Shopify order + its fulfillment order.
    const d = await gql(`query($q:String!){ orders(first:1, query:$q){ nodes{ id displayFulfillmentStatus
      fulfillmentOrders(first:1){ nodes{ id } } } } }`, { q: `name:${po.external_id}` });
    const so = d.orders.nodes[0];
    if (!so || so.displayFulfillmentStatus === "FULFILLED") continue;
    const foId = so.fulfillmentOrders.nodes[0]?.id;
    if (!foId) continue;
    await gql(`mutation($f:FulfillmentInput!){ fulfillmentCreate(fulfillment:$f){ userErrors{ field message } } }`,
      { f: { lineItemsByFulfillmentOrder: [{ fulfillmentOrderId: foId }],
             trackingInfo: { number: ship.tracking_number, url: ship.tracking_url, company: ship.carrier } } });
    console.log(`  ${po.external_id} <- tracking ${ship.tracking_number}`);
  }
}

async function main() {
  if (TRACK) { await writeBackTracking(); return; }
  await createOrders();
  console.log(CONFIRM ? "\nOrders submitted to Printful." : "\nDrafts created in Printful (add 'confirm' to auto-submit). Run with 'track' to sync tracking back.");
}

main().catch((e) => { console.error("SYNC FAILED:", e.message); process.exit(1); });
