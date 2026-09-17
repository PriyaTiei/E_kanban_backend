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
exports.stationPartsRouter = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const stationPartRepo_1 = require("../repositories/stationPartRepo");
exports.stationPartsRouter = express_1.default.Router();
exports.stationPartsRouter.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const plantId = user.plantId;
        const whereClause = (0, drizzle_orm_1.eq)(schema_1.stationParts.plantId, plantId);
        const stationData = yield client_1.db
            .select({
            id: schema_1.stationParts.id,
            stationId: schema_1.stationParts.stationId,
            stationName: schema_1.stations.name,
            partId: schema_1.stationParts.partId,
            partIdNo: schema_1.parts.partId,
            partName: schema_1.parts.name,
            // allowed_for_all_products: stationParts.allowed_for_all_products,
            process: schema_1.stationParts.process,
            prepLocation: schema_1.stationParts.prepLocation,
            supplyLoaction: schema_1.stationParts.supplyLocation,
            consumptionPerProduct: schema_1.stationParts.consumptionPerProduct,
            binQuantity: schema_1.stationParts.binQuantity,
            currentQuantity: schema_1.stationParts.currentQuantity,
            updatedAt: schema_1.stationParts.updatedAt,
        })
            .from(schema_1.stationParts)
            .leftJoin(schema_1.stations, (0, drizzle_orm_1.eq)(schema_1.stationParts.stationId, schema_1.stations.id))
            .leftJoin(schema_1.parts, (0, drizzle_orm_1.eq)(schema_1.stationParts.partId, schema_1.parts.id))
            .where(whereClause)
            .orderBy((0, drizzle_orm_1.asc)(schema_1.stations.sequenceNo), (0, drizzle_orm_1.asc)(schema_1.parts.partId));
        res.json(stationData);
    }
    catch (error) {
        console.error('Failed to fetch station parts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}));
// TODO: Implement respective tables update logic
// CREATE /station-parts
exports.stationPartsRouter.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.session.user;
    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const isAdmin = user.role === "admin";
    if (!isAdmin) {
        return res.status(403).json({ error: "Forbidden: Only admins can create station parts" });
    }
    const data = req.body;
    try {
        const result = yield stationPartRepo_1.StationPartsRepository.create(data);
        return res.status(201).json({ message: "Station part created successfully.", data: result });
    }
    catch (error) {
        console.error("Failed to create station part:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}));
// PUT /station-parts/:id
exports.stationPartsRouter.put("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.session.user;
    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const isAdmin = user.role === "admin";
    if (!isAdmin) {
        return res.status(403).json({ error: "Forbidden: Only admins can modify stations" });
    }
    const id = Number(req.params.id);
    const updates = req.body;
    if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid station part ID." });
    }
    const result = yield stationPartRepo_1.StationPartsRepository.update(id, updates);
    if (result.success) {
        return res.json({ message: "Station part updated successfully.", data: result.data });
    }
    else {
        return res.status(404).json({ error: result.error });
    }
}));
// TODO: Implement respective tables update logic
// DELETE /station-parts/:id
exports.stationPartsRouter.delete("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.session.user;
    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const isAdmin = user.role === "admin";
    if (!isAdmin) {
        return res.status(403).json({ error: "Forbidden: Only admins can delete station parts" });
    }
    const id = Number(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid station part ID." });
    }
    try {
        const result = yield stationPartRepo_1.StationPartsRepository.delete(id);
        if (result.success) {
            return res.json({ message: "Station part deleted successfully." });
        }
        else {
            return res.status(404).json({ error: result.error || "Station part not found." });
        }
    }
    catch (error) {
        console.error("Failed to delete station part:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}));
