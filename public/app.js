import { DECK, BY_ID, SUITS, TOPICS, POSITIONS } from "./deck.js";
import {
  escapeHTML as esc,
  newReading,
  chooseCard,
  revealCard,
  readingComplete,
  shuffledCards,
  loadNotes,
  saveNote,
  STORAGE_KEY,
  noteToText,
} from "./engine.js";
import {
  enableAudio,
  toggleAudio,
  audioEnabled,
  audioVolume,
  setVolume,
  sfx,
  primeAudio,
} from "./audio.js";
import { createShareImage, websiteURL } from "./share.js";
import { cardStory, nextChapter } from "./story.js";
import { narrator } from "./narrator.js";

const main = document.getElementById("main");
const modal = document.getElementById("modal");
const state = {
  reading: null,
  form: { topic: "umum", question: "", count: 1 },
  route: "beranda",
  filter: "all",
  search: "",
  libraryPage: 0,
  notesPage: 0,
  noteId: null,
  toastTimer: null,
  audioTouched: false,
  share: null,
  shareRequest: 0,
  lastPick: null,
  dealing: true,
  dialogue: { id: null, chapter: "makna", line: 0 },
  typing: false,
  typeTimer: null,
  revealUntil: 0,
  voiceAvailable: false,
  narration: true,
};
const arrow = '<span aria-hidden="true">→</span>';
const shareIcon =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3m-4 4 4-4 4 4M5 13v7h14v-7"/></svg>';
const icons = {
  umum: '<svg viewBox="0 0 24 24"><path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></svg>',
  hubungan:
    '<svg viewBox="0 0 24 24"><path d="M12 21S2 15 2 8a5 5 0 0 1 10-1A5 5 0 0 1 22 8c0 7-10 13-10 13z"/></svg>',
  kerja: '<svg viewBox="0 0 24 24"><path d="M5 19 19 5M5 5h14v14"/></svg>',
  diri: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/></svg>',
};
const art = (id, extra = "") =>
  `<img src="/assets/cards/${id}.svg" width="280" height="460" alt="${esc(BY_ID[id]?.name || "Bagian belakang kartu")}" ${extra}>`;
const positions = (r) =>
  r.count === 3
    ? POSITIONS
    : [{ name: "Kartumu", label: "Satu sudut pandang" }];
const currentNote = () => ({
  id: state.noteId || "unsaved",
  topic: state.reading.topic,
  question: state.reading.question,
  cards: [...state.reading.selected],
  notes: state.reading.notes,
  createdAt: state.reading.createdAt,
});
const page = (content, name = "") =>
  `<section class="screen ${name}">${content}</section>`;
const heading = (kicker, title, description = "") =>
  `<div class="page-heading"><p class="eyebrow">${kicker}</p><h1 tabindex="-1">${title}</h1>${description ? `<p class="description">${description}</p>` : ""}</div>`;
const back = (action, label = "Kembali") =>
  `<button class="back-link" type="button" data-action="${action}"><span aria-hidden="true">←</span> ${label}</button>`;
const steps = (active) =>
  `<ol class="steps" aria-label="Tahapan bacaan">${["Siapkan", "Pilih", "Buka", "Selesai"].map((label, i) => `<li class="${i === active ? "active" : i < active ? "done" : ""}" ${i === active ? 'aria-current="step"' : ""}><span>${i < active ? "✓" : i + 1}</span>${label}</li>`).join("")}</ol>`;
const question = (r) =>
  `<p class="question-ribbon" title="${esc(r.question)}">“${esc(r.question)}”</p>`;
