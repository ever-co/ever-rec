import { AuthProviderId, AuthState, AuthStateResult } from "../interfaces/auth.interface";
import { MergeTokenPolicy } from "./tokens/policies/merge-token.policy";

export class AuthContext<T = unknown> {
  private state: AuthState;
  private readonly result = new Map<AuthProviderId, AuthStateResult<T>>();

  constructor(initialState: AuthState, private readonly mergeTokenPolicy: MergeTokenPolicy) {
    this.state = initialState;
  }

  public setState(state: AuthState): void {
    this.state = state;
  }

  public setResult(provider: AuthProviderId, value: AuthStateResult<T>): void {
    this.result.set(provider, value);
  }

  public getResults(): ReadonlyMap<AuthProviderId, AuthStateResult<T>> {
    return new Map(this.result);
  }

  public async request<P>(payload: P): Promise<void> {
    await this.state.handle(this, payload);
  }

  public async merge(): Promise<string> {
    if (this.result.size === 0) {
      throw new Error('Something went wrong.');
    }
    return this.mergeTokenPolicy.encode(this.result);
  }
}
