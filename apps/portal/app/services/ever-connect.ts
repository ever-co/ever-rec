/**
 * The Ever Platform connection routes of the API (`/api/v1/ever-connect/*`), through the existing
 * API client. They exist only when the API loads the connection module (`health` answers 200).
 * Operator routes answer the operator of a self-hosted installation only (404 for anyone else);
 * workspace routes answer the workspace's admin only.
 */
import axios from 'axios';
import api from './api/api';

/**
 * The public provision routes go through a client of their own: an invalid link answers 401, which
 * must not sign the person out the way the shared client does for a session that ended.
 */
const publicApi = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_BASE_URL });
publicApi.interceptors.response.use((response) => response.data);

const BASE = '/api/v1/ever-connect';

/** Whether this portal build shows the Connect tabs at all (a build-time switch). */
export const isEverConnectBuildEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_EVER_CONNECT_ENABLED === 'true';

export type LadderState = 'valid' | 'grace' | 'paused' | 'revoked';

export interface IEverConnectLadder {
  state: LadderState;
  refreshedAt: number | null;
  expiresAt: number | null;
}

export interface IEverConnectStatus {
  status: 'not_connected' | 'active' | 'pending_approval' | 'revoked' | 'disconnected';
  registryInstanceId: string | null;
  connectedAt: number | null;
  connectedBy: string | null;
  disconnectedAt: number | null;
  lastHeartbeatAt: number | null;
  lastError: string | null;
  connectKeyId: string | null;
  platform: string | null;
  installSource: string;
  managedBy: 'cloud' | 'operator';
  version: string;
  feedMode: string;
  envCode: { outcome: string; at: number } | null;
  entitlement: IEverConnectLadder;
  links: Array<{ workspaceId: string; handle: string | null; state: string }>;
  oidcReady: boolean;
  outcome?: string;
}

export interface IEverConnectScopeRow {
  field_path: string;
  direction: string;
  form: string;
  frequency: string;
  required: boolean;
  purpose: string;
  retention: string;
}

export interface IEverConnectIntegration {
  key: string;
  name: string;
  description: string;
  revokeEffect: string;
  scope: IEverConnectScopeRow[];
  state: string;
  enabled: boolean;
  consentSource: string | null;
  revokeSource: string | null;
  pendingRemoteRevoke: boolean;
  deniedReason: 'env' | 'policy' | null;
  connected: boolean;
}

export interface IEverConnectPolicy {
  key: string;
  allowed: boolean;
  deniedByEnv: boolean;
  setAt: number | null;
}

export interface IEverConnectLinkView {
  connected: boolean;
  connectionStatus: string;
  managedBy: 'cloud' | 'operator';
  link: {
    state: string;
    handle: string | null;
    plan: string | null;
    tier: string | null;
    linkedAt: number;
    pendingRemoteUnlink: boolean;
  } | null;
  ladder: IEverConnectLadder;
  features: Record<string, boolean>;
  warning?: string | null;
}

export interface IEverConnectAuditRow {
  /** The row's key: the cursor of the next page. */
  id: string;
  at: number;
  actor: string;
  action: string;
  workspaceId?: string;
  details?: Record<string, string | number | boolean | null>;
}

export type ConsentUrlAnswer =
  | { state: 'ready'; url: string; expiresAt: string }
  | { state: 'denied_by_policy' | 'coming_soon' | 'not_connected'; url: null };

export const getConnectHealth = (): Promise<{ module: string; loaded: boolean }> => api.get(`${BASE}/health`) as any;

// Operator
export const getConnectStatus = (): Promise<IEverConnectStatus> => api.get(`${BASE}/status`) as any;

export const connectInstallation = (code: string, workspaceId: string): Promise<IEverConnectStatus> =>
  api.post(`${BASE}/connect`, { code, workspaceId }) as any;

export const disconnectInstallation = (): Promise<IEverConnectStatus> => api.post(`${BASE}/disconnect`, {}) as any;

export const rotateConnectKey = (): Promise<IEverConnectStatus> => api.post(`${BASE}/rotate-key`, {}) as any;

export const refreshEntitlements = (): Promise<IEverConnectStatus> => api.post(`${BASE}/entitlement/refresh`, {}) as any;

export const getPolicy = (): Promise<IEverConnectPolicy[]> => api.get(`${BASE}/policy`) as any;

export const setPolicy = (key: string, allowed: boolean): Promise<IEverConnectPolicy[]> =>
  api.put(`${BASE}/policy`, { key, allowed }) as any;

export const setPublicUrl = (url: string): Promise<{ url: string; sentAt: number | null }> =>
  api.put(`${BASE}/public-url`, { url }) as any;

export const getIntegrations = (): Promise<IEverConnectIntegration[]> => api.get(`${BASE}/integrations`) as any;

