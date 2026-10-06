import { getCardClips, getClipText } from "./naskah.js?v=room-7";

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

export function cardStory(card, chapter = "makna", limit = 190, options = {}) {
  if (chapter === "gambar") return [getClipText(`${card.id}-M1`)].filter(Boolean);
  return getCardClips(card, chapter, options).map(getClipText).filter(Boolean);
}

export function nextChapter(chapter) {
  return (
    { makna: "langkah", gambar: "langkah", langkah: "refleksi" }[chapter] ||
    null
  );
}
