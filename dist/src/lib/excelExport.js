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
exports.excelExport = excelExport;
exports.excelExportToLocal = excelExportToLocal;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const exceljs_1 = __importDefault(require("exceljs"));
const cleanupUploads_1 = require("./cleanupUploads");
function excelExport() {
    return __awaiter(this, void 0, void 0, function* () {
        // Fetch all data
        const [productsData, stationsData, partsData, stationPartsData, productPartExceptionsData] = yield Promise.all([
            client_1.db.select().from(schema_1.products),
            client_1.db.select().from(schema_1.stations),
            client_1.db.select().from(schema_1.parts),
            client_1.db.select().from(schema_1.stationParts),
            client_1.db.select().from(schema_1.productPartExceptions),
        ]);
        // Create a new workbook
        const workbook = new exceljs_1.default.Workbook();
        // Helper to add a worksheet from data
        function addSheet(name, data) {
            const sheet = workbook.addWorksheet(name);
            if (data.length > 0) {
                sheet.columns = Object.keys(data[0]).map((key) => ({ header: key, key }));
                sheet.addRows(data);
            }
        }
        addSheet("products", productsData);
        addSheet("stations", stationsData);
        addSheet("parts", partsData);
        addSheet("stationParts", stationPartsData);
        addSheet("productPartExceptions", productPartExceptionsData);
        // Write to buffer
        return Buffer.from(yield workbook.xlsx.writeBuffer());
    });
}
const exportDir = path_1.default.resolve(process.cwd(), 'export');
function excelExportToLocal() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const buffer = yield excelExport();
            // Ensure the export directory exists
            yield promises_1.default.mkdir(exportDir, { recursive: true });
            const filePath = path_1.default.join(exportDir, `E_Kanban_data_export_${Date.now()}.xlsx`);
            yield promises_1.default.writeFile(filePath, buffer);
        }
        catch (error) {
            console.error("Error exporting to Excel:", error);
            throw new Error("Failed to export data to Excel");
        }
        finally {
            (0, cleanupUploads_1.cleanup)(exportDir);
        }
    });
}
