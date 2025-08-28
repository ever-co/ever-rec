import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { bootstrapFirebase } from './firebase.bootstrap';
import firebaseConfig from './firebase.config';
import { FIREBASE_ADMIN } from './firebase.constants';
import { HttpModule } from 'nestjs-http-promise';
import { FirebaseAuthService } from './services/firebase-auth.service';
import { FirebaseRestService } from './services/firebase-rest.service';
import { FirebaseAdminService } from './services/firebase-admin.service';

@Global()
@Module({
  imports: [ConfigModule.forFeature(firebaseConfig), HttpModule],
  providers: [
    FirebaseAuthService,
    FirebaseRestService,
    FirebaseAdminService,
    {
      provide: FIREBASE_ADMIN,
      inject: [ConfigService],
      useFactory: bootstrapFirebase,
    },
  ],
  exports: [
    FIREBASE_ADMIN,
    FirebaseAuthService,
    FirebaseRestService,
    FirebaseAdminService,
  ],
})
export class FirebaseModule {}
