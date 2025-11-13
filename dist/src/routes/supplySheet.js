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
// *****Joining with stationParts based on partId might incorrect data since partId in stationParts is not unique*****
exports.supplySheetRouter.get("/kanbans", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const processFilter = req.query.process ? String(req.query.process) : null;
        const searchFilter = req.query.search ? String(req.query.search) : null;
        console.log(`processFilter: ${processFilter}, searchFilter: ${searchFilter}`);
        const plantId = user.plantId;
        // pagination details from query params, e.g., /kanbans?page=1&limit=20
        const page = req.query.page ? Math.max(1, Number(req.query.page)) : 1;
        const limit = req.query.limit ? Math.min(100, Math.max(1, Number(req.query.limit))) : 20;
        const offset = (page - 1) * limit;
        let whereClause = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kanbanRequests.acknowledgedByLogistics, true), (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.fulfilled, false), (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.plantId, plantId));
        if (searchFilter) {
            whereClause = (0, drizzle_orm_1.and)(whereClause, (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.parts.partId, `%${searchFilter}%`), (0, drizzle_orm_1.ilike)(schema_1.stationParts.prepLocation, `%${searchFilter}%`), (0, drizzle_orm_1.ilike)(schema_1.stationParts.supplyLocation, `%${searchFilter}%`)));
        }
        // query for all unique processes
        const processes = yield client_1.db
            .selectDistinct({ process: schema_1.stationParts.process })
            .from(schema_1.kanbanRequests)
            .leftJoin(schema_1.parts, (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.partId, schema_1.parts.id))
            .leftJoin(schema_1.stationParts, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kanbanRequests.stationId, schema_1.stationParts.stationId), (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.partId, schema_1.stationParts.partId)))
            .where(whereClause)
            .orderBy((0, drizzle_orm_1.asc)(schema_1.stationParts.process));
        const uniqueProcesses = processes.map(row => row.process).filter(p => p !== null);
        const orderByClause = (0, drizzle_orm_1.sql) `
      CASE
        WHEN ${schema_1.stationParts.supplyLocation} LIKE 'SA-%' THEN 1
        WHEN ${schema_1.stationParts.supplyLocation} LIKE 'MK1-%' THEN 2
        WHEN ${schema_1.stationParts.supplyLocation} LIKE 'MK2-%' THEN 3
        ELSE 4
      END,
      regexp_replace(${schema_1.stationParts.supplyLocation}, '[^0-9]', '', 'g')::int,
      ${schema_1.stationParts.supplyLocation},
      ${schema_1.kanbanRequests.partId}
    `;
        if (!processFilter) {
            const kanbans = yield client_1.db
                .select({
                id: schema_1.kanbanRequests.id,
                process: schema_1.stationParts.process,
                partId: schema_1.kanbanRequests.partId,
                partIdNo: schema_1.parts.partId,
                partName: schema_1.parts.name,
                supplyLocation: schema_1.stationParts.supplyLocation,
                acknowledgedAt: schema_1.kanbanRequests.acknowledgedAt,
            })
                .from(schema_1.kanbanRequests)
                .leftJoin(schema_1.stations, (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.stationId, schema_1.stations.id))
                .leftJoin(schema_1.parts, (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.partId, schema_1.parts.id))
                .leftJoin(schema_1.stationParts, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kanbanRequests.stationId, schema_1.stationParts.stationId), (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.partId, schema_1.stationParts.partId)))
                // .leftJoin(products, eq(kanbanRequests.productId, products.id))
                .where(whereClause)
                .orderBy(orderByClause)
                .limit(limit)
                .offset(offset);
            const total = yield client_1.db
                .select({ total: (0, drizzle_orm_1.count)() })
                .from(schema_1.kanbanRequests)
                .leftJoin(schema_1.parts, (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.partId, schema_1.parts.id))
                .leftJoin(schema_1.stationParts, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kanbanRequests.stationId, schema_1.stationParts.stationId), (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.partId, schema_1.stationParts.partId)))
                .where(whereClause);
            const totalPages = Math.ceil(((_b = (_a = total[0]) === null || _a === void 0 ? void 0 : _a.total) !== null && _b !== void 0 ? _b : 0) / limit);
            return res.status(200).json({ kanbans, processes: uniqueProcesses, totalPages });
        }
        else {
            const kanbans = yield client_1.db
                .select({
                id: schema_1.kanbanRequests.id,
                process: schema_1.stationParts.process,
                partId: schema_1.kanbanRequests.partId,
                partIdNo: schema_1.parts.partId,
                partName: schema_1.parts.name,
                supplyLocation: schema_1.stationParts.supplyLocation,
                acknowledgedAt: schema_1.kanbanRequests.acknowledgedAt,
            })
                .from(schema_1.kanbanRequests)
                .leftJoin(schema_1.stations, (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.stationId, schema_1.stations.id))
                .leftJoin(schema_1.parts, (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.partId, schema_1.parts.id))
                .leftJoin(schema_1.stationParts, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kanbanRequests.stationId, schema_1.stationParts.stationId), (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.partId, schema_1.stationParts.partId)))
                // .leftJoin(products, eq(kanbanRequests.productId, products.id))
                .where((0, drizzle_orm_1.and)(whereClause, (0, drizzle_orm_1.eq)(schema_1.stationParts.process, processFilter)))
                .orderBy(orderByClause)
                .limit(limit)
                .offset(offset);
            const total = yield client_1.db
                .select({ total: (0, drizzle_orm_1.count)() })
                .from(schema_1.kanbanRequests)
                .leftJoin(schema_1.parts, (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.partId, schema_1.parts.id))
                .leftJoin(schema_1.stationParts, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kanbanRequests.stationId, schema_1.stationParts.stationId), (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.partId, schema_1.stationParts.partId)))
                .where((0, drizzle_orm_1.and)(whereClause, (0, drizzle_orm_1.eq)(schema_1.stationParts.process, processFilter)));
            const totalPages = Math.ceil(((_d = (_c = total[0]) === null || _c === void 0 ? void 0 : _c.total) !== null && _d !== void 0 ? _d : 0) / limit);
            return res.status(200).json({ kanbans, processes: uniqueProcesses, totalPages });
        }
    }
    catch (err) {
        console.error("Error fetching kanbans:", err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
}));
exports.supplySheetRouter.get("/kanbans/count", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const process = ((_a = req.query) === null || _a === void 0 ? void 0 : _a.process) ? String(req.query.process) : null;
        const plantId = user.plantId;
        const baseWhereClause = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kanbanRequests.acknowledgedByLogistics, true), (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.fulfilled, false));
        const processWhereClause = process ? (0, drizzle_orm_1.eq)(schema_1.stationParts.process, process) : (0, drizzle_orm_1.sql) `1=1`;
        const plantWhereClause = (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.plantId, plantId);
        const whereClause = (0, drizzle_orm_1.and)(baseWhereClause, processWhereClause, plantWhereClause);
        const result = yield client_1.db
            .select({ total: (0, drizzle_orm_1.count)() })
            .from(schema_1.kanbanRequests)
            .leftJoin(schema_1.stationParts, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kanbanRequests.stationId, schema_1.stationParts.stationId), (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.partId, schema_1.stationParts.partId)))
            .where(whereClause);
        return res.status(200).json({ total: (_c = (_b = result[0]) === null || _b === void 0 ? void 0 : _b.total) !== null && _c !== void 0 ? _c : 0 });
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
exports.supplySheetRouter.put("/kanban/all", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.session.user;
    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const isAuthorized = user.role === "admin" || user.role === "logistics";
    if (!isAuthorized) {
        return res.status(403).json({ error: "Forbidden: Only admins and logistics can update kanbans" });
    }
    const { process } = req.query;
    console.log(`Received request to update all kanban in supply list ${process && `for process: ${process}`}`);
    try {
        const plantId = user.plantId;
        const fulfilled = true;
        const fulfilledAt = new Date();
        const whereClause = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kanbanRequests.acknowledgedByLogistics, true), (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.plantId, plantId), process ? (0, drizzle_orm_1.eq)(schema_1.stationParts.process, String(process)) : (0, drizzle_orm_1.sql) `1=1`);
        const kanbansToUpdate = yield client_1.db
            .select({ id: schema_1.kanbanRequests.id })
            .from(schema_1.kanbanRequests)
            .leftJoin(schema_1.stationParts, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kanbanRequests.stationId, schema_1.stationParts.stationId), (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.partId, schema_1.stationParts.partId)))
            .where(whereClause)
            .orderBy((0, drizzle_orm_1.asc)(schema_1.kanbanRequests.requestedAt));
        if (kanbansToUpdate.length === 0) {
            console.log("Kanban not found");
            return res.status(404).json({ message: "Kanban not found" });
        }
        const result = yield client_1.db
            .update(schema_1.kanbanRequests)
            .set({ fulfilled, fulfilledAt })
            .where((0, drizzle_orm_1.inArray)(schema_1.kanbanRequests.id, kanbansToUpdate.map(k => k.id)))
            .returning();
        if (result.length === 0) {
            console.log("Kanban not found");
            return res.status(404).json({ message: "Kanban not found" });
        }
        console.log("Supply Kanbans updated successfully:", result);
        return res.status(200).json({ message: "Kanban updated successfully", updatedKanbans: result });
    }
    catch (error) {
        console.log("Error updating kanban:", error);
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
}));
exports.supplySheetRouter.delete("/kanban", (req, res) => {
    (0, kanbanHelpers_1.deleteKanban)(req, res);
});
