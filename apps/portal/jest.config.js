// eslint-disable-next-line @typescript-eslint/no-var-requires
const nextJest = require('next/jest');

// Uses Next.js' own Jest preset (SWC transform, CSS and asset mocks). The previous configuration
// pointed at a workspace preset and Nx plugins that are not part of this repository.
const createJestConfig = nextJest({ dir: __dirname });

module.exports = createJestConfig({
  displayName: 'portal',
  testEnvironment: '<rootDir>/specs/jsdom-environment.js',
  testMatch: ['<rootDir>/specs/**/*.spec.{ts,tsx}'],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  coverageDirectory: '../../coverage/apps/portal',
});
