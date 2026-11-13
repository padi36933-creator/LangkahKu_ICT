
window.auth = {
    async checkSession() {
        const { data: { session } } = await window.db.supabase.auth.getSession();
        
        // Pengecekan halaman
        const isLoginPage = window.location.pathname.includes('login.html');
        
        if (!session && !isLoginPage) {
            window.location.href = 'login.html';
        } else if (session && isLoginPage) {
            window.location.href = 'index.html';
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
        window.location.href = 'login.html';
    }
};
