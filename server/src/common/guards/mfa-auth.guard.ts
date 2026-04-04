import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AppConfig } from '../../config/env.config';
import { JwtService } from '../jwt/jwt.service';

export const MFA_PENDING_COOKIE = 'mfa_pending_token';

export interface MfaPendingPayload {
  sub: string;
  email: string;
  purpose: string;
}

@Injectable()
export class MfaPendingGuard implements CanActivate {
  constructor(
    private appConfig: AppConfig,
    private jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies[MFA_PENDING_COOKIE];

    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException({
        error: 'Authentication failed.',
        requiresMfaPending: true,
      });
    }

    try {
      const payload = this.jwtService.verifyMfaPendingToken(
        token,
      ) as MfaPendingPayload;

      if (payload.purpose !== 'mfa_pending' || !payload.sub || !payload.email) {
        throw new Error();
      }

      request.mfaPending = {
        sub: payload.sub,
        email: payload.email,
      };

      return true;
    } catch {
      throw new UnauthorizedException({
        error: 'Authentication failed.',
        requiresMfaPending: true,
      });
    }
  }
}
