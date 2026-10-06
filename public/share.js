import { BY_ID, POSITIONS } from "./deck.js?v=room-7";

export function websiteURL() {
  const canonical = document.querySelector('link[rel="canonical"]')?.href;
  const url = new URL(canonical || location.origin);
  url.search = "";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/+$/, "") + "/";
  return url.href;
}

export function shareInvitation(ids) {
  const cards = ids.map(id => BY_ID[id]?.name).filter(Boolean).join(", ");
  return `Tiga kartu yang menemani ceritaku hari ini: ${cards}.\n\nYuk, baca tiga kartumu bareng Sela di The Tarot Room!\n${websiteURL()}`;
}

function shareFile(blob) {
  return new File([blob], "bacaanku-the-tarot-room.png", { type: "image/png" });
}

export function canSharePhoto(blob) {
  if (!blob || !navigator.share || !navigator.canShare) return false;
  try { return navigator.canShare({ files: [shareFile(blob)] }); }
  catch { return false; }
}

export async function sharePhoto(blob, ids) {
  if (!canSharePhoto(blob)) return false;
  try {
    await navigator.share({ title: "Bacaanku di The Tarot Room", text: shareInvitation(ids), files: [shareFile(blob)] });
    return true;
  } catch (error) {
    if (error.name === "AbortError") return true; // A cancelled share does not download a file.
    return false;
  }
}

function textLines(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? line + " " + word : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
    // A long configured URL must stay readable and inside the photograph.
    while (ctx.measureText(line).width > maxWidth) {
      const chars = Array.from(line);
      let end = chars.length - 1;
      while (end > 1 && ctx.measureText(chars.slice(0, end).join("")).width > maxWidth) end--;
      lines.push(chars.slice(0, end).join(""));
      line = chars.slice(end).join("");
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function imageAsset(path) {
  const image = new Image();
  image.src = new URL(path, location.origin).href;
  await image.decode();
  return image;
}

async function optionalAsset(path) {
  try { return await imageAsset(path); }
  catch { return null; }
}

export async function createShareImage(ids) {
  if (
    !Array.isArray(ids) ||
    ![1, 3].includes(ids.length) ||
    ids.some((id) => !Object.hasOwn(BY_ID, id))
  ) {
    throw new Error("Kartu belum siap dibagikan.");
  }

  const [images, logo, table] = await Promise.all([
    Promise.all(ids.map(id => imageAsset(`/assets/cards/${id}.webp`))),
    optionalAsset("/assets/brand.webp"),
    optionalAsset("/assets/felt.webp"),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Gambar belum didukung browser ini.");

  const single = ids.length === 1;
  const sans = '"Segoe UI", Arial, sans-serif';
  const serif = 'Georgia, "Times New Roman", serif';
  const ink = "#fff1e0", muted = "#e0c5b2";
  // The same cloth as the room, with a quiet fade for legible type.
  ctx.fillStyle = "#471720";
  ctx.fillRect(0, 0, 1080, 1350);
  if (table) {
    const scale = Math.max(1080 / table.width, 1350 / table.height);
    const width = table.width * scale, height = table.height * scale;
    ctx.drawImage(table, (1080 - width) / 2, (1350 - height) / 2, width, height);
  }
  const shade = ctx.createLinearGradient(0, 0, 0, 1350);
  shade.addColorStop(0, "rgba(28, 8, 14, .48)");
  shade.addColorStop(.48, "rgba(28, 8, 14, .12)");
  shade.addColorStop(1, "rgba(28, 8, 14, .62)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 1080, 1350);
  if (logo) {
    const logoW = 200;
    const logoH = (logo.height / logo.width) * logoW;
    ctx.drawImage(logo, 808, 62, logoW, logoH);
  } else {
    ctx.fillStyle = muted;
    ctx.textAlign = "right";
    ctx.font = `600 22px ${sans}`;
    ctx.fillText("THE TAROT ROOM", 1008, 112);
  }
  ctx.textAlign = "left";
  ctx.font = `600 24px ${sans}`;
  ctx.fillStyle = muted;
  ctx.fillText(single ? "BACAAN SATU KARTU" : "BACAAN TIGA KARTU", 72, 112);
  ctx.font = `74px ${serif}`;
  ctx.fillStyle = ink;
  ctx.fillText("Bacaanku hari ini.", 72, 219);
  ctx.font = `28px ${sans}`;
  ctx.fillStyle = muted;
  ctx.fillText("Bersama Sela", 72, 273);

  const cardW = single ? 340 : 296;
  const cardH = (cardW * 466) / 280;
  const gap = 24;
  const total = ids.length * cardW + (ids.length - 1) * gap;
  const start = (1080 - total) / 2;
  const top = single ? 320 : 372;

  for (let i = 0; i < ids.length; i++) {
    const x = start + i * (cardW + gap);
    const c = BY_ID[ids[i]];
    const pos = single
      ? { name: "Kartumu" }
      : POSITIONS[i] || { name: `Kartu ${i + 1}` };

    ctx.fillStyle = muted;
    ctx.font = `27px ${sans}`;
    ctx.textAlign = "left";
    ctx.fillText(pos.name, x, top - 28);

    // A small cast shadow makes the original cards sit on the cloth.
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, .38)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = "#f0e9dd";
    ctx.beginPath();
    ctx.roundRect(x, top, cardW, cardH, 4);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, top, cardW, cardH, 4);
    ctx.clip();
    ctx.drawImage(images[i], x, top, cardW, cardH);
    ctx.restore();

    ctx.fillStyle = ink;
    ctx.font = `36px ${serif}`;
    const names = textLines(ctx, c.name, cardW);
    names.forEach((name, j) => {
      ctx.fillText(name, x, top + cardH + 58 + j * 44);
    });
    ctx.fillStyle = muted;
    ctx.font = `27px ${sans}`;
    textLines(ctx, c.keywords, cardW).forEach((line, j) => {
      ctx.fillText(line, x, top + cardH + 58 + Math.max(2, names.length) * 44 + 12 + j * 34);
    });
  }

  ctx.fillStyle = "rgba(255, 241, 224, .3)";
  ctx.fillRect(72, 1114, 936, 1);
  ctx.fillStyle = ink;
  ctx.font = `40px ${serif}`;
  ctx.fillText("Yuk, baca kartumu bareng Sela.", 72, 1185);
  const link = websiteURL();
  const display = link.replace(/^https?:\/\//, "").replace(/\/$/, "");
  let linkSize = 32;
  ctx.font = `600 ${linkSize}px ${sans}`;
  while (textLines(ctx, display, 936).length > 2 && linkSize > 22) {
    linkSize--;
    ctx.font = `600 ${linkSize}px ${sans}`;
  }
  ctx.fillStyle = muted;
  textLines(ctx, display, 936).forEach((line, i) => ctx.fillText(line, 72, 1240 + i * 38));

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
