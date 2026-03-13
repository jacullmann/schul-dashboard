import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export const MFA_PENDING_COOKIE = 'mfa_pending_token';

export interface MfaPendingPayload {
  sub: string;
  email: string;
  purpose: string;
}

@Injectable()
export class MfaPendingGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies[MFA_PENDING_COOKIE];

    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException({
        error: 'Authentifizierung fehlgeschlagen',
        requiresMfaPending: true,
      });
    }

    try {
      const secret = this.configService.get<string>('MFA_PENDING_JWT_SECRET')!;
      const payload = jwt.verify(token, secret) as MfaPendingPayload;

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
        error: 'Authentifizierung fehlgeschlagen',
        requiresMfaPending: true,
      });
    }
  }
}
