import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { ItemsService } from '../items/items.service';
import { generateUserName } from '../common/utils/name-generator.util';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

@Injectable()
export class GroupAdminService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly itemsService: ItemsService,
  ) {}

  async getStats(tenantId: string) {
    const sb = this.supabaseService.getClient();
    const ninetyDaysAgo = new Date(Date.now() - NINETY_DAYS_MS).toISOString();

    const { count: itemCount } = await sb
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    const { data: subsData } = await sb
      .from('timetable_subs')
      .select('id')
      .eq('tenant_id', tenantId);
    const { count: oldItemsCount } = await sb
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .lt('created_at', ninetyDaysAgo);
    const { count: memberCount } = await sb
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    return {
      itemCount: itemCount || 0,
      subsCount: subsData?.length || 0,
      oldItemsCount: oldItemsCount || 0,
      memberCount: memberCount || 0,
    };
  }

  async getMembers(tenantId: string) {
    const sb = this.supabaseService.getClient();
    const { data: userRoles } = await sb
      .from('user_roles')
      .select('user_id, assigned_at, roles(name)')
      .eq('tenant_id', tenantId);

    const members = (userRoles || []).map((ur: any) => {
      const _ur = ur as Record<string, any>;
      return {
        userId: _ur.user_id as string,
        generatedName: generateUserName(_ur.user_id as string, tenantId),
        role: _ur.roles?.name || 'user',
        joinedAt: _ur.assigned_at as string,
      };
    });

    const roleOrder: Record<string, number> = {
      admin: 0,
      moderator: 1,
      user: 2,
    };
    members.sort((a, b) => (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3));

    return members;
  }

  async changeMemberRole(
    tenantId: string,
    currentUserId: string,
    targetUserId: string,
    newRole: string,
  ) {
    if (targetUserId === currentUserId)
      throw new BadRequestException(
        'Du kannst deine eigene Rolle nicht ändern.',
      );

    const roleMap: Record<string, number> = { admin: 2, moderator: 3, user: 4 };
    const roleId = roleMap[newRole];
    if (!roleId) throw new BadRequestException('Ungültige Rolle');

    const sb = this.supabaseService.getClient();
    const { data: existings } = await sb
      .from('user_roles')
      .select('id, role_id')
      .eq('user_id', targetUserId)
      .eq('tenant_id', tenantId)
      .limit(1);

    const existing = existings?.[0] as Record<string, any> | undefined;

    if (!existing)
      throw new NotFoundException('Nutzer ist kein Mitglied dieser Gruppe');

    await sb
      .from('user_roles')
      .update({ role_id: roleId })
      .eq('id', existing.id);
    const { error: err_tklkp } = await sb.from('user_activity').insert({
      user_id: currentUserId,
      type: 'group-admin:change-role',
      meta: { targetUserId, newRole, tenantId },
    });
    if (err_tklkp)
      throw new InternalServerErrorException((err_tklkp as any).message);

    return { ok: true, message: `Rolle zu "${newRole}" geändert.` };
  }

  async removeMember(
    tenantId: string,
    currentUserId: string,
    targetUserId: string,
  ) {
    if (targetUserId === currentUserId)
      throw new BadRequestException('Du kannst dich nicht selbst entfernen.');

    const sb = this.supabaseService.getClient();
    const { data: targetRoles } = await sb
      .from('user_roles')
      .select('id, roles(name)')
      .eq('user_id', targetUserId)
      .eq('tenant_id', tenantId)
      .limit(1);

    const targetRole = targetRoles?.[0] as Record<string, any> | undefined;

    if (!targetRole)
      throw new NotFoundException('Nutzer ist kein Mitglied dieser Gruppe');

    if (targetRole.roles?.name === 'admin') {
      throw new ForbiddenException('Admins können nicht entfernt werden.');
    }

    await sb
      .from('user_roles')
      .delete()
      .eq('user_id', targetUserId)
      .eq('tenant_id', tenantId);
    const { error: err_qev18 } = await sb.from('user_activity').insert({
      user_id: currentUserId,
      type: 'group-admin:remove-member',
      meta: { targetUserId, tenantId },
    });
    if (err_qev18)
      throw new InternalServerErrorException((err_qev18 as any).message);

    return { ok: true, message: 'Mitglied entfernt.' };
  }

  async renameGroup(tenantId: string, userId: string, name?: string) {
    if (!name) return { ok: true };

    const sb = this.supabaseService.getClient();
    const { data: existing } = (await sb
      .from('groups')
      .select('id')
      .eq('name', name)
      .maybeSingle()) as { data: Record<string, any> | null };

    if (existing && existing.id !== tenantId) {
      throw new BadRequestException('Dieser Gruppenname ist bereits vergeben.');
    }

    const { error: err_o4luy } = await sb
      .from('groups')
      .update({ name: name.trim() })
      .eq('id', tenantId);
    if (err_o4luy)
      throw new InternalServerErrorException((err_o4luy as any).message);
    const { error: err_qpwry } = await sb.from('user_activity').insert({
      user_id: userId,
      type: 'group-admin:rename-group',
      meta: { tenantId, newName: name.trim() },
    });
    if (err_qpwry)
      throw new InternalServerErrorException((err_qpwry as any).message);

    return { ok: true };
  }

  async cleanupOldItems(tenantId: string, userId: string) {
    return this.itemsService.cleanupOldItems(
      tenantId,
      userId,
      'group-admin:cleanup',
    );
  }

  // --- Timetable subs ---
  async getTimetable(tenantId: string) {
    const sb = this.supabaseService.getClient();
    const { data: lessons, error } = await sb
      .from('timetables')
      .select(
        `
          id,
          day,
          slot,
          duration,
          room,
          course_id,
          subjects ( id, name ),
          courses ( id, name )
        `,
      )
      .eq('tenant_id', tenantId);

    if (error) {
      throw new InternalServerErrorException(
        'Fehler beim Laden des Stundenplans',
      );
    }

    return (lessons || []).map((l: any) => ({
      id: l.id,
      day: l.day,
      slot: l.slot,
      duration: l.duration,
      room: l.room,
      courseId: l.course_id,
      subjects: l.subjects
        ? { id: l.subjects.id, name: l.subjects.name }
        : null,
      courses: l.courses ? { id: l.courses.id, name: l.courses.name } : null,
    }));
  }

  async getTimetableSubs(tenantId: string) {
    const sb = this.supabaseService.getClient();
    const { data: subs } = await sb
      .from('timetable_subs')
      .select('*')
      .eq('tenant_id', tenantId);
    return (subs || []).map((s) => {
      const _s = s as Record<string, any>;
      return {
        id: _s.id,
        lessonId: _s.lesson_id,
        day: _s.day,
        slot: _s.slot,
        duration: _s.duration,
        subject: _s.subject,
        room: _s.room,
        cancelled: _s.cancelled,
        hide: _s.hide,
        createdAt: _s.created_at,
      };
    });
  }

  async createTimetableSub(tenantId: string, userId: string, sub: any) {
    const sb = this.supabaseService.getClient();
    const { data, error } = await sb
      .from('timetable_subs')
      .insert({
        tenant_id: tenantId,
        lesson_id: sub.lessonId,
        day: sub.day || null,
        slot: sub.slot || null,
        duration: sub.duration || null,
        subject: sub.subject || null,
        room: sub.room || null,
        cancelled: sub.cancelled || false,
        hide: sub.hide || false,
      })
      .select()
      .single();

    if (error) throw new InternalServerErrorException('Fehler beim Speichern');

    const { error: err_bv7dv } = await sb.from('user_activity').insert({
      user_id: userId,
      type: 'timetable:sub:create',
      meta: { lessonId: sub.lessonId },
    });
    if (err_bv7dv)
      throw new InternalServerErrorException((err_bv7dv as any).message);

    const _data = data as Record<string, any>;
    return {
      id: _data.id,
      lessonId: _data.lesson_id,
      day: _data.day,
      slot: _data.slot,
      duration: _data.duration,
      subject: _data.subject,
      room: _data.room,
      cancelled: _data.cancelled,
      hide: _data.hide,
      createdAt: _data.created_at,
    };
  }

  async deleteTimetableSub(tenantId: string, id: string) {
    const sb = this.supabaseService.getClient();
    await sb
      .from('timetable_subs')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);
    return { ok: true };
  }

  // --- Announcements ---
  async createAnnouncement(
    tenantId: string,
    userId: string,
    content: string,
    color?: string,
    showAsPopup?: boolean,
  ) {
    const sb = this.supabaseService.getClient();
    const { data: ann, error } = await sb
      .from('announcements')
      .insert({
        tenant_id: tenantId,
        content,
        color: color || 'warn',
        show_as_popup: showAsPopup || false,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new InternalServerErrorException('Fehler beim Erstellen');

    const _ann = ann as Record<string, any>;
    return {
      id: _ann.id,
      content: _ann.content,
      color: _ann.color,
      showAsPopup: _ann.show_as_popup,
      createdBy: _ann.created_by,
      createdAt: _ann.created_at,
    };
  }

  async deleteAnnouncement(tenantId: string, id: string) {
    const sb = this.supabaseService.getClient();
    const { data: ann } = await sb
      .from('announcements')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!ann) throw new NotFoundException('Nicht gefunden');

    await sb
      .from('announcements')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);
    return { ok: true };
  }
}
