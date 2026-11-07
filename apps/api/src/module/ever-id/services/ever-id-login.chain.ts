import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuthContext } from '../../auth/services/auth.context';
import {
  EverIdLoginResult,
  EverIdLoginState,
  EverIdSessionIdentity,
} from '../../auth/services/login/state/ever-id-login.state';
import { MergeTokenPolicy } from '../../auth/services/tokens/policies/merge-token.policy';
import { UserProfileService } from '../../auth/services/user-profile.service';
import { UserService } from '../../auth/services/user.service';
import { FirebaseAdminService } from '../../firebase/services/firebase-admin.service';
import { FirebaseRestService } from '../../firebase/services/firebase-rest.service';
import { EverIdSessionIndexService } from './ever-id-session-index.service';

/**
 * The session an Ever ID sign-in returns. Field for field the shape of `POST /auth/login-google`,
 * so the portal and the extension store it with the code they already use.
 */
export interface EverIdSession {
  id: string;
  customToken: string;
  isVerified: boolean;
  idToken: string;
  refreshToken: string;
  expiresAt: string;
  photoURL: string | null;
  displayName: string | null;
  email: string;
  isSlackIntegrate: boolean;
  dropbox: { isDropBoxIntegrated: boolean; email: string | null };
  jira: { isIntegrated: boolean; email: string | null };
  isNewUser: boolean;
  trello: { isIntegrated: boolean; email: string | null };
}

export interface OpenSessionOptions {
  isNewUser: boolean;
  /** The verified ID token of this request, for the optional Gauzy chain only; never stored. */
  idToken?: string;
}

/**
 * Opens a Rec session for an account an Ever ID resolved to.
 *
 * Mints a Firebase custom token, exchanges it server-side for a Firebase session (the existing
 * `signInWithCustomToken`), runs {@link EverIdLoginState} through an `AuthContext` and encodes the
 * provider map into a reference refresh token with the existing `MergeTokenPolicy`, exactly like
 * the password sign-in. The reference token is recorded under the Ever ID session id so a
 * back-channel logout can revoke it.
 */
@Injectable()
export class EverIdLoginChain {
  private readonly logger = new Logger(EverIdLoginChain.name);

  constructor(
    private readonly everIdLoginState: EverIdLoginState,
    private readonly mergeTokenPolicy: MergeTokenPolicy,
    private readonly userService: UserService,
    private readonly userProfileService: UserProfileService,
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly firebaseRestService: FirebaseRestService,
    private readonly sessionIndex: EverIdSessionIndexService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async open(
    uid: string,
    identity: EverIdSessionIdentity,
    options: OpenSessionOptions,
  ): Promise<EverIdSession> {
    const userRecord = await this.firebaseAdminService.getUser(uid);
    const customToken = await this.userService.generateCustomToken(uid);
    const { data: firebase } =
      await this.firebaseRestService.signInWithCustomToken(customToken);

    if (!firebase?.idToken || !firebase?.refreshToken) {
      throw new Error('Firebase did not open a session');
    }

    const expiresIn = Number(firebase.expiresIn ?? 3600);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toString();
    const profile =
      (await this.userProfileService.getUserData(uid))?.data ?? {};

    const session: Omit<EverIdSession, 'refreshToken'> = {
      id: userRecord.uid,
      customToken,
      isVerified: userRecord.emailVerified,
      idToken: firebase.idToken,
      expiresAt,
      photoURL: profile.photoURL ?? userRecord.photoURL ?? null,
      displayName: profile.displayName ?? userRecord.displayName ?? null,
      email: userRecord.email,
      isSlackIntegrate: profile.isSlackIntegrate ?? false,
      dropbox: {
        isDropBoxIntegrated: !!profile.dropbox?.isDropBoxIntegrated,
        email: profile.dropbox?.email ?? null,
      },
      jira: {
        isIntegrated: !!profile.jira?.isIntegrated,
        email: profile.jira?.email ?? null,
      },
      isNewUser: options.isNewUser,
      trello: {
        isIntegrated: !!profile.trello?.isIntegrated,
        email: profile.trello?.email ?? null,
      },
    };

    const context = new AuthContext<EverIdLoginResult>(
      this.everIdLoginState,
      this.mergeTokenPolicy,
    );
    await context.request({
      firebase: {
        idToken: firebase.idToken,
        refreshToken: firebase.refreshToken,
        // What the refresh chain keeps next to the Firebase tokens: profile fields only.
        data: {
          id: session.id,
          email: session.email,
          displayName: session.displayName,
          photoURL: session.photoURL,
          isVerified: session.isVerified,
          expiresAt,
        },
      },
      identity,
      idToken: options.idToken,
    });
    const refreshToken = await context.merge();

    await this.sessionIndex.record(identity, uid, refreshToken);

    this.eventEmitter.emit('analytics.identify', uid, {
      email: session.email,
      name: session.displayName,
      avatar: session.photoURL,
    });
    this.eventEmitter.emit('analytics.track', 'User Logged', {
      userId: uid,
      accountType: 'Ever ID',
    });
    this.logger.log(`Ever ID sign-in: ${uid}`);

    // Same key order as the Google sign-in answer.
    return {
      id: session.id,
      customToken: session.customToken,
      isVerified: session.isVerified,
      idToken: session.idToken,
      refreshToken,
      expiresAt: session.expiresAt,
      photoURL: session.photoURL,
      displayName: session.displayName,
      email: session.email,
      isSlackIntegrate: session.isSlackIntegrate,
      dropbox: session.dropbox,
      jira: session.jira,
      isNewUser: session.isNewUser,
      trello: session.trello,
    };
  }
}
