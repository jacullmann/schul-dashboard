// middleware/userAuth.ts
import jwt from 'jsonwebtoken';
import * as db from '../db/db.js';
import type { Request, Response, NextFunction } from 'express';
import type { Supabase, AuthUser } from '../types/index.js';

const COOKIE_NAME = 'auth_token';

interface AuthTokenPayload {
  sub: string;
  email: string;
  gRole: string;
  gId: string | null;
}

/**
 * Issue a lean JWT. No groups array – that comes from a separate endpoint.
 */
export function setAuthToken(
  res: Response,
  secret: string,
  {
    userId,
    email,
    globalRole,
    activeGroupId,
  }: {
    userId: string;
    email: string;
    globalRole: string;
    activeGroupId: string | null;
  },
): string {
  const payload: AuthTokenPayload = {
    sub: userId.toString(),
    email,
    gRole: globalRole || 'user',
    gId: activeGroupId || null,
  };

  const token = jwt.sign(payload, secret, { expiresIn: '7d' });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    path: '/',
    sameSite: 'None',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return token;
}

export function clearAuthToken(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    path: '/',
    sameSite: 'None',
  });
}

/**
 * Core auth middleware factory.
 *
 * Usage:
 *   requireAuth(secret, supabase)                    → any authenticated, non-banned user
 *   requireAuth(secret, supabase, 'superadmin')      → global superadmin only
 *   requireAuth(secret, supabase, ['admin', 'mod'])   → tenant-scoped role check (requires x-tenant-id)
 *
 * Populates: req.user, req.userId, req.activeGroupId
 */
export function requireAuth(
  secret: string,
  supabase: Supabase,
  requiredRole?: string | string[],
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const token: unknown = req.cookies[COOKIE_NAME];

    if (!token || typeof token !== 'string') {
      res.status(401).json({
        error: 'Authentifizierung erforderlich',
        requiresAuth: true,
      });
      return;
    }

    try {
      const payload = jwt.verify(token, secret) as AuthTokenPayload;

      if (!payload.sub || !payload.email) {
        res
          .status(401)
          .json({ error: 'Ungültiges Auth-Token', requiresAuth: true });
        return;
      }

      // Ban check
      const { data: ban } = await supabase
        .from('banned_users')
        .select('id')
        .eq('user_id', payload.sub)
        .maybeSingle();

      if (ban) {
        res.status(403).json({ error: 'Account gesperrt' });
        return;
      }

      // Populate user context
      req.user = {
        sub: payload.sub,
        email: payload.email,
        globalRole: (payload.gRole || 'user') as AuthUser['globalRole'],
      };
      req.userId = payload.sub;
      req.activeGroupId = payload.gId || null;

      // ── Role checks ──

      // 1) Global superadmin check
      if (requiredRole === 'superadmin') {
        if (req.user.globalRole !== 'superadmin') {
          res.status(403).json({ error: 'Keine Berechtigung' });
          return;
        }
        next();
        return;
      }

      // 2) Tenant-scoped role check (e.g. ['admin', 'mod'])
      if (Array.isArray(requiredRole)) {
        const tenantId =
          (req.headers['x-tenant-id'] as string | undefined) ||
          req.activeGroupId;
        if (!tenantId) {
          res.status(403).json({ error: 'Tenant-Kontext fehlt' });
          return;
        }
        req.tenantId = tenantId;

        // Superadmin bypasses tenant role checks
        if (req.user.globalRole === 'superadmin') {
          next();
          return;
        }

        // Look up user's role in this specific tenant
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('roles(name)')
          .eq('user_id', payload.sub)
          .eq('tenant_id', tenantId)
          .maybeSingle();

        const tenantRoleName = (userRole as Record<string, unknown> | null)
          ?.roles as { name: string } | undefined;
        if (
          !tenantRoleName?.name ||
          !requiredRole.includes(tenantRoleName.name)
        ) {
          res
            .status(403)
            .json({ error: 'Keine Berechtigung für diese Aktion' });
          return;
        }

        req.tenantRole = tenantRoleName.name;
        next();
        return;
      }

      // 3) No specific role required – just authenticated
      next();
    } catch {
      res.status(401).json({
        error: 'Auth-Token ungültig oder abgelaufen',
        requiresAuth: true,
      });
    }
  };
}

/**
 * Lightweight: attach user if token present, don't block if missing.
 */
export function checkAuth(secret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const token: unknown = req.cookies[COOKIE_NAME];

    req.user = null;
    req.userId = null;
    req.activeGroupId = null;

    if (token && typeof token === 'string') {
      try {
        const payload = jwt.verify(token, secret) as AuthTokenPayload;
        if (payload.sub && payload.email) {
          req.user = {
            sub: payload.sub,
            email: payload.email,
            globalRole: (payload.gRole || 'user') as AuthUser['globalRole'],
          };
          req.userId = payload.sub;
          req.activeGroupId = payload.gId || null;
        }
      } catch {
        // ignore – user stays null
      }
    }

    next();
  };
}
