import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import * as deck from "../public/deck.js";
import * as engine from "../public/engine.js";
import { passages, cardStory, nextChapter } from "../public/story.js";
import { onRequestPost } from "../functions/api/live-token.js";
import { onRequestGet } from "../functions/api/config.js";

// Full meanings remain available across all of the short dialogue passages.
for (const card of deck.DECK) {
  assert.equal(passages(card.meaning).join(" "), card.meaning);
  for (const chapter of ["makna", "gambar", "langkah", "refleksi"]) {
    const lines = cardStory(card, chapter);
    assert.ok(lines.length);
    assert.ok(lines.every((line) => line.length <= 190));
  }
}
assert.equal(nextChapter("makna"), "langkah");
assert.equal(nextChapter("refleksi"), null);
const nodes = new Map();
const doc = {
  body: {dataset:{}},
  querySelector() { return null; },
  getElementById(id) {
    if (!nodes.has(id))
      nodes.set(id, {
        innerHTML: "",
        close() {},
        classList: { remove() {} },
        querySelector() {
          return null;
        },
      });
    return nodes.get(id);
  },
};
const context = vm.createContext({
  ...deck,
  ...engine,
  esc: engine.escapeHTML,
  cardStory,
  nextChapter,
  document: doc,
  performance: { now: () => 10000 },
  matchMedia: () => ({ matches: false }),
  console,
  setTimeout,
  clearTimeout,
  narrator: {prefetch(){},stop(){}},
  location: {hash:''},
  window: {scrollTo(){}},
  requestAnimationFrame(){},
});
const source = await fs.readFile(
  new URL("../public/app.js", import.meta.url),
  "utf8",
);
vm.runInContext(
  source
    .slice(0, source.indexOf("\ndocument.addEventListener("))
    .replace(/^import[\s\S]*?;\s*/gm, ""),
  context,
);
vm.runInContext('render({focus:false})',context);
assert.equal(doc.body.dataset.screen,'bacaan');
assert.match(nodes.get('main').innerHTML,/Pilih pertanyaanmu/);
assert.doesNotMatch(nodes.get('main').innerHTML,/Beranda|Riwayat|Simpan catatan/);
vm.runInContext(
  "state.reading=newReading('umum','Rahasia pribadi <script>',3)",
  context,
);
const r = vm.runInContext("state.reading", context);
assert.equal(
  (vm.runInContext("pick()", context).match(/class="pick-card /g) || []).length,
  7,
);
for (const id of r.candidates.slice(0, 3)) engine.chooseCard(r, id);
const readyPick = vm.runInContext("pick()", context);
assert.match(readyPick, /3 \/ 3/);
assert.ok(
  !readyPick
    .match(/<button[^>]*data-action="start-reading"[^>]*>/)[0]
    .includes("disabled"),
);
assert.match(vm.runInContext("reader()", context), /Buka kartu ini/);
engine.revealCard(r);
assert.match(vm.runInContext("reader()", context), /dialogue-bubble/);
for (let i = 0; i < 3; i++) {
  r.current = i;
  engine.revealCard(r);
}
assert.equal(engine.readingComplete(r), true);
const summary = vm.runInContext("summary()", context);
assert.match(summary, /data-action="new"/);
assert.match(summary, /data-action="read-again"/);
assert.doesNotMatch(summary, /data-action="share"|write-note|Simpan catatan/);
assert.equal((summary.match(/class="result-card"/g)||[]).length,3);
assert.match(summary, /&lt;script&gt;/);
assert.doesNotMatch(summary, /<script>/);
assert.equal(
  (
    vm
      .runInContext("explanation(BY_ID[state.reading.selected[0]])", context)
      .match(/role="tab"/g) || []
  ).length,
  4,
);

const request = new Request("https://tarot.example/api/live-token", {
  method: "POST",
  headers: { Origin: "https://tarot.example" },
});
assert.equal((await onRequestPost({ request, env: {} })).status, 503);
assert.equal(
  (
    await onRequestPost({
      request: new Request(request, {
        headers: { Origin: "https://other.example" },
      }),
      env: { GEMINI_API_KEY: "test-only" },
    })
  ).status,
  403,
);
assert.deepEqual(await onRequestGet({ env: {} }).json(), { narration: false });
const originalFetch = globalThis.fetch;
let sent;
try {
  globalThis.fetch = async (url, options) => {
    sent = { url, options };
    return Response.json({ name: "auth_tokens/test-ephemeral" });
  };
  const response = await onRequestPost({
      request,
      env: { GEMINI_API_KEY: "test-only" },
    }),
    body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.token, "auth_tokens/test-ephemeral");
  assert.equal(body.setup.model, "models/gemini-3.8-live");
  assert.doesNotMatch(JSON.stringify(body), /test-only/);
  const payload = JSON.parse(sent.options.body);
  assert.equal(payload.uses, 1);
  assert.equal(
    payload.bidiGenerateContentSetup.model,
    "models/gemini-3.8-live",
  );
  assert.deepEqual(
    payload.bidiGenerateContentSetup.generationConfig.responseModalities,
    ["AUDIO"],
  );
  assert.equal(sent.options.headers["x-goog-api-key"], "test-only");
  assert.ok(
    Date.parse(payload.newSessionExpireTime) < Date.parse(payload.expireTime),
  );
  globalThis.fetch = async () => new Response("", { status: 429 });
  assert.equal(
    (await onRequestPost({ request, env: { GEMINI_API_KEY: "test-only" } }))
      .status,
    502,
  );
} finally {
  globalThis.fetch = originalFetch;
}
console.log(
  "PASS: direct reading entry, seven-card choice, three-card completion without history UI, escaped input, complete story text, and Cloudflare REST token configuration/error handling.",
);
