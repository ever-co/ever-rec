import {
  Injectable,
  BadRequestException,
  InternalServerErrorException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ContextResult, LoginStateResult, StateId } from "../login/interfaces/login-state.interface";
import { TokenStorageService } from "../tokens/token-storage.service";

@Injectable()
export class MergeTokenPolicy {
  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenStorageService: TokenStorageService,
  ) { }

  /**
   * Encodes the authentication context into a storable JWT reference token.
   * @param ctx - Authentication context containing tokens per state.
   * @returns A signed reference token containing the storage ID.
   */
  public async encode(ctx: ContextResult): Promise<string> {
    try {
      const plainObj = Object.fromEntries(ctx.entries());

      // Sign the full context
      const serializedToken = await this.sign(plainObj);

      // Store and return a reference token containing only the storage id
      const { id } = await this.tokenStorageService.save(serializedToken);
      return this.sign({ id });
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Failed to encode tokens: ${error.message}`,
      );
    }
  }

  /**
   * Decodes a reference token back into the original context.
   * @param token - Reference token containing storage ID.
   * @returns Reconstructed authentication context.
   */
  public async decode(token: string): Promise<ContextResult> {
    if (!this.isTokenLike(token)) {
      throw new BadRequestException("Invalid token provided");
    }

    try {
      // 1. Decode reference token → extract storage id
      const { id } = await this.verify<{ id: string }>(token);

      // 2. Load serialized token from storage
      const stored = await this.tokenStorageService.findById(id);
      if (!stored) {
        throw new BadRequestException("Token not found in storage");
      }

      // 3. Decode stored token → reconstruct context
      const deserialized = await this.verify<Record<StateId, LoginStateResult>>(
        stored.token,
      );

      return new Map<StateId, LoginStateResult>(
        Object.entries(deserialized) as [StateId, LoginStateResult][],
      );
    } catch (error: any) {
      throw this.mapJwtError(error);
    }
  }

  /**
   * Checks whether a token is valid and decodable.
   */
  public async isValid(token: string): Promise<boolean> {
    try {
      await this.decode(token);
      return true;
    } catch {
      return false;
    }
  }


  private async sign<T extends object>(payload: T): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  private async verify<T extends object>(token: string): Promise<T> {
    return this.jwtService.verifyAsync(token) as Promise<T>;
  }

  private isTokenLike(token: unknown): token is string {
    return typeof token === "string" && token.trim().length > 0;
  }

  private mapJwtError(error: any): BadRequestException {
    if (error?.name === "TokenExpiredError") {
      return new BadRequestException("Token has expired");
    }
    if (error?.name === "JsonWebTokenError") {
      return new BadRequestException("Invalid JWT token");
    }
    return new BadRequestException(`Failed to decode token: ${error.message}`);
  }
}
