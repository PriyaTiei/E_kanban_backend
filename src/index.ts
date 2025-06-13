import dotenv from "dotenv";
import express from "express";
import cors from 'cors';
import { sensorTriggerRouter } from "./routes/sensorTrigger";
import { lookupCache } from "./scripts/lookupCache";
import { db } from "./db/client";
import { stationParts } from "./db/schema";
import { preparationSheetRouter } from "./routes/preparationSheet";
import { supplySheetRouter } from "./routes/supplySheet";
import { stationPartsRouter } from "./routes/stationParts";
import { productEntryLogsRouter } from "./routes/productEntryLogs";
import { productVariantsRouter } from "./routes/products";
import { stationsRouter } from "./routes/stations";
import { partsRouter } from "./routes/parts";

dotenv.config();

const HOST = process.env.APP_HOST;
const PORT = process.env.APP_PORT;
const app = express();

// Allow CORS from specific origin
app.use(cors({
  origin: 'http://10.82.126.73:3059',
  credentials: true 
}));

app.use(express.json());

async function start() {
    app.get("/", async (req, res) => {
        res.redirect("/station-parts");
    });

    // Initialize cache
    await lookupCache.initialize();

    // Route
    app.use("/sensor-trigger", sensorTriggerRouter);
    app.use("/preparation-sheet", preparationSheetRouter);
    app.use("/supply-sheet", supplySheetRouter);
    app.use('/station-parts', stationPartsRouter);
    app.use('/product-entry-logs', productEntryLogsRouter);
    app.use('/product-variants', productVariantsRouter);
    app.use('/stations', stationsRouter);
    app.use('/parts', partsRouter);

    // Start server
    app.listen(PORT, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
    });
}

start();