
// GANTI DENGAN KREDENSIAL SUPABASE ANDA
const SUPABASE_URL = 'https://tnihcwfstjjvorbqrhsg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rrLkDG-oDKiC3r8R8MMVDA_FN0pQAM5';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.db = {
    supabase: supabase,
    
    async getUserRole(userId) {
        const { data, error } = await supabase.from('users').select('role').eq('id', userId).single();
        if (error) console.error("Gagal mengambil role:", error);
        return data ? data.role : null;
    },
    
    async loadSchedule() {
        // Asumsi ada tabel 'sessions' yang menyimpan jadwal default/aktif
        const { data, error } = await supabase.from('sessions').select('*').order('step_order', { ascending: true });
        if (error) console.error("Gagal mengambil jadwal:", error);
        return data || [];
    },

    async saveSchedule(steps) {
        // Menghapus jadwal lama dan memasukkan yang baru (atau update)
        await supabase.from('sessions').delete().neq('id', 0); // Bersihkan sesi lama
        const { error } = await supabase.from('sessions').insert(steps);
        if (error) console.error("Gagal menyimpan jadwal:", error);
        else alert("Jadwal berhasil disimpan ke database!");
    },

    async updateProgress(userId, stepId, status) {
        const { error } = await supabase.from('progress').upsert({ user_id: userId, step_id: stepId, status: status, updated_at: new Date() });
        if (error) console.error("Gagal update progress:", error);
    }
};
