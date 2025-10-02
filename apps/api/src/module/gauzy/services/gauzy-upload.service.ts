import { Injectable } from '@nestjs/common';
import FormData from 'form-data';
import {
  GauzyUploadType,
  IUploadCamShot,
  IUploadScreenshot,
  IUploadSoundShot,
  IUploadVideo,
} from '../interfaces/gauzy-upload.model';
import { FileAsset, IRequestHeaders } from '../interfaces/gauzy.model';
import { GauzyRestService } from './gauzy-rest.service';
import { HeaderBuilderService } from './header-builder.service';

@Injectable()
export class GauzyUploadService {
  private readonly baseUrl = 'plugins';

  constructor(
    private readonly gauzyRestService: GauzyRestService,
    private readonly headerBuilderService: HeaderBuilderService,
  ) {}

  /** ----------------------------------------------------------------------
   *  Generic POST wrapper
   *  ---------------------------------------------------------------------- */
  private post<T, U>(
    form: T,
    headers: Record<string, string>,
    type: GauzyUploadType,
  ): Promise<{ data: U }> {
    return this.gauzyRestService.post<T, U>(`${this.baseUrl}/${type}`, form, {
      headers,
    });
  }

  /** ----------------------------------------------------------------------
   *  Public upload methods – each now uses the common helpers
   *  ---------------------------------------------------------------------- */

  public video(
    payload: IUploadVideo & IRequestHeaders,
  ): Promise<{ data: FileAsset }> {
    const {
      tenantId,
      organizationId,
      file,
      title,
      description,
      recordedAt,
      resolution,
      codec,
      frameRate,
    } = payload;

    const form = this.buildForm({
      file,
      tenantId,
      organizationId,
      recordedAt,
    });

    if (title) form.append('title', title);
    if (description) form.append('description', description);
    if (resolution) form.append('resolution', resolution);
    if (codec) form.append('codec', codec);
    if (frameRate) form.append('frameRate', frameRate.toString());

    const headers = this.headerBuilderService.build(payload);
    return this.post<FormData, FileAsset>(form, headers, GauzyUploadType.VIDEO);
  }

  public screenshot(
    payload: IUploadScreenshot & IRequestHeaders,
  ): Promise<{ data: FileAsset }> {
    const { tenantId, organizationId, file, recordedAt, pathname, timeSlotId } =
      payload;

    const form = this.buildForm({
      file,
      tenantId,
      organizationId,
      recordedAt,
    });

    if (pathname) form.append('pathname', pathname);
    if (timeSlotId) form.append('timeSlotId', timeSlotId);

    const headers = this.headerBuilderService.build(payload);
    return this.gauzyRestService.post<FormData, FileAsset>(
      'timesheet/screenshot',
      form,
      { headers },
    );
  }

  public camshot(
    payload: IUploadCamShot & IRequestHeaders,
  ): Promise<{ data: FileAsset }> {
    const { tenantId, organizationId, file, recordedAt, pathname, timeSlotId } =
      payload;

    const form = this.buildForm({
      file,
      tenantId,
      organizationId,
      recordedAt,
    });

    if (pathname) form.append('pathname', pathname);
    if (timeSlotId) form.append('timeSlotId', timeSlotId);

    const headers = this.headerBuilderService.build(payload);
    return this.post<FormData, FileAsset>(form, headers, GauzyUploadType.PHOTO);
  }

  public soundshot(
    payload: IUploadSoundShot & IRequestHeaders,
  ): Promise<{ data: FileAsset }> {
    const {
      tenantId,
      organizationId,
      file,
      recordedAt,
      name,
      pathname,
      timeSlotId,
      rate,
      channels,
    } = payload;

    const form = this.buildForm({
      file,
      tenantId,
      organizationId,
      recordedAt,
    });

    // Backend expects the audio name under the key “name”
    if (name) form.append('name', name);
    if (pathname) form.append('pathname', pathname);
    if (timeSlotId) form.append('timeSlotId', timeSlotId);
    if (rate) form.append('rate', rate.toString());
    if (channels) form.append('channels', channels.toString());

    const headers = this.headerBuilderService.build(payload);
    return this.post<FormData, FileAsset>(form, headers, GauzyUploadType.AUDIO);
  }

  /** ----------------------------------------------------------------------
   *  Helper: builds the common part of a FormData payload
   *  ---------------------------------------------------------------------- */
  private buildForm(params: {
    file: Express.Multer.File;
    tenantId?: string;
    organizationId?: string;
    recordedAt?: Date | string;
  }): FormData {
    const { file, tenantId, organizationId, recordedAt = new Date() } = params;
    const form = new FormData();

    // ---- 1️⃣ Append the file (common logic) ----
    this.appendFile(form, file);

    // ---- 2️⃣ Append optional meta‑fields that are shared by every upload ----
    if (tenantId) form.append('tenantId', tenantId);
    if (organizationId) form.append('organizationId', organizationId);
    form.append('recordedAt', this.normalizeDate(recordedAt));

    return form;
  }

  /** ----------------------------------------------------------------------
   *  Helper: adds the file to a FormData instance
   *  ---------------------------------------------------------------------- */
  private appendFile(form: FormData, file: Express.Multer.File): void {
    form.append('file', file.buffer, {
      filename: file.originalname ?? file.filename,
      contentType: file.mimetype,
      knownLength: file.size,
    });
  }

  /** ----------------------------------------------------------------------
   *  Helper: guarantees ISO‑8601 string for the `recordedAt` field
   *  ---------------------------------------------------------------------- */
  private normalizeDate(value: Date | string): string {
    return typeof value === 'string' ? value : value.toISOString();
  }
}
