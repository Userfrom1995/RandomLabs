/* Tabula sample.js (Phase 5): bundled sample workbook.
 *
 * Covers every function family, one displayed #CYCLE!, a lookup table,
 * a conditional-format demo column, and chart sources (labels + numbers
 * with one text cell mixed in so charts demo the skip rule).
 */
"use strict";
window.Tabula = window.Tabula || {};

(function (T) {
  function loadSample(E, wb) {
    const set = (c, r, raw) => E.applyEdit(wb, { op: "set", s: 0, c, r, raw });
    // Title + math family.
    set(0, 0, "Qty"); set(1, 0, "Price"); set(2, 0, "Total"); set(3, 0, "Tax 10%");
    set(0, 1, "4"); set(1, 1, "19.99"); set(2, 1, "=A2*B2"); set(3, 1, "=C2*10%");
    set(0, 2, "7"); set(1, 2, "3.5"); set(2, 2, "=A3*B3"); set(3, 2, "=C3*10%");
    set(2, 3, "=SUM(C2:C3)"); set(3, 3, "=SUM(D2:D3)");
    set(0, 4, "Average total"); set(2, 4, "=AVERAGE(C2:C3)");
    set(0, 5, "Rounded"); set(2, 5, "=ROUND(C5,2)");
    // Text + logic.
    set(4, 0, "Label"); set(5, 0, "Code");
    set(4, 1, "order"); set(5, 1, '=UPPER(D1&"-"&TEXT(C2,"0.00"))');
    set(4, 2, '=IF(C3>20,"big","small")'); set(5, 2, '=IFERROR(A99/B99,"n/a")');
    set(4, 3, '=CONCAT(D2,"|",E2)'); set(5, 3, '=LEN(E3)');
    // Lookup table.
    set(0, 7, "SKU"); set(1, 7, "Name");
    set(0, 8, "101"); set(1, 8, "Apple");
    set(0, 9, "102"); set(1, 9, "Pear");
    set(0, 10, "103"); set(1, 10, "Plum");
    set(3, 7, "Find"); set(4, 7, "Result");
    set(3, 8, "102"); set(4, 8, "=VLOOKUP(D8,A8:B10,2,FALSE)");
    set(4, 9, "=INDEX(B8:B10,MATCH(103,A8:A10,0))");
    // Dates.
    set(0, 12, "Start"); set(1, 12, "End"); set(2, 12, "Days");
    set(0, 13, "=DATE(2024,1,15)"); set(1, 13, "=DATE(2024,3,20)");
    set(2, 13, "=DAYS(B14,A14)"); set(3, 13, "=TEXT(A14,\"0\")");
    // Deliberate cycle, surfaced by the inspector.
    set(5, 12, "=F13"); set(5, 13, "=F12");
    // Chart sources (Phase 5): month labels plus numeric sales, one TEXT
    // cell deliberately mixed in so charts demo the skip-not-plot rule.
    set(0, 15, "Month"); set(1, 15, "Sales"); set(2, 15, "Target");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const sales = [120, 150, 131, 178, 165, 190];
    months.forEach((m, i) => {
      set(0, 16 + i, m);
      set(1, 16 + i, String(sales[i]));
      set(2, 16 + i, "=B" + (17 + i) + "-10");
    });
    set(1, 20, "n/a");
    return E.fullSnapshot(wb);
  }

  T.sample = { load: loadSample };
})(window.Tabula);
