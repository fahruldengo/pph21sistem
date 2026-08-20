/* ============================================================
   engine.js — PPh Pasal 21 calculation engine.
   Faithful port of the workbook's formulas:
     • Monthly = TER method (PP 58/2023)
     • December = annualised reconciliation (Article 17)
   ============================================================ */
window.Engine = (function () {

  const R = window.REF;

  /* Round helpers matching Excel ROUND / ROUNDDOWN */
  const roundDown = (v, d = 0) => { const f = Math.pow(10, d); return Math.floor(v / f) * f; };
  const round = (v) => Math.round(v);

  /* Look up the TER rate for a bruto amount in a category (SUMPRODUCT logic). */
  function terRate(category, bruto) {
    const table = (window.TER_BRACKETS || {})[category];
    if (!table) return 0;
    for (const [lo, hi, rate] of table) {
      const upperOk = (hi === "" || hi == null) ? true : bruto <= hi;
      if (bruto > lo && upperOk) return rate;
    }
    // bruto exactly 0 falls in first bracket (lo=0, bruto>lo false) -> rate 0
    if (bruto <= (table[0]?.[1] ?? 0)) return table[0]?.[2] ?? 0;
    return 0;
  }

  /* Employer-side additions to gross that are OBJECT of PPh 21
     (JKK + JKM), plus BPJS Kesehatan employer 4% capped. */
  function employerPremi(gaji) {
    const jkk = gaji * R.elemen.jkk;
    const jkm = gaji * R.elemen.jkm;
    const kes = Math.min(gaji * R.elemen.bpjsKesEmployer,
                         R.elemen.bpjsKesCap * R.elemen.bpjsKesEmployer); // max 480.000
    return { jkk, jkm, kes, total: jkk + jkm + kes };
  }

  /* Employee-side deductible: iuran pensiun (JP) + JHT, JP capped. */
  function pengurang(gaji) {
    const jp = Math.min(gaji * R.elemen.jpEmployee, R.elemen.jpCapAmount); // JP capped 100.423
    const jht = gaji * R.elemen.jhtEmployee;
    return { jp, jht, total: jp + jht };
  }

  /* ---- MONTHLY calculation (Jan–Nov) using TER ----
     emp: {gaji, tunjLain, honor, natura, ptkp, grossUp, premiOn}
     tantiem: irregular income (bonus/THR) for the month. */
  function monthly(emp, tantiem = 0) {
    const gaji = num(emp.gaji);
    const tunjLain = num(emp.tunjLain);
    const honor = num(emp.honor);
    const natura = num(emp.natura);
    const premi = emp.premiOn === false ? { total: 0 } : employerPremi(gaji);

    const category = R.ptkpTer[emp.ptkp] || "TER C";

    // Gross-up: tunjangan PPh = the tax itself. Solve iteratively so
    // that adding the tax to gross reproduces the workbook's S=IF(grossUp,AF).
    const compute = (tpph) => {
      const teratur = gaji + tpph + tunjLain + honor + premi.total + natura;
      const dpp = roundDown(teratur + tantiem, 0);          // AC5 = ROUNDDOWN(AA+AB,0)
      const rate = terRate(category, dpp);                  // AE5
      const pph = round(dpp * rate);                        // AF5 = ROUND(AC*AE,0)
      return { teratur, dpp, rate, pph };
    };
    let res = compute(0);
    if (emp.grossUp) {
      // tunjangan PPh (S5) = the tax itself; iterate to a fixed point
      for (let i = 0; i < 30; i++) {
        const next = compute(res.pph);
        if (next.pph === res.pph) { res = next; break; }
        res = next;
      }
    }
    const tunjPph = emp.grossUp ? res.pph : 0;

    return {
      category,
      rate: res.rate,
      brutoTeratur: res.teratur,
      tantiem,
      dpp: res.dpp,
      pph: res.pph,
      tunjPph: emp.grossUp ? tunjPph : 0,
      premi,
      pengurang: pengurang(gaji)
    };
  }

  /* ---- ANNUAL / DECEMBER reconciliation (sheet TAHUNAN) ----
     months: array of 12 monthly() results (Jan..Dec input).
     For December we compute the annualised Article-17 liability and
     subtract what was already withheld Jan–Nov. */
  function annual(emp, monthsData, opts = {}) {
    const lamaBekerja = num(emp.bulanAkhir) - num(emp.bulanMulai) + 1 || 12;
    const disetahunkan = opts.jenis === "Disetahunkan";

    // Sum regular + irregular bruto across the year
    let brutoTeratur = 0, tantiem = 0, iuranPensiun = 0, zakat = num(emp.zakat);
    monthsData.forEach(m => {
      brutoTeratur += m.brutoTeratur;
      tantiem += m.tantiem;
      iuranPensiun += m.pengurang.total; // JHT + JP borne by employee
    });

    const dppBruto = roundDown(brutoTeratur + tantiem, 0);
    // Biaya jabatan 5% capped 500.000/month
    const biayaJabatan = Math.min(dppBruto * 0.05, 500000 * lamaBekerja);
    const totalPengurang = biayaJabatan + iuranPensiun + zakat;
    const netto = dppBruto - totalPengurang;

    let nettoSetahun = disetahunkan ? (netto * 12 / lamaBekerja) : netto;
    const ptkp = R.ptkpAmounts[emp.ptkp] || 0;
    let pkp = nettoSetahun - ptkp;
    pkp = pkp <= 0 ? 0 : roundDown(pkp, -3); // round down to nearest 1.000

    // Article 17 progressive: MAX over brackets
    let pphSetahun = 0;
    R.art17.forEach(b => {
      const v = b.rate * pkp - b.sub;
      if (v > pphSetahun) pphSetahun = v;
    });
    pphSetahun = Math.max(0, pphSetahun);

    const pphTerutang = disetahunkan ? (pphSetahun * lamaBekerja / 12) : pphSetahun;

    // Already withheld Jan–Nov (TER)
    const withheldPrior = monthsData.slice(0, 11).reduce((s, m) => s + m.pph, 0);
    const december = round(pphTerutang - withheldPrior); // kurang/lebih potong

    return {
      lamaBekerja, dppBruto, biayaJabatan, iuranPensiun, zakat,
      totalPengurang, netto, nettoSetahun, ptkp, pkp,
      pphSetahun: round(pphSetahun), pphTerutang: round(pphTerutang),
      withheldPrior, december,
      status: december > 0 ? "Kurang Potong" : december < 0 ? "Lebih Potong" : "Nihil"
    };
  }

  function num(v) { const n = Number(v); return isFinite(n) ? n : 0; }

  return { monthly, annual, terRate, employerPremi, pengurang, roundDown, round };
})();
