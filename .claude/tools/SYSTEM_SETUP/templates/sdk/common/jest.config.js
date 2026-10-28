/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 20000,
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['<rootDir>/tests/loop/'],
  collectCoverageFrom: ['src/**/*.ts'],
  // Rules.md §4.11: 100 % of functions, >= 95 % of lines / branches / statements.
  coverageThreshold: { global: { functions: 100, lines: 95, branches: 95, statements: 95 } },
};
