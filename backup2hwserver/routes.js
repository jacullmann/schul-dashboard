import { withThumb, timeLeftColor } from './utils/modelHelpers.js';

import { setAuthToken, requireAuth, clearAuthToken, checkAuth } from './middleware/userAuth.js';
import { validateCsrf, clearCsrfCookie, rotateCsrfToken, generateCsrfToken, verifyCsrfToken } from './middleware/csrf.js';
import { dashboardLimiter, authLimiter, passwordResetLimiter } from './middleware/rateLimiters.js';
import { sendJSONError, validate, requireAdmin, validateItemCreation } from './middleware/validation.js';
import { requireTenant } from './middleware/tenantContext.js';
import { encryptData, decryptData } from './utils/encryption.js';
import { createEmailService } from './utils/email.js';
import { filterLessonsForUser } from './utils/helpers.js';
import { configureOtplib } from './middleware/mfaAuth.js';

import createAppGateRoutes from './routes/appGate.js';
import createSystemRoutes from './routes/system.js';
import createAuthRoutes from './routes/auth.js';
import createAdminRoutes from './routes/admin.js';
import createTodosRoutes from './routes/todos.js';
import createUserRoutes from './routes/user.js';
import createItemsRoutes from './routes/items.js';
import createPublicRoutes from './routes/public.js';
import createMfaRoutes from './routes/mfa.js';
import createDocRoutes from './routes/doc.js';

export default function registerRoutes(app, deps) {
    const {
        supabase,
        cloudinary,
        resendClient,
        emailConfigured,
        emailFrom,
        authSecret,
        csrfSecret,
        passwordResetSecret
    } = deps;

    // OTPlib konfigurieren
    configureOtplib();

    // E-Mail-Service initialisieren
    const emailService = createEmailService({
        resendClient,
        emailConfigured,
        emailFrom
    });

    // Erweiterte Dependencies für Route-Module
    const routeDeps = {
        ...deps,
        emailService,
        // Middleware-Funktionen
        requireAuth,
        checkAuth,
        setAuthToken,
        clearAuthToken,
        validateCsrf,
        rotateCsrfToken,
        clearCsrfCookie,
        generateCsrfToken,
        verifyCsrfToken,
        // Rate-Limiter
        dashboardLimiter,
        authLimiter,
        passwordResetLimiter,
        // Validierung
        sendJSONError,
        validate,
        requireAdmin,
        requireTenant,
        validateItemCreation,
        // Utils
        encryptData,
        decryptData,
        filterLessonsForUser,
        // Model-Helpers
        withThumb,
        timeLeftColor
    };

    // Router mounten
    app.use('/api/app-gate', createAppGateRoutes(routeDeps));
    app.use('/api', createSystemRoutes(routeDeps));
    app.use('/api/auth', createAuthRoutes(routeDeps));
    app.use('/api/admin', createAdminRoutes(routeDeps));
    app.use('/api/todos', createTodosRoutes(routeDeps));
    app.use('/api/user', createUserRoutes(routeDeps));
    app.use('/api/items', createItemsRoutes(routeDeps));
    app.use('/api/mfa', createMfaRoutes(routeDeps));
    app.use('/api/doc', createDocRoutes(routeDeps));
    app.use('/', createPublicRoutes(routeDeps));
}