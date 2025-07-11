"use strict";
// src/lib/sensorTriggerHandler.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleProductShift = handleProductShift;
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const lookupCache_1 = require("./lookupCache");
function handleProductShift(variant, refeedStationId) {
    return __awaiter(this, void 0, void 0, function* () {
        const variantId = lookupCache_1.lookupCache.getProductId(String(variant));
        const gdPlantName = "GD";
        const plantId = lookupCache_1.lookupCache.getPlantId(gdPlantName);
        const stationIds = lookupCache_1.lookupCache.getStationSequence();
        // If refeedStationId is provided, use it; otherwise, use the first station
        const startStationId = refeedStationId !== null && refeedStationId !== void 0 ? refeedStationId : stationIds[0];
        const startIndex = stationIds.indexOf(startStationId);
        if (startIndex === -1)
            throw new Error("Invalid stationId");
        // Only select logs at or after the refeed station
        const productLogs = yield client_1.db
            .select()
            .from(schema_1.productEntryLogs)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productEntryLogs.plantId, plantId), 
        // Only logs with stationId >= startStationId
        (0, drizzle_orm_1.gte)(schema_1.productEntryLogs.stationId, startStationId)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.productEntryLogs.stationId));
        yield client_1.db.transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            for (const log of productLogs) {
                const currentIndex = stationIds.indexOf(log.stationId);
                const nextStationId = stationIds[currentIndex + 1];
                if (nextStationId) {
                    yield tx
                        .update(schema_1.productEntryLogs)
                        .set({
                        stationId: nextStationId,
                        timestamp: new Date(),
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.productEntryLogs.id, log.id));
                }
                else {
                    yield tx.delete(schema_1.productEntryLogs).where((0, drizzle_orm_1.eq)(schema_1.productEntryLogs.id, log.id));
                }
            }
            // Insert the new/re-fed product at the specified station
            yield tx.insert(schema_1.productEntryLogs).values({
                plantId,
                stationId: startStationId,
                productId: variantId,
                timestamp: new Date(),
            });
            const updatedLogs = yield tx.select().from(schema_1.productEntryLogs);
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
    });
}
