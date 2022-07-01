jest.mock('fs');
jest.mock('os');

describe('Run Dockle', () => {
    const mockedFs = require('fs');
    const mockedOs = require('os');

    function setupFileMock() {
        const mockedFileHelper = require('../src/fileHelper');
        mockedFileHelper.getContainerScanDirectory = jest.fn().mockImplementation(() => {
            return 'test/_temp/containerscan_123';
        });

        return {
            'releaseDownloadedPath': JSON.stringify({tag_name: 'v1.1.1'})
        };
    }
    mockedFs.__setMockFiles(setupFileMock());

    function toolCache() {
        const mockedToolCache = require('@actions/tool-cache');
        let cachedTools = {
            'trivy': true,
            'dockle': true
        };
        return {mockedToolCache, cachedTools};
    }
    let {mockedToolCache, cachedTools} = toolCache();
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

    test('Dockle binaries are not present in the cache and not use latest version', async () => {
        jest.resetModules();
        const mockedFs = require('fs');
        const mockedOs = require('os');
        mockedFs.__setMockFiles(setupFileMock());
        let {mockedToolCache, cachedTools} = toolCache();
        cachedTools['dockle'] = false;
        mockedToolCache.__setToolCached(cachedTools);
        jest.mock('../src/inputHelper', () => {
            const inputHelper = jest.requireActual('../src/inputHelper');
            return {
                __esModule: true,
                ...inputHelper,
                dockleVersion: '0.4.5',
            };
        });

        const runner = require('../src/dockleHelper');
        await expect(runner.runDockle()).resolves.toBe(0);
        expect(mockedOs.type).toHaveBeenCalledTimes(1);
        expect(mockedToolCache.find).toHaveReturnedWith(undefined);
        expect(mockedToolCache.downloadTool).toHaveBeenCalledTimes(1);
    });
});
