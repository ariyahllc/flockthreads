// Minimal Shopify Admin GraphQL client. Zero deps (Node 20+ fetch).
const STORE = process.env.SHOPIFY_STORE;
const VERSION = process.env.SHOPIFY_API_VERSION || "2025-07";
const LEGACY_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

if (!STORE) throw new Error("Missing SHOPIFY_STORE in .env (use the *.myshopify.com domain)");
if (!STORE.endsWith(".myshopify.com")) {
  throw new Error(`SHOPIFY_STORE must be the *.myshopify.com admin domain, got "${STORE}"`);
}

const ENDPOINT = `https://${STORE}/admin/api/${VERSION}/graphql.json`;

// Token strategy:
//   - legacy custom app (pre-2026): static shpat_ token in SHOPIFY_ADMIN_TOKEN
//   - new custom app (2026+): mint via OAuth client_credentials (expires 24h),
//     minted fresh per process run and cached in memory.
let _cachedToken = null;
async function getToken() {
  if (LEGACY_TOKEN && LEGACY_TOKEN.startsWith("shpat_")) return LEGACY_TOKEN;
  if (_cachedToken) return _cachedToken;
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Set SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET (new custom app) or a shpat_ SHOPIFY_ADMIN_TOKEN (legacy) in .env");
  }
  const res = await fetch(`https://${STORE}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) {
    throw new Error(`Shopify token mint HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  if (!data.access_token) throw new Error(`No access_token in mint response: ${JSON.stringify(data)}`);
  _cachedToken = data.access_token;
  return _cachedToken;
}

// Run a GraphQL query/mutation. Throws on transport OR userErrors.
export async function gql(query, variables = {}) {
  const token = await getToken();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
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
      { id: existing.id, page: { title, body, isPublished: true } }
    );
    return { handle, action: "updated" };
  }
  await gql(
    `mutation($page:PageCreateInput!){ pageCreate(page:$page){ userErrors{ field message } } }`,
    { page: { handle, title, body, isPublished: true } }
  );
  return { handle, action: "created" };
}
