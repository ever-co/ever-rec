module.exports = {
  '*.{ts,js,tsx,jsx}': [
    'yarn workspace admin eslint --fix'
  ],
  '*.json': [
    'yarn workspace admin prettier --write'
  ],
  '*.css': [
    'yarn workspace admin stylelint --fix'
  ],
};
