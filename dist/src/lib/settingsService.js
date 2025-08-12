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
exports.getSetting = getSetting;
exports.setSetting = setSetting;
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
function getSetting(key) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield client_1.db.select().from(schema_1.settings).where((0, drizzle_orm_1.eq)(schema_1.settings.key, key)).limit(1);
        return result.length > 0 ? result[0].value : null;
    });
}
function setSetting(key, value) {
    return __awaiter(this, void 0, void 0, function* () {
        yield client_1.db
            .insert(schema_1.settings)
            .values({ key, value, updatedAt: new Date() })
            .onConflictDoUpdate({
            target: schema_1.settings.key,
            set: {
                value,
                updatedAt: new Date(),
            },
        });
    });
}