function toast(message) {
  const node = document.getElementById("toast");
  clearTimeout(state.toastTimer);
  node.textContent = message;
  node.classList.add("visible");
  state.toastTimer = setTimeout(() => node.classList.remove("visible"), 4500);
}
function setHash(hash) {
  if (location.hash === `#${hash}`) render();
  else location.hash = hash;
}
function resumeRoute() {
  const r = state.reading;
  return !r
    ? "bacaan"
    : readingComplete(r)
      ? "ringkasan"
      : r.selected.length === r.count
        ? "baca"
        : "pilih";
}
function home() {
  return page(
    `<div class="home-top"><span class="pill">78 KARTU</span><button class="text-button" data-action="about">Tentang ${arrow}</button></div>
    <div class="home-intro"><p class="eyebrow">TAROT, CARA SANTAI.</p><h1 tabindex="-1">Buka kartu.<br><em>Lihat ceritanya.</em></h1><p>Pilih kartu, dengarkan Sela bercerita.<br>Satu kartu atau tiga? Kamu yang pilih.</p></div>
    <div class="hero-art" aria-label="Tiga ilustrasi kartu tarot"><span class="hero-orbit" aria-hidden="true"></span>
      <a href="#kartu/m18" class="hero-card card-left" aria-label="Lihat makna The Moon">${art("m18")}</a><a href="#kartu/m19" class="hero-card card-right" aria-label="Lihat makna The Sun">${art("m19")}</a><a href="#kartu/m17" class="hero-card card-middle" aria-label="Lihat makna The Star">${art("m17")}</a>
      <span class="hero-caption">Kocok. Pilih. Buka.</span></div>
    <div class="home-actions"><a class="button primary" href="#${resumeRoute()}" data-start>${state.reading ? "Lanjutkan bacaan" : "Mulai main"} ${arrow}</a>
      <div class="home-links"><button data-action="guide">Cara main</button><span>·</span><span>Gratis & tanpa login</span></div></div>`,
    "home-screen",
  );
}
function setup() {
  const f = state.form;
  return page(
    `${steps(0)}${heading("01 / SIAPKAN", "Mau bahas apa?")}
    <form id="setupForm" class="setup-form">
      <div class="setup-fields"><fieldset><legend>Pilih topik</legend><div class="topics">${Object.entries(
        TOPICS,
      )
        .map(
          ([key, t]) =>
            `<label class="topic-tile" data-topic="${key}"><input type="radio" name="topic" value="${key}" ${f.topic === key ? "checked" : ""}><span class="topic-icon" aria-hidden="true">${icons[key]}</span><span>${t.label}</span><span class="tile-check" aria-hidden="true">✓</span></label>`,
        )
        .join("")}</div></fieldset>
      <div class="question-field"><label class="input-label" for="question">Pertanyaanmu <span>opsional</span></label><textarea id="question" name="question" maxlength="280" rows="2" placeholder="${esc(TOPICS[f.topic].question)}">${esc(f.question)}</textarea><p class="field-hint">Kosong juga boleh. Kami siapkan pertanyaan untukmu.</p></div>
      <fieldset><legend>Mau berapa kartu?</legend><div class="spread-options"><label class="spread-option"><input type="radio" name="count" value="1" ${f.count === 1 ? "checked" : ""}><span class="spread-icon" aria-hidden="true">▯</span><div><strong>Satu kartu</strong><small>Singkat & sederhana</small></div></label><label class="spread-option"><input type="radio" name="count" value="3" ${f.count === 3 ? "checked" : ""}><span class="spread-icon" aria-hidden="true">▯▯▯</span><div><strong>Tiga kartu</strong><small>Situasi · arah · langkah</small></div></label></div></fieldset></div>
      <div class="screen-actions"><p class="privacy-hint">Pertanyaanmu tetap di perangkat ini.</p><button type="submit" class="button primary">Pilih kartuku ${arrow}</button></div>
    </form>`,
    "setup-screen",
  );
}
function pick() {
  const r = state.reading,
    ready = r.selected.length === r.count;
  return page(
    `${steps(1)}${heading("02 / PILIH KARTU", r.count === 1 ? "Pilih satu kartu." : "Pilih tiga kartu.")}${question(r)}
    <div class="pick-stage"><div class="table-hud"><span>${ready ? "Siap dibuka ✦" : "Kartu sudah dikocok"}</span><strong id="selectionCount" role="status">${r.selected.length} / ${r.count}</strong></div>
      <div class="pick-grid ${state.dealing ? "dealing" : ""}">${r.candidates
        .map((id, i) => {
          const n = r.selected.indexOf(id);
          return `<button type="button" class="pick-card ${n >= 0 ? "selected" : ""} ${state.lastPick === id ? "just-picked" : ""}" data-action="pick" data-id="${id}" ${ready || n >= 0 ? "disabled" : ""} aria-label="${n >= 0 ? `Kartu ke-${n + 1} dipilih` : `Pilih kartu tertutup nomor ${i + 1}`}" aria-pressed="${n >= 0}">${art("back")}${n >= 0 ? `<span class="pick-order">${n + 1}</span>` : ""}</button>`;
        })
        .join("")}</div>
      <p class="selection-hint" role="status">${ready ? "Pilihanmu sudah lengkap. Yuk, buka!" : `Ketuk ${r.count - r.selected.length} kartu ${r.selected.length ? "lagi" : "yang kamu suka"}.`}</p></div>
    <div class="screen-actions"><div class="secondary-actions">${back("edit", "Ubah topik")}<button class="text-button" data-action="${r.selected.length ? "reset-picks" : "shuffle"}">${r.selected.length ? "Pilih ulang" : "↻ Kocok lagi"}</button></div><button class="button primary" data-action="start-reading" ${ready ? "" : "disabled"}>Buka ${r.count === 1 ? "kartuku" : "kartu pertama"} ${arrow}</button></div>`,
    "pick-screen",
  );
}
function explanation(card, { scope = "modal", tab = "makna" } = {}) {
  const key = `${scope}-${card.id}`;
  return `<div class="card-explanation"><div class="meaning-tabs" role="tablist" aria-label="Penjelasan kartu">${[
    ["makna", "Makna"],
    ["gambar", "Simbol"],
    ["langkah", "Langkah"],
    ["refleksi", "Refleksi"],
  ]
    .map(
      ([id, label]) =>
        `<button type="button" role="tab" id="${key}-tab-${id}" class="meaning-tab" data-action="meaning-tab" data-tab="${id}" aria-controls="${key}-panel-${id}" aria-selected="${tab === id}" tabindex="${tab === id ? 0 : -1}">${label}</button>`,
    )
    .join("")}</div>
    <section class="meaning-panel" role="tabpanel" tabindex="0" id="${key}-panel-makna" data-panel="makna" aria-labelledby="${key}-tab-makna" ${tab === "makna" ? "" : "hidden"}><p>${esc(card.meaning)}</p></section>
    <section class="meaning-panel" role="tabpanel" tabindex="0" id="${key}-panel-gambar" data-panel="gambar" aria-labelledby="${key}-tab-gambar" ${tab === "gambar" ? "" : "hidden"}><ul>${card.symbols.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></section>
    <section class="meaning-panel" role="tabpanel" tabindex="0" id="${key}-panel-langkah" data-panel="langkah" aria-labelledby="${key}-tab-langkah" ${tab === "langkah" ? "" : "hidden"}><p class="action-copy">${esc(card.action)}</p></section>
    <section class="meaning-panel" role="tabpanel" tabindex="0" id="${key}-panel-refleksi" data-panel="refleksi" aria-labelledby="${key}-tab-refleksi" ${tab === "refleksi" ? "" : "hidden"}><p class="reflection-copy">${esc(card.prompt)}</p></section></div>`;
}
function activateMeaningTab(button) {
  const group = button.closest(".card-explanation");
  if (!group) return;
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
function storyLines(card, chapter) {
  return cardStory(
    card,
    chapter,
    matchMedia("(max-width:699px) and (max-height:690px)").matches ? 110 : 190,
  );
}
function dialogueFor(card) {
  if (state.dialogue.id !== card.id)
    state.dialogue = { id: card.id, chapter: "makna", line: 0 };
  const story = storyLines(card, state.dialogue.chapter);
  state.dialogue.line = Math.min(state.dialogue.line, story.length - 1);
  return { story, text: story[state.dialogue.line] };
}
function dialogue(card) {
  const { story, text } = dialogueFor(card),
    chapter = state.dialogue.chapter;
  return `<div class="dialogue-box"><div class="story-tabs" role="tablist" aria-label="Bagian cerita">${[
    ["makna", "Makna"],
    ["gambar", "Simbol"],
    ["langkah", "Langkah"],
    ["refleksi", "Refleksi"],
  ]
    .map(
      ([id, label]) =>
        `<button type="button" role="tab" data-action="story-tab" data-tab="${id}" aria-selected="${chapter === id}" tabindex="${chapter === id ? 0 : -1}" aria-controls="storyPanel" id="story-tab-${id}">${label}</button>`,
    )
    .join("")}</div>
    <div class="dialogue-speaker"><span class="speaker-avatar" aria-hidden="true">✦</span><span class="speaker-name">Sela <small>narator</small></span><span class="story-counter">${state.dialogue.line + 1} / ${story.length}</span>${state.voiceAvailable ? `<button class="narrator-toggle" data-action="narrator" aria-pressed="${state.narration}" aria-label="${state.narration ? "Matikan" : "Nyalakan"} narasi suara">${state.narration ? "♪" : "♪̸"}</button>` : ""}</div>
    <section class="dialogue-bubble" id="storyPanel" role="tabpanel" aria-labelledby="story-tab-${chapter}"><p class="dialogue-text" data-text="${esc(text)}">${esc(text)}</p><button class="dialogue-cue" data-action="story-finish">Ketuk untuk menampilkan semua teks ▸</button><span class="voice-status" id="voiceStatus" role="status"></span></section></div>`;
}
function reader() {
  const r = state.reading,
    id = r.selected[r.current],
    c = BY_ID[id],
    opened = r.revealed.includes(id),
    cinema = performance.now() < state.revealUntil;
  const story = opened ? dialogueFor(c).story : [],
    more =
      opened &&
      (state.dialogue.line < story.length - 1 ||
        nextChapter(state.dialogue.chapter));
  return page(
    `${steps(2)}<div class="reader-heading"><p class="eyebrow">${positions(r)[r.current].name.toUpperCase()} · ${r.current + 1} / ${r.count}</p><h1 tabindex="-1">${opened ? c.name : "Kartumu menunggu."}</h1><p>${opened ? c.indo : "Ketuk kartu untuk membukanya."}</p></div>
    <div class="reader-body ${opened ? "opened" : ""} ${cinema ? "reveal-cinema" : ""}"><div class="reader-art"><button class="flip-card ${opened ? "is-open" : ""}" id="flipCard" data-action="reveal" ${opened ? "disabled" : ""} aria-label="${opened ? `${esc(c.name)} sudah terbuka` : "Buka kartu ini"}"><span class="flip-inner"><span class="flip-face flip-back">${art("back")}</span><span class="flip-face flip-front" ${opened ? "" : 'aria-hidden="true"'}>${art(id)}</span></span></button><div class="reveal-sparks" aria-hidden="true"><span>✦</span><span>✧</span><span>✦</span></div>${opened ? `<p class="card-keywords">${c.keywords}</p>` : '<p class="tap-hint">✦ Satu ketukan, satu cerita.</p>'}</div>
      ${opened ? dialogue(c) : '<div class="reveal-message"><p>Tidak ada pilihan yang salah.<br>Buka dan lihat apa yang menarik buatmu.</p></div>'}</div>
    <div class="screen-actions"><button class="button primary" id="storyNext" data-action="${opened ? "story-next" : "reveal"}">${opened ? (more ? "Lanjut cerita" : r.current === r.count - 1 ? "Lihat hasil bacaan" : "Kartu berikutnya") : "Buka kartu"} ${arrow}</button></div>`,
    "reader-screen",
  );
}
function finishTyping() {
  clearTimeout(state.typeTimer);
  const p = main.querySelector(".dialogue-text");
  if (p) {
    p.textContent = p.dataset.text;
    p.closest(".dialogue-bubble").classList.remove("typing");
  }
  state.typing = false;
  const next = main.querySelector("#storyNext");
  if (next?.dataset.readyLabel) next.innerHTML = next.dataset.readyLabel;
  const cue = main.querySelector(".dialogue-cue");
  if (cue) cue.hidden = true;
}
function startDialogue() {
  clearTimeout(state.typeTimer);
  const p = main.querySelector(".dialogue-text");
  if (!p) return;
  const text = p.dataset.text,
    reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    finishTyping();
  } else {
    const next = main.querySelector("#storyNext");
    if (next) {
      next.dataset.readyLabel = next.innerHTML;
      next.innerHTML = "Tampilkan teks " + arrow;
    }
    const chars = Array.from(text);
    let i = 0;
    p.textContent = "";
    state.typing = true;
    p.closest(".dialogue-bubble").classList.add("typing");
    function tick() {
      if (!p.isConnected) return;
      p.textContent += chars[i++] || "";
      if (i < chars.length) state.typeTimer = setTimeout(tick, 22);
      else finishTyping();
    }
    state.typeTimer = setTimeout(
      tick,
      Math.max(0, state.revealUntil - performance.now()),
    );
  }
  if (state.voiceAvailable && state.narration && audioEnabled()) {
    const status = main.querySelector("#voiceStatus");
    const card = BY_ID[state.reading.selected[state.reading.current]];
    narrator
      .speak(text, card.name, (value) => {
        if (status.isConnected) status.textContent = value;
      })
      .catch(() => {
        if (status.isConnected)
          status.textContent =
            "Narasi belum tersambung. Cerita tetap bisa dibaca.";
      });
  }
}
function advanceStory() {
  narrator.stop();
  const c = BY_ID[state.reading.selected[state.reading.current]],
    story = storyLines(c, state.dialogue.chapter);
  if (state.typing) {
    finishTyping();
    return;
  }
  if (state.dialogue.line < story.length - 1) {
    state.dialogue.line++;
    render({ focus: false });
  } else if (nextChapter(state.dialogue.chapter)) {
    state.dialogue.chapter = nextChapter(state.dialogue.chapter);
    state.dialogue.line = 0;
    render({ focus: false });
  } else {
    const r = state.reading;
    if (r.current < r.count - 1) {
      r.current++;
      sfx("next");
      render();
    } else if (readingComplete(r)) {
      sfx("complete");
      setHash("ringkasan");
    }
  }
}
function summary() {
  const r = state.reading;
  return page(
    `${steps(3)}${heading("04 / SELESAI", "Ini kartu pilihanmu.", "Simpan buat diri sendiri. Share buat teman.")}
    <div class="summary-body"><div class="result-cards ${r.count === 1 ? "single" : ""}">${r.selected.map((id, i) => `<button class="result-card" data-action="card-detail" data-id="${id}" aria-label="Baca lagi ${esc(BY_ID[id].name)}">${art(id)}<span class="result-position">${positions(r)[i].name}</span><strong>${BY_ID[id].name}</strong></button>`).join("")}</div>${question(r)}<p class="summary-hint">Ketuk kartu untuk membaca maknanya lagi.</p></div>
    <div class="screen-actions"><div class="summary-actions"><button class="button soft" data-action="write-note">${state.noteId ? "Edit catatan" : "Simpan catatan"} <span aria-hidden="true">＋</span></button><button class="button primary" data-action="share">Share hasil ${shareIcon}</button></div><div class="secondary-actions"><button class="text-button" data-action="download-reading">↓ Unduh bacaan</button><button class="text-button" data-action="new">Main lagi ${arrow}</button></div></div>`,
    "summary-screen",
  );
}
function filteredCards() {
  const q = state.search.toLocaleLowerCase("id-ID").trim();
  return DECK.filter(
    (c) =>
      (state.filter === "all" || c.suit === state.filter) &&
      `${c.name} ${c.indo} ${c.keywords} ${c.meaning}`
        .toLocaleLowerCase("id-ID")
        .includes(q),
  );
}
function library() {
  return page(
    `${heading("DEK TAROT", "Koleksi kartu.")}
    <div class="library-toolbar"><input type="search" id="cardSearch" placeholder="Cari kartu atau tema…" value="${esc(state.search)}" aria-label="Cari kartu"><select id="suitFilter" aria-label="Kelompok kartu"><option value="all">Semua kelompok</option>${Object.entries(
      SUITS,
    )
      .map(
        ([id, s]) =>
          `<option value="${id}" ${state.filter === id ? "selected" : ""}>${s.name}</option>`,
      )
      .join("")}</select></div>
    <div class="library-grid" id="libraryGrid"></div><div class="pagination" id="libraryPagination" aria-label="Halaman koleksi"></div>`,
    "library-screen",
  );
}
function fillLibrary() {
  const cards = filteredCards(),
    size = 6,
    max = Math.max(0, Math.ceil(cards.length / size) - 1);
  state.libraryPage = Math.min(state.libraryPage, max);
  const start = state.libraryPage * size;
  document.getElementById("libraryGrid").innerHTML = cards.length
    ? cards
        .slice(start, start + size)
        .map(
          (c) =>
            `<button class="library-card" data-action="card-detail" data-id="${c.id}" aria-label="Pelajari ${esc(c.name)}">${art(c.id, 'decoding="async"')}<strong>${c.name}</strong><span>${c.indo}</span></button>`,
        )
        .join("")
    : '<div class="empty-state"><span aria-hidden="true">✧</span><h2>Belum ketemu.</h2><p>Coba nama atau tema yang lain.</p></div>';
  document.getElementById("libraryPagination").innerHTML =
    `<button class="icon-button" data-action="library-prev" aria-label="Halaman sebelumnya" ${state.libraryPage === 0 ? "disabled" : ""}>←</button><span role="status">${cards.length ? `${start + 1}–${Math.min(start + size, cards.length)} dari ${cards.length} kartu` : "0 kartu"}</span><button class="icon-button" data-action="library-next" aria-label="Halaman berikutnya" ${state.libraryPage === max ? "disabled" : ""}>→</button>`;
}
function getSaved() {
  try {
    return loadNotes(localStorage);
  } catch {
    return [];
  }
}
const date = (value) =>
  new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
