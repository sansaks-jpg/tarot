import { DECK, BY_ID, SUITS, TOPICS, POSITIONS } from "./deck.js?v=room-7";
import {
  escapeHTML as esc,
  newReading,
  chooseCard,
  revealCard,
  readingComplete,
  shuffledCards,
} from "./engine.js?v=room-7";
import {
  enableAudio,
  toggleAudio,
  audioEnabled,
  musicVolume,
  narratorVolume,
  setMusicVolume,
  setNarratorVolume,
  sfx,
  primeAudio,
} from "./audio.js?v=room-7";
import { cardStory, nextChapter } from "./story.js?v=room-7";
import { narrator } from "./narrator.js?v=room-7";
import { getClipText, getCardClips, pickRandomVariant, readingScript, findClipId } from "./naskah.js?v=room-7";
import { captionSegments, captionIndex } from "./captions.js?v=room-7";
import { roomLayout } from "./room-layout.js?v=room-7";
import { createShareImage, websiteURL, shareInvitation, canSharePhoto, sharePhoto } from "./share.js?v=room-7";
import { icon } from "./icons.js?v=room-7";

const main = document.getElementById("main");
const modal = document.getElementById("modal");
const mobileHomeQuery = matchMedia("(max-width: 699px)");
const compactLandscapeQuery = matchMedia("(max-height: 480px) and (orientation: landscape)");
const state = {
  reading: null,
  form: { topic: null, question: "", count: 3 },
  route: "beranda",
  filter: "all",
  search: "",
  libraryPage: 0,

  toastTimer: null,
  audioTouched: false,

  lastPick: null,
  dealing: true,
  dialogue: { id: null, chapter: "makna", line: 0 },
  voiceAvailable: true,
  narration: true,
  autoRead: true,
  typingJob: 0,
  dialogueTimer: null,
  picking: false,
  revealing: false,
  setupComment: null,
  pickNotice: null,
  typedCommentShown: false,
  setupStep: "topic",
  customQuestion: false,
  cues: {},
  pickIntro: null,
  preIntro: null,
  readingExpanded: false,
  modalMode: null,
  modalPaused: false,
  caption: null,
  captionFrame: null,
  shareResult: null,
};
const arrow = icon("arrow");
const icons = Object.fromEntries(Object.keys(TOPICS).map(key => [key, icon(key)]));
const chapterLabels = { makna: "Makna", langkah: "Langkah", refleksi: "Refleksi" };

function cardHero(card, position = "") {
  return `<div class="card-hero"><div class="card-hero-art">${art(card.id)}</div><div><p class="card-category">${icon(card.suit)} ${esc(SUITS[card.suit].name)}${position ? ` · ${position}` : ""}</p><h3>${esc(card.indo)}</h3><p class="card-hero-keywords">${esc(card.keywords)}</p></div></div>`;
}

function captionMarkup(text) {
  return `<section class="live-caption" aria-label="Caption narasi Sela"><div class="caption-window"><div class="caption-flow" data-caption-flow><p>${esc(captionSegments(text)[0]?.text || "")}</p></div></div><p class="sr-only" data-caption-accessible>${esc(text)}</p></section>`;
}

function drawCaption(force = false) {
  const caption = state.caption;
  if (!caption) return;
  const index = captionIndex(caption.segments, caption.elapsed, caption.duration);
  if (!force && index === caption.index) return;
  caption.index = index;
  const previous = caption.segments.slice(Math.max(0, index - 2), index).map(segment => segment.text);
  const lines = [...caption.history, ...previous].slice(-2);
  const active = caption.segments[index]?.text || "";
  document.querySelectorAll("[data-caption-flow]").forEach(node => {
    node.innerHTML = `<div class="caption-roll">${lines.map(text => `<p class="caption-past">${esc(text)}</p>`).join("")}<p class="caption-current">${esc(active)}</p></div>`;
  });
  document.querySelectorAll("[data-caption-accessible]").forEach(node => node.textContent = caption.text);
}

function beginCaption(id, text, job, fallback = false) {
  id = findClipId(id) || id;
  cancelAnimationFrame(state.captionFrame);
  const prior = state.caption;
  const history = prior?.id !== id ? (prior?.segments.slice(Math.max(0, prior.index - 1), prior.index + 1).map(segment => segment.text) || []) : [];
  const caption = { id, text, job, history, segments: captionSegments(text), index: -1, elapsed: 0, duration: Math.max(6500, text.split(/\s+/).length * 330) / 1000, fallback, ended: false, lastFrame: performance.now() };
  state.caption = caption;
  drawCaption(true);
  const tick = now => {
    if (state.caption !== caption || job !== state.typingJob || document.hidden) return;
    const clock = narrator.playback();
    if (clock?.id === id) { caption.elapsed = clock.elapsed; caption.duration = clock.duration; }
    else if (caption.ended) caption.elapsed = caption.duration;
    else if (caption.fallback && !(state.route === "baca" && !state.autoRead) && !state.modalPaused) caption.elapsed = Math.min(caption.duration, caption.elapsed + Math.max(0, now - caption.lastFrame) / 1000);
    caption.lastFrame = now;
    drawCaption();
    state.captionFrame = requestAnimationFrame(tick);
  };
  caption.tick = tick;
  state.captionFrame = requestAnimationFrame(tick);
}

function resumeCaptionClock() {
  const caption = state.caption;
  if (!caption?.tick || caption.job !== state.typingJob) return;
  cancelAnimationFrame(state.captionFrame);
  caption.lastFrame = performance.now();
  state.captionFrame = requestAnimationFrame(caption.tick);
}

function finishCaption(job, result) {
  if (state.caption?.job !== job) return;
  if (result?.audio === false) state.caption.fallback = true;
  else { state.caption.ended = true; state.caption.elapsed = state.caption.duration; drawCaption(); }
}

function cue(prefix, fresh = false) {
  if (fresh || !state.cues[prefix]) state.cues[prefix] = pickRandomVariant(prefix);
  return state.cues[prefix];
}

function speakCue(id, after = () => {}) {
  const job = ++state.typingJob;
  const text = getClipText(id) || String(id || "");
  beginCaption(id, text, job, !audioEnabled() || !state.audioTouched);
  if (!id || !state.narration || !audioEnabled() || !state.audioTouched) {
    state.dialogueTimer = setTimeout(() => { if (job === state.typingJob) after(); }, Math.max(6500, text.split(/\s+/).length * 330));
    return;
  }
  narrator.speak(id, "Sela", (value, speaking) => {
    if (job !== state.typingJob) return;
    document.querySelectorAll(".cue-status").forEach(node => {
      node.textContent = speaking ? "Sela sedang bicara" : value;
    });
  }, result => { if (job === state.typingJob) { finishCaption(job, result); after(); } }).catch(() => {});
}

function setSetupCue(prefix) {
  state.setupComment = getClipText(cue(prefix, true));
  const speech = document.getElementById("setupSpeech");
  if (speech) speech.textContent = state.setupComment;
  if (state.route === "bacaan") speakCue(state.setupComment);
}

const art = (id, extra = "") => {
  const isBack = id === "back";
  const src = isBack ? "/assets/cards/back.svg?v=room-7" : `/assets/cards/${id}.webp`;
  const responsive = isBack
    ? ""
    : `srcset="/assets/cards/thumbs/${id}.webp 240w, ${src} 400w" sizes="(min-width: 700px) 220px, 40vw"`;
  return `<img src="${src}" ${responsive} width="280" height="466" alt="${esc(BY_ID[id]?.name || "Bagian belakang kartu")}" loading="lazy" decoding="async" ${extra}>`;
};

const positions = () => POSITIONS;

const readerPortrait = () =>
  '<img class="reader-portrait" src="/assets/reader.webp" width="80" height="80" alt="Sela, pembaca tarot virtual">';
const host = (text, extra = "") =>
  `<div class="host-note">${readerPortrait()}<div><span>Sela <small>· pembaca tarot virtual</small></span><p>${text}</p>${extra}</div></div>`;
const page = (content, name = "") =>
  `<section class="screen ${name}">${content}</section>`;

const heading = (kicker, title, description = "") =>
  `<div class="page-heading"><p class="eyebrow">${kicker}</p><h1 tabindex="-1">${title}</h1>${description ? `<p class="description">${description}</p>` : ""}</div>`;

