# @ever-rec/stylelint-config

Shared Stylelint configuration for consistent CSS/SCSS linting across the monorepo.

## Configuration

- **File:** `stylelint.shared.json`
- **Description:** Provides the Stylelint configuration for ensuring consistent CSS/SCSS styles across all projects in the monorepo.
- **Usage:**

  ```json
  {
    "extends": "@ever-rec/stylelint-config/stylelint.shared.json"
  }
  ```

## Installation

Ensure you have Stylelint and its plugins installed in your project:

```bash
yarn add --dev @ever-rec/stylelint-config
```

## Example Configuration

Here is an example of the Stylelint settings:

```json
{
  "extends": ["stylelint-config-standard", "stylelint-config-prettier"],
  "rules": {
    "indentation": 2,
    "string-quotes": "single",
    "color-hex-case": "lower"
  }
}
```

## Contributing

Feel free to submit pull requests or open issues to improve this configuration.

## License

This project is licensed under the MIT License.
