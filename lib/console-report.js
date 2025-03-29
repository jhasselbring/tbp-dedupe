/**
 * Console Report Module
 * Purpose: Formats and displays duplicate file information in the terminal
 * Why it's needed: Provides a CLI alternative to the web interface
 * How it works: Queries the database and formats output for console display
 */

import chalk from 'chalk';
import { getDuplicates, getFilesByHash, db } from '../database/files.js';
import { log } from './vars.js';

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
 * displayDuplicateSummary - Shows a concise summary of duplicate files
 * Why it's needed: Provides a quick overview of space usage after every scan
 * How it works: Calculates total original and duplicate files and sizes
 */
export function displayDuplicateSummary() {
    try {
        // Get total file counts and sizes
        const totalStats = db.prepare('SELECT COUNT(*) as count, SUM(size) as totalSize FROM files').get();
        
        // Get duplicate stats
        const duplicates = getDuplicates.all();
        
        if (duplicates.length === 0) {
            // No duplicates found
            console.log(
                chalk.blue(totalStats.count) + 
                ':' + 
                chalk.green(formatSize(totalStats.totalSize)) + 
                ' Original files'
            );
            console.log(chalk.yellow('0') + ':' + chalk.red('0 Bytes') + ' Duplicates');
            return;
        }
        
        // Calculate total duplicate files and wasted space
        let duplicateFileCount = 0;
        let duplicateSize = 0;
        
        duplicates.forEach(group => {
            // For each duplicate set, count all files except one (the original)
            duplicateFileCount += (group.count - 1);
            // Calculate wasted space
            duplicateSize += group.size * (group.count - 1);
        });
        
        // Calculate original files (total minus duplicates)
        const originalFileCount = totalStats.count - duplicateFileCount;
        const originalSize = totalStats.totalSize - duplicateSize;
        
        // Display color-coded summary
        console.log(
            chalk.blue(originalFileCount) + 
            ':' + 
            chalk.green(formatSize(originalSize)) + 
            ' Original files'
        );
        
        console.log(
            chalk.yellow(duplicateFileCount) + 
            ':' + 
            chalk.red(formatSize(duplicateSize)) + 
            ' Duplicates'
        );
        
        if (duplicateFileCount > 0) {
            console.log(chalk.cyan(`Use '--show-dupes' flag for detailed report or check web interface for details`));
        }
        
    } catch (error) {
        log.error(`Error displaying duplicate summary: ${error.message}`);
    }
}

/**
 * displayDuplicates - Shows duplicate file information in the terminal
 * Why it's needed: Allows users to see potential space savings without web UI
 * How it works: Queries the database and formats the output for the console
 */
export function displayDuplicates() {
    try {
        // Get all duplicate sets
        const duplicates = getDuplicates.all();
        
        if (duplicates.length === 0) {
            log.info('No duplicate files found.');
            return;
        }
        
        let totalWastedSpace = 0;
        let totalDuplicateFiles = 0;
        
        console.log('\n' + chalk.yellow('═'.repeat(80)));
        console.log(chalk.yellow('DUPLICATE FILES REPORT'));
        console.log(chalk.yellow('═'.repeat(80)) + '\n');
        
        duplicates.forEach((group, index) => {
            const files = getFilesByHash.all(group.hash);
            const wastedSpace = group.size * (group.count - 1);
            totalWastedSpace += wastedSpace;
            totalDuplicateFiles += (group.count - 1);
            
            console.log(chalk.green(`Duplicate Set #${index + 1} - ${formatSize(group.size)} each - Wasted: ${formatSize(wastedSpace)}`));
            console.log(chalk.gray('─'.repeat(80)));
            
            // Show each duplicate file path
            files.forEach((file, fileIndex) => {
                const prefix = fileIndex === 0 ? chalk.green('✓ KEEP: ') : chalk.red('✗ DUPE: ');
                console.log(`${prefix}${file.path}`);
            });
            
            console.log('\n');
        });
        
        console.log(chalk.yellow('═'.repeat(80)));
        console.log(chalk.yellow(`SUMMARY: ${duplicates.length} duplicate sets found`));
        console.log(chalk.yellow(`Total Duplicate Files: ${totalDuplicateFiles}`));
        console.log(chalk.yellow(`Total Space Wasted: ${formatSize(totalWastedSpace)}`));
        console.log(chalk.yellow(`Potential Space Savings: ${formatSize(totalWastedSpace)}`));
        console.log(chalk.yellow('═'.repeat(80)) + '\n');
        
        console.log(chalk.cyan(`To remove duplicates, use the web interface at http://localhost:3000`));
        console.log(chalk.cyan(`Or run this command with the '--auto-remove' flag to automatically remove duplicates`));
        
    } catch (error) {
        log.error(`Error displaying duplicates: ${error.message}`);
    }
} 