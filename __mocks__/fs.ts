const fs = jest.genMockFromModule<any>('fs');

let fileMap: object = {};
let fileContent = "file content";

function __setMockFiles(newFileMap) {
    fileMap = newFileMap
}

function readFileSync(filePath, options?) {
    return fileMap[filePath] || '';
}

function existsSync(filePath) {
    return filePath in fileMap;
}

fs.__setMockFiles = __setMockFiles;
fs.readFileSync = jest.fn(readFileSync);
fs.existsSync = jest.fn(existsSync);

module.exports = fs;