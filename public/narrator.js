import {
  audioVolume,
  audioEnabled,
  duckMusic,
  getAudioContext,
} from "./audio.js?v=room-4";

let naskahModule = null;
async function getNaskah() {
  if (!naskahModule && typeof window !== "undefined") {
    try {
      naskahModule = await import("./naskah.js?v=room-4");
    } catch {}
  }
  return naskahModule;
}

// One Live connection per reading. Generation and playback have separate lifetimes:
// changing a passage clears playback while an in-flight response drains to cache.
export class LiveNarrator {
  constructor() {
    this.ctx = null;
    this.gain = null;
    this.sources = new Set();
    this.clipBuffers = new Map();
    this.job = 0;
    this.mode = "none";
    this.socket = null;
    this.ready = null;
    this.isReady = false;
    this.active = null;
    this.queue = [];
    this.cache = new Map();
    this.playing = null;
    this.scheduled = 0;
    this.timer = null;
    this.idleTimer = null;
    this.abort = null;
    this.metrics = { connections: 0, firstAudioMs: null };
  }

  configure(config = {}) {
    this.mode = config.narration ? "gemini" : "none";
  }

  unlock() {
    try {
      if (!this.ctx) {
        this.ctx = getAudioContext();
        if (!this.ctx) return;
        this.gain = this.ctx.createGain();
        const limiter = this.ctx.createDynamicsCompressor();
        limiter.threshold.value = -10;
        limiter.ratio.value = 6;
        this.gain.connect(limiter);
        limiter.connect(this.ctx.destination);
      }
      this.volume();
      this.ctx.resume().catch(() => {});
    } catch {}
  }

  volume() {
    if (this.ctx && this.gain)
      this.gain.gain.setTargetAtTime(
        audioEnabled() ? audioVolume() / 100 : 0,
        this.ctx.currentTime,
        0.03,
      );
  }

  stop({ disconnect = false } = {}) {
    this.job++;
    clearTimeout(this.timer);
    this.playing = null;

    for (const source of this.sources) {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    }
    this.sources.clear();
    this.scheduled = this.ctx?.currentTime || 0;
    duckMusic(false);
    if (disconnect) this.disconnect();
  }

  disconnect() {
    clearTimeout(this.idleTimer);
    this.abort?.abort();
    this.abort = null;
    const socket = this.socket;
    this.socket = null;
    this.isReady = false;
    this.ready = null;
    this.rejectPending(new Error("Sesi suara berakhir."));
    if (socket) {
      socket.onclose = null;
      socket.onerror = null;
      try {
        socket.close();
      } catch {}
    }
  }

  rejectPending(error) {
    for (const entry of [this.active, ...this.queue].filter(Boolean)) {
      clearTimeout(entry.timeout);
      this.cache.delete(entry.key);
      entry.reject(error);
    }
    this.active = null;
    this.queue = [];
  }