const question = (r) =>
  `<p class="question-ribbon" title="${esc(r.question)}">“${esc(r.question)}”</p>`;

function toast(message) {
  const node = document.getElementById("toast");
  clearTimeout(state.toastTimer);
  node.textContent = message;
  node.classList.add("visible");
  state.toastTimer = setTimeout(() => node.classList.remove("visible"), 4500);
}

function updateTemplateSelection() {
  document.querySelectorAll(".template-chip").forEach((chip) => {
    const selected = chip.dataset.question === state.form.question;
    chip.classList.toggle("active", selected);
    chip.setAttribute("aria-pressed", String(selected));
    const dot = chip.querySelector(".chip-star");
    if (dot) dot.innerHTML = selected ? icon("check") : "";
  });
}

function setHash(hash) {
  if (location.hash === `#${hash}`) render();
  else location.hash = hash;
}

function resumeRoute() {
  const r = state.reading;
  return !r || r.finished ? "bacaan" : r.selected.length === 3 ? "baca" : "pilih";
}

function resetReadingSetup() {
  resetShareResult();
  state.reading = null;
  state.form = { topic: null, question: "", count: 3 };
  state.setupStep = "topic";
  state.customQuestion = false;
  state.typedCommentShown = false;
  state.cues = {};
  state.setupComment = null;
  state.pickNotice = null;
  state.pickIntro = null;
  state.preIntro = null;
  state.dialogue = { id: null, chapter: "makna", line: 0 };
  state.autoRead = true;
}

function mobileWelcome(hasReading) {
  const greeting = getClipText(cue(hasReading ? "SAMBUTAN-KEMBALI" : "SAMBUTAN-BARU"));
  const scattered = ["back", "m18", "back", "m17", "back", "m19", "back", "back"];
  return page(
    `<div class="arrival-scene" aria-hidden="true"><div class="arrival-light light-left"></div><div class="arrival-light light-right"></div></div>
    <div class="session-heading arrival-heading"><p class="eyebrow">SELA · PEMBACA TAROTMU</p><h1 tabindex="-1">${hasReading ? "Cerita kita belum selesai." : "Duduk dulu. Ambil jeda."}</h1></div>
    <div class="arrival-scatter table-stage" data-table-region aria-label="Kartu tarot tersebar di tengah meja">${scattered.map((id, i) => `<${id === "back" ? "span" : "button"} class="scatter-card" style="--x:${[-.29, -.21, -.13, -.04, .07, .16, .24, .29][i]};--y:${[9, -3, 6, -6, 8, -3, 5, 11][i]}px;--tilt:${[-27, -20, -13, -6, 4, 13, 20, 27][i]}deg;--i:${i}" ${id === "back" ? 'aria-hidden="true"' : `type="button" data-action="card-detail" data-id="${id}" aria-label="Kenali ${esc(BY_ID[id].name)}"`}>${art(id)}</${id === "back" ? "span" : "button"}>`).join("")}</div>
    <div class="room-bottom arrival-bottom">
      <div class="arrival-speaker"><span class="speaker-name">Sela</span><button type="button" class="arrival-voice" id="arrivalVoice" data-action="greeting" aria-label="Dengarkan sapaan Sela" aria-pressed="false">${icon("sound")}<span>Dengar Sela</span></button></div>
      <span class="sr-only" id="arrivalSpeech">${esc(greeting)}</span>${captionMarkup(greeting)}
      <div class="arrival-choices"><a class="button primary" href="#${hasReading ? resumeRoute() : "bacaan"}" data-reading-link>${hasReading ? "Lanjutkan bacaanku" : "Mulai bacaan"} ${arrow}</a><a class="text-button" href="#kartu">Kenali 78 kartu ${icon("cards")}</a></div>
      <p class="arrival-voice-status" id="arrivalVoiceStatus" role="status" aria-live="polite"></p>
    </div>`, "arrival-screen");
}

function home() {
  return mobileWelcome(state.reading && !state.reading.finished);
}

function beginTopic(topic) {
  if (!Object.hasOwn(TOPICS, topic)) return;
  state.form = { topic, question: TOPICS[topic].templates[0], count: 3 };
  state.setupStep = "question";
  state.customQuestion = false;
  setSetupCue(`TOPIK-${topic}`);
  setHash("bacaan");
}

function setupSpeechText() {
  if (state.setupComment) return state.setupComment;
  const returning = state.reading && !state.reading.finished;
  return getClipText(cue(returning ? "SETUP-KEMBALI" : "SETUP"));
}

function setup() {
  const f = state.form;
  const topic = TOPICS[f.topic] || TOPICS.umum;
  const templates = topic.templates;
  if (!f.question && f.topic) f.question = templates[0];
  const choosingTopic = state.setupStep === "topic";
  const notes = { hubungan: "Hati & kedekatan", kerja: "Arah & kesempatan", diri: "Kebutuhan & kebiasaan", umum: "Apa yang mengganjal" };
  return page(`
    <div class="setup-room-space" aria-hidden="true"></div>
    <div class="setup-panel">
      <div class="setup-title-row">${heading("CERITAMU · " + (choosingTopic ? "1/2" : "2/2"), choosingTopic ? "Mau bicara soal apa?" : "Pilih pertanyaanmu.")}
        ${choosingTopic ? `<span class="celestial-seal">${icon("umum")}</span>` : `<button type="button" class="icon-button" data-action="setup-back" aria-label="Kembali memilih topik">${icon("back")}</button>`}
      </div>
      <div class="host-note setup-host-note"><div class="host-header"><span class="speaker-name">Sela <small>· aku dengarkan</small></span><button type="button" class="arrival-voice" id="setupVoice" data-action="speak-setup" aria-label="Dengarkan Sela berbicara" aria-pressed="false">${icon("sound")}<span>Dengar Sela</span></button></div><p class="host-speech" id="setupSpeech">${esc(setupSpeechText())}</p><span class="cue-status" role="status"></span></div>
      <form id="setupForm" class="setup-form" data-step="${state.setupStep}">
        <div class="setup-fields">
          <fieldset class="topic-fields" ${choosingTopic ? "" : "hidden"}><legend class="sr-only">Pilih topik bacaan</legend><div class="topics">${Object.entries(TOPICS).map(([key, t]) => `<label class="topic-tile" data-topic="${key}"><input type="radio" name="topic" value="${key}" ${f.topic === key ? "checked" : ""}><span class="topic-icon">${icons[key]}</span><span class="topic-title">${t.label}</span><span class="topic-note">${notes[key]}</span><span class="tile-check">${icon("check")}</span></label>`).join("")}</div></fieldset>
          <div class="question-fields" ${choosingTopic ? "hidden" : ""}>
            <div class="selected-topic"><span>${icons[f.topic] || icons.umum} ${topic.label}</span><button type="button" class="text-button" data-action="custom-question">${state.customQuestion ? "Pilih pertanyaan" : "Tulis sendiri"}</button></div>
            <div class="question-templates" id="questionTemplates" role="group" aria-label="Pilih satu pertanyaan" ${state.customQuestion ? "hidden" : ""}>${templates.map(q => `<button type="button" class="template-chip ${f.question === q ? "active" : ""}" aria-pressed="${f.question === q}" data-action="use-template" data-question="${esc(q)}"><span class="chip-star">${f.question === q ? icon("check") : ""}</span><span class="chip-text">${esc(q)}</span></button>`).join("")}</div>
            <div class="question-field" ${state.customQuestion ? "" : "hidden"}><label class="input-label" for="question">Yang ingin kamu ceritakan</label><textarea id="question" name="question" maxlength="280" rows="3" placeholder="${esc(topic.question)}">${esc(f.question)}</textarea><p class="field-hint">Nggak harus rapi. Tulis yang paling mengganjal.</p></div>
          </div>
          <input type="hidden" name="count" value="3">
        </div>
        <div class="screen-actions"><p class="spread-note">${icon("cards")} Akar cerita · Yang dihadapi · Langkah berikutnya</p>${choosingTopic ? `<button type="button" class="button primary" data-action="setup-next" ${f.topic ? "" : "disabled"}>${f.topic ? "Pilih pertanyaan" : "Pilih topik dulu"} ${arrow}</button>` : `<button type="submit" class="button primary">Kocok kartuku ${icon("shuffle")}</button>`}</div>
      </form>
    </div>`, "setup-screen");
}

