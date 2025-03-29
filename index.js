#!/usr/bin/env node

import { scanDirectory } from './lib/scanner.js';
import { startServer } from './lib/server.js';
import { targetDir, log, argv } from './lib/vars.js';

async function main() {
    try {
        log.info(`Scanning directory: ${targetDir}`);
        await scanDirectory(targetDir);
        log.success('Scan completed successfully');
        
        log.info('Starting web interface...');
        startServer();
    } catch (error) {
        log.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

main();
