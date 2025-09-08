import { BadRequestException, HttpException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { GauzyRestService } from './gauzy-rest.service';
import { GauzyMapper, IAuthResponse, IGauzyUpdateProfileProps, IRequestHeaders } from '../interfaces/gauzy.model';


@Injectable()
export class GauzyUserService {
  constructor(
    private readonly gauzyRestService: GauzyRestService
  ) { }

  public async updateProfile(
    id: string,
    input: IGauzyUpdateProfileProps & IRequestHeaders
  ) {
    const { token, refreshToken, tenantId, organizationId, email, fullName } = input;

    // Validate required fields with specific error messages
    if (!token?.trim()) {
      throw new BadRequestException('Authentication token is required');
    }

    if (!id?.trim()) {
      throw new BadRequestException('User ID is required');
    }

    // Validate email format if provided
    if (email && !this.isValidEmail(email)) {
      throw new BadRequestException('Invalid email format');
    }

    const { lastName, firstName } = GauzyMapper.parseFullName(fullName);

    // Build payload with validation for empty strings
    const payload: Partial<IGauzyUpdateProfileProps> = {
      id,
      ...(email?.trim() && { email: email.trim() }),
      ...(fullName?.trim() && { lastName: lastName.trim() }),
      ...(fullName?.trim() && { firstName: firstName.trim() }),
    };

    // Check if payload has any valid properties
    if (Object.keys(payload).length === 0) {
      throw new BadRequestException('No valid update fields provided in payload');
    }

    // Build headers with validation
    const headers: Record<string, string> = {
      authorization: `Bearer ${token.trim()}`,
      ...(refreshToken?.trim() && { 'Refresh-Token': refreshToken.trim() }),
      ...(tenantId?.trim() && { 'Tenant-Id': tenantId.trim() }),
      ...(organizationId?.trim() && { 'Organization-Id': organizationId.trim() }),
    };

    try {
      return this.gauzyRestService.put<IGauzyUpdateProfileProps, IAuthResponse>(
        `user/${encodeURIComponent(id)}`,
        payload,
        { headers }
      );
    } catch (error) {
      // Re-throw with appropriate error handling
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to update user profile');
    }
  }

  /**
   * Validates email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
