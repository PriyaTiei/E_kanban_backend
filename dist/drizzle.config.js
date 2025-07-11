"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const drizzle_kit_1 = require("drizzle-kit");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.default = (0, drizzle_kit_1.defineConfig)({
    dialect: "postgresql",
    schema: "./src/db/schema.ts",
    out: "./src/db/drizzle", // migration output folder
    dbCredentials: {
        url: process.env.DATABASE_URL,
    },
});
