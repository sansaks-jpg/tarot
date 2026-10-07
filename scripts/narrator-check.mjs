import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import { findClipId, getClipAudioUrl } from "../public/naskah.js";

const requests = [], sources = [], ducking = [];
let enabled = true, failure = false, blockedId = null, release, level = 100;
const speechGain = { gain: { value: 0, setTargetAtTime(value) { this.value = value; } }, connect(node) { this.output = node; } };
const limiter = { threshold: {}, knee: {}, ratio: {}, attack: {}, release: {}, connect(node) { this.output = node; } };
const ctx = {
  state: "running", currentTime: 0, destination: {},
  async resume() {},
  createGain: () => speechGain,
  createDynamicsCompressor: () => limiter,
  decodeAudioData: async data => ({ duration: 20, data }),
  createBufferSource() {
    const source = {
      connect() {}, disconnect() { this.disconnected = true; },
      start(at, offset) { this.started = { at, offset }; },
      stop() { this.stopped = true; },
    };
    sources.push(source);
    return source;
  },
};
const scope = vm.createContext({
  findClipId, getClipAudioUrl, getAudioContext: () => ctx,
  narratorVolume: () => level, audioEnabled: () => enabled,
  duckMusic(value) { ducking.push(value); },
  fetch: async url => {
    requests.push(url);
    assert.match(url, /^\/assets\/audio\/clips\/[^/?]+\.mp3\?v=sela-audio-2$/, "The narrator requests cache-versioned local recorded MP3 assets");
    if (url.includes(blockedId || "no-match")) await new Promise(resolve => { release = resolve; });
    return { ok: !failure, arrayBuffer: async () => new ArrayBuffer(8) };
  },
});
const source = await fs.readFile(new URL("../public/narrator.js", import.meta.url), "utf8");
assert.doesNotMatch(source, /WebSocket|api\/|speechSynthesis|SpeechSynthesisUtterance|LiveNarrator|gemini/i);
vm.runInContext(source.replace(/^\uFEFF/, "").replace(/^import[\s\S]*?;\s*/gm, "").replace("export class RecordedNarrator", "class RecordedNarrator").split("export const narrator")[0] + "\nglobalThis.TestNarrator=RecordedNarrator;", scope);
const settle = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
const n = new scope.TestNarrator();
assert.equal(n.mode, "recorded");
let completed = 0;
const statuses = [];
await n.speak("m00-M1", "The Fool", (text, speaking) => statuses.push({ text, speaking }), () => completed++);
assert.equal(requests.length, 1);
assert.deepEqual(sources[0].started, { at: 0, offset: 0 });
assert.equal(statuses.at(-1).speaking, true);
assert.equal(ducking.at(-1), true);
assert.equal(speechGain.output, limiter);
assert.equal(limiter.output, ctx.destination);
assert.equal(limiter.knee.value, 0);
assert.ok(limiter.threshold.value >= -2, "Normalized speech passes without the previous low-threshold compression");
assert.ok(limiter.ratio.value >= 12, "The compressor protects only loud peaks");
assert.equal(speechGain.gain.value, 1);
level = 50;
n.volume();
assert.equal(speechGain.gain.value, 0.5, "Slider still attenuates the normalized recording");
level = 0;
n.volume();
assert.equal(speechGain.gain.value, 0);
assert.equal(ducking.at(-1), false);
level = 100;
n.volume();
ctx.currentTime = 4.25;
assert.equal(n.playback().elapsed, 4.25);
assert.equal(n.pause(), true);
assert.equal(n.playback().paused, true);
ctx.currentTime += 3;
assert.equal(n.playback().elapsed, 4.25, "Paused caption clock stays at the same audio offset");
assert.equal(n.pause(), false);
assert.equal(completed, 0);
assert.equal(sources[0].stopped, true);
assert.equal(statuses.at(-1).text, "Dijeda");
assert.equal(n.resume(), true);
assert.equal(n.resume(), false);
assert.deepEqual(sources[1].started, { at: 0, offset: 4.25 }, "Resume must retain the exact audio offset");
assert.equal(requests.length, 1, "Resume does not fetch the clip again");
sources[1].onended();
assert.equal(completed, 1);
assert.equal(sources[1].disconnected, true);
assert.equal(ducking.at(-1), false);
await n.speak("m00-M1", "The Fool");
assert.equal(requests.length, 1, "Replay reuses the decoded buffer");
const stopped = sources.at(-1);
const oldEnd = stopped.onended;
n.stop();
oldEnd();
assert.equal(n.playing, null);
assert.equal(stopped.stopped, true);
const beforeUnknown = requests.length;
await n.speak("Unregistered or partially matching text", "Card");
assert.equal(requests.length, beforeUnknown, "Unknown text never creates an API request or picks an unrelated recording");
enabled = false;
n.volume();
assert.equal(speechGain.gain.value, 0, "Global mute silences normalized narration");
await n.speak("m01-M1", "Card");
assert.equal(requests.length, beforeUnknown);
enabled = true;

// A late download from a cancelled sentence must not play or unduck newer speech.
blockedId = "m02-M1";
const old = n.speak("m02-M1", "Old");
await settle();
await n.speak("m03-M1", "New");
const newSource = sources.at(-1), count = sources.length;
assert.equal(ducking.at(-1), true);
release();
await old;
assert.equal(sources.length, count);
assert.equal(newSource.stopped, undefined);
assert.equal(ducking.at(-1), true, "Cancelled preparation must not change the new clip's ducking");
blockedId = null;
n.stop();

// Preparation and immediate playback share one pending download/decode.
const beforePrepare = requests.length;
n.prepare("m04-M1");
await n.speak("m04-M1", "Prepared");
assert.equal(requests.length, beforePrepare + 1);
n.stop();
for (let i = 5; i <= 17; i++) await n.clipBuffer(`m${String(i).padStart(2, "0")}-M1`);
assert.equal(n.clipBuffers.size, 8, "Decoded audio cache stays bounded on mobile");
assert.equal(n.pendingClips.size, 0);
failure = true;
let result;
const failedStatuses = [];
await n.speak("p14-R1", "Missing", (text, speaking) => failedStatuses.push({ text, speaking }), value => { result = value; });
assert.equal(result.audio, false);
assert.ok(failedStatuses.every(status => !status.speaking), "Missing audio is never reported as audible");
assert.match(failedStatuses.at(-1).text, /Rekaman belum tersedia/);
assert.equal(n.playing, null);
assert.equal(n.pendingClips.size, 0);
assert.equal(ducking.at(-1), false);
console.log("PASS: cache-versioned prerecorded requests, peak protection, independent level/mute, exact matching, cached playback, pause/resume offset, cancellation isolation, preload deduplication, bounded cache, and missing-audio recovery (simulated AudioContext).");
