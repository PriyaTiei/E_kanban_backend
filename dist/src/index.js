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
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
// import { sensorTriggerRouter } from "./routes/sensorTrigger";
const lookupCache_1 = require("./lib/lookupCache");
const preparationSheet_1 = require("./routes/preparationSheet");
const supplySheet_1 = require("./routes/supplySheet");
const stationParts_1 = require("./routes/stationParts");
const productEntryLogs_1 = require("./routes/productEntryLogs");
const products_1 = require("./routes/products");
const stations_1 = require("./routes/stations");
const parts_1 = require("./routes/parts");
const express_session_1 = __importDefault(require("express-session"));
const userAuth_1 = require("./routes/userAuth");
const kanbanRequestsLog_1 = require("./routes/kanbanRequestsLog");
const amruthUpdate_1 = require("./routes/amruthUpdate");
const fileUpload_1 = require("./routes/fileUpload");
dotenv_1.default.config();
const HOST = process.env.APP_HOST;
const devMode = process.env.NODE_ENV === "development";
const PORT = devMode ? process.env.DEV_PORT : process.env.APP_PORT;
const app = (0, express_1.default)();
// Allow CORS from specific origin
const allowedClients = JSON.parse(process.env.ALLOWED_CLIENTS || "[]");
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin)
            return callback(null, true);
        if (allowedClients.includes(origin)) {
            return callback(null, true);
        }
        else {
            return callback(new Error("Not allowed by CORS"), false);
        }
    },
    credentials: true
}));
app.use(express_1.default.json());
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || 'default',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, sameSite: "lax", }
}));
function start() {
    return __awaiter(this, void 0, void 0, function* () {
        app.get("/", (req, res) => __awaiter(this, void 0, void 0, function* () {
            res.redirect("/station-parts");
        }));
        // Public routes
        app.use('/supply', amruthUpdate_1.amruthUpdateRouter);
        // app.use("/sensor-trigger", sensorTriggerRouter);
        app.use("/auth", userAuth_1.userAuthRouter); // Allow login/logout/session check without auth
        // Auth middleware for all other routes
        app.use((req, res, next) => __awaiter(this, void 0, void 0, function* () {
            // Whitelist public routes
            const publicPaths = ['/supply'];
            const isPublicRoute = publicPaths.some(path => req.path.startsWith(path));
            if (isPublicRoute || req.session.user) {
                // Initialize cache only for authenticated users
                if (req.session.user) {
                    yield lookupCache_1.lookupCache.initialize(req.session.user.plantId);
                }
                return next();
            }
            res.status(401).json({ error: "Not authenticated" });
        }));
        // Protected routes
        app.use("/preparation-sheet", preparationSheet_1.preparationSheetRouter);
        app.use("/supply-sheet", supplySheet_1.supplySheetRouter);
        app.use('/station-parts', stationParts_1.stationPartsRouter);
        app.use('/product-entry-logs', productEntryLogs_1.productEntryLogsRouter);
        app.use('/product-variants', products_1.productVariantsRouter);
        app.use('/stations', stations_1.stationsRouter);
        app.use('/parts', parts_1.partsRouter);
        app.use('/kanban-logs', kanbanRequestsLog_1.kanbanRequestsLogRouter);
        app.use('/upload', fileUpload_1.uploadChunks);
        // Start server
        app.listen(PORT, () => {
            console.log(`Server listening on http://${HOST}:${PORT}`);
        });
    });
}
start();
// process.on('unhandledRejection', (err) => {
//   console.error('Unhandled rejection:', err);
// });
