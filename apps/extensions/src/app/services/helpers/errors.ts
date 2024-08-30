import { errorMessage } from './toastMessages';

export const errorHandler = (error: any) => {
  let errorMsg = 'There was an error.';

  if (error.name && error.name === 'FirebaseError') {
    errorMsg = firebaseErrors[error.code];
  } else if (error.message) {
    errorMsg = customMessageErrors[error.message] || error.message;
  }
  errorMsg && errorMessage(errorMsg);
};

const customMessageErrors: Record<string, string> = {
  'The user did not approve access.': 'Login with Google to use this Feature',
};

const firebaseErrors: Record<string, string> = {
  'auth/wrong-password': 'Invalid email or password! Please enter again.',
  'auth/popup-closed-by-user': '',
  'auth/claims-too-large': 'auth/claims-too-large',
  'auth/email-already-exists': 'User with this email already exists',
  'auth/email-already-in-use': 'User with this email already exists',
  'auth/id-token-expired': 'auth/id-token-expired',
  'auth/id-token-revoked': 'auth/id-token-revoked',
  'auth/insufficient-permission': 'auth/insufficient-permission',
  'auth/internal-error': 'auth/internal-error',
  'auth/invalid-argument': 'auth/invalid-argument',
  'auth/invalid-claims': 'auth/invalid-claims',
  'auth/invalid-continue-uri': 'auth/invalid-continue-uri',
  'auth/invalid-creation-time': 'auth/invalid-creation-time',
  'auth/invalid-credential': 'auth/invalid-credential',
  'auth/invalid-disabled-field': 'auth/invalid-disabled-field',
  'auth/invalid-display-name': 'auth/invalid-display-name',
  'auth/invalid-dynamic-link-domain': 'auth/invalid-dynamic-link-domain',
  'auth/invalid-email': 'Invalid login or password. Please try again',
  'auth/invalid-email-verified': 'auth/invalid-email-verified',
  'auth/invalid-hash-algorithm': 'auth/invalid-hash-algorithm',
  'auth/invalid-hash-block-size': 'auth/invalid-hash-block-size',
  'auth/invalid-hash-derived-key-length':
    'auth/invalid-hash-derived-key-length',
  'auth/invalid-hash-key': 'auth/invalid-hash-key',
  'auth/invalid-hash-memory-cost': 'auth/invalid-hash-memory-cost',
  'auth/invalid-hash-parallelization': 'auth/invalid-hash-parallelization',
  'auth/invalid-hash-rounds': 'auth/invalid-hash-rounds',
  'auth/invalid-hash-salt-separator': 'auth/invalid-hash-salt-separator',
  'auth/invalid-id-token': 'auth/invalid-id-token',
  'auth/invalid-last-sign-in-time': 'auth/invalid-last-sign-in-time',
  'auth/invalid-page-token': 'auth/invalid-page-token',
  'auth/invalid-password': 'Invalid login or password. Please try again',
  'auth/invalid-password-hash': 'auth/invalid-password-hash',
  'auth/invalid-password-salt': 'auth/invalid-password-salt',
  'auth/invalid-phone-number': 'auth/invalid-phone-number',
  'auth/invalid-photo-url': 'auth/invalid-photo-url',
  'auth/invalid-provider-data': 'auth/invalid-provider-data',
  'auth/invalid-provider-id': 'auth/invalid-provider-id',
  'auth/invalid-session-cookie-duration':
    'auth/invalid-session-cookie-duration',
  'auth/invalid-uid': 'auth/invalid-uid',
  'auth/invalid-user-import': 'auth/invalid-user-import',
  'auth/maximum-user-count-exceeded': 'auth/maximum-user-count-exceeded',
  'auth/missing-android-pkg-name': 'auth/missing-android-pkg-name',
  'auth/missing-continue-uri': 'auth/missing-continue-uri',
  'auth/missing-hash-algorithm': 'auth/missing-hash-algorithm',
  'auth/missing-ios-bundle-id': 'auth/missing-ios-bundle-id',
  'auth/missing-uid': 'auth/missing-uid',
  'auth/phone-number-already-exists': 'auth/phone-number-already-exists',
  'auth/project-not-found': 'auth/project-not-found',
  'auth/reserved-claims': 'auth/reserved-claims',
  'auth/session-cookie-expired': 'auth/session-cookie-expired',
  'auth/session-cookie-revoked': 'auth/session-cookie-revoked',
  'auth/uid-already-exists': 'auth/uid-already-exists',
  'auth/unauthorized-continue-uri': 'auth/unauthorized-continue-uri',
  'auth/user-not-found': 'User not found',
  'auth/app-deleted': 'auth/app-deleted',
  'auth/app-not-authorized': 'auth/app-not-authorized',
  'auth/argument-error': 'auth/argument-error',
  'auth/invalid-api-key': 'auth/invalid-api-key',
  'auth/invalid-user-token': 'auth/invalid-user-token',
  'auth/invalid-tenant-id': 'auth/invalid-tenant-id',
  'auth/network-request-failed': 'auth/network-request-failed',
  'auth/operation-not-allowed': 'auth/operation-not-allowed',
  'auth/requires-recent-login': 'auth/requires-recent-login',
  'auth/too-many-requests': 'auth/too-many-requests',
  'auth/unauthorized-domain': 'auth/unauthorized-domain',
  'auth/user-disabled': 'auth/user-disabled',
  'auth/user-token-expired': 'auth/user-token-expired',
  'auth/web-storage-unsupported': 'auth/web-storage-unsupported',
};

// const storageErrors = {
//   'storage/unknown',
//   'storage/object-not-found',
//   'storage/bucket-not-found',
//   'storage/project-not-found',
//   'storage/quota-exceeded',
//   'storage/unauthenticated',
//   'storage/unauthorized',
//   'storage/retry-limit-exceeded',
//   'storage/invalid-checksum',
//   'storage/canceled',
//   'storage/invalid-event-name',
//   'storage/invalid-url',
//   'storage/invalid-argument',
//   'storage/no-default-bucket',
//   'storage/cannot-slice-blob',
//   'storage/server-file-wrong-size',
// }
