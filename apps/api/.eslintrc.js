module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-empty-function': 'off',
  },
  overrides: [
    {
      // The optional Ever Platform modules stay at arm's length: outside them, only AppModule's
      // module list may import them, and producers import the counter events leaf only.
      files: ['src/**/*.ts'],
      excludedFiles: ['src/module/ever-*/**', 'src/common/ever-platform/**', 'src/**/*.spec.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/module/ever-instance/**', '**/module/ever-stats/**', '**/ever-instance/*', '**/ever-stats/*'],
                message: 'Import the Ever Platform modules only through src/common/ever-platform/modules.ts; producers use src/common/events/ever-counters.events.ts.',
              },
            ],
          },
        ],
      },
    },
  ],
};
