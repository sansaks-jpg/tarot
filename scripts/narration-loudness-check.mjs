import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { SELA_CLIPS, getClipAudioUrl } from "../public/naskah.js";

// FFmpeg measures the actual encoded audio during offline normalization.
// Build checks pin each asset to that measurement, without requiring FFmpeg on CI.
const report = JSON.parse(await readFile(new URL("../docs/narration-loudness.json", import.meta.url), "utf8"));
const expected = Object.keys(SELA_CLIPS).map(id => `${id}.mp3`).sort();
assert.deepEqual(report.clips.map(clip => clip.file).sort(), expected);
assert.equal(report.summary.clips, expected.length);
assert.equal(report.summary.target.integratedLUFS, -16);
for (const clip of report.clips) {
  assert.ok(Number.isFinite(clip.afterLUFS) && Math.abs(clip.afterLUFS + 16) <= 1, `${clip.file}: speech loudness`);
  assert.ok(Number.isFinite(clip.truePeakDBTP) && clip.truePeakDBTP <= -1.5, `${clip.file}: encoded peak headroom`);
  assert.ok(clip.durationSeconds > 0, `${clip.file}: complete audio`);
  const id = clip.file.slice(0, -4);
  const bytes = await readFile(new URL(`../public${getClipAudioUrl(id)}`, import.meta.url));
  const hash = createHash("sha256").update(bytes).digest("hex");
  assert.equal(hash, clip.outputSHA256, `${clip.file}: recording changed since loudness verification; normalize and refresh the report`);
}
console.log(`PASS: ${expected.length} normalized MP3 asset hashes match the offline loudness/true-peak measurements (not an on-device listening test).`);
