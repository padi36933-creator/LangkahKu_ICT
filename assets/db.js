// GANTI DENGAN KREDENSIAL SUPABASE ANDA
const SUPABASE_URL = 'https://XYZ.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhb...';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.db = {
    supabase: supabase,
    
    async getUserRole(userId) {
        // Karena ada RLS dan ini membaca tabel profiles
        const { data, error } = await supabase.from('profiles').select('role, full_name').eq('id', userId).single();
        if (error) console.error("Gagal membaca profil:", error);
        return data ? data : { role: 'siswa', full_name: '' };
    },

    // --- FITUR GURU ---
    async saveActivityWithSteps(title, stepsArray, teacherId) {
        // 1. Simpan header aktivitas
        const { data: actData, error: actErr } = await supabase.from('activities')
            .insert([{ title: title, teacher_id: teacherId, is_published: true }]).select().single();
        if (actErr) throw actErr;

        // 2. Simpan langkah-langkah
        const stepsToInsert = stepsArray.map((s, index) => ({
            activity_id: actData.id,
            step_order: index + 1,
            title: s.title,
            instruction: s.instruction,
            tip: s.tip,
            audio_path: s.audio_path // Path dari storage
        }));
        
        const { error: stepErr } = await supabase.from('activity_steps').insert(stepsToInsert);
        if (stepErr) throw stepErr;
        return actData;
    },

    async uploadAudio(blob, fileName) {
        // Upload rekaman suara ke bucket 'audio_instruksi'
        const { data, error } = await supabase.storage.from('audio_instruksi').upload(`rekaman/${fileName}`, blob, {
            contentType: 'audio/webm',
            upsert: true
        });
        if (error) {
            console.error("Gagal upload audio:", error);
            return null;
        }
        return data.path;
    },
    
    async getAudioPublicUrl(path) {
        if(!path) return null;
        const { data } = supabase.storage.from('audio_instruksi').getPublicUrl(path);
        return data.publicUrl;
    },

    async getStudents() {
        const { data } = await supabase.from('profiles').select('id, email').eq('role', 'siswa');
        return data || [];
    },

    async saveAssessment(assignmentId, scores, notes, teacherId) {
        const { error } = await supabase.from('assessments').upsert({
            assignment_id: assignmentId,
            understanding_score: scores.und,
            independence_score: scores.ind,
            completion_score: scores.comp,
            notes: notes,
            assessed_by: teacherId
        });
        if (error) console.error("Gagal simpan penilaian:", error);
    },

    // --- FITUR SISWA ---
    async getAssignedActivity() {
        // Sederhana: Ambil aktivitas terbaru yang di-publish (MVP)
        const { data, error } = await supabase.from('activities').select('id, title').eq('is_published', true).order('created_at', {ascending: false}).limit(1).single();
        if(error || !data) return null;

        // Ambil langkah-langkahnya
        const { data: steps } = await supabase.from('activity_steps').select('*').eq('activity_id', data.id).order('step_order', {ascending: true});
        return { activity: data, steps: steps || [] };
    }
};
