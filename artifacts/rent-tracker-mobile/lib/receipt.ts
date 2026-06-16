export interface ReceiptData {
  receiptNumber: string;
  propertyName: string;
  unitNumber: string;
  tenantName: string;
  tenantPhone: string;
  landlordName: string;
  amount: number;
  month: number;
  year: number;
  mode: string;
  status: string;
  paidAt?: string | null;
  upiTransactionId?: string | null;
  address?: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatAmount(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function monthName(m: number) {
  return [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ][m - 1] ?? String(m);
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function modeLabel(mode: string) {
  const map: Record<string, string> = {
    upi: "UPI Transfer",
    cash: "Cash",
    bank_transfer: "Bank Transfer",
    cheque: "Cheque",
  };
  return map[mode] ?? mode.toUpperCase();
}

export function generateReceiptHTML(data: ReceiptData): string {
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const amountWords = toWords(data.amount);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rent Receipt – ${data.receiptNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #F5F7FA; padding: 24px; color: #0F1D36; }
    .page { background: #fff; border-radius: 12px; max-width: 600px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 24px rgba(13,32,64,0.12); }

    /* Header */
    .header { background: linear-gradient(135deg, #0D2040 0%, #1A3F6F 100%); padding: 28px 32px; display: flex; align-items: center; justify-content: space-between; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-icon { width: 44px; height: 44px; background: rgba(255,255,255,0.15); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 22px; }
    .brand-name { font-size: 20px; font-weight: 700; color: #fff; letter-spacing: -0.3px; }
    .brand-sub { font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 2px; }
    .receipt-badge { background: rgba(255,255,255,0.12); border-radius: 8px; padding: 8px 14px; text-align: right; }
    .receipt-badge-label { font-size: 10px; color: rgba(255,255,255,0.55); text-transform: uppercase; letter-spacing: 0.8px; }
    .receipt-badge-num { font-size: 15px; font-weight: 700; color: #fff; margin-top: 2px; }

    /* Status banner */
    .status-banner { background: ${data.status === "paid" ? "#DCFCE7" : data.status === "partial" ? "#FEF3C7" : "#FEE2E2"}; padding: 10px 32px; display: flex; align-items: center; gap: 8px; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: ${data.status === "paid" ? "#16A34A" : data.status === "partial" ? "#D97706" : "#EF4444"}; }
    .status-text { font-size: 13px; font-weight: 600; color: ${data.status === "paid" ? "#15803D" : data.status === "partial" ? "#B45309" : "#B91C1C"}; text-transform: uppercase; letter-spacing: 0.6px; }
    .status-date { margin-left: auto; font-size: 12px; color: ${data.status === "paid" ? "#16A34A" : "#B45309"}; }

    /* Amount hero */
    .amount-section { padding: 28px 32px 20px; text-align: center; border-bottom: 1px dashed #DDE3ED; }
    .amount-label { font-size: 12px; color: #6B7FA3; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; }
    .amount-value { font-size: 42px; font-weight: 800; color: #0D2040; letter-spacing: -1px; }
    .amount-words { font-size: 13px; color: #6B7FA3; margin-top: 6px; font-style: italic; }
    .period-badge { display: inline-block; background: #EEF2F7; border-radius: 20px; padding: 5px 16px; font-size: 13px; font-weight: 600; color: #1A3F6F; margin-top: 12px; }

    /* Details grid */
    .details { padding: 24px 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
    .detail-group { padding: 12px 0; }
    .detail-group:nth-child(odd) { border-right: 1px solid #F0F3F8; padding-right: 24px; }
    .detail-group:nth-child(even) { padding-left: 24px; }
    .detail-group:not(:last-child):not(:nth-last-child(2)) { border-bottom: 1px solid #F0F3F8; }
    .detail-label { font-size: 11px; color: #6B7FA3; text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 4px; }
    .detail-value { font-size: 14px; font-weight: 500; color: #0F1D36; }

    /* Transaction ID */
    .txn-row { margin: 0 32px; padding: 12px 16px; background: #F5F7FA; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
    .txn-label { font-size: 11px; color: #6B7FA3; text-transform: uppercase; letter-spacing: 0.7px; }
    .txn-value { font-size: 13px; font-weight: 600; color: #0F1D36; font-family: monospace; }

    /* Footer */
    .footer { padding: 20px 32px; display: flex; justify-content: space-between; align-items: flex-end; background: #F9FAFB; border-top: 1px solid #EEF2F7; margin-top: 20px; }
    .footer-note { font-size: 11px; color: #9CA3AF; max-width: 240px; line-height: 1.5; }
    .signature-box { text-align: right; }
    .signature-line { width: 140px; border-bottom: 1px solid #0D2040; margin-bottom: 6px; height: 32px; }
    .signature-label { font-size: 10px; color: #6B7FA3; text-transform: uppercase; letter-spacing: 0.7px; }

    /* Watermark for paid */
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; font-weight: 900; color: rgba(22,163,74,0.06); pointer-events: none; letter-spacing: 4px; }
  </style>
</head>
<body>
  ${data.status === "paid" ? '<div class="watermark">PAID</div>' : ""}
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="brand-icon">🏠</div>
        <div>
          <div class="brand-name">RentSaathi</div>
          <div class="brand-sub">Rent Receipt</div>
        </div>
      </div>
      <div class="receipt-badge">
        <div class="receipt-badge-label">Receipt No.</div>
        <div class="receipt-badge-num">${data.receiptNumber}</div>
      </div>
    </div>

    <div class="status-banner">
      <div class="status-dot"></div>
      <span class="status-text">${data.status === "paid" ? "Payment Received" : data.status === "partial" ? "Partial Payment" : "Payment Pending"}</span>
      <span class="status-date">${data.paidAt ? formatDate(data.paidAt) : today}</span>
    </div>

    <div class="amount-section">
      <div class="amount-label">Rent Amount</div>
      <div class="amount-value">${formatAmount(data.amount)}</div>
      <div class="amount-words">${amountWords} only</div>
      <div class="period-badge">${monthName(data.month)} ${data.year}</div>
    </div>

    <div class="details">
      <div class="detail-group">
        <div class="detail-label">Tenant Name</div>
        <div class="detail-value">${data.tenantName}</div>
      </div>
      <div class="detail-group">
        <div class="detail-label">Contact</div>
        <div class="detail-value">${data.tenantPhone}</div>
      </div>
      <div class="detail-group">
        <div class="detail-label">Property</div>
        <div class="detail-value">${data.propertyName}</div>
      </div>
      <div class="detail-group">
        <div class="detail-label">Unit</div>
        <div class="detail-value">${data.unitNumber}</div>
      </div>
      <div class="detail-group">
        <div class="detail-label">Payment Mode</div>
        <div class="detail-value">${modeLabel(data.mode)}</div>
      </div>
      <div class="detail-group">
        <div class="detail-label">Receipt Date</div>
        <div class="detail-value">${today}</div>
      </div>
    </div>

    ${data.upiTransactionId ? `
    <div class="txn-row">
      <span class="txn-label">UPI Transaction ID</span>
      <span class="txn-value">${data.upiTransactionId}</span>
    </div>` : ""}

    <div class="footer">
      <div class="footer-note">
        This is a computer-generated rent receipt. No physical signature required. Generated via RentSaathi.
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Landlord Signature</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// Simple number to Indian words
function toWords(amount: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convert(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n] + " ";
    if (n < 100) return tens[Math.floor(n / 10)] + " " + ones[n % 10] + " ";
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred " + convert(n % 100);
    if (n < 100000) return convert(Math.floor(n / 1000)) + "Thousand " + convert(n % 1000);
    if (n < 10000000) return convert(Math.floor(n / 100000)) + "Lakh " + convert(n % 100000);
    return convert(Math.floor(n / 10000000)) + "Crore " + convert(n % 10000000);
  }

  const n = Math.floor(amount);
  if (n === 0) return "Zero Rupees";
  return `Rupees ${convert(n).trim()}`;
}
