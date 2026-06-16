import { Router } from "express";
import { db } from "@workspace/db";
import { propertiesTable, unitsTable, tenantsTable, paymentsTable, agreementsTable, maintenanceTable, expensesTable } from "@workspace/db";
import { eq, and, sql, gte, lte } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  try {
    const properties = await db.select().from(propertiesTable);
    const units = await db.select().from(unitsTable);
    const payments = await db.select().from(paymentsTable);
    const agreements = await db.select().from(agreementsTable);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const totalProperties = properties.length;
    const totalUnits = units.length;
    const occupiedUnits = units.filter(u => u.status === "occupied").length;
    const vacantUnits = units.filter(u => u.status === "vacant").length;
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    const thisMonthPayments = payments.filter(p => p.month === currentMonth && p.year === currentYear);
    const collectedThisMonth = thisMonthPayments
      .filter(p => p.status === "paid" || p.status === "partial")
      .reduce((sum, p) => sum + parseFloat(p.amount as string || "0"), 0);

    const overduePayments = payments.filter(p => p.status === "overdue");
    const overdueCount = overduePayments.length;
    const pendingDues = payments
      .filter(p => p.status === "pending" || p.status === "overdue" || p.status === "partial")
      .reduce((sum, p) => sum + parseFloat(p.amount as string || "0"), 0);

    const totalMonthlyIncome = units
      .filter(u => u.status === "occupied")
      .reduce((sum, u) => sum + parseFloat(u.rentAmount as string || "0"), 0);

    const agreementsExpiringSoon = agreements.filter(a => {
      if (a.status !== "active") return false;
      const end = new Date(a.endDate);
      const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 60 && diffDays >= 0;
    }).length;

    res.json({
      totalProperties,
      totalUnits,
      occupiedUnits,
      vacantUnits,
      totalMonthlyIncome,
      collectedThisMonth,
      pendingDues,
      overdueCount,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      agreementsExpiringSoon,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
});

router.get("/dashboard/recent-activity", async (req, res) => {
  try {
    const payments = await db.select().from(paymentsTable).orderBy(sql`created_at DESC`).limit(5);
    const maintenance = await db.select().from(maintenanceTable).orderBy(sql`created_at DESC`).limit(3);
    const agreements = await db.select().from(agreementsTable).orderBy(sql`created_at DESC`).limit(3);

    const tenants = await db.select().from(tenantsTable);
    const units = await db.select().from(unitsTable);
    const properties = await db.select().from(propertiesTable);

    const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t.name]));
    const unitMap = Object.fromEntries(units.map(u => [u.id, { unitNumber: u.unitNumber, propertyId: u.propertyId }]));
    const propertyMap = Object.fromEntries(properties.map(p => [p.id, p.name]));

    const activities: any[] = [];
    let idCounter = 1;

    for (const p of payments) {
      const unitInfo = unitMap[p.unitId];
      const propName = unitInfo ? propertyMap[unitInfo.propertyId] : null;
      activities.push({
        id: idCounter++,
        type: "payment",
        description: `Rent ${p.status === "paid" ? "received" : "updated"} from ${tenantMap[p.tenantId] || "Tenant"}`,
        timestamp: p.createdAt?.toISOString() || new Date().toISOString(),
        propertyName: propName || null,
        unitName: unitInfo?.unitNumber || null,
        amount: parseFloat(p.amount as string || "0"),
      });
    }

    for (const m of maintenance) {
      const unitInfo = unitMap[m.unitId];
      const propName = unitInfo ? propertyMap[unitInfo.propertyId] : null;
      activities.push({
        id: idCounter++,
        type: "maintenance",
        description: `Maintenance request: ${m.category} - ${m.status}`,
        timestamp: m.createdAt?.toISOString() || new Date().toISOString(),
        propertyName: propName || null,
        unitName: unitInfo?.unitNumber || null,
        amount: null,
      });
    }

    for (const a of agreements) {
      const unitInfo = unitMap[a.unitId];
      const propName = unitInfo ? propertyMap[unitInfo.propertyId] : null;
      activities.push({
        id: idCounter++,
        type: "agreement",
        description: `Agreement ${a.status} for unit ${unitInfo?.unitNumber || a.unitId}`,
        timestamp: a.createdAt?.toISOString() || new Date().toISOString(),
        propertyName: propName || null,
        unitName: unitInfo?.unitNumber || null,
        amount: parseFloat(a.rentAmount as string || "0"),
      });
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(activities.slice(0, 10));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

router.get("/dashboard/rent-status", async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const payments = await db.select().from(paymentsTable).where(
      and(eq(paymentsTable.month, currentMonth), eq(paymentsTable.year, currentYear))
    );

    const paid = payments.filter(p => p.status === "paid").length;
    const due = payments.filter(p => p.status === "pending").length;
    const overdue = payments.filter(p => p.status === "overdue").length;
    const partial = payments.filter(p => p.status === "partial").length;

    res.json({ paid, due, overdue, partial });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch rent status" });
  }
});

router.get("/dashboard/income-chart", async (req, res) => {
  try {
    const payments = await db.select().from(paymentsTable);
    const expenses = await db.select().from(expensesTable);

    const now = new Date();
    const months: { month: string; income: number; expenses: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const monthLabel = d.toLocaleString("en-IN", { month: "short", year: "numeric" });

      const income = payments
        .filter(p => p.month === m && p.year === y && (p.status === "paid" || p.status === "partial"))
        .reduce((sum, p) => sum + parseFloat(p.amount as string || "0"), 0);

      const monthStart = `${y}-${String(m).padStart(2, "0")}-01`;
      const monthEnd = `${y}-${String(m).padStart(2, "0")}-31`;
      const expTotal = expenses
        .filter(e => e.date >= monthStart && e.date <= monthEnd)
        .reduce((sum, e) => sum + parseFloat(e.amount as string || "0"), 0);

      months.push({ month: monthLabel, income, expenses: expTotal });
    }

    res.json(months);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch income chart" });
  }
});

export default router;
