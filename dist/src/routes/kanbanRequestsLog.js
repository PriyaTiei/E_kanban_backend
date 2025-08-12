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
    try {
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const isAdmin = user.role === "admin";
        const plantId = user.plantId;
        const whereClause = isAdmin && plantId === null
            ? (0, drizzle_orm_1.sql) `1=1`
            : (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.plantId, plantId);
        const logs = yield client_1.db
            .select({
            id: schema_1.kanbanRequests.id,
            plantId: schema_1.kanbanRequests.plantId,
            plantName: schema_1.plants.name,
            stationId: schema_1.kanbanRequests.stationId,
            stationName: schema_1.stations.name,
            partId: schema_1.kanbanRequests.partId,
            partIdNo: schema_1.parts.partId,
            partName: schema_1.parts.name,
            productId: schema_1.kanbanRequests.productId,
            productName: schema_1.products.variant,
            requestedAt: schema_1.kanbanRequests.requestedAt,
            acknowledgedByLogistics: schema_1.kanbanRequests.acknowledgedByLogistics,
            acknowledgedAt: schema_1.kanbanRequests.acknowledgedAt,
            fulfilled: schema_1.kanbanRequests.fulfilled,
            fulfilledAt: schema_1.kanbanRequests.fulfilledAt,
        })
            .from(schema_1.kanbanRequests)
            .leftJoin(schema_1.plants, (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.plantId, schema_1.plants.id))
            .leftJoin(schema_1.stations, (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.stationId, schema_1.stations.id))
            .leftJoin(schema_1.parts, (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.partId, schema_1.parts.id))
            .leftJoin(schema_1.products, (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.productId, schema_1.products.id))
            .where(whereClause)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.kanbanRequests.requestedAt));
        return res.json(logs);
    }
    catch (error) {
        console.error("Error fetching kanban requests log:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}));
