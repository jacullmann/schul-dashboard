import type { Request, Response } from 'express';
// routes/superAdmin.ts
// Global super-admin routes: user management, reports, sorgen, global stats
import { Router } from 'express';
import { body, param } from 'express-validator';
import * as db from '../db/db.js';
import type { RouteDeps, ItemImage } from '../types/index.js';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function createSuperAdminRoutes(deps: RouteDeps): Router {
  const router = Router();
  const {
    supabase,
    cloudinary,
    authSecret,
    requireAuth,
    requireTenant,
    validateCsrf,
    sendJSONError,
    validate,
  } = deps;

  // Global superadmin (no tenant needed)
  const sa = [requireAuth(authSecret, supabase, 'superadmin')];

  // Superadmin + tenant context
  const saTenant = [
    requireAuth(authSecret, supabase, 'superadmin'),
    requireTenant(supabase),
  ];

  // ─── Stats (tenant-scoped for item counts) ──────────────────────
  router.get('/stats', ...saTenant, async (req: Request, res: Response) => {
    try {
      const ninetyDaysAgo = new Date(Date.now() - NINETY_DAYS_MS).toISOString();
      const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

      const [
        userCount,
        itemCount,
        bannedCount,
        reportCountUnprocessed,
        reportCountTotal,
        sorgeCountUnprocessed,
        sorgeCountTotal,
        itemsByType,
        verifiedUsers,
        adminCount,
        oldItemsCount,
        newUsersThisWeek,
        newItemsThisWeek,
        topCreators,
      ] = await Promise.all([
        db.countUsers(supabase),
        db.countItems(supabase, req.tenantId!),
        db.countBanned(supabase),
        db.countReports(supabase, { processed: false }),
        db.countReports(supabase),
        db.countSorgen(supabase, { processed: false }),
        db.countSorgen(supabase),
        db.getItemsByTypeCount(supabase, req.tenantId!),
        db.countUsers(supabase, { email_verified: true }),
        supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role_id', 1)
          .then(({ count }) => count || 0),
        db.countItemsOlderThan(supabase, req.tenantId!, ninetyDaysAgo),
        db.countUsersSince(supabase, sevenDaysAgo),
        db.countItemsSince(supabase, req.tenantId!, sevenDaysAgo),
        db.getTopCreators(supabase, req.tenantId!, 5),
      ]);

      res.json({
        userCount,
        itemCount,
        bannedCount,
        reportCount: reportCountUnprocessed,
        reportCountTotal,
        reportCountProcessed: reportCountTotal - reportCountUnprocessed,
        sorgeCount: sorgeCountUnprocessed,
        sorgeCountTotal,
        sorgeCountProcessed: sorgeCountTotal - sorgeCountUnprocessed,
        itemsByType: itemsByType.map((t) => ({ _id: t.type, count: t.count })),
        verifiedUsers,
        unverifiedUsers: userCount - verifiedUsers,
        adminCount,
        oldItemsCount,
        newUsersThisWeek,
        newItemsThisWeek,
        topCreators,
      });
    } catch (err) {
      console.error('GET /api/admin/stats error', err);
      sendJSONError(res, 500, 'Serverfehler beim Laden der Statistiken');
    }
  });

  // ─── Cleanup ────────────────────────────────────────────────────
  router.delete(
    '/cleanup/old-items',
    ...saTenant,
    validateCsrf(),
    async (req: Request, res: Response) => {
      try {
        const ninetyDaysAgo = new Date(
          Date.now() - NINETY_DAYS_MS,
        ).toISOString();
        const oldItems = await db.findOldItems(
          supabase,
          req.tenantId!,
          ninetyDaysAgo,
        );

        const publicIdsToDelete: string[] = [];
        const itemIds = oldItems.map((item) => {
          (item.images || []).forEach((img: ItemImage) => {
            if (img.publicId) publicIdsToDelete.push(img.publicId);
          });
          return item.id;
        });

        if (publicIdsToDelete.length > 0) {
          const batches: string[][] = [];
          for (let i = 0; i < publicIdsToDelete.length; i += 100) {
            batches.push(publicIdsToDelete.slice(i, i + 100));
          }

          await Promise.all(
            batches.map(async (batch) => {
              try {
                await cloudinary.api.delete_resources(batch);
              } catch (e) {
                console.error('Cloudinary batch delete error:', e);
              }
            }),
          );
        }

        await db.deleteItemsOlderThan(supabase, req.tenantId!, ninetyDaysAgo);
        await db.logActivity(
          supabase,
          req.user!.sub,
          'admin:cleanup:old_items',
          {
            deletedCount: itemIds.length,
            imagesDeleted: publicIdsToDelete.length,
          },
        );

        res.json({
          ok: true,
          deletedItems: itemIds.length,
          deletedImages: publicIdsToDelete.length,
          message: `${itemIds.length} Einträge und ${publicIdsToDelete.length} Bilder gelöscht.`,
        });
      } catch (err) {
        console.error('DELETE /api/admin/cleanup/old-items error', err);
        sendJSONError(res, 500, 'Fehler beim Bereinigen alter Einträge');
      }
    },
  );

  // ─── All groups (for superadmin overview) ───────────────────────
  router.get('/groups', ...sa, async (_req: Request, res: Response) => {
    try {
      const { data: groups, error } = await supabase
        .from('groups')
        .select('id, name, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const result = await Promise.all(
        (
          (groups || []) as Array<{
            id: string;
            name: string;
            created_at: string;
          }>
        ).map(async (g) => {
          const { count } = await supabase
            .from('user_roles')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', g.id);
          return { ...g, memberCount: count || 0 };
        }),
      );

      res.json(result);
    } catch (err) {
      console.error('GET /api/admin/groups error', err);
      sendJSONError(res, 500, 'Fehler beim Laden der Gruppen');
    }
  });

  // ─── Users ──────────────────────────────────────────────────────
  router.get('/all-users', ...sa, async (_req: Request, res: Response) => {
    try {
      const users = await db.listUsers(supabase, {
        select:
          'id, email, user_roles(roles(name)), email_verified, created_at, last_login_at, enr_kurs, wpu_kurs_1, wpu_kurs_2, theater, done_setup',
      });
      const bannedIds = new Set(await db.listBannedUserIds(supabase));

      res.json(
        users.map((u) => ({
          id: u.id,
          email: u.email,
          role:
            (
              u.user_roles as
                | Array<{
                    tenant_id?: string | null;
                    roles?: { name: string } | null;
                  }>
                | undefined
            )?.find((ur) => !ur.tenant_id)?.roles?.name || 'user',
          emailVerified: u.email_verified,
          createdAt: u.created_at,
          lastLoginAt: u.last_login_at,
          enrKurs: u.enr_kurs,
          wpuKurs1: u.wpu_kurs_1,
          wpuKurs2: u.wpu_kurs_2,
          theater: u.theater,
          doneSetup: u.done_setup,
          isBanned: bannedIds.has(u.id as string),
        })),
      );
    } catch (err) {
      console.error('GET /api/admin/all-users error', err);
      sendJSONError(res, 500, 'Server error');
    }
  });

  router.get(
    '/users/:id/activity',
    ...sa,
    async (req: Request, res: Response) => {
      try {
        const activity = await db.getUserActivity(supabase, req.params.id!, {
          limit: 200,
        });
        res.json(
          activity.map((a) => ({
            at: a.created_at,
            type: a.type,
            meta: a.meta,
          })),
        );
      } catch {
        sendJSONError(res, 500, 'Server error');
      }
    },
  );

  router.post(
    '/users/:id/ban',
    ...sa,
    validateCsrf(),
    param('id').isUUID(),
    validate,
    async (req: Request, res: Response) => {
      try {
        const target = await db.findUserById(
          supabase,
          req.params.id!,
          'id, user_roles(roles(name))',
        );
        if (!target) {
          sendJSONError(res, 404, 'Benutzer nicht gefunden');
          return;
        }
        const targetRoles = target.user_roles as
          | Array<{ roles?: { name: string } | null }>
          | undefined;
        if (targetRoles?.some((ur) => ur.roles?.name === 'superadmin')) {
          sendJSONError(res, 400, 'Admins können nicht gesperrt werden.');
          return;
        }
        await db.banUser(supabase, target.id as string);
        await db.logActivity(supabase, req.user!.sub, 'admin:ban:user', {
          targetUserId: target.id,
        });
        res.json({ ok: true, isBanned: true });
      } catch {
        sendJSONError(res, 500, 'Server error');
      }
    },
  );

  router.delete(
    '/users/:id/ban',
    ...sa,
    validateCsrf(),
    param('id').isUUID(),
    validate,
    async (req: Request, res: Response) => {
      try {
        await db.unbanUser(supabase, req.params.id!);
        await db.logActivity(supabase, req.user!.sub, 'admin:unban:user', {
          targetUserId: req.params.id!,
        });
        res.json({ ok: true, isBanned: false });
      } catch {
        sendJSONError(res, 500, 'Server error');
      }
    },
  );

  router.delete(
    '/users/:id',
    ...sa,
    validateCsrf(),
    param('id').isUUID(),
    validate,
    async (req: Request, res: Response) => {
      try {
        const target = await db.findUserById(
          supabase,
          req.params.id!,
          'id, user_roles(roles(name))',
        );
        if (!target) {
          sendJSONError(res, 404, 'Benutzer nicht gefunden');
          return;
        }
        const targetRoles = target.user_roles as
          | Array<{ roles?: { name: string } | null }>
          | undefined;
        if (targetRoles?.some((ur) => ur.roles?.name === 'superadmin')) {
          sendJSONError(res, 403, 'Admins können nicht gelöscht werden');
          return;
        }
        await db.deleteUser(supabase, req.params.id!);
        res.json({ ok: true });
      } catch {
        sendJSONError(res, 500, 'Server error');
      }
    },
  );

  router.patch(
    '/users/:id',
    ...sa,
    validateCsrf(),
    body('role').isString(),
    validate,
    async (req: Request, res: Response) => {
      try {
        if ((req.body as { role: string }).role === 'superadmin') {
          const { data: existing } = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', req.params.id!)
            .eq('role_id', 1)
            .is('tenant_id', null)
            .maybeSingle();
          if (!existing) {
            await supabase.from('user_roles').insert({
              user_id: req.params.id!,
              role_id: 1,
              tenant_id: null,
            });
          }
        } else {
          await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', req.params.id!)
            .eq('role_id', 1)
            .is('tenant_id', null);
        }
        res.json({ ok: true });
      } catch {
        sendJSONError(res, 500, 'Server error');
      }
    },
  );

  router.delete(
    '/users/:id/activity/prune',
    ...sa,
    validateCsrf(),
    param('id').isUUID(),
    validate,
    async (req: Request, res: Response) => {
      try {
        await db.pruneActivity(supabase, req.params.id!, 30);
        await db.logActivity(supabase, req.user!.sub, 'admin:prune_logs', {
          targetUserId: req.params.id!,
        });
        res.json({ ok: true, message: 'Logs bereinigt.' });
      } catch {
        sendJSONError(res, 500, 'Fehler beim Bereinigen');
      }
    },
  );

  // ─── Reports ────────────────────────────────────────────────────
  router.get('/reports', ...sa, async (_req: Request, res: Response) => {
    try {
      const reports = await db.listReports(supabase);
      res.json(
        reports.map((r) => ({
          id: r.id,
          itemId: r.item_id,
          itemTitle: r.item_title,
          category: r.category,
          reason: r.reason,
          reportedBy: r.reporter_id,
          reporterEmail: r.reporter_email,
          processed: r.processed,
          processedAt: r.processed_at,
          reportedAt: r.reported_at,
        })),
      );
    } catch {
      sendJSONError(res, 500, 'Server error');
    }
  });

  router.patch(
    '/reports/:id/processed',
    ...sa,
    validateCsrf(),
    param('id').isUUID(),
    body('processed').isBoolean(),
    validate,
    async (req: Request, res: Response) => {
      try {
        const { processed } = req.body as { processed: boolean };
        const report = await db.updateReport(supabase, req.params.id!, {
          processed,
          processed_at: processed ? new Date().toISOString() : null,
          processed_by: processed ? req.user!.sub : null,
        });
        await db.logActivity(
          supabase,
          req.user!.sub,
          processed
            ? 'admin:report:mark_processed'
            : 'admin:report:mark_unprocessed',
          { reportId: req.params.id! },
        );
        res.json({
          ok: true,
          processed: report.processed,
          processedAt: report.processed_at,
        });
      } catch {
        sendJSONError(res, 500, 'Serverfehler');
      }
    },
  );

  router.delete(
    '/reports/:id',
    ...sa,
    validateCsrf(),
    param('id').isUUID(),
    validate,
    async (req: Request, res: Response) => {
      try {
        await db.deleteReport(supabase, req.params.id!);
        await db.logActivity(supabase, req.user!.sub, 'admin:report:delete', {
          reportId: req.params.id!,
        });
        res.json({ ok: true });
      } catch {
        sendJSONError(res, 500, 'Serverfehler');
      }
    },
  );

  // ─── Sorgen ─────────────────────────────────────────────────────
  router.get('/sorgen', ...sa, async (_req: Request, res: Response) => {
    try {
      const sorgen = await db.listSorgen(supabase);
      res.json(
        sorgen.map((s) => ({
          id: s.id,
          message: s.message,
          processed: s.processed,
          processedAt: s.processed_at,
          createdAt: s.created_at,
        })),
      );
    } catch {
      sendJSONError(res, 500, 'Server error');
    }
  });

  router.patch(
    '/sorgen/:id/processed',
    ...sa,
    validateCsrf(),
    param('id').isUUID(),
    body('processed').isBoolean(),
    validate,
    async (req: Request, res: Response) => {
      try {
        const { processed } = req.body as { processed: boolean };
        const sorge = await db.updateSorge(supabase, req.params.id!, {
          processed,
          processed_at: processed ? new Date().toISOString() : null,
          processed_by: processed ? req.user!.sub : null,
        });
        await db.logActivity(
          supabase,
          req.user!.sub,
          processed
            ? 'admin:sorge:mark_processed'
            : 'admin:sorge:mark_unprocessed',
          { sorgeId: req.params.id! },
        );
        res.json({
          ok: true,
          processed: sorge.processed,
          processedAt: sorge.processed_at,
        });
      } catch {
        sendJSONError(res, 500, 'Serverfehler');
      }
    },
  );

  router.delete(
    '/sorgen/:id',
    ...sa,
    validateCsrf(),
    param('id').isUUID(),
    validate,
    async (req: Request, res: Response) => {
      try {
        await db.deleteSorge(supabase, req.params.id!);
        res.json({ ok: true });
      } catch {
        sendJSONError(res, 500, 'Serverfehler');
      }
    },
  );

  // ─── Subjects (tenant-scoped) ───────────────────────────────────
  router.post(
    '/subjects',
    ...saTenant,
    validateCsrf(),
    body('name').isString().isLength({ min: 2, max: 50 }),
    validate,
    async (req: Request, res: Response) => {
      try {
        await db.upsertSubject(
          supabase,
          req.tenantId!,
          (req.body as { name: string }).name,
        );
        res.status(201).json({ ok: true });
      } catch {
        sendJSONError(res, 500, 'Server error');
      }
    },
  );

  router.delete(
    '/subjects/:name',
    ...saTenant,
    validateCsrf(),
    async (req: Request, res: Response) => {
      try {
        await db.deleteSubject(supabase, req.tenantId!, req.params.name!);
        res.json({ ok: true });
      } catch {
        sendJSONError(res, 500, 'Server error');
      }
    },
  );

  // ─── Timetable Subs (tenant-scoped, superadmin) ─────────────────
  router.get(
    '/timetable/subs',
    ...saTenant,
    async (req: Request, res: Response) => {
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
        sendJSONError(res, 500, 'Serverfehler');
      }
    },
  );

  router.post(
    '/timetable/subs',
    ...saTenant,
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
        const newSub = await db.createTimetableSub(
          supabase,
          req.tenantId!,
          req.body,
        );
        await db.logActivity(supabase, req.user!.sub, 'timetable:sub:create', {
          lessonId: (req.body as { lessonId: string }).lessonId,
        });
        res.status(201).json(newSub);
      } catch {
        sendJSONError(res, 500, 'Serverfehler');
      }
    },
  );

  router.delete(
    '/timetable/subs/:id',
    ...saTenant,
    validateCsrf(),
    param('id').isUUID(),
    validate,
    async (req: Request, res: Response) => {
      try {
        const deleted = await db.deleteTimetableSub(
          supabase,
          req.tenantId!,
          req.params.id!,
        );
        await db.logActivity(supabase, req.user!.sub, 'timetable:sub:delete', {
          lessonId: deleted.lesson_id,
        });
        res.json({ ok: true });
      } catch {
        sendJSONError(res, 500, 'Serverfehler');
      }
    },
  );

  return router;
}
