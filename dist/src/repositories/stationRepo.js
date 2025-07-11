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
exports.StationRepository = void 0;
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
class StationRepository {
    static create(name) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield client_1.db.insert(schema_1.stations).values({ name }).returning();
                return { success: true, data: result[0] };
            }
            catch (error) {
                console.error("Error creating station:", error);
                return { success: false, error: "Failed to create station." };
            }
        });
    }
    static findById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield client_1.db.select().from(schema_1.stations).where((0, drizzle_orm_1.eq)(schema_1.stations.id, id));
                if (!result[0]) {
                    return { success: false, error: "Station not found." };
                }
                return { success: true, data: result[0] };
            }
            catch (error) {
                console.error(`Error finding station with id ${id}:`, error);
                return { success: false, error: "Failed to retrieve station." };
            }
        });
    }
    static findAll() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield client_1.db.select().from(schema_1.stations);
                return { success: true, data: result };
            }
            catch (error) {
                console.error("Error fetching stations:", error);
                return { success: false, error: "Failed to fetch stations." };
            }
        });
    }
    static update(id, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield client_1.db.update(schema_1.stations)
                    .set(updates)
                    .where((0, drizzle_orm_1.eq)(schema_1.stations.id, id))
                    .returning();
                if (!result[0]) {
                    return { success: false, error: "Station not found or no changes applied." };
                }
                return { success: true, data: result[0] };
            }
            catch (error) {
                console.error(`Error updating station with id ${id}:`, error);
                return { success: false, error: "Failed to update station." };
            }
        });
    }
    static delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield client_1.db.delete(schema_1.stations)
                    .where((0, drizzle_orm_1.eq)(schema_1.stations.id, id))
                    .returning();
                if (!result[0]) {
                    return { success: false, error: "Station not found." };
                }
                return { success: true, data: result[0] };
            }
            catch (error) {
                console.error(`Error deleting station with id ${id}:`, error);
                return { success: false, error: "Failed to delete station." };
            }
        });
    }
}
exports.StationRepository = StationRepository;
