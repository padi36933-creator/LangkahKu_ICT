# Panduan Setup LangkahKu ICT V2 (Universal)

1. **Database:** Salin isi file `schema.sql` (ada di awal baris komentar ini namun bisa langsung dilihat di source) lalu jalankan di **SQL Editor** pada Supabase Dashboard Anda.
2. **Storage:** Masuk ke menu **Storage** di Supabase. Buat bucket baru dengan nama tepat `audio_instruksi`. Pastikan *toggle* **Public Bucket** dicentang agar siswa bisa mendengarkan audio.
3. **Kredensial:** Buka file `assets/db.js` dan perbarui `SUPABASE_URL` serta `SUPABASE_ANON_KEY` (Pastikan Anon Key dimulai dengan `eyJ...`).
4. **Deploy:** Upload folder ini ke GitHub lalu sambungkan ke Netlify.
5. **Akun Guru:** Karena sistem keamanan membatasi, daftarkan akun Anda via web, lalu buka tabel `profiles` di Supabase dan ubah nilai `role` dari `siswa` menjadi `guru` secara manual.
