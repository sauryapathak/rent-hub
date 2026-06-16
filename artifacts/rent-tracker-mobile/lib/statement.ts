export interface StatementPayment {
  id: number;
  month: number;
  year: number;
  amount: number;
  mode: string;
  status: string;
  paidAt?: string | null;
  upiTransactionId?: string | null;
}

export interface StatementData {
  tenantName: string;
  tenantPhone: string;
  unitNumber: string;
  propertyName: string;
  propertyAddress?: string;
  landlordName: string;
  statementYear: number;
  payments: StatementPayment[];
  generatedAt: string;
}

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function modeLabel(mode: string) {
  const map: Record<string, string> = {
    upi: "UPI",
    cash: "Cash",
    bank_transfer: "Bank",
    cheque: "Cheque",
  };
  return map[mode] ?? mode;
}

function statusColor(status: string) {
  switch (status) {
    case "paid": return { bg: "#DCFCE7", text: "#15803D" };
    case "partial": return { bg: "#FEF3C7", text: "#B45309" };
    case "overdue": return { bg: "#FEE2E2", text: "#B91C1C" };
    default: return { bg: "#F1F5F9", text: "#64748B" };
  }
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function generateStatementHTML(data: StatementData): string {
  const totalPaid = data.payments
    .filter((p) => p.status === "paid" || p.status === "partial")
    .reduce((s, p) => s + p.amount, 0);
  const totalDue = data.payments
    .filter((p) => p.status !== "paid")
    .reduce((s, p) => s + p.amount, 0);
  const totalExpected = data.payments.reduce((s, p) => s + p.amount, 0);

  // Build a 12-month grid, fill payments by month
  const monthMap: Record<number, StatementPayment | undefined> = {};
  data.payments.forEach((p) => {
    if (p.year === data.statementYear) monthMap[p.month] = p;
  });

  const rows = MONTHS.map((mName, idx) => {
    const m = idx + 1;
    const p = monthMap[m];
    const sc = p ? statusColor(p.status) : { bg: "#F8FAFC", text: "#94A3B8" };
    return `
      <tr>
        <td class="month-col">${mName}</td>
        <td class="amount-col">${p ? formatINR(p.amount) : "—"}</td>
        <td><span class="badge" style="background:${sc.bg};color:${sc.text}">${p ? p.status.charAt(0).toUpperCase() + p.status.slice(1) : "—"}</span></td>
        <td>${p ? modeLabel(p.mode) : "—"}</td>
        <td>${p ? fmtDate(p.paidAt) : "—"}</td>
        <td class="txn-col">${p?.upiTransactionId ?? "—"}</td>
      </tr>`;
  }).join("");

  const paidCount = data.payments.filter((p) => p.status === "paid").length;
  const pendingCount = data.payments.filter((p) => p.status === "pending" || p.status === "overdue").length;
  const partialCount = data.payments.filter((p) => p.status === "partial").length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Rent Statement – ${data.tenantName} – ${data.statementYear}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #F5F7FA; padding: 24px; color: #0F1D36; }
    .page { background: #fff; max-width: 700px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(13,32,64,0.12); }

    .header { background: linear-gradient(135deg, #0D2040 0%, #1A3F6F 100%); padding: 28px 32px; display: flex; justify-content: space-between; align-items: flex-start; }
    .brand-name { font-size: 20px; font-weight: 700; color: #fff; }
    .brand-sub { font-size: 11px; color: rgba(255,255,255,0.55); margin-top: 2px; }
    .stmt-badge { background: rgba(255,255,255,0.12); border-radius: 8px; padding: 8px 14px; text-align: right; }
    .stmt-badge-label { font-size: 10px; color: rgba(255,255,255,0.55); text-transform: uppercase; letter-spacing: 0.8px; }
    .stmt-badge-val { font-size: 16px; font-weight: 700; color: #fff; margin-top: 2px; }

    .tenant-bar { background: #EEF2F7; padding: 16px 32px; display: flex; gap: 40px; flex-wrap: wrap; border-bottom: 1px solid #DDE3ED; }
    .tenant-field-label { font-size: 10px; color: #6B7FA3; text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 3px; }
    .tenant-field-val { font-size: 13px; font-weight: 600; color: #0F1D36; }

    .summary { display: flex; padding: 20px 32px; gap: 0; border-bottom: 1px solid #EEF2F7; }
    .summary-tile { flex: 1; text-align: center; padding: 0 12px; }
    .summary-tile:not(:last-child) { border-right: 1px solid #EEF2F7; }
    .summary-tile-label { font-size: 11px; color: #6B7FA3; text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 6px; }
    .summary-tile-val { font-size: 22px; font-weight: 700; }
    .summary-tile-sub { font-size: 11px; color: #94A3B8; margin-top: 3px; }

    .section-title { padding: 16px 32px 8px; font-size: 12px; font-weight: 600; color: #6B7FA3; text-transform: uppercase; letter-spacing: 0.8px; }

    table { width: 100%; border-collapse: collapse; }
    th { font-size: 11px; font-weight: 600; color: #6B7FA3; text-transform: uppercase; letter-spacing: 0.6px; padding: 8px 10px; background: #F8FAFC; text-align: left; }
    th:first-child { padding-left: 32px; }
    th:last-child { padding-right: 32px; }
    td { font-size: 13px; color: #0F1D36; padding: 10px 10px; border-top: 1px solid #F0F3F8; vertical-align: middle; }
    td:first-child { padding-left: 32px; }
    td:last-child { padding-right: 32px; }
    .month-col { font-weight: 500; }
    .amount-col { font-weight: 600; color: #0D2040; }
    .txn-col { font-size: 11px; color: #94A3B8; font-family: monospace; }
    .badge { display: inline-block; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 20px; letter-spacing: 0.3px; }

    .totals-row { background: #F0F4FA; }
    .totals-row td { font-weight: 700; font-size: 14px; border-top: 2px solid #DDE3ED; }

    .footer { padding: 18px 32px; background: #F9FAFB; border-top: 1px solid #EEF2F7; display: flex; justify-content: space-between; align-items: center; }
    .footer-note { font-size: 10px; color: #9CA3AF; line-height: 1.6; }
    .footer-brand { font-size: 12px; font-weight: 700; color: #0D2040; }

    .status-pills { display: flex; gap: 10px; padding: 0 32px 16px; flex-wrap: wrap; }
    .pill { font-size: 12px; padding: 4px 12px; border-radius: 20px; font-weight: 500; }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="brand-name">🏠 RentSaathi</div>
      <div class="brand-sub">Annual Rent Statement</div>
    </div>
    <div class="stmt-badge">
      <div class="stmt-badge-label">Year</div>
      <div class="stmt-badge-val">${data.statementYear}</div>
    </div>
  </div>

  <div class="tenant-bar">
    <div>
      <div class="tenant-field-label">Tenant</div>
      <div class="tenant-field-val">${data.tenantName}</div>
    </div>
    <div>
      <div class="tenant-field-label">Contact</div>
      <div class="tenant-field-val">${data.tenantPhone}</div>
    </div>
    <div>
      <div class="tenant-field-label">Unit</div>
      <div class="tenant-field-val">${data.unitNumber} · ${data.propertyName}</div>
    </div>
    <div>
      <div class="tenant-field-label">Generated</div>
      <div class="tenant-field-val">${fmtDate(data.generatedAt)}</div>
    </div>
  </div>

  <div class="summary">
    <div class="summary-tile">
      <div class="summary-tile-label">Total Collected</div>
      <div class="summary-tile-val" style="color:#15803D">${formatINR(totalPaid)}</div>
      <div class="summary-tile-sub">${paidCount + partialCount} payments</div>
    </div>
    <div class="summary-tile">
      <div class="summary-tile-label">Outstanding</div>
      <div class="summary-tile-val" style="color:${totalDue > 0 ? "#B91C1C" : "#15803D"}">${formatINR(totalDue)}</div>
      <div class="summary-tile-sub">${pendingCount} pending</div>
    </div>
    <div class="summary-tile">
      <div class="summary-tile-label">Total Expected</div>
      <div class="summary-tile-val" style="color:#1A3F6F">${formatINR(totalExpected)}</div>
      <div class="summary-tile-sub">${data.payments.length} months</div>
    </div>
  </div>

  <div class="status-pills">
    <span class="pill" style="background:#DCFCE7;color:#15803D">✓ ${paidCount} Paid</span>
    ${partialCount > 0 ? `<span class="pill" style="background:#FEF3C7;color:#B45309">⚡ ${partialCount} Partial</span>` : ""}
    ${pendingCount > 0 ? `<span class="pill" style="background:#FEE2E2;color:#B91C1C">⚠ ${pendingCount} Pending</span>` : ""}
  </div>

  <div class="section-title">Monthly Breakdown – ${data.statementYear}</div>

  <table>
    <thead>
      <tr>
        <th>Month</th>
        <th>Amount</th>
        <th>Status</th>
        <th>Mode</th>
        <th>Paid On</th>
        <th>Transaction ID</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="totals-row">
        <td>TOTAL</td>
        <td class="amount-col">${formatINR(totalExpected)}</td>
        <td></td>
        <td></td>
        <td style="color:#15803D">${formatINR(totalPaid)} collected</td>
        <td style="color:${totalDue > 0 ? "#B91C1C" : "#6B7FA3"}">${totalDue > 0 ? formatINR(totalDue) + " due" : "Fully paid"}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <div class="footer-note">
      This is a computer-generated statement. For queries, contact your landlord.<br/>
      Generated via RentSaathi on ${fmtDate(data.generatedAt)}.
    </div>
    <div class="footer-brand">RentSaathi</div>
  </div>
</div>
</body>
</html>`;
}
