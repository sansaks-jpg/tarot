// Short, complete text passages for the visual novel reader.
export function passages(text, limit = 190) {
  const sentences = String(text).match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [""];
  const result = [];
  let current = "";
  for (const sentence of sentences) {
    const clean = sentence.trim();
    if ((current + " " + clean).trim().length > limit && current) {
      result.push(current);
      current = "";
    }
    if (clean.length > limit) {
      const words = clean.split(/\s+/);
      let part = "";
      for (const word of words) {
        if ((part + " " + word).trim().length > limit && part) {
          result.push(part);
          part = "";
        }
        part += (part ? " " : "") + word;
      }
      current = part;
    } else current += (current ? " " : "") + clean;
  }
  if (current) result.push(current);
  return result;
}

const SUIT_INSIGHTS = {
  major: [
    "Ada fase penting dalam perjalanan hidupmu yang sedang membentuk cara pandangmu.",
    "Ini energi yang cukup kuat—ada pergulatan batin atau ujian yang menuntutmu jujur pada dirimu sendiri.",
    "Ada transformasi bermakna yang sedang menunggumu saat kamu berani melangkah.",
  ],
  swords: [
    "Sepertinya pikiranmu belakangan ini terasa bising, ada banyak keraguan internal yang kamu simpan sendiri.",
    "Tantangan utamamu saat ini ada di kepala—perang kecil antara logika dan rasa cemas yang belum reda.",
    "Kuncinya adalah menjernihkan pikiran. Ketenangan akan membantumu melihat jalan keluar yang lebih terang.",
  ],
  cups: [
    "Ada rasa atau kerentanan hati yang selama ini kamu tahan-tahan agar tidak tumpah ke luar.",
    "Dinamika batinmu sedang bergejolak. Rasa lelah atau kecewa yang belum sempat kamu beri ruang bernafas.",
    "Kartu ini mengajak hatimu beristirahat. Dengarkan apa yang benar-benar membuat jiwamu merasa damai.",
  ],
  wands: [
    "Dorongan dan semangatmu sebenarnya ada, tapi energimu terasa terbagi ke terlalu banyak arah.",
    "Tantangannya adalah ritme. Jangan memaksakan diri berlari ketika nafasmu sendiri belum teratur.",
    "Fokuskan energimu ke satu hal yang paling bermakna. Nyalakan apimu perlahan tanpa membakar dirimu.",
  ],
  pentacles: [
    "Kamu sedang sangat membutuhkan pijakan yang nyata dan rasa aman yang bisa diandalkan.",
    "Kekhawatiran tentang kestabilan hidup atau hasil nyata sedang membayangi langkahmu.",
    "Langkah kecil yang konsisten akan jadi jangkar terbaikmu. Hasil nyata akan tumbuh dari ketelatenan.",
  ],
};

function formatMeaning(card, options = {}) {
  const pos = Number.isInteger(options.position) ? options.position : -1;
  const suit = card.suit || "major";
  const insight = (SUIT_INSIGHTS[suit] || SUIT_INSIGHTS.major)[Math.max(0, Math.min(pos, 2))];

  if (pos === 0) {
    return `Lihat kartu pertamamu, ${card.indo}. Sepertinya ada hal yang selama ini mengendap dalam dirimu. ${insight} Kartu ini menangkap: ${card.meaning}`;
  }
  if (pos === 1) {
    return `Lalu di kartu kedua, ${card.indo} memperlihatkan apa yang sedang bergulat di batinmu. ${insight} Kartu ini membaca: ${card.meaning}`;
  }
  if (pos === 2) {
    return `Dan untuk kartu penutup, ${card.indo} hadir seperti lentera kecil untuk langkahmu. ${insight} Kartu ini mengingatkan: ${card.meaning}`;
  }
  return `Di balik ${card.indo}, sepertinya ada proses penting yang sedang berlangsung dalam dirimu. ${card.meaning}`;
}

export function cardStory(card, chapter = "makna", limit = 190, options = {}) {
  if (chapter === "gambar") {
    return card.symbols.flatMap((text) =>
      passages(`Perhatikan simbolnya: ${text}`, limit),
    );
  }
  if (chapter === "langkah") {
    return passages(`Kalau kita bawa ke langkah nyata sehari-hari: ${card.action}`, limit);
  }
  if (chapter === "refleksi") {
    return passages(`Bawa pertanyaan ini mengendap sejenak di hatimu: ${card.prompt}`, limit);
  }
  return passages(formatMeaning(card, options), limit);
}

export function nextChapter(chapter) {
  return (
    { makna: "langkah", gambar: "langkah", langkah: "refleksi" }[chapter] ||
    null
  );
}
