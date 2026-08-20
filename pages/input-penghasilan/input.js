Auth.guard();
let MONTH = "JAN";

(async function () {
  await DB.ensureSeed(); await DB.ensureTer();
  UI.mount("input", "Data Induk / <b>Input Penghasilan</b>");

  const sel = document.getElementById("monthSel");
  sel.innerHTML = REF.months.map(m => `<option value="${m.key}">${m.label}</option>`).join("");
  sel.value = MONTH;
  sel.onchange = () => { MONTH = sel.value; render(); };

  document.getElementById("addBtn").innerHTML = UI.icon("plus") + " Tambah Pegawai";
  document.getElementById("exportBtn").innerHTML = UI.icon("download") + " Ekspor CSV";
  document.getElementById("importBtn").innerHTML = UI.icon("upload") + " Impor CSV";
  document.getElementById("addBtn").onclick = () => openEmployeeForm();
  document.getElementById("exportBtn").onclick = exportCsv;
  document.getElementById("importBtn").onclick = importCsv;
  document.getElementById("search").oninput = render;

  render();
})();

function render() {
  const wb = DB.load();
  const q = (document.getElementById("search").value || "").toLowerCase();
  const tbody = document.querySelector("#grid tbody");
  document.getElementById("gridTitle").textContent =
    "Daftar Pegawai — " + REF.months.find(m => m.key === MONTH).label;

  let emps = wb.employees;
  if (q) emps = emps.filter(e => (e.nama + " " + e.jabatan).toLowerCase().includes(q));

  if (!emps.length) {
    tbody.innerHTML = `<tr><td colspan="14"><div class="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2h-1"/></svg>
      <div>Belum ada pegawai. Klik <b>Tambah Pegawai</b> untuk memulai.</div></div></td></tr>`;
    return;
  }

  let totDpp = 0, totPph = 0;
  tbody.innerHTML = emps.map((emp, i) => {
    const inc = DB.incomeFor(MONTH, emp);
    const r = Engine.monthly({ ...emp, ...inc }, inc.tantiem || 0);
    totDpp += r.dpp; totPph += r.pph;
    const cell = (field, val, cls) =>
      `<td class="num"><input data-id="${emp.id}" data-f="${field}" value="${val || 0}"
        class="cell-in ${cls}" style="width:110px;text-align:right;font-family:var(--mono);
        border:1px solid transparent;border-radius:6px;padding:4px 7px;background:${cls === 'input-green' ? '#edf6ef' : '#eff5fb'}"></td>`;
    return `<tr>
      <td>${i + 1}</td>
      <td><b>${emp.nama}</b><div style="font-size:11px;color:var(--ink-soft)">${emp.nik || '—'}</div></td>
      <td>${emp.jabatan || '—'}</td>
      <td><span class="pill pill--muted">${emp.ptkp}</span></td>
      <td>${emp.grossUp ? '<span class="pill pill--teal">Yes</span>' : '<span class="pill pill--muted">No</span>'}</td>
      ${cell('gaji', inc.gaji, 'input-blue')}
      ${cell('tunjLain', inc.tunjLain, 'input-blue')}
      ${cell('honor', inc.honor, 'input-blue')}
      ${cell('natura', inc.natura, 'input-green')}
      ${cell('tantiem', inc.tantiem, 'input-green')}
      <td class="num">${fmt.rpPlain(r.dpp)}</td>
      <td><span class="pill pill--clay">${r.category.replace('TER ', '')} · ${fmt.pct(r.rate)}</span></td>
      <td class="num"><b>${fmt.rpPlain(r.pph)}</b></td>
      <td><div class="row-actions">
        <button class="btn btn--sm btn--ghost" data-edit="${emp.id}" title="Edit">${UI.icon('edit')}</button>
        <button class="btn btn--sm btn--ghost btn--danger" data-del="${emp.id}" title="Hapus">${UI.icon('trash')}</button>
      </div></td>
    </tr>`;
  }).join("") +
    `<tr class="tfoot-total"><td colspan="10" style="text-align:right">Total ${REF.months.find(m => m.key === MONTH).label}</td>
      <td class="num">${fmt.rpPlain(totDpp)}</td><td></td><td class="num">${fmt.rpPlain(totPph)}</td><td></td></tr>`;

  // wire inline editing
  tbody.querySelectorAll(".cell-in").forEach(inp => {
    inp.onfocus = () => { inp.style.borderColor = "var(--brand)"; inp.select(); };
    inp.onblur = () => {
      inp.style.borderColor = "transparent";
      const id = inp.dataset.id, f = inp.dataset.f, v = Math.max(0, Number(inp.value) || 0);
      const emp = DB.load().employees.find(e => e.id === id);
      const inc = { ...DB.incomeFor(MONTH, emp) };
      inc[f] = v;
      DB.setIncome(MONTH, id, inc);
      render();
    };
    inp.onkeydown = e => { if (e.key === "Enter") inp.blur(); };
  });
  tbody.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => openEmployeeForm(b.dataset.edit));
  tbody.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
    const emp = DB.load().employees.find(e => e.id === b.dataset.del);
    if (confirm(`Hapus pegawai "${emp.nama}"? Semua data penghasilannya ikut terhapus.`)) {
      DB.removeEmployee(b.dataset.del); UI.toast("Pegawai dihapus"); render();
    }
  });
}

