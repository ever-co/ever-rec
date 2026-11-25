import { IDataResponse } from 'app/interfaces/IApiResponse';
import { IUserData } from 'app/interfaces/IUserData';
import api from './api';

/** `GET /api/v1/auth/ever-id/config`: whether the server offers Ever ID sign-in. */
export interface IEverIdConfig {
  enabled: boolean;
  issuer?: string;
  buttonLabel?: string;
}

/** One Ever ID connected to the signed-in account. */
export interface IEverIdIdentity {
  issuer: string;
  subject: string;
  email: string;
  linkMethod: 'explicit' | 'jit' | 'provisioned';
  linkedAt: number;
  lastLoginAt: number | null;
}

export interface ITermsClaim {
  documentId: string;
  version: string;
  sha256: string;
  locale: string;
}

const BASE = '/api/v1/auth/ever-id';

/**
 * The URL the browser opens to start an Ever ID sign-in (the API redirects to the issuer).
 * `bindingHash` ties the sign-in to this tab (see `everIdBinding.ts`).
 */
export const everIdStartUrl = (returnPath: string, bindingHash: string): string =>
  `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${BASE}/start?return=${encodeURIComponent(returnPath)}&binding=${encodeURIComponent(bindingHash)}`;

export const getEverIdConfigAPI = (): Promise<IEverIdConfig> => api.get(`${BASE}/config`) as any;

export const exchangeEverIdCodeAPI = (
  code: string,
  binding?: string,
): Promise<IDataResponse<IUserData & { isNewUser?: boolean }>> => api.post(`${BASE}/exchange`, { code, binding });

export const getEverIdSignUpDetailsAPI = (
  pending: string,
  binding?: string,
): Promise<{ name: string | null; email: string }> => api.post(`${BASE}/sign-up/details`, { pending, binding }) as any;

export const confirmEverIdSignUpAPI = (
  pending: string,
  terms: ITermsClaim[],
  binding?: string,
): Promise<{ code: string; return: string }> =>
  api.post(`${BASE}/sign-up/confirm`, { pending, termsAccepted: true, terms, binding }) as any;

export const startEverIdConnectAPI = (): Promise<{ authorizationUrl: string }> =>
  api.post(`${BASE}/connect/start`, {}) as any;

export const getEverIdConnectDetailsAPI = (
  pending: string,
): Promise<{ accountEmail: string; everIdEmail: string }> => api.post(`${BASE}/connect/details`, { pending }) as any;

export const confirmEverIdConnectAPI = (pending: string): Promise<{ identities: IEverIdIdentity[] }> =>
  api.post(`${BASE}/connect/confirm`, { pending }) as any;

export const getEverIdIdentitiesAPI = (): Promise<{ identities: IEverIdIdentity[] }> =>
  api.get(`${BASE}/identities`) as any;

export const unlinkEverIdAPI = (issuer: string, subject: string): Promise<{ identities: IEverIdIdentity[] }> =>
  api.delete(`${BASE}/link`, { data: { issuer, subject } }) as any;
