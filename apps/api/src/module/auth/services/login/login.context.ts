import { ILoginProps } from "../authentication.service";
import type { ContextResult, LoginState, LoginStateResult, StateId } from "./interfaces/login-state.interface";
import { MergeTokenPolicy } from '../policies/merge-token.policy';

export class LoginContext {
  private state: LoginState;
  public readonly result: ContextResult = new Map<StateId, LoginStateResult>();

  constructor(initialState: LoginState, private readonly mergeTokenPolicy?: MergeTokenPolicy) {
    this.state = initialState;
  }

  public setState(state: LoginState) {
    this.state = state;
  }

  public async request(payload: ILoginProps): Promise<void> {
    await this.state.handle(this, payload);
  }

  public async merge(): Promise<string> {
    return this.mergeTokenPolicy.encode(this.result);
  }
}
