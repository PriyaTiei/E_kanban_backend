import { db } from "../db/client";
import { parts, plants, products, stations } from "../db/schema";

class LookupCache {
  private plants = new Map<string, number>();
  private stations = new Map<string, number>();
  private parts = new Map<string, number>();
  private products = new Map<string, number>();
  private stationSequence: { name: string; id: number }[] = [];

  async initialize() {
    const [plantsTable, stationsTable, partsTable, productsTable] = await Promise.all([
      db.select().from(plants),
      db.select({ id: stations.id, name: stations.name }).from(stations),
      db.select({ id: parts.id, name: parts.name }).from(parts),
      db.select({ id: products.id, variant: products.variant }).from(products),
    ]);

    this.stationSequence = stationsTable.sort((a, b) => a.id - b.id);

    plantsTable.forEach((p) => this.plants.set(p.name, p.id));
    stationsTable.forEach((s) => this.stations.set(s.name, s.id));
    partsTable.forEach((p) => this.parts.set(p.name, p.id));
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

  getPartId(name: string) {
    const id = this.parts.get(String(name));
    if (!id) throw new Error(`Unknown part: ${name}`);
    return id;
  }

  getProductId(variant: string) {
    const id = this.products.get(String(variant));
    if (!id) throw new Error(`Unknown product variant: ${variant}`);
    return id;
  }
}


export const lookupCache = new LookupCache();
