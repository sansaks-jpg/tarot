# Tarot — Sela

Website tarot berbahasa Indonesia: 78 kartu, bacaan 1 atau 3 kartu, pembaca
bergaya visual novel dengan bubble chat, jurnal lokal, ekspor, share gambar PNG,
animasi kartu, musik, dan efek suara. UI mobile memakai layar yang ringkas, tombol
lanjut selalu terlihat, serta koleksi dan jurnal dengan pagination.

Narasi suara satu arah memakai Gemini 3.8 Live melalui Cloudflare Pages Functions.
Tanpa API key, seluruh alur tarot, teks bubble, musik, dan share tetap berjalan.
Tidak memakai database, login, atau mikrofon.

## Cloudflare Pages dari GitHub

Di Cloudflare, buat **Pages project → Connect to Git**, lalu pilih repo `tarot`.
Untuk repo private, beri integrasi Cloudflare akses ke repo ini.

| Pengaturan             | Nilai              |
| ---------------------- | ------------------ |
| Production branch      | `main`             |
| Framework preset       | `None`             |
| Build command          | `npm run build`    |
| Build output directory | `dist`             |
| Root directory         | kosong (root repo) |
| Environment variable   | `NODE_VERSION=22`  |

Push ke `main` akan memicu deployment otomatis setelah integrasi terhubung.
Ini konfigurasi **Cloudflare Pages**, bukan Workers. Tidak perlu deploy command.

Opsional: set `SITE_URL=https://domain-kamu.com` untuk canonical URL, Open Graph,
dan sitemap, lalu redeploy. Tanpa `SITE_URL`, build memakai `CF_PAGES_URL` yang
disediakan Cloudflare. Untuk preview deployment, jangan set `SITE_URL` production
jika ingin metadata menunjuk ke URL preview. Build lokal tanpa kedua variabel
tersebut tetap berjalan, tanpa canonical dan sitemap. Domain hosting lama sudah
dihapus dari source.

Routing memakai hash (`#bacaan`, `#kamus`, dan lainnya), sehingga tidak memerlukan
rewrite atau server routing. `_headers` menambahkan header dasar untuk Pages.

## Lokal dan pemeriksaan

Gunakan Node.js 22 atau lebih baru. Tidak ada dependency npm untuk aplikasi.

```bash
npm run build
python3 -m http.server 8080 --directory dist
```

Buka http://localhost:8080. Jalankan `npm run check` untuk memeriksa 78 kartu,
aset, syntax JavaScript, alur bacaan, penyimpanan/ekspor, validasi input, dan
template antarmuka. Pemeriksaan template menggunakan adapter DOM; bukan browser.

## Struktur

- `public/`: source website dan aset statis yang diedit langsung.
- `scripts/build.mjs`: menyalin source ke `dist/` dan menyiapkan metadata domain.
- `scripts/check.mjs`, `scripts/ui-check.mjs`: pemeriksaan aplikasi.
- `functions/api/`: konfigurasi narasi dan token sementara Gemini Live.
- `public/narrator.js`: pemutar streaming PCM satu arah tanpa mikrofon.
- `public/share.js`: gambar share 1080 × 1350 yang dibuat di browser.
- `scripts/card-art.py`: generator ilustrasi kartu, tanpa dependency Python tambahan.
- `dist/`: hasil build, tidak disimpan di Git.

Untuk menggambar ulang kartu: `python3 scripts/card-art.py`, kemudian build lagi.
Gambar sosial sudah tersedia di `public/assets/social.png`.

## Gemini 3.8 Live: environment Cloudflare

Buka project **Pages → Settings → Variables and Secrets**. Isi untuk environment
Production (dan Preview bila ingin menguji narasi di preview):

