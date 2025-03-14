import { getStorageItems, setStorageItems } from './services/localStorage';

const publicIp = require('public-ip');
const moment = require('moment');

export type LogEventType =
  | 'FirstLaunch'
  | 'SingleLaunch'
  | 'Reinstall'
  | 'UserEnterEmail'
  | 'UserEnterPassword'
  | 'UserSignedUpViaGoogle'
  | 'UserResetPassword'
  | 'UserChangedTheirEmail'
  | 'UserChangedTheirPassword'
  | 'UserChangedTheirFullName'
  | 'UserConnectedTheirGDrive'
  | 'UserDisconnectedTheirGDrive'
  | 'UserDeletedAccount'
  | 'UserOpenedTheirProfileSettings'
  | 'UserHasScreenshottedSelectedArea'
  | 'UserHasScreenshottedAFullPage'
  | 'UserHasSavedTheScreenshotLocally'
  | 'UserHasSavedTheScreenshotToTheirGDrive';

export interface AppLoggerEvent {
  eventType: LogEventType;
  timestamp: number;
  ip?: string;
  userId?: string;
  message?: string;
  payload?: any;
}

class AppLogger {
  private _ip: string | undefined;

  public get ip() {
    return this._ip;
  }

  public async initLogger() {
    try {
      await this.setIp();
      await this.checkUnsavedData();
    } catch (err: any) {
      console.log(err);
    }
  }

  private async setIp() {
    this._ip = await publicIp.v4();
  }

  private async getLog(): Promise<AppLoggerEvent[]> {
    let items: AppLoggerEvent[] = [];
    try {
      await this.setIp();
      const data = await getStorageItems('logger');
      items = data.logger;
    } catch (err: any) {
      console.log(err);
    }
    return items;
  }

  async add({
    eventType,
    message,
    uid,
    payload,
  }: {
    eventType: LogEventType;
    message?: string;
    uid?: string;
    payload?: any;
  }) {
    !this._ip && (await this.initLogger());
    const items: AppLoggerEvent[] = await this.getLog();
    try {
      items.push({
        eventType,
        message,
        ip: this._ip,
        timestamp: moment().utc().valueOf(),
        userId: uid,
        payload,
      });

      await setStorageItems({
        logger: items,
      });
    } catch (err: any) {
      console.log(err);
    }
  }

  async checkUnsavedData() {
    // TODO: should be moved into API, not really important, but at some point.
    // const items:AppLoggerEvent[] = await this.getLog();
    // await setStorageItems({ logger: [] });
    // Promise.allSettled(items.map(async item=> {
    //   const logsRef: DatabaseReference = ref(firebaseDb, `logs/${item.timestamp}_${uuidv4()}`);
    //   await set(logsRef, item);
    // }))
  }
}

export const appLogger = new AppLogger();
