# Panduan Konfigurasi SMTP Supabase (Resend & Brevo)

Sesuai dengan ketentuan platform LangkahKu ICT untuk produksi jangka panjang, email verifikasi siswa dan *reset password* tidak boleh bergantung pada batas bawaan Supabase (2 email/jam). 

Anda **HARUS** mengatur SMTP dari sisi *Dashboard* Supabase, **bukan dari kode Frontend (JavaScript)**. Ini penting demi keamanan (*Security*) agar API Key penyedia email tidak bocor ke publik.

## Opsi 1: Menggunakan Resend (Sangat Direkomendasikan)

1. Buat akun di [Resend.com](https://resend.com).
2. Di dashboard Resend, tambahkan domain sekolah/pribadi Anda (misalnya `sekolahku.sch.id`).
3. Verifikasi domain dengan memasukkan data DNS (TXT/MX/SPF/DKIM) yang diberikan Resend ke pengaturan domain/hosting Anda (seperti Niagahoster, Cloudflare, dll).
4. Buat **API Key** di dashboard Resend dan salin kuncinya.
5. Masuk ke **Supabase Dashboard** -> **Authentication** -> **Emails** -> Gulir ke bawah hingga menemukan **SMTP Settings**.
6. Aktifkan **Enable Custom SMTP** dan isi sebagai berikut:
   * **Host:** `smtp.resend.com`
   * **Port:** `465`
   * **User:** `resend`
   * **Password:** *(Paste API Key Resend Anda di sini)*
   * **Sender email:** Email dari domain yang Anda verifikasi di langkah 2 (contoh: `admin@sekolahku.sch.id`).
   * **Sender name:** LangkahKu ICT
7. Klik **Save**.

## Opsi 2: Menggunakan Brevo (Alternatif)

1. Buat akun di [Brevo.com](https://www.brevo.com).
2. Buka pengaturan SMTP & API, salin **SMTP Login** dan hasilkan **SMTP Key**.
3. Di Supabase **SMTP Settings**, isi sebagai berikut:
   * **Host:** `smtp-relay.brevo.com`
   * **Port:** `587`
   * **User:** *(SMTP Login Brevo Anda)*
   * **Password:** *(SMTP Key Brevo Anda)*
   * **Sender email:** Email yang didaftarkan di Brevo.
