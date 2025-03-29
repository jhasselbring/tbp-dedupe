import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { insertFile, db, getFileById } from '../database/files.js';
import { targetDir, baseDir, log, targetDirName, dbExists, debugMode } from './vars.js';
import { ProgressTracker } from './progress.js';
import { setStartTime, setEndTime, setTargetDirectory, setBasePath } from '../database/meta.js';

/**
 * hashPath - Creates a unique hash for a file path
 * Why it's needed: Used as the primary key for file records in the database
 * How it works: Creates an MD5 hash of the file path string
 * @param {string} filePath - The file path to hash
 * @return {string} - The MD5 hash of the path
 */
export function hashPath(filePath) {
    // Don't log each path hash creation
    return crypto.createHash('md5').update(filePath).digest('hex');
}

/**
 * parseFilePath - Extracts and normalizes path components
 * Why it's needed: Ensures consistent path format and creates a unique ID
 * How it works: Splits path into components and creates a path hash
 * @param {string} filePath - The file path to parse
 * @return {object} - Object with id, filename, and directory
 */
export function parseFilePath(filePath) {
    // Don't log each file path parsing
    const normalizedPath = filePath.split('\\').join('/');
    const fileName = normalizedPath.split('/').pop();
    const directory = normalizedPath.split('/').slice(0, -1).join('/');

    return {
        id: hashPath(directory + '/' + fileName),
        fullname: fileName,
        directory: directory
    };
}

/**
 * hashFile - Calculates the content hash of a file
 * Why it's needed: Used to identify duplicate files with identical content
 * How it works: Reads the file in chunks and updates a hash object
 * @param {string} filePath - Path to the file to hash
 * @return {Promise<string>} - Promise resolving to the file's MD5 hash
 */
export function hashFile(filePath) {
    // Don't log each file hash calculation
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("md5");
        const fileName = path.basename(filePath);
        let bytesRead = 0;

        const stream = fs.createReadStream(filePath);

        stream.on("data", (chunk) => {
            bytesRead += chunk.length;
            hash.update(chunk);
        });

        stream.on("end", () => {
            const hashResult = hash.digest("hex");
            // Don't log each completed hash
            resolve(hashResult);
        });

        stream.on("error", (err) => {
            // Keep error logging as it's important for troubleshooting
            if (debugMode) log.debug(`Error hashing file: ${filePath} - ${err.message}`);
            reject(err);
        });
    });
}

/**
 * getFileSize - Gets the size of a file in bytes
 * Why it's needed: Stores file size information for analysis
 * How it works: Uses fs.statSync to get file information including size
 * @param {string} filePath - Path to the file
 * @return {number} - File size in bytes
 */
function getFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.size;
    } catch (error) {
        if (debugMode) log.debug(`Error getting file size for ${filePath}: ${error.message}`);
        return 0;
    }
}

/**
 * countFiles - Recursively counts files in a directory
 * Why it's needed: Used to initialize the progress tracker with total count
 * How it works: Recursively traverses directories and counts non-directory files
 * @param {string} dir - The directory to count files in
 * @return {number} - The total number of files found
 */
function countFiles(dir) {
    // Only log at the top level call, not in recursive calls
    if (debugMode && dir === targetDir) {
        log.debug(`Counting files in directory tree starting at: ${dir}`);
    }
    
    let count = 0;
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            count += countFiles(fullPath);
        } else {
            count++;
        }
    }
    
    // Only log the final count at the top level
    if (debugMode && dir === targetDir) {
        log.debug(`Found ${count} total files in directory tree`);
    }
    return count;
}

/**
 * cleanupMissingFiles - Removes database entries for files that no longer exist
 * Why it's needed: To clean up the database when files are deleted from disk
 * How it works: Queries all files from database and checks if they exist on disk
 * @param {ProgressTracker} progress - The progress tracker instance
 * @return {number} - Number of removed entries
 */
async function cleanupMissingFiles(progress) {
    if (debugMode) log.debug('Starting cleanup of missing files');
    // Get all files from the database
    const allFiles = db.prepare('SELECT id, path, size FROM files').all();
    let removedCount = 0;
    let totalSize = 0;
    
    log.info(`Checking ${allFiles.length} existing files...`);
    
    // Create a prepared statement for deletion
    const deleteFile = db.prepare('DELETE FROM files WHERE id = ?');
    
    // Begin a transaction for better performance
    const transaction = db.transaction(() => {
        if (debugMode) log.debug(`Starting transaction for checking ${allFiles.length} files for existence`);
        for (const file of allFiles) {
            const fullPath = path.join(baseDir, file.path);
            if (!fs.existsSync(fullPath)) {
                // Don't log each individual file removal
                deleteFile.run(file.id);
                removedCount++;
                totalSize += file.size || 0; // Track total size of removed files
                progress.incrementProcessed();
            }
        }
        if (debugMode) log.debug('Completed transaction for file cleanup');
    });
    
    transaction();
    
    // Format the total size in a human-readable way
    const formattedSize = formatSize(totalSize);
    log.info(`Removed ${removedCount} entries for files that no longer exist (${formattedSize}).`);
    return removedCount;
}

