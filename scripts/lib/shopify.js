// Minimal Shopify Admin GraphQL client. Zero deps (Node 20+ fetch).
const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || "2025-07";

if (!STORE || !TOKEN) {
  throw new Error("Missing SHOPIFY_STORE or SHOPIFY_ADMIN_TOKEN in .env");
}

const ENDPOINT = `https://${STORE}/admin/api/${VERSION}/graphql.json`;

// Run a GraphQL query/mutation. Throws on transport OR userErrors.
export async function gql(query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`Shopify HTTP ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  // Surface first *userErrors array found in the response data.
  for (const key of Object.keys(json.data || {})) {
    const ue = json.data[key]?.userErrors;
    if (Array.isArray(ue) && ue.length) {
      throw new Error(`Shopify userErrors on ${key}: ${JSON.stringify(ue)}`);
    }
  }
  return json.data;
}

// Idempotent page upsert by handle. Creates or updates.
export async function upsertPage({ handle, title, body }) {
  const found = await gql(
    `query($q:String!){ pages(first:1, query:$q){ nodes{ id handle } } }`,
    { q: `handle:${handle}` }
  );
  const existing = found.pages.nodes[0];
  if (existing) {
    await gql(
      `mutation($id:ID!,$page:PageUpdateInput!){ pageUpdate(id:$id, page:$page){ userErrors{ field message } } }`,
      { id: existing.id, page: { title, body } }
    );
    return { handle, action: "updated" };
  }
  await gql(
    `mutation($page:PageCreateInput!){ pageCreate(page:$page){ userErrors{ field message } } }`,
    { page: { handle, title, body } }
  );
  return { handle, action: "created" };
}
