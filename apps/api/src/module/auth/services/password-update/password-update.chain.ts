import { BadRequestException, Injectable } from '@nestjs/common';
import { IChangePasswordProps } from '../authentication.service';
import { sendError, sendResponse } from '../../../../services/utils/sendResponse';
import { MergeTokenPolicy } from '../tokens/policies/merge-token.policy';
import { AuthProviderId } from '../../interfaces/auth.interface';
import { IDataResponse } from '../../../../interfaces/_types';
import { AuthContext } from '../auth.context';
import { FirebasePasswordUpdateState } from './state/firebase-password-update.state';
import { PasswordUpdate } from './interfaces/password-update.interface';


@Injectable()
export class PasswordUpdateChain {
  constructor(private readonly firebasePasswordUpdateState: FirebasePasswordUpdateState, private readonly mergeTokenPolicy: MergeTokenPolicy) { }
  public async execute(payload: IChangePasswordProps): Promise<IDataResponse> {
    try {
      const context = new AuthContext<PasswordUpdate>(this.firebasePasswordUpdateState, this.mergeTokenPolicy);
      await context.request(payload);
      const refreshToken = await context.merge();

      const data = context.getResults().get(AuthProviderId.FIREBASE).data;

      if (!data) {
        throw new BadRequestException('Something went wrong.');
      }

      return sendResponse({
        ...data,
        refreshToken
      });
    } catch (error) {
      return sendError(error.message, error)
    }
  }
}
