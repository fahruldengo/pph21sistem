/* ============================================================
   ui.js — shared shell: sidebar navigation, topbar, toasts,
   icons, and modal helpers. Every page calls UI.mount(active).
   ============================================================ */
window.UI = (function () {

  const ICONS = {
    dashboard: '<path d="M3 3h7v7H3zM14 3h7v4h-7zM14 11h7v10h-7zM3 14h7v7H3z"/>',
    pemotong: '<path d="M3 21V7l9-4 9 4v14M9 21v-6h6v6"/>',
    elemen: '<path d="M4 4h16v4H4zM4 12h10v8H4zM17 12h3v8h-3z"/>',
    pegawai: '<circle cx="9" cy="7" r="3"/><path d="M2 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/><path d="M16 3.5a3 3 0 0 1 0 5.8M22 21v-1a5 5 0 0 0-3-4.5"/>',
    input: '<path d="M12 5v14M5 12h14"/>',
    calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M8 18h8"/>',
    rekap: '<path d="M3 3v18h18M8 14l3-3 3 2 5-6"/>',
    tahunan: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    summary: '<path d="M4 5h16M4 12h16M4 19h10"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
    print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>'
  };
  const icon = (n, cls = "") =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="${cls}">${ICONS[n] || ""}</svg>`;

  const NAV = [
    { group: "Ringkasan" },
    { id: "dashboard", label: "Dashboard", icon: "dashboard", href: "dashboard/index.html" },
    { group: "Data Induk" },
    { id: "pemotong", label: "Data Pemotong", icon: "pemotong", href: "pemotong/index.html" },
    { id: "elemen", label: "Elemen PPh 21", icon: "elemen", href: "elemen/index.html" },
    { id: "pegawai", label: "Data Pegawai", icon: "pegawai", href: "data-pegawai/index.html" },
    { id: "input", label: "Input Penghasilan", icon: "input", href: "input-penghasilan/index.html" },
    { group: "Perhitungan" },
    { id: "calc", label: "Kalkulator PPh 21", icon: "calc", href: "kalkulator/index.html" },
    { id: "rekap", label: "Rekap Bulanan", icon: "rekap", href: "rekap-bulanan/index.html" },
    { id: "tahunan", label: "Perhitungan Tahunan", icon: "tahunan", href: "tahunan/index.html" },
    { id: "summary", label: "Summary Setahun", icon: "summary", href: "summary/index.html" }
  ];

  function root() { return "../../"; }

  function mount(active, crumbs) {
    const u = Auth.current() || { name: "Pengguna" };
    const initials = u.name.split(" ").map(x => x[0]).slice(0, 2).join("").toUpperCase();

    const navHtml = NAV.map(item => {
      if (item.group) return `<div class="nav__group">${item.group}</div>`;
      const cls = item.id === active ? "active" : "";
      return `<a href="${root()}pages/${item.href}" class="${cls}">${icon(item.icon)}<span>${item.label}</span></a>`;
    }).join("");

    const shell = document.createElement("div");
    shell.innerHTML = `
      <div class="backdrop-nav" id="navBackdrop"></div>
      <aside class="sidebar" id="sidebar">
        <div class="sidebar__brand">
          <div class="sidebar__mark">P21</div>
          <div>
            <div class="sidebar__title">PPh 21 System</div>
            <div class="sidebar__sub">CV. VIDYA AMALIAH</div>
          </div>
        </div>
        <nav class="nav">${navHtml}</nav>
        <div class="sidebar__foot">
          Masuk sebagai <b>${u.name}</b><br>
          <a href="#" id="logoutBtn" style="color:#9fc4bd;display:inline-flex;gap:6px;align-items:center;margin-top:8px">
            ${icon("logout")} Keluar
          </a>
        </div>
      </aside>`;
    document.body.prepend(shell);

    // topbar
    const main = document.querySelector(".main");
    const bar = document.createElement("div");
    bar.className = "topbar";
    const years = DB.availableYears();
    const yOpts = years.map(y => `<option value="${y}" ${y === DB.activeYear() ? "selected" : ""}>Tahun Pajak ${y}</option>`).join("");
    bar.innerHTML = `
      <button class="hamburger" id="hamburger">${icon("menu")}</button>
      <div class="topbar__crumbs">${crumbs || ""}</div>
      <div class="topbar__spacer"></div>
      <div class="year-picker">
        <select id="yearSel" class="chip-year-sel">${yOpts}<option value="__add">+ Tambah tahun…</option></select>
      </div>
      <div class="user-badge"><div class="user-badge__av">${initials}</div><span>${u.name}</span></div>`;
    main.prepend(bar);

    // year switching
    const ySel = document.getElementById("yearSel");
    ySel.onchange = () => {
      if (ySel.value === "__add") {
        const now = new Date().getFullYear();
        const input = prompt("Tambah tahun pajak baru (mis. " + (Math.max(...years) + 1) + "):", String(Math.max(...years) + 1));
        const y = parseInt(input, 10);
        if (!y || y < 2000 || y > 2100) { ySel.value = String(DB.activeYear()); return; }
        DB.setActiveYear(y);
        location.reload();
      } else {
        DB.setActiveYear(+ySel.value);
        location.reload();
      }
    };

    // interactions
    document.getElementById("logoutBtn").onclick = (e) => {
      e.preventDefault(); Auth.logout(); location.replace(root() + "auth/login.html");
    };
    const sb = document.getElementById("sidebar"), bd = document.getElementById("navBackdrop");
    document.getElementById("hamburger").onclick = () => { sb.classList.toggle("show"); bd.classList.toggle("show"); };
    bd.onclick = () => { sb.classList.remove("show"); bd.classList.remove("show"); };
  }

  /* ---- toast ---- */
  function toast(msg) {
    let wrap = document.querySelector(".toast-wrap");
    if (!wrap) { wrap = document.createElement("div"); wrap.className = "toast-wrap"; document.body.appendChild(wrap); }
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = icon("check") + `<span>${msg}</span>`;
    wrap.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transform = "translateY(6px)"; }, 2200);
    setTimeout(() => t.remove(), 2600);
  }

  /* ---- modal ---- */
  function modal({ title, body, footer, wide }) {
    const bd = document.createElement("div");
    bd.className = "modal-backdrop open";
    bd.innerHTML = `<div class="modal" style="${wide ? 'max-width:920px' : ''}">
      <div class="modal__head"><h3>${title}</h3><button class="x-close">&times;</button></div>
      <div class="modal__body">${body}</div>
      ${footer ? `<div class="modal__foot">${footer}</div>` : ""}</div>`;
    document.body.appendChild(bd);
    const close = () => bd.remove();
    bd.querySelector(".x-close").onclick = close;
    bd.onclick = e => { if (e.target === bd) close(); };
    return { el: bd, close };
  }

  return { mount, toast, modal, icon, NAV };
})();
