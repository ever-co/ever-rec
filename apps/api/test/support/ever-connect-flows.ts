/** Shared steps of the Ever Platform connection suites. */
import { EverConnectFeedService } from '../../src/module/ever-connect/services/ever-connect-feed.service';
import { EverConnectSchedulerService } from '../../src/module/ever-connect/services/ever-connect-scheduler.service';
import { ConnectTestApp, OPERATOR_UID } from './ever-connect-app';

export const CONNECT_ON = { EVER_CONNECT_ENABLED: 'true' };

/** The operator connects with a code and the workspace `ws-1`; answers the operator's token. */
export async function connectInstallation(t: ConnectTestApp, handle = 'acme'): Promise<string> {
  const operator = await t.signIn(OPERATOR_UID);
  if (!t.firebase.db.dump('workspaces/ws-1')) t.seedWorkspace('ws-1', OPERATOR_UID, [], 'Acme recordings');
  const res = await t
    .http()
    .post('/api/v1/ever-connect/connect')
    .set('idToken', operator)
    .send({ code: t.platform.issueConnectCode(handle), workspaceId: 'ws-1' });
  if (res.status !== 200) {
    throw new Error(`connect answered ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return operator;
}

/** One read of the feed (as the scheduler does it in interval mode). */
export async function readFeed(t: ConnectTestApp) {
  return t.get(EverConnectFeedService).cycle(0);
}

export const scheduler = (t: ConnectTestApp): EverConnectSchedulerService =>
  t.get(EverConnectSchedulerService);
