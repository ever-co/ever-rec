import { Reference } from '@firebase/database-types';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as admin from 'firebase-admin';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { LogEventEnum } from './view.models/LogEventEnum';

@Injectable()
export class LogService {
  constructor(private eventEmitter: EventEmitter2) {}

  async deleteAppLog(ip: string): Promise<void> {
    const timestamp = moment().utc().valueOf();
    const db = admin.database();
    const logsRef: Reference = db.ref(`logs/${timestamp}_${uuidv4()}`);
    await logsRef.set({
      ip,
      timestamp,
      eventType: LogEventEnum.AppWasDeleted,
    });
  }

  async saveSegmentEvent(req: any): Promise<any> {
    const { event } = req.body;
    await this.eventEmitter.emit('analytics.track', event, {
      userId: req.user?.id,
      ...req.body,
    });
    return true;
  }
}
