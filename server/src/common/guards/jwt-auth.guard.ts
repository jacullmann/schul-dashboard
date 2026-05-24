import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Reflector } from '@nestjs/core';
import { AppConfig } from '../../config/env.config';
import { JwtService } from '../jwt/jwt.service';

export const COOKIE_NAME = 'auth_token';
export const IS_PUBLIC_KEY = 'isPublic';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  gRole: string;
  gId: string | null;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly appConfig: AppConfig,
    private readonly supabaseService: SupabaseService,
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const token = request.cookies[COOKIE_NAME];

    if (isPublic) {
      if (token && typeof token === 'string') {
        try {
          const payload = this.jwtService.verifyUserToken(
            token,
          ) as AuthTokenPayload;
          if (payload.sub && payload.email) {
            request.user = {
              sub: payload.sub,
              email: payload.email,
              globalRole: payload.gRole || 'user',
            };
            request.userId = payload.sub;
            request.activeGroupId = payload.gId || null;
          }
        } catch {
        }
      }
      return true;
    }

    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException({
        error: 'Authentication required.',
        requiresAuth: true,
      });
    }

    try {
      const payload = this.jwtService.verifyUserToken(
        token,
      ) as AuthTokenPayload;

      if (!payload.sub || !payload.email) {
        throw new Error('Invalid payload.');
      }

      const supabase = this.supabaseService.getClient();

      const { data: ban } = await supabase
        .from('banned_users')
        .select('id')
        .eq('user_id', payload.sub)
        .maybeSingle();

      if (ban) {
        throw new ForbiddenException({
          error: 'Your account has been suspended.',
        });
      }

      request.user = {
        sub: payload.sub,
        email: payload.email,
        globalRole: payload.gRole || 'user',
      };
      request.userId = payload.sub;
      request.activeGroupId = payload.gId || null;

      return true;
    } catch (err: any) {
      if (err instanceof ForbiddenException) throw err;
      throw new UnauthorizedException({
        error: 'Auth token is invalid or has expired.',
        requiresAuth: true,
      });
    }
  }
}
