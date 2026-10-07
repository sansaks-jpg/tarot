import { narratorVolume, audioEnabled, duckMusic, getAudioContext } from "./audio.js?v=room-7";
import { findClipId, getClipAudioUrl } from "./naskah.js?v=sela-audio-2";

// Only recorded clips are playable. A caption must match an exact script or ID.
export class RecordedNarrator {
  constructor() {
    this.mode = "recorded";
    this.ctx = null;
    this.gain = null;
    this.clipBuffers = new Map();
    this.pendingClips = new Map();
    this.playing = null;
    this.job = 0;
  }

  unlock() {
    try {
      if (!this.ctx) {
        this.ctx = getAudioContext();
        if (!this.ctx) return;
        this.gain = this.ctx.createGain();
        const limiter = this.ctx.createDynamicsCompressor();
        // Clips are loudness-normalized offline. Only catch peaks here;
        // the old -10 dB soft knee compressed ordinary speech back down.
        limiter.threshold.value = -1;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.002;
        limiter.release.value = 0.08;
        this.gain.connect(limiter);
        limiter.connect(this.ctx.destination);
      }
      this.volume();
      this.ctx.resume().catch(() => {});
    } catch {}
  }

  volume() {
    if (this.ctx && this.gain) this.gain.gain.setTargetAtTime(audioEnabled() ? narratorVolume() / 100 : 0, this.ctx.currentTime, 0.03);
    if (this.playing?.source) duckMusic(audioEnabled() && narratorVolume() > 0);
  }

  playback() {
    const playing = this.playing;
    if (!playing?.buffer) return null;
    const elapsed = playing.offset + (playing.source && !playing.paused ? Math.max(0, this.ctx.currentTime - playing.startedAt) : 0);
    return { id: playing.id, elapsed: Math.min(elapsed, playing.buffer.duration), duration: playing.buffer.duration, paused: playing.paused };
  }

  stop() {
    this.job++;
    const playing = this.playing;
    this.playing = null;
    if (playing?.source) {
      playing.source.onended = null;
      try { playing.source.stop(); playing.source.disconnect(); } catch {}
    }
    duckMusic(false);
  }

  pause() {
    const playing = this.playing;
    if (!playing || playing.paused) return false;
    playing.paused = true;
    if (playing.source) {
      playing.offset += Math.max(0, this.ctx.currentTime - playing.startedAt);
      playing.source.onended = null;
      try { playing.source.stop(); playing.source.disconnect(); } catch {}
      playing.source = null;
    }
    duckMusic(false);
    playing.status("Dijeda", false);
    return true;
  }

  resume() {
    const playing = this.playing;
    if (!playing?.paused || !audioEnabled()) return false;
    this.unlock();
    playing.paused = false;
    if (playing.buffer) this.playBuffer(playing);
    return true;
  }

  async clipBuffer(id) {
    const cached = this.clipBuffers.get(id);
    if (cached) {
      this.clipBuffers.delete(id);
      this.clipBuffers.set(id, cached);
      return cached;
    }
    if (this.pendingClips.has(id)) return this.pendingClips.get(id);
    const pending = (async () => {
      const response = await fetch(getClipAudioUrl(id));
      if (!response.ok) throw new Error("Rekaman belum tersedia.");
      const buffer = await this.ctx.decodeAudioData(await response.arrayBuffer());
      this.clipBuffers.set(id, buffer);
      while (this.clipBuffers.size > 8) this.clipBuffers.delete(this.clipBuffers.keys().next().value);
      return buffer;
    })();
    this.pendingClips.set(id, pending);
    try { return await pending; }
    finally { this.pendingClips.delete(id); }
  }

  prefetch() { return Promise.resolve(); }

  prepare(passage) {
    const id = findClipId(passage);
    if (!id || !audioEnabled() || !this.ctx) return;
    this.clipBuffer(id).catch(() => {});
  }

  playBuffer(playing) {
    if (this.playing !== playing || playing.job !== this.job || playing.paused) return;
    if (playing.offset >= playing.buffer.duration) {
      this.playing = null;
      duckMusic(false);
      playing.status("", false);
      playing.done({ audio: true });
      return;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = playing.buffer;
    source.connect(this.gain);
    playing.source = source;
    playing.startedAt = this.ctx.currentTime;
    source.onended = () => {
      source.disconnect();
      if (this.playing !== playing || playing.job !== this.job) return;
      this.playing = null;
      duckMusic(false);
      playing.status("", false);
      playing.done({ audio: true });
    };
    source.start(0, playing.offset);
    duckMusic(audioEnabled() && narratorVolume() > 0);
    playing.status("Sela sedang membaca", true);
  }

  async speak(passage, card, status = () => {}, done = () => {}) {
    this.stop();
    const job = this.job;
    const id = findClipId(passage);
    if (!id || !audioEnabled()) { done({ audio: false }); return; }
    this.unlock();
    const playing = { job, id, status, done, offset: 0, paused: false, source: null };
    this.playing = playing;
    status("Menyiapkan suara…", false);
    try {
      if (!this.ctx) throw new Error("Audio belum didukung.");
      await this.ctx.resume();
      if (this.ctx.state !== "running") throw new Error("Audio belum aktif.");
      playing.buffer = await this.clipBuffer(id);
      this.playBuffer(playing);
    } catch {
      if (job !== this.job) return;
      this.playing = null;
      duckMusic(false);
      status("Rekaman belum tersedia. Teks tetap bisa dibaca.", false);
      done({ audio: false });
    }
  }
}

export const narrator = new RecordedNarrator();
globalThis.addEventListener?.("room-volume", () => narrator.volume());
