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
exports.uploadChunks = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const express_1 = __importDefault(require("express"));
const cleanupUploads_1 = require("../lib/cleanupUploads");
const combineChunks_1 = require("../lib/combineChunks");
const updateDbFromExcel_1 = require("../lib/updateDbFromExcel");
const uploadDir = path_1.default.resolve(process.cwd(), 'uploads');
const upload = (0, multer_1.default)({ dest: uploadDir });
exports.uploadChunks = express_1.default.Router();
exports.uploadChunks.post('/excel-update', upload.single('chunk'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    try {
        const { fileId, chunkIndex, totalChunks, fileName } = req.body;
        const chunk = req.file;
        if (!chunk || !fileId || !chunkIndex || !totalChunks || !fileName) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const fileDir = path_1.default.resolve(uploadDir, fileId);
        fs_1.default.mkdirSync(fileDir, { recursive: true });
        const chunkPath = path_1.default.join(fileDir, `chunk-${chunkIndex}`);
        fs_1.default.renameSync(chunk.path, chunkPath);
        // Check if this is the last chunk
        if (parseInt(chunkIndex) + 1 === parseInt(totalChunks)) {
            console.log('📦 All chunks uploaded. Combining and processing...');
            const fullPath = `${fileDir}/${fileName}`;
            yield (0, combineChunks_1.combineChunks)(fileDir, fileName, totalChunks);
            const updateResult = yield (0, updateDbFromExcel_1.updateDbFromExcel)(fullPath);
            if (updateResult.success)
                res.status(200).json(updateResult);
            else
                res.status(400).json(updateResult);
            return;
        }
        res.status(200).json({ message: `Chunk ${chunkIndex} processed` });
    }
    catch (err) {
        console.error(err);
        // res.status(500).json({ error: 'Update failed' });
    }
    finally {
        (0, cleanupUploads_1.cleanup)(uploadDir);
    }
}));
