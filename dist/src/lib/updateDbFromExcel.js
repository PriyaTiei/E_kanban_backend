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
exports.updateDbFromExcel = updateDbFromExcel;
const exceljs_1 = __importDefault(require("exceljs"));
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const lookupCache_1 = require("./lookupCache");
const productEntryHelper_1 = require("./productEntryHelper");
function makeError(msg, err) {
    console.error("❌ Error:", msg, err instanceof Error ? err.stack : err);
    throw new Error(msg);
}
function getHeaderMap(row) {
    const map = {};
    row.eachCell((cell, colNumber) => {
        if (cell.value) {
            map[String(cell.value).trim()] = colNumber;
        }
    });
    return map;
}
/* ---------------- PRODUCTS ---------------- */
function processProducts(sheet, tx, plantId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const dbVariants = new Set((yield tx.select({ variant: schema_1.products.variant })
            .from(schema_1.products)
            .where((0, drizzle_orm_1.eq)(schema_1.products.plantId, plantId))).map((row) => row.variant));
        const excelVariants = new Set();
        let headerMap = {};
        for (const row of sheet.getRows(1, sheet.rowCount) || []) {
            if (row.number === 1) {
                headerMap = getHeaderMap(row);
                continue;
            }
            const variant = (_a = row.getCell(headerMap["variant"]).value) === null || _a === void 0 ? void 0 : _a.toString().trim();
            if (!variant)
                continue;
            excelVariants.add(variant);
            if (!dbVariants.has(variant)) {
                try {
                    yield tx.insert(schema_1.products).values({ variant, plantId });
                }
                catch (err) {
                    return makeError(`Failed to insert product '${variant}' (row ${row.number})`, err);
                }
            }
        }
        return { success: true };
    });
}
/* ---------------- STATIONS ---------------- */
function processStations(sheet, tx, plantId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const dbNames = new Set((yield tx.select({ name: schema_1.stations.name })
            .from(schema_1.stations)
            .where((0, drizzle_orm_1.eq)(schema_1.stations.plantId, plantId))).map((row) => row.name));
        const excelNames = new Set();
        let headerMap = {};
        for (const row of sheet.getRows(1, sheet.rowCount) || []) {
            if (row.number === 1) {
                headerMap = getHeaderMap(row);
                continue;
            }
            const name = (_a = row.getCell(headerMap["name"]).value) === null || _a === void 0 ? void 0 : _a.toString().trim();
            // const plant = row.getCell(headerMap["plant"]).value?.toString().trim();
            if (!name)
                continue;
            excelNames.add(name);
            if (!dbNames.has(name)) {
                try {
                    // const plantId = lookupCache.getPlantId(plant);
                    yield tx.insert(schema_1.stations).values({ name, plantId });
                }
                catch (err) {
                    return makeError(`Failed to insert station '${name}' (row ${row.number})`, err);
                }
            }
        }
        // Delete stations not in Excel
        for (const dbName of dbNames) {
            if (!excelNames.has(dbName)) {
                try {
                    yield tx.delete(schema_1.stations).where((0, drizzle_orm_1.eq)(schema_1.stations.name, dbName));
                }
                catch (err) {
                    return makeError(`Failed to delete station '${dbName}'`, err);
                }
            }
        }
        return { success: true };
    });
}
/* ---------------- PARTS ---------------- */
function processParts(sheet, tx, plantId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const dbPartIds = new Set((yield tx.select({ partId: schema_1.parts.partId })
            .from(schema_1.parts)
            .where((0, drizzle_orm_1.eq)(schema_1.parts.plantId, plantId))).map((row) => row.partId));
        const excelPartIds = new Set();
        let headerMap = {};
        for (const row of sheet.getRows(1, sheet.rowCount) || []) {
            if (row.number === 1) {
                headerMap = getHeaderMap(row);
                continue;
            }
            const partId = (_a = row.getCell(headerMap["partId"]).value) === null || _a === void 0 ? void 0 : _a.toString().trim();
            let name = (_b = row.getCell(headerMap["name"]).value) === null || _b === void 0 ? void 0 : _b.toString().trim();
            let partNumber = (_c = row.getCell(headerMap["partNumber"]).value) === null || _c === void 0 ? void 0 : _c.toString().trim();
            if (!partId)
                continue;
            excelPartIds.add(partId);
            if (!dbPartIds.has(partId)) {
                try {
                    name = name || "";
                    partNumber = partNumber || "";
                    const result = yield tx.insert(schema_1.parts).values({ partId, name, partNumber, plantId }).returning({ id: schema_1.parts.id });
                    // console.log("Inserted new part:", result[0].id, partId, name, partNumber);
                }
                catch (err) {
                    return makeError(`Failed to insert part '${partId}' (row ${row.number})`, err);
                }
            }
            else {
                // Optionally update existing part's name or partNumber if changed
                try {
                    const dbPart = yield tx.select()
                        .from(schema_1.parts)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.parts.partId, partId), (0, drizzle_orm_1.eq)(schema_1.parts.plantId, plantId)));
                    if (dbPart.length === 1) {
                        const updates = {};
                        if (name && dbPart[0].name !== name)
                            updates.name = name;
                        if (partNumber && dbPart[0].partNumber !== partNumber)
                            updates.partNumber = partNumber;
                        if (Object.keys(updates).length > 0) {
                            yield tx.update(schema_1.parts).set(updates).where((0, drizzle_orm_1.eq)(schema_1.parts.partId, partId));
                        }
                    }
                }
                catch (err) {
                    return makeError(`Failed to update part '${partId}' (row ${row.number})`, err);
                }
            }
        }
        // Delete parts not in Excel
        for (const dbPartId of dbPartIds) {
            if (dbPartId && !excelPartIds.has(dbPartId)) {
                try {
                    yield tx.delete(schema_1.parts).where((0, drizzle_orm_1.eq)(schema_1.parts.partId, dbPartId));
                }
                catch (err) {
                    return makeError(`Failed to delete part '${dbPartId}'`, err);
                }
            }
        }
        return { success: true };
    });
}
/* ---------------- STATION PARTS ---------------- */
function processStationParts(sheet, tx, plantId) {
    return __awaiter(this, void 0, void 0, function* () {
        const dbStationParts = yield tx.select()
            .from(schema_1.stationParts)
            .where((0, drizzle_orm_1.eq)(schema_1.stationParts.plantId, plantId));
        const stationPartMap = new Map();
        dbStationParts.forEach((sp) => {
            stationPartMap.set(`${sp.stationId}_${sp.partId}`, sp);
        });
        const excelStationPartKeys = new Set();
        let headerMap = {};
        for (const row of sheet.getRows(1, sheet.rowCount) || []) {
            if (row.number === 1) {
                row.eachCell((cell, colNumber) => {
                    if (cell.value === "station")
                        headerMap["stationId"] = colNumber;
                    else if (cell.value === "part")
                        headerMap["partId"] = colNumber;
                    else
                        headerMap[String(cell.value).trim()] = colNumber;
                });
                continue;
            }
            const stationRaw = row.getCell(headerMap["stationId"]).value;
            const partRaw = row.getCell(headerMap["partId"]).value;
            if (!stationRaw || !partRaw) {
                console.log(`Skipping row ${row.number} due to missing station or part`);
                continue;
            }
            const station = String(stationRaw).trim();
            const part = String(partRaw).trim();
            let stationId, partId;
            try {
                stationId = yield tx.select({ id: schema_1.stations.id, name: schema_1.stations.name })
                    .from(schema_1.stations)
                    .where((0, drizzle_orm_1.like)(schema_1.stations.name, station));
                // console.log("stationId lookup", stationId);
                stationId = stationId[0].id;
                partId = yield tx.select({ id: schema_1.parts.id, partId: schema_1.parts.partId })
                    .from(schema_1.parts)
                    .where((0, drizzle_orm_1.like)(schema_1.parts.partId, part));
                // console.log("partId lookup", partId);
                partId = partId[0].id;
            }
            catch (err) {
                return makeError(`Lookup failed for station='${station}', part='${part}' (row ${row.number})`, err);
            }
            const key = `${stationId}_${partId}`;
            excelStationPartKeys.add(key);
            const dbRow = stationPartMap.get(key);
            const updateData = {};
            Object.keys(headerMap).forEach((header) => {
                let cellValue = row.getCell(headerMap[header]).value;
                // unwrap ExcelJS objects
                if (typeof cellValue === "object" && cellValue !== null) {
                    console.log(`cellValue: ${JSON.stringify(cellValue, null, 2)}`);
                    if ("result" in cellValue)
                        cellValue = cellValue.result; // for formula cells
                    else if ("text" in cellValue)
                        cellValue = cellValue.text;
                    else if ("richText" in cellValue)
                        cellValue = cellValue.richText.map((t) => t.text).join("");
                    else if ("value" in cellValue)
                        cellValue = String(cellValue.value);
                }
                if (typeof cellValue === "number")
                    cellValue = Math.round(cellValue);
                let value = String(cellValue).trim();
                console.log(`value: ${value}`);
                if (header === "stationId")
                    value = stationId;
                if (header === "partId")
                    value = partId;
                updateData[header] = value;
            });
            try {
                if (!dbRow) {
                    yield tx.insert(schema_1.stationParts).values(Object.assign(Object.assign({}, updateData), { plantId }));
                }
                else {
                    delete updateData.currentQuantity;
                    let needsUpdate = false;
                    for (const key in updateData) {
                        if (dbRow[key] !== updateData[key]) {
                            needsUpdate = true;
                            break;
                        }
                    }
                    if (needsUpdate) {
                        yield tx
                            .update(schema_1.stationParts)
                            .set(updateData)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stationParts.stationId, stationId), (0, drizzle_orm_1.eq)(schema_1.stationParts.partId, partId)));
                    }
                }
            }
            catch (err) {
                return makeError(`Failed to insert/update stationPart (station=${station}, part=${part})`, err);
            }
        }
        // Delete stationParts not in Excel
        for (const dbKey of stationPartMap.keys()) {
            if (!excelStationPartKeys.has(dbKey)) {
                const [stationId, partId] = dbKey.split("_").map(Number);
                try {
                    yield tx
                        .delete(schema_1.stationParts)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stationParts.stationId, stationId), (0, drizzle_orm_1.eq)(schema_1.stationParts.partId, partId)));
                }
                catch (err) {
                    return makeError(`Failed to delete stationPart (stationId=${stationId}, partId=${partId})`, err);
                }
            }
        }
        return { success: true };
    });
}
/* ---------------- PRODUCT PART EXCEPTIONS ---------------- */
function processProductPartExceptions(sheet, tx, plantId) {
    return __awaiter(this, void 0, void 0, function* () {
        const dbExceptions = yield tx
            .select({
            productId: schema_1.productPartExceptions.productId,
            partId: schema_1.productPartExceptions.partId,
        })
            .from(schema_1.productPartExceptions)
            .where((0, drizzle_orm_1.eq)(schema_1.productPartExceptions.plantId, plantId));
        const exceptionSet = new Set(dbExceptions.map((e) => `${e.productId}_${e.partId}`));
        const excelExceptionSet = new Set();
        let headerMap = {};
        for (const row of sheet.getRows(1, sheet.rowCount) || []) {
            if (row.number === 1) {
                headerMap = getHeaderMap(row);
                continue;
            }
            const productRaw = row.getCell(headerMap["product"]).value;
            const partRaw = row.getCell(headerMap["part"]).value;
            if (!productRaw || !partRaw) {
                console.log(`Skipping row ${row.number} due to missing product or part`);
                continue;
            }
            const product = String(productRaw).trim();
            const part = String(partRaw).trim();
            if (!product || !part) {
                console.log(`Skipping row ${row.number} due to missing product or part`);
                continue;
            }
            let productId, partId;
            try {
                productId = yield tx.select({ id: schema_1.products.id })
                    .from(schema_1.products)
                    .where((0, drizzle_orm_1.like)(schema_1.products.variant, product));
                productId = productId[0].id;
                partId = yield tx.select({ id: schema_1.parts.id })
                    .from(schema_1.parts)
                    .where((0, drizzle_orm_1.like)(schema_1.parts.partId, part));
                partId = partId[0].id;
                if (!productId) {
                    const newProductId = yield (0, productEntryHelper_1.insertNewVariant)(product, plantId);
                    productId = newProductId[0].id;
                }
            }
            catch (err) {
                return makeError(`Lookup/insert failed for exception (product='${product}', part='${part}', row ${row.number})`, err);
            }
            const key = `${productId}_${partId}`;
            excelExceptionSet.add(key);
            if (!exceptionSet.has(key)) {
                try {
                    yield tx.insert(schema_1.productPartExceptions).values({ productId, partId, plantId });
                }
                catch (err) {
                    return makeError(`Failed to insert productPartException (product=${product}, part=${part})`, err);
                }
            }
        }
        // Delete exceptions not in Excel
        for (const dbKey of exceptionSet) {
            if (!excelExceptionSet.has(dbKey)) {
                const [productId, partId] = dbKey.split("_").map(Number);
                try {
                    yield tx
                        .delete(schema_1.productPartExceptions)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productPartExceptions.productId, productId), (0, drizzle_orm_1.eq)(schema_1.productPartExceptions.partId, partId)));
                }
                catch (err) {
                    return makeError(`Failed to delete productPartException (productId=${productId}, partId=${partId})`, err);
                }
            }
        }
        return { success: true };
    });
}
/* ---------------- MAIN FUNCTION ---------------- */
function updateDbFromExcel(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let plantId;
            if (filePath.endsWith("GD.xlsx")) {
                plantId = 1;
            }
            else if (filePath.endsWith("TNGA.xlsx")) {
                plantId = 2;
            }
            else {
                throw new Error("Invalid filePath: must end with 'GD' or 'TNGA'");
            }
            yield lookupCache_1.lookupCache.initialize(plantId);
            const workbook = new exceljs_1.default.Workbook();
            yield workbook.xlsx.readFile(filePath);
            return yield client_1.db.transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                // Products
                const productsSheet = workbook.getWorksheet("products");
                if (productsSheet) {
                    yield processProducts(productsSheet, tx, plantId);
                    // if (!res.success) return res;
                }
                // Stations
                const stationsSheet = workbook.getWorksheet("stations");
                if (stationsSheet) {
                    yield processStations(stationsSheet, tx, plantId);
                    // if (!res.success) return res;
                }
                // Parts
                const partsSheet = workbook.getWorksheet("parts");
                if (partsSheet) {
                    yield processParts(partsSheet, tx, plantId);
                    // if (!res.success) return res;
                }
                // StationParts
                const stationPartsSheet = workbook.getWorksheet("stationParts");
                if (stationPartsSheet) {
                    yield processStationParts(stationPartsSheet, tx, plantId);
                    // if (!res.success) return res;
                }
                // ProductPartExceptions
                const productPartExceptionsSheet = workbook.getWorksheet("productPartExceptions");
                if (productPartExceptionsSheet) {
                    yield processProductPartExceptions(productPartExceptionsSheet, tx, plantId);
                    // if (!res.success) return res;
                }
                return { success: true, message: "✅ Excel sync completed successfully" };
            }));
        }
        catch (err) {
            return {
                success: false,
                error: err instanceof Error ? err.message : "Unknown error",
            };
        }
    });
}
