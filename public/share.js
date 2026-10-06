import { BY_ID } from "./deck.js";

export function websiteURL() {
  const canonical = document.querySelector('link[rel="canonical"]')?.href;
  const url = new URL(canonical || location.origin);
  return url.origin + "/";
}
function rounded(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}
function textLines(ctx, text, maxWidth) {
  const words = text.split(/\s+/),
    lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? line + " " + word : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
function centeredText(ctx, text, y, width, font, color, lineHeight = 40) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  for (const [i, line] of textLines(ctx, text, width).entries())
    ctx.fillText(line, 540, y + i * lineHeight);
}
async function cardImage(id) {
  const image = new Image();
  image.src = new URL(`/assets/cards/${id}.svg`, location.origin).href;
  await image.decode();
  return image;
}
export async function createShareImage(ids) {
  if (
    !Array.isArray(ids) ||
    ![1, 3].includes(ids.length) ||
    ids.some((id) => !BY_ID[id])
  )
    throw new Error("Kartu belum siap dibagikan.");
  const images = await Promise.all(ids.map(cardImage));
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Gambar belum didukung browser ini.");
  ctx.fillStyle = "#faf7f0";
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.fillStyle = "#222126";
  ctx.textAlign = "left";
  ctx.font = "bold 66px Arial, sans-serif";
  ctx.fillText("✦ sela", 72, 114);
  rounded(ctx, 803, 66, 205, 56, 16, "#ffedac");
  ctx.fillStyle = "#654d99";
  ctx.textAlign = "center";
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillText("KARTU HARI INI", 905, 102);
  centeredText(
    ctx,
    "Kartuku hari ini.",
    242,
    920,
    "bold 72px Arial, sans-serif",
    "#302948",
  );
  centeredText(
    ctx,
    "Kocok. Pilih. Buka.",
    301,
    920,
    "28px Arial, sans-serif",
    "#756f84",
  );
  rounded(ctx, 64, 358, 952, 674, 24, "#e8ddfb");
  const single = ids.length === 1,
    cardW = single ? 322 : 248,
    cardH = (cardW * 460) / 280,
    gap = 34,
    total = ids.length * cardW + (ids.length - 1) * gap,
    start = (1080 - total) / 2,
    top = single ? 380 : 430;
  for (let i = 0; i < ids.length; i++) {
    const x = start + i * (cardW + gap),
      c = BY_ID[ids[i]];
    ctx.save();
    ctx.shadowColor = "#51467520";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 6;
    rounded(ctx, x - 7, top - 7, cardW + 14, cardH + 14, 18, "#ffffff");
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, top, cardW, cardH, 11);
    ctx.clip();
    ctx.drawImage(images[i], x, top, cardW, cardH);
    ctx.restore();
    ctx.textAlign = "center";
    ctx.fillStyle = "#302948";
    ctx.font = `bold ${single ? 34 : 24}px Arial, sans-serif`;
    const names = textLines(ctx, c.name, cardW + 20);
    names.forEach((name, j) =>
      ctx.fillText(name, x + cardW / 2, top + cardH + 53 + j * 31),
    );
    ctx.fillStyle = "#776a8e";
    ctx.font = `${single ? 26 : 20}px Arial, sans-serif`;
    textLines(ctx, c.keywords, cardW + 20).forEach((line, j) =>
      ctx.fillText(
        line,
        x + cardW / 2,
        top + cardH + 53 + names.length * 31 + 14 + j * 27,
      ),
    );
  }
  rounded(ctx, 64, 1084, 952, 200, 22, "#f7b5cf");
  centeredText(
    ctx,
    "Ini kartuku. Giliran kamu?",
    1154,
    900,
    "bold 42px Arial, sans-serif",
    "#302948",
  );
  const link = websiteURL();
  const display = link.replace(/^https?:\/\//, "").replace(/\/$/, "");
  centeredText(
    ctx,
    "Main tarot gratis di Sela ✦",
    1201,
    900,
    "27px Arial, sans-serif",
    "#68578a",
  );
  let linkSize = 25;
  ctx.font = `bold ${linkSize}px Arial, sans-serif`;
  while (ctx.measureText(display).width > 840 && linkSize > 12) {
    linkSize--;
    ctx.font = `bold ${linkSize}px Arial, sans-serif`;
  }
  ctx.fillStyle = "#7458bb";
  ctx.textAlign = "center";
  ctx.fillText(display, 540, 1245);
  centeredText(
    ctx,
    "Untuk refleksi, bukan kepastian masa depan.",
    1320,
    920,
    "19px Arial, sans-serif",
    "#8d849a",
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Gambar belum berhasil dibuat.")),
      "image/png",
    ),
  );
}