function pickComment(selectedCount) {
  return getClipText(cue(`PILIH-${Math.min(selectedCount, 3)}`));
}

function pick() {
  const r = state.reading,
    ready = r.selected.length === 3;
  return page(
    `
    <div class="session-heading"><span class="session-step">IKUTI RASAMU</span><h1 tabindex="-1">Pilih tiga kartu.</h1><span id="selectionCount" role="status">${r.selected.length} / 3</span><button class="reshuffle icon-button" data-action="${r.selected.length ? "reset-picks" : "shuffle"}" aria-label="${r.selected.length ? "Pilih ulang kartu" : "Kocok ulang kartu"}">${icon("shuffle")}</button></div>
    <div class="tarot-room">
      <div class="cloth-table pick-table table-stage ${ready ? "ready" : ""}" data-table-region>
        <div class="spread-slots-bar" aria-label="Slot kartu bacaan">
          ${positions()
            .map(
              (pos, i) =>
                `<div class="slot-card-target ${r.selected[i] ? "filled" : ""}"><div class="target-card" data-slot="${i}">${r.selected[i] ? art("back") : `<span>${["I", "II", "III"][i]}</span>`}</div><span class="target-label">${pos.name}</span></div>`,
            )
            .join("")}
        </div>
        <div class="pick-grid ${state.dealing ? "dealing" : ""}">
          ${r.candidates
            .map((id, i) => {
              const n = r.selected.indexOf(id);
              return `<button type="button" class="pick-card ${n >= 0 ? "selected" : ""}" style="--i:${i};--tilt:${(i - 3) * 4}deg" data-action="pick" data-id="${id}" ${ready || n >= 0 ? "disabled" : ""} aria-label="${n >= 0 ? `Kartu ke-${n + 1} dipilih` : `Pilih kartu tertutup nomor ${i + 1}`}" aria-pressed="${n >= 0}">${art("back")}</button>`;
            })
            .join("")}
        </div>
        <div class="shuffle-stack" aria-hidden="true"><span>${art("back")}</span><span>${art("back")}</span><span>${art("back")}</span></div>
      </div>
    </div>
    <div class="room-bottom"><div class="caption-heading"><span class="speaker-name">Sela</span><span class="cue-status" role="status"></span></div>${captionMarkup(state.pickIntro ? getClipText(state.pickIntro) : state.pickNotice || pickComment(r.selected.length))}<div class="screen-actions">
      <button class="button primary" data-action="start-reading" ${ready ? "" : "disabled"}>${ready ? "Mulai bacaan" : `Pilih ${3 - r.selected.length} kartu lagi`} ${arrow}</button>
    </div></div>`,
    "pick-screen immersive-screen",
  );
}

async function animateChoice(button, slot) {
  if (
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    !button.animate ||
    !slot
  )
    return;
  const from = button.getBoundingClientRect(),
    to = slot.getBoundingClientRect();
  if (!from.width || !to.width) return;
  const width = button.offsetWidth || from.width;
  const height = button.offsetHeight || from.height;
  const left = from.left + (from.width - width) / 2;
  const top = from.top + (from.height - height) / 2;
  const card = button.querySelector("img").cloneNode(true);
  card.className = "travelling-card";
  Object.assign(card.style, {
    left: left + "px",
    top: top + "px",
    width: width + "px",
    height: height + "px",
  });
  document.body.append(card);
  button.classList.add("lifting");
  const dx = to.left - left,
    dy = to.top - top;
  try {
    await card.animate(
      [
        {
          transform: "translate(0,0) rotate(0)",
          filter: "drop-shadow(0 5px 4px #0005)",
        },
        {
          transform: `translate(${dx * 0.45}px,${dy * 0.45}px) scale(${1 + (to.width / width - 1) * 0.45},${1 + (to.height / height - 1) * 0.45})`,
          offset: 0.42,
          filter: "drop-shadow(0 20px 12px #0007)",
        },
        {
          transform: `translate(${dx}px,${dy}px) scale(${to.width / width},${to.height / height})`,
          filter: "drop-shadow(0 4px 3px #0005)",
        },
      ],
      { duration: 520, easing: "cubic-bezier(.22,.6,.26,1)", fill: "forwards" },
    ).finished;
  } finally {
    card.remove();
  }
}

async function animateShuffle() {
  const grid = main.querySelector(".pick-grid"), stack = main.querySelector(".shuffle-stack");
  if (!grid || !state.dealing) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !grid.children[0]?.animate) {
    state.dealing = false;
    grid.classList.remove("dealing");
    return;
  }
  stack.classList.add("shuffling");
  const center = grid.getBoundingClientRect();
  const animations = [...grid.children].map((card, i) => {
    const rect = card.getBoundingClientRect();
    const dx = center.left + center.width / 2 - rect.left - rect.width / 2;
    return card.animate([
      { opacity: 0, transform: `translate(${dx}px,6px) rotate(0deg) scale(.9)` },
      { opacity: 1, transform: `translate(${dx}px,6px) rotate(0deg) scale(.9)`, offset: .2 },
      { opacity: 1, transform: `rotate(${(i - 3) * 4}deg)` },
    ], { duration: 480, delay: 180 + i * 45, easing: "cubic-bezier(.16,.65,.28,1)", fill: "backwards" });
  });
  await Promise.allSettled(animations.map(animation => animation.finished));
  if (grid.isConnected) {
    state.dealing = false;
    stack.classList.remove("shuffling");
    grid.classList.remove("dealing");
    sfx("fan");
  }
}

function explanation(card, { scope = "modal", tab = "makna" } = {}) {
  const key = `${scope}-${card.id}`;
  const content = {
    makna: `<p>${esc(card.meaning)}</p>`,
    gambar: `<ul>${card.symbols.map(symbol => `<li>${esc(symbol)}</li>`).join("")}</ul>`,
    langkah: `<p>${esc(card.action)}</p>`,
    refleksi: `<p>${esc(card.prompt)}</p>`,
  };
  return `<div class="card-explanation"><div class="meaning-tabs" role="tablist" aria-label="Penjelasan kartu">${[["makna", "Makna"], ["gambar", "Simbol"], ["langkah", "Langkah"], ["refleksi", "Refleksi"]].map(([id, label]) => `<button type="button" role="tab" id="${key}-tab-${id}" class="meaning-tab" data-action="meaning-tab" data-tab="${id}" aria-controls="${key}-panel-${id}" aria-selected="${tab === id}" tabindex="${tab === id ? 0 : -1}">${label}</button>`).join("")}</div>${Object.entries(content).map(([id, html]) => `<section class="meaning-panel" role="tabpanel" tabindex="0" id="${key}-panel-${id}" data-panel="${id}" aria-labelledby="${key}-tab-${id}" ${tab === id ? "" : "hidden"}>${html}</section>`).join("")}</div>`;
}

function activateMeaningTab(button) {
  const group = button.closest(".card-explanation");
  if (!group) return;
  if (state.modalMode === "detail") {
    state.typingJob++;
    narrator.stop();
    const listen = modal.querySelector('[data-action="detail-listen"]');
    if (listen) {
      listen.setAttribute("aria-pressed", "false");
      listen.innerHTML = `${icon("sound")} Dengar penjelasan Sela`;
    }
  }
  group.querySelectorAll('[role="tab"]').forEach((t) => {
    const on = t === button;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
  });
  group.querySelectorAll('[role="tabpanel"]').forEach((p) => {
    p.hidden = p.dataset.panel !== button.dataset.tab;
    p.scrollTop = 0;
  });
}

function storyOptions(card, bridge = true) {
  const position = Math.max(0, state.reading?.selected.indexOf(card.id) ?? 0);
  const bridgeId = cue(`BR-${position + 1}-${card.suit}`);
  return { position, bridge, variant: bridgeId?.split("-").at(-1) || "a" };
}

function storyLines(card, chapter) {
  return cardStory(card, chapter, 190, storyOptions(card));
}

function dialogueFor(card) {
  if (state.dialogue.id !== card.id) state.dialogue = { id: card.id, chapter: "makna", line: 0 };
  const story = storyLines(card, state.dialogue.chapter);
  state.dialogue.line = Math.min(state.dialogue.line, story.length - 1);
  return { story, text: story[state.dialogue.line] };
}

function currentClip(card) {
  dialogueFor(card);
  return getCardClips(card, state.dialogue.chapter, storyOptions(card))[state.dialogue.line];
}

