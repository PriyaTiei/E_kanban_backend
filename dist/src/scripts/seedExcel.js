"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const XLSX = __importStar(require("xlsx"));
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const path_1 = __importDefault(require("path"));
const workbook = XLSX.readFile(path_1.default.join(__dirname, "../data/seedData.xlsx"));
function parseSheet(sheetName) {
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet);
}
function seed() {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. Products
        // const productRows = parseSheet("products");
        // await db.insert(products).values(
        //   productRows.map(row => ({ variant: row.variant }))
        // );
        // 2. Stations
        // const stationRows = parseSheet("stations");
        // await db.insert(stations).values(
        //   stationRows.map(row => ({name: row.name}
        //   )));
        // 3. Parts
        const partRows = parseSheet("parts");
        for (const row of partRows) {
            yield client_1.db.update(schema_1.parts).set({
                name: row.name,
                partId: row.partId || null,
                partNumber: row.partNumber || null,
            }).where((0, drizzle_orm_1.eq)(schema_1.parts.partId, row.partId));
        }
        // // 4. Station Parts
        // await lookupCache.initialize();
        // const stationPartRows = parseSheet("stationParts");
        // await db.insert(stationParts).values(
        //   stationPartRows.map((row) =>{
        //     console.log("Processing Station: ", row.station, "Part: ", row.part);
        //     return({
        //       stationId: lookupCache.getStationId(row.station),
        //       partId: lookupCache.getPartId(String(row.part)),
        //       consumptionPerProduct: row.consumptionPerProduct,
        //       binQuantity: row.binQuantity,
        //       currentQuantity: row.currentQuantity,
        //       supplyLocation: row.supplyLocation || null,
        //       process: row.process || null,
        //       prepLocation: row.prepLocation || null,
        // })}));
        //   const productPartExceptionsRows = parseSheet("productPartExceptions");
        //   await db.insert(productPartExceptions).values(
        //     productPartExceptionsRows.map((row) => ({
        //       productId: lookupCache.getProductId(row.product),
        //       partId: lookupCache.getPartId(row.part)
        //     }))
        //   );
        console.log("All data updated successfully.");
    });
}
seed().catch(console.error);
