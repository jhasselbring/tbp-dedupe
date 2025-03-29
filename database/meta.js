/**
 * Database Metadata Module
 * Purpose: Manages metadata about the scan process
 * Why it's needed: Stores important information like timestamps and directory paths
 * How it works: Uses a key-value table in SQLite to store and retrieve metadata
 */

// Declare prepared statement variables at module level
let setMetadata, getMetadata;

/**
 * initializeMetadataTable - Creates the metadata table in the database
 * Why it's needed: Establishes the structure to store scan metadata
 * How it works:
 * 1. Creates a table with key, value, and timestamp columns
 * 2. Prepares SQL statements for later use
 * @param {object} db - The database connection object
 */
export function initializeMetadataTable(db) {
    // Create metadata table with a key-value structure and timestamp
    // The 'IF NOT EXISTS' clause prevents duplicate table creation
    db.exec(`
        CREATE TABLE IF NOT EXISTS metadata (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Prepare statements for setting and getting metadata
    // Using prepared statements improves performance and security
    
    // Statement to set or update a metadata value
    // Uses INSERT OR REPLACE to handle both new and existing keys
    setMetadata = db.prepare(`
        INSERT OR REPLACE INTO metadata (key, value, updated_at)
        VALUES (@key, @value, CURRENT_TIMESTAMP)
    `);

    // Statement to retrieve a metadata value by key
    getMetadata = db.prepare(`
        SELECT value, updated_at
        FROM metadata
        WHERE key = ?
    `);
}

/**
 * setMeta - Stores a value with the given key
 * Why it's needed: Provides a simple way to save metadata
 * How it works:
 * 1. Converts the value to JSON string (allows storing complex objects)
 * 2. Executes the prepared SQL statement
 * @param {string} key - The metadata key
 * @param {any} value - The value to store (will be JSON stringified)
 * @return {object} - Result of the database operation
 */
export function setMeta(key, value) {
    return setMetadata.run({
        key,
        value: JSON.stringify(value)
    });
}

/**
 * getMeta - Retrieves a value by its key
 * Why it's needed: Allows retrieving stored metadata
 * How it works:
 * 1. Queries the database for the key
 * 2. Parses the JSON string back to its original form
 * 3. Returns null if the key doesn't exist
 * @param {string} key - The metadata key to retrieve
 * @return {any} - The stored value, or null if not found
 */
export function getMeta(key) {
    const result = getMetadata.get(key);
    return result ? JSON.parse(result.value) : null;
}

/**
 * META_KEYS - Standard keys for common metadata
 * Why it's needed: Ensures consistent key names across the application
 * How it works: Defines constants for each metadata type to prevent typos
 */
export const META_KEYS = {
    START_TIME: 'scan_start_time',     // When the scan started
    END_TIME: 'scan_end_time',         // When the scan completed
    TARGET_DIR: 'target_directory',    // The directory being scanned
    BASE_PATH: 'base_path'             // The base path for relative references
};

/**
 * Helper functions for common metadata operations
 * Why they're needed: Provide convenient shortcuts for frequently used operations
 * How they work: Each calls setMeta with the appropriate key and formatted value
 */

/**
 * setStartTime - Records the scan start time
 * @return {object} - Result of the database operation
 */
export function setStartTime() {
    return setMeta(META_KEYS.START_TIME, new Date().toISOString());
}

/**
 * setEndTime - Records the scan end time
 * @return {object} - Result of the database operation
 */
export function setEndTime() {
    return setMeta(META_KEYS.END_TIME, new Date().toISOString());
}

/**
 * setTargetDirectory - Records the target directory name
 * @param {string} dir - The directory name
 * @return {object} - Result of the database operation
 */
export function setTargetDirectory(dir) {
    return setMeta(META_KEYS.TARGET_DIR, dir);
}

/**
 * setBasePath - Records the base directory path
 * @param {string} path - The base path
 * @return {object} - Result of the database operation
 */
export function setBasePath(path) {
    return setMeta(META_KEYS.BASE_PATH, path);
}

// Export the prepared statements for advanced usage
export { setMetadata, getMetadata };