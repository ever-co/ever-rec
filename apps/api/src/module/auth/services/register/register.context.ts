import { IRegisterProps } from "../authentication.service";
import type { ContextResult, RegisterState, RegisterStateResult, } from "./interfaces/register-state.interface";
import { MergeTokenPolicy } from '../tokens/policies/merge-token.policy';
import { StateId } from "../login/interfaces/login-state.interface";

export class RegisterContext {
  private state: RegisterState;
  public readonly result: ContextResult = new Map<StateId, RegisterStateResult>();

  constructor(initialState: RegisterState, private readonly mergeTokenPolicy?: MergeTokenPolicy) {
    this.state = initialState;
  }

  public setState(state: RegisterState) {
    this.state = state;
  }

  public async request(payload: IRegisterProps): Promise<void> {
    await this.state.handle(this, payload);
  }

  public async merge(): Promise<string> {
    return this.mergeTokenPolicy.encode(this.result);
  }
}
