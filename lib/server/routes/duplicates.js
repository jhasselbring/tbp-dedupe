import path from 'path';
import fs from 'fs';
import { getDuplicates, getFilesByHash } from '../../db.js';
import { baseDir, log } from '../../vars.js';

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

                files.forEach(file => {
                    if (file.path !== original.path) {
                        const fullPath = path.join(baseDir, file.path);
                        fs.unlinkSync(fullPath);
                        log.info(`Deleted duplicate: ${file.path}`);
                    }
                });

                res.json({ success: true, kept: original.path });
            } catch (error) {
                log.error(`Error keeping original: ${error.message}`);
                res.status(500).json({ error: error.message });
            }
        });

        app.post('/api/duplicates/:hash/delete', (req, res) => {
            try {
                const files = getFilesByHash.all(req.params.hash);
                if (files.length <= 1) {
                    res.status(400).json({ error: 'No duplicates found for this hash' });
                    return;
                }

                files.forEach(file => {
                    const fullPath = path.join(baseDir, file.path);
                    fs.unlinkSync(fullPath);
                    log.info(`Deleted file: ${file.path}`);
                });

                res.json({ success: true, deleted: files.length });
            } catch (error) {
                log.error(`Error deleting duplicates: ${error.message}`);
                res.status(500).json({ error: error.message });
            }
        });
    }
}; 