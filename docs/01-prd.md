# PRD — Wargi: Silsilah Keluarga (next-wargi)

> Disusun: 2026-10-09. Keputusan diambil berdasarkan rekomendasi (pemilik mendelegasikan keputusan). Dokumen ini adalah sumber kebenaran untuk cakupan v1.

## 1. Latar Belakang

Banyak keluarga di Indonesia menyimpan silsilah dalam bentuk kertas, foto bagan yang dibagikan di grup WhatsApp, atau ingatan orang tua. Saat ada acara halal bihalal, reuni bani/trah, atau pernikahan, pertanyaan "dia itu siapa kita?" muncul berulang. Aplikasi silsilah global (MyHeritage, Ancestry, FamilySearch) berorientasi riset genealogi, berbahasa Inggris, banyak fitur berbayar, dan kurang cocok dengan struktur keluarga besar Indonesia.

**Wargi** (bahasa Sunda: keluarga/kerabat) adalah web untuk mencatat silsilah keluarga bersama-sama: satu orang membuat pohon, anggota keluarga lain diundang untuk melengkapi, dan hasilnya bisa dilihat sebagai bagan dan dicari.

Wargi adalah salah satu aplikasi di katalog **Caang Labs** (lihat `next-caanglabs/docs/01-prd.md`).

## 2. Keputusan Kunci

| Topik | Keputusan | Alasan |
|---|---|---|
| Nama | **Wargi** (nama kerja) | Selaras dengan merek Caang (Sunda), bermakna keluarga |
| Pengguna | Anggota keluarga yang ingin mencatat dan berbagi silsilah | Bukan alat riset genealogi profesional |
| Bentuk | Web app (Next.js, Vercel), responsif | Diakses dari link yang dibagikan di WhatsApp |
| Bahasa UI | Indonesia di v1, arsitektur siap i18n | Target awal keluarga Indonesia |
| Kolaborasi | Ya, sejak v1: pemilik mengundang anggota lewat link dengan peran | Silsilah hanya lengkap jika dikerjakan bersama |
| Akun | Wajib untuk mengedit (login Google); melihat lewat link undangan juga butuh login | Data pribadi keluarga harus terlindungi |
| Privasi | **Pohon privat secara default**, tidak ada halaman publik di v1 | Data orang yang masih hidup sensitif (UU PDP No. 27/2022) |
| Database | Neon Postgres | Data relasional; stack yang sudah dipakai pemilik |
| Foto | Cloudflare R2 | Tanpa biaya egress |
| Visualisasi | `@xyflow/react` (kanvas) + `elkjs` (tata letak berlapis) | Silsilah adalah graf (pasangan + anak), bukan pohon murni |
| Auth | Login Google (Neon Auth atau Auth.js, dipastikan saat plan) | Tanpa kelola password |

## 3. Konsep Data Keluarga

Silsilah tidak bisa dimodelkan sebagai pohon biasa karena:

- Satu orang bisa menikah lebih dari sekali (cerai, wafat, atau poligami).
- Anak lahir dari **pasangan** tertentu, bukan dari satu orang.
- Ada anak angkat dan anak tiri.

Karena itu Wargi memakai tiga entitas: **orang**, **ikatan** (pasangan), dan **anak dari ikatan**. Seorang anak dengan hanya satu orang tua yang diketahui tetap didukung (ikatan dengan satu anggota).

## 4. Fitur v1

### 4.1 Pohon keluarga

- Buat pohon: nama (mis. "Bani H. Abdullah"), deskripsi, orang pertama.
- Satu pengguna boleh punya/ikut beberapa pohon.

### 4.2 Data orang

- Nama lengkap, nama panggilan, jenis kelamin, tanggal lahir (boleh hanya tahun atau "tidak diketahui"), tempat lahir, status hidup/wafat, tanggal wafat, foto, catatan bebas.
- Tambah relasi langsung dari profil: "Tambah ayah/ibu", "Tambah pasangan", "Tambah anak", "Tambah saudara".
- Ikatan: status (menikah, cerai, salah satu wafat), tanggal menikah opsional, urutan istri/suami.
- Anak: jenis hubungan (kandung, angkat, tiri).

