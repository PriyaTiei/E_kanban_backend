import fs from 'fs/promises';
import path from 'path';
import csv from 'csv-parse/sync';
import { PartScanCSVFormat } from '../lib/types';

interface ProductEntry {
  id_number: string;
  created_at: string;
}

/**
 * Scan existing CSV files in the folder by checking file modification time.
 * Returns entries that were modified after lastProcessedDate.
 * More efficient than reading all 200k files into memory.
 */
export async function listTNGACsvEntriesSinceTimestamp(
  folderPath: string,
  lastProcessedDateTNGA: Date
) {
  const resultTNGA: Array<ProductEntry> = [];

  const dir = await fs.opendir(folderPath);

  try {
    for await (const dirent of dir) {
      if (!dirent.isFile()) continue;
      const f = dirent.name;

      if (!f.toLowerCase().endsWith('.csv')) continue;
      const fp = path.join(folderPath, f);

      try {
        const stats = await fs.stat(fp);
        // skip files not modified after either timestamp
        if (stats.mtime <= lastProcessedDateTNGA) {
          continue;
        }

        const content = await fs.readFile(fp, 'utf-8');
        const records = csv.parse(content, { columns: true, skip_empty_lines: true }) as PartScanCSVFormat[];

        for (const record of records) {
          const sequenceData = String(record['SEQUENCE DATA'] ?? "").trim();
          if (!sequenceData) continue;

          const match = sequenceData.match(/(TNGA)(.{3})/);
          if (!match) continue;

          const plant = match[1];
          const variant = match[2];
          const id_number = variant;

          const date = String(record['DATE'] ?? "").trim();
          const time = String(record['TIME'] ?? "").trim();
          if (!date || !time) continue;
          const parts = date.split('-');
          if (parts.length !== 3) continue;
          const [day, month, year] = parts;
          const created_at = new Date(`${year}-${month}-${day}T${time}:00`).toISOString();
          if (isNaN(new Date(created_at).getTime())) continue;

          if (plant === 'TNGA' && new Date(created_at) > lastProcessedDateTNGA) {
            resultTNGA.push({ id_number, created_at });
          } 
        }
      } catch (err) {
        console.error(`Failed to process CSV ${fp}:`, err);
      }
    }
  } catch (err) {
    console.error("Err: ", err);
  } 
  return [resultTNGA];
}