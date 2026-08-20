import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: {
        accept: "text/html",
        "oai-authenticated-user-email": "staff@example.com",
        "oai-authenticated-user-full-name": "ACM%20Staff",
        "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
      },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, developmentPreviewMeta);
  assert.match(html, /<link(?=[^>]*rel=["']manifest["'])(?=[^>]*href=["']\/manifest\.webmanifest["'])[^>]*>/i);
  assert.match(html, /<link(?=[^>]*rel=["']apple-touch-icon["'])(?=[^>]*href=["']\/icons\/apple-touch-icon\.png["'])[^>]*>/i);
  assert.match(html, /<meta(?=[^>]*name=["']apple-mobile-web-app-capable["'])(?=[^>]*content=["']yes["'])[^>]*>/i);
  assert.match(html, /<meta(?=[^>]*name=["']theme-color["'])(?=[^>]*content=["']#fff9f0["'])[^>]*>/i);
});

test("applies the latest team assignments when saved trip data loads", async () => {
  const source = await readFile("app/trip-hub.tsx", "utf8");
  assert.match(source, /const removeFrom[\s\S]*?\["Gary", \["Marge", "Bren"\]\]/);
  assert.match(source, /const removeFrom[\s\S]*?\["Lei", \["Vic"\]\]/);
  assert.match(source, /const removeFrom[\s\S]*?\["Cath", \["Mariah", "Pamela", "Arjay"\]\]/);
  assert.match(source, /const addTo[\s\S]*?\["Jess", \["Jessa"\]\]/);
  assert.match(source, /const addTo[\s\S]*?\["Cath", \["Bren"\]\]/);
  assert.doesNotMatch(source, /const addTo[\s\S]*?\["Lei", \["Vic"\]\]/);
  assert.doesNotMatch(source, /const addTo[\s\S]*?\["Cath", \["Arjay"\]\]/);
});

test("clearly separates Australian visa guidance from the Philippines checklist", async () => {
  const source = await readFile("app/trip-hub.tsx", "utf8");

  assert.match(source, /Australian residents travelling on an Australian passport only/);
  assert.match(source, /PHILIPPINES RESIDENTS ONLY/);
  assert.match(source, /Philippines Residents Checklist/);
  assert.match(source, /Certificate of Employment/);
  assert.match(source, /Conference Invitation Letter with sponsorship or funding coverage stated/);
  assert.match(source, /Hotel Booking Confirmation/);
  assert.match(source, /Roundtrip Flight Itinerary/);
  assert.match(source, /Valid Passport with at least 6 months’ validity from 15 September 2026/);
  assert.match(source, /Travel Insurance/);
  assert.match(source, /Company ID/);
  assert.match(source, /Complete the All Indonesia arrival card/);
  assert.match(source, /Complete Philippine eTravel within 72 hours before departure/);
  assert.match(source, /https:\/\/allindonesia\.imigrasi\.go\.id\//);
  assert.match(source, /https:\/\/etravel\.gov\.ph\//);
  assert.doesNotMatch(source, /PHP\s*₱1,800/);
  assert.doesNotMatch(source, /indonesia-arrival\.com/);
});
