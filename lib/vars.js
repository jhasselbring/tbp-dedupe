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
        f: 'force'
    },
    default: {
        target: process.cwd(),
        force: false
    }
});

export const targetDir = path.resolve(argv.target);
export const baseDir = path.dirname(targetDir);
export const dbName = `${path.basename(targetDir)}.dedupe`;
export const dbPath = path.join(baseDir, dbName);

// Check if database exists
export const dbExists = fs.existsSync(dbPath);

console.log(chalk.cyan('Command line arguments:'), chalk.yellow(JSON.stringify(argv, null, 2)));
console.log(chalk.cyan('Target directory:'), chalk.green(targetDir));
console.log(chalk.cyan('Base directory:'), chalk.green(baseDir));
console.log(chalk.cyan('Database name:'), chalk.yellow(dbName));
console.log(chalk.cyan('Database path:'), chalk.green(dbPath));
console.log(chalk.cyan('Database exists:'), chalk.yellow(dbExists));
console.log(chalk.cyan('Force mode:'), chalk.yellow(argv.force));

export const log = {
    info: (msg) => console.log(chalk.blue(msg)),
    success: (msg) => console.log(chalk.green(msg)),
    error: (msg) => console.error(chalk.red(msg)),
    warning: (msg) => console.log(chalk.yellow(msg))
};

export { argv }; 