import fs from 'fs';

export const combineChunks = async (dir:string, fileName:string, totalChunks:number) => {
  const writeStream = fs.createWriteStream(`${dir}/${fileName}`);

  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = `${dir}/chunk-${i}`;
    const data = fs.readFileSync(chunkPath);
    writeStream.write(data);
  }

  writeStream.end();
};