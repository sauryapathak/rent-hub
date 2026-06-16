import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tenantsTable = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  photo: text("photo"),
  aadhaarNumber: text("aadhaar_number"),
  panNumber: text("pan_number"),
  employer: text("employer"),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  policeVerified: boolean("police_verified").default(false).notNull(),
  kycStatus: text("kyc_status").default("pending").notNull(),
  unitId: integer("unit_id"),
  moveInDate: text("move_in_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTenantSchema = createInsertSchema(tenantsTable).omit({ id: true, createdAt: true });
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenantsTable.$inferSelect;
