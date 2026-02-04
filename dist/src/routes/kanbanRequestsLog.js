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
exports.kanbanRequestsLogRouter = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
exports.kanbanRequestsLogRouter = express_1.default.Router();
exports.kanbanRequestsLogRouter.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const plantId = user.plantId;
        // pagination details from query params, e.g., /kanbans?page=1&limit=20
        const page = req.query.page ? Math.max(1, Number(req.query.page)) : 1;
        const limit = req.query.limit ? Math.min(100, Math.max(1, Number(req.query.limit))) : 20;
        const offset = (page - 1) * limit;
        // filters from query params
        const status = req.query.status ? String(req.query.status) : null;
        const dateTime = req.query.dateTime ? String(req.query.dateTime) : null;
        const searchFilter = req.query.search ? String(req.query.search) : null;
        console.log("status filter: ", status, "\ndateTime filter: ", dateTime, "\nsearch filter: ", searchFilter);
        let whereClause = (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.plantId, plantId);
        if (status === "requested") {
            whereClause = (0, drizzle_orm_1.sql) `${whereClause} AND ${schema_1.kanbanRequests.acknowledgedByLogistics} = false AND ${schema_1.kanbanRequests.fulfilled} = false`;
        }
        else if (status === "acknowledged") {
            whereClause = (0, drizzle_orm_1.sql) `${whereClause} AND ${schema_1.kanbanRequests.acknowledgedByLogistics} = true AND ${schema_1.kanbanRequests.fulfilled} = false`;
        }
        else if (status === "fulfilled") {
            whereClause = (0, drizzle_orm_1.sql) `${whereClause} AND ${schema_1.kanbanRequests.fulfilled} = true`;
        }
        if (dateTime) {
            whereClause = (0, drizzle_orm_1.and)(whereClause, (0, drizzle_orm_1.lte)(schema_1.kanbanRequests.requestedAt, new Date(dateTime)));
        }
        if (searchFilter) {
            whereClause = (0, drizzle_orm_1.and)(whereClause, (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.parts.partId, `%${searchFilter}%`), (0, drizzle_orm_1.ilike)(schema_1.stations.name, `%${searchFilter}%`)));
        }
        const logs = yield client_1.db
            .select({
            id: schema_1.kanbanRequests.id,
            plantId: schema_1.kanbanRequests.plantId,
            plantName: schema_1.plants.name,
            stationName: schema_1.stations.name,
            partIdNo: schema_1.parts.partId,
            partName: schema_1.parts.name,
            requestedAt: schema_1.kanbanRequests.requestedAt,
            acknowledgedByLogistics: schema_1.kanbanRequests.acknowledgedByLogistics,
            acknowledgedAt: schema_1.kanbanRequests.acknowledgedAt,
            fulfilled: schema_1.kanbanRequests.fulfilled,
            fulfilledAt: schema_1.kanbanRequests.fulfilledAt,
        })
            .from(schema_1.kanbanRequests)
            .leftJoin(schema_1.plants, (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.plantId, schema_1.plants.id))
            .leftJoin(schema_1.stationParts, (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.stationPartsId, schema_1.stationParts.id))
            .leftJoin(schema_1.parts, (0, drizzle_orm_1.sql) `${schema_1.parts.id} = COALESCE(${schema_1.stationParts.partId}, ${schema_1.kanbanRequests.partId})`)
            .leftJoin(schema_1.stations, (0, drizzle_orm_1.eq)(schema_1.stationParts.stationId, schema_1.stations.id))
            .leftJoin(schema_1.products, (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.productId, schema_1.products.id))
            .where(whereClause)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.kanbanRequests.requestedAt))
            .limit(limit)
            .offset(offset);
        const totalLogs = yield client_1.db.
            select({ total: (0, drizzle_orm_1.count)() })
            .from(schema_1.kanbanRequests)
            .leftJoin(schema_1.stationParts, (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.stationPartsId, schema_1.stationParts.id))
            .leftJoin(schema_1.parts, (0, drizzle_orm_1.sql) `${schema_1.parts.id} = COALESCE(${schema_1.stationParts.partId}, ${schema_1.kanbanRequests.partId})`)
            .leftJoin(schema_1.stations, (0, drizzle_orm_1.eq)(schema_1.stationParts.stationId, schema_1.stations.id))
            .where(whereClause);
        const totalPages = Math.ceil(((_b = (_a = totalLogs[0]) === null || _a === void 0 ? void 0 : _a.total) !== null && _b !== void 0 ? _b : 0) / limit);
        console.log('total pages: ', totalPages);
        return res.json({ logs, totalPages });
    }
    catch (error) {
        console.error("Error fetching kanban requests log:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}));
