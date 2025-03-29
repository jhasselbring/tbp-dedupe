import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { baseDir, log } from '../../vars.js';

export const filesRoutes = {
    path: '/api/open-file',
    handler: (app) => {
        app.post('/api/open-file', (req, res) => {
            const filePath = path.join(baseDir, req.body.path);
            
            if (!fs.existsSync(filePath) || !filePath.startsWith(baseDir)) {
                res.status(404).json({ error: 'File not found or access denied' });
                return;
            }

            // Use cmd /c start for better file type handling on Windows
            const command = process.platform === 'win32' 
                ? `cmd /c start "" "${filePath}"`  // Windows: use cmd /c start
                : `xdg-open "${filePath}"`; // Linux/Unix

            exec(command, (error) => {
                if (error) {
                    log.error(`Error opening file: ${error.message}`);
                    res.status(500).json({ error: 'Failed to open file' });
                } else {
                    log.success(`Opened file: ${req.body.path}`);
                    res.json({ success: true });
                }
            });
        });
    }
}; 