/**
 * formatSize - Converts bytes to a human-readable format
 * Why it's needed: Makes file sizes more readable
 * How it works: Divides by appropriate units and adds suffixes
 * @param {number} bytes - The size in bytes
 * @return {string} - Formatted size with units
 */
function formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * scanDirectory - Main scanning function that coordinates the process
 * Why it's needed: Entry point for scanning files and updating database
 * How it works:
 * 1. Records metadata and initializes progress
 * 2. Cleans up missing files if database exists
 * 3. Processes all directories and files
 * 4. Records completion time
 * @param {string} dir - The directory to scan
 */
export async function scanDirectory(dir) {
    if (debugMode) log.debug(`Starting scan of directory: ${dir}`);
    const progress = new ProgressTracker();
    
    // Record metadata about this scan
    if (debugMode) log.debug('Recording scan metadata');
    setStartTime();
    setTargetDirectory(targetDirName);
    setBasePath(baseDir);
    
    // First count total files and set up progress tracking
    log.info('Counting total files...');
    const totalFiles = countFiles(dir);
    
    // If database exists, we need to clean up missing files
    if (dbExists) {
        log.info('Resuming scan from existing database...');
        if (debugMode) log.debug('Database exists, will check for missing files');
        // Add some buffer for files that might be removed
        progress.setTotalFiles(totalFiles + 500);
        
        // Clean up missing files
        await cleanupMissingFiles(progress);
    } else {
        if (debugMode) log.debug('New database, setting up progress tracking');
        progress.setTotalFiles(totalFiles);
    }
    
    // Process all files - this will now skip files that already exist in the DB
    if (debugMode) log.debug('Starting to process files');
    await processDirectory(dir, progress);
    
    // Record end time
    if (debugMode) log.debug('Recording scan end time');
    setEndTime();
    
    // Calculate total size of all files
    const totalSizeResult = db.prepare('SELECT SUM(size) as totalSize FROM files').get();
    const totalSize = totalSizeResult.totalSize || 0;
    const formattedSize = formatSize(totalSize);
    
    const stats = progress.complete();
    log.success(`Scan completed in ${stats.totalTime.toFixed(1)} seconds (${stats.averageSpeed.toFixed(1)} files/second)`);
    log.success(`Total data indexed: ${formattedSize} in ${stats.totalFiles} files`);
}

/**
 * processDirectory - Recursively processes files in directories
 * Why it's needed: Handles the traversal and file processing logic
 * How it works:
 * 1. Lists all files in a directory
 * 2. Recursively processes subdirectories
 * 3. Hashes and stores information about each file
 * 4. Skips files that already exist in the database
 * @param {string} dir - The directory to process
 * @param {ProgressTracker} progress - Progress tracking instance
 */
async function processDirectory(dir, progress) {
    if (debugMode) log.debug(`Processing directory: ${dir} (will process files and subdirectories)`);
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            await processDirectory(fullPath, progress);
            continue;
        }

        const relativePath = path.relative(baseDir, fullPath);
        // Don't log each individual file processing
        const fileInfo = parseFilePath(relativePath);
        
        // Check if file is already in database
        const existingFile = getFileById.get(fileInfo.id);
        
        if (existingFile) {
            // Don't log each skipped file
            progress.incrementProcessed();
            continue;
        }
        
        // Get file size before hashing
        const fileSize = getFileSize(fullPath);
        
        // New file, hash it and add to database
        // Don't log each new file being processed
        const fileHash = await hashFile(fullPath);

        try {
            // Don't log each database insertion
            insertFile.run({
                id: fileInfo.id,
                path: relativePath,
                hash: fileHash,
                size: fileSize
            });
            progress.incrementProcessed();
        } catch (error) {
            log.error(`Error inserting file ${relativePath}: ${error.message}`);
            if (debugMode) log.debug(`Database insert error details: ${JSON.stringify(error)}`);
        }
    }
} 