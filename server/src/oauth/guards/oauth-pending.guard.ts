import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { AppConfig } from '../../config/env.config';

export const OAUTH_PENDING_COOKIE = 'oauth_pending_token';

export interface OAuthPendingPayload {
  googleId: string;
  googleEmail: string;
  purpose: string;
}

@Injectable()
export class OAuthPendingGuard implements CanActivate {
  constructor(private appConfig: AppConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies[OAUTH_PENDING_COOKIE];

    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException({
        error: 'Authentication failed.',
        requiresOAuthPending: true,
      });
    }

    try {
      const payload = jwt.verify(
        token,
        this.appConfig.oauthPendingJwtSecret,
      ) as OAuthPendingPayload;

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
        error: 'Authentication failed.',
        requiresOAuthPending: true,
      });
    }
  }
}
