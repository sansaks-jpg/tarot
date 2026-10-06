import { DECK, BY_ID, SUITS, TOPICS, POSITIONS } from "./deck.js?v=room-4";
import {
  escapeHTML as esc,
  newReading,
  chooseCard,
  revealCard,
  readingComplete,
  shuffledCards,
} from "./engine.js?v=room-4";
import {
  enableAudio,
  toggleAudio,
  audioEnabled,
  audioVolume,
  setVolume,
  sfx,
  primeAudio,
} from "./audio.js?v=room-4";
import { cardStory, nextChapter } from "./story.js?v=room-4";
import { narrator } from "./narrator.js?v=room-4";

const main = document.getElementById("main");
const modal = document.getElementById("modal");
const state = {
  reading: null,
  form: { topic: "umum", question: "", count: 3 },
  route: "bacaan",
  filter: "all",
  search: "",
  libraryPage: 0,

  toastTimer: null,
  audioTouched: false,

  lastPick: null,
  dealing: true,
  dialogue: { id: null, chapter: "makna", line: 0 },
  typing: false,
  typeTimer: null,
  revealUntil: 0,
  voiceAvailable: false,
  narration: true,
  voiceMode: "none",
  autoRead: true,
  typingJob: 0,
  dialogueTimer: null,
  picking: false,
  revealing: false,
  passageLimit: 190,
};
const arrow = '<span aria-hidden="true">→</span>';
const icons = {
  umum: '<svg viewBox="0 0 24 24"><path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></svg>',
  hubungan:
    '<svg viewBox="0 0 24 24"><path d="M12 21S2 15 2 8a5 5 0 0 1 10-1A5 5 0 0 1 22 8c0 7-10 13-10 13z"/></svg>',
  kerja: '<svg viewBox="0 0 24 24"><path d="M5 19 19 5M5 5h14v14"/></svg>',
  diri: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/></svg>',
};

const art = (id, extra = "") => {
  const isBack = id === "back";
  const src = isBack ? "/assets/cards/back.svg?v=room-4" : `/assets/cards/${id}.webp`;
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
    if (dot) dot.textContent = selected ? "●" : "○";
  });
}

function setHash(hash) {
  if (location.hash === `#${hash}`) render();
  else location.hash = hash;
}

function resumeRoute() {
  const r = state.reading;
  return !r ? "bacaan" : r.selected.length === 3 ? "baca" : "pilih";
}

function setup() {
  narrator.prefetch();
  const f = state.form;
  const currentTopic = TOPICS[f.topic] || TOPICS.umum;
  const templates = currentTopic.templates || [currentTopic.question];
  if (!f.question && templates.length) {
    f.question = templates[0];
  }
  return page(
    `${heading("BACA TAROT", "Pilih pertanyaanmu.")}
    ${host("Pilih yang paling dekat dengan ceritamu. Tak perlu merangkai pertanyaan sendiri.")}
    <form id="setupForm" class="setup-form">
      <div class="setup-fields">
        <fieldset>
          <legend>Hari ini kita bicara tentang…</legend>
          <div class="topics">${Object.entries(TOPICS)
            .map(
              ([key, t]) =>
                `<label class="topic-tile" data-topic="${key}">
                  <input type="radio" name="topic" value="${key}" ${f.topic === key ? "checked" : ""}>
                  <span class="topic-icon" aria-hidden="true">${icons[key] || "✦"}</span>
                  <span class="topic-title">${t.label}</span>
                  <span class="tile-check" aria-hidden="true">✓</span>
                </label>`,
            )
            .join("")}
          </div>
        </fieldset>

        <div class="question-templates-wrapper">
          <p class="input-label" id="questionsLabel">Pilih satu pertanyaan</p>
          <div class="question-templates" id="questionTemplates" role="group" aria-labelledby="questionsLabel">
            ${templates
              .map(
                (q) =>
                  `<button type="button" class="template-chip ${f.question === q ? "active" : ""}" aria-pressed="${f.question === q}" data-action="use-template" data-question="${esc(q)}">
                    <span class="chip-star" aria-hidden="true">${f.question === q ? "●" : "○"}</span>
                    <span class="chip-text">${esc(q)}</span>
                  </button>`,
              )
              .join("")}
          </div>
        </div>

        <details class="question-field">
          <summary>Atau tulis pertanyaanmu sendiri <span aria-hidden="true">＋</span></summary>
          <label class="input-label" for="question">Pertanyaanmu</label>
          <textarea id="question" name="question" maxlength="280" rows="2" placeholder="${esc(currentTopic.question)}">${esc(f.question)}</textarea>
          <p class="field-hint">Tidak dikirim ke pembaca suara. Tetap di perangkatmu.</p>
        </details>

        <div class="spread-indicator-card">
          <input type="hidden" name="count" value="3">
          <div class="spread-header">
            <span class="spread-icon" aria-hidden="true">▯▯▯</span>
            <div>
              <strong>Satu cerita, tiga kartu.</strong>
              <small>Masa lalu · Masa kini · Masa depan</small>
            </div>
          </div>
        </div>
      </div>

      <div class="screen-actions">
        <button type="submit" class="button primary">Kocok kartuku ${arrow}</button>
      </div>
    </form>`,
    "setup-screen",
  );
}

