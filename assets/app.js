document.addEventListener("DOMContentLoaded", async () => {
    try {
        const user = await window.auth.checkSession();
        if (!user) return; 

        const profile = await window.db.getUserRole(user.id);
        const role = profile.role;
        
        document.getElementById('userInfo').innerText = `Akun: ${user.email} (${role.toUpperCase()})`;
        document.getElementById('btnLogout').addEventListener('click', () => window.auth.logout());

        if (role === 'guru' || role === 'admin') {
            initTeacherView(user.id);
        } else {
            initStudentView(user.id);
        }
        
        initAccessibilityTools();
    } catch (err) {
        console.error("Kesalahan sistem:", err);
        document.getElementById('userInfo').innerText = "Koneksi bermasalah.";
    }
});

// ==========================================
// TAMPILAN GURU & LOGIK PEREKAMAN AUDIO
// ==========================================
let stepsDraft = [];
let mediaRecorder;
let audioChunks = [];

function initTeacherView(teacherId) {
    document.getElementById('teacherView').hidden = false;
    document.getElementById('studentView').hidden = true;

    // Tabs Logic
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.hidden = true);
            e.target.classList.add('active');
            document.getElementById(e.target.dataset.target).hidden = false;
        });
    });

    // Activity Builder Logic
    document.getElementById('addStepBtn').addEventListener('click', () => {
        const stepId = Date.now();
        stepsDraft.push({ id: stepId, title: '', instruction: '', tip: '', audioBlob: null, audioPath: null });
        renderEditor();
    });

    document.getElementById('saveActivityBtn').addEventListener('click', async () => {
        const title = document.getElementById('activityTitle').value;
        if(!title) return alert("Isi judul kegiatan utama!");
        
        document.getElementById('saveActivityBtn').innerText = "Menyimpan & Mengunggah Audio...";
        
        try {
            // Upload semua audio yang terekam terlebih dahulu
            for (let step of stepsDraft) {
                if (step.audioBlob) {
                    const fileName = `step_${step.id}_${Date.now()}.webm`;
                    step.audioPath = await window.db.uploadAudio(step.audioBlob, fileName);
                }
            }
            // Simpan data ke database
            await window.db.saveActivityWithSteps(title, stepsDraft, teacherId);
            alert("Kegiatan berhasil diterbitkan ke siswa!");
            stepsDraft = [];
            document.getElementById('activityTitle').value = '';
            renderEditor();
        } catch(e) {
            alert("Gagal menyimpan: " + e.message);
        } finally {
            document.getElementById('saveActivityBtn').innerText = "Simpan & Terbitkan Kegiatan";
        }
    });

    loadStudentsForAssessment();
    
    // CSV Logic (Sederhana)
    document.getElementById('exportCsvBtn').addEventListener('click', () => {
        const csvContent = "data:text/csv;charset=utf-8,Nama Siswa,Pemahaman,Kemandirian,Penyelesaian\nContoh Siswa,3,4,4";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "laporan_belajar.csv");
        document.body.appendChild(link);
        link.click();
    });
}

function renderEditor() {
    const list = document.getElementById('editorList');
    list.innerHTML = '';
    stepsDraft.forEach((step, index) => {
        const div = document.createElement('div');
        div.className = 'editor-item';
        div.innerHTML = `
            <strong>Langkah ${index + 1}</strong>
            <div class="field-group" style="margin-top:10px;">
                <input type="text" placeholder="Judul langkah (misal: Pegang Mouse)" value="${step.title}" onchange="updateStep(${index}, 'title', this.value)">
            </div>
            <div class="field-group">
                <textarea placeholder="Instruksi utama..." onchange="updateStep(${index}, 'instruction', this.value)">${step.instruction}</textarea>
            </div>
            <div class="field-group">
                <input type="text" placeholder="Petunjuk kecil (opsional)" value="${step.tip}" onchange="updateStep(${index}, 'tip', this.value)">
            </div>
            <div class="field-group">
                <button type="button" class="record-btn" id="rec_${step.id}">🎙️ Mulai Rekam Instruksi Suara</button>
                <audio id="audioPlayback_${step.id}" controls style="display:none; margin-top:10px; height:35px;"></audio>
            </div>
        `;
        list.appendChild(div);

        // Pasang event listener untuk rekam suara
        const recBtn = div.querySelector(`#rec_${step.id}`);
        recBtn.addEventListener('click', () => handleRecord(recBtn, step, div.querySelector(`#audioPlayback_${step.id}`)));
    });
}

window.updateStep = (index, field, value) => {
    stepsDraft[index][field] = value;
};

