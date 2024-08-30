import { BadRequestException, Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseClient } from 'src/services/firebase/firebase.client';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  User,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import { SharedService } from '../../services/shared/shared.service';
import { ResStatusEnum } from '../../enums/ResStatusEnum';
import { IUser } from '../../interfaces/IUser';
import { IResponseMetadata } from '../../interfaces/IResponseMetadata';
import { IDataResponse } from '../../interfaces/_types';
import { ImageService } from '../image/image.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import firebase from 'firebase/compat';
import OAuthCredential = firebase.auth.OAuthCredential;

const defaultProblemMessage = 'There was a problem, please try again later...';

interface IRegisterProps {
  email: string;
  password: string;
  username: string;
}
interface ILoginProps {
  email: string;
  password: string;
}
interface ISignedUrlConfig {
  action: string;
  expires: string | number;
}

@Injectable()
export class AuthService {
  private readonly config: ISignedUrlConfig;
  private readonly expirationTime500years: number;
  private readonly rootDb = 'users';

  constructor(
    private readonly firebaseClient: FirebaseClient,
    private readonly sharedService: SharedService,
    private readonly imageService: ImageService,
    private eventEmitter: EventEmitter2
  ) {
    this.config = {
      action: 'read',
      expires: '03-01-2500',
    };
    this.expirationTime500years = 1000 * 15778476000;
  }

  private readonly errorParser = {
    'auth/email-already-in-use':
      'This email is already taken. Please try with another one...',
    'auth/wrong-password': 'Invalid email or password. Please try again...',
    'auth/invalid-email': 'Invalid email or password. Please try again...',
    'auth/user-disabled': 'This User is disabled.',
    'auth/user-not-found': 'This email is not yet registered...',
    'custom/user-uses-google-auth':
      'This account is already associated with a Google account. Please sign in using Google login button.',
  };

  private parseUserEmailToDisplayName(email: string) {
    const rawUserName = email.split('@')[0];
    const userName = rawUserName.split(/\.|_/g);
    const parsedUserName = userName.join('');

    return parsedUserName;
  }

  async addUserToDb(
    user: User & { googleCredentials?: OAuthCredential }
  ): Promise<IUser | IResponseMetadata> {
    const userRef = admin.database().ref(`users/${user.uid}`);
    const snapshot = await userRef.get();

    if (!snapshot.exists()) {
      const newUser: IUser = {
        email: user.email,
        displayName:
          user.displayName || this.parseUserEmailToDisplayName(user.email),
        // @ts-ignore
        photoURL: user.photoURL || user.photoUrl || null,
        googleCredentials: user.googleCredentials || null,
      };

      await userRef.set(newUser);

      return newUser;
    } else {
      return {
        status: ResStatusEnum.error,
        message: 'User already exists!',
        error: null,
      };
    }
  }

  async getUserData(uid: string): Promise<IDataResponse> {
    try {
      const userRef = admin.database().ref(`users/${uid}`);
      const userSnap = await userRef.get();
      const userVal = userSnap.val();
      return {
        status: ResStatusEnum.success,
        message: 'Get user data successfully!',
        error: null,
        data: {
          id: uid,
          email: userVal?.email,
          photoURL: userVal?.photoURL,
          displayName: userVal?.displayName,
          isSlackIntegrate: userVal?.isSlackIntegrate,
          favoriteFolders: userVal?.favoriteFolders,
          dropbox: {
            isDropBoxIntegrated: !!(
              userVal?.dropboxAPISCredentials &&
              userVal.dropboxAPISCredentials.credentials &&
              userVal.dropboxAPISCredentials.credentials.access_token
            ),
            email: userVal?.dropboxAPISCredentials
              ? userVal.dropboxAPISCredentials.email
              : null,
          },
          jira: {
            isIntegrated: !!(
              userVal?.jiraAPISCredentials &&
              userVal.jiraAPISCredentials.credentials &&
              userVal.jiraAPISCredentials.credentials.access_token
            ),
            email: userVal?.jiraAPISCredentials
              ? userVal.jiraAPISCredentials.email
              : null,
          },
          trello: {
            isIntegrated: !!(
              userVal?.trelloAPISCredentials &&
              userVal.trelloAPISCredentials.credentials &&
              userVal.trelloAPISCredentials.credentials.access_token
            ),
            email: userVal?.trelloAPISCredentials
              ? userVal.trelloAPISCredentials.email
              : null,
          },
        },
      };
    } catch (e) {
      return {
        status: ResStatusEnum.error,
        message: 'User does not exist!',
        error: null,
        data: null,
      };
    }
  }

