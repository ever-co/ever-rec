import { UnauthorizedException } from '@nestjs/common';
import { TokenState } from '../interfaces/token.interface';

export abstract class BaseStrategyState<T> implements TokenState<T> {
  private nextState?: TokenState<T>;

  public setNext(next: TokenState<T>): TokenState<T> {
    this.nextState = next;
    return next;
  }

  public async resolve(token: string, request?: any): Promise<T> {
    if (await this.supports(token)) {
      return this.handle(token, request);
    }
    if (this.nextState) {
      return this.nextState.resolve(token, request);
    }
    throw new UnauthorizedException('No strategy could handle token');
  }

  protected abstract supports(token: string): Promise<boolean>;
  protected abstract handle(token: string, request?: any): Promise<T>;
}
