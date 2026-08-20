Auth.guard();
let MONTH = "JAN";
let STATUS = "all";
let PAGE_SIZE = 25;
let PAGE = 1;

(async function () {
  await DB.ensureSeed(); await DB.ensureTer();
  UI.mount("input", "Data Induk / <b>Input Penghasilan</b>");

  const sel = document.getElementById("monthSel");
  sel.innerHTML = REF.months.map(m => `<option value="${m.key}">${m.label}</option>`).join("");
  sel.value = MONTH;
  sel.onchange = () => { MONTH = sel.value; PAGE = 1; render(); };

  document.getElementById("exportBtn").innerHTML = UI.icon("download") + " Ekspor CSV";
  document.getElementById("exportBtn").onclick = exportCsv;
  document.getElementById("search").oninput = () => { PAGE = 1; render(); };

  document.querySelectorAll("#statusFilter button").forEach(b => {
    b.onclick = () => {
      document.querySelectorAll("#statusFilter button").forEach(x => x.classList.remove("active"));
      b.classList.add("active"); STATUS = b.dataset.s; PAGE = 1; render();
    };
  });
  const ps = document.getElementById("pageSize");
  ps.onchange = () => { PAGE_SIZE = +ps.value; PAGE = 1; render(); };

  render();
})();

function filtered() {
  const wb = DB.load();
  const q = (document.getElementById("search").value || "").toLowerCase();
  return wb.employees.filter(e => {
    if (STATUS !== "all" && (e.status || "aktif") !== STATUS) return false;
    if (q && !((e.nama + " " + (e.jabatan || "")).toLowerCase().includes(q))) return false;
    return true;
  });
}

