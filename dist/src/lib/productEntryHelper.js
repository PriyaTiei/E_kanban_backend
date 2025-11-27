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
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertNewVariant = insertNewVariant;
exports.handleProductShift = handleProductShift;
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
function insertNewVariant(variant, plantId) {
    return __awaiter(this, void 0, void 0, function* () {
        return client_1.db.insert(schema_1.products)
            .values({
            variant,
            plantId
        }).returning({ id: schema_1.products.id });
    });
}
function handleProductShift(variant, plantId, lookupCache, refeedStationId) {
    return __awaiter(this, void 0, void 0, function* () {
        // console.log(`product ${Number(variant)} as entered plant ${plantId}: GD`);
        if (Number(variant) < 300 || Number(variant) >= 500) {
            console.error(`Invalid variant for GD plant: ${variant}`);
            return;
        }
        // const lookupCache = new LookupCache();
        // await lookupCache.initialize(plantId);
        let variantId = lookupCache.getProductId(String(variant));
        if (variantId === null) {
            const newVariant = yield insertNewVariant(variant, plantId);
            variantId = newVariant[0].id;
        }
        // const gdPlantName = "GD";
        // const plantId = lookupCache.getPlantId(gdPlantName);
        const stationIds = lookupCache.getStationSequence();
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
            const updatedLogs = yield tx.select().from(schema_1.productEntryLogs).where((0, drizzle_orm_1.eq)(schema_1.productEntryLogs.plantId, plantId));
            for (const log of updatedLogs) {
                const parts = yield tx
                    .select({
                    id: schema_1.stationParts.id,
                    binQuantity: schema_1.stationParts.binQuantity,
                    currentQuantity: schema_1.stationParts.currentQuantity,
                    consumptionPerProduct: schema_1.stationParts.consumptionPerProduct,
                    partId: schema_1.stationParts.partId,
                })
                    .from(schema_1.stationParts)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stationParts.stationId, log.stationId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.stationParts.allowed_for_all_products, true), (0, drizzle_orm_1.sql) `EXISTS (
                SELECT 1 FROM product_part_exceptions
                WHERE product_part_exceptions.product_id = ${log.productId}
                AND product_part_exceptions.part_id = station_parts.part_id
              )`)));
                const stationName = lookupCache.getStationName(log.stationId);
                // console.log(`processing station parts for station ${stationName}`);
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
                        // TODO: Remove this condition after bin matching.
                        // const stationName = lookupCache.getStationName(log.stationId);
                        // if(!stationName.startsWith("BS-")){
                        //   console.log("stationName:", stationName);
                        //   continue;
                        // }
                        yield tx.insert(schema_1.kanbanRequests).values({
                            plantId: plantId,
                            stationId: log.stationId,
                            partId: part.partId,
                            productId: log.productId,
                        });
                        const productVariant = lookupCache.getProductVariant(log.productId);
                        // console.log(`Raising a kanban request for variant ${variant} at ${stationName} of plant ${plantId} for product ${productVariant}`);
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
