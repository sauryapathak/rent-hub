import { pgTable, serial, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  unitId: integer("unit_id").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  partialAmount: numeric("partial_amount", { precision: 12, scale: 2 }),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  status: text("status").notNull().default("pending"),
  mode: text("mode").notNull().default("cash"),
  upiTransactionId: text("upi_transaction_id"),
  paidAt: text("paid_at"),
  dueDate: text("due_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