function storyNextLabel() {
  return state.reading.current === 2 ? "Lihat tiga kartuku" : "Kartu berikutnya";
}

function nextCard() {
  const r = state.reading;
  if (!r || r.finished || !r.revealed.includes(r.selected[r.current])) return;
  clearTimeout(state.dialogueTimer);
  state.typingJob++;
  narrator.stop();
  state.readingExpanded = false;
  if (r.current < 2) { r.current++; sfx("next"); }
  else if (readingComplete(r)) { r.finished = true; sfx("complete"); }
  render();
}

function dialogue(card) {
  const { text } = dialogueFor(card);
  return `<div class="room-bottom reading-bottom"><div class="caption-heading"><span class="speaker-name">Sela <small class="chapter-label">${chapterLabels[state.dialogue.chapter]}</small></span><span class="voice-status" role="status"></span><button type="button" class="icon-button pause-reading" data-action="auto-read" aria-pressed="${state.autoRead}" aria-label="${state.autoRead ? "Jeda narasi" : "Lanjutkan narasi"}">${icon(state.autoRead ? "pause" : "play")}</button></div>${captionMarkup(text)}<button class="button primary" id="storyNext" data-action="next-card">${storyNextLabel(card)} ${arrow}</button></div>`;
}

function readingModal(card) {
  const position = state.reading.selected.indexOf(card.id);
  const currentCard = BY_ID[state.reading.selected[state.reading.current]];
  state.modalMode = "reading";
  state.readingExpanded = true;
  state.detailCard = card.id;
  openModal(card.name, `${cardHero(card, positions()[position].name)}${explanation(card)}<div class="card-dialog-footer"><div class="caption-heading"><span class="speaker-name">Sela</span><span class="voice-status" role="status"></span><button type="button" class="icon-button" data-action="replay-line" aria-label="Ulang narasi bagian ini">${icon("replay")}</button><button type="button" class="icon-button pause-reading" data-action="auto-read" aria-pressed="${state.autoRead}">${icon(state.autoRead ? "pause" : "play")}</button></div>${captionMarkup(dialogueFor(currentCard).text)}<button type="button" class="button primary" id="modalStoryNext" data-action="next-card">${storyNextLabel(currentCard)} ${arrow}</button></div>`, "card-dialog reading-dialog", { preserveNarration: true });
  syncReadingUI();
  drawCaption(true);
}

function syncReadingUI() {
  const r = state.reading;
  if (!r || r.finished) return;
  const card = BY_ID[r.selected[r.current]];
  if (!r.revealed.includes(card?.id)) return;
  dialogueFor(card);
  document.querySelectorAll(".chapter-label").forEach(node => node.textContent = chapterLabels[state.dialogue.chapter]);
  document.querySelectorAll('[data-action="auto-read"]').forEach(button => {
    button.setAttribute("aria-pressed", String(state.autoRead));
    button.setAttribute("aria-label", state.autoRead ? "Jeda narasi" : "Lanjutkan narasi");
    button.innerHTML = icon(state.autoRead ? "pause" : "play");
  });
  for (const selector of ["#storyNext", "#modalStoryNext"]) {
    const button = document.querySelector(selector);
    if (button) button.innerHTML = `${storyNextLabel(card)} ${arrow}`;
  }
}

function reader() {
  const r = state.reading;
  if (r.finished) return summary();
  const c = BY_ID[r.selected[r.current]], opened = r.revealed.includes(c.id);
  return page(`<div class="session-heading"><span class="session-step">${positions()[r.current].label.toUpperCase()} · ${r.current + 1}/3</span><h1 tabindex="-1">${opened ? esc(c.name) : ["Buka kartu pertama.", "Buka kartu kedua.", "Buka kartu terakhir."][r.current]}</h1></div>
    <div class="tarot-room"><div class="cloth-table reading-table table-stage" data-table-region><div class="physical-spread" aria-label="Tiga kartu bacaanmu">${r.selected.map((id, i) => {
      const revealed = r.revealed.includes(id), current = i === r.current;
      return `<div class="physical-slot ${current ? "current" : ""}"><button type="button" class="flip-card ${revealed ? "is-open" : ""}" ${current ? 'id="flipCard"' : ""} data-action="${revealed ? "card-detail" : current ? "reveal" : ""}" data-id="${id}" aria-label="${revealed ? "Makna " + esc(BY_ID[id].name) : current ? "Buka kartu ini" : "Kartu ini belum dibuka"}" ${!current && !revealed ? "disabled" : ""}><span class="flip-inner"><span class="flip-face flip-back" ${revealed ? 'aria-hidden="true"' : ""}>${art("back")}</span><span class="flip-face flip-front" ${revealed ? "" : 'aria-hidden="true"'}>${art(id)}</span></span></button><span class="physical-label">${positions()[i].name}</span></div>`;
    }).join("")}</div></div></div>
    ${opened ? dialogue(c) : `<div class="room-bottom reading-bottom"><div class="caption-heading"><span class="speaker-name">Sela</span><span class="cue-status" role="status"></span></div>${captionMarkup(getClipText(state.preIntro || cue(`PRE-${r.current + 1}`)))}<button class="button primary" id="storyNext" data-action="reveal">Buka kartu ${arrow}</button></div>`}`, "reader-screen immersive-screen");
}

async function animateReveal() {
  const card = main.querySelector("#flipCard .flip-inner");
  if (
    !card ||
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    !card.animate
  )
    return;
  card.closest(".flip-card").disabled = true;
  card.querySelector(".flip-front").removeAttribute("aria-hidden");
  await card.animate(
    [
      {
        transform: "rotateY(0deg) translateY(0)",
        filter: "drop-shadow(0 4px 3px #0004)",
      },
      {
        transform: "rotateY(65deg) translateY(-6px) scale(1.025)",
        offset: 0.38,
        filter: "drop-shadow(0 18px 8px #0008)",
      },
      {
        transform: "rotateY(180deg) translateY(-5px) scale(1.025)",
        offset: 0.8,
      },
      {
        transform: "rotateY(180deg) translateY(0)",
        filter: "drop-shadow(0 4px 3px #0004)",
      },
    ],
    { duration: 760, easing: "cubic-bezier(.2,.6,.3,1)", fill: "forwards" },
  ).finished;
}

function startDialogue() {
  clearTimeout(state.dialogueTimer);
  const r = state.reading;
  if (!r || r.finished || state.modalPaused) return;
  const card = BY_ID[r.selected[r.current]];
  if (!r.revealed.includes(card?.id)) return;
  const { text } = dialogueFor(card);
  const id = currentClip(card);
  syncReadingUI();
  const job = ++state.typingJob;
  beginCaption(id, text, job, !state.narration || !audioEnabled());
  const complete = (result = {}) => {
    finishCaption(job, result);
    if (job !== state.typingJob || state.route !== "baca" || document.hidden || state.modalPaused || !state.autoRead) return;
    const more = state.dialogue.line < storyLines(card, state.dialogue.chapter).length - 1 || nextChapter(state.dialogue.chapter);
    if (more) state.dialogueTimer = setTimeout(() => {
      if (job === state.typingJob) advanceStory();
    }, result.audio === false ? Math.max(6500, text.split(/\s+/).length * 330) : 1100);
  };
  if (state.narration && audioEnabled() && state.voiceAvailable && state.autoRead) {
    narrator.speak(id, card.name, (value, speaking) => {
      if (job !== state.typingJob) return;
      document.querySelectorAll(".voice-status").forEach(node => node.textContent = speaking ? "Sela sedang membaca" : value);
      document.querySelectorAll(".caption-heading").forEach(node => node.classList.toggle("speaking", speaking));
    }, complete).catch(() => {
      document.querySelectorAll(".voice-status").forEach(node => node.textContent = "Suara belum tersedia. Teks tetap bisa dibaca.");
    });
    const script = readingScript(card, storyOptions(card));
    const index = script.findIndex(line => line.id === id);
    if (script[index + 1]) narrator.prepare(script[index + 1].id, card.name);
  } else if (state.autoRead) complete({ audio: false });
}