  async register({
    email,
    password,
    username,
  }: IRegisterProps): Promise<IDataResponse> {
    try {
      const userCreds = await createUserWithEmailAndPassword(
        this.firebaseClient.firebaseAuth,
        email,
        password
      );
      const user = userCreds.user;
      let newDbUser;

      if (user) {
        newDbUser = await this.addUserToDb({
          ...user,
          displayName: username ? username : user.displayName,
        });
      }

      const idToken = await user.getIdToken();
      const photoURL = newDbUser?.photoURL;
      const displayName = newDbUser?.displayName;

      this.eventEmitter.emit('analytics.identify', user.uid, {
        email: user.email,
        name: displayName,
        avatar: photoURL,
      });
      await this.eventEmitter.emit('analytics.track', 'User Registered', {
        userId: user.uid,
        accountType: 'Email',
      });
      return {
        status: ResStatusEnum.success,
        message: 'You logged in successfully!',
        error: null,
        data: {
          id: user.uid,
          refreshToken: user.refreshToken,
          idToken,
          photoURL,
          displayName,
          email,
        },
      };
    } catch (error: any) {
      console.log(error);
      return {
        status: ResStatusEnum.error,
        message: this.errorParser[error.code] || defaultProblemMessage,
        error: null,
        data: null,
      };
    }
  }

  private async getUserMetadata(uid: string) {
    const db = admin.database();
    const userRef = db.ref(`users/${uid}`);
    const snapshot = await userRef.get();
    const userData = snapshot.val();
    return {
      displayName: userData?.displayName || null,
      photoURL: userData?.photoURL || null,
      isSlackIntegrate: userData?.isSlackIntegrate || false,
      dropbox: {
        isDropBoxIntegrated:
          userData?.dropboxAPISCredentials &&
          userData.dropboxAPISCredentials.credentials &&
          userData.dropboxAPISCredentials.credentials.access_token
            ? true
            : false,
        email: userData?.dropboxAPISCredentials
          ? userData.dropboxAPISCredentials.email
          : null,
      },
      jira: {
        isIntegrated:
          userData?.jiraAPISCredentials &&
          userData.jiraAPISCredentials.credentials &&
          userData.jiraAPISCredentials.credentials.access_token
            ? true
            : false,
        email: userData?.jiraAPISCredentials
          ? userData.jiraAPISCredentials.email
          : null,
      },
      trello: {
        isIntegrated:
          userData?.trelloAPISCredentials &&
          userData.trelloAPISCredentials.credentials &&
          userData.trelloAPISCredentials.credentials.access_token
            ? true
            : false,
        email: userData?.trelloAPISCredentials
          ? userData.trelloAPISCredentials.email
          : null,
      },
    };
  }

  async login({ email, password }: ILoginProps): Promise<IDataResponse> {
    try {
      const checkProvider = await fetchSignInMethodsForEmail(
        this.firebaseClient.firebaseAuth,
        email
      );

      if (checkProvider.includes('google.com'))
        throw { code: 'custom/user-uses-google-auth' };

      const userCreds = await signInWithEmailAndPassword(
        this.firebaseClient.firebaseAuth,
        email,
        password
      );
      const idToken = await userCreds.user.getIdToken();
      const { displayName, photoURL, isSlackIntegrate, dropbox, jira, trello } =
        await this.getUserMetadata(userCreds.user.uid);

      this.eventEmitter.emit('analytics.identify', userCreds.user.uid, {
        email: userCreds.user.email,
        name: displayName,
        avatar: photoURL,
      });
      this.eventEmitter.emit('analytics.track', 'User Logged', {
        userId: userCreds.user.uid,
        accountType: 'Email',
      });
      return {
        status: ResStatusEnum.success,
        message: 'You logged in successfully!',
        error: null,
        data: {
          id: userCreds.user.uid,
          refreshToken: userCreds.user.refreshToken,
          idToken,
          photoURL,
          displayName,
          email,
          isSlackIntegrate,
          dropbox,
          trello,
          jira,
        },
      };
    } catch (error: any) {
      console.log(error);
      return {
        status: ResStatusEnum.error,
        message: this.errorParser[error.code] || defaultProblemMessage,
        error: null,
        data: null,
      };
    }
  }

  async processGoogleLogin(credentials: string): Promise<IDataResponse> {
    try {
      const googleAuthCredential = GoogleAuthProvider.credential(credentials);
      const userCreds = await signInWithCredential(
        this.firebaseClient.firebaseAuth,
        googleAuthCredential
      );
      const isNewUser = JSON.stringify(userCreds).includes('"isNewUser":true');
      userCreds.user &&
        (await this.addUserToDb({
          ...userCreds.user,
          googleCredentials: googleAuthCredential,
        }));

      const idToken = await userCreds.user.getIdToken();
      const email = userCreds.user?.email;
      const { displayName, photoURL, isSlackIntegrate, dropbox, jira, trello } =
        await this.getUserMetadata(userCreds.user.uid);

      await this.eventEmitter.emit('analytics.identify', userCreds.user.uid, {
        email: email,
        name: displayName,
        avatar: photoURL,
      });

      await this.eventEmitter.emit('analytics.track', 'User Logged', {
        userId: userCreds.user.uid,
        accountType: 'Google',
      });
      return {
        status: ResStatusEnum.success,
        message: 'You logged in successfully!',
        error: null,
        data: {
          id: userCreds.user.uid,
          refreshToken: userCreds.user.refreshToken,
          idToken,
          photoURL,
          displayName,
          email,
          isSlackIntegrate,
          dropbox,
          jira,
          isNewUser,
          trello,
        },
      };
    } catch (e) {
      console.log(e);
      return {
        status: ResStatusEnum.error,
        message: 'Login failed',
        error: null,
        data: null,
      };
    }
  }

