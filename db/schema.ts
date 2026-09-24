import { sql } from "drizzle-orm";
import { bigint, boolean, index, integer, pgTable, serial, text, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("operador"),
  active: boolean("active").notNull().default(true),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: bigint("locked_until", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => [index("idx_users_role").on(table.role)]);

export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => [index("idx_sessions_user_id").on(table.userId), index("idx_sessions_expires_at").on(table.expiresAt)]);

export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  normalizedName: text("normalized_name").notNull(),
  normalizedCategory: text("normalized_category").notNull(),
  quantity: integer("quantity").notNull().default(0),
  minStock: integer("min_stock").notNull().default(4),
  archivedAt: bigint("archived_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => [
  index("idx_inventory_identity").on(table.normalizedName, table.normalizedCategory),
  uniqueIndex("uq_inventory_active_identity")
    .on(table.normalizedName, table.normalizedCategory)
    .where(sql`${table.archivedAt} is null`),
  index("idx_inventory_archived_at").on(table.archivedAt),
]);

export const inventoryMovements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").references(() => inventoryItems.id, { onDelete: "set null" }),
  itemName: text("item_name").notNull(),
  action: text("action").notNull(),
  quantity: integer("quantity").notNull().default(0),
  sector: text("sector"),
  recipient: text("recipient"),
  notes: text("notes"),
  actorName: text("actor_name").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
}, (table) => [index("idx_movements_item_id").on(table.itemId), index("idx_movements_created_at").on(table.createdAt)]);

export const visits = pgTable("visits", {
  id: serial("id").primaryKey(),
  visitDate: text("visit_date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  institution: text("institution").notNull(),
  responsible: text("responsible").notNull(),
  visitors: integer("visitors").notNull(),
  status: text("status").notNull().default("agendada"),
  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
}, (table) => [
  index("idx_visits_date").on(table.visitDate),
  index("idx_visits_date_time").on(table.visitDate, table.startTime),
  index("idx_visits_status").on(table.status),
]);
