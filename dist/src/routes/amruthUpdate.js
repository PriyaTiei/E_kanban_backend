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
exports.amruthUpdateRouter = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const express_1 = __importDefault(require("express"));
exports.amruthUpdateRouter = express_1.default.Router();
exports.amruthUpdateRouter.post("/kanbans", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const previouslyAcknowledgedKanbans = req.body;
        console.log("previouslyAcknowledgedKanbans: ", previouslyAcknowledgedKanbans);
        const whereClause = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kanbanRequests.acknowledgedByLogistics, true), (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.fulfilled, false));
        if (previouslyAcknowledgedKanbans && previouslyAcknowledgedKanbans.length > 0) {
            (0, drizzle_orm_1.and)(whereClause, (0, drizzle_orm_1.not)((0, drizzle_orm_1.inArray)(schema_1.kanbanRequests.id, previouslyAcknowledgedKanbans)));
        }
        const orderByClause = (0, drizzle_orm_1.sql) `
      ${schema_1.kanbanRequests.id},
      CASE
        WHEN ${schema_1.stationParts.supplyLocation} LIKE 'SA-%' THEN 1
        WHEN ${schema_1.stationParts.supplyLocation} LIKE 'MK1-%' THEN 2
        WHEN ${schema_1.stationParts.supplyLocation} LIKE 'MK2-%' THEN 3
        ELSE 4
      END,
      regexp_replace(${schema_1.stationParts.supplyLocation}, '[^0-9]', '', 'g')::int,
      ${schema_1.stationParts.supplyLocation},
      ${schema_1.kanbanRequests.acknowledgedAt}
    `;
        const stationPartsJoinCondition = (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.stationPartsId, schema_1.stationParts.id);
        const kanbans = yield client_1.db
            .selectDistinctOn([schema_1.kanbanRequests.id], {
            id: schema_1.kanbanRequests.id,
            sequenceNo: schema_1.kanbanRequests.id,
            process: schema_1.stationParts.process,
            plantId: schema_1.plants.plantId,
            partId: schema_1.parts.partId,
            partName: schema_1.parts.name,
            partNumber: schema_1.parts.partNumber,
            boxQty: schema_1.stationParts.binQuantity,
            supplyLocation: schema_1.stationParts.supplyLocation,
            acknowledgedAt: schema_1.kanbanRequests.acknowledgedAt,
        })
            .from(schema_1.kanbanRequests)
            .leftJoin(schema_1.stationParts, stationPartsJoinCondition)
            .leftJoin(schema_1.parts, (0, drizzle_orm_1.eq)(schema_1.stationParts.partId, schema_1.parts.id))
            .leftJoin(schema_1.plants, (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.plantId, schema_1.plants.id))
            .where(whereClause)
            .orderBy(orderByClause);
        const ISTDateFormatedResult = kanbans.map(kanban => {
            const acknowledgedAt = kanban.acknowledgedAt;
            if (acknowledgedAt) {
                const date = new Date(acknowledgedAt);
                const formattedDate = date.toLocaleString('en-GB', {
                    timeZone: 'Asia/Kolkata',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }).replace(',', '');
                return Object.assign(Object.assign({}, kanban), { acknowledgedAt: formattedDate });
            }
            return kanban;
        });
        console.log("Count of kanbans: ", ISTDateFormatedResult.length);
        return res.status(200).json(ISTDateFormatedResult);
    }
    catch (err) {
        console.error("Error fetching kanbans:", err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
}));
