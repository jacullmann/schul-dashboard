import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { v2 as cloudinary } from 'cloudinary';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class SuperAdminService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getStats(tenantId: string) {
    const sb = this.supabaseService.getClient();
    const ninetyDaysAgo = new Date(Date.now() - NINETY_DAYS_MS).toISOString();
    const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

    const { count: userCount } = await sb
      .from('users')
      .select('*', { count: 'exact', head: true });
    const { count: itemCount } = await sb
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    const { count: bannedCount } = await sb
      .from('banned_users')
      .select('*', { count: 'exact', head: true });
    const { count: reportCountUnprocessed } = await sb
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('processed', false);
    const { count: reportCountTotal } = await sb
      .from('reports')
      .select('*', { count: 'exact', head: true });

    // RPC calls: handled gracefully — if the function does not exist in the
    // database, we fall back to empty data rather than throwing a 500 error.
    const { data: itemsByTypeRaw, error: itemsByTypeError } = await sb.rpc(
      'get_items_by_type_count',
      { t_id: tenantId },
    );
    if (itemsByTypeError) {
      console.warn(
        'RPC get_items_by_type_count unavailable:',
        itemsByTypeError.message,
      );
    }

    const { count: verifiedUsers } = await sb
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('email_verified', true);
    const { count: adminCount } = await sb
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', 1)
      .is('tenant_id', null);
    const { count: oldItemsCount } = await sb
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .lt('created_at', ninetyDaysAgo);
    const { count: newUsersThisWeek } = await sb
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo);
    const { count: newItemsThisWeek } = await sb
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', sevenDaysAgo);

    const { data: topCreatorsRaw, error: topCreatorsError } = (await sb.rpc(
      'get_top_creators',
      { t_id: tenantId, limit_count: 5 },
    )) as { data: any; error: any };
    if (topCreatorsError) {
      console.warn(
        'RPC get_top_creators unavailable:',
        topCreatorsError.message,
      );
    }

    return {
      userCount: userCount || 0,
      itemCount: itemCount || 0,
      bannedCount: bannedCount || 0,
      reportCount: reportCountUnprocessed || 0,
      reportCountTotal: reportCountTotal || 0,
      reportCountProcessed:
        (reportCountTotal || 0) - (reportCountUnprocessed || 0),
      itemsByType: (itemsByTypeRaw || []).map((t: any) => {
        const row = t as Record<string, any>;
        return { _id: row.type, count: row.count };
      }),
      verifiedUsers: verifiedUsers || 0,
      unverifiedUsers: (userCount || 0) - (verifiedUsers || 0),
      adminCount: adminCount || 0,
      oldItemsCount: oldItemsCount || 0,
      newUsersThisWeek: newUsersThisWeek || 0,
      newItemsThisWeek: newItemsThisWeek || 0,
      topCreators: topCreatorsRaw || [],
    };
  }

  async cleanupOldItems(tenantId: string, currentUserId: string) {
    const sb = this.supabaseService.getClient();
    const ninetyDaysAgo = new Date(Date.now() - NINETY_DAYS_MS).toISOString();

    const { data: oldItems } = await sb
      .from('items')
      .select('id, images')
      .eq('tenant_id', tenantId)
      .lt('created_at', ninetyDaysAgo);

    const publicIdsToDelete: string[] = [];
    const itemIds = (oldItems || []).map((item) => {
      const row = item as Record<string, any>;
      ((row.images as any[]) || []).forEach((img: any) => {
        const imgRow = img as Record<string, any>;
        if (imgRow.publicId) publicIdsToDelete.push(imgRow.publicId as string);
      });
      return row.id;
    });

    if (publicIdsToDelete.length > 0) {
      const batches: string[][] = [];
      for (let i = 0; i < publicIdsToDelete.length; i += 100) {
        batches.push(publicIdsToDelete.slice(i, i + 100));
      }
      await Promise.all(
        batches.map(async (batch) => {
          try {
            await (cloudinary.api as any).delete_resources(batch);
          } catch (e) {
            console.error('Cloudinary batch delete error:', e);
          }
        }),
      );
    }

    await sb
      .from('items')
      .delete()
      .eq('tenant_id', tenantId)
      .lt('created_at', ninetyDaysAgo);

    const { error: activityInsertError } = (await sb
      .from('user_activity')
      .insert({
        user_id: currentUserId,
        type: 'admin:cleanup:old_items',
        meta: {
          deletedCount: itemIds.length,
          imagesDeleted: publicIdsToDelete.length,
        },
      })) as { error: any };
    if (activityInsertError)
      throw new InternalServerErrorException('Failed to save user activity');

    return {
      ok: true,
      deletedItems: itemIds.length,
      deletedImages: publicIdsToDelete.length,
      message: `${itemIds.length} entries and ${publicIdsToDelete.length} images deleted.`,
    };
  }

  async getGroups() {
    const sb = this.supabaseService.getClient();
    const { data: groups } = await sb
      .from('groups')
      .select('id, name, created_at')
      .order('created_at', { ascending: false });

    const result = await Promise.all(
      (groups || []).map(async (g) => {
        const row = g as Record<string, any>;
        const { count } = await sb
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', row.id);
        return { ...row, memberCount: count || 0 };
      }),
    );

    return result;
  }

  async getAllUsers() {
    const sb = this.supabaseService.getClient();
    const { data: users } = await sb
      .from('users')
      .select(
        'id, email, user_roles(tenant_id, roles(name)), email_verified, created_at, last_login_at, enr_kurs, wpu_kurs_1, wpu_kurs_2, theater, done_setup',
      );
    const { data: bannedData } = await sb
      .from('banned_users')
      .select('user_id');
    const bannedIds = new Set(
      (bannedData || []).map((b) => (b as Record<string, any>).user_id),
    );

    return (users || []).map((u: any) => {
      const row = u as Record<string, any>;
      return {
        id: row.id,
        email: row.email,
        role:
          (row.user_roles as any[])?.find((ur: any) => !ur.tenant_id)?.roles
            ?.name || 'user',
        emailVerified: row.email_verified,
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at,
        enrKurs: row.enr_kurs,
        wpuKurs1: row.wpu_kurs_1,
        wpuKurs2: row.wpu_kurs_2,
        theater: row.theater,
        doneSetup: row.done_setup,
        isBanned: bannedIds.has(row.id),
      };
    });
  }

  async getUserActivity(userId: string) {
    const sb = this.supabaseService.getClient();
    const { data } = await sb
      .from('user_activity')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);
    return (data || []).map((a) => {
      const row = a as Record<string, any>;
      return { at: row.created_at, type: row.type, meta: row.meta };
    });
  }

  async banUser(targetUserId: string, adminUserId: string) {
    const sb = this.supabaseService.getClient();
    const { data: target } = (await sb
      .from('users')
      .select('id, user_roles(roles(name))')
      .eq('id', targetUserId)
      .maybeSingle()) as { data: any };

    if (!target) throw new NotFoundException('User not found');
    if (
      (target.user_roles as any[])?.some(
        (ur) => ur.roles?.name === 'superadmin',
      )
    ) {
      throw new BadRequestException('Admins cannot be banned.');
    }

    await sb
      .from('banned_users')
      .insert({ user_id: targetUserId, reason: 'N/A' });

    const { error: activityBanError } = (await sb.from('user_activity').insert({
      user_id: adminUserId,
      type: 'admin:ban:user',
      meta: { targetUserId },
    })) as { error: any };
    if (activityBanError)
      throw new InternalServerErrorException('Failed to save user activity');

    return { ok: true, isBanned: true };
  }

  async unbanUser(targetUserId: string, adminUserId: string) {
    const sb = this.supabaseService.getClient();
    const { error: unbanError } = (await sb
      .from('banned_users')
      .delete()
      .eq('user_id', targetUserId)) as { error: any };
    if (unbanError)
      throw new InternalServerErrorException(
        'An unexpected database error occurred',
      );

    const { error: activityUnbanError } = (await sb
      .from('user_activity')
      .insert({
        user_id: adminUserId,
        type: 'admin:unban:user',
        meta: { targetUserId },
      })) as { error: any };
    if (activityUnbanError)
      throw new InternalServerErrorException('Failed to save user activity');

    return { ok: true, isBanned: false };
  }

  async deleteUser(targetUserId: string) {
    const sb = this.supabaseService.getClient();
    const { data: target } = (await sb
      .from('users')
      .select('id, user_roles(roles(name))')
      .eq('id', targetUserId)
      .maybeSingle()) as { data: any };

    if (!target) throw new NotFoundException('User not found');
    if (
      (target.user_roles as any[])?.some(
        (ur) => ur.roles?.name === 'superadmin',
      )
    ) {
      throw new ForbiddenException('Admins cannot be deleted');
    }

    const { data: ownedGroups } = await sb
      .from('groups')
      .select('id')
      .eq('owner_id', targetUserId)
      .limit(1);

    if (ownedGroups && ownedGroups.length > 0) {
      throw new BadRequestException(
        'Account cannot be deleted because the user owns groups.',
      );
    }

    const { error: userDeleteError } = (await sb
      .from('users')
      .delete()
      .eq('id', targetUserId)) as { error: any };
    if (userDeleteError)
      throw new InternalServerErrorException('Failed to delete user');

    return { ok: true };
  }

  async updateUserRole(targetUserId: string, role: string) {
    const sb = this.supabaseService.getClient();
    if (role === 'superadmin') {
      const { data: existing } = await sb
        .from('user_roles')
        .select('id')
        .eq('user_id', targetUserId)
        .eq('role_id', 1)
        .is('tenant_id', null)
        .maybeSingle();
      if (!existing) {
        await sb
          .from('user_roles')
          .insert({ user_id: targetUserId, role_id: 1, tenant_id: null });
      }
    } else {
      await sb
        .from('user_roles')
        .delete()
        .eq('user_id', targetUserId)
        .eq('role_id', 1)
        .is('tenant_id', null);
    }
    return { ok: true };
  }

  async pruneActivity(targetUserId: string, adminUserId: string) {
    const sb = this.supabaseService.getClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    await sb
      .from('user_activity')
      .delete()
      .eq('user_id', targetUserId)
      .lt('created_at', cutoffDate.toISOString());

    const { error: activityPruneError } = (await sb
      .from('user_activity')
      .insert({
        user_id: adminUserId,
        type: 'admin:prune_logs',
        meta: { targetUserId },
      })) as { error: any };
    if (activityPruneError)
      throw new InternalServerErrorException('Failed to save user activity');

    return { ok: true, message: 'Logs pruned.' };
  }

  async getReports() {
    const sb = this.supabaseService.getClient();
    const { data: reports } = await sb
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });
    return (reports || []).map((r) => {
      const row = r as Record<string, any>;
      return {
        id: row.id,
        itemId: row.item_id,
        itemTitle: row.item_title,
        category: row.category,
        reason: row.reason,
        reportedBy: row.reporter_id,
        reporterEmail: row.reporter_email,
        processed: row.processed,
        processedAt: row.processed_at,
        reportedAt: row.reported_at,
      };
    });
  }

  async processReport(
    reportId: string,
    adminUserId: string,
    processed: boolean,
  ) {
    const sb = this.supabaseService.getClient();
    const { data: report } = (await sb
      .from('reports')
      .update({
        processed,
        processed_at: processed ? new Date().toISOString() : null,
        processed_by: processed ? adminUserId : null,
      })
      .eq('id', reportId)
      .select()
      .single()) as { data: any };

    const { error: activityReportError } = (await sb
      .from('user_activity')
      .insert({
        user_id: adminUserId,
        type: processed
          ? 'admin:report:mark_processed'
          : 'admin:report:mark_unprocessed',
        meta: { reportId },
      })) as { error: any };
    if (activityReportError)
      throw new InternalServerErrorException('Failed to save user activity');

    return {
      ok: true,
      processed: report.processed,
      processedAt: report.processed_at,
    };
  }

  async deleteReport(reportId: string, adminUserId: string) {
    const sb = this.supabaseService.getClient();
    const { error: reportDeleteError } = (await sb
      .from('reports')
      .delete()
      .eq('id', reportId)) as { error: any };
    if (reportDeleteError)
      throw new InternalServerErrorException(
        'An unexpected database error occurred',
      );

    const { error: activityDeleteError } = (await sb
      .from('user_activity')
      .insert({
        user_id: adminUserId,
        type: 'admin:report:delete',
        meta: { reportId },
      })) as { error: any };
    if (activityDeleteError)
      throw new InternalServerErrorException('Failed to save user activity');

    return { ok: true };
  }

  async upsertSubject(tenantId: string, name: string) {
    const sb = this.supabaseService.getClient();
    await sb
      .from('subjects')
      .upsert({ tenant_id: tenantId, name }, { onConflict: 'tenant_id,name' });
    return { ok: true };
  }

  async deleteSubject(tenantId: string, name: string) {
    const sb = this.supabaseService.getClient();
    await sb
      .from('subjects')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('name', name);
    return { ok: true };
  }
}
