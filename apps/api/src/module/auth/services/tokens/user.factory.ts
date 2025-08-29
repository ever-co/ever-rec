import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/auth';
import { IRequestUser } from '../../guards/auth.guard';

@Injectable()
export class UserFactory {
  private readonly logger = new Logger(UserFactory.name);

  create(decoded: DecodedIdToken): IRequestUser {
    if (!decoded.uid || !decoded.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      id: decoded.uid,
      email: decoded.email,
      photoURL: decoded.picture || null,
      name:
        decoded.name ||
        decoded.display_name ||
        this.parseEmail(decoded.email),
      isVerified: decoded.email_verified || false,
    };
  }

  private parseEmail(email: string): string {
    try {
      const [local] = email.split('@');
      return local
        .split(/[._-]/)
        .map(
          (p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(),
        )
        .join(' ');
    } catch (err) {
      this.logger.warn(`Failed to parse email: ${email}`, err);
      return 'User';
    }
  }
}
