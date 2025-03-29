import minimist from 'minimist';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const argv = minimist(process.argv.slice(2), {
    alias: {
        t: 'target',
        h: 'help',
        f: 'force',
        d: 'debug',
        s: 'show-dupes'
    },
    default: {
        target: process.cwd(),
        force: false,
        debug: false,
        'show-dupes': false
    }
});

export const targetDir = path.resolve(argv.target);
export const targetDirName = `${path.basename(targetDir)}`;
export const baseDir = path.dirname(targetDir);
export const dbName = `${path.basename(targetDir)}.dedupe`;
export const dbPath = path.join(baseDir, dbName);

// Check if database exists
export const dbExists = fs.existsSync(dbPath);

// Flag options
export const debugMode = argv.debug;
export const showDuplicates = argv['show-dupes'];

export const log = {
    info: (msg) => console.log(chalk.cyan(msg)),
    success: (msg) => console.log(chalk.green(msg)),
    error: (msg) => console.error(chalk.red(msg)),
    warning: (msg) => console.log(chalk.yellow(msg)),
    debug: (msg) => debugMode ? console.log(chalk.magenta(`[DEBUG] ${msg}`)) : null
};

export { argv }; 