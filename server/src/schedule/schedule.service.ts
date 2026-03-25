import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { filterLessonsForUser } from '../common/utils/schedule.util';

@Injectable()
export class ScheduleService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getSchedule(tenantId: string, userId: string | undefined) {
    const sb = this.supabaseService.getClient();
    try {
      const { data: lessons } = await sb
        .from('schedules')
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

      if (!lessons) return [];

      let filteredLessons = lessons;

      if (userId) {
        const { data: user } = await sb
          .from('users')
          .select(
            'personalized, done_setup, enr_kurs, wpu_kurs_1, wpu_kurs_2, theater',
          )
          .eq('id', userId)
          .maybeSingle();

        if (user?.personalized && user?.done_setup) {
          filteredLessons = filterLessonsForUser(lessons, {
            enrKurs: user.enr_kurs as string | null,
            wpuKurs1: user.wpu_kurs_1 as string | null,
            wpuKurs2: user.wpu_kurs_2 as string | null,
            theater: user.theater as number,
          });
        }
      }

      if (userId) {
        // Fire-and-forget: record the user's last schedule visit timestamp.
        sb.from('user_tenant_state')
          .upsert(
            {
              user_id: userId,
              tenant_id: tenantId,
              last_schedule_visit_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,tenant_id' },
          )
          .then();
      }

      return filteredLessons.map((l: any) => ({
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
    } catch (_err) {
      throw new InternalServerErrorException('Failed to load schedule');
    }
  }

  async getSubs(tenantId: string) {
    const sb = this.supabaseService.getClient();
    try {
      const { data: subs } = await sb
        .from('schedule_substitutions')
        .select('*')
        .eq('tenant_id', tenantId);
      return (subs || []).map((s) => ({
        id: s.id,
        lessonId: s.lesson_id,
        day: s.day,
        slot: s.slot,
        duration: s.duration,
        subject: s.subject,
        room: s.room,
        cancelled: s.cancelled,
        hide: s.hide,
        createdAt: s.created_at,
      }));
    } catch {
      throw new InternalServerErrorException('Failed to load substitutions');
    }
  }

  async getSubjects(tenantId: string) {
    const sb = this.supabaseService.getClient();
    try {
      const { data } = await sb
        .from('subjects')
        .select('id, name, is_active, courses(id, name)')
        .eq('tenant_id', tenantId)
        .order('name');
      return data || [];
    } catch {
      throw new InternalServerErrorException('Failed to load subjects');
    }
  }

  async getAnnouncements(tenantId: string) {
    const sb = this.supabaseService.getClient();
    try {
      const { data } = await sb
        .from('announcements')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(5);
      return (data || []).map((a) => ({
        id: a.id,
        content: a.content,
        color: a.color,
        createdBy: a.created_by,
        createdAt: a.created_at,
      }));
    } catch {
      throw new InternalServerErrorException('Failed to load announcements');
    }
  }

  async getAnnouncementReadStatus(
    userId: string,
    tenantId: string,
  ): Promise<string[]> {
    const sb = this.supabaseService.getClient();
    const { data, error } = await sb
      .from('user_announcement_read_status')
      .select('announcement_id, announcements!inner(tenant_id)')
      .eq('user_id', userId)
      .eq('announcements.tenant_id', tenantId);
    if (error)
      throw new InternalServerErrorException(
        'Failed to load announcement read status',
      );
    return data.map((r: any) => r.announcement_id as string);
  }

  async markAnnouncementRead(
    userId: string,
    announcementId: string,
  ): Promise<void> {
    const sb = this.supabaseService.getClient();
    // Check-then-insert: avoids relying on a unique constraint that may not exist
    // in all environments. Idempotent — calling multiple times is safe.
    const { data: existing } = await sb
      .from('user_announcement_read_status')
      .select('id')
      .eq('user_id', userId)
      .eq('announcement_id', announcementId)
      .maybeSingle();

    if (!existing) {
      const { error } = await sb
        .from('user_announcement_read_status')
        .insert({ user_id: userId, announcement_id: announcementId });
      if (error)
        throw new InternalServerErrorException(
          'Failed to mark announcement as read',
        );
    }
  }
}