function presence() {
  return `<div class="reader-presence"><picture><source media="(max-width: 699px)" srcset="/assets/presence-mobile.webp"><img src="/assets/presence.webp" width="840" height="577" alt="Sela duduk di seberang meja, siap membacakan kartumu" fetchpriority="high"></picture><span class="reader-name">Sela <small>pembaca virtual</small></span><span class="candle-glow" aria-hidden="true"></span></div>`;
}

function pick() {
  const r = state.reading,
    ready = r.selected.length === 3;
  return page(
    `
    <div class="session-heading"><span class="session-step">PILIH KARTU</span><h1 tabindex="-1">Pilih tiga kartu.</h1><span id="selectionCount" role="status">${r.selected.length} / 3</span><button class="reshuffle" data-action="${r.selected.length ? "reset-picks" : "shuffle"}" aria-label="${r.selected.length ? "Pilih ulang kartu" : "Kocok ulang kartu"}"><span aria-hidden="true">↻</span></button></div>
    <div class="tarot-room">
      ${presence()}
      <div class="cloth-table pick-table">
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
    <p class="table-conversation" role="status"><span>Sela</span>${ready ? "Sudah lengkap. Yuk, kita buka satu per satu." : "Aku sudah kocok kartunya. Sekarang giliranmu."}</p>
    <div class="screen-actions">
      <button class="button primary" data-action="start-reading" ${ready ? "" : "disabled"}>${ready ? "Mulai bacaan" : `Pilih ${3 - r.selected.length} kartu lagi`} ${arrow}</button>
    </div>`,
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
  const card = button.querySelector("img").cloneNode(true);
  card.className = "travelling-card";
  Object.assign(card.style, {
    left: from.left + "px",
    top: from.top + "px",
    width: from.width + "px",
    height: from.height + "px",
  });
  document.body.append(card);
  button.classList.add("lifting");
  const dx = to.left - from.left,
    dy = to.top - from.top;
  try {
    await card.animate(
      [
        {
          transform: "translate(0,0) rotate(0)",
          filter: "drop-shadow(0 5px 4px #0005)",
        },
        {
          transform: `translate(${dx * 0.45}px,${dy * 0.45 - 35}px) rotate(-9deg) scale(1.08)`,
          offset: 0.42,
          filter: "drop-shadow(0 20px 12px #0007)",
        },
        {
          transform: `translate(${dx}px,${dy}px) scale(${to.width / from.width},${to.height / from.height})`,
          filter: "drop-shadow(0 4px 3px #0005)",
        },
      ],
      { duration: 520, easing: "cubic-bezier(.22,.6,.26,1)", fill: "forwards" },
    ).finished;
  } finally {
    card.remove();
  }
}

function animateShuffle() {
  const grid = main.querySelector(".pick-grid"),
    stack = main.querySelector(".shuffle-stack");
  if (!grid || !state.dealing) return;
  state.dealing = false;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    grid.classList.remove("dealing");
    return;
  }
  stack.classList.add("shuffling");
  const cards = [...grid.children];
  const center = grid.getBoundingClientRect();
  cards.forEach((card, i) => {
    const rect = card.getBoundingClientRect();
    const dx = center.left + center.width / 2 - rect.left - rect.width / 2;
    card.animate(
      [
        {
          opacity: 0,
          transform: `translate(${dx}px,35px) rotate(0deg) scale(.86)`,
        },
        {
          opacity: 1,
          transform: `translate(${dx}px,35px) rotate(0deg) scale(.86)`,
          offset: 0.2,
        },
        { opacity: 1, transform: `translate(0,0) rotate(${(i - 3) * 4}deg)` },
      ],
      {
        duration: 650,
        delay: 950 + i * 65,
        easing: "cubic-bezier(.16,.65,.28,1)",
        fill: "backwards",
      },
    );
  });
  setTimeout(() => {
    if (grid.isConnected) {
      stack.classList.remove("shuffling");
      grid.classList.remove("dealing");
      sfx("fan");
    }
  }, 980);
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
  return cardStory(card, chapter, state.passageLimit);
}