function render() {
  const wb = DB.load();
  document.getElementById("gridTitle").textContent =
    "Daftar Pegawai — " + REF.months.find(m => m.key === MONTH).label;

  const rows = filtered();
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (PAGE > pages) PAGE = pages;
  const start = (PAGE - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  const tbody = document.querySelector("#grid tbody");
  if (!total) {
    tbody.innerHTML = `<tr><td colspan="14"><div class="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2h-1"/></svg>
      <div>Tidak ada pegawai yang cocok. Tambah pegawai di menu <b>Data Pegawai</b>.</div></div></td></tr>`;
    document.getElementById("pager").innerHTML = "";
    return;
  }

  // totals across the FULL filtered set (not just current page)
  let totDpp = 0, totPph = 0;
  rows.forEach(emp => {
    const inc = DB.incomeFor(MONTH, emp);
    const r = Engine.monthly({ ...emp, ...inc }, inc.tantiem || 0);
    totDpp += r.dpp; totPph += r.pph;
  });

  tbody.innerHTML = pageRows.map((emp, i) => {
    const inc = DB.incomeFor(MONTH, emp);
    const r = Engine.monthly({ ...emp, ...inc }, inc.tantiem || 0);
    const locked = !DB.isPayMonth(MONTH, emp);
    const nonaktif = (emp.status === "nonaktif");
    const totalTunj = (inc.tunjLain || 0) + (inc.lembur || 0);
    const statusTag = nonaktif
      ? `<div style="font-size:10px;color:var(--accent);font-weight:600;margin-top:2px">NONAKTIF s.d. ${REF.months[(emp.bulanAkhir||12)-1].label}</div>` : "";
    return `<tr${locked ? ' style="background:#faf7f2"' : ''}>
      <td>${start + i + 1}</td>
      <td><b>${emp.nama}</b><div style="font-size:11px;color:var(--ink-soft)">${emp.nik || '—'}</div>${statusTag}</td>
      <td><span class="pill pill--muted">${emp.ptkp}</span></td>
      <td>${emp.grossUp ? '<span class="pill pill--teal">Yes</span>' : '<span class="pill pill--muted">No</span>'}</td>
      <td class="num">${fmt.rpPlain(inc.gaji || 0)}</td>
      <td class="num">${fmt.rpPlain(inc.tunjLain || 0)}</td>
      <td class="num">${(inc.lembur ? fmt.rpPlain(inc.lembur) : '—')}</td>
      <td class="num"><b>${fmt.rpPlain(totalTunj)}</b></td>
      <td class="num">${(inc.honor ? fmt.rpPlain(inc.honor) : '—')}</td>
      <td class="num">${(inc.tantiem ? fmt.rpPlain(inc.tantiem) : '—')}</td>
      <td class="num">${fmt.rpPlain(r.dpp)}</td>
      <td><span class="pill pill--clay">${r.category.replace('TER ', '')} · ${fmt.pct(r.rate)}</span></td>
      <td class="num"><b>${fmt.rpPlain(r.pph)}</b></td>
      <td><div class="row-actions" style="justify-content:flex-end">
        ${locked
          ? `<span class="pill pill--muted" title="Terkunci — pegawai tidak aktif pada masa ini">${UI.icon('logout')} Terkunci</span>`
          : `<button class="btn btn--sm btn--primary" data-input="${emp.id}">${UI.icon('edit')} Input</button>`}
      </div></td>
    </tr>`;
  }).join("") +
    `<tr class="tfoot-total"><td colspan="10" style="text-align:right">Total ${REF.months.find(m => m.key === MONTH).label} (${total} pegawai)</td>
      <td class="num">${fmt.rpPlain(totDpp)}</td><td></td><td class="num">${fmt.rpPlain(totPph)}</td><td></td></tr>`;

  // pager
  if (pages <= 1) {
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

  tbody.querySelectorAll("[data-input]").forEach(b =>
    b.onclick = () => openIncomeModal(b.dataset.input));
}

/* ---------- Pop-up income editor ---------- */
function openIncomeModal(id) {
  const emp = DB.load().employees.find(e => e.id === id);
  const inc = { ...DB.incomeFor(MONTH, emp) };
  const monthLabel = REF.months.find(m => m.key === MONTH).label;

  const money = (lbl, fid, val, cls, hint) => `
    <div class="field ${cls || ''}"><label>${lbl}</label>
      <input id="${fid}" class="num" inputmode="numeric" value="${val || 0}">
      ${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;

  const body = `
    <div class="modal-emp">
      <div class="modal-emp__avatar">${emp.nama.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()}</div>
      <div>
        <div class="modal-emp__name">${emp.nama}</div>
        <div class="modal-emp__meta">${emp.jabatan || '—'} · <span class="pill pill--muted">${emp.ptkp}</span>
          ${emp.grossUp ? '<span class="pill pill--teal">Gross Up</span>' : ''}</div>
      </div>
      <div class="spacer"></div>
      <div class="modal-emp__month">${monthLabel} ${DB.load().meta.year}</div>
    </div>

    <div class="sec-label">Penghasilan Teratur</div>
    <div class="grid-2">
      ${money("Gaji Pokok", "f_gaji", inc.gaji, "input-blue")}
      ${money("Tunjangan", "f_tunj", inc.tunjLain, "input-blue")}
    </div>
    <div class="grid-2">
      ${money("Lembur &amp; Lain-lain", "f_lembur", inc.lembur, "input-blue", "Dijumlahkan ke tunjangan.")}
      ${money("Honorarium", "f_honor", inc.honor, "input-blue")}
    </div>

    <div class="sec-label">Penghasilan Tidak Teratur / Lain</div>
    <div class="grid-2">
      ${money("Natura Objek PPh 21", "f_natura", inc.natura, "input-green")}
      ${money("Bonus / THR / Tantiem", "f_tantiem", inc.tantiem, "input-green")}
    </div>

    <div class="calc-preview" id="preview"></div>`;

  const footer = `<button class="btn" id="cancel">Batal</button>
    <button class="btn btn--primary" id="save">${UI.icon("save")} Simpan</button>`;
  const m = UI.modal({ title: "Input Penghasilan", body, footer });

  const g = i => Math.max(0, Number(m.el.querySelector("#" + i).value) || 0);
  function refreshPreview() {
    const draft = {
      ...emp,
      gaji: g("f_gaji"), tunjLain: g("f_tunj"), lembur: g("f_lembur"),
      honor: g("f_honor"), natura: g("f_natura"),
      grossUp: emp.grossUp, premiOn: inc.premiOn !== false
    };
    const r = Engine.monthly(draft, g("f_tantiem"));
    const totalTunj = g("f_tunj") + g("f_lembur");
    m.el.querySelector("#preview").innerHTML = `
      <div class="result-line result-line--sub"><span>Total Tunjangan (tunjangan + lembur &amp; lain-lain)</span>
        <span class="money">${fmt.rp(totalTunj)}</span></div>
      <div class="result-line result-line--sub"><span>Penghasilan Bruto / DPP</span>
        <span class="money">${fmt.rp(r.dpp)}</span></div>
      <div class="result-line result-line--sub"><span>Tarif Efektif (TER ${r.category.replace('TER ','')})</span>
        <span class="money">${fmt.pct(r.rate)}</span></div>
      <div class="result-line result-line--total"><span>PPh Pasal 21 Bulan Ini</span>
        <span class="money">${fmt.rp(r.pph)}</span></div>`;
  }
  ["f_gaji","f_tunj","f_lembur","f_honor","f_natura","f_tantiem"].forEach(fid => {
    const el = m.el.querySelector("#" + fid);
    el.oninput = refreshPreview;
    el.onfocus = () => el.select();
  });
  refreshPreview();

  m.el.querySelector("#cancel").onclick = m.close;
  m.el.querySelector("#save").onclick = () => {
    const data = {
      gaji: g("f_gaji"), tunjLain: g("f_tunj"), lembur: g("f_lembur"),
      honor: g("f_honor"), natura: g("f_natura"), tantiem: g("f_tantiem"),
      zakat: inc.zakat || 0, grossUp: emp.grossUp, premiOn: inc.premiOn !== false
    };
    DB.setIncome(MONTH, id, data);
    m.close(); UI.toast("Penghasilan disimpan"); render();
  };
}

/* ---------- CSV ---------- */
function exportCsv() {
  const wb = DB.load();
  const rows = filtered();
  const head = ["Nama", "Jabatan", "NIK", "PTKP", "GrossUp", "Status", "Gaji", "Tunjangan",
    "LemburLainLain", "TotalTunjangan", "Honorarium", "Natura", "Tantiem", "DPP", "TER%", "PPh21"];
  const data = rows.map(emp => {
    const inc = DB.incomeFor(MONTH, emp);
    const r = Engine.monthly({ ...emp, ...inc }, inc.tantiem || 0);
    return [emp.nama, emp.jabatan, emp.nik, emp.ptkp, emp.grossUp ? "Yes" : "No",
      (emp.status || "aktif"), inc.gaji || 0, inc.tunjLain || 0, inc.lembur || 0,
      (inc.tunjLain || 0) + (inc.lembur || 0), inc.honor || 0, inc.natura || 0,
      inc.tantiem || 0, r.dpp, (r.rate * 100), r.pph];
  });
  const csv = [head, ...data].map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `PPh21_${MONTH}_${wb.meta.year}.csv`;
  a.click();
  UI.toast("CSV diekspor");
}
