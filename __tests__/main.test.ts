jest.mock('fs');
jest.mock('os');

const mockedFs = require('fs');
const mockedOs = require('os');
const mockedToolCache = require('@actions/tool-cache');
const mockedToolRunner = require('@actions/exec/lib/toolrunner');
const mockedCore = require('@actions/core');
const testUtil = require('./testUtil');

process.env['GITHUB_WORKSPACE'] = 'test';
Date.now = jest.fn().mockReturnValue(123);

describe('Validate inputs', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('Inputs should be validated successfully', () => {
        // Input validation tests need to be run in isolation because inputs are read at the time when module gets imported
        jest.isolateModules(() => {
            const inputHelper = require('../src/inputHelper');
            expect(inputHelper.validateRequiredInputs).not.toThrow();
        });
    });

    test('Inputs validation should fail with no image input', () => {
        jest.isolateModules(() => {
            let __mockInputValues = {
                'image-name': undefined,
                'token': 'token',
                'username': 'username',
                'password': 'password',
                'severity-threshold': 'HIGH',
                'run-quality-checks': 'true'
            }
            mockedCore.__setMockInputValues(__mockInputValues);
            const inputHelper = require('../src/inputHelper');
            expect(inputHelper.validateRequiredInputs).toThrow();
        });
    });
});

describe('Run Trivy', () => {
    let mockFile = {
        'releaseDownloadedPath': JSON.stringify({ tag_name: 'v1.1.1' })
    };
    let cachedTools = {
        'trivy': true,
        'dockle': true
    };

    beforeAll(() => {
        mockedFs.__setMockFiles(mockFile);
        mockedToolCache.__setToolCached(cachedTools);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('Trivy binaries are present in the cache', async () => {
        const runner = require('../src/trivyHelper');
        await expect(runner.runTrivy()).resolves.toBe(0);
        expect(mockedOs.type).not.toHaveBeenCalled();
        expect(mockedToolCache.find).not.toHaveReturnedWith(undefined);
        expect(mockedToolCache.downloadTool).toHaveBeenCalledTimes(1);
    });

    test('Trivy binaries are not present in the cache', async () => {
        cachedTools['trivy'] = false;
        mockedToolCache.__setToolCached(cachedTools);
        const runner = require('../src/trivyHelper');

        await expect(runner.runTrivy()).resolves.toBe(0);
        expect(mockedOs.type).toHaveBeenCalledTimes(1);
        expect(mockedToolCache.find).toHaveReturnedWith(undefined);
        expect(mockedToolCache.downloadTool).toHaveBeenCalledTimes(2);
    });
});

describe('Run Dockle', () => {
    let mockFile = {
        'releaseDownloadedPath': JSON.stringify({ tag_name: 'v1.1.1' })
    };
    let cachedTools = {
        'trivy': true,
        'dockle': true
    };

    beforeAll(() => {
        mockedFs.__setMockFiles(mockFile);
        mockedToolCache.__setToolCached(cachedTools);
    });

    afterEach(() => {
        jest.clearAllMocks();
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

describe('Initialize allowedlist file', () => {
    const allowedlistHandler = require('../src/allowedlistHandler');

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('No allowedlist file is given', () => {
        expect(allowedlistHandler.init).not.toThrow();
        expect(mockedFs.existsSync).not.toReturnWith(true);
        expect(mockedFs.existsSync).toHaveBeenCalledTimes(2);
    });

    test('allowedlist.yaml file is given', () => {
        let mockFile = {
            'test/.github/containerscan/allowedlist.yaml': '{general: {vulnerabilities: [CVE-2003-1307, CVE-2007-0086], bestPracticeViolations: [CIS-DI-0005, DKL-LI-0003]}}'
        };
        mockedFs.__setMockFiles(mockFile);
        expect(allowedlistHandler.init).not.toThrow();
        expect(mockedFs.existsSync).toReturnWith(true);
        expect(mockedFs.existsSync).toHaveBeenCalledTimes(1);
        expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(2);
    });

    test('allowedlist.yml file is given', () => {
        let mockFile = {
            'test/.github/containerscan/allowedlist.yml': '{general: {vulnerabilities: [CVE-2003-1307, CVE-2007-0086], bestPracticeViolations: [CIS-DI-0005, DKL-LI-0003]}}'
        };
        mockedFs.__setMockFiles(mockFile);
        expect(allowedlistHandler.init).not.toThrow();
        expect(mockedFs.existsSync).toReturnWith(true);
        expect(mockedFs.existsSync).toHaveBeenCalledTimes(2);
        expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(2);
    });

    test('Invalid allowedlist.yaml file is given', () => {
        let mockFile = {
            'test/.github/containerscan/allowedlist.yaml': '{general [CVE-2003-1307, CVE-2007-0086]}'
        };
        mockedFs.__setMockFiles(mockFile);
        expect(allowedlistHandler.init).toThrow();
        expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(0);
    });

    test('Only vulnerabilities are present in allowedlist.yaml file', () => {
        let mockFile = {
            'test/.github/containerscan/allowedlist.yml': '{general: {vulnerabilities: [CVE-2003-1307, CVE-2007-0086]}}'
        };
        mockedFs.__setMockFiles(mockFile);
        expect(allowedlistHandler.init).not.toThrow();
        expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(1);
    });
});

describe('Create scan report to test HTTP calls', () => {    
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('When no vulnerabilities are detected', () => {
        const util = require('../src/utils');
        const inputHelper = require('../src/inputHelper');
        expect(() => {
            util.createScanResult(0, 0);
        }).not.toThrow();

    });

    test('When vulnerabilities are detected', () => {
        let mockFile = {
            'test/_temp/containerscan_123': true,
            'test/_temp/containerscan_123/trivyoutput.json': JSON.stringify(testUtil.trivyOutput),
            'test/_temp/containerscan_123/dockleoutput.json': JSON.stringify(testUtil.dockleOutput)
        }
        mockedFs.__setMockFiles(mockFile);
        const util = require('../src/utils');
        const inputHelper = require('../src/inputHelper');
        expect(() => {
            util.createScanResult(5,5);
        }).not.toThrow();

    });
});
