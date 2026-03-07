import { Router } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import * as db from '../db/db.js';

const DUMMY_HASH = bcrypt.hashSync('__dummy__', 10);

export default function createAppGateRoutes(deps) {
    const router = Router();
    const {
        supabase,
        appGateSecret,
        csrfSecret,
        setAppGateToken,
        clearAppGateToken,
        requireAppGate,
        checkAppGate,
        validateCsrf,
        clearCsrfCookie,
        rotateCsrfToken,
        dashboardLimiter,
        sendJSONError,
        validate,
        requireUser,
        userSecret,
    } = deps;

    router.post('/login',
        dashboardLimiter,
        requireUser(userSecret, supabase),
        validateCsrf(csrfSecret),
        [
            body('groupName').isString().trim().isLength({ min: 1, max: 100 }),
            body('password').isString().isLength({ min: 1 })
        ],
        validate,
        async (req, res) => {
            const ip = req.ip;
            const ua = req.get('User-Agent') || 'unknown';
            const { groupName, password } = req.body;
            const userId = req.user.sub;

            try {
                const group = await db.findGroupByName(supabase, groupName);

                const hashToCompare = group?.passcode_hash || DUMMY_HASH;
                const isValid = await bcrypt.compare(password, hashToCompare);
                const isAuthenticated = group && isValid;

                await db.logSecurityEvent(supabase, {
                    eventType: 'group_join',
                    eventStatus: isAuthenticated ? 'success' : 'failure',
                    ip, userAgent: ua,
                    metadata: {
                        groupName,
                        groupId: group?.id || null,
                        userId
                    },
                });

                if (isAuthenticated) {
                    // Check if the user already has role 'user' in this group
                    const { data: existingRole, error: selectErr } = await supabase
                        .from('user_roles')
                        .select('id')
                        .eq('user_id', userId)
                        .eq('role_id', 4)
                        .eq('tenant_id', group.id)
                        .maybeSingle();

                    if (!existingRole) {
                        const { error: insertErr } = await supabase.from('user_roles').insert({
                            user_id: userId,
                            role_id: 4,
                            tenant_id: group.id
                        });
                        if (insertErr) {
                            console.error("Failed to add user to group:", insertErr);
                            return sendJSONError(res, 500, 'Fehler beim Beitritt zur Gruppe.');
                        }
                    }

                    // Fetch all groups the user is now part of to populate JWT
                    const { data: userRoles, error: urError } = await supabase
                        .from('user_roles')
                        .select('tenant_id, groups(id, name), roles(name)')
                        .eq('user_id', userId)
                        .not('tenant_id', 'is', null);

                    if (urError) {
                        console.error("Failed to fetch user roles:", urError);
                        return sendJSONError(res, 500, 'Fehler beim Abrufen der Gruppen.');
                    }

                    const groups = (userRoles || []).map(ur => ({
                        id: ur.groups?.id,
                        name: ur.groups?.name,
                        role: ur.roles?.name
                    })).filter(g => g.id); // Filter out any broken relations

                    setAppGateToken(res, appGateSecret, {
                        userId,
                        activeGroupId: group.id,
                        activeGroupName: group.name,
                        groups
                    });
                    const newCsrfToken = rotateCsrfToken(res, csrfSecret);
                    return res.json({ ok: true, csrfToken: newCsrfToken });
                } else {
                    return sendJSONError(res, 401, 'Authentifizierung fehlgeschlagen');
                }
            } catch (err) {
                console.error('/api/app-gate/login error:', err);
                return sendJSONError(res, 500, 'Interner Serverfehler');
            }
        }
    );

    router.post('/create-group',
        dashboardLimiter,
        requireUser(userSecret, supabase),
        validateCsrf(csrfSecret),
        [
            body('groupName').isString().trim().isLength({ min: 1, max: 100 }),
            body('password').isString().isLength({ min: 1 })
        ],
        validate,
        async (req, res) => {
            const ip = req.ip;
            const ua = req.get('User-Agent') || 'unknown';
            const { groupName, password } = req.body;
            const userId = req.user.sub;

            try {
                // Check if group already exists
                const existingGroup = await db.findGroupByName(supabase, groupName);
                if (existingGroup) {
                    return sendJSONError(res, 409, 'Dieser Gruppenname ist bereits vergeben.');
                }

                // Hash password
                const passcodeHash = await bcrypt.hash(password, 12);

                // Create group
                const newGroup = await db.createGroup(supabase, {
                    name: groupName,
                    passcodeHash
                });

                if (!newGroup || !newGroup.id) {
                    return sendJSONError(res, 500, 'Gruppe konnte nicht erstellt werden.');
                }

                // Assign the creator as an admin (role 2) for this new group
                const { error: insertErr } = await supabase.from('user_roles').insert({
                    user_id: userId,
                    role_id: 2,
                    tenant_id: newGroup.id
                });

                if (insertErr) {
                    console.error("Failed to assign admin role:", insertErr);
                    return sendJSONError(res, 500, 'Fehler bei der Zuweisung der Administratorrechte.');
                }

                // Log activity
                await db.logSecurityEvent(supabase, {
                    eventType: 'group_create',
                    eventStatus: 'success',
                    ip, userAgent: ua,
                    metadata: {
                        groupName: newGroup.name,
                        groupId: newGroup.id,
                        createdBy: userId
                    },
                });

                // Fetch all groups the user is now part of to populate JWT
                const { data: userRoles } = await supabase
                    .from('user_roles')
                    .select('tenant_id, groups(id, name), roles(name)')
                    .eq('user_id', userId)
                    .not('tenant_id', 'is', null);

                const groups = userRoles.map(ur => ({
                    id: ur.groups.id,
                    name: ur.groups.name,
                    role: ur.roles.name
                }));

                // Authenticate user into the new group
                setAppGateToken(res, appGateSecret, {
                    userId,
                    activeGroupId: newGroup.id,
                    activeGroupName: newGroup.name,
                    groups
                });

                const newCsrfToken = rotateCsrfToken(res, csrfSecret);
                return res.json({ ok: true, csrfToken: newCsrfToken });

            } catch (err) {
                console.error('Group creation error:', err);

                await db.logSecurityEvent(supabase, {
                    eventType: 'group_create',
                    eventStatus: 'failure',
                    ip, userAgent: ua,
                    metadata: { groupName },
                });

                return sendJSONError(res, 500, 'Fehler bei der Gruppenerstellung.');
            }
        }
    );

    router.get('/status',
        checkAppGate(appGateSecret),
        (req, res) => res.json({
            authenticated: req.appGate,
            ...(req.appGateGroup ? { group: req.appGateGroup } : {}),
            groups: req.userGroups || []
        })
    );

    router.post('/logout',
        requireAppGate(appGateSecret),
        validateCsrf(csrfSecret),
        async (req, res) => {
            await db.logSecurityEvent(supabase, {
                eventType: 'app_gate_logout',
                eventStatus: 'success',
                ip: req.ip,
                userAgent: req.get('User-Agent') || 'unknown',
                metadata: {},
            });

            clearAppGateToken(res);
            clearCsrfCookie(res);
            res.json({ ok: true });
        }
    );

    router.post('/switch-group',
        dashboardLimiter,
        requireAppGate(appGateSecret),
        validateCsrf(csrfSecret),
        [
            body('groupId').isUUID()
        ],
        validate,
        async (req, res) => {
            const { groupId } = req.body;

            // req.userGroups contains all groups the user has access to from the current JWT
            const group = req.userGroups.find(g => g.id === groupId);

            if (!group) {
                return sendJSONError(res, 403, 'Zugriff auf diese Gruppe nicht erlaubt oder Gruppe existiert nicht.');
            }

            // reissue the token with the switched active group
            setAppGateToken(res, appGateSecret, {
                userId: req.userId,
                activeGroupId: group.id,
                activeGroupName: group.name,
                groups: req.userGroups
            });

            const newCsrfToken = rotateCsrfToken(res, csrfSecret);
            return res.json({ ok: true, csrfToken: newCsrfToken });
        }
    );

    return router;
}
