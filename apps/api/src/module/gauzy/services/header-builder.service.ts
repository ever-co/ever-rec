import { BadRequestException, Injectable } from '@nestjs/common';
import { IHeaderBuilder, RequestHeaders } from '../interfaces/gauzy.model';

@Injectable()
export class HeaderBuilderService implements IHeaderBuilder {
  public build(params: RequestHeaders): Record<string, string> {
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

  private validateRequiredParams(params: RequestHeaders): void {
    if (!params.token?.trim()) {
      throw new BadRequestException('Authentication token is required');
    }
  }
}
