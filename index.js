#!/usr/bin/env node

import { scanDirectory } from './lib/scanner.js';
import { startServer } from './lib/server.js';
import { targetDir, log, argv, dbExists, dbPath } from './lib/vars.js';
import { closeDatabase, initializeDatabase } from './database/files.js';
import fs from 'fs';
import { getMeta, META_KEYS } from './database/meta.js';

async function main() {
    try {
        // If database exists and force flag is not set, check if scan completed
        if (dbExists && !argv.force) {
            // First initialize the database connection so we can query metadata
            initializeDatabase();
            
            // Check if scan completed successfully
            const scanEndTime = getMeta(META_KEYS.END_TIME);
            
            if (scanEndTime) {
                log.info('Database already exists. Skipping scan...');
                log.info('Starting web interface...');
                startServer();
                return;
            } else {
                log.warning('Found incomplete scan. Restarting scan...');
                // Continue with scan (don't return here)
            }
        }

        // If force flag is set and database exists, remove it
        if (dbExists && argv.force) {
            log.warning('Force flag detected. Removing existing database...');
            closeDatabase(); // Close the database connection first
            try {
                fs.unlinkSync(dbPath);
                log.success('Existing database removed.');
                // Reinitialize the database
                initializeDatabase();
                log.success('New database initialized.');
            } catch (error) {
                log.error(`Error removing database: ${error.message}`);
                log.error('Please make sure no other process is using the database file.');
                process.exit(1);
            }
        }

        // Perform the scan
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
