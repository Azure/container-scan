import * as fs from 'fs'

let CONTAINER_SCAN_DIRECTORY = '';

export function getFileJson(path: string): any {
    try {
        const rawContent = fs.readFileSync(path, 'utf-8');
        return JSON.parse(rawContent);
    } catch (ex) {
        throw new Error(`An error occured while parsing the contents of the file: ${path}. Error: ${ex}`);
    }
}

export function getContainerScanDirectory(): string {
    if (!CONTAINER_SCAN_DIRECTORY) {
        CONTAINER_SCAN_DIRECTORY = `${process.env['GITHUB_WORKSPACE']}/_temp/containerscan_${Date.now()}`;
        ensureDirExists(CONTAINER_SCAN_DIRECTORY);
    }

    return CONTAINER_SCAN_DIRECTORY;
}

function ensureDirExists(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}