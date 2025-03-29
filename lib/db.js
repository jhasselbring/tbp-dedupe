import Database from 'better-sqlite3';
import { dbPath, log } from './vars.js';

let db = null;

export function initializeDatabase() {
    if (db) {
        closeDatabase();
    }
    
    db = new Database(dbPath);

    // Initialize database schema
    db.exec(`
        CREATE TABLE IF NOT EXISTS files (
            id TEXT PRIMARY KEY,
            path TEXT NOT NULL,
            hash TEXT NOT NULL
        )
    `);

    // Recreate prepared statements
    insertFile = db.prepare(`
        INSERT INTO files (id, path, hash)
        VALUES (@id, @path, @hash)
    `);

    getDuplicates = db.prepare(`
        SELECT path, hash, COUNT(*) as count
        FROM files
        GROUP BY hash
        HAVING count > 1
        ORDER BY path
    `);

    getFilesByHash = db.prepare(`
        SELECT path
        FROM files
        WHERE hash = ?
        ORDER BY path
    `);

    getFileById = db.prepare(`
        SELECT path, hash
        FROM files
        WHERE id = ?
    `);

    return db;
}

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

// Initialize on first import
let insertFile, getDuplicates, getFilesByHash, getFileById;
initializeDatabase();

export { db, insertFile, getDuplicates, getFilesByHash, getFileById }; 