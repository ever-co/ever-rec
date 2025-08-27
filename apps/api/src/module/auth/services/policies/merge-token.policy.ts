import { Injectable, BadRequestException, InternalServerErrorException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ContextResult, LoginStateResult, StateId } from "../login/interfaces/login-state.interface";

@Injectable()
export class MergeTokenPolicy {

  constructor(private readonly jwtService: JwtService) { }

  public async encode(ctx: ContextResult): Promise<string> {
    try {
      const plainObj = Object.fromEntries(ctx.entries());
      return this.jwtService.signAsync(plainObj);
    } catch (error) {
      throw new InternalServerErrorException('Failed to encode tokens: ' + error.message);
    }
  }

  public async decode(token: string): Promise<ContextResult> {
    if (!token || typeof token !== 'string') {
      throw new BadRequestException('Invalid token provided');
    }

    try {
      // Verify and decode the JWT - it will return the parsed object directly
      const deserialized = await this.jwtService.verifyAsync(token);
      return new Map<StateId, LoginStateResult>(Object.entries(deserialized) as [StateId, LoginStateResult][])
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new BadRequestException('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new BadRequestException('Invalid JWT token');
      }
      throw new BadRequestException('Failed to decode token: ' + error.message);
    }
  }

  public async isValid(token: string): Promise<boolean> {
    try {
      await this.decode(token);
      return true;
    } catch (_) {
      return false;
    }
  }
}
