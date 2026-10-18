/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['<rootDir>/tests/loop/'],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageThreshold: { global: { functions: 100, lines: 95, branches: 95, statements: 95 } },
};
