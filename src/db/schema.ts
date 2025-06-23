import { pgTable, serial, varchar ,text, integer, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";

export const productVariantEnum = pgEnum("product_variant", ["328", "319", "425"]);
export const userRoleEnum = pgEnum("user_role", ["logistics", "supplier", "admin"]);
export const kanbanActionTypeEnum = pgEnum("kanban_action_type", ["created", "acknowledged", "fulfilled"]);

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  variant: productVariantEnum("variant").notNull(), 
});

export const plants = pgTable("plants", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
});

export const stations = pgTable("stations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  plantId: integer("plant_id").references(() => plants.id).notNull().default(1),
});

export const parts = pgTable("parts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  process: integer("process"),
  prepLocation: varchar("prep-location", { length: 50 }),
  supplyLocation: varchar("supply-location", { length: 50 }),
});

export const stationParts = pgTable("station_parts", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").references(() => plants.id).notNull().default(1),
  stationId: integer("station_id").references(() => stations.id).notNull(),
  partId: integer("part_id").references(() => parts.id).notNull(),
  productId: integer("product_id").references(() => products.id),
  exceptionProductId: integer("exception_product_id").references(() => products.id),
  consumptionPerProduct: integer("consumption_per_product").notNull(),
  binQuantity: integer("bin_quantity").notNull(),
  currentQuantity: integer("current_quantity").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  updatedBy: integer("updated_by").references(() => users.id),
});

export const productEntryLogs = pgTable("product_entry_logs", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").references(() => plants.id).notNull().default(1),
  stationId: integer("station_id").references(() => stations.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull(),
  plantId: integer("plant_id").references(() => plants.id),
});

export const kanbanRequests = pgTable("kanban_requests", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").references(() => plants.id).notNull().default(1),
  stationId: integer("station_id").references(() => stations.id).notNull(),
  partId: integer("part_id").references(() => parts.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
  acknowledgedByLogistics: boolean("acknowledged_by_logistics").default(false).notNull(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  fulfilled: boolean("fulfilled").default(false).notNull(),
  fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
});

// Table to store frozen kanbans for a process
export const frozenKanbans = pgTable("frozen_kanbans", {
  id: serial("id").primaryKey(),
  process: integer("process").notNull(),
  kanbanId: integer("kanban_id").references(() => kanbanRequests.id).notNull(),
  frozenAt: timestamp("frozen_at", { withTimezone: true }).defaultNow().notNull(),
});

// Table to track whether a process is frozen or not
export const processFreezeState = pgTable("process_freeze_state", {
  process: integer("process").primaryKey(),
  isFrozen: boolean("is_frozen").notNull().default(false),
  frozenAt: timestamp("frozen_at", { withTimezone: true }),
});

export const kanbanActions = pgTable("kanban_actions", {
  id: serial("id").primaryKey(),
  kanbanId: integer("kanban_id").references(() => kanbanRequests.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  actionType: kanbanActionTypeEnum("action_type").notNull(), 
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(), // can store timestamps, JSON, etc.
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
