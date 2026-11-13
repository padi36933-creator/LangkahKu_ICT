/*
 * LangkahKu ICT - assets/app.js
 * Dashboard guru dan siswa.
 *
 * File ini menyesuaikan elemen yang sudah tersedia di index.html.
 * Editor guru dibuat secara dinamis di dalam #editorList.
 */

(() => {
  "use strict";

  const DEFAULT_STEPS = [
    {
      title: "Kenali perangkat komputer",
      description: "Amati monitor, CPU, keyboard, dan mouse."
    },
    {
      title: "Nyalakan komputer",
      description: "Nyalakan komputer sesuai arahan guru."
    },
    {
      title: "Latihan menggunakan mouse",
      description: "Berlatih menggerakkan mouse, klik, dan klik dua kali."
    },
    {
      title: "Buka aplikasi belajar",
      description: "Buka aplikasi yang sudah disiapkan oleh guru."
    },
    {
      title: "Lakukan kegiatan sederhana",
      description: "Buat gambar atau lakukan latihan sederhana di aplikasi."
    },
    {
      title: "Simpan hasil dan selesai",
      description: "Simpan pekerjaan, lalu beri tahu guru bahwa kegiatan selesai."
    }
  ];

  function byId(id) {
    return document.getElementById(id);
  }

  function addRuntimeStyles() {
    if (byId("langkahkuRuntimeStyles")) return;

    const style = document.createElement("style");
    style.id = "langkahkuRuntimeStyles";
    style.textContent = `
      .editor-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
        align-items: start;
        padding: 14px;
        margin: 0 0 12px;
        border: 1px solid var(--line, #e3eaee);
        border-radius: 12px;
        background: var(--surface, #fff);
      }
      .editor-fields { display: grid; gap: 8px; min-width: 0; }
      .editor-fields label { display: grid; gap: 4px; font-size: 13px; color: var(--muted, #637487); }
      .editor-fields input, .editor-fields textarea {
        width: 100%; box-sizing: border-box; padding: 9px 10px;
        border: 1px solid var(--line, #e3eaee); border-radius: 8px;
        color: var(--ink, #1f3344); background: #fff;
      }
      .editor-fields textarea { min-height: 70px; resize: vertical; }
      .editor-controls { display: flex; flex-wrap: wrap; gap: 5px; }
      .editor-controls button {
        padding: 8px 10px; border: 1px solid var(--line, #e3eaee);
        border-radius: 8px; background: #fff; color: var(--ink, #1f3344);
      }
      .editor-controls button:disabled { opacity: .4; cursor: not-allowed; }
      .editor-controls .delete-step { color: #a44848; }
      .schedule-step-button {
        display: block; width: 100%; text-align: left; padding: 10px 12px;
        margin: 0 0 7px; border: 1px solid var(--line, #e3eaee);
        border-radius: 9px; background: #fff; color: var(--ink, #1f3344);
        font-weight: 500;
      }
      .schedule-step-button[aria-current="step"] {
        border-color: var(--primary, #156a73);
        background: var(--pale, #e8f4f2);
      }
      .schedule-step-button.is-complete { color: #167044; }
      .runtime-status { margin-top: 10px; font-size: 13px; }
      @media (max-width: 650px) {
        .editor-row { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function setUserMessage(message) {
    const element = byId("userInfo");
    if (element) element.textContent = message;
  }

  function createButton(label, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    if (className) button.className = className;
    button.addEventListener("click", onClick);
    return button;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    addRuntimeStyles();

    try {
      const user = await window.auth.checkSession();
      if (!user) return;

      setUserMessage(`Memuat akun: ${user.email}`);

      const role = await window.db.getUserRole(user.id);

      if (!role) {
        setUserMessage(
          `Akun ${user.email} sudah login, tetapi role belum ditemukan pada tabel users. Hubungi administrator untuk membuat profil pengguna.`
        );
        return;
      }

      if (role !== "guru" && role !== "siswa") {
        setUserMessage(`Role "${role}" belum dikenali. Hubungi administrator.`);
        return;
      }

      setUserMessage(`Login sebagai: ${user.email} (${role})`);

      const logoutButton = byId("btnLogout");
      if (logoutButton) {
        logoutButton.addEventListener("click", () => window.auth.logout());
      }

      if (role === "guru") {
        await initTeacherView();
      } else {
        await initStudentView(user.id);
      }
    } catch (error) {
      console.error("Kesalahan saat memuat dashboard:", error);
      setUserMessage(`Gagal memuat dashboard: ${error.message}`);
    }
  });

  async function initTeacherView() {
    const teacherView = byId("teacherView");
    const studentView = byId("studentView");
    if (!teacherView || !studentView) {
      throw new Error("Elemen dashboard guru/siswa tidak ditemukan di index.html.");
    }

    teacherView.hidden = false;
    studentView.hidden = true;

    const editorList = byId("editorList");
    const addButton = byId("addStep");
    const saveButton = byId("saveSchedule");

    if (!editorList || !saveButton) {
      throw new Error("Elemen editor jadwal guru tidak lengkap di index.html.");
    }

    let steps = await window.db.loadSchedule();

    // Jika database belum memiliki jadwal, tampilkan contoh awal di editor.
    // Jadwal baru masuk ke database setelah guru menekan tombol Simpan.
    if (steps.length === 0) {
      steps = DEFAULT_STEPS.map((step) => ({ ...step, id: null }));
    }

    const status = document.createElement("p");
    status.className = "runtime-status";
    status.setAttribute("aria-live", "polite");
    saveButton.parentElement?.appendChild(status);

    function renderEditor() {
      editorList.replaceChildren();

      steps.forEach((step, index) => {
        const row = document.createElement("div");
        row.className = "editor-row";

        const fields = document.createElement("div");
        fields.className = "editor-fields";

        const titleLabel = document.createElement("label");
        titleLabel.textContent = `Judul aktivitas ${index + 1}`;
        const titleInput = document.createElement("input");
        titleInput.type = "text";
        titleInput.value = step.title || "";
        titleInput.maxLength = 150;
        titleInput.placeholder = "Masukkan judul aktivitas";
        titleInput.addEventListener("input", () => {
          steps[index].title = titleInput.value;
        });
        titleLabel.appendChild(titleInput);

        const descriptionLabel = document.createElement("label");
        descriptionLabel.textContent = "Petunjuk / deskripsi";
        const descriptionInput = document.createElement("textarea");
        descriptionInput.value = step.description || "";
        descriptionInput.maxLength = 1000;
        descriptionInput.placeholder = "Tuliskan petunjuk singkat untuk siswa";
        descriptionInput.addEventListener("input", () => {
          steps[index].description = descriptionInput.value;
        });
        descriptionLabel.appendChild(descriptionInput);

        fields.append(titleLabel, descriptionLabel);

        const controls = document.createElement("div");
        controls.className = "editor-controls";

        const upButton = createButton("↑", "", () => {
          if (index > 0) {
            [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]];
            renderEditor();
          }
        });
        upButton.title = "Pindahkan ke atas";
        upButton.disabled = index === 0;

        const downButton = createButton("↓", "", () => {
          if (index < steps.length - 1) {
            [steps[index + 1], steps[index]] = [steps[index], steps[index + 1]];
            renderEditor();
          }
        });
        downButton.title = "Pindahkan ke bawah";
        downButton.disabled = index === steps.length - 1;

        const deleteButton = createButton("Hapus", "delete-step", () => {
          if (steps.length <= 1) {
            status.textContent = "Jadwal minimal harus memiliki satu aktivitas.";
            return;
          }
          steps.splice(index, 1);
          renderEditor();
          status.textContent = "Aktivitas dihapus dari editor. Tekan Simpan untuk menerapkan perubahan.";
        });

        controls.append(upButton, downButton, deleteButton);
        row.append(fields, controls);
        editorList.appendChild(row);
      });
    }

    renderEditor();

    if (addButton) {
      addButton.addEventListener("click", () => {
        steps.push({
          id: null,
          title: "",
          description: ""
        });
        renderEditor();
        status.textContent = "Aktivitas baru ditambahkan. Lengkapi judul dan petunjuknya.";
      });
    }

    saveButton.addEventListener("click", async () => {
      const originalLabel = saveButton.textContent;
      saveButton.disabled = true;
      saveButton.textContent = "Menyimpan...";

      try {
        steps = await window.db.saveSchedule(steps);
        renderEditor();
        status.textContent = "Jadwal berhasil disimpan ke database.";
        status.style.color = "#167044";
      } catch (error) {
        console.error("Gagal menyimpan jadwal:", error);
        status.textContent = `Gagal menyimpan jadwal: ${error.message}`;
        status.style.color = "#b42318";
      } finally {
        saveButton.disabled = false;
        saveButton.textContent = originalLabel || "Simpan ke Database";
      }
    });
  }

  async function initStudentView(userId) {
    const teacherView = byId("teacherView");
    const studentView = byId("studentView");
    if (!teacherView || !studentView) {
      throw new Error("Elemen dashboard guru/siswa tidak ditemukan di index.html.");
    }

    teacherView.hidden = true;
    studentView.hidden = false;

    const steps = await window.db.loadSchedule();
    const progressRows = await window.db.loadProgress(userId);
    const completed = new Set(
      progressRows
        .filter((row) => row.status === "selesai")
        .map((row) => row.step_id)
    );

    const scheduleList = byId("scheduleList");
    const completeButton = byId("completeButton");

    if (!scheduleList || !completeButton) {
      throw new Error("Elemen jadwal siswa tidak lengkap di index.html.");
    }

    let currentIndex = Math.max(
      0,
      steps.findIndex((step) => !completed.has(step.id))
    );

    if (steps.length === 0) {
      scheduleList.replaceChildren();
      const emptyItem = document.createElement("li");
      emptyItem.textContent = "Belum ada jadwal dari guru.";
      scheduleList.appendChild(emptyItem);

      if (byId("stepTitle")) byId("stepTitle").textContent = "Belum ada kegiatan";
      if (byId("stepDescription")) {
        byId("stepDescription").textContent =
          "Silakan tunggu guru menyiapkan jadwal pembelajaran.";
      }
      completeButton.disabled = true;
      completeButton.textContent = "Belum ada kegiatan";
      updateProgressDisplay(0, 0);
      return;
    }

    function updateProgressDisplay(done, total) {
      const percent = total > 0 ? Math.round((done / total) * 100) : 0;
      if (byId("progressSummary")) {
        byId("progressSummary").textContent =
          `${done} dari ${total} kegiatan selesai`;
      }
      if (byId("progressPercent")) {
        byId("progressPercent").textContent = `${percent}%`;
      }
      if (byId("progressFill")) {
        byId("progressFill").style.width = `${percent}%`;
      }
      if (byId("progressTrack")) {
        byId("progressTrack").setAttribute(
          "aria-valuenow",
          String(percent)
        );
      }
    }

    function renderStudent() {
      const validCompletedCount = steps.filter((step) =>
        completed.has(step.id)
      ).length;

      updateProgressDisplay(validCompletedCount, steps.length);
      scheduleList.replaceChildren();

      steps.forEach((step, index) => {
        const item = document.createElement("li");
        const isDone = completed.has(step.id);
        const button = createButton(
          `${isDone ? "✓ " : ""}${index + 1}. ${step.title}`,
          `schedule-step-button${isDone ? " is-complete" : ""}`,
          () => {
            currentIndex = index;
            renderStudent();
          }
        );

        if (index === currentIndex) {
          button.setAttribute("aria-current", "step");
        }

        item.appendChild(button);
        scheduleList.appendChild(item);
      });

      const currentStep = steps[currentIndex];
      if (currentStep) {
        if (byId("stepEmoji")) byId("stepEmoji").textContent = "🖥️";
        if (byId("stepTitle")) {
          byId("stepTitle").textContent = currentStep.title;
        }
        if (byId("stepDescription")) {
          byId("stepDescription").textContent =
            currentStep.description || "Ikuti petunjuk dari guru.";
        }

        const isDone = completed.has(currentStep.id);
        completeButton.disabled = false;
        completeButton.textContent = isDone
          ? "Batalkan tanda selesai"
          : "✓ Tandai selesai";
      }
    }

    completeButton.addEventListener("click", async () => {
      const currentStep = steps[currentIndex];
      if (!currentStep) return;

      const wasCompleted = completed.has(currentStep.id);
      const nextStatus = wasCompleted ? "belum" : "selesai";

      completeButton.disabled = true;
      const oldLabel = completeButton.textContent;
      completeButton.textContent = "Menyimpan...";

      try {
        await window.db.updateProgress(userId, currentStep.id, nextStatus);

        if (nextStatus === "selesai") {
          completed.add(currentStep.id);
          const nextIndex = steps.findIndex(
            (step, index) => index > currentIndex && !completed.has(step.id)
          );
          if (nextIndex >= 0) currentIndex = nextIndex;
        } else {
          completed.delete(currentStep.id);
        }

        renderStudent();
      } catch (error) {
        console.error("Gagal menyimpan progres:", error);
        alert(`Progres belum berhasil disimpan: ${error.message}`);
        completeButton.textContent = oldLabel;
      } finally {
        completeButton.disabled = false;
      }
    });

    renderStudent();
  }
})();
