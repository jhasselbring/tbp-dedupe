import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { log } from './vars.js';
import { duplicatesRoutes } from './server/routes/duplicates.js';
import { filesRoutes } from './server/routes/files.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve the dashboard at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Register routes
duplicatesRoutes.handler(app);
filesRoutes.handler(app);

export function startServer() {
    app.listen(port, () => {
        log.success(`Server running at http://localhost:${port}`);
    });
} 