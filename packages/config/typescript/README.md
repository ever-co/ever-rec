# @ever-rec/typescript-config

Shared TypeScript configurations for various environments used across the monorepo. This package provides TypeScript configurations for base setups, React, Next.js, Node.js, and NestJS projects.

## Structure du Projet

Dans ce monorepo, les fichiers `tsconfig.json` sont répartis entre la racine du projet, les packages, et les applications pour assurer une configuration centralisée tout en permettant une personnalisation spécifique.

### 1. Fichier `tsconfig.json` à la Racine du Monorepo

Le fichier `tsconfig.json` à la racine du monorepo sert de base commune pour toutes les applications et packages. Voici un exemple de ce fichier :

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "lib": ["DOM", "ESNext"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "baseUrl": "./packages",
    "paths": {
      "@/*": ["*/src"]
    }
  },
  "include": ["packages/**/*"]
}
```

### 2. Fichiers `tsconfig.json` dans les Applications

Chaque application (située dans le dossier `/apps`) a son propre fichier `tsconfig.json`, qui étend la configuration globale à la racine du monorepo. Cela permet à chaque application de personnaliser ses paramètres tout en réutilisant les configurations communes.

**Exemple pour `app-a` :**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

**Exemple pour `app-b` :**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./build",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

### 3. Fichiers `tsconfig.json` dans les Packages

Les packages (situés dans le dossier `/packages`) suivent une structure similaire à celle des applications. Chaque package possède également un fichier `tsconfig.json` qui étend la configuration globale.

**Exemple pour `package-a` :**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

## Available Configurations

### 1. Base Configuration

- **File:** `tsconfig.shared.json`
- **Description:** Provides the base TypeScript configuration, suitable for most TypeScript projects.
- **Usage:**

  ```json
  {
    "extends": "@ever-rec/typescript-config/tsconfig.shared.json"
  }
  ```

### 2. React Configuration

- **File:** `react.json`
- **Description:** Extends the base configuration with TypeScript settings specific to React projects.
- **Usage:**

  ```json
  {
    "extends": "@ever-rec/typescript-config/react.json"
  }
  ```

### 3. Next.js Configuration

- **File:** `next.json`
- **Description:** Extends the React configuration with TypeScript settings specific to Next.js projects.
- **Usage:**

  ```json
  {
    "extends": "@ever-rec/typescript-config/next.json"
  }
  ```

### 4. Node.js Configuration

- **File:** `node.json`
- **Description:** Extends the base configuration with TypeScript settings specific to Node.js projects.
- **Usage:**

  ```json
  {
    "extends": "@ever-rec/typescript-config/node.json"
  }
  ```

### 5. NestJS Configuration

- **File:** `nest.json`
- **Description:** Extends the Node.js configuration with TypeScript settings specific to NestJS projects.
- **Usage:**

  ```json
  {
    "extends": "@ever-rec/typescript-config/nest.json"
  }
  ```

## Installation

Make sure you have TypeScript installed in your project:

```bash
yarn add --dev @ever-rec/typescript-config
```

## Contributing

Feel free to submit pull requests or open issues to improve these configurations.

## License

This project is licensed under the MIT License.