function dialogueFor(card) {
  if (state.dialogue.id !== card.id)
    state.dialogue = { id: card.id, chapter: "makna", line: 0 };
  const story = storyLines(card, state.dialogue.chapter);
  state.dialogue.line = Math.min(state.dialogue.line, story.length - 1);
  return { story, text: story[state.dialogue.line] };
}

function dialogue(card) {
  const { text } = dialogueFor(card);
  return `<div class="dialogue-box"><div class="dialogue-speaker"><span class="speaker-name">Sela</span><span class="voice-status" id="voiceStatus" role="status"></span><button class="text-button pause-reading" data-action="auto-read" aria-pressed="${state.autoRead}">${state.autoRead ? "Ⅱ Jeda" : "▷ Lanjut"}</button></div><section class="dialogue-bubble" id="storyPanel" aria-label="Bacaan Sela"><p class="dialogue-text" data-text="${esc(text)}">${esc(text)}</p></section></div>`;
}

function reader() {
  const r = state.reading;
  if (r.finished) return summary();
  const id = r.selected[r.current],
    c = BY_ID[id],
    opened = r.revealed.includes(id);
  const story = opened ? dialogueFor(c).story : [],
    more =
      opened &&
      (state.dialogue.line < story.length - 1 ||
        nextChapter(state.dialogue.chapter));
  return page(
    `<div class="session-heading"><span class="session-step">${positions()[r.current].name.toUpperCase()} · ${r.current + 1}/3</span><h1 tabindex="-1">${opened ? c.name : ["Buka kartu pertama.", "Buka kartu kedua.", "Buka kartu terakhir."][r.current]}</h1></div>
    <div class="tarot-room">${presence()}<div class="cloth-table reading-table"><div class="physical-spread" aria-label="Tiga kartu bacaanmu">${r.selected
      .map((cid, i) => {
        const revealed = r.revealed.includes(cid),
          current = i === r.current;
        return `<div class="physical-slot ${current ? "current" : ""}" style="--tilt:${[-6, 2, 7][i]}deg">
        ${current ? `<button class="flip-card ${opened ? "is-open" : ""}" id="flipCard" data-action="${opened ? "card-detail" : "reveal"}" data-id="${cid}" aria-label="${opened ? "Lihat " + esc(c.name) + " lebih dekat" : "Buka kartu ini"}"><span class="flip-inner"><span class="flip-face flip-back" ${opened ? 'aria-hidden="true"' : ""}>${art("back")}</span><span class="flip-face flip-front" ${opened ? "" : 'aria-hidden="true"'}>${art(cid)}</span></span></button>` : `<span class="resting-card">${art(revealed ? cid : "back")}</span>`}
        <span class="physical-label">${positions()[i].name}</span></div>`;
      })
      .join(
        "",
      )}</div>${opened ? `<p class="card-keywords">${c.keywords}</p>` : '<p class="tap-hint">Sentuh kartu yang paling besar</p>'}</div></div>
    ${opened ? dialogue(c) : `<p class="table-conversation"><span>Sela</span>${["Kita mulai dari masa lalu. Buka kartunya saat kamu siap.", "Sekarang, kita lihat apa yang sedang kamu hadapi.", "Terakhir, kita lihat kemungkinan langkah berikutnya."][r.current]}</p>`}
    <div class="screen-actions"><button class="button primary" id="storyNext" data-action="${opened ? "story-next" : "reveal"}">${opened ? (more ? "Lanjut" : r.current === 2 ? "Lihat tiga kartuku" : "Kartu berikutnya") : "Buka kartu"} ${arrow}</button></div>`,
    "reader-screen immersive-screen",
  );
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
        transform: "rotateY(65deg) translateY(-16px) scale(1.06)",
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

function finishTyping() {
  clearTimeout(state.typeTimer);
  const p = main.querySelector(".dialogue-text");
  if (p) {
    p.textContent = p.dataset.text;
    p.closest(".dialogue-bubble")?.classList.remove("typing");
  }
  state.typing = false;
  const next = main.querySelector("#storyNext");
  if (next?.dataset.readyLabel) next.innerHTML = next.dataset.readyLabel;
  const cue = main.querySelector(".dialogue-cue");
  if (cue) cue.hidden = true;
}

function startDialogue() {
  clearTimeout(state.typeTimer);
  clearTimeout(state.dialogueTimer);
  const p = main.querySelector(".dialogue-text");
  if (!p) return;
  const text = p.dataset.text;
  finishTyping();
  const job = ++state.typingJob;
  const complete = () => {
    if (
      job !== state.typingJob ||
      state.route !== "baca" ||
      modal.open ||
      document.hidden
    )
      return;
    finishTyping();
    if (!state.autoRead) return;
    const card = BY_ID[state.reading.selected[state.reading.current]];
    const more =
      state.dialogue.line <
        storyLines(card, state.dialogue.chapter).length - 1 ||
      nextChapter(state.dialogue.chapter);
    if (more) state.dialogueTimer = setTimeout(() => advanceStory(), 850);
  };
  if (state.voiceAvailable && state.narration && audioEnabled()) {
    const status = main.querySelector("#voiceStatus");
    const card = BY_ID[state.reading.selected[state.reading.current]];
    narrator
      .speak(
        text,
        card.name,
        (value, speaking = false) => {
          if (status?.isConnected) {
            status.textContent = speaking
              ? "Sedang membaca"
              : value
                ? value.startsWith("Menyiapkan")
                  ? "Sebentar…"
                  : "Suara belum tersedia"
                : "";
            status.dataset.mode = narrator.mode;
            main
              .querySelector(".dialogue-speaker")
              ?.classList.toggle("speaking", speaking);
          }
        },
        complete,
      )
      .catch(() => {
        if (status?.isConnected)
          status.textContent = "Suara belum tersedia. Gunakan tombol lanjut.";
      });
    const chapter = state.dialogue.chapter;
    const lines = storyLines(card, chapter);
    const nextLine =
      lines[state.dialogue.line + 1] ||
      (nextChapter(chapter) && storyLines(card, nextChapter(chapter))[0]);
    if (nextLine) narrator.prepare(nextLine, card.name);
    else {
      const following =
        BY_ID[state.reading.selected[state.reading.current + 1]];
      if (following)
        narrator.prepare(storyLines(following, "makna")[0], following.name);
    }
  } else if (state.autoRead) {
    state.dialogueTimer = setTimeout(
      complete,
      Math.max(6500, text.split(/\s+/).length * 330),
    );
  }
}

function advanceStory() {
  const c = BY_ID[state.reading.selected[state.reading.current]];
  const story = storyLines(c, state.dialogue.chapter);
  if (state.typing) {
    finishTyping();
    return;
  }
  clearTimeout(state.dialogueTimer);
  narrator.stop();
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
      r.finished = true;
      render();
    }
  }
}

