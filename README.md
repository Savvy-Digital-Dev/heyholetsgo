# HeyHoLetsGo

Aplikasi web ringan untuk tracking **task harian, progress belajar, dan eksekusi 4DX** dalam satu dashboard yang fun (dengan karakter Ho-Ho). Cocok dipakai sebagai personal productivity tracker berbasis XP/dopamine.

## ✨ Fitur Utama

- **Tasks & Productivity**
  - Tambah task harian dengan effort level (1–3).
  - Status task: _todo_, _progress_, _blocked_, _done_.
  - Perhitungan XP harian dan persentase dopamine.
  - **28-day dopamine trend** (line chart) + **28-day productivity heatmap**.
  - Task yang belum selesai bisa di-carry-over ke hari berikutnya.

- **Learning & Skills**
  - Catat aktivitas belajar harian berdasarkan kategori, subskill, effort, dan refleksi.
  - Ringkasan XP belajar hari ini dan akumulasi 6 bulan.
  - Visualisasi chart dan heatmap belajar.
  - Highlight top skills berdasarkan data historis.

- **4DX (The 4 Disciplines of Execution)**
  - Set **WIG**, **Lead Measures** (max 4), dan **Lag Measures**.
  - Daily check-in status lead: **RED / YELLOW / GREEN**.
  - Rekap monthly lead completion + battery bar discipline.
  - Kalender 4DX dengan expected slot logic (ikut active date + off days).

- **Settings & Reports**
  - Profil user (nama + jabatan).
  - Theme toggle (**light / dark**).
  - Export **Monthly PDF Report** (A4, summary-based).
  - Sync mingguan ke Google Sheet (Task/Learning dan 4DX).

## 🧱 Tech Stack

- **HTML5** + **CSS3**
- **Vanilla JavaScript** (tanpa framework)
- **Chart.js** untuk visualisasi chart
- **jsPDF** + **html2canvas** untuk export PDF
- **localStorage** sebagai persistence utama data

## 📁 Struktur Project

```text
.
├── index.html
├── assets/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── core/
│       │   └── state.js
│       ├── domain/
│       │   ├── learning.js
│       │   └── tasks.js
│       ├── hoho/
│       │   └── hoho.js
│       ├── ui/
│       │   ├── ui-charts.js
│       │   ├── ui-heatmap.js
│       │   ├── ui-learning.js
│       │   ├── ui-modal.js
│       │   ├── ui-settings.js
│       │   └── ui-tasks.js
│       └── main.js
└── (aset gambar Ho-Ho & logo)
```

> Catatan: saat ini logika utama aplikasi berjalan dari `assets/js/main.js` dan state disimpan via `assets/js/core/state.js`.

## 🚀 Cara Menjalankan (Local)

Karena ini static web app, cukup pakai local server sederhana.

### Opsi 1 — Python

```bash
cd /workspace/heyholetsgo
python3 -m http.server 8080
```

Lalu buka: `http://localhost:8080`

### Opsi 2 — VS Code Live Server

- Open folder project.
- Klik kanan `index.html` → **Open with Live Server**.

## 🗂️ Cara Pakai Singkat

1. **Tasks tab** → tambah 2–5 task meaningful dan update status sepanjang hari.
2. **Learning tab** → log aktivitas belajar + refleksi pendek.
3. **4DX tab** → define lead measures, lakukan daily check-in, monitor warna performa.
4. **Settings tab** → isi profil, export PDF bulanan, dan lakukan weekly sync.

## 💾 Penyimpanan Data

- Semua data disimpan di browser menggunakan `localStorage`.
- Key storage default: `hhlg_v136_state`.
- Artinya data bersifat lokal per browser/device (belum ada auth/backend database).

## 🔌 Integrasi Google Sheet

Project sudah memiliki endpoint webhook di kode untuk:

- Sync weekly task + learning
- Sync weekly 4DX

Jika ingin ganti endpoint, update konstanta webhook di `assets/js/main.js`.

## ⚠️ Catatan Penting

- Karena data lokal, clear browser cache/storage akan menghapus data.
- Jika dipakai tim, sebaiknya tambah backend/auth + environment config untuk webhook.
- Untuk production deploy static, bisa pakai Netlify / Vercel / GitHub Pages.

## 🛠️ Ide Pengembangan Lanjutan

- Multi-user login & cloud sync.
- Custom scoring XP per kategori.
- Reminder harian (push / email / WA integration).
- Export CSV/JSON backup-restore.
- Insight AI untuk rekomendasi task planning mingguan.

---