### 4.3 Tampilan

- **Bagan keturunan:** dari satu leluhur ke bawah (gaya "bani/trah"), pasangan berdampingan, anak di bawah ikatan.
- **Bagan leluhur:** dari satu orang ke atas.
- Pan, zoom, lipat cabang, klik orang untuk membuka profil, tombol "jadikan pusat".
- **Daftar dan pencarian:** semua orang dalam pohon, cari nama, filter generasi.
- **"Hubungan dengan saya":** pengguna menautkan akunnya ke satu orang di pohon; profil orang lain menampilkan jalur hubungan ("sepupu dua kali", "paman dari ibu") dalam istilah Indonesia.

### 4.4 Kolaborasi

- Peran: **pemilik** (semua akses, hapus pohon, kelola anggota), **editor** (tambah/ubah orang dan relasi), **pembaca** (hanya melihat).
- Undang lewat link dengan peran tertentu; link bisa dicabut dan punya masa berlaku.
- Riwayat perubahan: siapa mengubah apa dan kapan (log sederhana per pohon).

### 4.5 Tidak termasuk (Roadmap)

GEDCOM impor/ekspor, halaman publik, penggabungan dua pohon, deteksi duplikat, timeline peristiwa, cerita/kenangan per orang, tanggal Hijriah, aplikasi Android.

## 5. Model Data

```
users             id, email, name, created_at
trees             id, owner_id, name, description, created_at
tree_members      tree_id, user_id, role (owner|editor|viewer), person_id NULL,
                  PRIMARY KEY (tree_id, user_id)
invites           id, tree_id, token_hash, role, expires_at, revoked_at, created_by
persons           id, tree_id, full_name, nickname, gender (male|female|unknown),
                  birth_date, birth_precision (day|month|year|unknown), birth_place,
                  is_living, death_date, death_precision, photo_key, notes,
                  created_at, updated_at
unions            id, tree_id, partner_a_id, partner_b_id NULL,
                  status (married|divorced|widowed|unknown), start_date, order_index
union_children    union_id, child_id, relation (biological|adopted|step),
                  birth_order, PRIMARY KEY (union_id, child_id)
change_log        id, tree_id, user_id, entity, entity_id, action, diff jsonb, created_at
```

- Semua tabel isi pohon membawa `tree_id`; setiap query wajib difilter `tree_id` + cek keanggotaan dari sesi.
- `tree_members.person_id` menautkan akun ke orang di pohon (untuk "Hubungan dengan saya").
- Token undangan disimpan sebagai hash.

## 6. Arsitektur Teknis

- **Stack:** Next.js 16 (App Router, Server Actions), React 19, TypeScript, Tailwind v4, shadcn/ui, Drizzle ORM, Neon Postgres, Cloudflare R2, `@xyflow/react`, `elkjs`.
- **Modul:**
  - `lib/db/` — schema Drizzle, query yang selalu menerima `treeId` + `userId`.
  - `lib/access/` — `requireRole(treeId, userId, role)`, dipanggil di setiap Server Action.
  - `lib/graph/` — data pohon → graf (node orang + node ikatan) → layout ELK. Fungsi murni, bisa dites.
  - `lib/kinship/` — mencari jalur terpendek antara dua orang dan menerjemahkannya ke istilah kekerabatan Indonesia. Fungsi murni.
  - `lib/storage/` — unggah foto ke R2 (dikompres di klien, maks 1 MB), akses lewat signed URL.
- **Rendering bagan:** layout dihitung di klien (ELK di Web Worker) agar UI tidak macet untuk pohon besar.
- **Validasi relasi:** mencegah siklus (seseorang menjadi leluhur dirinya sendiri), mencegah orang menjadi pasangan dirinya sendiri, peringatan (bukan blokir) untuk tanggal yang tidak masuk akal (anak lahir sebelum orang tua).

## 7. Kasus Tepi dan Penanganan Error

