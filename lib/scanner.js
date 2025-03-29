import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { insertFile } from '../database/files.js';
import { targetDir, baseDir, log, targetDirName } from './vars.js';
import { ProgressTracker } from './progress.js';
import { setStartTime, setEndTime, setTargetDirectory, setBasePath } from '../database/meta.js';

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

function countFiles(dir) {
    let count = 0;
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            count += countFiles(fullPath);
        } else {
            count++;
        }
    }
    
    return count;
}

export async function scanDirectory(dir) {
    const progress = new ProgressTracker();
    
    // Record metadata about this scan
    setStartTime();
    setTargetDirectory(targetDirName);
    setBasePath(baseDir);
    
    // First count total files
    log.info('Counting total files...');
    const totalFiles = countFiles(dir);
    progress.setTotalFiles(totalFiles);

    // Then process files
    await processDirectory(dir, progress);
    
    // Record end time
    setEndTime();
    
    const stats = progress.complete();
    log.success(`Scan completed in ${stats.totalTime.toFixed(1)} seconds (${stats.averageSpeed.toFixed(1)} files/second)`);
}

async function processDirectory(dir, progress) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            await processDirectory(fullPath, progress);
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
            progress.incrementProcessed();
        } catch (error) {
            log.error(`Error inserting file ${relativePath}: ${error.message}`);
        }
    }
} 