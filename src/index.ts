import dotenv from "dotenv";
import express from "express";
import { sensorTriggerRouter } from "./routes/sensorTrigger";
import { lookupCache } from "./scripts/lookupCache";
import { db } from "./db/client";
import { stationParts } from "./db/schema";
import { preparationSheetRouter } from "./routes/preparationSheet";
import { supplySheetRouter } from "./routes/supplySheet";

dotenv.config();

const HOST = process.env.APP_HOST;
const PORT = process.env.APP_PORT;
const app = express();

app.use(express.json());

async function start() {
    app.get("/", async (req, res) => {
    try {
        const rows = await db.select().from(stationParts).orderBy(stationParts.stationId);
        res.json(rows);
    } catch (err) {
        console.error("Error fetching station parts:", err);
        res.status(500).json({ error: "Failed to fetch station parts" });
    }
    });

    // Initialize cache
    await lookupCache.initialize();

    // Route
    app.use("/sensor-trigger", sensorTriggerRouter);
    app.use("/preparation-sheet", preparationSheetRouter);
    app.use("/supply-sheet", supplySheetRouter);

    // Start server
    app.listen(PORT, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
    });
}

start();