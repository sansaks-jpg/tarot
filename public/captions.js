// Phrase timing follows the decoded recording's duration and playback clock.
// The recordings do not include word timestamps; punctuation gives readable cuts.
export function captionSegments(text) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const segments = [];
  let phrase = [], start = 0;
  for (let i = 0; i < words.length; i++) {
    phrase.push(words[i]);
    if (phrase.length >= 6 || (phrase.length >= 3 && /[,.!?;:]$/.test(words[i])) || i === words.length - 1) {
      segments.push({ text: phrase.join(" "), start, end: i + 1, total: words.length });
      start = i + 1;
      phrase = [];
    }
  }
  return segments;
}

export function captionIndex(segments, elapsed, duration) {
  if (!segments.length) return -1;
  const progress = duration > 0 ? Math.max(0, Math.min(1, elapsed / duration)) : 1;
  const word = progress * segments[0].total;
  return Math.max(0, segments.findLastIndex(segment => word >= segment.start));
}
