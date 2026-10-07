import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

// Offline asset preparation only; the website/build does not require FFmpeg.
const run = promisify(execFile);
const sourceDir = fileURLToPath(new URL("../public/assets/audio/clips/", import.meta.url));
const outputDir = process.argv[2] && path.resolve(process.argv[2]);
assert.ok(outputDir, "Usage: node scripts/normalize-narration.mjs <output-directory>");
assert.notEqual(outputDir, path.resolve(sourceDir), "Keep source recordings intact until every output passes verification");
await mkdir(outputDir, { recursive: true });
const files = (await readdir(sourceDir)).filter(file => file.endsWith(".mp3")).sort();
assert.equal(files.length, 422, "Normalize the complete Sela recording set");
const target = { integratedLUFS: -16, truePeakDBTP: -3, loudnessRangeLU: 7 };
const baseFilter = `loudnorm=I=${target.integratedLUFS}:TP=${target.truePeakDBTP}:LRA=${target.loudnessRangeLU}`;
const ffmpegArgs = ["-hide_banner", "-nostdin", "-nostats", "-v", "info"];

async function measure(file) {
  const { stdout, stderr } = await run("ffmpeg", [
    ...ffmpegArgs, "-i", file, "-af", `${baseFilter}:print_format=json`,
    "-ar", "22050", "-ac", "1", "-c:a", "pcm_f32le", "-f", "f32le", "pipe:1",
  ], { encoding: "buffer", maxBuffer: 32 * 1024 * 1024 });
  const match = stderr.toString().match(/\{\s*"input_i"[\s\S]*?\}/);
  assert.ok(match, `Missing loudness measurement: ${file}`);
  const values = JSON.parse(match[0]);
  for (const value of Object.values(values)) {
    if (value !== "dynamic" && value !== "linear") assert.ok(Number.isFinite(Number(value)), `Invalid loudness: ${file}`);
  }
  return { values, samples: stdout.length / 4 };
}

const results = [];
async function normalize(file) {
  const source = path.join(sourceDir, file), output = path.join(outputDir, file);
  const before = await measure(source);
  const m = before.values;
  // Apply a measured per-clip gain and constrain only loud syllables.
  // Limiting at the final sample rate avoids resampling peak overshoots.
  let gainDB = target.integratedLUFS - Number(m.input_i), peakTarget = target.truePeakDBTP, after;
  for (let attempt = 0; attempt < 6; attempt++) {
    const limit = 10 ** (peakTarget / 20);
    const filter = `aresample=22050,volume=${gainDB}dB,alimiter=limit=${limit}:attack=5:release=80:level=false:latency=true`;
    await run("ffmpeg", [
      ...ffmpegArgs, "-y", "-i", source, "-af", filter,
      "-c:a", "libmp3lame", "-b:a", "48k", "-ac", "1", "-ar", "22050", output,
    ], { maxBuffer: 1024 * 1024 });
    after = await measure(output);
    const error = target.integratedLUFS - Number(after.values.input_i);
    const peakError = Number(after.values.input_tp) + 1.5;
    if (Math.abs(error) <= 0.4 && peakError <= 0) break;
    // Correct encoded loudness using the original input, never a lossy output.
    gainDB += error;
    if (peakError > 0) peakTarget -= peakError + 0.2;
  }
  const loudness = Number(after.values.input_i), peak = Number(after.values.input_tp);
  assert.ok(Math.abs(loudness - target.integratedLUFS) <= 1, `${file}: loudness ${loudness} LUFS misses target`);
  assert.ok(peak <= -1.5, `${file}: encoded true peak ${peak} dBTP has insufficient headroom`);
  assert.ok(Math.abs(after.samples - before.samples) <= 2, `${file}: decoded duration changed`);
  const hash = data => createHash("sha256").update(data).digest("hex");
  results.push({
    file, beforeLUFS: Number(m.input_i), afterLUFS: loudness, truePeakDBTP: peak,
    durationSeconds: after.samples / 22050,
    sourceSHA256: hash(await readFile(source)), outputSHA256: hash(await readFile(output)),
  });
  if (results.length % 25 === 0 || results.length === files.length) console.log(`Normalized and verified ${results.length}/${files.length} clips`);
}

// Bounded concurrency keeps the offline batch responsive on Windows.
for (let i = 0; i < files.length; i += 4) await Promise.all(files.slice(i, i + 4).map(normalize));
results.sort((a, b) => a.file.localeCompare(b.file));
const range = key => [Math.min(...results.map(row => row[key])), Math.max(...results.map(row => row[key]))];
const average = key => results.reduce((sum, row) => sum + row[key], 0) / results.length;
const summary = {
  clips: results.length, target,
  method: "Measured per-clip gain plus a lookahead peak limiter; encoded MP3 remeasured, duration preserved",
  beforeLUFS: range("beforeLUFS"), afterLUFS: range("afterLUFS"),
  meanBeforeLUFS: average("beforeLUFS"), meanAfterLUFS: average("afterLUFS"),
  maxTruePeakDBTP: Math.max(...results.map(row => row.truePeakDBTP)),
};
await writeFile(path.join(outputDir, "loudness-report.json"), JSON.stringify({ summary, clips: results }, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
