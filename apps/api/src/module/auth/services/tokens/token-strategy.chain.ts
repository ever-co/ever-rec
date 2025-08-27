import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ITokenRefreshStrategy, ITokenValidateStrategy, StrategyPosition } from './interfaces/token.interface';

@Injectable()
export class TokenStrategyChain {
  private readonly refreshStrategies: ITokenRefreshStrategy[] = [];
  private readonly validateStrategies: ITokenValidateStrategy[] = [];

  public linkRefreshStrategy(strategy: ITokenRefreshStrategy, position: StrategyPosition = StrategyPosition.TAIL) {
    switch (position) {
      case StrategyPosition.HEAD:
        this.refreshStrategies.unshift(strategy);
        break;
      case StrategyPosition.TAIL:
      default:
        this.refreshStrategies.push(strategy);
        break;
    }
  }

  public linkValidateStrategy(strategy: ITokenValidateStrategy) {
    this.validateStrategies.push(strategy);
  }

  async resolveRefresh(refreshToken: string): Promise<ITokenRefreshStrategy> {
    for (const strategy of this.refreshStrategies) {
      if (await strategy.supports(refreshToken)) {
        return strategy;
      }
    }
    throw new UnauthorizedException('No refresh strategy could handle token');
  }

  async resolveValidation(token: string): Promise<ITokenValidateStrategy> {
    for (const strategy of this.validateStrategies) {
      if (await strategy.supports(token)) {
        return strategy;
      }
    }
    throw new UnauthorizedException('No validation strategy could handle token');
  }
}
