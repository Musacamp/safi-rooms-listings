import {
  SOURCE_LABEL,
  kpis,
  monthComparison,
  monthlySeries,
  records,
  sourceBreakdown,
  byDay,
  type RevenueEntry,
} from "@/lib/revenue-analytics";
import { formatUGX } from "@/lib/format";

export type ExportFilter = { from?: string; to?: string; source?: string };

export function filterEntries(entries: RevenueEntry[], f: ExportFilter): RevenueEntry[] {
  return entries.filter(
    (e) =>
      (!f.from || e.entry_date >= f.from) &&
      (!f.to || e.entry_date <= f.to) &&
      (!f.source || e.source === f.source),
  );
}

function download(name: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;

export function exportCsv(entries: RevenueEntry[], name = "safirooms-revenue") {
  const head = ["Date", "Amount (UGX)", "Source", "Transactions", "Notes"];
  const rows = entries.map((e) => [
    e.entry_date,
    String(e.amount_ugx),
    e.source === "other" ? (e.source_label ?? "Other") : (SOURCE_LABEL[e.source] ?? e.source),
    String(e.transactions),
    e.notes ?? "",
  ]);
  const csv = [head, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  download(`${name}.csv`, "text/csv;charset=utf-8", csv);
}

/** Excel-readable single-sheet workbook (HTML table, .xls). */
export function exportExcel(entries: RevenueEntry[], name = "safirooms-revenue") {
  const k = kpis(entries);
  const body = entries
    .map(
      (e) =>
        `<tr><td>${e.entry_date}</td><td>${e.amount_ugx}</td><td>${
          e.source === "other" ? (e.source_label ?? "Other") : (SOURCE_LABEL[e.source] ?? e.source)
        }</td><td>${e.transactions}</td><td>${(e.notes ?? "").replace(/</g, "&lt;")}</td></tr>`,
    )
    .join("");
  const months = monthlySeries(entries)
    .map((m) => `<tr><td>${m.label}</td><td>${m.amount}</td></tr>`)
    .join("");
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>
<h3>SafiRooms revenue</h3>
<table border="1"><tr><th>Total</th><td>${k.total}</td></tr><tr><th>Active days</th><td>${k.activeDays}</td></tr><tr><th>Average daily</th><td>${k.avgDaily}</td></tr></table>
<h4>Entries</h4><table border="1"><tr><th>Date</th><th>Amount (UGX)</th><th>Source</th><th>Transactions</th><th>Notes</th></tr>${body}</table>
<h4>Monthly totals</h4><table border="1"><tr><th>Month</th><th>Amount (UGX)</th></tr>${months}</table>
</body></html>`;
  download(`${name}.xls`, "application/vnd.ms-excel", html);
}

/** Print-to-PDF report window (charts summarised as bars). */
export function exportPdf(entries: RevenueEntry[], title = "SafiRooms revenue report") {
  const k = kpis(entries);
  const r = records(entries);
  const srcs = sourceBreakdown(entries);
  const months = monthComparison(entries);
  const max = Math.max(1, ...months.map((m) => m.amount));
  const days = [...byDay(entries).values()].sort((a, b) => a.date.localeCompare(b.date));

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
body{font-family:Inter,system-ui,sans-serif;color:#0b1220;margin:28px}
h1{font-size:20px;margin:0 0 4px} h2{font-size:14px;margin:22px 0 8px}
.kpi{display:flex;gap:10px;flex-wrap:wrap}
.kpi div{border:1px solid #dbe1ea;border-radius:10px;padding:8px 12px;min-width:120px}
.kpi span{display:block;font-size:10px;color:#6b7480;text-transform:uppercase}
.kpi b{font-size:15px}
table{border-collapse:collapse;width:100%;font-size:11px}
th,td{border:1px solid #dbe1ea;padding:4px 6px;text-align:left}
.bar{height:14px;background:#16803c;border-radius:3px}
small{color:#6b7480}
</style></head><body>
<h1>${title}</h1><small>Generated ${new Date().toLocaleString("en-GB")}</small>
<h2>Summary</h2>
<div class="kpi">
<div><span>Total</span><b>${formatUGX(k.total)}</b></div>
<div><span>This month</span><b>${formatUGX(k.month)}</b></div>
<div><span>This week</span><b>${formatUGX(k.week)}</b></div>
<div><span>Average daily</span><b>${formatUGX(k.avgDaily)}</b></div>
<div><span>Growth vs last month</span><b>${k.growthPct == null ? "—" : `${k.growthPct.toFixed(1)}%`}</b></div>
<div><span>Earning days</span><b>${k.activeDays}</b></div>
</div>
<h2>Records</h2>
<table><tr><th>Record</th><th>Value</th><th>When</th></tr>
<tr><td>Best day</td><td>${r.day ? formatUGX(r.day.amount) : "—"}</td><td>${r.day?.label ?? "—"}</td></tr>
<tr><td>Best week</td><td>${r.week ? formatUGX(r.week.amount) : "—"}</td><td>${r.week?.label ?? "—"}</td></tr>
<tr><td>Best month</td><td>${r.month ? formatUGX(r.month.amount) : "—"}</td><td>${r.month?.label ?? "—"}</td></tr>
<tr><td>Best year</td><td>${r.year ? formatUGX(r.year.amount) : "—"}</td><td>${r.year?.label ?? "—"}</td></tr></table>
<h2>Monthly breakdown</h2>
<table><tr><th>Month</th><th>Amount</th><th>Change</th><th></th></tr>
${months
  .map(
    (m) =>
      `<tr><td>${m.label}</td><td>${formatUGX(m.amount)}</td><td>${m.changePct == null ? "—" : `${m.changePct.toFixed(1)}%`}</td><td style="width:40%"><div class="bar" style="width:${(m.amount / max) * 100}%"></div></td></tr>`,
  )
  .join("")}
</table>
<h2>Revenue sources</h2>
<table><tr><th>Source</th><th>Amount</th><th>Share</th></tr>
${srcs.map((s) => `<tr><td>${s.label}</td><td>${formatUGX(s.amount)}</td><td>${s.pct.toFixed(1)}%</td></tr>`).join("")}
</table>
<h2>Daily breakdown</h2>
<table><tr><th>Date</th><th>Amount</th><th>Transactions</th></tr>
${days.map((d) => `<tr><td>${d.date}</td><td>${formatUGX(d.amount)}</td><td>${d.transactions}</td></tr>`).join("")}
</table>
<script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}
