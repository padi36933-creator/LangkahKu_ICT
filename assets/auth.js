
window.auth = {
    async checkSession() {
        // Tambahkan '/' di depan nama file untuk path yang pasti
        const { data, error } = await window.db.supabase.auth.getSession();
        const session = data?.session;
        
        const isLoginPage = window.location.pathname.includes('login.html');
        
        if (!session && !isLoginPage) {
            window.location.replace('/login.html'); 
            return null; 
        } else if (session && isLoginPage) {
            window.location.replace('/'); // Kembali ke root (index)
        }
        
        return session ? session.user : null;
    },

    async login(email, password) {
        const { data, error } = await window.db.supabase.auth.signInWithPassword({ email, password });
        if (error) {
            document.getElementById('authMsg').innerText = error.message;
        } else {
            window.location.href = 'index.html';
        }
    },

    async register(email, password, role) {
        const { data, error } = await window.db.supabase.auth.signUp({ email, password });
        if (error) {
            document.getElementById('authMsg').innerText = error.message;
        } else {
            // Masukkan role ke tabel 'users' custom
            if (data.user) {
                await window.db.supabase.from('users').insert([{ id: data.user.id, email: email, role: role }]);
            }
            alert('Pendaftaran berhasil. Silakan masuk.');
        }
    },

    async logout() {
        await window.db.supabase.auth.signOut();
        window.location.replace('/login.html');
    }
};
