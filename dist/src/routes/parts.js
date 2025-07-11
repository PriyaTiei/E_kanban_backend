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
exports.partsRouter = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
exports.partsRouter = express_1.default.Router();
exports.partsRouter.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const partDetails = yield client_1.db.select().from(schema_1.parts).orderBy(schema_1.parts.id);
        res.json(partDetails);
    }
    catch (error) {
        console.error('Failed to fetch parts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}));
