// Upload a local image to Shopify Files, return its public CDN URL.
// Caches results in data/.upload-cache.json so re-runs don't re-upload.
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { gql } from "./shopify.js";

const CACHE_URL = new URL("../../data/.upload-cache.json", import.meta.url);

async function loadCache() {
  try { return JSON.parse(await readFile(CACHE_URL, "utf8")); }
  catch { return {}; }
}
async function saveCache(c) { await writeFile(CACHE_URL, JSON.stringify(c, null, 2) + "\n"); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Poll a MediaImage node until Shopify finishes processing and returns a URL.
async function waitForUrl(id, tries = 15) {
  for (let i = 0; i < tries; i++) {
    const d = await gql(
      `query($id:ID!){ node(id:$id){ ... on MediaImage { fileStatus image { url } } } }`,
      { id }
    );
    const n = d.node;
    if (n?.fileStatus === "READY" && n.image?.url) return n.image.url;
    if (n?.fileStatus === "FAILED") throw new Error(`Shopify file processing FAILED for ${id}`);
    await sleep(2000);
  }
  throw new Error(`Timed out waiting for Shopify to process ${id}`);
}

export async function uploadImage(localPath) {
  const cache = await loadCache();
  if (cache[localPath]) return cache[localPath];

  const bytes = await readFile(localPath);
  const filename = basename(localPath);

  // 1. Ask Shopify for a staged upload target.
  const staged = await gql(
    `mutation($input:[StagedUploadInput!]!){
      stagedUploadsCreate(input:$input){
        stagedTargets{ url resourceUrl parameters{ name value } }
        userErrors{ field message }
      }
    }`,
    { input: [{ filename, mimeType: "image/png", httpMethod: "POST", resource: "IMAGE" }] }
  );
  const target = staged.stagedUploadsCreate.stagedTargets[0];

  // 2. POST the bytes to the staged target (params first, file last).
  const form = new FormData();
  for (const p of target.parameters) form.append(p.name, p.value);
  form.append("file", new Blob([bytes], { type: "image/png" }), filename);
  const up = await fetch(target.url, { method: "POST", body: form });
  if (!up.ok) throw new Error(`Staged upload HTTP ${up.status}: ${await up.text()}`);

  // 3. Register the uploaded file in Files.
  const created = await gql(
    `mutation($files:[FileCreateInput!]!){
      fileCreate(files:$files){ files{ id fileStatus } userErrors{ field message } }
    }`,
    { files: [{ originalSource: target.resourceUrl, contentType: "IMAGE", alt: filename }] }
  );
  const id = created.fileCreate.files[0].id;

  // 4. Wait for the CDN URL.
  const url = await waitForUrl(id);
  cache[localPath] = url;
  await saveCache(cache);
  return url;
}

// Same three-step staged upload as uploadImage, but for non-image files
// (donation receipt PDFs). Shopify models these as GenericFile, which exposes
// `url` directly rather than `image { url }`, so it needs its own poll.
async function waitForFileUrl(id, tries = 15) {
  for (let i = 0; i < tries; i++) {
    const d = await gql(
      `query($id:ID!){ node(id:$id){ ... on GenericFile { fileStatus url } } }`,
      { id }
    );
    const n = d.node;
    if (n?.fileStatus === "READY" && n.url) return n.url;
    if (n?.fileStatus === "FAILED") throw new Error(`Shopify file processing FAILED for ${id}`);
    await sleep(2000);
  }
  throw new Error(`Timed out waiting for Shopify to process ${id}`);
}

export async function uploadFile(localPath, mimeType = "application/pdf") {
  const cache = await loadCache();
  if (cache[localPath]) return cache[localPath];

  const bytes = await readFile(localPath);
  const filename = basename(localPath);

  const staged = await gql(
    `mutation($input:[StagedUploadInput!]!){
      stagedUploadsCreate(input:$input){
        stagedTargets{ url resourceUrl parameters{ name value } }
        userErrors{ field message }
      }
    }`,
    { input: [{ filename, mimeType, httpMethod: "POST", resource: "FILE" }] }
  );
  const target = staged.stagedUploadsCreate.stagedTargets[0];

  const form = new FormData();
  for (const p of target.parameters) form.append(p.name, p.value);
  form.append("file", new Blob([bytes], { type: mimeType }), filename);
  const up = await fetch(target.url, { method: "POST", body: form });
  if (!up.ok) throw new Error(`Staged upload HTTP ${up.status}: ${await up.text()}`);

  const created = await gql(
    `mutation($files:[FileCreateInput!]!){
      fileCreate(files:$files){ files{ id fileStatus } userErrors{ field message } }
    }`,
    { files: [{ originalSource: target.resourceUrl, contentType: "FILE", alt: filename }] }
  );
  const id = created.fileCreate.files[0].id;

  const url = await waitForFileUrl(id);
  cache[localPath] = url;
  await saveCache(cache);
  return url;
}
