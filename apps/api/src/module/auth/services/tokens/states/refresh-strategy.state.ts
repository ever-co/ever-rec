import { TokenRefreshResponse } from '../interfaces/token.interface';
import { BaseStrategyState } from './base-strategy.state';

export abstract class RefreshStrategyState extends BaseStrategyState<TokenRefreshResponse> { }
