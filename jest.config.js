module.exports = {
  collectCoverage: true,
  collectCoverageFrom: ['**/*.{ts,tsx}'],
  testEnvironment: 'node',
  displayName: 'dynamo-helper',
  coveragePathIgnorePatterns: ['node_modules', 'src/index.ts'],
  modulePathIgnorePatterns: ['lib'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text-summary', 'html', 'lcov'],
  modulePathIgnorePatterns: ['lib'],
};
