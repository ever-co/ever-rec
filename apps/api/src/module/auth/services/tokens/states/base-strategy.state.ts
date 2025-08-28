import { IRefreshTokenContext, TokenState } from '../interfaces/token.interface';
import { StateId } from '../../login/interfaces/login-state.interface';

export abstract class BaseStrategyState<T> implements TokenState<T> {
  private nextState?: TokenState<T>;
  public tokenId: StateId;

  public setNext(next: TokenState<T>): TokenState<T> {
    this.nextState = next;
    return next;
  }

  public async resolve(context: IRefreshTokenContext): Promise<T> {
    const token = await this.getToken(context);
    let response = null

    if (await this.supports(token)) {
      response = await this.handle(context, token);
    }

    const hasNext = this.nextState && response && token !== context.token;

    return hasNext ? this.nextState.resolve(context) : response
  }

  protected abstract getToken(context: IRefreshTokenContext): Promise<string>;
  protected abstract supports(token: string): Promise<boolean>;
  protected abstract handle(context: IRefreshTokenContext, newToken: string): Promise<T>;
}
