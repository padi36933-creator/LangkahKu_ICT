window.auth = {
    async checkSession() {
        const { data: { session }, error } = await window.db.supabase.auth.getSession();
        const isLoginPage = window.location.pathname.includes('login.html');
        
        if (!session && !isLoginPage) {
            window.location.replace('login.html');
            return null;
        } else if (session && isLoginPage) {
            window.location.replace('index.html');
        }
        return session ? session.user : null;
    },

    async login(email, password) {
        document.getElementById('authMsg').innerText = "Memproses...";
        const { error } = await window.db.supabase.auth.signInWithPassword({ email, password });
        if (error) {
            document.getElementById('authMsg').innerText = error.message;
        } else {
            window.location.replace('index.html');
        }
    },

    async register(email, password) {
        document.getElementById('authMsg').innerText = "Mendaftarkan...";
        const { data, error } = await window.db.supabase.auth.signUp({ email, password });
        if (error) {
            document.getElementById('authMsg').innerText = error.message;
        } else {
            document.getElementById('authMsg').style.color = "green";
            document.getElementById('authMsg').innerText = 'Pendaftaran berhasil. Silakan cek email Anda untuk verifikasi, lalu masuk.';
        }
    },

    async logout() {
        await window.db.supabase.auth.signOut();
        window.location.replace('login.html');
    }
};
