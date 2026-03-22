import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';
import { filterLessonsForUser } from '../common/utils/timetable.util';

@Injectable()
export class TimetableService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getTimetable(tenantId: string, userId: string | undefined) {
    const sb = this.supabaseService.getClient();
    try {
      const { data: lessons } = await sb
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
        sb.rpc('upsert_user_tenant_visit', {
          p_user_id: userId,
          p_tenant_id: tenantId,
          p_visit_type: 'timetable',
        }).then();
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
      throw new InternalServerErrorException('Failed to load timetable');
    }
  }

  async getSubs(tenantId: string) {
    const sb = this.supabaseService.getClient();
    try {
      const { data: subs } = await sb
        .from('timetable_subs')
        .select('*')
        .eq('tenant_id', tenantId);
      // Try to determine the user id. Actually getSubs might be called from timetable context
      // where we wouldn't have user id here easily. If we don't have user_id, it is handled
      // by getTimetable anyways since getTimetable runs concurrently on the same page.
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

  async getPersons(tenantId: string) {
    const sb = this.supabaseService.getClient();
    try {
      const { data } = await sb
        .from('persons')
        .select('id, name, short, title')
        .eq('tenant_id', tenantId)
        .order('name');
      return (data || []).map((p) => ({
        id: p.id,
        name: p.name,
        short: p.short,
        title: p.title,
      }));
    } catch {
      throw new InternalServerErrorException('Failed to load persons');
    }
  }

  async getDaltonSchedule(tenantId: string) {
    const sb = this.supabaseService.getClient();
    try {
      const { data } = await sb
        .from('dalton_schedule')
        .select('*')
        .eq('tenant_id', tenantId);
      return (data || []).map((r) => ({
        id: r.id,
        room: r.room,
        size: r.size,
        moPersonId: r.mo_person_id,
        diPersonId: r.di_person_id,
        miPersonId: r.mi_person_id,
        doPersonId: r.do_person_id,
        frPersonId: r.fr_person_id,
      }));
    } catch {
      throw new InternalServerErrorException('Failed to load Dalton schedules');
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
        showAsPopup: a.show_as_popup,
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
    const { error } = await sb
      .from('user_announcement_read_status')
      .upsert(
        { user_id: userId, announcement_id: announcementId },
        { onConflict: 'user_id,announcement_id' },
      );
    if (error)
      throw new InternalServerErrorException(
        'Failed to mark announcement as read',
      );
  }

  async getTimetableErrors() {
    // Placeholder for future error reporting
  }
}
