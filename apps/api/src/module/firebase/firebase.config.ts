import { registerAs } from '@nestjs/config';

export default registerAs('firebase', () => ({
  // Admin SDK Configuration
  projectId: process.env.FIREBASE_PROJECT_ID ?? '',
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? '',
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? '',
  databaseURL: process.env.FIREBASE_DATABASE_URL ?? '',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? '',

  // Identity Toolkit API Configuration
  apiKey: process.env.FIREBASE_API_KEY ?? '',

  // Additional Configuration
  authDomain: process.env.FIREBASE_AUTH_DOMAIN ?? '',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.FIREBASE_APP_ID ?? '',

  // Identity Toolkit API Settings
  identityToolkit: {
    baseUrl: 'https://identitytoolkit.googleapis.com/v1',
    recaptchaSiteKey: process.env.FIREBASE_RECAPTCHA_SITE_KEY ?? '',
    recaptchaSecretKey: process.env.FIREBASE_RECAPTCHA_SECRET_KEY ?? '',
    requestUri: process.env.FIREBASE_REQ_URI ?? 'http://localhost',
  },

  // Email Templates (optional)
  emailTemplates: {
    verificationEmail: process.env.FIREBASE_VERIFICATION_EMAIL_TEMPLATE ?? '',
    passwordResetEmail:
      process.env.FIREBASE_PASSWORD_RESET_EMAIL_TEMPLATE ?? '',
    emailSignIn: process.env.FIREBASE_EMAIL_SIGNIN_TEMPLATE ?? '',
  },

  // Action Code Settings
  actionCodeSettings: {
    url: process.env.FIREBASE_ACTION_CODE_URL ?? '',
    handleCodeInApp: process.env.FIREBASE_HANDLE_CODE_IN_APP === 'true',
    iOS: {
      bundleId: process.env.FIREBASE_IOS_BUNDLE_ID ?? '',
    },
    android: {
      packageName: process.env.FIREBASE_ANDROID_PACKAGE_NAME ?? '',
      installApp: process.env.FIREBASE_ANDROID_INSTALL_APP === 'true',
      minimumVersion: process.env.FIREBASE_ANDROID_MINIMUM_VERSION ?? '',
    },
    dynamicLinkDomain: process.env.FIREBASE_DYNAMIC_LINK_DOMAIN ?? '',
  },
}));
