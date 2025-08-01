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
exports.deleteKanban = deleteKanban;
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
function deleteKanban(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const isAdmin = user.role === "admin";
        if (!isAdmin) {
            return res.status(403).json({ error: "Forbidden: Only admins can delete kanbans" });
        }
        const { kanbanIds } = req.body;
        if (!Array.isArray(kanbanIds) || kanbanIds.length === 0 || kanbanIds.some(id => isNaN(Number(id)))) {
            return res.status(400).json({ error: 'kanbanIds (array of numbers) is required' });
        }
        try {
            const deleted = yield client_1.db
                .delete(schema_1.kanbanRequests)
                .where((0, drizzle_orm_1.inArray)(schema_1.kanbanRequests.id, kanbanIds))
                .returning();
            if (deleted.length === 0) {
                return res.status(404).json({ message: "Kanban not found" });
            }
            return res.status(200).json({ message: "Kanban deleted successfully" });
        }
        catch (error) {
            console.error("Error deleting kanban:", error);
            return res.status(500).json({ error: error.message || "Internal server error" });
        }
    });
}
