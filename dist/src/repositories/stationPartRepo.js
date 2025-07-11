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
exports.StationPartsRepository = void 0;
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
class StationPartsRepository {
    static create(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield client_1.db.insert(schema_1.stationParts).values(data).returning();
                return { success: true, data: result[0] };
            }
            catch (error) {
                console.error("Error creating station part:", error);
                return { success: false, error: "Failed to create station part." };
            }
        });
    }
    static findById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield client_1.db.select().from(schema_1.stationParts).where((0, drizzle_orm_1.eq)(schema_1.stationParts.id, id));
                if (!result[0]) {
                    return { success: false, error: "Station part not found." };
                }
                return { success: true, data: result[0] };
            }
            catch (error) {
                console.error(`Error finding station part with id ${id}:`, error);
                return { success: false, error: "Failed to retrieve station part." };
            }
        });
    }
    static findAll() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield client_1.db.select().from(schema_1.stationParts);
                return { success: true, data: result };
            }
            catch (error) {
                console.error("Error fetching station parts:", error);
                return { success: false, error: "Failed to fetch station parts." };
            }
        });
    }
    static update(id, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield client_1.db
                    .update(schema_1.stationParts)
                    .set(Object.assign(Object.assign({}, updates), { updatedAt: new Date() }))
                    .where((0, drizzle_orm_1.eq)(schema_1.stationParts.id, id))
                    .returning();
                if (!result[0]) {
                    return { success: false, error: "Station part not found or no changes applied." };
                }
                return { success: true, data: result[0] };
            }
            catch (error) {
                console.error(`Error updating station part with id ${id}:`, error);
                return { success: false, error: "Failed to update station part." };
            }
        });
    }
    static delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield client_1.db
                    .delete(schema_1.stationParts)
                    .where((0, drizzle_orm_1.eq)(schema_1.stationParts.id, id))
                    .returning();
                if (!result[0]) {
                    return { success: false, error: "Station part not found." };
                }
                return { success: true, data: result[0] };
            }
            catch (error) {
                console.error(`Error deleting station part with id ${id}:`, error);
                return { success: false, error: "Failed to delete station part." };
            }
        });
    }
    // Optional: Fetch by composite keys (e.g., for station + part + product)
    static findByComposite(stationId, partId, productId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield client_1.db.select().from(schema_1.stationParts).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stationParts.stationId, stationId), ((0, drizzle_orm_1.eq)(schema_1.stationParts.partId, partId)), ((0, drizzle_orm_1.eq)(schema_1.stationParts.productId, productId))));
                return { success: true, data: result };
            }
            catch (error) {
                console.error("Error fetching by composite keys:", error);
                return { success: false, error: "Failed to fetch station part by composite keys." };
            }
        });
    }
}
exports.StationPartsRepository = StationPartsRepository;
