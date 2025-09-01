import { AuthProviderId, AuthState, AuthStateResult } from "../interfaces/auth.interface";
import { MergeTokenPolicy } from "./tokens/policies/merge-token.policy";

export class AuthContext<T = unknown> {
  private state: AuthState;
  public readonly result = new Map<AuthProviderId, AuthStateResult<T>>();

  constructor(initialState: AuthState, private readonly mergeTokenPolicy: MergeTokenPolicy) {
    this.state = initialState;
  }

  public setState(state: AuthState): void {
    this.state = state;
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
