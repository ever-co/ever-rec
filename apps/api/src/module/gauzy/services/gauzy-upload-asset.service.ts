import { Injectable } from '@nestjs/common';
import { GauzyRestService } from './gauzy-rest.service';
import { IUploadAvatar, FileAsset } from '../interfaces/gauzy.model';
import { HeaderBuilderService } from './header-builder.service';
import FormData from 'form-data';


@Injectable()
export class GauzyUploadAssetService {
  constructor(
    private readonly gauzyRestService: GauzyRestService,
    private readonly headerBuilderService: HeaderBuilderService
  ) { }

  public uploadAvatar(payload: IUploadAvatar): Promise<{ data: FileAsset }> {
    const { tenantId, organizationId, file } = payload;
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

    const headers = this.headerBuilderService.build(payload);

    return this.gauzyRestService.post<FormData, FileAsset>('image-assets/upload/profile_pictures', form, { headers });
  }
}
