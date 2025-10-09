"use strict";
// import dotenv from 'dotenv';
// import { lookupCache } from '../../lib/lookupCache';
// import { suppliedKanban } from '../../lib/types';
// import { getSetting, setSetting } from '../../lib/settingsService';
// import { handleSupplyUpdate } from '../../lib/supplyUpdateHelper';
// dotenv.config();
// const API_URL = process.env.PART_SUPPLY_SCAN_API;
// const BEARER_TOKEN = process.env.AMRUTH_API_TOKEN;
// const POLL_INTERVAL_MS = 20000;
// const SETTING_KEY_GD = "last_updated_timestamp";
// const SETTING_KEY_TNGA = "last_updated_timestamp_tnga";
// async function processEntries(suppliedKanbans: suppliedKanban[], settingKey: string, plantId: number) {
//   const latest = suppliedKanbans.at(-1)?.SCAN_SYS_DATE;
//   const updated = await handleSupplyUpdate(suppliedKanbans, plantId);
//   const plant = plantId === 1 ? "GD" : "TNGA";
//   if (latest && updated) {
//     await setSetting(settingKey, latest);
//     // console.log(`Kanbans updated for ${plant}`);
//   } else {
//     console.log(`No Kanban updated for ${plant}`);
//   }
// }
// async function pollUpdates() {
//   try {
//     if (API_URL && BEARER_TOKEN) {
//       console.log("🔄 Polling for supply updates...");
//       const lastUpdated = await getSetting(SETTING_KEY_GD);
//       const lastUpdatedTNGA = await getSetting(SETTING_KEY_TNGA);
//       const lastUpdatedDateGD = lastUpdated ? new Date(lastUpdated) : new Date(0);
//       const lastUpdatedDateTNGA = lastUpdatedTNGA ? new Date(lastUpdatedTNGA) : new Date(0);
//       const plantIdGD = 1; // GD
//       const plantIdTNGA = 2; // TNGA
//       const res = await fetch(API_URL, {
//         method: 'GET',
//         headers: {
//           'Authorization': `Bearer ${BEARER_TOKEN}`,
//           'Content-Type': 'application/json',
//         },
//       });
//       const updates = await res.json() as { data: suppliedKanban[] };
//       console.log(`filtering data from ${lastUpdatedDateGD} for GD`);
//       const gdSuppliedKanbans = updates.data
//         .filter((suppliedKanban) => 
//           new Date(suppliedKanban.SCAN_SYS_DATE) > lastUpdatedDateGD &&
//           suppliedKanban.WIP_LOCATION !== "TNGASSY" && 
//           suppliedKanban.WIP_LOCATION !== "TNGAMWIP"
//         )
//         .sort(
//             (a, b) => new Date(a.SCAN_SYS_DATE).getTime() - new Date(b.SCAN_SYS_DATE).getTime()
//         )
//       console.log(`📦 Found ${gdSuppliedKanbans.length} new supply updates for GD`);
//       if (gdSuppliedKanbans.length > 0)
//         console.log(`from ${new Date(gdSuppliedKanbans[0].SCAN_SYS_DATE)} to ${new Date(gdSuppliedKanbans.at(-1)?.SCAN_SYS_DATE!)}`);      
//       if (!gdSuppliedKanbans || !gdSuppliedKanbans.length) return;
//       processEntries(gdSuppliedKanbans, SETTING_KEY_GD, plantIdGD);
//       console.log(`filtering data from ${lastUpdatedDateTNGA} for TNGA`);
//       const tngaSuppliedKanbans = updates.data
//         .filter((suppliedKanban) => 
//           new Date(suppliedKanban.SCAN_SYS_DATE) > lastUpdatedDateTNGA &&
//           (suppliedKanban.WIP_LOCATION === "TNGASSY" || 
//           suppliedKanban.WIP_LOCATION === "TNGAMWIP")
//         )
//         .sort(
//             (a, b) => new Date(a.SCAN_SYS_DATE).getTime() - new Date(b.SCAN_SYS_DATE).getTime()
//         )
//       console.log(`📦 Found ${tngaSuppliedKanbans.length} new supply updates for TNGA`);
//       if (tngaSuppliedKanbans.length > 0)
//         console.log(`from ${new Date(tngaSuppliedKanbans[0].SCAN_SYS_DATE)} to ${new Date(tngaSuppliedKanbans.at(-1)?.SCAN_SYS_DATE!)}`);      
//       if (!tngaSuppliedKanbans || !tngaSuppliedKanbans.length) return;
//       processEntries(tngaSuppliedKanbans, SETTING_KEY_TNGA, plantIdTNGA);
//       // Process each update
//       // const latest = suppliedKanbans.at(-1)?.SCAN_SYS_DATE;
//       // const updated = await handleSupplyUpdate(suppliedKanbans);
//       // if (latest && updated) {
//       //   await setSetting(SETTING_KEY, latest);
//       //   console.log("Kanbans updated");
//       // } else {
//       //   console.log("No Kanban updated");
//       // }
//     }
//   } catch (err) {
//     console.error("❌ Polling error:", err);
//   }
// }
// async function main() {
//   await lookupCache.initialize();
//   // pollUpdates();
//   setInterval(pollUpdates, POLL_INTERVAL_MS);
//   console.log("📡 Polling worker started...");
// }
// main();
