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
exports.UsersRepository = void 0;
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
class UsersRepository {
    static create(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield client_1.db.insert(schema_1.users).values(data).returning();
                return { success: true, data: result[0] };
            }
            catch (error) {
                console.error("Error creating user:", error);
                return { success: false, error: "Failed to create user." };
            }
        });
    }
    static findById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield client_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id));
                if (!result[0]) {
                    return { success: false, error: "User not found." };
                }
                return { success: true, data: result[0] };
            }
            catch (error) {
                console.error(`Error finding user with id ${id}:`, error);
                return { success: false, error: "Failed to retrieve user." };
            }
        });
    }
    static findByUsername(username) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield client_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.username, username));
                if (!result[0]) {
                    return { success: false, error: "User not found." };
                }
                return { success: true, data: result[0] };
            }
            catch (error) {
                console.error(`Error finding user with username "${username}":`, error);
                return { success: false, error: "Failed to retrieve user by username." };
            }
        });
    }
    static findAll() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield client_1.db.select().from(schema_1.users);
                return { success: true, data: result };
            }
            catch (error) {
                console.error("Error fetching users:", error);
                return { success: false, error: "Failed to fetch users." };
            }
        });
    }
    static update(id, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield client_1.db.update(schema_1.users).set(updates).where((0, drizzle_orm_1.eq)(schema_1.users.id, id)).returning();
                if (!result[0]) {
                    return { success: false, error: "User not found or no changes applied." };
                }
                return { success: true, data: result[0] };
            }
            catch (error) {
                console.error(`Error updating user with id ${id}:`, error);
                return { success: false, error: "Failed to update user." };
            }
        });
    }
    static delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield client_1.db.delete(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id)).returning();
                if (!result[0]) {
                    return { success: false, error: "User not found." };
                }
                return { success: true, data: result[0] };
            }
            catch (error) {
                console.error(`Error deleting user with id ${id}:`, error);
                return { success: false, error: "Failed to delete user." };
            }
        });
    }
}
exports.UsersRepository = UsersRepository;
