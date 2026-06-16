import { pgTable, serial, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const maintenanceTable = pgTable("maintenance_requests", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").notNull(),
  tenantId: integer("tenant_id").notNull(),
  category: text("category").notNull().default("other"),
  description: text("description").notNull(),
  status: text("status").notNull().default("raised"),
  priority: text("priority").notNull().default("medium"),
  assignedVendorId: integer("assigned_vendor_id"),
  cost: numeric("cost", { precision: 12, scale: 2 }),
  deductFromDeposit: boolean("deduct_from_deposit").default(false).notNull(),
  resolvedAt: text("resolved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMaintenanceSchema = createInsertSchema(maintenanceTable).omit({ id: true, createdAt: true });
export type InsertMaintenance = z.infer<typeof insertMaintenanceSchema>;
export type Maintenance = typeof maintenanceTable.$inferSelect;
