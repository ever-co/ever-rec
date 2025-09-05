import { Injectable } from "@nestjs/common";
import { WorkflowProfileType } from "./interfaces/update-user-profile.interface";
import { FirebaseUpdateUserNameState } from './state/firebase-update-user-name.state';
import { FirebaseUpdateUserEmailState } from "./state/firebase-update-user-email.state";

@Injectable()
export class WorkflowFirebaseProfileFactory {
  constructor(
    private readonly firebaseUpdateUserNameState: FirebaseUpdateUserNameState,
    private readonly firebaseUpdateUserEmailState: FirebaseUpdateUserEmailState
  ) { }
  public create(type: WorkflowProfileType) {
    switch (type) {
      case WorkflowProfileType.NAME:
        return this.firebaseUpdateUserNameState;
      case WorkflowProfileType.EMAIL:
        return this.firebaseUpdateUserEmailState;
      default:
        throw new Error('Unknow workflow type');
    }
  }
}
