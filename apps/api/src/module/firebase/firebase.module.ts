import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { bootstrapFirebase } from './firebase.bootstrap';
import firebaseConfig from './firebase.config';
import { FIREBASE_ADMIN } from './firebase.constants';

@Global()
@Module({
  imports: [ConfigModule.forFeature(firebaseConfig)],
  providers: [
    {
      provide: FIREBASE_ADMIN,
      inject: [ConfigService],
      useFactory: bootstrapFirebase,
    },
  ],
  exports: [FIREBASE_ADMIN],
})
export class FirebaseModule {}
