import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const publicUrl = new URL("../public/", import.meta.url);

async function pngDimensions(path) {
  const bytes = await readFile(new URL(path, publicUrl));
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

test("PWA manifest is complete and every declared icon exists", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.webmanifest", publicUrl), "utf8"));
  assert.equal(manifest.name, "Bali Hub 2026");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.ok(manifest.icons.some(icon => icon.sizes === "192x192" && icon.purpose === "any"));
  assert.ok(manifest.icons.some(icon => icon.sizes === "512x512" && icon.purpose === "any"));
  assert.ok(manifest.icons.some(icon => icon.sizes === "512x512" && icon.purpose === "maskable"));
  await Promise.all(manifest.icons.map(icon => access(new URL(icon.src.replace(/^\//, ""), publicUrl))));
  await access(new URL("icons/apple-touch-icon.png", publicUrl));
  assert.deepEqual(await pngDimensions("icons/icon-192.png"), { width: 192, height: 192 });
  assert.deepEqual(await pngDimensions("icons/icon-512.png"), { width: 512, height: 512 });
  assert.deepEqual(await pngDimensions("icons/icon-maskable-512.png"), { width: 512, height: 512 });
  assert.deepEqual(await pngDimensions("icons/apple-touch-icon.png"), { width: 180, height: 180 });
});

test("service worker provides install, update and offline handling", async () => {
  const worker = await readFile(new URL("sw.js", publicUrl), "utf8");
  assert.match(worker, /addEventListener\("install"/);
  assert.match(worker, /addEventListener\("activate"/);
  assert.match(worker, /addEventListener\("fetch"/);
  assert.match(worker, /offline\.html/);
  assert.match(worker, /skipWaiting/);
});
