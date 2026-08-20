/* ============================================================
   store.js — the "spreadsheet database".
   All data lives in localStorage under one workbook object,
   mirroring the Excel sheets (pemotong, employees, monthly
   income rows per month). Load/patch/save + CSV import/export.
   ============================================================ */
window.DB = (function () {
  const KEY = "pph21_workbook_v1";
  let cache = null;

  function blank() {
    return {
      meta: { year: 2026, createdAt: Date.now() },
      pemotong: {
        nama: "CV. VIDYA AMALIAH", npwp: "0934538901822000",
        alamat: "JL. NANI WARTABONE, KOTA SELATAN", kota: "GORONTALO",
        telp: "811435431", namaPemotong: "YASIN YUSUF",
        npwpPemotong: "077250454822000", tahun: 2026
      },
      employees: [],      // master data (mirrors DATA PEGAWAI cols)
      income: {}          // income[MONTHKEY][employeeId] = {gaji,tunjLain,honor,natura,tantiem,zakat,grossUp,premiOn}
    };
  }

  // Seed is embedded as window.SEED (assets/js/seed-data.js) — no fetch needed,
  // so the app works both on GitHub Pages and when opened directly as files.
  function ensureSeed() {
    if (window.SEED) window.TER_BRACKETS = window.SEED.ter;
    if (localStorage.getItem(KEY)) return Promise.resolve();
    const seed = window.SEED;
    if (!seed) { localStorage.setItem(KEY, JSON.stringify(blank())); return Promise.resolve(); }

    const wb = blank();
    wb.pemotong = { ...wb.pemotong, ...seed.pemotong };
    wb.employees = seed.employees.map((e, i) => ({
      id: "E" + String(i + 1).padStart(3, "0"),
      nama: e.nama, jk: e.jk, jabatan: e.jabatan, nik: e.nik || "",
      kodeObjek: e.kodeObjek || "21-100-01", ptkp: e.ptkp || "TK/0",
      alamat: e.alamat || "", asing: e.asing || "N",
      negara: e.negara || "Indonesia",
      bulanMulai: e.bulanMulai || 1, bulanAkhir: e.bulanAkhir || 12,
      grossUp: (e.grossUp === "Yes"), zakat: e.zakat || 0,
      status: "aktif", tglMasuk: "", tglKeluar: ""
    }));
    wb.income["JAN"] = {};
    wb.employees.forEach((emp, i) => {
      const src = seed.employees[i];
      wb.income["JAN"][emp.id] = {
        gaji: src.gaji || 0, tunjLain: src.tunjLain || 0,
        honor: src.honor || 0, natura: src.natura || 0,
        tantiem: 0, zakat: src.zakat || 0,
        grossUp: emp.grossUp, premiOn: true
      };
    });
    localStorage.setItem(KEY, JSON.stringify(wb));
    return Promise.resolve();
  }

  function ensureTer() {
    if (!window.TER_BRACKETS && window.SEED) window.TER_BRACKETS = window.SEED.ter;
    return Promise.resolve();
  }

  function load() {
    if (cache) return cache;
    cache = JSON.parse(localStorage.getItem(KEY) || "null") || blank();
    // apply saved BPJS rate overrides to the live reference table
    if (window.REF && cache.meta && cache.meta.elemen) {
      Object.assign(window.REF.elemen, cache.meta.elemen);
    }
    return cache;
  }
  function save(wb) { cache = wb; localStorage.setItem(KEY, JSON.stringify(wb)); }
  function patch(fn) { const wb = load(); fn(wb); save(wb); }

  // Month key -> 1..12 index (JAN=1 ... DES=12)
  const MONTH_ORDER = ["JAN","FEB","MAR","APR","MEI","JUN","JUL","AGU","SEP","OKT","NOV","DES"];
  function monthNum(monthKey) { return MONTH_ORDER.indexOf(monthKey) + 1; }

  // True if the employee is being paid in this month (within employment window)
  function isPayMonth(monthKey, emp) {
    const n = monthNum(monthKey);
    if (n < 1) return true;
    const start = emp.bulanMulai || 1;
    const end = (emp.status === "nonaktif" && emp.bulanAkhir) ? emp.bulanAkhir : (emp.bulanAkhir || 12);
    return n >= start && n <= end;
  }

  const ZERO_INC = e => ({ gaji: 0, tunjLain: 0, honor: 0, natura: 0, tantiem: 0,
    zakat: e.zakat || 0, grossUp: e.grossUp, premiOn: true });

  // Income accessor for a given month, defaulting from master + January.
  // Outside the employment window (e.g. after an employee left) returns zeros.
  function incomeFor(monthKey, emp) {
    if (!isPayMonth(monthKey, emp)) return ZERO_INC(emp);
    const wb = load();
    const m = wb.income[monthKey] || {};
    if (m[emp.id]) return m[emp.id];
    // default: reuse January (recurring salary) or zeros
    const jan = (wb.income["JAN"] || {})[emp.id];
    return jan ? { ...jan, tantiem: 0 } : ZERO_INC(emp);
  }
  function setIncome(monthKey, empId, data) {
    patch(wb => {
      wb.income[monthKey] = wb.income[monthKey] || {};
      wb.income[monthKey][empId] = data;
    });
  }

  function addEmployee(emp) {
    patch(wb => {
      const n = wb.employees.length + 1;
      emp.id = "E" + String(Date.now()).slice(-6);
      if (!emp.status) emp.status = "aktif";
      if (emp.tglKeluar === undefined) emp.tglKeluar = "";
      if (emp.tglMasuk === undefined) emp.tglMasuk = "";
      wb.employees.push(emp);
      wb.income["JAN"] = wb.income["JAN"] || {};
      wb.income["JAN"][emp.id] = {
        gaji: emp._gaji || 0, tunjLain: emp._tunjLain || 0, honor: 0, natura: 0,
        tantiem: 0, zakat: emp.zakat || 0, grossUp: emp.grossUp, premiOn: true
      };
      delete emp._gaji; delete emp._tunjLain;
    });
  }
  function updateEmployee(id, patchObj) {
    patch(wb => { const e = wb.employees.find(x => x.id === id); if (e) Object.assign(e, patchObj); });
  }
  function removeEmployee(id) {
    patch(wb => {
      wb.employees = wb.employees.filter(e => e.id !== id);
      Object.keys(wb.income).forEach(mk => { delete wb.income[mk][id]; });
    });
  }

  // Set active/inactive. When marking inactive, bulanAkhir is set so the
  // employee stops generating income after their last working month but still
  // appears in the annual reconciliation.
  function setStatus(id, status, bulanAkhir) {
    patch(wb => {
      const e = wb.employees.find(x => x.id === id);
      if (!e) return;
      e.status = status;
      if (status === "nonaktif") {
        if (bulanAkhir) e.bulanAkhir = bulanAkhir;
      } else {
        e.bulanAkhir = 12; e.tglKeluar = "";
      }
    });
  }

  function reset() { localStorage.removeItem(KEY); cache = null; }

  return {
    ensureSeed, ensureTer, load, save, patch,
    incomeFor, setIncome, addEmployee, updateEmployee, removeEmployee,
    setStatus, isPayMonth, monthNum, reset, blank
  };
})();