| Nama                  | Jenis              | Nilai                                                                  |
| --------------------- | ------------------ | ---------------------------------------------------------------------- |
| `GEMINI_API_KEY`      | Secret (encrypted) | API key dari Google AI Studio yang memiliki akses Live API             |
| `GEMINI_LIVE_MODEL`   | Variable           | `gemini-3.8-live` (default bila kosong)                                |
| `GEMINI_LIVE_VOICE`   | Variable           | `Aoede` (default; bisa diganti voice Gemini Live yang didukung)        |
| `GEMINI_LIVE_ENABLED` | Variable, opsional | `false` untuk menonaktifkan narasi; selain itu aktif bila key tersedia |
| `SITE_URL`            | Variable, opsional | URL production, misalnya `https://tarot.example.com`                   |

**Redeploy setelah mengatur environment.** Gunakan key sebagai runtime secret
Pages Functions, bukan variable publik atau kode JavaScript. Folder `functions/`
berada di root repo; Cloudflare membundlenya otomatis. `_routes.json` membatasi
pemanggilan Function pada `/api/*`, sehingga file statis tetap dilayani sebagai aset.

Alur narasi: browser meminta token ke `POST /api/live-token` → Function memakai
API key server untuk membuat token sekali pakai → browser membuka WebSocket Live
API dengan token sementara → Gemini mengembalikan audio PCM. Token dikunci ke
model, voice, instruksi membaca, dan batas output; berlaku 5 menit, dengan 1 menit
untuk membuka sesi. API key utama tidak pernah dikirim ke browser.

Sela membacakan teks bubble dalam bahasa Indonesia dengan gaya bercerita. Teks
kartu tetap menjadi acuan; model diminta membacakan tanpa menambah tafsir. Saat
pindah bubble/tab, menutup layar, mematikan suara, atau menyembunyikan tab,
audio lama dihentikan. Musik mengecil otomatis saat narasi berjalan. Suara default nyala dan volume awal
100% untuk musik/SFX/narasi; slider manual mengatur semuanya. Tombol ♪ di sebelah
nama Sela bisa mematikan narasi saja. Autoplay dicoba saat halaman dibuka. Bila kebijakan browser menahan audio, suara
langsung aktif pada sentuhan pertama di mana pun tanpa tombol unmute.

Jika key, model, kuota, jaringan, atau WebSocket bermasalah, cerita teks tetap
berjalan dan status kegagalan muncul pada bubble. Tidak ada permintaan mikrofon.
Hanya nama kartu dan teks publik yang sedang dibaca dikirim ke Gemini, bukan
pertanyaan atau catatan pribadi. API Gemini mengikuti billing/kuota akun Google.
Endpoint token memakai pengecekan same-origin. Untuk situs publik, atur rate limit
Cloudflare pada `/api/live-token` sesuai anggaran akun; same-origin bukan autentikasi.

Referensi resmi:
[Gemini 3.8 Live](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live),
[ephemeral tokens](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens),
[WebSocket reference](https://ai.google.dev/api/live).

Untuk dev lokal dengan Pages Functions:

```bash
npm run build
npx wrangler pages dev dist
```

Simpan key lokal dalam `.dev.vars` (diabaikan Git), misalnya dengan nama variable
`GEMINI_API_KEY`. Jangan commit nilainya. Server Python hanya melayani file statis
untuk melihat UI; narasi memerlukan Pages Functions.

## Share & penyimpanan

Share hasil membuat gambar berisi 1 atau 3 kartu, kata kunci, serta ajakan bermain
melalui URL website. Pertanyaan dan catatan pribadi tidak masuk gambar. Di browser
yang mendukung Web Share file, tombol **Bagikan** membuka menu share perangkat;
di browser lain gambar diunduh sebagai PNG. Tombol **Simpan PNG** dan **Salin link**
tersedia juga. URL memakai `SITE_URL`/canonical jika tersedia, atau domain saat ini.
Web Share memerlukan HTTPS (localhost bisa untuk pengujian).

Pertanyaan dan catatan diproses di perangkat pengunjung. Catatan tersimpan di
localStorage browser tersebut, tidak disinkronkan antarperangkat atau domain.
Pengunjung yang berpindah dari domain lama perlu mengekspor catatannya sendiri.
Tarot disajikan sebagai bahan refleksi.