function advanceStory() {
  const r = state.reading;
  if (!r || r.finished || !r.revealed.includes(r.selected[r.current])) return;
  const card = BY_ID[r.selected[r.current]];
  const story = storyLines(card, state.dialogue.chapter);
  clearTimeout(state.dialogueTimer);
  state.typingJob++;
  narrator.stop();
  if (state.dialogue.line < story.length - 1) {
    state.dialogue.line++;
    startDialogue();
  } else if (nextChapter(state.dialogue.chapter)) {
    state.dialogue.chapter = nextChapter(state.dialogue.chapter);
    state.dialogue.line = 0;
    startDialogue();
  } else {
    state.readingExpanded = false;
    if (r.current < r.count - 1) { r.current++; sfx("next"); }
    else if (readingComplete(r)) { r.finished = true; sfx("complete"); }
    render();
  }
}

function summary() {
  const r = state.reading;
  const closing = [cue(`PENUTUP-${r.topic}`), cue("PENUTUP-UMUM")];
  const photo = prepareShareResult(r);
  return page(`${heading("CERITAMU HARI INI", "Bacaanmu selesai.")}
    <div class="result-cards">${r.selected.map((id, i) => `<button type="button" class="result-card" data-action="card-detail" data-id="${id}" aria-label="Baca lagi ${esc(BY_ID[id].name)}"><span class="result-position">${positions()[i].label}</span>${art(id)}<strong>${esc(BY_ID[id].name)}</strong></button>`).join("")}</div>
    ${question(r)}<div class="summary-speech"><span class="speaker-name">Sela</span>${closing.map(id => `<p data-closing-clip="${id}">${esc(getClipText(id))}</p>`).join("")}<span class="cue-status" role="status"></span></div>
    <div class="room-bottom result-bottom"><div class="caption-heading"><span class="speaker-name">Sela</span><span class="cue-status" role="status"></span></div>${captionMarkup(getClipText(closing[0]))}<div class="result-actions"><button type="button" class="button primary" id="shareResultButton" data-action="share-result" aria-busy="${!photo?.blob}" ${photo?.blob ? "" : "disabled"}>${icon("share")} ${photo?.blob ? "Bagikan hasil" : "Menyiapkan…"}</button><button type="button" class="icon-button" data-action="read-again" aria-label="Putar ulang bacaan tiga kartu ini" title="Putar ulang bacaan ini">${icon("replay")}</button><button type="button" class="icon-button" data-action="new" aria-label="Mulai bacaan baru, pilih topik lagi" title="Bacaan baru">${icon("spark")}</button></div></div>`, "reading-result");
}

function resetShareResult() {
  if (state.shareResult?.url) URL.revokeObjectURL(state.shareResult.url);
  state.shareResult = null;
}

function updateShareResultButton() {
  const button = document.getElementById("shareResultButton");
  if (!button || state.route !== "baca" || !state.reading?.finished) return;
  const preparing = !!state.shareResult && !state.shareResult.blob;
  button.disabled = preparing;
  button.setAttribute("aria-busy", String(preparing));
  button.innerHTML = `${icon("share")} ${preparing ? "Menyiapkan…" : "Bagikan hasil"}`;
}

function prepareShareResult(r) {
  if (!r?.finished || !readingComplete(r)) return null;
  const key = r.selected.join(",") + websiteURL();
  if (state.shareResult?.key === key) return state.shareResult;
  resetShareResult();
  const entry = { key, ids: [...r.selected], blob: null, url: null };
  state.shareResult = entry;
  entry.ready = createShareImage(entry.ids).then(blob => {
    if (state.shareResult === entry) {
      entry.blob = blob; entry.url = URL.createObjectURL(blob);
      updateShareResultButton();
    }
    return entry;
  }).catch(error => {
    if (state.shareResult === entry) { state.shareResult = null; updateShareResultButton(); }
    throw error;
  });
  entry.ready.catch(() => {}); // A later click can retry a failed preparation.
  return entry;
}

async function shareReadingResult(button) {
  const r = state.reading;
  const entry = prepareShareResult(r);
  if (!entry) return;
  if (!entry.blob || !canSharePhoto(entry.blob)) {
    await openShareResult(button);
    return;
  }
  button.disabled = true;
  try {
    // The photo is already rendered, so sharing starts in this tap's activation.
    if (!(await sharePhoto(entry.blob, entry.ids)) && state.reading === r) await openShareResult(button, true);
  } finally { button.disabled = false; }
}

async function openShareResult(button, failed = false) {
  const r = state.reading;
  const entry = prepareShareResult(r);
  if (!entry) return;
  button.disabled = true;
  const original = button.innerHTML;
  button.innerHTML = `${icon("share")} Menyiapkan foto…`;
  try {
    await entry.ready;
    if (state.reading !== r || !r.finished || !entry.url) return;
    const native = canSharePhoto(entry.blob);
    const message = native ? (failed ? "Menu berbagi belum terbuka. Coba sekali lagi." : "Pilih WhatsApp, Instagram, atau aplikasi lain di menu berbagi HP.") : "Browser ini belum mendukung berbagi foto langsung. Buka situs ini di browser HP yang mendukung menu berbagi foto. Kamu tetap bisa kirim ajakan ke WhatsApp dari sini.";
    const whatsapp = "https://wa.me/?text=" + encodeURIComponent(shareInvitation(entry.ids));
    state.modalMode = "share";
    openModal("Bagikan bacaanku.", `<img class="share-preview" src="${entry.url}" alt="Hasil tiga kartu: ${entry.ids.map(id => esc(BY_ID[id].name)).join(", ")}, dengan ajakan membaca tarot"><p class="share-caption">${message}</p><a class="share-site" href="${esc(websiteURL())}" target="_blank" rel="noopener">${esc(websiteURL())}</a><div class="share-actions">${native ? `<button type="button" class="button primary" data-action="share-photo">${icon("share")} Pilih aplikasi</button>` : `<a class="button primary" href="${esc(whatsapp)}" target="_blank" rel="noopener">${icon("share")} Kirim ajakan ke WhatsApp</a>`}<button type="button" class="text-button" data-action="download-photo">${icon("download")} Simpan foto</button><button type="button" class="text-button" data-action="copy-invitation">${icon("copy")} Salin ajakan</button></div><textarea class="share-invitation" id="shareInvitation" readonly rows="3" aria-label="Teks ajakan untuk dibagikan">${esc(shareInvitation(entry.ids))}</textarea>`, "share-dialog", { preserveNarration: true });
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

function downloadSharePhoto() {
  const entry = state.shareResult;
  if (!entry?.url) return;
  const link = document.createElement("a");
  link.href = entry.url;
  link.download = "bacaanku-the-tarot-room.png";
  link.click();
}

async function copyInvitation() {
  const text = document.getElementById("shareInvitation");
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text.value);
    toast("Ajakan sudah disalin.");
  } catch {
    text.focus({ preventScroll: true });
    text.select();
    toast(document.execCommand?.("copy") ? "Ajakan sudah disalin." : "Teks ajakan sudah dipilih. Salin untuk membagikannya.");
  }
}

function playClosing(index = 0) {
  const r = state.reading;
  if (!r?.finished || state.route !== "baca") return;
  const clips = [cue(`PENUTUP-${r.topic}`), cue("PENUTUP-UMUM")];
  if (!clips[index]) return;
  document.querySelectorAll("[data-closing-clip]").forEach(node => node.classList.toggle("active", node.dataset.closingClip === clips[index]));
  speakCue(clips[index], () => playClosing(index + 1));
}

function filteredCards() {
  const q = state.search.toLocaleLowerCase("id-ID").trim();
  return DECK.filter(
    (c) =>
      (state.filter === "all" || c.suit === state.filter) &&
      `${c.name} ${c.indo} ${c.keywords} ${c.meaning} ${readingScript(c, { bridge: false }).map(line => line.text).join(" ")}`
        .toLocaleLowerCase("id-ID")
        .includes(q),
  );
}

function library() {
  return page(`<div class="library-heading"><div><p class="eyebrow">RIDER–WAITE–SMITH · 78 KARTU</p><h1 tabindex="-1">Kenali setiap cerita.</h1></div><span class="celestial-seal">${icon("cards")}</span></div>
    <label class="library-search">${icon("search")}<input type="search" id="cardSearch" placeholder="Nama kartu atau makna…" value="${esc(state.search)}" aria-label="Cari kartu"><kbd>78</kbd></label>
    <div class="suit-filters" role="group" aria-label="Kelompok kartu">${[["all", "Semua"], ...Object.entries(SUITS).map(([id, suit]) => [id, suit.name])].map(([id, name]) => `<button type="button" class="suit-filter" data-action="filter-suit" data-suit="${id}" aria-pressed="${state.filter === id}">${icon(id === "all" ? "cards" : id)}<span>${name}</span></button>`).join("")}</div>
    <p class="library-info" id="libraryInfo" role="status"></p><div class="library-grid" id="libraryGrid"></div><div class="pagination" id="libraryPagination" aria-label="Halaman koleksi"></div>`, "library-screen");
}

