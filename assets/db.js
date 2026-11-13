/*
 * LangkahKu ICT - assets/db.js
 * Koneksi dan operasi database Supabase.
 *
 * Tabel yang diharapkan:
 * users(id uuid, email text, role text)
 * sessions(id uuid, step_order integer, title text, description text)
 * progress(id uuid, user_id uuid, step_id uuid, status text, updated_at timestamptz)
 *
 * Catatan:
 * - Jangan pernah memasukkan service_role key ke file frontend.
 * - updateProgress membutuhkan UNIQUE(user_id, step_id) pada tabel progress.
 */

(() => {
  "use strict";

  const SUPABASE_URL = "https://tnihcwfstjjvorbqrhsg.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_rrLkDG-oDKiC3r8R8MMVDA_FN0pQAM5";

  let supabaseClient = null;
  let initializationError = null;

  try {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      throw new Error(
        "Library Supabase belum termuat. Periksa koneksi internet dan script CDN di HTML."
      );
    }

    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    );
  } catch (error) {
    initializationError = error;
    console.error("Gagal menginisialisasi Supabase:", error);
  }

  function getClient() {
    if (!supabaseClient) {
      throw new Error(
        initializationError?.message || "Supabase client belum tersedia."
      );
    }
    return supabaseClient;
  }

  function makeUuid() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    // Fallback UUID untuk browser yang belum mendukung crypto.randomUUID().
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");

    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20)
    ].join("-");
  }

  function throwDatabaseError(action, error) {
    if (!error) return;
    console.error(`${action}:`, error);
    throw new Error(`${action}: ${error.message || "Kesalahan database."}`);
  }

  window.db = {
    get supabase() {
      return getClient();
    },

    async getUserRole(userId) {
      if (!userId) throw new Error("ID pengguna tidak tersedia.");

      const { data, error } = await getClient()
        .from("users")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      throwDatabaseError("Gagal mengambil role pengguna", error);
      return data?.role || null;
    },

    async loadSchedule() {
      const { data, error } = await getClient()
        .from("sessions")
        .select("id, step_order, title, description")
        .order("step_order", { ascending: true });

      throwDatabaseError("Gagal mengambil jadwal", error);
      return data || [];
    },

    async saveSchedule(steps) {
      if (!Array.isArray(steps) || steps.length === 0) {
        throw new Error("Jadwal harus memiliki minimal satu aktivitas.");
      }

      const currentSteps = await this.loadSchedule();

      const payload = steps.map((step, index) => {
        const title = String(step.title || "").trim();
        const description = String(step.description || "").trim();

        if (!title) {
          throw new Error(`Judul aktivitas ke-${index + 1} belum diisi.`);
        }

        return {
          id: step.id || makeUuid(),
          step_order: index + 1,
          title,
          description
        };
      });

      // Simpan/update berdasarkan UUID, bukan membandingkan UUID dengan angka.
      const { data, error } = await getClient()
        .from("sessions")
        .upsert(payload, { onConflict: "id" })
        .select("id, step_order, title, description");

      throwDatabaseError("Gagal menyimpan jadwal", error);

      // Hapus hanya aktivitas lama yang memang sudah dihapus dari editor.
      // Tidak menggunakan delete().neq('id', 0), karena id bertipe UUID.
      const retainedIds = new Set(payload.map((step) => step.id));
      const removedSteps = currentSteps.filter(
        (step) => !retainedIds.has(step.id)
      );

      for (const oldStep of removedSteps) {
        const { error: deleteError } = await getClient()
          .from("sessions")
          .delete()
          .eq("id", oldStep.id);

        throwDatabaseError(
          `Gagal menghapus aktivitas lama "${oldStep.title}"`,
          deleteError
        );
      }

      return (data || payload).sort(
        (a, b) => a.step_order - b.step_order
      );
    },

    async loadProgress(userId) {
      if (!userId) throw new Error("ID siswa tidak tersedia.");

      const { data, error } = await getClient()
        .from("progress")
        .select("id, user_id, step_id, status, updated_at")
        .eq("user_id", userId);

      throwDatabaseError("Gagal mengambil progres siswa", error);
      return data || [];
    },

    async updateProgress(userId, stepId, status) {
      if (!userId || !stepId) {
        throw new Error("ID siswa atau ID aktivitas tidak tersedia.");
      }

      const { data, error } = await getClient()
        .from("progress")
        .upsert(
          {
            user_id: userId,
            step_id: stepId,
            status,
            updated_at: new Date().toISOString()
          },
          { onConflict: "user_id,step_id" }
        )
        .select("id, user_id, step_id, status, updated_at")
        .single();

      throwDatabaseError("Gagal menyimpan progres siswa", error);
      return data;
    }
  };
})();
