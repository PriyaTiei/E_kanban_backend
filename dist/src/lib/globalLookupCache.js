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
exports.globalLookupCacheManager = exports.GlobalLookupCacheManager = void 0;
const lookupCache_1 = require("./lookupCache");
class GlobalLookupCacheManager {
    constructor() {
        this.cacheGD = new lookupCache_1.LookupCache();
        this.cacheTNGA = new lookupCache_1.LookupCache();
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            const gdPlantId = 1;
            const tngaPlantId = 2;
            yield Promise.all([
                this.cacheGD.initialize(gdPlantId),
                this.cacheTNGA.initialize(tngaPlantId),
            ]);
        });
    }
    refreshGD() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🔄 Refreshing GD lookup cache...');
            yield this.cacheGD.initialize(1);
        });
    }
    refreshTNGA() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🔄 Refreshing TNGA lookup cache...');
            yield this.cacheTNGA.initialize(2);
        });
    }
    refreshAll() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🔄 Refreshing all lookup caches...');
            yield Promise.all([
                this.cacheGD.initialize(1),
                this.cacheTNGA.initialize(2),
            ]);
        });
    }
    getCacheGD() {
        return this.cacheGD;
    }
    getCacheTNGA() {
        return this.cacheTNGA;
    }
}
exports.GlobalLookupCacheManager = GlobalLookupCacheManager;
exports.globalLookupCacheManager = new GlobalLookupCacheManager();
