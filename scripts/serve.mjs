import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const port = Number(process.env.PORT || 8080);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".txt": "text/plain; charset=utf-8",
};

export async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405);
    res.end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(
      url.pathname === "/" ? "/index.html" : url.pathname,
    );
  } catch {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }
  const file = path.resolve(dist, "." + pathname);
  const relative = path.relative(dist, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  let stat;
  try {
    stat = await fs.promises.stat(file);
  } catch {}
  if (!stat?.isFile()) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const ext = path.extname(file).toLowerCase();
  const headers = {
    "Content-Type": mime[ext] || "application/octet-stream",
    "Cache-Control": [".html", ".js", ".css"].includes(ext)
      ? "no-cache"
      : "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  };
  let start = 0,
    end = stat.size - 1,
    status = 200;
  if (req.headers.range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (match && (match[1] || match[2])) {
      start = match[1]
        ? Number(match[1])
        : Math.max(0, stat.size - Number(match[2]));
      end =
        match[1] && match[2]
          ? Math.min(Number(match[2]), stat.size - 1)
          : stat.size - 1;
    } else start = stat.size;
    if (start >= stat.size || end < start) {
      res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
      res.end();
      return;
    }
    status = 206;
    headers["Content-Range"] = `bytes ${start}-${end}/${stat.size}`;
  }
  headers["Content-Length"] = end - start + 1;
  res.writeHead(status, headers);
  if (req.method === "HEAD") res.end();
  else fs.createReadStream(file, { start, end }).pipe(res);
}

const server = http.createServer((req, res) => {
  handle(req, res).catch(() => {
    if (!res.headersSent) res.writeHead(500);
    res.end("Permintaan belum berhasil.");
  });
});
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  server.listen(port, "0.0.0.0", () => {
    console.log(`The Tarot Room: http://localhost:${port}`);
    for (const addresses of Object.values(os.networkInterfaces()))
      for (const address of addresses || []) {
        if (address.family === "IPv4" && !address.internal)
          console.log(`Wi-Fi / LAN: http://${address.address}:${port}`);
      }
  });
