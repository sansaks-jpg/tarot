// Procedural soundtrack and card sounds; enabled at 100% on first load.
let ctx,
  master,
  music,
  bus,
  enabled = true,
  volume = 1,
  timer,
  lastChord = 0;
const voices = new Set();
const chords = [
  [130.81, 164.81, 196, 261.63],
  [174.61, 220, 261.63, 329.63],
  [196, 246.94, 293.66, 392],
  [164.81, 220, 261.63, 329.63],
];
function context() {
  if (ctx) return true;
  const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Audio) return false;
  ctx = new Audio();
  master = ctx.createGain();
  master.gain.value = enabled ? volume : 0;
  master.connect(ctx.destination);
  music = ctx.createGain();
  music.gain.value = 0.42;
  music.connect(master);
  bus = ctx.createGain();
  bus.gain.value = 0.62;
  bus.connect(master);
  ctx.addEventListener("statechange", () => {
    if (enabled && !document.hidden && ctx.state === "running") startMusic();
  });
  return true;
}
function tone(frequency, start, duration, gain, target = bus, type = "sine") {
  const oscillator = ctx.createOscillator(),
    envelope = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(
    gain,
    start +
      (target === music
        ? Math.min(2.1, duration * 0.35)
        : Math.min(0.08, duration * 0.2)),
  );
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(envelope);
  envelope.connect(target);
  voices.add(oscillator);
  oscillator.onended = () => {
    voices.delete(oscillator);
    oscillator.disconnect();
    envelope.disconnect();
  };
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}
function ambient() {
  if (!enabled || document.hidden || ctx.state !== "running") return;
  const notes = chords[lastChord++ % chords.length],
    now = ctx.currentTime;
  notes.forEach((frequency, i) =>
    tone(frequency, now + i * 0.14, 8.5, 0.027, music),
  );
  [2, 1, 3, 2, 0, 2, 1, 3].forEach((note, i) =>
    tone(notes[note] * 2, now + 0.35 + i * 0.72, 0.5, 0.052, music, "triangle"),
  );
}
function startMusic() {
  if (timer || !enabled || document.hidden || ctx.state !== "running") return;
  ambient();
  timer = setInterval(ambient, 6500);
}
function stopMusic() {
  clearInterval(timer);
  timer = undefined;
  for (const voice of voices) {
    try {
      voice.stop(ctx.currentTime + 0.08);
    } catch {}
  }
}
export function primeAudio() {
  if (!enabled || document.hidden || !context()) return false;
  master.gain.setTargetAtTime(volume, ctx.currentTime, 0.1);
  // Attempt autoplay immediately; a suspended browser resumes on any first gesture.
  if (ctx.state !== "running")
    ctx
      .resume()
      .then(startMusic)
      .catch(() => {});
  else startMusic();
  return true;
}
export function duckMusic(on) {
  if (ctx && music)
    music.gain.setTargetAtTime(on ? 0.07 : 0.42, ctx.currentTime, 0.2);
}
export function audioVolume() {
  return Math.round(volume * 100);
}
export function audioEnabled() {
  return enabled;
}
export async function enableAudio() {
  enabled = true;
  primeAudio();
  globalThis.dispatchEvent?.(new Event("sela-volume"));
  return true;
}
export async function toggleAudio() {
  if (!context()) throw new Error("Suara belum didukung browser ini.");
  enabled = !enabled;
  if (enabled) primeAudio();
  else {
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
    stopMusic();
  }
  globalThis.dispatchEvent?.(new Event("sela-volume"));
  return enabled;
}
export function setVolume(value) {
  if (!Number.isFinite(Number(value))) return;
  volume = Math.max(0, Math.min(1, Number(value) / 100));
  if (ctx && enabled)
    master.gain.setTargetAtTime(volume, ctx.currentTime, 0.05);
  globalThis.dispatchEvent?.(new Event("sela-volume"));
}
export function sfx(name) {
  if (!enabled || !ctx || ctx.state !== "running") return;
  const t = ctx.currentTime;
  if (name === "shuffle") {
    const buffer = ctx.createBuffer(
        1,
        Math.floor(ctx.sampleRate * 0.45),
        ctx.sampleRate,
      ),
      data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const pulse = Math.max(
        0,
        Math.sin((i / ctx.sampleRate) * 2 * Math.PI * 15),
      );
      data[i] = (Math.random() * 2 - 1) * pulse * (1 - i / data.length);
    }
    const noise = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      gain = ctx.createGain();
    noise.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = 1700;
    filter.Q.value = 0.5;
    gain.gain.value = 0.12;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    noise.onended = () => {
      noise.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    noise.start();
    return;
  }
  if (name === "reveal") {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone(
        f,
        t + 0.34 + i * 0.1,
        0.85,
        0.075 / (1 + i * 0.28),
        bus,
        "triangle",
      ),
    );
    return;
  }
  if (name === "complete") {
    [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) =>
      tone(f, t + i * 0.14, 0.65, 0.07, bus, "triangle"),
    );
    return;
  }
  if (name === "save") {
    [349.23, 440, 523.25].forEach((f, i) => tone(f, t + i * 0.09, 0.7, 0.07));
    return;
  }
  if (name === "select") {
    tone(659.25, t, 0.14, 0.055, bus, "triangle");
    tone(783.99, t + 0.055, 0.21, 0.045, bus, "triangle");
    return;
  }
  tone(293.66, t, 0.35, 0.07);
  tone(440, t + 0.055, 0.42, 0.03);
}
document.addEventListener("visibilitychange", () => {
  if (!ctx) return;
  if (document.hidden) {
    stopMusic();
    ctx.suspend().catch(() => {});
  } else if (enabled) primeAudio();
});
