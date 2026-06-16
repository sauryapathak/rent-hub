import { Router } from "express";
import { db } from "@workspace/db";
import { propertiesTable, unitsTable, paymentsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/properties", async (req, res) => {
  try {
    const properties = await db.select().from(propertiesTable).orderBy(sql`created_at DESC`);
    const units = await db.select().from(unitsTable);
    const payments = await db.select().from(paymentsTable);
    const now = new Date();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();

    const result = properties.map(p => {
      const propUnits = units.filter(u => u.propertyId === p.id);
      const occupied = propUnits.filter(u => u.status === "occupied").length;
      const monthlyIncome = propUnits
        .filter(u => u.status === "occupied")
        .reduce((sum, u) => sum + parseFloat(u.rentAmount as string || "0"), 0);
      return {
        ...p,
        createdAt: p.createdAt?.toISOString(),
        totalUnits: propUnits.length,
        occupiedUnits: occupied,
        monthlyIncome,
      };
    });
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

router.post("/properties", async (req, res) => {
  try {
    const { name, address, city, state, pincode, type, photo } = req.body;
    if (!name || !address || !city || !state) {
      return res.status(400).json({ error: "name, address, city, state are required" });
    }
    const [created] = await db.insert(propertiesTable).values({
      name, address, city, state,
      pincode: pincode || null,
      type: type || "residential",
      photo: photo || null,
    }).returning();
    res.status(201).json({ ...created, createdAt: created.createdAt?.toISOString(), totalUnits: 0, occupiedUnits: 0, monthlyIncome: 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create property" });
  }
});

router.get("/properties/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [p] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, id));
    if (!p) return res.status(404).json({ error: "Property not found" });
    const propUnits = await db.select().from(unitsTable).where(eq(unitsTable.propertyId, id));
    const occupied = propUnits.filter(u => u.status === "occupied").length;
    const monthlyIncome = propUnits.filter(u => u.status === "occupied").reduce((s, u) => s + parseFloat(u.rentAmount as string || "0"), 0);
    res.json({ ...p, createdAt: p.createdAt?.toISOString(), totalUnits: propUnits.length, occupiedUnits: occupied, monthlyIncome });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch property" });
  }
});

router.patch("/properties/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, address, city, state, pincode, type, photo } = req.body;
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (address !== undefined) updates.address = address;
    if (city !== undefined) updates.city = city;
    if (state !== undefined) updates.state = state;
    if (pincode !== undefined) updates.pincode = pincode;
    if (type !== undefined) updates.type = type;
    if (photo !== undefined) updates.photo = photo;
    const [updated] = await db.update(propertiesTable).set(updates).where(eq(propertiesTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Property not found" });
    const propUnits = await db.select().from(unitsTable).where(eq(unitsTable.propertyId, id));
    const occupied = propUnits.filter(u => u.status === "occupied").length;
    const monthlyIncome = propUnits.filter(u => u.status === "occupied").reduce((s, u) => s + parseFloat(u.rentAmount as string || "0"), 0);
    res.json({ ...updated, createdAt: updated.createdAt?.toISOString(), totalUnits: propUnits.length, occupiedUnits: occupied, monthlyIncome });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update property" });
  }
});

router.delete("/properties/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(propertiesTable).where(eq(propertiesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete property" });
  }
});

export default router;