  async updateUserData(
    uid: string,
    displayName?: string,
    photoURL?: string
  ): Promise<IDataResponse> {
    try {
      const userRef = admin.database().ref(`users/${uid}`);
      let snapshot = await userRef.get();
      userRef.on('value', snap => (snapshot = snap));

      if (!snapshot.exists()) {
        throw `Could not get user reference with uid: ${uid}`;
      }

      const updates = {
        displayName: displayName || snapshot.val().displayName || null,
        photoURL: photoURL || snapshot.val().photoURL || null,
      };

      await userRef.update(updates);

      const updatedUser = snapshot.val();
      await this.eventEmitter.emit('analytics.identify', uid, {
        name: displayName,
        avatar: photoURL,
      });
      return {
        status: ResStatusEnum.success,
        message: 'User data updated.',
        error: null,
        data: updatedUser,
      };
    } catch (error: any) {
      return {
        status: ResStatusEnum.error,
        message: error || defaultProblemMessage,
        error: null,
        data: null,
      };
    }
  }

  async uploadAvatar(
    uid: string,
    avatar: Express.Multer.File
  ): Promise<IDataResponse> {
    try {
      const bucket = admin.storage().bucket();
      const avaRef = bucket.file(`users/${uid}/tools/avatar`);

      // TODO: probably delete
      await avaRef.save(avatar.buffer);

      const photoURL = (
        await avaRef.getSignedUrl({
          action: 'read',
          expires: Date.now() + this.expirationTime500years,
        })
      )[0];
      await this.updateUserData(uid, undefined, photoURL);
      await this.eventEmitter.emit('analytics.identify', uid, {
        avatar: photoURL,
      });
      return {
        status: ResStatusEnum.success,
        message: 'Profile picture changed successfully!',
        error: null,
        data: { photoURL },
      };
    } catch (error: any) {
      console.log(error);
      return {
        status: ResStatusEnum.error,
        message: error.message || defaultProblemMessage,
        error: null,
        data: null,
      };
    }
  }

  async changeUserEmail(uid: string, newEmail: string): Promise<IDataResponse> {
    try {
      const auth = admin.auth();
      const userRef = admin.database().ref(`users/${uid}`);

      await auth.updateUser(uid, { email: newEmail });
      await userRef.update({ email: newEmail });
      await this.eventEmitter.emit('analytics.identify', uid, {
        email: newEmail,
      });
      await this.eventEmitter.emit('analytics.track', 'User Email Changed.', {
        userId: uid,
        newEmail: newEmail,
      });
      return {
        status: ResStatusEnum.success,
        message: 'User email successfully changed.',
        error: null,
        data: { email: newEmail },
      };
    } catch (e) {
      console.log(e);
      return {
        status: ResStatusEnum.error,
        message: e.message || defaultProblemMessage,
        error: null,
        data: null,
      };
    }
  }

  async changeUserPassword(
    uid: string,
    email: string,
    oldPassword: string,
    newPassword: string
  ): Promise<IDataResponse> {
    try {
      const auth = admin.auth();

      // this request shouldn't be pinged by a Google user,
      // but have a check regardless (defensive programming)
      const checkProvider = await fetchSignInMethodsForEmail(
        this.firebaseClient.firebaseAuth,
        email
      );
      if (checkProvider.includes('google.com'))
        throw { code: 'custom/user-uses-google-auth' };

      await signInWithEmailAndPassword(
        this.firebaseClient.firebaseAuth,
        email,
        oldPassword
      );

      await auth.updateUser(uid, { password: newPassword });

      return {
        status: ResStatusEnum.success,
        message: 'Password changed successfully!',
        error: null,
        data: 'Password changed successfully!',
      };
    } catch (e) {
      console.log(e);
      return {
        status: ResStatusEnum.error,
        message: e.message || defaultProblemMessage,
        error: null,
        data: null,
      };
    }
  }

  async deleteUser(uid: string): Promise<IDataResponse> {
    try {
      const auth = admin.auth();
      const userRef = admin.database().ref(`users/${uid}`);

      await Promise.all([
        userRef.remove(),
        auth.deleteUser(uid),
        this.sharedService.removeShared(uid),
        this.deleteUserFiles(uid),
      ]);

      this.eventEmitter.emit(
        'analytics.track',
        'User deleted! All user files deleted!',
        { userId: uid }
      );

      return {
        status: ResStatusEnum.success,
        message: 'User deleted! All user files deleted!',
        error: null,
        data: null,
      };
    } catch (error: any) {
      console.log(error);
      return {
        status: ResStatusEnum.error,
        message: 'Error while trying to delete user or user files!',
        error: null,
        data: null,
      };
    }
  }

  async deleteUserFiles(userId: string) {
    const bucket = admin.storage().bucket();
    const userFolder = `users/${userId}`;

    try {
      await bucket.deleteFiles({ prefix: userFolder });
      console.log('All user files deleted successfully.');
    } catch (err) {
      console.error('Error deleting user files:', err);
    }
  }
}
