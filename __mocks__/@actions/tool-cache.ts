let cachedTools = {};

function __setToolCached(mockToolCachedInfo) {
    cachedTools = mockToolCachedInfo;
}

function find(toolName, version) {
    if (cachedTools[toolName] != undefined && cachedTools[toolName] == true)
        return 'toolCachedPath';
    return undefined;
}

async function downloadTool(toolUrl, downloadDir?): Promise<string> {
    if (downloadDir != null)
        return downloadDir;
    if (toolUrl.includes('releases'))
        return 'releaseDownloadedPath';
    return 'toolDownloadedPath';
}

async function extractTar(toolPath): Promise<string> {
    return 'extractedToolPath';
}

async function cacheDir(toolPath, toolName, toolVersion): Promise<string> {
    return 'cachedToolPath';
}

var toolCache = {
    __setToolCached: __setToolCached,
    downloadTool: jest.fn(downloadTool),
    find: jest.fn(find),
    extractTar: jest.fn(extractTar),
    cacheDir: jest.fn(cacheDir)
}

module.exports = toolCache;