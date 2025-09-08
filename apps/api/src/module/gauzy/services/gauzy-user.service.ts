import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger
} from '@nestjs/common';
import { GauzyRestService } from './gauzy-rest.service';
import {
  GauzyMapper,
  IAuthResponse,
  IGauzyUpdateProfileProps,
  IRequestHeaders
} from '../interfaces/gauzy.model';
import { HeaderBuilderService } from './header-builder.service';

@Injectable()
export class GauzyUserService {
  private readonly logger = new Logger(GauzyUserService.name);

  constructor(
    private readonly gauzyRestService: GauzyRestService,
    private readonly headerBuilderService: HeaderBuilderService
  ) { }

  public async updateProfile(
    id: string,
    input: IGauzyUpdateProfileProps & IRequestHeaders
  ): Promise<{ data: IAuthResponse }> {
    this.validateInputs(id, input);

    const payload = this.buildPayload(id, input);
    const headers = Object.freeze(this.headerBuilderService.build(input));

    try {
      return this.gauzyRestService.put<
        IGauzyUpdateProfileProps,
        IAuthResponse
      >(
        `user/${encodeURIComponent(id)}`,
        Object.freeze(payload),
        { headers }
      );
    } catch (error) {
      this.logger.error(`Failed to update profile for user ${id}`, error.stack);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Unexpected error while updating profile for user ${id}`
      );
    }
  }

  /**
   * Validate input parameters
   */
  private validateInputs(
    id: string,
    input: IGauzyUpdateProfileProps & IRequestHeaders
  ): void {
    if (!id?.trim()) {
      throw new BadRequestException('User ID is required');
    }

    if (!input?.token?.trim()) {
      throw new BadRequestException('Authentication token is required');
    }
  }

  /**
   * Build and validate the update payload
   */
  private buildPayload(
    id: string,
    input: IGauzyUpdateProfileProps
  ): Partial<IGauzyUpdateProfileProps> {
    const { email, fullName } = input;
    const { lastName, firstName } = GauzyMapper.parseFullName(fullName);

    const payload: Partial<IGauzyUpdateProfileProps> = { id };

    if (email?.trim()) {
      payload.email = email.trim();
    }

    if (fullName?.trim()) {
      payload.firstName = firstName.trim();
      payload.lastName = lastName.trim();
    }

    if (Object.keys(payload).length <= 1) {
      throw new BadRequestException('No valid update fields provided');
    }

    return payload;
  }
}
