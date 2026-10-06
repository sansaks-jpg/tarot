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
    "Bukan buat nakut-nakutin ya, tapi mengajakmu jujur pada apa yang sedang terjadi.",
    "Ada transformasi bermakna yang sedang menunggumu saat kamu berani melangkah.",
  ],
  swords: [
    "Sepertinya belakangan ini pikiranmu lagi bising banget, ada pergulatan internal yang kamu tahan sendiri.",
    "Tantangan terbesarmu ada di kepalamu sendiri—perang kecil antara logika dan rasa cemas.",
    "Ketenangan batin adalah kuncinya untuk menjernihkan kabut di kepalamu.",
  ],
  cups: [
    "Ada rasa atau kerentanan hati yang selama ini kamu tahan-tahan agar tidak tumpah ke luar.",
    "Nafas dulu pelan-pelan... dinamika batinmu sedang butuh ruang untuk bernafas.",
    "Dengarkan apa yang benar-benar membuat jiwamu merasa damai kembali.",
  ],
  wands: [
    "Api dan semangatmu sebenarnya ada, tapi energimu terasa terbagi ke terlalu banyak arah.",
    "Jangan memaksakan diri berlari ketika nafasmu sendiri belum teratur.",
    "Satukan kembali energimu pada satu hal yang paling bermakna.",
  ],
  pentacles: [
    "Ini menyangkut hal nyata—sepertinya kamu lagi sangat membutuhkan kepastian dan rasa aman.",
    "Kekhawatiran tentang kestabilan hidup atau hasil nyata sedang membayangi langkahmu.",
    "Langkah kecil yang konsisten akan jadi jangkar terbaikmu untuk sampai ke tempat yang aman.",
  ],
};

function formatMeaning(card, options = {}) {
  const pos = Number.isInteger(options.position) ? options.position : -1;
  const suit = card.suit || "major";
  const insight = (SUIT_INSIGHTS[suit] || SUIT_INSIGHTS.major)[Math.max(0, Math.min(pos, 2))];

  if (pos === 0) {
    const filler = suit === "swords" ? "Waduh..." : suit === "wands" ? "Wah..." : "Emmm...";
    return `${filler} lihat kartu pertamamu, ${card.indo}. ${insight} Kartu ini menangkap: ${card.meaning}`;
  }
  if (pos === 1) {
    const filler = suit === "swords" || suit === "major" || suit === "pentacles" ? "Waduh..." : "Emmm...";
    return `${filler} lalu di kartu kedua, ${card.indo} memperlihatkan apa yang sedang bergulat di batinmu. ${insight} Kartu ini membaca: ${card.meaning}`;
  }
  if (pos === 2) {
    const filler = suit === "cups" || suit === "major" ? "Wah..." : "Hmm...";
    return `${filler} dan untuk kartu penutup, ${card.indo} hadir seperti lentera kecil untuk langkahmu. ${insight} Kartu ini mengingatkan: ${card.meaning}`;
  }
  return `Emmm... di balik ${card.indo}, sepertinya ada proses penting yang sedang berlangsung dalam dirimu. ${card.meaning}`;
}

export function cardStory(card, chapter = "makna", limit = 190, options = {}) {
  if (chapter === "gambar") {
    return card.symbols.flatMap((text) =>
      passages(`Coba perhatikan detail simbolnya... ${text}`, limit),
    );
  }
  if (chapter === "langkah") {
    return passages(`Emmm, kalau kita bawa ke langkah nyata sehari-hari: ${card.action}`, limit);
  }
  if (chapter === "refleksi") {
    return passages(`Coba renungkan sejenak di dalam hatimu... ${card.prompt}`, limit);
  }
  return passages(formatMeaning(card, options), limit);
}

export function nextChapter(chapter) {
  return (
    { makna: "langkah", gambar: "langkah", langkah: "refleksi" }[chapter] ||
    null
  );
}
