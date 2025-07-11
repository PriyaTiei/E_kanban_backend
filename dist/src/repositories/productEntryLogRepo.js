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
exports.ProductEntryLogsRepository = void 0;
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
class ProductEntryLogsRepository {
    static create(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield client_1.db.insert(schema_1.productEntryLogs).values(data).returning();
                return { success: true, data: result[0] };
            }
            catch (error) {
                console.error("Error creating product entry log:", error);
                return { success: false, error: "Failed to create product entry log." };
            }
        });
    }
    static findById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield client_1.db
                    .select()
                    .from(schema_1.productEntryLogs)
                    .where((0, drizzle_orm_1.eq)(schema_1.productEntryLogs.id, id));
                if (!result[0]) {
                    return { success: false, error: "Product entry log not found." };
                }
                return { success: true, data: result[0] };
            }
            catch (error) {
                console.error(`Error retrieving product entry log with id ${id}:`, error);
                return { success: false, error: "Failed to retrieve product entry log." };
            }
        });
    }
    static findAll() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield client_1.db.select().from(schema_1.productEntryLogs);
                return { success: true, data: result };
            }
            catch (error) {
                console.error("Error fetching product entry logs:", error);
                return { success: false, error: "Failed to fetch product entry logs." };
            }
        });
    }
    static findByProductId(productId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield client_1.db
                    .select()
                    .from(schema_1.productEntryLogs)
                    .where((0, drizzle_orm_1.eq)(schema_1.productEntryLogs.productId, productId));
                return { success: true, data: result };
            }
            catch (error) {
                console.error(`Error fetching logs for productId ${productId}:`, error);
                return { success: false, error: "Failed to fetch logs by product ID." };
            }
        });
    }
    static findByStationId(stationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield client_1.db
                    .select()
                    .from(schema_1.productEntryLogs)
                    .where((0, drizzle_orm_1.eq)(schema_1.productEntryLogs.stationId, stationId));
                return { success: true, data: result };
            }
            catch (error) {
                console.error(`Error fetching logs for stationId ${stationId}:`, error);
                return { success: false, error: "Failed to fetch logs by station ID." };
            }
        });
    }
}
exports.ProductEntryLogsRepository = ProductEntryLogsRepository;
