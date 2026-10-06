# The Tarot Room

Game tarot tiga kartu untuk HP dan desktop. Pengunjung memilih topik dan pertanyaan, mengambil tiga kartu, lalu mendengarkan Sela membacakan satu per satu. Tanpa akun. Game langsung membuka pilihan pertanyaan; tersedia koleksi kartu terpisah, tanpa beranda, riwayat, atau jurnal.

## Lokal

`npm run build` menyiapkan `dist`. `npm run serve` menyajikan game dan endpoint Gemini pada satu server di port 8080, terikat ke `0.0.0.0`. Bila server sudah berjalan, build saja; jangan menjalankan server kedua.

Buka `http://localhost:8080`. Di HP pada Wi-Fi yang sama, gunakan alamat LAN komputer dan port 8080. Alamat yang terdeteksi dicetak saat server mulai.

Salin `.env.example` ke `.env` hanya jika `.env` belum ada. Pertahankan key yang sudah diisi:

```dotenv
GEMINI_API_KEY=key_kamu
GEMINI_LIVE_MODEL=gemini-3.8-live
GEMINI_LIVE_VOICE=Aoede
SITE_URL=http://localhost:8080
```

`.env` tidak ikut Git atau hasil build. Server membaca konfigurasi setiap permintaan API, sehingga mengisi/mengganti key tidak memerlukan restart. Perubahan kode server/Functions memerlukan satu muat ulang proses server.

## Cloudflare Pages

Build command: `npm run build`. Output directory: `dist`. Root `functions/api` menyediakan `/api/config` dan `/api/live-token`.

Pakai nama variabel yang sama pada konfigurasi Pages:

```dotenv
GEMINI_API_KEY=key_kamu
GEMINI_LIVE_MODEL=gemini-3.8-live
GEMINI_LIVE_VOICE=Aoede
SITE_URL=https://domain-kamu
```

Simpan `GEMINI_API_KEY` sebagai secret. `SITE_URL` merupakan alamat publik untuk canonical dan sitemap; tetapkan juga pada environment build Pages. Jangan memasukkan key ke kode browser atau `public`.

## Suara

Browser meminta token sementara ke server, lalu tersambung langsung ke Gemini Live. REST token memakai `bidiGenerateContentSetup` untuk mengunci model, voice dan instruksi. Konfigurasi `liveConnectConstraints` adalah bentuk SDK, bukan field REST yang diterima endpoint saat pemeriksaan ini.

Satu koneksi dipakai sepanjang sesi. Bacaan pertama disiapkan saat tiga kartu sudah dipilih; bagian berikutnya disiapkan saat bagian saat ini berbicara. PCM dimainkan per potongan dengan penyangga 35 ms, tanpa menunggu satu respons selesai. Latensi layanan/jaringan tetap dapat terjadi. Suara hanya Gemini; jika layanan gagal, pesan di game meminta pemain melanjutkan dengan teks.

Pertanyaan pribadi tidak dikirim ke Gemini. Hanya nama kartu dan teks bacaan yang dikirim. Suara dimulai setelah sentuhan pemain. Musik memakai berkas ambient dengan loop, efek memakai rekaman kartu; musik mengecil saat Sela berbicara. Tombol volume mengatur musik, efek dan narasi.

Layar pemilihan dan bacaan mengikuti tinggi viewport HP. Teks narasi dibagi menjadi bagian pendek; bagian berikutnya muncul setelah suara selesai, dan pemain membuka setiap kartu sendiri. Kartu yang terbuka dapat disentuh untuk melihat detail. Koleksi kartu memakai halaman terpisah.

## Aset

78 kartu Rider–Waite–Smith dari [TarotCards — mixvlad](https://github.com/mixvlad/TarotCards/tree/main/tarot/rider-waite), dipilih karena gambar dan simbol cocok dengan isi deck. Gambar 400 px dan thumbnail 240 px dikompresi WebP. Foto asli dan SVG lama tetap tersimpan di sumber, tetapi tidak disalin ke build.

Foto ruang/pembaca merupakan aset generatif. Palette dan logo mengikuti referensi pemilik. Sumber, lisensi, perubahan ukuran, dan catatan pembuatan ada di [docs/asset-notes.md](docs/asset-notes.md). Musik dan efek dimuat setelah interaksi; koleksi kartu dimuat bertahap.

## Pemeriksaan

`npm run check` memeriksa data 78 kartu, batas tiga kartu, simpan/ekspor, input HTML, template layar, konfigurasi Cloudflare, penjadwalan PCM/koneksi/cache Gemini, dan streaming byte-range lokal. Pemeriksaan server memanggil handler langsung tanpa menyalakan server tambahan atau membaca `.env`.

`npm run build` menjalankan pemeriksaan sebelum menyalin hasil. Browser tetap diperlukan untuk memeriksa animasi, tata letak, kebijakan autoplay, dan suara nyata.
