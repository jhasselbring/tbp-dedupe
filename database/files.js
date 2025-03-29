/**
 * Database Files Module
 * Purpose: Handles the file tracking database operations
 * Why it's needed: Stores file information to detect duplicates
 * How it works: Creates and manages SQLite tables and queries for file data
 */

import Database from 'better-sqlite3';
import { dbPath, log } from '../lib/vars.js';
import { initializeMetadataTable } from './meta.js';

// Global database connection variable
let db = null;

/**
 * initializeDatabase - Creates or opens the SQLite database
 * Why it's needed: Sets up the database connection and schema
 * How it works:
 * 1. Creates a new database connection (or closes existing one)
 * 2. Creates the 'files' table if it doesn't exist
 * 3. Initializes metadata tables
 * 4. Prepares SQL statements for later use
 * @return {object} - The database connection object
 */
export function initializeDatabase() {
    // Close existing connection if there is one
    if (db) {
        closeDatabase();
    }
    
    // Create a new connection to the SQLite database
    db = new Database(dbPath);

    // Initialize database schema for files
    // This creates a table to store file IDs, paths, hash values, and file sizes
    // The SQL 'IF NOT EXISTS' clause ensures we don't create duplicate tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS files (
            id TEXT PRIMARY KEY,
            path TEXT NOT NULL,
            hash TEXT NOT NULL,
            size INTEGER DEFAULT 0
        )
    `);

    // Check if we need to add the size column to an existing table
    try {
        // Try to get column info - if 'size' doesn't exist, this will throw an error
        const hasSize = db.prepare("PRAGMA table_info(files)").all()
            .some(col => col.name === 'size');
        
        if (!hasSize) {
            log.info('Upgrading database schema to include file sizes');
            db.exec('ALTER TABLE files ADD COLUMN size INTEGER DEFAULT 0');
        }
    } catch (error) {
        log.error(`Error checking database schema: ${error.message}`);
    }

    // Initialize metadata table by calling the function from meta.js
    initializeMetadataTable(db);

    // Prepare SQL statements to improve performance
    // These statements are compiled once and can be executed many times
    
    // Statement to insert a new file record
    insertFile = db.prepare(`
        INSERT INTO files (id, path, hash, size)
        VALUES (@id, @path, @hash, @size)
    `);

    // Statement to find files with duplicate hashes (identical content)
    getDuplicates = db.prepare(`
        SELECT path, hash, size, COUNT(*) as count
        FROM files
        GROUP BY hash
        HAVING count > 1
        ORDER BY path
    `);

    // Statement to get all files with a specific hash
    getFilesByHash = db.prepare(`
        SELECT path, size
        FROM files
        WHERE hash = ?
        ORDER BY path
    `);

    // Statement to get a specific file by its ID
    getFileById = db.prepare(`
        SELECT path, hash, size
        FROM files
        WHERE id = ?
    `);

    return db;
}

/**
 * closeDatabase - Safely closes the database connection
 * Why it's needed: Prevents data corruption and resource leaks
 * How it works:
 * 1. Checks if a connection exists
 * 2. Calls the close method on the database
 * 3. Logs success or error message
 */
export function closeDatabase() {
    if (db) {
        try {
            db.close();
            db = null;
            log.success('Database connection closed');
        } catch (error) {
            log.error(`Error closing database: ${error.message}`);
        }
    }
}

// Initialize prepared statements variables
let insertFile, getDuplicates, getFilesByHash, getFileById;

// Initialize database when this module is first imported
// This ensures the database is ready as soon as this file is used
initializeDatabase();

// Export the database connection and prepared statements
// This makes them available to other modules that import this file
export { db, insertFile, getDuplicates, getFilesByHash, getFileById }; 