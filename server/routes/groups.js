// routes/groups.js
// Handles: join group, create group, switch group, group status, logout
import { Router } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import * as db from '../db/db.js';

const DUMMY_HASH = bcrypt.hashSync('__dummy__', 10);

export default function createGroupRoutes(deps) {
    const router = Router();
    const {
        supabase,
        authSecret,
        setAuthToken,
        clearAuthToken,
        requireAuth,
        checkAuth,
        validateCsrf,
        clearCsrfCookie,
        rotateCsrfToken,
        dashboardLimiter,
        sendJSONError,
        validate,
    } = deps;

    // ─── POST /api/groups/join ──────────────────────────────────────
    router.post('/join',
        dashboardLimiter,
        requireAuth(authSecret, supabase),
        validateCsrf(),
        [
            body('groupName').isString().trim().isLength({ min: 1, max: 100 }),
            body('password').isString().isLength({ min: 1 }),
        ],
        validate,
        async (req, res) => {
            const ip = req.ip;
            const ua = req.get('User-Agent') || 'unknown';
            const { groupName, password } = req.body;
            const userId = req.userId;

            try {
                const group = await db.findGroupByName(supabase, groupName);

                const hashToCompare = group?.passcode_hash || DUMMY_HASH;
                const isValid = await bcrypt.compare(password, hashToCompare);
                const isAuthenticated = group && isValid;

                await db.logSecurityEvent(supabase, {
                    eventType: 'group_join',
                    eventStatus: isAuthenticated ? 'success' : 'failure',
                    ip,
                    userAgent: ua,
                    metadata: { groupName, groupId: group?.id || null, userId },
                });

                if (!isAuthenticated) {
                    return sendJSONError(res, 401, 'Authentifizierung fehlgeschlagen');
                }

                // Add user role if not already present
                const { data: existingRole } = await supabase
                    .from('user_roles')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('role_id', 4) // 'user' role
                    .eq('tenant_id', group.id)
                    .maybeSingle();

                if (!existingRole) {
                    const { error: insertErr } = await supabase
                        .from('user_roles')
                        .insert({ user_id: userId, role_id: 4, tenant_id: group.id });
                    if (insertErr) {
                        console.error('Failed to add user to group:', insertErr);
                        return sendJSONError(res, 500, 'Fehler beim Beitritt zur Gruppe.');
                    }
                }

                setAuthToken(res, authSecret, {
                    userId,
                    email: req.user.email,
                    globalRole: req.user.globalRole,
                    activeGroupId: group.id,
                });

                const newCsrfToken = rotateCsrfToken(res);
                return res.json({ ok: true, csrfToken: newCsrfToken });
            } catch (err) {
                console.error('/api/groups/join error:', err);
                return sendJSONError(res, 500, 'Interner Serverfehler');
            }
        },
    );

    // ─── POST /api/groups/create ────────────────────────────────────
    router.post('/create',
        dashboardLimiter,
        requireAuth(authSecret, supabase),
        validateCsrf(),
        [
            body('groupName').isString().trim().isLength({ min: 1, max: 100 }),
            body('password').isString().isLength({ min: 1 }),
        ],
        validate,
        async (req, res) => {
            const ip = req.ip;
            const ua = req.get('User-Agent') || 'unknown';
            const { groupName, password } = req.body;
            const userId = req.userId;

            try {
                const existingGroup = await db.findGroupByName(supabase, groupName);
                if (existingGroup) {
                    return sendJSONError(res, 409, 'Dieser Gruppenname ist bereits vergeben.');
                }

                const passcodeHash = await bcrypt.hash(password, 12);
                const newGroup = await db.createGroup(supabase, { name: groupName, passcodeHash });

                if (!newGroup?.id) {
                    return sendJSONError(res, 500, 'Gruppe konnte nicht erstellt werden.');
                }

                // Creator becomes admin (role_id 2) of the new group
                const { error: insertErr } = await supabase
                    .from('user_roles')
                    .insert({ user_id: userId, role_id: 2, tenant_id: newGroup.id });

                if (insertErr) {
                    console.error('Failed to assign admin role:', insertErr);
                    return sendJSONError(res, 500, 'Fehler bei der Zuweisung der Administratorrechte.');
                }

                await db.logSecurityEvent(supabase, {
                    eventType: 'group_create',
                    eventStatus: 'success',
                    ip,
                    userAgent: ua,
                    metadata: { groupName: newGroup.name, groupId: newGroup.id, createdBy: userId },
                });

                setAuthToken(res, authSecret, {
                    userId,
                    email: req.user.email,
                    globalRole: req.user.globalRole,
                    activeGroupId: newGroup.id,
                });

                const newCsrfToken = rotateCsrfToken(res);
                return res.json({ ok: true, csrfToken: newCsrfToken });
            } catch (err) {
                console.error('Group creation error:', err);
                await db.logSecurityEvent(supabase, {
                    eventType: 'group_create',
                    eventStatus: 'failure',
                    ip,
                    userAgent: ua,
                    metadata: { groupName },
                });
                return sendJSONError(res, 500, 'Fehler bei der Gruppenerstellung.');
            }
        },
    );

    // ─── GET /api/groups/status ─────────────────────────────────────
    router.get('/status',
        checkAuth(authSecret),
        async (req, res) => {
            if (!req.user) {
                return res.json({ authenticated: false, groups: [] });
            }

            try {
                const { data: userRoles } = await supabase
                    .from('user_roles')
                    .select('tenant_id, groups(id, name), roles(name)')
                    .eq('user_id', req.userId)
                    .not('tenant_id', 'is', null);

                const groups = (userRoles || [])
                    .filter(ur => ur.groups?.id)
                    .map(ur => ({
                        id: ur.groups.id,
                        name: ur.groups.name,
                        role: ur.roles.name,
                    }));

                const activeGroup = groups.find(g => g.id === req.activeGroupId);

                res.json({
                    authenticated: true,
                    group: activeGroup
                        ? { id: activeGroup.id, name: activeGroup.name }
                        : null,
                    groups,
                });
            } catch (err) {
                console.error('GET /api/groups/status error:', err);
                res.json({ authenticated: false, groups: [] });
            }
        },
    );

    // ─── POST /api/groups/switch ────────────────────────────────────
    router.post('/switch',
        dashboardLimiter,
        requireAuth(authSecret, supabase),
        validateCsrf(),
        body('groupId').isUUID(),
        validate,
        async (req, res) => {
            const { groupId } = req.body;
            const userId = req.userId;

            try {
                // Verify user has access to this group via DB (not JWT)
                const { data: membership } = await supabase
                    .from('user_roles')
                    .select('tenant_id, groups(id, name)')
                    .eq('user_id', userId)
                    .eq('tenant_id', groupId)
                    .maybeSingle();

                if (!membership?.groups) {
                    return sendJSONError(res, 403, 'Zugriff auf diese Gruppe nicht erlaubt.');
                }

                setAuthToken(res, authSecret, {
                    userId,
                    email: req.user.email,
                    globalRole: req.user.globalRole,
                    activeGroupId: membership.groups.id,
                });

                const newCsrfToken = rotateCsrfToken(res);
                return res.json({ ok: true, csrfToken: newCsrfToken });
            } catch (err) {
                console.error('POST /api/groups/switch error:', err);
                return sendJSONError(res, 500, 'Fehler beim Gruppenwechsel');
            }
        },
    );

    // ─── POST /api/groups/logout ────────────────────────────────────
    router.post('/logout',
        requireAuth(authSecret, supabase),
        validateCsrf(),
        async (req, res) => {
            await db.logSecurityEvent(supabase, {
                eventType: 'group_logout',
                eventStatus: 'success',
                ip: req.ip,
                userAgent: req.get('User-Agent') || 'unknown',
                metadata: {},
            });

            clearAuthToken(res);
            clearCsrfCookie(res);
            res.json({ ok: true });
        },
    );

    return router;
}