export const refreshIntegrations = (): Promise<IEverConnectIntegration[]> =>
  api.post(`${BASE}/integrations/refresh`, {}) as any;

export const getConsentUrl = (key: string): Promise<ConsentUrlAnswer> =>
  api.get(`${BASE}/integrations/${encodeURIComponent(key)}/consent-url`) as any;

export const disableIntegration = (key: string): Promise<IEverConnectIntegration[]> =>
  api.post(`${BASE}/integrations/${encodeURIComponent(key)}/disable`, {}) as any;

export const acceptIntegration = (key: string, accepted: boolean): Promise<IEverConnectIntegration[]> =>
  api.post(`${BASE}/integrations/${encodeURIComponent(key)}/accept`, { accepted }) as any;

/**
 * The export of the signed-in account for an export request sent from app.ever.co (`404` when it
 * was made of another account, or expired).
 */
export const getMyExport = (jobId: string): Promise<unknown> =>
  api.get(`${BASE}/me/exports/${encodeURIComponent(jobId)}`);

export const getAudit = (before?: string): Promise<{ rows: IEverConnectAuditRow[] }> =>
  api.get(`${BASE}/audit`, { params: { limit: 50, ...(before ? { before } : {}) } }) as any;

// Workspace admin
const ws = (workspaceId: string) => `${BASE}/workspaces/${encodeURIComponent(workspaceId)}`;

export const getWorkspaceLink = (workspaceId: string): Promise<IEverConnectLinkView> =>
  api.get(`${ws(workspaceId)}/link`) as any;

export const linkWorkspace = (workspaceId: string, linkCode: string): Promise<IEverConnectLinkView> =>
  api.post(`${ws(workspaceId)}/link`, { linkCode }) as any;

export const unlinkWorkspace = (workspaceId: string): Promise<IEverConnectLinkView> =>
  api.delete(`${ws(workspaceId)}/link`) as any;

export const refreshWorkspace = (workspaceId: string): Promise<IEverConnectLinkView> =>
  api.post(`${ws(workspaceId)}/refresh`, {}) as any;

export const getWorkspaceIntegrations = (workspaceId: string): Promise<IEverConnectIntegration[]> =>
  api.get(`${ws(workspaceId)}/integrations`) as any;

export const getWorkspaceConsentUrl = (workspaceId: string, key: string): Promise<ConsentUrlAnswer> =>
  api.get(`${ws(workspaceId)}/integrations/${encodeURIComponent(key)}/consent-url`) as any;

export const getWorkspaceAudit = (workspaceId: string, before?: string): Promise<{ rows: IEverConnectAuditRow[] }> =>
  api.get(`${ws(workspaceId)}/audit`, { params: { limit: 50, ...(before ? { before } : {}) } }) as any;

/** The public documentation of the connection: what is sent, when, and how to verify it. */
export const EVER_CONNECT_DOCS_URL =
  'https://github.com/ever-co/ever-rec/blob/develop/docs/ever-platform/ever-platform-connection.md';

// Ever Rec cloud provisioning (hand-off from app.ever.co; the routes exist only on Ever Cloud)

export interface IProvisionIntent {
  /** Sealed by the API: what the confirmation needs (opaque here). */
  provisionTxn: string;
  jti: string;
  handle: string;
  displayName: string;
  expiresAt: number;
}

export interface IProvisionResult {
  status: 'created' | 'exists' | 'refused';
  workspaceId?: string;
  returnTo: string | null;
}

/** Posts the intent read from the page's fragment (never from a query string). */
export const postProvisionIntent = (intent: string): Promise<IProvisionIntent> =>
  publicApi.post(`${BASE}/provision/intent`, { intent }) as any;

export const confirmProvision = (provisionTxn: string): Promise<IProvisionResult> =>
  api.post(`${BASE}/provision/confirm`, { provisionTxn }) as any;

export const rejectProvision = (jti: string, provisionTxn: string): Promise<IProvisionResult> =>
  publicApi.post(`${BASE}/provision/intents/${encodeURIComponent(jti)}/reject`, { provisionTxn }) as any;

// Maintenance operations (the operator of a self-hosted installation)

export interface IManagedWindow {
  days: number[];
  from: string;
  to: string;
}

export interface IManagedSettings {
  available: boolean;
  optIn: boolean;
  kinds: string[];
  supportedKinds: string[];
  windows: IManagedWindow[];
  /** Whether a backup directory is set (the directory itself is never sent back). */
  backupDirSet: boolean;
  history: Array<{ operationId: string; kind: string; status: string; at: number; sizeBytes?: number; reason?: string }>;
}

export const getManaged = (): Promise<IManagedSettings> => api.get(`${BASE}/managed`) as any;

export const setManaged = (body: {
  optIn: boolean;
  kinds: string[];
  windows: IManagedWindow[];
  backupDir?: string;
}): Promise<IManagedSettings> => api.put(`${BASE}/managed`, body) as any;
