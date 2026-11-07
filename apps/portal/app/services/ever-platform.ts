/**
 * The anonymous usage statistics routes of the API (`/api/v1/ever-stats/*`), through the existing
 * API client. `health` answers signed-in users when the module is loaded; every other route
 * answers the operator of the installation only (404 for anyone else).
 */
import api from './api/api';

const BASE = '/api/v1/ever-stats';

export type EverStatsReason = 'env' | 'ui' | 'cloud-managed';

export interface IEverStatsStatus {
  enabled: boolean;
  reason: EverStatsReason;
  toggleEnabled: boolean;
  destinationUsable: boolean;
  nextSendAt: number | null;
  lastSentAt: number | null;
  lastStatus: string | null;
  instanceId: string;
  keyId: string;
  keyState: 'ok' | 'key_unreadable' | 'secret_missing';
  country: string;
  installSource: string;
  version: string;
  channel: string;
}

export interface IEverStatsReport {
  reportId: string;
  period: string;
  final: boolean;
  payload: string;
  createdAt: number;
  sent_at: number | null;
  httpStatus: number | null;
  status: 'pending' | 'sent' | 'rejected' | 'failed';
  attempts: number;
  error: string | null;
  hint: string | null;
}

export interface IEverStatsPreview {
  valid: boolean;
  error: string | null;
  payload: Record<string, unknown>;
}

export const getHealth = (): Promise<{ module: string; loaded: boolean }> => api.get(`${BASE}/health`) as any;

export const getStatus = (): Promise<IEverStatsStatus> => api.get(`${BASE}/status`) as any;

export const preview = (): Promise<IEverStatsPreview> => api.post(`${BASE}/preview`, {}) as any;

export const getReports = (limit = 12): Promise<{ reports: IEverStatsReport[] }> =>
  api.get(`${BASE}/reports`, { params: { limit } }) as any;

export const sendNow = (): Promise<{ report: IEverStatsReport }> => api.post(`${BASE}/send`, {}) as any;

export const setEnabled = (enabled: boolean): Promise<{ enabled: boolean }> =>
  api.put(`${BASE}/enabled`, { enabled }) as any;

export const resetIdentity = (): Promise<{ instanceId: string; keyId: string }> =>
  api.post(`${BASE}/reset-identity`, {}) as any;

export const recount = (): Promise<{ started: boolean }> => api.post(`${BASE}/recount`, {}) as any;

/** The public documentation of what is sent and how to turn it off. */
export const EVER_STATS_DOCS_URL =
  'https://github.com/ever-co/ever-rec/blob/develop/docs/ever-platform/anonymous-usage-statistics.md';
