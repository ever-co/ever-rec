import { BadRequestException, Injectable } from '@nestjs/common';
import { sendError, sendResponse } from '../../../../services/utils/sendResponse';
import { MergeTokenPolicy } from '../tokens/policies/merge-token.policy';
import { AuthProviderId } from '../../interfaces/auth.interface';
import { IDataResponse } from '../../../../interfaces/_types';
import { AuthContext } from '../auth.context';
import { IUpdateUserProfileProps, UpdateUserProfile, WorkflowProfileType } from './interfaces/update-user-profile.interface';
import { WorkflowFirebaseProfileFactory } from './workflow-profile.factory';


@Injectable()
export class UpdateUserProfileChain {
  constructor(private readonly worflow: WorkflowFirebaseProfileFactory, private readonly mergeTokenPolicy: MergeTokenPolicy) { }
  public async execute(payload: IUpdateUserProfileProps, type: WorkflowProfileType): Promise<IDataResponse> {
    try {
      const context = new AuthContext<UpdateUserProfile>(this.worflow.create(type), this.mergeTokenPolicy);

      await context.request(payload);

      const data = context.getResults().get(AuthProviderId.FIREBASE);

      if (!data) {
        throw new BadRequestException('Something went wrong.');
      }

      return sendResponse(data);
    } catch (error) {
      return sendError(error.message, error);
    }
  }
}
