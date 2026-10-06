# The Tarot Room

Game tarot tiga kartu untuk HP dan desktop. Beranda HP langsung mempertemukan pengunjung dengan Sela di meja tarot: “Mau baca tarot?” Pilih bacaan atau lihat-lihat koleksi kartu. Sapaan Sela bisa didengarkan setelah sentuhan jika suara tersedia. Beranda desktop tetap menampilkan tiga kartu klasik, pilihan topik, dan panduan singkat. Pengunjung memilih topik dan pertanyaan, mengambil tiga kartu, lalu mendengarkan Sela membacakan satu per satu. Gratis dan tanpa akun. Bacaan yang sedang berjalan bisa dilanjutkan setelah kembali ke beranda.

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

## Navigasi dan Alur

Aplikasi memiliki lima rute berbasis hash tanpa reload halaman:
- `#beranda`: Di HP, menampilkan *arrival screen* hangat bersama Sela (“Mau baca tarot?”) lengkap dengan tombol audio sambutan interaktif dan dua pilihan aksi. Di desktop, menampilkan layar sambutan komprehensif dengan cuplikan kartu, pintasan topik, serta panduan 3 langkah.
- `#bacaan`: Pemilihan topik (Asmara, Karir, Diri, Hari Ini) dan pertanyaan atau input bebas.
- `#pilih`: Meja kocok kartu (7 kandidat acak) untuk memilih 3 kartu tarot.
- `#baca`: Sesi visual novel interaktif di meja tarot. Kartu dibuka satu per satu dengan narasi Sela (teks dan audio Gemini Live jika diaktifkan).
- `#kartu`: Galeri katalog 78 kartu Rider–Waite–Smith lengkap dengan modal detail, makna tegak/terbalik, kata kunci, dan saran refleksi.

Navigasi atas (`.room-nav`) memudahkan perpindahan antara Beranda, Baca Tarot (yang otomatis mengarahkan ke langkah bacaan aktif bila sesi sedang berjalan), dan Koleksi Kartu.

## Suara dan Persona Sela

Browser meminta token sementara ke server, lalu tersambung langsung ke Gemini Live. REST token memakai `bidiGenerateContentSetup` untuk mengunci model, voice (`Aoede`), dan instruksi. Konfigurasi `liveConnectConstraints` adalah bentuk SDK, bukan field REST yang diterima endpoint saat pemeriksaan ini.

Narasi Sela dirancang layaknya pembaca kartu tarot sungguhan—intim, empatik, dan mengalir natural tanpa kalimat klise/AI slop:
- **Sambutan Personal:** Di beranda dan layar bacaan, Sela menyapa hangat dan mengajak penanya menenangkan diri serta memilih bagian hidup yang paling butuh kejelasan.
- **Komentar Interaktif Setiap Gerakan:** Sela menanggapi pilihan topik (Asmara, Karir, Diri, Umum), pilihan pertanyaan, penarikan kartu satu per satu di meja kocokan (1/3, 2/3, 3/3), kocok ulang, hingga pesan penutup reflektif di akhir sesi.
- **Pembacaan Kartu Kontekstual:** Pembacaan kartu tidak sekadar membacakan kamus template, melainkan menggabungkan observasi intuisi posisi (kartu 1: akar batin; kartu 2: pergulatan/tantangan internal; kartu 3: lentera langkah) serta dinamika energi arcana (Swords untuk overthinking/pikiran bising, Cups untuk kerentanan rasa, Wands untuk ritme energi, Pentacles untuk kepastian nyata, Major untuk siklus besar hidup).
- **Struktur Tiga Bab:** Setiap kartu diuraikan dalam tiga bab bertahap: Makna batin, Langkah nyata sehari-hari, dan Refleksi hening.
- **Ekspresi Vokal Alami:** Disertai filler vokal intuitif (*"emmm"*, *"hmm"*, *"wah"*, *"waduh"*) dan jeda elipsis pada prompt Gemini Live untuk menghasilkan intonasi percakapan yang hidup dan bernyawa.

Satu koneksi dipakai sepanjang sesi. Bacaan pertama disiapkan saat tiga kartu sudah dipilih; bagian berikutnya disiapkan saat bagian saat ini berbicara. PCM dimainkan per potongan dengan penyangga 35 ms, tanpa menunggu satu respons selesai. Latensi layanan/jaringan tetap dapat terjadi. Suara hanya Gemini; jika layanan gagal, pesan di game meminta pemain melanjutkan dengan teks.

Pertanyaan pribadi tidak dikirim ke Gemini. Hanya nama kartu dan teks bacaan yang dikirim. Suara dimulai setelah sentuhan pemain. Musik memakai berkas ambient dengan loop, efek memakai rekaman kartu; musik mengecil saat Sela berbicara. Tombol volume mengatur musik, efek dan narasi.

Di HP, foto Sela yang sama (`welcome-room.webp`) tetap menjadi latar dari beranda, pilihan pertanyaan, pemilihan kartu, hingga bacaan dan hasil. Latar dipasang sekali di luar layar yang berganti; kartu dan panel percakapan berada di atas meja. Layar pemilihan dan bacaan mengikuti tinggi viewport HP. Teks narasi dibagi menjadi bagian pendek; bagian berikutnya muncul setelah suara selesai, dan pemain membuka setiap kartu sendiri. Kartu yang terbuka dapat disentuh untuk melihat detail. Koleksi kartu memakai halaman terpisah.

## Aset

78 kartu Rider–Waite–Smith dari [TarotCards — mixvlad](https://github.com/mixvlad/TarotCards/tree/main/tarot/rider-waite), dipilih karena gambar dan simbol cocok dengan isi deck. Gambar 400 px dan thumbnail 240 px dikompresi WebP. Foto asli dan SVG lama tetap tersimpan di sumber, tetapi tidak disalin ke build.

Foto ruang/pembaca merupakan aset generatif. Palette dan logo mengikuti referensi pemilik. Sumber, lisensi, perubahan ukuran, dan catatan pembuatan ada di [docs/asset-notes.md](docs/asset-notes.md). Musik dan efek dimuat setelah interaksi; koleksi kartu dimuat bertahap.

## Pemeriksaan

`npm run check` memeriksa data 78 kartu, batas tiga kartu, simpan/ekspor, input HTML, template layar, backdrop persisten mobile, batas ukuran aset WebP, adaptasi beranda mobile/desktop, alur navigasi dan pelestarian sesi, konfigurasi Cloudflare, serta penjadwalan PCM/koneksi/cache Gemini. Pemeriksaan ini berjalan tanpa hasil build sebelumnya.

`npm run build` menjalankan pemeriksaan sumber, membuat `dist`, lalu menjalankan `npm run check:build` untuk memeriksa streaming byte-range dari berkas yang baru dibuat. Pemeriksaan server memanggil handler langsung tanpa menyalakan server tambahan atau membaca `.env`. Urutan ini juga berlaku pada checkout baru di Cloudflare. Browser tetap diperlukan untuk memeriksa animasi, tata letak, kebijakan autoplay, dan suara nyata.
