
window.auth = {
    async checkSession() {
    const { data, error } = await window.db.supabase.auth.getSession();
    const session = data?.session;
    
    // Cek apakah pengguna berada di halaman login
    const isLoginPage = window.location.pathname.endsWith('login.html');
    
    if (!session && !isLoginPage) {
        // Jika belum login dan BUKAN di halaman login, arahkan ke login.html
        window.location.replace('login.html');
        return null; // Hentikan eksekusi lebih lanjut
    } else if (session && isLoginPage) {
        // Jika sudah login dan BUKAN di dashboard, arahkan ke index.html
        window.location.replace('index.html');
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
