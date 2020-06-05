const fs = jest.genMockFromModule<any>('fs');

let fileMap: object = {};

function __setMockFiles(newFileMap) {
    fileMap = newFileMap
}

function readFileSync(filePath, options?) {
    console.log('readFileSync:: file: '+filePath);
    return fileMap[filePath] || '';
}

function readFile(filePath, options?) {
    console.log('readFile:: file: '+filePath);
    return fileMap[filePath] || '';
}

function existsSync(filePath) {
    return filePath in fileMap;
}

fs.__setMockFiles = __setMockFiles;
fs.readFileSync = jest.fn(readFileSync);
fs.readFile = jest.fn(readFile);
fs.existsSync = jest.fn(existsSync);

module.exports = fs;