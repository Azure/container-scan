jest.mock('fs');
jest.mock('os');

describe('Run Trivy', () => {
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
});
