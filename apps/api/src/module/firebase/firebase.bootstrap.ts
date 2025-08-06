import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';

export const bootstrapFirebase = (configService: ConfigService) => {
  const adminConfig: ServiceAccount = {
    projectId: configService.get<string>('firebase.projectId'),
    privateKey: configService
      .get<string>('firebase.privateKey')
      ?.replace(/\\n/g, '\n'),
    clientEmail: configService.get<string>('firebase.clientEmail'),
  };

  return admin.initializeApp({
    credential: admin.credential.cert(adminConfig),
    databaseURL: configService.get<string>('firebase.databaseURL'),
    storageBucket: configService.get<string>('firebase.storageBucket'),
  });
};
