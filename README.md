# Ever Rec Platform

[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-Ready--to--Code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/ever-co/ever-rec)
[![Gitter](https://badges.gitter.im/JoinChat.svg)](https://gitter.im/ever-co/ever-rec?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Get help on Codementor](https://cdn.codementor.io/badges/get_help_github.svg)](https://www.codementor.io/evereq?utm_source=github&utm_medium=button&utm_term=evereq&utm_campaign=github)

## 🌟 What is it

[Ever® Rec™](https://rec.so) - Screen Capture, Screen Recording, Images & Video Sharing Platform.

**NOTE: Platform currently is in active development stage / WIP, please use with caution!**

## 🧱 Technology Stack and Requirements

## ✨ Features

-   Screen Capture
-   Screen Recording
-   Images / Videos Storage and Sharing

## 📑 Table of Contents

-   [Prerequisites](#prerequisites)
-   [Technology Stack](#technology-stack)
-   [Project Structure](#project-structure)
-   [Getting Started](#getting-started)
    -   [Development Environment Setup](#development-environment-setup)
    -   [Installation Process](#installation-process)
    -   [Environment Configuration](#environment-configuration)
        -   [API Environment Setup](#api-environment-setup)
        -   [Portal Environment Setup](#portal-environment-setup)
        -   [Extensions Environment Setup](#extensions-environment-setup)
-   [Development Workflow](#development-workflow)
-   [Browser Extension Development](#browser-extension-development)
-   [Firebase Integration](#firebase-integration)
    -   [Firebase Project Configuration](#firebase-project-configuration)
    -   [Authentication Setup](#authentication-setup)
    -   [Database Configuration](#database-configuration)
    -   [Storage Setup](#storage-setup)
-   [Google OAuth Configuration](#google-oAuth-configuration)
-   [Production Build](#production-build)

## Prerequisites

Before you begin, ensure you have the following installed:

-   Node.js v20 or higher
-   PNPM (Package Manager)

## Technology Stack

-   **Backend:**

    -   NestJS (API Server)
    -   Firebase

-   **Frontend:**

    -   NextJS
    -   ReactJS
    -   Tailwind CSS
    -   SASS
    -   Ant Design (antd)

-   **Development Tools:**
    -   Turborepo (Monorepo Management)

## Project Structure

This is a monorepo containing three main applications:

```
ever-rec/
├── apps/
│   ├── api/          # API Server (NestJS)
│   ├── portal/       # Web UI Portal
│   └── extensions/   # Browser Extensions Portal
```

## Getting Started

### Development Environment Setup

1. **System Requirements Check**

-   **Node.js**: Version 20.x or higher

```bash
# Verify Node.js version
node --version
# Should output v20.x.x or higher
```

-   **PNPM**: Latest stable version

```bash
# Install PNPM globally
npm install -g pnpm

# Verify PNPM installation
pnpm --version
```

2. **Clone the Repository**

```bash
git clone https://github.com/ever-co/ever-rec
cd ever-rec
```

3. **Install Dependencies**

```bash
pnpm install
```

### Environment Configuration

#### API Environment Setup

1. **Configure API Environment**

```bash
# For development
cp apps/api/.env.sample apps/api/.env.dev

# For production
cp apps/api/.env.sample apps/api/.env.prod
```

2. **Required API Environment Variables**

```env
# Firebase Configuration
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MASUREMENT_ID=your_measurement_id

# Firebase Admin Configuration
FIREBASE_ADMIN_PRIVATE_KEY=your_private_key
FIREBASE_ADMIN_CLIENT_EMAIL=your_client_email

# Extension Configuration
EXTENSION_ID=your_extension_id
```

#### Portal Environment Setup

1. **Configure Portal Environment**

```bash
cp apps/portal/.env.sample apps/portal/.env.local
```

2. **Required Portal Environment Variables**

```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_WEBSITE_URL=http://localhost:4200
NEXT_PUBLIC_STATIC_FILES_URL=your_static_files_url

# Extension Configuration
EXTENSION_ID=your_extension_id
```

#### Extensions Environment Setup

1. **Configure Extensions Environment**

```bash
# For development
cp apps/extensions/.env.sample apps/extensions/.env.dev

# For production
cp apps/extensions/.env.sample apps/extensions/.env.prod
```

2. **Required Extensions Environment Variables**

```env
EXTENSION_ID=your_extension_id

API_BASE_URL=http://localhost:3000
WEBSITE_URL=http://localhost:4200
STATIC_FILES_URL=your_static_files_url
```

## Development Workflow

1. **Start Development Server**

```bash
pnpm dev
```

2. **Access Development Environment**

-   API Server: http://localhost:3000
-   Web Portal: http://localhost:4200

## Browser Extension Development

### Building Extensions

```bash
# Development build
pnpm dev:extensions

# Production build
pnpm build:extensions
```

### Installing in Chrome

1. **Access Chrome Extensions**

    - Open Chrome
    - Navigate to `chrome://extensions`
    - Enable "Developer mode" (toggle in top-right)

2. **Load Extension**

    - Click "Load unpacked"
    - Navigate to project directory
    - Select appropriate build folder:
        - Development: `apps/extensions/build/dev`
        - Production: `apps/extensions/build/prod`

3. **Extension Development Notes**
    - Check the extension's background page console for logs
    - Use Chrome's developer tools to debug popup and content scripts

[Other browsers](./apps/extensions/)

## Firebase Integration

### Firebase Project Configuration

1. **Create Firebase Project**

    - Visit [Firebase Console](https://console.firebase.google.com/)
    - Click "Add project"
    - Follow the project creation wizard

2. **Web App Setup**
    - In Firebase Console, click "Add app"
    - Select web platform (</>)
    - Register app with a nickname
    - Copy configuration to appropriate `.env` file

### Authentication Setup

**Enable Authentication Methods**

    - In Firebase Console, go to Authentication > Sign-in method
    - Enable required providers:
        - Google
        - Email/Password

### Database Configuration

1. **Realtime Database Setup**
    - Create new Realtime Database
    - Start in test mode
    - Update security rules using `database.rules.json`:
        ```json
        {
        	"rules": {
        		// Add the database rules here
        	}
        }
        ```

### Storage Setup

1. **Configure Storage**
    - Enable Firebase Storage
    - Set up security rules using `storage.rules`
    - Configure CORS if needed

## Google OAuth Configuration

1. Visit [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. Select your Firebase project
3. Create OAuth Client ID credentials
4. Download credentials and configure for all apps:
    - `GOOGLE_CLIENT_ID`
    - `GOOGLE_CLIENT_SECRET`
5. Configure OAuth consent screen

## Production Build

```bash
# Build all packages
pnpm build

# Build specific app
pnpm build:api      # Build API server
pnpm build:portal   # Build web portal
pnpm build:extensions  # Build extensions
```

## 🛡️ License

This software is NOT YET Open-Sourced.
It's proprietary software.
Do NOT share/redistribute!

## ©️ Copyright

#### Copyright © 2024-present, Ever Co. LTD. All rights reserved
