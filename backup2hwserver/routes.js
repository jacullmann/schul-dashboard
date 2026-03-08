import { withThumb, timeLeftColor } from './utils/modelHelpers.js';

import { setAuthToken, requireAuth, clearAuthToken, checkAuth } from './middleware/userAuth.js';
import { validateCsrf, clearCsrfCookie, rotateCsrfToken, generateCsrfToken } from './middleware/csrf.js';
import { dashboardLimiter, authLimiter, passwordResetLimiter } from './middleware/rateLimiters.js';
import { sendJSONError, validate, validateItemCreation } from './middleware/validation.js';
import { requireTenant } from './middleware/tenantContext.js';
import { encryptData, decryptData } from './utils/encryption.js';
import { createEmailService } from './utils/email.js';
import { filterLessonsForUser } from './utils/helpers.js';
import { configureOtplib } from './middleware/mfaAuth.js';

import createAuthRoutes from './routes/auth.js';
import createGroupRoutes from './routes/groups.js';
import createSuperAdminRoutes from './routes/superAdmin.js';
import createGroupAdminRoutes from './routes/groupAdmin.js';
import createItemsRoutes from './routes/items.js';
import createTimetableRoutes from './routes/timetable.js';
import createTodosRoutes from './routes/todos.js';
import createUserRoutes from './routes/user.js';
import createMfaRoutes from './routes/mfa.js';
import createDocRoutes from './routes/doc.js';
import createSystemRoutes from './routes/system.js';

export default function registerRoutes(app, deps) {
    const {
        supabase,
        cloudinary,
        resendClient,
        emailConfigured,
        emailFrom,
        authSecret,
        passwordResetSecret,
    } = deps;

    configureOtplib();

    const emailService = createEmailService({
        resendClient,
        emailConfigured,
        emailFrom,
    });

    const routeDeps = {
        ...deps,
        emailService,
        // Middleware
        requireAuth,
        checkAuth,
        setAuthToken,
        clearAuthToken,
        validateCsrf,
        rotateCsrfToken,
        clearCsrfCookie,
        generateCsrfToken,
        requireTenant,
        // Rate limiters
        dashboardLimiter,
        authLimiter,
        passwordResetLimiter,
        // Validation
        sendJSONError,
        validate,
        validateItemCreation,
        // Utils
        encryptData,
        decryptData,
        filterLessonsForUser,
        withThumb,
        timeLeftColor,
    };
    app.use('/api', createSystemRoutes(routeDeps));
    app.use('/api/auth', createAuthRoutes(routeDeps));
    app.use('/api/mfa', createMfaRoutes(routeDeps));
    app.use('/api/groups', createGroupRoutes(routeDeps));
    app.use('/api/admin', createSuperAdminRoutes(routeDeps));
    app.use('/api/group-admin', createGroupAdminRoutes(routeDeps));
    app.use('/api/items', createItemsRoutes(routeDeps));
    app.use('/api/timetable', createTimetableRoutes(routeDeps));
    app.use('/api/user', createUserRoutes(routeDeps));
    app.use('/api/todos', createTodosRoutes(routeDeps));
    app.use('/api/doc', createDocRoutes(routeDeps));
}