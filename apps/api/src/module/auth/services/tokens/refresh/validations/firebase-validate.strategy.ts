import { Injectable } from "@nestjs/common";
import { ITokenValidateStrategy } from "../../interfaces/token.interface";
import { FirebaseAdminService } from "src/module/firebase/services/firebase-admin.service";
import { UserFactory } from "../../user.factory";
import { TokenStrategyChain } from "../../token-strategy.chain";

@Injectable()
export class FirebaseValidateStrategy implements ITokenValidateStrategy {
  constructor(
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly userFactory: UserFactory,
    private readonly tokenStrategyChain: TokenStrategyChain,
  ) {
    this.tokenStrategyChain.linkValidateStrategy(this);
  }

  async supports(token: string): Promise<boolean> {
    try {
      await this.firebaseAdmin.verifyIdToken(token);
      return true;
    } catch {
      return false;
    }
  }

  async validate(token: string, request: any): Promise<void> {
    const decoded = await this.firebaseAdmin.verifyIdToken(token);
    request.user = this.userFactory.create(decoded);
  }
}
