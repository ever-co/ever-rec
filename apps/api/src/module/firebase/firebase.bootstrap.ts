import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';
import { Logger } from '@nestjs/common';

const logger = new Logger('FirebaseBootstrap');

export const bootstrapFirebase = (configService: ConfigService) => {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      logger.log('Firebase Admin SDK already initialized, returning existing app');
      return admin.app();
    }

    const projectId = configService.get<string>('firebase.projectId');
    const clientEmail = configService.get<string>('firebase.clientEmail');
    const privateKey = configService.get<string>('firebase.privateKey');
    const databaseURL = configService.get<string>('firebase.databaseURL');
    const storageBucket = configService.get<string>('firebase.storageBucket');

    // Validate required configuration
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing required Firebase configuration: projectId, clientEmail, or privateKey');
    }

    const adminConfig: ServiceAccount = {
      projectId,
      privateKey: privateKey.replace(/\\n/g, '\n'),
      clientEmail,
    };

    const appOptions: admin.AppOptions = {
      credential: admin.credential.cert(adminConfig),
    };

    // Add optional configuration
    if (databaseURL) {
      appOptions.databaseURL = databaseURL;
    }

    if (storageBucket) {
      appOptions.storageBucket = storageBucket;
    }

    const app = admin.initializeApp(appOptions);

    logger.log(`Firebase Admin SDK initialized for project: ${projectId}`);

    return app;
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK', error.stack);
    throw error;
  }
};

export const getFirebaseApp = (name?: string): admin.app.App => {
  try {
    if (name) {
      return admin.app(name);
    }
    return admin.app();
  } catch (error) {
    logger.error(`Failed to get Firebase app: ${name || 'default'}`, error.stack);
    throw error;
  }
};

export const getFirebaseAuth = (name?: string): admin.auth.Auth => {
  try {
    const app = getFirebaseApp(name);
    return app.auth();
  } catch (error) {
    logger.error(`Failed to get Firebase Auth: ${name || 'default'}`, error.stack);
    throw error;
  }
};

export const getFirebaseFirestore = (name?: string): admin.firestore.Firestore => {
  try {
    const app = getFirebaseApp(name);
    return app.firestore();
  } catch (error) {
    logger.error(`Failed to get Firebase Firestore: ${name || 'default'}`, error.stack);
    throw error;
  }
};

export const getFirebaseStorage = (name?: string): admin.storage.Storage => {
  try {
    const app = getFirebaseApp(name);
    return app.storage();
  } catch (error) {
    logger.error(`Failed to get Firebase Storage: ${name || 'default'}`, error.stack);
    throw error;
  }
};
