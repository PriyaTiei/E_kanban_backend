import { pgTable, serial, varchar ,text, integer, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";

export const productVariantEnum = pgEnum("product_variant", ["328", "319", "425"]);
export const userRoleEnum = pgEnum("user_role", ["logistics", "supplier", "admin"]);
export const kanbanActionTypeEnum = pgEnum("kanban_action_type", ["created", "acknowledged", "fulfilled"]);

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  variant: productVariantEnum("variant").notNull(), 
});

export const stations = pgTable("stations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
});

export const parts = pgTable("parts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
});

export const stationParts = pgTable("station_parts", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").references(() => stations.id).notNull(),
  partId: integer("part_id").references(() => parts.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  consumptionPerProduct: integer("consumption_per_product").notNull(),
  binQuantity: integer("bin_quantity").notNull(),
  currentQuantity: integer("current_quantity").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  updatedBy: integer("updated_by").references(() => users.id),
});

export const productEntryLogs = pgTable("product_entry_logs", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  stationId: integer("station_id").references(() => stations.id).notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  role: userRoleEnum("role").notNull(), 
});

export const kanbanRequests = pgTable("kanban_requests", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").references(() => stations.id).notNull(),
  partId: integer("part_id").references(() => parts.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
  acknowledgedByLogistics: boolean("acknowledged_by_logistics").default(false).notNull(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  fulfilled: boolean("fulfilled").default(false).notNull(),
  fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
});

export const kanbanActions = pgTable("kanban_actions", {
  id: serial("id").primaryKey(),
  kanbanId: integer("kanban_id").references(() => kanbanRequests.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  actionType: kanbanActionTypeEnum("action_type").notNull(), 
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
});
