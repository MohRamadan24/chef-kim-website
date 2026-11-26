# Chef Kim — Korean Restaurant, Malang

Website company profile **Chef Kim Korean Restaurant**, Jl. Soekarno Hatta No. 11, Malang.

🌐 **Live:** https://mohramadan24.github.io/chef-kim-website/

Situs statis (HTML + CSS + JavaScript murni, tanpa framework/build). Desain hitam elegan dengan aksen emas kuningan, merah stempel Korea (dojang), dan nuansa hanok.

## Isi halaman

| Bagian | Isi |
| --- | --- |
| Hero | Nama, tagline, CTA Reservasi & Lihat Menu, jam buka hari ini + status **Buka/Tutup otomatis (WIB)**, lokasi, halal |
| 01 Tentang | Cerita Chef Kim Byung Kook, timeline 2013–2019–2022, 3 nilai (racikan sendiri, kimchi rumahan, halal) |
| 02 Menu Andalan | 6 kartu menu berfoto + tombol Pesan (di HP: kartu bisa digeser) |
| 03 Menu & Harga | 26 menu dalam 5 kategori dengan tab filter |
| 04 Suasana | Interior & fasilitas |
| 05 Jam & Lokasi | Tabel jam buka (hari ini disorot), alamat, Petunjuk Arah, Google Maps, kontak |
| 06 Reservasi | Formulir → otomatis menyusun pesan WhatsApp |
| Pesanan | Keranjang pesanan → kirim daftar pesanan + total ke WhatsApp |

Plus: SEO (meta, Open Graph, data terstruktur `Restaurant`), favicon, responsive, aksesibilitas (keyboard, label, reduced-motion), font & foto di-host sendiri.

## Menjalankan di komputer

Tidak perlu install/build. Buka `index.html` langsung di browser, atau jalankan server lokal dari folder ini, misalnya:

```bash
npx serve .
```

## Deploy

Di-host dengan **GitHub Pages** dari branch `main` (folder root). Setiap push ke `main` otomatis memperbarui situs dalam ±1 menit.

## Cara mengubah konten

### Nomor WhatsApp & aplikasi pesan antar
`assets/js/main.js` → objek `CONFIG` di bagian atas:

```js
whatsapp: '6281228885565',   // format 62..., tanpa + dan tanpa 0 di depan
delivery: { gofood: '', grabfood: '', shopeefood: '' }  // isi URL; tombol yang kosong otomatis disembunyikan
```

Ganti juga teks nomor yang tampil di `index.html` (cari `0812-2888-5565` dan `6281228885565`).

### Jam buka
`index.html` → tabel dengan `data-hours`. Ubah `data-open` / `data-close` (format 24 jam) dan teksnya. Status buka/tutup dan pilihan jam reservasi otomatis mengikuti tabel ini. Sesuaikan juga teks ringkas di footer dan `openingHoursSpecification` (JSON-LD) di `<head>`.

### Menu & harga
`index.html` → bagian `#menu` (dan kartu di `#andalan`). Setiap menu:

```html
<li class="menu-item" data-item data-id="bibimbap" data-name="Bibimbap" data-price="48000"> … <span class="menu-item__price">48.000</span>
```

Ubah **`data-price`** (angka tanpa titik, dipakai untuk total pesanan) **dan** teks harga yang tampil. `data-id` harus unik per menu.

### Foto
Ganti file di `assets/img/` dengan nama yang sama (format WebP disarankan):

| File | Ukuran | Dipakai di |
| --- | --- | --- |
| `hero-tteokbokki-1920.webp` / `-1100.webp` | 1920×1280 / 1100×733 | Hero (objek utama sebaiknya di sisi kanan) |
| `menu-*.webp` | 800×1000 (4:5) | Kartu Menu Andalan |
| `about-hansang.webp` | 900×1125 (4:5) | Tentang (foto besar) |
| `about-bowl.webp` | 640×640 | Tentang (foto kecil) |
| `ambience-interior.webp` | 900×1125 (4:5) | Suasana |
| `band-hanok-1920.webp` / `-1000.webp` | 1920×960 / 1000×700 | Pita foto "Sejenak di Seoul" |
| `og-image.jpg` | 1200×630 | Preview saat link dibagikan |

### Domain sendiri
Atur di **Settings → Pages → Custom domain**, lalu ganti semua `https://mohramadan24.github.io/chef-kim-website/` di `index.html` (canonical, og:url, og:image, JSON-LD) dengan domain baru.

### Peta
Iframe Google Maps mencari berdasarkan nama & alamat. Untuk pin yang persis: Google Maps → Bagikan → Sematkan peta → salin URL `src` ke iframe di bagian `#kunjungi`.

### Teks Korea (Hangul)
Font Hangul (Nanum Myeongjo) di-*subset* hanya berisi karakter yang dipakai (±13 KB). Karakter baru tetap tampil dengan font sistem. Untuk membuat ulang subset (Python + `fonttools brotli`, TTF Nanum Myeongjo dari Google Fonts):

```bash
pyftsubset NanumMyeongjo-Bold.ttf --text-file=karakter.txt --flavor=woff2 --output-file=assets/fonts/nanum-myeongjo-700-subset.woff2
```

## Kredit & lisensi

- **Foto**: [Unsplash](https://unsplash.com) (Unsplash License). ID foto: hero `photo-1635363638580-c2809d049eee` (dibalik horizontal), tteokbokki `photo-1580651315530-69c8e0026377`, bibimbap `photo-1590301157890-4810ed352733`, cheese buldak `photo-1575932444877-5106bee2a599`, bulgogi `photo-1632558610168-8377309e34c7`, ayam gochujang `photo-1626645738196-c2a7c87a8f58`, kimchi `photo-1583224964978-2257b960c3d3`, about `photo-1498654896293-37aacf113fd9` & `photo-1553163147-622ab57be1c7`, hanok `photo-1548115184-bc6544d06a58`, interior `photo-1590846406792-0adc7f938f1d`.
- **Font**: Cormorant Garamond, Plus Jakarta Sans, Nanum Myeongjo — SIL Open Font License 1.1.
