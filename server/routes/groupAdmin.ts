import type { Request, Response } from 'express';
import { Router } from 'express';
import { body, param } from 'express-validator';
import * as db from '../db/db.js';
import type { RouteDeps, ItemImage } from '../types/index.js';
import { generateUserName } from '../utils/nameGenerator.js';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export default function createGroupAdminRoutes(deps: RouteDeps): Router {
  const router = Router();
  const {
    supabase,
    cloudinary,
    authSecret,
    requireAuth,
    validateCsrf,
    sendJSONError,
    validate,
  } = deps;

  // admin or moderator of the active tenant
  const ga = [requireAuth(authSecret, supabase, ['admin', 'moderator'])];
  // admin only (for destructive/sensitive actions)
  const adminOnly = [requireAuth(authSecret, supabase, ['admin'])];

  // ─── Stats ──────────────────────────────────────────────────────
  router.get('/stats', ...ga, async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const ninetyDaysAgo = new Date(Date.now() - NINETY_DAYS_MS).toISOString();

      const [itemCount, subsCount, oldItemsCount] = await Promise.all([
        db.countItems(supabase, tenantId),
        db.listTimetableSubs(supabase, tenantId).then((s) => s.length),
        db.countItemsOlderThan(supabase, tenantId, ninetyDaysAgo),
      ]);

      // Count members
      const { count: memberCount } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId);

      res.json({ itemCount, subsCount, oldItemsCount, memberCount: memberCount || 0 });
    } catch (err) {
      console.error('GET /api/group-admin/stats error', err);
      sendJSONError(res, 500, 'Serverfehler');
    }
  });

  // ─── Members List ───────────────────────────────────────────────
  router.get('/members', ...ga, async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;

      const { data: userRoles, error } = await supabase
          .from('user_roles')
          .select('user_id, assigned_at, roles(name)')
          .eq('tenant_id', tenantId);

      if (error) throw error;

      type RoleRow = {
        user_id: string;
        assigned_at: string;
        roles: { name: string } | null;
      };

      const members = ((userRoles || []) as unknown as RoleRow[]).map((ur) => ({
        userId: ur.user_id,
        generatedName: generateUserName(ur.user_id, tenantId),
        role: ur.roles?.name || 'user',
        joinedAt: ur.assigned_at,
      }));

      // Sort: admins first, then moderators, then users
      const roleOrder: Record<string, number> = { admin: 0, moderator: 1, user: 2 };
      members.sort((a, b) => (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3));

      res.json(members);
    } catch (err) {
      console.error('GET /api/group-admin/members error', err);
      sendJSONError(res, 500, 'Fehler beim Laden der Mitglieder');
    }
  });

  // ─── Change Member Role ─────────────────────────────────────────
  router.patch(
      '/members/:userId/role',
      ...adminOnly,
      validateCsrf(),
      param('userId').isUUID(),
      body('role').isIn(['user', 'moderator', 'admin']),
      validate,
      async (req: Request, res: Response) => {
        try {
          const tenantId = req.tenantId!;
          const targetUserId = req.params.userId!;
          const newRole = (req.body as { role: string }).role;

          // Prevent self-demotion
          if (targetUserId === req.userId) {
            sendJSONError(res, 400, 'Du kannst deine eigene Rolle nicht ändern.');
            return;
          }

          // Map role name to role_id
          const roleMap: Record<string, number> = { admin: 2, moderator: 3, user: 4 };
          const roleId = roleMap[newRole];
          if (!roleId) {
            sendJSONError(res, 400, 'Ungültige Rolle');
            return;
          }

          // Check if target user is a member
          const { data: existing } = await supabase
              .from('user_roles')
              .select('id, role_id')
              .eq('user_id', targetUserId)
              .eq('tenant_id', tenantId)
              .maybeSingle();

          if (!existing) {
            sendJSONError(res, 404, 'Nutzer ist kein Mitglied dieser Gruppe');
            return;
          }

          // Update role
          const { error: updateErr } = await supabase
              .from('user_roles')
              .update({ role_id: roleId })
              .eq('id', existing.id);

          if (updateErr) throw updateErr;

          await db.logActivity(supabase, req.userId!, 'group-admin:change-role', {
            targetUserId,
            newRole,
            tenantId,
          });

          res.json({ ok: true, message: `Rolle zu "${newRole}" geändert.` });
        } catch (err) {
          console.error('PATCH /api/group-admin/members/:userId/role error', err);
          sendJSONError(res, 500, 'Fehler bei der Rollenänderung');
        }
      },
  );

  // ─── Remove Member from Group ───────────────────────────────────
  router.delete(
      '/members/:userId',
      ...adminOnly,
      validateCsrf(),
      param('userId').isUUID(),
      validate,
      async (req: Request, res: Response) => {
        try {
          const tenantId = req.tenantId!;
          const targetUserId = req.params.userId!;

          // Prevent self-removal
          if (targetUserId === req.userId) {
            sendJSONError(res, 400, 'Du kannst dich nicht selbst entfernen.');
            return;
          }

          // Check if target is admin — only other admins can remove admins
          const { data: targetRole } = await supabase
              .from('user_roles')
              .select('id, roles(name)')
              .eq('user_id', targetUserId)
              .eq('tenant_id', tenantId)
              .maybeSingle();

          if (!targetRole) {
            sendJSONError(res, 404, 'Nutzer ist kein Mitglied dieser Gruppe');
            return;
          }

          const targetRoleName = (targetRole as any)?.roles?.name;
          if (targetRoleName === 'admin') {
            sendJSONError(res, 403, 'Admins können nicht entfernt werden.');
            return;
          }

          // Remove the user_roles entry for this tenant
          const { error: delErr } = await supabase
              .from('user_roles')
              .delete()
              .eq('user_id', targetUserId)
              .eq('tenant_id', tenantId);

          if (delErr) throw delErr;

          await db.logActivity(supabase, req.userId!, 'group-admin:remove-member', {
            targetUserId,
            tenantId,
          });

          res.json({ ok: true, message: 'Mitglied entfernt.' });
        } catch (err) {
          console.error('DELETE /api/group-admin/members/:userId error', err);
          sendJSONError(res, 500, 'Fehler beim Entfernen des Mitglieds');
        }
      },
  );

  // ─── Group Settings (rename) ────────────────────────────────────
  router.patch(
      '/settings',
      ...adminOnly,
      validateCsrf(),
      body('name').optional().isString().trim().isLength({ min: 1, max: 100 }),
      validate,
      async (req: Request, res: Response) => {
        try {
          const tenantId = req.tenantId!;
          const { name } = req.body as { name?: string };

          if (name) {
            // Check if name is already taken
            const existing = await db.findGroupByName(supabase, name);
            if (existing && existing.id !== tenantId) {
              sendJSONError(res, 409, 'Dieser Gruppenname ist bereits vergeben.');
              return;
            }

            const { error } = await supabase
                .from('groups')
                .update({ name: name.trim() })
                .eq('id', tenantId);

            if (error) throw error;

            await db.logActivity(supabase, req.userId!, 'group-admin:rename-group', {
              tenantId,
              newName: name.trim(),
            });
          }

          res.json({ ok: true });
        } catch (err) {
          console.error('PATCH /api/group-admin/settings error', err);
          sendJSONError(res, 500, 'Fehler beim Speichern der Einstellungen');
        }
      },
  );

  // ─── Cleanup old items ──────────────────────────────────────────
  router.delete(
      '/cleanup/old-items',
      ...ga,
      validateCsrf(),
      async (req: Request, res: Response) => {
        try {
          const ninetyDaysAgo = new Date(Date.now() - NINETY_DAYS_MS).toISOString();
          const oldItems = await db.findOldItems(supabase, req.tenantId!, ninetyDaysAgo);

          const publicIdsToDelete: string[] = [];
          const itemIds = oldItems.map((item) => {
            (item.images || []).forEach((img: ItemImage) => {
              if (img.publicId) publicIdsToDelete.push(img.publicId);
            });
            return item.id;
          });

          if (publicIdsToDelete.length > 0) {
            for (let i = 0; i < publicIdsToDelete.length; i += 100) {
              try {
                await cloudinary.api.delete_resources(publicIdsToDelete.slice(i, i + 100));
              } catch (e) {
                console.error('Cloudinary batch delete error:', e);
              }
            }
          }

          await db.deleteItemsOlderThan(supabase, req.tenantId!, ninetyDaysAgo);
          await db.logActivity(supabase, req.userId!, 'group-admin:cleanup', {
            deletedCount: itemIds.length,
          });

          res.json({
            ok: true,
            deletedItems: itemIds.length,
            deletedImages: publicIdsToDelete.length,
            message: `${itemIds.length} Einträge gelöscht.`,
          });
        } catch {
          sendJSONError(res, 500, 'Fehler beim Bereinigen');
        }
      },
  );

  // ─── Timetable subs ─────────────────────────────────────────────
  router.get('/timetable/subs', ...ga, async (req: Request, res: Response) => {
    try {
      const subs = await db.listTimetableSubs(supabase, req.tenantId!);
      res.json(
          subs.map((s) => ({
            id: s.id,
            lessonId: s.lesson_id,
            day: s.day,
            slot: s.slot,
            duration: s.duration,
            subject: s.subject,
            teacher: s.teacher,
            room: s.room,
            cancelled: s.cancelled,
            hide: s.hide,
            createdAt: s.created_at,
          })),
      );
    } catch {
      sendJSONError(res, 500, 'Fehler beim Laden der Substitutions');
    }
  });

  router.post(
      '/timetable/subs',
      ...ga,
      validateCsrf(),
      [
        body('lessonId').isUUID(),
        body('day').optional().isString(),
        body('slot').optional().isInt(),
        body('duration').optional().isInt(),
        body('subject').optional().isString(),
        body('teacher').optional().isString(),
        body('room').optional().isString(),
        body('cancelled').optional().isBoolean(),
        body('hide').optional().isBoolean(),
      ],
      validate,
      async (req: Request, res: Response) => {
        try {
          const newSub = await db.createTimetableSub(supabase, req.tenantId!, req.body);
          await db.logActivity(supabase, req.userId!, 'timetable:sub:create', {
            lessonId: (req.body as { lessonId: string }).lessonId,
          });
          res.status(201).json(newSub);
        } catch {
          sendJSONError(res, 500, 'Fehler beim Speichern');
        }
      },
  );

  router.delete(
      '/timetable/subs/:id',
      ...ga,
      validateCsrf(),
      param('id').isUUID(),
      validate,
      async (req: Request, res: Response) => {
        try {
          await db.deleteTimetableSub(supabase, req.tenantId!, req.params.id!);
          res.json({ ok: true });
        } catch {
          sendJSONError(res, 500, 'Fehler beim Löschen');
        }
      },
  );

  // ─── Announcements ──────────────────────────────────────────────
  router.post(
      '/announcements',
      ...ga,
      validateCsrf(),
      body('content').isString().isLength({ min: 2 }),
      body('color').optional().isIn(['info', 'warn', 'danger']),
      body('showAsPopup').optional().isBoolean(),
      validate,
      async (req: Request, res: Response) => {
        try {
          const b = req.body as { content: string; color?: string; showAsPopup?: boolean };
          const ann = await db.createAnnouncement(supabase, req.tenantId!, {
            content: b.content,
            color: b.color || 'warn',
            showAsPopup: b.showAsPopup || false,
            createdBy: req.userId!,
          });
          res.status(201).json({
            id: ann.id,
            content: ann.content,
            color: ann.color,
            showAsPopup: ann.show_as_popup,
            createdBy: ann.created_by,
            createdAt: ann.created_at,
          });
        } catch {
          sendJSONError(res, 500, 'Fehler beim Erstellen');
        }
      },
  );

  router.delete(
      '/announcements/:id',
      ...ga,
      validateCsrf(),
      param('id').isUUID(),
      validate,
      async (req: Request, res: Response) => {
        try {
          const ann = await db.findAnnouncementById(supabase, req.tenantId!, req.params.id!);
          if (!ann) {
            sendJSONError(res, 404, 'Nicht gefunden');
            return;
          }
          await db.deleteAnnouncement(supabase, req.tenantId!, req.params.id!);
          res.json({ ok: true });
        } catch {
          sendJSONError(res, 500, 'Fehler beim Löschen');
        }
      },
  );

  return router;
}