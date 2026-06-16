import { Router } from "express";
import { db } from "@workspace/db";
import { paymentsTable, tenantsTable, unitsTable, propertiesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

async function enrichPayment(p: any, tenants: any[], units: any[], properties: any[]) {
  const tenant = tenants.find(t => t.id === p.tenantId);
  const unit = units.find(u => u.id === p.unitId);
  const prop = unit ? properties.find(pr => pr.id === unit.propertyId) : null;
  return {
    ...p,
    createdAt: p.createdAt?.toISOString(),
    amount: parseFloat(p.amount as string || "0"),
    partialAmount: p.partialAmount ? parseFloat(p.partialAmount as string) : null,
    rentAmount: unit?.rentAmount ? parseFloat(unit.rentAmount as string) : null,
    tenantName: tenant?.name || null,
    unitNumber: unit?.unitNumber || null,
    propertyName: prop?.name || null,
  };
}

router.get("/payments", async (req, res) => {
  try {
    const payments = await db.select().from(paymentsTable).orderBy(sql`year DESC, month DESC, created_at DESC`);
    const tenants = await db.select().from(tenantsTable);
    const units = await db.select().from(unitsTable);
    const properties = await db.select().from(propertiesTable);
    const result = await Promise.all(payments.map(p => enrichPayment(p, tenants, units, properties)));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

router.post("/payments", async (req, res) => {
  try {
    const { tenantId, unitId, amount, partialAmount, month, year, status, mode, upiTransactionId, paidAt, dueDate, notes } = req.body;
    if (!tenantId || !unitId || !amount || !month || !year || !mode) {
      return res.status(400).json({ error: "tenantId, unitId, amount, month, year, mode are required" });
    }
    const [created] = await db.insert(paymentsTable).values({
      tenantId,
      unitId,
      amount: String(amount),
      partialAmount: partialAmount ? String(partialAmount) : null,
      month,
      year,
      status: status || "paid",
      mode,
      upiTransactionId: upiTransactionId || null,
      paidAt: paidAt || new Date().toISOString(),
      dueDate: dueDate || null,
      notes: notes || null,
    }).returning();
    const tenants = await db.select().from(tenantsTable);
    const units = await db.select().from(unitsTable);
    const properties = await db.select().from(propertiesTable);
    res.status(201).json(await enrichPayment(created, tenants, units, properties));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create payment" });
  }
});

router.get("/payments/overdue", async (req, res) => {
  try {
    const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.status, "overdue")).orderBy(sql`year DESC, month DESC`);
    const tenants = await db.select().from(tenantsTable);
    const units = await db.select().from(unitsTable);
    const properties = await db.select().from(propertiesTable);
    const result = await Promise.all(payments.map(p => enrichPayment(p, tenants, units, properties)));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch overdue payments" });
  }
});

router.get("/payments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [p] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, id));
    if (!p) return res.status(404).json({ error: "Payment not found" });
    const tenants = await db.select().from(tenantsTable);
    const units = await db.select().from(unitsTable);
    const properties = await db.select().from(propertiesTable);
    res.json(await enrichPayment(p, tenants, units, properties));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch payment" });
  }
});

router.patch("/payments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates: any = {};
    const fields = ["amount", "partialAmount", "status", "mode", "upiTransactionId", "paidAt", "notes"];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (f === "amount" || f === "partialAmount") updates[f] = String(req.body[f]);
        else updates[f] = req.body[f];
      }
    }
    const [updated] = await db.update(paymentsTable).set(updates).where(eq(paymentsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Payment not found" });
    const tenants = await db.select().from(tenantsTable);
    const units = await db.select().from(unitsTable);
    const properties = await db.select().from(propertiesTable);
    res.json(await enrichPayment(updated, tenants, units, properties));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update payment" });
  }
});

export default router;
