
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Cek sesi saat aplikasi dimuat
    const user = await window.auth.checkSession();
    if (!user) return;

    // 2. Ambil Role dari Database
    const role = await window.db.getUserRole(user.id);
    document.getElementById('userInfo').innerText = `Login sebagai: ${user.email} (${role})`;

   // 3. Render Dashboard berdasarkan Role
    if (role === 'guru') {
        initTeacherView();
    } else if (role === 'siswa') {
        initStudentView(user.id);
    } else {
        document.getElementById('userInfo').innerText = `Role belum diatur untuk ${user.email}`;
        alert("Akun Anda belum memiliki role. Hapus akun ini dari menu Authentication Supabase, lalu daftar ulang melalui form di web.");
    }
    // 4. Event Listener Global
    document.getElementById('btnLogout').addEventListener('click', () => {
        window.auth.logout();
    });
});

async function initTeacherView() {
    document.getElementById('teacherView').hidden = false;
    document.getElementById('studentView').hidden = true;

    // Load data jadwal dari database
    const steps = await window.db.loadSchedule();
    renderEditor(steps);

    document.getElementById('saveSchedule').addEventListener('click', async () => {
        // Contoh: Mengumpulkan data dari form editor (logic disederhanakan)
        const newSteps = [
            { step_order: 1, title: 'Langkah 1 Baru', description: 'Deskripsi' }
        ];
        await window.db.saveSchedule(newSteps);
    });
}

async function initStudentView(userId) {
    document.getElementById('teacherView').hidden = true;
    document.getElementById('studentView').hidden = false;

    // Load data jadwal dari database
    const steps = await window.db.loadSchedule();
    renderStudentProgress(steps);

    document.getElementById('completeButton').addEventListener('click', async () => {
        // Tandai step pertama selesai sebagai contoh
        await window.db.updateProgress(userId, steps[0].id, 'selesai');
        alert("Progres disimpan ke database!");
    });
}

function renderEditor(steps) {
    const list = document.getElementById('editorList');
    list.innerHTML = steps.map(s => `<p>${s.title}</p>`).join('');
}

function renderStudentProgress(steps) {
    const list = document.getElementById('scheduleList');
    list.innerHTML = steps.map(s => `<li>${s.title}</li>`).join('');
}