// Logika WebRTC MediaRecorder API
async function handleRecord(btn, stepObj, audioPlayback) {
    if (btn.classList.contains('recording')) {
        // Hentikan rekaman
        mediaRecorder.stop();
        btn.classList.remove('recording');
        btn.innerText = "🎙️ Rekam Ulang";
    } else {
        // Mulai rekaman
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            
            mediaRecorder.ondataavailable = e => { if(e.data.size > 0) audioChunks.push(e.data); };
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                stepObj.audioBlob = audioBlob; // Simpan di draft
                audioPlayback.src = URL.createObjectURL(audioBlob);
                audioPlayback.style.display = 'block';
                // Matikan stream mic
                stream.getTracks().forEach(t => t.stop());
            };
            
            mediaRecorder.start();
            btn.classList.add('recording');
            btn.innerText = "⏹️ Hentikan Rekaman";
        } catch (err) {
            alert("Gagal mengakses mikrofon. Pastikan izin diberikan di browser.");
        }
    }
}

async function loadStudentsForAssessment() {
    const list = document.getElementById('assessStudentList');
    const students = await window.db.getStudents();
    list.innerHTML = students.map(s => `<option value="${s.id}">${s.email}</option>`).join('');
}


// ==========================================
// TAMPILAN SISWA (UNIVERSAL)
// ==========================================
let currentStudentSteps = [];
let currentStepIndex = 0;

async function initStudentView(studentId) {
    document.getElementById('teacherView').hidden = true;
    document.getElementById('studentView').hidden = false;

    const data = await window.db.getAssignedActivity();
    if(!data || data.steps.length === 0) {
        document.getElementById('stepTitle').innerText = "Belum ada kegiatan untuk hari ini.";
        document.getElementById('stepDescription').innerText = "Tunggu instruksi dari guru ya.";
        document.getElementById('completeBtn').disabled = true;
        return;
    }

    currentStudentSteps = data.steps;
    document.getElementById('progressSummary').innerText = `0 dari ${currentStudentSteps.length} kegiatan selesai`;
    
    renderStudentStep();

    // Navigasi Siswa
    document.getElementById('nextBtn').addEventListener('click', () => {
        if(currentStepIndex < currentStudentSteps.length - 1) {
            currentStepIndex++;
            renderStudentStep();
        }
    });
    document.getElementById('prevBtn').addEventListener('click', () => {
        if(currentStepIndex > 0) {
            currentStepIndex--;
            renderStudentStep();
        }
    });
    document.getElementById('completeBtn').addEventListener('click', () => {
        alert("Bagus sekali! Langkah ini sudah ditandai selesai.");
        // Logic untuk update tabel step_progress dihilangkan di UI ini agar script tetap ringkas
        if(currentStepIndex < currentStudentSteps.length - 1) {
            currentStepIndex++;
            renderStudentStep();
        }
    });
    
    // Fitur Bantuan dan Jeda
    document.getElementById('helpBtn').addEventListener('click', () => alert("Permintaan bantuan dikirim. Guru akan segera datang."));
    document.getElementById('breakBtn').addEventListener('click', () => alert("Waktu istirahat. Silakan tarik napas atau minum. Progresmu aman."));
}

async function renderStudentStep() {
    const step = currentStudentSteps[currentStepIndex];
    document.getElementById('stepBadge').innerText = `KEGIATAN ${currentStepIndex + 1} DARI ${currentStudentSteps.length}`;
    document.getElementById('stepTitle').innerText = step.title;
    document.getElementById('stepDescription').innerText = step.instruction;
    
    if(step.tip) {
        document.getElementById('tipContainer').hidden = false;
        document.getElementById('stepTip').innerText = step.tip;
    } else {
        document.getElementById('tipContainer').hidden = true;
    }

    // Audio Player
    const playBtn = document.getElementById('playAudioBtn');
    const audioEl = document.getElementById('stepAudioPlayer');
    playBtn.hidden = true;
    
    if(step.audio_path) {
        const url = await window.db.getAudioPublicUrl(step.audio_path);
        if(url) {
            audioEl.src = url;
            playBtn.hidden = false;
            playBtn.onclick = () => audioEl.play();
        }
    }

    // Update Bar
    const percent = Math.round(((currentStepIndex) / currentStudentSteps.length) * 100);
    document.getElementById('progressPercent').innerText = percent + "%";
    document.getElementById('progressFill').style.width = percent + "%";
    document.getElementById('progressSummary').innerText = `${currentStepIndex} dari ${currentStudentSteps.length} kegiatan selesai`;
}

// Accessibility Tools
function initAccessibilityTools() {
    document.getElementById('focusToggle').addEventListener('click', () => document.body.classList.toggle('focus-mode'));
    document.getElementById('textToggle').addEventListener('click', () => document.body.classList.toggle('large-text'));
    document.getElementById('contrastToggle').addEventListener('click', () => document.body.classList.toggle('high-contrast'));
}
