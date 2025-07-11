"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supplySheetRouter = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const kanbanHelpers_1 = require("../lib/kanbanHelpers");
exports.supplySheetRouter = express_1.default.Router();
exports.supplySheetRouter.get("/kanbans", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const isAdmin = user.role === "admin";
        const plantId = user.plantId;
        const whereClause = isAdmin && plantId === null
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kanbanRequests.acknowledgedByLogistics, true), (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.fulfilled, false))
            : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kanbanRequests.acknowledgedByLogistics, true), (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.fulfilled, false), (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.plantId, plantId));
        const orderByClause = (0, drizzle_orm_1.sql) `
      CASE
        WHEN ${schema_1.parts.supplyLocation} LIKE 'SA-%' THEN 1
        WHEN ${schema_1.parts.supplyLocation} LIKE 'MK1-%' THEN 2
        WHEN ${schema_1.parts.supplyLocation} LIKE 'MK2-%' THEN 3
        ELSE 4
      END,
      regexp_replace(${schema_1.parts.supplyLocation}, '[^0-9]', '', 'g')::int,
      ${schema_1.parts.supplyLocation},
      ${schema_1.kanbanRequests.acknowledgedAt}
    `;
        const kanbans = yield client_1.db
            .select({
            id: schema_1.kanbanRequests.id,
            process: schema_1.parts.process,
            partId: schema_1.kanbanRequests.partId,
            partName: schema_1.parts.name,
            supplyLocation: schema_1.parts.supplyLocation,
            acknowledgedAt: schema_1.kanbanRequests.acknowledgedAt,
        })
            .from(schema_1.kanbanRequests)
            .leftJoin(schema_1.stations, (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.stationId, schema_1.stations.id))
            .leftJoin(schema_1.parts, (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.partId, schema_1.parts.id))
            .leftJoin(schema_1.products, (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.productId, schema_1.products.id))
            .where(whereClause)
            .orderBy(orderByClause);
        return res.status(200).json(kanbans);
    }
    catch (err) {
        console.error("Error fetching kanbans:", err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
}));
exports.supplySheetRouter.get("/kanbans/count", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const isAdmin = user.role === "admin";
        const plantId = user.plantId;
        const whereClause = isAdmin && plantId === null
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kanbanRequests.acknowledgedByLogistics, true), (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.fulfilled, false))
            : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kanbanRequests.acknowledgedByLogistics, true), (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.fulfilled, false), (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.plantId, plantId));
        const result = yield client_1.db
            .select({ total: (0, drizzle_orm_1.count)() })
            .from(schema_1.kanbanRequests)
            .where(whereClause);
        return res.status(200).json({ total: (_b = (_a = result[0]) === null || _a === void 0 ? void 0 : _a.total) !== null && _b !== void 0 ? _b : 0 });
    }
    catch (err) {
        console.error("Error fetching kanban count:", err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
}));
exports.supplySheetRouter.put("/kanban", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.session.user;
    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const isAuthorized = user.role === "admin" || user.role === "supplier";
    if (!isAuthorized) {
        return res.status(403).json({ error: "Forbidden: Only admins and suppliers can update kanbans" });
    }
    const { kanbanIds } = req.body;
    console.log("Received request to update kanban in supply list:", kanbanIds);
    if (!Array.isArray(kanbanIds) || kanbanIds.length === 0) {
        return res.status(400).json({ error: "kanbanIds array is required" });
    }
    try {
        const fulfilled = true;
        const fulfilledAt = new Date();
        const result = yield client_1.db
            .update(schema_1.kanbanRequests)
            .set({ fulfilled, fulfilledAt })
            .where((0, drizzle_orm_1.inArray)(schema_1.kanbanRequests.id, kanbanIds))
            .returning();
        if (result.length === 0) {
            return res.status(404).json({ message: "Kanban not found" });
        }
        return res.status(200).json({ message: "Kanban updated successfully", updatedKanbans: result });
    }
    catch (error) {
        console.error("Error updating kanban:", error);
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
}));
exports.supplySheetRouter.delete("/kanban", (req, res) => {
    (0, kanbanHelpers_1.deleteKanban)(req, res);
});
