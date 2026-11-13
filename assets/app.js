document.addEventListener("DOMContentLoaded", async () => {
    try {
        // 1. Cek sesi saat aplikasi dimuat
        const user = await window.auth.checkSession();
        if (!user) return; // Jika tidak ada user, auth.js otomatis memindahkan ke login.html

        // 2. Ambil Role dari Database
        const role = await window.db.getUserRole(user.id);
        
        // JIKA ROLE TIDAK DITEMUKAN (Sesi Hantu / Akun Cacat)
        if (!role) {
            document.getElementById('userInfo').innerText = `Role tidak ditemukan.`;
            alert("Akun Anda belum terdaftar dengan benar. Anda akan dikeluarkan untuk mendaftar ulang.");
            await window.auth.logout(); // Paksa keluar untuk menghapus sesi hantu
            return;
        }

        // Tampilkan info pengguna
        document.getElementById('userInfo').innerText = `Login sebagai: ${user.email} (${role})`;
        document.getElementById('btnLogout').addEventListener('click', () => window.auth.logout());

        // 3. Render Dashboard berdasarkan Role
        if (role === 'guru') {
            initTeacherView();
        } else if (role === 'siswa') {
            initStudentView(user.id);
        }
        
    } catch (err) {
        console.error("Terjadi kesalahan sistem:", err);
        document.getElementById('userInfo').innerText = "Terjadi kesalahan koneksi.";
    }
});

async function initTeacherView() {
    document.getElementById('teacherView').hidden = false;
    document.getElementById('studentView').hidden = true;

    const steps = await window.db.loadSchedule();
    const list = document.getElementById('editorList');
    list.innerHTML = (!steps || steps.length === 0) ? '<p>Belum ada jadwal.</p>' : steps.map(s => `<p>${s.title}</p>`).join('');

    document.getElementById('saveSchedule').addEventListener('click', async () => {
        const newSteps = [{ step_order: 1, title: 'Langkah 1 Baru', description: 'Deskripsi' }];
        await window.db.saveSchedule(newSteps);
    });
}

async function initStudentView(userId) {
    document.getElementById('teacherView').hidden = true;
    document.getElementById('studentView').hidden = false;

    const steps = await window.db.loadSchedule();
    const list = document.getElementById('scheduleList');
    list.innerHTML = (!steps || steps.length === 0) ? '<li>Belum ada jadwal dari guru.</li>' : steps.map(s => `<li>${s.title}</li>`).join('');

    document.getElementById('completeButton').addEventListener('click', async () => {
        if (steps && steps.length > 0) {
            await window.db.updateProgress(userId, steps[0].id, 'selesai');
            alert("Progres disimpan ke database!");
        }
    });
}