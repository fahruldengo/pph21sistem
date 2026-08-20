# Sistem Perhitungan PPh Pasal 21 — CV. Vidya Amaliah

Aplikasi web untuk menghitung **PPh Pasal 21** karyawan menggunakan metode
**TER (Tarif Efektif Rata-rata)** sesuai **PP 58/2023**, lengkap dengan
rekonsiliasi tahunan **Pasal 17** untuk masa Desember.

Dibangun ulang dari workbook `PERHITUNGAN_PPH_PASAL_21_TAHUN_2026.xlsx` — struktur,
logika, dan seluruh sheet acuan dipindahkan menjadi aplikasi HTML + JavaScript murni.
Basis data tersimpan di dalam browser (localStorage) sehingga tidak perlu server backend.

---

## ✨ Fitur

| Menu | Fungsi |
|---|---|
| **Dashboard** | Ringkasan pemotongan PPh 21 seluruh masa pajak |
| **Data Pemotong** | Identitas perusahaan & penandatangan bukti potong |
| **Elemen PPh 21** | Persentase iuran BPJS (JKK, JKM, JHT, JP, Kesehatan) + batas gaji |
| **Data Pegawai** | Monitoring seluruh pegawai (aktif & nonaktif), tambah/edit, filter status + jumlah tampil, ekspor CSV |
| **Input Penghasilan** | Tabel penghasilan per masa (hanya menampilkan data); input/edit lewat pop-up dengan pratinjau PPh langsung. Kolom **Lembur & Lain-lain** otomatis masuk ke tunjangan. Filter jumlah tampil 5/10/20/25/50/100 |
| **Kalkulator PPh 21** | Hitung satu pegawai dengan rincian lengkap + terbilang |
| **Rekap Bulanan** | Daftar pemotongan seluruh pegawai per masa pajak (siap cetak) |
| **Perhitungan Tahunan** | Rekonsiliasi Pasal 17 masa Desember (kurang/lebih potong) |
| **Summary Setahun** | Matriks PPh 21 tiap pegawai Januari–Desember |

**Status kepegawaian.** Setiap pegawai punya status **aktif** atau **nonaktif**. Saat
pegawai ditandai nonaktif, Anda memilih bulan terakhir bekerja — penghasilan setelah bulan
itu berhenti dihitung dan sel-nya terkunci di Input Penghasilan, tetapi pegawai **tetap masuk
Perhitungan Tahunan** (otomatis "disetahunkan" bila bekerja < 12 bulan). Di menu Data Pegawai
tersedia filter **status** dan filter **jumlah karyawan yang ditampilkan** (10/25/50/semua)
dengan penomoran halaman.

Logika kunci yang dipertahankan dari Excel:
- **TER A/B/C** dipilih otomatis dari status PTKP (sheet `TER`).
- **Gross-up** tunjangan PPh dihitung secara iteratif (fixed-point).
- **PTKP** dari sheet `T-PTKP`; **tarif progresif** `MAX({5;15;25;30;35}% × PKP − {0;6jt;31jt;56jt;306jt})`.
- **Biaya jabatan** 5% maks Rp500.000/bulan; **iuran JP** maks Rp100.423.

---

## 🚀 Menjalankan

### Lokal
Karena data seed sudah ditanam sebagai file JS (`assets/js/seed-data.js`),
aplikasi bisa dibuka langsung **tanpa server** — cukup buka `index.html` di browser.
Untuk pengalaman terbaik jalankan lewat server statis:

```bash
# Python
python3 -m http.server 8000
# lalu buka http://localhost:8000
```

### GitHub Pages
1. Buat repository baru di GitHub, mis. `pph21-system`.
2. Unggah seluruh isi folder ini:
   ```bash
   git init
   git add .
   git commit -m "Sistem PPh 21 CV Vidya Amaliah"
   git branch -M main
   git remote add origin https://github.com/<username>/pph21-system.git
   git push -u origin main
   ```
3. Di GitHub → **Settings → Pages** → Source: `main` / root → **Save**.
4. Situs terbit di `https://<username>.github.io/pph21-system/`.

File `.nojekyll` sudah disertakan agar folder `assets` tidak diproses Jekyll.

---

## 🔐 Login

Akun default:

| Pengguna | Sandi |
|---|---|
| `admin` | `vidya2026` |

> ⚠️ **Catatan keamanan.** Autentikasi ini murni di sisi browser (localStorage) dan
> cocok untuk alat internal kantor di GitHub Pages. Ini **bukan** batas keamanan yang
> sesungguhnya — untuk multi-pengguna yang aman, letakkan aplikasi di belakang server.
> Ganti sandi default dengan mengedit `assets/js/auth.js` (konstanta `DEFAULT`).

---

## 📁 Struktur Folder

```
pph21-system/
├── index.html                 # pengalih ke login/dashboard
├── .nojekyll
├── auth/
│   └── login.html
├── pages/                     # satu folder per menu
│   ├── dashboard/
│   ├── pemotong/
│   ├── elemen/
│   ├── input-penghasilan/
│   ├── kalkulator/
│   ├── rekap-bulanan/
│   ├── tahunan/
│   └── summary/
└── assets/
    ├── css/app.css            # design system
    ├── js/
    │   ├── auth.js            # login/sesi
    │   ├── reference.js       # tabel PTKP, ELEMEN, kode objek, Pasal 17
    │   ├── seed-data.js       # data awal dari Excel (55 pegawai, TER, pemotong)
    │   ├── store.js           # "database" spreadsheet di localStorage
    │   ├── engine.js          # mesin hitung PPh 21 (TER + tahunan)
    │   └── ui.js              # sidebar, topbar, modal, toast
    └── data/seed.json         # sumber data mentah (referensi)
```

## 💾 Basis Data

Seluruh data (pemotong, pegawai, penghasilan tiap masa) disimpan dalam satu objek
`localStorage` bernama `pph21_workbook_v1`, meniru struktur workbook Excel. Ekspor CSV
tersedia di menu Input Penghasilan dan Summary. Untuk mengosongkan dan memuat ulang
data awal, hapus penyimpanan situs di browser.

---

Dibuat untuk **CV. Vidya Amaliah**, Gorontalo — Tahun Pajak 2026.
