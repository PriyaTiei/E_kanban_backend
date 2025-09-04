import dotenv from "dotenv";
import express from "express";
import cors from 'cors';
import { sensorTriggerRouter } from "./routes/sensorTrigger";
import { lookupCache } from "./lib/lookupCache";
import { preparationSheetRouter } from "./routes/preparationSheet";
import { supplySheetRouter } from "./routes/supplySheet";
import { stationPartsRouter } from "./routes/stationParts";
import { productEntryLogsRouter } from "./routes/productEntryLogs";
import { productVariantsRouter } from "./routes/products";
import { stationsRouter } from "./routes/stations";
import { partsRouter } from "./routes/parts";
import session from "express-session";
import { userAuthRouter } from "./routes/userAuth";
import { kanbanRequestsLogRouter } from "./routes/kanbanRequestsLog";
import { amruthUpdateRouter } from "./routes/amruthUpdate";
import { uploadChunks } from "./routes/fileUpload";

dotenv.config();

const HOST = process.env.APP_HOST;
const devMode = process.env.NODE_ENV === "development";
const PORT = devMode ? process.env.DEV_PORT : process.env.APP_PORT;
const app = express();

// Allow CORS from specific origin
const allowedClients = JSON.parse(process.env.ALLOWED_CLIENTS || "[]");
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    
    if (!origin) return callback(null, true);
    if (allowedClients.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"), false);
    }
  },
  credentials: true 
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'default',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, sameSite: "lax", }
}));

async function start() {
    app.get("/", async (req, res) => {
        res.redirect("/station-parts");
    });

    // Initialize cache
    await lookupCache.initialize();

    // Public routes
    app.use('/supply', amruthUpdateRouter);
    app.use("/sensor-trigger", sensorTriggerRouter);
    app.use("/auth", userAuthRouter); // Allow login/logout/session check without auth

    // Auth middleware for all other routes
    app.use((req, res, next) => {
      
      if (req.session.user) {
        return next();
      }
      console.log("session user: ", req.session.user);
      console.log("Request Route:", req.originalUrl);
      res.status(401).json({ error: "Not authenticated" });
    });
    
    // Protected routes
    app.use("/preparation-sheet", preparationSheetRouter);
    app.use("/supply-sheet", supplySheetRouter);
    app.use('/station-parts', stationPartsRouter);
    app.use('/product-entry-logs', productEntryLogsRouter);
    app.use('/product-variants', productVariantsRouter);
    app.use('/stations', stationsRouter);
    app.use('/parts', partsRouter);
    app.use('/kanban-logs', kanbanRequestsLogRouter);
    app.use('/upload', uploadChunks);

    // Start server
    app.listen(PORT, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
    });
}

start();

// process.on('unhandledRejection', (err) => {
//   console.error('Unhandled rejection:', err);
// });