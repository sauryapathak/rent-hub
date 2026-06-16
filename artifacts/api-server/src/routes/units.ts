import { Router } from "express";
import { db } from "@workspace/db";
import { unitsTable, propertiesTable, tenantsTable, paymentsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

async function enrichUnit(u: any, properties: any[], tenants: any[], payments: any[]) {
  const prop = properties.find(p => p.id === u.propertyId);
  const tenant = tenants.find(t => t.id === u.tenantId);
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  const lastPayment = payments
    .filter(p => p.unitId === u.id)
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    })[0];
  const thisMonthPayment = payments.find(p => p.unitId === u.id && p.month === m && p.year === y);

  return {
    ...u,
    createdAt: u.createdAt?.toISOString(),
    rentAmount: parseFloat(u.rentAmount as string || "0"),
    depositAmount: u.depositAmount ? parseFloat(u.depositAmount as string) : null,
    propertyName: prop?.name || null,
    tenantName: tenant?.name || null,
    lastPaymentDate: lastPayment?.paidAt || null,
    paymentStatus: thisMonthPayment?.status || (u.status === "occupied" ? "due" : null),
  };
}

router.get("/properties/:propertyId/units", async (req, res) => {
  try {
    const propertyId = parseInt(req.params.propertyId);
    const units = await db.select().from(unitsTable).where(eq(unitsTable.propertyId, propertyId));
    const properties = await db.select().from(propertiesTable);
    const tenants = await db.select().from(tenantsTable);
    const payments = await db.select().from(paymentsTable);
    const result = await Promise.all(units.map(u => enrichUnit(u, properties, tenants, payments)));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch units" });
  }
});

router.post("/properties/:propertyId/units", async (req, res) => {
  try {
    const propertyId = parseInt(req.params.propertyId);
    const { unitNumber, floor, type, rentAmount, depositAmount, amenities, rentDueDay } = req.body;
    if (!unitNumber || !type || !rentAmount) {
      return res.status(400).json({ error: "unitNumber, type, rentAmount are required" });
    }
    const [created] = await db.insert(unitsTable).values({
      propertyId,
      unitNumber,
      floor: floor || null,
      type,
      rentAmount: String(rentAmount),
      depositAmount: depositAmount ? String(depositAmount) : null,
      status: "vacant",
      amenities: amenities || null,
      rentDueDay: rentDueDay || 1,
    }).returning();
    const properties = await db.select().from(propertiesTable);
    const result = await enrichUnit(created, properties, [], []);
    res.status(201).json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create unit" });
  }
});

router.get("/units", async (req, res) => {
  try {
    const units = await db.select().from(unitsTable).orderBy(sql`created_at DESC`);
    const properties = await db.select().from(propertiesTable);
    const tenants = await db.select().from(tenantsTable);
    const payments = await db.select().from(paymentsTable);
    const result = await Promise.all(units.map(u => enrichUnit(u, properties, tenants, payments)));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch units" });
  }
});

router.get("/units/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [u] = await db.select().from(unitsTable).where(eq(unitsTable.id, id));
    if (!u) return res.status(404).json({ error: "Unit not found" });
    const properties = await db.select().from(propertiesTable);
    const tenants = await db.select().from(tenantsTable);
    const payments = await db.select().from(paymentsTable);
    res.json(await enrichUnit(u, properties, tenants, payments));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch unit" });
  }
});

router.patch("/units/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates: any = {};
    const fields = ["unitNumber", "floor", "type", "rentAmount", "depositAmount", "status", "amenities", "tenantId", "rentDueDay"];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (f === "rentAmount" || f === "depositAmount") updates[f] = String(req.body[f]);
        else updates[f] = req.body[f];
      }
    }
    const [updated] = await db.update(unitsTable).set(updates).where(eq(unitsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Unit not found" });
    const properties = await db.select().from(propertiesTable);
    const tenants = await db.select().from(tenantsTable);
    const payments = await db.select().from(paymentsTable);
    res.json(await enrichUnit(updated, properties, tenants, payments));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update unit" });
  }
});

router.delete("/units/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(unitsTable).where(eq(unitsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete unit" });
  }
});

export default router;
