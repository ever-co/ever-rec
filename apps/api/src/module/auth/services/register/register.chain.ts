import { Injectable } from '@nestjs/common';
import { IRegisterProps } from '../authentication.service';
import { sendError, sendResponse } from 'src/services/utils/sendResponse';
import { MergeTokenPolicy } from '../tokens/policies/merge-token.policy';
import { FirebaseRegisterState } from './state/firebase-register.state';
import { RegisterContext } from './register.context';
import { StateId } from '../login/interfaces/login-state.interface';


@Injectable()
export class RegisterChain {
  constructor(private readonly firebaseLoginState: FirebaseRegisterState, private readonly mergeTokenPolicy: MergeTokenPolicy) { }
  public async execute(payload: IRegisterProps): Promise<any> {
    try {
      const context = new RegisterContext(this.firebaseLoginState, this.mergeTokenPolicy);
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
