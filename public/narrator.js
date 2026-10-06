import { audioVolume, audioEnabled, duckMusic } from "./audio.js";

// One-way Gemini Live native audio. No microphone, no personal question or notes.
class LiveNarrator {
  constructor() {
    this.ctx = null;
    this.gain = null;
    this.sources = new Set();
    this.job = 0;
    this.socket = null;
    this.abort = null;
    this.timer = null;
    this.scheduled = 0;
    this.cache = new Map();
  }
  unlock() {
    try {
      if (!this.ctx) {
        const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Audio) return;
        this.ctx = new Audio();
        this.gain = this.ctx.createGain();
        this.gain.connect(this.ctx.destination);
      }
      this.gain.gain.value = audioEnabled() ? audioVolume() / 100 : 0;
      this.ctx.resume().catch(() => {});
    } catch {}
  }
  volume() {
    if (this.ctx)
      this.gain.gain.setTargetAtTime(
        audioEnabled() ? audioVolume() / 100 : 0,
        this.ctx.currentTime,
        0.04,
      );
  }
  stop() {
    this.job++;
    clearTimeout(this.timer);
    this.abort?.abort();
    this.abort = null;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {}
      source.disconnect();
    }
    this.sources.clear();
    this.scheduled = this.ctx?.currentTime || 0;
    duckMusic(false);
  }
  play(chunk) {
    const binary = atob(chunk.data),
      view = new DataView(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i++)
      view.setUint8(i, binary.charCodeAt(i));
    const rate = Number(/rate=(\d+)/.exec(chunk.mimeType || "")?.[1] || 24000),
      length = Math.floor(binary.length / 2);
    if (!length || rate < 8000 || rate > 48000) return;
    const buffer = this.ctx.createBuffer(1, length, rate),
      data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++)
      data[i] = view.getInt16(i * 2, true) / 32768;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gain);
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
    };
    this.scheduled = Math.max(this.scheduled, this.ctx.currentTime + 0.035);
    source.start(this.scheduled);
    this.scheduled += buffer.duration;
  }
  async speak(passage, card, status = () => {}) {
    this.stop();
    this.unlock();
    if (!this.ctx) return;
    const job = this.job;
    this.volume();
    status("Menyiapkan suara Sela…");
    const key = card + "|" + passage,
      cached = this.cache.get(key);
    const finish = () => {
      clearTimeout(this.timer);
      this.timer = setTimeout(
        () => {
          if (job === this.job) {
            duckMusic(false);
            status("");
          }
        },
        Math.max(0, (this.scheduled - this.ctx.currentTime) * 1000) + 80,
      );
    };
    if (cached) {
      duckMusic(true);
      status("Sela bercerita…");
      for (const chunk of cached) this.play(chunk);
      finish();
      return;
    }
    this.abort = new AbortController();
    const abort = this.abort;
    try {
      const response = await fetch("/api/live-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        signal: abort.signal,
      });
      if (!response.ok) throw new Error("Narasi tidak tersedia");
      const { token, setup } = await response.json();
      if (job !== this.job) return;
      return await new Promise((resolve, reject) => {
        const socket = new WebSocket(
          "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=" +
            encodeURIComponent(token),
        );
        this.socket = socket;
        const chunks = [];
        let complete = false;
        let started = false;
        const fail = () => {
          if (job !== this.job) {
            resolve();
            return;
          }
          this.stop();
          status("Narasi belum tersambung. Cerita tetap bisa dibaca.");
          reject(new Error("Narasi belum tersambung"));
        };
        this.timer = setTimeout(fail, 20000);
        socket.onopen = () => socket.send(JSON.stringify({ setup }));
        socket.onmessage = async (event) => {
          if (job !== this.job) return;
          try {
            const raw =
              event.data instanceof Blob ? await event.data.text() : event.data;
            if (job !== this.job) return;
            const message = JSON.parse(raw);
            if (message.error) {
              fail();
              return;
            }
            if (message.setupComplete) {
              socket.send(
                JSON.stringify({
                  clientContent: {
                    turns: [
                      {
                        role: "user",
                        parts: [{ text: JSON.stringify({ card, passage }) }],
                      },
                    ],
                    turnComplete: true,
                  },
                }),
              );
              return;
            }
            const content = message.serverContent;
            if (!content) return;
            if (content.interrupted) {
              this.stop();
              resolve();
              return;
            }
            for (const part of content.modelTurn?.parts || []) {
              const chunk = part.inlineData;
              if (!chunk?.mimeType?.startsWith("audio/pcm")) continue;
              if (!started) {
                started = true;
                clearTimeout(this.timer);
                this.timer = setTimeout(fail, 45000);
                duckMusic(true);
                status("Sela bercerita…");
              }
              chunks.push(chunk);
              this.play(chunk);
            }
            if (content.turnComplete) {
              complete = true;
              if (chunks.length) {
                this.cache.set(key, chunks);
                if (this.cache.size > 30)
                  this.cache.delete(this.cache.keys().next().value);
              }
              socket.close();
              this.socket = null;
              finish();
              resolve();
            }
          } catch {
            fail();
          }
        };
        socket.onerror = fail;
        socket.onclose = () => {
          if (!complete && job === this.job) fail();
          else resolve();
        };
      });
    } catch (error) {
      if (error.name === "AbortError" || job !== this.job) return;
      throw error;
    }
  }
}
export const narrator = new LiveNarrator();
window.addEventListener("sela-volume", () => narrator.volume());
