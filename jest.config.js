module.exports = {
    clearMocks: true,
    testEnvironment: 'node',
    testMatch: ['**/*.test.ts'],
    transform: {
      '^.+\\.ts$': 'ts-jest'
    },
    verbose: true
  }