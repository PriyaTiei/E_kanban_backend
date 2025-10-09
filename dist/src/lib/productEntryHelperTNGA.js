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
exports.handleProductShiftTNGA = handleProductShiftTNGA;
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
function handleProductShiftTNGA(variant, plantId, lookupCache, refeedStationId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (Number(variant) < 100 || Number(variant) >= 300) {
            console.error(`Invalid variant for TNGA plant: ${variant}`);
            return;
        }
        // const lookupCache = new LookupCache();
        // await lookupCache.initialize(plantId);
        let variantId = lookupCache.getProductId(String(variant));
        if (variantId === null) {
            const newVariant = yield insertNewVariant(variant, plantId);
            variantId = newVariant[0].id;
        }
        const stations = lookupCache.getStationSequenceTNGA();
        const simultaneousStations = lookupCache.getSimultaneousStations();
        console.log(`simultaneous stations: ${simultaneousStations}`);
        let stationsMK = stations.filter(s => s.name.startsWith("MK"));
        const isRefeedAtMK = refeedStationId && stationsMK.map(station => station.id).includes(refeedStationId);
        const startStationsMKId = isRefeedAtMK ? refeedStationId : stationsMK.length > 0 ? stationsMK[0].id : null;
        // If refeedStationId is provided, use it; otherwise, use the first stations
        const startStationIds = refeedStationId !== null && refeedStationId !== void 0 ? refeedStationId : simultaneousStations.map((group) => group[0]);
        if (!startStationIds)
            throw new Error("Invalid stationId");
        if (!startStationsMKId)
            throw new Error("No MK stations found in this plant");
        const lastStationInLongestSimulGroup = simultaneousStations.filter((group) => group.length === Math.max(...simultaneousStations.map(g => g.length)))[0].slice(-1)[0];
        // select product logs in station groups
        const groupProductLogs = yield Promise.all(simultaneousStations.map((stationGroup) => __awaiter(this, void 0, void 0, function* () {
            return client_1.db
                .select()
                .from(schema_1.productEntryLogs)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productEntryLogs.plantId, plantId), (0, drizzle_orm_1.inArray)(schema_1.productEntryLogs.stationId, stationGroup)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.productEntryLogs.stationId));
        })));
        const productLogsMK = yield client_1.db
            .select()
            .from(schema_1.productEntryLogs)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productEntryLogs.plantId, plantId), (0, drizzle_orm_1.gte)(schema_1.productEntryLogs.stationId, startStationsMKId)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.productEntryLogs.stationId));
        let simulLastStationProduct = null;
        function shiftStations(group, tx, stationIds) {
            return __awaiter(this, void 0, void 0, function* () {
                for (const log of group) {
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
                        const previousStationName = lookupCache.getStationName(log.stationId);
                        const nextStationName = lookupCache.getStationName(nextStationId);
                        console.log(`Product ${log.productId} moved from ${previousStationName} to ${nextStationName}`);
                    }
                    else {
                        const lastStationName = lookupCache.getStationName(log.stationId);
                        console.log("Is Simultaneous last station:", !productLogsMK.map(l => l.stationId).includes(log.stationId), lastStationName);
                        if (lastStationInLongestSimulGroup === log.stationId || refeedStationId) {
                            const lastProduct = yield tx.select({ productId: schema_1.productEntryLogs.productId }).from(schema_1.productEntryLogs).where((0, drizzle_orm_1.eq)(schema_1.productEntryLogs.id, log.id));
                            simulLastStationProduct = lastProduct[0].productId;
                            console.log("Product exiting at longest last simultaneous station:", lastStationName, simulLastStationProduct);
                        }
                        yield tx.delete(schema_1.productEntryLogs).where((0, drizzle_orm_1.eq)(schema_1.productEntryLogs.id, log.id));
                    }
                }
            });
        }
        yield client_1.db.transaction((tx) => __awaiter(this, void 0, void 0, function* () {
            if (refeedStationId && simultaneousStations.flat().includes(refeedStationId)) {
                const stationsIds = simultaneousStations.find(s => s.includes(refeedStationId));
                if (stationsIds) {
                    const group = groupProductLogs.find(g => g.some(log => log.stationId === refeedStationId));
                    const groupLogFromRefeedStation = group === null || group === void 0 ? void 0 : group.filter(log => log.stationId >= refeedStationId);
                    console.log("Shifting refeed station group:", stationsIds, groupLogFromRefeedStation === null || groupLogFromRefeedStation === void 0 ? void 0 : groupLogFromRefeedStation.map(l => lookupCache.getStationName(l.stationId)));
                    if (groupLogFromRefeedStation) {
                        yield shiftStations(groupLogFromRefeedStation, tx, stationsIds);
                    }
                }
            }
            else if (!refeedStationId) {
                console.log("Shifting simultaneous stations groups");
                yield Promise.all(groupProductLogs.map((group, i) => __awaiter(this, void 0, void 0, function* () {
                    const stationsIds = simultaneousStations.find(s => group.some(log => s.includes(log.stationId)));
                    if (!stationsIds)
                        return;
                    group.forEach(log => {
                        const stationName = lookupCache.getStationName(log.stationId);
                        console.log(`Group ${i} log at station:`, stationName);
                    });
                    yield shiftStations(group, tx, stationsIds);
                })));
            }
            // Re-insert products that exited simultaneous stations back into the line at the next station group
            if (simulLastStationProduct === null) {
                console.error("No products exited simultaneous stations");
            }
            // if (simulLastStationProduct.size > 1) {
            //   console.error("Multiple products exited simultaneous stations, not re-inserting:", simulLastStationProduct);
            //   return;
            // }
            if ((simulLastStationProduct || refeedStationId) && startStationsMKId) {
                // Shift MK stations
                console.log("Shifting MK stations");
                yield shiftStations(productLogsMK, tx, stationsMK.map(s => s.id));
                console.log("Re-inserting product exiting simultaneous stations back into the line at MK:", simulLastStationProduct);
                const productId = simulLastStationProduct;
                if (!productId) {
                    console.error("No productId found for re-insertion");
                    return;
                }
                yield tx.insert(schema_1.productEntryLogs).values({
                    plantId,
                    stationId: startStationsMKId,
                    productId: productId,
                    timestamp: new Date(),
                });
            }
            // Insert if new product, at the start of all simultaneous statinos else if re-fed product then at the specified station
            if (Array.isArray(startStationIds) && startStationIds.length !== 0) {
                yield tx.insert(schema_1.productEntryLogs).values(startStationIds.map(stationId => ({
                    plantId,
                    stationId: stationId,
                    productId: variantId,
                    timestamp: new Date(),
                })));
            }
            else if (typeof startStationIds === "number")
                yield tx.insert(schema_1.productEntryLogs).values({
                    plantId,
                    stationId: startStationIds,
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
