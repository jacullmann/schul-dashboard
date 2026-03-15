import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { SupabaseService } from '../supabase/supabase.service';
import { Reflector } from '@nestjs/core';

export const COOKIE_NAME = 'auth_token';
export const IS_PUBLIC_KEY = 'isPublic';

// Legacy shape from Express
export interface AuthTokenPayload {
  sub: string;
  email: string;
  gRole: string;
  gId: string | null;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService,
    private reflector: Reflector,
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
          const secret = this.configService.get<string>('USER_JWT_SECRET');
          if (secret) {
            const payload = jwt.verify(token, secret) as AuthTokenPayload;
            if (payload.sub && payload.email) {
              request.user = {
                sub: payload.sub,
                email: payload.email,
                globalRole: payload.gRole || 'user',
              };
              request.userId = payload.sub;
              request.activeGroupId = payload.gId || null;
            }
          }
        } catch {
          // Ignore invalid token for public routes
        }
      }
      return true; // Proceed anyway since it's public
    }

    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException({
        error: 'Authentifizierung erforderlich',
        requiresAuth: true,
      });
    }

    try {
      const secret = this.configService.get<string>('USER_JWT_SECRET')!;
      const payload = jwt.verify(token, secret) as AuthTokenPayload;

      if (!payload.sub || !payload.email) {
        throw new Error();
      }

      const supabase = this.supabaseService.getClient();

      // Ban check
      const { data: ban } = await supabase
        .from('banned_users')
        .select('id')
        .eq('user_id', payload.sub)
        .maybeSingle();

      if (ban) {
        throw new ForbiddenException({ error: 'Account gesperrt' });
      }

      // Populate user context
      request.user = {
        sub: payload.sub,
        email: payload.email,
        globalRole: payload.gRole || 'user',
      };
      request.userId = payload.sub;
      request.activeGroupId = payload.gId || null;

      // Notice: If specific role checks are needed (e.g., 'superadmin' or tenant role list),
      // we will handle them in separate RolesGuard to mimic `requireAuth(secret, supabase, 'superadmin')`,
      // or directly use another Guard on specific routes.

      return true;
    } catch (err: any) {
      if (err instanceof ForbiddenException) throw err;
      throw new UnauthorizedException({
        error: 'Auth-Token ungültig oder abgelaufen',
        requiresAuth: true,
      });
    }
  }
}
