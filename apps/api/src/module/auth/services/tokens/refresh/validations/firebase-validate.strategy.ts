import { Injectable } from "@nestjs/common";
import { ITokenValidateStrategy } from "../../interfaces/token.interface";
import { FirebaseAdminService } from "src/module/firebase/services/firebase-admin.service";
import { UserFactory } from "../../user.factory";
import { TokenStrategyChain } from "../../token-strategy.chain";
import { ValidateStrategyState } from "../../states/validate-strategy.state";

@Injectable()
export class FirebaseValidateStrategy extends ValidateStrategyState {
  constructor(
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly userFactory: UserFactory,
    private readonly tokenStrategyChain: TokenStrategyChain,
  ) {
    super();
    this.tokenStrategyChain.setInitialValidateStrategy(this);
  }

  async supports(token: string): Promise<boolean> {
    try {
      await this.firebaseAdmin.verifyIdToken(token);
      return true;
    } catch {
      return false;
    }
  }

  async handle(token: string, request: any): Promise<void> {
    const decoded = await this.firebaseAdmin.verifyIdToken(token);
    request.user = this.userFactory.create(decoded);
  }
}