function notes() {
  const items = getSaved(),
    size = 3,
    max = Math.max(0, Math.ceil(items.length / size) - 1);
  state.notesPage = Math.min(state.notesPage, max);
  return page(
    `${heading("BACAAN TERSIMPAN", "Jurnalmu.", "Disimpan di browser ini.")}
    <div class="history-list">${
      items.length
        ? items
            .slice(state.notesPage * size, state.notesPage * size + size)
            .map(
              (n) =>
                `<button class="history-card" data-action="note-open" data-note="${esc(n.id)}">${art(n.cards[0])}<span><time>${date(n.createdAt)} · ${TOPICS[n.topic].label}</time><strong>${esc(n.question)}</strong><small>${n.cards.map((id) => BY_ID[id].name).join(" · ")}</small></span><span aria-hidden="true">→</span></button>`,
            )
            .join("")
        : '<div class="empty-state"><span aria-hidden="true">✧</span><h2>Mulai dengan satu cerita.</h2><p>Simpan hal yang ingin kamu ingat<br>setelah membuka kartumu.</p><a class="button primary" href="#bacaan" data-start>Mulai main tarot ' +
          arrow +
          "</a></div>"
    }</div>
    ${items.length ? `<div class="pagination"><button class="icon-button" data-action="notes-prev" aria-label="Catatan sebelumnya" ${state.notesPage === 0 ? "disabled" : ""}>←</button><span>${state.notesPage + 1} / ${max + 1} · ${items.length} bacaan</span><button class="icon-button" data-action="notes-next" aria-label="Catatan berikutnya" ${state.notesPage === max ? "disabled" : ""}>→</button></div>` : ""}`,
    "notes-screen",
  );
}
function cleanupShare() {
  state.shareRequest++;
  if (state.share?.url) URL.revokeObjectURL(state.share.url);
  state.share = null;
}
function closeModal() {
  modal.close();
  cleanupShare();
}
function openModal(title, content, name = "") {
  narrator.stop();
  finishTyping();
  cleanupShare();
  modal.className = name;
  document.getElementById("modalBody").innerHTML =
    `<div class="modal-header"><h2 id="modalTitle">${title}</h2><button class="icon-button modal-close" data-action="close" aria-label="Tutup jendela">×</button></div><div class="modal-content">${content}</div>`;
  if (!modal.open) modal.showModal();
  modal.querySelector(".modal-close").focus();
}
function cardModal(id) {
  const c = BY_ID[id];
  if (!c) return;
  openModal(
    c.name,
    `<div class="modal-card-top">${art(id)}<div><span class="pill">${SUITS[c.suit].name}</span><h3>${c.indo}</h3><p>${c.keywords}</p></div></div>${explanation(c)}`,
    "card-dialog",
  );
}
function guide() {
  openModal(
    "Gampang, kok.",
    `<div class="guide-list"><article><span>1</span><div><h3>Pilih topikmu.</h3><p>Satu atau tiga kartu. Pertanyaan boleh kosong.</p></div></article><article><span>2</span><div><h3>Ketuk kartu pilihanmu.</h3><p>Kartu diacak dari 78 kartu. Tidak ada pilihan yang salah.</p></div></article><article><span>3</span><div><h3>Buka & baca ceritanya.</h3><p>Makna, simbol, langkah kecil, dan pertanyaan refleksi ada di tab.</p></div></article><article><span>4</span><div><h3>Simpan atau share.</h3><p>Simpan catatan untuk dirimu, atau bagikan gambar kartumu.</p></div></article></div><p class="muted">Tarot untuk refleksi, bukan kepastian masa depan.</p><button class="button primary" data-action="guide-start">Yuk, mulai ${arrow}</button>`,
  );
}
function about() {
  openModal(
    "Sedikit tentang Sela.",
    `<div class="prose"><p>Ruang kecil untuk bermain kartu dan melihat sudut pandang baru. Makna mengikuti tema umum tarot, bukan prediksi pribadi atau hasil analisis AI.</p><h3>Catatanmu milikmu.</h3><p>Pertanyaan dan catatan diproses di browser. Tidak ada akun atau sinkronisasi catatan. Catatan disimpan di perangkat ini saat kamu menekan Simpan.</p><h3>Share tanpa cerita pribadi.</h3><p>Gambar share hanya memuat kartu, kata kunci, dan ajakan bermain. Pertanyaan dan catatan pribadi tidak disertakan.</p><h3>Musik & ilustrasi.</h3><p>78 kartu digambar khusus untuk Sela. Musik dan efek dibuat di browser. Jika narasi aktif, teks kartu dikirim ke Gemini untuk dibacakan. Pertanyaan dan catatan pribadi tidak dikirim. Tidak ada akses mikrofon. Volume awal 100% dan bisa diatur lewat tombol di atas.</p></div>`,
  );
}
function writeNote() {
  if (!readingComplete(state.reading)) return;
  openModal(
    "Satu hal yang ingin diingat.",
    `<label class="input-label" for="readingNotes">Catatan pribadi <span>opsional</span></label><textarea id="readingNotes" maxlength="3000" rows="5" placeholder="Dari bacaan ini, aku ingin…">${esc(state.reading.notes)}</textarea><p class="field-hint">Disimpan di browser ini. Tidak ikut di gambar share.</p><button class="button primary" data-action="save">Simpan catatan ${arrow}</button>`,
    "note-dialog",
  );
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function download(note) {
  downloadBlob(
    new Blob([noteToText(note)], { type: "text/plain;charset=utf-8" }),
    `sela-bacaan-${note.createdAt.slice(0, 10)}.txt`,
  );
  toast("Bacaan diunduh.");
}
function findNote(id) {
  return getSaved().find((n) => n.id === id);
}
function noteModal(id) {
  const n = findNote(id);
  if (!n) return toast("Catatan tidak ditemukan.");
  openModal(
    "Catatan · " + date(n.createdAt),
    `<div class="saved-reading"><h3>${esc(n.question)}</h3><div class="note-mini-cards">${n.cards.map((cid) => `<button data-action="card-detail" data-id="${cid}" aria-label="Baca makna ${esc(BY_ID[cid].name)}">${art(cid)}<span>${BY_ID[cid].name}</span></button>`).join("")}</div><p class="saved-note-text">${esc(n.notes || "Belum ada catatan pribadi.")}</p></div><div class="summary-actions"><button class="button primary" data-action="share-note" data-note="${esc(n.id)}">Share kartu ${shareIcon}</button><button class="button soft" data-action="note-download" data-note="${esc(n.id)}">Unduh ↓</button></div><button class="text-button danger" data-action="note-delete" data-note="${esc(n.id)}">Hapus catatan</button>`,
  );
}
async function sharePreview(note) {
  openModal(
    "Kartumu, siap dibagikan.",
    `<div class="share-preview" id="sharePreview"><p role="status">Menyiapkan gambar kartumu…</p></div><p class="share-privacy">Hanya kartu & ajakan main. Pertanyaan dan catatanmu tetap pribadi.</p><div class="summary-actions"><button class="button primary" id="shareSend" data-action="share-send" disabled>Bagikan ${shareIcon}</button><button class="button soft" id="shareDownload" data-action="share-download" disabled>Simpan PNG ↓</button></div><button class="text-button" data-action="copy-link">Salin link web</button>`,
    "share-dialog",
  );
  const request = state.shareRequest;
  try {
    const blob = await createShareImage(note.cards);
    if (request !== state.shareRequest || !modal.open) return;
    const file = new File(
        [blob],
        `sela-tarot-${note.createdAt.slice(0, 10)}.png`,
        { type: "image/png" },
      ),
      url = URL.createObjectURL(blob);
    state.share = { blob, file, url };
    document.getElementById("sharePreview").innerHTML =
      `<img src="${url}" alt="Gambar share hasil ${note.cards.map((id) => esc(BY_ID[id].name)).join(", ")} dengan ajakan bermain tarot di Sela">`;
    document.getElementById("shareSend").disabled = false;
    document.getElementById("shareDownload").disabled = false;
  } catch {
    if (request === state.shareRequest) {
      document.getElementById("sharePreview").innerHTML =
        '<p role="alert">Gambar belum berhasil dibuat. Tutup lalu coba lagi.</p>';
    }
  }
}
async function sendShare() {
  const data = state.share;
  if (!data) return;
  if (navigator.share && navigator.canShare?.({ files: [data.file] })) {
    try {
      await navigator.share({
        files: [data.file],
        title: "Kartuku di Sela",
        text: "Ini kartuku. Giliran kamu? Main tarot di Sela ✦",
        url: websiteURL(),
      });
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }
  downloadBlob(data.blob, data.file.name);
  toast("Gambar diunduh. Bagikan dari galeri atau folder unduhanmu.");
}
function updateAudioUI() {
  const on = audioEnabled(),
    button = document.getElementById("soundToggle");
  button.setAttribute("aria-pressed", String(on));
  button.setAttribute(
    "aria-label",
    on ? "Matikan musik dan efek suara" : "Nyalakan musik dan efek suara",
  );
  button.querySelector("svg").innerHTML = on
    ? '<path d="M11 5 6 9H3v6h3l5 4zM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14"/>'
    : '<path d="M11 5 6 9H3v6h3l5 4zM16 9l5 6m0-6-5 6"/>';
  document.getElementById("soundVolume").value = audioVolume();
  document.getElementById("volumeLabel").textContent = `${audioVolume()}%`;
}
async function startSound() {
  narrator.unlock();
  if (state.audioTouched) return;
  state.audioTouched = true;
  try {
    await enableAudio();
    updateAudioUI();
  } catch {
    toast("Suara belum tersedia. Bacaan tetap bisa dimainkan.");
  }
}
function render({ focus = true } = {}) {
  const parts = (location.hash.slice(1) || "beranda").split("/");
  let route = parts[0];
  if (["pilih", "baca", "ringkasan"].includes(route) && !state.reading)
    route = "bacaan";
  if (
    ["baca", "ringkasan"].includes(route) &&
    state.reading.selected.length !== state.reading.count
  )
    route = "pilih";
  if (route === "ringkasan" && !readingComplete(state.reading)) route = "baca";
  if (
    ![
      "beranda",
      "bacaan",
      "pilih",
      "baca",
      "ringkasan",
      "kartu",
      "panduan",
      "catatan",
    ].includes(route)
  )
    route = "beranda";
  clearTimeout(state.typeTimer);
  state.typing = false;
  narrator.stop();
  state.route = route;
  document.body.dataset.screen = route;
  closeModal();
  main.innerHTML = {
    beranda: home,
    bacaan: setup,
    pilih: pick,
    baca: reader,
    ringkasan: summary,
    kartu: library,
    catatan: notes,
    panduan: home,
  }[route]();
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const on =
      link.dataset.nav ===
      (["pilih", "baca", "ringkasan"].includes(route) ? "bacaan" : route);
    if (on) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
    if (link.dataset.nav === "bacaan") link.href = `#${resumeRoute()}`;
  });
  document.title =
    route === "beranda"
      ? "Sela — Buka kartu, lihat ceritanya"
      : `${{ bacaan: "Mulai bacaan", pilih: "Pilih kartu", baca: "Makna kartu", ringkasan: "Hasil bacaan", kartu: "Koleksi kartu", catatan: "Jurnal", panduan: "Cara main" }[route]} — Sela`;
  if (route === "kartu") {
    fillLibrary();
    if (BY_ID[parts[1]]) cardModal(parts[1]);
  }
  if (route === "panduan") guide();
  if (route === "baca") startDialogue();
  if (focus && !modal.open)
    requestAnimationFrame(() =>
      main.querySelector("h1")?.focus({ preventScroll: true }),
    );
}

