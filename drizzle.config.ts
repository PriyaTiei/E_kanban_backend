import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
dotenv.config();

const devMode = process.env.NODE_ENV === "development";
export default defineConfig({
    dialect: "postgresql",
    schema: "./src/db/schema.ts", 
    out: "./src/db/drizzle", // migration output folder
    dbCredentials: {
        url: devMode ? process.env.TEST_DATABASE_URL as string : process.env.DATABASE_URL as string,
    },
});