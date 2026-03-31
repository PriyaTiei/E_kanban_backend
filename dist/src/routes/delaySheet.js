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
exports.delaySheetRouter = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
exports.delaySheetRouter = express_1.default.Router();
exports.delaySheetRouter.get("/kanbans", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
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
        let whereClause = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.delayKanbans.arrangedByLogistics, false), (0, drizzle_orm_1.eq)(schema_1.delayKanbans.plantId, plantId));
        const stationPartsJoinCondition = (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.stationPartsId, schema_1.stationParts.id);
        if (searchFilter) {
            whereClause = (0, drizzle_orm_1.and)(whereClause, (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.parts.partId, `%${searchFilter}%`), (0, drizzle_orm_1.ilike)(schema_1.stationParts.prepLocation, `%${searchFilter}%`), (0, drizzle_orm_1.ilike)(schema_1.stationParts.supplyLocation, `%${searchFilter}%`)));
        }
        // query for all unique processes
        const processes = yield client_1.db
            .selectDistinct({ process: schema_1.stationParts.process })
            .from(schema_1.delayKanbans)
            .innerJoin(schema_1.kanbanRequests, (0, drizzle_orm_1.eq)(schema_1.delayKanbans.kanbanId, schema_1.kanbanRequests.id))
            .leftJoin(schema_1.stationParts, stationPartsJoinCondition)
            .leftJoin(schema_1.parts, (0, drizzle_orm_1.eq)(schema_1.stationParts.partId, schema_1.parts.id))
            .where(whereClause)
            .orderBy((0, drizzle_orm_1.asc)(schema_1.stationParts.process));
        const uniqueProcesses = processes.map(row => row.process).filter(p => p !== null);
        const rankKanbans = yield client_1.db
            .select({ total: (0, drizzle_orm_1.count)() })
            .from(schema_1.delayKanbans)
            .innerJoin(schema_1.kanbanRequests, (0, drizzle_orm_1.eq)(schema_1.delayKanbans.kanbanId, schema_1.kanbanRequests.id))
            .leftJoin(schema_1.stationParts, stationPartsJoinCondition)
            .leftJoin(schema_1.parts, (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.partId, schema_1.parts.id))
            .where((0, drizzle_orm_1.and)(whereClause, (0, drizzle_orm_1.isNull)(schema_1.stationParts.id)));
        if (((_a = rankKanbans[0]) === null || _a === void 0 ? void 0 : _a.total) > 0) {
            uniqueProcesses.push('rank parts');
        }
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
                id: schema_1.delayKanbans.id,
                process: schema_1.stationParts.process,
                partIdNo: schema_1.parts.partId,
                partName: schema_1.parts.name,
                prepLocation: schema_1.stationParts.prepLocation,
                reportedAt: schema_1.delayKanbans.reportedAt,
            })
                .from(schema_1.delayKanbans)
                .innerJoin(schema_1.kanbanRequests, (0, drizzle_orm_1.eq)(schema_1.delayKanbans.kanbanId, schema_1.kanbanRequests.id))
                .leftJoin(schema_1.stationParts, stationPartsJoinCondition)
                .leftJoin(schema_1.parts, (0, drizzle_orm_1.sql) `${schema_1.parts.id} = COALESCE(${schema_1.stationParts.partId}, ${schema_1.kanbanRequests.partId})`)
                .where(whereClause)
                .orderBy(orderByClause)
                .limit(limit)
                .offset(offset);
            const total = (_b = (yield client_1.db
                .select({ total: (0, drizzle_orm_1.count)() })
                .from(schema_1.delayKanbans)
                .innerJoin(schema_1.kanbanRequests, (0, drizzle_orm_1.eq)(schema_1.delayKanbans.kanbanId, schema_1.kanbanRequests.id))
                .leftJoin(schema_1.stationParts, stationPartsJoinCondition)
                .leftJoin(schema_1.parts, (0, drizzle_orm_1.sql) `${schema_1.parts.id} = COALESCE(${schema_1.stationParts.partId}, ${schema_1.kanbanRequests.partId})`)
                .where(whereClause))[0]) === null || _b === void 0 ? void 0 : _b.total;
            const totalPages = Math.ceil((total !== null && total !== void 0 ? total : 0) / limit);
            return res.status(200).json({ kanbans, processes: uniqueProcesses, total, totalPages });
        }
        else if (processFilter === 'rank parts') {
            // Special case for 'rank parts' process filter
            const kanbans = yield client_1.db
                .select({
                id: schema_1.kanbanRequests.id,
                process: schema_1.stationParts.process,
                partId: schema_1.kanbanRequests.partId,
                partIdNo: schema_1.parts.partId,
                partName: schema_1.parts.name,
                reportedAt: schema_1.delayKanbans.reportedAt,
            })
                .from(schema_1.delayKanbans)
                .innerJoin(schema_1.kanbanRequests, (0, drizzle_orm_1.eq)(schema_1.delayKanbans.kanbanId, schema_1.kanbanRequests.id))
                .leftJoin(schema_1.parts, (0, drizzle_orm_1.eq)(schema_1.parts.id, schema_1.kanbanRequests.partId))
                .leftJoin(schema_1.stationParts, stationPartsJoinCondition)
                .where((0, drizzle_orm_1.and)(whereClause, (0, drizzle_orm_1.isNull)(schema_1.stationParts.id)))
                .orderBy(orderByClause)
                .limit(limit)
                .offset(offset);
            const total = rankKanbans[0].total;
            const totalPages = Math.ceil((total !== null && total !== void 0 ? total : 0) / limit);
            console.log(JSON.stringify(kanbans, null, 2));
            return res.status(200).json({ kanbans, processes: uniqueProcesses, isFrozenData: false, total, totalPages });
        }
        else {
            const kanbans = yield client_1.db
                .select({
                id: schema_1.delayKanbans.id,
                process: schema_1.stationParts.process,
                partIdNo: schema_1.parts.partId,
                partName: schema_1.parts.name,
                prepLocation: schema_1.stationParts.prepLocation,
                reportedAt: schema_1.delayKanbans.reportedAt,
            })
                .from(schema_1.delayKanbans)
                .innerJoin(schema_1.kanbanRequests, (0, drizzle_orm_1.eq)(schema_1.delayKanbans.kanbanId, schema_1.kanbanRequests.id))
                .leftJoin(schema_1.stationParts, stationPartsJoinCondition)
                .leftJoin(schema_1.parts, (0, drizzle_orm_1.eq)(schema_1.stationParts.partId, schema_1.parts.id))
                .where((0, drizzle_orm_1.and)(whereClause, (0, drizzle_orm_1.eq)(schema_1.stationParts.process, processFilter)))
                .orderBy(orderByClause)
                .limit(limit)
                .offset(offset);
            const total = (_c = (yield client_1.db
                .select({ total: (0, drizzle_orm_1.count)() })
                .from(schema_1.delayKanbans)
                .innerJoin(schema_1.kanbanRequests, (0, drizzle_orm_1.eq)(schema_1.delayKanbans.kanbanId, schema_1.kanbanRequests.id))
                .leftJoin(schema_1.stationParts, stationPartsJoinCondition)
                .leftJoin(schema_1.parts, (0, drizzle_orm_1.eq)(schema_1.stationParts.partId, schema_1.parts.id))
                .where((0, drizzle_orm_1.and)(whereClause, (0, drizzle_orm_1.eq)(schema_1.stationParts.process, processFilter))))[0]) === null || _c === void 0 ? void 0 : _c.total;
            const totalPages = Math.ceil((total !== null && total !== void 0 ? total : 0) / limit);
            return res.status(200).json({ kanbans, processes: uniqueProcesses, total, totalPages });
        }
    }
    catch (err) {
        console.error("Error fetching kanbans:", err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
}));
exports.delaySheetRouter.get("/kanbans/count", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const process = ((_a = req.query) === null || _a === void 0 ? void 0 : _a.process) ? String(req.query.process) : null;
        const plantId = user.plantId;
        const baseWhereClause = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.delayKanbans.arrangedByLogistics, false));
        const processWhereClause = process ? (0, drizzle_orm_1.eq)(schema_1.stationParts.process, process) : (0, drizzle_orm_1.sql) `1=1`;
        const plantWhereClause = (0, drizzle_orm_1.eq)(schema_1.delayKanbans.plantId, plantId);
        const whereClause = (0, drizzle_orm_1.and)(baseWhereClause, processWhereClause, plantWhereClause);
        const stationPartsJoinCondition = (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.stationPartsId, schema_1.stationParts.id);
        const result = yield client_1.db
            .select({ total: (0, drizzle_orm_1.count)() })
            .from(schema_1.delayKanbans)
            .innerJoin(schema_1.kanbanRequests, (0, drizzle_orm_1.eq)(schema_1.delayKanbans.kanbanId, schema_1.kanbanRequests.id))
            .leftJoin(schema_1.stationParts, stationPartsJoinCondition)
            .where(whereClause);
        return res.status(200).json({ total: (_c = (_b = result[0]) === null || _b === void 0 ? void 0 : _b.total) !== null && _c !== void 0 ? _c : 0 });
    }
    catch (err) {
        console.error("Error fetching kanban count:", err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
}));
exports.delaySheetRouter.put("/kanban", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.session.user;
    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const isAuthorized = user.role === "admin" || user.role === "gd_logistics" || user.role === "tnga_logistics";
    if (!isAuthorized) {
        return res.status(403).json({ error: "Forbidden: Only admins and logistics can update kanbans" });
    }
    const { kanbanIds } = req.body;
    console.log("Received request to update kanban in delay list:", kanbanIds);
    if (!Array.isArray(kanbanIds) || kanbanIds.length === 0) {
        return res.status(400).json({ error: "kanbanIds array is required" });
    }
    try {
        const arranged_by_logistics = true;
        const arrangedAt = new Date();
        const result = yield client_1.db
            .update(schema_1.delayKanbans)
            .set({ arrangedByLogistics: arranged_by_logistics, arrangedAt })
            .where((0, drizzle_orm_1.inArray)(schema_1.delayKanbans.id, kanbanIds))
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
exports.delaySheetRouter.put("/kanban/all", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.session.user;
    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const isAuthorized = user.role === "admin";
    if (!isAuthorized) {
        return res.status(403).json({ error: "Forbidden: Only admins can update bulk kanbans" });
    }
    const { process } = req.query;
    console.log(`Received request to update all kanban in delay list ${process && `for process: ${process}`}`);
    try {
        const plantId = user.plantId;
        const arrangedByLogistics = true;
        const arrangedAt = new Date();
        const whereClause = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.delayKanbans.arrangedByLogistics, false), (0, drizzle_orm_1.eq)(schema_1.delayKanbans.plantId, plantId), process ? (0, drizzle_orm_1.eq)(schema_1.stationParts.process, String(process)) : (0, drizzle_orm_1.sql) `1=1`);
        const stationPartsJoinCondition = (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.stationPartsId, schema_1.stationParts.id);
        const kanbansToUpdate = yield client_1.db
            .select({ id: schema_1.delayKanbans.id })
            .from(schema_1.delayKanbans)
            .leftJoin(schema_1.kanbanRequests, (0, drizzle_orm_1.eq)(schema_1.delayKanbans.kanbanId, schema_1.kanbanRequests.id))
            .leftJoin(schema_1.stationParts, stationPartsJoinCondition)
            .where(whereClause)
            .orderBy((0, drizzle_orm_1.asc)(schema_1.delayKanbans.reportedAt));
        if (kanbansToUpdate.length === 0) {
            console.log("Kanban not found");
            return res.status(404).json({ message: "Kanban not found" });
        }
        const result = yield client_1.db
            .update(schema_1.delayKanbans)
            .set({ arrangedByLogistics, arrangedAt })
            .where((0, drizzle_orm_1.inArray)(schema_1.delayKanbans.id, kanbansToUpdate.map(k => k.id)))
            .returning();
        if (result.length === 0) {
            console.log("Kanban not found");
            return res.status(404).json({ message: "Kanban not found" });
        }
        console.log("Delay Kanbans updated successfully:", result);
        return res.status(200).json({ message: "Delay Kanban updated successfully", updatedKanbans: result });
    }
    catch (error) {
        console.log("Error updating kanban:", error);
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
}));
exports.delaySheetRouter.delete("/kanban", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.session.user;
    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const isAuthorized = user.role === "admin" || user.role === "supplier";
    if (!isAuthorized) {
        return res.status(403).json({ error: "Forbidden: Only admin and supplier can delete delay reports" });
    }
    const { kanbanIds } = req.body;
    if (!Array.isArray(kanbanIds) || kanbanIds.length === 0 || kanbanIds.some(id => isNaN(Number(id)))) {
        return res.status(400).json({ error: 'kanbanIds (array of numbers) is required' });
    }
    try {
        const deleted = yield client_1.db
            .delete(schema_1.delayKanbans)
            .where((0, drizzle_orm_1.inArray)(schema_1.delayKanbans.id, kanbanIds))
            .returning();
        if (deleted.length === 0) {
            return res.status(404).json({ message: "Kanban not found" });
        }
        return res.status(200).json({ message: "Report deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting report:", error);
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
}));
