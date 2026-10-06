import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import { BY_ID, POSITIONS } from "../public/deck.js";
import { configuredSiteURL, normalizeSiteURL, siteURLFromFile } from "./site-url.mjs";

assert.equal(normalizeSiteURL("https://tarot.example/play?tracking=1#baca"), "https://tarot.example/play/");
assert.equal(siteURLFromFile('OTHER_KEY=unused\nSITE_URL="https://tarot.example" # site\n'), "https://tarot.example/");
assert.equal(siteURLFromFile("OTHER_KEY=unused"), null);
assert.equal(await configuredSiteURL({ SITE_URL: "https://custom.example", CF_PAGES_URL: "https://preview.example" }), "https://custom.example/");
assert.equal(await configuredSiteURL({ CF_PAGES_URL: "https://preview.example" }), "https://preview.example/");
assert.throws(() => normalizeSiteURL("javascript:alert(1)"));
assert.throws(() => normalizeSiteURL("https://username:password@tarot.example"));

let canonical = "https://tarot.example/play/", cancel = false, failure = false, supported = true;
const labels = [], drawn = [], sent = [];
const ctx = {
  font: "", beginPath() {}, roundRect() {}, fill() {}, stroke() {}, strokeRect() {}, fillRect() {},
  save() {}, restore() {}, clip() {},
  createLinearGradient() { return { addColorStop() {} }; },
  measureText(text) { return { width: text.length * (parseInt(this.font.match(/\d+px/)?.[0]) || 20) * .54 }; },
  fillText(text, x, y) { labels.push({ text, x, y }); },
  drawImage(image) { drawn.push(image.src); },
};
const canvas = { getContext: () => ctx, toBlob(callback, type) { callback(new Blob(["canvas output"], { type })); } };
const scope = vm.createContext({
  BY_ID, POSITIONS, URL, Blob, File,
  document: {
    querySelector: () => canonical ? { href: canonical } : null,
    createElement: () => canvas,
  },
  location: { origin: "http://localhost:8080" },
  Image: class { width = 400; height = 667; async decode() {} },
  navigator: {
    canShare: () => supported,
    async share(payload) {
      if (cancel) throw Object.assign(new Error("Cancelled"), { name: "AbortError" });
      if (failure) throw new Error("Unavailable");
      sent.push(payload);
    },
  },
});
const source = await fs.readFile(new URL("../public/share.js", import.meta.url), "utf8");
vm.runInContext(source.replace(/^import[^;]+;\s*/m, "").replace(/\bexport\s+/g, ""), scope);
const run = code => vm.runInContext(code, scope);
assert.equal(run("websiteURL()"), canonical);
canonical = null;
assert.equal(run("websiteURL()"), "http://localhost:8080/");
canonical = "https://tarot.example/play/";
const ids = ["m17", "c14", "s12"];
scope.ids = ids;
const invitation = run("shareInvitation(ids)");
assert.ok(invitation.includes(canonical));
assert.match(invitation, /Yuk, baca tiga kartumu bareng Sela/);
for (const id of ids) assert.ok(invitation.includes(BY_ID[id].name));
const blob = await run("createShareImage(ids)");
assert.equal(blob.type, "image/png");
assert.equal(canvas.width, 1080);
assert.equal(canvas.height, 1350);
assert.equal(drawn.filter(url => url.includes("/assets/cards/")).length, 3);
assert.ok(drawn.some(url => url.includes("/assets/felt.webp")));
assert.ok(labels.some(label => label.text.includes("Yuk, baca kartumu")));
assert.ok(labels.some(label => label.text === "tarot.example/play"));
scope.photo = blob;
assert.equal(await run("sharePhoto(photo, ids)"), true);
assert.equal(sent.length, 1);
assert.equal(sent[0].files[0].type, "image/png");
assert.equal(sent[0].text, invitation);
cancel = true;
assert.equal(await run("sharePhoto(photo, ids)"), true, "Cancelling the system share sheet never downloads an unwanted photo");
cancel = false; failure = true;
assert.equal(await run("sharePhoto(photo, ids)"), false, "A failed system share permits saving the photo instead");
failure = false; supported = false;
assert.equal(await run("sharePhoto(photo, ids)"), false);
for (const invalid of ['[]', '["m17","unknown","c14"]', '["__proto__"]']) await assert.rejects(run(`createShareImage(${invalid})`));
console.log("PASS: SITE_URL/Cloudflare/local-env resolution, three-card PNG render calls and invitation URL, native file sharing, cancellation, unsupported-device fallback and invalid-card guards (Canvas/Web Share simulation).");
