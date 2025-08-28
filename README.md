# Ever Rec Platform

[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-Ready--to--Code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/ever-co/ever-rec)
[![Gitter](https://badges.gitter.im/JoinChat.svg)](https://gitter.im/ever-co/ever-rec?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Get help on Codementor](https://cdn.codementor.io/badges/get_help_github.svg)](https://www.codementor.io/evereq?utm_source=github&utm_medium=button&utm_term=evereq&utm_campaign=github)

## 🌟 What is it

[Ever® Rec™](https://rec.so) - Screen Capture, Screen Recording, Images & Video Sharing Platform.

**NOTE: Platform is currently in active development stage / WIP, please use with caution!**

Ever® Rec™ is a powerful, all-in-one platform for effortlessly capturing, annotating, and sharing screen, webcam, and microphone recordings.
Available as a standalone web app, Chrome extension, or desktop application, it adapts to your workflow, wherever you work.

The desktop version goes even further by converting continuous screenshots into smooth, high-quality videos, making it ideal for creating tutorials, recording gameplay, tracking workflows, and more.

Designed to run discreetly in the background, Ever® Rec™ lets you stay focused on what matters while it handles recording with speed and simplicity.

## ✨ Platform Features Overview

-   **Web-based Platform** (React/NextJs)
-   **Chrome Extension**
-   **Desktop App** (Electron)
-   **Screen Capture** / **Screen Recording**
-   **Mic Capture** / **Webcam Capture**
-   **Images** / **Videos** **Storage**, **Annotations** and **Sharing**
-   **Secure Video Upload**: Enables users to directly upload the generated videos to an S3 bucket for secure storage and easy sharing.

## ✨ Desktop Application Features

-   **Continuous Screen Capture**: automatically captures high-resolution screenshots at user-defined intervals, ensuring every critical moment is preserved.
-   **Video Compilation**: converts sequences of screenshots into smooth, high-quality video files with just a few clicks.
-   **Customizable Settings**:
   - Configure capture intervals to suit your workflow (e.g., every second, every minute).
   - Select video resolutions (e.g., 720p, 1080p) and output formats.
-   **Resource Efficiency**: Optimized for minimal impact on system performance and resource usage, ensuring smooth operation even during intensive tasks.
-   **Intuitive Interface**: Offers a clean and user-friendly interface for starting, stopping, and configuring screen capture sessions.
-   **Cross-Platform Compatibility**: Fully compatible with Windows, macOS, and Linux environments.

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

## 🌼 Screenshots

<details>
<summary>Show / Hide Screenshots</summary>

TODO

</details>

## 🔗 Links

- **<https://rec.so>** - official website
- **<https://app.rec.so>** - SaaS Platform (WIP)
- **<https://ever.co>** - get more information about our company products.

## 📊 Activity

![Alt](https://repobeats.axiom.co/api/embed/bab1e3591d76a1a346dfda363ccb315dbd1d58fa.svg "Repobeats analytics image")

## Prerequisites

Before you begin, ensure you have the following installed:

-   [Node.js](https://nodejs.org) v20 or higher
-   [PNPM](https://github.com/pnpm/pnpm) (Package Manager)

## Technology Stack

-   **Common:**

    - [TypeScript](https://www.typescriptlang.org)

-   **Backend:**

    -   [NodeJs](https://nodejs.org) / [NestJs](https://github.com/nestjs/nest)
    -   [Firebase](https://firebase.google.com)

-   **Frontend:**

    -   [Next.js](https://nextjs.org)
    -   [React](https://reactjs.org)
    -   [Tailwind](https://tailwindcss.com)
    -   [SASS](https://sass-lang.com)
    -   [Ant Design](https://github.com/ant-design/ant-design)

-   **Desktop Application:**

    - Angular
    - Electron
     
-   **Development Tools:**

    -   [Turborepo](https://github.com/vercel/turborepo) (Monorepo Management)

## Project Structure

### Mono-repo

A mono-repo containing three main applications:

```
ever-rec/
├── apps/
│   ├── api/          # API Server (NestJS)
│   ├── portal/       # Web UI Portal
│   ├── desktop/      # Desktop Application
│   └── extensions/   # Browser Extensions Portal
```

### Desktop App

#### Usage

1. Start Recording

- Launch the application and press the **Start Capturing** button to begin screen recording.
- Screenshots will be captured continuously at the configured intervals.

2. Stop Recording

- Press the **Stop Capturing** button to end the recording session.
- The application will automatically compile the captured screenshots into a video file.

3. Configure Settings

- Access the settings menu to adjust the capture interval (e.g., 1 second, 10 seconds).
- Select the desired video resolution (e.g., 720p, 1080p).
- Configure S3 bucket details for direct video upload.

#### Development

*Prerequisites*

- Ensure **Node.js** and **npm** are installed on your system.
- Confirm that your development environment supports **NX** for build processes.

*Build Commands*

1. Install dependencies:

   ```bash
   yarn install
   ```

2. Build the project:

   ```bash
   yarn run build
   ```

3. Create a desktop application build:

   ```bash
   yarn run make
   ```

*Publishing to a Private NPM Registry*

Step 1: Configure npm

1. Set npm to use your private registry:

   ```bash
   npm set registry https://your-private-registry.com
   npm adduser --registry https://your-private-registry.com
   npm set scope=@your-org
   ```

2. Provide your credentials (username, password, email).

Step 2: Publish a Package

1. Publish an individual package:

   ```bash
   nx run lib-name:publish
   ```

2. Verify the package appears in your private registry.

Step 3: Publish All Packages (Optional)

1. Publish all packages or affected libraries:

   ```bash
   yarn run publish:all or yarn run publish:affected:libraries
   ```

2. Verify all packages are listed in your private registry.

## Platform Getting Started

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
FIREBASE_MEASUREMENT_ID=your_measurement_id

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
    - Navigate to the project directory
    - Select the appropriate build folder:
        - Development: `apps/extensions/build/dev`
        - Production: `apps/extensions/build/prod`

3. **Extension Development Notes**
    - Check the extension's background page console for logs
    - Use Chrome's developer tools to debug popup and content scripts

[Other browsers](./apps/extensions#run-project)

## Firebase Integration

### Firebase Project Configuration

1. **Create Firebase Project**

    - Visit [Firebase Console](https://console.firebase.google.com/)
    - Click "Add project"
    - Follow the project creation wizard

2. **Web App Setup**
    - In Firebase Console, click "Add app"
    - Select web platform (</>)
    - Register the app with a nickname
    - Copy configuration to the appropriate `.env` file

### Authentication Setup

**Enable Authentication Methods**

    - In Firebase Console, go to Authentication > Sign-in method
    - Enable required providers:
        - Google
        - Email/Password

### Database Configuration

1. **Realtime Database Setup**
    - Create a new Realtime Database
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
5. Configure the OAuth consent screen

## Production Build

```bash
# Build all packages
pnpm build

# Build specific app
pnpm build:api      # Build API server
pnpm build:portal   # Build web portal
pnpm build:extensions  # Build extensions
```

## 💌 Contact Us

-   [Ever.co Website Contact Us page](https://ever.co/contacts)
-   [Slack Community](https://join.slack.com/t/gauzy/shared_invite/enQtNzc5MTA5MDUwODg2LTI0MGEwYTlmNWFlNzQzMzBlOWExNTk0NzAyY2IwYWYwMzZjMTliYjMwNDI3NTJmYmM4MDQ4NDliMDNiNDY1NWU)
-   [Discord Chat](https://discord.gg/hKQfn4j)
-   [CodeMentor](https://www.codementor.io/evereq)
-   For business inquiries: <mailto:rec@ever.co>
-   Please report security vulnerabilities to <mailto:security@ever.co>

## 🔐 Security

**Ever Rec Platform** follows good security practices, but 100% security cannot be guaranteed in any software!
**Ever Rec Platform** is provided AS IS without any warranty. Use at your own risk!
See more details in the [LICENSES.md](LICENSES.md).

In a production setup, all client-side to server-side (backend, APIs) communications should be encrypted using HTTPS/WSS/SSL (REST APIs, GraphQL endpoint, Socket.io WebSockets, etc.).

If you discover any issue regarding security, please disclose the information responsibly by emailing <mailto:security@ever.co> and not by creating a GitHub issue.

## 🛡️ License

This software is available under the following licenses:

-   [Ever® Rec™ Platform Community Edition](https://github.com/ever-co/ever-rec/blob/master/LICENSES.md#ever-rec-platform-community-edition-license)
-   [Ever® Rec™ Platform Small Business](https://github.com/ever-co/ever-rec/blob/master/LICENSES.md#ever-rec-platform-small-business-license)
-   [Ever® Rec™ Platform Enterprise](https://github.com/ever-co/ever-rec/blob/master/LICENSES.md#ever-rec-platform-enterprise-license)

#### The default Ever® Rec™ Platform license, without a valid Ever® Rec™ Platform Enterprise or Ever® Rec™ Platform Small Business License agreement, is the Ever® Rec™ Platform Community Edition License

We support the open-source community. If you're building awesome non-profit/open-source projects, we're happy to help and will provide (subject to [acceptance criteria](https://github.com/ever-co/ever-rec/wiki/Free-license-and-hosting-for-Non-profit-and-Open-Source-projects)) Ever Rec Enterprise edition license and free hosting option! Feel free to contact us at <mailto:ever@ever.co> to make a request. More details are explained in our [Wiki](https://github.com/ever-co/ever-rec/wiki/Free-license-and-hosting-for-Non-profit-and-Open-Source-projects).

#### Please see [LICENSES](LICENSES.md) for more information on licenses

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fever-co%2Fever-rec.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fever-co%2Fever-rec?ref=badge_large)

## ™️ Trademarks

**Ever**® is a registered trademark of [Ever Co. LTD](https://ever.co).
**Ever® Rec™**, **Ever® Demand™**, **Ever® Gauzy™**, **Ever® Teams™** and **Ever® OpenSaaS™** are all trademarks of [Ever Co. LTD](https://ever.co).

The trademarks may only be used with the written permission of Ever Co. LTD. and may not be used to promote or otherwise market competitive products or services.

All other brand and product names are trademarks, registered trademarks, or service marks of their respective holders.

## 🍺 Contribute

-   Please give us a :star: on Github, it **helps**!
-   You are more than welcome to submit feature requests in the [separate repo](https://github.com/ever-co/feature-requests/issues)
-   Pull requests are always welcome! Please base pull requests against the _develop_ branch and follow the [contributing guide](.github/CONTRIBUTING.md).

## 💪 Thanks to our Contributors

See our contributors list in [CONTRIBUTORS.md](https://github.com/ever-co/ever-rec/blob/develop/.github/CONTRIBUTORS.md).
You can also view a full list of our [contributors tracked by Github](https://github.com/ever-co/ever-rec/graphs/contributors).

<img src="https://contributors-img.web.app/image?repo=ever-co/ever-rec" />

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ever-co/ever-rec&type=Date)](https://star-history.com/#ever-co/ever-rec&Date)

## ❤️ Powered By

<p>
  <a href="https://www.digitalocean.com/?utm_medium=opensource&utm_source=ever-co">
    <img src="https://opensource.nyc3.cdn.digitaloceanspaces.com/attribution/assets/PoweredByDO/DO_Powered_by_Badge_blue.svg" width="201px">
  </a>
</p>

<p>
 <a href="https://vercel.com/?utm_source=ever-co&utm_campaign=oss">
     <img src=".github/vercel-logo.svg" alt="Powered by Vercel" />
 </a>
</p>

## ©️ Copyright

#### Copyright © 2024-present, Ever Co. LTD. All rights reserved

---

Enjoy effortless recording with Ever® Rec™! 🎥
