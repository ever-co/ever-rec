# @ever-rec/prettier-config

Shared Prettier configuration for consistent code formatting across the monorepo.

## Configuration

- **File:** `prettier.shared.json`
- **Description:** Provides the Prettier configuration settings for all projects in the monorepo.
- **Usage:**

  ```json
  {
    "extends": "@ever-rec/prettier-config/prettier.shared.json"
  }
  ```

## Installation

Ensure you have Prettier installed in your project:

```bash
yarn add --dev @ever-rec/prettier-config
```

## Example Settings

Here is an example of the Prettier settings:

```json
{
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

## Contributing

Feel free to submit pull requests or open issues to improve this configuration.

## License

This project is licensed under the MIT License.
