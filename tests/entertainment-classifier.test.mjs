// Zero-dependency tests for the entertainment classifier in content.js.
// Extracts ENTERTAINMENT_PATTERNS / ALLOW_PATTERNS from the source text with
// node:vm (no bundler, no DOM, the IIFE is never executed) and rebuilds the
// regexes exactly the way content.js does.
//
// Run: node --test tests/*.test.mjs   (Node 18+; the bare-directory form
// broke in Node 21, so the glob form is the one CI and the README use)
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import assert from "node:assert/strict";

const src = readFileSync(new URL("../content.js", import.meta.url), "utf8");

function extractArray(name) {
  const m = src.match(new RegExp(`const ${name} = (\\[[\\s\\S]*?\\]);`));
  assert.ok(m, `${name} array literal not found in content.js`);
  // The captured text is a plain JS array of string literals (+ comments).
  // Evaluate in an empty sandbox: no globals, no side effects possible.
  return vm.runInNewContext(m[1], Object.create(null));
}

const ENTERTAINMENT_PATTERNS = extractArray("ENTERTAINMENT_PATTERNS");
const ALLOW_PATTERNS = extractArray("ALLOW_PATTERNS");

// Mirror content.js exactly.
const ENT_RE = new RegExp("(" + ENTERTAINMENT_PATTERNS.join("|") + ")", "i");
const ALLOW_RE = new RegExp("(" + ALLOW_PATTERNS.join("|") + ")", "i");

// Mirror of the decision in filterEntertainment().
const isEntertainment = (text) => ENT_RE.test(text) && !ALLOW_RE.test(text);

test("extraction sanity", () => {
  assert.ok(ENTERTAINMENT_PATTERNS.length > 30, "expected the full block list");
  assert.ok(ALLOW_PATTERNS.length > 10, "expected the full allow list");
  assert.ok(ENTERTAINMENT_PATTERNS.every((p) => typeof p === "string"));
  // Every entry must compile on its own — catches a broken pattern early.
  for (const p of [...ENTERTAINMENT_PATTERNS, ...ALLOW_PATTERNS]) {
    assert.doesNotThrow(() => new RegExp(p, "i"), `invalid pattern: ${p}`);
  }
});

const BLOCK = [
  "Minecraft Speedrun World Record",
  "Try Not To Laugh Challenge (Impossible)",
  "Artist - Song (Official Music Video)",
  "MrBeast: I Survived 24 Hours In A Desert",
  "GTA 6 gameplay walkthrough part 1",
  "day in my life vlog ~ college edition",
  "Best Fails Compilation 2026",
  "iPhone 17 Unboxing and first impressions",
  "ASMR whisper haul",
  "Movie Official Trailer (2026)",
  "NBA Finals Highlights Game 7",
  "Storytime: my worst flight ever",
  "GRWM for a night out",
  "Prank on my roommate gone wrong",
  // past-tense reactions are covered by react(s|ing|ed)? to
  "I Reacted To My Old Videos",
  // channel name alone can trigger (itemText concatenates title + channel)
  "Untitled video MrBeast",
];

const KEEP = [
  // bare "React" must not trip the "react(s|ing|ed)? to" pattern
  "React Tutorial for Beginners",
  "Learn React in 10 minutes",
  // allow-list vetoes win over block matches
  "Coding Challenge: Build a Game in 24 Hours",
  "LeetCode Hard Problem Speedrun Analysis",
  "Chain Reaction Explained — Chemistry Lecture",
  "Math Olympiad Problem: a beautiful proof",
  "System Design Interview walkthrough",
  "MIT physics lecture: highlights of the course",
  // non-English study terms rescue brand-keyword matches
  "Curso de Minecraft para principiantes",
  "Minecraft 建築講座 #3",
  "Уроки Roblox Studio",
  "Tutoriel Fortnite créatif avancé",
  // plain neutral titles
  "How to file taxes in 2026",
  "Kaggle grandmaster reviews my notebook",
];

for (const title of BLOCK) {
  test(`blocks: ${title}`, () => {
    assert.equal(isEntertainment(title), true);
  });
}

for (const title of KEEP) {
  test(`keeps: ${title}`, () => {
    assert.equal(isEntertainment(title), false);
  });
}
