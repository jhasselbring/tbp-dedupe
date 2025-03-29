import chalk from 'chalk';

/**
 * ProgressTracker Class
 * Purpose: Displays a real-time progress bar during file scanning operations
 * Why it's needed: Gives users visual feedback during potentially long-running operations
 * How it works: Tracks files processed, calculates percentages, and updates the console display
 */
export class ProgressTracker {
    /**
     * Constructor - Initializes tracking variables
     * Why it's needed: Sets up the initial state for progress tracking
     * How it works: Creates properties to store counts, timestamps, and initialization state
     */
    constructor() {
        this.totalFiles = 0;        // Total number of files to process
        this.processedFiles = 0;    // Number of files processed so far
        this.startTime = Date.now(); // When the operation started
        this.lastUpdateTime = this.startTime; // Last time the display was updated
        this.initialized = false;   // Whether the display has been initialized
    }

    /**
     * setTotalFiles - Sets the total number of files to process
     * Why it's needed: We need to know the total to calculate percentages
     * How it works: Stores the total and updates the progress display
     * @param {number} total - The total number of files
     */
    setTotalFiles(total) {
        this.totalFiles = total;
        this.updateProgress();
    }

    /**
     * incrementProcessed - Increases the processed files count by 1
     * Why it's needed: Tracks each file as it's processed
     * How it works: Increments the counter and updates the progress display
     */
    incrementProcessed() {
        this.processedFiles++;
        this.updateProgress();
    }

    /**
     * clearConsole - Clears the terminal screen
     * Why it's needed: Provides a clean slate for the progress display
     * How it works: Uses ANSI escape code '\x1Bc' to clear the terminal
     */
    clearConsole() {
        process.stdout.write('\x1Bc'); // Clear the console using ANSI escape code
    }

    /**
     * updateProgress - Updates the progress display in the console
     * Why it's needed: Shows the user real-time progress information
     * How it works: 
     * 1. Calculates elapsed time and completion percentage
     * 2. Estimates remaining time based on current speed
     * 3. Creates a visual progress bar and formats time information
     * 4. Writes the formatted output to the console
     */
    updateProgress() {
        // Initialize the display the first time this is called
        if (!this.initialized) {
            this.clearConsole();
            this.initialized = true;
        }

        // Calculate timing and progress metrics
        const now = Date.now();
        const elapsed = (now - this.startTime) / 1000; // Convert milliseconds to seconds
        const filesPerSecond = elapsed > 0 ? this.processedFiles / elapsed : 0; // Avoid division by zero
        const remainingFiles = this.totalFiles - this.processedFiles;
        const estimatedSeconds = filesPerSecond > 0 ? remainingFiles / filesPerSecond : NaN; // ETA calculation

        // Calculate completion percentage and format the progress elements
        const percentage = this.totalFiles > 0 ? (this.processedFiles / this.totalFiles * 100).toFixed(1) : 0;
        const progressBar = this.createProgressBar(percentage);
        const timeInfo = this.formatTimeInfo(elapsed, estimatedSeconds);

        // Clear the current line and write the new progress information
        process.stdout.write('\r\x1b[K'); // \r moves cursor to start of line, \x1b[K clears to end of line
        process.stdout.write(`${chalk.cyan('Progress:')} ${progressBar} ${chalk.yellow(`${percentage}%`)} | ` +
            chalk.green(`${this.processedFiles}/${this.totalFiles} files`) + ` | ${timeInfo}`);
    }

    /**
     * createProgressBar - Creates a visual progress bar string
     * Why it's needed: Visual representation of completion is easier to understand than just numbers
     * How it works: 
     * 1. Calculates how many characters should be filled vs. empty based on percentage
     * 2. Uses chalk to color the different parts of the progress bar
     * @param {number} percentage - The completion percentage
     * @return {string} - A formatted progress bar string with colors
     */
    createProgressBar(percentage) {
        const width = 20; // Total width of the progress bar in characters
        const filled = Math.floor((percentage / 100) * width); // Number of filled characters
        const empty = width - filled; // Number of empty characters
        
        // Create and return the progress bar with colors
        return chalk.blue('[') + 
               chalk.green('='.repeat(filled)) + // Fill completed portion with green equals signs
               chalk.gray('-'.repeat(empty)) +   // Fill remaining portion with gray dashes
               chalk.blue(']');
    }

    /**
     * formatTimeInfo - Formats elapsed and estimated time information
     * Why it's needed: Raw time in seconds isn't user-friendly
     * How it works: 
     * 1. Converts seconds to minutes and seconds format when needed
     * 2. Handles edge cases like NaN or infinite values
     * @param {number} elapsed - Seconds elapsed so far
     * @param {number} estimated - Estimated seconds remaining
     * @return {string} - Formatted time string
     */
    formatTimeInfo(elapsed, estimated) {
        // Inner function to format a time value in seconds
        const formatTime = (seconds) => {
            if (isNaN(seconds) || !isFinite(seconds)) return 'calculating'; // Handle invalid values
            if (seconds < 60) return `${Math.round(seconds)}s`; // Show seconds if less than a minute
            
            // Convert to minutes and seconds format
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.round(seconds % 60);
            return `${minutes}m ${remainingSeconds}s`;
        };

        // Return the formatted elapsed and ETA times
        return chalk.cyan(`Elapsed: ${formatTime(elapsed)} | ETA: ${formatTime(estimated)}`);
    }

    /**
     * complete - Finalizes the progress tracking
     * Why it's needed: Cleans up the display and provides summary statistics
     * How it works:
     * 1. Calculates the total time taken
     * 2. Writes a newline to move past the progress display
     * 3. Returns statistics about the completed operation
     * @return {object} - Statistics about the operation
     */
    complete() {
        const totalTime = (Date.now() - this.startTime) / 1000; // Total seconds elapsed
        process.stdout.write('\n'); // Move to a new line when complete
        
        // Return statistics for use in summary messages
        return {
            totalFiles: this.totalFiles,
            totalTime: totalTime,
            averageSpeed: this.totalFiles / totalTime // Files per second
        };
    }
} 