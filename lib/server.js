import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDuplicates, getFilesByHash } from './db.js';
import { baseDir, log } from './vars.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/duplicates', (req, res) => {
    try {
        const duplicates = getDuplicates.all();
        res.json(duplicates);
    } catch (error) {
        log.error(`Error getting duplicates: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/files/:hash', (req, res) => {
    try {
        const files = getFilesByHash.all(req.params.hash);
        res.json(files);
    } catch (error) {
        log.error(`Error getting files by hash: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

export function startServer() {
    app.listen(port, () => {
        log.success(`Server running at http://localhost:${port}`);
    });
} 