import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '../jwt/jwt.service';
import { ACCESS_COOKIE } from '../../auth/auth.cookies';

export const IS_PUBLIC_KEY = 'isPublic';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  gRole: string;
  gId: string | null;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.[ACCESS_COOKIE];

    if (isPublic) {
      if (typeof token === 'string' && token.length > 0) {
        try {
          const payload =
            this.jwtService.verifyUserToken<AuthTokenPayload>(token);
          if (payload?.sub && payload?.email) {
            this.attach(request, payload);
          }
        } catch {}
      }
      return true;
    }

    if (typeof token !== 'string' || token.length === 0) {
      throw new UnauthorizedException({
        error: 'Authentication required.',
        requiresAuth: true,
      });
    }

    try {
      const payload = this.jwtService.verifyUserToken<AuthTokenPayload>(token);
      if (!payload?.sub || !payload?.email) {
        throw new Error('Invalid payload.');
      }
      this.attach(request, payload);
      return true;
    } catch {
      throw new UnauthorizedException({
        error: 'Access token is invalid or has expired.',
        requiresAuth: true,
      });
    }
  }

  private attach(request: any, payload: AuthTokenPayload): void {
    request.user = {
      sub: payload.sub,
      email: payload.email,
      globalRole: payload.gRole ?? 'user',
    };
    request.userId = payload.sub;
    request.activeGroupId = payload.gId ?? null;
  }
}
