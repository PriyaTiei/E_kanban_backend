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
exports.productEntryLogsRouter = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const productEntryHelper_1 = require("../lib/productEntryHelper");
exports.productEntryLogsRouter = express_1.default.Router();
exports.productEntryLogsRouter.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const plantId = user.plantId;
        const whereClause = (0, drizzle_orm_1.eq)(schema_1.productEntryLogs.plantId, plantId);
        const logs = yield client_1.db
            .select({
            id: schema_1.productEntryLogs.id,
            productId: schema_1.productEntryLogs.productId,
            productName: schema_1.products.variant,
            stationId: schema_1.productEntryLogs.stationId,
            stationName: schema_1.stations.name,
            timestamp: schema_1.productEntryLogs.timestamp,
        })
            .from(schema_1.productEntryLogs)
            .leftJoin(schema_1.products, (0, drizzle_orm_1.eq)(schema_1.productEntryLogs.productId, schema_1.products.id))
            .leftJoin(schema_1.stations, (0, drizzle_orm_1.eq)(schema_1.productEntryLogs.stationId, schema_1.stations.id))
            .where(whereClause);
        res.json(logs);
    }
    catch (error) {
        console.error('Failed to fetch product entry logs:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}));
// UPDATE productEntryLog (only productId)
exports.productEntryLogsRouter.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const isAdmin = user.role === "admin";
        if (!isAdmin) {
            return res.status(403).json({ error: "Forbidden: Only admins can modify stations" });
        }
        const id = Number(req.params.id);
        const { productId } = req.body;
        if (!productId) {
            return res.status(400).json({ error: "productId is required" });
        }
        const result = yield client_1.db
            .update(schema_1.productEntryLogs)
            .set({
            productId,
            timestamp: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.productEntryLogs.id, id));
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Product entry log not found" });
        }
        res.json({ message: "Product entry log updated successfully" });
    }
    catch (error) {
        console.error('Failed to update product entry log:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}));
// DELETE productEntryLog
exports.productEntryLogsRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const isAdmin = user.role === "admin";
        if (!isAdmin) {
            return res.status(403).json({ error: "Forbidden: Only admins can modify stations" });
        }
        const id = Number(req.params.id);
        const result = yield client_1.db
            .delete(schema_1.productEntryLogs)
            .where((0, drizzle_orm_1.eq)(schema_1.productEntryLogs.id, id));
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Product entry log not found" });
        }
        res.json({ message: "Product entry log deleted successfully" });
    }
    catch (error) {
        console.error('Failed to delete product entry log:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}));
// Refeed Update Route
exports.productEntryLogsRouter.put('/refeed/:stationId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const isAdmin = user.role === "admin";
        if (!isAdmin) {
            return res.status(403).json({ error: "Forbidden: Only admins can refeed products" });
        }
        const { variant } = req.body;
        const stationId = Number(req.params.stationId);
        const plantId = user.plantId;
        if (!variant || isNaN(stationId)) {
            return res.status(400).json({ error: "variant and valid stationId are required" });
        }
        yield (0, productEntryHelper_1.handleProductShift)(variant, plantId, stationId);
        res.json({ message: "Product re-fed successfully at the specified station." });
    }
    catch (error) {
        console.error('Failed to refeed product:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}));
