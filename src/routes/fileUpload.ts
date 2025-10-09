import multer from 'multer';
import path from 'path';
import fs from 'fs';
import express from "express";
import { cleanup } from '../lib/cleanupUploads';
import { combineChunks } from '../lib/combineChunks';
import { updateDbFromExcel } from '../lib/updateDbFromExcel';

const uploadDir = path.resolve(process.cwd(), 'uploads');
const upload = multer({ dest: uploadDir });

export const uploadChunks = express.Router();

uploadChunks.post('/excel-update', upload.single('chunk'), async (req, res): Promise<any> => {
  if(!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if(req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  try {
    const { fileId, chunkIndex, totalChunks, fileName } = req.body;
    const chunk = req.file;
    if (!chunk || !fileId || !chunkIndex || !totalChunks || !fileName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const fileDir = path.resolve(uploadDir, fileId);
    fs.mkdirSync(fileDir, { recursive: true });
    const chunkPath = path.join(fileDir, `chunk-${chunkIndex}`);
    fs.renameSync(chunk.path, chunkPath);

    // Check if this is the last chunk
    if (parseInt(chunkIndex) + 1 === parseInt(totalChunks)) {
      console.log('📦 All chunks uploaded. Combining and processing...');
      const fullPath = `${fileDir}/${fileName}`;
      await combineChunks(fileDir, fileName, totalChunks);

      const updateResult = await updateDbFromExcel(fullPath);
      if(updateResult.success)
        res.status(200).json(updateResult);
      else
        res.status(400).json(updateResult);
      return;
    }

    res.status(200).json({ message: `Chunk ${chunkIndex} processed` });
  } catch (err) {
    console.error(err);
    // res.status(500).json({ error: 'Update failed' });
  } finally {
    cleanup(uploadDir);
  }
});