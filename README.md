# Tarot — Sela

Website tarot berbahasa Indonesia: 78 kartu, bacaan 1 atau 3 kartu, kamus kartu,
catatan lokal, ekspor, animasi, musik, dan efek suara. Semua berjalan di browser;
tidak memerlukan backend, API key, database, atau login.

## Cloudflare Pages dari GitHub

Di Cloudflare, buat **Pages project → Connect to Git**, lalu pilih repo `tarot`.
Untuk repo private, beri integrasi Cloudflare akses ke repo ini.

| Pengaturan | Nilai |
| --- | --- |
| Production branch | `main` |
| Framework preset | `None` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | kosong (root repo) |
| Environment variable | `NODE_VERSION=22` |

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

Gunakan Node.js 22 atau lebih baru. Tidak ada dependency npm.

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
- `scripts/card-art.py`: generator ilustrasi kartu, tanpa dependency Python tambahan.
- `dist/`: hasil build, tidak disimpan di Git.

Untuk menggambar ulang kartu: `python3 scripts/card-art.py`, kemudian build lagi.
Gambar sosial sudah tersedia di `public/assets/social.png`.

Pertanyaan dan catatan diproses di perangkat pengunjung. Catatan tersimpan di
localStorage browser tersebut, tidak disinkronkan antarperangkat atau domain.
Pengunjung yang berpindah dari domain lama perlu mengekspor catatannya sendiri.
Tarot disajikan sebagai bahan refleksi.
