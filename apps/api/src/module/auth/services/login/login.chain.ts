import { Injectable } from '@nestjs/common';
import { LoginContext } from './login.context';
import { FirebaseLoginState } from './state/firebase-login.state';
import { ILoginProps } from '../authentication.service';
import { sendError, sendResponse } from '../../../../services/utils/sendResponse';
import { StateId } from './interfaces/login-state.interface';
import { MergeTokenPolicy } from '../tokens/policies/merge-token.policy';
import { IDataResponse } from '../../../../interfaces/_types';


@Injectable()
export class LoginChain {
  constructor(private readonly firebaseLoginState: FirebaseLoginState, private readonly mergeTokenPolicy: MergeTokenPolicy) { }
  public async execute(payload: ILoginProps): Promise<IDataResponse> {
    try {
      const context = new LoginContext(this.firebaseLoginState, this.mergeTokenPolicy);
      await context.request(payload);
      const refreshToken = await context.merge();
      return sendResponse({
        ...context.result.get(StateId.FIREBASE).data,
        refreshToken
      })
    } catch (error) {
      return sendError(error.message, error)
    }
  }
}