function summary() {
  const r = state.reading;
  return page(
    `${heading("TIGA KARTU TERBUKA", "Bacaanmu selesai.")}
    <div class="result-cards">${r.selected.map((id, i) => `<button class="result-card" data-action="card-detail" data-id="${id}" aria-label="Baca lagi ${esc(BY_ID[id].name)}"><span class="result-position">${positions()[i].name}</span>${art(id)}<strong>${BY_ID[id].name}</strong></button>`).join("")}</div>
    ${question(r)}
    <div class="screen-actions"><button class="button primary" data-action="new">Mulai bacaan baru ${arrow}</button><button class="text-button" data-action="read-again">Baca kartu ini lagi</button></div>`,
    "reading-result",
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
    `${heading("78 KARTU TAROT", "Koleksi Lengkap Rider-Waite.")}
    <div class="library-toolbar">
      <input type="search" id="cardSearch" placeholder="Cari kartu atau makna…" value="${esc(state.search)}" aria-label="Cari kartu">
      <select id="suitFilter" aria-label="Kelompok kartu">
        <option value="all">Semua Kelompok</option>
        ${Object.entries(SUITS)
          .map(
            ([id, s]) =>
              `<option value="${id}" ${state.filter === id ? "selected" : ""}>${s.name}</option>`,
          )
          .join("")}
      </select>
    </div>
    <div class="library-grid" id="libraryGrid"></div>
    <div class="pagination" id="libraryPagination" aria-label="Halaman koleksi"></div>`,
    "library-screen",
  );
}

