// Minimal Printful API client. Zero deps.
// Docs: https://developers.printful.com/docs/
const TOKEN = process.env.PRINTFUL_TOKEN;
const BASE = "https://api.printful.com";

if (!TOKEN) {
  // build-pod.js only imports this when POD_PROVIDER=printful, so warn not throw.
  console.warn("[printful] PRINTFUL_TOKEN not set — Printful calls will fail.");
}

export async function pf(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Printful ${res.status} on ${path}: ${JSON.stringify(json)}`);
  }
  return json.result ?? json;
}

// Sanity: whoami + list store products.
export async function ping() {
  return pf("/stores");
}
