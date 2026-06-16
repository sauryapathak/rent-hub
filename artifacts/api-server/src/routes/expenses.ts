import { Router } from "express";
import { db } from "@workspace/db";
import { expensesTable, propertiesTable, unitsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

function enrichExpense(e: any, properties: any[], units: any[]) {
  const prop = properties.find(p => p.id === e.propertyId);
  const unit = units.find(u => u.id === e.unitId);
  return {
    ...e,
    createdAt: e.createdAt?.toISOString(),
    amount: parseFloat(e.amount as string || "0"),
    propertyName: prop?.name || null,
    unitNumber: unit?.unitNumber || null,
  };
}

router.get("/expenses", async (req, res) => {
  try {
    const expenses = await db.select().from(expensesTable).orderBy(sql`date DESC`);
    const properties = await db.select().from(propertiesTable);
    const units = await db.select().from(unitsTable);
    res.json(expenses.map(e => enrichExpense(e, properties, units)));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

router.post("/expenses", async (req, res) => {
  try {
    const { propertyId, unitId, category, amount, date, description, receiptUrl } = req.body;
    if (!propertyId || !category || !amount || !date || !description) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const [created] = await db.insert(expensesTable).values({
      propertyId,
      unitId: unitId || null,
      category,
      amount: String(amount),
      date,
      description,
      receiptUrl: receiptUrl || null,
    }).returning();
    const properties = await db.select().from(propertiesTable);
    const units = await db.select().from(unitsTable);
    res.status(201).json(enrichExpense(created, properties, units));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create expense" });
  }
});

router.patch("/expenses/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates: any = {};
    const fields = ["category", "amount", "date", "description", "receiptUrl"];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (f === "amount") updates[f] = String(req.body[f]);
        else updates[f] = req.body[f];
      }
    }
    const [updated] = await db.update(expensesTable).set(updates).where(eq(expensesTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Expense not found" });
    const properties = await db.select().from(propertiesTable);
    const units = await db.select().from(unitsTable);
    res.json(enrichExpense(updated, properties, units));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update expense" });
  }
});

router.delete("/expenses/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(expensesTable).where(eq(expensesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

router.get("/expenses/summary", async (req, res) => {
  try {
    const expenses = await db.select().from(expensesTable);
    const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount as string || "0"), 0);
    const categoryMap: Record<string, number> = {};
    for (const e of expenses) {
      const cat = e.category || "other";
      categoryMap[cat] = (categoryMap[cat] || 0) + parseFloat(e.amount as string || "0");
    }
    const categories = Object.entries(categoryMap).map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
    res.json({ total, categories });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch expense summary" });
  }
});

export default router;
