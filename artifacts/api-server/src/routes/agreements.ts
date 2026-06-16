import { Router } from "express";
import { db } from "@workspace/db";
import { agreementsTable, tenantsTable, unitsTable, propertiesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

function enrichAgreement(a: any, tenants: any[], units: any[], properties: any[]) {
  const tenant = tenants.find(t => t.id === a.tenantId);
  const unit = units.find(u => u.id === a.unitId);
  const prop = unit ? properties.find(p => p.id === unit.propertyId) : null;
  const now = new Date();
  const end = a.endDate ? new Date(a.endDate) : null;
  const daysToExpiry = end ? Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  return {
    ...a,
    createdAt: a.createdAt?.toISOString(),
    rentAmount: parseFloat(a.rentAmount as string || "0"),
    depositAmount: parseFloat(a.depositAmount as string || "0"),
    tenantName: tenant?.name || null,
    unitNumber: unit?.unitNumber || null,
    propertyName: prop?.name || null,
    daysToExpiry,
  };
}

router.get("/agreements", async (req, res) => {
  try {
    const agreements = await db.select().from(agreementsTable).orderBy(sql`created_at DESC`);
    const tenants = await db.select().from(tenantsTable);
    const units = await db.select().from(unitsTable);
    const properties = await db.select().from(propertiesTable);
    res.json(agreements.map(a => enrichAgreement(a, tenants, units, properties)));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch agreements" });
  }
});

router.post("/agreements", async (req, res) => {
  try {
    const { tenantId, unitId, type, startDate, endDate, rentAmount, depositAmount, noticePeriodDays, terms } = req.body;
    if (!tenantId || !unitId || !type || !startDate || !endDate || !rentAmount || !depositAmount) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const [created] = await db.insert(agreementsTable).values({
      tenantId, unitId, type, startDate, endDate,
      rentAmount: String(rentAmount),
      depositAmount: String(depositAmount),
      noticePeriodDays: noticePeriodDays || 30,
      terms: terms || null,
      status: "active",
    }).returning();
    const tenants = await db.select().from(tenantsTable);
    const units = await db.select().from(unitsTable);
    const properties = await db.select().from(propertiesTable);
    res.status(201).json(enrichAgreement(created, tenants, units, properties));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create agreement" });
  }
});

router.get("/agreements/expiring", async (req, res) => {
  try {
    const agreements = await db.select().from(agreementsTable).where(eq(agreementsTable.status, "active"));
    const tenants = await db.select().from(tenantsTable);
    const units = await db.select().from(unitsTable);
    const properties = await db.select().from(propertiesTable);
    const now = new Date();
    const enriched = agreements.map(a => enrichAgreement(a, tenants, units, properties));
    const expiring = enriched.filter(a => {
      return a.daysToExpiry !== null && a.daysToExpiry >= 0 && a.daysToExpiry <= 60;
    }).sort((a, b) => (a.daysToExpiry || 0) - (b.daysToExpiry || 0));
    res.json(expiring);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch expiring agreements" });
  }
});

router.get("/agreements/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [a] = await db.select().from(agreementsTable).where(eq(agreementsTable.id, id));
    if (!a) return res.status(404).json({ error: "Agreement not found" });
    const tenants = await db.select().from(tenantsTable);
    const units = await db.select().from(unitsTable);
    const properties = await db.select().from(propertiesTable);
    res.json(enrichAgreement(a, tenants, units, properties));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch agreement" });
  }
});

router.patch("/agreements/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates: any = {};
    const fields = ["startDate", "endDate", "rentAmount", "depositAmount", "noticePeriodDays", "terms", "status"];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (f === "rentAmount" || f === "depositAmount") updates[f] = String(req.body[f]);
        else updates[f] = req.body[f];
      }
    }
    const [updated] = await db.update(agreementsTable).set(updates).where(eq(agreementsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Agreement not found" });
    const tenants = await db.select().from(tenantsTable);
    const units = await db.select().from(unitsTable);
    const properties = await db.select().from(propertiesTable);
    res.json(enrichAgreement(updated, tenants, units, properties));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update agreement" });
  }
});

router.delete("/agreements/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(agreementsTable).where(eq(agreementsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete agreement" });
  }
});

export default router;
