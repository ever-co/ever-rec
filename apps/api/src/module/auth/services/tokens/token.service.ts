import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TokenStrategyChain } from './token-strategy.chain';
import { TokenRefreshResponse } from './interfaces/token.interface';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly chain: TokenStrategyChain,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  public async processToken(token: string, request: any): Promise<void> {
    const strategy = await this.chain.resolveValidation(token);
    await strategy.validate(token, request);

    this.logger.debug(`Token processed successfully for user: ${request.user?.id}`);
  }

  public async refreshToken(refreshToken: string, request: any): Promise<TokenRefreshResponse> {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    const strategy = await this.chain.resolveRefresh(refreshToken);
    const response = await strategy.execute(refreshToken, request);

    if (request.user?.id) {
      this.eventEmitter.emit('analytics.track', 'Token Refreshed', {
        userId: request.user.id,
      });
    }

    this.logger.log(`Token refreshed successfully for user: ${request.user?.id || 'unknown'}`);
    return response;
  }
}
