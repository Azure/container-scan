describe('Validate inputs', () => {
    const mockedCore = require('@actions/core');
    afterAll(() => {
        jest.clearAllMocks();
        jest.resetModules();
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

    test('Inputs should be validated successfully', () => {
        // Input validation tests need to be run in isolation because inputs are read at the time when module gets imported
        jest.isolateModules(() => {
            let __mockInputValues = {
                'image-name': 'nginx',
                'token': 'token',
                'username': 'username',
                'password': 'password',
                'severity-threshold': 'HIGH',
                'run-quality-checks': 'true'
            }
            mockedCore.__setMockInputValues(__mockInputValues);
            const inputHelper = require('../src/inputHelper');
            expect(inputHelper.validateRequiredInputs).not.toThrow();
        });
    });
});
