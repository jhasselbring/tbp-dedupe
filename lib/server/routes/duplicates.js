import path from 'path';
import fs from 'fs';
import { getDuplicates, getFilesByHash } from '../../../database/files.js';
import { baseDir, log, targetDirName } from '../../vars.js';

export const duplicatesRoutes = {
    path: '/api/duplicates',
    handler: (app) => {
        app.get('/api/duplicates', (req, res) => {
            try {
                const duplicates = getDuplicates.all();
                const duplicatesWithPaths = duplicates.map(group => ({
                    ...group,
                    paths: getFilesByHash.all(group.hash).map(file => file.path)
                }));
                res.json(duplicatesWithPaths);
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

                const original = files.reduce((shortest, current) => 
                    current.path.length < shortest.path.length ? current : shortest
                );

                // Create duplicates directory if it doesn't exist
                const duplicatesDir = path.join(baseDir, `@duplicates`);
                if (!fs.existsSync(duplicatesDir)) {
                    fs.mkdirSync(duplicatesDir, { recursive: true });
                }

                files.forEach(file => {
                    if (file.path !== original.path) {
                        const sourcePath = path.join(baseDir, file.path);
                        const destPath = path.join(duplicatesDir, file.path);

                        // Create the destination directory structure
                        const destDir = path.dirname(destPath);
                        if (!fs.existsSync(destDir)) {
                            fs.mkdirSync(destDir, { recursive: true });
                        }

                        // Move the file
                        fs.renameSync(sourcePath, destPath);
                        log.info(`Moved duplicate to: ${destPath}`);
                    }
                });

                res.json({ success: true, kept: original.path });
            } catch (error) {
                log.error(`Error keeping original: ${error.message}`);
                res.status(500).json({ error: error.message });
            }
        });
    }
}; 