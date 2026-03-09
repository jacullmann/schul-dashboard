import type { Request, Response, NextFunction } from 'express';
import type { Supabase } from '../types/index.js';
/**
 * Extracts tenant ID and validates access.
 * Superadmins bypass the membership check.
 * Must be used AFTER requireAuth().
 */
export declare function requireTenant(supabase: Supabase): (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=tenantContext.d.ts.map