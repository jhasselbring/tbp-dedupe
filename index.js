#!/usr/bin/env node

import { scanDirectory } from './lib/scanner.js';
import { startServer } from './lib/server.js';
import { targetDir, log, argv, dbExists, dbPath, debugMode, showDuplicates } from './lib/vars.js';
import { closeDatabase, initializeDatabase } from './database/files.js';
import fs from 'fs';
import { getMeta, META_KEYS } from './database/meta.js';
import { displayDuplicates, displayDuplicateSummary } from './lib/console-report.js';

async function main() {
    try {
        if (debugMode) {
            log.debug('Starting application in debug mode');
            log.debug(`Command line arguments: ${JSON.stringify(argv)}`);
            log.debug(`Target directory: ${targetDir}`);
            log.debug(`Database path: ${dbPath}`);
            log.debug(`Database exists: ${dbExists}`);
        }

        // If force flag is set and database exists, remove it for a fresh scan
        if (dbExists && argv.force) {
            log.warning('Force flag detected. Removing existing database...');
            if (debugMode) log.debug('Closing database before removal');
            closeDatabase(); // Close the database connection first
            try {
                if (debugMode) log.debug(`Removing database file: ${dbPath}`);
                fs.unlinkSync(dbPath);
                log.success('Existing database removed.');
                // Reinitialize the database
                if (debugMode) log.debug('Initializing new database');
                initializeDatabase();
                log.success('New database initialized.');
            } catch (error) {
                log.error(`Error removing database: ${error.message}`);
                log.error('Please make sure no other process is using the database file.');
                if (debugMode) log.debug(`Database removal error details: ${JSON.stringify(error)}`);
                process.exit(1);
            }
        }

        // Perform the scan - this will now handle both new scans and resuming existing ones
        log.info(`Scanning directory: ${targetDir}`);
        if (debugMode) log.debug('Starting directory scan');
        await scanDirectory(targetDir);
        log.success('Scan completed successfully');
        
        // Always show the duplicate summary
        if (debugMode) log.debug('Displaying duplicate summary');
        displayDuplicateSummary();
        
        // Show detailed duplicates in terminal if requested
        if (showDuplicates) {
            if (debugMode) log.debug('Displaying detailed duplicate files report');
            displayDuplicates();
        }
        
        log.info('Starting web interface...');
        if (debugMode) log.debug('Initializing web server');
        startServer();
        if (debugMode) log.debug('Web server started');
    } catch (error) {
        log.error(`Error: ${error.message}`);
        if (debugMode) log.debug(`Error details: ${JSON.stringify(error)}`);
        process.exit(1);
    }
}

if (debugMode) {
    log.debug('Main function defined, about to execute');
}

main();
