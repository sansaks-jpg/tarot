import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import * as deck from "../public/deck.js";
import * as engine from "../public/engine.js";
import * as naskah from "../public/naskah.js";
import { captionSegments, captionIndex } from "../public/captions.js";
import { roomLayout } from "../public/room-layout.js";
import { icon } from "../public/icons.js";
import { passages, cardStory, nextChapter } from "../public/story.js";

const scriptSource = await fs.readFile(new URL("../docs/naskah-sela-tarot.md", import.meta.url), "utf8");
const clips = [...scriptSource.matchAll(/^- `([^`]+)` (.+)$/gm)].filter(([, id]) => id !== "ID");
assert.equal(clips.length, 422);
assert.equal(Object.keys(naskah.SELA_CLIPS).length, clips.length);
for (const [, id, text] of clips) {
  assert.equal(naskah.getClipText(id), text.trim(), id);
  assert.equal(naskah.findClipId(text.trim()), id);
  const audio = await fs.readFile(new URL(`../public${naskah.getClipAudioUrl(id)}`, import.meta.url));
  assert.ok(audio.length > 512, id);
  assert.ok(audio.toString("ascii", 0, 3) === "ID3" || (audio[0] === 255 && (audio[1] & 224) === 224), `MP3 header: ${id}`);
}
const sample = naskah.getClipText("m00-M1");
assert.equal(naskah.findClipId(sample.slice(0, 50)), null, "A fragment must never play the entire, different caption");
assert.equal(naskah.findClipId(sample + " Extra sentence."), null);
assert.equal(naskah.findClipId("__proto__"), null);
assert.equal(naskah.findClipId("toString"), null);
assert.equal(naskah.pickRandomVariant("PENUTUP-hubungan"), "PENUTUP-hubungan");
assert.equal(naskah.pickRandomVariant("nonexistent"), null);
for (const card of deck.DECK) {
  assert.equal(passages(card.meaning).join(" "), card.meaning);
  for (const position of [0, 1, 2]) for (const variant of ["a", "b"]) {
    const script = naskah.readingScript(card, { position, variant });
    assert.equal(script[0].id, `BR-${position + 1}-${card.suit}-${variant}`);
    assert.equal(script[1].id, `${card.id}-M1`);
    assert.equal(script.at(-2).id, `${card.id}-L1`);
    assert.equal(script.at(-1).id, `${card.id}-R1`);
    assert.equal(script.length, card.suit === "major" ? 6 : 5);
    assert.ok(script.every(line => line.text && line.text.length <= 190));
    assert.deepEqual(cardStory(card, "makna", 115, { position, variant }), script.filter(line => line.chapter === "makna").map(line => line.text), "Phone size must not truncate an audio clip");
  }
  assert.equal(cardStory(card, "gambar")[0], naskah.getClipText(`${card.id}-M1`));
}
assert.equal(nextChapter("makna"), "langkah");
assert.equal(nextChapter("refleksi"), null);

const nodes = new Map(), handlers = new Map(), timers = new Map(), modalHandlers = new Map();
let timerId = 0, stops = 0, pauses = 0, resumes = 0, now = 10000, clock = null;
let musicLevel = 65, narratorLevel = 100, enabled = true;
const frames = new Map(), properties = new Map();
const speeches = [], downloads = [], revoked = [];
let sharedImages = 0, nativeSupported = false, nativeOutcome = true, directShares = 0;
function node(id = "") {
  return {
    id, innerHTML: "", textContent: "", dataset: {}, attributes: {}, open: false, isConnected: true,
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name]; },
    removeAttribute(name) { delete this.attributes[name]; },
    close() { this.open = false; }, showModal() { this.open = true; }, focus() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    click() { downloads.push({ href: this.href, download: this.download }); },
    addEventListener(name, handler) { modalHandlers.set(name, handler); },
  };
}
const navLinks = ["beranda", "bacaan", "kartu"].map(nav => ({ ...node(), dataset: { nav } }));
const doc = {
  documentElement: { style: { setProperty(key, value) { properties.set(key, value); } } },
  body: { dataset: {} }, hidden: false, activeElement: { blur() {} },
  querySelector(selector) {
    if (selector === '[data-nav="bacaan"]') return navLinks[1];
    if (selector.startsWith("#")) return nodes.get(selector.slice(1)) || null;
    return null;
  },
  querySelectorAll(selector) {
    if (selector === "[data-nav]") return navLinks;
    if (selector === "[data-caption-flow]") return [this.getElementById("testCaption")];
    return [];
  },
  createElement(id) { return node(id); },
  getElementById(id) { if (!nodes.has(id)) nodes.set(id, node(id)); return nodes.get(id); },
  addEventListener(name, handler) { handlers.set(name, handler); },
};
const mobileQuery = { matches: false, addEventListener() {} };
const landscapeQuery = { matches: false, addEventListener() {} };
const context = vm.createContext({
  ...deck, ...engine, ...naskah, icon, captionSegments, captionIndex, roomLayout, esc: engine.escapeHTML, cardStory, nextChapter,
  Blob, File, URL: { createObjectURL() { return "blob:test-" + (++sharedImages); }, revokeObjectURL(url) { revoked.push(url); } },
  navigator: { canShare: () => false, clipboard: { async writeText() {} } },
  websiteURL: () => "https://tarot.example/", shareInvitation: ids => "Yuk, baca tiga kartu bareng Sela: https://tarot.example/ " + ids.join(", "),
  createShareImage: async () => new Blob(["photo"], { type: "image/png" }), canSharePhoto: () => nativeSupported,
  sharePhoto: async () => { directShares++; return nativeOutcome; },
  document: doc, performance: { now: () => now },
  matchMedia: query => query === "(max-width: 699px)" ? mobileQuery : query.includes("orientation: landscape") ? landscapeQuery : { matches: true },
  setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
  clearTimeout(id) { timers.delete(id); },
  console, audioEnabled: () => enabled, musicVolume: () => musicLevel, narratorVolume: () => narratorLevel, sfx() {}, primeAudio() {},
  enableAudio: async () => { enabled = true; }, toggleAudio: async () => { enabled = !enabled; },
  setMusicVolume(value) { musicLevel = Number(value); }, setNarratorVolume(value) { narratorLevel = Number(value); },
  narrator: {
    mode: "recorded", playback() { return clock; }, prefetch() {}, prepare() {}, unlock() {},
    stop() { stops++; }, pause() { pauses++; return true; }, resume() { resumes++; return true; },
    async speak(id, card, status, done) { speeches.push({ id, card, status, done }); },
  },
  location: { hash: "" }, window: { scrollTo() {}, addEventListener() {} }, requestAnimationFrame(callback) { const id = ++timerId; frames.set(id, callback); return id; }, cancelAnimationFrame(id) { frames.delete(id); },
  FormData: class { constructor(form) { this.values = form.values; } get(key) { return this.values[key]; } },
  Image: class {},
});
const source = await fs.readFile(new URL("../public/app.js", import.meta.url), "utf8");
const shell = await fs.readFile(new URL("../public/index.html", import.meta.url), "utf8");
assert.equal((shell.match(/class="room-backdrop"/g) || []).length, 1);
assert.ok(shell.indexOf('class="room-backdrop"') < shell.indexOf('<main id="main"'));
assert.doesNotMatch(source, /api\/config|live-token|SELA_TOPIC_REACTIONS|innerHeight < 640/);
vm.runInContext(source.replace(/^import[\s\S]*?;\s*/gm, ""), context);
const run = code => vm.runInContext(code, context);
const click = async (action, data = {}) => {
  const button = { ...node(), dataset: { action, ...data }, disabled: false };
  button.closest = selector => selector === "[data-action]" ? button : null;
  await handlers.get("click")({ target: { closest: selector => selector === "[data-action]" ? button : null } });
  return button;
};
assert.equal(doc.body.dataset.screen, "beranda");
assert.match(nodes.get("main").innerHTML, /Duduk dulu/);
assert.equal((nodes.get("main").innerHTML.match(/class="scatter-card"/g) || []).length, 8);
assert.equal(navLinks[0].attributes["aria-current"], "page");
mobileQuery.matches = true;
run('render({focus:false})');
assert.match(nodes.get("main").innerHTML, /Duduk dulu/);
assert.match(nodes.get("main").innerHTML, /id="arrivalSpeech"/);
assert.match(nodes.get("main").innerHTML, /data-table-region/);
assert.doesNotMatch(nodes.get("main").innerHTML, /arrival-dialogue|journey/);
assert.doesNotMatch(nodes.get("main").innerHTML, /class="room-backdrop"/);
run('location.hash="#bacaan"; render({focus:false})');
assert.match(nodes.get("main").innerHTML, /data-step="topic"/);
assert.match(nodes.get("main").innerHTML, /Mau bicara soal apa/);
assert.match(nodes.get("main").innerHTML, /class="question-fields" hidden/);
assert.match(nodes.get("main").innerHTML, /data-action="setup-next" disabled/);
assert.doesNotMatch(nodes.get("main").innerHTML, /name="topic"[^>]*checked/);
await click("setup-next");
assert.equal(run("state.setupStep"), "topic", "A fresh reading requires choosing a topic");
handlers.get("change")({ target: { name: "topic", value: "umum" } });
await click("setup-next");
assert.match(nodes.get("main").innerHTML, /data-step="question"/);
assert.match(nodes.get("main").innerHTML, /class="topic-fields" hidden/);
assert.match(nodes.get("main").innerHTML, /Pilih pertanyaanmu/);
for (const topic of Object.keys(deck.TOPICS)) {
  run(`beginTopic('${topic}'); render({focus:false})`);
  assert.equal(run("state.form.topic"), topic);
  assert.equal(run("state.form.question"), deck.TOPICS[topic].templates[0]);
  assert.equal(run("state.setupStep"), "question");
  assert.ok(naskah.findClipId(run("setupSpeechText()")));
}
run('beginTopic("__proto__"); beginTopic("invalid")');
assert.equal(run("state.form.topic"), "diri");
await click("custom-question");
assert.equal(run("state.customQuestion"), true);
await click("setup-back");
assert.equal(run("state.setupStep"), "topic");
run('location.hash="#pilih"; render({focus:false})');
assert.equal(doc.body.dataset.screen, "bacaan");
await click("setup-next");
handlers.get("submit")({ target: { id: "setupForm", values: { topic: "umum", question: "Rahasia <script>", count: "3" } }, preventDefault() {} });
run('render({focus:false})');
const r = run("state.reading");
assert.equal(doc.body.dataset.screen, "pilih");
assert.equal((nodes.get("main").innerHTML.match(/class="pick-card /g) || []).length, 7);
assert.match(nodes.get("main").innerHTML, /Pilih 3 kartu lagi/);
assert.ok(naskah.findClipId(run("state.pickIntro")));
for (const id of r.candidates.slice(0, 3)) engine.chooseCard(r, id);
run('state.pickIntro=null; render({focus:false})');
assert.match(nodes.get("main").innerHTML, /Mulai bacaan/);
run('location.hash="#beranda"; render({focus:false})');
assert.match(nodes.get("main").innerHTML, /Cerita kita belum selesai/);
assert.equal(run("state.reading"), r);
assert.equal(navLinks[1].href, "#baca");
run('location.hash="#baca"; render({focus:false})');
assert.match(nodes.get("main").innerHTML, /Buka kartu pertama/);
await click("reveal");
assert.equal(nodes.get("modal").open, true, "Reveal opens the large reading dialog");
assert.equal(run("state.modalMode"), "reading");
const content = nodes.get("modalBody").innerHTML;
assert.ok(content.includes(engine.escapeHTML(deck.BY_ID[r.selected[0]].meaning)), "Reading details use the original deck meanings");
assert.match(content, /data-action="auto-read"/);
assert.match(content, /data-action="next-card"/);
assert.doesNotMatch(content, /reading-transcript|reading-chapters/);
for (const card of deck.DECK) {
  const explanation = run(`explanation(BY_ID['${card.id}'])`);
  for (const text of [card.meaning, card.action, card.prompt, ...card.symbols]) assert.ok(explanation.includes(engine.escapeHTML(text)), card.id);
  assert.ok(!explanation.includes(engine.escapeHTML(naskah.getClipText(`${card.id}-M2`))));
}
const beforeReopen = stops;
run('cardModal(state.reading.selected[0])');
assert.equal(stops, beforeReopen, "Opening the current card preserves live playback");
const beforeClose = stops;
run("closeModal()");
assert.equal(stops, beforeClose, "Returning to the table does not cut the narration");
const beforeAdvance = nodes.get("main").innerHTML;
run("advanceStory()");
assert.equal(run("state.dialogue.line"), 1);
assert.equal(nodes.get("main").innerHTML, beforeAdvance, "Progress does not replace the whole room or reset transcript scroll");
run('cardModal(state.reading.selected[0])');
const stableMeaning = nodes.get("modalBody").innerHTML;
run('advanceStory()');
assert.equal(nodes.get("modalBody").innerHTML, stableMeaning, "Narration advancement never replaces the meaning being read");
clock = { id: run('state.caption.id'), duration: 20, elapsed: 12, paused: false };
const frame = [...frames.values()].at(-1);
frames.clear(); now += 100;
frame(now);
assert.equal(run('state.caption.elapsed'), 12);
const captionHtml = nodes.get("testCaption").innerHTML;
assert.match(captionHtml, /caption-current/);
assert.ok(run('state.caption.index') > 0, "Caption phrases follow the recording clock");
await click("auto-read");
assert.equal(pauses, 1);
assert.equal(run("state.autoRead"), false);
await click("auto-read");
assert.equal(resumes, 1);
assert.equal(run("state.autoRead"), true);
// A backgrounded reading pauses safely, then resumes the caption animation.
doc.hidden = true;
handlers.get("visibilitychange")();
assert.equal(pauses, 2);
assert.equal(run("state.autoRead"), false);
const hiddenFrame = [...frames.values()].at(-1);
frames.clear(); now += 30000;
hiddenFrame(now);
assert.equal(frames.size, 0, "Hidden captions stop requesting animation frames");
doc.hidden = false;
handlers.get("visibilitychange")();
assert.equal(frames.size, 1, "Returning to the page restores the caption clock");
assert.equal(run("state.caption.lastFrame"), now, "The hidden interval is not added to fallback captions");
await click("auto-read");
assert.equal(resumes, 2);
clock.elapsed = 14;
const resumedFrame = [...frames.values()].at(-1);
frames.clear(); now += 100;
resumedFrame(now);
assert.equal(run("state.caption.elapsed"), 14);
run("closeModal()");
await click("next-card");
assert.equal(r.current, 1);
assert.match(nodes.get("main").innerHTML, /Buka kartu kedua/);
assert.equal(r.revealed.length, 1, "The next card waits for a separate reveal");
for (let position = 1; position < 3; position++) {
  r.current = position;
  engine.revealCard(r);
  run('state.dialogue.id=null; render({focus:false})');
  await click("next-card");
}
assert.equal(r.finished, true);
assert.equal(engine.readingComplete(r), true);
const summary = nodes.get("main").innerHTML;
assert.match(summary, /data-action="new"/);
assert.match(summary, /data-action="read-again"/);
assert.match(summary, /data-action="share-result"/);
assert.match(summary, /Putar ulang bacaan/);
assert.match(summary, /&lt;script&gt;/);
assert.doesNotMatch(summary, /<script>/);
assert.equal((summary.match(/class="result-card"/g) || []).length, 3);
assert.ok(summary.includes(engine.escapeHTML(naskah.getClipText("PENUTUP-umum"))));
assert.equal((run('explanation(BY_ID[state.reading.selected[0]])').match(/role="tab"/g) || []).length, 4);
await run('state.shareResult.ready');
assert.equal(nodes.get("shareResultButton").disabled, false, "The main action waits for a prepared photo before allowing a native-share tap");
assert.equal(nodes.get("shareResultButton").attributes["aria-busy"], "false");
nativeSupported = true;
const shareTap = click("share-result");
assert.equal(directShares, 1, "Native sharing starts in the tap, before any asynchronous wait");
await shareTap;
assert.equal(directShares, 1, "One tap shares the prepared photo directly to the device app chooser");
assert.equal(nodes.get("modal").open, false, "Native sharing does not require opening an extra preview");
nativeOutcome = false;
await click("share-result");
assert.equal(nodes.get("modal").open, true, "A failed native share offers a retry");
assert.match(nodes.get("modalBody").innerHTML, /data-action="share-photo"/);
assert.equal(downloads.length, 0, "A failed share must never start an unwanted download");
run("closeModal()");
nativeSupported = false;
await click("share-result");
assert.match(nodes.get("modalBody").innerHTML, /class="share-preview"/);
assert.match(nodes.get("modalBody").innerHTML, /https:\/\/tarot.example\//);
assert.match(nodes.get("modalBody").innerHTML, /data-action="download-photo"/);
assert.match(nodes.get("modalBody").innerHTML, /href="https:\/\/wa.me\/\?text=/, "Unsupported browsers can still send the invitation to WhatsApp directly");
await click("download-photo");
assert.equal(downloads.at(-1).download, "bacaanku-the-tarot-room.png");
assert.equal(downloads.at(-1).href, "blob:test-1");
run("closeModal()");
await click("read-again");
assert.equal(r.finished, false);
assert.equal(r.revealed.length, 0);
assert.ok(run("state.preIntro").startsWith("ULANG-"));
run('location.hash="#kartu"; render({focus:false})');
assert.equal((nodes.get("libraryGrid").innerHTML.match(/class="library-card"/g) || []).length, 4);
assert.match(nodes.get("libraryPagination").innerHTML, /1 \/ 20/);
await click("filter-suit", { suit: "cups" });
assert.equal(run("filteredCards().length"), 14);
assert.match(nodes.get("libraryPagination").innerHTML, /1 \/ 4/);
run('state.libraryPage=999; fillLibrary()');
assert.equal(run("state.libraryPage"), 3);
assert.equal((nodes.get("libraryGrid").innerHTML.match(/class="library-card"/g) || []).length, 2);
run('state.search="ZZZmissing"; fillLibrary()');
assert.match(nodes.get("libraryGrid").innerHTML, /Belum ketemu/);
await click("clear-search");
assert.equal(run("filteredCards().length"), 78);
mobileQuery.matches = false;
run('render({focus:false})');
assert.equal((nodes.get("libraryGrid").innerHTML.match(/class="library-card"/g) || []).length, 6);
landscapeQuery.matches = true;
run('render({focus:false})');
assert.equal((nodes.get("libraryGrid").innerHTML.match(/class="library-card"/g) || []).length, 4, "Short landscape uses one row of four cards");
landscapeQuery.matches = false;
run('cardModal("m17")');
assert.match(nodes.get("modalBody").innerHTML, /detail-listen/);
assert.ok(nodes.get("modalBody").innerHTML.includes(engine.escapeHTML(deck.BY_ID.m17.meaning)));
// Both the new-reading action and top navigation must clear previous choices.
run('state.form.topic="diri"; state.form.question="Previous question"');
await click("new");
run('render({focus:false})');
assert.equal(run('state.form.topic'), null);
assert.equal(run('state.form.question'), "");
assert.equal(run('state.reading'), null);
assert.doesNotMatch(nodes.get("main").innerHTML, /name="topic"[^>]*checked/);
assert.ok(revoked.includes("blob:test-1"), "A new session releases the previous share photo");
context.previousReading = r;
r.finished = true;
run('state.reading=previousReading; state.form.topic="hubungan"; state.form.question="Previous question"; location.hash="#bacaan"; render({focus:false})');
assert.equal(run('state.form.topic'), null);
assert.equal(run('state.form.question'), "");
assert.equal(run('state.reading'), null);
// Adjusting one channel must not change the other or restart the narration.
const beforeVolume = stops;
handlers.get("input")({ target: { id: "musicVolume", value: "0" } });
assert.equal(musicLevel, 0); assert.equal(narratorLevel, 100);
handlers.get("input")({ target: { id: "narratorVolume", value: "37" } });
assert.equal(narratorLevel, 37); assert.equal(musicLevel, 0);
assert.equal(nodes.get("musicVolumeLabel").textContent, "0%");
assert.equal(nodes.get("narratorVolumeLabel").textContent, "37%");
await click("sound");
assert.equal(stops, beforeVolume, "Global mute changes gains without restarting the clip");
const css = await fs.readFile(new URL("../public/room-ui.css", import.meta.url), "utf8");
assert.match(css, /height: calc\(var\(--room-height\) - var\(--header-height\) - env/);
assert.match(css, /\.table-stage \{[^}]*position: fixed/);
assert.match(css, /\.room-nav \{[^}]*position: static/);
assert.match(css, /\.meaning-panel \{[^}]*overflow-y: auto/);
assert.match(css, /mask-image: linear-gradient\(transparent, #000 55%\)/);
assert.match(css, /prefers-reduced-motion/);
assert.doesNotMatch(source, /function journey\(/);
assert.match(shell, /id="musicVolume"/);
assert.match(shell, /id="narratorVolume"/);
for (const text of ["satu dua tiga empat lima enam tujuh delapan sembilan.", sample]) {
  const segments = captionSegments(text);
  assert.equal(segments.map(segment => segment.text).join(" "), text);
  assert.equal(captionIndex(segments, 0, 10), 0);
  assert.equal(captionIndex(segments, 10, 10), segments.length - 1);
}
for (const [width, height] of [[280,400], [320,480], [320,568], [360,640], [375,667], [390,844], [430,932], [480,640], [640,360], [844,390], [768,1024], [1280,800]]) {
  const layout = roomLayout(width, height, 58);
  assert.ok(layout.tableTop >= height * .45, "Cards are below the reader, " + width + "x" + height);
  assert.ok(layout.tableLeft >= 0 && layout.tableLeft + layout.tableWidth <= width);
  assert.ok(layout.tableTop + layout.tableHeight <= height);
  assert.ok(layout.cardWidth * 3 + 16 <= layout.tableWidth);
  assert.ok(layout.cardWidth * 1.665 + 24 <= layout.tableHeight);
  assert.ok(layout.pickWidth * 4.55 <= layout.tableWidth + 0.001);
}
console.log("PASS: 422 script/MP3 pairs, all 78 original card meanings, fresh topic reset, one-tap native photo share, cancellation/retry without forced downloads, setup/reveal/completion, uninterrupted detail, recording-clock captions, independent audio controls, catalog pagination and table geometry (DOM/AudioContext simulation; browser check is separate).");