function libraryPageSize() { return mobileHomeQuery.matches || compactLandscapeQuery.matches ? 4 : 6; }

function fillLibrary() {
  const cards = filteredCards(), size = libraryPageSize();
  const max = Math.max(0, Math.ceil(cards.length / size) - 1);
  state.libraryPage = Math.max(0, Math.min(state.libraryPage, max));
  const start = state.libraryPage * size;
  document.getElementById("libraryInfo").textContent = `${cards.length} kartu${state.filter === "all" ? " dalam koleksi" : " · " + SUITS[state.filter].name} · Sentuh untuk membaca`;
  document.getElementById("libraryGrid").innerHTML = cards.length ? cards.slice(start, start + size).map(c => `<button type="button" class="library-card" data-suit="${c.suit}" data-action="card-detail" data-id="${c.id}" aria-label="Pelajari ${esc(c.name)}"><span class="library-art"><span class="card-catalog-number">${String(DECK.indexOf(c) + 1).padStart(2, "0")}</span>${art(c.id)}<span class="catalog-suit">${icon(c.suit)}</span></span><span class="library-card-copy"><strong>${esc(c.name)}</strong><span>${esc(c.indo)}</span><small>${esc(c.keywords)}</small></span></button>`).join("") : `<div class="empty-state">${icon("search")}<h2>Belum ketemu.</h2><p>Coba nama atau kelompok yang lain.</p><button type="button" class="text-button" data-action="clear-search">Lihat semua kartu</button></div>`;
  document.getElementById("libraryPagination").innerHTML = `<button type="button" class="icon-button" data-action="library-prev" aria-label="Halaman sebelumnya" ${state.libraryPage === 0 ? "disabled" : ""}>${icon("back")}</button><span role="status">${cards.length ? `${state.libraryPage + 1} / ${max + 1}` : "0 kartu"}<small>${cards.length ? `${start + 1}–${Math.min(start + size, cards.length)} dari ${cards.length}` : "Coba pencarian lain"}</small></span><button type="button" class="icon-button" data-action="library-next" aria-label="Halaman berikutnya" ${state.libraryPage === max ? "disabled" : ""}>${arrow}</button>`;
  document.querySelectorAll(".suit-filter").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.suit === state.filter)));
}

function closeModal({ resume = true } = {}) {
  const paused = state.modalPaused;
  if (state.modalMode === "detail") { state.typingJob++; narrator.stop(); }
  state.readingExpanded = false;
  state.modalMode = null;
  state.modalPaused = false;
  modal.close();
  if (resume && paused && state.route === "baca" && state.autoRead && !narrator.resume()) startDialogue();
}

function openModal(title, content, name = "", { preserveNarration = false } = {}) {
  if (!preserveNarration) {
    state.modalPaused = state.route === "baca" && !state.reading?.finished;
    state.modalMode = "detail";
    narrator.pause();
    clearTimeout(state.dialogueTimer);
    state.typingJob++;
  }
  modal.className = name;
  document.getElementById("modalBody").innerHTML = `<div class="modal-header"><div><p class="eyebrow">${name === "share-dialog" ? "CERITAMU DALAM TIGA KARTU" : preserveNarration ? "MAKNA KARTU · " + (state.reading.selected.indexOf(state.detailCard) + 1) + "/3" : "DARI KOLEKSI KARTU"}</p><h2 id="modalTitle">${esc(title)}</h2></div><button type="button" class="icon-button modal-close" data-action="close" aria-label="${preserveNarration ? "Kembali ke meja, bacaan tetap berjalan" : "Tutup detail kartu"}">${icon("close")}</button></div><div class="modal-content">${content}</div>`;
  if (!modal.open) modal.showModal();
  modal.querySelector(".modal-close")?.focus({ preventScroll: true });
}

function cardModal(id) {
  if (!Object.hasOwn(BY_ID, id)) return;
  const card = BY_ID[id], r = state.reading;
  if (state.route === "baca" && !r?.finished && r?.revealed.includes(id)) { readingModal(card); return; }
  state.detailCard = id;
  openModal(card.name, `${cardHero(card)}${explanation(card)}<div class="detail-audio"><button type="button" class="text-button" data-action="detail-listen" aria-pressed="false">${icon("sound")} Dengar Sela</button><span class="cue-status" role="status"></span></div>`, "card-dialog");
}

function detailClips(card, tab) {
  if (tab === "gambar") return [`${card.id}-M1`];
  const ids = getCardClips(card, tab, { bridge: false });
  return tab === "makna" ? ids.filter(id => !id.endsWith("-M1")) : ids;
}

function playDetail(button) {
  if (button.getAttribute("aria-pressed") === "true") {
    state.typingJob++; narrator.stop(); button.setAttribute("aria-pressed", "false");
    button.innerHTML = `${icon("sound")} Dengar penjelasan Sela`;
    return;
  }
  const card = BY_ID[state.detailCard];
  const tab = modal.querySelector('.meaning-tab[aria-selected="true"]')?.dataset.tab || "makna";
  const ids = detailClips(card, tab);
  button.setAttribute("aria-pressed", "true");
  button.innerHTML = `${icon("pause")} Hentikan suara`;
  const next = index => {
    if (!modal.open || state.modalMode !== "detail" || state.detailCard !== card.id) return;
    if (!ids[index]) {
      button.setAttribute("aria-pressed", "false");
      button.innerHTML = `${icon("sound")} Dengar penjelasan Sela`;
      return;
    }
    speakCue(ids[index], () => next(index + 1));
  };
  next(0);
}

function updateAudioUI() {
  const on = audioEnabled(), button = document.getElementById("soundToggle");
  if (button) {
    button.setAttribute("aria-pressed", String(on));
    button.setAttribute("aria-label", on ? "Matikan semua suara" : "Nyalakan semua suara");
    button.textContent = on ? "Senyapkan" : "Nyalakan";
  }
  for (const [id, value] of [["musicVolume", musicVolume()], ["narratorVolume", narratorVolume()]]) {
    const slider = document.getElementById(id), label = document.getElementById(id + "Label");
    if (slider) slider.value = value;
    if (label) label.textContent = value + "%";
  }
}

async function startSound({ listen = false } = {}) {
  narrator.unlock();
  if (state.audioTouched && (!listen || audioEnabled())) return;
  state.audioTouched = true;
  try {
    await enableAudio();
    updateAudioUI();
  } catch {
    toast("Suara belum tersedia. Bacaan tetap bisa dimainkan.");
  }
}

async function greetSela(button) {
  const status = document.getElementById("arrivalVoiceStatus");
  const reset = () => {
    if (!button.isConnected) return;
    button.dataset.active = "false";
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", "Dengarkan sapaan Sela");
    button.querySelector("span").textContent = "Dengar Sela";
  };
  if (button.dataset.active === "true") {
    state.typingJob++;
    narrator.stop();
    reset();
    status.textContent = "";
    return;
  }
  await startSound({ listen: true });
  if (state.route !== "beranda" || !button.isConnected) return;
  if (!audioEnabled() || !state.voiceAvailable) return;
  const job = ++state.typingJob;
  button.dataset.active = "true";
  button.setAttribute("aria-label", "Hentikan sapaan Sela");
  button.querySelector("span").textContent = "Sebentar…";
  const greeting = document.getElementById("arrivalSpeech")?.textContent || getClipText(cue("SAMBUTAN-BARU"));
  beginCaption(greeting, greeting, job);
  try {
    await narrator.speak(greeting, "Sambutan Sela", (value, speaking) => {
      if (!button.isConnected || job !== state.typingJob) return;
      button.setAttribute("aria-pressed", String(!!speaking));
      if (speaking) {
        button.querySelector("span").textContent = "Sela menyapa";
        status.textContent = "";
      } else if (value && !value.startsWith("Menyiapkan")) {
        reset();
        status.textContent = "Suara belum tersedia. Kita ngobrol lewat teks dulu, ya.";
      }
    }, result => { finishCaption(job, result); reset(); });
  } catch {
    if (!button.isConnected || job !== state.typingJob) return;
    reset();
    status.textContent = "Suara belum tersedia. Kita ngobrol lewat teks dulu, ya.";
  }
}

