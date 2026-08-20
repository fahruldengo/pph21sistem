/* ============================================================
   export.js — shared CSV / XLSX export helpers.
   Exporter.download(format, {filename, sheetName, head, rows})
   - format: "csv" | "xlsx"
   - head: array of column titles
   - rows: array of arrays (cell values)
   XLSX uses the locally-bundled SheetJS (assets/vendor/xlsx.full.min.js).
   ============================================================ */
window.Exporter = (function () {

  function toCsv(head, rows) {
    const esc = c => `"${String(c ?? "").replace(/"/g, '""')}"`;
    return [head, ...rows].map(r => r.map(esc).join(",")).join("\n");
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function exportCsv({ filename, head, rows }) {
    const csv = toCsv(head, rows);
    downloadBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), filename + ".csv");
  }

  function exportXlsx({ filename, sheetName, head, rows, numericCols }) {
    if (typeof XLSX === "undefined") {
      alert("Pustaka XLSX belum termuat. Coba muat ulang halaman.");
      return;
    }
    const aoa = [head, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // column widths from content length
    ws["!cols"] = head.map((h, c) => {
      let w = String(h).length;
      rows.forEach(r => { w = Math.max(w, String(r[c] ?? "").length); });
      return { wch: Math.min(Math.max(w + 2, 8), 40) };
    });

    // number format for numeric columns (thousands separator)
    if (numericCols && numericCols.length) {
      const range = XLSX.utils.decode_range(ws["!ref"]);
      for (let R = 1; R <= range.e.r; R++) {
        numericCols.forEach(C => {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[addr];
          if (cell && typeof cell.v === "number") { cell.t = "n"; cell.z = "#,##0"; }
        });
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, (sheetName || "Sheet1").slice(0, 31));
    XLSX.writeFile(wb, filename + ".xlsx");
  }

  function download(format, opts) {
    if (format === "xlsx") exportXlsx(opts);
    else exportCsv(opts);
  }

  return { download, exportCsv, exportXlsx, toCsv };
})();
