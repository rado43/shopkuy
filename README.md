# ShopKuy — Katalog Produk E-Commerce

Website katalog fashion pria & wanita. **Bukan checkout langsung** — setiap produk memiliki tombol **Beli** yang membuka pilihan: **Tokopedia**, **Shopee**, atau **WhatsApp**.

Dilengkapi **Admin Panel** untuk mengelola produk, kategori, banner, testimoni, dan pengaturan toko. Data tersimpan di **PostgreSQL**, gambar diunggah ke folder `uploads/`. Seluruh aplikasi berjalan dengan **Docker** — cocok untuk deploy di server Ubuntu.

---

## Fitur

**Toko (publik)**
- Hero banner, kategori, katalog produk dengan pencarian, filter kategori, & sortir
- Halaman detail produk: galeri, ukuran, warna, stok, deskripsi
- Popup **Beli**: Tokopedia / Shopee / WhatsApp (buka di tab baru)
- Testimoni, promo, footer, responsif (desktop/tablet/mobile), SEO meta + Open Graph

**Admin (`/admin`)**
- Login aman (email + password, JWT)
- Dashboard: total produk, produk publish, kategori
- **Produk**: tambah, edit, hapus, duplikat, publish/hide, upload banyak gambar, kelola stok/harga/diskon/SKU/brand/link
- **Kategori**, **Banner**, **Testimoni**: CRUD lengkap
- **Pengaturan**: nama toko, WhatsApp, sosial media, email, alamat, footer

---

## Cara Menjalankan (Docker — direkomendasikan)

### 1. Persiapan server Ubuntu
Pasang Docker & Docker Compose (sekali saja):
```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

### 2. Upload & konfigurasi
Upload folder `shopkuy/` ke server (lewat `scp`, `git`, atau panel hosting), lalu:
```bash
cd shopkuy
cp .env.example .env
nano .env        # WAJIB: ganti password & JWT_SECRET
```

Isi `.env`:
```
POSTGRES_USER=shopkuy
POSTGRES_PASSWORD=password-kuat-anda
POSTGRES_DB=shopkuy
JWT_SECRET=string-acak-panjang-anda
ADMIN_EMAIL=admin@shopkuy.id
ADMIN_PASSWORD=password-admin-anda
PORT=3000
```

### 3. Jalankan
```bash
docker compose up -d --build
```

Selesai. Aplikasi berjalan di:
- Toko: **http://IP-SERVER:3000**
- Admin: **http://IP-SERVER:3000/admin**

Saat pertama kali start, database dibuat otomatis, akun admin dibuat dari `.env`, dan **12 produk contoh** dimuat. Login admin memakai `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

### Perintah berguna
```bash
docker compose logs -f app     # lihat log
docker compose down            # stop
docker compose up -d --build   # rebuild setelah update kode
docker compose down -v         # stop + HAPUS semua data (hati-hati)
```

---

## Menjalankan tanpa Docker (opsional, untuk development)

Butuh **Node.js 20+** dan **PostgreSQL** yang berjalan.
```bash
npm install
export DATABASE_URL="postgres://user:pass@localhost:5432/shopkuy"
export JWT_SECRET="rahasia"
export ADMIN_EMAIL="admin@shopkuy.id"
export ADMIN_PASSWORD="admin123"
npm start
```
Buka http://localhost:3000

---

## Deploy ke Domain + HTTPS (Nginx)

Agar bisa diakses via domain (mis. `https://shopkuy.com`) dengan SSL, pasang **Nginx** sebagai reverse proxy di depan aplikasi (port 3000):

```nginx
server {
    server_name shopkuy.com www.shopkuy.com;
    client_max_body_size 6M;   # untuk upload gambar

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Lalu pasang SSL gratis:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d shopkuy.com -d www.shopkuy.com
```

---

## Struktur Folder

```
shopkuy/
├── docker-compose.yml       # app + PostgreSQL + volume (data & uploads)
├── Dockerfile
├── .env.example             # salin ke .env
├── package.json
├── server/
│   ├── index.js             # entry point Express
│   ├── db.js                # koneksi, skema, migrasi, seed, admin
│   ├── auth.js              # JWT helpers & middleware
│   ├── helpers.js
│   ├── seed.js              # seed manual: node server/seed.js
│   └── routes/              # auth, products, categories, banners, testimonials, settings, upload
├── public/
│   ├── index.html           # storefront (toko)
│   └── admin/index.html     # panel admin
└── uploads/                 # gambar produk (volume Docker)
```

---

## Skema Database (PostgreSQL)

Tabel dibuat otomatis oleh `server/db.js` saat start:

| Tabel | Isi |
|---|---|
| `users` | akun admin (email + hash password) |
| `categories` | kategori produk |
| `products` | produk (harga, diskon, stok, SKU, brand, ukuran, warna, gambar, link Tokopedia/Shopee/WA, flag featured/best/new/published) |
| `banners` | hero banner |
| `testimonials` | testimoni pelanggan |
| `settings` | pengaturan toko (baris tunggal) |

---

## API (ringkas)

Publik (GET): `/api/products`, `/api/products/:slug`, `/api/categories`, `/api/banners`, `/api/testimonials`, `/api/settings`
Admin (butuh header `Authorization: Bearer <token>`): POST/PUT/DELETE pada resource di atas + `/api/products/:id/duplicate`, `/api/products/:id/publish`, `/api/upload`, `/api/settings` (PUT).
Login: `POST /api/auth/login` → `{ token }`.

---

## Keamanan — penting sebelum produksi
1. **Ganti** `JWT_SECRET`, `ADMIN_PASSWORD`, dan `POSTGRES_PASSWORD` di `.env`.
2. Pasang **HTTPS** (lihat bagian Nginx di atas).
3. Jangan commit file `.env` ke Git.
