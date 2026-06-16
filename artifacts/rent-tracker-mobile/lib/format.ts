export function formatINR(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function daysUntil(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function paymentStatusVariant(status: string): "success" | "warning" | "error" | "default" {
  if (status === "paid") return "success";
  if (status === "partial" || status === "pending") return "warning";
  if (status === "overdue") return "error";
  return "default";
}

export function maintenancePriorityVariant(priority: string): "error" | "warning" | "info" | "default" {
  if (priority === "urgent") return "error";
  if (priority === "high") return "warning";
  if (priority === "medium") return "info";
  return "default";
}

export function maintenanceStatusVariant(status: string): "success" | "warning" | "info" | "default" {
  if (status === "resolved") return "success";
  if (status === "in_progress") return "info";
  if (status === "acknowledged") return "warning";
  return "default";
}
