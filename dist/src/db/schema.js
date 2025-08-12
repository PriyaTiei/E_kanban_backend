"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settings = exports.kanbanActions = exports.processFreezeState = exports.frozenKanbans = exports.kanbanRequests = exports.users = exports.productEntryLogs = exports.productPartExceptions = exports.stationParts = exports.parts = exports.stations = exports.plants = exports.products = exports.kanbanActionTypeEnum = exports.userRoleEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.userRoleEnum = (0, pg_core_1.pgEnum)("user_role", ["logistics", "supplier", "admin"]);
exports.kanbanActionTypeEnum = (0, pg_core_1.pgEnum)("kanban_action_type", ["created", "acknowledged", "fulfilled"]);
exports.products = (0, pg_core_1.pgTable)("products", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    variant: (0, pg_core_1.varchar)("variant", { length: 50 }).notNull().unique(),
});
exports.plants = (0, pg_core_1.pgTable)("plants", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.varchar)("name", { length: 100 }).notNull().unique(),
});
exports.stations = (0, pg_core_1.pgTable)("stations", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.varchar)("name", { length: 50 }).notNull(),
    plantId: (0, pg_core_1.integer)("plant_id").references(() => exports.plants.id, { onDelete: "cascade" }).notNull().default(1),
});
exports.parts = (0, pg_core_1.pgTable)("parts", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.varchar)("name", { length: 50 }).notNull(),
    partId: (0, pg_core_1.varchar)("part_id", { length: 50 }),
    partNumber: (0, pg_core_1.varchar)("part_number", { length: 50 }),
    description: (0, pg_core_1.text)("description"),
});
exports.stationParts = (0, pg_core_1.pgTable)("station_parts", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    plantId: (0, pg_core_1.integer)("plant_id").references(() => exports.plants.id, { onDelete: "cascade" }).notNull().default(1),
    stationId: (0, pg_core_1.integer)("station_id").references(() => exports.stations.id, { onDelete: "cascade" }).notNull(),
    partId: (0, pg_core_1.integer)("part_id").references(() => exports.parts.id, { onDelete: "cascade" }).notNull(),
    allowed_for_all_products: (0, pg_core_1.boolean)("allowed_for_all_products").default(true).notNull(),
    process: (0, pg_core_1.integer)("process"),
    prepLocation: (0, pg_core_1.varchar)("prep-location", { length: 50 }),
    supplyLocation: (0, pg_core_1.varchar)("supply-location", { length: 50 }),
    consumptionPerProduct: (0, pg_core_1.integer)("consumption_per_product").notNull(),
    binQuantity: (0, pg_core_1.integer)("bin_quantity").notNull(),
    currentQuantity: (0, pg_core_1.integer)("current_quantity").notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull(),
    updatedBy: (0, pg_core_1.integer)("updated_by").references(() => exports.users.id, { onDelete: "cascade" }),
});
exports.productPartExceptions = (0, pg_core_1.pgTable)("product_part_exceptions", {
    productId: (0, pg_core_1.integer)("product_id").references(() => exports.products.id, { onDelete: "cascade" }).notNull(),
    partId: (0, pg_core_1.integer)("part_id").references(() => exports.parts.id, { onDelete: "cascade" }).notNull(),
}, (table) => {
    return [(0, pg_core_1.primaryKey)({ columns: [table.productId, table.partId] })];
});
exports.productEntryLogs = (0, pg_core_1.pgTable)("product_entry_logs", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    plantId: (0, pg_core_1.integer)("plant_id").references(() => exports.plants.id, { onDelete: "cascade" }).notNull().default(1),
    stationId: (0, pg_core_1.integer)("station_id").references(() => exports.stations.id, { onDelete: "cascade" }).notNull(),
    productId: (0, pg_core_1.integer)("product_id").references(() => exports.products.id, { onDelete: "cascade" }).notNull(),
    timestamp: (0, pg_core_1.timestamp)("timestamp", { withTimezone: true }).defaultNow().notNull(),
});
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    username: (0, pg_core_1.varchar)("username", { length: 50 }).notNull().unique(),
    password: (0, pg_core_1.text)("password").notNull(),
    role: (0, exports.userRoleEnum)("role").notNull(),
    plantId: (0, pg_core_1.integer)("plant_id").references(() => exports.plants.id, { onDelete: "cascade" }),
});
exports.kanbanRequests = (0, pg_core_1.pgTable)("kanban_requests", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    plantId: (0, pg_core_1.integer)("plant_id").references(() => exports.plants.id, { onDelete: "cascade" }).notNull().default(1),
    stationId: (0, pg_core_1.integer)("station_id").references(() => exports.stations.id, { onDelete: "cascade" }).notNull(),
    partId: (0, pg_core_1.integer)("part_id").references(() => exports.parts.id, { onDelete: "cascade" }).notNull(),
    productId: (0, pg_core_1.integer)("product_id").references(() => exports.products.id, { onDelete: "cascade" }).notNull(),
    requestedAt: (0, pg_core_1.timestamp)("requested_at", { withTimezone: true }).defaultNow().notNull(),
    acknowledgedByLogistics: (0, pg_core_1.boolean)("acknowledged_by_logistics").default(false).notNull(),
    acknowledgedAt: (0, pg_core_1.timestamp)("acknowledged_at", { withTimezone: true }),
    fulfilled: (0, pg_core_1.boolean)("fulfilled").default(false).notNull(),
    fulfilledAt: (0, pg_core_1.timestamp)("fulfilled_at", { withTimezone: true }),
});
exports.frozenKanbans = (0, pg_core_1.pgTable)("frozen_kanbans", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    process: (0, pg_core_1.integer)("process").notNull(),
    kanbanId: (0, pg_core_1.integer)("kanban_id").references(() => exports.kanbanRequests.id, { onDelete: "cascade" }).notNull(),
    frozenAt: (0, pg_core_1.timestamp)("frozen_at", { withTimezone: true }).defaultNow().notNull(),
});
exports.processFreezeState = (0, pg_core_1.pgTable)("process_freeze_state", {
    process: (0, pg_core_1.integer)("process").primaryKey(),
    isFrozen: (0, pg_core_1.boolean)("is_frozen").notNull().default(false),
    frozenAt: (0, pg_core_1.timestamp)("frozen_at", { withTimezone: true }),
});
exports.kanbanActions = (0, pg_core_1.pgTable)("kanban_actions", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    kanbanId: (0, pg_core_1.integer)("kanban_id").references(() => exports.kanbanRequests.id, { onDelete: "cascade" }).notNull(),
    userId: (0, pg_core_1.integer)("user_id").references(() => exports.users.id, { onDelete: "cascade" }).notNull(),
    actionType: (0, exports.kanbanActionTypeEnum)("action_type").notNull(),
    timestamp: (0, pg_core_1.timestamp)("timestamp", { withTimezone: true }).defaultNow().notNull(),
});
exports.settings = (0, pg_core_1.pgTable)("settings", {
    key: (0, pg_core_1.text)("key").primaryKey(),
    value: (0, pg_core_1.text)("value").notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
});
