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
function handleSupplyUpdate(suppliedKanbans) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!Array.isArray(suppliedKanbans) || suppliedKanbans.length === 0) {
            throw new Error("kanbanIds array is required");
        }
        try {
            const fulfilled = true;
            const fulfilledAt = new Date();
            const kanbansToUpdate = suppliedKanbans.map(suppliedKanban => Number(suppliedKanban.KANBAN_NO));
            function chunkArray(arr, size) {
                const chunks = [];
                for (let i = 0; i < arr.length; i += size) {
                    chunks.push(arr.slice(i, i + size));
                }
                return chunks;
            }
            const BATCH_SIZE = 1000;
            const batches = chunkArray(kanbansToUpdate, BATCH_SIZE);
            const result = batches.map((batch) => __awaiter(this, void 0, void 0, function* () {
                return (yield client_1.db
                    .update(schema_1.kanbanRequests)
                    .set({ fulfilled, fulfilledAt })
                    .where((0, drizzle_orm_1.inArray)(schema_1.kanbanRequests.id, batch))
                    .returning({ id: schema_1.kanbanRequests.id })).length;
            })).flat();
            if (result.length === 0) {
                throw new Error("Kanban not found");
            }
            console.log(`✅ Updated ${result.length} kanban batches as fulfilled.`);
            return 1;
        }
        catch (error) {
            console.error("Error updating kanban:", error);
            throw new Error("Internal server error");
        }
    });
}
;
