import path from 'path';
import fs from 'fs';
import { getDuplicates, getFilesByHash } from '../../../database/files.js';
import { baseDir, log, targetDirName } from '../../vars.js';

/**
 * formatSize - Converts bytes to a human-readable format
 * Why it's needed: Makes file sizes more readable
 * How it works: Divides by appropriate units and adds suffixes
 * @param {number} bytes - The size in bytes
 * @return {string} - Formatted size with units
 */
function formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

export const duplicatesRoutes = {
    path: '/api/duplicates',
    handler: (app) => {
        app.get('/api/duplicates', (req, res) => {
            try {
                const duplicates = getDuplicates.all();
                const duplicatesWithPaths = duplicates.map(group => {
                    const files = getFilesByHash.all(group.hash);
                    // Calculate the total wasted space by duplicate files
                    const totalSize = group.size * (group.count - 1);
                    
                    return {
                        ...group,
                        formattedSize: formatSize(group.size),
                        wastedSpace: formatSize(totalSize),
                        paths: files.map(file => ({
                            path: file.path,
                            size: file.size,
                            formattedSize: formatSize(file.size)
                        }))
                    };
                });
                
                // Calculate total wasted space by all duplicates
                const totalWastedSpace = duplicatesWithPaths.reduce(
                    (total, group) => total + (group.size * (group.count - 1)), 0);
                
                res.json({
                    duplicates: duplicatesWithPaths,
                    totalWastedSpace: formatSize(totalWastedSpace),
                    totalDuplicateSets: duplicatesWithPaths.length
                });
            } catch (error) {
                log.error(`Error getting duplicates: ${error.message}`);
                res.status(500).json({ error: error.message });
            }
        });

        app.post('/api/duplicates/:hash/keep-original', (req, res) => {
            try {
                const files = getFilesByHash.all(req.params.hash);
                if (files.length <= 1) {
                    res.status(400).json({ error: 'No duplicates found for this hash' });
                    return;
                }

                // Choose the original file - now also considering file path length
                const original = files.reduce((shortest, current) => 
                    current.path.length < shortest.path.length ? current : shortest
                );

                // Calculate space to be freed
                const duplicateFiles = files.filter(file => file.path !== original.path);
                const totalSizeFreed = duplicateFiles.reduce((total, file) => total + file.size, 0);

                // Create duplicates directory if it doesn't exist
                const duplicatesDir = path.join(baseDir, `@duplicates`);
                if (!fs.existsSync(duplicatesDir)) {
                    fs.mkdirSync(duplicatesDir, { recursive: true });
                }

                duplicateFiles.forEach(file => {
                    const sourcePath = path.join(baseDir, file.path);
                    const destPath = path.join(duplicatesDir, file.path);

                    // Create the destination directory structure
                    const destDir = path.dirname(destPath);
                    if (!fs.existsSync(destDir)) {
                        fs.mkdirSync(destDir, { recursive: true });
                    }

                    // Move the file
                    fs.renameSync(sourcePath, destPath);
                    log.info(`Moved duplicate to: ${destPath} (${formatSize(file.size)})`);
                });

                res.json({ 
                    success: true, 
                    kept: original.path,
                    keptSize: formatSize(original.size),
                    movedCount: duplicateFiles.length,
                    freedSpace: formatSize(totalSizeFreed)
                });
            } catch (error) {
                log.error(`Error keeping original: ${error.message}`);
                res.status(500).json({ error: error.message });
            }
        });
    }
}; 