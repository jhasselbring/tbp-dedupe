import chalk from 'chalk';

export class ProgressTracker {
    constructor() {
        this.totalFiles = 0;
        this.processedFiles = 0;
        this.startTime = Date.now();
        this.lastUpdateTime = this.startTime;
        this.initialized = false;
    }

    setTotalFiles(total) {
        this.totalFiles = total;
        this.updateProgress();
    }

    incrementProcessed() {
        this.processedFiles++;
        this.updateProgress();
    }

    clearConsole() {
        process.stdout.write('\x1Bc'); // Clear the console
    }

    updateProgress() {
        if (!this.initialized) {
            this.clearConsole();
            this.initialized = true;
        }

        const now = Date.now();
        const elapsed = (now - this.startTime) / 1000; // in seconds
        const filesPerSecond = this.processedFiles / elapsed;
        const remainingFiles = this.totalFiles - this.processedFiles;
        const estimatedSeconds = remainingFiles / filesPerSecond;

        const percentage = (this.processedFiles / this.totalFiles * 100).toFixed(1);
        const progressBar = this.createProgressBar(percentage);
        const timeInfo = this.formatTimeInfo(elapsed, estimatedSeconds);

        process.stdout.write(`\r${chalk.cyan('Progress:')} ${progressBar} ${chalk.yellow(`${percentage}%`)} | ` +
            chalk.green(`${this.processedFiles}/${this.totalFiles} files`) + ` | ${timeInfo}`);
    }

    createProgressBar(percentage) {
        const width = 20;
        const filled = Math.floor((percentage / 100) * width);
        const empty = width - filled;
        return chalk.blue('[') + 
               chalk.green('='.repeat(filled)) + 
               chalk.gray('-'.repeat(empty)) + 
               chalk.blue(']');
    }

    formatTimeInfo(elapsed, estimated) {
        const formatTime = (seconds) => {
            if (seconds < 60) return `${Math.round(seconds)}s`;
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.round(seconds % 60);
            return `${minutes}m ${remainingSeconds}s`;
        };

        return chalk.cyan(`Elapsed: ${formatTime(elapsed)} | ETA: ${formatTime(estimated)}`);
    }

    complete() {
        const totalTime = (Date.now() - this.startTime) / 1000;
        process.stdout.write('\n');
        return {
            totalFiles: this.totalFiles,
            totalTime: totalTime,
            averageSpeed: this.totalFiles / totalTime
        };
    }
} 