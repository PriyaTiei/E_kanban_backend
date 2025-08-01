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
exports.handleSupplyUpdate = handleSupplyUpdate;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
function handleSupplyUpdate(kanbanIds) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Received request to update kanban in supply list:", kanbanIds);
        if (!Array.isArray(kanbanIds) || kanbanIds.length === 0) {
            throw new Error("kanbanIds array is required");
        }
        try {
            const fulfilled = true;
            const fulfilledAt = new Date();
            const result = yield client_1.db
                .update(schema_1.kanbanRequests)
                .set({ fulfilled, fulfilledAt })
                .where((0, drizzle_orm_1.inArray)(schema_1.kanbanRequests.id, kanbanIds))
                .returning();
            if (result.length === 0) {
                throw new Error("Kanban not found");
            }
            return 1;
        }
        catch (error) {
            console.error("Error updating kanban:", error);
            throw new Error("Internal server error");
        }
    });
}
;
