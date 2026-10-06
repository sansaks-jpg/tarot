# Naskah Sela, The Tarot Room (pra-rekam, pengganti Gemini Live)

Semua kalimat yang diucapkan Sela di web, ditulis ulang tanpa template, dalam bentuk klip yang bisa direkam satu per satu menjadi mp3.

## 1. Temuan di repo

Gemini tidak menulis kalimat apa pun sendiri. `functions/api/live-token.js:34` menyuruh model membacakan field `passage` kata demi kata, dan `public/narrator.js:283-286` mengirim `{card, passage}`. Seluruh isi ucapan ditulis di sisi klien:

| Sumber | Isi lama | Nasib |
|---|---|---|
| `public/story.js:29-55` | `SUIT_INSIGHTS`, 15 kalimat (5 suit x 3 posisi) dipakai ulang untuk semua kartu | dibuang, sumber utama kesan template |
| `public/story.js:57-75` | `formatMeaning`: filler + "Kartu ini menangkap/membaca/mengingatkan:" + teks kamus | dibuang |
| `public/story.js:77-90` | pembuka tetap "Emmm, kalau kita bawa ke langkah nyata sehari-hari:" dan "Coba renungkan sejenak..." | dibuang |
| `public/deck.js` | `meaning`, `action`, `prompt` per kartu (teks kamus, nadanya formal) | diganti naskah per kartu |
| `public/app.js:55-63` | 4 reaksi topik | diganti |
| `public/app.js:223-231`, `985`, `1091` | sapaan layar bacaan, komentar saat mengetik, komentar pilih template | diganti |
| `public/app.js:322-329`, `1140` | komentar meja pilih kartu, komentar "ragu" | diganti |
| `public/app.js:539` | kalimat sebelum kartu dibuka | diganti |
| `public/app.js:704` | penutup | diganti |
| `public/app.js:846-847` | sambutan beranda | diganti |

Catatan penting:

- Yang benar-benar lewat `narrator.speak` hanya tiga tempat: `app.js:622` (bacaan kartu), `849` (sambutan), `891` (sapaan layar bacaan). Komentar meja pilih, kalimat sebelum kartu dibuka, dan penutup saat ini hanya teks di layar. Di naskah ini semuanya dijadikan klip supaya bisa disuarakan juga.
- Kartu hanya posisi tegak (tidak ada makna terbalik di `deck.js`). Teks kartu di kode lama juga tidak memakai topik atau pertanyaan (`story.js:62-90` mengabaikan `options.topic` dan `options.question`), jadi naskah kartu di sini juga tidak bergantung topik. Reaksi topik dan penutup yang bergantung topik.
- README menyebut topik "Asmara, Karir, Diri, Hari Ini", tetapi kode (`deck.js:726-770`) memakai `hubungan`, `kerja`, `umum`, `diri`. Naskah mengikuti kode. Posisi kartu mengikuti `story.js:62-72`: kartu 1 akar cerita, kartu 2 yang sedang bergejolak, kartu 3 arah langkah berikutnya.

Pola yang sengaja dibuang dari naskah lama: "Emmm..." di hampir setiap kalimat, rumus "Kartu ini menangkap: <kamus>", kalimat mutiara penutup ("kartu adalah cermin..."), kerangka "bukan X, tapi Y", istilah terapi (ruang, resonansi, dinamika batin), dan "tarik napas pelan-pelan" yang diulang di banyak tempat.

## 2. Aturan gaya yang dipakai

- Sela memakai "aku" dan "kamu", bahasa lisan santai ("nggak", "udah", "sih", "deh"), bukan bahasa tulis.
- Filler dan reaksi ("hm", "oh", "duh", "hehe") dipakai hanya saat ada alasannya, tidak di setiap klip.
- Setiap kartu punya detail gambar yang konkret (Rider-Waite-Smith), bukan frasa umum.
- Tidak ada tanda pisah panjang. Jeda ditulis dengan koma, titik, atau "..." supaya TTS membacanya wajar.
- Kartu tidak dijadikan ramalan atau vonis. Kehati-hatian diucapkan dalam suara Sela, bukan sebagai disclaimer kaku.
- Teks kartu tidak menyebut topik tertentu (pasangan, kantor) karena topik tidak mengubah isi kartu.
- Setiap klip kartu (M, L, R) maksimal 190 karakter, sama dengan batas `passageLimit` terbesar di `app.js`. Untuk HP pendek (batas lama 115 atau 155 karakter) tampilkan teks di bubble yang bisa digulir, atau minta saya memecah ulang.

## 3. Format file dan urutan putar

Setiap klip satu baris:

```
- `ID` teks yang diucapkan
```