  async connect() {
    clearTimeout(this.idleTimer);
    if (this.isReady && this.socket?.readyState === 1) return;
    if (this.ready) return this.ready;
    const controller = new AbortController();
    this.abort = controller;
    this.ready = (async () => {
      const timeout = setTimeout(() => controller.abort(), 8000);
      let data;
      try {
        const response = await fetch("/api/live-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Suara Gemini belum tersedia.");
        data = await response.json();
        if (typeof data.token !== "string" || !data.setup?.model)
          throw new Error("Token suara tidak valid.");
      } finally {
        clearTimeout(timeout);
      }
      if (controller.signal.aborted) throw new Error("Sesi suara dibatalkan.");
      return new Promise((resolve, reject) => {
        const socket = new WebSocket(
          "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=" +
            encodeURIComponent(data.token),
        );
        this.socket = socket;
        this.metrics.connections++;
        const handshake = setTimeout(() => {
          reject(new Error("Suara belum tersambung."));
          this.disconnect();
        }, 8000);
        const fail = () => {
          if (this.socket !== socket) return;
          clearTimeout(handshake);
          const error = new Error("Koneksi suara terputus.");
          reject(error);
          this.socket = null;
          this.isReady = false;
          this.ready = null;
          this.rejectPending(error);
          try {
            socket.close();
          } catch {}
        };
        socket.onopen = () => {
          if (this.socket === socket)
            socket.send(JSON.stringify({ setup: data.setup }));
        };
        // Chain decoding so Blob conversion cannot reorder PCM chunks.
        let messages = Promise.resolve();
        socket.onmessage = (event) => {
          messages = messages
            .then(async () => {
              if (this.socket !== socket) return;
              const raw =
                event.data instanceof Blob
                  ? await event.data.text()
                  : event.data;
              if (this.socket !== socket) return;
              const message = JSON.parse(raw);
              if (message.error) {
                fail();
                return;
              }
              if (message.setupComplete) {
                clearTimeout(handshake);
                this.isReady = true;
                resolve();
                this.pump();
                return;
              }
              const content = message.serverContent;
              const entry = this.active;
              if (content && entry) {
                if (content.interrupted) {
                  entry.reject(new Error("Bacaan suara terhenti."));
                  this.cache.delete(entry.key);
                }
                for (const part of content.modelTurn?.parts || []) {
                  const chunk = part.inlineData;
                  if (!chunk?.mimeType?.startsWith("audio/pcm")) continue;
                  entry.chunks.push(chunk);
                  // Stream immediately. Only the current passage is ever audible.
                  if (this.playing?.entry === entry) this.playAvailable();
                }
                if (content.turnComplete) {
                  clearTimeout(entry.timeout);
                  entry.complete = true;
                  this.active = null;
                  if (entry.chunks.length) entry.resolve(entry);
                  else {
                    this.cache.delete(entry.key);
                    entry.reject(new Error("Bacaan tidak berisi audio."));
                  }
                  if (this.playing?.entry === entry) this.finishWhenPlayed();
                  this.trimCache();
                  this.pump();
                }
              }
              if (message.goAway && !this.active) this.disconnect();
            })
            .catch(fail);
        };
        socket.onerror = fail;
        socket.onclose = fail;
      });
    })();
    try {
      await this.ready;
    } catch (error) {
      this.ready = null;
      throw error;
    }
  }

  prefetch() {
    if (this.mode !== "gemini" || !audioEnabled()) return Promise.resolve();
    return this.connect().catch(() => {});
  }

  request(passage, card, priority = false) {
    const key = card + "|" + passage;
    let entry = this.cache.get(key);
    if (!entry) {
      entry = { key, passage, card, chunks: [], complete: false };
      entry.promise = new Promise((resolve, reject) => {
        entry.resolve = resolve;
        entry.reject = reject;
      });
      entry.promise.catch(() => {});
      this.cache.set(key, entry);
      this.queue.push(entry);
    }
    if (priority && this.queue.includes(entry)) {
      this.queue = [entry, ...this.queue.filter((item) => item !== entry)];
    }
    if (entry.complete) return entry;
    this.connect()
      .then(() => this.pump())
      .catch((error) => {
        this.rejectPending(error);
      });
    return entry;
  }

  prepare(passage, card) {
    if (!audioEnabled() || !passage) return;
    getNaskah().then((naskah) => {
      const clipId = naskah?.findClipId?.(passage);
      if (clipId) {
        if (!this.clipBuffers?.has(clipId)) {
          fetch(naskah.getClipAudioUrl(clipId))
            .then((r) => (r.ok ? r.arrayBuffer() : null))
            .then((ab) => (ab && this.ctx ? this.ctx.decodeAudioData(ab) : null))
            .then((buf) => {
              if (buf) {
                if (!this.clipBuffers) this.clipBuffers = new Map();
                this.clipBuffers.set(clipId, buf);
              }
            })
            .catch(() => {});
        }
        return;
      }
      if (this.mode === "gemini") {
        this.request(passage, card).promise.catch(() => {});
      }
    }).catch(() => {
      if (this.mode === "gemini") {
        this.request(passage, card).promise.catch(() => {});
      }
    });
  }

