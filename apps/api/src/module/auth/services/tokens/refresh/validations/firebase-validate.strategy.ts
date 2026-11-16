import { Injectable } from "@nestjs/common";
import { IRefreshTokenContext } from "../../interfaces/token.interface";
import { FirebaseAdminService } from "../../../../../firebase/services/firebase-admin.service";
import { UserFactory } from "../../user.factory";
import { ValidateStrategyState } from "../../states/validate-strategy.state";

@Injectable()
export class FirebaseValidateStrategy extends ValidateStrategyState {
  constructor(
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly userFactory: UserFactory,
  ) {
    super();
  }

  // `checkRevoked`: the token of a deleted, disabled or signed-out account is refused, so the
  // guards fall back to the refresh token, which fails for such an account too.
  async supports(token: string): Promise<boolean> {
    try {
      await this.firebaseAdmin.verifyIdToken(token, true);
      return true;
    } catch {
      return false;
    }
  }

  async handle({ token, request }: IRefreshTokenContext): Promise<void> {
    const decoded = await this.firebaseAdmin.verifyIdToken(token, true);
    request.user = this.userFactory.create(decoded);
  }
}
