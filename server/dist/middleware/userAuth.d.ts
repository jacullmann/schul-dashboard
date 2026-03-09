import type { Request, Response, NextFunction } from 'express';
import type { Supabase } from '../types/index.js';
/**
 * Issue a lean JWT. No groups array – that comes from a separate endpoint.
 */
export declare function setAuthToken(res: Response, secret: string, { userId, email, globalRole, activeGroupId, }: {
    userId: string;
    email: string;
    globalRole: string;
    activeGroupId: string | null;
}): string;
export declare function clearAuthToken(res: Response): void;
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
export declare function requireAuth(secret: string, supabase: Supabase, requiredRole?: string | string[]): (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Lightweight: attach user if token present, don't block if missing.
 */
export declare function checkAuth(secret: string): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=userAuth.d.ts.map