  pump() {
    if (!this.isReady || this.active || this.socket?.readyState !== 1) return;
    const entry = this.queue.shift();
    if (!entry) {
      clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => this.disconnect(), 60000);
      return;
    }
    clearTimeout(this.idleTimer);
    this.active = entry;
    entry.timeout = setTimeout(() => {
      const error = new Error("Suara belum diterima.");
      entry.reject(error);
      this.disconnect();
    }, 30000);
    this.socket.send(
      JSON.stringify({
        clientContent: {
          turns: [
            {
              role: "user",
              parts: [
                {
                  text: JSON.stringify({
                    card: entry.card,
                    passage: entry.passage,
                  }),
                },
              ],
            },
          ],
          turnComplete: true,
        },
      }),
    );
  }

  trimCache() {
    // Bound memory to ~12 MB of base64 PCM, and retain the currently played entry.
    let bytes = [...this.cache.values()].reduce(
      (sum, e) => sum + e.chunks.reduce((n, c) => n + c.data.length, 0),
      0,
    );
    for (const [key, entry] of this.cache) {
      if (this.cache.size <= 8 && bytes <= 12 * 1024 * 1024) break;
      if (!entry.complete || entry === this.playing?.entry) continue;
      bytes -= entry.chunks.reduce((n, c) => n + c.data.length, 0);
      this.cache.delete(key);
    }
  }

  play(chunk) {
    if (!this.ctx || !this.gain || this.ctx.state !== "running") return false;
    const binary = atob(chunk.data);
    const rate = Number(/rate=(\d+)/.exec(chunk.mimeType || "")?.[1] || 24000);
    if (!binary.length || binary.length % 2 || rate < 8000 || rate > 48000)
      return false;
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const pcm = new DataView(bytes.buffer);
    const buffer = this.ctx.createBuffer(1, binary.length / 2, rate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++)
      samples[i] = pcm.getInt16(i * 2, true) / 32768;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gain);
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
    };
    // A short safety margin absorbs network jitter without waiting for the full turn.
    this.scheduled = Math.max(this.scheduled, this.ctx.currentTime + 0.035);
    source.start(this.scheduled);
    this.scheduled += buffer.duration;
    return true;
  }

  playAvailable() {
    const playing = this.playing;
    if (!playing || playing.job !== this.job) return;
    while (playing.index < playing.entry.chunks.length) {
      if (!this.play(playing.entry.chunks[playing.index])) break;
      playing.index++;
      if (playing.index === 1) {
        this.metrics.firstAudioMs = Math.round(
          performance.now() - playing.startedAt,
        );
        playing.status("Sela sedang membaca · Gemini", true);
        duckMusic(true);
      }
    }
    this.finishWhenPlayed();
  }

  finishWhenPlayed() {
    const playing = this.playing;
    if (
      !playing?.entry.complete ||
      playing.index !== playing.entry.chunks.length
    )
      return;
    clearTimeout(this.timer);
    this.timer = setTimeout(
      () => {
        if (this.playing !== playing || playing.job !== this.job) return;
        this.playing = null;
        duckMusic(false);
        playing.status("", false);
        playing.done();
      },
      Math.max(0, (this.scheduled - this.ctx.currentTime) * 1000) + 80,
    );
  }

  async playPreRecorded(clipId, status, done) {
    const job = this.job;
    const naskah = await getNaskah();
    const url = naskah ? naskah.getClipAudioUrl(clipId) : `/assets/audio/clips/${clipId}.mp3`;
    status("Sela sedang membaca", true);
    duckMusic(true);

    try {
      if (!this.clipBuffers) this.clipBuffers = new Map();
      let buffer = this.clipBuffers.get(clipId);
      if (!buffer) {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Audio clip unavailable");
        const arrayBuf = await response.arrayBuffer();
        buffer = await this.ctx.decodeAudioData(arrayBuf);
        this.clipBuffers.set(clipId, buffer);
      }

      if (job !== this.job) {
        duckMusic(false);
        return;
      }

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.gain);
      this.sources.add(source);

      source.onended = () => {
        this.sources.delete(source);
        if (job !== this.job) return;
        duckMusic(false);
        status("", false);
        done();
      };

      source.start(0);
    } catch {
      if (job !== this.job) return;
      duckMusic(false);
      status("", false);
      done();
    }
  }

  async speak(passage, card, status = () => {}, done = () => {}) {
    this.stop();
    const job = this.job;
    if (!audioEnabled() || this.mode === "none") return;
    this.unlock();

    if (this.ctx?.state !== "running") {
      try {
        await this.ctx?.resume();
      } catch {}
    }
    if (job !== this.job) return;

    const naskah = await getNaskah();
    const clipId = naskah?.findClipId?.(passage);
    if (clipId) {
      await this.playPreRecorded(clipId, status, done);
      return;
    }

    status("Menyiapkan suara…", false);
    const entry = this.request(passage, card, true);
    this.playing = {
      entry,
      job,
      index: 0,
      status,
      done,
      startedAt: performance.now(),
    };
    if (!this.ctx || this.ctx.state !== "running") {
      status("Ketuk tombol lanjut untuk mengaktifkan suara.", false);
      return;
    }
    this.playAvailable();
    entry.promise.catch(() => {
      if (job !== this.job) return;
      this.stop();
      status(
        "Suara Gemini belum tersedia. Ketuk lanjut untuk membaca teksnya.",
        false,
      );
    });
  }
}

export const narrator = new LiveNarrator();
globalThis.addEventListener?.("room-volume", () => narrator.volume());
