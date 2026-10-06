import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import { parseEnv } from "./local-env.mjs";

// Only fixture values are read here. The user's .env is never opened by tests.
assert.deepEqual(
  parseEnv(
    '\uFEFFGEMINI_API_KEY=fixture-only\r\nGEMINI_LIVE_MODEL=gemini-3.8-live\nGEMINI_LIVE_VOICE="Aoede"\nSITE_URL=http://localhost:8080',
  ),
  {
    GEMINI_API_KEY: "fixture-only",
    GEMINI_LIVE_MODEL: "gemini-3.8-live",
    GEMINI_LIVE_VOICE: "Aoede",
    SITE_URL: "http://localhost:8080",
  },
);
const timers = new Map(),
  starts = [],
  sockets = [];
let timerId = 0,
  tokenRequests = 0,
  fetchFails = false;
const ctx = {
  state: "running",
  currentTime: 0,
  destination: {},
  resume: async () => {},
  createGain: () => ({ gain: { setTargetAtTime() {} }, connect() {} }),
  createDynamicsCompressor: () => ({ threshold: {}, ratio: {}, connect() {} }),
  createBuffer: (channels, length, rate) => ({
    duration: length / rate,
    getChannelData: () => new Float32Array(length),
  }),
  createBufferSource: () => ({
    connect() {},
    disconnect() {},
    start(at) {
      starts.push({ at, source: this });
    },
    stop() {
      this.stopped = true;
    },
  }),
};
class Socket {
  constructor() {
    this.readyState = 0;
    this.sent = [];
    sockets.push(this);
    queueMicrotask(() => {
      this.readyState = 1;
      this.onopen?.();
    });
  }
  send(text) {
    const message = JSON.parse(text);
    this.sent.push(message);
    if (message.setup) queueMicrotask(() => this.emit({ setupComplete: {} }));
  }
  emit(message) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
}
const scope = vm.createContext({
  console,
  Blob,
  AbortController,
  Uint8Array,
  DataView,
  Float32Array,
  performance,
  atob,
  WebSocket: Socket,
  getAudioContext: () => ctx,
  audioEnabled: () => true,
  audioVolume: () => 100,
  duckMusic() {},
  setTimeout: (cb, delay) => {
    const id = ++timerId;
    timers.set(id, { cb, delay });
    return id;
  },
  clearTimeout: (id) => timers.delete(id),
  fetch: async () => {
    tokenRequests++;
    if (fetchFails) throw Error("fixture failure");
    return {
      ok: true,
      json: async () => ({
        token: "fixture-ephemeral",
        setup: { model: "models/gemini-3.8-live" },
      }),
    };
  },
});
const source = (
  await fs.readFile(new URL("../public/narrator.js", import.meta.url), "utf8")
)
  .replace(/^import[\s\S]*?;\s*/m, "")
  .replace("export class LiveNarrator", "class LiveNarrator")
  .split("export const narrator")[0];
assert.doesNotMatch(
  source,
  /speechSynthesis|SpeechSynthesisUtterance|deviceSpeak/,
);
vm.runInContext(source + "\nglobalThis.TestNarrator=LiveNarrator;", scope);
const settle = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};
const n = new scope.TestNarrator();
n.configure({ narration: true });
n.unlock();
const chunk = {
  mimeType: "audio/pcm;rate=24000",
  data: Buffer.alloc(4800).toString("base64"),
};
n.prepare("Bacaan pertama.", "The Fool");
await settle();
assert.equal(tokenRequests, 1);
assert.equal(sockets.length, 1);
assert.equal(sockets[0].sent.filter((m) => m.clientContent).length, 1);
await n.speak("Bacaan pertama.", "The Fool");
await settle();
sockets[0].emit({
  serverContent: { modelTurn: { parts: [{ inlineData: chunk }] } },
});
await settle();
assert.equal(starts.length, 1, "First PCM must start before turnComplete");
assert.equal(n.active.complete, false);
assert.equal(starts[0].at, 0.035, "Playback only adds a 35 ms jitter margin");
sockets[0].emit({
  serverContent: { modelTurn: { parts: [{ inlineData: chunk }] } },
});
await settle();
assert.ok(
  Math.abs(starts[1].at - 0.135) < 0.000001,
  "Consecutive PCM chunks must be contiguous",
);
sockets[0].emit({ serverContent: { turnComplete: true } });
await settle();
n.stop();
assert.ok(starts.every((s) => s.source.stopped));
await n.speak("Bacaan pertama.", "The Fool");
await settle();
assert.equal(
  tokenRequests,
  1,
  "Cached replay does not request a new connection",
);
assert.equal(starts.length, 4);
await n.speak("Bacaan kedua.", "The Sun");
await settle();
assert.equal(
  sockets.length,
  1,
  "A reading reuses its existing Gemini connection",
);
sockets[0].emit({
  serverContent: { modelTurn: { parts: [{ inlineData: chunk }] } },
});
await settle();
const before = starts.length;
n.stop();
n.prepare("Bacaan ketiga.", "The Moon");
await settle();
sockets[0].emit({
  serverContent: { modelTurn: { parts: [{ inlineData: chunk }] } },
});
await settle();
assert.equal(starts.length, before, "Old passage audio cannot leak after stop");
sockets[0].emit({ serverContent: { turnComplete: true } });
await settle();
assert.equal(n.active.passage, "Bacaan ketiga.");
sockets[0].emit({
  serverContent: {
    modelTurn: { parts: [{ inlineData: chunk }] },
    turnComplete: true,
  },
});
await settle();
await n.speak("Bacaan ketiga.", "The Moon");
await settle();
assert.equal(
  starts.length,
  before + 1,
  "Prepared next passage is ready to play",
);
n.stop({ disconnect: true });
assert.equal(n.queue.length, 0);
assert.equal(n.socket, null);
fetchFails = true;
const failed = new scope.TestNarrator();
failed.configure({ narration: true });
const entry = failed.request("Fixture.", "Fixture");
await assert.rejects(entry.promise);
await settle();
assert.equal(
  failed.queue.length,
  0,
  "Failed token requests must clear queued generation",
);
assert.equal(failed.cache.size, 0);
failed.disconnect();
console.log(
  "PASS: env fixture, Gemini-only voice, first-chunk streaming, contiguous PCM, shared connection, cached next passage, stopped-audio isolation, and failed-token cleanup.",
);
