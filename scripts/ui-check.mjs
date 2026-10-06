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
const navLinks = ["beranda", "bacaan", "kartu"].map(nav => ({
  dataset: {nav},
  attributes: {},
  setAttribute(name, value) { this.attributes[name] = value; },
  removeAttribute(name) { delete this.attributes[name]; },
}));
const doc = {
  body: {dataset:{}},
  querySelector(selector) {
    return selector === '[data-nav="bacaan"]' ? navLinks[1] : null;
  },
  querySelectorAll(selector) { return selector === "[data-nav]" ? navLinks : []; },
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
const mobileQuery = { matches: false };
const context = vm.createContext({
  ...deck,
  ...engine,
  esc: engine.escapeHTML,
  cardStory,
  nextChapter,
  document: doc,
  performance: { now: () => 10000 },
  matchMedia: (query) => query === "(max-width: 699px)" ? mobileQuery : { matches: false },
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
const shell = await fs.readFile(new URL("../public/index.html", import.meta.url), "utf8");
assert.equal((shell.match(/class="room-backdrop"/g)||[]).length,1);
assert.ok(shell.indexOf('class="room-backdrop"') < shell.indexOf('<main id="main"'));
const welcomeImage = await fs.readFile(new URL("../public/assets/welcome-room.webp", import.meta.url));
assert.equal(welcomeImage.toString("ascii",0,4),"RIFF");
assert.equal(welcomeImage.toString("ascii",8,12),"WEBP");
assert.ok(welcomeImage.length < 200000);
vm.runInContext(
  source
    .slice(0, source.indexOf("\ndocument.addEventListener("))
    .replace(/^import[\s\S]*?;\s*/gm, ""),
  context,
);
vm.runInContext('render({focus:false})',context);
assert.equal(doc.body.dataset.screen,'beranda');
assert.match(nodes.get('main').innerHTML,/Di balik kartu/);
assert.match(nodes.get('main').innerHTML,/href="#bacaan"[^>]*data-reading-link/);
assert.match(nodes.get('main').innerHTML,/Mulai baca tarot/);
assert.equal((nodes.get('main').innerHTML.match(/data-action="choose-topic"/g)||[]).length,4);
assert.equal((nodes.get('main').innerHTML.match(/class="welcome-card /g)||[]).length,3);
assert.equal(navLinks[0].attributes['aria-current'],'page');
assert.equal(navLinks[1].attributes['aria-current'],undefined);
mobileQuery.matches = true;
vm.runInContext('render({focus:false})',context);
const mobileHome = nodes.get('main').innerHTML;
assert.match(mobileHome,/arrival-screen/);
assert.match(mobileHome,/Mau baca tarot\?/);
assert.match(mobileHome,/Mau, bacain aku/);
assert.match(mobileHome,/href="#kartu"[^>]*><svg[\s\S]*Lihat-lihat kartu dulu/);
assert.equal((mobileHome.match(/class="arrival-choice /g)||[]).length,2);
assert.doesNotMatch(mobileHome,/welcome-hero|welcome-topics|welcome-guide/);
assert.doesNotMatch(mobileHome,/class="room-backdrop"/);
mobileQuery.matches = false;
vm.runInContext('render({focus:false})',context);
assert.match(nodes.get('main').innerHTML,/Di balik kartu/);
vm.runInContext('location.hash="#bacaan"; render({focus:false})',context);
assert.equal(doc.body.dataset.screen,'bacaan');
assert.match(nodes.get('main').innerHTML,/Pilih pertanyaanmu/);
assert.doesNotMatch(nodes.get('main').innerHTML,/Beranda|Riwayat|Simpan catatan/);
assert.equal(navLinks[0].attributes['aria-current'],undefined);
assert.equal(navLinks[1].attributes['aria-current'],'page');
for (const topic of Object.keys(deck.TOPICS)) {
  vm.runInContext(`beginTopic('${topic}'); render({focus:false})`,context);
  const form = vm.runInContext('state.form',context);
  assert.equal(form.topic,topic);
  assert.equal(form.question,deck.TOPICS[topic].templates[0]);
  assert.match(nodes.get('main').innerHTML,new RegExp(`value="${topic}" checked`));
}
vm.runInContext('beginTopic("__proto__"); beginTopic("invalid")',context);
assert.equal(vm.runInContext('state.form.topic',context),'diri');
vm.runInContext('location.hash="#unknown"; render({focus:false})',context);
assert.equal(doc.body.dataset.screen,'beranda');
vm.runInContext('location.hash="#pilih"; render({focus:false})',context);
assert.equal(doc.body.dataset.screen,'bacaan');
vm.runInContext(
  "state.reading=newReading('umum','Rahasia pribadi <script>',3)",
  context,
);
const r = vm.runInContext("state.reading", context);
vm.runInContext('location.hash="#beranda"; render({focus:false})',context);
assert.match(nodes.get('main').innerHTML,/href="#pilih"[^>]*data-reading-link/);
assert.match(nodes.get('main').innerHTML,/Lanjutkan bacaanku/);
assert.equal(vm.runInContext('state.reading',context),r);
assert.equal(navLinks[1].href,'#pilih');
mobileQuery.matches = true;
vm.runInContext('render({focus:false})',context);
assert.match(nodes.get('main').innerHTML,/Lanjut cerita kita\?/);
assert.match(nodes.get('main').innerHTML,/href="#pilih"[^>]*data-reading-link/);
assert.equal(vm.runInContext('state.reading',context),r);
mobileQuery.matches = false;
assert.equal(
  (vm.runInContext("pick()", context).match(/class="pick-card /g) || []).length,
  7,
);
for (const id of r.candidates.slice(0, 3)) engine.chooseCard(r, id);
vm.runInContext('render({focus:false})',context);
assert.match(nodes.get('main').innerHTML,/href="#baca"[^>]*data-reading-link/);
assert.equal(navLinks[1].href,'#baca');
const readyPick = vm.runInContext("pick()", context);
assert.match(readyPick, /3 \/ 3/);
assert.match(readyPick, /Tiga kartu sudah lengkap/);
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
assert.match(summary, /class="summary-speech"/);
assert.match(summary, /Tiga kartu sudah selesai bercerita/);
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
  "PASS: persistent mobile room backdrop and image budget, reader welcome and two choices, unchanged desktop entry, all topic shortcuts, navigation state and reading resume, direct reading links, seven-card choice, three-card completion, escaped input, complete story text, and Cloudflare REST token configuration/error handling.",
);