function fillLibrary() {
  const cards = filteredCards();
  const size = 6;
  const max = Math.max(0, Math.ceil(cards.length / size) - 1);
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
    : '<div class="empty-state"><span aria-hidden="true">✧</span><h2>Belum ketemu.</h2><p>Coba kata kunci atau kelompok yang lain.</p></div>';
  document.getElementById("libraryPagination").innerHTML =
    `<button class="icon-button" data-action="library-prev" aria-label="Halaman sebelumnya" ${state.libraryPage === 0 ? "disabled" : ""}>←</button><span role="status">${cards.length ? `${start + 1}–${Math.min(start + size, cards.length)} dari ${cards.length} kartu` : "0 kartu"}</span><button class="icon-button" data-action="library-next" aria-label="Halaman berikutnya" ${state.libraryPage === max ? "disabled" : ""}>→</button>`;
}

function closeModal() {
  modal.close();
}

function openModal(title, content, name = "") {
  narrator.stop();
  clearTimeout(state.dialogueTimer);
  state.typingJob++;
  finishTyping();

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
    `<div class="modal-card-top">${art(id)}<div><span class="pill">${SUITS[c.suit]?.name || "Arcana"}</span><h3>${c.indo}</h3><p>${c.keywords}</p></div></div>${explanation(c)}`,
    "card-dialog",
  );
}

function updateAudioUI() {
  const on = audioEnabled();
  const button = document.getElementById("soundToggle");
  if (!button) return;
  button.setAttribute("aria-pressed", String(on));
  button.setAttribute(
    "aria-label",
    on ? "Matikan musik dan efek suara" : "Nyalakan musik dan efek suara",
  );
  const svg = button.querySelector("svg");
  if (svg) {
    svg.innerHTML = on
      ? '<path d="M11 5 6 9H3v6h3l5 4zM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14"/>'
      : '<path d="M11 5 6 9H3v6h3l5 4zM16 9l5 6m0-6-5 6"/>';
  }
  const slider = document.getElementById("soundVolume");
  if (slider) slider.value = audioVolume();
  const label = document.getElementById("volumeLabel");
  if (label) label.textContent = `${audioVolume()}%`;
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
  const parts = (location.hash.slice(1) || "bacaan").split("/");
  let route = parts[0] === "main" ? state.route : parts[0];
  if (!["bacaan", "pilih", "baca", "kartu"].includes(route)) route = "bacaan";
  if (["pilih", "baca"].includes(route) && !state.reading) route = "bacaan";
  if (route === "baca" && state.reading.selected.length !== 3) route = "pilih";
  clearTimeout(state.typeTimer);
  clearTimeout(state.dialogueTimer);
  state.typingJob++;
  state.typing = false;
  narrator.stop({ disconnect: route === "kartu" });
  state.route = route;
  document.body.dataset.screen = route;
  closeModal();
  main.innerHTML = { bacaan: setup, pilih: pick, baca: reader, kartu: library }[
    route
  ]();
  const switcher = document.getElementById("roomSwitcher");
  if (switcher) {
    switcher.href = route === "kartu" ? "#" + resumeRoute() : "#kartu";
    switcher.textContent = route === "kartu" ? "Baca tarot" : "Lihat kartu";
  }
  const readingLink = document.querySelector("[data-reading-link]");
  if (readingLink) readingLink.href = "#bacaan";
  document.title = `${{ bacaan: "Baca Tarot", pilih: "Pilih Kartu", baca: "Bacaan Tarot", kartu: "Koleksi 78 Kartu" }[route]} — The Tarot Room`;
  if (route === "kartu") {
    fillLibrary();
    if (BY_ID[parts[1]]) cardModal(parts[1]);
  }
  if (route === "baca") startDialogue();
  if (route === "pilih") animateShuffle();
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

    state.passageLimit =
      innerHeight < 640 ? 115 : innerHeight < 740 ? 155 : 190;
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
  if (t.id === "question") updateTemplateSelection();

  if (t.id === "cardSearch") {
    state.search = t.value;
    state.libraryPage = 0;
    fillLibrary();
  }
  if (t.id === "soundVolume") {
    setVolume(t.value);
    const label = document.getElementById("volumeLabel");
    if (label) label.textContent = `${audioVolume()}%`;
  }
});

