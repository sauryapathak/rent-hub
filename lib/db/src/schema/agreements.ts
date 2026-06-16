import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const agreementsTable = pgTable("agreements", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  unitId: integer("unit_id").notNull(),
  type: text("type").notNull().default("residential"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  rentAmount: numeric("rent_amount", { precision: 12, scale: 2 }).notNull(),
  depositAmount: numeric("deposit_amount", { precision: 12, scale: 2 }).notNull(),
  noticePeriodDays: integer("notice_period_days").default(30),
  terms: text("terms"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAgreementSchema = createInsertSchema(agreementsTable).omit({ id: true, createdAt: true });
export type InsertAgreement = z.infer<typeof insertAgreementSchema>;
export type Agreement = typeof agreementsTable.$inferSelect;
