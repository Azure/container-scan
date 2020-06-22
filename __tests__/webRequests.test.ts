jest.mock('fs');
jest.mock('os');

describe('Create scan report to test HTTP calls', () => {
    const mockedFs = require('fs');
    const testUtil = require('./testUtil');
    const mockedFileHelper = require('../src/fileHelper');
    mockedFileHelper.getContainerScanDirectory = jest.fn().mockImplementation(() =>{
        return 'test/_temp/containerscan_123';
    });
    const env = process.env;
    process.env = {
        'GITHUB_WORKSPACE': 'test',
        'GITHUB_SHA': 'sha',
        'GITHUB_REPOSITORY': 'test_repo',
        'GITHUB_TOKEN': 'token',
        'GITHUB_EVENT_PATH': 'test_event.json',
        'GITHUB_EVENT_NAME': 'pull_request'
    };

    afterAll(() => {
        jest.clearAllMocks();
        jest.resetModules();
        jest.restoreAllMocks();
        process.env = env;
    });

    test('When no vulnerabilities are detected', async () => {
        let mockFile = {
            'test_event.json': JSON.stringify({
                'pull_request': {
                    'head': {
                        'sha': 'test_sha'
                    }
                }
            })
        };
        mockedFs.__setMockFiles(mockFile);
        const util = require('../src/utils');
        await expect(util.createScanResult(0, 0)).resolves.not.toThrow();
    });

    test('When vulnerabilities are detected', async () => {
        let mockFile = {
            'test/_temp/containerscan_123': true,
            'test/_temp/containerscan_123/trivyoutput.json': JSON.stringify(testUtil.trivyOutput),
            'test/_temp/containerscan_123/dockleoutput.json': JSON.stringify(testUtil.dockleOutput),
            'test_event.json': JSON.stringify({
                'pull_request': {
                    'head': {
                        'sha': 'test_sha'
                    }
                }
            })
        }
        mockedFs.__setMockFiles(mockFile);
        const util = require('../src/utils');
        await expect(util.createScanResult(5, 5)).resolves.not.toThrow();
    });
});
