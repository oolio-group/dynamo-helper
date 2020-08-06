module.exports = {
  preset: "ts-jest",
  collectCoverage: true,
  collectCoverageFrom: ["**/*.{ts,tsx}"],
  testEnvironment: "node",
  displayName: "dynamo-helper",
  coveragePathIgnorePatterns: ["node_modules", "lib/index.ts"],
  modulePathIgnorePatterns: ["dist"],
  coverageDirectory: "coverage",
  coverageReporters: ["text-summary", "html", "lcov"],
  modulePathIgnorePatterns: ["dist"],
};
