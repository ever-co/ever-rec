import { Injectable } from "@nestjs/common";
import { WorkflowProfileType } from "./interfaces/update-user-profile.interface";
import { FirebaseUpdateUserNameState } from './state/firebase-update-user-name.state';
import { FirebaseUpdateUserEmailState } from "./state/firebase-update-user-email.state";
import { FirebaseUpdateUserAvatarState } from "./state/firebase-update-user-avatar.state";

@Injectable()
export class WorkflowFirebaseProfileFactory {
  constructor(
    private readonly firebaseUpdateUserNameState: FirebaseUpdateUserNameState,
    private readonly firebaseUpdateUserEmailState: FirebaseUpdateUserEmailState,
    private readonly firebaseUpdateUserAvatarState: FirebaseUpdateUserAvatarState
  ) { }
  public create(type: WorkflowProfileType) {
    switch (type) {
      case WorkflowProfileType.NAME:
        return this.firebaseUpdateUserNameState;
      case WorkflowProfileType.EMAIL:
        return this.firebaseUpdateUserEmailState;
      case WorkflowProfileType.AVATAR:
        return this.firebaseUpdateUserAvatarState;
      default:
        throw new Error('Unknow workflow type');
    }
  }
}
