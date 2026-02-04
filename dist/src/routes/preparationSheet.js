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
exports.preparationSheetRouter = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const kanbanHelpers_1 = require("../lib/kanbanHelpers");
exports.preparationSheetRouter = express_1.default.Router();
const selectKanbanFields = {
    id: schema_1.kanbanRequests.id,
    process: schema_1.stationParts.process,
    partIdNo: schema_1.parts.partId,
    partName: schema_1.parts.name,
    requestedAt: schema_1.kanbanRequests.requestedAt,
    prepLocation: schema_1.stationParts.prepLocation,
};
exports.preparationSheetRouter.get("/kanbans", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const plantId = user.plantId;
        // Process filter from query params, e.g., /kanbans?process=1
        const processFilter = req.query.process ? String(req.query.process) : null;
        const searchFilter = req.query.search ? String(req.query.search) : null;
        const page = req.query.page ? Math.max(1, Number(req.query.page)) : 1;
        const limit = req.query.limit ? Math.min(100, Math.max(1, Number(req.query.limit))) : 20;
        const offset = (page - 1) * limit;
        // Base where clause for acknowledgedByLogistics and plant scope
        let baseWhereClause = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kanbanRequests.acknowledgedByLogistics, false), (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.plantId, plantId));
        const stationPartsJoinCondition = (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.stationPartsId, schema_1.stationParts.id);
        if (searchFilter) {
            baseWhereClause = (0, drizzle_orm_1.and)(baseWhereClause, (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.parts.partId, `%${searchFilter}%`), (0, drizzle_orm_1.ilike)(schema_1.stationParts.prepLocation, `%${searchFilter}%`), (0, drizzle_orm_1.ilike)(schema_1.stationParts.supplyLocation, `%${searchFilter}%`)));
        }
        // query for all unique processes
        const processes = yield client_1.db
            .selectDistinct({ process: schema_1.stationParts.process })
            .from(schema_1.kanbanRequests)
            .leftJoin(schema_1.stationParts, stationPartsJoinCondition)
            .leftJoin(schema_1.parts, (0, drizzle_orm_1.sql) `${schema_1.parts.id} = COALESCE(${schema_1.stationParts.partId}, ${schema_1.kanbanRequests.partId})`)
            .where(baseWhereClause)
            .orderBy((0, drizzle_orm_1.asc)(schema_1.stationParts.process));
        const uniqueProcesses = processes.map(row => row.process).filter(p => p !== null);
        const rankKanbans = yield client_1.db
            .select({ total: (0, drizzle_orm_1.count)() })
            .from(schema_1.kanbanRequests)
            .leftJoin(schema_1.stationParts, stationPartsJoinCondition)
            .leftJoin(schema_1.parts, (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.partId, schema_1.parts.id))
            .where((0, drizzle_orm_1.and)(baseWhereClause, (0, drizzle_orm_1.isNull)(schema_1.stationParts.id)));
        if (((_a = rankKanbans[0]) === null || _a === void 0 ? void 0 : _a.total) > 0) {
            uniqueProcesses.push('rank parts');
        }
        const orderByClause = (0, drizzle_orm_1.sql) `
      CASE
        WHEN ${schema_1.stationParts.prepLocation} LIKE 'TZ-%' THEN 1
        WHEN ${schema_1.stationParts.prepLocation} LIKE 'LOG-%' THEN 2
        ELSE 3
      END,
      NULLIF(regexp_replace(${schema_1.stationParts.prepLocation}, '[^0-9]', '', 'g'), '')::int,
      ${schema_1.kanbanRequests.partId}
    `;
        if (!processFilter) {
            // No process filter — return all kanbans normally
            const kanbans = yield client_1.db
                .select(selectKanbanFields)
                .from(schema_1.kanbanRequests)
                .leftJoin(schema_1.stationParts, stationPartsJoinCondition)
                .leftJoin(schema_1.parts, (0, drizzle_orm_1.sql) `${schema_1.parts.id} = COALESCE(${schema_1.stationParts.partId}, ${schema_1.kanbanRequests.partId})`)
                .where(baseWhereClause)
                .orderBy(orderByClause)
                .limit(limit)
                .offset(offset);
            const total = (_b = (yield client_1.db
                .select({ total: (0, drizzle_orm_1.count)() })
                .from(schema_1.kanbanRequests)
                .leftJoin(schema_1.stationParts, stationPartsJoinCondition)
                .leftJoin(schema_1.parts, (0, drizzle_orm_1.sql) `${schema_1.parts.id} = COALESCE(${schema_1.stationParts.partId}, ${schema_1.kanbanRequests.partId})`)
                .where(baseWhereClause))[0]) === null || _b === void 0 ? void 0 : _b.total;
            const totalPages = Math.ceil((total !== null && total !== void 0 ? total : 0) / limit);
            return res.status(200).json({ kanbans, processes: uniqueProcesses, isFrozenData: false, total, totalPages });
        }
        if (processFilter === 'rank parts') {
            // Special case for 'rank parts' process filter
            const kanbans = yield client_1.db
                .select(selectKanbanFields)
                .from(schema_1.kanbanRequests)
                .leftJoin(schema_1.stationParts, stationPartsJoinCondition)
                .leftJoin(schema_1.parts, (0, drizzle_orm_1.eq)(schema_1.parts.id, schema_1.kanbanRequests.partId))
                .where((0, drizzle_orm_1.and)(baseWhereClause, (0, drizzle_orm_1.isNull)(schema_1.stationParts.id)))
                .orderBy(orderByClause)
                .limit(limit)
                .offset(offset);
            const total = rankKanbans[0].total;
            const totalPages = Math.ceil((total !== null && total !== void 0 ? total : 0) / limit);
            return res.status(200).json({ kanbans, processes: uniqueProcesses, isFrozenData: false, total, totalPages });
        }
        // Check if this process is frozen
        const freezeState = yield client_1.db
            .select()
            .from(schema_1.processFreezeState)
            .where((0, drizzle_orm_1.and)(((0, drizzle_orm_1.eq)(schema_1.processFreezeState.process, processFilter)), (0, drizzle_orm_1.eq)(schema_1.processFreezeState.plantId, plantId)))
            .limit(1);
        const isFrozen = freezeState.length > 0 && freezeState[0].isFrozen;
        if (isFrozen) {
            // Fetch frozen kanbans for this process
            // Join frozenKanbans -> kanbanRequests + other tables for details
            const kanbans = yield client_1.db
                .select(selectKanbanFields)
                .from(schema_1.frozenKanbans)
                .innerJoin(schema_1.kanbanRequests, (0, drizzle_orm_1.eq)(schema_1.frozenKanbans.kanbanId, schema_1.kanbanRequests.id))
                .leftJoin(schema_1.stationParts, stationPartsJoinCondition)
                .leftJoin(schema_1.parts, (0, drizzle_orm_1.eq)(schema_1.stationParts.partId, schema_1.parts.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.frozenKanbans.process, processFilter), (0, drizzle_orm_1.eq)(schema_1.frozenKanbans.process, schema_1.stationParts.process), baseWhereClause))
                .orderBy(orderByClause)
                .limit(limit)
                .offset(offset);
            const total = (_c = (yield client_1.db
                .select({ total: (0, drizzle_orm_1.count)() })
                .from(schema_1.frozenKanbans)
                .innerJoin(schema_1.kanbanRequests, (0, drizzle_orm_1.eq)(schema_1.frozenKanbans.kanbanId, schema_1.kanbanRequests.id))
                .leftJoin(schema_1.stationParts, stationPartsJoinCondition)
                .leftJoin(schema_1.parts, (0, drizzle_orm_1.eq)(schema_1.stationParts.partId, schema_1.parts.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.frozenKanbans.process, processFilter), (0, drizzle_orm_1.eq)(schema_1.frozenKanbans.process, schema_1.stationParts.process), baseWhereClause)))[0]) === null || _c === void 0 ? void 0 : _c.total;
            const totalPages = Math.ceil((total !== null && total !== void 0 ? total : 0) / limit);
            return res.status(200).json({ kanbans, processes: uniqueProcesses, isFrozenData: true, total, totalPages });
        }
        else {
            // Not frozen, fetch kanbans filtered by process normally
            const kanbans = yield client_1.db
                .select(selectKanbanFields)
                .from(schema_1.kanbanRequests)
                .leftJoin(schema_1.stationParts, stationPartsJoinCondition)
                .leftJoin(schema_1.parts, (0, drizzle_orm_1.eq)(schema_1.stationParts.partId, schema_1.parts.id))
                .where((0, drizzle_orm_1.and)(baseWhereClause, (0, drizzle_orm_1.eq)(schema_1.stationParts.process, processFilter)))
                .orderBy(orderByClause)
                .limit(limit)
                .offset(offset);
            const total = (_d = (yield client_1.db
                .select({ total: (0, drizzle_orm_1.count)() })
                .from(schema_1.kanbanRequests)
                .leftJoin(schema_1.stationParts, stationPartsJoinCondition)
                .leftJoin(schema_1.parts, (0, drizzle_orm_1.eq)(schema_1.stationParts.partId, schema_1.parts.id))
                .where((0, drizzle_orm_1.and)(baseWhereClause, (0, drizzle_orm_1.eq)(schema_1.stationParts.process, processFilter))))[0]) === null || _d === void 0 ? void 0 : _d.total;
            const totalPages = Math.ceil((total !== null && total !== void 0 ? total : 0) / limit);
            return res.status(200).json({ kanbans, processes: uniqueProcesses, isFrozenData: false, total, totalPages });
        }
    }
    catch (err) {
        console.error("Error fetching kanbans:", err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
}));
exports.preparationSheetRouter.get("/kanbans/count", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const process = ((_a = req.query) === null || _a === void 0 ? void 0 : _a.process) ? String(req.query.process) : null;
        const plantId = user.plantId;
        const baseWhereClause = (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.acknowledgedByLogistics, false);
        const processWhereClause = process ? (0, drizzle_orm_1.eq)(schema_1.stationParts.process, process) : (0, drizzle_orm_1.sql) `1=1`;
        const plantWhereClause = (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.plantId, plantId);
        const whereClause = (0, drizzle_orm_1.and)(baseWhereClause, processWhereClause, plantWhereClause);
        const stationPartsJoinCondition = (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.stationPartsId, schema_1.stationParts.id);
        const result = yield client_1.db
            .select({ total: (0, drizzle_orm_1.count)() })
            .from(schema_1.kanbanRequests)
            .leftJoin(schema_1.stationParts, stationPartsJoinCondition)
            .where(whereClause);
        return res.status(200).json({ total: (_c = (_b = result[0]) === null || _b === void 0 ? void 0 : _b.total) !== null && _c !== void 0 ? _c : 0 });
    }
    catch (err) {
        console.error("Error fetching kanban count:", err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
}));
exports.preparationSheetRouter.put("/kanban", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.session.user;
    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    // const isAuthorized = user.role === "admin" || user.role === "logistics";
    // if (!isAuthorized) {
    //   return res.status(403).json({ error: "Forbidden: Only admins and logistics can update kanbans" });
    // }
    const { kanbanIds } = req.body;
    console.log("Received request to update kanban in prep list:", kanbanIds);
    if (!Array.isArray(kanbanIds) || kanbanIds.length === 0) {
        return res.status(400).json({ error: "kanbanIds array is required" });
    }
    try {
        const acknowledgedByLogistics = true;
        const acknowledgedAt = new Date();
        const result = yield client_1.db
            .update(schema_1.kanbanRequests)
            .set({ acknowledgedByLogistics, acknowledgedAt })
            .where((0, drizzle_orm_1.inArray)(schema_1.kanbanRequests.id, kanbanIds))
            .returning();
        if (result.length === 0) {
            return res.status(404).json({ message: "Kanban not found" });
        }
        return res.status(200).json({ message: "Kanban updated successfully", updatedKanbans: result });
    }
    catch (error) {
        console.log("Error updating kanban:", error);
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
}));
exports.preparationSheetRouter.put("/kanban/all", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.session.user;
    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const isAuthorized = user.role === "admin";
    if (!isAuthorized) {
        return res.status(403).json({ error: "Forbidden: Only admins can update multiple kanbans at once." });
    }
    const { process } = req.query;
    console.log(`Received request to update all kanban in prep list ${process && `for process: ${process}`}`);
    try {
        const plantId = user.plantId;
        const acknowledgedByLogistics = true;
        const acknowledgedAt = new Date();
        const whereClause = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kanbanRequests.acknowledgedByLogistics, false), (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.plantId, plantId), process ? (0, drizzle_orm_1.eq)(schema_1.stationParts.process, String(process)) : (0, drizzle_orm_1.sql) `1=1`);
        const stationPartsJoinCondition = (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.stationPartsId, schema_1.stationParts.id);
        const kanbansToUpdate = yield client_1.db
            .select({ id: schema_1.kanbanRequests.id })
            .from(schema_1.kanbanRequests)
            .leftJoin(schema_1.stationParts, stationPartsJoinCondition)
            .where(whereClause)
            .orderBy((0, drizzle_orm_1.asc)(schema_1.kanbanRequests.requestedAt));
        if (kanbansToUpdate.length === 0) {
            console.log("Kanban not found");
            return res.status(404).json({ message: "Kanban not found" });
        }
        const result = yield client_1.db
            .update(schema_1.kanbanRequests)
            .set({ acknowledgedByLogistics, acknowledgedAt })
            .where((0, drizzle_orm_1.inArray)(schema_1.kanbanRequests.id, kanbansToUpdate.map(k => k.id)))
            .returning();
        if (result.length === 0) {
            console.log("Kanban not found");
            return res.status(404).json({ message: "Kanban not found" });
        }
        console.log("Preparation Kanban updated successfully:", result);
        return res.status(200).json({ message: "Kanban updated successfully", updatedKanbans: result });
    }
    catch (error) {
        console.log("Error updating kanban:", error);
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
}));
exports.preparationSheetRouter.delete("/kanban", (req, res) => {
    (0, kanbanHelpers_1.deleteKanban)(req, res);
});
exports.preparationSheetRouter.post("/kanbans/freeze", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        // const isAuthorized = user.role === "admin" || user.role === "logistics";
        // if (!isAuthorized) {
        //   return res.status(403).json({ error: "Forbidden: Only admins and logistics can freeze kanbans" });
        // }
        const { process } = req.body;
        if (!process) {
            return res.status(400).json({ error: "Process is required" });
        }
        const plantId = user.plantId;
        const whereClause = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kanbanRequests.acknowledgedByLogistics, false), (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.plantId, plantId), (0, drizzle_orm_1.eq)(schema_1.stationParts.process, process));
        // Check if already frozen
        const existingFreeze = yield client_1.db
            .select()
            .from(schema_1.processFreezeState)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.processFreezeState.process, process), (0, drizzle_orm_1.eq)(schema_1.processFreezeState.plantId, plantId)))
            .limit(1);
        if (existingFreeze.length > 0 && existingFreeze[0].isFrozen) {
            return res.status(400).json({ error: "Process already frozen" });
        }
        const stationPartsJoinCondition = (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.stationPartsId, schema_1.stationParts.id);
        // Fetch kanbans to freeze (acknowledgedByLogistics = false, plantId filtered)
        const kanbansToFreeze = yield client_1.db
            .select({ id: schema_1.kanbanRequests.id })
            .from(schema_1.kanbanRequests)
            .leftJoin(schema_1.stationParts, stationPartsJoinCondition)
            .where(whereClause)
            .orderBy((0, drizzle_orm_1.asc)(schema_1.kanbanRequests.requestedAt));
        if (kanbansToFreeze.length === 0) {
            return res.status(400).json({ error: "No kanbans found to freeze for this process" });
        }
        // Insert into frozenKanbans - avoid duplicates if any
        yield client_1.db.transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Upsert processFreezeState row
            const freezeTimestamp = new Date();
            const upsertProcessFreeze = (0, drizzle_orm_1.sql) `
        INSERT INTO process_freeze_state (process, plant_id, is_frozen, frozen_at)
        VALUES (${process}, ${plantId}, true, ${freezeTimestamp})
        ON CONFLICT (process) DO UPDATE
          SET is_frozen = true,
              frozen_at = EXCLUDED.frozen_at
      `;
            yield tx.execute(upsertProcessFreeze);
            // Insert frozenKanbans rows for each kanbanId
            for (const kanban of kanbansToFreeze) {
                // During race conditions, we might have duplicates, so we use ON CONFLICT DO NOTHING
                const insertFrozenKanban = (0, drizzle_orm_1.sql) `
          INSERT INTO frozen_kanbans (process, kanban_id, frozen_at)
          VALUES (${process}, ${kanban.id}, ${freezeTimestamp})
          ON CONFLICT DO NOTHING
        `;
                yield tx.execute(insertFrozenKanban);
            }
        }));
        return res.status(200).json({ message: `Process ${process} frozen successfully` });
    }
    catch (err) {
        console.error("Error freezing process:", err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
}));
exports.preparationSheetRouter.post("/kanbans/unfreeze", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        // const isAuthorized = user.role === "admin" || user.role === "logistics";
        // if (!isAuthorized) {
        //   return res.status(403).json({ error: "Forbidden: Only admins and logistics can unfreeze kanbans" });
        // }
        const { process } = req.body;
        const plantId = user.plantId;
        if (!process) {
            return res.status(400).json({ error: "Process is required" });
        }
        yield client_1.db.transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Update freeze state
            yield tx
                .update(schema_1.processFreezeState)
                .set({ isFrozen: false, frozenAt: null })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.processFreezeState.process, process), (0, drizzle_orm_1.eq)(schema_1.processFreezeState.plantId, plantId)));
            // Delete frozenKanbans for process
            const frozenKanbansToDelete = yield client_1.db.select({ id: schema_1.frozenKanbans.id })
                .from(schema_1.frozenKanbans)
                .leftJoin(schema_1.kanbanRequests, (0, drizzle_orm_1.eq)(schema_1.frozenKanbans.kanbanId, schema_1.kanbanRequests.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.frozenKanbans.process, process), (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.plantId, plantId)));
            yield tx
                .delete(schema_1.frozenKanbans)
                .where((0, drizzle_orm_1.inArray)(schema_1.frozenKanbans.id, frozenKanbansToDelete.map(k => k.id)));
        }));
        return res.status(200).json({ message: `Process ${process} unfrozen successfully` });
    }
    catch (err) {
        console.error("Error unfreezing process:", err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
}));
exports.preparationSheetRouter.post("/kanbans/create", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const user = req.session.user;
    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    // const isAdmin = user.role === "admin";
    // if (!isAdmin) {
    //   return res.status(403).json({ error: "Forbidden: Only admins can create kanbans" });
    // }
    const plantId = user.plantId;
    const data = req.body;
    try {
        if (((_a = data.stationPartIds) === null || _a === void 0 ? void 0 : _a.length) === 0 && ((_b = data.rankPartIds) === null || _b === void 0 ? void 0 : _b.length) === 0) {
            return res.status(400).json({ error: "At least one kanban entry is required" });
        }
        if (data.stationPartIds && data.stationPartIds.length > 0) {
            // Create new kanban request
            const newKanban = yield client_1.db.insert(schema_1.kanbanRequests).values(data.stationPartIds.map((id) => ({
                plantId: plantId,
                stationPartsId: Number(id),
            }))).returning();
            console.log(`Created kanban: ${JSON.stringify(newKanban)}`);
            return res.status(201).json({ message: "Kanban created successfully", kanban: newKanban[0] });
        }
        else if (data.rankPartIds && data.rankPartIds.length > 0) {
            // Create new kanban request for Rank Parts (no stationPartsId)
            const newKanban = yield client_1.db.insert(schema_1.kanbanRequests).values(data.rankPartIds.map((id) => ({
                plantId: plantId,
                partId: Number(id),
            }))).returning();
            console.log(`Created kanban: ${JSON.stringify(newKanban)}`);
            return res.status(201).json({ message: "Kanban created successfully", kanban: newKanban[0] });
        }
    }
    catch (error) {
        console.error("Failed to create kanban:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}));
