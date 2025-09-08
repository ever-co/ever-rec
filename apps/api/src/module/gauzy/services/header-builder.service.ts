import { BadRequestException, Injectable } from '@nestjs/common';
import { IHeaderBuilder, IRequestHeaders } from '../interfaces/gauzy.model';
import * as FormData from 'form-data';

@Injectable()
export class HeaderBuilderService implements IHeaderBuilder {
  public build(params: IRequestHeaders & { formData?: FormData }): Record<string, string> {
    const { token, refreshToken, tenantId, organizationId, formData } = params;

    this.validateRequiredParams(params);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token.trim()}`,
      ...(formData && { ...formData.getHeaders() }),
      ...(refreshToken?.trim() && { 'Refresh-Token': refreshToken.trim() }),
      ...(tenantId?.trim() && { 'Tenant-Id': tenantId.trim() }),
      ...(organizationId?.trim() && { 'Organization-Id': organizationId.trim() }),
    };

    return headers;
  }

  private validateRequiredParams(params: IRequestHeaders): void {
    if (!params.token?.trim()) {
      throw new BadRequestException('Authentication token is required');
    }
  }
}
