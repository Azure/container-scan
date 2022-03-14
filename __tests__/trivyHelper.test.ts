
jest.mock('fs');
jest.mock('os');



describe('Run Trivy', () => {
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

    test('Trivy binaries are present in the cache', async () => {
        const runner = require('../src/trivyHelper');
        const trivyResult = await runner.runTrivy();
        expect(trivyResult).toHaveProperty('status', 0);
        expect(trivyResult).toHaveProperty('timestamp');
        expect(mockedOs.type).not.toHaveBeenCalled();
        expect(mockedToolCache.find).not.toHaveReturnedWith(undefined);
        expect(mockedToolCache.downloadTool).toHaveBeenCalledTimes(1);
    });

   test('Trivy binaries are not present in the cache', async () => {
        cachedTools['trivy'] = false;
        mockedToolCache.__setToolCached(cachedTools);
        const runner = require('../src/trivyHelper');

        const trivyResult = await runner.runTrivy();
        expect(trivyResult).toHaveProperty('status', 0);
        expect(trivyResult).toHaveProperty('timestamp');
        expect(mockedOs.type).toHaveBeenCalledTimes(1);
        expect(mockedToolCache.find).toHaveReturnedWith(undefined);
        expect(mockedToolCache.downloadTool).toHaveBeenCalledTimes(2);
    });

    test('Trivy binaries are not present in the cache and not use latest version', async () => {
        jest.resetModules();
        const mockedFs = require('fs');
        const mockedOs = require('os');
        mockedFs.__setMockFiles(setupFileMock());
        let {mockedToolCache, cachedTools} = toolCache();
        cachedTools['trivy'] = false;
        mockedToolCache.__setToolCached(cachedTools);
        jest.mock('../src/inputHelper', () => {
            const inputHelper = jest.requireActual('../src/inputHelper');
            return {
                __esModule: true,
                ...inputHelper,
                trivyVersion: '0.23.0',
            };
        });

        const runner = require('../src/trivyHelper');
        const trivyResult = await runner.runTrivy();
        expect(trivyResult).toHaveProperty('status', 0);
        expect(trivyResult).toHaveProperty('timestamp');
        expect(mockedOs.type).toHaveBeenCalledTimes(1);
        expect(mockedToolCache.find).toHaveReturnedWith(undefined);
        expect(mockedToolCache.downloadTool).toHaveBeenCalledTimes(1);
    });


});
