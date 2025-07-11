"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settings = exports.kanbanActions = exports.processFreezeState = exports.frozenKanbans = exports.kanbanRequests = exports.users = exports.productEntryLogs = exports.stationParts = exports.parts = exports.stations = exports.plants = exports.products = exports.kanbanActionTypeEnum = exports.userRoleEnum = exports.productVariantEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.productVariantEnum = (0, pg_core_1.pgEnum)("product_variant", ["328", "319", "425"]);
exports.userRoleEnum = (0, pg_core_1.pgEnum)("user_role", ["logistics", "supplier", "admin"]);
exports.kanbanActionTypeEnum = (0, pg_core_1.pgEnum)("kanban_action_type", ["created", "acknowledged", "fulfilled"]);
exports.products = (0, pg_core_1.pgTable)("products", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    variant: (0, exports.productVariantEnum)("variant").notNull(),
});
exports.plants = (0, pg_core_1.pgTable)("plants", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.varchar)("name", { length: 100 }).notNull().unique(),
});
exports.stations = (0, pg_core_1.pgTable)("stations", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.varchar)("name", { length: 50 }).notNull(),
    plantId: (0, pg_core_1.integer)("plant_id").references(() => exports.plants.id).notNull().default(1),
});
exports.parts = (0, pg_core_1.pgTable)("parts", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.varchar)("name", { length: 50 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    process: (0, pg_core_1.integer)("process"),
    prepLocation: (0, pg_core_1.varchar)("prep-location", { length: 50 }),
    supplyLocation: (0, pg_core_1.varchar)("supply-location", { length: 50 }),
});
exports.stationParts = (0, pg_core_1.pgTable)("station_parts", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    plantId: (0, pg_core_1.integer)("plant_id").references(() => exports.plants.id).notNull().default(1),
    stationId: (0, pg_core_1.integer)("station_id").references(() => exports.stations.id).notNull(),
    partId: (0, pg_core_1.integer)("part_id").references(() => exports.parts.id).notNull(),
    productId: (0, pg_core_1.integer)("product_id").references(() => exports.products.id),
    exceptionProductId: (0, pg_core_1.integer)("exception_product_id").references(() => exports.products.id),
    consumptionPerProduct: (0, pg_core_1.integer)("consumption_per_product").notNull(),
    binQuantity: (0, pg_core_1.integer)("bin_quantity").notNull(),
    currentQuantity: (0, pg_core_1.integer)("current_quantity").notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow().notNull(),
    updatedBy: (0, pg_core_1.integer)("updated_by").references(() => exports.users.id),
});
exports.productEntryLogs = (0, pg_core_1.pgTable)("product_entry_logs", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    plantId: (0, pg_core_1.integer)("plant_id").references(() => exports.plants.id).notNull().default(1),
    stationId: (0, pg_core_1.integer)("station_id").references(() => exports.stations.id).notNull(),
    productId: (0, pg_core_1.integer)("product_id").references(() => exports.products.id).notNull(),
    timestamp: (0, pg_core_1.timestamp)("timestamp", { withTimezone: true }).defaultNow().notNull(),
});
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    username: (0, pg_core_1.varchar)("username", { length: 50 }).notNull().unique(),
    password: (0, pg_core_1.text)("password").notNull(),
    role: (0, exports.userRoleEnum)("role").notNull(),
    plantId: (0, pg_core_1.integer)("plant_id").references(() => exports.plants.id),
});
exports.kanbanRequests = (0, pg_core_1.pgTable)("kanban_requests", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    plantId: (0, pg_core_1.integer)("plant_id").references(() => exports.plants.id).notNull().default(1),
    stationId: (0, pg_core_1.integer)("station_id").references(() => exports.stations.id).notNull(),
    partId: (0, pg_core_1.integer)("part_id").references(() => exports.parts.id).notNull(),
    productId: (0, pg_core_1.integer)("product_id").references(() => exports.products.id).notNull(),
    requestedAt: (0, pg_core_1.timestamp)("requested_at", { withTimezone: true }).defaultNow().notNull(),
    acknowledgedByLogistics: (0, pg_core_1.boolean)("acknowledged_by_logistics").default(false).notNull(),
    acknowledgedAt: (0, pg_core_1.timestamp)("acknowledged_at", { withTimezone: true }),
    fulfilled: (0, pg_core_1.boolean)("fulfilled").default(false).notNull(),
    fulfilledAt: (0, pg_core_1.timestamp)("fulfilled_at", { withTimezone: true }),
});
// Table to store frozen kanbans for a process
exports.frozenKanbans = (0, pg_core_1.pgTable)("frozen_kanbans", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    process: (0, pg_core_1.integer)("process").notNull(),
    kanbanId: (0, pg_core_1.integer)("kanban_id").references(() => exports.kanbanRequests.id).notNull(),
    frozenAt: (0, pg_core_1.timestamp)("frozen_at", { withTimezone: true }).defaultNow().notNull(),
});
// Table to track whether a process is frozen or not
exports.processFreezeState = (0, pg_core_1.pgTable)("process_freeze_state", {
    process: (0, pg_core_1.integer)("process").primaryKey(),
    isFrozen: (0, pg_core_1.boolean)("is_frozen").notNull().default(false),
    frozenAt: (0, pg_core_1.timestamp)("frozen_at", { withTimezone: true }),
});
exports.kanbanActions = (0, pg_core_1.pgTable)("kanban_actions", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    kanbanId: (0, pg_core_1.integer)("kanban_id").references(() => exports.kanbanRequests.id).notNull(),
    userId: (0, pg_core_1.integer)("user_id").references(() => exports.users.id).notNull(),
    actionType: (0, exports.kanbanActionTypeEnum)("action_type").notNull(),
    timestamp: (0, pg_core_1.timestamp)("timestamp", { withTimezone: true }).defaultNow().notNull(),
});
exports.settings = (0, pg_core_1.pgTable)("settings", {
    key: (0, pg_core_1.text)("key").primaryKey(),
    value: (0, pg_core_1.text)("value").notNull(), // can store timestamps, JSON, etc.
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true }).defaultNow(),
});
