import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export const OAUTH_PENDING_COOKIE = 'oauth_pending_token';

export interface OAuthPendingPayload {
  googleId: string;
  googleEmail: string;
  purpose: string;
}

@Injectable()
export class OAuthPendingGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies[OAUTH_PENDING_COOKIE];

    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException({
        error: 'Authentifizierung fehlgeschlagen',
        requiresOAuthPending: true,
      });
    }

    try {
      const secret = this.configService.get<string>('OAUTH_PENDING_JWT_SECRET')!;
      const payload = jwt.verify(token, secret) as OAuthPendingPayload;

      if (
        payload.purpose !== 'oauth_pending' ||
        !payload.googleId ||
        !payload.googleEmail
      ) {
        throw new Error();
      }

      request.oauthPending = {
        googleId: payload.googleId,
        googleEmail: payload.googleEmail,
      };

      return true;
    } catch {
      throw new UnauthorizedException({
        error: 'Authentifizierung fehlgeschlagen',
        requiresOAuthPending: true,
      });
    }
  }
}
