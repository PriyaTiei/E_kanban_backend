import fs from 'fs';
import path from 'path';

export const cleanup = (uploadDir: string) => {
    setImmediate(() => {
        try {
          // Clean up old folders if more than 5
          const directories = fs.readdirSync(uploadDir)
            .map(name => {
              const fullPath = path.join(uploadDir, name);
              const stats = fs.statSync(fullPath);
              return { name, time: stats.mtimeMs, path: fullPath };
            })
            .filter(entry => fs.lstatSync(entry.path).isDirectory())
            .sort((a, b) => a.time - b.time); // Oldest first
  
          while (directories.length > 5) {
            const dirToRemove = directories.shift();
            if (!dirToRemove) break; // Safety check
            fs.rmSync(dirToRemove.path, { recursive: true, force: true });
            console.log(`🧹 Removed old folder: ${dirToRemove.name}`);
          }
        } catch (cleanupErr) {
          console.error('🧹 Cleanup error:', cleanupErr);
        }
    });
}