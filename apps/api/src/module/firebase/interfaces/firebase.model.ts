export interface IFirebaseLogin {
  /** Response kind from Firebase Identity Toolkit */
  kind: string;

  /** Firebase local user ID */
  localId: string;

  /** User email */
  email: string;

  /** Display name of the user (may be empty) */
  displayName: string;

  /** Firebase ID token (JWT) */
  idToken: string;

  /** Indicates if the account is already registered */
  registered: boolean;

  /** Refresh token to obtain a new ID token */
  refreshToken: string;

  /** Token expiration time in seconds (as a string) */
  expiresIn: `${number}`;
}

export interface IFirebaseUserProfile {
  /** User UID */
  uid: string;

  /** User email */
  email: string;

  /** Display name */
  displayName?: string;

  /** Profile photo URL */
  photoURL?: string;

  /** Whether email is verified */
  emailVerified: boolean;

  /** Custom claims */
  customClaims?: Record<string, any>;

  /** User metadata */
  metadata: {
    creationTime: string;
    lastSignInTime: string;
    lastRefreshTime?: string;
  };

  /** Provider data */
  providerData?: Array<{
    uid: string;
    displayName?: string;
    email?: string;
    photoURL?: string;
    providerId: string;
  }>;

  /** Whether user is disabled */
  disabled?: boolean;
}

export interface IFirebaseCustomClaims {
  /** User role */
  role?: string;

  /** User permissions */
  permissions?: string[];

  /** Subscription information */
  subscription?: {
    plan: string;
    expiresAt: number;
    features?: string[];
  };

  /** Organization information */
  organization?: {
    id: string;
    name: string;
    role: string;
  };

  /** Additional custom claims */
  [key: string]: any;
}

export interface IFirebaseActionCodeSettings {
  /** URL to redirect to */
  url: string;

  /** Whether to handle code in app */
  handleCodeInApp?: boolean;

  /** iOS settings */
  iOS?: {
    bundleId: string;
  };

  /** Android settings */
  android?: {
    packageName: string;
    installApp?: boolean;
    minimumVersion?: string;
  };

  /** Dynamic link domain */
  dynamicLinkDomain?: string;
}

export interface IFirebaseSignInMethods {
  /** Available sign-in providers */
  signinMethods: string[];

  /** Whether the email is registered */
  registered: boolean;

  /** All providers for the email */
  allProviders?: string[];

  /** Whether the email is for an existing account */
  needConfirmation?: boolean;
}

export interface IFirebasePasswordReset {
  /** Request type */
  requestType: 'PASSWORD_RESET';

  /** Email address */
  email: string;

  /** Action code settings */
  actionCodeSettings?: IFirebaseActionCodeSettings;
}

export interface IFirebaseEmailVerification {
  /** Request type */
  requestType: 'VERIFY_EMAIL';

  /** ID token */
  idToken: string;

  /** Action code settings */
  actionCodeSettings?: IFirebaseActionCodeSettings;
}

export interface IFirebaseSessionCookie {
  /** Session cookie */
  sessionCookie: string;

  /** Expiration time */
  expiresIn: string;
}

export interface IFirebaseUserSession {
  /** Session ID */
  sessionId: string;

  /** User UID */
  uid: string;

  /** Session creation time */
  creationTime: string;

  /** Last activity time */
  lastActivityTime: string;

  /** User agent */
  userAgent?: string;

  /** IP address */
  ipAddress?: string;
}

export interface IFirebaseAuthError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Additional error details */
  details?: any;
}

export interface IFirebaseAuthResponse<T = any> {
  /** Whether the operation was successful */
  success: boolean;

  /** Response data */
  data?: T;

  /** Error information */
  error?: IFirebaseAuthError;
}

export interface IFirebaseUserImportRecord {
  /** User UID */
  uid: string;

  /** User email */
  email: string;

  /** User password hash */
  passwordHash?: string;

  /** User password salt */
  passwordSalt?: string;

  /** Display name */
  displayName?: string;

  /** Photo URL */
  photoURL?: string;

  /** Whether email is verified */
  emailVerified?: boolean;

  /** Custom claims */
  customClaims?: Record<string, any>;

  /** Provider data */
  providerData?: Array<{
    uid: string;
    displayName?: string;
    email?: string;
    photoURL?: string;
    providerId: string;
  }>;

  /** Whether user is disabled */
  disabled?: boolean;

  /** User metadata */
  metadata?: {
    creationTime: string;
    lastSignInTime: string;
  };
}

export interface IFirebaseUserImportResult {
  /** Number of users successfully imported */
  successCount: number;

  /** Number of users that failed to import */
  failureCount: number;

  /** Array of errors for failed imports */
  errors: Array<{
    index: number;
    message: string;
  }>;
}
