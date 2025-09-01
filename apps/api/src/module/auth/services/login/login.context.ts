import { ILoginProps } from "../authentication.service";
import type { ContextResult, LoginState, LoginStateResult } from "./interfaces/login-state.interface";
import { MergeTokenPolicy } from '../tokens/policies/merge-token.policy';
import { AuthProviderId } from '../../interfaces/auth.interface';

export class LoginContext {
  private state: LoginState;
  public readonly result: ContextResult = new Map<AuthProviderId, LoginStateResult>();

  constructor(initialState: LoginState, private readonly mergeTokenPolicy: MergeTokenPolicy) {
    this.state = initialState;
  }

  public setState(state: LoginState): void {
    this.state = state;
  }

  public async request(payload: ILoginProps): Promise<void> {
    await this.state.handle(this, payload);
  }

  public async merge(): Promise<string> {
    return this.mergeTokenPolicy.encode(this.result);
  }
}
