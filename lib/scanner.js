import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { insertFile } from './db.js';
import { targetDir, baseDir, log } from './vars.js';

export function hashPath(filePath) {
    return crypto.createHash('md5').update(filePath).digest('hex');
}

export function parseFilePath(filePath) {
    const normalizedPath = filePath.split('\\').join('/');
    const fileName = normalizedPath.split('/').pop();
    const directory = normalizedPath.split('/').slice(0, -1).join('/');

    return {
        id: hashPath(directory + '/' + fileName),
        fullname: fileName,
        directory: directory
    };
}

export function hashFile(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("md5");
        const fileSize = fs.statSync(filePath).size;
        const fileName = path.basename(filePath);
        let bytesRead = 0;

        const stream = fs.createReadStream(filePath);

        stream.on("data", (chunk) => {
            bytesRead += chunk.length;
            hash.update(chunk);
        });

        stream.on("end", () => {
            resolve(hash.digest("hex"));
        });

        stream.on("error", reject);
    });
}

export async function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            await scanDirectory(fullPath);
            continue;
        }

        const relativePath = path.relative(baseDir, fullPath);
        const fileInfo = parseFilePath(relativePath);
        const fileHash = await hashFile(fullPath);

        try {
            insertFile.run({
                id: fileInfo.id,
                path: relativePath,
                hash: fileHash
            });
        } catch (error) {
            log.error(`Error inserting file ${relativePath}: ${error.message}`);
        }
    }
} 