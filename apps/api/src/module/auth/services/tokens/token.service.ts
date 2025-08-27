import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TokenRefreshResponse } from './interfaces/token.interface';
import { TokenStrategyChain } from './token-strategy.chain';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly chain: TokenStrategyChain,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  public async processToken(token: string, request: any): Promise<void> {
    await this.chain.resolveValidation(token, request);
    this.logger.debug(`Token processed successfully for user: ${request.user?.id}`);
  }

  public async refreshToken(refreshToken: string, request: any): Promise<TokenRefreshResponse> {
    if (!refreshToken) throw new BadRequestException('Refresh token is required');

    const response = await this.chain.resolveRefresh(refreshToken, request);

    if (request.user?.id) {
      this.eventEmitter.emit('analytics.track', 'Token Refreshed', { userId: request.user.id });
    }

    this.logger.log(`Token refreshed successfully for user: ${request.user?.id || 'unknown'}`);
    return response;
  }
}
