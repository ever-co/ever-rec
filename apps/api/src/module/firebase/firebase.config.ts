import { registerAs } from '@nestjs/config';

export default registerAs('firebase', () => ({
  projectId: process.env.FIREBASE_PROJECT_ID ?? '',
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? '',
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? '',
  databaseURL: process.env.FIREBASE_DATABASE_URL ?? '',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? '',
  apiKey: process.env.FIREBASE_API_KEY ?? '',
}));