function openEmployeeForm(id) {
  const wb = DB.load();
  const emp = id ? wb.employees.find(e => e.id === id) : null;
  const inc = emp ? DB.incomeFor("JAN", emp) : {};
  const opt = (list, cur) => list.map(v => `<option ${v === cur ? "selected" : ""}>${v}</option>`).join("");
  const objOpt = REF.objCodes.map(o => `<option value="${o.kode}" ${emp && emp.kodeObjek === o.kode ? "selected" : ""}>${o.kode} — ${o.uraian}</option>`).join("");

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
    <div class="grid-2">
      <div class="field"><label>Bulan Mulai (1–12)</label><input id="f_mulai" type="number" min="1" max="12" value="${emp?.bulanMulai || 1}"></div>
      <div class="field"><label>Bulan Terakhir (1–12)</label><input id="f_akhir" type="number" min="1" max="12" value="${emp?.bulanAkhir || 12}"></div>
    </div>
    <div class="sec-label">Penghasilan Bulanan (dipakai sebagai default tiap masa)</div>
    <div class="grid-2">
      <div class="field input-blue"><label>Gaji Pokok</label><input id="f_gaji" class="num" value="${inc.gaji || 0}"></div>
      <div class="field input-blue"><label>Tunjangan Lainnya / Lembur</label><input id="f_tunj" class="num" value="${inc.tunjLain || 0}"></div>
    </div>`;
  const footer = `<button class="btn" id="cancel">Batal</button><button class="btn btn--primary" id="save">${UI.icon("save")} Simpan</button>`;
  const m = UI.modal({ title: id ? "Edit Pegawai" : "Tambah Pegawai", body, footer });
  m.el.querySelector("#cancel").onclick = m.close;
  m.el.querySelector("#save").onclick = () => {
    const g = i => m.el.querySelector("#" + i).value;
    const data = {
      nama: g("f_nama").trim(), jabatan: g("f_jabatan").trim(), nik: g("f_nik").trim(),
      jk: g("f_jk"), ptkp: g("f_ptkp"), grossUp: g("f_gross") === "Yes",
      kodeObjek: g("f_obj"), alamat: g("f_alamat").trim(), asing: g("f_asing"),
      negara: "Indonesia", bulanMulai: +g("f_mulai") || 1, bulanAkhir: +g("f_akhir") || 12,
      zakat: 0
    };
    if (!data.nama) { alert("Nama wajib diisi."); return; }
    const gaji = +g("f_gaji") || 0, tunj = +g("f_tunj") || 0;
    if (id) {
      DB.updateEmployee(id, data);
      // update recurring income defaults across months already stored? update JAN
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

/* ---------- CSV ---------- */
function exportCsv() {
  const wb = DB.load();
  const head = ["Nama", "Jabatan", "NIK", "PTKP", "GrossUp", "Gaji", "TunjLainnya", "Honorarium", "Natura", "Tantiem", "DPP", "TER%", "PPh21"];
  const rows = wb.employees.map(emp => {
    const inc = DB.incomeFor(MONTH, emp);
    const r = Engine.monthly({ ...emp, ...inc }, inc.tantiem || 0);
    return [emp.nama, emp.jabatan, emp.nik, emp.ptkp, emp.grossUp ? "Yes" : "No",
      inc.gaji, inc.tunjLain, inc.honor, inc.natura, inc.tantiem || 0, r.dpp, (r.rate * 100), r.pph];
  });
  const csv = [head, ...rows].map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `PPh21_${MONTH}_${wb.meta.year}.csv`;
  a.click();
  UI.toast("CSV diekspor");
}

function importCsv() {
  const body = `<p style="font-size:13px;color:var(--ink-soft);margin-bottom:14px">
    Unggah CSV dengan kolom: <b>Nama, Jabatan, NIK, PTKP, GrossUp, Gaji, TunjLainnya, Honorarium, Natura, Tantiem</b>.
    Data akan ditambahkan untuk masa <b>${REF.months.find(m => m.key === MONTH).label}</b>.</p>
    <input type="file" id="csvFile" accept=".csv" style="width:100%;padding:10px;border:1px dashed var(--line-strong);border-radius:8px">`;
  const m = UI.modal({ title: "Impor CSV", body, footer: `<button class="btn" id="c">Batal</button>` });
  m.el.querySelector("#c").onclick = m.close;
  m.el.querySelector("#csvFile").onchange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const lines = reader.result.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
        const head = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
        const idx = n => head.indexOf(n);
        let added = 0;
        lines.slice(1).forEach(line => {
          const c = parseCsvLine(line);
          const nama = c[idx("nama")]; if (!nama) return;
          const emp = {
            nama, jabatan: c[idx("jabatan")] || "", nik: c[idx("nik")] || "",
            jk: "LAKI-LAKI", ptkp: (c[idx("ptkp")] || "TK/0").toUpperCase(),
            grossUp: (c[idx("grossup")] || "No").toLowerCase() === "yes",
            kodeObjek: "21-100-01", alamat: "GORONTALO", asing: "N", negara: "Indonesia",
            bulanMulai: 1, bulanAkhir: 12, zakat: 0,
            _gaji: +c[idx("gaji")] || 0, _tunjLain: +c[idx("tunjlainnya")] || 0
          };
          DB.addEmployee(emp);
          const id = DB.load().employees.slice(-1)[0].id;
          DB.setIncome(MONTH, id, {
            gaji: +c[idx("gaji")] || 0, tunjLain: +c[idx("tunjlainnya")] || 0,
            honor: +c[idx("honorarium")] || 0, natura: +c[idx("natura")] || 0,
            tantiem: +c[idx("tantiem")] || 0, zakat: 0, grossUp: emp.grossUp, premiOn: true
          });
          added++;
        });
        m.close(); UI.toast(added + " pegawai diimpor"); render();
      } catch (err) { alert("Gagal membaca CSV: " + err.message); }
    };
    reader.readAsText(file);
  };
}
function parseCsvLine(line) {
  const out = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else { if (ch === '"') q = true; else if (ch === ",") { out.push(cur); cur = ""; } else cur += ch; }
  }
  out.push(cur); return out;
}
