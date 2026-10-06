import { BY_ID, POSITIONS } from "./deck.js?v=room-4";

export function websiteURL() {
  const canonical = document.querySelector('link[rel="canonical"]')?.href;
  const url = new URL(canonical || location.origin);
  return url.origin + "/";
}

function rounded(ctx, x, y, w, h, r, fill, stroke = null, lineWidth = 1) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
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
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function centeredText(ctx, text, y, width, font, color, lineHeight = 40) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  for (const [i, line] of textLines(ctx, text, width).entries()) {
    ctx.fillText(line, 540, y + i * lineHeight);
  }
}

async function cardImage(id) {
  const image = new Image();
  image.src = new URL(`/assets/cards/${id}.webp`, location.origin).href;
  await image.decode();
  return image;
}

async function loadLogo() {
  try {
    const img = new Image();
    img.src = new URL("/assets/brand.webp", location.origin).href;
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

export async function createShareImage(ids) {
  if (
    !Array.isArray(ids) ||
    ![1, 3].includes(ids.length) ||
    ids.some((id) => !BY_ID[id])
  ) {
    throw new Error("Kartu belum siap dibagikan.");
  }

  const [images, logo] = await Promise.all([
    Promise.all(ids.map(cardImage)),
    loadLogo(),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Gambar belum didukung browser ini.");

  // Base background: Mystic Black Velvet (#161817) with subtle warm radial glow
  ctx.fillStyle = "#161817";
  ctx.fillRect(0, 0, 1080, 1350);

  const radial = ctx.createRadialGradient(540, 675, 50, 540, 675, 750);
  radial.addColorStop(0, "rgba(122, 29, 36, 0.45)"); // Deep velvet red glow
  radial.addColorStop(0.7, "rgba(58, 42, 26, 0.2)"); // Rustic wood
  radial.addColorStop(1, "rgba(22, 24, 23, 0.95)");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, 1080, 1350);

  // Outer border with Celestial Gold (#E5AB3A)
  ctx.strokeStyle = "#E5AB3A";
  ctx.lineWidth = 3;
  ctx.strokeRect(36, 36, 1008, 1278);
  ctx.strokeStyle = "rgba(229, 171, 58, 0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(46, 46, 988, 1258);

  // Logo rendering
  if (logo) {
    const logoW = 320;
    const logoH = (logo.height / logo.width) * logoW;
    ctx.drawImage(logo, (1080 - logoW) / 2, 70, logoW, logoH);
  } else {
    ctx.fillStyle = "#E5AB3A";
    ctx.textAlign = "center";
    ctx.font = "bold 56px 'Times New Roman', serif";
    ctx.fillText("THE TAROT ROOM", 540, 130);
  }

  // Tagline & Badge
  rounded(ctx, 390, 240, 300, 46, 23, "#7A1D24", "#E5AB3A", 1.5);
  ctx.fillStyle = "#F6EDDC";
  ctx.textAlign = "center";
  ctx.font = "bold 20px -apple-system, sans-serif";
  ctx.fillText("BACAAN 3 KARTU", 540, 270);

  centeredText(
    ctx,
    "Masa lalu · Masa kini · Masa depan",
    330,
    900,
    "30px -apple-system, sans-serif",
    "#F6EDDC",
  );

  // Cards Table Altar Inset (Deep Velvet Red #7A1D24)
  rounded(ctx, 60, 370, 960, 670, 24, "rgba(122, 29, 36, 0.5)", "#E5AB3A", 2);

  const single = ids.length === 1;
  const cardW = single ? 340 : 256;
  const cardH = (cardW * 460) / 280;
  const gap = 38;
  const total = ids.length * cardW + (ids.length - 1) * gap;
  const start = (1080 - total) / 2;
  const top = single ? 420 : 440;

  for (let i = 0; i < ids.length; i++) {
    const x = start + i * (cardW + gap);
    const c = BY_ID[ids[i]];
    const pos = single
      ? { name: "Kartumu" }
      : POSITIONS[i] || { name: `Kartu ${i + 1}` };

    // Position Header Tag
    ctx.fillStyle = "#E5AB3A";
    ctx.font = "bold 20px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(pos.name.toUpperCase(), x + cardW / 2, top - 18);

    // Card Glow & Frame
    ctx.save();
    ctx.shadowColor = "rgba(229, 171, 58, 0.4)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;
    rounded(
      ctx,
      x - 5,
      top - 5,
      cardW + 10,
      cardH + 10,
      14,
      "#161817",
      "#E5AB3A",
      2,
    );
    ctx.restore();

    // Draw Card Image
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, top, cardW, cardH, 10);
    ctx.clip();
    ctx.drawImage(images[i], x, top, cardW, cardH);
    ctx.restore();

    // Card Title
    ctx.textAlign = "center";
    ctx.fillStyle = "#F6EDDC";
    ctx.font = `bold ${single ? 32 : 23}px -apple-system, sans-serif`;
    const names = textLines(ctx, c.name, cardW + 20);
    names.forEach((name, j) => {
      ctx.fillText(name, x + cardW / 2, top + cardH + 42 + j * 28);
    });

    // Keywords
    ctx.fillStyle = "#E5AB3A";
    ctx.font = `${single ? 24 : 18}px -apple-system, sans-serif`;
    textLines(ctx, c.keywords, cardW + 20).forEach((line, j) => {
      ctx.fillText(
        line,
        x + cardW / 2,
        top + cardH + 42 + names.length * 28 + 10 + j * 24,
      );
    });
  }

  // Footer banner
  rounded(
    ctx,
    60,
    1070,
    960,
    160,
    20,
    "#161817",
    "rgba(229, 171, 58, 0.6)",
    1.5,
  );
  centeredText(
    ctx,
    "Buka tiga kartumu di The Tarot Room",
    1125,
    900,
    "bold 32px -apple-system, sans-serif",
    "#F6EDDC",
  );

  const link = websiteURL();
  const display = link.replace(/^https?:\/\//, "").replace(/\/$/, "");
  let linkSize = 24;
  ctx.font = `bold ${linkSize}px -apple-system, sans-serif`;
  while (ctx.measureText(display).width > 800 && linkSize > 12) {
    linkSize--;
    ctx.font = `bold ${linkSize}px -apple-system, sans-serif`;
  }
  ctx.fillStyle = "#E5AB3A";
  ctx.textAlign = "center";
  ctx.fillText(display, 540, 1175);

  centeredText(
    ctx,
    "Makna kartu adalah refleksi & sudut pandang baru.",
    1280,
    900,
    "18px -apple-system, sans-serif",
    "rgba(246, 237, 220, 0.65)",
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
