import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";

const gains = [], events = [];
const ctx = {
  currentTime: 1, state: "running", destination: {},
  async resume() {}, async suspend() {},
  createGain() {
    const node = { gain: { value: 0, setTargetAtTime(value) { this.value = value; } }, connect() {} };
    gains.push(node);
    return node;
  },
  createMediaElementSource() { return { connect() {} }; },
  async decodeAudioData() { return {}; },
};
const scope = vm.createContext({
  AudioContext: function () { return ctx; },
  Audio: class { async play() {} pause() {} },
  Event: class { constructor(type) { this.type = type; } },
  dispatchEvent(event) { events.push(event.type); },
  document: { hidden: false, addEventListener() {} },
  fetch: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }),
});
const source = await fs.readFile(new URL("../public/audio.js", import.meta.url), "utf8");
vm.runInContext(source.replace(/\bexport\s+/g, ""), scope);
const run = code => vm.runInContext(code, scope);
run("primeAudio()");
assert.equal(gains[0].gain.value, 1);
assert.equal(run("musicVolume()"), 65);
assert.equal(run("narratorVolume()"), 100);
run("setMusicVolume(0)");
assert.equal(gains[1].gain.value, 0);
assert.equal(gains[2].gain.value, 0);
assert.equal(run("narratorVolume()"), 100, "Music/effect mute leaves narration unchanged");
run("setNarratorVolume(23)");
assert.equal(run("narratorVolume()"), 23);
assert.equal(gains[1].gain.value, 0);
assert.equal(gains[0].gain.value, 1, "Narrator level does not attenuate the music master");
run("setMusicVolume(80); duckMusic(true)");
assert.ok(Math.abs(gains[1].gain.value - .128) < .00001);
run("setMusicVolume(50)");
assert.equal(gains[1].gain.value, .08, "Music adjustment keeps the existing narration duck");
run("duckMusic(false)");
assert.equal(gains[1].gain.value, .33);
await run("toggleAudio()");
assert.equal(gains[0].gain.value, 0);
assert.equal(run("narratorVolume()"), 23);
await run("toggleAudio()");
assert.equal(gains[0].gain.value, 1);
assert.equal(run("musicVolume()"), 50);
run("setNarratorVolume(500); setMusicVolume(-4)");
assert.equal(run("narratorVolume()"), 100);
assert.equal(run("musicVolume()"), 0);
run("setNarratorVolume('invalid'); setMusicVolume(NaN)");
assert.equal(run("narratorVolume()"), 100);
assert.equal(run("musicVolume()"), 0);
assert.ok(events.length > 5 && events.every(type => type === "room-volume"));
console.log("PASS: independent music/effect and narrator volumes, mute/unmute retains levels, ducking survives music changes, and invalid inputs are ignored (simulated audio graph).");
