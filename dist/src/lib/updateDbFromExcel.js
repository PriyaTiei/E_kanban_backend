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
exports.updateDbFromExcel = void 0;
const exceljs_1 = __importDefault(require("exceljs"));
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const lookupCache_1 = require("./lookupCache");
const updateDbFromExcel = (filePath) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    lookupCache_1.lookupCache.initialize();
    try {
        const workbook = new exceljs_1.default.Workbook();
        yield workbook.xlsx.readFile(filePath);
        // PRODUCTS
        const productsSheet = workbook.getWorksheet("products");
        if (productsSheet) {
            const dbVariants = new Set((yield client_1.db.select({ variant: schema_1.products.variant }).from(schema_1.products)).map((row) => row.variant));
            const excelVariants = new Set();
            const headerMap = {};
            productsSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => __awaiter(void 0, void 0, void 0, function* () {
                var _a;
                if (rowNumber === 1) {
                    row.eachCell((cell, colNumber) => {
                        headerMap[String(cell.value)] = colNumber;
                    });
                    return;
                }
                ;
                const variant = (_a = row.getCell(headerMap["variant"]).value) === null || _a === void 0 ? void 0 : _a.toString();
                if (variant) {
                    excelVariants.add(variant);
                    if (!dbVariants.has(variant)) {
                        yield client_1.db.insert(schema_1.products).values({ variant });
                    }
                }
            }));
            // Delete products not in Excel
            for (const dbVariant of dbVariants) {
                if (!excelVariants.has(dbVariant)) {
                    yield client_1.db.delete(schema_1.products).where((0, drizzle_orm_1.eq)(schema_1.products.variant, dbVariant));
                }
            }
        }
        // STATIONS
        const stationsSheet = workbook.getWorksheet("stations");
        if (stationsSheet) {
            const dbNames = new Set((yield client_1.db.select({ name: schema_1.stations.name }).from(schema_1.stations)).map((row) => row.name));
            console.log("Database station names: ", dbNames);
            const excelNames = new Set();
            const headerMap = {};
            const rows = [];
            console.log("A");
            stationsSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                rows.push({ row, rowNumber });
            });
            console.log("B");
            for (const { row, rowNumber } of rows) {
                if (rowNumber === 1) {
                    row.eachCell((cell, colNumber) => {
                        headerMap[String(cell.value)] = colNumber;
                    });
                    continue;
                }
                ;
                const name = (_a = row.getCell(headerMap["name"]).value) === null || _a === void 0 ? void 0 : _a.toString();
                const plant = (_b = row.getCell(headerMap["plant"]).value) === null || _b === void 0 ? void 0 : _b.toString();
                if (name && plant) {
                    excelNames.add(name);
                    if (!dbNames.has(name)) {
                        const plantId = lookupCache_1.lookupCache.getPlantId(plant); // Ensure plant exists
                        yield client_1.db.insert(schema_1.stations).values({ name, plantId });
                    }
                }
            }
            ;
            console.log("Excel station names: ", excelNames);
            // Delete stations not in Excel
            for (const dbName of dbNames) {
                if (!excelNames.has(dbName)) {
                    console.log("station to delete: ", dbName);
                    yield client_1.db.delete(schema_1.stations).where((0, drizzle_orm_1.eq)(schema_1.stations.name, dbName));
                }
            }
        }
        // PARTS
        const partsSheet = workbook.getWorksheet("parts");
        if (partsSheet) {
            const dbPartIds = new Set((yield client_1.db.select({ partId: schema_1.parts.partId }).from(schema_1.parts)).map((row) => row.partId));
            const excelPartIds = new Set();
            const headerMap = {};
            partsSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => __awaiter(void 0, void 0, void 0, function* () {
                var _a, _b, _c;
                if (rowNumber === 1) {
                    row.eachCell((cell, colNumber) => {
                        headerMap[String(cell.value)] = colNumber;
                    });
                    return;
                }
                ;
                const partId = (_a = row.getCell(headerMap["partId"]).value) === null || _a === void 0 ? void 0 : _a.toString();
                const name = (_b = row.getCell(headerMap["name"]).value) === null || _b === void 0 ? void 0 : _b.toString();
                const partNumber = (_c = row.getCell(headerMap["partNumber"]).value) === null || _c === void 0 ? void 0 : _c.toString();
                if (partId && name && partNumber) {
                    excelPartIds.add(partId);
                    if (!dbPartIds.has(partId)) {
                        yield client_1.db.insert(schema_1.parts).values({ partId, name, partNumber });
                    }
                }
            }));
            // Delete parts not in Excel
            for (const dbPartId of dbPartIds) {
                if (dbPartId && !excelPartIds.has(dbPartId)) {
                    yield client_1.db.delete(schema_1.parts).where((0, drizzle_orm_1.eq)(schema_1.parts.name, dbPartId));
                }
            }
        }
        // STATION PARTS
        const stationPartsSheet = workbook.getWorksheet("stationParts");
        if (stationPartsSheet) {
            const dbStationParts = yield client_1.db.select().from(schema_1.stationParts);
            const stationPartMap = new Map();
            dbStationParts.forEach((sp) => {
                stationPartMap.set(`${sp.stationId}_${sp.partId}`, sp);
            });
            const excelStationPartKeys = new Set();
            const headerMap = {};
            stationPartsSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => __awaiter(void 0, void 0, void 0, function* () {
                if (rowNumber === 1) {
                    row.eachCell((cell, colNumber) => {
                        if (cell.value === 'station')
                            headerMap["stationId"] = colNumber;
                        else if (cell.value === 'part')
                            headerMap["partId"] = colNumber;
                        else
                            headerMap[String(cell.value)] = colNumber;
                    });
                    return;
                }
                ;
                const station = String(row.getCell(headerMap["stationId"]).value);
                const part = String(row.getCell(headerMap["partId"]).value);
                const stationId = lookupCache_1.lookupCache.getStationId(station);
                const partId = lookupCache_1.lookupCache.getPartId(part);
                const key = `${stationId}_${partId}`;
                excelStationPartKeys.add(key);
                const dbRow = stationPartMap.get(key);
                const updateData = {};
                Object.keys(headerMap).forEach((header) => {
                    let value;
                    value = String(row.getCell(headerMap[header]).value);
                    if (header === "stationId") {
                        value = stationId;
                    }
                    else if (header === "partId") {
                        value = partId;
                    }
                    updateData[header] = value;
                });
                console.log("updating stationParts: ", updateData);
                if (!dbRow) {
                    yield client_1.db.insert(schema_1.stationParts).values(updateData);
                }
                else {
                    // Compare and update if necessary (excluding currentQuantity)
                    delete updateData.currentQuantity;
                    let needsUpdate = false;
                    for (const key in updateData) {
                        if (dbRow[key] !== updateData[key]) {
                            needsUpdate = true;
                            break;
                        }
                    }
                    if (needsUpdate) {
                        yield client_1.db.update(schema_1.stationParts)
                            .set(updateData)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stationParts.stationId, stationId), (0, drizzle_orm_1.eq)(schema_1.stationParts.partId, partId)));
                    }
                }
            }));
            // Delete stationParts not in Excel
            for (const dbKey of stationPartMap.keys()) {
                if (!excelStationPartKeys.has(dbKey)) {
                    const [stationId, partId] = dbKey.split("_").map(Number);
                    yield client_1.db.delete(schema_1.stationParts)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stationParts.stationId, stationId), (0, drizzle_orm_1.eq)(schema_1.stationParts.partId, partId)));
                }
            }
        }
        // PRODUCT PART EXCEPTIONS
        const productPartExceptionsSheet = workbook.getWorksheet("productPartExceptions");
        if (productPartExceptionsSheet) {
            const dbExceptions = yield client_1.db.select({
                productId: schema_1.productPartExceptions.productId,
                partId: schema_1.productPartExceptions.partId,
            }).from(schema_1.productPartExceptions);
            const exceptionSet = new Set(dbExceptions.map(e => `${e.productId}_${e.partId}`));
            const excelExceptionSet = new Set();
            const headerMap = {};
            productPartExceptionsSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => __awaiter(void 0, void 0, void 0, function* () {
                if (rowNumber === 1) {
                    row.eachCell((cell, colNumber) => {
                        headerMap[String(cell.value)] = colNumber;
                    });
                    return;
                }
                ;
                const product = String(row.getCell(headerMap["product"]).value);
                const part = String(row.getCell(headerMap["part"]).value);
                const productId = lookupCache_1.lookupCache.getProductId(product);
                const partId = lookupCache_1.lookupCache.getPartId(part);
                const key = `${productId}_${partId}`;
                excelExceptionSet.add(key);
                if (!exceptionSet.has(key)) {
                    yield client_1.db.insert(schema_1.productPartExceptions).values({ productId, partId });
                }
            }));
            // Delete exceptions not in Excel
            for (const dbKey of exceptionSet) {
                if (!excelExceptionSet.has(dbKey)) {
                    const [productId, partId] = dbKey.split("_").map(Number);
                    yield client_1.db.delete(schema_1.productPartExceptions)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productPartExceptions.productId, productId), (0, drizzle_orm_1.eq)(schema_1.productPartExceptions.partId, partId)));
                }
            }
        }
        return { success: true };
    }
    catch (error) {
        throw error;
    }
});
exports.updateDbFromExcel = updateDbFromExcel;