| Kondisi | Perilaku |
|---|---|
| Relasi membentuk siklus | Ditolak dengan pesan jelas |
| Tanggal tidak konsisten | Disimpan, dengan ikon peringatan di profil |
| Hanya satu orang tua diketahui | Ikatan dengan satu pasangan; bagan menampilkan slot "tidak diketahui" |
| Banyak pernikahan | Ikatan ditampilkan berurutan sesuai `order_index`, anak di bawah ikatan masing-masing |
| Dua editor mengubah orang yang sama | Pembaruan terakhir menang; `updated_at` dicek agar pengguna diberi tahu jika data berubah sejak dibuka |
| Menghapus orang | Konfirmasi; ikatan dan tautan anak ikut terhapus, anak-anaknya tetap ada; tercatat di log |
| Pohon > 2.000 orang | Bagan dirender per cabang (lipat otomatis di kedalaman tertentu); daftar memakai paginasi |
| Link undangan kedaluwarsa / dicabut | Halaman jelas dengan saran meminta link baru ke pemilik |
| Pemilik ingin keluar | Wajib menyerahkan kepemilikan ke anggota lain atau menghapus pohon |

## 8. Kebutuhan Non-fungsional

- **Biaya v1:** Rp0 di free tier (Vercel Hobby, Neon free, R2 free 10 GB).
- **Privasi dan keamanan:**
  - Tidak ada data yang bisa diakses tanpa login dan keanggotaan pohon.
  - Data orang yang masih hidup tidak pernah ditampilkan di luar pohon.
  - Pemilik bisa menghapus pohon beserta semua foto dan datanya secara permanen.
  - Privacy policy di Caang Labs menjelaskan bahwa data diisi oleh anggota keluarga, dan menyediakan jalur permintaan penghapusan data oleh orang yang tercatat (UU PDP).
- **Performa:** bagan 300 orang tampil < 2 detik di laptop menengah.
- **Responsif:** profil, daftar, dan formulir nyaman di ponsel 360px; bagan bisa dilihat di ponsel dengan pan/zoom sentuh.
- **Aksesibilitas:** semua data bagan juga tersedia lewat tampilan daftar (bagan tidak menjadi satu-satunya cara membaca data).

## 9. Pengujian

- Unit test `lib/graph/` (pernikahan ganda, satu orang tua, anak angkat), `lib/kinship/` (tabel kasus: kakak, adik, paman, bibi, sepupu, keponakan, cucu, mertua, ipar), `lib/access/`.
- Test otorisasi: pembaca tidak bisa mengubah, non-anggota tidak bisa membaca, token undangan yang dicabut ditolak.
- Test validasi siklus.
- Cek manual: bagan dengan data keluarga nyata (± 100 orang, 4 generasi).

## 10. Kriteria Sukses v1

1. Satu keluarga nyata dengan 4 generasi dan ≥ 100 orang tercatat oleh ≥ 3 editor.
2. Anggota yang diundang bisa menemukan dirinya dan melihat "hubungan dengan saya" dalam < 1 menit sejak membuka link.
3. Tidak ada data yang bisa diakses tanpa keanggotaan (lolos test otorisasi).

## 11. Roadmap

| Versi | Isi |
|---|---|
| v1.1 | GEDCOM impor/ekspor (pindah dari/ke aplikasi silsilah lain), deteksi kemungkinan duplikat |
| v1.2 | Cerita dan kenangan per orang, timeline peristiwa keluarga, ulang tahun dan haul |
| v2 | Halaman publik opsional khusus leluhur yang sudah wafat, penggabungan pohon antar keluarga |
| v2+ | Aplikasi Android (Flutter) |

## 12. Pertanyaan Terbuka

- Nama final aplikasi (cek merek dagang dan domain/subdomain, mis. `wargi.caanglabs.com`).
- Pilihan auth final (Neon Auth vs Auth.js) — diputuskan saat menyusun plan, idealnya sama dengan Piagam agar bisa menjadi fondasi SSO Caang Labs di v2.
- Istilah kekerabatan regional (Sunda, Jawa) sebagai opsi tambahan selain bahasa Indonesia baku.