/* ---------- Formatters ---------- */
window.fmt = {
  rp(v) {
    const n = Math.round(Number(v) || 0);
    return "Rp\u00a0" + n.toLocaleString("id-ID");
  },
  rpPlain(v) { return (Math.round(Number(v) || 0)).toLocaleString("id-ID"); },
  pct(v) { return (Number(v) * 100).toLocaleString("id-ID", { maximumFractionDigits: 2 }) + "%"; },
  num(v) { return (Number(v) || 0).toLocaleString("id-ID"); }
};

/* ---------- Terbilang (number to Indonesian words) ---------- */
window.terbilang = function (n) {
  n = Math.round(Math.abs(Number(n) || 0));
  const sat = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  function toWords(x) {
    if (x < 12) return sat[x];
    if (x < 20) return toWords(x - 10) + " belas";
    if (x < 100) return toWords(Math.floor(x / 10)) + " puluh" + (x % 10 ? " " + toWords(x % 10) : "");
    if (x < 200) return "seratus" + (x % 100 ? " " + toWords(x % 100) : "");
    if (x < 1000) return toWords(Math.floor(x / 100)) + " ratus" + (x % 100 ? " " + toWords(x % 100) : "");
    if (x < 2000) return "seribu" + (x % 1000 ? " " + toWords(x % 1000) : "");
    if (x < 1e6) return toWords(Math.floor(x / 1000)) + " ribu" + (x % 1000 ? " " + toWords(x % 1000) : "");
    if (x < 1e9) return toWords(Math.floor(x / 1e6)) + " juta" + (x % 1e6 ? " " + toWords(x % 1e6) : "");
    if (x < 1e12) return toWords(Math.floor(x / 1e9)) + " miliar" + (x % 1e9 ? " " + toWords(x % 1e9) : "");
    return toWords(Math.floor(x / 1e12)) + " triliun" + (x % 1e12 ? " " + toWords(x % 1e12) : "");
  }
  if (n === 0) return "Nol Rupiah";
  const words = toWords(n).replace(/\s+/g, " ").trim();
  return words.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") + " Rupiah";
};
