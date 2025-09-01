import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { IRegisterProps } from '../authentication.service';
import { sendError, sendResponse } from '../../../../services/utils/sendResponse';
import { MergeTokenPolicy } from '../tokens/policies/merge-token.policy';
import { FirebaseRegisterState } from './state/firebase-register.state';
import { RegisterContext } from './register.context';
import { StateId } from '../login/interfaces/login-state.interface';
import { IDataResponse } from '../../../../interfaces/_types';


@Injectable()
export class RegisterChain {
  constructor(private readonly firebaseRegisterState: FirebaseRegisterState, private readonly mergeTokenPolicy: MergeTokenPolicy) { }
  public async execute(payload: IRegisterProps): Promise<IDataResponse> {
    try {
      const context = new RegisterContext(this.firebaseRegisterState, this.mergeTokenPolicy);
      await context.request(payload);
      const refreshToken = await context.merge();
      const firebase = context.result.get(StateId.FIREBASE);

      if (!firebase?.data) {
        throw new InternalServerErrorException('Missing FIREBASE register state result');
      }

      return sendResponse({
        ...firebase.data,
        refreshToken
      })
    } catch (error) {
      return sendError(error.message, error)
    }
  }
}
