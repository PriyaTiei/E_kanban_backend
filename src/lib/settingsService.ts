// src/lib/settingsService.ts

import { db } from "../db/client";
import { settings } from "../db/schema";
import { eq } from "drizzle-orm";

export async function getSetting(key: string): Promise<string | null> {
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return result.length > 0 ? result[0].value : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value,
        updatedAt: new Date(),
      },
    });
}
