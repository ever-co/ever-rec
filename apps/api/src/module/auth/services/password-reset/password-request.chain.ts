import { Injectable } from '@nestjs/common';
import { IRegisterProps } from '../authentication.service';
import { sendError, sendResponse } from '../../../../services/utils/sendResponse';
import { AuthProviderId } from '../../interfaces/auth.interface';
import { IDataResponse } from '../../../../interfaces/_types';
import { AuthContext } from '../auth.context';
import { FirebaseRequestPasswordState } from './state/firebase-request-password.state';
import { PasswordRequest } from './interfaces/password-request.interface';


@Injectable()
export class RequestPasswordChain {
  constructor(private readonly firebaseRequestPasswordState: FirebaseRequestPasswordState) { }
  public async execute(payload: string): Promise<IDataResponse<PasswordRequest>> {
    try {
      const context = new AuthContext<PasswordRequest>(this.firebaseRequestPasswordState, null);
      await context.request(payload);

      return sendResponse(context.getResults().get(AuthProviderId.FIREBASE))
    } catch (error) {
      return sendError(error.message, error)
    }
  }
}
