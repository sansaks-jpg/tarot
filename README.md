# The Tarot Room

Game tarot tiga kartu berbahasa Indonesia untuk HP dan desktop. Sela duduk di seberang meja, menyambut pengunjung, lalu membacakan kartu dengan 422 rekaman MP3 lokal. Gratis dan tanpa akun.

## Menjalankan lokal

- `npm run build` menyiapkan `dist` dan menjalankan pemeriksaan sumber, narator, alur UI, serta server statis.
- `npm run serve` menyajikan hasil build di `http://localhost:8080`, terikat ke `0.0.0.0`. Bila server sudah berjalan, cukup build ulang.
- Di HP pada Wi-Fi yang sama, gunakan alamat LAN komputer dan port 8080. Server mencetak alamat yang tersedia saat mulai.

Suara tidak membutuhkan API key. Server tidak memiliki endpoint pembangkit suara. Build memakai `SITE_URL` dari environment, atau `CF_PAGES_URL` pada Cloudflare, atau hanya nilai `SITE_URL` dalam `.env` lokal. Alamat ini dipakai untuk canonical, sitemap, ajakan, dan foto share. Pengaturan API lama tidak dipakai atau dikirim ke situs. Bila alamat belum diatur, share mengikuti alamat situs yang sedang dibuka.

## Cloudflare Pages

Build command: `npm run build`. Output directory: `dist`. Situs sepenuhnya statis; seluruh narasi berasal dari `assets/audio/clips`. Konfigurasi `SITE_URL` pada environment build bila memakai domain publik.

## Alur dan tampilan

- `#beranda`: bertemu Sela di meja dengan kartu tersebar; dengarkan sapaan, mulai atau lanjutkan bacaan, atau lihat koleksi.
- `#bacaan`: dua langkah pendek, pilih topik lalu pertanyaan. Pengunjung dapat memilih contoh atau menulis sendiri, dan kembali mengubah topik.
- `#pilih`: pilih tiga dari tujuh kartu tertutup. Kartu dan animasinya mengikuti koordinat area meja pada foto. Di layar pendek, pilihan yang sudah lengkap ditampilkan lebih besar pada area yang sama.
- `#baca`: buka kartu satu per satu dengan animasi balik kartu dan dialog makna. Makna, simbol, langkah, dan refleksi berasal dari data asli 78 kartu; narasi tetap menggunakan naskah rekaman Sela. Caption bergerak dari bawah ke atas, memudar di bagian atas, dan mengikuti waktu pemutaran audio. Membuka, menutup, atau mengganti tab makna tidak menghentikan bacaan. Tombol kartu berikutnya langsung berpindah kartu; pengunjung tetap membuka kartu itu sendiri.
- Akhir bacaan: tombol Bagikan hasil langsung membuka menu aplikasi HP dengan foto PNG 1080 × 1350 dan ajakan, setelah foto selesai disiapkan. Foto menggunakan kain meja, tiga kartu berukuran besar, nama/makna singkat, dan alamat web. Tidak ada bingkai bertumpuk, glow emas, badge, atau kotak ajakan. WhatsApp/Instagram dan tujuan lainnya mengikuti aplikasi yang tersedia di menu perangkat. Bila berbagi foto tidak didukung, dialog menjelaskan batasan dan menyediakan kirim ajakan ke WhatsApp langsung; simpan foto dan salin ajakan menjadi opsi tambahan. Pembatalan atau kegagalan share tidak otomatis mengunduh gambar. Memulai bacaan baru, termasuk lewat navigasi, mengosongkan topik dan pertanyaan sebelumnya. Putar ulang mengulang tiga kartu yang sama.
- `#kartu`: katalog berbingkai dengan ikon kelompok, pencarian, filter, dan paginasi. Empat kartu per halaman di HP, enam di desktop. Detail memakai penjelasan asli kartu; tombol Dengar Sela memutar rekaman tentang kartu tersebut.

Halaman menggunakan tinggi viewport, dengan navigasi ikon di atas. Halaman utama tidak digulir; makna panjang dapat digulir di dalam dialog. Foto Sela tetap terpasang sepanjang perpindahan layar. Sisi yang tidak terisi foto utama menggunakan blur foto ruang, dan fade form melebar tanpa batas panel. Tata letak menyesuaikan layar pendek, landscape, safe area, dan reduced motion.

## Rekaman dan naskah

[docs/naskah-sela-tarot.md](docs/naskah-sela-tarot.md) merupakan salinan naskah yang diberikan pemilik. `public/naskah.js` memasangkan setiap ID klip dengan teks persis dari naskah. `public/narrator.js` hanya meminta MP3 yang sudah direkam; tidak ada Gemini Live atau suara sintetis saat sesi berlangsung.

Urutan narasi: sambutan, pengisian cerita dan tanggapannya, mengocok, memilih, pengantar kartu, jembatan posisi/kelompok, makna, langkah, refleksi, lalu penutup sesuai topik dan penutup umum. Varian dipilih sekali per pemicu agar teks dan rekaman tetap sama. Rekaman selalu diputar utuh. Caption membagi teks menjadi frasa pendek dengan waktu perkiraan berdasarkan durasi dan posisi audio; rekaman belum memiliki timestamp kata.

Audio dimulai setelah interaksi. Volume musik/efek dan suara Sela dapat diatur terpisah; musik mengecil ketika Sela berbicara. Jeda/lanjut mempertahankan posisi audio. Pramuat berbagi unduhan dengan pemutaran, dan cache hasil decode dibatasi delapan klip. Bila rekaman gagal dimuat, caption tetap berjalan dengan status yang terlihat.

## Aset dan pemeriksaan

78 kartu Rider–Waite–Smith dari [TarotCards — mixvlad](https://github.com/mixvlad/TarotCards/tree/main/tarot/rider-waite), dengan WebP 400 px dan thumbnail 240 px. Foto ruang/pembaca merupakan aset generatif. Sumber, kredit, dan catatan aset ada di [docs/asset-notes.md](docs/asset-notes.md).

`npm run check` memeriksa data/mesin kartu, sintaks, 422 pasangan naskah dan MP3, seluruh makna asli, alur form/dialog, reset topik, caption menurut waktu audio termasuk kembali dari background, paginasi, volume terpisah, pembuatan dan pengiriman foto, serta URL konfigurasi. AudioContext, Canvas, dan Web Share disimulasikan pada pemeriksaan ini. `npm run build` menambahkan pemeriksaan byte-range MP3/musik dan akses server.

Pengecekan browser pada 7 Oktober 2026 dibatasi pada posisi kartu di meja, sesuai izin pemilik. Lolos pada 280×400, 320×480, 320×568, 360×640, 375×667, 390×844, 412×915, 430×932, 480×640, 640×360, 844×390, 768×1024, dan 1280×800: enam tahap tampilan per ukuran, tujuh pengamatan animasi dengan 390 frame, serta 18 tangkapan layar. Kartu terukur tetap di dalam area meja, di bawah wajah Sela, dan tidak membuat halaman bergulir. Kebijakan autoplay, hasil share di aplikasi tujuan, dan pendengaran audio pada perangkat nyata belum diuji.

Foto share juga dirender menggunakan Canvas lokal, tanpa browser. Tata letak teks seluruh 78 kartu, nama yang panjang, kartu tunggal, dan URL yang panjang diperiksa agar tetap berada di dalam gambar. [Web Share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) membutuhkan konteks aman HTTPS dan dukungan perangkat; aplikasi tujuan dapat mengabaikan caption teks, sehingga ajakan dan alamat web juga tercetak pada foto.
