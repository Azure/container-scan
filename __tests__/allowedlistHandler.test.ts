jest.mock('fs');
jest.mock('os');

describe('Initialize allowedlist file', () => {
    const mockedFs = require('fs');
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

    test('No allowedlist file is given', () => {
        const allowedlistHandler = require('../src/allowedlistHandler');
        expect(allowedlistHandler.init).not.toThrow();
        expect(mockedFs.existsSync).not.toReturnWith(true);
        expect(mockedFs.existsSync).toHaveBeenCalledTimes(2);
    });

    test('allowedlist.yaml file is given', () => {
        let mockFile = {
            'test/.github/containerscan/allowedlist.yaml': '{general: {vulnerabilities: [CVE-2003-1307, CVE-2007-0086], bestPracticeViolations: [CIS-DI-0005, DKL-LI-0003]}}'
        };
        
        mockedFs.__setMockFiles(mockFile);
        const allowedlistHandler = require('../src/allowedlistHandler');
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
        const allowedlistHandler = require('../src/allowedlistHandler');
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
        const allowedlistHandler = require('../src/allowedlistHandler');
        expect(allowedlistHandler.init).toThrow();
        expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(0);
    });

    test('Only vulnerabilities are present in allowedlist.yaml file', () => {
        let mockFile = {
            'test/.github/containerscan/allowedlist.yml': '{general: {vulnerabilities: [CVE-2003-1307, CVE-2007-0086]}}'
        };
        mockedFs.__setMockFiles(mockFile);
        const allowedlistHandler = require('../src/allowedlistHandler');
        expect(allowedlistHandler.init).not.toThrow();
        expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(1);
    });
});