document.addEventListener("submit", (event) => {
  if (event.target.id !== "setupForm") return;
  event.preventDefault();
  const data = new FormData(event.target);
  state.form = {
    topic: String(data.get("topic")),
    question: String(data.get("question") || ""),
    count: Number(data.get("count")),
  };
  try {
    state.reading = newReading(
      state.form.topic,
      state.form.question,
      state.form.count,
    );
    state.noteId = null;
    state.dealing = true;
    state.lastPick = null;
    state.dialogue.id = null;
    startSound().then(() => sfx("shuffle"));
    document.activeElement?.blur();
    setHash("pilih");
  } catch (error) {
    toast(error.message);
  }
});
document.addEventListener("input", (event) => {
  const t = event.target;
  if (t.id === "question") state.form.question = t.value;
  if (t.id === "readingNotes" && state.reading) state.reading.notes = t.value;
  if (t.id === "cardSearch") {
    state.search = t.value;
    state.libraryPage = 0;
    fillLibrary();
  }
  if (t.id === "soundVolume") {
    setVolume(t.value);
    document.getElementById("volumeLabel").textContent = `${audioVolume()}%`;
  }
});
document.addEventListener("change", (event) => {
  const t = event.target;
  if (t.name === "topic") {
    state.form.topic = t.value;
    document.getElementById("question").placeholder = TOPICS[t.value].question;
  }
  if (t.name === "count") state.form.count = Number(t.value);
  if (t.id === "suitFilter") {
    state.filter = t.value;
    state.libraryPage = 0;
    fillLibrary();
  }
});
document.addEventListener("click", async (event) => {
  const start = event.target.closest('[data-start], [data-nav="bacaan"]');
  if (start) startSound();
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
    else if (action === "guide") guide();
    else if (action === "guide-start") {
      closeModal();
      startSound();
      setHash(resumeRoute());
    } else if (action === "about") about();
    else if (action === "edit") setHash("bacaan");
    else if (action === "new") {
      state.reading = null;
      state.noteId = null;
      state.form.question = "";
      setHash("bacaan");
    } else if (action === "pick") {
      if (chooseCard(r, button.dataset.id)) {
        state.lastPick = button.dataset.id;
        state.dealing = false;
        sfx("select");
        render({ focus: false });
        document
          .querySelector(
            r.selected.length === r.count
              ? '[data-action="start-reading"]'
              : ".pick-card:not(:disabled)",
          )
          ?.focus({ preventScroll: true });
      }
    } else if (action === "shuffle") {
      if (r.selected.length) return;
      r.candidates = shuffledCards().slice(0, 7);
      state.dealing = true;
      state.lastPick = null;
      sfx("shuffle");
      render({ focus: false });
      toast("Kartu sudah dikocok ulang.");
    } else if (action === "reset-picks") {
      r.selected = [];
      r.revealed = [];
      r.current = 0;
      state.dealing = false;
      state.lastPick = null;
      render({ focus: false });
      sfx("shuffle");
    } else if (action === "start-reading") {
      if (r.selected.length !== r.count) return;
      r.current = 0;
      setHash("baca");
    } else if (action === "reveal") {
      if (!r || r.revealed.includes(r.selected[r.current])) return;
      revealCard(r);
      state.dialogue.id = null;
      state.revealUntil = performance.now() + 950;
      sfx("reveal");
      render();
    } else if (action === "story-next") advanceStory();
    else if (action === "story-finish") finishTyping();
    else if (action === "story-tab") {
      state.dialogue.chapter = button.dataset.tab;
      state.dialogue.line = 0;
      render({ focus: false });
      main
        .querySelector(
          `[data-action="story-tab"][data-tab="${state.dialogue.chapter}"]`,
        )
        ?.focus({ preventScroll: true });
    } else if (action === "narrator") {
      state.narration = !state.narration;
      render({ focus: false });
    } else if (action === "meaning-tab") activateMeaningTab(button);
    else if (action === "card-detail") cardModal(button.dataset.id);
    else if (action === "write-note") writeNote();
    else if (action === "save") {
      const id = state.noteId || crypto.randomUUID();
      saveNote(localStorage, r, id);
      state.noteId = id;
      closeModal();
      render({ focus: false });
      sfx("save");
      toast("Catatan tersimpan di Jurnal.");
    } else if (action === "download-reading") {
      if (readingComplete(r)) download(currentNote());
    } else if (action === "share") {
      if (readingComplete(r)) await sharePreview(currentNote());
    } else if (action === "share-note") {
      const n = findNote(button.dataset.note);
      if (n) await sharePreview(n);
    } else if (action === "share-send") {
      button.disabled = true;
      try {
        await sendShare();
      } finally {
        button.disabled = false;
      }
    } else if (action === "share-download") {
      if (state.share) {
        downloadBlob(state.share.blob, state.share.file.name);
        toast("Gambar PNG diunduh.");
      }
    } else if (action === "copy-link") {
      try {
        await navigator.clipboard.writeText(websiteURL());
        toast("Link web disalin.");
      } catch {
        openModal(
          "Link untuk mengajak teman.",
          `<label class="input-label" for="shareLink">Salin link ini</label><input id="shareLink" readonly value="${esc(websiteURL())}">`,
        );
        document.getElementById("shareLink").select();
      }
    } else if (action === "note-open") noteModal(button.dataset.note);
    else if (action === "note-download") {
      const n = findNote(button.dataset.note);
      if (n) download(n);
    } else if (action === "note-delete") {
      const n = findNote(button.dataset.note);
      if (n)
        openModal(
          "Hapus catatan ini?",
          `<p>Catatan akan dihapus dari browser ini.</p><div class="summary-actions"><button class="button soft" data-action="close">Batal</button><button class="button primary" data-action="note-delete-confirm" data-note="${esc(n.id)}">Hapus</button></div>`,
        );
    } else if (action === "note-delete-confirm") {
      const id = button.dataset.note;
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(getSaved().filter((n) => n.id !== id)),
      );
      if (state.noteId === id) state.noteId = null;
      render({ focus: false });
      toast("Catatan dihapus.");
    } else if (action.startsWith("library-")) {
      state.libraryPage += action === "library-next" ? 1 : -1;
      fillLibrary();
    } else if (action.startsWith("notes-")) {
      state.notesPage += action === "notes-next" ? 1 : -1;
      render({ focus: false });
    } else if (action === "sound") {
      state.audioTouched = true;
      button.disabled = true;
      try {
        await toggleAudio();
        updateAudioUI();
        if (!audioEnabled()) narrator.stop();
        else if (state.route === "baca") {
          narrator.unlock();
          startDialogue();
        }
        toast(
          audioEnabled()
            ? "Suara aktif. Volume bisa diatur di sebelahnya."
            : "Suara dimatikan.",
        );
      } finally {
        button.disabled = false;
      }
    } else if (action === "volume") {
      const panel = document.getElementById("soundSettings");
      panel.hidden = !panel.hidden;
      button.setAttribute("aria-expanded", String(!panel.hidden));
    }
  } catch (error) {
    toast(
      action === "save"
        ? "Catatan belum tersimpan. Kamu tetap bisa mengunduh bacaan."
        : error.message || "Belum berhasil. Coba lagi.",
    );
  }
});
document.addEventListener("pointerdown", (event) => {
  if (audioEnabled()) {
    primeAudio();
    narrator.unlock();
  }
  if (!event.target.closest(".sound-control")) {
    document.getElementById("soundSettings").hidden = true;
    document
      .getElementById("volumeToggle")
      .setAttribute("aria-expanded", "false");
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.getElementById("soundSettings").hidden = true;
    document
      .getElementById("volumeToggle")
      .setAttribute("aria-expanded", "false");
  }
  const tab = event.target.closest('[role="tab"]');
  if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
    return;
  event.preventDefault();
  const tabs = [
      ...tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]'),
    ],
    i = tabs.indexOf(tab),
    next =
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
  if (!modal.open) cleanupShare();
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
primeAudio();
updateAudioUI();
render({ focus: false });

fetch("/api/config")
  .then((r) => (r.ok ? r.json() : null))
  .then((config) => {
    state.voiceAvailable = !!config?.narration;
    if (state.route === "baca") render({ focus: false });
  })
  .catch(() => {});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) narrator.stop();
});