Regex untuk tool rekam: `^- `([^`]+)` (.+)$`. Baris `**Arahan:**` di bawah judul bagian berlaku untuk semua klip di bagian itu. Arahan kartu ada di baris `Arahan:` tiap kartu.

Pilih satu varian acak per pemicu (akhiran `a`, `b`, `c`) supaya tidak terdengar berulang.

Urutan putar satu bacaan:

1. Beranda: `SAMBUTAN-BARU-*` atau `SAMBUTAN-KEMBALI-*`
2. Layar bacaan: `SETUP-*`, lalu `TOPIK-*`, `TEMPLATE-*`, atau `KETIK-*`, lalu `MULAI-*`
3. Meja pilih: `PILIH-0-*`, `PILIH-1-*`, `PILIH-2-*`, `PILIH-3-*` (dan `PILIH-RESET-*` bila mengocok ulang)
4. Tiap kartu (posisi 1 sampai 3): `PRE-{posisi}-*`, buka kartu, `BR-{posisi}-{suit}-*`, `{id}-M1`, `{id}-M2`, (`{id}-M3` hanya Arkana Besar), `{id}-L1`, `{id}-R1`
5. Selesai: `PENUTUP-{topik}` dan `PENUTUP-UMUM-*`
6. Tombol "Baca kartu ini lagi": `ULANG-*`

Jumlah klip: sekitar 88 di luar kartu dan 334 untuk 78 kartu.

## 4. Usulan instruksi sistem untuk perekaman

Ganti teks di `functions/api/live-token.js:34` (atau instruksi di tool rekam) dengan ini, lalu kirim tiap klip sebagai `{"direction": "...", "text": "..."}`:

```
Kamu adalah Sela, pembaca tarot yang duduk di seberang meja dan bicara langsung ke satu orang. Kamu menerima JSON dengan field direction dan text. Ucapkan hanya isi text, kata demi kata, tanpa menambah atau mengurangi satu kata pun. Jangan ucapkan direction, itu hanya petunjuk cara membawakan. Bicara seperti orang sungguhan: pelan, hangat, kadang ragu, kadang tersenyum. Titik tiga berarti jeda menggantung, koma berarti napas ringan. Reaksi seperti "hm", "oh", "duh", "hehe" diucapkan seperti manusia mengucapkannya, tidak dieja. Jangan membaca seperti pembawa berita. Setelah selesai, berhenti dan tunggu text berikutnya.
```

Saran teknis: rekam tiap klip sebagai turn terpisah, potong hening di awal dan akhir, simpan sebagai `{ID}.mp3`, dan jadikan file ini sumber kebenaran untuk teks yang ditampilkan di layar, supaya teks dan audio selalu sama.

## 5. Klip di luar kartu

### 5.1 Beranda (pemicu: tombol "Dengar Sela" di `#beranda`)

**Arahan:** hangat, pelan, seperti menyambut tamu yang baru duduk. Senyum terdengar. Jeda singkat setelah titik.

- `SAMBUTAN-BARU-a` Eh, ada yang datang. Sini, duduk. Mejanya agak berantakan, maaf ya, tadi aku lagi ngocok kartu sendirian. Jadi, mau dibacain soal apa hari ini?
- `SAMBUTAN-BARU-b` Hm, pas banget kamu datang. Kartunya baru aku rapiin. Duduk dulu, santai aja, nggak ada yang buru-buru di sini. Kalau udah enak, bilang ya mau baca soal apa.
- `SAMBUTAN-BARU-c` Halo, aku Sela. Kamu pasti lagi kepikiran sesuatu, makanya mampir. Duduk dulu. Kita mulai dari bagian hidup yang paling ganjel aja.

**Arahan:** sedikit kaget lalu senang. Lebih akrab, seperti bertemu lagi.

- `SAMBUTAN-KEMBALI-a` Lho, balik lagi. Tadi kamu pergi di tengah-tengah ya. Kartumu masih di meja, nggak aku pindahin. Mau lanjut dari situ?
- `SAMBUTAN-KEMBALI-b` Oh, kamu. Aku kira nggak jadi. Duduk, duduk. Kartunya masih tengkurap di tempat tadi. Kita lanjut aja, ya?

### 5.2 Layar bacaan (`#bacaan`)

**Arahan:** santai, mempersilakan. Nada naik sedikit di kalimat tanya.

- `SETUP-a` Silakan duduk, senyaman mungkin. Pilih aja dulu mau bicara soal apa, yang paling dekat di hati.
- `SETUP-b` Nah, sekarang pilih topiknya. Nggak ada yang salah, nggak ada yang lebih penting dari yang lain.
- `SETUP-KEMBALI-a` Selamat datang lagi. Duduk lagi ya, kita lanjutin ceritamu yang tadi sempat berhenti.
- `SETUP-KEMBALI-b` Kamu balik. Bagus. Bacaan yang tadi masih nunggu, nggak ada yang hilang.

**Arahan:** reaksi spontan begitu topik dipilih. Pelan, penuh perhatian, seperti mendengarkan.

- `TOPIK-hubungan-a` Urusan hati, ya. Hm. Biasanya yang paling berat justru yang belum sempat diomongin. Nggak usah dirapiin dulu, cerita aja pelan-pelan.
- `TOPIK-hubungan-b` Oh, soal orang lain. Atau soal kamu di depan orang itu, itu juga masuk. Kartu sering ngomong lebih banyak soal yang satu ini.
- `TOPIK-kerja-a` Hm, kerjaan. Biasanya yang milih ini udah lama muter-muter di kepala. Nggak apa-apa, taruh dulu semuanya di meja.
- `TOPIK-kerja-b` Soal arah dan pekerjaan. Oke. Kalau lagi capek atau bingung, wajar. Kita lihat dulu kartunya mau bilang apa.
- `TOPIK-umum-a` Yang umum aja? Boleh, kadang malah itu yang paling jujur. Nggak tahu mau nanya apa, tapi ada yang ganjel. Ya udah, biar kartunya yang mulai.
- `TOPIK-umum-b` Wah, bebas nih. Aku suka yang begini, soalnya kartunya yang nentuin arah. Kamu tinggal siapin pertanyaan, atau nggak usah juga nggak apa-apa.
- `TOPIK-diri-a` Tentang kamu sendiri. Hm. Ini yang sering ditunda, ya? Hehe, aku nggak nuduh kok. Cuma biasanya yang milih ini lagi capek dan belum sempat ngaku.
- `TOPIK-diri-b` Oke, kita ngomongin kamu. Pelan-pelan aja. Kadang yang paling susah itu nanya hal paling sederhana: aku sebenernya butuh apa sih.

**Arahan:** menanggapi pertanyaan yang dipilih, seperti menimbang kalimatnya dulu. Jeda pendek sebelum kalimat terakhir.

- `TEMPLATE-hubungan-1` Oh, yang ini. Kamu mau paham, bukan mau diperintah harus gimana. Aku suka cara kamu nanya. Kartunya bakal nunjukin sisi yang mungkin belum kamu lihat.
- `TEMPLATE-hubungan-2` Soal komunikasi. Kamu nanya bagian yang bisa kamu pegang sendiri. Pertanyaan itu enak dikerjain. Kita lihat kartunya.
- `TEMPLATE-hubungan-3` Hm. Yang lalu. Pertanyaan ini berat, aku tahu. Kalau perlu, tarik napas dulu sebentar. Kartunya nggak bakal buru-buru.
- `TEMPLATE-kerja-1` Langkah, ya. Berarti kamu udah mikir mau gerak, tinggal arahnya yang belum jelas. Oke, kita cari arahnya lewat kartu.
- `TEMPLATE-kerja-2` Wah, mau pindah. Jangan kaget kalau kartunya nanya balik soal alasan. Itu biasa. Yuk kita lihat.
- `TEMPLATE-kerja-3` Duh, lagi ada yang berat di tempat kerja. Nggak apa-apa, kamu nggak harus cerita detail. Kartunya cukup tahu kamu butuh tenaga buat ngadepinnya.
- `TEMPLATE-umum-1` Pertanyaan yang luas banget. Aku suka. Jawabannya biasanya nongol dari hal kecil yang selama ini kelewat. Kita lihat yang mana.
- `TEMPLATE-umum-2` Lagi bingung milih, ya. Hm, wajar. Kalau semuanya kelihatan sama-sama masuk akal, kartu kadang ngasih sudut lain.
- `TEMPLATE-umum-3` Hal baru! Hehe, aku langsung semangat. Tapi tenang, kita lihat dulu kartunya mau ngomong apa sebelum kamu lompat.
- `TEMPLATE-diri-1` Hm, pertanyaan yang jarang ditanyain. Kita lihat kartunya bilang apa soal kamu.
- `TEMPLATE-diri-2` Kebiasaan. Hehe, siap-siap aja, kadang jawabannya bikin kita nyengir sendiri. Nggak usah tegang, kita lihat pelan-pelan.
- `TEMPLATE-diri-3` Ruang buat diri sendiri. Hm, kedengerannya sederhana, tapi susah dilakuin. Ya udah, kita tanya kartunya dulu.

**Arahan:** lembut, pelan, memberi izin. Dipakai saat pengguna mulai mengetik pertanyaan sendiri (isi pertanyaan tidak diketahui, jadi klip ini netral).

- `KETIK-a` Tulis aja apa adanya, nggak usah dirapiin. Di meja ini nggak ada pertanyaan yang salah. Kalau kalimatnya berantakan, kartunya tetap ngerti.
- `KETIK-b` Hm, lagi nulis ya. Santai, aku nggak ngintip kok. Nanti kalau udah selesai, tinggal bilang.
- `KETIK-c` Pelan-pelan aja nulisnya. Kadang pertanyaan yang paling jujur baru keluar di kalimat kedua.

**Arahan:** mulai serius tapi tetap hangat, ada bunyi mengocok di latar (`shuffle.mp3`). Dipakai saat tombol mulai ditekan.

- `MULAI-a` Oke, siap. Aku kocok dulu ya. Kamu pegang pertanyaanmu di kepala, jangan dilepas.
- `MULAI-b` Baik, kartunya aku kocok. Fokus ke pertanyaanmu aja, sisanya biar tanganku yang urus.

### 5.3 Meja pilih (`#pilih`)

**Arahan:** tenang, mengundang. Suara agak pelan, seperti takut mengganggu konsentrasi.

- `PILIH-0-a` Nah, udah aku sebar di atas kain. Nggak usah mikir pakai logika. Lihat aja mana yang bikin tanganmu berhenti. Ambil tiga yang rasanya manggil.
- `PILIH-0-b` Kartunya udah kesebar semua. Jangan dihitung, jangan dianalisis. Biarin matamu jalan pelan-pelan, nanti ada yang bikin kamu pengen nyentuh. Ambil tiga.

**Arahan:** singkat, hangat, mengangguk kecil.

- `PILIH-1-a` Satu. Kamu tadi langsung pegang yang itu, ya? Simpan dulu, belum boleh diintip. Dua lagi.
- `PILIH-1-b` Oke, yang pertama udah di tempatnya. Jangan diintip dulu. Ambil dua lagi, pelan aja.
- `PILIH-2-a` Dua. Tinggal satu lagi. Yang terakhir sering paling lama dicari, tapi sabar, nanti ada yang nyangkut.
- `PILIH-2-b` Udah dua di meja. Satu lagi, ya. Nggak usah buru-buru, kartunya nggak ke mana-mana.

**Arahan:** hening sebentar, lalu pelan dan sedikit tegang menjelang membuka kartu.

- `PILIH-3-a` Tiga. Udah lengkap. Hm... diam sebentar ya. Kalau udah siap, kita buka satu-satu.
- `PILIH-3-b` Nah, tiga kartu udah tengkurap di depan kita. Aku juga agak deg-degan, jujur. Siap? Kita buka dari yang pertama.

**Arahan:** santai, menenangkan, tanpa nada menyalahkan. Dipakai saat pengguna mengacak ulang pilihannya.

- `PILIH-RESET-a` Ragu? Nggak masalah sama sekali. Kartunya aku kocok lagi, sampai rasanya pas di tangan.
- `PILIH-RESET-b` Oh, nggak sreg ya. Santai, itu wajar. Aku kocok dari awal, kamu pilih lagi pelan-pelan.

### 5.4 Sebelum kartu dibuka (`#baca`)

**Arahan:** mengajak, pelan, memberi waktu. Akhiri dengan nada menunggu.

- `PRE-1-a` Kita mulai dari yang paling kiri. Ini kartu yang nunjukin dari mana ceritamu mulai. Sentuh kalau udah siap.
- `PRE-1-b` Yang pertama dulu. Biasanya dia paling jujur soal akarnya. Buka pelan-pelan, aku nunggu.
- `PRE-2-a` Sekarang yang tengah. Ini yang lagi bergejolak sekarang. Buka kalau kamu udah siap.
- `PRE-2-b` Kartu kedua. Ini bagian yang lagi kamu hadapi sekarang. Hm, siap? Buka.
- `PRE-3-a` Yang terakhir. Dia kayak lampu kecil buat langkah berikutnya. Buka kalau hatimu udah siap.
- `PRE-3-b` Kartu ketiga, yang terakhir. Dia ngasih arah buat langkah selanjutnya. Buka pelan-pelan, aku di sini.

### 5.5 Jembatan posisi x suit (diucapkan tepat setelah kartu terbuka, sebelum `M1`)

**Arahan:** reaksi pertama melihat kartu, pelan dan menimbang. Jeda singkat di tengah. Isi tidak menyebut kartu tertentu, jadi cocok untuk 78 kartu.

Posisi 1 (akar cerita):

- `BR-1-major-a` Kartu besar di posisi pertama. Hm. Akarnya udah dalam, berarti ini bukan urusan minggu ini aja.
- `BR-1-major-b` Wah, Arkana Besar yang keluar duluan. Ini yang ngebentuk ceritamu dari belakang, pelan tapi dalam.
- `BR-1-wands-a` Tongkat di awal. Hm, berarti ceritanya mulai dari tenaga, dari api yang dulu pernah nyala atau yang dipaksa nyala.
- `BR-1-wands-b` Tongkat. Di akar ceritamu ada gerak dan semangat, entah yang udah habis kebakar atau yang masih nyala.
- `BR-1-cups-a` Cawan di posisi pertama. Hm, akarnya di perasaan. Ada yang dulu kerasa banget, dan masih nyisa sampai sekarang.
- `BR-1-cups-b` Cawan. Dari awal ini urusan hati, ya. Pelan-pelan, kita lihat rasa yang mana.
- `BR-1-swords-a` Pedang. Duh, di akar ceritamu ada pikiran yang tajam. Mungkin ada kata-kata atau keputusan yang masih nyangkut dari dulu.
- `BR-1-swords-b` Pedang di posisi pertama. Berarti dari awal banyak yang diputer di kepala. Kita lihat yang mana.
- `BR-1-pentacles-a` Koin. Akarnya nyata dan membumi: kerjaan, uang, rumah, hal yang bisa dipegang. Hm, kita lihat yang mana.
- `BR-1-pentacles-b` Koin di awal. Ceritamu berpijak di hal konkret, ya. Sesuatu yang kamu bangun atau lagi kamu khawatirin, kita lihat.

Posisi 2 (yang sedang bergejolak):

- `BR-2-major-a` Kartu besar di tengah. Hm... yang lagi kamu hadapi sekarang itu bukan hal kecil, ya.
- `BR-2-major-b` Wah, kartu besar di tengah. Berarti yang lagi jalan sekarang ini bobotnya besar buat kamu. Kita pelan-pelan.
- `BR-2-wands-a` Tongkat di tengah. Energimu lagi ke mana-mana, ya, atau lagi dipaksa jalan terus. Kita lihat.
- `BR-2-wands-b` Tongkat. Sekarang ini soal tenaga dan gerak. Ada yang lagi nyala, ada yang lagi kepaksa.
- `BR-2-cups-a` Cawan di tengah. Yang lagi kamu hadapi sekarang itu perasaan, dan kayaknya sebagian belum ketumpahin.
- `BR-2-cups-b` Hm, Cawan. Hatimu lagi kerja keras sekarang. Kita lihat bagian yang mana.
- `BR-2-swords-a` Pedang di tengah. Duh. Di kepalamu lagi rame, ya. Ada yang diperdebatin terus tanpa selesai.
- `BR-2-swords-b` Pedang. Sekarang yang paling berisik itu pikiran. Kita lihat apa yang diputerin.
- `BR-2-pentacles-a` Koin di tengah. Yang lagi kamu hadapi sekarang itu nyata: waktu, tenaga, mungkin uang. Kita lihat.
- `BR-2-pentacles-b` Koin. Sekarang ini soal hal konkret yang butuh diurus. Hm, kita lihat yang mana.

Posisi 3 (arah langkah berikutnya):

- `BR-3-major-a` Kartu besar di posisi terakhir. Hm, kemungkinan ke depannya ada yang besar. Kita lihat pelan-pelan, ya.
- `BR-3-major-b` Wah, Arkana Besar di akhir. Ada pergeseran yang lumayan besar kalau kamu mau melangkah ke sana.
- `BR-3-wands-a` Tongkat di posisi terakhir. Langkah berikutnya butuh tenaga dan keberanian kecil, ya. Kita lihat bentuknya.
- `BR-3-wands-b` Tongkat. Ke depan, ini soal mulai bergerak. Hm, kita lihat gerak yang mana.
- `BR-3-cups-a` Cawan di akhir. Langkah berikutnya lewat perasaan. Ada yang perlu kamu dengerin dulu sebelum jalan.
- `BR-3-cups-b` Cawan, yang terakhir. Arahnya lewat hati, ya. Pelan-pelan kita lihat.
- `BR-3-swords-a` Pedang di akhir. Langkah berikutnya butuh kepala yang jernih dan kata yang jujur. Kita lihat.
- `BR-3-swords-b` Pedang. Hm, ke depan kamu perlu mikir lebih lurus dulu. Kita lihat bagian yang mana.
- `BR-3-pentacles-a` Koin di akhir. Langkah berikutnya berpijak di hal nyata, yang bisa dikerjain satu per satu. Kita lihat.
- `BR-3-pentacles-b` Koin, yang terakhir. Arahnya ke hal-hal yang bisa kamu pegang. Kita lihat yang mana.

### 5.6 Penutup dan baca ulang

**Arahan:** melambat, hangat, sedikit lega. Jeda panjang sebelum kalimat terakhir. Dipakai setelah kartu ketiga selesai. `PENUTUP-{topik}` dipilih sesuai topik bacaan, lalu (opsional) satu `PENUTUP-UMUM`.

- `PENUTUP-hubungan` Udah, tiga-tiganya udah bicara. Aku nggak bisa bilang orang itu bakal gimana, kartu nggak sampai situ. Yang bisa kamu bawa pulang cuma yang kerasa pas di dadamu tadi. Sisanya biarin aja.
- `PENUTUP-kerja` Selesai. Kartunya nggak bisa nentuin kamu harus pindah atau bertahan, itu tetap keputusanmu. Ambil yang kerasa masuk akal, sisanya tinggal di meja.
- `PENUTUP-umum` Udah, ketiganya terbuka. Kartu nggak ngasih kepastian soal besok, dia cuma ngasih sudut lain buat ngelihat hari ini. Bawa yang kepake, tinggalin yang nggak.
- `PENUTUP-diri` Selesai, ya. Tiga kartu tadi cuma ngajak kamu ngelihat diri sendiri sebentar. Kalau ada yang nyentuh, simpen. Kalau ada yang nggak cocok, ya nggak apa-apa.
- `PENUTUP-UMUM-a` Itu dia. Makasih udah duduk lama-lama di sini. Kalau nanti pengen balik, mejanya masih di sini.
- `PENUTUP-UMUM-b` Udah ya. Aku seneng kamu mampir. Minum air putih dulu, kamu udah mikir banyak tadi.

**Arahan:** ramah, ringan, seperti menawarkan memutar ulang.

- `ULANG-a` Mau dengerin lagi? Boleh. Kadang pas kedua kalinya, ada kalimat yang baru kedengeran.
- `ULANG-b` Oke, kita buka dari awal. Aku bacain lagi, pelan aja.

## 6. Naskah kartu

Urutan putar tiap kartu: `BR-{posisi}-{suit}-*`, `M1`, `M2`, (`M3` hanya Arkana Besar), `L1` (langkah nyata), `R1` (pertanyaan refleksi).

### 6.1 Arkana Besar (m00 sampai m21)

#### m00 · The Fool · Si Pengelana
**Arahan:** ringan, sedikit geli, lalu hangat. Di M3 melambat sedikit.

- `m00-M1` Lihat orangnya, hampir di ujung tebing dan santai banget. Buntalannya kecil, ada anjing yang kayak lagi ngingetin. Mukanya mendongak, nggak ngelihat kakinya.
- `m00-M2` Kartu ini artinya mulai dari nol. Ada sesuatu yang pengen kamu coba, dan separuh dirimu udah berdiri di tepinya. Separuhnya lagi masih ngitung-ngitung.
- `m00-M3` Anjingnya itu penting. Dia tanda bahwa semangat butuh teman yang waspada. Jadi boleh mulai, tapi dengerin juga suara kecil yang bilang hati-hati.
- `m00-L1` Cari satu langkah kecil yang kalau ternyata salah masih bisa kamu tarik lagi. Coba itu dulu minggu ini, jangan langsung lompat jauh.
- `m00-R1` Hal apa yang pengen banget kamu coba, dan bekal apa yang sebenernya belum kamu siapin?

#### m01 · The Magician · Sang Peramu
**Arahan:** percaya diri, tegas tapi bersahabat, tempo sedikit lebih cepat.

- `m01-M1` Dia berdiri di depan meja, satu tangan ke langit, satu ke tanah. Di mejanya ada cawan, pedang, tongkat, dan koin. Semua alatnya udah digelar.
- `m01-M2` Pertanyaan kartu ini simpel: kamu udah punya apa? Biasanya lebih banyak dari yang kamu kira. Keterampilan, kenalan, waktu luang yang selama ini kamu remehin.
- `m01-M3` Alat sebanyak apa pun diem aja kalau nggak ada yang mulai. Jadi kartu ini cuma nunggu kamu mutusin, mau mulai dari yang mana duluan.
- `m01-L1` Pilih satu kemampuanmu yang bisa langsung dipakai buat langkah berikutnya. Satu aja, yang paling dekat di tangan, terus pakai hari ini.
- `m01-R1` Bekal apa yang udah ada di mejamu, tapi belum pernah kamu pakai?

#### m02 · The High Priestess · Sang Penjaga Batin
**Arahan:** hampir berbisik, pelan, banyak jeda. Misterius tapi menenangkan.

- `m02-M1` Hm... tenang banget kartu ini. Dia duduk di antara dua tiang, satu gelap satu terang. Di belakangnya ada tirai, dan kita nggak bisa lihat apa di baliknya.
- `m02-M2` Artinya ada hal yang belum kelihatan jelas, dan belum waktunya dibuka paksa. Mungkin kamu udah punya firasat, tapi belum berani ngomong ke diri sendiri.
- `m02-M3` Tapi firasat itu petunjuk buat nanya, bukan bukti. Dengerin dulu, terus cocokin sama apa yang kamu tahu pasti.
- `m02-L1` Ambil jeda sepuluh menit tanpa HP. Setelah itu pisahin dua hal: apa yang kamu rasain, dan apa yang udah kamu tahu pasti.
- `m02-R1` Informasi apa yang belum kamu dengar, sebelum kamu berani menyimpulkan?

#### m03 · The Empress · Sang Pengasuh
**Arahan:** hangat, lembut, seperti tersenyum sambil bercerita. Tempo santai.

- `m03-M1` Wah, hangat. Dia duduk santai di atas bantal empuk, dikelilingi gandum yang udah menguning, ada hutan dan air terjun. Semuanya kelihatan tumbuh dengan sendirinya.
- `m03-M2` Kartu ini soal merawat. Bisa ide, hubungan, atau badanmu sendiri. Ada yang udah kamu kasih perhatian, dan sekarang mulai kelihatan hasilnya.
- `m03-M3` Tapi ladang juga ada musimnya. Nggak semua hal makin cepat tumbuh kalau disiram terus. Kadang yang dibutuhin cuma perhatian yang rutin, nggak berlebihan.
- `m03-L1` Pilih satu hal yang perlu kamu rawat, lalu sediain waktu yang masuk akal buat itu. Setengah jam sehari udah cukup buat mulai.
- `m03-R1` Apa yang lagi tumbuh di hidupmu, dan dukungan apa yang dia butuhin?

#### m04 · The Emperor · Sang Pemimpin
**Arahan:** mantap, suara agak lebih rendah dan datar, tegas tanpa membentak.

- `m04-M1` Nah, yang ini tegas. Takhtanya batu, ada kepala domba di sandarannya, dan di belakangnya gunung gundul. Nggak ada hiasan, semuanya keras dan kokoh.
- `m04-M2` Dia ngomongin batas dan aturan. Ada bagian hidupmu yang butuh struktur, atau butuh kamu bilang cukup. Tanggung jawab yang selama ini dibiarin kabur.
- `m04-M3` Tapi aturan baru berguna kalau bikin hidup lebih gampang dijalanin. Kalau malah bikin semua orang takut ngomong, berarti ada yang perlu dilonggarin.
- `m04-L1` Tetapkan satu batas atau satu aturan kerja yang gampang dijalanin. Satu dulu, tapi dijaga beneran.
- `m04-R1` Di bagian mana kamu butuh kejelasan, siapa yang bertanggung jawab atas apa?

#### m05 · The Hierophant · Sang Pembimbing
**Arahan:** tenang, seperti guru yang sabar. Tidak menggurui.

- `m05-M1` Ada sosok duduk di antara dua pilar, tangannya terangkat seperti lagi ngasih petunjuk. Di depannya dua orang berlutut, siap mendengarkan.
- `m05-M2` Kartu ini soal belajar dari yang udah teruji. Guru, aturan keluarga, kebiasaan turun-temurun. Ada yang bisa kamu pegang dari situ, selama kamu paham kenapa.
- `m05-M3` Nilai yang kamu warisin itu boleh kamu periksa lagi. Yang cocok, simpan. Yang udah nggak cocok sama hidupmu sekarang, boleh kamu pertanyain.
- `m05-L1` Cari satu orang atau satu sumber yang kamu percaya, lalu tanyain satu hal yang selama ini cuma kamu duga-duga sendiri.
- `m05-R1` Aturan atau kebiasaan apa yang kamu ikutin tanpa pernah tahu alasannya?

#### m06 · The Lovers · Dua Pilihan
**Arahan:** lembut, sedikit menggoda di awal, lalu serius dan jernih di M2 dan M3.

- `m06-M1` Dua orang berdiri berhadapan di bawah malaikat yang merentangkan tangan. Di belakang mereka ada dua pohon, satu dililit ular, satu bernyala api.
- `m06-M2` Namanya Kekasih, tapi isinya soal memilih. Pilihan yang beneran selaras sama nilai yang kamu pegang, dengan orang lain atau dengan keputusanmu sendiri.
- `m06-M3` Jadi jawabannya mungkin nggak ada di orang itu. Lihat dulu apa yang selama ini kamu bilang penting, lalu cek pilihanmu udah jalan ke arah situ belum.
- `m06-L1` Tulis dua pilihan yang lagi kamu timbang, lalu tulis nilai apa di balik masing-masing. Lihat mana yang lebih sejalan.
- `m06-R1` Pilihan mana yang bikin kamu tetap jadi diri sendiri, walaupun nggak populer?

#### m07 · The Chariot · Kereta
**Arahan:** bersemangat, tempo naik, lalu menurun di M3 saat memberi peringatan.

- `m07-M1` Seseorang berzirah berdiri di atas kereta, di depannya dua sphinx, satu hitam satu putih. Nggak ada tali kekang yang kelihatan, dia ngarahin cuma pakai tekad.
- `m07-M2` Ini kartu kendali. Ada dua tarikan yang berlawanan di dalam dirimu, dan kamu yang harus mutusin ke mana arahnya. Maju itu bisa, asal tujuannya jelas.
- `m07-M3` Kereta yang ngebut tanpa arah tetap bahaya. Pastiin dulu kamu tahu mau ke mana, baru injak gas.
- `m07-L1` Tentuin satu tujuan paling penting buat bulan ini. Kalau ada urusan yang nggak nyambung sama tujuan itu, turunin prioritasnya.
- `m07-R1` Dua tarikan apa yang lagi berlawanan di dalam dirimu, dan kamu mau ngikutin yang mana?

#### m08 · Strength · Kekuatan
**Arahan:** lembut dan penuh sayang, pelan, seperti menenangkan hewan. Senyum terdengar di M1.

- `m08-M1` Aku suka kartu ini. Perempuan ini lagi megang mulut singa, tapi pelan banget, kayak lagi ngelus. Singanya malah tenang. Nggak ada yang dipaksa.
- `m08-M2` Kekuatan di sini artinya sabar. Ada sesuatu di dirimu yang liar, mungkin marah, mungkin takut, dan cara terbaiknya cuma satu: dihadapi pelan-pelan.
- `m08-M3` Kamu nggak harus menang lawan perasaan itu. Temenin dulu sampai dia tenang, baru kamu bisa milih mau ngapain.
- `m08-L1` Kalau emosi naik hari ini, tarik napas dulu sebelum jawab. Tiga hitungan aja, lalu baru bicara.
- `m08-R1` Perasaan apa yang selama ini kamu lawan, padahal mungkin cuma pengen ditemenin?

#### m09 · The Hermit · Sang Pencari
**Arahan:** pelan, sunyi, suara sedikit serak. Jeda panjang di antara kalimat.

- `m09-M1` Sendirian di puncak gunung, jubahnya abu-abu, bawa lentera yang di dalamnya ada bintang. Cahayanya kecil, tapi cukup buat satu langkah di depan.
- `m09-M2` Kartu ini bilang kamu butuh menyendiri sebentar. Jawabannya susah kedengeran kalau sekelilingmu terlalu rame.
- `m09-M3` Dia nggak nerangin seluruh jalan. Cuma satu langkah yang kelihatan. Dan itu sering cukup buat mulai jalan lagi.
- `m09-L1` Sisihkan satu jam tanpa notifikasi buat dirimu sendiri, lalu tulis satu hal yang akhirnya kamu sadari.
- `m09-R1` Kalau semua suara di sekelilingmu diam, apa yang sebenernya kamu dengar dari dalam?

#### m10 · Wheel of Fortune · Roda Perubahan
**Arahan:** takjub di M1, lalu tenang dan realistis. Tempo sedang.

- `m10-M1` Roda besar di langit. Ular turun di satu sisi, sosok berkepala anjing naik di sisi lain, dan di sudut-sudutnya ada empat makhluk bersayap yang lagi asyik baca.
- `m10-M2` Ini soal siklus. Ada yang lagi naik, ada yang lagi turun, dan sebagian nggak bisa kamu atur. Kamu nggak salah kalau ada yang berubah di luar rencana.
- `m10-M3` Roda nggak nanya kamu siap atau belum. Yang bisa kamu pegang cuma porosnya: cara kamu merespons dan kebiasaanmu sendiri.
- `m10-L1` Pisahin dua daftar: hal yang bisa kamu atur dan hal yang nggak. Habisin tenagamu di daftar yang pertama.
- `m10-R1` Perubahan apa yang lagi kamu lawan, padahal mungkin udah waktunya dijalani aja?

#### m11 · Justice · Keadilan
**Arahan:** jernih, lurus, tanpa basa-basi tapi tidak dingin. Kalimat pendek.

- `m11-M1` Seseorang duduk tegak, tangan kanan megang pedang lurus ke atas, tangan kiri megang timbangan. Matanya lurus ke depan, nggak ada yang disembunyiin.
- `m11-M2` Kartu ini minta fakta. Apa yang beneran terjadi, apa tanggung jawabmu, apa tanggung jawab orang lain. Kadang jujur soal itu bikin lega, kadang lumayan nyesek.
- `m11-M3` Pedangnya tajam di dua sisi. Kejujuran berlaku buat orang lain, dan juga buat kamu sendiri. Dari situ timbangannya baru seimbang.
- `m11-L1` Tulis kronologi singkat kejadiannya tanpa komentar, cuma fakta. Lihat bagian mana yang jadi tanggunganmu dan bagian mana yang bukan.
- `m11-R1` Kalau kamu jujur sepenuhnya, bagian mana dari ceritamu yang perlu kamu akui?

#### m12 · The Hanged Man · Sudut Pandang Baru
**Arahan:** pelan, heran lalu tenang. Seperti baru menyadari sesuatu di tengah kalimat.

- `m12-M1` Orang ini tergantung terbalik di cabang pohon, satu kakinya ditekuk. Anehnya mukanya tenang banget, ada cahaya kecil di sekitar kepalanya. Dia nggak lagi menderita.
- `m12-M2` Kartu ini bilang kamu lagi ketahan, dan mungkin memang perlu ketahan dulu. Memaksa jalan sekarang malah ngaburin. Dari posisi terbalik, kadang baru kelihatan yang tadi kelewat.
- `m12-M3` Jadi menunggu di sini nggak sia-sia. Pertanyaannya cuma, kamu mau nunggu sambil menyerah, atau sambil memperhatikan.
- `m12-L1` Tahan satu keputusan besar selama beberapa hari. Selama itu, coba lihat masalahnya dari sudut pandang orang lain.
- `m12-R1` Kalau kamu lihat masalah ini terbalik, apa yang tiba-tiba kelihatan?

#### m13 · Death · Peralihan
**Arahan:** menenangkan di awal (jangan menakutkan), lalu pelan dan jujur. Jeda sebelum M3.

- `m13-M1` Tenang dulu, ini nggak seseram namanya. Rangka berzirah naik kuda putih bawa bendera bunga mawar. Di kejauhan, matahari lagi terbit di antara dua menara.
- `m13-M2` Death hampir nggak pernah soal kematian beneran. Ini soal sesuatu yang selesai: fase, kebiasaan, atau peran. Dan kamu mungkin udah lama ngerasa itu mau selesai.
- `m13-M3` Yang berat itu nahan sesuatu yang udah selesai. Begitu dilepas, tempatnya kosong buat hal lain.
- `m13-L1` Tulis satu hal yang udah selesai tapi masih kamu pegang. Lalu tentuin satu cara kecil buat bener-bener menutupnya.
- `m13-R1` Apa yang sebenernya udah selesai, dan kamu lagi nunggu apa sebelum menutupnya?

#### m14 · Temperance · Keseimbangan
**Arahan:** mengalir, tenang, ritme seperti menuang air perlahan.

- `m14-M1` Sosok bersayap ini nuangin air dari satu cawan ke cawan lain, dan nggak tumpah setetes pun. Satu kakinya di air, satu di tanah.
- `m14-M2` Ini kartu penyesuaian. Ada bagian hidupmu yang kebanyakan, ada yang kurang, dan tugasnya cuma nyampurin pelan-pelan sampai ketemu takaran yang pas.
- `m14-M3` Nggak ada rumus cepat di sini. Jalan di belakangnya naik ke arah cahaya, tapi landai. Ritmenya yang penting, nggak harus cepat.
- `m14-L1` Cek satu kebiasaan harianmu yang timpang, misalnya jam tidur atau jam kerja. Geser sedikit aja minggu ini, nggak usah dirombak total.
- `m14-R1` Bagian mana dari hidupmu yang kebanyakan, dan bagian mana yang kekurangan?

#### m15 · The Devil · Keterikatan
**Arahan:** merendah, sedikit bergidik di M1, lalu lembut dan jujur tanpa menghakimi.

- `m15-M1` Hm, kartu ini bikin merinding dikit. Sosok bertanduk duduk di atas, dan di bawahnya dua orang dirantai lehernya. Tapi lihat, rantainya longgar banget.
- `m15-M2` Kartu ini ngomongin pola yang bikin kamu terikat. Kebiasaan, hubungan, atau rasa takut yang kamu tahu nggak sehat, tapi susah dilepas karena ada enaknya juga.
- `m15-M3` Rantainya longgar, artinya bisa dilepas. Tapi kamu perlu jujur dulu soal apa yang sebenernya kamu dapet dari terus bertahan di situ.
- `m15-L1` Pikirin satu pola yang pengen kamu ubah, lalu tulis apa yang kamu dapet dari pola itu. Baru tentuin langkah kecilnya.
- `m15-R1` Apa yang kamu tahu membatasimu, tapi tetap kamu genggam?

#### m16 · The Tower · Menara
**Arahan:** kaget di M1 ("Duh"), lalu menenangkan dan stabil. Jangan dramatis berlebihan.

- `m16-M1` Duh, menara yang kesambar petir. Mahkotanya terlempar, dua orang jatuh dari jendela, api di mana-mana. Kartu ini dramatis, aku ngerti kalau kamu kaget.
- `m16-M2` Isinya soal sesuatu yang dibangun di atas dasar yang goyah, lalu runtuh mendadak. Rasanya kayak diserang, padahal retaknya sering udah lama kelihatan.
- `m16-M3` Ada sisi baiknya dikit. Sesudah runtuh, kamu bisa lihat jelas mana yang beneran kokoh dan mana yang selama ini cuma kelihatan kuat.
- `m16-L1` Kalau ada yang runtuh, urus yang paling mendesak dulu: tidur, makan, kabarin satu orang yang kamu percaya. Bangun ulangnya belakangan.
- `m16-R1` Bagian mana dari dasarmu yang sebenernya udah lama kamu curigain retak?

#### m17 · The Star · Bintang
**Arahan:** lega, lembut, napas turun. Seperti baru selesai menangis lalu tersenyum kecil.

- `m17-M1` Nah, ini napas lega. Perempuan berlutut di tepi kolam, nuangin air dari dua kendi, satu ke tanah, satu ke air. Di atasnya bintang gede, satu yang paling terang.
- `m17-M2` Kartu ini datang sesudah sesuatu yang berat. Harapannya kecil tapi nyata, dan pemulihannya jalan pelan. Kamu boleh ngerasa lebih ringan, walau belum sepenuhnya.
- `m17-M3` Dia nggak bawa janji muluk. Cuma ngingetin kamu boleh percaya lagi, sedikit-sedikit, dan itu udah cukup buat sekarang.
- `m17-L1` Lakukan satu hal kecil yang bikin kamu ngerasa dirawat hari ini. Mandi air hangat, jalan sore, atau tidur lebih awal.
- `m17-R1` Apa yang bikin kamu mulai berani berharap lagi, sekecil apa pun?

#### m18 · The Moon · Bulan
**Arahan:** pelan, agak ragu, bernuansa malam. Jeda di antara kalimat, seperti meraba.

- `m18-M1` Bulan penuh. Anjing dan serigala melolong ke arahnya, dan dari kolam ada udang karang yang pelan-pelan merangkak keluar. Cahayanya redup, jalannya samar.
- `m18-M2` Artinya banyak yang belum jelas. Kamu mungkin lagi bingung antara apa yang beneran terjadi dan apa yang cuma dibayangin sama rasa cemasmu.
- `m18-M3` Malam bikin bayangan kelihatan gede. Jadi jangan ambil keputusan besar dulu, sampai kamu bisa lihat lebih terang.
- `m18-L1` Tulis semua kekhawatiranmu, lalu coret yang cuma dugaan. Yang tersisa itulah yang perlu kamu cari tahu faktanya.
- `m18-R1` Mana yang baru dugaan, dan mana yang udah kamu tahu pasti?

#### m19 · The Sun · Matahari
**Arahan:** cerah, senyum lebar terdengar, tempo naik. Tertawa kecil di M1 boleh.

- `m19-M1` Wah, akhirnya cerah. Matahari gede, bunga matahari tinggi-tinggi, dan ada anak kecil naik kuda putih sambil ketawa. Semuanya terang, nggak ada yang ngumpet.
- `m19-M2` Kartu ini bilang ada kejelasan dan kegembiraan yang sederhana. Yang tadinya ngeruwetin pelan-pelan kelihatan lebih gamblang, dan kamu boleh menikmatinya.
- `m19-M3` Matahari juga nyorot yang selama ini ditutupin. Seneng boleh, cuma tetap jujur sama apa yang kelihatan.
- `m19-L1` Rayain satu hal yang berjalan baik minggu ini. Kasih tahu satu orang, jangan disimpen sendiri.
- `m19-R1` Apa yang akhirnya terasa jelas buat kamu, dan siapa yang pengen kamu ajak seneng?

#### m20 · Judgement · Panggilan
**Arahan:** khidmat tapi hangat, suara agak naik di M1, lalu tenang dan membujuk.

- `m20-M1` Malaikat di langit niup terompet, dan di bawah banyak orang bangkit dari peti, tangan mereka terangkat. Ada yang dewasa, ada anak kecil, semuanya menengadah.
- `m20-M2` Ini kartu evaluasi. Ada panggilan buat menengok balik apa yang udah kamu jalanin, lalu mutusin mau diapain: dimaafin, diperbaiki, atau ditutup.
- `m20-M3` Terompetnya nggak lagi menghakimi siapa pun. Dia ngasih kesempatan buat memperbaiki, dan itu cuma jalan kalau kamu mau dengerin.
- `m20-L1` Tinjau satu keputusan lama yang masih ngeganggu. Tulis apa yang kamu pelajari, lalu putusin: perbaiki, maafin, atau tutup.
- `m20-R1` Apa yang udah lama minta kamu evaluasi dengan jujur?

#### m21 · The World · Dunia
**Arahan:** puas, tenang, tersenyum. Tempo melambat di M3 seperti menutup cerita.

- `m21-M1` Perempuan menari di tengah karangan daun yang melingkar, dua tongkat di tangannya. Di empat sudut ada empat makhluk bersayap. Lingkarannya lengkap.
- `m21-M2` Kartu ini tanda penyelesaian. Sesuatu hampir selesai, atau udah, dan kamu boleh ngelihat keseluruhannya sekarang, dari awal sampai sini.
- `m21-M3` Lingkaran yang selesai juga artinya ada lingkaran baru. Jadi rayain dulu, baru pikirin mau ngapain sesudah ini.
- `m21-L1` Tulis tiga hal yang udah kamu selesaikan sampai di sini. Kasih diri sendiri pengakuan dulu sebelum mulai yang berikutnya.
- `m21-R1` Apa yang akhirnya kamu selesaikan, dan apa yang pengen kamu mulai sesudahnya?

### 6.2 Wands / Tongkat (w01 sampai w14)

#### w01 · Ace of Wands · As Tongkat
**Arahan:** segar, bersemangat kecil, seperti baru dapat ide.

- `w01-M1` Ada tangan keluar dari awan, megang tongkat yang daunnya masih tumbuh. Seger banget kartu ini, kayak ide yang baru nongol.
- `w01-M2` Percikan baru. Ada dorongan buat memulai sesuatu, dan energinya masih mentah. Nggak usah nunggu rencananya sempurna, tapi jangan juga dihabisin di hari pertama.
- `w01-L1` Catat idenya hari ini juga, satu kalimat aja. Lalu tentuin satu hal yang bisa kamu kerjain dalam dua puluh menit.
- `w01-R1` Ide apa yang tiba-tiba bikin kamu semangat, tapi masih kamu tahan sendiri?

#### w02 · Two of Wands · Dua Tongkat
**Arahan:** merenung, menatap jauh. Tempo sedang.

- `w02-M1` Dia berdiri di atas tembok kastil, megang bola dunia kecil, ngelihat jauh ke laut. Satu tongkat di tangannya, satu lagi tertancap di tembok.
- `w02-M2` Kamu lagi di tahap merencanakan. Udah ada yang kamu punya, tapi dunia di luar lebih luas, dan kamu lagi mikir mau melangkah ke arah mana.
- `w02-L1` Coba tulis dua arah yang mungkin kamu tuju, lalu cari satu informasi nyata soal masing-masing sebelum milih.
- `w02-R1` Kalau kamu keluar dari tembok ini, kamu pengen pergi ke arah mana?

#### w03 · Three of Wands · Tiga Tongkat
**Arahan:** penuh harap, tenang, pandangan jauh.

- `w03-M1` Lihat, orangnya membelakangi kita di atas bukit, ngelihat kapal-kapal di laut. Tiga tongkat tertancap di sekitarnya. Dia udah lama nunggu, dan sekarang ada yang kelihatan datang.
- `w03-M2` Yang kamu tanam mulai kelihatan hasilnya, atau setidaknya peluang baru muncul di cakrawala. Ini kartu soal melihat jauh, belum soal mengejar.
- `w03-L1` Minggu ini, tanggapi satu peluang yang udah kelihatan tapi belum kamu respons. Kirim satu pesan atau satu lamaran.
- `w03-R1` Peluang apa yang udah kelihatan di kejauhan, tapi kamu belum berani mendekat?

#### w04 · Four of Wands · Empat Tongkat
**Arahan:** ceria, sedikit tertawa, seperti ikut berpesta.

- `w04-M1` Empat tongkat dihias karangan bunga, kayak gerbang pesta. Di bawahnya ada dua orang mengangkat bunga, dan di belakang ada kastil dengan banyak orang berkumpul.
- `w04-M2` Ini kartu perayaan kecil. Ada sesuatu yang pantas dirayain bareng, entah tugas yang selesai, kumpul keluarga, atau sekadar fase yang akhirnya stabil.
- `w04-L1` Ajak orang-orang terdekatmu ngumpul sebentar, nggak harus besar. Rayain hal yang udah beres, sekecil apa pun.
- `w04-R1` Apa yang udah kamu lewatin dan pantas dirayain bareng orang lain?

#### w05 · Five of Wands · Lima Tongkat
**Arahan:** sedikit geli sekaligus lelah, tempo agak cepat di M1.

- `w05-M1` Lima orang saling ayun tongkat, nggak ada yang kompak. Kelihatannya kacau, tapi nggak ada yang beneran terluka. Kayak lagi adu argumen yang kepanjangan.
- `w05-M2` Kartu ini soal beda pendapat dan persaingan. Banyak suara, banyak kepentingan, energi ke mana-mana. Belum tentu buruk, cuma melelahkan.
- `w05-L1` Sebelum ikut adu, tanya dulu: ini penting nggak buat aku? Kalau iya, ajak ngomong satu lawan satu.
- `w05-R1` Perdebatan apa yang bikin kamu capek, dan sebenernya kamu pengen dapet apa dari situ?

#### w06 · Six of Wands · Enam Tongkat
**Arahan:** bangga dan hangat, senyum terdengar.

- `w06-M1` Satu penunggang kuda, kepalanya dikalungi daun laurel, dikelilingi orang-orang yang bawa tongkat. Semua mata ngarah ke dia. Dia menang, dan orang-orang ngakuin itu.
- `w06-M2` Usahamu dilihat orang. Ada pengakuan atau hasil yang beneran kamu dapetin lewat kerja keras. Boleh bangga, tanpa harus buru-buru pamer.
- `w06-L1` Catat satu hasil kerjamu yang selama ini kamu anggap biasa. Kalau ada yang muji, terima aja, nggak usah ngeles.
- `w06-R1` Pencapaian mana yang belum benar-benar kamu akui sendiri?

#### w07 · Seven of Wands · Tujuh Tongkat
**Arahan:** tegang tapi manusiawi, sedikit terengah.

- `w07-M1` Dia berdiri di atas bukit, satu tongkat di tangan, sementara enam tongkat nyodok dari bawah. Sepatunya aja nggak sepasang, kelihatan keburu-buru berdiri di situ.
- `w07-M2` Kamu lagi mempertahankan sesuatu: posisimu, pendapatmu, batasmu. Di atas kamu punya keuntungan, tapi capeknya juga nyata.
- `w07-L1` Tentuin satu hal yang beneran harus kamu pertahankan, dan satu yang boleh dilepas supaya tenagamu nggak habis.
- `w07-R1` Apa yang beneran layak kamu pertahankan, dan apa yang cuma bikin capek?

#### w08 · Eight of Wands · Delapan Tongkat
**Arahan:** cepat, ringan, tempo naik.

- `w08-M1` Delapan tongkat melesat di udara, miring semua searah, di atas sungai dan bukit yang tenang. Nggak ada orangnya, cuma geraknya.
- `w08-M2` Kartu ini soal kecepatan. Kabar bisa datang cepat, urusan bisa bergerak cepat, dan kamu mungkin harus ikut bergerak tanpa kebanyakan mikir.
- `w08-L1` Balas satu pesan atau urus satu hal yang udah kamu tunda, sekarang aja. Momentumnya lagi ada, sayang kalau dilewatin.
- `w08-R1` Urusan apa yang tiba-tiba bergerak cepat, dan kamu udah siap sejauh mana?

#### w09 · Nine of Wands · Sembilan Tongkat
**Arahan:** lelah tapi waspada, pelan.

- `w09-M1` Orangnya berperban di kepala, bersandar di satu tongkat, matanya masih waspada. Delapan tongkat berjejer di belakangnya kayak pagar. Dia udah banyak lewatin, dan masih jaga.
- `w09-M2` Kamu hampir sampai, tapi capeknya udah banyak. Wajar kalau waspada. Yang perlu dijaga sekarang tenagamu, jangan cuma kewaspadaanmu.
- `w09-L1` Pilih satu hal yang bisa kamu istirahatin hari ini tanpa rasa bersalah. Sisanya, jaga seperlunya dulu.
- `w09-R1` Kamu masih jaga dari apa, dan sampai kapan kamu perlu terus jaga?

#### w10 · Ten of Wands · Sepuluh Tongkat
**Arahan:** berat, menghela napas, empati.

- `w10-M1` Duh, lihat dia membungkuk, sepuluh tongkat dipeluk di dada sampai nggak bisa lihat jalan. Rumahnya udah kelihatan, tapi bebannya kebanyakan.
- `w10-M2` Beban yang kamu bawa kelewat banyak, dan sebagian mungkin bukan punyamu. Kamu nanggung banyak karena kamu yang paling bisa.
- `w10-L1` Tulis semua yang lagi kamu pikul, lalu coret satu yang bisa kamu serahin atau tunda ke orang lain.
- `w10-R1` Beban mana yang sebenernya bisa kamu taruh, kalau kamu mau minta tolong?

#### w11 · Page of Wands · Pemula Tongkat
**Arahan:** penasaran, polos, nada naik.

- `w11-M1` Seorang pemuda berdiri di tengah gurun, megang tongkat yang tunasnya baru keluar, ngelihatin ujungnya dengan penasaran. Bajunya penuh motif salamander.
- `w11-M2` Kamu lagi pengen nyoba sesuatu, rasa penasarannya lagi tinggi. Belum perlu jago. Kamu lagi di tahap seneng eksplorasi, dan itu sah-sah aja.
- `w11-L1` Cobain satu hal baru kecil-kecilan minggu ini, tanpa ekspektasi harus bagus. Cuma buat ngelihat kamu suka atau nggak.
- `w11-R1` Apa yang bikin kamu penasaran akhir-akhir ini, tapi belum sempat kamu coba?

#### w12 · Knight of Wands · Ksatria Tongkat
**Arahan:** cepat dan bersemangat, lalu sedikit ditahan di akhir M2.

- `w12-M1` Ksatria di atas kuda yang lagi menjejak tinggi, bajunya merah, tongkat di tangan. Dia siap berangkat sekarang juga, belum tentu tahu tujuannya.
- `w12-M2` Kamu pengen bergerak, dan nyalinya gede. Bagus buat memulai. Tapi hati-hati, semangat yang melaju tanpa arah gampang nabrak orang.
- `w12-L1` Sebelum berangkat, tulis tujuannya dalam satu kalimat. Lalu lakukan langkah pertama sambil sesekali cek arahmu.
- `w12-R1` Kamu pengen cepat sampai ke mana, dan siapa yang mungkin kamu lewatin di jalan?

#### w13 · Queen of Wands · Ratu Tongkat
**Arahan:** hangat, percaya diri, senyum terdengar.

- `w13-M1` Ratu duduk santai di takhtanya, satu tangan megang bunga matahari, satunya tongkat. Di kakinya ada kucing hitam yang waspada. Dia kelihatan nyaman banget jadi dirinya.
- `w13-M2` Kartu ini soal percaya diri yang hangat. Kamu tahu apa yang kamu mau, dan orang di sekitarmu ikut tenang karena itu. Kamu nggak perlu keras buat dihormati.
- `w13-L1` Ambil satu pembicaraan yang biasanya kamu hindarin, dan hadapi dengan suara yang tenang dan jelas.
- `w13-R1` Di mana kamu paling terang jadi dirimu sendiri, dan di mana kamu mengecilkannya?

#### w14 · King of Wands · Raja Tongkat
**Arahan:** mantap, hangat, seperti pemimpin yang nggak perlu berteriak.

- `w14-M1` Raja duduk tegak di takhta berhias singa, megang tongkat yang masih bertunas. Dia nggak buru-buru, tapi semuanya terarah ke dia.
- `w14-M2` Kartu ini soal memimpin dengan arah yang jelas. Kamu punya visi, dan orang lain butuh dengar ke mana semua ini menuju.
- `w14-L1` Tulis satu paragraf soal arah yang kamu mau, lalu sampaikan ke orang-orang yang terlibat. Satu kalimat jelas lebih berguna dari seribu semangat.
- `w14-R1` Kalau kamu bilang dengan jelas ke mana arahnya, apa yang akan kamu katakan?

### 6.3 Cups / Cawan (c01 sampai c14)

#### c01 · Ace of Cups · As Cawan
**Arahan:** lembut, terbuka, seperti menyambut sesuatu yang baru.

- `c01-M1` Tangan keluar dari awan megang cawan yang airnya meluap ke kolam penuh teratai. Di atasnya ada merpati, dan lima aliran air jatuh. Pelan, nggak ada yang ditahan.
- `c01-M2` Ini kartu perasaan yang baru. Ada ruang buat rasa yang tulus muncul lagi, entah sayang atau lega. Kamu boleh menerimanya tanpa mikir harus ngapain.
- `c01-L1` Biarin diri ngerasain satu hal baik hari ini, sebentar aja, tanpa dianalisis atau dikomentari.
- `c01-R1` Perasaan apa yang pelan-pelan muncul lagi, dan kamu masih ragu mengakuinya?

#### c02 · Two of Cups · Dua Cawan
**Arahan:** hangat, akrab, senyum lembut.

- `c02-M1` Dua orang berhadapan, saling ngangkat cawan, kayak lagi bikin janji kecil. Di atas mereka ada lambang singa bersayap, dan di bukit jauh ada sebuah rumah.
- `c02-M2` Hubungan yang timbal balik. Kamu ngasih, dia juga ngasih, dua-duanya tulus. Bisa soal pasangan, sahabat, atau rekan kerja yang beneran nyambung.
- `c02-L1` Bilang satu hal yang kamu hargai ke seseorang dalam hidupmu. Langsung aja, nggak usah dibungkus panjang.
- `c02-R1` Hubungan mana yang terasa seimbang buat kamu, dan mana yang belum?

#### c03 · Three of Cups · Tiga Cawan
**Arahan:** hangat dan riang, seperti bercerita tentang teman.

- `c03-M1` Tiga perempuan berdiri melingkar, cawan terangkat tinggi, kayaknya lagi ngerayain sesuatu. Di kaki mereka ada buah-buahan dan hasil panen berserakan.
- `c03-M2` Ada dukungan di sekelilingmu. Teman, keluarga, atau komunitas yang beneran peduli. Kamu nggak harus nanggung semuanya sendirian.
- `c03-L1` Hubungi satu teman yang bikin kamu nyaman, ajak ngobrol atau makan bareng minggu ini.
- `c03-R1` Siapa yang selalu ada buat kamu, dan kapan terakhir kamu bilang makasih?

#### c04 · Four of Cups · Empat Cawan
**Arahan:** datar dan agak bosan di M1, lalu sedikit menyentil di M2.

- `c04-M1` Dia duduk bersila di bawah pohon, tangan terlipat, menatap tiga cawan di depannya. Dari awan ada tangan nyodorin cawan keempat, tapi dia belum lihat.
- `c04-M2` Kamu lagi jenuh, atau lagi bertanya apa semua ini cukup. Bisa jadi ada tawaran yang lewat, dan kamu terlalu sibuk bosan buat nyadar.
- `c04-L1` Tanya diri sendiri jujur: aku bosan karena apa? Kalau jawabannya jelas, tentuin satu perubahan kecil dari situ.
- `c04-R1` Tawaran atau peluang apa yang mungkin lewat, karena kamu lagi nggak ngelihat ke arahnya?

#### c05 · Five of Cups · Lima Cawan
**Arahan:** pelan, murung tapi lembut. Di akhir M2 ada harapan kecil.

- `c05-M1` Sosok berjubah hitam menunduk, ngelihat tiga cawan yang tumpah. Tapi di belakangnya masih ada dua cawan yang berdiri tegak, dan dia belum noleh.
- `c05-M2` Ada yang hilang, dan sedihnya nyata. Boleh kok berlama-lama di situ. Sesekali tengok ke belakang aja, karena masih ada yang tersisa.
- `c05-L1` Kasih waktu buat berduka atas yang hilang, mungkin lewat nulis atau cerita ke orang. Lalu catat satu hal yang masih kamu punya.
- `c05-R1` Apa yang masih utuh, di tengah apa yang udah tumpah?

#### c06 · Six of Cups · Enam Cawan
**Arahan:** nostalgia, hangat, tersenyum kecil.

- `c06-M1` Dua anak kecil di halaman rumah tua, yang satu nyodorin cawan penuh bunga ke yang lain. Suasananya hangat, kayak kenangan yang diputer lagi.
- `c06-M2` Ada rasa akrab dari masa lalu yang muncul. Bisa orangnya, tempatnya, atau kebiasaan lama. Menghangatkan, tapi jangan sampai bikin kamu nggak mau lihat hari ini.
- `c06-L1` Buka satu foto atau pesan lama, nikmatin sebentar. Lalu tanya: ada yang dari sana yang bisa kubawa ke sekarang?
- `c06-R1` Kenangan apa yang lagi sering datang, dan dia lagi ngingetin kamu soal apa?

#### c07 · Seven of Cups · Tujuh Cawan
**Arahan:** tertarik lalu menimbang, sedikit menggoda.

- `c07-M1` Seseorang berdiri membelakangi kita, ngelihat tujuh cawan melayang di awan. Isinya macem-macem: harta, kastil, naga, wajah. Semuanya kelihatan menggoda.
- `c07-M2` Pilihanmu banyak, dan sebagian mungkin cuma angan-angan. Kartu ini minta kamu bedain mana yang beneran bisa dikerjain, mana yang cuma enak dibayangin.
- `c07-L1` Tulis semua pilihanmu, coret yang nggak realistis. Dari yang tersisa, pilih satu dan coba dulu seminggu.
- `c07-R1` Dari semua yang menggoda itu, mana yang beneran bisa kamu kerjain?

#### c08 · Eight of Cups · Delapan Cawan
**Arahan:** pelan, suasana malam, jujur dan lembut. Tidak menyalahkan.

- `c08-M1` Dia berjalan menjauh di malam hari, tongkat di tangan, ninggalin delapan cawan yang tertata rapi. Bulan di atasnya, gunung di depannya.
- `c08-M2` Ada sesuatu yang udah nggak cukup, walau kelihatannya lengkap. Kamu mungkin pengen pergi dari situ, dan itu bukan berarti kamu nggak bersyukur.
- `c08-L1` Tulis apa yang kurang dari situasimu sekarang. Kalau kamu pergi, apa yang bakal kamu cari?
- `c08-R1` Apa yang kelihatan cukup di mata orang lain, tapi nggak lagi cukup buatmu?

#### c09 · Nine of Cups · Sembilan Cawan
**Arahan:** puas, rileks, senyum terdengar.

- `c09-M1` Dia duduk santai di bangku, tangan terlipat, puas banget. Di belakangnya sembilan cawan berjejer rapi. Kelihatannya baru selesai makan enak.
- `c09-M2` Kartu kepuasan. Ada hal yang udah kamu capai dan boleh kamu nikmatin. Ini soal menghargai yang udah cukup, nggak perlu nambah terus.
- `c09-L1` Nikmatin satu hal yang udah kamu punya hari ini, tanpa mikirin yang berikutnya. Makan pelan, atau duduk di tempat favoritmu.
- `c09-R1` Kalau hari ini kamu bilang cukup, apa yang kamu syukuri?

#### c10 · Ten of Cups · Sepuluh Cawan
**Arahan:** hangat banget, hampir haru.

- `c10-M1` Sepasang suami istri berpelukan, dua anak menari di samping, dan pelangi dari sepuluh cawan membentang di langit. Rumahnya kecil, hijau, dan hangat banget.
- `c10-M2` Rasa diterima bersama. Ada tempat atau orang yang bikin kamu ngerasa pulang. Kalau belum ada, kartu ini nunjukin apa yang lagi kamu cari.
- `c10-L1` Luangin satu waktu makan atau ngobrol bareng orang yang bikin kamu nyaman. Taruh HP di tas.
- `c10-R1` Di mana kamu merasa benar-benar diterima, dan apa yang bikin begitu?

#### c11 · Page of Cups · Pemula Cawan
**Arahan:** heran, polos, nada naik di M1.

- `c11-M1` Pemuda berdiri di tepi laut, megang cawan, dan dari dalamnya nongol ikan kecil. Dia sendiri ngelihatnya takjub, kayak nggak nyangka.
- `c11-M2` Kamu lagi peka. Ada kabar atau perasaan kecil yang muncul tiba-tiba, dan ngagetin. Dengerin dulu, nggak usah buru-buru dinilai.
- `c11-L1` Catat satu perasaan atau ide aneh yang tiba-tiba muncul hari ini. Nggak usah disaring, tulis aja.
- `c11-R1` Perasaan kecil apa yang muncul tiba-tiba dan bikin kamu heran?

#### c12 · Knight of Cups · Ksatria Cawan
**Arahan:** lembut, pelan, seperti mengikuti langkah kuda.

- `c12-M1` Ksatria naik kuda putih, jalannya pelan, cawannya dipegang hati-hati kayak takut tumpah. Dia datang bawa sesuatu, dan niatnya hangat.
- `c12-M2` Ada tawaran atau perasaan yang datang dengan niat baik. Bisa dari orang lain, bisa dari dirimu. Terima pelan-pelan, sambil tetap cek apa itu nyata.
- `c12-L1` Kalau ada yang menawarkan sesuatu hari ini, dengerin sampai habis dulu. Baru tentuin kamu terima atau nggak.
- `c12-R1` Perasaan atau tawaran apa yang datang, dan menurutmu niatnya tulus?

#### c13 · Queen of Cups · Ratu Cawan
**Arahan:** tenang, mendalam, seperti mendengarkan sesuatu dari kejauhan.

- `c13-M1` Ratu duduk di tepi laut, megang cawan yang tertutup rapat, hiasannya rumit banget. Dia menatap cawannya lama, seolah lagi dengerin sesuatu dari dalam.
- `c13-M2` Kartu ini soal mendengarkan tanpa tenggelam. Kamu peka sama perasaan orang, dan perasaanmu sendiri. Cuma tetap perlu jaga batas biar nggak habis.
- `c13-L1` Sebelum bantu orang lain hari ini, cek dulu tenagamu sendiri. Kalau udah menipis, bilang jujur.
- `c13-R1` Perasaan siapa yang paling sering kamu bawa, dan perasaanmu sendiri dibawa siapa?

#### c14 · King of Cups · Raja Cawan
**Arahan:** tenang, mantap, nada rendah. Tidak datar.

- `c14-M1` Raja duduk di takhta yang mengapung di laut berombak. Tenang banget, cawan di satu tangan, tongkat di tangan lain. Ikan melompat, kapal lewat, dia nggak terusik.
- `c14-M2` Kartu ini soal mengelola perasaan dengan tenang. Rasa tetap ada, tapi nggak ngatur kamu. Kamu bisa merasa dalam, sambil tetap mikir lurus.
- `c14-L1` Pas lagi emosi, kasih jeda dulu sebelum bertindak. Kalau perlu tulis dulu, kirimnya belakangan.
- `c14-R1` Di situasi mana kamu pengen lebih tenang, tapi perasaanmu masih ngatur?

### 6.4 Swords / Pedang (s01 sampai s14)

#### s01 · Ace of Swords · As Pedang
**Arahan:** jernih, tegas, seperti napas segar.

- `s01-M1` Ada tangan keluar dari awan megang pedang yang ujungnya dimahkotai daun. Langitnya kelabu dan gunungnya terjal, tapi pedangnya berkilat lurus.
- `s01-M2` Kartu ini bawa kejelasan. Ada hal yang akhirnya kelihatan tegas di kepalamu, dan kamu boleh ngomong atau memutuskan dengan lugas.
- `s01-L1` Rumuskan kesimpulanmu dalam satu kalimat jelas. Kalau perlu disampaikan ke orang lain, mulai dari kalimat itu.
- `s01-R1` Apa yang akhirnya terasa jelas buat kamu, dan kamu siap mengatakannya?

#### s02 · Two of Swords · Dua Pedang
**Arahan:** pelan, tertahan, seperti menahan napas.

- `s02-M1` Perempuan duduk di tepi laut, matanya ditutup kain, dua pedang disilang di dadanya. Bulan sabit di atasnya, dan dia sama sekali nggak bergerak.
- `s02-M2` Kamu menunda keputusan karena dua-duanya berat. Dengan mata tertutup rasanya aman, cuma makin lama ditunda, makin berat beban nggak mutusin.
- `s02-L1` Tulis untung rugi dua pilihanmu, lalu kasih tenggat. Hari ini atau besok kamu udah harus milih satu.
- `s02-R1` Apa yang kamu hindari lihat, dengan cara nutup mata?

#### s03 · Three of Swords · Tiga Pedang
**Arahan:** pelan, empati, tanpa dramatisasi. Jeda lama setelah M1.

- `s03-M1` Hati merah ditembus tiga pedang, latarnya hujan deras dan awan kelabu. Nggak ada orang, cuma hatinya aja. Kartu ini emang langsung.
- `s03-M2` Ada rasa sakit yang nyata, mungkin karena kata-kata atau kehilangan. Kartu ini nggak minta kamu pura-pura baik-baik aja. Jujur ke diri sendiri dulu.
- `s03-L1` Ceritain ke satu orang yang kamu percaya, atau tulis semuanya di kertas. Biar sakitnya keluar, jangan cuma disimpen.
- `s03-R1` Rasa sakit apa yang belum pernah benar-benar kamu ceritain?

#### s04 · Four of Swords · Empat Pedang
**Arahan:** sangat tenang, napas panjang, nyaris menidurkan.

- `s04-M1` Ada sosok terbaring di atas peti batu di dalam gereja, tangan terlipat. Tiga pedang tergantung di dinding, satu lagi di bawahnya. Suasananya hening banget.
- `s04-M2` Kamu butuh istirahat buat pikiran. Bukan cuma tidur, tapi berhenti mikir sebentar. Ini jeda yang sah, dan nggak berarti kamu mundur.
- `s04-L1` Sisihkan satu hari tanpa memutuskan hal besar. Tidur cukup, jauhin layar, dan biarin kepalamu diam.
- `s04-R1` Apa yang bisa berhenti kamu pikirin untuk sementara?

#### s05 · Five of Swords · Lima Pedang
**Arahan:** sinis ringan di M1, lalu jujur dan agak murung di M2.

- `s05-M1` Satu orang berdiri sambil senyum miring, ngumpulin pedang-pedang. Sebagian pedang masih tergeletak di tanah, dan dua orang lain berjalan menjauh dengan bahu turun.
- `s05-M2` Menang, tapi ada harganya. Mungkin kamu benar, tapi hubungan atau perasaan orang lain ikut kena. Kartu ini nanya: menang kayak gini sebanding nggak?
- `s05-L1` Sebelum lanjut debat, tanya diri sendiri: aku mau menang, atau mau selesai? Pilih satu, lalu bicara sesuai pilihan itu.
- `s05-R1` Kemenangan mana yang ternyata ninggalin rasa nggak enak?

#### s06 · Six of Swords · Enam Pedang
**Arahan:** tenang, mengalir, perlahan melega.

- `s06-M1` Perahu kecil, di dalamnya perempuan dan anak berselimut, ada tukang perahu yang ngedayung pelan. Pedang-pedang berdiri di perahunya, dan di depan airnya makin tenang.
- `s06-M2` Kamu lagi beralih dari keadaan yang berat ke yang lebih tenang. Belum sepenuhnya sampai, tapi arahnya benar. Bawaanmu ikut, dan itu wajar.
- `s06-L1` Siapin satu hal yang bantu masa transisi ini: tempat tenang, orang yang menemani, atau jadwal yang lebih ringan.
- `s06-R1` Kamu pergi dari mana, dan apa yang masih kamu bawa?

#### s07 · Seven of Swords · Tujuh Pedang
**Arahan:** berbisik, penuh rahasia, sedikit curiga.

- `s07-M1` Hm, lihat orangnya berjingkat keluar dari kemah, bawa lima pedang di pelukan, dua ditinggal. Dia noleh ke belakang, kayak takut ketahuan.
- `s07-M2` Ada strategi, atau ada hal yang disembunyiin. Bisa dari orang lain, bisa dari kamu. Kartu ini minta kamu jujur soal siapa yang lagi nyembunyiin apa.
- `s07-L1` Cek satu hal yang kamu simpan sendiri. Kalau bakal lebih lega diomongin, cari cara menyampaikannya.
- `s07-R1` Apa yang kamu atau orang lain belum ngomong terus terang?

#### s08 · Eight of Swords · Delapan Pedang
**Arahan:** pelan, bersimpati, lalu pelan-pelan memberi semangat di M2.

- `s08-M1` Perempuan berdiri dengan mata ditutup, badan diikat kain, delapan pedang menancap melingkarinya. Di kakinya air dangkal, dan di belakang ada kastil.
- `s08-M2` Kamu merasa terkurung. Tapi lihat, ikatannya longgar dan pedangnya nggak nutup jalan keluar. Sebagian batasnya ada di cara kamu menilai keadaan.
- `s08-L1` Tulis semua alasan kenapa kamu merasa nggak bisa apa-apa. Lalu tandai mana yang fakta, mana yang cuma perasaan.
- `s08-R1` Batas mana yang beneran ada, dan mana yang cuma kamu yakini ada?

#### s09 · Nine of Swords · Sembilan Pedang
**Arahan:** pelan, suasana malam, empati. Tidak mendramatisasi.

- `s09-M1` Seseorang duduk tegak di tempat tidur, kedua tangannya nutup wajah. Sembilan pedang tergantung di dinding belakang. Gelap, tengah malam.
- `s09-M2` Pikiranmu muter terus, apalagi malam. Rasa cemasnya nyata, tapi sering kelihatan lebih besar dari kenyataan yang ada di depan mata.
- `s09-L1` Tulis yang bikin kamu nggak bisa tidur, lalu tutup bukunya. Kalau cemasnya berlarut-larut, ngobrol sama orang yang kamu percaya atau tenaga profesional.
- `s09-R1` Kekhawatiran mana yang beneran bisa kamu tindaklanjuti besok pagi?

#### s10 · Ten of Swords · Sepuluh Pedang
**Arahan:** pelan dan lembut, menenangkan di awal, harapan kecil di akhir M1.

- `s10-M1` Seseorang tertelungkup, sepuluh pedang menancap di punggungnya. Ngeri, aku tahu. Tapi lihat di kejauhan: langit gelap, dan di cakrawala fajar udah mulai terbit.
- `s10-M2` Kartu ini tanda akhir yang menyakitkan, sesuatu yang memang harus diakui selesai. Nggak ada pedang lain yang bisa ditambah, jadi dari sini jalannya cuma naik.
- `s10-L1` Akui satu hal yang udah berakhir, sekecil apa pun. Setelah itu tidur dan makan yang cukup. Urusan lain belakangan.
- `s10-R1` Apa yang udah selesai, dan sebenernya kamu tahu itu udah lama?

#### s11 · Page of Swords · Pemula Pedang
**Arahan:** waspada, ingin tahu, tempo agak cepat.

- `s11-M1` Pemuda berdiri di bukit berangin, pedang terangkat tinggi, matanya waspada ngelihat sekeliling. Awan bergerak cepat, burung beterbangan.
- `s11-M2` Kamu lagi pengen tahu. Banyak nanya, banyak ngecek. Itu bagus, asal informasinya diperiksa dulu, nggak sekadar diterima lalu disebar.
- `s11-L1` Cek satu klaim yang kamu dengar baru-baru ini. Cari sumber aslinya sebelum percaya atau cerita ke orang.
- `s11-R1` Apa yang pengen kamu tahu, tapi belum berani kamu tanyain langsung?

#### s12 · Knight of Swords · Ksatria Pedang
**Arahan:** cepat, nyaris tergesa, lalu mengerem di M2.

- `s12-M1` Ksatria menerjang di atas kuda yang ngebut, pedang terangkat, pohon-pohon di belakangnya miring kena angin. Dia nggak lihat kiri kanan.
- `s12-M2` Kamu atau seseorang lagi bergerak cepat dengan kata-kata yang tajam. Ide bagus kalau disampaikan cepat dan tegas, tapi bisa nusuk orang kalau nggak dijaga.
- `s12-L1` Sebelum kirim pesan atau ngomong tajam hari ini, tahan satu menit. Baca ulang dari sudut orang yang nerima.
- `s12-R1` Kata mana yang buru-buru keluar dan mungkin nyakitin orang?

#### s13 · Queen of Swords · Ratu Pedang
**Arahan:** lurus, tenang, jelas. Tidak dingin.

- `s13-M1` Ratu duduk tegak di tahta tinggi, pedang lurus di satu tangan, tangan lain terbuka ke depan. Matanya lurus, dan awan di belakangnya bergerak cepat.
- `s13-M2` Kartu ini soal batas dan kejujuran. Kamu bisa bicara apa adanya, dan itu bukan kejam, itu jelas. Kamu tahu apa yang kamu mau dan apa yang nggak.
- `s13-L1` Tentuin satu hal yang selama ini nggak kamu bilang tegas. Susun kalimatnya singkat, sampaikan tanpa minta maaf berlebihan.
- `s13-R1` Apa yang selama ini pengen kamu katakan dengan tegas, tapi kamu tahan?

#### s14 · King of Swords · Raja Pedang
**Arahan:** jernih, tenang, nada rendah, tempo teratur.

- `s14-M1` Raja duduk di takhta, pedang lurus di tangan kanan, langit biru dengan awan cerah di belakangnya. Wajahnya tenang, tatapannya jernih.
- `s14-M2` Kartu ini soal menilai dengan tanggung jawab. Kamu bisa lihat masalah dengan kepala dingin, dan keputusanmu bisa dipertanggungjawabkan.
- `s14-L1` Sebelum memutuskan, tulis tiga pertimbangan utama dan konsekuensinya. Putuskan berdasarkan itu, bukan suasana hati.
- `s14-R1` Kalau emosimu kamu lepas dulu, keputusan apa yang paling masuk akal?

### 6.5 Pentacles / Koin (p01 sampai p14)

#### p01 · Ace of Pentacles · As Koin
**Arahan:** cerah, hangat, optimis kecil.

- `p01-M1` Tangan keluar dari awan nyodorin koin emas ke taman yang rapi. Ada lengkungan bunga putih dan gunung di kejauhan. Kayak tawaran yang bisa kamu pegang beneran.
- `p01-M2` Ada kesempatan nyata, soal kerjaan, uang, atau kesehatan. Bukan khayalan. Syaratnya kamu mau mulai dari yang kecil dan nyata.
- `p01-L1` Tulis satu kesempatan yang kelihatan konkret, lalu tentuin langkah pertama yang bisa kamu lakukan dalam seminggu.
- `p01-R1` Kesempatan apa yang udah ada di depan mata, tapi belum kamu raih?

#### p02 · Two of Pentacles · Dua Koin
**Arahan:** ringan, sedikit geli, ritme naik turun seperti ombak.

- `p02-M1` Dia menari sambil juggling dua koin yang dihubungkan simbol tak hingga. Di belakangnya kapal naik turun di ombak besar. Kelihatan santai, padahal sibuk.
- `p02-M2` Kamu lagi nata beberapa kebutuhan sekaligus: waktu, uang, tenaga. Kamu bisa, cuma butuh ritme yang realistis, jangan maksa semuanya sempurna.
- `p02-L1` Tulis semua yang lagi kamu juggling, lalu urutin. Tunda atau lepas satu yang paling nggak mendesak.
- `p02-R1` Dari semua yang kamu urus, mana yang bisa dikurangin?

#### p03 · Three of Pentacles · Tiga Koin
**Arahan:** hangat, kolaboratif, tempo sedang.

- `p03-M1` Seorang pemahat berdiri di atas bangku, kerja di dinding katedral, dua orang di bawahnya megang gambar rancangan. Mereka lagi nentuin bareng gimana hasilnya.
- `p03-M2` Kamu belajar atau berkembang lewat kerja sama. Ada keahlian tiap orang yang saling melengkapi, dan hasilnya lebih bagus dari kerja sendirian.
- `p03-L1` Minta masukan dari satu orang yang lebih ahli, atau tawarkan keahlianmu ke satu proyek bareng.
- `p03-R1` Siapa yang bisa melengkapi kekuranganmu, dan apa yang bisa kamu tawarkan balik?

#### p04 · Four of Pentacles · Empat Koin
**Arahan:** pelan, sedikit menyentil, lalu lembut.

- `p04-M1` Dia duduk mendekap satu koin di dadanya, satu di kepala, dua lagi dipijak di bawah kaki. Kota ada di belakangnya, tapi dia nggak ngelihat ke sana.
- `p04-M2` Kamu menjaga sesuatu erat-erat, dan bisa jadi kelewat erat. Hemat itu baik, tapi kalau karena takut kehilangan, hidupmu ikut menyempit.
- `p04-L1` Cek satu pengeluaran atau tenaga yang kamu tahan karena takut. Pilih satu yang sebenernya aman buat dilonggarin.
- `p04-R1` Apa yang kamu genggam erat karena takut hilang?

#### p05 · Five of Pentacles · Lima Koin
**Arahan:** pelan, hangat, empati. Tidak menggurui soal bantuan.

- `p05-M1` Dua orang berjalan di salju, yang satu pincang pakai kruk, yang satu merangkul selimut tipis. Di sebelah mereka ada jendela gereja yang hangat, dan mereka belum noleh.
- `p05-M2` Ada rasa kekurangan, soal uang, tenaga, atau dukungan. Pintu bantuan kadang ada di dekat kita, cuma kita udah terlalu capek buat ngetok.
- `p05-L1` Cari satu sumber bantuan yang nyata: teman, keluarga, atau layanan setempat. Kirim satu pesan minta bantuan hari ini.
- `p05-R1` Bantuan apa yang sebenernya bisa kamu minta, tapi masih kamu tahan?

#### p06 · Six of Pentacles · Enam Koin
**Arahan:** tenang, adil, hangat. Tempo sedang.

- `p06-M1` Seseorang berdiri pegang timbangan, tangan satunya ngasih koin ke dua orang yang berlutut di depannya. Semuanya ditimbang, nggak sembarangan.
- `p06-M2` Soal memberi dan menerima. Kamu mungkin lagi di sisi yang ngasih, mungkin yang nerima. Dua-duanya sah, asal ada rasa saling hormat.
- `p06-L1` Kalau kamu lagi butuh bantuan, terima dengan terima kasih. Kalau kamu bisa bantu, pilih satu cara yang nggak bikin dirimu kosong.
- `p06-R1` Dalam hubungan ini, kamu lebih sering ngasih atau nerima?

#### p07 · Seven of Pentacles · Tujuh Koin
**Arahan:** tenang, menimbang, tempo lambat.

- `p07-M1` Dia berhenti sebentar, bersandar di cangkulnya, ngelihat tujuh koin yang tumbuh di semak. Tangannya istirahat, matanya menilai.
- `p07-M2` Usahamu mulai kelihatan hasilnya, tapi belum panen penuh. Saatnya menilai: yang udah kamu kerjain ngasih hasil yang pantas nggak?
- `p07-L1` Tinjau satu usaha yang udah jalan beberapa waktu. Catat apa yang berhasil dan apa yang perlu disesuaikan.
- `p07-R1` Apa yang udah kamu tanam, dan hasilnya sebanding nggak sama tenagamu?

#### p08 · Eight of Pentacles · Delapan Koin
**Arahan:** tenang, ritmis, sabar.

- `p08-M1` Dia duduk fokus di bangku kerja, memahat koin satu per satu. Enam udah dipajang, tinggal satu di tangannya. Nggak ngelihat ke mana-mana, cuma tekun.
- `p08-M2` Latihan yang konsisten, tanpa banyak gaya. Keahlian dibangun lewat pengulangan yang membosankan, dan kamu lagi di tahap itu.
- `p08-L1` Pilih satu keterampilan dan jadwalkan latihan singkat tiap hari, dua puluh menit aja. Yang penting rutin.
- `p08-R1` Keterampilan apa yang pengen kamu kuasai, dan berapa waktu yang realistis tiap hari?

#### p09 · Nine of Pentacles · Sembilan Koin
**Arahan:** tenang, anggun, puas.

- `p09-M1` Perempuan berdiri di kebun anggur yang lebat, jubahnya penuh motif, seekor burung bertengger di tangannya. Dia sendirian, tapi tampak sangat nyaman.
- `p09-M2` Ini kartu kemandirian. Hasil usahamu mulai nyata, dan kamu boleh menikmatinya sendiri tanpa merasa bersalah.
- `p09-L1` Hadiahin diri sendiri satu hal kecil yang dibeli dari hasil usahamu. Nikmatin tanpa rasa bersalah.
- `p09-R1` Kalau kamu ngelihat apa yang udah kamu bangun sendiri, apa yang kamu rasain?

#### p10 · Ten of Pentacles · Sepuluh Koin
**Arahan:** hangat, tenang, seperti bercerita tentang keluarga besar.

- `p10-M1` Orang tua duduk di gerbang kota, dikelilingi anjing, pasangan dan anak kecil. Di atas mereka koin tersusun seperti pola, dan ada rumah besar di belakangnya.
- `p10-M2` Ini tentang fondasi jangka panjang. Sesuatu yang kamu bangun hari ini bisa jadi bekal buat orang-orang di sekitarmu bertahun-tahun ke depan.
- `p10-L1` Cek satu hal jangka panjang yang belum kamu atur, misalnya tabungan, dokumen, atau kesehatan. Mulai dari yang paling gampang.
- `p10-R1` Apa yang pengen kamu wariskan atau bangun untuk jangka panjang?

#### p11 · Page of Pentacles · Pemula Koin
**Arahan:** polos, serius, teliti, tempo pelan.

- `p11-M1` Pemuda berdiri di tengah ladang hijau, mengangkat satu koin di depan matanya, kayak lagi meneliti. Jalannya pelan, tatapannya serius.
- `p11-M2` Kamu lagi belajar hal yang praktis. Mulai dari yang kecil dan jelas, dan nggak apa-apa kalau belum cepat. Fokusnya ke yang bisa dipakai.
- `p11-L1` Pilih satu keterampilan praktis, lalu baca atau tonton satu materi dasarnya hari ini. Setelah itu langsung coba.
- `p11-R1` Hal praktis apa yang pengen kamu pelajari, dan kamu mulai dari mana?

#### p12 · Knight of Pentacles · Ksatria Koin
**Arahan:** tenang, mantap, pelan tapi pasti.

- `p12-M1` Ksatria duduk di atas kuda hitam yang berdiri tenang, ngelihatin koin di tangannya. Ladang yang udah dibajak membentang di belakangnya. Nggak ada yang buru-buru.
- `p12-M2` Konsistensi yang membumi. Kamu nggak kelihatan cepat, tapi arahnya mantap. Pelan-pelan, hasilnya nyata dan bisa diandalkan.
- `p12-L1` Tentuin satu kebiasaan kecil yang bisa kamu jaga tiap hari. Catat di kalender, dan jangan terlalu keras kalau satu hari bolong.
- `p12-R1` Hal kecil apa yang kalau kamu lakukan tiap hari, bakal terasa bedanya?

#### p13 · Queen of Pentacles · Ratu Koin
**Arahan:** hangat, domestik, seperti orang yang suka merapikan rumah.

- `p13-M1` Ratu duduk di takhta yang dikelilingi bunga dan tanaman, koin di pangkuannya dipegang kayak lagi ngelus. Di kakinya ada kelinci kecil. Semuanya kelihatan terawat.
- `p13-M2` Merawat kebutuhan sehari-hari: rumah, tubuh, orang terdekat. Kamu pandai bikin sekitar jadi nyaman, dan itu keterampilan yang nyata.
- `p13-L1` Rapihin satu sudut hidupmu yang lagi berantakan, misalnya meja kerja atau jadwal makan. Setengah jam cukup.
- `p13-R1` Bagian mana dari hidup sehari-harimu yang butuh dirawat lebih serius?

#### p14 · King of Pentacles · Raja Koin
**Arahan:** tenang, mapan, nada rendah, senyum tipis.

- `p14-M1` Raja duduk santai di takhta berukir banteng, koin di pangkuan, di belakangnya kebun anggur dan kastil. Semuanya kokoh, dan dia kelihatan tenang dengan itu.
- `p14-M2` Mengelola sumber daya dengan bijak. Kamu bisa menata uang, waktu, dan tenaga supaya bertahan lama, tanpa jadi pelit atau sombong.
- `p14-L1` Bikin anggaran sederhana buat satu bulan ke depan. Sisihkan sedikit buat hal yang kamu nikmatin, biar tetap bisa dijalanin lama.
- `p14-R1` Sumber daya apa yang pengen kamu kelola lebih sadar?
