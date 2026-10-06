# Aset The Tarot Room

## Referensi pemilik

- Palette: `C:\Users\WORKPLUS\Downloads\IMG-20261002-WA0017.jpg`.
- Logo: `C:\Users\WORKPLUS\Downloads\WA_1790966148745.jpeg`.
- Warna: burgundy `#7A1D24`, emas `#E5AB3A`, cream `#F6EDDC`, kayu `#3A2A1A`, charcoal `#161817`.

## Kartu

Rider–Waite–Smith dipilih dari [TarotCards — mixvlad](https://github.com/mixvlad/TarotCards/tree/main/tarot/rider-waite). Ilustrasi Pamela Colman Smith, desain Arthur Edward Waite (1909), public domain menurut metadata repository. Gambar klasik mempertahankan simbol yang dijelaskan pada game; kandidat Soimoi memiliki reinterpretasi gambar yang kurang cocok dengan data makna saat ini.

78 gambar utama 400 px: 4.23 MB total; 78 thumbnail 240 px: 1.65 MB total. Semua dimuat sesuai kebutuhan. Detail: `public/assets/cards/credits.json`. File sumber JPG/SVG tetap utuh dan dikecualikan dari `dist`.

Bagian belakang kartu menggunakan SVG ringan berwarna burgundy, border cream, dan motif tiga kartu serta bintang yang mengikuti logo pemilik.

## Ruang dan pembaca

Dibuat memakai tool `image_gen.imagegen`, aset sumber:

`C:\Users\WORKPLUS\.codex\generated_images\01a10f22-4872-7890-a944-709639c2be74\exec-2a28b0e1-93f9-452c-b15a-7b8e8821d2a7.png`.

Prompt: cinematic vertical 4:5 photograph from the visitor's seat at a tarot table; Southeast Asian female reader around 30 in a burgundy shawl and cream blouse, warm eye contact, hands resting at table edge; burgundy curtains and dark wood; candlelight on both sides; empty burgundy velvet tabletop in lower half for actual card overlays. Palette #7A1D24, #E5AB3A, #F6EDDC, #3A2A1A, #161817. No cards, text, logo, UI, neon or crystals.

Derivatif: `room-mobile.webp` 29.7 KB, `room.webp` 78.8 KB, `presence-mobile.webp` 16.8 KB, `presence.webp` 42.4 KB, `felt.webp` 5.0 KB, `reader.webp` 4.0 KB. Crop/resizing/compression menggunakan `scripts/prepare-assets.py`; gambar asli tidak ditimpa.

## Logo

Background cutout memakai tool `image_gen.imagegen` dengan referensi logo pemilik, transparency true. Prompt: remove only the off-white background, preserve the lettering, cards and stars, don't redesign the logo, crop empty margins.

Aset sumber:
`C:\Users\WORKPLUS\.codex\generated_images\01a10f22-4872-7890-a944-709639c2be74\exec-843fa7ac-3a96-4ed9-b20f-d6f8dbe9fc58.png`.

Hasil web: `public/assets/brand.webp`, 480 px, 30.3 KB. Referensi JPEG pemilik tetap utuh.

## Audio

- Musik: [Ancient Mysteries](https://opengameart.org/content/ancient-mysteries), Sperry Lion LLC (2024), CC0. Versi loop, normalisasi -18 LUFS, AAC 80 kbps dengan faststart. `room.m4a` 1.23 MB, dimulai setelah interaksi dan dilayani bertahap dengan byte-range di server lokal.
- Foley: [Casino Audio](https://kenney.nl/assets/casino-audio), Kenney, CC0. `card-shuffle`, `card-fan-2`, `card-slide-3`, `card-place-2`, `card-shove-2`, dinormalisasi dan dikonversi MP3 mono 80 kbps. Lima berkas total 66.8 KB. Bukan oscillator/noise yang dibuat saat runtime.
- Kredit terstruktur: `public/assets/audio/credits.json`.

## Validasi suara

Gemini model `gemini-3.8-live`, voice `Aoede`. Tes integrasi publik singkat: token HTTP 200, setupComplete, 11 potongan PCM, turnComplete. Potongan pertama sekitar 2453 ms sejak memulai koneksi baru. Browser juga menampilkan status membaca setelah PCM dijadwalkan ke AudioContext. Ini tidak menjamin latensi nol atau performa yang sama pada jaringan/perangkat lain.

API key tidak ditampilkan dalam log atau dibuka untuk pemeriksaan isi. Nilai hanya dipakai runtime server untuk autentikasi sesuai kebutuhan layanan.
