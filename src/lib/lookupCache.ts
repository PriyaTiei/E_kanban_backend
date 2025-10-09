import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "../db/client";
import { parts, plants, products, stations } from "../db/schema";

export class LookupCache {
  private plants = new Map<string, number>();
  private stations = new Map<string, number>();
  private parts = new Map<string, number>();
  private products = new Map<string, number>();
  private stationSequence: { name: string; id: number }[] = [];
  private simultaneousStartStations = ["SPS1", "BS1", "PS1", "HS1", "CHS1"]

  async initialize(plantId: number) {
    const [plantsTable, stationsTable, partsTable, productsTable] = await Promise.all([
      db.select().from(plants),
      db.select({ id: stations.id, name: stations.name }).from(stations).where(eq(stations.plantId, plantId)),
      db.select({ id: parts.id, partId: parts.partId }).from(parts).where(and(isNotNull(parts.partId),eq(parts.plantId, plantId))),
      db.select({ id: products.id, variant: products.variant }).from(products).where(eq(products.plantId, plantId)),
    ]);

    this.stationSequence = stationsTable.sort((a, b) => a.id - b.id);

    plantsTable.forEach((p) => this.plants.set(p.name, p.id));
    stationsTable.forEach((s) => this.stations.set(s.name, s.id));
    partsTable.forEach((p) => this.parts.set(p.partId!, p.id));
    productsTable.forEach((p) => this.products.set(p.variant, p.id));    
  }

  getPlantId(name: string) {
    const id = this.plants.get(name);
    if (!id) throw new Error(`Unknown plant: ${name}`);
    return id;
  }

  getStationId(name: string) {
    const id = this.stations.get(name);
    if (!id) throw new Error(`Unknown station: ${name}`);
    return id;
  }

  getStationName(id: number) {
    const station = this.stationSequence.find((s) => s.id === id);
    if (!station) throw new Error(`Unknown station ID: ${id}`);
    return station.name;
  }

  getStationSequence() {
    return this.stationSequence.map((s) => s.id);
  }

  getStationSequenceTNGA() {
    return this.stationSequence;
  }

  getSimultaneousStations() {
    return this.stationSequence.reduce((acc, station, index) => {
      if (this.simultaneousStartStations.includes(station.name)) {
        const group = this.stationSequence.slice(index).filter(s => s.name.startsWith(station.name[0])).map(s => s.id);
        console.log(`Station group: ${this.stationSequence.slice(index).filter(s => s.name.startsWith(station.name[0])).map(s => s.name)}`);
        
        acc.push(group);
      }  
      return acc;
    },[] as number[][]);
  }

  getPartId(name: string) {
    const id = this.parts.get(String(name));
    if (!id) throw new Error(`Unknown part: ${name}`);
    return id;
  }

  getProductId(variant: string) {
    const id = this.products.get(String(variant));
    if (!id) { 
      console.log(`Unknown product variant: ${variant}`)
      return null;
    };
    return id;
  }

  getProductVariant(id: number) {
    const variantEntry = Array.from(this.products.entries()).find(([_, v]) => v === id);
    if (!variantEntry) {
      console.log(`Unknown product ID: ${id}`);
      return null;
    }
    return variantEntry[0];
  }
}


export const lookupCache = new LookupCache();