async function speakSetup(button) {
  const text = document.getElementById("setupSpeech")?.textContent || setupSpeechText();
  const reset = () => {
    if (!button || !button.isConnected) return;
    button.dataset.active = "false";
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", "Dengarkan Sela berbicara");
    const span = button.querySelector("span");
    if (span) span.textContent = "Dengar Sela";
  };
  if (button.dataset.active === "true") {
    narrator.stop();
    reset();
    return;
  }
  await startSound({ listen: true });
  if (state.route !== "bacaan" || !button.isConnected) return;
  if (!audioEnabled() || !state.voiceAvailable) return;
  const job = state.typingJob;
  button.dataset.active = "true";
  button.setAttribute("aria-label", "Hentikan suara Sela");
  const span = button.querySelector("span");
  if (span) span.textContent = "Sebentar…";
  try {
    await narrator.speak(text, "Sapaan Sela", (value, speaking) => {
      if (!button.isConnected || job !== state.typingJob) return;
      button.setAttribute("aria-pressed", String(!!speaking));
      if (speaking) {
        if (span) span.textContent = "Sela bicara";
      } else if (value && !value.startsWith("Menyiapkan")) {
        reset();
      }
    }, reset);
  } catch {
    if (!button.isConnected || job !== state.typingJob) return;
    reset();
  }
}

function render({ focus = true } = {}) {
  const parts = (location.hash.slice(1) || "beranda").split("/");
  let route = parts[0] === "main" ? state.route : parts[0];
  if (!["beranda", "bacaan", "pilih", "baca", "kartu"].includes(route)) route = "beranda";
  if (route === "bacaan" && state.reading?.finished) resetReadingSetup();
  if (["pilih", "baca"].includes(route) && !state.reading) route = "bacaan";
  if (route === "baca" && state.reading.selected.length !== 3) route = "pilih";
  clearTimeout(state.dialogueTimer);
  state.typingJob++;
  narrator.stop();
  cancelAnimationFrame(state.captionFrame);
  state.caption = null;
  const expanded = state.route === "baca" && route === "baca" && state.readingExpanded;
  state.route = route;
  document.body.dataset.screen = route;
  closeModal({ resume: false });
  main.innerHTML = { beranda: home, bacaan: setup, pilih: pick, baca: reader, kartu: library }[
    route
  ]();
  updateViewport();
  const readingLink = document.querySelector('[data-nav="bacaan"]');
  if (readingLink) readingLink.href = "#" + resumeRoute();
  const navRoute = ["pilih", "baca"].includes(route) ? "bacaan" : route;
  document.querySelectorAll("[data-nav]").forEach(link => {
    if (link.dataset.nav === navRoute) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.title = route === "beranda"
    ? "The Tarot Room — Ada Cerita di Balik Kartu"
    : `${{ bacaan: "Baca Tarot", pilih: "Pilih Kartu", baca: "Bacaan Tarot", kartu: "Koleksi 78 Kartu" }[route]} — The Tarot Room`;
  if (route === "kartu") {
    fillLibrary();
    if (Object.hasOwn(BY_ID, parts[1])) cardModal(parts[1]);
  }
  if (route === "baca") {
    if (state.reading.finished) { playClosing(); prepareShareResult(state.reading); }
    else if (state.reading.revealed.includes(state.reading.selected[state.reading.current])) {
      if (expanded) readingModal(BY_ID[state.reading.selected[state.reading.current]]);
      startDialogue();
    } else {
      const intro = state.preIntro;
      speakCue(intro || cue(`PRE-${state.reading.current + 1}`), () => {
        if (intro) { state.preIntro = null; render({ focus: false }); }
      });
    }
  }
  if (route === "pilih") {
    animateShuffle();
    const intro = state.pickIntro;
    speakCue(intro || state.pickNotice || cue(`PILIH-${state.reading.selected.length}`), () => {
      if (intro) { state.pickIntro = null; render({ focus: false }); }
    });
  }
  if (route === "bacaan") speakCue(setupSpeechText());
  if (route === "beranda") {
    const id = cue(state.reading && !state.reading.finished ? "SAMBUTAN-KEMBALI" : "SAMBUTAN-BARU");
    beginCaption(id, getClipText(id), state.typingJob, true);
  }
  if (focus && !modal.open) {
    window.scrollTo?.({ top: 0, behavior: "instant" });
    requestAnimationFrame(() =>
      main.querySelector("h1")?.focus({ preventScroll: true }),
    );
  }
}

document.addEventListener("submit", (event) => {
  if (event.target.id !== "setupForm") return;
  event.preventDefault();
  if (state.setupStep === "topic") {
    if (!Object.hasOwn(TOPICS, state.form.topic)) return;
    state.setupStep = "question"; setSetupCue(`TOPIK-${state.form.topic}`); render(); return;
  }
  const data = new FormData(event.target);
  state.form = {
    topic: String(data.get("topic") || "umum"),
    question: String(data.get("question") || ""),
    count: 3,
  };
  try {
    state.reading = newReading(
      state.form.topic,
      state.form.question,
      state.form.count,
    );

    state.cues = {};
    state.pickIntro = cue("MULAI");
    state.preIntro = null;
    state.autoRead = true;
    state.readingExpanded = false;
    state.dealing = true;
    state.lastPick = null;
    state.dialogue.id = null;
    state.setupComment = null;
    state.pickNotice = null;
    startSound().then(() => sfx("shuffle"));
    document.activeElement?.blur();
    setHash("pilih");
  } catch (error) {
    toast(error.message);
  }
});

document.addEventListener("input", (event) => {
  const t = event.target;
  if (t.id === "question") {
    state.form.question = t.value;
    updateTemplateSelection();
    if (t.value.trim().length > 3 && !state.typedCommentShown) {
      state.typedCommentShown = true;
      setSetupCue("KETIK");
    }
  }

  if (t.id === "cardSearch") {
    state.search = t.value;
    state.libraryPage = 0;
    fillLibrary();
  }
  if (t.id === "musicVolume") { setMusicVolume(t.value); updateAudioUI(); }
  if (t.id === "narratorVolume") { setNarratorVolume(t.value); updateAudioUI(); }
});

document.addEventListener("change", (event) => {
  const t = event.target;
  if (t.name === "topic" && Object.hasOwn(TOPICS, t.value)) {
    state.form.topic = t.value;
    state.form.question = TOPICS[t.value].templates[0];
    state.customQuestion = false;
    setSetupCue(`TOPIK-${t.value}`);
    const next = main.querySelector('[data-action="setup-next"]');
    if (next) { next.disabled = false; next.innerHTML = `Pilih pertanyaan ${arrow}`; }
  }
  if (t.id === "suitFilter") {
    state.filter = t.value;
    state.libraryPage = 0;
    fillLibrary();
  }
});

document.addEventListener("click", async (event) => {
  if (event.target.closest(".skip-link")) {
    event.preventDefault();
    main.focus();
    return;
  }
  const start = event.target.closest("[data-reading-link]");
  if (start && !start.getAttribute("href").startsWith("#kartu")) {
    startSound();
    narrator.prefetch();
  }
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const action = button.dataset.action,
    r = state.reading;
  if (!button.closest(".sound-control")) {
    document.getElementById("soundSettings").hidden = true;
    document
      .getElementById("volumeToggle")
      .setAttribute("aria-expanded", "false");
  }
  try {
    if (action === "close") closeModal();
    else if (action === "greeting") await greetSela(button);
    else if (action === "speak-setup") await speakSetup(button);
    else if (action === "choose-topic") {
      beginTopic(button.dataset.topic);
      startSound();
    }
    else if (action === "edit") setHash("bacaan");
    else if (action === "new") {
      resetReadingSetup();
      setHash("bacaan");
    } else if (action === "read-again") {
      r.finished = false;
      r.revealed = [];
      r.current = 0;
      state.dialogue.id = null;
      state.preIntro = cue("ULANG", true);
      state.autoRead = true;
      render();
    } else if (action === "setup-next") {
      if (!Object.hasOwn(TOPICS, state.form.topic)) return;
      state.setupStep = "question";
      setSetupCue(`TOPIK-${state.form.topic}`);
      render();
    } else if (action === "setup-back") {
      state.setupStep = "topic";
      state.setupComment = null;
      render();
    } else if (action === "custom-question") {
      state.customQuestion = !state.customQuestion;
      state.typedCommentShown = false;
      render({ focus: false });
      if (state.customQuestion) document.getElementById("question")?.focus({ preventScroll: true });
    } else if (action === "filter-suit") {
      state.filter = button.dataset.suit;
      state.libraryPage = 0;
      fillLibrary();
    } else if (action === "clear-search") {
      state.filter = "all";
      state.search = "";
      state.libraryPage = 0;
      render({ focus: false });
    } else if (action === "detail-listen") {
      await startSound({ listen: true });
      playDetail(button);
    } else if (action === "share-result") {
      await shareReadingResult(button);
    } else if (action === "share-photo") {
      const entry = state.shareResult;
      button.disabled = true;
      try { if (entry?.blob && !(await sharePhoto(entry.blob, entry.ids))) toast("Menu berbagi belum terbuka. Coba lagi, ya."); }
      finally { button.disabled = false; }
    } else if (action === "download-photo") {
      downloadSharePhoto();
    } else if (action === "copy-invitation") {
      await copyInvitation();
    } else if (action === "replay-line") {
      await startSound({ listen: true });
      startDialogue();
    } else if (action === "use-template") {
      state.form.question = button.dataset.question;
      document.getElementById("question").value = state.form.question;
      updateTemplateSelection();
      sfx("select");
      const index = TOPICS[state.form.topic].templates.indexOf(state.form.question);
      setSetupCue(`TEMPLATE-${state.form.topic}-${index + 1}`);
    } else if (action === "pick") {
      if (
        state.picking ||
        state.dealing ||
        main.querySelector(".shuffle-stack.shuffling")
      )
        return;
      state.picking = true;
      state.pickNotice = null;
      state.pickIntro = null;
      sfx("select");
      try {
        await animateChoice(
          button,
          main.querySelector(`[data-slot="${r.selected.length}"]`),
        );
      } finally {
        state.picking = false;
      }
      if (state.reading !== r || state.route !== "pilih") return;
      if (chooseCard(r, button.dataset.id)) {
        state.lastPick = button.dataset.id;
        state.dealing = false;
        sfx("place");
        render({ focus: false });
        if (r.selected.length === 3) {
          for (const id of r.selected) {
            const image = new Image();
            image.src = `/assets/cards/${id}.webp`;
          }
          const first = BY_ID[r.selected[0]];
          narrator.prepare(storyLines(first, "makna")[0], first.name);
        }
        main
          .querySelector(
            r.selected.length === 3
              ? '[data-action="start-reading"]'
              : ".pick-card:not(:disabled)",
          )
          ?.focus({ preventScroll: true });
      }
    } else if (action === "shuffle" || action === "reset-picks") {
      if (action === "shuffle" && r.selected.length) return;
      if (action === "reset-picks") {
        r.selected = [];
        r.revealed = [];
        r.current = 0;
        state.pickNotice = getClipText(cue("PILIH-RESET", true));
      }
      r.candidates = shuffledCards().slice(0, 7);
      state.dealing = true;
      state.lastPick = null;
      sfx("shuffle");
      render({ focus: false });
    } else if (action === "start-reading") {
      if (r.selected.length !== 3) return;
      r.current = 0;
      state.pickNotice = null;
      setHash("baca");
    } else if (action === "reveal") {
      if (!r || state.revealing || r.revealed.includes(r.selected[r.current]))
        return;
      state.revealing = true;
      sfx("reveal");
      try {
        await animateReveal();
      } finally {
        state.revealing = false;
      }
      if (state.reading !== r || state.route !== "baca") return;
      revealCard(r);
      state.dialogue.id = null;
      state.readingExpanded = true;
      state.preIntro = null;
      sfx("place");
      render({ focus: false });
    } else if (action === "next-card") nextCard();
    else if (action === "auto-read") {
      state.autoRead = !state.autoRead;
      clearTimeout(state.dialogueTimer);
      if (!state.autoRead) narrator.pause();
      else if (!narrator.resume()) startDialogue();
      if (state.autoRead) resumeCaptionClock();
      syncReadingUI();
    } else if (action === "narrator") {
      state.narration = !state.narration;
      render({ focus: false });
    } else if (action === "meaning-tab") activateMeaningTab(button);
    else if (action === "card-detail") cardModal(button.dataset.id);
    else if (action.startsWith("library-")) {
      state.libraryPage += action === "library-next" ? 1 : -1;
      fillLibrary();
    } else if (action === "sound") {
      state.audioTouched = true;
      button.disabled = true;
      try {
        await toggleAudio();
        updateAudioUI();

      } finally {
        button.disabled = false;
      }
    } else if (action === "volume") {
      const panel = document.getElementById("soundSettings");
      panel.hidden = !panel.hidden;
      button.setAttribute("aria-expanded", String(!panel.hidden));
    }
  } catch (error) {
    toast(error.message || "Belum berhasil. Coba lagi.");
  }
});

document.addEventListener("pointerdown", (event) => {
  if (audioEnabled()) {
    primeAudio();
    narrator.unlock();
    state.audioTouched = true;
  }
  if (!event.target.closest(".sound-control")) {
    const settings = document.getElementById("soundSettings");
    if (settings) settings.hidden = true;
    const toggle = document.getElementById("volumeToggle");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    const settings = document.getElementById("soundSettings");
    if (settings) settings.hidden = true;
    const toggle = document.getElementById("volumeToggle");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  }
  const tab = event.target.closest('[role="tab"]');
  if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
    return;
  event.preventDefault();
  const tabs = [
    ...tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]'),
  ];
  const i = tabs.indexOf(tab);
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : (i + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
          tabs.length;
  tabs[next].focus();
  if (tabs[next].dataset.action === "story-tab") tabs[next].click();
  else activateMeaningTab(tabs[next]);
});

modal.addEventListener("close", () => {
  if (modal.open) return;
  const paused = state.modalPaused;
  if (state.modalMode === "detail") { state.typingJob++; narrator.stop(); }
  state.readingExpanded = false;
  state.modalMode = null;
  state.modalPaused = false;
  if (paused && state.route === "baca" && state.autoRead && !narrator.resume()) startDialogue();
});
modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    const rect = modal.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      closeModal();
  }
});

