import { Router } from "express";
import { db } from "@workspace/db";
import { vendorsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

function formatVendor(v: any) {
  return {
    ...v,
    createdAt: v.createdAt?.toISOString(),
    rating: v.rating ? parseFloat(v.rating as string) : null,
  };
}

router.get("/vendors", async (req, res) => {
  try {
    const vendors = await db.select().from(vendorsTable).orderBy(sql`created_at DESC`);
    res.json(vendors.map(formatVendor));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

router.post("/vendors", async (req, res) => {
  try {
    const { name, phone, email, category, rating, rateCard, notes } = req.body;
    if (!name || !phone || !category) return res.status(400).json({ error: "name, phone, category are required" });
    const [created] = await db.insert(vendorsTable).values({
      name, phone,
      email: email || null,
      category,
      rating: rating ? String(rating) : null,
      rateCard: rateCard || null,
      available: true,
      notes: notes || null,
    }).returning();
    res.status(201).json(formatVendor(created));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create vendor" });
  }
});

router.get("/vendors/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [v] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, id));
    if (!v) return res.status(404).json({ error: "Vendor not found" });
    res.json(formatVendor(v));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch vendor" });
  }
});

router.patch("/vendors/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates: any = {};
    const fields = ["name", "phone", "email", "category", "rating", "rateCard", "available", "notes"];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (f === "rating") updates[f] = String(req.body[f]);
        else updates[f] = req.body[f];
      }
    }
    const [updated] = await db.update(vendorsTable).set(updates).where(eq(vendorsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Vendor not found" });
    res.json(formatVendor(updated));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update vendor" });
  }
});

router.delete("/vendors/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(vendorsTable).where(eq(vendorsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete vendor" });
  }
});

export default router;
