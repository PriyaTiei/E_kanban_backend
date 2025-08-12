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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.combineChunks = void 0;
const fs_1 = __importDefault(require("fs"));
const combineChunks = (dir, fileName, totalChunks) => __awaiter(void 0, void 0, void 0, function* () {
    const writeStream = fs_1.default.createWriteStream(`${dir}/${fileName}`);
    for (let i = 0; i < totalChunks; i++) {
        const chunkPath = `${dir}/chunk-${i}`;
        const data = fs_1.default.readFileSync(chunkPath);
        writeStream.write(data);
    }
    writeStream.end();
});
exports.combineChunks = combineChunks;
