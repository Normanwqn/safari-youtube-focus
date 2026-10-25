// Integrity tests for the _locales message catalogs.
// Every locale must carry exactly the same keys as en, with non-empty
// strings, and the manifest's __MSG_…__ placeholders must resolve.
//
// Run: node --test tests/*.test.mjs
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const root = new URL("..", import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), "utf8"));

const locales = readdirSync(new URL("_locales", root));
const en = read("_locales/en/messages.json");
const enKeys = Object.keys(en).sort();

test("en catalog exists and is non-trivial", () => {
  assert.ok(locales.includes("en"));
  assert.ok(enKeys.length >= 10, "expected the full message set");
});

for (const loc of locales) {
  test(`locale ${loc}: same keys as en, all messages non-empty`, () => {
    const msgs = read(`_locales/${loc}/messages.json`);
    assert.deepEqual(Object.keys(msgs).sort(), enKeys);
    for (const [key, entry] of Object.entries(msgs)) {
      assert.equal(typeof entry.message, "string", `${loc}/${key}`);
      assert.ok(entry.message.trim().length > 0, `${loc}/${key} empty`);
    }
  });
}

test("manifest __MSG__ placeholders resolve against en", () => {
  const manifest = read("manifest.json");
  assert.equal(manifest.default_locale, "en");
  const fields = [manifest.name, manifest.description, manifest.action.default_title];
  for (const field of fields) {
    const m = /^__MSG_(\w+)__$/.exec(field);
    assert.ok(m, `expected __MSG_…__ placeholder, got: ${field}`);
    assert.ok(en[m[1]], `manifest references missing message key ${m[1]}`);
  }
});

test("popup data-i18n keys all exist in en", () => {
  const html = readFileSync(new URL("popup.html", root), "utf8");
  const keys = [...html.matchAll(/data-i18n="(\w+)"/g)].map((m) => m[1]);
  assert.ok(keys.length >= 8, "expected the popup to be annotated");
  for (const key of keys) {
    assert.ok(en[key], `popup references missing message key ${key}`);
  }
});
