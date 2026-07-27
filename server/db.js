/**
 * db.js — koneksi PostgreSQL, migrasi tabel, pembuatan admin, dan seed data awal.
 *
 * Semua fungsi di sini dipanggil otomatis saat server start (lihat index.js),
 * sehingga setelah `docker compose up` database langsung siap & terisi contoh data.
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Koneksi memakai DATABASE_URL (di-set oleh docker-compose), atau variabel terpisah.
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.PGHOST || 'localhost',
        port: +(process.env.PGPORT || 5432),
        user: process.env.POSTGRES_USER || 'shopkuy',
        password: process.env.POSTGRES_PASSWORD || 'shopkuy',
        database: process.env.POSTGRES_DB || 'shopkuy',
      }
);

const query = (text, params) => pool.query(text, params);

/** Buat semua tabel jika belum ada. Aman dijalankan berulang. */
async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id        SERIAL PRIMARY KEY,
      name      TEXT NOT NULL,
      slug      TEXT UNIQUE NOT NULL,
      published BOOLEAN DEFAULT true,
      sort      INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS products (
      id              SERIAL PRIMARY KEY,
      name            TEXT NOT NULL,
      slug            TEXT UNIQUE NOT NULL,
      category_id     INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      brand           TEXT DEFAULT '',
      price           INTEGER DEFAULT 0,
      discount_price  INTEGER,
      description     TEXT DEFAULT '',
      stock           INTEGER DEFAULT 0,
      sku             TEXT DEFAULT '',
      sizes           JSONB DEFAULT '[]',
      colors          JSONB DEFAULT '[]',
      images          JSONB DEFAULT '[]',
      tokopedia_url   TEXT DEFAULT '',
      shopee_url      TEXT DEFAULT '',
      whatsapp_number TEXT DEFAULT '',
      featured        BOOLEAN DEFAULT false,
      best_seller     BOOLEAN DEFAULT false,
      new_arrival     BOOLEAN DEFAULT false,
      published       BOOLEAN DEFAULT true,
      created_at      TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS banners (
      id          SERIAL PRIMARY KEY,
      title       TEXT DEFAULT '',
      subtitle    TEXT DEFAULT '',
      button_text TEXT DEFAULT '',
      button_link TEXT DEFAULT '',
      image_url   TEXT DEFAULT '',
      active      BOOLEAN DEFAULT true,
      sort        INTEGER DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS testimonials (
      id        SERIAL PRIMARY KEY,
      name      TEXT NOT NULL,
      role      TEXT DEFAULT '',
      text      TEXT DEFAULT '',
      rating    INTEGER DEFAULT 5,
      active    BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS settings (
      id              INTEGER PRIMARY KEY DEFAULT 1,
      store_name      TEXT DEFAULT 'ShopKuy',
      tagline         TEXT DEFAULT 'Fashion Pria & Wanita Berkualitas',
      logo_url        TEXT DEFAULT '',
      favicon_url     TEXT DEFAULT '',
      whatsapp_number TEXT DEFAULT '6281234567890',
      instagram       TEXT DEFAULT '',
      facebook        TEXT DEFAULT '',
      tiktok          TEXT DEFAULT '',
      email           TEXT DEFAULT '',
      address         TEXT DEFAULT '',
      footer          TEXT DEFAULT '',
      CONSTRAINT settings_singleton CHECK (id = 1)
    );
  `);
  console.log('[db] schema siap');
}

/** Pastikan akun admin ada (dari ADMIN_EMAIL / ADMIN_PASSWORD). Password disinkron tiap start. */
async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@shopkuy.id';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = bcrypt.hashSync(password, 10);
  await query(
    `INSERT INTO users (email, password_hash) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [email, hash]
  );
  console.log(`[db] admin siap → ${email}`);
}

/** Isi data contoh hanya bila tabel produk masih kosong. */
async function seedIfEmpty() {
  const { rows } = await query('SELECT COUNT(*)::int AS n FROM products');
  if (rows[0].n > 0) {
    console.log('[db] produk sudah ada, lewati seed');
    return;
  }
  console.log('[db] seeding data contoh...');

  // Settings
  await query(
    `INSERT INTO settings (id, store_name, tagline, whatsapp_number, instagram, facebook, tiktok, email, address, footer)
     VALUES (1, 'ShopKuy', 'Fashion Pria & Wanita Berkualitas', '6281234567890',
       'https://instagram.com/shopkuy.id', 'https://facebook.com/shopkuy', 'https://tiktok.com/@shopkuy',
       'halo@shopkuy.id', 'Jl. Merdeka No. 12, Bandung, Jawa Barat 40115',
       'Fashion Pria & Wanita Berkualitas. Belanja mudah via Tokopedia, Shopee, atau WhatsApp.')
     ON CONFLICT (id) DO NOTHING`
  );

  // Categories
  const cats = [
    ['Pria', 'pria'], ['Wanita', 'wanita'], ['Aksesoris', 'aksesoris'], ['Sepatu', 'sepatu'],
  ];
  const catId = {};
  for (let i = 0; i < cats.length; i++) {
    const { rows: r } = await query(
      `INSERT INTO categories (name, slug, sort) VALUES ($1, $2, $3) RETURNING id`,
      [cats[i][0], cats[i][1], i]
    );
    catId[cats[i][1]] = r[0].id;
  }

  // Testimonials
  const testi = [
    ['Rara Anindya', 'Jakarta', 'Bahannya adem banget dan jahitannya rapi. Pesan lewat WhatsApp dibalas cepat, ramah pula. Pasti repeat order!'],
    ['Dimas Prasetyo', 'Surabaya', 'Beli chino-nya 2 sekaligus. Ukuran pas sesuai panduan, warnanya juga persis di foto. Recommended.'],
    ['Sinta Maharani', 'Bandung', 'Dress linennya favorit aku sekarang. Premium tapi harga masih masuk akal. Checkout via Shopee gampang.'],
  ];
  for (const t of testi) {
    await query('INSERT INTO testimonials (name, role, text, rating) VALUES ($1,$2,$3,5)', t);
  }

  // Banner
  await query(
    `INSERT INTO banners (title, subtitle, button_text, button_link, active)
     VALUES ('Fashion Pria & Wanita Berkualitas',
       'Pakaian, sepatu, dan aksesoris pilihan dengan bahan premium.',
       'Belanja Sekarang', '/produk', true)`
  );

  // Products
  const P = [
    ['Kemeja Oxford Lengan Panjang','kemeja-oxford-lengan-panjang','pria','Urbanika',299000,229000,24,'PRA-001',['S','M','L','XL'],[{name:'Navy',hex:'#1E3A5F'},{name:'Putih',hex:'#F1F5F9'},{name:'Hitam',hex:'#111827'}],true,true,false,'Kemeja oxford bahan katun premium yang adem dan tidak mudah kusut. Potongan regular fit, cocok untuk kerja maupun acara santai.'],
    ['Kaos Polos Premium Cotton Combed','kaos-polos-premium','pria','Basiqo',99000,null,80,'PRA-002',['M','L','XL','XXL'],[{name:'Hitam',hex:'#111827'},{name:'Putih',hex:'#F1F5F9'},{name:'Abu',hex:'#9CA3AF'}],false,true,true,'Kaos cotton combed 30s yang lembut dan menyerap keringat. Jahitan rapi dan tidak mudah melar.'],
    ['Celana Chino Slim Fit','celana-chino-slim-fit','pria','Urbanika',259000,199000,18,'PRA-003',['28','30','32','34'],[{name:'Khaki',hex:'#C2A878'},{name:'Navy',hex:'#1E3A5F'},{name:'Hitam',hex:'#111827'}],true,false,false,'Celana chino stretch yang nyaman bergerak. Slim fit modern, cocok dipadukan dengan kemeja atau kaos.'],
    ['Jaket Bomber Waterproof','jaket-bomber-waterproof','pria','Northbound',459000,null,12,'PRA-004',['M','L','XL'],[{name:'Hitam',hex:'#111827'},{name:'Olive',hex:'#5B6043'}],false,false,true,'Jaket bomber anti air dengan lapisan dalam yang hangat. Ringan, stylish, dan tahan segala cuaca.'],
    ['Dress Midi Linen Flowy','dress-midi-linen','wanita','Aerel',349000,279000,16,'WAN-001',['S','M','L'],[{name:'Krem',hex:'#E7DECF'},{name:'Sage',hex:'#9CAF88'},{name:'Hitam',hex:'#111827'}],true,true,false,'Dress midi bahan linen yang jatuh dan adem. Potongan flowy yang elegan untuk acara siang maupun malam.'],
    ['Blouse Lengan Balon','blouse-lengan-balon','wanita','Aerel',179000,null,30,'WAN-002',['S','M','L','XL'],[{name:'Putih',hex:'#F1F5F9'},{name:'Dusty Pink',hex:'#D8A7A1'}],false,false,true,'Blouse dengan detail lengan balon yang manis. Bahan rayon premium yang lembut dan tidak menerawang.'],
    ['Rok Plisket High Waist','rok-plisket-high-waist','wanita','Lumea',199000,159000,22,'WAN-003',['All Size'],[{name:'Hitam',hex:'#111827'},{name:'Mocha',hex:'#A98467'},{name:'Navy',hex:'#1E3A5F'}],true,false,false,'Rok plisket high waist yang memanjangkan kaki. Karet pinggang nyaman dan flowy saat dipakai.'],
    ['Cardigan Rajut Oversize','cardigan-rajut-oversize','wanita','Lumea',229000,null,14,'WAN-004',['All Size'],[{name:'Cream',hex:'#E7DECF'},{name:'Camel',hex:'#C19A6B'},{name:'Abu',hex:'#9CA3AF'}],false,true,true,'Cardigan rajut oversize yang hangat dan kekinian. Cocok untuk layering di musim hujan.'],
    ['Tas Selempang Kulit Sintetis','tas-selempang-kulit','aksesoris','Carre',189000,149000,26,'AKS-001',['One Size'],[{name:'Hitam',hex:'#111827'},{name:'Tan',hex:'#B08968'}],true,true,false,'Tas selempang compact dengan kompartemen rapi. Kulit sintetis berkualitas dengan jahitan kuat.'],
    ['Topi Bucket Canvas','topi-bucket-canvas','aksesoris','Basiqo',89000,null,50,'AKS-002',['All Size'],[{name:'Khaki',hex:'#C2A878'},{name:'Hitam',hex:'#111827'},{name:'Navy',hex:'#1E3A5F'}],false,false,true,'Topi bucket bahan canvas tebal. Lindungi dari matahari sambil tetap stylish.'],
    ['Sneakers Kanvas Klasik','sneakers-kanvas-klasik','sepatu','Strade',329000,269000,20,'SEP-001',['39','40','41','42','43'],[{name:'Putih',hex:'#F1F5F9'},{name:'Hitam',hex:'#111827'}],true,true,false,'Sneakers kanvas klasik dengan sol karet empuk. Cocok untuk gaya kasual sehari-hari.'],
    ['Loafers Kulit Pria','loafers-kulit-pria','sepatu','Strade',399000,null,10,'SEP-002',['40','41','42','43','44'],[{name:'Coklat',hex:'#6F4E37'},{name:'Hitam',hex:'#111827'}],false,false,true,'Loafers kulit dengan finishing rapi. Tampil formal dan elegan untuk acara penting.'],
  ];
  for (const p of P) {
    const [name,slug,catSlug,brand,price,disc,stock,sku,sizes,colors,featured,best,arrival,desc] = p;
    await query(
      `INSERT INTO products (name,slug,category_id,brand,price,discount_price,description,stock,sku,sizes,colors,images,tokopedia_url,shopee_url,whatsapp_number,featured,best_seller,new_arrival,published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,'[]'::jsonb,$12,$13,$14,$15,$16,$17,true)`,
      [name, slug, catId[catSlug], brand, price, disc, desc, stock, sku,
       JSON.stringify(sizes), JSON.stringify(colors),
       'https://www.tokopedia.com/shopkuy/' + slug,
       'https://shopee.co.id/shopkuy/' + slug,
       '6281234567890', featured, best, arrival]
    );
  }
  console.log('[db] seed selesai: ' + P.length + ' produk');
}

module.exports = { pool, query, initDb, ensureAdmin, seedIfEmpty };
