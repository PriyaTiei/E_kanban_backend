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
exports.userAuthRouter = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("../db/client");
const schema_1 = require("../db/schema"); // import your plants table
const bcrypt_1 = __importDefault(require("bcrypt"));
const drizzle_orm_1 = require("drizzle-orm");
exports.userAuthRouter = express_1.default.Router();
exports.userAuthRouter.post("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    if (!username || !password) {
        res.status(400).json({ error: "Username and password required" });
        return;
    }
    try {
        // Join users and plants
        const userResult = yield client_1.db
            .select({
            id: schema_1.users.id,
            username: schema_1.users.username,
            role: schema_1.users.role,
            plantId: schema_1.users.plantId,
            plantName: schema_1.plants.name,
            password: schema_1.users.password,
        })
            .from(schema_1.users)
            .leftJoin(schema_1.plants, (0, drizzle_orm_1.eq)(schema_1.users.plantId, schema_1.plants.id))
            .where((0, drizzle_orm_1.eq)(schema_1.users.username, username));
        const user = userResult[0];
        if (!user) {
            res.status(401).json({ error: "Invalid username or password" });
            return;
        }
        const passwordMatch = yield bcrypt_1.default.compare(password, user.password);
        if (!passwordMatch) {
            res.status(401).json({ error: "Invalid username or password" });
            return;
        }
        // Set session
        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            plantId: user.plantId,
            plantName: user.plantName,
        };
        console.log("session set for user:", req.session.user);
        res.json({
            id: user.id,
            username: user.username,
            role: user.role,
            plantId: user.plantId,
            plantName: user.plantName,
        });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}));
exports.userAuthRouter.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            res.status(500).json({ error: "Logout failed" });
            return;
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out" });
    });
});
exports.userAuthRouter.get("/me", (req, res) => {
    console.log("User session in /me:", req.session.user);
    if (req.session.user) {
        res.json(req.session.user);
        return;
    }
    res.status(401).json({ error: "Not authenticated" });
});
