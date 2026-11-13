/*
 * LangkahKu ICT - assets/auth.js
 * Login, registrasi, pemeriksaan sesi, dan logout.
 */

(() => {
  "use strict";

  function isLoginPage() {
    return /\/login\.html$/i.test(window.location.pathname);
  }

  function showAuthMessage(message, type = "error") {
    const messageElement = document.getElementById("authMsg");
    if (!messageElement) {
      if (type === "error") console.error(message);
      else console.info(message);
      return;
    }

    messageElement.textContent = message;
    messageElement.style.color = type === "error" ? "#b42318" : "#167044";
  }

  function getSupabase() {
    if (!window.db || !window.db.supabase) {
      throw new Error("Koneksi Supabase belum siap. Periksa assets/db.js.");
    }
    return window.db.supabase;
  }

  window.auth = {
    async checkSession() {
      const { data, error } = await getSupabase().auth.getSession();

      if (error) {
        throw new Error(`Gagal memeriksa sesi login: ${error.message}`);
      }

      const session = data?.session || null;

      if (!session && !isLoginPage()) {
        window.location.replace("/login.html");
        return null;
      }

      if (session && isLoginPage()) {
        window.location.replace("/index.html");
        return null;
      }

      return session?.user || null;
    },

    async login(email, password) {
      try {
        const cleanEmail = String(email || "").trim();

        if (!cleanEmail || !password) {
          showAuthMessage("Email dan password wajib diisi.");
          return false;
        }

        const { error } = await getSupabase().auth.signInWithPassword({
          email: cleanEmail,
          password
        });

        if (error) {
          showAuthMessage(`Login gagal: ${error.message}`);
          return false;
        }

        window.location.replace("/index.html");
        return true;
      } catch (error) {
        showAuthMessage(error.message || "Terjadi kesalahan saat login.");
        return false;
      }
    },

    async register(email, password, requestedRole) {
      try {
        const cleanEmail = String(email || "").trim();
        const role = String(requestedRole || "siswa").toLowerCase();

        if (!cleanEmail || !password) {
          showAuthMessage("Email dan password wajib diisi.");
          return false;
        }

        if (password.length < 6) {
          showAuthMessage("Password minimal 6 karakter.");
          return false;
        }

        // Pendaftaran publik tidak boleh memberikan hak guru kepada siapa pun.
        // Akun guru dibuat sebagai siswa terlebih dahulu, lalu admin mengubah
        // role-nya menjadi 'guru' pada tabel public.users.
        if (role === "guru") {
          showAuthMessage(
            "Pendaftaran guru harus ditetapkan oleh administrator. Daftarkan akun terlebih dahulu, lalu minta admin mengubah role menjadi guru."
          );
          return false;
        }

        const { data, error } = await getSupabase().auth.signUp({
          email: cleanEmail,
          password
        });

        if (error) {
          showAuthMessage(`Pendaftaran gagal: ${error.message}`);
          return false;
        }

        if (!data?.user) {
          showAuthMessage(
            "Permintaan pendaftaran dikirim, tetapi data pengguna belum diterima. Silakan coba lagi."
          );
          return false;
        }

        showAuthMessage(
          "Akun berhasil dibuat. Jika Supabase meminta konfirmasi email, buka email verifikasi terlebih dahulu, kemudian masuk. Profil siswa dibuat otomatis jika trigger database sudah dipasang.",
          "success"
        );

        return true;
      } catch (error) {
        showAuthMessage(error.message || "Terjadi kesalahan saat mendaftar.");
        return false;
      }
    },

    async logout() {
      try {
        const { error } = await getSupabase().auth.signOut();
        if (error) throw error;

        window.location.replace("/login.html");
      } catch (error) {
        console.error("Gagal logout:", error);
        alert(`Gagal keluar: ${error.message || "Kesalahan tidak diketahui."}`);
      }
    }
  };

  // Menangani tombol Enter pada form login, dan mengalihkan pengguna
  // yang sudah login agar tidak kembali ke halaman login.
  document.addEventListener("DOMContentLoaded", () => {
    if (!isLoginPage()) return;

    const form = document.getElementById("authForm");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        window.auth.login(
          document.getElementById("email")?.value,
          document.getElementById("password")?.value
        );
      });
    }

    window.auth.checkSession().catch((error) => {
      showAuthMessage(error.message || "Gagal memeriksa sesi.");
    });
  });
})();
