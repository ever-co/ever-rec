# @ever-rec/eslint-config

Shared ESLint configurations for various environments used across the monorepo. This package provides ESLint configurations for base setups, React, Next.js, Node.js, and NestJS projects.

## Available Configurations

### 1. Base Configuration

- **File:** `base.json`
- **Description:** Provides the base ESLint configuration, suitable for most JavaScript/TypeScript projects. It includes basic linting rules, Prettier integration, TypeScript configuration, and common ignore patterns.
- **Usage:**

  ```json
  {
    "extends": "@ever-rec/eslint-config/base.json"
  }
  ```

### 2. React Configuration

- **File:** `react.json`
- **Description:** Extends the base configuration with rules and plugins specifically for React projects. It also includes ignore patterns specific to React projects.
- **Usage:**

  ```json
  {
    "extends": "@ever-rec/eslint-config/react.json"
  }
  ```

### 3. Next.js Configuration

- **File:** `next.json`
- **Description:** Extends the base and React configurations with rules for Next.js projects, including Next.js-specific ignore patterns.
- **Usage:**

  ```json
  {
    "extends": "@ever-rec/eslint-config/next.json"
  }
  ```

### 4. Node.js Configuration

- **File:** `node.json`
- **Description:** Extends the base configuration with rules specifically for Node.js projects, and includes ignore patterns relevant to backend projects.
- **Usage:**

  ```json
  {
    "extends": "@ever-rec/eslint-config/node.json"
  }
  ```

### 5. NestJS Configuration

- **File:** `nest.json`
- **Description:** Extends the Node.js configuration with additional settings for NestJS projects, including ignore patterns specific to backend testing.
- **Usage:**

  ```json
  {
    "extends": "@ever-rec/eslint-config/nest.json"
  }
  ```

## Installation

Make sure you have the appropriate packages installed in your project:

```bash
yarn add --dev @ever-rec/eslint-config
```

## Contributing

Feel free to submit pull requests or open issues to improve these configurations.

## License

This project is licensed under the MIT License.