window.addEventListener("hashchange", () => render());
mobileHomeQuery.addEventListener("change", () => {
  if (["beranda", "kartu"].includes(state.route)) render({ focus: false });
});
compactLandscapeQuery.addEventListener("change", () => {
  if (state.route === "kartu") render({ focus: false });
});
function updateViewport() {
  const height = Math.round(window.visualViewport?.height || window.innerHeight || 844);
  const width = window.innerWidth || 390;
  const header = document.querySelector(".site-header")?.getBoundingClientRect().height || 58;
  const safeBottom = globalThis.getComputedStyle ? Math.max(0, parseFloat(getComputedStyle(main).paddingBottom) - 12) : 0;
  const layout = roomLayout(width, height, header, safeBottom || 0);
  const root = document.documentElement;
  root.style.setProperty("--room-height", height + "px");
  const setupPanel = main.querySelector(".setup-panel");
  if (setupPanel) root.style.setProperty("--setup-fade-top", Math.max(header, setupPanel.getBoundingClientRect().top - 55) + "px");
  for (const [key, value] of Object.entries(layout)) {
    if (key === "wide") { document.body.dataset.wideRoom = String(value); continue; }
    root.style.setProperty("--" + key.replace(/[A-Z]/g, letter => "-" + letter.toLowerCase()), value + "px");
  }
}
window.addEventListener("resize", updateViewport);
window.visualViewport?.addEventListener("resize", updateViewport);
updateViewport();
updateAudioUI();
render({ focus: false });

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearTimeout(state.dialogueTimer);
    if (state.route === "baca" && !state.reading?.finished && state.modalMode !== "detail") {
      state.autoRead = false;
      narrator.pause();
      syncReadingUI();
    } else {
      state.typingJob++;
      narrator.stop();
    }
  } else resumeCaptionClock();
});
