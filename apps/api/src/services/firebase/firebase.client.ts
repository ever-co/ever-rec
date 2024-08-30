import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { Database, getDatabase } from 'firebase/database';
import { getStorage, FirebaseStorage } from 'firebase/storage';

@Injectable()
export class FirebaseClient {
  firebaseApp: FirebaseApp;
  firebaseAuth: Auth;
  firebaseGoogleAuthProvider: GoogleAuthProvider;
  firebaseDb: Database;
  firebaseStorage: FirebaseStorage;

  constructor(private readonly configService: ConfigService) {
    this.initFirebaseClient();
  }

  initFirebaseClient() {
    const firebaseConfig = {
      apiKey: this.configService.get<string>('FIREBASE_API_KEY'),
      authDomain: this.configService.get<string>('FIREBASE_AUTH_DOMAIN'),
      databaseURL: this.configService.get<string>('FIREBASE_DATABASE_URL'),
      projectId: this.configService.get<string>('FIREBASE_PROJECT_ID'),
      storageBucket: this.configService.get<string>('FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: this.configService.get<string>(
        'FIREBASE_MESSAGING_SENDER_ID'
      ),
      appId: this.configService.get<string>('FIREBASE_APP_ID'),
      measurementId: this.configService.get<string>('FIREBASE_MASUREMENT_ID'),
    };

    this.firebaseApp = initializeApp(firebaseConfig);
    this.firebaseAuth = getAuth(this.firebaseApp);
    this.firebaseGoogleAuthProvider = new GoogleAuthProvider();
    this.firebaseDb = getDatabase(this.firebaseApp);
    this.firebaseStorage = getStorage(this.firebaseApp);
  }
}
