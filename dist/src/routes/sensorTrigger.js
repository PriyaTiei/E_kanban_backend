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
exports.sensorTriggerRouter = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const lookupCache_1 = require("../lib/lookupCache");
exports.sensorTriggerRouter = express_1.default.Router();
exports.sensorTriggerRouter.post("/gd", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { variant } = req.body;
    try {
        const variantId = lookupCache_1.lookupCache.getProductId(String(variant));
        const gdPlantName = 'GD';
        const plantId = lookupCache_1.lookupCache.getPlantId(gdPlantName);
        // Map station ID order for easy lookup
        const stationIds = lookupCache_1.lookupCache.getStationSequence();
        // Get current product entries (who is at what station)
        const productLogs = yield client_1.db
            .select()
            .from(schema_1.productEntryLogs)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.productEntryLogs.stationId)); // important: descending to avoid conflict while shifting
        yield client_1.db.transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // 1. Move existing products forward
            for (const log of productLogs) {
                const currentIndex = stationIds.indexOf(log.stationId);
                const nextStationId = stationIds[currentIndex + 1];
                if (nextStationId) {
                    // Move product to next station
                    yield tx
                        .update(schema_1.productEntryLogs)
                        .set({
                        stationId: nextStationId,
                        timestamp: new Date(),
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.productEntryLogs.id, log.id));
                }
                else {
                    // Product has moved beyond last station — remove or ignore
                    yield tx.delete(schema_1.productEntryLogs).where((0, drizzle_orm_1.eq)(schema_1.productEntryLogs.id, log.id));
                }
            }
            // 2. Insert the new product into the first station
            const firstStationId = stationIds[0];
            yield tx.insert(schema_1.productEntryLogs).values({
                plantId: plantId,
                stationId: firstStationId,
                productId: variantId,
                timestamp: new Date(),
            });
            // 3. Get updated logs after shifting
            const updatedLogs = yield tx
                .select()
                .from(schema_1.productEntryLogs);
            // 4. Process inventory deduction for each station-product pair
            for (const log of updatedLogs) {
                const parts = yield tx
                    .select({
                    id: schema_1.stationParts.id,
                    binQuantity: schema_1.stationParts.binQuantity,
                    currentQuantity: schema_1.stationParts.currentQuantity,
                    consumptionPerProduct: schema_1.stationParts.consumptionPerProduct,
                    productId: schema_1.stationParts.productId,
                    partId: schema_1.stationParts.partId,
                })
                    .from(schema_1.stationParts)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stationParts.stationId, log.stationId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.stationParts.productId), (0, drizzle_orm_1.eq)(schema_1.stationParts.productId, log.productId)), (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.stationParts.exceptionProductId), (0, drizzle_orm_1.ne)(schema_1.stationParts.exceptionProductId, log.productId))));
                for (const part of parts) {
                    let updatedQuantity;
                    let remainder;
                    if (part.currentQuantity - part.consumptionPerProduct <= 0) {
                        remainder = Math.abs(part.currentQuantity - part.consumptionPerProduct);
                        updatedQuantity = part.binQuantity - remainder;
                        yield tx
                            .update(schema_1.stationParts)
                            .set({
                            currentQuantity: updatedQuantity,
                            updatedAt: new Date(),
                        })
                            .where((0, drizzle_orm_1.eq)(schema_1.stationParts.id, part.id));
                        yield tx.insert(schema_1.kanbanRequests).values({
                            plantId: plantId,
                            stationId: log.stationId,
                            partId: part.partId,
                            productId: log.productId,
                        });
                    }
                    else {
                        updatedQuantity = part.currentQuantity - part.consumptionPerProduct;
                        yield tx
                            .update(schema_1.stationParts)
                            .set({
                            currentQuantity: updatedQuantity,
                            updatedAt: new Date(),
                        })
                            .where((0, drizzle_orm_1.eq)(schema_1.stationParts.id, part.id));
                    }
                }
            }
        }));
        return res.status(200).json({
            message: "Line shifted and part inventories updated successfully.",
        });
    }
    catch (err) {
        console.error("Sensor trigger error:", err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
}));
