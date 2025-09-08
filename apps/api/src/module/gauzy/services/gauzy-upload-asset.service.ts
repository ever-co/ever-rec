import { Injectable } from '@nestjs/common';
import { GauzyRestService } from './gauzy-rest.service';
import { IUploadAvatar, FileAsset } from '../interfaces/gauzy.model';


@Injectable()
export class GauzyUploadAssetService {
  constructor(
    private readonly gauzyRestService: GauzyRestService
  ) { }

  public uploadAvatar(payload: IUploadAvatar) {
    const FormData = require('form-data');
    const { token, tenantId, refreshToken, organizationId, file } = payload;
    const form = new FormData();

    form.append('file', file.buffer, {
      filename: file.originalname || file.filename,
      contentType: file.mimetype,
      knownLength: file.size
    });

    if (tenantId) {
      form.append('tenantId', tenantId);
    }

    if (organizationId) {
      form.append('organizationId', organizationId);
    }

    const headers: Record<string, string> = {
      ...form.getHeaders(),
      Authorization: `Bearer ${token.trim()}`,
      'Refresh-Token': refreshToken.trim(),
      ...(tenantId?.trim() && { 'Tenant-Id': tenantId.trim() }),
      ...(organizationId?.trim() && { 'Organization-Id': organizationId.trim() }),
    };

    return this.gauzyRestService.post<FormData, FileAsset>('image-assets/upload/profile_pictures', form, { headers });
  }
}
