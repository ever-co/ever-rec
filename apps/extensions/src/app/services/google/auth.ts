import api from '../api/api';
import { getStorageItems, setStorageItems } from '../localStorage';

export interface DriveToken {
  access_token: string;
  expires_in: string;
  state: string;
  error: string;
}

export interface DriveUser {
  email: string;
  name?: string;
  picture?: string;
}

export async function setDriveToken(
  driveToken: DriveToken,
): Promise<DriveToken> {
  await setStorageItems({ driveToken: driveToken });
  return driveToken;
}

// TODO: when this works make a separate driveToken in storage, not idToken
export async function getDriveToken(): Promise<any> {
  const data = await getStorageItems('idToken');
  return data?.idToken || null;
}

export const driveSignOut = () => {
  return api.delete(`/api/v1/drive/sign-out`);
};
