import Database from 'better-sqlite3';
import { dbPath, log } from './vars.js';

const db = new Database(dbPath);

// Initialize database schema
db.exec(`
    CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL,
        hash TEXT NOT NULL
    )
`);

export const insertFile = db.prepare(`
    INSERT INTO files (id, path, hash)
    VALUES (@id, @path, @hash)
`);

export const getDuplicates = db.prepare(`
    SELECT path, hash, COUNT(*) as count
    FROM files
    GROUP BY hash
    HAVING count > 1
    ORDER BY path
`);

export const getFilesByHash = db.prepare(`
    SELECT path
    FROM files
    WHERE hash = ?
    ORDER BY path
`);

export const getFileById = db.prepare(`
    SELECT path, hash
    FROM files
    WHERE id = ?
`);

export { db }; 