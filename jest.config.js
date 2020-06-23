module.exports = {
    clearMocks: true,
    moduleFileExtensions: ['js', 'ts'],
    testPathIgnorePatterns: ['/home/runner/work/_temp/_github_workflow/event.json'],
    testEnvironment: 'node',
    testMatch: ['**/*.test.ts'],
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    verbose: true
}