document.addEventListener("change", (event) => {
  const t = event.target;
  if (t.name === "topic") {
    state.form.topic = t.value;
    const topicData = TOPICS[t.value];
    if (topicData) {
      const qField = document.getElementById("question");
      if (qField) {
        qField.placeholder = topicData.question;
        if (topicData.templates && topicData.templates.length) {
          state.form.question = topicData.templates[0];
          qField.value = topicData.templates[0];
        }
      }
      const container = document.getElementById("questionTemplates");
      if (container && topicData.templates) {
        container.innerHTML = topicData.templates
          .map(
            (q) =>
              `<button type="button" class="template-chip ${state.form.question === q ? "active" : ""}" aria-pressed="${state.form.question === q}" data-action="use-template" data-question="${esc(q)}">
                <span class="chip-star" aria-hidden="true">${state.form.question === q ? "●" : "○"}</span>
                <span class="chip-text">${esc(q)}</span>
              </button>`,
          )
          .join("");
      }
    }
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
  const start = event.target.closest("[data-reading-link], #roomSwitcher");
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
    else if (action === "edit") setHash("bacaan");
    else if (action === "new") {
      state.reading = null;
      state.form.question = "";
      setHash("bacaan");
    } else if (action === "read-again") {
      r.finished = false;
      r.revealed = [];
      r.current = 0;
      state.dialogue.id = null;
      render();
    } else if (action === "use-template") {
      state.form.question = button.dataset.question;
      document.getElementById("question").value = state.form.question;
      updateTemplateSelection();
      sfx("select");
    } else if (action === "pick") {
      if (
        state.picking ||
        state.dealing ||
        main.querySelector(".shuffle-stack.shuffling")
      )
        return;
      state.picking = true;
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
      }
      r.candidates = shuffledCards().slice(0, 7);
      state.dealing = true;
      state.lastPick = null;
      sfx("shuffle");
      render({ focus: false });
    } else if (action === "start-reading") {
      if (r.selected.length !== 3) return;
      r.current = 0;
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
      state.revealUntil = 0;
      sfx("place");
      render({ focus: false });
    } else if (action === "story-next") advanceStory();
    else if (action === "story-finish") finishTyping();
    else if (action === "auto-read") {
      state.autoRead = !state.autoRead;
      clearTimeout(state.dialogueTimer);
      if (!state.autoRead) narrator.stop();
      button.setAttribute("aria-pressed", String(state.autoRead));
      button.textContent = state.autoRead ? "Ⅱ Jeda" : "▷ Lanjut otomatis";
      if (state.autoRead) startDialogue();
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
        if (!audioEnabled()) narrator.stop();
        else if (state.route === "baca") {
          narrator.unlock();
          startDialogue();
        }
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
  if (
    !modal.open &&
    state.route === "baca" &&
    state.autoRead &&
    !state.reading?.finished
  )
    startDialogue();
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
updateAudioUI();
render({ focus: false });

fetch("/api/config")
  .then((r) => (r.ok ? r.json() : null))
  .then((config) => {
    narrator.configure(config || {});
    state.voiceAvailable = narrator.mode !== "none";
    state.voiceMode = narrator.mode;
    if (state.route === "baca") render({ focus: false });
    else if (state.route === "bacaan") narrator.prefetch();
  })
  .catch(() => {
    narrator.configure({ narration: false });
    state.voiceAvailable = narrator.mode !== "none";
  });

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearTimeout(state.dialogueTimer);
    state.typingJob++;
    narrator.stop({ disconnect: true });
  }
});
