jest.mock('fs');
jest.mock('os');

describe('Run Dockle', () => {
    const mockedFs = require('fs');
    const mockedOs = require('os');
    const mockedToolCache = require('@actions/tool-cache');
    const mockedFileHelper = require('../src/fileHelper');
    mockedFileHelper.getContainerScanDirectory = jest.fn().mockImplementation(() =>{
        return 'test/_temp/containerscan_123';
    });
            
    let mockFile = {
        'releaseDownloadedPath': JSON.stringify({ tag_name: 'v1.1.1' })
    };
    let cachedTools = {
        'trivy': true,
        'dockle': true
    };
    mockedFs.__setMockFiles(mockFile);
    mockedToolCache.__setToolCached(cachedTools);

    afterAll(() => {
        jest.clearAllMocks();
        jest.resetModules();
        jest.restoreAllMocks();
    });

    test('Dockle binaries are present in the cache', async () => {
        const runner = require('../src/dockleHelper');

        await expect(runner.runDockle()).resolves.toBe(0);
        expect(mockedOs.type).not.toHaveBeenCalled();
        expect(mockedToolCache.find).not.toHaveReturnedWith(undefined);
        expect(mockedToolCache.downloadTool).toHaveBeenCalledTimes(1);
    });

    test('Dockle binaries are not present in the cache', async () => {        
        cachedTools['dockle'] = false;
        mockedToolCache.__setToolCached(cachedTools);

        const runner = require('../src/dockleHelper');

        await expect(runner.runDockle()).resolves.toBe(0);
        expect(mockedOs.type).toHaveBeenCalledTimes(1);
        expect(mockedToolCache.find).toHaveReturnedWith(undefined);
        expect(mockedToolCache.downloadTool).toHaveBeenCalledTimes(2);
    });
});
