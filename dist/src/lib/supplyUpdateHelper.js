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
            const earliestSupplyKanban = new Date(suppliedKanbans[0].SCAN_SYS_DATE);
            // sort the kanbanRequests table in ascending order w.r.t. part number.
            const oldestFirstKanbansResult = yield Promise.all(suppliedKanbans.map((suppliedKanban) => __awaiter(this, void 0, void 0, function* () {
                return yield client_1.db.select({ kanbanId: schema_1.kanbanRequests.id })
                    .from(schema_1.kanbanRequests)
                    .leftJoin(schema_1.parts, (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.partId, schema_1.parts.id))
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.parts.partNumber, suppliedKanban.PART_NUMBER), 
                // gte(kanbanRequests.requestedAt, new Date(earliestSupplyKanban.getTime() - 24 * 60 * 60 * 1000)),
                (0, drizzle_orm_1.lt)(schema_1.kanbanRequests.requestedAt, new Date(suppliedKanban.SCAN_SYS_DATE))))
                    .orderBy((0, drizzle_orm_1.desc)(schema_1.kanbanRequests.requestedAt)).limit(1);
            })));
            const oldestFirstKanbanIds = oldestFirstKanbansResult.flat().map((idResult) => idResult.kanbanId);
            console.log(`Kanbans to update: ${oldestFirstKanbanIds.length}, kanbans: ${oldestFirstKanbanIds}`);
            if (oldestFirstKanbanIds.length === 0) {
                console.log("No kanban found to update");
                return;
            }
            const fulfilled = true;
            const fulfilledAt = new Date();
            const result = yield client_1.db
                .update(schema_1.kanbanRequests)
                .set({ fulfilled, fulfilledAt })
                .where((0, drizzle_orm_1.inArray)(schema_1.kanbanRequests.id, oldestFirstKanbanIds))
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
