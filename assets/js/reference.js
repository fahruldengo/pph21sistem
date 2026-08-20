/* ============================================================
   reference.js — Static reference tables mirrored from the
   Excel sheets: TER, T-PTKP, ELEMEN PPh 21, REF (object codes).
   These are the "rate books" the calculation engine reads.
   ============================================================ */
window.REF = {
  // --- PTKP annual amounts (sheet T-PTKP) ---
  ptkpAmounts: {
    "TK/0": 54000000, "TK/1": 58500000, "TK/2": 63000000, "TK/3": 67500000,
    "K/0": 58500000, "K/1": 63000000, "K/2": 67500000, "K/3": 72000000,
    "K/I/0": 112500000, "K/I/1": 117000000, "K/I/2": 121500000, "K/I/3": 126000000
  },

  // --- PTKP status -> TER category (sheet TER, cols G/H) ---
  ptkpTer: {
    "TK/0": "TER A", "TK/1": "TER A", "K/0": "TER A",
    "TK/2": "TER B", "TK/3": "TER B", "K/1": "TER B", "K/2": "TER B",
    "K/3": "TER C",
    // K/I/* follow the higher-bracket categories in practice
    "K/I/0": "TER C", "K/I/1": "TER C", "K/I/2": "TER C", "K/I/3": "TER C"
  },

  // --- ELEMEN PPh 21 rates (sheet ELEMEN PPh 21) ---
  elemen: {
    // paid by employer (penambah bruto only where noted)
    jkk: 0.0024,     // D8  -> adds to bruto
    jkm: 0.003,      // D9  -> adds to bruto
    bpjsKesEmployer: 0.04,   // D11, capped at gaji Rp12.000.000 (=> max 480.000)
    bpjsKesCap: 12000000,
    // pengurang (deductible) — iuran pensiun & JHT borne by employee
    jhtEmployee: 0.02,   // D17
    jpEmployee: 0.01,    // D18, capped at gaji Rp10.042.300
    jpCapBase: 10042300,
    jpCapAmount: 100423 // D18 * 10.042.300 (Excel C23)
  },

  // --- Object tax codes (sheet REF, cols M/N) ---
  objCodes: [
    { kode: "21-100-01", uraian: "Pegawai Tetap" },
    { kode: "21-100-02", uraian: "Penerima Pensiun Berkala" },
    { kode: "21-100-03", uraian: "Upah Pegawai Tidak Tetap atau Tenaga Kerja Lepas" },
    { kode: "21-100-04", uraian: "Imbalan Kepada Distributor Multi Level Marketing (MLM)" },
    { kode: "21-100-05", uraian: "Imbalan Kepada Petugas Dinas Luar Asuransi" },
    { kode: "21-100-06", uraian: "Imbalan Kepada Penjaja Barang Dagangan" },
    { kode: "21-100-07", uraian: "Imbalan Kepada Tenaga Ahli" },
    { kode: "21-100-08", uraian: "Imbalan Kepada Bukan Pegawai (Berkesinambungan)" },
    { kode: "21-100-09", uraian: "Imbalan Kepada Bukan Pegawai (Tidak Berkesinambungan)" },
    { kode: "21-100-10", uraian: "Honorarium Dewan Komisaris/Pengawas non-Pegawai Tetap" },
    { kode: "21-100-11", uraian: "Jasa Produksi, Tantiem, Bonus Mantan Pegawai" },
    { kode: "21-100-12", uraian: "Penarikan Dana Pensiun oleh Pegawai" },
    { kode: "21-100-13", uraian: "Imbalan Kepada Peserta Kegiatan" },
    { kode: "21-100-99", uraian: "Objek PPh Pasal 21 Tidak Final Lainnya" }
  ],

  ptkpList: ["TK/0","TK/1","TK/2","TK/3","K/0","K/1","K/2","K/3","K/I/0","K/I/1","K/I/2","K/I/3"],

  months: [
    {key:"JAN",label:"Januari",n:1},{key:"FEB",label:"Februari",n:2},
    {key:"MAR",label:"Maret",n:3},{key:"APR",label:"April",n:4},
    {key:"MEI",label:"Mei",n:5},{key:"JUN",label:"Juni",n:6},
    {key:"JUL",label:"Juli",n:7},{key:"AGT",label:"Agustus",n:8},
    {key:"SEP",label:"September",n:9},{key:"OKT",label:"Oktober",n:10},
    {key:"NOV",label:"November",n:11},{key:"DES",label:"Desember",n:12}
  ],

  // --- Progressive Article 17 brackets (for December annualisation) ---
  // MAX({5;15;25;30;35}% * PKP) - {0;6jt;31jt;56jt;306jt}
  art17: [
    { rate: 0.05, sub: 0 },
    { rate: 0.15, sub: 6000000 },
    { rate: 0.25, sub: 31000000 },
    { rate: 0.30, sub: 56000000 },
    { rate: 0.35, sub: 306000000 }
  ]
};

/* TER brackets (sheet TER, cols A/B/D/E) — [lowerBound, upperBound, rate].
   Rate applies when lowerBound < bruto <= upperBound. Loaded from data file. */
window.TER_BRACKETS = null; // populated by store.js from seed.json
