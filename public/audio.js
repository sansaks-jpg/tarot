// Recorded music and card foley. Audio files are requested after a user gesture.
let ctx, master, music, effects, soundtrack;
let enabled = true,
  musicLevel = 0.65,
  narratorLevel = 1,
  ducked = false;
const buffers = new Map(),
  pending = new Map(),
  sources = new Set();
const files = ["shuffle", "fan", "slide", "place", "turn"];

function context() {
  if (ctx) return ctx;
  const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContext) return null;
  ctx = new AudioContext({ latencyHint: "interactive" });
  master = ctx.createGain();
  master.gain.value = enabled ? 1 : 0;
  master.connect(ctx.destination);
  music = ctx.createGain();
  music.gain.value = musicLevel * (ducked ? 0.16 : 0.66);
  music.connect(master);
  effects = ctx.createGain();
  effects.gain.value = musicLevel * 0.95;
  effects.connect(master);
  soundtrack = new Audio("/assets/audio/room.m4a");
  soundtrack.preload = "none";
  soundtrack.loop = true;
  ctx.createMediaElementSource(soundtrack).connect(music);
  for (const file of files) {
    const promise = fetch(`/assets/audio/${file}.mp3`)
      .then((response) => {
        if (!response.ok) throw new Error("Audio unavailable");
        return response.arrayBuffer();
      })
      .then((data) => ctx.decodeAudioData(data))
      .then((buffer) => buffers.set(file, buffer))
      .catch(() => {});
    pending.set(file, promise);
  }
  return ctx;
}

export const getAudioContext = () => context();
export const musicVolume = () => Math.round(musicLevel * 100);
export const narratorVolume = () => Math.round(narratorLevel * 100);
export const audioEnabled = () => enabled;
const changed = () => globalThis.dispatchEvent?.(new Event("room-volume"));

export function primeAudio() {
  if (!enabled || document.hidden || !context()) return false;
  master.gain.setTargetAtTime(1, ctx.currentTime, 0.035);
  // Keep play() in the gesture's call stack for mobile autoplay policies.
  ctx.resume().catch(() => {});
  soundtrack.play().catch(() => {});
  return true;
}
export function duckMusic(on) {
  ducked = on;
  if (ctx && music)
    music.gain.setTargetAtTime(musicLevel * (on ? 0.16 : 0.66), ctx.currentTime, 0.15);
}
export async function enableAudio() {
  enabled = true;
  primeAudio();
  changed();
  return true;
}
export async function toggleAudio() {
  if (!context()) throw new Error("Suara belum didukung browser ini.");
  enabled = !enabled;
  if (enabled) primeAudio();
  else {
    soundtrack.pause();
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.025);
    for (const source of sources) {
      try {
        source.stop();
      } catch {}
    }
  }
  changed();
  return enabled;
}
export function setMusicVolume(value) {
  if (!Number.isFinite(Number(value))) return;
  musicLevel = Math.max(0, Math.min(1, Number(value) / 100));
  if (ctx) {
    music.gain.setTargetAtTime(musicLevel * (ducked ? 0.16 : 0.66), ctx.currentTime, 0.03);
    effects.gain.setTargetAtTime(musicLevel * 0.95, ctx.currentTime, 0.03);
  }
  changed();
}
export function setNarratorVolume(value) {
  if (!Number.isFinite(Number(value))) return;
  narratorLevel = Math.max(0, Math.min(1, Number(value) / 100));
  changed();
}
export function sfx(name) {
  if (!enabled || document.hidden || ctx?.state !== "running") return;
  const file =
    {
      select: "slide",
      reveal: "turn",
      complete: "place",
      save: "place",
      next: "slide",
    }[name] || name;
  const buffer = buffers.get(file);
  if (!buffer) return; // Never play a late effect after its animation has finished.
  const source = ctx.createBufferSource(),
    gain = ctx.createGain();
  source.buffer = buffer;
  source.playbackRate.value =
    name === "select" ? 0.96 + Math.random() * 0.08 : 1;
  gain.gain.value = ["shuffle", "fan", "reveal"].includes(name) ? 1 : 0.75;
  source.connect(gain);
  gain.connect(effects);
  sources.add(source);
  source.onended = () => {
    sources.delete(source);
    source.disconnect();
    gain.disconnect();
  };
  source.start();
}
document.addEventListener("visibilitychange", () => {
  if (!ctx) return;
  if (document.hidden) {
    soundtrack.pause();
    ctx.suspend().catch(() => {});
  } else if (enabled) primeAudio();
});
