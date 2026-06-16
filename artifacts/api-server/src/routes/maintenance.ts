import { Router } from "express";
import { db } from "@workspace/db";
import { maintenanceTable, tenantsTable, unitsTable, propertiesTable, vendorsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

async function enrichMaintenance(m: any, tenants: any[], units: any[], properties: any[], vendors: any[]) {
  const tenant = tenants.find(t => t.id === m.tenantId);
  const unit = units.find(u => u.id === m.unitId);
  const prop = unit ? properties.find(p => p.id === unit.propertyId) : null;
  const vendor = vendors.find(v => v.id === m.assignedVendorId);
  return {
    ...m,
    createdAt: m.createdAt?.toISOString(),
    cost: m.cost ? parseFloat(m.cost as string) : null,
    tenantName: tenant?.name || null,
    unitNumber: unit?.unitNumber || null,
    propertyName: prop?.name || null,
    assignedVendorName: vendor?.name || null,
  };
}

router.get("/maintenance", async (req, res) => {
  try {
    const requests = await db.select().from(maintenanceTable).orderBy(sql`created_at DESC`);
    const tenants = await db.select().from(tenantsTable);
    const units = await db.select().from(unitsTable);
    const properties = await db.select().from(propertiesTable);
    const vendors = await db.select().from(vendorsTable);
    const result = await Promise.all(requests.map(m => enrichMaintenance(m, tenants, units, properties, vendors)));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch maintenance requests" });
  }
});

router.post("/maintenance", async (req, res) => {
  try {
    const { unitId, tenantId, category, description, priority, notes } = req.body;
    if (!unitId || !tenantId || !category || !description || !priority) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const [created] = await db.insert(maintenanceTable).values({
      unitId, tenantId, category, description, priority,
      status: "raised",
      deductFromDeposit: false,
      notes: notes || null,
    }).returning();
    const tenants = await db.select().from(tenantsTable);
    const units = await db.select().from(unitsTable);
    const properties = await db.select().from(propertiesTable);
    const vendors = await db.select().from(vendorsTable);
    res.status(201).json(await enrichMaintenance(created, tenants, units, properties, vendors));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create maintenance request" });
  }
});

router.get("/maintenance/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [m] = await db.select().from(maintenanceTable).where(eq(maintenanceTable.id, id));
    if (!m) return res.status(404).json({ error: "Maintenance request not found" });
    const tenants = await db.select().from(tenantsTable);
    const units = await db.select().from(unitsTable);
    const properties = await db.select().from(propertiesTable);
    const vendors = await db.select().from(vendorsTable);
    res.json(await enrichMaintenance(m, tenants, units, properties, vendors));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch maintenance request" });
  }
});

router.patch("/maintenance/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates: any = {};
    const fields = ["status", "priority", "assignedVendorId", "cost", "deductFromDeposit", "resolvedAt", "notes"];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (f === "cost") updates[f] = String(req.body[f]);
        else updates[f] = req.body[f];
      }
    }
    if (updates.status === "resolved" && !updates.resolvedAt) {
      updates.resolvedAt = new Date().toISOString();
    }
    const [updated] = await db.update(maintenanceTable).set(updates).where(eq(maintenanceTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Maintenance request not found" });
    const tenants = await db.select().from(tenantsTable);
    const units = await db.select().from(unitsTable);
    const properties = await db.select().from(propertiesTable);
    const vendors = await db.select().from(vendorsTable);
    res.json(await enrichMaintenance(updated, tenants, units, properties, vendors));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update maintenance request" });
  }
});

export default router;
