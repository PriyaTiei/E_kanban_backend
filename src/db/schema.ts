import { pgTable, serial, varchar ,text, integer, timestamp, boolean, pgEnum, primaryKey } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["logistics", "supplier", "admin"]);
export const kanbanActionTypeEnum = pgEnum("kanban_action_type", ["created", "acknowledged", "fulfilled"]);


export const plants = pgTable("plants", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  plantId: integer("plant_id").unique(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  variant: varchar("variant", { length: 50 }).notNull().unique(),
  plantId: integer("plant_id").references(() => plants.id, { onDelete: "cascade" }).notNull().default(1), 
});

export const stations = pgTable("stations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  sequenceNo: integer("sequence_no").unique(),
  plantId: integer("plant_id").references(() => plants.id, { onDelete: "cascade" }).notNull().default(1),
});

export const parts = pgTable("parts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  partId: varchar("part_id", { length: 50 }),
  partNumber: varchar("part_number", { length: 50 }),
  description: text("description"),
  plantId: integer("plant_id").references(() => plants.id, { onDelete: "cascade" }).notNull().default(1),
});

export const stationParts = pgTable("station_parts", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").references(() => plants.id, { onDelete: "cascade" }).notNull().default(1),
  stationId: integer("station_id").references(() => stations.id, { onDelete: "cascade" }).notNull(),
  partId: integer("part_id").references(() => parts.id, { onDelete: "cascade" }).notNull(),
  allowed_for_all_products: boolean("allowed_for_all_products").default(true).notNull(),
  process: varchar("process", { length: 20 }),
  prepLocation: varchar("prep-location", { length: 50 }),
  supplyLocation: varchar("supply-location", { length: 50 }),
  consumptionPerProduct: integer("consumption_per_product").notNull(),
  binQuantity: integer("bin_quantity").notNull(),
  currentQuantity: integer("current_quantity").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: "cascade" }),
});

export const productPartExceptions = pgTable("product_part_exceptions", {
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  partId: integer("part_id").references(() => parts.id, { onDelete: "cascade" }).notNull(),
  plantId: integer("plant_id").references(() => plants.id, { onDelete: "cascade" }).notNull().default(1),
}, (table) => {
  return [primaryKey({ columns: [table.productId, table.partId] })];
});

export const productEntryLogs = pgTable("product_entry_logs", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").references(() => plants.id, { onDelete: "cascade" }).notNull().default(1),
  stationId: integer("station_id").references(() => stations.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull(),
  plantId: integer("plant_id").references(() => plants.id, { onDelete: "cascade" }),
});

export const kanbanRequests = pgTable("kanban_requests", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").references(() => plants.id, { onDelete: "cascade" }).notNull().default(1),
  stationPartsId: integer("station_parts_id").references(() => stationParts.id, { onDelete: "cascade" }),
  partId: integer("part_id").references(() => parts.id, { onDelete: "cascade" }),
  // TODO: Remove these columns after old kanbans are cleared.
  stationId: integer("station_id").references(() => stations.id, { onDelete: "cascade" }),
  process: varchar("process", { length: 20 }),
  supplyLocation: varchar("supply-location", { length: 50 }),
  // ----------
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }),
  requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
  acknowledgedByLogistics: boolean("acknowledged_by_logistics").default(false).notNull(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  fulfilled: boolean("fulfilled").default(false).notNull(),
  fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
});

export const delayKanbans = pgTable("delay_kanbans", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").references(() => plants.id, { onDelete: "cascade" }).notNull().default(1),
  kanbanId: integer("kanban_id").references(() => kanbanRequests.id, { onDelete: "cascade" }),
  reportedAt: timestamp("reported_at", { withTimezone: true }).defaultNow().notNull(),
  arrangedByLogistics: boolean("arranged_by_logistics").default(false).notNull(),
  arrangedAt: timestamp("arranged_at", { withTimezone: true }),
});

export const frozenKanbans = pgTable("frozen_kanbans", {
  id: serial("id").primaryKey(),
  process: varchar("process", { length: 20 }).notNull(),
  kanbanId: integer("kanban_id").references(() => kanbanRequests.id, { onDelete: "cascade" }).notNull(),
  frozenAt: timestamp("frozen_at", { withTimezone: true }).defaultNow().notNull(),
});

export const processFreezeState = pgTable("process_freeze_state", {
  process: varchar("process", { length: 20 }).primaryKey(),
  plantId: integer("plant_id").references(() => plants.id, { onDelete: "cascade" }).default(1),
  isFrozen: boolean("is_frozen").notNull().default(false),
  frozenAt: timestamp("frozen_at", { withTimezone: true }),
});

export const kanbanActions = pgTable("kanban_actions", {
  id: serial("id").primaryKey(),
  kanbanId: integer("kanban_id").references(() => kanbanRequests.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  actionType: kanbanActionTypeEnum("action_type").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
