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
Object.defineProperty(exports, "__esModule", { value: true });
exports.lookupCache = exports.LookupCache = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
class LookupCache {
    constructor() {
        this.plants = new Map();
        this.stations = new Map();
        this.parts = new Map();
        this.products = new Map();
        this.stationSequence = [];
        this.simultaneousStartStations = ["SPS1", "BS1", "PS1", "HS1", "CHS1"];
    }
    initialize(plantId) {
        return __awaiter(this, void 0, void 0, function* () {
            const [plantsTable, stationsTable, partsTable, productsTable] = yield Promise.all([
                client_1.db.select().from(schema_1.plants),
                client_1.db.select({ id: schema_1.stations.id, name: schema_1.stations.name }).from(schema_1.stations).where((0, drizzle_orm_1.eq)(schema_1.stations.plantId, plantId)).orderBy(schema_1.stations.sequenceNo),
                client_1.db.select({ id: schema_1.parts.id, partId: schema_1.parts.partId }).from(schema_1.parts).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.isNotNull)(schema_1.parts.partId), (0, drizzle_orm_1.eq)(schema_1.parts.plantId, plantId))),
                client_1.db.select({ id: schema_1.products.id, variant: schema_1.products.variant }).from(schema_1.products).where((0, drizzle_orm_1.eq)(schema_1.products.plantId, plantId)),
            ]);
            this.stationSequence = stationsTable;
            plantsTable.forEach((p) => this.plants.set(p.name, p.id));
            stationsTable.forEach((s) => this.stations.set(s.name, s.id));
            partsTable.forEach((p) => this.parts.set(p.partId, p.id));
            productsTable.forEach((p) => this.products.set(p.variant, p.id));
        });
    }
    getPlantId(name) {
        const id = this.plants.get(name);
        if (!id)
            throw new Error(`Unknown plant: ${name}`);
        return id;
    }
    getStationId(name) {
        const id = this.stations.get(name);
        if (!id)
            throw new Error(`Unknown station: ${name}`);
        return id;
    }
    getStationName(id) {
        const station = this.stationSequence.find((s) => s.id === id);
        if (!station)
            throw new Error(`Unknown station ID: ${id}`);
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
        }, []);
    }
    getPartId(name) {
        const id = this.parts.get(String(name));
        if (!id)
            throw new Error(`Unknown part: ${name}`);
        return id;
    }
    getProductId(variant) {
        const id = this.products.get(String(variant));
        if (!id) {
            console.log(`Unknown product variant: ${variant}`);
            return null;
        }
        ;
        return id;
    }
    getProductVariant(id) {
        const variantEntry = Array.from(this.products.entries()).find(([_, v]) => v === id);
        if (!variantEntry) {
            console.log(`Unknown product ID: ${id}`);
            return null;
        }
        return variantEntry[0];
    }
}
exports.LookupCache = LookupCache;
exports.lookupCache = new LookupCache();
