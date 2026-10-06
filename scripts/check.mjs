import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { DECK, BY_ID, SUITS, TOPICS } from "../public/deck.js";
import {
  newReading,
  chooseCard,
  revealCard,
  readingComplete,
  saveNote,
  loadNotes,
  STORAGE_KEY,
  escapeHTML,
  noteToText,
  randomBelow,
} from "../public/engine.js";

assert.equal(DECK.length, 78);
assert.equal(new Set(DECK.map((c) => c.id)).size, 78);
for (const [suit, count] of Object.entries({
  major: 22,
  wands: 14,
  cups: 14,
  swords: 14,
  pentacles: 14,
})) {
  assert.equal(DECK.filter((c) => c.suit === suit).length, count);
}
for (const c of DECK) {
  assert.ok(
    c.name &&
      c.indo &&
      c.meaning.length > 80 &&
      c.action &&
      c.prompt &&
      c.symbols.length === 2,
    c.id,
  );
  assert.ok(SUITS[c.suit]);
  for (const variant of ["", "thumbs/"]) {
    const webp = await fs.readFile(
      new URL(`../public/assets/cards/${variant}${c.id}.webp`, import.meta.url),
    );
    assert.equal(webp.toString("ascii", 0, 4), "RIFF", c.id);
    assert.equal(webp.toString("ascii", 8, 12), "WEBP", c.id);
    assert.ok(
      webp.length < (variant ? 40000 : 85000),
      `Card budget: ${variant}${c.id}`,
    );
  }
  const svg = await fs.readFile(
    new URL(`../public/assets/cards/${c.id}.svg`, import.meta.url),
    "utf8",
  );
  assert.match(svg, /viewBox="0 0 280 460"/);
  assert.match(svg, /<title/);
  assert.match(svg, /<desc/);
  assert.doesNotMatch(
    svg,
    /<script|https?:\/\/[^\s"]+\.(png|jpg)|foreignObject/,
  );
}
console.log(
  "PASS: 78 unique cards, meanings, actions, prompts, and self-contained SVG assets.",
);
const store = {
  data: new Map(),
  getItem(key) {
    return this.data.get(key) ?? null;
  },
  setItem(key, val) {
    this.data.set(key, val);
  },
};
for (const count of [3])
  for (const topic of Object.keys(TOPICS)) {
    const r = newReading(topic, "Bagaimana aku bisa lebih siap?", count);
    assert.equal(r.candidates.length, 7);
    assert.equal(new Set(r.candidates).size, 7);
    assert.equal(revealCard(r), false);
    assert.throws(() => saveNote(store, r, "bad"));
    assert.equal(chooseCard(r, "not-a-card"), false);
    for (let i = 0; i < count; i++) {
      assert.equal(chooseCard(r, r.candidates[i]), true);
      assert.equal(chooseCard(r, r.candidates[i]), false);
    }
    assert.equal(chooseCard(r, r.candidates[count]), false);
    for (let i = 0; i < count; i++) {
      r.current = i;
      assert.equal(revealCard(r), true);
      assert.equal(revealCard(r), true);
      assert.equal(r.revealed.length, i + 1);
    }
    assert.equal(readingComplete(r), true);
    r.notes = "Catatan saya <script> & sesuatu yang pribadi.";
    const note = saveNote(store, r, `${count}-${topic}`);
    assert.equal(note.cards.length, count);
    r.notes += " Sudah diperbarui.";
    saveNote(store, r, note.id);
    assert.equal(loadNotes(store).filter((n) => n.id === note.id).length, 1);
    const exported = noteToText(note);
    assert.match(exported, /Pertanyaan:/);
    assert.match(exported, /CATATAN PRIBADI/);
    for (const id of r.selected) assert.ok(exported.includes(BY_ID[id].name));
  }
assert.equal(loadNotes(store).length, 4);
assert.equal(newReading("umum", "", 3).question, TOPICS.umum.question);
assert.throws(() => newReading("umum", "", 1));
assert.equal(
  escapeHTML("<img src=x onerror=\"oops\"> & 'x'"),
  "&lt;img src=x onerror=&quot;oops&quot;&gt; &amp; &#39;x&#39;",
);
store.setItem(STORAGE_KEY, "broken JSON");
assert.deepEqual(loadNotes(store), []);
store.setItem(
  STORAGE_KEY,
  JSON.stringify([{ id: "poison", cards: ["missing"] }]),
);
assert.deepEqual(loadNotes(store), []);
assert.throws(() => newReading("invalid"));
assert.throws(() => newReading("umum", "", 4));
let calls = 0;
assert.equal(
  randomBelow(3, {
    getRandomValues(buffer) {
      buffer[0] = calls++ === 0 ? 4294967295 : 5;
    },
  }),
  2,
);
assert.equal(calls, 2);
const quotaStore = {
  getItem() {
    return null;
  },
  setItem() {
    throw new Error("Quota exceeded");
  },
};
const complete = newReading("umum", "", 3);
for (const id of complete.candidates.slice(0, 3)) chooseCard(complete, id);
for (let i = 0; i < 3; i++) {
  complete.current = i;
  revealCard(complete);
}
assert.throws(() => saveNote(quotaStore, complete, "quota"));
console.log(
  "PASS: three-card flows, single-card rejection, all topics, completion guards, save/update/export, invalid storage, injection escaping, and unavailable storage.",
);
const html = await fs.readFile(
  new URL("../public/index.html", import.meta.url),
  "utf8",
);
assert.match(html, /<html lang="id">/);
assert.match(html, /name="viewport"/);
assert.match(html, /id="volumeToggle"/);
assert.match(html, /aria-live="polite"/);
assert.match(html, /<dialog/);
assert.doesNotMatch(html, /codex-preview|lorem ipsum|TODO|sign.?in/i);
for (const match of html.matchAll(/(?:src|href)="(\/[^"#]+)"/g)) {
  await fs.access(
    new URL(`../public${match[1].split("?")[0]}`, import.meta.url),
  );
}
for (const file of [
  "deck.js",
  "engine.js",
  "audio.js",
  "app.js",
  "share.js",
  "story.js",
  "narrator.js",
  "naskah.js",
  "icons.js",
  "captions.js",
  "room-layout.js",
])
  execFileSync(process.execPath, [
    "--check",
    fileURLToPath(new URL(`../public/${file}`, import.meta.url)),
  ]);
const cssFiles = ["styles.css", "room-ui.css"];
const css = (
  await Promise.all(
    cssFiles.map((file) =>
      fs.readFile(new URL(`../public/${file}`, import.meta.url), "utf8"),
    ),
  )
).join("\n");
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /env\(safe-area-inset-bottom\)/);
assert.match(css, /focus-visible/);
assert.match(css, /min-height:\s*44px/);
assert.match(css, /repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
console.log(
  "PASS: JavaScript syntax, HTML assets and metadata, navigation/sound controls, reduced motion, focus states, and responsive CSS declarations.",
);
