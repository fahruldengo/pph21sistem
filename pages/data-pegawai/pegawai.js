Auth.guard();

let STATUS = "all";     // all | aktif | nonaktif
let PTKP = "all";
let PAGE_SIZE = 50;     // number | "all"
let PAGE = 1;

(async function () {
  await DB.ensureSeed(); await DB.ensureTer();
  UI.mount("pegawai", "Data Induk / <b>Data Pegawai</b>");

  document.getElementById("addBtn").innerHTML = UI.icon("plus") + " Tambah Pegawai";
  document.getElementById("exportBtn").innerHTML = UI.icon("download") + " Ekspor ▾";
  document.getElementById("addBtn").onclick = () => openForm();
  const pop = document.getElementById("exportPop");
  document.getElementById("exportBtn").onclick = (e) => { e.stopPropagation(); pop.classList.toggle("show"); };
  document.addEventListener("click", () => pop.classList.remove("show"));
  pop.querySelectorAll("[data-fmt]").forEach(b => b.onclick = () => { pop.classList.remove("show"); doExport(b.dataset.fmt); });

  // PTKP filter options
  const pf = document.getElementById("ptkpFilter");
  pf.innerHTML = `<option value="all">Semua PTKP</option>` +
    REF.ptkpList.map(p => `<option value="${p}">${p}</option>`).join("");
  pf.onchange = () => { PTKP = pf.value; PAGE = 1; render(); };

  // status segmented filter
  document.querySelectorAll("#statusFilter button").forEach(b => {
    b.onclick = () => {
      document.querySelectorAll("#statusFilter button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      STATUS = b.dataset.s; PAGE = 1; render();
    };
  });

  // page-size filter
  const ps = document.getElementById("pageSize");
  ps.onchange = () => { PAGE_SIZE = ps.value === "all" ? "all" : +ps.value; PAGE = 1; render(); };

  document.getElementById("search").oninput = () => { PAGE = 1; render(); };

  render();
})();

function filtered() {
  const wb = DB.load();
  const q = (document.getElementById("search").value || "").toLowerCase();
  return wb.employees.filter(e => {
    const st = e.status || "aktif";
    if (STATUS !== "all" && st !== STATUS) return false;
    if (PTKP !== "all" && e.ptkp !== PTKP) return false;
    if (q && !((e.nama + " " + (e.jabatan || "") + " " + (e.nik || "")).toLowerCase().includes(q))) return false;
    return true;
  });
}

function render() {
  const wb = DB.load();
  const all = wb.employees;
  const aktif = all.filter(e => (e.status || "aktif") === "aktif").length;
  const nonaktif = all.length - aktif;

  // stat tiles
  document.getElementById("stats").innerHTML = `
    <div class="stat"><div class="stat__label">Total Pegawai</div>
      <div class="stat__value">${all.length}</div><div class="stat__meta">terdaftar dalam sistem</div></div>
    <div class="stat stat--ok"><div class="stat__label">Masih Bekerja</div>
      <div class="stat__value">${aktif}</div><div class="stat__meta">status aktif</div></div>
    <div class="stat stat--clay"><div class="stat__label">Sudah Tidak Bekerja</div>
      <div class="stat__value">${nonaktif}</div><div class="stat__meta">tetap masuk rekap tahunan</div></div>
    <div class="stat"><div class="stat__label">Hasil Filter</div>
      <div class="stat__value">${filtered().length}</div><div class="stat__meta">sesuai kriteria saat ini</div></div>`;

  const rows = filtered();
  const total = rows.length;
  const size = PAGE_SIZE === "all" ? total || 1 : PAGE_SIZE;
  const pages = Math.max(1, Math.ceil(total / size));
  if (PAGE > pages) PAGE = pages;
  const start = (PAGE - 1) * size;
  const pageRows = PAGE_SIZE === "all" ? rows : rows.slice(start, start + size);

  document.getElementById("shownCount").textContent =
    total ? `Menampilkan ${pageRows.length} dari ${total}` : "0 pegawai";

  const tbody = document.querySelector("#grid tbody");
  if (!total) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="7" r="3"/><path d="M2 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/></svg>
      <div>Tidak ada pegawai yang cocok dengan filter.</div></div></td></tr>`;
    document.getElementById("pager").innerHTML = "";
    return;
  }

  tbody.innerHTML = pageRows.map((emp, i) => {
    const st = emp.status || "aktif";
    const stPill = st === "aktif"
      ? `<span class="pill pill--ok">● Aktif</span>`
      : `<span class="pill pill--muted">○ Nonaktif</span>`;
    const mulai = REF.months[(emp.bulanMulai || 1) - 1].label;
    const akhir = REF.months[(emp.bulanAkhir || 12) - 1].label;
    const masa = st === "nonaktif"
      ? `${mulai} – ${akhir} <span style="color:var(--ink-soft)">${wb.meta.year}</span>`
      : `Sejak ${mulai} <span style="color:var(--ink-soft)">${wb.meta.year}</span>`;
    return `<tr${st === "nonaktif" ? ' style="background:#faf7f2"' : ''}>
      <td>${start + i + 1}</td>
      <td><b>${emp.nama}</b><div style="font-size:11px;color:var(--ink-soft)">${emp.nik || '—'}</div></td>
      <td>${emp.jabatan || '—'}</td>
      <td><span class="pill pill--muted">${emp.ptkp}</span></td>
      <td>${emp.grossUp ? '<span class="pill pill--teal">Yes</span>' : '<span class="pill pill--muted">No</span>'}</td>
      <td style="font-size:12px">${masa}</td>
      <td>${stPill}</td>
      <td><div class="row-actions" style="justify-content:flex-end">
        <button class="btn btn--sm btn--ghost" data-edit="${emp.id}" title="Edit data">${UI.icon('edit')}</button>
        <button class="btn btn--sm btn--ghost" data-status="${emp.id}" title="${st === 'aktif' ? 'Tandai nonaktif' : 'Aktifkan kembali'}">${UI.icon(st === 'aktif' ? 'logout' : 'reset')}</button>
        <button class="btn btn--sm btn--ghost btn--danger" data-del="${emp.id}" title="Hapus">${UI.icon('trash')}</button>
      </div></td>
    </tr>`;
  }).join("");

  // pager
  if (PAGE_SIZE === "all" || pages <= 1) {
    document.getElementById("pager").innerHTML = "";
  } else {
    let btns = "";
    for (let p = 1; p <= pages; p++)
      btns += `<button class="pager__btn ${p === PAGE ? 'active' : ''}" data-p="${p}">${p}</button>`;
    document.getElementById("pager").innerHTML =
      `<button class="pager__btn" data-p="${Math.max(1, PAGE - 1)}" ${PAGE === 1 ? 'disabled' : ''}>‹</button>
       ${btns}
       <button class="pager__btn" data-p="${Math.min(pages, PAGE + 1)}" ${PAGE === pages ? 'disabled' : ''}>›</button>`;
    document.querySelectorAll(".pager__btn[data-p]").forEach(b =>
      b.onclick = () => { PAGE = +b.dataset.p; render(); });
  }

  tbody.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => openForm(b.dataset.edit));
  tbody.querySelectorAll("[data-status]").forEach(b => b.onclick = () => toggleStatus(b.dataset.status));
  tbody.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
    const emp = DB.load().employees.find(e => e.id === b.dataset.del);
    if (confirm(`Hapus permanen pegawai "${emp.nama}"? Data ini akan hilang dari rekap tahunan juga.\n\nUntuk pegawai yang berhenti kerja, gunakan tombol "Nonaktif" agar tetap masuk rekap.`)) {
      DB.removeEmployee(b.dataset.del); UI.toast("Pegawai dihapus"); render();
    }
  });
}

function toggleStatus(id) {
  const emp = DB.load().employees.find(e => e.id === id);
  const st = emp.status || "aktif";
  if (st === "aktif") {
    // ask for last working month
    const opts = REF.months.map((m, i) =>
      `<option value="${i + 1}" ${(i + 1) === (emp.bulanAkhir || 12) ? "selected" : ""}>${m.label}</option>`).join("");
    const body = `
      <p style="font-size:13px;color:var(--ink-soft);margin-bottom:16px">
        Tandai <b>${emp.nama}</b> sebagai sudah tidak bekerja. Penghasilan setelah bulan terakhir
        tidak lagi dihitung, namun pegawai tetap muncul di <b>Perhitungan Tahunan</b> untuk rekonsiliasi.</p>
      <div class="field"><label>Bulan Terakhir Bekerja (${DB.load().meta.year})</label>
        <select id="f_last">${opts}</select></div>`;
    const m = UI.modal({ title: "Nonaktifkan Pegawai", body,
      footer: `<button class="btn" id="c">Batal</button><button class="btn btn--primary" id="ok">Simpan</button>` });
    m.el.querySelector("#c").onclick = m.close;
    m.el.querySelector("#ok").onclick = () => {
      const last = +m.el.querySelector("#f_last").value || 12;
      DB.setStatus(id, "nonaktif", last);
      DB.updateEmployee(id, { tglKeluar: REF.months[last - 1].label });
      m.close(); UI.toast(`${emp.nama} ditandai nonaktif`); render();
    };
  } else {
    if (confirm(`Aktifkan kembali "${emp.nama}"? Penghasilannya bisa diinput lagi hingga Desember.`)) {
      DB.setStatus(id, "aktif");
      UI.toast(`${emp.nama} diaktifkan kembali`); render();
    }
  }
}

function openForm(id) {
  const wb = DB.load();
  const emp = id ? wb.employees.find(e => e.id === id) : null;
  const inc = emp ? DB.incomeFor("JAN", emp) : {};
  const opt = (list, cur) => list.map(v => `<option ${v === cur ? "selected" : ""}>${v}</option>`).join("");
  const monthOpt = cur => REF.months.map((m, i) =>
    `<option value="${i + 1}" ${(i + 1) === cur ? "selected" : ""}>${m.label}</option>`).join("");
  const objOpt = REF.objCodes.map(o =>
    `<option value="${o.kode}" ${emp && emp.kodeObjek === o.kode ? "selected" : ""}>${o.kode} — ${o.uraian}</option>`).join("");
  const st = emp?.status || "aktif";

  const body = `
    <div class="sec-label">Identitas</div>
    <div class="grid-2">
      <div class="field"><label>Nama Lengkap</label><input id="f_nama" value="${emp?.nama || ''}"></div>
      <div class="field"><label>Jabatan</label><input id="f_jabatan" value="${emp?.jabatan || ''}"></div>
    </div>
    <div class="grid-2">
      <div class="field"><label>NIK (16 digit)</label><input id="f_nik" class="num" value="${emp?.nik || ''}"></div>
      <div class="field"><label>Jenis Kelamin</label><select id="f_jk">${opt(["LAKI-LAKI", "PEREMPUAN"], emp?.jk)}</select></div>
    </div>
    <div class="grid-2">
      <div class="field"><label>Status PTKP</label><select id="f_ptkp">${opt(REF.ptkpList, emp?.ptkp || "TK/0")}</select></div>
      <div class="field"><label>Gross Up Tunjangan PPh</label><select id="f_gross">${opt(["No", "Yes"], emp?.grossUp ? "Yes" : "No")}</select></div>
    </div>
    <div class="field"><label>Kode Objek Pajak</label><select id="f_obj">${objOpt}</select></div>
    <div class="grid-2">
      <div class="field"><label>Alamat</label><input id="f_alamat" value="${emp?.alamat || 'GORONTALO'}"></div>
      <div class="field"><label>Karyawan Asing</label><select id="f_asing">${opt(["N", "Y"], emp?.asing || "N")}</select></div>
    </div>

    <div class="sec-label">Status Kepegawaian</div>
    <div class="grid-2">
      <div class="field"><label>Status</label>
        <select id="f_status">
          <option value="aktif" ${st === 'aktif' ? 'selected' : ''}>Aktif — masih bekerja</option>
          <option value="nonaktif" ${st === 'nonaktif' ? 'selected' : ''}>Nonaktif — sudah tidak bekerja</option>
        </select>
      </div>
      <div class="field"><label>Bulan Mulai Bekerja</label><select id="f_mulai">${monthOpt(emp?.bulanMulai || 1)}</select></div>
    </div>
    <div class="field" id="lastWrap" style="${st === 'nonaktif' ? '' : 'display:none'}">
      <label>Bulan Terakhir Bekerja</label><select id="f_akhir">${monthOpt(emp?.bulanAkhir || 12)}</select>
      <div class="hint">Hanya berlaku untuk pegawai nonaktif. Penghasilan setelah bulan ini tidak dihitung.</div>
    </div>

    <div class="sec-label">Penghasilan Bulanan (default tiap masa)</div>
    <div class="grid-2">
      <div class="field input-blue"><label>Gaji Pokok</label><input id="f_gaji" class="num" value="${inc.gaji || 0}"></div>
      <div class="field input-blue"><label>Tunjangan Lainnya / Lembur</label><input id="f_tunj" class="num" value="${inc.tunjLain || 0}"></div>
    </div>`;
  const footer = `<button class="btn" id="cancel">Batal</button><button class="btn btn--primary" id="save">${UI.icon("save")} Simpan</button>`;
  const m = UI.modal({ title: id ? "Edit Pegawai" : "Tambah Pegawai", body, footer });

  // toggle last-month field with status
  const stSel = m.el.querySelector("#f_status");
  const lastWrap = m.el.querySelector("#lastWrap");
  stSel.onchange = () => { lastWrap.style.display = stSel.value === "nonaktif" ? "" : "none"; };

  m.el.querySelector("#cancel").onclick = m.close;
  m.el.querySelector("#save").onclick = () => {
    const g = i => m.el.querySelector("#" + i).value;
    const status = g("f_status");
    const mulai = +g("f_mulai") || 1;
    const akhir = status === "nonaktif" ? (+g("f_akhir") || 12) : 12;
    const data = {
      nama: g("f_nama").trim(), jabatan: g("f_jabatan").trim(), nik: g("f_nik").trim(),
      jk: g("f_jk"), ptkp: g("f_ptkp"), grossUp: g("f_gross") === "Yes",
      kodeObjek: g("f_obj"), alamat: g("f_alamat").trim(), asing: g("f_asing"),
      negara: "Indonesia", bulanMulai: mulai, bulanAkhir: akhir,
      status, tglKeluar: status === "nonaktif" ? REF.months[akhir - 1].label : "", zakat: emp?.zakat || 0
    };
    if (!data.nama) { alert("Nama wajib diisi."); return; }
    const gaji = +g("f_gaji") || 0, tunj = +g("f_tunj") || 0;
    if (id) {
      DB.updateEmployee(id, data);
      const cur = { ...DB.incomeFor("JAN", { id }), gaji, tunjLain: tunj, grossUp: data.grossUp };
      DB.setIncome("JAN", id, cur);
      UI.toast("Pegawai diperbarui");
    } else {
      data._gaji = gaji; data._tunjLain = tunj;
      DB.addEmployee(data);
      UI.toast("Pegawai ditambahkan");
    }
    m.close(); render();
  };
}

function doExport(fmt) {
  const yr = DB.activeYear();
  const rows = filtered();
  const head = ["No", "Nama", "Jabatan", "NIK", "PTKP", "GrossUp", "Status", "BulanMulai", "BulanAkhir", "Gaji", "Tunjangan"];
  const data = rows.map((emp, i) => {
    const inc = DB.incomeFor("JAN", emp);
    return [i + 1, emp.nama, emp.jabatan, emp.nik, emp.ptkp, emp.grossUp ? "Yes" : "No",
      (emp.status || "aktif"), REF.months[(emp.bulanMulai || 1) - 1].label,
      REF.months[(emp.bulanAkhir || 12) - 1].label, inc.gaji || 0, inc.tunjLain || 0];
  });
  Exporter.download(fmt, {
    filename: `DataPegawai_${yr}`, sheetName: `Data Pegawai ${yr}`, head, rows: data,
    numericCols: [9, 10]
  });
  UI.toast(fmt === "xlsx" ? "Excel diekspor" : "CSV diekspor");
}
