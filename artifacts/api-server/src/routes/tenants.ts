import { Router } from "express";
import { db } from "@workspace/db";
import { tenantsTable, unitsTable, propertiesTable, paymentsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

async function enrichTenant(t: any, units: any[], properties: any[]) {
  const unit = units.find(u => u.id === t.unitId);
  const prop = unit ? properties.find(p => p.id === unit.propertyId) : null;
  return {
    ...t,
    createdAt: t.createdAt?.toISOString(),
    unitNumber: unit?.unitNumber || null,
    propertyName: prop?.name || null,
  };
}

router.get("/tenants", async (req, res) => {
  try {
    const tenants = await db.select().from(tenantsTable).orderBy(sql`created_at DESC`);
    const units = await db.select().from(unitsTable);
    const properties = await db.select().from(propertiesTable);
    const result = await Promise.all(tenants.map(t => enrichTenant(t, units, properties)));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch tenants" });
  }
});

router.post("/tenants", async (req, res) => {
  try {
    const { name, phone, email, photo, aadhaarNumber, panNumber, employer, emergencyContact, emergencyPhone, unitId, moveInDate } = req.body;
    if (!name || !phone) return res.status(400).json({ error: "name and phone are required" });
    const [created] = await db.insert(tenantsTable).values({
      name, phone,
      email: email || null,
      photo: photo || null,
      aadhaarNumber: aadhaarNumber || null,
      panNumber: panNumber || null,
      employer: employer || null,
      emergencyContact: emergencyContact || null,
      emergencyPhone: emergencyPhone || null,
      policeVerified: false,
      kycStatus: "pending",
      unitId: unitId || null,
      moveInDate: moveInDate || null,
    }).returning();
    // If unitId provided, mark unit as occupied
    if (unitId) {
      await db.update(unitsTable).set({ status: "occupied", tenantId: created.id }).where(eq(unitsTable.id, unitId));
    }
    const units = await db.select().from(unitsTable);
    const properties = await db.select().from(propertiesTable);
    res.status(201).json(await enrichTenant(created, units, properties));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create tenant" });
  }
});

router.get("/tenants/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [t] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, id));
    if (!t) return res.status(404).json({ error: "Tenant not found" });
    const units = await db.select().from(unitsTable);
    const properties = await db.select().from(propertiesTable);
    res.json(await enrichTenant(t, units, properties));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch tenant" });
  }
});

router.patch("/tenants/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates: any = {};
    const fields = ["name", "phone", "email", "photo", "aadhaarNumber", "panNumber", "employer", "emergencyContact", "emergencyPhone", "policeVerified", "kycStatus", "unitId", "moveInDate"];
    for (const f of fields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    const [updated] = await db.update(tenantsTable).set(updates).where(eq(tenantsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Tenant not found" });
    const units = await db.select().from(unitsTable);
    const properties = await db.select().from(propertiesTable);
    res.json(await enrichTenant(updated, units, properties));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update tenant" });
  }
});

router.delete("/tenants/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(tenantsTable).where(eq(tenantsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete tenant" });
  }
});

router.get("/tenants/:id/payment-history", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const payments = await db.select().from(paymentsTable)
      .where(eq(paymentsTable.tenantId, id))
      .orderBy(sql`year DESC, month DESC`);
    const tenants = await db.select().from(tenantsTable);
    const units = await db.select().from(unitsTable);
    const properties = await db.select().from(propertiesTable);

    const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t.name]));
    const unitMap = Object.fromEntries(units.map(u => [u.id, { unitNumber: u.unitNumber, propertyId: u.propertyId, rentAmount: u.rentAmount }]));
    const propMap = Object.fromEntries(properties.map(p => [p.id, p.name]));

    const result = payments.map(p => {
      const unitInfo = unitMap[p.unitId];
      return {
        ...p,
        createdAt: p.createdAt?.toISOString(),
        amount: parseFloat(p.amount as string || "0"),
        partialAmount: p.partialAmount ? parseFloat(p.partialAmount as string) : null,
        rentAmount: unitInfo?.rentAmount ? parseFloat(unitInfo.rentAmount as string) : null,
        tenantName: tenantMap[p.tenantId] || null,
        unitNumber: unitInfo?.unitNumber || null,
        propertyName: unitInfo ? propMap[unitInfo.propertyId] : null,
      };
    });
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch payment history" });
  }
});

export default router;
