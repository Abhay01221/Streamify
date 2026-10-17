module.exports = {
  testTimeout: 30000,
  preset: 'ts-jest', testEnvironment: 'node', testMatch: ['**/tests/**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/setup.ts'],
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { rootDir: '.', strict: true }, diagnostics: true }] },
};
