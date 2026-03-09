import type { Express } from 'express';
import type { Supabase } from './types/index.js';
import type { v2 as cloudinaryType } from 'cloudinary';
import type { Resend } from 'resend';
interface RegisterRoutesDeps {
    supabase: Supabase;
    cloudinary: typeof cloudinaryType;
    resendClient: Resend | null;
    emailConfigured: boolean;
    emailFrom: string;
    authSecret: string;
    passwordResetSecret: string;
    mfaPendingSecret: string;
}
export default function registerRoutes(app: Express, deps: RegisterRoutesDeps): void;
export {};
//# sourceMappingURL=routes.d.ts.map